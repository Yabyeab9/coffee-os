
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- THEMES
-- ============================================================
create table themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  tokens jsonb not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CAFES
-- ============================================================
create table cafes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  logo_url text,
  favicon_url text,
  cover_url text,
  theme_id uuid references themes(id),
  domain text,
  address text,
  city text,
  country text default 'Ethiopia',
  phone text,
  email text,
  website text,
  instagram_url text,
  facebook_url text,
  twitter_url text,
  tiktok_url text,
  is_published boolean not null default false,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USERS (profile extending auth.users)
-- ============================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'editor' check (role in ('admin','owner','manager','editor')),
  cafe_id uuid references cafes(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PAGES (CMS)
-- ============================================================
create table pages (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  slug text not null,
  title text not null,
  meta_description text,
  is_home boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sections jsonb not null default '[]',
  seo_data jsonb not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cafe_id, slug)
);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MENUS
-- ============================================================
create table menus (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete set null,
  name text not null,
  description text,
  price decimal(10,2),
  currency text not null default 'ETB',
  image_url text,
  tags text[] not null default '{}',
  dietary jsonb not null default '{}',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GALLERY
-- ============================================================
create table gallery (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  image_url text not null,
  caption text,
  alt_text text,
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TESTIMONIALS
-- ============================================================
create table testimonials (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  author_name text not null,
  author_title text,
  content text not null,
  rating integer check (rating between 1 and 5),
  image_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- BLOG POSTS
-- ============================================================
create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  cover_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  seo_data jsonb not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cafe_id, slug)
);

-- ============================================================
-- RESERVATIONS
-- ============================================================
create table reservations (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  party_size integer not null,
  reservation_date date not null,
  reservation_time time not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','no_show')),
  notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- OPENING HOURS
-- ============================================================
create table opening_hours (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique(cafe_id, day_of_week)
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table announcements (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  title text not null,
  content text,
  type text not null default 'info' check (type in ('info','warning','success','promo')),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEO
-- ============================================================
create table seo (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  page_slug text not null,
  title text,
  description text,
  og_image_url text,
  canonical text,
  structured_data jsonb not null default '{}',
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cafe_id, page_slug)
);

-- ============================================================
-- MEDIA LIBRARY
-- ============================================================
create table media_library (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  url text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  alt_text text,
  caption text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- AI GENERATIONS
-- ============================================================
create table ai_generations (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid references cafes(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  feature text not null,
  model text,
  prompt text,
  output text,
  tokens_used integer,
  latency_ms integer,
  feedback integer,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AI CHAT SESSIONS
-- ============================================================
create table ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid references cafes(id) on delete cascade,
  session_hash text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AI CHAT MESSAGES
-- ============================================================
create table ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  provider text not null check (provider in ('telebirr','cbe_birr','stripe','paypal','chapa','santimpay','arifpay')),
  amount decimal(10,2) not null,
  currency text not null default 'ETB',
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  provider_ref text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_cafes_slug on cafes(slug);
create index idx_cafes_is_published on cafes(is_published);
create index idx_menus_cafe_id on menus(cafe_id);
create index idx_menus_category_id on menus(category_id);
create index idx_menus_is_available on menus(is_available);
create index idx_gallery_cafe_id on gallery(cafe_id);
create index idx_reservations_cafe_id on reservations(cafe_id);
create index idx_reservations_date on reservations(reservation_date);
create index idx_reservations_status on reservations(status);
create index idx_blog_posts_cafe_id on blog_posts(cafe_id);
create index idx_blog_posts_status on blog_posts(status);
create index idx_ai_generations_cafe_id on ai_generations(cafe_id);
create index idx_ai_generations_feature on ai_generations(feature);
create index idx_audit_logs_table_name on audit_logs(table_name);
create index idx_users_cafe_id on users(cafe_id);
create index idx_users_role on users(role);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_cafes before update on cafes
  for each row execute function update_updated_at();
create trigger set_updated_at_menus before update on menus
  for each row execute function update_updated_at();
create trigger set_updated_at_gallery before update on gallery
  for each row execute function update_updated_at();
create trigger set_updated_at_pages before update on pages
  for each row execute function update_updated_at();
create trigger set_updated_at_reservations before update on reservations
  for each row execute function update_updated_at();
create trigger set_updated_at_blog_posts before update on blog_posts
  for each row execute function update_updated_at();
create trigger set_updated_at_seo before update on seo
  for each row execute function update_updated_at();
create trigger set_updated_at_payments before update on payments
  for each row execute function update_updated_at();
create trigger set_updated_at_users before update on users
  for each row execute function update_updated_at();

-- ============================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================
create or replace function audit_trigger_fn()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_logs(table_name, record_id, action, new_data)
    values (tg_table_name, new.id, 'INSERT', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    insert into audit_logs(table_name, record_id, action, old_data, new_data)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
  elsif tg_op = 'DELETE' then
    insert into audit_logs(table_name, record_id, action, old_data)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger audit_reservations after insert or update or delete on reservations
  for each row execute function audit_trigger_fn();
create trigger audit_menus after insert or update or delete on menus
  for each row execute function audit_trigger_fn();
create trigger audit_blog_posts after insert or update or delete on blog_posts
  for each row execute function audit_trigger_fn();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: get current user role
create or replace function get_current_user_role()
returns text language sql security definer stable as $$
  select role from users where id = auth.uid();
$$;

-- Helper: get current user cafe_id
create or replace function get_current_user_cafe_id()
returns uuid language sql security definer stable as $$
  select cafe_id from users where id = auth.uid();
$$;

-- THEMES: public read, admin write
alter table themes enable row level security;
create policy "themes_select_all" on themes for select using (true);
create policy "themes_admin_write" on themes for all
  using (get_current_user_role() = 'admin')
  with check (get_current_user_role() = 'admin');

-- CAFES
alter table cafes enable row level security;
create policy "cafes_select_published" on cafes for select
  using (is_published = true or get_current_user_role() = 'admin' or id = get_current_user_cafe_id());
create policy "cafes_owner_update" on cafes for update
  using (id = get_current_user_cafe_id() or get_current_user_role() = 'admin')
  with check (id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "cafes_admin_insert" on cafes for insert
  with check (get_current_user_role() = 'admin');
create policy "cafes_admin_delete" on cafes for delete
  using (get_current_user_role() = 'admin');

-- USERS
alter table users enable row level security;
create policy "users_select_self_or_admin" on users for select
  using (id = auth.uid() or get_current_user_role() = 'admin' or cafe_id = get_current_user_cafe_id());
create policy "users_update_self_or_admin" on users for update
  using (id = auth.uid() or get_current_user_role() = 'admin');
create policy "users_admin_insert" on users for insert
  with check (get_current_user_role() = 'admin' or id = auth.uid());
create policy "users_admin_delete" on users for delete
  using (get_current_user_role() = 'admin');

-- PAGES
alter table pages enable row level security;
create policy "pages_select_published" on pages for select
  using (status = 'published' or get_current_user_role() = 'admin' or cafe_id = get_current_user_cafe_id());
create policy "pages_staff_write" on pages for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "pages_staff_update" on pages for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "pages_staff_delete" on pages for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- MENU CATEGORIES
alter table menu_categories enable row level security;
create policy "menu_categories_select_all" on menu_categories for select using (true);
create policy "menu_categories_staff_write" on menu_categories for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "menu_categories_staff_update" on menu_categories for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "menu_categories_staff_delete" on menu_categories for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- MENUS
alter table menus enable row level security;
create policy "menus_select_all" on menus for select using (true);
create policy "menus_staff_write" on menus for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "menus_staff_update" on menus for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "menus_staff_delete" on menus for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- GALLERY
alter table gallery enable row level security;
create policy "gallery_select_all" on gallery for select using (true);
create policy "gallery_staff_write" on gallery for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "gallery_staff_update" on gallery for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "gallery_staff_delete" on gallery for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- TESTIMONIALS
alter table testimonials enable row level security;
create policy "testimonials_select_approved" on testimonials for select
  using (status = 'approved' or get_current_user_role() = 'admin' or cafe_id = get_current_user_cafe_id());
create policy "testimonials_public_insert" on testimonials for insert with check (true);
create policy "testimonials_staff_update" on testimonials for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "testimonials_staff_delete" on testimonials for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- BLOG POSTS
alter table blog_posts enable row level security;
create policy "blog_posts_select_published" on blog_posts for select
  using (status = 'published' or get_current_user_role() = 'admin' or cafe_id = get_current_user_cafe_id());
create policy "blog_posts_staff_write" on blog_posts for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "blog_posts_staff_update" on blog_posts for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "blog_posts_staff_delete" on blog_posts for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- RESERVATIONS
alter table reservations enable row level security;
create policy "reservations_public_insert" on reservations for insert with check (true);
create policy "reservations_public_select_own" on reservations for select
  using (true);
create policy "reservations_staff_update" on reservations for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "reservations_staff_delete" on reservations for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- OPENING HOURS
alter table opening_hours enable row level security;
create policy "opening_hours_select_all" on opening_hours for select using (true);
create policy "opening_hours_staff_write" on opening_hours for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "opening_hours_staff_update" on opening_hours for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "opening_hours_staff_delete" on opening_hours for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- ANNOUNCEMENTS
alter table announcements enable row level security;
create policy "announcements_select_active" on announcements for select
  using (is_active = true or get_current_user_role() = 'admin' or cafe_id = get_current_user_cafe_id());
create policy "announcements_staff_write" on announcements for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "announcements_staff_update" on announcements for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "announcements_staff_delete" on announcements for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- SEO
alter table seo enable row level security;
create policy "seo_select_all" on seo for select using (true);
create policy "seo_staff_write" on seo for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "seo_staff_update" on seo for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "seo_staff_delete" on seo for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- MEDIA LIBRARY
alter table media_library enable row level security;
create policy "media_select_staff" on media_library for select
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "media_staff_write" on media_library for insert
  with check (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "media_staff_update" on media_library for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "media_staff_delete" on media_library for delete
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- AI GENERATIONS
alter table ai_generations enable row level security;
create policy "ai_gen_select_staff" on ai_generations for select
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "ai_gen_insert_auth" on ai_generations for insert
  with check (auth.uid() is not null);
create policy "ai_gen_update_staff" on ai_generations for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- AI CHAT SESSIONS
alter table ai_chat_sessions enable row level security;
create policy "ai_chat_sessions_select_all" on ai_chat_sessions for select using (true);
create policy "ai_chat_sessions_insert_all" on ai_chat_sessions for insert with check (true);

-- AI CHAT MESSAGES
alter table ai_chat_messages enable row level security;
create policy "ai_chat_messages_select_all" on ai_chat_messages for select using (true);
create policy "ai_chat_messages_insert_all" on ai_chat_messages for insert with check (true);

-- PAYMENTS
alter table payments enable row level security;
create policy "payments_select_staff" on payments for select
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');
create policy "payments_insert_auth" on payments for insert
  with check (auth.uid() is not null);
create policy "payments_update_staff" on payments for update
  using (cafe_id = get_current_user_cafe_id() or get_current_user_role() = 'admin');

-- AUDIT LOGS
alter table audit_logs enable row level security;
create policy "audit_logs_select_admin" on audit_logs for select
  using (get_current_user_role() = 'admin' or true);
create policy "audit_logs_insert_all" on audit_logs for insert with check (true);
