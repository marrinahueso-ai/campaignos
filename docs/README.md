# Hey Ralli — Documentation

**Status:** Living index  
**Last updated:** July 20, 2026  
**Production:** [heyralli.com](https://heyralli.com)

This is the documentation hub. Start here. Folder topics below are the long-term layout; **Phase 2** will move existing files into those folders. Until then, **current paths** (flat under `docs/` or repo root) remain the source of truth.

---

## Start here by role

| You are… | Open first |
|----------|------------|
| **New engineer** | [Architecture](./ARCHITECTURE.md) → [Feature list](./FEATURE_LIST.md) → [Local setup stub](./getting-started/local-setup.md) |
| **QA** | [QA architecture overview](./QA_ARCHITECTURE_OVERVIEW.md) → [Testing guide](../HEY-RALLI-TESTING-GUIDE.md) → [Feature list](./FEATURE_LIST.md) |
| **Integrations** | [Meta](./META_CONNECTION.md) · [Google Calendar](./GOOGLE_CONNECTION.md) |
| **Ops / deploy** | [Ops section](./ops/README.md) (stubs — full runbooks in Phase 4) |
| **Product / design** | [Feature list](./FEATURE_LIST.md) · [Product blueprints](../product-v2/) (move to `product/blueprints/` in Phase 2) |
| **Historical only** | [Archive](./archive/README.md) — do not treat as current |

---

## Folder map

| Folder | Purpose | Section index |
|--------|---------|---------------|
| [getting-started/](./getting-started/) | Local setup, environments | [README](./getting-started/README.md) |
| [product/](./product/) | Feature status, vision, blueprints | [README](./product/README.md) |
| [engineering/](./engineering/) | Architecture, DB, access, storage | [README](./engineering/README.md) |
| [integrations/](./integrations/) | Meta, Google, Canva, Monday | [README](./integrations/README.md) |
| [qa/](./qa/) | QA overview, testing, findings | [README](./qa/README.md) |
| [ops/](./ops/) | Deploy, env, cron, support | [README](./ops/README.md) |
| [security/](./security/) | Auth, tenancy, privacy | [README](./security/README.md) |
| [archive/](./archive/) | Outdated CampaignOS / sprint history | [README](./archive/README.md) |

---

## Canonical docs (current paths)

Use these until Phase 2 relocates them:

| Topic | Current file | Future path (Phase 2) |
|-------|--------------|------------------------|
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) | `engineering/architecture.md` |
| Feature status | [FEATURE_LIST.md](./FEATURE_LIST.md) | `product/feature-list.md` |
| QA overview | [QA_ARCHITECTURE_OVERVIEW.md](./QA_ARCHITECTURE_OVERVIEW.md) | `qa/architecture-overview.md` |
| Meta Connect | [META_CONNECTION.md](./META_CONNECTION.md) | `integrations/meta.md` |
| Google Calendar | [GOOGLE_CONNECTION.md](./GOOGLE_CONNECTION.md) | `integrations/google-calendar.md` |
| Access control | [ACCESS_CONTROL_PHASES_A_C.md](./ACCESS_CONTROL_PHASES_A_C.md) | `engineering/access-control.md` |
| Storage RLS | [STORAGE_RLS.md](./STORAGE_RLS.md) | `engineering/storage-rls.md` |
| Welcome email | [AUTH_ORGANIZATION_WELCOME_EMAIL.md](./AUTH_ORGANIZATION_WELCOME_EMAIL.md) | `engineering/auth-welcome-email.md` |
| Artwork → approvals findings | [ARTWORK_GENERATION_APPROVAL_FINDINGS.md](./ARTWORK_GENERATION_APPROVAL_FINDINGS.md) | `qa/artwork-approval-findings.md` |
| Testing (Sentry / Playwright) | [../HEY-RALLI-TESTING-GUIDE.md](../HEY-RALLI-TESTING-GUIDE.md) | `qa/testing-guide.md` |
| Report a Problem | [../REPORT-A-PROBLEM-GUIDE.md](../REPORT-A-PROBLEM-GUIDE.md) | `qa/report-a-problem.md` |
| Product blueprints | [../product-v2/](../product-v2/) | `product/blueprints/` |

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Living** | Current source of truth |
| **Planned stub** | Placeholder — content not written yet |
| **Archive** | Historical — not current product truth |

---

## Reorganization status

| Phase | Status |
|-------|--------|
| 0 — Commit current docs | Done |
| 1 — Scaffold tree + indexes + stubs | **Done** |
| 2 — Move living docs + archive outdated | Pending |
| 3 — Link pass | Pending |
| 4 — Critical ops/eng drafts | Pending |
| 5 — Governance conventions | Pending |

---

## Agent note

Cursor/Claude: see root [AGENTS.md](../AGENTS.md). Prefer this index and [FEATURE_LIST.md](./FEATURE_LIST.md) over archived sprint/PRD docs.
