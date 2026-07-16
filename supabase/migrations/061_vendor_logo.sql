-- Optional logo image for vendor directory cards (storage path in vendor-documents bucket)

alter table public.vendors
  add column if not exists logo_path text;
