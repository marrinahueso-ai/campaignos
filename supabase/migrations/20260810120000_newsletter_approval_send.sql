-- Newsletter durable model: versions, contacts/audiences, sends, unsubscribe,
-- sender profile, delivery events, and org-scoped approval_scheduling bridge.
--
-- Newsletter Contact != Hey Ralli user.
-- Newsletter Audience != Team & Access role group.

-- ---------------------------------------------------------------------------
-- Extend unified approvals for org-scoped newsletter items (no event required)
-- ---------------------------------------------------------------------------

alter table public.approval_scheduling_items
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

update public.approval_scheduling_items asi
set organization_id = sy.organization_id
from public.events e
join public.school_years sy on sy.id = e.school_year_id
where asi.event_id = e.id
  and asi.organization_id is null;

alter table public.approval_scheduling_items
  alter column event_id drop not null;

alter table public.approval_scheduling_items
  drop constraint if exists approval_scheduling_items_event_or_org_chk;

alter table public.approval_scheduling_items
  add constraint approval_scheduling_items_event_or_org_chk
  check (event_id is not null or organization_id is not null);

create index if not exists approval_scheduling_items_organization_id_idx
  on public.approval_scheduling_items (organization_id, requested_at desc)
  where organization_id is not null;

-- ---------------------------------------------------------------------------
-- Sender profile (authorized From / Reply-To per organization)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_sender_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  from_display_name text not null default '',
  from_email text not null default '',
  reply_to_email text not null default '',
  physical_address_override text,
  resend_domain_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.newsletter_sender_profiles is
  'Org-scoped newsletter From/Reply-To. Physical mailing address prefers organizations.* columns.';

alter table public.newsletter_sender_profiles enable row level security;

create policy newsletter_sender_profiles_select_member
  on public.newsletter_sender_profiles for select
  to authenticated
  using (private.is_active_org_member(organization_id));

create policy newsletter_sender_profiles_insert_member
  on public.newsletter_sender_profiles for insert
  to authenticated
  with check (private.is_active_org_member(organization_id));

create policy newsletter_sender_profiles_update_member
  on public.newsletter_sender_profiles for update
  to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Newsletters + immutable versions
-- ---------------------------------------------------------------------------

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null default '',
  status text not null default 'draft'
    check (status in (
      'draft',
      'needs_approval',
      'changes_requested',
      'approved',
      'scheduled',
      'sending',
      'sent',
      'failed'
    )),
  current_version_id uuid,
  approved_version_id uuid,
  composer_state jsonb not null default '{}'::jsonb,
  proposed_audience_id uuid,
  approved_audience_id uuid,
  proposed_send_at timestamptz,
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  from_display_name text not null default '',
  from_email text not null default '',
  reply_to_email text not null default '',
  subject text not null default '',
  preheader text,
  approval_scheduling_item_id uuid references public.approval_scheduling_items (id) on delete set null,
  change_request_note text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  submitted_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  sent_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  last_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletters_org_updated_idx
  on public.newsletters (organization_id, updated_at desc);

create index if not exists newsletters_org_status_idx
  on public.newsletters (organization_id, status);

create table if not exists public.newsletter_versions (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  version_number integer not null,
  content_fingerprint text not null,
  snapshot jsonb not null,
  rendered_html text not null,
  subject text not null,
  preheader text,
  from_display_name text not null,
  from_email text not null,
  reply_to_email text not null,
  audience_id uuid,
  proposed_send_at timestamptz,
  compliance_footer jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (newsletter_id, version_number)
);

create index if not exists newsletter_versions_newsletter_idx
  on public.newsletter_versions (newsletter_id, version_number desc);

alter table public.newsletters
  drop constraint if exists newsletters_current_version_fk;
alter table public.newsletters
  add constraint newsletters_current_version_fk
  foreign key (current_version_id) references public.newsletter_versions (id) on delete set null;

alter table public.newsletters
  drop constraint if exists newsletters_approved_version_fk;
alter table public.newsletters
  add constraint newsletters_approved_version_fk
  foreign key (approved_version_id) references public.newsletter_versions (id) on delete set null;

alter table public.newsletters enable row level security;
alter table public.newsletter_versions enable row level security;

create policy newsletters_select_member
  on public.newsletters for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletters_insert_member
  on public.newsletters for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletters_update_member
  on public.newsletters for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy newsletters_delete_member
  on public.newsletters for delete to authenticated
  using (private.is_active_org_member(organization_id));

create policy newsletter_versions_select_member
  on public.newsletter_versions for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_versions_insert_member
  on public.newsletter_versions for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_versions_update_member
  on public.newsletter_versions for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Contacts + audiences (NOT Hey Ralli users / Team & Access)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  email_normalized text not null,
  status text not null default 'active'
    check (status in ('active', 'unsubscribed', 'suppressed', 'bounced', 'complained')),
  source text not null default 'manual'
    check (source in ('manual', 'csv_import', 'api')),
  consent_attested_at timestamptz,
  consent_attested_by uuid references auth.users (id) on delete set null,
  consent_note text,
  import_batch_id uuid,
  unsubscribed_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email_normalized)
);

