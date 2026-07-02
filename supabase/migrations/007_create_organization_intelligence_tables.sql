-- CampaignOS Engine 5: Organization Intelligence Profile (AI Brain)

create table if not exists public.organization_ai_profile (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_voice text,
  writing_style text
    check (writing_style is null or writing_style in (
      'friendly', 'professional', 'enthusiastic', 'warm', 'concise', 'formal'
    )),
  communication_preferences text,
  channel_preferences text,
  default_cta_style text
    check (default_cta_style is null or default_cta_style in (
      'direct', 'soft_invite', 'question', 'link_forward', 'volunteer_focused'
    )),
  emoji_usage text
    check (emoji_usage is null or emoji_usage in (
      'none', 'minimal', 'moderate', 'frequent'
    )),
  newsletter_length text
    check (newsletter_length is null or newsletter_length in (
      'short', 'medium', 'long'
    )),
  facebook_tone text,
  instagram_tone text,
  website_tone text,
  principal_messaging_style text,
  audience_defaults text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.organization_training_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  document_type text not null
    check (document_type in (
      'pdf',
      'docx',
      'newsletter',
      'facebook_export',
      'website_article',
      'principal_letter',
      'canva_pdf'
    )),
  filename text not null,
  file_size integer not null default 0
    check (file_size >= 0),
  mime_type text,
  storage_path text,
  upload_status text not null default 'registered'
    check (upload_status in ('registered', 'uploaded', 'failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_ai_profile_org_id_idx
  on public.organization_ai_profile (organization_id);

create index if not exists organization_training_documents_org_id_idx
  on public.organization_training_documents (organization_id, created_at desc);

create index if not exists organization_training_documents_type_idx
  on public.organization_training_documents (organization_id, document_type);

-- Storage bucket for training library files (content stored; AI analysis deferred)
insert into storage.buckets (id, name, public)
values ('training-library', 'training-library', false)
on conflict (id) do nothing;

create policy "Allow public read access on training-library"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'training-library');

create policy "Allow public insert access on training-library"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'training-library');

create policy "Allow public delete access on training-library"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'training-library');

alter table public.organization_ai_profile enable row level security;
alter table public.organization_training_documents enable row level security;

create policy "Allow public read access on organization_ai_profile"
  on public.organization_ai_profile for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_ai_profile"
  on public.organization_ai_profile for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_ai_profile"
  on public.organization_ai_profile for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_ai_profile"
  on public.organization_ai_profile for delete to anon, authenticated using (true);

create policy "Allow public read access on organization_training_documents"
  on public.organization_training_documents for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_training_documents"
  on public.organization_training_documents for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_training_documents"
  on public.organization_training_documents for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_training_documents"
  on public.organization_training_documents for delete to anon, authenticated using (true);
