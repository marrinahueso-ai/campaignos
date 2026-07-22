# Developer agreements gate

**Status:** Shipped  
**Last updated:** July 22, 2026  
**Migrations:** `073_developer_agreements.sql`, `074_developer_agreement_execution.sql`, `075_developer_agreement_signer_fields.sql`  
**QA:** [developer-agreements.md](../qa/developer-agreements.md) — manual E2E A1–A19 (gate, e-sign, countersign, download API, ops / access)

## Purpose

People invited with `campaign_role = developer` must review and electronically sign required Hey Ralli legal documents (NDA, IP assignment, and future docs) before accessing the app.

This is an **in-app e-sign** flow (typed legal name + drawn signature), not DocuSign.

## Flow

1. Invite / accept membership as usual (`/invite/[token]`).
2. After password gate (if any), middleware and `resolvePostAuthPathForUser` send unsigned developers to `/account/agreements`.
3. For each required current version: scroll to bottom → confirm → type full legal name + email (company name optional) → draw signature → Sign and Continue. Signed receipts (name, email, date, drawn signature) stay visible on the sign / counter-sign panels.
4. System builds an HTML packet with the agreement body + populated developer signature fields and stores it under Storage `executed/{userId}/{versionId}.html`.
5. Owners in `HEY_RALLI_OWNER_EMAILS` are emailed via Resend template `developer-agreement-countersign` with a counter-sign link (`/account/agreements/countersign?id=…`).
6. Owner reviews the agreement UI (developer receipt shown), types full name + email (+ optional company name / title), draws company signature → status becomes `fully_executed`.
7. Final HTML packet includes both parties (`executed/{userId}/{versionId}.html`, uploaded as `text/html; charset=utf-8`). Resend template `developer-agreement-executed` emails developer + owners with an **app-origin** download CTA: `/api/developer-agreements/download?id=…&token=…` (HMAC, ~30 days). The API streams the HTML with `Content-Type: text/html; charset=utf-8` and `Content-Disposition: inline` so Safari/Chrome render the packet (Supabase Storage signed URLs often serve as `octet-stream` / `text/plain` and show raw source). Logged-in signer/owner can omit `token`. Add `&disposition=attachment` to force a file download. HTML+attachment fallback if the template send fails. Also linked from account agreements UI and Owner ops.

### Resend templates

| Alias | Purpose | Dashboard |
|-------|---------|-----------|
| `developer-agreement-countersign` | Notify owners to counter-sign | https://resend.com/templates/0d05ada9-02f0-4995-8ea9-03e7db09e91b |
| `developer-agreement-executed` | Fully executed notice + download CTA | https://resend.com/templates/4a8acff5-cddc-4aa5-8ee7-bfe262872ed4 |

Override ids with `RESEND_DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ID` / `RESEND_DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ID` if needed.

## Data model

| Table | Role |
|-------|------|
| `developer_agreement_documents` | Template metadata (`slug`, title, `required_for_roles`, `current_version_id`) |
| `developer_agreement_versions` | Versioned HTML body + optional storage path for source file |
| `developer_agreement_signatures` | Per-user acceptance of a specific version |

Storage bucket: `developer-agreements` (private) — `templates/…` originals, `signatures/{userId}/…` drawn PNGs.

## Managing documents

Owner dashboard: `/ops` — platform metrics + **Developers signed** table (counter-sign / download).  
Owner-only manage UI: `/account/agreements/manage`  
Counter-sign queue: `/account/agreements/countersign`  
Gated by **both**:
1. Email on `HEY_RALLI_OWNER_EMAILS` (or `REPORT_A_PROBLEM_OWNER_EMAILS`)
2. Active membership **Owner** role (`campaign_role = admin`)

Other Owners / admins who are not on the email allowlist cannot open `/ops` or counter-sign.

- Seed starting NDA + IP from repo content (`src/lib/developer-agreements/seed-content.ts`, sourced from Starting Agreements `.docx`).
- Publish new versions (`.docx` / `.html` / `.txt` or pasted HTML). Publishing updates `current_version_id`; developers who have not signed that version are gated again.
- Add future employee docs by creating a new slug and setting `required_for_roles` (default `developer`; extend array when employee roles exist).

Source files for reference also live under `content/developer-agreements/`.

## Hook points

- [`src/lib/developer-agreements/gate.ts`](../../src/lib/developer-agreements/gate.ts) — `userMustSignDeveloperAgreements`
- [`src/lib/supabase/middleware.ts`](../../src/lib/supabase/middleware.ts) — hard redirect after password gate
- [`src/lib/auth/post-auth-path.ts`](../../src/lib/auth/post-auth-path.ts) — first landing after login