create index if not exists newsletter_contacts_org_status_idx
  on public.newsletter_contacts (organization_id, status);
create index if not exists newsletter_contacts_org_email_idx
  on public.newsletter_contacts (organization_id, email_normalized);

create table if not exists public.newsletter_audiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.newsletter_audience_members (
  audience_id uuid not null references public.newsletter_audiences (id) on delete cascade,
  contact_id uuid not null references public.newsletter_contacts (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (audience_id, contact_id)
);

create index if not exists newsletter_audience_members_org_idx
  on public.newsletter_audience_members (organization_id);
create index if not exists newsletter_audience_members_contact_idx
  on public.newsletter_audience_members (contact_id);

alter table public.newsletters
  drop constraint if exists newsletters_proposed_audience_fk;
alter table public.newsletters
  add constraint newsletters_proposed_audience_fk
  foreign key (proposed_audience_id) references public.newsletter_audiences (id) on delete set null;

alter table public.newsletters
  drop constraint if exists newsletters_approved_audience_fk;
alter table public.newsletters
  add constraint newsletters_approved_audience_fk
  foreign key (approved_audience_id) references public.newsletter_audiences (id) on delete set null;

alter table public.newsletter_versions
  drop constraint if exists newsletter_versions_audience_fk;
alter table public.newsletter_versions
  add constraint newsletter_versions_audience_fk
  foreign key (audience_id) references public.newsletter_audiences (id) on delete set null;

alter table public.newsletter_contacts enable row level security;
alter table public.newsletter_audiences enable row level security;
alter table public.newsletter_audience_members enable row level security;

create policy newsletter_contacts_select_member
  on public.newsletter_contacts for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_contacts_insert_member
  on public.newsletter_contacts for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_contacts_update_member
  on public.newsletter_contacts for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy newsletter_contacts_delete_member
  on public.newsletter_contacts for delete to authenticated
  using (private.is_active_org_member(organization_id));

create policy newsletter_audiences_select_member
  on public.newsletter_audiences for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_audiences_insert_member
  on public.newsletter_audiences for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_audiences_update_member
  on public.newsletter_audiences for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy newsletter_audiences_delete_member
  on public.newsletter_audiences for delete to authenticated
  using (private.is_active_org_member(organization_id));

create policy newsletter_audience_members_select_member
  on public.newsletter_audience_members for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_audience_members_insert_member
  on public.newsletter_audience_members for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_audience_members_delete_member
  on public.newsletter_audience_members for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Import batches (CSV attestation)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  filename text,
  imported_by uuid references auth.users (id) on delete set null,
  row_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  suppressed_skipped_count integer not null default 0,
  authorization_attested boolean not null default false,
  authorization_attested_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_import_batches enable row level security;

create policy newsletter_import_batches_select_member
  on public.newsletter_import_batches for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_import_batches_insert_member
  on public.newsletter_import_batches for insert to authenticated
  with check (private.is_active_org_member(organization_id));

alter table public.newsletter_contacts
  drop constraint if exists newsletter_contacts_import_batch_fk;
alter table public.newsletter_contacts
  add constraint newsletter_contacts_import_batch_fk
  foreign key (import_batch_id) references public.newsletter_import_batches (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Unsubscribe tokens (public, no login)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.newsletter_contacts (id) on delete cascade,
  token_hash text not null unique,
  send_id uuid,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_unsubscribe_tokens_contact_idx
  on public.newsletter_unsubscribe_tokens (contact_id);

alter table public.newsletter_unsubscribe_tokens enable row level security;

-- No direct client policies: redeem via SECURITY DEFINER RPC / service role only.

-- ---------------------------------------------------------------------------
-- Sends + recipients ledger (idempotent)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  version_id uuid not null references public.newsletter_versions (id) on delete restrict,
  audience_id uuid references public.newsletter_audiences (id) on delete set null,
  send_kind text not null default 'production'
    check (send_kind in ('production', 'test')),
  status text not null default 'pending'
    check (status in (
      'pending',
      'scheduled',
      'sending',
      'sent',
      'failed',
      'cancelled'
    )),
  idempotency_key text not null,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  selected_count integer not null default 0,
  excluded_count integer not null default 0,
  eligible_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  from_display_name text not null,
  from_email text not null,
  reply_to_email text not null,
  subject text not null,
  rendered_html text not null,
  provider text not null default 'resend',
  provider_batch_ids jsonb not null default '[]'::jsonb,
  failure_reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists newsletter_sends_newsletter_idx
  on public.newsletter_sends (newsletter_id, created_at desc);
create index if not exists newsletter_sends_scheduled_idx
  on public.newsletter_sends (status, scheduled_for)
  where status = 'scheduled';

create table if not exists public.newsletter_send_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  send_id uuid not null references public.newsletter_sends (id) on delete cascade,
  contact_id uuid references public.newsletter_contacts (id) on delete set null,
  email text not null,
  email_normalized text not null,
  status text not null default 'queued'
    check (status in (
      'queued',
      'sent',
      'delivered',
      'bounced',
      'complained',
      'failed',
      'skipped'
    )),
  provider_message_id text,
  unsubscribe_token_id uuid references public.newsletter_unsubscribe_tokens (id) on delete set null,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (send_id, email_normalized)
);

create index if not exists newsletter_send_recipients_provider_idx
  on public.newsletter_send_recipients (provider_message_id)
  where provider_message_id is not null;

alter table public.newsletter_unsubscribe_tokens
  drop constraint if exists newsletter_unsubscribe_tokens_send_fk;
alter table public.newsletter_unsubscribe_tokens
  add constraint newsletter_unsubscribe_tokens_send_fk
  foreign key (send_id) references public.newsletter_sends (id) on delete set null;

alter table public.newsletter_sends enable row level security;
alter table public.newsletter_send_recipients enable row level security;

create policy newsletter_sends_select_member
  on public.newsletter_sends for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_sends_insert_member
  on public.newsletter_sends for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_sends_update_member
  on public.newsletter_sends for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy newsletter_send_recipients_select_member
  on public.newsletter_send_recipients for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_send_recipients_insert_member
  on public.newsletter_send_recipients for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy newsletter_send_recipients_update_member
  on public.newsletter_send_recipients for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Delivery / bounce / complaint events
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_delivery_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  send_id uuid references public.newsletter_sends (id) on delete set null,
  recipient_id uuid references public.newsletter_send_recipients (id) on delete set null,
  provider text not null default 'resend',
  provider_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists newsletter_delivery_events_send_idx
  on public.newsletter_delivery_events (send_id, created_at desc);

alter table public.newsletter_delivery_events enable row level security;

create policy newsletter_delivery_events_select_member
  on public.newsletter_delivery_events for select to authenticated
  using (
    organization_id is not null
    and private.is_active_org_member(organization_id)
  );

-- Inserts are service-role (webhook) only — no authenticated insert policy.

-- ---------------------------------------------------------------------------
-- Lightweight audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  newsletter_id uuid references public.newsletters (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_audit_events_newsletter_idx
  on public.newsletter_audit_events (newsletter_id, created_at desc);

alter table public.newsletter_audit_events enable row level security;

create policy newsletter_audit_events_select_member
  on public.newsletter_audit_events for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy newsletter_audit_events_insert_member
  on public.newsletter_audit_events for insert to authenticated
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Public unsubscribe redeem (no login). Token is hashed at rest.
-- ---------------------------------------------------------------------------

-- Caller hashes the raw token (sha256 hex) in app code before invoking.
create or replace function public.redeem_newsletter_unsubscribe_token(p_token_hash text)
returns table (
  outcome text,
  organization_name text,
  contact_email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.newsletter_unsubscribe_tokens%rowtype;
  v_contact public.newsletter_contacts%rowtype;
  v_org_name text;
begin
  if p_token_hash is null or length(trim(p_token_hash)) < 32 then
    return query select 'invalid'::text, null::text, null::text;
    return;
  end if;

  select * into v_token
  from public.newsletter_unsubscribe_tokens t
  where t.token_hash = lower(trim(p_token_hash))
  limit 1;

  if not found then
    return query select 'invalid'::text, null::text, null::text;
    return;
  end if;

  if v_token.expires_at is not null and v_token.expires_at < now() then
    return query select 'expired'::text, null::text, null::text;
    return;
  end if;

  select * into v_contact
  from public.newsletter_contacts c
  where c.id = v_token.contact_id
  limit 1;

  if not found then
    return query select 'invalid'::text, null::text, null::text;
    return;
  end if;

  select o.name into v_org_name
  from public.organizations o
  where o.id = v_contact.organization_id;

  if v_contact.status in ('unsubscribed', 'suppressed') then
    return query select 'already_unsubscribed'::text, v_org_name, v_contact.email;
    return;
  end if;

  update public.newsletter_contacts
  set
    status = 'unsubscribed',
    unsubscribed_at = coalesce(unsubscribed_at, now()),
    updated_at = now()
  where id = v_contact.id;

  update public.newsletter_unsubscribe_tokens
  set used_at = coalesce(used_at, now())
  where id = v_token.id;

  return query select 'unsubscribed'::text, v_org_name, v_contact.email;
end;
$$;

revoke all on function public.redeem_newsletter_unsubscribe_token(text) from public;
grant execute on function public.redeem_newsletter_unsubscribe_token(text) to anon, authenticated, service_role;

-- Claim a scheduled send for single-flight execution (service role / cron).
create or replace function public.claim_newsletter_scheduled_send(p_send_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.newsletter_sends
  set
    status = 'sending',
    started_at = now(),
    updated_at = now()
  where id = p_send_id
    and status = 'scheduled'
    and scheduled_for is not null
    and scheduled_for <= now();

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_newsletter_scheduled_send(uuid) from public;
grant execute on function public.claim_newsletter_scheduled_send(uuid) to service_role;
