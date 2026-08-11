# Newsletter Composer (Engineering)

**Status:** Living
**Owner:** Engineering (Hey Ralli)
**Last updated:** August 10, 2026
**Related:** [QA guide](../qa/newsletter-composer.md) · [Feature list](../product/feature-list.md) · [Access control](./access-control.md) · [Multi-tenant isolation](../security/multi-tenant-isolation.md) · [Cron jobs](../ops/cron-jobs.md) · [Resend email templates](../ops/resend-email-templates.md) · [Homepage Composer eng](./homepage-composer.md) · [Architecture](./architecture.md)

Two layers: a block-builder UI (Library → Template → Builder → Preview & Send Details) on top of a **durable Newsletter → Approval → Schedule → Send pipeline** (same tables/RPCs). UX Pilot references live under `public/ux-newsletter/`.

---

## 1. Lifecycle

`NewsletterStatus` (`src/lib/newsletter/types.ts`):

| Status | Meaning |
|--------|---------|
| `draft` | Being edited; never submitted, or pulled back via invalidation |
| `needs_approval` | Submitted, waiting on an approver |
| `changes_requested` | Approver asked for changes |
| `approved` | Brief intermediate after approve before schedule write (normally transitions immediately to `scheduled` via Approve & Schedule) |
| `scheduled` | A scheduled send is queued against the approved version |
| `sending` | A send is actively in flight (single-flight guard) |
| `sent` | The most recent send completed |
| `failed` | The most recent send failed outright |

**Approve & Schedule.** Approving from the Approvals hub (`approveAndScheduleNewsletterForApprovalsHub`) marks the newsletter approved **and** schedules using the creator’s `proposed_send_at` + proposed audience. There is no required creator-side prepare-to-send step afterward. Production delivery still goes through the scheduled-send cron / Send Now path and the production gate (§9).

---

## 2. Surfaces & routes

| Route | Role | Gate |
|-------|------|------|
| `/newsletters` | Library home with status filters | Any active member |
| `/newsletters/new` | Template selection (Standard School Update) | `draft_edit` to continue into builder |
| `/newsletter-composer` | Block builder; `?newsletterId=` loads durable draft | `draft_edit` to save |
| `/newsletters/[newsletterId]/preview` | Preview + recipients + send datetime → Submit/Resubmit | `draft_edit` / `submit_approval` |
| `/newsletters/[newsletterId]` | Status surface (waiting / changes / scheduled / sent) | Any active member |
| `/newsletters/[newsletterId]/send` | Ops: cancel/reschedule/send-now | `send_newsletter` |
| `/newsletter-contacts` | Contacts + audiences | `manage_newsletter_contacts` |
| `/newsletter/unsubscribe` | Public token unsubscribe | Public |
| `/api/cron/newsletter-scheduled-sends` | Executes due scheduled sends | `CRON_SECRET` |
| `/api/newsletter/webhooks/resend` | Delivery/bounce/complaint | Svix signature |

Chooser entry: `/create-with-ai` → Newsletter → `/newsletters/new` (templates) / Library at `/newsletters`.

---

## 3. Durable model (tables)

All under `public.*`, RLS `private.is_active_org_member(organization_id)` (select/insert/update; delete where applicable). Migration `20260810120000_newsletter_approval_send.sql` unless noted.

