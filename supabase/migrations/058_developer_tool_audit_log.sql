-- Audit log for Owner/Admin developer testing tools (clear generated content).

create table if not exists public.developer_tool_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  organization_id uuid not null,
  event_id uuid not null,
  campaign_workspace_id uuid not null,
  milestone_id text,
  action_type text not null
    check (action_type in (
      'clear_milestone_generated_content',
      'clear_campaign_generated_content'
    )),
  artwork_cleared integer not null default 0,
  captions_cleared integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists developer_tool_audit_log_org_idx
  on public.developer_tool_audit_log (organization_id, created_at desc);

create index if not exists developer_tool_audit_log_event_idx
  on public.developer_tool_audit_log (event_id, created_at desc);

alter table public.developer_tool_audit_log enable row level security;

create policy "Allow authenticated read developer_tool_audit_log"
  on public.developer_tool_audit_log for select to authenticated using (true);

create policy "Allow authenticated insert developer_tool_audit_log"
  on public.developer_tool_audit_log for insert to authenticated with check (true);
