-- Customer-facing document categories (filename + upload context inference)

alter table public.event_playbook_files
  add column if not exists document_category text;

alter table public.event_playbook_files
  drop constraint if exists event_playbook_files_document_category_check;

alter table public.event_playbook_files
  add constraint event_playbook_files_document_category_check
  check (
    document_category is null
    or document_category in (
      'contract_or_agreement',
      'meeting_agenda',
      'meeting_notes_or_minutes',
      'invoice_or_receipt',
      'quote_or_estimate',
      'volunteer_document',
      'vendor_document',
      'sponsor_document',
      'financial_document',
      'general_document'
    )
  );

create index if not exists event_playbook_files_document_category_idx
  on public.event_playbook_files (document_category);
