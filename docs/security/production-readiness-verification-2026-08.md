# Production Readiness Verification Report

**Audit type:** Operational (deployed Production), not an engineering redesign  
**Environment under audit:** Vercel Production → `heyralli.com` / `www.heyralli.com`  
**Supabase project:** `zyllfqieeihshnwpakiv` (ACTIVE_HEALTHY, us-east-1)  
**Vercel project:** `campignos/campaignos` (`prj_3i9wZXYqe5OOjCQpH0vRzCranfEg`)  
**Certified source:** Launch Certification Report §10 (`launch-security-assessment-2026-08.md`)  
**Audit date:** August 7, 2026 (amended same day: school-media signed-URL smoke)  
**Auditor posture:** Independent release auditor — evidence only; no guesses  

### Final recommendation

🟡 **APPROVED WITH CONDITIONS**

Production is running the launch-hardening lineage on `main`, required security DB objects are live, critical fail-closed controls respond correctly at the edge, required Production secret **names** are present, and the **private school-media signed-URL lane** is operationally proven (upload → `/object/sign/` → public deny → delete). Remaining conditions are authenticated product UI smokes (login UX, AI burn, calendar SSRF via app path) and config warnings below.

---

## Evidence methods used

| Method | What was inspected |
|--------|--------------------|
| Deployment inspection | Vercel `list_deployments` / `get_deployment` for Production alias |
| Configuration inspection | `vercel env ls production` (names/types only); Sensitive values redacted by CLI as `[SENSITIVE]` |
| Database inspection | Supabase MCP `list_migrations`, `execute_sql`, `get_project` |
| Runtime observation | HTTPS probes to `https://heyralli.com` (headers, Stripe webhook, cron, Meta webhook, login) |
| Log evidence | Vercel runtime logs (cron 200 with auth; unauthorized probes) |
| Test execution | `npm run test:security` (local); Production school-media upload/sign/public-deny/delete smoke with `HEY_RALLI_TEST_*` (see §4.1) |
| Monitoring inspection | Sentry org `hey-ralli` / project `heyralli`; `NEXT_PUBLIC_SENTRY_DSN` present in Production |

**Secret values were never printed.** Format/length of Vercel **Sensitive** secrets could not be read via `vercel env pull` (placeholders only). Where possible, presence and correctness were inferred from runtime behavior or DB ciphertext shape.

---

## 1. Production configuration audit

| Item | Status | Evidence |
|------|--------|----------|
| Launch-hardening build deployed | **VERIFIED** | Production deployment `dpl_3uoeTqg5DUZWW1iVCLv4w8118pVT` is `READY`, `target=production`, aliases include `heyralli.com`. SHA `94853e2d5410309d126add563332eed4f8810aa3` (`main`). `git merge-base --is-ancestor b0438eacae7b966e4dbba03694c3ad124d9a1c86 94853e2…` → **YES** (hardening commit is an ancestor). Prior Production deploy `dpl_Ho29gCCa…` was the hardening commit itself. |
| Production matches certified branch | **VERIFIED** | Deploy meta: `githubCommitRef=main`, repo `marrinahueso-ai/campaignos`. |
| Required DB migrations / security schema | **VERIFIED WITH WARNING** | Applied: `stripe_reserve_grant_idempotency` (`20260807173316`), `ai_credit_atomic_rpcs_and_school_media` (`20260807173347`). RPCs `ai_credit_ensure_period`, `ai_credit_burn`, `ai_credit_apply_reserve_delta` present. Stripe ledger unique indexes present. `school-media` bucket `public=false`. **Warning:** local filenames use different timestamps (`…180000` / `…190000`); schema effects match. `background_assets` metadata columns exist, but `20260807120000_background_asset_metadata` is **not** recorded in `schema_migrations` (history drift). |
| Production env vars present | **VERIFIED** | `vercel env ls production` lists required keys (see §2). |
| Secrets correctly configured | **VERIFIED WITH WARNING** | Presence verified; Sensitive **format/length** not readable via CLI. Runtime/DB evidence covers CRON, Stripe webhook, OAuth encryption (see §2). Stripe `sk_live` vs `sk_test` **not** confirmed. |
| Fail-closed behavior functioning | **VERIFIED** | Stripe missing sig → `400 Missing signature.`; bogus sig → `400 Invalid signature.` (not `503` missing secret). Cron without/bogus bearer → `401 Unauthorized`. Meta webhook GET without verify → `403`. Cron jobs at ~18:00Z returned `200` (authorized Vercel Cron). |
| No dev/preview config enabled | **VERIFIED WITH WARNING** | `ALLOW_ROLE_SIMULATOR` **absent** from Production env. `ALLOW_PLAINTEXT_OAUTH_TOKENS` **absent**. Login HTML has no `localhost`. **Warning:** `META_REDIRECT_URI` is `https://campaignos-six.vercel.app/...` (not `heyralli.com`). Legacy `YOUR_CRON_SECRET` still listed (unused by app code search). |

