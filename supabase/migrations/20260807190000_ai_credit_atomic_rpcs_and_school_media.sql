-- Atomic AI credit burns/grants + period ensure.
-- Locks organization_ai_credit_balances FOR UPDATE so concurrent burns/grants
-- cannot lose updates. Ledger + balance write in one transaction.
-- Also: unique period_grant per org/period; school-media private bucket.

-- ---------------------------------------------------------------------------
-- Indexes for idempotent period grants
-- ---------------------------------------------------------------------------
create unique index if not exists organization_ai_credit_ledger_period_grant_uidx
  on public.organization_ai_credit_ledger (organization_id, period_ym)
  where entry_type = 'period_grant';

-- ---------------------------------------------------------------------------
-- Ensure / roll period (row lock)
-- ---------------------------------------------------------------------------
create or replace function public.ai_credit_ensure_period(
  p_organization_id uuid,
  p_period_ym text,
  p_plan_tier text,
  p_allowance integer,
  p_unlimited boolean
)
returns public.organization_ai_credit_balances
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.organization_ai_credit_balances%rowtype;
  v_trial_carry boolean;
begin
  if p_organization_id is null or p_period_ym is null or p_period_ym !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid_args';
  end if;

  select * into v_row
  from public.organization_ai_credit_balances
  where organization_id = p_organization_id
  for update;

  if not found then
    insert into public.organization_ai_credit_balances as b (
      organization_id,
      period_ym,
      allowance,
      used,
      reserve_balance,
      unlimited,
      plan_tier,
      updated_at
    ) values (
      p_organization_id,
      p_period_ym,
      case when p_unlimited then 0 else greatest(coalesce(p_allowance, 0), 0) end,
      0,
      0,
      coalesce(p_unlimited, false),
      coalesce(nullif(trim(p_plan_tier), ''), 'professional'),
      now()
    )
    returning * into v_row;

    if not v_row.unlimited and v_row.allowance > 0 then
      insert into public.organization_ai_credit_ledger (
        organization_id, entry_type, amount, bucket, period_ym, note
      ) values (
        p_organization_id,
        'period_grant',
        v_row.allowance,
        'period',
        p_period_ym,
        format('Monthly grant (%s)', v_row.plan_tier)
      )
      on conflict (organization_id, period_ym) where (entry_type = 'period_grant')
      do nothing;
    end if;

    return v_row;
  end if;

  if v_row.period_ym = p_period_ym then
    if v_row.unlimited is distinct from coalesce(p_unlimited, false)
       or v_row.plan_tier is distinct from coalesce(nullif(trim(p_plan_tier), ''), 'professional')
       or (not coalesce(p_unlimited, false) and v_row.allowance is distinct from greatest(coalesce(p_allowance, 0), 0))
    then
      update public.organization_ai_credit_balances
      set
        unlimited = coalesce(p_unlimited, false),
        plan_tier = coalesce(nullif(trim(p_plan_tier), ''), 'professional'),
        allowance = case
          when coalesce(p_unlimited, false) then 0
          else greatest(coalesce(p_allowance, 0), 0)
        end,
        updated_at = now()
      where organization_id = p_organization_id
      returning * into v_row;
    end if;
    return v_row;
  end if;

  -- Period roll: keep reserve; reset used unless trial→trial carry.
  v_trial_carry :=
    coalesce(nullif(trim(p_plan_tier), ''), 'professional') = 'trial'
    and v_row.plan_tier = 'trial';

  update public.organization_ai_credit_balances
  set
    period_ym = p_period_ym,
    allowance = case
      when coalesce(p_unlimited, false) then 0
      else greatest(coalesce(p_allowance, 0), 0)
    end,
    used = case when v_trial_carry then v_row.used else 0 end,
    unlimited = coalesce(p_unlimited, false),
    plan_tier = coalesce(nullif(trim(p_plan_tier), ''), 'professional'),
    updated_at = now()
  where organization_id = p_organization_id
  returning * into v_row;

  if not v_row.unlimited and v_row.allowance > 0 and not v_trial_carry then
    insert into public.organization_ai_credit_ledger (
      organization_id, entry_type, amount, bucket, period_ym, note
    ) values (
      p_organization_id,
      'period_grant',
      v_row.allowance,
      'period',
      p_period_ym,
      format('Monthly grant (%s)', v_row.plan_tier)
    )
    on conflict (organization_id, period_ym) where (entry_type = 'period_grant')
    do nothing;
  end if;

  return v_row;
end;
$$;

comment on function public.ai_credit_ensure_period(uuid, text, text, integer, boolean) is
  'Locks org AI credit balance; creates or rolls the UTC month period atomically.';

