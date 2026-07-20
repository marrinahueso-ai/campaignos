-- Secure team invites: expiring invitation tokens
alter table public.organization_users
  add column if not exists invite_expires_at timestamptz;

create index if not exists organization_users_invite_expires_at_idx
  on public.organization_users (invite_expires_at)
  where invite_token is not null and status = 'invited';

-- Backfill existing pending invites to expire 7 days from invited_at (or now).
update public.organization_users
set invite_expires_at = coalesce(invited_at, now()) + interval '7 days'
where status = 'invited'
  and invite_token is not null
  and invite_expires_at is null;
