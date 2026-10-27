-- =============================================================
-- 0001_init.sql  |  Digital Menu SaaS (F&B)  |  Supabase / PostgreSQL
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Helper: auto-update updated_at
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- templates (registry of available menu templates)
-- -------------------------------------------------------------
create table public.templates (
  key        text primary key,            -- 'classic' | 'modern' | 'minimal'
  name       text not null,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

insert into public.templates (key, name, sort_order) values
  ('classic', 'Classic', 1),
  ('modern',  'Modern',  2),
  ('minimal', 'Minimal', 3);

-- -------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- plan: free_testimonial = first 5 users, waitlist = quota full
-- -------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  plan       text not null default 'waitlist'
             check (plan in ('free_testimonial', 'waitlist', 'paid')),
  created_at timestamptz not null default now()
);

-- Quota trigger: first 5 signups get 'free_testimonial'.
-- Advisory lock prevents two simultaneous signups from exceeding the quota.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  free_count int;
begin
  perform pg_advisory_xact_lock(hashtext('free_testimonial_quota'));

  select count(*) into free_count
  from public.profiles
  where plan = 'free_testimonial';

  insert into public.profiles (id, full_name, plan)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when free_count < 5 then 'free_testimonial' else 'waitlist' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- businesses
-- MVP: 1 user = 1 business (enforced in app). Schema allows multi.
-- -------------------------------------------------------------
create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  slug            text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  business_type   text not null default 'other'
                  check (business_type in ('cafe', 'restaurant', 'food_stall', 'bakery', 'other')),
  description     text,
  address         text,
  whatsapp_number text,                          -- international format, e.g. 6281234567890
  opening_hours   jsonb,                         -- {"monday":"08:00-22:00", ...}
  logo_path       text,                          -- storage path, not full URL
  cover_path      text,
  template_key    text not null default 'classic' references public.templates (key),
  theme           jsonb not null default '{}'::jsonb,   -- {"primary_color":"#...","show_images":true}
  is_published    boolean not null default false,
  slug_changed    boolean not null default false,       -- slug may be edited once
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_template_key_idx on public.businesses (template_key);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- Slug can only be changed once.
create or replace function public.guard_slug_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    if old.slug_changed then
      raise exception 'slug_already_changed';
    end if;
    new.slug_changed = true;
  end if;
  return new;
end;
$$;

create trigger businesses_guard_slug
  before update on public.businesses
  for each row execute function public.guard_slug_change();

-- -------------------------------------------------------------
-- social_links
-- -------------------------------------------------------------
create table public.social_links (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  platform    text not null
              check (platform in ('instagram', 'tiktok', 'facebook', 'website',
                                  'grabfood', 'gofood', 'shopeefood')),
  url         text not null check (url ~* '^https?://'),
  unique (business_id, platform)
);

-- -------------------------------------------------------------
-- categories
-- -------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, business_id)   -- allows composite FK from menu_items
);

create index categories_business_sort_idx on public.categories (business_id, sort_order);

-- -------------------------------------------------------------
-- menu_items
-- Composite FK guarantees the category belongs to the same business.
-- -------------------------------------------------------------
create table public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  category_id  uuid not null,
  name         text not null,
  description  text,
  price        integer not null check (price >= 0),   -- IDR, no decimals
  image_path   text,
  is_available boolean not null default true,         -- false = show "Sold out"
  is_featured  boolean not null default false,        -- "Favorite" badge
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  foreign key (category_id, business_id)
    references public.categories (id, business_id) on delete cascade
);

create index menu_items_business_category_sort_idx
  on public.menu_items (business_id, category_id, sort_order);

-- -------------------------------------------------------------
-- Publish guard (server-side, cannot be bypassed from the client):
--   * plan must be free_testimonial or paid
--   * at least 1 category and 1 menu item
-- -------------------------------------------------------------
create or replace function public.guard_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_plan text;
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    select plan into owner_plan from public.profiles where id = new.owner_id;

    if owner_plan not in ('free_testimonial', 'paid') then
      raise exception 'plan_not_allowed_to_publish';
    end if;

    if tg_op = 'INSERT'
       or not exists (select 1 from public.categories where business_id = new.id)
       or not exists (select 1 from public.menu_items where business_id = new.id) then
      raise exception 'menu_incomplete';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_guard_publish
  before insert or update on public.businesses
  for each row execute function public.guard_publish();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.templates    enable row level security;
alter table public.profiles     enable row level security;
alter table public.businesses   enable row level security;
alter table public.social_links enable row level security;
alter table public.categories   enable row level security;
alter table public.menu_items   enable row level security;

-- templates: readable by everyone
create policy "templates are public" on public.templates
  for select using (true);

-- profiles: user reads own row; updates limited (plan cannot be changed by client)
create policy "read own profile" on public.profiles
  for select using (id = (select auth.uid()));

create policy "update own profile" on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated, anon;
grant  update (full_name) on public.profiles to authenticated;

-- businesses
create policy "owner manages business" on public.businesses
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "public reads published business" on public.businesses
  for select using (is_published = true);

-- social_links
create policy "owner manages social links" on public.social_links
  for all
  using (exists (select 1 from public.businesses b
                 where b.id = social_links.business_id
                   and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b
                      where b.id = social_links.business_id
                        and b.owner_id = (select auth.uid())));

create policy "public reads social links" on public.social_links
  for select using (exists (select 1 from public.businesses b
                            where b.id = social_links.business_id
                              and b.is_published = true));

-- categories
create policy "owner manages categories" on public.categories
  for all
  using (exists (select 1 from public.businesses b
                 where b.id = categories.business_id
                   and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b
                      where b.id = categories.business_id
                        and b.owner_id = (select auth.uid())));

create policy "public reads categories" on public.categories
  for select using (exists (select 1 from public.businesses b
                            where b.id = categories.business_id
                              and b.is_published = true));

-- menu_items
create policy "owner manages menu items" on public.menu_items
  for all
  using (exists (select 1 from public.businesses b
                 where b.id = menu_items.business_id
                   and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b
                      where b.id = menu_items.business_id
                        and b.owner_id = (select auth.uid())));

create policy "public reads menu items" on public.menu_items
  for select using (exists (select 1 from public.businesses b
                            where b.id = menu_items.business_id
                              and b.is_published = true));

-- =============================================================
-- Storage: public bucket for menu images
-- Path convention: {business_id}/{uuid}.webp
-- =============================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- NOTE: do NOT use EXISTS with FROM businesses inside the check — businesses.name
-- column shadows storage.objects.name inside the subquery, breaking the path check.
-- Use IN with the path extraction in the outer context instead.
create policy "owner uploads menu images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      where b.owner_id = auth.uid()
    )
  );

create policy "owner updates menu images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      where b.owner_id = auth.uid()
    )
  );

create policy "owner deletes menu images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      where b.owner_id = auth.uid()
    )
  );

-- Public bucket: reads are served via public URL, no select policy needed.
