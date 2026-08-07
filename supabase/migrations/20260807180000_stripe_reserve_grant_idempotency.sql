-- Idempotent Stripe AI Reserve grants: at most one ledger row per Checkout session note.
-- App code checks before grant; this unique index closes concurrent webhook races.

create unique index if not exists organization_ai_credit_ledger_stripe_checkout_note_uidx
  on public.organization_ai_credit_ledger (note)
  where entry_type = 'reserve_grant'
    and note like 'Stripe Checkout %';
