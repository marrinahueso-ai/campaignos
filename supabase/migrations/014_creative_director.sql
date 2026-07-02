-- Engine 18: AI Creative Director — briefs, asset planning, style memory

create table if not exists public.event_creative_briefs (
  event_id uuid primary key references public.events (id) on delete cascade,
  brief jsonb not null default '{}'::jsonb,
  is_ai_enhanced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_assets
  add column if not exists plan_status text,
  add column if not exists plan_label text,
  add column if not exists generation_prompt text,
  add column if not exists ai_review jsonb,
  add column if not exists inspiration_match jsonb;

alter table public.event_assets
  drop constraint if exists event_assets_plan_status_check;

alter table public.event_assets
  add constraint event_assets_plan_status_check
  check (
    plan_status is null
    or plan_status in (
      'needed',
      'in_progress',
      'generated',
      'approved',
      'published'
    )
  );

create table if not exists public.organization_creative_style_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source_event_id uuid references public.events (id) on delete set null,
  source_asset_id uuid references public.event_assets (id) on delete set null,
  event_title text not null,
  asset_type text not null,
  style jsonb not null default '{}'::jsonb,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists organization_creative_style_memory_org_id_idx
  on public.organization_creative_style_memory (organization_id);

create index if not exists organization_creative_style_memory_approved_at_idx
  on public.organization_creative_style_memory (approved_at desc);
