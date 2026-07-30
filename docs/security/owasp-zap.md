# OWASP ZAP — soft-launch pass

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 30, 2026  
**Related:** [Security](./README.md) · [Audit remediation](./audit-remediation.md) · [Product completion master](../qa/product-completion-master.md) · [Feature list](../product/feature-list.md)

Records the July 30, 2026 OWASP ZAP manual explore of production [heyralli.com](https://heyralli.com) for soft-launch sign-off. Complements the July 2026 code audit in [audit-remediation.md](./audit-remediation.md) with runtime DAST-style signal from a proxied browser session.

---

## How we ran it

| Setting | Value |
|---------|--------|
| Tool | OWASP ZAP **2.17** |
| Mode | **Safe / Protected** (no aggressive active scan on production) |
| Method | **Manual explore** — Chrome proxied through ZAP; founder walked primary authenticated + marketing paths |
| Target | `https://heyralli.com` (production) |
| Date | July 30, 2026 |

This was **not** a full active scan against prod. Alerts reflect passive observation + manual navigation, not exhaustive fuzzing of every route and API.

---

## Soft-launch verdict

**No blocking High severity findings on heyralli.com first-party surfaces.** Residual alerts were third-party embeds, Next.js static/chunk informational noise, or accepted tradeoffs documented below. Soft launch is **cleared** from a ZAP perspective; optional hardening remains non-blocking.

---

## Triage summary

| Alert / theme | Severity (ZAP) | Scope | Triage |
|---------------|----------------|-------|--------|
| Absence of Anti-CSRF Tokens | Medium | App routes | **False positive** — Next.js Server Actions use same-origin POST + framework CSRF protection; cookie-authenticated API routes that matter use [`verify-same-origin.ts`](../../src/lib/security/verify-same-origin.ts). See [audit-remediation #13](./audit-remediation.md#medium). |
| CSP / script-src `'unsafe-inline'` / `'unsafe-eval'` | Informational–Medium | `/_next/static`, app pages | **Expected noise** — Next.js inline bootstrap; headers already ship from [`next.config.ts`](../../next.config.ts). Stricter **nonce-based CSP** is a follow-up, not a soft-launch blocker ([audit-remediation #14](./audit-remediation.md#medium)). |
| Cookie without HttpOnly flag | Low–Medium | Supabase auth cookies | **Accepted tradeoff** — browser Supabase client reads session cookies in JS; `secure` + `sameSite: lax` + 30-day `maxAge` are set ([audit-remediation #7](./audit-remediation.md#high)). |
| Missing / weak headers on third parties | Varied | Google, YouTube, Facebook, Sentry | **Out of scope** — not heyralli.com first-party; no app change required. |
| Off-site Redirect | High | `accounts.youtube.com` | **Ignore** — YouTube OAuth / embed redirect chain, not an app open-redirect bug. |
| Informational on static assets | Informational | `/_next/static/*` | **Noise** — hashed build artifacts; not actionable for launch. |
| Security headers present | — | heyralli.com | **Already wired** — CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy ([audit-remediation #14](./audit-remediation.md#medium)). |

---

## First-party controls confirmed

These were already remediated in the July 2026 audit; ZAP did not surface regressions on core app paths:

- HTTPS / HSTS on production
- CSP + framing denial + MIME sniff protection
- CSRF posture for Server Actions and same-origin API POSTs
- Rate limiting on auth, AI, and Meta publish hot paths
- RLS + org-scoped authorization (not exercised by ZAP passive mode)

---

## Re-check later (non-blocking)

| Item | When | Notes |
|------|------|-------|
| **Nonce-based CSP** | Post soft-launch | Remove `'unsafe-inline'` / `'unsafe-eval'` from `script-src` after Next.js nonce plumbing |
| **`poweredByHeader: false`** | Convenience | Disable `X-Powered-By: Next.js` in [`next.config.ts`](../../next.config.ts) |
| **Full active ZAP scan** | Staging / Preview | Run against a non-prod deployment with authenticated crawl rules; avoid aggressive active scan on prod |
| **Cookie HttpOnly** | If auth model changes | Only revisit if moving off client-readable Supabase session pattern |
| **Monthly security review** | Post-launch ops | Track in [product completion master](../qa/product-completion-master.md) Post-Launch — Monthly |

---

## See also

- [audit-remediation.md](./audit-remediation.md) — code audit findings (all 25 fixed)
- [multi-tenant-isolation.md](./multi-tenant-isolation.md) — org isolation guarantees
- [env-and-secrets.md](../ops/env-and-secrets.md) — secrets and token encryption
