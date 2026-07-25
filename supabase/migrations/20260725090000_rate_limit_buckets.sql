-- Security fix: no rate limiting existed anywhere (login, OTP/magic-link
-- send, invite accept, password change, founding-access code entry, Ask
-- Ralli/AI generation). Adds a small fixed-window counter table + an atomic
-- RPC the app calls (via the service-role admin client) from server actions
-- before those operations run.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rate_limit_buckets is
  'Fixed-window request counters for app-level rate limiting (login, OTP, invite accept, AI actions, etc). Service-role only.';

alter table public.rate_limit_buckets enable row level security;
-- No policies: only the service-role admin client (server actions) touches
-- this table, so RLS denies anon/authenticated entirely by default.

create index if not exists rate_limit_buckets_window_start_idx
  on public.rate_limit_buckets (window_start);

create or replace function public.rate_limit_hit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_window_start timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  insert into public.rate_limit_buckets as rlb (bucket_key, count, window_start, updated_at)
  values (p_key, 1, v_now, v_now)
  on conflict (bucket_key) do update set
    count = case
      when rlb.window_start <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else rlb.count + 1
    end,
    window_start = case
      when rlb.window_start <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else rlb.window_start
    end,
    updated_at = v_now
  returning rlb.count, rlb.window_start into v_count, v_window_start;

  allowed := v_count <= p_max;
  remaining := greatest(p_max - v_count, 0);
  retry_after_seconds := greatest(
    p_window_seconds - floor(extract(epoch from (v_now - v_window_start)))::integer,
    0
  );
  return next;
end;
$$;

comment on function public.rate_limit_hit(text, integer, integer) is
  'Atomically increments a fixed-window rate-limit counter and reports whether the caller is still within p_max hits per p_window_seconds.';

revoke all on function public.rate_limit_hit(text, integer, integer) from public;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Best-effort cleanup helper (optional cron target); not scheduled by this
-- migration. Old buckets are tiny (one row per key) and self-heal on next
-- hit, so cleanup is a housekeeping nice-to-have, not a correctness need.
create or replace function public.rate_limit_cleanup(p_older_than_seconds integer default 86400)
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.rate_limit_buckets
    where updated_at < clock_timestamp() - make_interval(secs => p_older_than_seconds)
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.rate_limit_cleanup(integer) from public;
grant execute on function public.rate_limit_cleanup(integer) to service_role;
