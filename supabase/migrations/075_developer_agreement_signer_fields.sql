-- Optional company name + typed signer email on developer and company sides

alter table public.developer_agreement_signatures
  add column if not exists signer_email text,
  add column if not exists signer_company_name text,
  add column if not exists company_email text,
  add column if not exists company_organization_name text;

alter table public.developer_agreement_company_profile
  add column if not exists organization_name text;