| Table | Purpose |
|-------|---------|
| `newsletters` | One row per newsletter: status, `composer_state` (live draft snapshot incl. optional `canvasBlocks`), `current_version_id`, `approved_version_id`, proposed/approved audience, subject/from/reply-to, submitted/approved/sent actor + timestamps, `proposed_send_at` / `scheduled_send_at` |
| `newsletter_versions` | Immutable snapshot frozen at "Send for approval": `content_fingerprint`, `rendered_html` (with compliance footer baked in), subject/from/reply-to/audience, `proposed_send_at`, `compliance_footer` — unique `(newsletter_id, version_number)` |
| `newsletter_contacts` | Org's newsletter recipients — **not** `organization_users` / Team & Access. Status (`active`/`unsubscribed`/`suppressed`/`bounced`/`complained`), source (`manual`/`csv_import`/`api`), consent attestation fields. Unique `(organization_id, email_normalized)` |
| `newsletter_audiences` + `newsletter_audience_members` | Named recipient groups — **not** Team & Access roles. Membership is a plain join table (`audience_id, contact_id, organization_id`) |
| `newsletter_import_batches` | One row per CSV import; carries the `authorization_attested` flag + counts |
| `newsletter_sender_profiles` | Org's authorized From display name / From email / Reply-To / physical-address override; primary key `organization_id` |
| `newsletter_sends` | Send ledger — one row per production or test-adjacent attempt, `send_kind` (`production`/`test` — test sends do **not** actually write here, see §11), `status`, unique `(organization_id, idempotency_key)` for double-click/retry safety |
| `newsletter_send_recipients` | Per-recipient row for a send; unique `(send_id, email_normalized)`; carries `provider_message_id` for webhook correlation |
| `newsletter_delivery_events` | Raw Resend webhook events, unique `(provider, provider_event_id)` for idempotent redelivery |
| `newsletter_unsubscribe_tokens` | Hashed, single-use per-recipient unsubscribe tokens; no client RLS policies — service-role / RPC only |
| `newsletter_audit_events` | Lightweight audit trail (see §16) |
| `approval_scheduling_items.organization_id` (added column) | Extends the existing unified approvals table so a row can be org-scoped instead of event-scoped (`event_id` now nullable; check constraint requires one or the other) |

`20260810130000_approval_scheduling_items_org_scope_rls.sql` fixes the RLS gap this created: the pre-existing policies gated everything on `private.can_access_event(event_id)`, which is never true when `event_id is null`, so org-scoped (newsletter) rows were unreadable/unwritable by anyone until an `OR (event_id is null and organization_id is not null and private.is_active_org_member(organization_id))` branch was added to all four `approval_scheduling_items` policies.

Two `SECURITY DEFINER` RPCs (both `set search_path = ''`, callable by `service_role`; the unsubscribe RPC is also callable by `anon`/`authenticated` for the public page):

- `redeem_newsletter_unsubscribe_token(p_token_hash)` — validates + consumes a hashed token, marks the contact `unsubscribed`, never reactivates an already-unsubscribed/suppressed contact.
- `claim_newsletter_scheduled_send(p_send_id)` — atomically flips a due `scheduled` send to `sending` (returns `false` if not claimable), used by the cron executor as the single-flight guard.

---

## 4. Versioning + content fingerprint

`src/lib/newsletter/versions.ts` → `createVersionFromNewsletter`:

1. Loads the org + sender profile, builds the physical mailing address and compliance footer (§8).
2. Renders `exportNewsletterHtml(composerState)` (canvas blocks when present) and injects the compliance footer before `</body>`.
3. Computes a `content_fingerprint` via `computeNewsletterContentFingerprint` (`src/lib/newsletter/content-fingerprint.ts`) — a SHA-256 hash of a canonicalized JSON blob of `{ composerState, subject, fromDisplayName, fromEmail, replyToEmail, audienceId, proposedSendAt }`.
4. Inserts the next `version_number` for that newsletter and points `newsletters.current_version_id` at it.

**Approval package:** content + recipients + proposed send datetime. Changing any of these after approval invalidates.

**Explicitly excluded from the fingerprint:** test-send activity (never touches versions).

Invalidation (`src/lib/newsletter/invalidate.ts`):

- `checkAndInvalidateIfContentChanged` — only runs when status is `approved` or `scheduled`. Recomputes the fingerprint of the *live* draft fields and compares it against the frozen `approved_version_id` snapshot's fingerprint. On mismatch, calls `invalidateNewsletterApproval`.
- `invalidateNewsletterApproval` — rolls status back to `draft`, clears `approved_version_id` / `approved_audience_id` / `approved_by` / `approved_at` / `scheduled_send_at`, and cancels any still-`scheduled` send row (never touches a send that is already `sending` or `sent` — those are historical facts). Logs `approval_invalidated`.

Callers that trigger a re-check: `editContentRequiringReapproval` (any draft field edit on an already-approved/scheduled newsletter, including `proposedSendAt`) and `changeAudience`.

---

## 5. Approval bridge (Approvals hub)

`src/lib/newsletter/approval.ts` defines the bridge identity: `campaign_milestone_id = "newsletter:" + newsletterId` (`buildNewsletterMilestoneId` / `isNewsletterMilestoneId` / `parseNewsletterIdFromMilestoneId`), campaign name `"Newsletter"`.

