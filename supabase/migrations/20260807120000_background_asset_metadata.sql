-- Rich searchable metadata for Background Library assets (vision-filled on ingest).

alter table public.background_assets
  add column if not exists description text not null default '',
  add column if not exists style text not null default '',
  add column if not exists audience text not null default '',
  add column if not exists objects text[] not null default '{}',
  add column if not exists filename_label text not null default '';

comment on column public.background_assets.description is
  'Short human description of the artwork for search and review.';
comment on column public.background_assets.style is
  'Visual style keywords (e.g. illustrated, minimal, watercolor).';
comment on column public.background_assets.audience is
  'Intended audience keywords (e.g. elementary families, PTA).';
comment on column public.background_assets.objects is
  'Visible objects/elements detected in the image.';
comment on column public.background_assets.filename_label is
  'Clean display filename label (storage_path stays UUID-based).';
