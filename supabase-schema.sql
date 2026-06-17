-- Couples Connect full web-app schema with photo and video media uploads
-- Run this in Supabase SQL Editor before using the app.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  name text not null,
  basics text,
  personality text,
  needs text,
  life text,
  passcode_hash text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists links (
  id uuid primary key,
  profile_a uuid not null references profiles(id) on delete cascade,
  profile_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(profile_a, profile_b)
);

create table if not exists moods (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  mood text,
  note text,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists activities (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists albums (
  id uuid primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','shared')),
  created_at timestamptz default now()
);

create table if not exists photos (
  id uuid primary key,
  album_id uuid not null references albums(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text,
  type text,
  media_kind text default 'image' check (media_kind in ('image','video')),
  storage_path text,
  url text,
  data_url text,
  created_at timestamptz default now()
);

alter table profiles add column if not exists passcode_hash text;
alter table profiles add column if not exists updated_at timestamptz default now();
alter table photos add column if not exists media_kind text default 'image';

create table if not exists calls (
  id uuid primary key,
  from_id uuid references profiles(id) on delete cascade,
  to_id uuid references profiles(id) on delete cascade,
  status text default 'ringing',
  recording boolean default false,
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key,
  call_id uuid references calls(id) on delete cascade,
  from_id uuid references profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists recordings (
  id uuid primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  call_id uuid references calls(id) on delete set null,
  name text,
  storage_path text,
  url text,
  data_url text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key,
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  cipher text not null,
  iv text not null,
  created_at timestamptz default now()
);

alter table profiles replica identity full;
alter table partners replica identity full;
alter table links replica identity full;
alter table moods replica identity full;
alter table notes replica identity full;
alter table activities replica identity full;
alter table albums replica identity full;
alter table photos replica identity full;
alter table calls replica identity full;
alter table signals replica identity full;
alter table recordings replica identity full;
alter table messages replica identity full;

do $$ begin alter publication supabase_realtime add table profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table partners; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table links; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table moods; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table notes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table activities; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table albums; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table photos; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table calls; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table signals; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table recordings; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table messages; exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('couples-media', 'couples-media', true)
on conflict (id) do update set public = true;

-- Simple open policies for testing with embedded public key.
-- For production, replace these with Supabase Auth user-based policies.
alter table profiles enable row level security;
alter table partners enable row level security;
alter table links enable row level security;
alter table moods enable row level security;
alter table notes enable row level security;
alter table activities enable row level security;
alter table albums enable row level security;
alter table photos enable row level security;
alter table calls enable row level security;
alter table signals enable row level security;
alter table recordings enable row level security;
alter table messages enable row level security;

do $$ begin
  create policy "public read profiles" on profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "public write profiles" on profiles for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all partners" on partners for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all links" on links for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all moods" on moods for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all notes" on notes for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all activities" on activities for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all albums" on albums for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all photos" on photos for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all calls" on calls for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all signals" on signals for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all recordings" on recordings for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public all messages" on messages for all using (true) with check (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "public storage read" on storage.objects for select using (bucket_id = 'couples-media'); exception when duplicate_object then null; end $$;
do $$ begin create policy "public storage insert" on storage.objects for insert with check (bucket_id = 'couples-media'); exception when duplicate_object then null; end $$;
do $$ begin create policy "public storage update" on storage.objects for update using (bucket_id = 'couples-media') with check (bucket_id = 'couples-media'); exception when duplicate_object then null; end $$;
do $$ begin create policy "public storage delete" on storage.objects for delete using (bucket_id = 'couples-media'); exception when duplicate_object then null; end $$;
-- Gallery/location update additions. Safe to run on an existing project.
alter table photos add column if not exists size_bytes bigint;
alter table photos add column if not exists updated_at timestamptz default now();

create table if not exists location_shares (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  share_mode text not null default 'snapshot' check (share_mode in ('snapshot','live')),
  is_live boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table location_shares replica identity full;
alter table location_shares enable row level security;

do $$ begin alter publication supabase_realtime add table location_shares; exception when duplicate_object then null; end $$;
do $$ begin create policy "public all location_shares" on location_shares for all using (true) with check (true); exception when duplicate_object then null; end $$;

-- Ensure Storage bucket exists and accepts raw image/video/call recording uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couples-media', 'couples-media', true, 524288000, array['image/*','video/*','audio/*','application/octet-stream'])
on conflict (id) do update set public = true, file_size_limit = 524288000, allowed_mime_types = array['image/*','video/*','audio/*','application/octet-stream'];

notify pgrst, 'reload schema';
