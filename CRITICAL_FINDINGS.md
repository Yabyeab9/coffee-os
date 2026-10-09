# CRITICAL FINDINGS FROM REMOTE_SCHEMA.sql ANALYSIS

## 1. PERMISSIVE RLS POLICIES (30+ tables with USING (true))

These tables allow ANY authenticated user (or even anon) to read/write ALL data across ALL tenants:

### Tables with USING (true) for SELECT:
- admin_actions, admin_ai_alerts, admin_ai_recommendations
- ambient_loyalty_events, challenge_rewards, challenge_rules
- churn_predictions, customer_context_signals, customer_seating_preferences
- customer_segments, customer_taste_profiles, drink_similarity, food_pairings
- homepage_sections, inventory, performance_metrics, predictions
- referral_codes, referral_events, reservation_traffic_patterns
- reservation_verifications, revenue_forecasts, seasonal_drink_recommendations
- taste_evolution_tracking, vibe_recommendations, vibe_reservations, vip_detection
- bean_library (SELECT only), coffee_challenges (SELECT only), seasonal_drinks (SELECT only)
- achievements (SELECT only), gallery (SELECT only), loyalty_settings (SELECT only)
- loyalty_tiers (SELECT only), menu_categories (SELECT only), menus (SELECT only)
- opening_hours (SELECT only), cafe_live_context (SELECT only), seo (SELECT only)
- themes (SELECT only)

### Tables with WITH CHECK (true) for INSERT/UPDATE:
- audit_logs (INSERT)
- challenge_events (INSERT/UPDATE)
- notifications (INSERT)

### GRANT TO ANON (public internet access):
- ai_chat_messages, ai_chat_sessions
- audit_logs
- And many others

## 2. MISSING cafe_id COLUMNS ON TENANT-SCOPED TABLES

These tables are missing `cafe_id` column, making tenant isolation impossible:

- ai_campaign_participants (has customer_id, campaign_id - NO cafe_id)
- ai_chat_messages (has session_id - NO cafe_id)
- ai_chat_sessions (has customer_id - NO cafe_id)
- ai_coffee_twin (has customer_id - NO cafe_id)
- ai_customer_insights (has customer_id - NO cafe_id)
- ai_customer_lifecycle (HAS cafe_id - OK)
- ai_generated_campaigns (NO cafe_id)
- ai_generations (HAS cafe_id - OK)
- ai_menu_learning (NO cafe_id)
- ai_menu_suggestions (NO cafe_id)
- ai_opportunities (HAS cafe_id - OK)
- ai_pattern_discoveries (NO cafe_id)
- ai_recommendations (HAS cafe_id - OK)
- ambient_loyalty_events (HAS cafe_id - OK)
- ambient_signals (HAS cafe_id - OK)
- announcements (HAS cafe_id - OK)
- audit_logs (NO cafe_id - global audit)
- achievements (NO cafe_id)
- admin_actions (NO cafe_id)
- admin_ai_alerts (NO cafe_id)
- admin_ai_recommendations (NO cafe_id)
- And many more...

## 3. RPC FUNCTIONS WITHOUT PROPER AUTHORIZATION

### process_direct_checkout - Creates orders/payments but:
- Uses `auth.uid()` correctly for user_id
- BUT: no explicit check that cafe_id belongs to user's tenant
- Creates payment record with provider_ref = order_number (good for webhook matching)

### process_checkout_with_redemption - Same issues
- Uses FOR UPDATE on loyalty_redemptions (good for race conditions)
- No explicit tenant validation

### process_checkout - Creates orders, order_items, payments, loyalty
- Uses auth.uid()
- Creates loyalty_points entry
- No explicit tenant validation

### process_reservation - Creates reservation + optional order
- Uses auth.uid()
- Creates payment record if needed
- No explicit tenant validation

### admin_update_order_status - SECURITY DEFINER, checks role IN ('admin','owner','manager','staff','editor')
- BUT: Does NOT check cafe_id ownership
- ANY admin/owner/manager/editor can update ANY order in ANY cafe

### get_admin_queue_stats - Checks cafe_id matches user's cafe_id
- Good authorization

### apply_reservation_redemption - Checks reservation belongs to user
- Good authorization

## 4. get_current_user_role / get_current_user_cafe_id ISSUES