**Submit** — `sendNewsletterForApproval` (`src/lib/newsletter/send-for-approval.ts`), gated on `submit_approval`:

1. Requires non-empty subject, `proposed_audience_id`, and a **future** `proposed_send_at`.
2. Freezes a new `newsletter_versions` snapshot via `createVersionFromNewsletter`.
3. Upserts an `approval_scheduling_items` row keyed by `(organization_id, campaign_milestone_id)` with `event_id = null`, `source = "campaign_builder"`, `schedule_at = proposed_send_at`.
4. Sets `newsletters.status = "needs_approval"`, records `submitted_by` / `submitted_at`, logs `submitted_for_approval`.
5. Emails the resolved approver when Resend is configured.

**Approve & Schedule from the Approvals hub** — `approveAndScheduleNewsletterForApprovalsHub`, gated on `approve_comms` (**not** `send_newsletter`). Approves the current version/audience, then calls `scheduleNewsletterSend` with `proposed_send_at` and `hasSendPermission: true` so approvers can schedule the pre-selected package. Notifies the creator that the newsletter is approved & scheduled.

**Request changes from the Approvals hub** — `requestNewsletterChangesForApprovalsHub`, gated on `approve_comms`. Sets `changes_requested` with a note; package (audience + proposed send time) is preserved for resubmit.

Wiring into the shared hub: `src/lib/approvals-scheduling/actions.ts` routes newsletter approve to Approve & Schedule; ReviewDrawer label is **Approve & Schedule**.

---

## 6. Permissions

Newsletters reuse `AccessPermissionKey` (`src/lib/access-templates/types.ts`) — no separate permission system. Checks go through `hasPermission` / `requirePermission` (`src/lib/access-templates/effective-access.ts`); see `src/lib/newsletter/permissions.ts` for the newsletter-specific wrappers.

| Key | Grants | Default (admin / president / vp_communications) |
|-----|--------|----|
| `send_newsletter` | Production Send Now / Schedule / cancel / reschedule at `/newsletters/[id]/send`. **Approving a newsletter does not require this.** | `true`; all other roles `false` |
| `manage_newsletter_contacts` | Create/import contacts, create audiences, manage audience membership (`/newsletter-contacts`) | `true`; all other roles `false` |
| `draft_edit` | Create/edit a newsletter draft, save server-durable fields, send a **test** email (manual recipients only) | Broad (committee chairs / contributors typically have this) |
| `submit_approval` | Submit a draft for approval (`sendNewsletterForApproval`) | Broad |
| `approve_comms` | Approve or request changes from the Approvals hub — shared with Social/Flyer approvals | Approver-role dependent |

Practical effect: a committee chair with only `draft_edit` + `submit_approval` can build a newsletter, send themselves a test, and submit it — but cannot send it to the real audience or touch the contact list, even after it's approved.

---

## 7. Contacts & audiences (not Team & Access)

`src/lib/newsletter/contacts.ts` / `audiences.ts` / `audience-eligibility.ts` / `contact-reimport.ts` / `csv-parse.ts`.

- **Contacts are not Hey Ralli users.** `newsletter_contacts` has no relationship to `organization_users` or membership rows — a family can be a newsletter contact without ever having a Hey Ralli account, and a Hey Ralli team member is not automatically a newsletter contact.
- **Audiences are not Team & Access roles.** `newsletter_audiences` group *contacts* for send targeting; they are unrelated to access templates or `organization_roles`.
- **Locked statuses are sticky.** `resolveContactReimportAction` (pure, unit-tested) is the single source of truth: a contact in `unsubscribed` / `suppressed` / `bounced` / `complained` is **never** reactivated to `active` by a later manual add or CSV re-import — only name fields may refresh. This is enforced identically by `addNewsletterContact` and `importNewsletterContactsCsvRows`.
- **CSV import requires attestation.** `importNewsletterContactsCsvRows` refuses to run unless `attested: true` is passed (the UI collects an explicit "I'm authorized to email these contacts" checkbox); every batch is recorded in `newsletter_import_batches`. `parseCsvText` / `guessCsvContactColumns` (`csv-parse.ts`) handle the raw CSV parsing and header-guessing without an external dependency.
- **Eligibility is always recomputed fresh.** `computeAudienceEligibility` joins `newsletter_audience_members` → `newsletter_contacts` and calls the pure `computeEligibilityFromContacts` (`audience-eligibility.ts`): only `active` contacts are eligible, normalized-email duplicates within the audience are deduped, and the result reports `selected` / `excluded` / `eligible` counts — never cached on the newsletter, so a stale audience snapshot can't silently under- or over-send.

