# Developer agreements gate

**Status:** Shipped  
**Last updated:** July 22, 2026  
**Migration:** `supabase/migrations/073_developer_agreements.sql`

## Purpose

People invited with `campaign_role = developer` must review and electronically sign required Hey Ralli legal documents (NDA, IP assignment, and future docs) before accessing the app.

This is an **in-app e-sign** flow (typed legal name + drawn signature), not DocuSign.

## Flow

1. Invite / accept membership as usual (`/invite/[token]`).
2. After password gate (if any), middleware and `resolvePostAuthPathForUser` send unsigned developers to `/account/agreements`.
3. For each required current version: scroll to bottom → confirm → type full legal name → draw signature → Sign and Continue.
4. Audit fields stored: typed name, signature image path, timestamp, IP, user agent, agreement version.
5. When all current required versions are signed → `/dashboard` (or normal post-auth path).

## Data model

| Table | Role |
|-------|------|
| `developer_agreement_documents` | Template metadata (`slug`, title, `required_for_roles`, `current_version_id`) |
| `developer_agreement_versions` | Versioned HTML body + optional storage path for source file |
| `developer_agreement_signatures` | Per-user acceptance of a specific version |

Storage bucket: `developer-agreements` (private) — `templates/…` originals, `signatures/{userId}/…` drawn PNGs.

## Managing documents

Owner-only UI: `/account/agreements/manage`  
Gated by `HEY_RALLI_OWNER_EMAILS` (or `REPORT_A_PROBLEM_OWNER_EMAILS`).

- Seed starting NDA + IP from repo content (`src/lib/developer-agreements/seed-content.ts`, sourced from Starting Agreements `.docx`).
- Publish new versions (`.docx` / `.html` / `.txt` or pasted HTML). Publishing updates `current_version_id`; developers who have not signed that version are gated again.
- Add future employee docs by creating a new slug and setting `required_for_roles` (default `developer`; extend array when employee roles exist).

Source files for reference also live under `content/developer-agreements/`.

## Hook points

- [`src/lib/developer-agreements/gate.ts`](../../src/lib/developer-agreements/gate.ts) — `userMustSignDeveloperAgreements`
- [`src/lib/supabase/middleware.ts`](../../src/lib/supabase/middleware.ts) — hard redirect after password gate
- [`src/lib/auth/post-auth-path.ts`](../../src/lib/auth/post-auth-path.ts) — first landing after login
