# Organization welcome email

**Purpose:** Industry-neutral welcome for **new organization** founding signup.  
**Does not say:** school, PTO (verticals come later).

## Production flow (wired)

When someone starts a new organization with a founding code:

1. App validates the founding access code
2. Supabase Admin `generateLink({ type: "magiclink" })` creates the secure setup URL
3. Resend sends the published **`organization-welcome`** template with that URL
4. User clicks **Let's get started** → `/auth/callback` → organization setup

Requires `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. If either is missing, founding signup falls back to Supabase Auth’s built-in `signInWithOtp` email.

## Resend template (published)

| Field | Value |
|-------|--------|
| Name | Hey Ralli Organization Welcome |
| Alias | `organization-welcome` |
| ID | `99983b20-d42c-43be-aced-947e8707918d` |
| Subject | `Welcome to Hey Ralli — create your organization` |
| From | `Hey Ralli <notifications@heyralli.com>` |
| Dashboard | https://resend.com/templates/99983b20-d42c-43be-aced-947e8707918d |

**Variables**

| Variable | Use |
|----------|-----|
| `{{{ACTION_URL}}}` | Supabase magic-link / setup URL |
| `{{{RECIPIENT_EMAIL}}}` | Recipient address shown in the body |

Code: [`src/lib/email/send-organization-welcome.ts`](../../src/lib/email/send-organization-welcome.ts) (template first, HTML builder fallback).

## Repo source files

| File | Role |
|------|------|
| [`src/lib/email/organization-welcome-email.ts`](../../src/lib/email/organization-welcome-email.ts) | Subject + HTML/text builder |
| [`src/lib/email/send-organization-welcome.ts`](../../src/lib/email/send-organization-welcome.ts) | Send via Resend |
| [`src/lib/auth/actions.ts`](../../src/lib/auth/actions.ts) | Founding signup wiring |
| [`supabase/templates/magic_link.html`](../../supabase/templates/magic_link.html) | Local / Auth fallback body |

## Related in-app copy

Founding signup UI uses **organization / workspace** language (not “school”) so it matches this email.
