# Privacy and data

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 26, 2026  
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
| Integrations (opt-in) | Meta pages, Google Calendar |
| Cookies | Essential session/security; optional analytics if accepted |

## Telemetry

Sentry and related ops privacy notes: [sentry.md](../ops/sentry.md).