---

## 2. Required secret verification

Classification legend: Exists = listed on Production; Format/length = only when observable without exposing value.

| Secret | Exists (Prod) | Format / length | Used by app | Fail-closed if missing | Status |
|--------|---------------|-----------------|-------------|------------------------|--------|
| `CRON_SECRET` | Yes (Sensitive) | **Unable to verify** via CLI | Yes (`cron-auth.ts`); Vercel Cron `/api/cron/*` returned 200 | Yes (Preview/Prod deny without secret) | **VERIFIED** (presence + runtime auth success / unauthorized reject) |
| `STRIPE_SECRET_KEY` | Yes | **Unable to verify** live vs test prefix | Yes (`getStripe`) | Route/SDK throws if missing | **VERIFIED WITH WARNING** (present; mode unknown) |
| `STRIPE_WEBHOOK_SECRET` | Yes | **Unable to verify** `whsec_` via CLI | Yes (webhook route) | Returns `503` if missing — **not** observed; observed `400 Invalid signature` ⇒ secret loaded | **VERIFIED** |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Unable to verify** JWT shape via CLI | Yes (admin client / rate limit / storage) | Boot check lists it; rate-limit fails closed when configured | **VERIFIED WITH WARNING** (present; format not readable) |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Yes (Preview+Prod) | **Unable to verify** 32-byte decode via CLI | Yes (`token-encryption.ts`) | Encrypt throws on Preview/Prod without valid key | **VERIFIED** (DB: Meta `page_access_token` prefix `encv1:` — encryption active with a working key) |
| `OPENAI_API_KEY` | Yes | **Unable to verify** | Yes | Feature errors if missing | **VERIFIED WITH WARNING** (present only; no live AI call) |
| `RESEND_API_KEY` | Yes | **Unable to verify** | Yes | Email send fails if missing | **VERIFIED WITH WARNING** (present only; no send observed) |
| Meta (`META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_REDIRECT_URI`) | Yes | App ID numeric shape observed; secrets redacted; redirect host = `campaignos-six.vercel.app` | Yes | Webhook verify fails closed (`403` observed) | **VERIFIED WITH WARNING** (redirect not on apex domain) |
| Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | Yes | Redacted | Yes; `GOOGLE_REDIRECT_URI` **unset** (falls back to request origin — intentional in code) | Throws if missing on OAuth start | **VERIFIED WITH WARNING** (present; OAuth round-trip not exercised) |
| HMAC / link secrets (`DEVELOPER_AGREEMENT_DOWNLOAD_SECRET`, `FOUNDING_ACCESS_LINK_SECRET`, `SENTRY_VERIFY_SECRET`) | Yes | Redacted | Yes (per env docs / boot required list) | Boot gap logging | **VERIFIED WITH WARNING** (present; length not readable) |
| Stripe Price IDs (`STRIPE_PRICE_*`) | Yes | Redacted | Billing | Checkout fails if wrong | **VERIFIED WITH WARNING** (present; `price_` prefix not readable) |
| Supabase public (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Yes | URL confirmed in login HTML → `https://zyllfqieeihshnwpakiv.supabase.co` | Client auth | App broken if wrong | **VERIFIED** (prod project ref in runtime HTML) |
| Sentry (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, org/project) | Yes | Public DSN host `ingest.us.sentry.io` observed | Client/server | Soft-fail | **VERIFIED** |
| Canva / Monday / Weather / Giphy / owner emails | Present as applicable | N/A for core gate | Integration paths | Feature-scoped | **VERIFIED WITH WARNING** (listed; not smoke-tested) |
| `ALLOW_ROLE_SIMULATOR` | **Unset** | N/A | Role simulator | Disabled unless `true` | **VERIFIED** (disabled) |
| `ALLOW_PLAINTEXT_OAUTH_TOKENS` | **Unset** | N/A | Encryption policy | Must stay unset | **VERIFIED** (disabled) |

Boot instrumentation (`reportProductionSecretGaps`): **NOT VERIFIED** — no `[security] Missing required secrets` (or success) log lines retrieved for the current deployment window (log query empty / retention limits).

---

## 3. Production environment audit

| Item | Status | Evidence |
|------|--------|----------|
| Deployment matches certified branch | **VERIFIED** | See §1 — `main` @ `94853e2` includes hardening. |
| Required migrations exist in Production | **VERIFIED WITH WARNING** | Launch security objects present; migration **version strings** differ from repo filenames; background metadata columns present without matching `schema_migrations` row for `20260807120000`. |
| Private storage buckets correct | **VERIFIED** | SQL: `school-media`, `calendar-uploads`, `developer-agreements`, `training-library`, `vendor-documents` → `public=false`. Public object URL to `school-media` → `NoSuchBucket` / non-public behavior. |
| Public buckets intentional | **VERIFIED** | `platform-backgrounds`, `event-assets`, `campaign-files`, `organization-stickers`, `school-assets` → `public=true`. Sample `platform-backgrounds` object returned **HTTP 200** (~2.6MB). Matches hybrid storage design in certification report. |
| Role simulator disabled | **VERIFIED** | Env flag unset on Production; unit tests confirm Preview/Prod closed unless explicit `true`. |
| Cron authentication enabled | **VERIFIED** | Unauthorized → 401; scheduled cron → 200 in runtime logs; `vercel.json` defines cron paths. |
| OAuth encryption active | **VERIFIED** | Live Meta connection token stored as `encv1:…`. |
| Security headers enabled | **VERIFIED** | Live: `CSP`, `HSTS` (preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| CSP matches certified build | **VERIFIED** | No `unsafe-eval`; includes `upgrade-insecure-requests`; matches production branch of `next.config.ts`. Residual `unsafe-inline` acknowledged in certification. |
| Monitoring / logging active | **VERIFIED** | Sentry org/project reachable; DSN in Production; CSP allows Sentry ingest; Vercel runtime logs observe requests. |

**school-media object count:** `0` after cleanup (SQL `storage.objects` + storage list) — see §4.1.

---

## 4. Operational smoke tests

### 4.1 School inspiration → private `school-media` (signed URL) — Production smoke

**Scope clarification (do not conflate):**

| Surface | Bucket | URL type | In this smoke? |
|---------|--------|----------|----------------|
| Owner **Background Library** inspiration/source upload (`uploadBackgroundSourceAction`) | `platform-backgrounds` (`public=true`) | Permanent **public** CDN URL | **No** — by design not private; would not satisfy school-media criteria |
| School **Create with AI / campaign builder** inspiration photo upload (`uploadSchoolMediaBytes` / `persistInspirationImages`) | `school-media` (`public=false`) | Time-limited **`/storage/v1/object/sign/`** URL | **Yes** — this is the certified private lane |

Request asked for a Background Library inspiration upload stored in `school-media`. Code inspection shows owner Background Library does **not** write to `school-media`. The auditor therefore executed the **certified private inspiration path** on Production (same storage API the deployed app uses when admin is configured), using the Production test account for auth + org/event context.

| Check | Status | Evidence (2026-08-07 ~18:36Z UTC) |
|-------|--------|-----------------------------------|
| Test account authenticates to Production Supabase | **VERIFIED** | `signInWithPassword` against `zyllfqieeihshnwpakiv` succeeded (`HEY_RALLI_TEST_EMAIL` domain `heyralli.dev`; user id prefix `63916a55`) |
| Org/event context resolved | **VERIFIED** | `HEY_RALLI_TEST_EVENT_ID` → school year → org prefix `d88b2f96`; event prefix `08ddc3de` |
| Bucket private | **VERIFIED** | `listBuckets`: `school-media.public === false` |
| Object stored in `school-media` | **VERIFIED** | Upload path `{org}/{event}/{uuid}-1-pr-audit-inspiration-temp.png`; `storage.list` found object |
| Returned URL is signed (`/storage/v1/object/sign/`) | **VERIFIED** | `createSignedUrl` pathname includes `/object/sign/`; query has `token=`; host `zyllfqieeihshnwpakiv.supabase.co` (**token not logged**) |
| Signed URL fetches object | **VERIFIED** | HTTP **200**, `content-type: image/png` |
| Public URL cannot access object | **VERIFIED** | `…/object/public/school-media/…` → HTTP **400**, body code `NoSuchBucket` |
| Cleanup delete | **VERIFIED** | `storage.remove` succeeded; list no longer finds leaf |
| Cleanup confirmed empty | **VERIFIED** | SQL `count(*)` on `storage.objects` where `bucket_id='school-media'` → **0**; storage root list empty |

**Limitation (honest):** Smoke used Production Supabase Auth + Storage (service role, matching Production server when `SUPABASE_SERVICE_ROLE_KEY` is set). It did **not** drive the heyralli.com UI / Next.js server action in-browser. Storage behavior matches `src/lib/school-media/storage.ts` on the deployed lineage.

### Authentication

| Test | Status | Evidence / gap |
|------|--------|----------------|
| Login | **VERIFIED WITH WARNING** | Production Supabase password login succeeded for test account (API). Full `/login` browser UX / cookie session on `heyralli.com` **not** exercised. |
| Logout | **NOT VERIFIED** | Requires browser session. |
| Session persistence | **NOT VERIFIED** | Requires browser session. |
| Invite acceptance | **NOT VERIFIED** | Requires invite token + mailbox. |

Protected routes (`/settings`, `/events`, `/calendar`, `/billing`) redirect **307 → `/login`** — middleware gate observed earlier; not re-run in §4.1.

### Security

| Test | Status | Evidence / gap |
|------|--------|----------------|
| Invalid Stripe webhook rejected | **VERIFIED** | Unsigned → `400 Missing signature.`; bogus sig → `400 Invalid signature.` |
| Calendar rejects localhost/private-IP subscriptions | **VERIFIED WITH WARNING** | `npm run test:security` passes `assertSafeOutboundUrl` / IP blocklist; `fetchSubscribeFeedIcs` uses `safeFetch`. **No authenticated Production call** saving `http://127.0.0.1/` was executed. |
| AI credits burn correctly | **NOT VERIFIED** | RPCs exist; no Production generation/burn transaction observed. |
| Signed URLs for private school media | **VERIFIED** | §4.1 — upload, `/object/sign/` URL, signed GET 200, public GET denied, deleted |
| Public assets remain public where intended | **VERIFIED** | `platform-backgrounds` public GET **200**. |

### Core platform (feature availability)

| Area | Status | Evidence / gap |
|------|--------|----------------|
| Calendar | **NOT VERIFIED** | Auth-gated; cron `calendar-subscribe-sync` configured. |
| Events | **NOT VERIFIED** | Auth-gated (`307` to login). |
| Background Library | **VERIFIED WITH WARNING** | Public library objects fetchable from Storage; owner UI / publish path not exercised logged-in. |
| Create with AI | **NOT VERIFIED** | Needs session + OpenAI spend. |
| Flyer Composer | **NOT VERIFIED** | Needs session. |
| Approvals | **NOT VERIFIED** | Needs session. |
| Billing | **NOT VERIFIED** | Needs session; Stripe secrets present. |
| Email generation | **NOT VERIFIED** | Needs session + Resend. |

---

## 5. Conditions to clear before unrestricted marketing launch

1. **Authenticated browser smoke:** login/logout/session cookie on `heyralli.com` (API login already proven for test account).  
2. **AI credit burn:** one Create-with-AI (or equivalent) run; confirm ledger burn via RPC path.  
3. ~~**School-media signed URL**~~ — **cleared** (§4.1). Optional follow-up: one in-browser Create with AI inspiration attach to confirm the Next.js action returns the same URL shape.  
4. **Calendar SSRF on Production path:** attempt save/sync of `http://127.0.0.1/` / private IP and confirm rejection in UI/API.  
5. **Stripe mode check (operator):** confirm Production `STRIPE_SECRET_KEY` / publishable key are **live** (not test) without pasting values into chat.  
6. **Meta redirect:** decide whether `META_REDIRECT_URI` should move to `https://heyralli.com/...` and update Meta app settings accordingly (non-blocking for core PTA if Meta remains Pending Final Review).  
7. **Migration history hygiene:** record or reconcile `background_asset_metadata` in `schema_migrations` so future deploys do not re-apply / drift.  
8. **Do not expect owner Background Library inspiration to be private** — it uses public `platform-backgrounds` by design; private lane is school inspiration uploads only.

Ops acknowledgements still required from certification §10: residual historical public media, CSP `unsafe-inline`, npm high backlog, Meta/Google **Pending Final Review** (not marketed as final).

---

## 6. Items explicitly not failed

No Production control in the P0 security set returned a contradictory fail (e.g. webhook accepting unsigned payloads, cron open without secret, role simulator enabled, public `school-media`, missing hardening SHA, missing credit RPCs). Gaps are **verification coverage** and **configuration warnings**, not observed control breakage.

---

## 7. Sign-off

| Layer | Verdict |
|-------|---------|
| Core platform operational gate | 🟡 **APPROVED WITH CONDITIONS** (deploy + secrets + fail-closed + DB + school-media signed URLs OK; browser auth / AI burn / calendar SSRF still outstanding) |
| Meta / Google feature-complete | Out of scope — remains **Operationally Ready but Pending Final Review** |
| Enterprise / district RFP | **Not approved** (unchanged from certification) |

**Auditor:** Evidence collected August 7, 2026 against live Production. Re-run authenticated smokes after conditions 1–4; then this report can be amended to ✅ **APPROVED FOR PRODUCTION**.
