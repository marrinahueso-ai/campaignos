# Multi-tenant isolation

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 1, 2026  
**Related:** [Access & multi-tenant onboarding](./access-and-onboarding.md) · [Access control](../engineering/access-control.md) · [Storage RLS](../engineering/storage-rls.md) · [Security](./README.md) · [Audit remediation](./audit-remediation.md)

## Purpose

Guarantees for organization isolation for QA and security review.

## Summary

| Guarantee | Behavior |
|-----------|----------|
| Tenant key | `organization_id` (events via `school_years.organization_id`) |
| Membership | Only `organization_users.status = active` grants org access |
| Active org cookie | Never trusted alone; must match caller’s active membership |
| Org switch | Assert membership → set cookie → redirect `/dashboard` |
| RLS | Membership-scoped policies (migrations 064–067+); template permissions are **app-layer** |
| Storage | Path folder 1 = org or event id; see [storage-rls.md](../engineering/storage-rls.md) |

**User-facing join / switch / gates:** [access-and-onboarding.md](./access-and-onboarding.md).  
**Templates, see-vs-work, Phase A–D history:** [access-control.md](../engineering/access-control.md).

## Same-browser session isolation (shared/kiosk computers)

Distinct from cross-tenant data isolation above: does anything leak between two different people signing in/out on the **same physical browser**?

| Risk | Status |
|------|--------|
| Back button after sign-out shows cached authenticated page (bfcache) | ✅ Verified clean on Chromium, Firefox, WebKit — server re-validates and redirects to `/login`, no client-only cache restore |
| `localStorage` Campaign Builder drafts/artwork backups survive sign-out | ✅ Fixed (2026-07) — sign-out now clears `campaign-builder-v2:*` / `campaign-builder-v2-artwork:*` keys, see [`clear-on-signout.ts`](../../src/lib/campaign-builder-v2/clear-on-signout.ts); regression-tested in `22-shared-device-signout-cleanup` |
| `localStorage` Tasks Ease prefs (event colors, priorities, custom board) survive sign-out / cross-org bleed | ✅ Fixed (2026-08) — keys scoped by org (+ user); sign-out clears `heyralli:tasks-ease:*` via [`tasks-ease-storage-scope.ts`](../../src/lib/tasks-v2/tasks-ease-storage-scope.ts) |
| `localStorage` Flyer composer drafts / Preview bleed across orgs (global or event-only keys) | ✅ Fixed (2026-08) — keys scoped by org + event; restore validates match; sign-out clears `hr-flyer-composer-draft*`; see [`storage-scope.ts`](../../src/lib/flyer-composer/storage-scope.ts) |
| Service-role artwork upload / CB2 session / approvals IDOR | ✅ Fixed (2026-08) — `requireEventAccess` / `getEventById` on mutations + event-scoped `uploadArtworkBytes`; see [audit-remediation.md](./audit-remediation.md#multi-tenant--idor-hardening-august-2026) |
