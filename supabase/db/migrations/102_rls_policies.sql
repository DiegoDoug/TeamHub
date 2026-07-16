-- Row Level Security: every table below is reachable only through policies
-- keyed off auth.uid() via team_members / event_groups / event_group_members,
-- per the role matrix in MVP-SPEC.md. No table relies on hidden client UI
-- for authorization.

set search_path = public;

-- PostgREST connects as `authenticator` and switches to `authenticated` for
-- any request bearing a valid user JWT. Table-level GRANTs are required in
-- addition to RLS (RLS filters rows; GRANT allows the operation at all).
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.teams,
  public.team_members,
  public.event_groups,
  public.event_group_members,
  public.training_cycles,
  public.training_weeks,
  public.training_days,
  public.workout_logs,
  public.channels,
  public.messages,
  public.calendar_events
to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.event_groups enable row level security;
alter table public.event_group_members enable row level security;
alter table public.training_cycles enable row level security;
alter table public.training_weeks enable row level security;
alter table public.training_days enable row level security;
alter table public.workout_logs enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.calendar_events enable row level security;

-- ---------------------------------------------------------------------
-- profiles — visible to yourself and anyone who shares a team with you;
-- editable only by yourself. Rows are inserted only by the
-- on_auth_user_created trigger (SECURITY DEFINER, bypasses RLS).
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.app_shares_team_with(id));

create policy profiles_update_self on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------
-- `created_by = auth.uid()` (not just app_is_team_member) matters here:
-- PostgREST's INSERT ... RETURNING evaluates this SELECT policy against the
-- new row before the on_team_created trigger (which grants head_coach
-- membership) has run, since RETURNING is projected per-row before AFTER
-- triggers fire — without this clause the creator's own "create team"
-- request would 42501 on the RETURNING step despite the insert being valid.
create policy teams_select on public.teams for select
  using (created_by = auth.uid() or public.app_is_team_member(id));

-- Any authenticated user may create a team (they become its head_coach via
-- trigger). created_by must be themselves.
create policy teams_insert on public.teams for insert
  with check (created_by = auth.uid());

create policy teams_update on public.teams for update
  using (public.app_is_head_coach(id))
  with check (public.app_is_head_coach(id));

-- ---------------------------------------------------------------------
-- team_members — head coach manages the roster (add/remove/change role).
-- Everyone on the team can read the roster. The head_coach row for a new
-- team is inserted by the on_team_created trigger (bypasses RLS).
-- ---------------------------------------------------------------------
create policy team_members_select on public.team_members for select
  using (public.app_is_team_member(team_id));

create policy team_members_insert on public.team_members for insert
  with check (public.app_is_head_coach(team_id));

create policy team_members_update on public.team_members for update
  using (public.app_is_head_coach(team_id))
  with check (public.app_is_head_coach(team_id));

create policy team_members_delete on public.team_members for delete
  using (public.app_is_head_coach(team_id));

-- ---------------------------------------------------------------------
-- event_groups — head coach only for create/edit; team-wide read.
-- ---------------------------------------------------------------------
create policy event_groups_select on public.event_groups for select
  using (public.app_is_team_member(team_id));

create policy event_groups_insert on public.event_groups for insert
  with check (public.app_is_head_coach(team_id));

create policy event_groups_update on public.event_groups for update
  using (public.app_is_head_coach(team_id))
  with check (public.app_is_head_coach(team_id));

create policy event_groups_delete on public.event_groups for delete
  using (public.app_is_head_coach(team_id));

-- ---------------------------------------------------------------------
-- event_group_members — head coach (any group) or that group's event
-- coach may add/remove athletes. Team-wide read.
-- ---------------------------------------------------------------------
create policy event_group_members_select on public.event_group_members for select
  using (public.app_is_team_member(public.app_event_group_team_id(event_group_id)));

create policy event_group_members_insert on public.event_group_members for insert
  with check (public.app_is_group_coach(event_group_id));

create policy event_group_members_delete on public.event_group_members for delete
  using (public.app_is_group_coach(event_group_id));

