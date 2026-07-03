-- CampaignOS: Event Playbooks — operational planning hub tables

create table if not exists public.event_playbook_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  assignee_name text,
  assignee_initials text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_playbook_tasks_event_id_idx
  on public.event_playbook_tasks (event_id);

create table if not exists public.event_playbook_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  content text not null,
  note_type text not null default 'note' check (note_type in ('lesson', 'note')),
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists event_playbook_notes_event_id_idx
  on public.event_playbook_notes (event_id);

create table if not exists public.event_playbook_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  url text,
  storage_path text,
  uploaded_at timestamptz not null default now()
);

create index if not exists event_playbook_files_event_id_idx
  on public.event_playbook_files (event_id);

create table if not exists public.event_playbook_activity (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  action text not null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists event_playbook_activity_event_id_idx
  on public.event_playbook_activity (event_id);

alter table public.event_playbook_tasks enable row level security;
alter table public.event_playbook_notes enable row level security;
alter table public.event_playbook_files enable row level security;
alter table public.event_playbook_activity enable row level security;

create policy "Allow public read access on event_playbook_tasks"
  on public.event_playbook_tasks for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_tasks"
  on public.event_playbook_tasks for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_tasks"
  on public.event_playbook_tasks for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_tasks"
  on public.event_playbook_tasks for delete to anon, authenticated using (true);

create policy "Allow public read access on event_playbook_notes"
  on public.event_playbook_notes for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_notes"
  on public.event_playbook_notes for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_notes"
  on public.event_playbook_notes for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_notes"
  on public.event_playbook_notes for delete to anon, authenticated using (true);

create policy "Allow public read access on event_playbook_files"
  on public.event_playbook_files for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_files"
  on public.event_playbook_files for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_files"
  on public.event_playbook_files for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_files"
  on public.event_playbook_files for delete to anon, authenticated using (true);

create policy "Allow public read access on event_playbook_activity"
  on public.event_playbook_activity for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_activity"
  on public.event_playbook_activity for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_activity"
  on public.event_playbook_activity for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_activity"
  on public.event_playbook_activity for delete to anon, authenticated using (true);
