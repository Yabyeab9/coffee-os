# REMOTE_SCHEMA.sql SECURITY ANALYSIS FINDINGS

## Summary
Analysis of the live Supabase database schema (REMOTE_SCHEMA.sql) reveals **critical RLS security flaws**, **missing tenant isolation columns**, and **RPC functions with insufficient authorization**. These are production-blocking issues.

---

## 1. PERMISSIVE RLS POLICIES (33 tables with USING (true) / WITH CHECK (true))

### Tables with USING (true) for SELECT - ANY authenticated user can read ALL tenant data:

| Table | Policy Name | Line |
|-------|-------------|------|
| admin_actions | Allow all on admin_actions | 5333 |
| admin_ai_alerts | Allow all on admin_ai_alerts | 5337 |
| admin_ai_recommendations | Allow all on admin_ai_recommendations | 5341 |
| ambient_loyalty_events | Allow all on ambient_loyalty_events | 5345 |
| challenge_rewards | Allow all on challenge_rewards | 5349 |
| challenge_rules | Allow all on challenge_rules | 5353 |
| churn_predictions | Allow all on churn_predictions | 5357 |
| customer_context_signals | Allow all on customer_context_signals | 5361 |
| customer_seating_preferences | Allow all on customer_seating_preferences | 5365 |
| customer_segments | Allow all on customer_segments | 5369 |
| customer_taste_profiles | Allow all on customer_taste_profiles | 5373 |
| drink_similarity | Allow all on drink_similarity | 5377 |
| food_pairings | Allow all on food_pairings | 5381 |
| homepage_sections | Allow all on homepage_sections | 5385 |
| inventory | Allow all on inventory | 5389 |
| performance_metrics | Allow all on performance_metrics | 5393 |
| predictions | Allow all on predictions | 5397 |
| referral_codes | Allow all on referral_codes | 5401 |
| referral_events | Allow all on referral_events | 5405 |
| reservation_traffic_patterns | Allow all on reservation_traffic_patterns | 5409 |
| reservation_verifications | Allow all on reservation_verifications | 5413 |
| revenue_forecasts | Allow all on revenue_forecasts | 5417 |
| seasonal_drink_recommendations | Allow all on seasonal_drink_recommendations | 5421 |
| taste_evolution_tracking | Allow all on taste_evolution_tracking | 5425 |
| vibe_recommendations | Allow all on vibe_recommendations | 5429 |
| vibe_reservations | Allow all on vibe_reservations | 5433 |
| vip_detection | Allow all on vip_detection | 5437 |
| bean_library | Anyone can read bean_library | 5441 |
| coffee_challenges | Anyone can read coffee_challenges | 5445 |
| seasonal_drinks | Anyone can read seasonal_drinks | 5449 |
| achievements | Anyone can view achievements | 5453 |
| gallery | gallery_select_all | 6030 |
| loyalty_settings | loyalty_settings_read | 6122 |
| loyalty_tiers | loyalty_tiers_select | 6135 |
| menu_categories | menu_categories_select_all | 6183 |
| menus | menus_select_all | 6202 |
| opening_hours | opening_hours_select_all | 6251 |
| cafe_live_context | public_read_live_ctx | 6410 |
| seo | seo_select_all | 6512 |
| themes | themes_select_all | 6661 |

### Tables with WITH CHECK (true) for INSERT/UPDATE:
| Table | Policy | Line |
|-------|--------|------|
| audit_logs | audit_logs_insert_all | 5789 |
| challenge_events | challenge_events_service_insert | 5881 |
| challenge_events | challenge_events_service_update | 5885 |
| notifications | notifications_insert_service | 6230 |

---

## 2. GRANT ALL TO ANON (Unauthenticated Public Access)

These tables grant ALL privileges to the `anon` role (unauthenticated public internet):

- ai_chat_messages
- ai_chat_sessions
- audit_logs
- And many others via bulk grants

**Risk**: If RLS is ever bypassed or disabled, all data is publicly readable/writable.

---

## 3. MISSING cafe_id COLUMNS ON TENANT-SCOPED TABLES

Tables that should be tenant-scoped but lack `cafe_id` column:

| Table | Primary Key | Missing Column |
|-------|-------------|----------------|
| ai_campaign_participants | id | cafe_id |
| ai_chat_messages | id | cafe_id |
| ai_chat_sessions | id | cafe_id |
| ai_coffee_twin | id | cafe_id |
| ai_customer_insights | id | cafe_id |
| ai_generated_campaigns | id | cafe_id |
| ai_menu_learning | id | cafe_id |
| ai_menu_suggestions | id | cafe_id |
| ai_pattern_discoveries | id | cafe_id |
| ai_pattern_discoveries | id | cafe_id |
| achievements | id | cafe_id |
| admin_actions | action_id | cafe_id |
| admin_ai_alerts | id | cafe_id |
| admin_ai_recommendations | recommendation_id | cafe_id |
| And 30+ more... | | |

---

## 4. AUDIT LOGS POLICY BROKEN (Critical)

```sql
CREATE POLICY "audit_logs_select_admin" ON "public"."audit_logs" 
FOR SELECT USING ((("public"."get_current_user_role"() = 'admin'::"text") OR true));
```

**BUG**: `OR true` makes this policy evaluate to TRUE for EVERYONE. All users can read all audit logs.

---

## 5. NOTIFICATIONS INSERT POLICY (Cross-tenant write)

```sql
CREATE POLICY "notifications_insert_service" ON "public"."notifications" 
FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));
```

Allows ANY authenticated user to insert notifications for ANY cafe/user - no tenant check.

---

## 6. HELPER FUNCTIONS WITH STABLE (Unsafe for Security)

```sql
CREATE OR REPLACE FUNCTION "public"."get_current_user_cafe_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$ select cafe_id from users where id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$ select role from users where id = auth.uid(); $$;
```

Problems:
- `STABLE` allows result caching - dangerous for authorization decisions
- Returns NULL if user not in `users` table (e.g., customers)
- No `is_active` check on user
- No handling for multi-cafe users

---

## 7. RPC FUNCTIONS WITH INSUFFICIENT AUTHORIZATION

### admin_update_order_status (SECURITY DEFINER)
```sql
-- Line 72-76: Only checks role, NOT cafe ownership
IF NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()
  AND role IN ('admin','owner','manager','staff','editor')
) THEN
  RAISE EXCEPTION 'Unauthorized: admin access required';
END IF;
```
**FLAW**: Any admin/owner/manager/editor can update ANY order in ANY cafe.

---

## 7. MISSING SYSTEM_MANAGER ROLE

```sql
CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin','owner','manager','editor','customer'])))
```

Missing `system_manager` role required for platform administration.

---

## 8. CAFES TABLE MISSING STATUS COLUMN

No `status` column for tenant lifecycle management (provisioning/active/suspended/archived).

---

## 9. AI CHAT RLS - PARTIALLY FIXED BUT NOT COMPLETE

Current policies (lines 5225-5485):
- Admins: full access (role = 'admin')
- Customers: own sessions/messages only (customer_id = auth.uid())

**MISSING**: Cafe staff (owner/manager/editor) access to their cafe's chat data.
**MISSING**: System manager access.

---

## 10. ORDERS/RESERVATIONS/CHALLENGES - GOOD TENANT ISOLATION

These tables have proper tenant-scoped policies:
- orders: customer sees own, staff sees cafe_id = get_current_user_cafe_id()
- reservations: similar pattern
- payments: similar pattern
- challenges: customer sees active, admin full access

---

## PRIORITY ACTION MATRIX

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | Fix audit_logs OR true bug | 1 hour |
| P0 | Replace USING (true) on sensitive tables | 4 hours |
| P0 | Add cafe_id to 30+ tenant-scoped tables | 8 hours |
| P0 | Fix helper functions (remove STABLE, add active check) | 2 hours |
| P0 | Remove GRANT ALL TO anon | 1 hour |
| P0 | Fix admin_update_order_status cafe check | 1 hour |
| P0 | Fix notifications insert policy | 1 hour |
| P1 | Add system_manager role | 2 hours |
| P1 | Add cafe status column | 2 hours |
| P1 | Add staff access to AI chat | 2 hours |
| P2 | Add proper RLS to reference tables (bean_library, etc.) | 4 hours |

---

## RECOMMENDED APPROACH

1. **Do not drop/recreate tables** - Use ALTER TABLE ADD COLUMN for cafe_id
2. **Backfill cafe_id** from related tables (campaigns, users, etc.)
3. **Create migration** that adds columns, backfills, then adds RLS
4. **Test with hostile cases** before deploying