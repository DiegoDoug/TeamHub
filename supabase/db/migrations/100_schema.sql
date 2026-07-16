-- TrackHub MVP schema. See MVP-SPEC.md "Data model" for the source of truth.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  primary_events text not null default '',
  prs jsonb not null default '[]'::jsonb, -- [{ "event": "100m", "mark": "10.9", "date": "2026-04-12" }, ...]
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('head_coach', 'event_coach', 'athlete')),
  created_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

create table public.event_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  event_coach_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.event_group_members (
  id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null references public.event_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_group_id, profile_id)
);

create table public.training_cycles (
  id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null references public.event_groups (id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  phase text,
  created_at timestamptz not null default now()
);

create table public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.training_cycles (id) on delete cascade,
  week_number int not null,
  focus text,
  notes text,
  unique (cycle_id, week_number)
);

create table public.training_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.training_weeks (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Mon .. 6=Sun
  warmup text,
  drills text,
  main_work text,
  cooldown text,
  notes text,
  unique (week_id, day_of_week)
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  training_day_id uuid references public.training_days (id) on delete set null,
  workout_type text not null check (workout_type in ('distance', 'speed', 'weights', 'technical')),
  data jsonb not null default '{}'::jsonb,
  effort_rating int check (effort_rating between 1 and 10),
  notes text,
  logged_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  type text not null check (type in ('team', 'event_group')),
  event_group_id uuid references public.event_groups (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint channels_group_type_check check (
    (type = 'team' and event_group_id is null) or
    (type = 'event_group' and event_group_id is not null)
  )
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  content text not null check (char_length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_group_id uuid references public.event_groups (id) on delete cascade,
  type text not null check (type in ('practice', 'meet', 'team_meeting', 'other')),
  title text not null,
  description text,
  date date not null,
  start_time time,
  end_time time,
  location text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Indexes for the join/filter patterns the app actually uses.
create index team_members_team_idx on public.team_members (team_id);
create index team_members_profile_idx on public.team_members (profile_id);
create index event_groups_team_idx on public.event_groups (team_id);
create index event_group_members_group_idx on public.event_group_members (event_group_id);
create index event_group_members_profile_idx on public.event_group_members (profile_id);
create index training_cycles_group_idx on public.training_cycles (event_group_id);
create index training_weeks_cycle_idx on public.training_weeks (cycle_id);
create index training_days_week_idx on public.training_days (week_id);
create index workout_logs_athlete_idx on public.workout_logs (athlete_id, logged_at desc);
create index workout_logs_training_day_idx on public.workout_logs (training_day_id);
create index channels_team_idx on public.channels (team_id);
create index channels_group_idx on public.channels (event_group_id);
create index messages_channel_idx on public.messages (channel_id, created_at);
create index calendar_events_team_idx on public.calendar_events (team_id, date);
create index calendar_events_group_idx on public.calendar_events (event_group_id, date);