---

## 8. Compliance footer

`src/lib/newsletter/compliance-footer.ts`. The footer is **always server-generated** — the composer/author never authors this HTML, so it can't be stripped or edited from the client.

- `buildPhysicalAddress` — joins the organization's address fields, falling back to a sender-profile `physical_address_override` (e.g. a PO box) only when the org address is incomplete.
- `hasRequiredMailingAddress` — CAN-SPAM check: street + city + (state or country), or an explicit override.
- `buildComplianceFooterHtml` — org name, physical address, a "why you're receiving this" line, and an `<a href="{{UNSUBSCRIBE_URL}}">Unsubscribe</a>` link using the literal placeholder token.
- `injectComplianceFooter` — inserts before `</body>` (or appends if absent).

The footer is frozen into `newsletter_versions.compliance_footer` and baked into `rendered_html` at version-creation time (§4); the `{{UNSUBSCRIBE_URL}}` placeholder is swapped for a real signed URL **per recipient** at send time (§10), and swapped for `#` on test sends (§11).

---

## 9. Send validator + production gate

`src/lib/newsletter/send-validator.ts` (I/O: loads newsletter/version/audience/sender profile) delegates the actual pass/fail logic to the pure, unit-tested `runNewsletterSendChecks` (`send-validator-checks.ts`) so the fail-closed rules can be tested without a database. Every check must pass; **any single failure blocks the send**:

