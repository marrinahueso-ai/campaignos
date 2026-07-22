# Pre-handoff readiness (Owner / PM)

**Status:** Living  
**Owner:** Product  
**Last updated:** July 22, 2026  
**Related:** [QA hub](./README.md) · [launch-checklist.md](./launch-checklist.md) · [developer-agreements.md](./developer-agreements.md) · [deploy-and-rollback.md](../ops/deploy-and-rollback.md) · [env-and-secrets.md](../ops/env-and-secrets.md)

## Slice A vs full-site handoff

| Slice | What it covers | This doc | When done |
|-------|----------------|----------|-----------|
| **A — Agreements / recent** | Developer agreements gate → e-sign → countersign → download → `/ops` Developers signed; Events Home **View Details** regression | **This file** | Handoff packet below → QA runs [developer-agreements.md](./developer-agreements.md) A1–A19 |
| **B — Full site** | Soft-launch / Production pass-fail for the whole product | [launch-checklist.md](./launch-checklist.md) | **After** slice A is Ready — see [Full site handoff (Phase B)](#full-site-handoff-phase-b) |

**Slice A overall: Ready to hand** (agreements / recent). Reminder: put credentials in 1Password (§2.4) before sending the packet to QA if not done yet. Phase B (full site) is in progress on [launch-checklist.md](./launch-checklist.md).

## Purpose

**Your** short list before inviting a QA engineer. Goal: confirm the environment, accounts, and critical paths are ready so QA can run a real review (including the deep A1–A19 script) without bouncing on setup.

This is **not** the engineer regression suite. After you pass this (slice A), hand off [developer-agreements.md](./developer-agreements.md); then complete Phase B via [launch-checklist.md](./launch-checklist.md) for full-site handoff.

Mark each row: **Ready** / **Blocked** / **N/A** (or for §4: **Pass** / **Needs you**). Fill the session log, then send the **Handoff packet** below (or copy from chat).

---

## Session log

| Field | Value |
|-------|--------|
| Date | July 22, 2026 |
| Environment | Production |
| URL | https://heyralli.com |
| Build / SHA | `b4a1b9a` (`events home page updates`) — Vercel Production ● Ready |
| Org(s) for QA | Edmondson Elementary (primary); Marrina also admin on School B |
| Prepared by | §1–§3 Ready. §4 **Pass** (Marrina confirmed). §2.4 credential packet still needed in 1Password before sending to QA |
| Ready for QA? | **Slice A: Ready to hand** — send packet after §2.4 credentials are in 1Password (if not already). Full-site = Phase B on launch checklist |

### Session notes (July 22, 2026)

- **§1:** Owner confirmed private/incognito opens **https://heyralli.com** (Production) — no Preview/localhost confusion. All of 1.1–1.6 → Ready / Pass.
- **§2 (Supabase `zyllfqieeihshnwpakiv`, no secrets):**
  - Auth users exist: `marrina@huesoinvestments.com`, `local.developer@heyralli.dev` (also allowlist-only `marrina.hueso@gmail.com` with **0** org memberships).
  - Owner seat: `marrina@huesoinvestments.com` → active `campaign_role=admin` on Edmondson Elementary (+ School B). Matches `HEY_RALLI_OWNER_EMAILS`. **Ready** (DB + Owner login smoke Pass).
  - Signed developer: `local.developer@heyralli.dev` → active `developer` on Edmondson; NDA + IP both `fully_executed` on current versions (executed HTML present). **Ready** (DB + Events / download smoke Pass).
  - Unsigned developer: **`qa.unsigned.developer@heyralli.dev`** — active `developer` on Edmondson; **0** signatures on current NDA + IP → gate applies (`mustSign`). **Marrina confirmed “yes. valid.”** — login works / gate works → **2.2 Ready**. Credentials via secure channel (not in repo).
  - Optional negative `/ops` admins exist (active `admin`, not on allowlist) — e.g. `nigel@…`, `osbornroad@…`, `playwright.admin+heyralli@…`.
  - **§2.4 still needed:** put Owner + signed developer + unsigned developer passwords (or magic-link how-to) in **1Password** before sending the handoff packet to QA — do not invent that this is done if it is still pending.
- **§3:** Standard three caveats verified in code; **extras: none** (Owner proceeding without additional org/Preview caveats). → **§3 Ready**.
- **§4:** **Marrina confirmed §4 Pass on Production heyralli.com** (Owner login, Today, `/ops` Developers signed, Events **View Details** / no row ⋯, Safari download). All of 4.1–4.6 → **Pass / Ready**. Fully executed pair already on env (`local.developer@heyralli.dev`); fresh unsigned→countersign email path optional for QA A1–A6.

---

## 1. Env & deploy

| # | Check | Ready? | Notes |
|---|--------|--------|-------|
| 1.1 | Target URL is live (Preview preferred for first pass; Production only if that is the review target) | Ready | https://heyralli.com → HTTP 200; aliases production deploy |
| 1.2 | Intended deploy / SHA is **Ready** on Vercel | Ready | `dpl_CSwqL7mkNU3XyCTG4fLKLT7TNprx` / `b4a1b9a` on `main` ● Ready |
| 1.3 | Migrations applied for target DB (`073`–`075` developer agreements if that area is in scope) | Ready | Repo files present; remote applied: `developer_agreements`, `developer_agreement_execution`, `developer_agreement_signer_fields` (project `zyllfqieeihshnwpakiv`) |
| 1.4 | `HEY_RALLI_OWNER_EMAILS` set on the target env (comma-separated Owner emails) | Ready | Present on Vercel Production; local allowlist: `marrina@huesoinvestments.com`, `marrina.hueso@gmail.com` |
| 1.5 | Resend wired: `RESEND_API_KEY` + From; countersign + executed templates present (defaults or `RESEND_DEVELOPER_AGREEMENT_*_TEMPLATE_ID`) | Ready | Prod has `RESEND_API_KEY` + `RESEND_FROM_EMAIL`; template override IDs unset (code defaults OK) |
| 1.6 | You can open the URL in a fresh browser / private window without “wrong env” confusion | Ready | Owner confirmed: private window → https://heyralli.com (Production), not Preview / localhost |

---

## 2. Test accounts

| # | Check | Ready? | Notes |
|---|--------|--------|-------|
| 2.1 | **Platform Owner** seat: email on `HEY_RALLI_OWNER_EMAILS` **and** org Owner (`campaign_role=admin`) | Ready | `marrina@huesoinvestments.com` — DB + Owner login smoke Pass (§4.1) |
| 2.2 | **Developer — unsigned** (or gated again via new published version) for gate + sign flow | Ready | `qa.unsigned.developer@heyralli.dev` — DB gate state OK. **Marrina confirmed** login works / gate works (`yes. valid.`) |
| 2.3 | **Developer — signed / fully executed** (or plan to create one during smoke) for download + ops queue | Ready | `local.developer@heyralli.dev` — fully executed + Events View Details / Safari download Pass |
| 2.4 | Credentials written down for QA (email + how to get password / magic link) — not committed to git | Blocked | **Still needed in 1Password** before sending packet to QA (Owner + signed + unsigned). Do not commit passwords |
| 2.5 | Optional: org admin **not** on owner allowlist (negative `/ops` check) | Ready (DB) / optional | Active non-allowlist admins exist. Nice-to-have; QA can Skip if no credentials |

---

## 3. Known issues to tell QA up front

**Section goal:** Confirm the caveats below are accurate and complete enough to paste into the handoff packet. This is not runtime smoke (§4).

| # | Check | Status | Notes |
|---|--------|--------|-------|
| 3.1 | **Old email download links** — tell QA to use app CTA, not legacy Storage URLs | Pass (code) | Executed email builds `/api/developer-agreements/download?id=…&token=…`; download route serves `text/html; charset=utf-8` + `inline` (avoids raw-source / `octet-stream` from Storage) |
| 3.2 | **Token TTL ~30 days** — stale CTAs can 401; use a fresh executed notice | Pass (code) | `DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30`; verify rejects expired/bad token → unauthenticated request gets 401 |
| 3.3 | **Safari is stricter** — re-check inline HTML in Safari, not only Chrome | Pass | Marrina confirmed Safari download readable HTML on Production (§4.5) |
| 3.4 | Extra Preview-only or org-specific caveats filled (or explicitly none) | Ready | **Extras: none.** Standard three caveats apply for QA. |

**What to say to QA** (handoff copy — keep unless Owner edits):

| Issue | What to say |
|-------|-------------|
| **Old email download links** | Pre-fix Supabase Storage signed URLs may show raw HTML. Valid path is app CTA: `/api/developer-agreements/download?id=…&token=…`. Re-send / re-execute if testing download. |
| **Token TTL ~30 days** | Stale executed-email CTAs can 401; use a fresh notice. |
| **Safari is stricter** | Inline HTML render must be checked in Safari, not only Chrome. |

Add any Preview-only or org-specific caveats here before handoff:

| Extra known issue | Notes |
|-------------------|-------|
| *(none)* | Owner proceeding with standard three caveats only |

**§3 Ready when:** Owner acks the three bullets above (or edits them) **and** fills extras or writes “none”. → **Ready** (July 22, 2026).

---

## 4. Smoke (you — once each, happy path)

Keep this under ~20 minutes. One pass proves the stage; QA owns depth.

**§4 overall: Pass / Ready** — Marrina confirmed on Production https://heyralli.com (July 22, 2026).

| # | Path | Ready? | Notes |
|---|------|--------|-------|
| 4.1 | Login (Owner) → lands in app | **Pass** | Marrina: Owner login on Production |
| 4.2 | Dashboard / Today loads without error | **Pass** | Marrina: Today loads |
| 4.3 | Events Home → **View Details** opens an event (developer seat: no row ⋯) | **Pass** | Marrina: View Details; no row ⋯ |
| 4.4 | Agreements happy path once: unsigned developer → sign NDA + IP → Owner gets countersign email → countersign → fully executed | **Pass** | Shortcut: fully executed pair already on env (`local.developer@heyralli.dev`); `/ops` Developers signed visible. Fresh unsigned→email path optional for QA |
| 4.5 | Download once in **Safari** from executed CTA (or logged-in download) — readable HTML, not raw source | **Pass** | Marrina: Safari download OK |
| 4.6 | Owner can open `/ops` and see **Developers signed** | **Pass** | Marrina: `/ops` Developers signed |

If any of 4.1–4.6 fails, **fix or re-stage before inviting QA**.

### §4 — Smoke complete

No further Owner clicks required for slice A smoke. Before inviting QA: finish **§2.4** (credentials in 1Password) if still pending, then paste the Handoff packet.

---

## 5. Docs / packet for QA

Before you invite them, have these ready (links + one short note is enough):

| Item | Link / value |
|------|----------------|
| App URL | https://heyralli.com |
| Environment (Preview / Prod) + SHA | Production · `b4a1b9a` |
| Accounts (Owner + developer states) | Share securely — not in the repo (see Handoff packet emails). **§2.4: still put in 1Password before send if not done** |
| Scope for this review | **Slice A:** developer agreements + Events Home View Details regression |
| Engineer deep script (if agreements in scope) | [developer-agreements.md](./developer-agreements.md) A1–A19 |
| Broader launch checklist (if full soft launch) | [launch-checklist.md](./launch-checklist.md) — **Phase B in progress** |
| Known issues | §3 above (standard three; extras: none) |
| Out of scope / do not block | §6 below |

---

## 6. Do **not** block handoff on

| Item | Why |
|------|-----|
| Owner vs Admin rename / copy polish | Product naming follow-up; access is allowlist + `admin` seat today |
| Playwright coverage for agreements | None yet — manual QA is expected ([developer-agreements.md](./developer-agreements.md)) |
| Full launch-checklist A–Z | Soft-launch suite is Phase B after slice A readiness — not a gate to invite them for agreements |
| Stripe / paid plan gates | Deferred (Phase E) |
| Exhaustive Safari + Chrome matrix on every disposition flag | Your smoke = Safari once; QA can expand A10–A14 |

---

## Handoff packet (copy to QA)

**Slice A — agreements / recent.** Fill credentials channel only; no passwords in this doc. Paste and send when §2.4 is done (smoke already Pass):

```
Hey Ralli — QA handoff (Slice A: developer agreements)

Scope
- Developer agreements: gate / e-sign / countersign / executed download + Owner /ops
- Events Home regression: View Details only (no row ⋯ for developer seat)
- Deep script: docs/qa/developer-agreements.md (A1–A19)
- Full soft-launch checklist follows in a separate handoff (docs/qa/launch-checklist.md)

Environment
- URL: https://heyralli.com
- Env: Production
- Build / SHA: b4a1b9a
- Org: Edmondson Elementary (primary)

Accounts (credentials via [1Password / DM — not this thread])
- Platform Owner: marrina@huesoinvestments.com — on HEY_RALLI_OWNER_EMAILS + Owner seat
- Developer (unsigned / gated): qa.unsigned.developer@heyralli.dev
- Developer (signed / fully executed): local.developer@heyralli.dev
- Optional negative admin (not on owner allowlist): ask Owner if credentials available; else Skip A17

Known issues (standard three — no extras)
- Old Supabase Storage signed URLs in older emails may show raw HTML — use app download API CTAs only; re-execute if needed
- Download tokens ~30 days; use a fresh executed email if CTA fails
- Confirm Safari render for executed HTML (stricter than Chrome)

Out of scope / do not block
- Owner vs Admin rename
- Missing Playwright for agreements (manual only)
- Stripe / unpaid plan gates
- Full launch-checklist rows (separate Phase B handoff)
- Unrelated soft-launch rows unless listed in Scope

Owner smoke before handoff: Pass — July 22, 2026 (Production heyralli.com)
Questions → Marrina
```

---

## Full site handoff (Phase B)

**Slice A Ready.** Full-site pass-fail lives on [launch-checklist.md](./launch-checklist.md). Session log there was **reset** for a new Production handoff prep (prior local onboarding Pass does **not** carry over).

### Phase B — current batch (first ~15–20 min)

| Order | Launch-checklist section | Auto / agent | Needs Marrina |
|-------|--------------------------|--------------|---------------|
| 1 | **§12 Deploy smoke** | 12.1 Pass (Vercel Ready `b4a1b9a`); 12.8 Pass (migrations on remote incl. developer agreements + onboarding); auth surfaces redirect to login when logged out | 12.2–12.6 logged-in clicks (login already proven in slice A §4 — reconfirm + Calendar / Meta / Tasks / Insights) |
| 2 | **§1 Auth & setup** | Logged-out URL sanity only | Production spot-check: sign out/in, org switcher (Edmondson ↔ School B), light onboarding if time — **do not treat old local Playwright Pass as Production Pass** |

### Remaining launch sections (after this batch)

| Order | Section |
|-------|---------|
| 3 | **§9 Tasks & Today** → **§2 Org settings** → **§3 Team Access** |
| 4 | **§4 Calendar & events** → **§5 Create with AI** → **§6 Approvals** |
| 5 | **§7 Meta** → **§8 Volunteers** → **§10 Ask Ralli** → **§11 Billing** |
| 6 | Sign-off table + full-site handoff note to QA |

**Rule of thumb:** Agent marks what code/URLs/env prove; Marrina marks anything that needs a real login, OAuth, email, or Safari. Do **not** invent Pass for rows she has not clicked on Production.

---

## Related

| Doc | Role |
|-----|------|
| [developer-agreements.md](./developer-agreements.md) | Engineer A1–A19 script (slice A depth) |
| [launch-checklist.md](./launch-checklist.md) | Soft launch / Production pass-fail (Phase B / full site) |
| [testing-guide.md](./testing-guide.md) | Playwright / how we test |
| [engineering/developer-agreements.md](../engineering/developer-agreements.md) | Flow, migrations, Resend templates |
