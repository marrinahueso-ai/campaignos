# Resend email templates

**Status:** Living  
**Last updated:** July 31, 2026  
**Preview:** [transactional email mockup](../../public/resend-email-templates-mockup.html)

## Ship now

| Alias | From |
|---|---|
| `organization-welcome` | `notifications@heyralli.com` |
| `team-invite` | `notifications@heyralli.com` |
| `approval-assigned` | `notifications@heyralli.com` |
| `approval-resubmitted` | `notifications@heyralli.com` |
| `approval-changes-requested` | `notifications@heyralli.com` |
| `approval-content-approved` | `notifications@heyralli.com` |
| `approval-scheduled-delivery` | `notifications@heyralli.com` |
| `story-post-kit` | `socials@heyralli.com` |
| `developer-agreement-countersign` | `notifications@heyralli.com` |
| `developer-agreement-executed` | `notifications@heyralli.com` |
| `publish-failed` | `notifications@heyralli.com` |
| `approval-reminder` | `notifications@heyralli.com` |
| `trial-ending` | `notifications@heyralli.com` |
| `payment-failed` | `notifications@heyralli.com` |
| `meta-disconnected` | `notifications@heyralli.com` |

The default From line is `Hey Ralli <notifications@heyralli.com>`. Only
`story-post-kit` uses `Hey Ralli <socials@heyralli.com>`.

All 15 aliases are published in Resend as of July 29, 2026. The templates use
table layout, inline styles, a plain-text alternative, and Resend triple-brace
variables; application sends reference the stable alias rather than inline HTML.

## Design standard

Every transactional template uses the same restrained shell:

- A dark charcoal header: **Hey Ralli** at left and an uppercase category label at right.
- A 560px rounded card with one short headline, one concise sentence, and one dark CTA.
- Approval and reminder cards use soft green; welcome, invite, agreement, story-kit, and trial cards use soft beige; publishing, billing, and connection recovery cards use a calm soft rose-neutral.
- A compact meta or preview box is optional only when it helps the recipient act. **Approval emails with artwork thumbnails are app-rendered** via `sendEmail({ html })` in `approval-notifications.ts` (`buildApprovalTransactionalEmail`) — Resend template variables HTML-escape markup, so `<img>` tags cannot be injected through `{{{ARTWORK_PREVIEW_HTML}}}`. Dashboard aliases `approval-assigned` etc. remain for reference/tests; live approval sends no longer depend on them for body HTML. Story-kit keeps its template + attachments path.
- No marketing sections, extra CTAs, purple, or decorative emoji. Use direct, calm operational language.

HTML uses tables and inline styles for email-client compatibility. Resend variables
must use triple braces (for example, `{{{CONTENT_NAME}}}`) in HTML, text, and
subject lines; key casing must match the sending code exactly.

## App mapping

| Alias | App send path / trigger | Status |
|---|---|---|
| `organization-welcome` | `src/lib/email/send-organization-welcome.ts` → new founding signup | Wired |
| `team-invite` | `src/lib/auth/actions.ts` → team invite and resend | Wired |
| `approval-assigned` | `src/lib/campaign-builder-v2/approval-notifications.ts` | Wired |
| `approval-resubmitted` | `src/lib/campaign-builder-v2/approval-notifications.ts` | Wired |
| `approval-changes-requested` | `src/lib/campaign-builder-v2/approval-notifications.ts` | Wired |
| `approval-content-approved` | `src/lib/campaign-builder-v2/approval-notifications.ts` | Wired |
| `approval-scheduled-delivery` | `src/lib/campaign-builder-v2/approval-notifications.ts` | Wired |
| `story-post-kit` | `src/lib/meta-publishing/send-story-post-kit.ts` and approval scheduling; template body plus immediate-send attachments | Wired |
| `developer-agreement-countersign` | `src/lib/developer-agreements/packet.ts` | Wired |
| `developer-agreement-executed` | `src/lib/developer-agreements/packet.ts` → template body plus executed-copy attachment | Wired |
| `publish-failed` | `src/lib/approvals-scheduling/actions.ts` → immediate Meta publish failure | Wired |
| `approval-reminder` | `src/app/api/cron/meta-token-health/route.ts` → pending assigned approval | Wired — after 24h, once per approval request |
| `trial-ending` | `src/app/api/cron/meta-token-health/route.ts` → Stripe-backed `trial_ends_at` snapshot | Wired — within 3 days, once per org + trial end |
| `payment-failed` | `src/app/api/stripe/webhook/route.ts` → `invoice.payment_failed` | Wired — once per Stripe invoice |
| `meta-disconnected` | `src/lib/meta-publishing/connection-token-health.ts` → invalid Page token | Wired — once per connection row |

## Soft-launch notification policy

- Approval reminders are evaluated by the existing daily Meta token-health cron. An
  assigned approval that has remained pending for 24 hours receives one reminder;
  unassigned role-based requests are skipped because they do not have a reliable
  mailbox.
- Trial notices are evaluated by the same daily job only while the local billing
  snapshot is `trialing` and the end is 1–3 days away. Active admin/president
  recipients receive one notice for that exact trial end timestamp.
- Failed invoice notices are sent to active admin/president recipients when Stripe
  delivers `invoice.payment_failed`, once per invoice.
- A Meta token reported invalid by the health check sends a reconnect notice to
  active admin/president recipients once per connection row. The delivery ledger is
  intentionally durable, so repeated failed health checks cannot create a reconnect
  storm.

All four policies use the durable
`transactional_notification_deliveries` ledger in addition to Resend's 24-hour
idempotency key retention. Failed sends release their pending delivery claim so a
later eligible job/webhook retry can send.

Ledger implementation: `src/lib/email/transactional-notification-jobs.ts`
(`claimDelivery` / `markDeliverySent` / `releaseDelivery`).

### Dedupe keys

| Alias | Trigger | Ledger `entity_key` | Resend idempotency key |
|---|---|---|---|
| `approval-reminder` | Daily `GET /api/cron/meta-token-health` | approval request id | `approval-reminder/{requestId}` |
| `trial-ending` | Same cron | `{organizationId}:{trial_ends_at}` | `trial-ending/{organizationId}/{trialEndsAt}` |
| `payment-failed` | `POST /api/stripe/webhook` → `invoice.payment_failed` | Stripe invoice id | `payment-failed/{invoiceId}` |
| `meta-disconnected` | `connection-token-health.ts` on invalid token | Meta connection row id | `meta-disconnected/{connectionId}` |

Recipients: approval reminder → assigned approver email only; trial / payment / Meta disconnect → active org members with `campaign_role` in `admin` or `president`.

## Webhooks & cron hooks (operational)

There is no separate webhooks living doc. Operational notification triggers:

| Source | Path | Templates |
|---|---|---|
| Vercel Cron | `/api/cron/meta-token-health` | `approval-reminder`, `trial-ending`; also drives `meta-disconnected` via token health |
| Stripe webhook | `/api/stripe/webhook` | `payment-failed` on `invoice.payment_failed` |

Cron schedule and auth: [cron-jobs.md](./cron-jobs.md). Stripe event matrix: [stripe-integration.md § Webhook events handled](../engineering/stripe-integration.md#webhook-events-handled).

## Deferred

The mockup’s collapsed **Deferred** list records the prepared but unbuilt
templates. Do not create or wire those templates during the soft launch.