- Caller has `send_newsletter`.
- Status is `approved` or `scheduled`.
- An `approved_version_id` exists **and** still matches `current_version_id` (draft hasn't drifted since approval).
- An `approved_audience_id` exists **and** the version's audience still matches it (audience hasn't drifted since approval).
- Subject is non-empty.
- From address is authorized (`resolveAuthorizedFromAddress` — must exactly match the org's `newsletter_sender_profiles.from_email`; callers cannot supply an arbitrary From address).
- Reply-to is a valid email format.
- A physical mailing address is present.
- The compliance footer was generated for this version.
- Unsubscribe tokens can be generated.
- At least one eligible recipient in the approved audience.
- **`isNewsletterProductionSendEnabled()` is true** (`production-gate.ts`) — reads `NEWSLETTER_PRODUCTION_SEND_ENABLED === "true"`, defaults OFF (fail closed) in every environment. No `server-only` guard on purpose: it's a pure env read, not a secret, and unit tests import it directly.
- No duplicate active send already `sending`/`sent` for this newsletter.

This validator runs both interactively (`prepareSend` server action, surfaced on `/newsletters/[id]/send`) and again, independently, inside `sendNewsletterNow` / `scheduleNewsletterSend` / the cron executor — the UI showing "ready to send" is never trusted as the final gate.

---

## 10. Send Now / Schedule / delivery

- **Send Now** — `src/lib/newsletter/send-now.ts`. Re-runs the validator, computes a deterministic default idempotency key (`send:{newsletterId}:{versionId}`) if the caller doesn't supply one, and upserts a `newsletter_sends` row keyed on `(organization_id, idempotency_key)` — a double-click / retry on an already-`sending`/`sent` row returns the existing record untouched instead of double-sending. Flips `newsletters.status` to `sending`, then calls the shared delivery step.
- **Schedule** — `src/lib/newsletter/schedule.ts` `scheduleNewsletterSend`. Requires a future timestamp and an already-approved newsletter (validator must pass); upserts a `scheduled` send row (`schedule:{newsletterId}:{versionId}` idempotency key) and sets `newsletters.scheduled_send_at`. `cancelNewsletterSchedule` / `rescheduleNewsletterSend` operate on the pending `scheduled` row only — **the approval itself is untouched by schedule-only changes** (§4).
- **Delivery** — `src/lib/newsletter/send-delivery.ts` `deliverNewsletterSend`, shared by Send Now and the cron executor. Batches recipients (10 at a time), mints one unsubscribe token per recipient (`createUnsubscribeToken`), swaps `{{UNSUBSCRIBE_URL}}` for that recipient's real URL, and calls `sendEmail` with the org's authorized From header. Upserts one `newsletter_send_recipients` row per attempt (`onConflict: "send_id,email_normalized"`), then finalizes the `newsletter_sends` row (`sent` if at least one recipient succeeded, else `failed`) and mirrors the outcome onto `newsletters.status` / `sent_at` / `sent_by` / `last_failure_reason`.

---

## 11. Test send

`src/lib/newsletter/test-send.ts` `sendNewsletterTestEmail`, gated on `draft_edit` **or** `send_newsletter` (either is enough — testing must not require production send access).

- Sends only to manually entered recipient emails passed by the caller — **never the audience**.
- Renders the **live draft** (`newsletter.composerState`), not a frozen version — so it never touches `current_version_id` / `approved_version_id`, the send ledger, or approval status.
- Subject prefixed `[TEST] `; body prepended with a yellow "TEST SEND — this preview was not delivered to your audience" banner.
- The unsubscribe placeholder resolves to `#` (no real token minted, no real contact touched).
- Not gated by `NEWSLETTER_PRODUCTION_SEND_ENABLED` — test sends work even with the production gate off.
- Logs a `test_send` audit event either way (success or failure).

---

## 12. Schedule cron + idempotency

`/api/cron/newsletter-scheduled-sends` (`src/app/api/cron/newsletter-scheduled-sends/route.ts`), scheduled in `vercel.json` every **10 minutes** (`*/10 * * * *`), authorized via `isCronRequestAuthorized` / `CRON_SECRET` (see [cron-jobs.md](../ops/cron-jobs.md)).

1. `listDueNewsletterScheduledSendIds` (admin client) — all `newsletter_sends` rows with `status = "scheduled"` and `scheduled_for <= now()`, across every org.
2. For each id, `executeScheduledSend` (`src/lib/newsletter/schedule.ts`):
   - Claims the row via `claim_newsletter_scheduled_send` (atomic `scheduled → sending`; returns `false` if not claimable — the single-flight guard).
   - Re-verifies the newsletter is still `scheduled` and its `approved_version_id` / `approved_audience_id` still match what was captured at schedule time; fails the send with a clear reason if not (content or audience changed after scheduling).
   - Re-checks `isNewsletterProductionSendEnabled()` — the gate can be flipped off between scheduling and the due time.
   - **Recomputes eligibility fresh** from `newsletter_audience_members`/`newsletter_contacts` — never trusts the counts captured at schedule time (suppression may have changed).
   - Calls the same `deliverNewsletterSend` used by Send Now.
3. Any failure path calls `failClaimedSend` (marks the send `failed` with a reason) rather than leaving it stuck `sending`.

Runs entirely on the Supabase admin client — no user session exists in a cron context.

---

## 13. Resend webhook

`/api/newsletter/webhooks/resend` (`src/app/api/newsletter/webhooks/resend/route.ts`) → `src/lib/newsletter/webhook-resend.ts`.

- Signature verification (`verifyResendWebhookSignature`) follows Resend's Svix scheme: headers `svix-id` / `svix-timestamp` / `svix-signature`, secret `whsec_...`, signed content `${id}.${timestamp}.${rawBody}`, HMAC-SHA256, constant-time compare. Verification is skipped (accepts unverified) only when `RESEND_WEBHOOK_SECRET` is unset.
- Idempotent by `(provider, provider_event_id)` — a Postgres unique-violation (`23505`) on the insert into `newsletter_delivery_events` is treated as "already recorded," not an error.
- Correlates the event to a `newsletter_send_recipients` row by `provider_message_id`; if none is found (e.g. a test send), the event is still recorded but nothing else happens.
- `email.delivered` → recipient `delivered`. `email.bounced` → recipient `bounced`, and a **hard** bounce (`isHardBounce`: anything that isn't explicitly `transient`/`soft`) suppresses the contact via `suppressNewsletterContact`. `email.complained` → recipient `complained` + suppress. `email.failed` → recipient `failed`.
- Runs entirely on the admin client (webhooks are unauthenticated; the relevant tables have no client-facing insert policy for this path).

---

## 14. Unsubscribe token flow

`src/lib/newsletter/unsubscribe.ts`.

- `createUnsubscribeToken` mints a random 32-byte token, stores only its SHA-256 hash in `newsletter_unsubscribe_tokens` (admin client — no client RLS policy exists for this table), and returns the raw token to the caller exactly once (never persisted in plaintext).
- `buildUnsubscribeUrl` → `{APP_URL}/newsletter/unsubscribe?token={raw}`.
- The public page (`src/app/(public)/newsletter/unsubscribe/page.tsx`) calls `redeemUnsubscribeToken`, which hashes the incoming token and invokes the `redeem_newsletter_unsubscribe_token` **SECURITY DEFINER** RPC (no login required). Outcomes: `unsubscribed`, `already_unsubscribed`, `expired`, `invalid` — each renders a distinct, calm confirmation state.
- Redemption permanently sets the contact to `unsubscribed` and marks the token used; it is one of the "locked" statuses that a later CSV import/manual add can never clear (§7).

---

## 15. Sender profile / From-address authorization

`src/lib/newsletter/sender.ts`. `newsletter_sender_profiles` holds the org's authorized From display name, From email, Reply-To, and an optional physical-address override.

- `resolveDefaultNewsletterFromEmail` — `NEWSLETTER_FROM_EMAIL` → falls back to `RESEND_FROM_EMAIL` → falls back to the shared `resolveFromAddress()` (`src/lib/email/send.ts`).
- `resolveAllowedNewsletterFromDomain` — the domain half of that resolved address; this is the **only** domain an org's From email may use.
- `validateNewsletterFromEmail` — enforced whenever an org updates its sender profile: valid email format, and domain must exactly match the authorized domain (anti-spoofing — orgs cannot set an arbitrary From address).
- `resolveAuthorizedFromAddress` — enforced again at send time: the newsletter draft's requested From email must exactly match the org's authorized `from_email`, or the send is blocked.
- `formatFromHeader` — `Display Name <email>` RFC-5322 header used on every outbound `sendEmail` call (production, scheduled, and test).

---

## 16. Audit trail

`src/lib/newsletter/audit.ts` `logNewsletterAuditEvent` inserts into `newsletter_audit_events` (org- and newsletter-scoped, newest-first via `listNewsletterAuditEvents`, surfaced on `/newsletters/[id]`). Event types: `draft_saved`, `submitted_for_approval`, `changes_requested`, `approved`, `approval_invalidated`, `audience_changed`, `test_send`, `send_started`, `send_completed`, `send_failed`, `scheduled`, `schedule_cancelled`, `schedule_rescheduled`, `contact_added`, `contact_imported`, `contact_suppressed`, `audience_created`, `sender_profile_updated`. A logging failure is swallowed after being logged to the server console — it must never reverse a mutation that already succeeded.

---

## 17. Composer draft storage (client layer, unchanged)

**DB:** IndexedDB `heyralli-newsletter-composer` / store `drafts`
**LS key:** `newsletter-composer:v2:{organizationId|local}` (reads v1 legacy raw JSON)

Envelope (same pattern as Homepage): `{ v: 2, at: number, state: NewsletterComposerState }`.

- **Write** (`saveComposerDraft`): sync LS first, then IDB put-if-newer (skips stale in-flight writes). Quota may slim `data:` image fields from the LS copy only.
- **Read** (`loadComposerDraftRaw`): compare IDB vs LS by `at`; newest wins; tie → IDB. If LS wins but slimmed images, merge artwork back from IDB.
- **Autosave:** ~450ms debounce after hydrate; also flushes on `visibilitychange` (hidden), `pagehide`, `beforeunload`, and effect cleanup. Hydrate runs once per `organizationId` (not on every events refetch).

**Server-durable save is layered on top, not a replacement.** Once a newsletter has an id (`saveDraft` / `editContentRequiringReapproval` server actions in `src/lib/newsletter/actions.ts`), the composer also persists `composer_state` + editable fields onto the `newsletters` row on every save — this is what `createVersionFromNewsletter` reads at submit time. The browser-local store remains the fast-path autosave; it is not deleted when a durable id exists.

Steps today: `header` → `message` → `stories` → `mustdos` → `footer` → `layout` → `preview` (`NewsletterComposerStep`). **The old standalone `send` step is removed** — Preview now hosts **Send test** (manual recipients, `testSend` action) and **Send for approval** (`submitForApproval` → routes to `/newsletters/[id]?prepare=approval`), plus the original **Copy email HTML** / **Copy for Membership Toolkit** clipboard exports.

---

## 18. Key files

| Area | Path | Role |
|------|------|------|
| Composer UI | `src/components/newsletter-composer/NewsletterComposer.tsx` | Multi-step UI, local draft hydrate/save, durable save wiring, Preview (test send / send for approval / exports) |
| Composer preview | `src/components/newsletter-composer/EmailPreviewPhone.tsx` | Phone / desktop preview shells |
| Composer types/state | `src/lib/newsletter-composer/types.ts`, `defaults.ts`, `draft-storage.ts` | Local state, layout sync, browser-local draft store |
| Export | `src/lib/newsletter-composer/export-html.ts`, `export-mtk.ts` | Full HTML export + Membership Toolkit rich fragment (shared by composer preview, versions, and test send) |
| Durable model types | `src/lib/newsletter/types.ts` | All `newsletter_*` row + domain shapes |
| Permissions | `src/lib/newsletter/permissions.ts` | `send_newsletter` / `manage_newsletter_contacts` / `draft_edit` / `submit_approval` wrappers |
| Server actions | `src/lib/newsletter/actions.ts` | `saveDraft`, `submitForApproval`, `approveNewsletter`, `sendNow`, `schedule`, `testSend`, contacts/audiences actions |
| Versions | `src/lib/newsletter/versions.ts` | Freeze/read immutable snapshots |
| Fingerprint / invalidation | `src/lib/newsletter/content-fingerprint.ts`, `invalidate.ts` | Approval-invalidating change detection |
| Approval bridge | `src/lib/newsletter/approval.ts`, `send-for-approval.ts` | Milestone id, submit/approve/request-changes, notification emails |
| Send validator | `src/lib/newsletter/send-validator.ts`, `send-validator-checks.ts` | Fail-closed final gate (I/O vs pure logic split for testability) |
| Production gate | `src/lib/newsletter/production-gate.ts` | `NEWSLETTER_PRODUCTION_SEND_ENABLED` |
| Send / schedule | `src/lib/newsletter/send-now.ts`, `schedule.ts`, `send-delivery.ts` | Send Now, Schedule/cancel/reschedule, cron executor, shared delivery |
| Test send | `src/lib/newsletter/test-send.ts` | Manual-recipient preview send |
| Contacts / audiences | `src/lib/newsletter/contacts.ts`, `contact-reimport.ts`, `audiences.ts`, `audience-eligibility.ts`, `csv-parse.ts` | Contact CRUD/import, locked-status rules, audience membership + eligibility |
| Compliance / sender | `src/lib/newsletter/compliance-footer.ts`, `sender.ts` | Footer HTML, From-address authorization |
| Unsubscribe | `src/lib/newsletter/unsubscribe.ts` | Token mint/hash/redeem |
| Webhook | `src/lib/newsletter/webhook-resend.ts` | Resend signature verify + event handling |
| Audit | `src/lib/newsletter/audit.ts` | `newsletter_audit_events` |
| Queries | `src/lib/newsletter/queries.ts` | List/detail reads, row mappers |
| Routes (dashboard) | `src/app/(dashboard)/newsletters/`, `newsletter-contacts/` | List, detail, send, contacts pages |
| Route (public) | `src/app/(public)/newsletter/unsubscribe/page.tsx` | Public unsubscribe |
| Cron | `src/app/api/cron/newsletter-scheduled-sends/route.ts` | Scheduled-send executor entrypoint |
| Webhook route | `src/app/api/newsletter/webhooks/resend/route.ts` | Resend webhook endpoint |
| Shells | `src/components/newsletters/NewsletterDetailShell.tsx`, `PrepareForSendShell.tsx`, `NewsletterContactsShell.tsx`, `NewsletterStatusBadge.tsx` | Durable-model UI |
| Migrations | `supabase/migrations/20260810120000_newsletter_approval_send.sql`, `20260810130000_approval_scheduling_items_org_scope_rls.sql` | Schema + RLS |

---

## 19. Credits

| Action type | When |
|-------------|------|
| _(none)_ | Newsletter Composer does not call `generateText` / artwork orchestration; AI credits for Social Campaign Builder remain separate |

Uploads (header / story / sponsor / volunteer images) stay storage-only via `uploadNewsletterComposerArtworkAction` → `event-assets` bucket (org-first path exception pattern — see [storage-rls.md](./storage-rls.md)); unchanged from the soft-launch composer.
