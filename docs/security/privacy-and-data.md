# Privacy and data

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 27, 2026  
**Related:** [Security](./README.md) · [Sentry stub](../ops/sentry.md) · [Documentation home](../README.md) · [Feature list](../product/feature-list.md) · [Meta App Review use cases](../ops/meta-app-review-use-cases.md)

## Purpose

Public-facing privacy policy and data-handling notes for a school/PTO product.

## Public routes

- Privacy Policy: `/privacy`
- Terms of Service: `/terms`
- Homepage cookie consent (essential vs optional analytics preference in `localStorage`)

Policy copy lives in `src/lib/marketing-wow/legal-content.tsx` (shipped with the marketing WOW funnel). Legal counsel may later replace in-repo copy without changing route chrome.

## Data categories (product summary)

| Category | Examples |
| --- | --- |
| Account / membership | Name, email, role, organization |
| Workspace content | Events, captions, files, approvals |
| Organization profile | Mailing address (street, city, state, postal, country) |
| Integrations (opt-in) | Meta pages, Google Calendar |
| Cookies | Essential session/security; optional analytics if accepted |

## Account erase (self-service)

Settings → Account → **Delete / erase account** permanently removes the signed-in Auth user and their `organization_users` membership rows after:

1. Typing `DELETE` (and current password when the account has an email/password identity; OAuth-only uses the confirmation phrase)
2. Passing a last-admin check — erase is blocked if the person is the sole active admin/president on any workspace (transfer access in Team & Access first)

Workspace content (events, captions, files, approvals) stays with each organization. This is account erase, not workspace deletion.

## Telemetry

Sentry and related ops privacy notes: [sentry.md](../ops/sentry.md).
