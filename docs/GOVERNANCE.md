# Documentation governance

**Status:** Living  
**Owner:** Engineering (Hey Ralli)  
**Last updated:** July 20, 2026  
**Related:** [Documentation home](./README.md) · [Feature list](./product/feature-list.md) · [Changelog process](./product/changelog.md)

Conventions for keeping the docs hub accurate as the product ships. Apply on every PR that changes product behavior.

---

## 1. Document header (required on living docs)

Every **Living** or **Planned stub** page under `docs/` (except short Moved-to redirect stubs) should start with:

```markdown
# Title

**Status:** Living | Planned stub | Archive  
**Owner:** <role or name>   # use TBD on stubs  
**Last updated:** YYYY-MM-DD  
**Related:** [links to sibling docs]
```

| Status | Meaning |
|--------|---------|
| **Living** | Current source of truth — keep in sync with code |
| **Planned stub** | Placeholder; purpose + TODO only until drafted |
| **Archive** | Historical only — never cite as current product truth |

Section `README.md` indexes should list each child’s Status.

---

## 2. Same-PR documentation rule

When a PR ships or changes user-visible / integration / schema behavior:

1. Update **[product/feature-list.md](./product/feature-list.md)** (shipped / partial / deferred).
2. Update **at least one related living doc** in the same PR, for example:
   - Integrations → `integrations/meta.md` or `google-calendar.md` (or stub if new)
   - Schema / RLS → `engineering/database.md`, `access-control.md`, or `storage-rls.md`
   - Cron / env → `ops/cron-jobs.md` or `ops/env-and-secrets.md`
   - Architecture-shaped change → `engineering/architecture.md` and/or `qa/architecture-overview.md`
3. If you add a new env var, update [`.env.local.example`](../.env.local.example) and mention it in [ops/env-and-secrets.md](./ops/env-and-secrets.md) when it is Production-critical.
4. If you add a Vercel cron, update [`vercel.json`](../vercel.json) **and** [ops/cron-jobs.md](./ops/cron-jobs.md).

Docs-only PRs (this hub) are exempt from (1) unless they intentionally change feature status.

---

## 3. Where new content goes

| Kind of content | Put it in |
|-----------------|-----------|
| What shipped | `product/feature-list.md` |
| How the system works | `engineering/` |
| OAuth / third-party | `integrations/` |
| How to test | `qa/` |
| Deploy / env / cron / support | `ops/` |
| Auth / tenancy / privacy | `security/` |
| Design intent / experience specs | `product/blueprints/` |
| Outdated CampaignOS / sprint history | `archive/` only |

Do **not** leave new long-form docs flat under `docs/` root (except this file, the hub `README.md`, and temporary Moved-to stubs).

---

## 4. Archive rules

- Anything under [archive/](./archive/) is **not** current. Prefer Feature list + Architecture + QA overview.
- Do **not** expand archive files into “living” guidance in place — **move** the file out of `archive/` (and update indexes) if it becomes current again.
- When retiring a living doc, `git mv` it into `archive/`, add a one-line note to [archive/README.md](./archive/README.md), and leave a Moved-to stub at the old path if bookmarks matter.

---

## 5. Redirect stubs

Short **Moved to…** stubs at old paths (e.g. `docs/FEATURE_LIST.md`, root `HEY-RALLI-TESTING-GUIDE.md`, `product-v2/README.md`) exist so bookmarks do not 404.

**Quarterly hygiene:** prune stubs that nothing links to; keep stubs for paths still referenced in issues, Slack, or external notes.

---

## 6. Quarterly review checklist

About once a quarter (or after a large release):

- [ ] Feature list matches Production on [heyralli.com](https://heyralli.com)
- [ ] Cron table matches [`vercel.json`](../vercel.json)
- [ ] Critical env vars appear in `.env.local.example` + [env-and-secrets.md](./ops/env-and-secrets.md)
- [ ] Archive README replacement map still accurate
- [ ] Prune obsolete redirect stubs
- [ ] Planned stubs: either draft, keep with fresh TODO, or delete if abandoned

---

## 7. Agents and PR authors

Cursor / Claude: follow root [AGENTS.md](../AGENTS.md). Prefer this hub and Feature list over archived sprint/PRD docs. When implementing features, apply §2 in the same change set.
