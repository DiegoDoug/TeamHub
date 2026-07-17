-- Feature 2 (Team & event group management) support function.
--
-- The head coach's "add a person to the roster by email" flow needs to find
-- an existing profile by email before inserting a team_members row. Plain
-- `select * from profiles where email = ...` is blocked by RLS for a
-- brand-new person (profiles_select only allows rows for yourself or people
-- who already share a team with you — and a person being newly added shares
-- no team yet). This SECURITY DEFINER function exposes just enough (id +
-- name) to make that lookup possible without weakening profiles RLS itself.

set search_path = public;

create or replace function public.lookup_profile_by_email(p_email text)
returns table (id uuid, full_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where lower(p.email) = lower(p_email)
  limit 1;
$$;

-- Only signed-in users may call this (id + name only, no other PII, so
-- broad exec access among authenticated users is safe). This project's
-- self-hosted Supabase setup has `alter default privileges ... grant
-- execute on functions to anon, authenticated, service_role`, so new
-- functions are EXECUTE-able by the unauthenticated `anon` role unless
-- explicitly revoked — do that here.
revoke execute on function public.lookup_profile_by_email(text) from public;
revoke execute on function public.lookup_profile_by_email(text) from anon;
grant execute on function public.lookup_profile_by_email(text) to authenticated;
