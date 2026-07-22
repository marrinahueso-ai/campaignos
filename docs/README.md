# Hey Ralli — Documentation

**Status:** Living index  
**Owner:** Engineering  
**Last updated:** July 21, 2026  
**Production:** [heyralli.com](https://heyralli.com)

This is the documentation hub. Start here.

---

## Start here by role

| You are… | Open first |
|----------|------------|
| **New engineer** | [Architecture](./engineering/architecture.md) → [Feature list](./product/feature-list.md) → [Local setup](./getting-started/local-setup.md) |
| **QA** | [QA architecture overview](./qa/architecture-overview.md) → [Testing guide](./qa/testing-guide.md) → [Feature list](./product/feature-list.md) |
| **Integrations** | [Meta](./integrations/meta.md) · [Google Calendar](./integrations/google-calendar.md) · [SignUpGenius](./integrations/signupgenius.md) |
| **Ops / deploy** | [Ops](./ops/README.md) → deploy · env · cron |
| **Product / design** | [Feature list](./product/feature-list.md) · [Product blueprints](./product/blueprints/) |
| **Historical only** | [Archive](./archive/README.md) — do not treat as current |
| **Maintaining docs** | [Governance](./GOVERNANCE.md) |

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

## Canonical docs

| Topic | Path |
|-------|------|
| Architecture | [engineering/architecture.md](./engineering/architecture.md) |
| Ask Ralli Assistant | [engineering/ask-ralli-assistant.md](./engineering/ask-ralli-assistant.md) |
| Feature status | [product/feature-list.md](./product/feature-list.md) |
| QA overview | [qa/architecture-overview.md](./qa/architecture-overview.md) |
| Meta Connect | [integrations/meta.md](./integrations/meta.md) |
| Google Calendar | [integrations/google-calendar.md](./integrations/google-calendar.md) |
| Access control | [engineering/access-control.md](./engineering/access-control.md) |
| Storage RLS | [engineering/storage-rls.md](./engineering/storage-rls.md) |
| Welcome email | [engineering/auth-welcome-email.md](./engineering/auth-welcome-email.md) |
| Artwork → approvals findings | [qa/artwork-approval-findings.md](./qa/artwork-approval-findings.md) |
| Create with AI artwork inputs | [qa/create-with-ai-artwork-inputs.md](./qa/create-with-ai-artwork-inputs.md) |
| Calendar import dedupe (school events) | [qa/calendar-import-dedupe.md](./qa/calendar-import-dedupe.md) |
| Meta Calendar DnD / native schedule | [qa/meta-calendar-dnd.md](./qa/meta-calendar-dnd.md) |
| Testing (Sentry / Playwright) | [qa/testing-guide.md](./qa/testing-guide.md) |
| Report a Problem | [qa/report-a-problem.md](./qa/report-a-problem.md) |
| Product blueprints | [product/blueprints/](./product/blueprints/) |

Old flat paths (e.g. `docs/ARCHITECTURE.md`) keep short **Moved to…** stubs for bookmarks.

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Living** | Current source of truth |
| **Planned stub** | Placeholder — content not written yet |
| **Archive** | Historical — not current product truth |

Living and stub pages should include **Status**, **Owner** (or TBD), and **Last updated**. Full rules: [GOVERNANCE.md](./GOVERNANCE.md).

---

## Same-PR rule (summary)

Ship a product/integration/schema change → update [feature-list.md](./product/feature-list.md) **and** the related living doc in the **same PR**. Details: [GOVERNANCE.md §2](./GOVERNANCE.md#2-same-pr-documentation-rule).

---

## Reorganization status

| Phase | Status |
|-------|--------|
| 0 — Commit current docs | Done |
| 1 — Scaffold tree + indexes + stubs | Done |
| 2 — Move living docs + archive outdated | Done |
| 3 — Link pass | Done |
| 4 — Critical ops/eng drafts | Done |
| 5 — Governance conventions | **Done** |

Hub restructure complete. Ongoing work follows [GOVERNANCE.md](./GOVERNANCE.md).

---

## Agent note

Cursor/Claude: see root [AGENTS.md](../AGENTS.md). Prefer this index and [product/feature-list.md](./product/feature-list.md) over archived sprint/PRD docs. Apply [GOVERNANCE.md](./GOVERNANCE.md) when changing product behavior.
