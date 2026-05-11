
-- Enums
create type public.sponsor_tier as enum ('none','bronze','silver','gold','s_tier');

-- Towns
create table public.towns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  county text not null,
  state text not null default 'WI',
  zip_codes text[] not null default '{}',
  latitude double precision not null,
  longitude double precision not null,
  hero_blurb text,
  created_at timestamptz not null default now()
);

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  display_order int not null default 0
);

-- Businesses
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.towns(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  subcategory text,
  address text,
  phone text,
  website text,
  description text,
  logo_url text,
  coupon_text text,
  coupon_expires date,
  sponsor_tier public.sponsor_tier not null default 'none',
  featured_order int not null default 0,
  scraped_from text,
  last_scraped timestamptz,
  created_at timestamptz not null default now()
);

create index businesses_town_idx on public.businesses(town_id);
create index businesses_category_idx on public.businesses(category_id);
create index businesses_sponsor_idx on public.businesses(sponsor_tier, featured_order);

-- Sponsor tiers reference
create table public.sponsor_tiers (
  id uuid primary key default gen_random_uuid(),
  key public.sponsor_tier not null unique,
  name text not null,
  price_monthly numeric not null default 0,
  display_priority int not null default 0
);

-- RLS: public read only
alter table public.towns enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.sponsor_tiers enable row level security;

create policy "towns are publicly readable" on public.towns for select using (true);
create policy "categories are publicly readable" on public.categories for select using (true);
create policy "businesses are publicly readable" on public.businesses for select using (true);
create policy "sponsor_tiers are publicly readable" on public.sponsor_tiers for select using (true);

-- Nearest-town RPC (haversine)
create or replace function public.nearest_town(lat double precision, lng double precision, max_km double precision default 30)
returns table (slug text, name text, distance_km double precision)
language sql stable as $$
  select t.slug, t.name,
    (6371 * acos(
      cos(radians(lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(t.latitude))
    )) as distance_km
  from public.towns t
  order by distance_km asc
  limit 1;
$$;

-- Town by ZIP RPC
create or replace function public.town_by_zip(zip text)
returns table (slug text, name text)
language sql stable as $$
  select slug, name from public.towns where zip = any(zip_codes) limit 1;
$$;
