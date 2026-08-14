# Privacy and data

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** August 14, 2026  
**Related:** [Security](./README.md) · [Sentry stub](../ops/sentry.md) · [Documentation home](../README.md) · [Feature list](../product/feature-list.md) · [Meta App Review use cases](../ops/meta-app-review-use-cases.md)

## Purpose

Public-facing privacy policy and data-handling notes for a school/PTO product.

## Public routes

- Privacy Policy: `/privacy` (public; listed in middleware `PUBLIC_PATHS`)
- Meta User Data Deletion instructions: `/privacy#user-data-deletion` (same public page; no auth)
- Terms of Service: `/terms`
- Homepage cookie consent (essential vs optional analytics preference in `localStorage`)

Policy copy lives in `src/lib/marketing-wow/legal-content.tsx` (shipped with the marketing WOW funnel).

### Meta App Dashboard URLs

| Field | URL |
| --- | --- |
| Privacy Policy URL | `https://heyralli.com/privacy` |
| Terms of Service URL | `https://heyralli.com/terms` |
| User Data Deletion → Instructions URL | `https://heyralli.com/privacy#user-data-deletion` |

Do **not** enter `https://heyralli.com/api/meta/webhook` as a User Data Deletion URL (that is the Graph/inbox webhook). Phase 1 uses Meta’s **Instructions URL** option — there is no Data Deletion Callback URL yet.

## Data categories (product summary)

| Category | Examples |
| --- | --- |
| Account / membership | Name, email, role, organization |
| Organization Content | Events, captions, files, approvals, newsletters, flyers, volunteers |
| Organization profile | Mailing address (street, city, state, postal, country) |
| Integrations (opt-in) | Meta pages, Google Calendar |
| Cookies | Essential session/security; optional analytics if accepted |

## Account erase (self-service)

Settings → Account → **Delete / erase account** permanently removes the signed-in Auth user and their `organization_users` membership rows after:

1. Typing `DELETE` (and current password when the account has an email/password identity; OAuth-only uses the confirmation phrase)
2. Passing a last-admin check — erase is blocked if the person is the sole active admin/president on any workspace (transfer access in Team & Access first)

Workspace content (events, captions, files, approvals) stays with each organization. This is account erase, not workspace deletion.

## Meta disconnect vs deletion

Settings → Facebook & Instagram → **Disconnect** removes the active org Meta connection (`organization_meta_connections` for the current organization). It does **not** delete Organization Content (events, inbox history, insights, published posts, etc.).

Individual Meta/Facebook/Instagram-associated personal data deletion requests go to `hello@heyralli.com` (see privacy §16). An individual’s request must not auto-wipe shared organizational workspace records.

## Telemetry

Sentry and related ops privacy notes: [sentry.md](../ops/sentry.md).
