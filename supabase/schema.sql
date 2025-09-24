-- Techpacker PostgreSQL schema (for Supabase)

create table if not exists public.techpacks (
  id text primary key,
  name text not null,
  category text not null,
  status text not null check (status in ('draft','review','approved','production')),
  date_created timestamptz not null default now(),
  last_modified timestamptz not null default now(),
  season text not null,
  brand text not null,
  designer text not null,
  images jsonb not null default '[]'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  measurements jsonb not null default '[]'::jsonb,
  construction_details jsonb not null default '[]'::jsonb,
  colorways jsonb not null default '[]'::jsonb
);

create table if not exists public.activities (
  id text primary key,
  action text not null,
  item text not null,
  time text not null,
  user_name text not null,
  created_at timestamptz not null default now()
);

-- Supabase Row Level Security (RLS)
alter table public.techpacks enable row level security;
alter table public.activities enable row level security;

-- Simple open policies (adjust for your auth model)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='techpacks' and policyname='Allow read'
  ) then
    create policy "Allow read" on public.techpacks for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='techpacks' and policyname='Allow write'
  ) then
    create policy "Allow write" on public.techpacks for all using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='activities' and policyname='Allow read'
  ) then
    create policy "Allow read" on public.activities for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='activities' and policyname='Allow write'
  ) then
    create policy "Allow write" on public.activities for all using (true) with check (true);
  end if;
end $$;


