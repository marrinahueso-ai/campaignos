-- Per-organization access templates: renamable labels + permission toggles.
-- template_id matches organization_users.campaign_role (stable auth id).

create table if not exists public.organization_access_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id text not null,
  display_name text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, template_id),
  constraint organization_access_templates_template_id_check
    check (
      template_id in (
        'admin',
        'president',
        'vp_communications',
        'committee_chair',
        'contributor',
        'view_only',
        'developer',
        'tester'
      )
    )
);

create index if not exists organization_access_templates_org_idx
  on public.organization_access_templates (organization_id);

alter table public.organization_access_templates enable row level security;

drop policy if exists "Allow authenticated read organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated insert organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated update organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated delete organization_access_templates"
  on public.organization_access_templates;

create policy "Allow authenticated read organization_access_templates"
  on public.organization_access_templates for select to authenticated using (true);

create policy "Allow authenticated insert organization_access_templates"
  on public.organization_access_templates for insert to authenticated with check (true);

create policy "Allow authenticated update organization_access_templates"
  on public.organization_access_templates for update to authenticated using (true) with check (true);

create policy "Allow authenticated delete organization_access_templates"
  on public.organization_access_templates for delete to authenticated using (true);
