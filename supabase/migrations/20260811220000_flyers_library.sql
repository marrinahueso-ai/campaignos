-- ---------------------------------------------------------------------------
-- Flyers library (durable drafts + approval bridge)
-- Mirrors newsletters: org-scoped rows, Approvals hub via approval_scheduling_items.
-- Does NOT create a second approvals system.
-- ---------------------------------------------------------------------------

create table if not exists public.flyers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  title text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'needs_approval', 'changes_requested', 'approved')),
  print_size text not null default 'letter'
    check (print_size in ('letter', 'half')),
  composer_state jsonb not null default '{}'::jsonb,
  preview_image_url text,
  approval_scheduling_item_id uuid references public.approval_scheduling_items (id) on delete set null,
  change_request_note text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  submitted_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flyers is
  'Durable flyer library drafts. Approval queue rows live in approval_scheduling_items (campaign_milestone_id = flyer-composer:{flyer.id}).';

comment on column public.flyers.composer_state is
  'Flyer composer draft fields (slots, versions, brand/inspiration refs).';

comment on column public.flyers.approval_scheduling_item_id is
  'Bridge to the unified Approvals hub row for this flyer submission.';

create index if not exists flyers_org_updated_idx
  on public.flyers (organization_id, updated_at desc);

create index if not exists flyers_org_status_idx
  on public.flyers (organization_id, status);

create index if not exists flyers_event_id_idx
  on public.flyers (event_id)
  where event_id is not null;

alter table public.flyers enable row level security;

-- Active org members (same pattern as public.newsletters)
create policy flyers_select_member
  on public.flyers for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy flyers_insert_member
  on public.flyers for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy flyers_update_member
  on public.flyers for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy flyers_delete_member
  on public.flyers for delete to authenticated
  using (private.is_active_org_member(organization_id));
