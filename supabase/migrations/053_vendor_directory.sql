-- Vendor Directory: org-scoped vendors, contacts, event assignments, documents, payments, notes, activity

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#8b7fd4',
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists vendor_categories_organization_id_idx
  on public.vendor_categories (organization_id);

-- ---------------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------------

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  website text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  category_id uuid references public.vendor_categories (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'pending', 'blocked', 'archived')),
  is_favorite boolean not null default false,
  notes_summary text,
  deleted_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendors_organization_id_idx
  on public.vendors (organization_id);

create index if not exists vendors_organization_status_idx
  on public.vendors (organization_id, status)
  where deleted_at is null;

create index if not exists vendors_organization_favorite_idx
  on public.vendors (organization_id, is_favorite)
  where deleted_at is null and is_favorite = true;

create index if not exists vendors_name_lower_idx
  on public.vendors (organization_id, lower(name));

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vendor_contacts_vendor_id_idx
  on public.vendor_contacts (vendor_id);

create index if not exists vendor_contacts_organization_id_idx
  on public.vendor_contacts (organization_id);

-- ---------------------------------------------------------------------------
-- Event assignments (many-to-many)
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_event_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  assignment_status text not null default 'pending'
    check (assignment_status in ('pending', 'confirmed', 'completed', 'cancelled')),
  contract_amount numeric(12, 2),
  contract_currency text not null default 'USD',
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid', 'waived')),
  service_description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, event_id)
);

create index if not exists vendor_event_assignments_organization_id_idx
  on public.vendor_event_assignments (organization_id);

create index if not exists vendor_event_assignments_vendor_id_idx
  on public.vendor_event_assignments (vendor_id)
  where deleted_at is null;

create index if not exists vendor_event_assignments_event_id_idx
  on public.vendor_event_assignments (event_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  document_type text not null default 'other'
    check (document_type in ('contract', 'invoice', 'w9', 'insurance', 'proposal', 'other')),
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vendor_documents_vendor_id_idx
  on public.vendor_documents (vendor_id)
  where deleted_at is null;

create index if not exists vendor_documents_event_id_idx
  on public.vendor_documents (event_id)
  where deleted_at is null;

create index if not exists vendor_documents_organization_id_idx
  on public.vendor_documents (organization_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  assignment_id uuid references public.vendor_event_assignments (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists vendor_payments_vendor_id_idx
  on public.vendor_payments (vendor_id);

create index if not exists vendor_payments_organization_id_idx
  on public.vendor_payments (organization_id);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  content text not null,
  created_by_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_notes_vendor_id_idx
  on public.vendor_notes (vendor_id)
  where deleted_at is null;

create index if not exists vendor_notes_organization_id_idx
  on public.vendor_notes (organization_id);

-- ---------------------------------------------------------------------------
-- Activity logs
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  action text not null,
  details text,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists vendor_activity_logs_vendor_id_idx
  on public.vendor_activity_logs (vendor_id, created_at desc);

create index if not exists vendor_activity_logs_organization_id_idx
  on public.vendor_activity_logs (organization_id);

-- ---------------------------------------------------------------------------
-- System default categories (organization_id null = global defaults)
-- ---------------------------------------------------------------------------

insert into public.vendor_categories (organization_id, name, slug, color, is_system, sort_order)
values
  (null, 'Food & Beverage', 'food-beverage', '#c4b5fd', true, 1),
  (null, 'Rentals', 'rentals', '#f9a8d4', true, 2),
  (null, 'Printing', 'printing', '#ddd6fe', true, 3),
  (null, 'Entertainment', 'entertainment', '#fdba74', true, 4),
  (null, 'Photography', 'photography', '#93c5fd', true, 5),
  (null, 'Decor', 'decor', '#86efac', true, 6),
  (null, 'Other', 'other', '#d4d4d8', true, 99)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.vendor_categories enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_contacts enable row level security;
alter table public.vendor_event_assignments enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.vendor_notes enable row level security;
alter table public.vendor_activity_logs enable row level security;

-- MVP policies: open access until auth hardening (matches inbox / org workspace pattern)
create policy "Allow public read access on vendor_categories"
  on public.vendor_categories for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_categories"
  on public.vendor_categories for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_categories"
  on public.vendor_categories for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_categories"
  on public.vendor_categories for delete to anon, authenticated using (true);

create policy "Allow public read access on vendors"
  on public.vendors for select to anon, authenticated using (true);
create policy "Allow public insert access on vendors"
  on public.vendors for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendors"
  on public.vendors for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendors"
  on public.vendors for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_contacts"
  on public.vendor_contacts for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_contacts"
  on public.vendor_contacts for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_contacts"
  on public.vendor_contacts for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_contacts"
  on public.vendor_contacts for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_event_assignments"
  on public.vendor_event_assignments for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_event_assignments"
  on public.vendor_event_assignments for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_event_assignments"
  on public.vendor_event_assignments for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_event_assignments"
  on public.vendor_event_assignments for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_documents"
  on public.vendor_documents for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_documents"
  on public.vendor_documents for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_documents"
  on public.vendor_documents for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_documents"
  on public.vendor_documents for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_payments"
  on public.vendor_payments for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_payments"
  on public.vendor_payments for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_payments"
  on public.vendor_payments for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_payments"
  on public.vendor_payments for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_notes"
  on public.vendor_notes for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_notes"
  on public.vendor_notes for insert to anon, authenticated with check (true);
create policy "Allow public update access on vendor_notes"
  on public.vendor_notes for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on vendor_notes"
  on public.vendor_notes for delete to anon, authenticated using (true);

create policy "Allow public read access on vendor_activity_logs"
  on public.vendor_activity_logs for select to anon, authenticated using (true);
create policy "Allow public insert access on vendor_activity_logs"
  on public.vendor_activity_logs for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Storage: vendor-documents bucket (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated read on vendor-documents"
  on storage.objects;
drop policy if exists "Allow authenticated upload to vendor-documents"
  on storage.objects;
drop policy if exists "Allow authenticated update on vendor-documents"
  on storage.objects;
drop policy if exists "Allow authenticated delete on vendor-documents"
  on storage.objects;

create policy "Allow authenticated read on vendor-documents"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'vendor-documents');

create policy "Allow authenticated upload to vendor-documents"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'vendor-documents');

create policy "Allow authenticated update on vendor-documents"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'vendor-documents')
  with check (bucket_id = 'vendor-documents');

create policy "Allow authenticated delete on vendor-documents"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'vendor-documents');
