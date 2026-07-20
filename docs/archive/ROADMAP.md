# CampaignOS — Product Roadmap

**Last updated:** June 2026  
**Horizon:** 12 months  
**Focus:** PTO-only through Version 1 launch and first paid cohort

---

## Roadmap Principles

1. **Calendar-first, always.** Every phase should strengthen the path from school dates → events → campaigns.
2. **Prove the loop before expanding.** No new organization types, channels, or integrations until the core workflow is loved by real PTOs.
3. **AI assists; humans approve.** Approval and editability ship before auto-publishing.
4. **Empty states today, features tomorrow.** Dashboard sections exist early with honest empty states, then fill with real functionality.

---

## Phase 0 — Foundation ✅ In Progress

**Goal:** Working app skeleton with real event persistence.

| Item | Status | Notes |
|------|--------|-------|
| Next.js 15 + Supabase scaffold | Done | App Router, Tailwind, TypeScript |
| Dashboard shell & navigation | Done | Dashboard, Events, Create Event, Settings |
| Events table & CRUD | Done | Manual event creation → Supabase |
| Dashboard Upcoming Events (live) | Done | Real data, empty states elsewhere |
| Product documentation | Done | Vision, journey, PRD, roadmap, DB blueprint |
| Supabase Auth | Planned | Required before multi-user approval |
| PTO settings persistence | Planned | Settings page → Supabase |

**Exit criteria:** A volunteer can create events and see them on the Dashboard and Events list.

---

## Phase 1 — Event Workspace (Weeks 1–4)

**Goal:** Each event becomes a dedicated workspace — the core unit of CampaignOS.

| Item | Priority | Description |
|------|----------|-------------|
| Event Workspace page | P0 | `/events/[id]` with tabbed or sectioned layout |
| Event detail editing | P0 | Update all event fields from workspace |
| Event status lifecycle | P0 | draft → scheduled → published → archived |
| Campaign record model | P0 | One campaign per generation run per event |
| Asset storage model | P0 | Store generated captions, blurbs, copy, prompts |
| Empty workspace states | P1 | Guide user to generate first campaign |

**Exit criteria:** User opens an event and sees a structured workspace ready for AI content.

---

## Phase 2 — AI Campaign Generation (Weeks 4–8)

**Goal:** One click produces a full communication package.

| Item | Priority | Description |
|------|----------|-------------|
| AI generation server action | P0 | Generate all asset types from event + org context |
| Social captions | P0 | Facebook + Instagram variants |
| Newsletter blurb | P0 | 2–4 sentence summary |
| Website copy | P0 | 1–2 paragraph event description |
| Artwork prompt | P0 | Canva-ready creative brief |
| Reminder timeline generation | P0 | Relative dates + draft messages |
| Approval checklist generation | P0 | Default board review items |
| Inline editing | P0 | Edit any asset without re-generating all |
| Regenerate single asset | P1 | Re-run one asset type |
| PTO tone injection | P0 | Settings influence prompt context |

**Exit criteria:** Communications Chair generates, edits, and saves a complete campaign for an event in one session.

---

## Phase 3 — Approval Workflow (Weeks 8–10)

**Goal:** Board members can review and approve with confidence.

| Item | Priority | Description |
|------|----------|-------------|
| Submit for approval | P0 | Communications Chair sends campaign to review |
| Campaigns Needing Approval (live) | P0 | Dashboard section populated with real data |
| Reviewer view | P0 | Read-only asset review in Event Workspace |
| Approve / request changes | P0 | Status transitions with notes |
| Approval checklist tracking | P0 | Checkbox items required before final approval |
| Activity log (basic) | P1 | Log approvals, edits, submissions |
| Email notification | P2 | Notify reviewer when approval is needed |

**Exit criteria:** Board member approves a campaign; Communications Chair sees status update on Dashboard.

---

## Phase 4 — Reminders & Publish Tracking (Weeks 10–12)

**Goal:** Close the loop from approval to "it's live."

| Item | Priority | Description |
|------|----------|-------------|
| Reminder timeline UI | P0 | Visual schedule in Event Workspace |
| Copy-to-clipboard | P0 | One-click copy for each approved asset |
| Mark as published | P0 | Track what's been shared manually |
| Today's Priorities (live) | P0 | Surface due reminders on Dashboard |
| Recent Activity (live) | P1 | Populate activity feed |
| Reminder due notifications | P2 | Email or in-app nudge |

**Exit criteria:** User runs a full event cycle: create → generate → approve → publish → complete reminders.

---

## Phase 5 — Calendar Intake (Weeks 12–16)

**Goal:** Bootstrap the school year from an existing calendar.

| Item | Priority | Description |
|------|----------|-------------|
| Paste / bulk text import | P0 | Paste list of dates → draft events |
| CSV / spreadsheet upload | P1 | Structured file import |
| PDF / image calendar upload | P1 | AI extraction of dates and event names |
| Review & confirm extracted events | P0 | Edit before creating events |
| Duplicate detection | P2 | Flag overlapping dates |

**Exit criteria:** User uploads August calendar PDF and confirms 15+ draft events in under 10 minutes.

---

## Phase 6 — Beta Launch (Weeks 16–20)

**Goal:** 3–5 real PTOs using CampaignOS for a full event cycle.

| Item | Priority | Description |
|------|----------|-------------|
| Onboarding flow | P0 | Guided first-run experience |
| Supabase Auth + roles | P0 | Communications Chair vs. Board Reviewer |
| Error handling & polish | P0 | Production-quality UX |
| Feedback collection | P0 | In-app feedback or survey |
| Documentation / help center | P1 | FAQ for volunteers |
| Pricing decision | P1 | Free beta → paid plan structure |

**Exit criteria:** ≥ 3 PTOs complete create → generate → approve → publish for at least one event each.

---

## Future Horizons (Post-V1)

These are explicitly **not** in V1 scope. Listed to show direction, not commitment.

| Horizon | Ideas |
|---------|-------|
| **Q3 2026** | Facebook / Instagram scheduling integrations |
| **Q4 2026** | Event type templates (carnival, fundraiser, teacher appreciation) |
| **Q1 2027** | Multi-user permissions and volunteer roles |
| **Q2 2027** | Booster clubs and other school volunteer groups |
| **H2 2027** | District-level multi-school management |
| **2028+** | Analytics, Canva integration, SMS reminders |

---

## What We're Not Building (V1)

- Auto-posting without human review
- Engagement analytics dashboards
- Graphic design / image generation
- Ticketing or payment processing
- Volunteer shift scheduling
- Non-PTO organization support
- Mobile native apps (responsive web is sufficient for V1)

---

## Milestone Timeline (Visual)

```
Jun 2026          Aug 2026          Oct 2026          Dec 2026
    |                 |                 |                 |
    Phase 0           Phase 1-2         Phase 3-4         Phase 5-6
    Foundation        Workspace + AI    Approval +        Calendar +
                      Generation        Publish           Beta Launch
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jun 2026 | PTO-only for V1 | Narrow focus beats broad appeal for validation |
| Jun 2026 | Calendar-first positioning | Matches how PTOs actually plan the year |
| Jun 2026 | Manual publish in V1 | Avoids platform API complexity; proves value first |
| Jun 2026 | No vanity metrics on Dashboard | PTO volunteers need priorities, not analytics |
| Jun 2026 | Event Workspace as core unit | One event = one home for all communications |

*Add new decisions here as the product evolves.*
