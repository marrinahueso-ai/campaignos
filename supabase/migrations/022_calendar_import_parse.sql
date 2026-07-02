-- Calendar import parsing + link imported events back to source upload

alter table public.calendar_imports
  add column if not exists parse_status text not null default 'pending'
    check (parse_status in ('pending', 'parsing', 'parsed', 'failed', 'imported')),
  add column if not exists parse_error text,
  add column if not exists parsed_events jsonb,
  add column if not exists extracted_text text,
  add column if not exists imported_at timestamptz;

alter table public.events
  add column if not exists calendar_import_id uuid
    references public.calendar_imports (id) on delete set null;

create index if not exists events_calendar_import_id_idx
  on public.events (calendar_import_id);

drop policy if exists "Allow public update access on calendar_imports"
  on public.calendar_imports;

create policy "Allow public update access on calendar_imports"
  on public.calendar_imports for update to anon, authenticated
  using (true) with check (true);
