-- Event planning hub: fillable overview fields, quick links, vendors, approved 1:1 image

alter table public.events
  add column if not exists goal text,
  add column if not exists expected_attendance text,
  add column if not exists planning_quick_links jsonb not null default '{}'::jsonb,
  add column if not exists planning_vendors jsonb not null default '[]'::jsonb,
  add column if not exists approved_square_image_url text,
  add column if not exists approved_square_image_status text not null default 'open'
    check (approved_square_image_status in ('open', 'filled'));