```sql
CREATE OR REPLACE FUNCTION "public"."get_current_user_cafe_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select cafe_id from users where id = auth.uid();
$$;
```

Problems:
- Returns NULL if user not in users table (e.g., customer)
- Returns single cafe_id - what if user belongs to multiple cafes?
- No check that user is active
- STABLE means it can be cached - bad for security decisions

```sql
CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role from users where id = auth.uid();
$$;
```

Same problems - STABLE, no active check, single role.

## 5. AUDIT LOG POLICY BROKEN

```sql
CREATE POLICY "audit_logs_select_admin" ON "public"."audit_logs" FOR SELECT USING ((("public"."get_current_user_role"() = 'admin'::"text") OR true));
```

This evaluates to `true` always because of `OR true` - ANYONE can read audit logs!

## 6. NOTIFICATIONS POLICY

```sql
CREATE POLICY "notifications_insert_service" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));
```

Allows ANY authenticated user to insert notifications for ANY user/cafe - no tenant check!

## 7. PAYMENTS POLICY ISSUES

```sql
CREATE POLICY "payments_select_customer" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));
```

Customer can only see their own payments - GOOD

```sql
CREATE POLICY "payments_select_staff" ON "public"."payments" FOR SELECT USING ((("cafe_id" = "public"."get_current_user_cafe_id"()) OR ("public"."get_current_user_role"() = 'admin'::"text")));
```

Staff can see all payments for their cafe - GOOD but depends on helper function issues

## 8. ORDERS POLICIES

```sql
CREATE POLICY "orders_customer_select" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));
```
Customer sees own orders - GOOD

```sql
CREATE POLICY "orders_staff_select" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM users WHERE id = auth.uid() AND role IN ('admin','owner','manager','staff','editor') AND cafe_id = orders.cafe_id
)));
```

Staff sees orders for their cafe - GOOD

## 9. MISSING TABLES FROM FRONTEND REFERENCES

Tables referenced in frontend code but may not exist in REMOTE_SCHEMA:
- loyalty_points (DOES exist in remote)
- loyalty_transactions (DOES exist in remote)
- loyalty_tiers (DOES exist in remote)
- loyalty_redemptions (DOES exist in remote)
- loyalty_settings (DOES exist in remote)
- challenges (DOES exist in remote)
- challenge_participants (DOES exist in remote)
- challenge_rules (DOES exist in remote)
- challenge_rewards (DOES exist in remote)
- challenge_bundles (DOES exist in remote)
- challenge_bundle_participants (DOES exist in remote)
- challenge_events (DOES exist in remote)
- challenge_analytics (DOES exist in remote)
- daily_quests (DOES exist in remote)
- ai_coffee_twin (DOES exist in remote)
- ai_customer_insights (DOES exist in remote)
- ai_chat_sessions (DOES exist in remote)
- ai_chat_messages (DOES exist in remote)
- customer_preferences (DOES exist in remote)
- reservation_verifications (DOES exist in remote)
- reservation_traffic_patterns (DOES exist in remote)

So the tables DO exist in remote - the audit was checking against local migrations only.

## 10. USER ROLE CHECK - MISSING 'system_manager'

```sql
CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'manager'::"text", 'editor'::"text", 'customer'::"text"])))
```

Missing 'system_manager' role for platform admin.

## 11. CAFES TABLE MISSING STATUS COLUMN

Cafes table doesn't have a `status` column for tenant lifecycle (provisioning/active/suspended/archived)

## 12. GRANT TO ANON - MASSIVE SECURITY ISSUE

Many tables have:
```sql
GRANT ALL ON TABLE "public"."ai_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_chat_sessions" TO "anon";
```

This allows unauthenticated public internet access to read/write these tables if RLS is bypassed!

## PRIORITY FIXES NEEDED

1. **URGENT**: Fix audit_logs policy (OR true bug)
2. **URGENT**: Add cafe_id to tenant-scoped tables
3. **URGENT**: Replace USING (true) policies with proper tenant isolation
4. **URGENT**: Fix helper functions (not STABLE, add active check)
5. **URGENT**: Add system_manager role
6. **URGENT**: Remove GRANT ALL TO anon
7. **HIGH**: Fix admin_update_order_status to check cafe ownership
8. **HIGH**: Fix notifications insert policy
9. **MEDIUM**: Add cafe status column
10. **MEDIUM**: Add proper RLS to all tables