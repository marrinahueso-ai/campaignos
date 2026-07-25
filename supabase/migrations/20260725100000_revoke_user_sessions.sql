-- Security fix: deactivating a team member (updateTeamMemberAction ->
-- status: "deactivated") only flipped their organization_users row — their
-- existing Supabase auth session/refresh token kept working until it
-- naturally expired, and could be silently refreshed indefinitely, giving a
-- deactivated member continued access for as long as their browser tab
-- stayed open (RLS still blocked org data since is_active_org_member checks
-- status = 'active', but the underlying session itself was never revoked).
--
-- This RPC (called by the service-role admin client right after a
-- deactivation) deletes the user's rows from auth.sessions, which cascades
-- to auth.refresh_tokens, so any further refresh-token exchange fails and
-- they're forced back through the login screen. The already-issued access
-- token (JWT) is still valid for its own short remaining lifetime (stateless
-- signature check) — that residual window is an accepted trade-off absent
-- a stateful JWT blocklist.

create or replace function public.revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with deleted as (
    delete from auth.sessions
    where user_id = p_user_id
    returning 1
  )
  select count(*)::integer into v_count from deleted;

  return v_count;
end;
$$;

comment on function public.revoke_user_sessions(uuid) is
  'Force-logs-out a user by deleting their auth.sessions rows (cascades to auth.refresh_tokens). Service-role only — called when a membership is deactivated/removed.';

revoke all on function public.revoke_user_sessions(uuid) from public;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
