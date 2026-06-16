-- ============================================================
-- PROTEA TEAM APP — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- PROFILES (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null check (role in ('angler', 'coach', 'manager')),
  team text check (team in ('U19', 'U24', 'management')),
  initials text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Profiles visible to all authenticated" on profiles for select using (auth.role() = 'authenticated');
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- FLIES (shared flybox)
create table flies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  size text not null,
  sector text,
  photo_url text,
  added_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table flies enable row level security;
create policy "Flies visible to all authenticated" on flies for select using (auth.role() = 'authenticated');
create policy "Authenticated users can add flies" on flies for insert with check (auth.role() = 'authenticated');

-- ENTRIES (all feedback submissions — practice and competition)
create table entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  entry_mode text not null check (entry_mode in ('practice', 'competition')),
  water_type text check (water_type in ('lough', 'river')),
  entry_type text check (entry_type in ('fish_feedback', 'observation', 'end_of_day', 'competition')),
  sector text not null,
  practice_water_name text,
  conditions text,
  conditions_other text,

  -- Fish feedback (lough)
  line_used text,
  method text,
  fly_id uuid references flies(id),
  fly_name_manual text,
  retrieve_speed text,
  retrieve_activations text[],

  -- Fish feedback (river)
  river_method text,

  -- Shared fish feedback
  additional_notes text,

  -- Observation
  obs_learning text,
  obs_importance text,
  obs_comp_sector text,
  obs_other text,

  -- End of day
  eod_practiced_for text,
  eod_confidence int check (eod_confidence between 1 and 5),
  eod_general_feedback text,
  eod_key_learnings text[],
  eod_biggest_challenge text,
  eod_top_fly_ids uuid[],

  -- Competition
  comp_beat text,
  comp_boat_partner text,
  comp_fish_count int,
  comp_placing text,
  comp_fly_ids uuid[],
  comp_methods_fished text[],
  comp_most_effective_method text,
  comp_technique_description text,
  comp_areas_focused text,
  comp_areas_productive text,
  comp_areas_missed text,
  comp_boat_partner_notes text,
  comp_suggestion_to_next text,

  created_at timestamptz default now()
);
alter table entries enable row level security;
create policy "Entries visible to all authenticated" on entries for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create entries" on entries for insert with check (auth.uid() = user_id);

-- REACTIONS
create table reactions (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references entries(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(entry_id, user_id, emoji)
);
alter table reactions enable row level security;
create policy "Reactions visible to all authenticated" on reactions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can react" on reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove own reactions" on reactions for delete using (auth.uid() = user_id);

-- COMMENTS
create table comments (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references entries(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  body text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "Comments visible to all authenticated" on comments for select using (auth.role() = 'authenticated');
create policy "Authenticated users can comment" on comments for insert with check (auth.uid() = user_id);

-- SECTOR PLANS (coach editable)
create table sector_plans (
  id uuid default gen_random_uuid() primary key,
  sector text not null unique,
  plan_text text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
alter table sector_plans enable row level security;
create policy "Plans visible to all authenticated" on sector_plans for select using (auth.role() = 'authenticated');
create policy "Coaches and managers can upsert plans" on sector_plans for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'manager'))
);

-- STORAGE bucket for fly photos
insert into storage.buckets (id, name, public) values ('fly-photos', 'fly-photos', true);
create policy "Anyone authenticated can upload fly photos" on storage.objects for insert with check (
  bucket_id = 'fly-photos' and auth.role() = 'authenticated'
);
create policy "Fly photos are publicly readable" on storage.objects for select using (bucket_id = 'fly-photos');

-- Seed sector plans
insert into sector_plans (sector, plan_text) values
  ('Lough Craghy', 'Plan not yet set — add after practice.'),
  ('Lough Anure', 'Plan not yet set — add after practice.'),
  ('Lough Deele', 'Plan not yet set — add after practice.'),
  ('River Dennett', 'Plan not yet set — add after practice.'),
  ('River Quiggery', 'Plan not yet set — add after practice.');