-- ---------------------------------------------------------------------
-- training_cycles / training_weeks / training_days — manage scoped to the
-- owning event group's coach (or the team's head coach); readable by the
-- group's coach and its athlete members (so athletes see their plan).
-- ---------------------------------------------------------------------
create policy training_cycles_select on public.training_cycles for select
  using (public.app_can_view_group(event_group_id));

create policy training_cycles_write on public.training_cycles for all
  using (public.app_is_group_coach(event_group_id))
  with check (public.app_is_group_coach(event_group_id));

create policy training_weeks_select on public.training_weeks for select
  using (public.app_can_view_group(public.app_cycle_group_id(cycle_id)));

create policy training_weeks_write on public.training_weeks for all
  using (public.app_is_group_coach(public.app_cycle_group_id(cycle_id)))
  with check (public.app_is_group_coach(public.app_cycle_group_id(cycle_id)));

create policy training_days_select on public.training_days for select
  using (public.app_can_view_group(public.app_week_group_id(week_id)));

create policy training_days_write on public.training_days for all
  using (public.app_is_group_coach(public.app_week_group_id(week_id)))
  with check (public.app_is_group_coach(public.app_week_group_id(week_id)));

-- ---------------------------------------------------------------------
-- workout_logs — athletes manage their own logs; head coach sees every
-- athlete on their team; event coach sees athletes in groups they coach.
-- ---------------------------------------------------------------------
create policy workout_logs_select on public.workout_logs for select
  using (
    athlete_id = auth.uid()
    or public.app_is_coach_of_athlete(athlete_id)
  );

create policy workout_logs_insert on public.workout_logs for insert
  with check (athlete_id = auth.uid());

create policy workout_logs_update on public.workout_logs for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy workout_logs_delete on public.workout_logs for delete
  using (athlete_id = auth.uid());

-- ---------------------------------------------------------------------
-- channels — visible to whoever can post in them (team members for
-- 'team' channels, group coach/members for 'event_group' channels).
-- Channels themselves are only ever created by the auto-provisioning
-- triggers (SECURITY DEFINER, bypasses RLS) — no direct insert policy.
-- ---------------------------------------------------------------------
create policy channels_select on public.channels for select
  using (
    case type
      when 'team' then public.app_is_team_member(team_id)
      when 'event_group' then public.app_can_view_group(event_group_id)
      else false
    end
  );

-- ---------------------------------------------------------------------
-- messages — post/read scoped to channel access; senders may only send
-- as themselves.
-- ---------------------------------------------------------------------
create policy messages_select on public.messages for select
  using (public.app_can_access_channel(channel_id));

create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.app_can_access_channel(channel_id));

-- ---------------------------------------------------------------------
-- calendar_events — team-wide read; head coach (whole team) or event
-- coach (their own group only) may create/edit/delete. Athletes: read only.
-- ---------------------------------------------------------------------
create policy calendar_events_select on public.calendar_events for select
  using (public.app_is_team_member(team_id));

create policy calendar_events_insert on public.calendar_events for insert
  with check (
    created_by = auth.uid()
    and (
      (event_group_id is null and public.app_is_head_coach(team_id))
      or (event_group_id is not null and public.app_is_group_coach(event_group_id))
    )
  );

create policy calendar_events_update on public.calendar_events for update
  using (
    (event_group_id is null and public.app_is_head_coach(team_id))
    or (event_group_id is not null and public.app_is_group_coach(event_group_id))
  )
  with check (
    (event_group_id is null and public.app_is_head_coach(team_id))
    or (event_group_id is not null and public.app_is_group_coach(event_group_id))
  );

create policy calendar_events_delete on public.calendar_events for delete
  using (
    (event_group_id is null and public.app_is_head_coach(team_id))
    or (event_group_id is not null and public.app_is_group_coach(event_group_id))
  );

-- ---------------------------------------------------------------------
-- Realtime: allow authenticated clients to subscribe to postgres_changes
-- on messages (chat). Supabase Realtime enforces RLS using the same
-- policies above via its own replication role, so no separate broadcast
-- policy table is required for this MVP.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
