# Resend email templates

**Status:** Living  
**Last updated:** July 29, 2026  
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
- A compact meta or preview box is optional only when it helps the recipient act. Artwork-format labels (`1:1` and `9:16`) belong only to approval and story-kit templates.
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
| `approval-reminder` | `sendApprovalReminderEmail` in `src/lib/email/transactional-notifications.ts` | Helper ready; hook when a non-spammy reminder policy is approved |
| `trial-ending` | `sendTrialEndingEmail` in `src/lib/email/transactional-notifications.ts` | Helper ready; hook when trial notice policy is approved |
| `payment-failed` | `sendPaymentFailedEmail` in `src/lib/email/transactional-notifications.ts` | Helper ready; hook in Stripe payment-failure webhook |
| `meta-disconnected` | `sendMetaDisconnectedEmail` in `src/lib/email/transactional-notifications.ts` | Helper ready; hook on detected revoked/expired connection with deduplication |

## Deferred

The mockup’s collapsed **Deferred** list records the prepared but unbuilt
templates. Do not create or wire those templates during the soft launch.
