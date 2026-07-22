# Developer agreements — QA checklist

**Status:** Living  
**Owner:** Engineering / QA  
**Last updated:** July 22, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [developer-agreements.md](../engineering/developer-agreements.md) · [testing-guide.md](./testing-guide.md) · [QA hub](./README.md)

Manual E2E for the developer agreements gate, themed e-sign, owner countersign, executed-copy download API, Owner ops, access gates, and Events Home View Details–only regression.

Mark each row: **Pass** / **Fail** / **Skip**. Note environment (Local / Preview / Production), accounts used, and date in the session log.

---

## Scope

| Area | Surfaces |
|------|----------|
| Gate | Middleware + post-auth redirect → `/account/agreements` for unsigned `campaign_role=developer` |
| Themed e-sign | Scroll-to-enable; full name + email + optional company; drawn signature; signed receipt on panels |
| Countersign | Resend `developer-agreement-countersign` → `/account/agreements/countersign?id=…` |
| Fully executed | Status + Resend `developer-agreement-executed` with app download CTA |
| Download API | `/api/developer-agreements/download?id=&token=` (HTML render; optional `&disposition=attachment`) |
| Owner ops | `/ops` **Developers signed**; manage at `/account/agreements/manage` |
| Access gates | Allowlist email **and** Owner role (`campaign_role=admin`) |
| Regression | Events Home — View Details only; no row ⋯ for developer seat |

**Eng living doc:** [developer-agreements.md](../engineering/developer-agreements.md)

---

## Accounts

| Role | Requirements | Example / notes |
|------|--------------|-----------------|
| **Developer** | Seat with `campaign_role=developer`; must be **unsigned** (or republish a new document version so the seat is gated again) | e.g. `local.developer@heyralli.dev` if configured locally |
| **Platform Owner** | Email in `HEY_RALLI_OWNER_EMAILS` **and** active membership Owner (`campaign_role=admin`) | Needed for countersign, `/ops`, manage |
| **Negative** | Org admin (`campaign_role=admin`) **not** on the owner email allowlist | Must not open `/ops` or countersign |

Also confirm Resend templates / env are wired before email rows (see eng doc).

---

## Session log

| Field | Value |
|-------|--------|
| Date | |
| Environment | |
| Build / SHA | |
| Developer seat | |
| Platform Owner | |
| Negative admin | |
| Tester | |
| Overall | |

---

## Manual checklist (A1–A19)

| # | Check | Pass criteria | Result | Notes |
|---|--------|---------------|--------|-------|
| A1 | **Gate** | Unsigned developer cannot use the app; lands on `/account/agreements` after login / invite accept (post password gate) | | |
| A2 | **Themed UI** | Sign flow uses Hey Ralli-themed UI (branded panels), not a generic unstyled form | | |
| A3 | **Scroll lock** | **Sign and Continue** stays disabled until the agreement body is scrolled to the bottom | | |
| A4 | **Signer fields** | Full legal name + email required; company optional; drawn signature required to submit | | |
| A5 | **Receipt** | After sign, panel shows signed receipt (name, email, date, drawn signature) | | |
| A6 | **Multi-doc** | All required current versions (e.g. NDA + IP) must be signed before gate clears | | |
| A7 | **Countersign email** | Platform Owner receives Resend countersign email with working link to `/account/agreements/countersign?id=…` | | |
| A8 | **Countersign UI** | Owner opens link, sees developer receipt + agreement, can enter name/email/(optional company)/drawn signature | | |
| A9 | **Fully executed** | After owner countersign, signature status is `fully_executed` (UI and/or ops reflects completed) | | |
| A10 | **Executed email CTA** | Executed notice CTA hits `/api/developer-agreements/download?id=…&token=…` (app origin, not a bare Storage URL) | | |
| A11 | **Chrome render** | Download URL in Chrome renders HTML packet in-browser (readable agreement), **not** raw HTML source | | |
| A12 | **Safari render** | Same as A11 in Safari (`Content-Type: text/html`; not `octet-stream` / raw source) | | |
| A13 | **Attachment disposition** | Adding `&disposition=attachment` forces a file download instead of inline view | | |
| A14 | **Logged-in download** | Logged-in signer or Platform Owner can download without `token` (omit token; still authorized) | | |
| A15 | **/ops Developers signed** | Platform Owner sees **Developers signed** table (counter-sign / download affordances) | | |
| A16 | **Manage** | Platform Owner can open `/account/agreements/manage` (publish / manage versions as applicable) | | |
| A17 | **Negative access** | Admin **not** on `HEY_RALLI_OWNER_EMAILS` cannot open `/ops` or countersign / manage | | |
| A18 | **Role naming** | Product “Owner” = `campaign_role=admin`; allowlist alone is not enough without Owner seat | | |
| A19 | **Events Home regression** | Developer seat: Events Home is View Details–only; **no** row ⋯ (kebab) overflow actions | | |

---

## Suggested session order (~45–60 min)

1. Confirm env: migrations applied; `HEY_RALLI_OWNER_EMAILS` set; developer seat unsigned (or republish version).
2. **Developer path (A1–A6):** sign in as developer → gate → themed UI → scroll → fields → receipt → complete NDA + IP → confirm gate clears.
3. **Owner countersign (A7–A9):** as Platform Owner, open countersign email → complete countersign → confirm fully executed.
4. **Download (A10–A14):** from executed email CTA — Chrome + Safari render; try `disposition=attachment`; try logged-in download without token.
5. **Ops + access (A15–A18):** `/ops` Developers signed; manage; negative admin blocked; Owner = admin + allowlist.
6. **Regression (A19):** Events Home as developer — View Details only, no row ⋯.

---

## Known risks

| Risk | Why it matters |
|------|----------------|
| **Old Supabase signed email links** | Legacy Storage signed URLs often serve as `octet-stream` / `text/plain` → raw HTML source in Safari/Chrome. New path must use the **app download API**. |
| **No Playwright yet** | Full flow is manual; regressions need a human session until smokes exist. |
| **Token TTL ~30d** | HMAC download tokens expire (~30 days); re-test with a fresh executed email if CTA 401s. |
| **Safari content-type** | Safari is stricter about inline HTML; always re-check A12 after download/API changes. |
| **Owner vs allowlist** | `/ops` and countersign require **both** allowlist email and Owner (`admin`) seat — easy to misconfigure in local/Preview. |

---

## Automated

**None yet.** Do not invent Playwright coverage here; add a smoke only when product asks for it.

Optional eng follow-up (not required for this checklist): unit tests around gate helpers / download auth if they already exist under `src/lib/developer-agreements/`.

---

## Related

| Doc | Role |
|-----|------|
| [developer-agreements.md](../engineering/developer-agreements.md) | Eng living doc (flow, data model, Resend templates) |
| [feature-list.md](../product/feature-list.md) | Product bullet |
| [testing-guide.md](./testing-guide.md) | Broader QA / Playwright orientation |
