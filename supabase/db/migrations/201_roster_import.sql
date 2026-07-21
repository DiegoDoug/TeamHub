-- Feature: bulk roster import (CSV paste / roster-URL fetch) + claim-by-code.
--
-- A head coach onboarding a whole university roster can't use the existing
-- "add a person to the roster by email" flow (200_roster_lookup.sql) — none
-- of those athletes have TrackHub accounts yet, and bulk import sources
-- (a pasted CSV, a scraped athletics roster page) never carry an email
-- address anyway. So imported rows land here as *placeholders*, not real
-- team_members rows. The team gets a persistent join_code; when an athlete
-- signs up, they enter the code, see their team's unclaimed placeholders,
-- and claim their own row, which is what actually creates their
-- team_members (+ event_group_members) row. This table intentionally does
-- not touch team_members/event_group_members, so none of the existing RLS
-- helper functions need to change.

set search_path = public;

alter table public.teams
  add column join_code text unique;

create table public.pending_roster_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_group_id uuid references public.event_groups (id) on delete set null,
  full_name text not null,
  role text not null default 'athlete' check (role in ('athlete', 'event_coach')),
  source text not null check (source in ('csv', 'url', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'claimed')),
  claimed_profile_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index pending_roster_members_team_idx on public.pending_roster_members (team_id);

grant select, insert, update, delete on public.pending_roster_members to authenticated;

alter table public.pending_roster_members enable row level security;

-- ---------------------------------------------------------------------
-- pending_roster_members — head coach only, same shape as team_members
-- policies in 102_rls_policies.sql. The claim_roster_slot() RPC below is
-- how a not-yet-team-member athlete transitions a row to 'claimed' —
-- it's SECURITY DEFINER and bypasses these policies on purpose.
-- ---------------------------------------------------------------------
create policy pending_roster_members_select on public.pending_roster_members for select
  using (public.app_is_head_coach(team_id));

create policy pending_roster_members_insert on public.pending_roster_members for insert
  with check (public.app_is_head_coach(team_id));

create policy pending_roster_members_update on public.pending_roster_members for update
  using (public.app_is_head_coach(team_id))
  with check (public.app_is_head_coach(team_id));

create policy pending_roster_members_delete on public.pending_roster_members for delete
  using (public.app_is_head_coach(team_id));

-- ---------------------------------------------------------------------
-- list_pending_roster_by_join_code — lets someone who isn't a team member
-- yet (the whole point of a join code) see the team name and their
-- team's unclaimed placeholder names, without exposing anything else.
-- A valid code with zero pending rows still returns one row (team info,
-- null pending fields) so the client can tell "bad code" apart from
-- "valid code, empty roster".
-- ---------------------------------------------------------------------
create or replace function public.list_pending_roster_by_join_code(p_code text)
returns table (
  pending_id uuid,
  team_id uuid,
  team_name text,
  full_name text,
  event_group_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select prm.id, t.id, t.name, prm.full_name, eg.name
  from public.teams t
  left join public.pending_roster_members prm
    on prm.team_id = t.id and prm.status = 'pending'
  left join public.event_groups eg on eg.id = prm.event_group_id
  where t.join_code = p_code
  order by prm.full_name;
$$;

revoke execute on function public.list_pending_roster_by_join_code(text) from public;
revoke execute on function public.list_pending_roster_by_join_code(text) from anon;
grant execute on function public.list_pending_roster_by_join_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- claim_roster_slot — the athlete's half of the claim flow. Verifies the
-- code still matches the pending row's team and the row is still
-- unclaimed (atomically, via the UPDATE ... WHERE ... RETURNING below, so
-- two concurrent claims of the same row can't both succeed), then creates
-- the real team_members row (and event_group_members row, if the
-- placeholder had a group) using this function's elevated privileges —
-- mirroring handle_new_team's trigger-time insert in
-- 101_functions_triggers.sql. Role is read from the pending row itself,
-- not taken from a caller-supplied parameter, so a claiming user can't
-- request a role the coach didn't set (e.g. head_coach).
-- ---------------------------------------------------------------------
create or replace function public.claim_roster_slot(p_pending_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_event_group_id uuid;
  v_role text;
begin
  update public.pending_roster_members
  set status = 'claimed', claimed_profile_id = auth.uid()
  where id = p_pending_id
    and status = 'pending'
    and team_id = (select id from public.teams where join_code = p_code)
  returning team_id, event_group_id, role into v_team_id, v_event_group_id, v_role;

  if v_team_id is null then
    raise exception 'This roster slot is no longer available.';
  end if;

  insert into public.team_members (team_id, profile_id, role)
  values (v_team_id, auth.uid(), v_role)
  on conflict (team_id, profile_id) do nothing;

  if v_event_group_id is not null then
    insert into public.event_group_members (event_group_id, profile_id)
    values (v_event_group_id, auth.uid())
    on conflict (event_group_id, profile_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.claim_roster_slot(uuid, text) from public;
revoke execute on function public.claim_roster_slot(uuid, text) from anon;
grant execute on function public.claim_roster_slot(uuid, text) to authenticated;