revoke all on function public.ai_credit_ensure_period(uuid, text, text, integer, boolean) from public;
grant execute on function public.ai_credit_ensure_period(uuid, text, text, integer, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic burn (idempotent on ai_usage_log_id)
-- ---------------------------------------------------------------------------
create or replace function public.ai_credit_burn(
  p_organization_id uuid,
  p_ai_usage_log_id uuid,
  p_cost integer,
  p_period_ym text,
  p_plan_tier text,
  p_allowance integer,
  p_unlimited boolean,
  p_actor_user_id uuid default null,
  p_note text default null
)
returns table (
  applied boolean,
  period_burn integer,
  reserve_burn integer,
  used_after integer,
  reserve_after integer,
  error_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.organization_ai_credit_balances%rowtype;
  v_cost integer := greatest(coalesce(p_cost, 0), 0);
  v_period_remaining integer;
  v_period_burn integer;
  v_reserve_burn integer;
  v_ledger_note text;
begin
  if p_organization_id is null or p_ai_usage_log_id is null then
    applied := false;
    period_burn := 0;
    reserve_burn := 0;
    used_after := 0;
    reserve_after := 0;
    error_code := 'invalid_args';
    return next;
    return;
  end if;

  if v_cost <= 0 then
    applied := false;
    period_burn := 0;
    reserve_burn := 0;
    used_after := 0;
    reserve_after := 0;
    error_code := null;
    return next;
    return;
  end if;

  -- Already burned?
  if exists (
    select 1
    from public.organization_ai_credit_ledger l
    where l.ai_usage_log_id = p_ai_usage_log_id
  ) then
    select b.used, b.reserve_balance into used_after, reserve_after
    from public.organization_ai_credit_balances b
    where b.organization_id = p_organization_id;
    applied := false;
    period_burn := 0;
    reserve_burn := 0;
    used_after := coalesce(used_after, 0);
    reserve_after := coalesce(reserve_after, 0);
    error_code := null;
    return next;
    return;
  end if;

  v_row := public.ai_credit_ensure_period(
    p_organization_id,
    p_period_ym,
    p_plan_tier,
    p_allowance,
    p_unlimited
  );

  -- Re-lock after ensure (ensure already locked; re-select for safety).
  select * into v_row
  from public.organization_ai_credit_balances
  where organization_id = p_organization_id
  for update;

  if v_row.unlimited then
    insert into public.organization_ai_credit_ledger (
      organization_id, entry_type, amount, bucket, period_ym,
      ai_usage_log_id, note, actor_user_id
    ) values (
      p_organization_id,
      'burn',
      0,
      null,
      v_row.period_ym,
      p_ai_usage_log_id,
      coalesce(p_note, format('Unlimited org — no burn (would be %s)', v_cost)),
      p_actor_user_id
    )
    on conflict (ai_usage_log_id) do nothing;

    applied := true;
    period_burn := 0;
    reserve_burn := 0;
    used_after := v_row.used;
    reserve_after := v_row.reserve_balance;
    error_code := null;
    return next;
    return;
  end if;

  v_period_remaining := greatest(v_row.allowance - v_row.used, 0);
  v_period_burn := least(v_period_remaining, v_cost);
  v_reserve_burn := least(greatest(v_row.reserve_balance, 0), v_cost - v_period_burn);

  if (v_period_burn + v_reserve_burn) < v_cost then
    applied := false;
    period_burn := 0;
    reserve_burn := 0;
    used_after := v_row.used;
    reserve_after := v_row.reserve_balance;
    error_code := 'insufficient';
    return next;
    return;
  end if;

  update public.organization_ai_credit_balances
  set
    used = v_row.used + v_period_burn,
    reserve_balance = greatest(v_row.reserve_balance - v_reserve_burn, 0),
    updated_at = now()
  where organization_id = p_organization_id
  returning used, reserve_balance into used_after, reserve_after;

  if v_reserve_burn > 0 and v_period_burn > 0 then
    v_ledger_note := coalesce(
      p_note,
      format('%s period + %s reserve', v_period_burn, v_reserve_burn)
    );
  elsif v_reserve_burn > 0 then
    v_ledger_note := coalesce(p_note, format('%s reserve', v_reserve_burn));
  else
    v_ledger_note := coalesce(p_note, format('%s period', v_period_burn));
  end if;

  insert into public.organization_ai_credit_ledger (
    organization_id, entry_type, amount, bucket, period_ym,
    ai_usage_log_id, note, actor_user_id
  ) values (
    p_organization_id,
    'burn',
    -(v_period_burn + v_reserve_burn),
    case
      when v_reserve_burn > 0 and v_period_burn > 0 then 'period'
      when v_reserve_burn > 0 then 'reserve'
      else 'period'
    end,
    v_row.period_ym,
    p_ai_usage_log_id,
    v_ledger_note,
    p_actor_user_id
  )
  on conflict (ai_usage_log_id) do nothing;

  applied := true;
  period_burn := v_period_burn;
  reserve_burn := v_reserve_burn;
  error_code := null;
  return next;
end;
$$;

comment on function public.ai_credit_burn(uuid, uuid, integer, text, text, integer, boolean, uuid, text) is
  'Atomically burns AI credits (period then reserve). Idempotent on ai_usage_log_id. Fails closed on insufficient.';

revoke all on function public.ai_credit_burn(uuid, uuid, integer, text, text, integer, boolean, uuid, text) from public;
grant execute on function public.ai_credit_burn(uuid, uuid, integer, text, text, integer, boolean, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic reserve delta (Stripe + Owner grants/adjustments)
-- ---------------------------------------------------------------------------
create or replace function public.ai_credit_apply_reserve_delta(
  p_organization_id uuid,
  p_delta integer,
  p_entry_type text,
  p_period_ym text,
  p_plan_tier text,
  p_allowance integer,
  p_unlimited boolean,
  p_actor_user_id uuid default null,
  p_note text default null
)
returns table (
  ok boolean,
  credits_granted integer,
  reserve_after integer,
  error_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.organization_ai_credit_balances%rowtype;
  v_delta integer := coalesce(p_delta, 0);
  v_next integer;
begin
  if p_organization_id is null
     or v_delta = 0
     or p_entry_type not in ('reserve_grant', 'bonus_grant', 'adjustment')
  then
    ok := false;
    credits_granted := 0;
    reserve_after := 0;
    error_code := 'invalid_args';
    return next;
    return;
  end if;

  if abs(v_delta) > 100000 then
    ok := false;
    credits_granted := 0;
    reserve_after := 0;
    error_code := 'amount_too_large';
    return next;
    return;
  end if;

  -- Stripe Checkout notes: treat duplicate note as success (idempotent).
  if p_entry_type = 'reserve_grant'
     and p_note is not null
     and p_note like 'Stripe Checkout %'
     and exists (
       select 1
       from public.organization_ai_credit_ledger l
       where l.organization_id = p_organization_id
         and l.entry_type = 'reserve_grant'
         and l.note = p_note
     )
  then
    select b.reserve_balance into reserve_after
    from public.organization_ai_credit_balances b
    where b.organization_id = p_organization_id;
    ok := true;
    credits_granted := 0;
    reserve_after := coalesce(reserve_after, 0);
    error_code := null;
    return next;
    return;
  end if;

  v_row := public.ai_credit_ensure_period(
    p_organization_id,
    p_period_ym,
    p_plan_tier,
    p_allowance,
    p_unlimited
  );

  select * into v_row
  from public.organization_ai_credit_balances
  where organization_id = p_organization_id
  for update;

  v_next := v_row.reserve_balance + v_delta;
  if v_next < 0 then
    ok := false;
    credits_granted := 0;
    reserve_after := v_row.reserve_balance;
    error_code := 'insufficient_reserve';
    return next;
    return;
  end if;

  begin
    insert into public.organization_ai_credit_ledger (
      organization_id, entry_type, amount, bucket, period_ym, note, actor_user_id
    ) values (
      p_organization_id,
      p_entry_type,
      v_delta,
      'reserve',
      v_row.period_ym,
      p_note,
      p_actor_user_id
    );
  exception
    when unique_violation then
      select b.reserve_balance into reserve_after
      from public.organization_ai_credit_balances b
      where b.organization_id = p_organization_id;
      ok := true;
      credits_granted := 0;
      reserve_after := coalesce(reserve_after, 0);
      error_code := null;
      return next;
      return;
  end;

  update public.organization_ai_credit_balances
  set
    reserve_balance = v_next,
    updated_at = now()
  where organization_id = p_organization_id
  returning reserve_balance into reserve_after;

  ok := true;
  credits_granted := v_delta;
  error_code := null;
  return next;
end;
$$;

comment on function public.ai_credit_apply_reserve_delta(uuid, integer, text, text, text, integer, boolean, uuid, text) is
  'Atomically applies a reserve grant/bonus/adjustment with row lock; Stripe Checkout notes are idempotent.';

revoke all on function public.ai_credit_apply_reserve_delta(uuid, integer, text, text, text, integer, boolean, uuid, text) from public;
grant execute on function public.ai_credit_apply_reserve_delta(uuid, integer, text, text, text, integer, boolean, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Private school-media bucket (school-uploaded photos — not world-readable)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-media',
  'school-media',
  false,
  12451840, -- 12MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {organization_id}/{event_id|misc}/{uuid}-filename
drop policy if exists school_media_select_org_member on storage.objects;
create policy school_media_select_org_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'school-media'
    and private.can_access_storage_org_path(name)
  );

drop policy if exists school_media_insert_org_member on storage.objects;
create policy school_media_insert_org_member
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'school-media'
    and private.can_access_storage_org_path(name)
  );

drop policy if exists school_media_update_org_member on storage.objects;
create policy school_media_update_org_member
  on storage.objects for update to authenticated
  using (
    bucket_id = 'school-media'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'school-media'
    and private.can_access_storage_org_path(name)
  );

drop policy if exists school_media_delete_org_member on storage.objects;
create policy school_media_delete_org_member
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'school-media'
    and private.can_access_storage_org_path(name)
  );
