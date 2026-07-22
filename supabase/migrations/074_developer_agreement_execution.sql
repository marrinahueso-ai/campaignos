-- Counter-sign + executed packet storage for developer agreements

alter table public.developer_agreement_signatures
  add column if not exists status text not null default 'awaiting_company',
  add column if not exists company_signer_user_id uuid references auth.users (id) on delete set null,
  add column if not exists company_typed_legal_name text,
  add column if not exists company_title text,
  add column if not exists company_signature_image_path text,
  add column if not exists company_signed_at timestamptz,
  add column if not exists company_ip_address text,
  add column if not exists company_user_agent text,
  add column if not exists executed_html_path text,
  add column if not exists company_notified_at timestamptz,
  add column if not exists executed_emailed_at timestamptz;

alter table public.developer_agreement_signatures
  drop constraint if exists developer_agreement_signatures_status_check;

alter table public.developer_agreement_signatures
  add constraint developer_agreement_signatures_status_check
  check (status in ('awaiting_company', 'fully_executed'));

create index if not exists developer_agreement_signatures_status_idx
  on public.developer_agreement_signatures (status);

-- Optional saved company signer defaults (name / title / drawn signature)
create table if not exists public.developer_agreement_company_profile (
  id integer primary key default 1 check (id = 1),
  legal_name text not null default '',
  title text not null default 'Authorized Representative',
  email text,
  signature_image_path text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.developer_agreement_company_profile enable row level security;

-- Owners manage via service role; no public policies needed.
