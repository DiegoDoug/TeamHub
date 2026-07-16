-- Helper functions + triggers that keep team/channel/role invariants
-- consistent at the DB layer (not just in application code).
--
-- All app_* helpers are SECURITY DEFINER so they can read team_members /
-- event_groups without recursing through the RLS policies defined on those
-- same tables (the standard Supabase pattern for role-check helpers).

set search_path = public;

-- 1. Auto-provision a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Creating a team makes its creator the head_coach and auto-creates the
--    team-wide chat channel.
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.team_members (team_id, profile_id, role)
    values (new.id, new.created_by, 'head_coach')
    on conflict (team_id, profile_id) do nothing;
  end if;

  insert into public.channels (team_id, type, name)
  values (new.id, 'team', new.name || ' — Team');

  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

-- 3. Creating an event group auto-creates its chat channel.
create or replace function public.handle_new_event_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.channels (team_id, type, event_group_id, name)
  values (new.team_id, 'event_group', new.id, new.name);
  return new;
end;
$$;

create trigger on_event_group_created
  after insert on public.event_groups
  for each row execute function public.handle_new_event_group();

-- ---------------------------------------------------------------------
-- Role-check helpers used by RLS policies (see 102_rls_policies.sql).
-- ---------------------------------------------------------------------

create or replace function public.app_team_role(p_team_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.team_members
  where team_id = p_team_id and profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.app_is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and profile_id = auth.uid()
  );
$$;

create or replace function public.app_is_head_coach(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.app_team_role(p_team_id) = 'head_coach';
$$;

create or replace function public.app_shares_team_with(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm1
    join public.team_members tm2 on tm1.team_id = tm2.team_id
    where tm1.profile_id = auth.uid() and tm2.profile_id = p_profile_id
  );
$$;

create or replace function public.app_event_group_team_id(p_event_group_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id from public.event_groups where id = p_event_group_id;
$$;

-- Head coach of the group's team, OR the group's own event coach.
create or replace function public.app_is_group_coach(p_event_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.app_is_head_coach(public.app_event_group_team_id(p_event_group_id))
    or exists (
      select 1 from public.event_groups
      where id = p_event_group_id and event_coach_id = auth.uid()
    );
$$;

-- Group coach (per above) OR an athlete who belongs to the group.
create or replace function public.app_can_view_group(p_event_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.app_is_group_coach(p_event_group_id)
    or exists (
      select 1 from public.event_group_members
      where event_group_id = p_event_group_id and profile_id = auth.uid()
    );
$$;

create or replace function public.app_cycle_group_id(p_cycle_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select event_group_id from public.training_cycles where id = p_cycle_id;
$$;

create or replace function public.app_week_group_id(p_week_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select public.app_cycle_group_id(cycle_id) from public.training_weeks where id = p_week_id;
$$;

create or replace function public.app_day_group_id(p_day_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select public.app_week_group_id(week_id) from public.training_days where id = p_day_id;
$$;

-- True if the caller is a head_coach of the athlete's team, or an
-- event_coach of a group the athlete belongs to.
create or replace function public.app_is_coach_of_athlete(p_athlete_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.profile_id = p_athlete_id
      and public.app_is_head_coach(tm.team_id)
  )
  or exists (
    select 1
    from public.event_group_members egm
    join public.event_groups eg on eg.id = egm.event_group_id
    where egm.profile_id = p_athlete_id
      and eg.event_coach_id = auth.uid()
  );
$$;

create or replace function public.app_channel_team_id(p_channel_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id from public.channels where id = p_channel_id;
$$;

create or replace function public.app_can_access_channel(p_channel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    case c.type
      when 'team' then public.app_is_team_member(c.team_id)
      when 'event_group' then public.app_can_view_group(c.event_group_id)
      else false
    end
  from public.channels c
  where c.id = p_channel_id;
$$;
