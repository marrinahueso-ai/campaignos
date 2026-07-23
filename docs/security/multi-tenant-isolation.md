# Multi-tenant isolation

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 22, 2026  
**Related:** [Access & multi-tenant onboarding](./access-and-onboarding.md) · [Access control](../engineering/access-control.md) · [Storage RLS](../engineering/storage-rls.md) · [Security](./README.md)

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
