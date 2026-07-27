# Product Completion Master Checklist

**Status:** Living  
**Owner:** Product / Founder  
**Last updated:** July 27, 2026  
**Production:** [heyralli.com](https://heyralli.com)

## Purpose

Single Phase 1 working checklist for product completion. Use this to track **what exists** and **what you’ve verified**.

| Doc | Role |
|-----|------|
| **This file** | Master inventory + completion tracking |
| [feature-list.md](../product/feature-list.md) | Living shipped / partial / deferred truth |
| [launch-checklist.md](./launch-checklist.md) | Soft-launch **Pass / Fail** execution |
| [owner-ai-apis.md](./owner-ai-apis.md) | Owner AI & APIs deep QA |
| [developer-agreements.md](./developer-agreements.md) | NDA/IP gate manual QA |
| [billing-and-access.md](../ops/billing-and-access.md) | Plans, gates, known gaps |
| [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) | Meta App Review packet |
| [audit-remediation.md](../security/audit-remediation.md) | Security findings status |

## Status legend

| Status | Meaning |
|--------|---------|
| **Wired** | Real UI + server path exists |
| **Partial** | Exists but gap (stub, honesty-only, ops-dependent, or incomplete) |
| **Missing** | Not built / no route |
| **Verified** | Wired + confirmed on Production (or N/A by design) |
| **N/A** | Intentionally out of scope or covered elsewhere |

Mark the checkbox when the row is **Verified** (or explicitly accepted as N/A). Update the Status column as you go.

---

## Phase 1 — Product Completion

### Authentication & Accounts

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [x] | Sign Up | Wired | Plan-first `/signup` → founding code + magic link → `/onboarding` |
| [x] | Sign In | Wired | `/login` password + post-auth redirect |
| [x] | Google Login | Wired | Login only; not founding signup (by design) |
| [x] | Password Reset | Wired | `/forgot-password` → `/account/update-password` |
| [x] | Email Verification | Wired | Implicit via magic link / invite (no separate confirm UI) |
| [x] | Organization Creation | Wired | Bootstrap on first-time setup |
| [x] | Invite Team Members | Wired | Settings Team Access + onboarding Connect |
| [x] | Accept Invitation Flow | Wired | `/invite/[token]` new + existing account paths |
| [x] | Organization Switching | Wired | Header switcher when >1 membership; Owner multi-org still Needs you in launch-checklist |
| [x] | Deactivated User Experience | Wired | Gate → `/login?error=account_deactivated` |
| [x] | Session Timeout | Wired | **Option A:** 30-day sliding; no short idle logout; honesty copy on Account |
| [x] | Account Deletion | Wired | Settings → Account erase (`DELETE` + last-admin guard) |
| [x] | Change Password | Wired | Settings → Account; OAuth-only users see honest note |

### First-time setup (Ease 4-beat)

Replaces the old multi-step Org Setup Wizard / separate Welcome screen.

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Create first event (required) | Wired | `/events/create?onboarding=1` — “1 of 3” |
| [ ] | Calendar + Brand (optional) | Wired | `/onboarding/essentials` — “2 of 3”; skips |
| [ ] | Team + Meta (optional) | Wired | `/onboarding/connect` — “3 of 3”; skips |
| [ ] | Completion — You’re set on event | Wired | `/events/{id}?welcome=1` toast |
| [ ] | Org name bootstrap (no membership only) | Wired | Minimal glue on `/onboarding` — not a full Welcome step |
| [ ] | Brand colors / logo (inside Essentials) | Wired | Also Settings → Branding |
| [ ] | Calendar import path | Wired | Essentials + `/calendar/import` |
| [ ] | Canva connection | Wired | Settings → Integrations / Creative Setup (not a boarding step); config-dependent |
| [ ] | School year (Settings Branding) | Wired | Nested under Branding hub |
| [ ] | Restart / Get started re-entry | Partial | Restart → create event; confirm Get started cards vs Ease path |

Mockup: [onboarding-setup-ease-mockup.html](https://heyralli.com/onboarding-setup-ease-mockup.html)

### Dashboard — Home

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Personalized Welcome | | |
| [ ] | Next Event | | |
| [ ] | Upcoming Deadlines | | |
| [ ] | Recent Activity | | |
| [ ] | Notifications | | |
| [ ] | Quick Actions | | |
| [ ] | Ask Ralli entry | | |
| [ ] | Calendar Widget | | |
| [ ] | AI Suggestions | | |
| [ ] | Organization Health | | |
| [ ] | Connected Accounts | | |
| [ ] | Weather (optional) | | Org weather location separate from mailing address |
| [ ] | Search | | |
| [ ] | Dashboard Ease redesign | Partial | Mockup / in progress — no full GO yet (feature-list) |

### Calendar & Event Management

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Create Event | | |
| [ ] | Edit Event | | |
| [ ] | Delete Event | | |
| [ ] | Duplicate Event | | |
| [ ] | Recurring Events | | |
| [ ] | Event Status | | |
| [ ] | Timeline | | |
| [ ] | Campaign Creation | | |
| [ ] | Campaign Templates | | |
| [ ] | Playbooks | | Library + assign by event type (Settings Branding) |
| [ ] | School Year Calendar | | |
| [ ] | Calendar import (Google / ICS / file) | | |
| [ ] | Calendar review / dedupe | | See [calendar-import-dedupe.md](./calendar-import-dedupe.md) |
| [ ] | Event detail workspace (tabs hub) | Wired | Approvals, Tasks, CwAI, Volunteers, Insights, Files, Vendors, etc. |

### Create with AI

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Chooser landing | Wired | `/create-with-ai` |
| [ ] | Social Media Generator | Wired | `/create-with-ai/social` |
| [ ] | Homepage Builder | Wired | `/homepage-composer` — [qa](./homepage-composer.md) |
| [ ] | Newsletter Builder | Wired | `/newsletter-composer` — [qa](./newsletter-composer.md) |
| [ ] | AI Regenerate | | |
| [ ] | AI Edit | | |
| [ ] | AI Copy | | |
| [ ] | AI Save Draft | | Composers: newest-wins draft store |
| [ ] | AI History | | |
| [ ] | AI Usage Tracking | | |
| [ ] | AI Credit Counting | | Credits widget + hard-block |
| [ ] | Prompt Logging | | |
| [ ] | Error Handling | | |
| [ ] | Retry Logic | | |
| [ ] | AI Brain (org voice / style) | | Settings Branding |
| [ ] | AI Inbox sources | | Settings Branding |

### Ask Ralli

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Ops coach (Phases 1–5) | | Pinned under Insights; [eng + QA](../engineering/ask-ralli-assistant.md) |
| [ ] | Regression / Playwright `12` | | |

### Tasks

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Tasks Ease list (Team / Mine) | Wired | Done → strikethrough / muted |
| [ ] | Status / Focus / Custom boards | Wired | |
| [ ] | Create / complete / edit | | |
| [ ] | Ask AI on tasks | | |

### Files

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Files library | Wired | `/files` |
| [ ] | Event Files tab | | |
| [ ] | Upload / download | | |
| [ ] | Tenant isolation | | |

### Vendors

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Vendor directory (contact-first) | Wired | `/vendors` |
| [ ] | Vendor profiles | | |
| [ ] | Event Vendors tab | | |

### Insights (Meta)

Distinct from marketing Analytics below.

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Org Insights | Wired | `/insights` |
| [ ] | Connect Meta empty (why cards) | Wired | Meta review–ready |
| [ ] | Event Insights | Wired | |
| [ ] | Refresh / sync | | |
| [ ] | Top content / filters | | |

### Communications — Social Publishing

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Facebook | | |
| [ ] | Instagram | | |
| [ ] | Meta Inbox / Communications Hub | Partial | Connect Meta Ease shipped; full hub Ease in progress |
| [ ] | AI Replies | | Never auto-sent |
| [ ] | Scheduled Posts | | |
| [ ] | Drafts | | |
| [ ] | Failed Posts | | |
| [ ] | Retry Publishing | | |
| [ ] | Manual Publishing | | |

### Approvals

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Submit for Approval | | |
| [ ] | Approve | | |
| [ ] | Reject | | |
| [ ] | Request Changes | | |
| [ ] | Version History | | |
| [ ] | Activity Timeline | | |
| [ ] | Notifications | | |
| [ ] | Email Alerts | | |

### Volunteer Management

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Volunteer Opportunities | | |
| [ ] | Public Pages | | |
| [ ] | Signup Links | | |
| [ ] | Volunteer Dashboard / Master | | [volunteer-master.md](../product/volunteer-master.md) |
| [ ] | Fill Rate | | |
| [ ] | Statistics | | |
| [ ] | Event Progress | | |
| [ ] | Search / Filters | | |
| [ ] | SignUpGenius connect / sync | | |

### Teams & Permissions

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Invite Members | Wired | |
| [ ] | Remove / deactivate Members | Wired | |
| [ ] | Change Roles | | |
| [ ] | Admin Permissions | | |
| [ ] | VP Permissions | | |
| [ ] | Committee Permissions | | |
| [ ] | Viewer Permissions | | |
| [ ] | Developer Permissions | | + agreements gate |
| [ ] | Owner Permissions | | |
| [ ] | Event linking (person drawer) | Wired | Soft marketing copy removed |
| [ ] | Board roster / responsibility matrix | | Settings |
| [ ] | Last logged in | Wired | Org-scoped Auth lookup |

### Settings Ease hub

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Overview | Wired | |
| [ ] | Organization (full mailing address) | Wired | Street → country; weather location separate |
| [ ] | Branding hub | Wired | School year, AI Brain, Inbox, Playbooks, Colors & Logos |
| [ ] | Team & Access | Wired | |
| [ ] | Integrations | Wired | Meta, Canva, Google Calendar, etc. |
| [ ] | Billing | Wired | Usage / Plans / Payment |
| [ ] | Account (password, erase, session, notifications, sign-out) | Wired | |

### Multi-org & access gates

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Active org cookie / switcher | Wired | |
| [ ] | Canceled-subscription lockout | | |
| [ ] | Developer agreements (NDA/IP) | | [developer-agreements.md](./developer-agreements.md) |
| [ ] | Shared-device sign-out cleanup | Wired | Campaign builder local drafts |

### Billing — Stripe

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Free Trial | | |
| [ ] | Checkout | | Needs you in launch-checklist |
| [ ] | Upgrade | | |
| [ ] | Downgrade | | |
| [ ] | Cancel | | |
| [ ] | Resume | | |
| [ ] | Failed Payment | | |
| [ ] | Card Updates | | Portal |
| [ ] | Invoice History | | |
| [ ] | Receipts | | |
| [ ] | Usage Limits | | |
| [ ] | AI Limits | | |
| [ ] | Founding / billing exempt path | | |

### Owner Portal — Business Metrics

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Organizations | | `/ops` |
| [ ] | Active Users | | |
| [ ] | Active Trials | | |
| [ ] | Paid Customers | | |
| [ ] | MRR | | |
| [ ] | ARR | | |
| [ ] | Churn | | |
| [ ] | Revenue by Plan | | |
| [ ] | New Signups | | |
| [ ] | Daily Active Users | | |
| [ ] | Monthly Active Users | | |

### Owner Portal — AI Monitoring

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | AI Requests | | See [owner-ai-apis.md](./owner-ai-apis.md) |
| [ ] | AI Cost | | |
| [ ] | Tokens | | |
| [ ] | Models Used | | |
| [ ] | Cost Per Organization | | |
| [ ] | Cost Per User | | |
| [ ] | Export Reports | | |

### Owner Portal — API Monitoring

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Meta | | |
| [ ] | Canva | | |
| [ ] | Google Calendar | | |
| [ ] | Resend | | |
| [ ] | SignUpGenius | | |
| [ ] | API Health | | |
| [ ] | Failed Requests | | |
| [ ] | Rate Limits | | |

### Notifications

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | In-App Notifications | | |
| [ ] | Email Notifications | | |
| [ ] | Approval Notifications | | |
| [ ] | Billing Notifications | | |
| [ ] | Invite Notifications | | |
| [ ] | AI Completion Notifications | | |
| [ ] | Report a Problem (Sentry) | | [report-a-problem.md](./report-a-problem.md) |

### Emails

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Welcome Email | | |
| [ ] | Password Reset | | |
| [ ] | Invitation | | |
| [ ] | Approval | | |
| [ ] | Billing Receipt | | |
| [ ] | Trial Ending | | |
| [ ] | Subscription Confirmation | | |
| [ ] | Cancellation | | |
| [ ] | Contact Form | | |

### Marketing Website — Pages

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Home | Wired | WOW `/` |
| [ ] | Features | | |
| [ ] | Pricing | | |
| [ ] | About | | |
| [ ] | Contact | | |
| [ ] | FAQ | | |
| [ ] | Privacy Policy | Wired | `/privacy` (includes Cookies subsection) |
| [ ] | Terms of Service | Wired | `/terms` |
| [ ] | Cookie Policy (standalone) | Partial | No `/cookies` route — covered by Privacy + consent bar; decide ship vs N/A |
| [ ] | Support | | |

### Marketing — Assets & growth

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Feature Videos | | |
| [ ] | Screenshots | | |
| [ ] | Testimonials | | |
| [ ] | Demo Request | | |
| [ ] | Waitlist | | |
| [ ] | CTA Buttons | | |
| [ ] | SEO | | |
| [ ] | Product / calendar demo on `/` | Partial | Assets exist; live CTA waits for GO |

### Performance

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Lighthouse 90+ | | |
| [ ] | Mobile Friendly | | |
| [ ] | Accessibility | | |
| [ ] | Image Optimization | | |
| [ ] | Lazy Loading | | |
| [ ] | Caching | | |
| [ ] | Database Optimization | | |
| [ ] | CDN Verification | | |
| [ ] | Perf budget (≤2s) | | [performance-budget.md](./performance-budget.md) |

### Security

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | HTTPS | | |
| [ ] | Authentication | Wired | |
| [ ] | Authorization / RLS | | [access-control](../engineering/access-control.md) · [multi-tenant](../security/multi-tenant-isolation.md) |
| [ ] | Input Validation | | |
| [ ] | SQL Injection Protection | | Supabase / parameterized |
| [ ] | XSS Protection | | |
| [ ] | CSRF Protection | | |
| [ ] | Rate Limiting | | Auth + sensitive actions |
| [ ] | Error Logging | | |
| [ ] | Sentry | | |
| [ ] | Secrets Management | | |
| [ ] | Audit remediation open items | | [audit-remediation.md](../security/audit-remediation.md) |

### Analytics (product / marketing)

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Google Analytics | | |
| [ ] | Product Analytics | | |
| [ ] | Error Tracking | | Sentry |
| [ ] | Conversion Tracking | | |
| [ ] | Signup Funnel | | |
| [ ] | AI Usage Analytics | | Owner portal |
| [ ] | Feature Usage | | |
| [ ] | Dashboard Metrics | | |

### QA Testing — Functional

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Every button | | Prefer Playwright where possible |
| [ ] | Every page | | |
| [ ] | Every modal | | |
| [ ] | Every AI feature | | |
| [ ] | Every API | | |
| [ ] | Every email | | |
| [ ] | Every upload | | |
| [ ] | Every download | | |

### QA Testing — Devices & browsers

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Desktop | | |
| [ ] | Laptop | | |
| [ ] | Tablet | | |
| [ ] | Mobile | | |
| [ ] | Chrome | | |
| [ ] | Safari | | Agreements HTML Needs you |
| [ ] | Edge | | |
| [ ] | Firefox | | |

### Beta Testing — Internal

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Personal Testing | | |
| [ ] | Husband Testing (observe without coaching) | | |
| [ ] | Friend QA | | |
| [ ] | Bug Fixes | | |
| [ ] | Regression Testing | | |

### Beta Testing — External

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | 3 Pilot Schools | | |
| [ ] | Feedback Collection | | |
| [ ] | Bug Fixes | | |
| [ ] | Final Review | | |

### Documentation

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Help Center | | |
| [ ] | FAQ | | |
| [ ] | User Guides | | |
| [ ] | Admin Guides | | |
| [ ] | API Documentation | | |
| [ ] | Privacy Policy | Wired | |
| [ ] | Terms | Wired | |
| [ ] | NDA | | Developer agreements |
| [ ] | IP Agreement | | Developer agreements |

### Integrations — Verify every connection

For each: Connect · Disconnect · Reconnect · Permission changes · Expired token recovery · Error handling.

| Done | Integration | Status | Notes |
|------|-------------|--------|-------|
| [ ] | Meta | | [meta.md](../integrations/meta.md) · App Review packet |
| [ ] | Canva | Wired | Config-dependent OAuth |
| [ ] | Google Calendar | | [google-calendar.md](../integrations/google-calendar.md) |
| [ ] | Resend | | Email delivery |
| [ ] | SignUpGenius | | [signupgenius.md](../integrations/signupgenius.md) |
| [ ] | Monday.com | Partial | Optional / non-blocking |

### Meta App Review

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Use-cases doc complete | | [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) |
| [ ] | Connect Meta why UI live | Wired | `/communications` empty |
| [ ] | Insights reachable for review | Wired | |
| [ ] | Screencast / walkthrough ready | | |

### Business Readiness

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Pricing Finalized | | |
| [ ] | Support Email | | |
| [ ] | Domain Verified | | |
| [ ] | Business Address | | Org mailing address fields shipped |
| [ ] | Stripe Verification | | |
| [ ] | Tax Settings | | |
| [ ] | Refund Policy | | |
| [ ] | Customer Support Process | | |

### Launch Assets

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Product Demo Video | | |
| [ ] | 30-Second Feature Video | | |
| [ ] | Logo Files | | |
| [ ] | Brand Kit | | |
| [ ] | Social Media Graphics | | |
| [ ] | Launch Email | | |
| [ ] | Press Kit | | |
| [ ] | Founder Story | | |
| [ ] | Product Screenshots | | |
| [ ] | Feature Comparison | | |

### Soft Launch

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Invite First Organization | | |
| [ ] | Monitor Logs | | |
| [ ] | Monitor Billing | | |
| [ ] | Monitor AI Costs | | |
| [ ] | Respond to Feedback | | |
| [ ] | Fix Critical Bugs | | |
| [ ] | Validate Infrastructure | | |

### Public Launch

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Open Registration | | Founding code may still gate |
| [ ] | Announce on Social Media | | |
| [ ] | Email Waitlist | | |
| [ ] | Publish Product Demo | | |
| [ ] | Monitor Signups | | |
| [ ] | Monitor Server Health | | |
| [ ] | Respond to Support | | |
| [ ] | Celebrate | | |

### Post-Launch — Daily (first 30 days)

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Review Errors | | |
| [ ] | Review Signups | | |
| [ ] | Review AI Costs | | |
| [ ] | Review Support Tickets | | |
| [ ] | Respond to User Feedback | | |

### Post-Launch — Weekly

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Ship Bug Fixes | | |
| [ ] | Review Analytics | | |
| [ ] | Measure Feature Adoption | | |
| [ ] | Prioritize Customer Requests | | |
| [ ] | Review Financial Metrics | | |

### Post-Launch — Monthly

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Roadmap Planning | | |
| [ ] | Customer Interviews | | |
| [ ] | Improve Onboarding | | |
| [ ] | Performance Review | | |
| [ ] | Security Audit | | |

---

## Final Go/No-Go

Before official public launch, every answer should be **Yes**.

| Question | Yes |
|----------|-----|
| Can a brand-new user sign up without assistance? | [ ] |
| Can they complete Ease onboarding (event → essentials → connect → event)? | [ ] |
| Can they connect their accounts (Meta / Calendar / Canva as needed)? | [ ] |
| Can they create an event? | [ ] |
| Can they generate AI content? | [ ] |
| Can they send content for approval? | [ ] |
| Can they publish successfully? | [ ] |
| Can they invite teammates? | [ ] |
| Can they upgrade to a paid plan? | [ ] |
| Can they receive all expected emails? | [ ] |
| Can they change password / erase account? | [ ] |
| Can they open Tasks, Files, Vendors, Insights? | [ ] |
| Is Meta App Review packet ready? | [ ] |
| Are critical bugs resolved? | [ ] |
| Are support resources available? | [ ] |
| Is monitoring in place? | [ ] |

---

## How this relates to launch-checklist

Work rows here for **coverage**. When a soft-launch theme is ready for Pass/Fail, execute the matching section in [launch-checklist.md](./launch-checklist.md) and promote Status → **Verified**.
