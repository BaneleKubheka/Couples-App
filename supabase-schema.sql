-- Couples Connect demo schema
-- Run this in Supabase SQL Editor.
-- Demo policies are permissive for easy testing. Lock them down before production.

create table if not exists profiles (
  id uuid primary key,
  name text not null,
  basics text,
  personality text,
  needs text,
  life text,
  created_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key,
  owner_id uuid not null,
  name text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists links (
  id uuid primary key,
  profile_a uuid not null,
  profile_b uuid not null,
  created_at timestamptz default now()
);

create table if not exists moods (
  id uuid primary key,
  profile_id uuid not null,
  mood text not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key,
  profile_id uuid not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists activities (
  id uuid primary key,
  profile_id uuid not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists albums (
  id uuid primary key,
  owner_id uuid not null,
  name text not null,
  visibility text not null default 'private',
  created_at timestamptz default now()
);

create table if not exists photos (
  id uuid primary key,
  album_id uuid not null,
  owner_id uuid not null,
  name text,
  type text,
  data_url text,
  created_at timestamptz default now()
);

create table if not exists recordings (
  id uuid primary key,
  owner_id uuid not null,
  name text,
  data_url text,
  created_at timestamptz default now()
);

create table if not exists calls (
  id uuid primary key,
  from_id uuid not null,
  to_id uuid not null,
  status text default 'ringing',
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key,
  call_id uuid not null,
  from_id uuid not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table partners;
alter publication supabase_realtime add table links;
alter publication supabase_realtime add table moods;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table albums;
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table recordings;
alter publication supabase_realtime add table calls;
alter publication supabase_realtime add table signals;

alter table profiles enable row level security;
alter table partners enable row level security;
alter table links enable row level security;
alter table moods enable row level security;
alter table notes enable row level security;
alter table activities enable row level security;
alter table albums enable row level security;
alter table photos enable row level security;
alter table recordings enable row level security;
alter table calls enable row level security;
alter table signals enable row level security;

-- Demo-only public policies. Replace with authenticated policies before real use.
do $$ begin
  create policy "demo public profiles" on profiles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public partners" on partners for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public links" on links for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public moods" on moods for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public notes" on notes for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public activities" on activities for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public albums" on albums for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public photos" on photos for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public recordings" on recordings for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public calls" on calls for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo public signals" on signals for all using (true) with check (true);
exception when duplicate_object then null; end $$;
