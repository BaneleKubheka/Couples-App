-- Couples Connect production-features schema
-- Run this entire file in Supabase SQL Editor.
-- Supabase URL/key remain embedded in index.html; users are never asked for setup on launch.

create extension if not exists "pgcrypto";

create table if not exists profiles (id uuid primary key, name text not null, basics text, personality text, needs text, life text, created_at timestamptz default now());
create table if not exists partners (id uuid primary key, owner_id uuid not null, name text not null, notes text, created_at timestamptz default now());
create table if not exists links (id uuid primary key, profile_a uuid not null, profile_b uuid not null, created_at timestamptz default now());
create table if not exists moods (id uuid primary key, profile_id uuid not null, mood text not null, note text, created_at timestamptz default now());
create table if not exists notes (id uuid primary key, profile_id uuid not null, body text not null, created_at timestamptz default now());
create table if not exists activities (id uuid primary key, profile_id uuid not null, body text not null, created_at timestamptz default now());
create table if not exists albums (id uuid primary key, owner_id uuid not null, name text not null, visibility text not null default 'private', encrypted boolean default true, created_at timestamptz default now());
create table if not exists photos (id uuid primary key, album_id uuid not null, owner_id uuid not null, name text, type text, data_url text, storage_path text, encrypted boolean default false, created_at timestamptz default now());
create table if not exists recordings (id uuid primary key, owner_id uuid not null, name text, data_url text, storage_path text, public_url text, created_at timestamptz default now());
create table if not exists calls (id uuid primary key, from_id uuid not null, to_id uuid not null, status text default 'ringing', created_at timestamptz default now());
create table if not exists signals (id uuid primary key, call_id uuid not null, from_id uuid not null, type text not null, payload jsonb not null, created_at timestamptz default now());
create table if not exists messages (id uuid primary key, from_id uuid not null, to_id uuid not null, ciphertext text not null, created_at timestamptz default now());
create table if not exists recording_states (id text primary key, call_id uuid not null, profile_id uuid not null, active boolean default false, created_at timestamptz default now());
create table if not exists notification_events (id uuid primary key, profile_id uuid, event_type text, body text, created_at timestamptz default now());
create table if not exists push_subscriptions (id uuid primary key default gen_random_uuid(), profile_id uuid, subscription jsonb not null, created_at timestamptz default now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couples-media','couples-media', true, 52428800, array['image/png','image/jpeg','image/webp','image/gif','video/webm','application/octet-stream'])
on conflict (id) do update set public=true;

do $$ begin
  alter publication supabase_realtime add table profiles; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table partners; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table links; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table moods; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notes; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table activities; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table albums; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table photos; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table recordings; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table calls; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table signals; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table messages; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table recording_states; exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notification_events; exception when duplicate_object then null; end $$;

alter table profiles enable row level security; alter table partners enable row level security; alter table links enable row level security; alter table moods enable row level security; alter table notes enable row level security; alter table activities enable row level security; alter table albums enable row level security; alter table photos enable row level security; alter table recordings enable row level security; alter table calls enable row level security; alter table signals enable row level security; alter table messages enable row level security; alter table recording_states enable row level security; alter table notification_events enable row level security; alter table push_subscriptions enable row level security;

-- Demo/public policies for a static app using publishable key. Replace with Supabase Auth policies before public production use.
do $$ declare t text; begin
  foreach t in array array['profiles','partners','links','moods','notes','activities','albums','photos','recordings','calls','signals','messages','recording_states','notification_events','push_subscriptions'] loop
    execute format('drop policy if exists "demo public %1$s" on %1$s', t);
    execute format('create policy "demo public %1$s" on %1$s for all using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "demo public storage read" on storage.objects;
drop policy if exists "demo public storage write" on storage.objects;
create policy "demo public storage read" on storage.objects for select using (bucket_id='couples-media');
create policy "demo public storage write" on storage.objects for all using (bucket_id='couples-media') with check (bucket_id='couples-media');
