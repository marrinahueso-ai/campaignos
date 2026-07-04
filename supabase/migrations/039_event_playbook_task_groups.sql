-- CampaignOS: Task groups for event playbook checklists

create table if not exists public.event_playbook_task_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_playbook_task_groups_event_id_idx
  on public.event_playbook_task_groups (event_id);

alter table public.event_playbook_tasks
  add column if not exists group_id uuid references public.event_playbook_task_groups(id) on delete set null;

create index if not exists event_playbook_tasks_group_id_idx
  on public.event_playbook_tasks (group_id);

alter table public.event_playbook_task_groups enable row level security;

create policy "Allow public read access on event_playbook_task_groups"
  on public.event_playbook_task_groups for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_task_groups"
  on public.event_playbook_task_groups for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_task_groups"
  on public.event_playbook_task_groups for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_task_groups"
  on public.event_playbook_task_groups for delete to anon, authenticated using (true);
