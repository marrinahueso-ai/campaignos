# CampaignOS 2.0 — Future Roadmap

**Purpose:** Define the product evolution from 2.0 launch through the next 24 months.  
**Last updated:** June 2026

---

## Roadmap Philosophy

1. **Prove the loop before expanding.** The core cycle — calendar → event → timeline → generate → approve → publish — must be loved by real PTOs before adding integrations.
2. **Reduce decisions at every phase.** Each release should remove more volunteer decision-making, not add features.
3. **PTO-only until proven.** No booster clubs, districts, or enterprise until PTO product-market fit is validated.
4. **Integrations follow workflow.** We don't add Facebook scheduling until the approval and publishing loop works manually.
5. **Delight is a feature.** Polish, empty states, and micro-interactions are not "Phase 4" — they're part of every release.

---

## What Exists Today (Foundation)

CampaignOS 1.0–1.5 (Sprints 1–5) shipped the skeleton:

| Shipped | Status |
|---------|--------|
| School Setup wizard (org, brand, calendar upload) | ✅ Live |
| Dashboard with upcoming events | ✅ Live |
| Events list and create | ✅ Live |
| Calendar Import Review (sample data UI) | ✅ Live |
| Event Workspace shell (hero, overview, comms hub, assets, timeline) | ✅ Live |
| Supabase backend (organizations, events, workspace tables) | ✅ Live |
| Sidebar navigation | ✅ Live |

**What's missing:** Playbooks, intelligent timelines, AI generation, approval flows, publishing loops, analytics, and calendar parsing — the operating system layer defined in this blueprint.

---

## Phase 1: The Operating System Core (Months 1–3)

**Goal:** Complete the communication loop with playbooks, timelines, and placeholder generation.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **1.1 Playbooks** | Communication Playbook library, event type assignment, auto timeline generation | "My Book Fair has a 7-step communication plan — already built" |
| **1.2 Timeline** | Live Communication Timeline in workspace, Dashboard Today's Actions from timeline data | "I know exactly what's due today" |
| **1.3 Generation (Preview)** | AI Brain generates channel copy from event + playbook context | "CampaignOS wrote my Facebook post — I edited two words" |
| **1.4 Dashboard 2.0** | Action-oriented Dashboard replacing widget layout | "I open CampaignOS and know my next 3 tasks" |

**Exit criteria:** Jamie runs one real event from workspace creation through generated content review — using playbooks and timeline.

---

## Phase 2: Trust & Closure (Months 3–5)

**Goal:** Board approval and publishing close the loop.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **2.1 Approval** | Submit for approval, Approval Center, board checklist, audit trail | "Dana approved in 4 minutes — no text thread" |
| **2.2 Publishing** | Copy-to-clipboard, mark as published, timeline + Dashboard updates | "I posted it and CampaignOS knows it's done" |
| **2.3 Notifications** | Email alerts for submit, approve, changes requested | "Dana knows when I need her" |
| **2.4 Activity Log** | Full event activity history, Dashboard recent activity | "I can prove what happened and when" |

**Exit criteria:** Jamie completes a full event cycle: create → generate → approve → publish → timeline green. Dana approves without email.

---

## Phase 3: Calendar Intelligence (Months 5–7)

**Goal:** Bootstrap the school year from an uploaded calendar.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **3.1 Calendar Parsing** | AI extraction from PDF, CSV, ICS uploads | "I uploaded the district calendar and got 24 events" |
| **3.2 Review Enhancement** | Playbook assignment on review, conflict detection, bulk import with timelines | "Every imported event has a communication plan" |
| **3.3 School Year Model** | Active year scoping, year progress, archive past years | "I'm planning 2025–2026 — last year is archived" |
| **3.4 Year Analytics** | School year summary, on-time rate, channel coverage | "I have a board report ready for June" |
| **3.5 Workload Calendar** | List, Week, Month views; modes: Events, Communications, Publishing, Approvals; workload warnings | "I can see my whole week — and October 3 is overloaded" |

**Exit criteria:** Jamie uploads August calendar PDF, confirms 20+ events, and each has a workspace with timeline — in one session. Jamie uses Workload Calendar to spot and resolve a heavy communication day.

---

## Phase 4: AI Brain & Creative (Months 7–10)

**Goal:** Production-quality AI generation and creative asset support.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **4.1 AI Brain v1** | Context-rich generation using org voice, playbook, timeline node | "Every post sounds like our PTO" |
| **4.2 Regenerate & Version** | Per-channel regeneration, version history, edit preservation | "I regenerated Facebook without losing my newsletter edit" |
| **4.3 Creative Briefs** | AI-generated artwork descriptions for Canva workflow | "I handed this brief to our volunteer designer" |
| **4.4 Image Generation** | AI-generated hero images, square graphics, Instagram stories | "CampaignOS made our Book Fair graphic" |
| **4.5 Generate All** | Bulk generation for entire event or timeline node | "One click — all 9 channels drafted" |
| **4.6 Event Resources / Smart Links** | Resources section in workspace; AI inserts correct links in generated copy | "The volunteer signup link was already in the Facebook post" |
| **4.7 Creative Intelligence v1** | Inspiration uploads, layout/style analysis, brand-kit modernization | "CampaignOS modernized last year's flyer — on brand, not a copy" |

**Exit criteria:** Jamie generates a complete Book Fair communication package and edits less than 20% before approving. Resources links appear automatically in CTAs.

---

## Phase 5: Integrations (Months 10–14)

**Goal:** Reduce manual publishing friction with platform connections.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **5.1 Facebook Scheduling** | Schedule approved posts to PTO Facebook page | "I approved it Monday — it posts Wednesday automatically" |
| **5.2 Instagram Scheduling** | Schedule to Instagram via Meta Business Suite | "Instagram story goes live at 8 AM on event day" |
| **5.3 Email Integration** | Send approved emails through Mailchimp or Constant Contact | "Newsletter blurb sent without copy-paste" |
| **5.4 Engagement Analytics** | Pull reach/engagement from connected platforms | "340 families saw the Book Fair reminder" |
| **5.5 Canva Integration** | Export creative briefs to Canva templates | "One click to editable Canva design" |

**Exit criteria:** Jamie schedules (not manually posts) at least 3 communications through CampaignOS integrations.

---

## Phase 6: Scale & Retention (Months 14–18)

**Goal:** Multi-user, custom playbooks, and retention features.

| Release | What ships | User outcome |
|---------|-----------|--------------|
| **6.1 Auth & Roles** | Supabase Auth, Communications Chair vs. Board Reviewer roles | "Dana has her own login for approvals" |
| **6.2 Custom Playbooks** | Create, save, and share org-specific playbooks | "We saved our Spring Carnival playbook for next year" |
| **6.3 Playbook Learning** | Suggest playbook adjustments based on on-time data | "Add an Instagram node at 14 days — your events perform better" |
| **6.4 Succession Handoff** | Year-end handoff report for incoming Chair | "Next year's Chair inherits everything" |
| **6.5 Board Report Export** | PDF year summary for PTO meetings | "I exported the report for the June meeting" |
| **6.6 Organizational Memory** | Year-over-year event history; clone prior-year events; lessons learned | "I cloned last year's Book Fair — timeline and resources ready in one click" |
| **6.7 Inspiration Library** | Org-wide creative inspiration gallery; Brand DNA, Style Engine, Learning Engine | "Our PTO's visual identity gets smarter every year" |

**Exit criteria:** 10+ PTOs using CampaignOS for a full school year with multi-user approval. At least one PTO clones a prior-year event successfully.

---

## Phase 7: Growth (Months 18–24)

**Goal:** Expand reach while maintaining PTO focus.

| Release | What ships |
|---------|-----------|
| **7.1 Pricing & Billing** | Per-PTO subscription, free trial, annual plan |
| **7.2 Template Marketplace** | Community-shared playbooks by event type |
| **7.3 Multi-Channel Dashboard** | Unified view of all connected platform activity |
| **7.4 Mobile App (PWA)** | Push notifications for due items and approval requests |
| **7.5 Referral Program** | PTOs refer other PTOs |
| **7.6 Collaboration Hub** | Event-specific comments, @mentions, approval notes, AI status summaries — async only, no live chat | "Dana left feedback on the flyer without an email thread" |

**Expansion candidates (only after PTO PMF):**
- Booster clubs and sports teams
- Room parent communication
- School district multi-school view
- Non-US school communities

---

## What We Will Not Build

| Item | Why not |
|------|---------|
| Auto-posting without approval | Violates trust principle |
| Generic marketing platform | Dilutes PTO focus |
| Volunteer shift scheduling | Different product category |
| Ticketing / payments | Different product category |
| District enterprise admin | Premature before PTO PMF |
| Native mobile apps (V2) | Responsive web sufficient |
| Chatbot / conversational AI | Decision fatigue increases with chat |
| Live chat / real-time messaging | Collaboration Hub is async comments only — no Slack-style chat in V2 |
| Competitive analytics | PTOs don't compete |

---

## Pricing Direction (TBD)

| Tier | Target | Includes |
|------|--------|----------|
| **Free trial** | New PTOs | 1 school year, 1 user, full features, 30 days |
| **PTO Plan** | Single school PTO | Unlimited events, 3 users, all features |
| **PTO Plus** | Active large PTOs | Unlimited users, custom playbooks, integrations, priority support |

Pricing validated during Phase 6 beta with 10+ real PTOs.

---

## Success Milestones

| Milestone | Target | Timeline |
|-----------|--------|----------|
| First PTO completes full event cycle | 1 PTO | Phase 2 |
| First calendar import → 20 events with timelines | 1 PTO | Phase 3 |
| First AI-generated campaign approved by board | 1 PTO | Phase 2 |
| 5 PTOs in beta | 5 PTOs | Phase 4 |
| 10 PTOs paying | 10 PTOs | Phase 6 |
| 90% on-time publish rate across beta PTOs | 90% | Phase 3 |
| NPS ≥ 50 from Communications Chairs | 50+ | Phase 5 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jun 2026 | CampaignOS 2.0 repositioned as Communications OS | Content generation is a feature, not the product |
| Jun 2026 | Communication Playbooks as core intelligence | Eliminates the #1 hidden workload: planning when to communicate |
| Jun 2026 | Manual publish in V2 | Trust and simplicity before platform API complexity |
| Jun 2026 | Analytics = operational proof, not engagement | PTOs need confidence, not optimization |
| Jun 2026 | PTO-only through Phase 6 | Focus beats breadth for product-market fit |
| Jun 2026 | Decision fatigue as north star | Every feature must answer "what should I do next?" |
| Jun 2026 | Workload Calendar as Phase 3 deliverable | Volunteers think in weeks, not isolated events — calendar modes reduce invisible pile-ups |
| Jun 2026 | Event Resources / Smart Links in Phase 4 | Generated copy must include actionable links, not placeholders |
| Jun 2026 | Creative Intelligence — analyze, don't copy | Past flyers are inspiration input; Brand DNA modernizes with school kit |
| Jun 2026 | Collaboration Hub — async only | Comments and activity, not live chat — reduces scope and notification fatigue |
| Jun 2026 | Organizational Memory in Phase 6 | Year-over-year clone and learn — succession planning is core PTO value |
| Jun 2026 | Innovation Backlog as doc 13 | Future concepts documented separately from committed roadmap phases |

*Add new decisions as the product evolves.*

---

## The 2.0 Promise

By the end of Phase 3, a PTO Communications Chair should be able to:

1. Upload the school calendar in August
2. Confirm events with auto-assigned playbooks
3. See the entire year's communication plan in Dashboard
4. Generate, approve, and publish communications event by event
5. Show the board a year-end summary proving the PTO communicated effectively

That is the operating system.

Everything in this roadmap serves that promise.

---

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 01 | Product Vision | Mission, principles, positioning |
| 02 | Customer Journey | Jamie and Dana's end-to-end experience |
| 03 | Information Architecture | Product hierarchy and navigation |
| 04 | Screen Blueprints | What every major screen looks like |
| 05 | Event Workspace | The central unit of the product |
| 06 | Communication Playbook | Countdown schedules by event type |
| 07 | AI Brain | Invisible intelligence behind generation |
| 08 | Communication Timeline | Auto-generated communication schedule |
| 09 | Approval Workflow | Board review and trust |
| 10 | Publishing Center | Closing the loop |
| 11 | Analytics | Proof of value |
| 12 | Future Roadmap | This document |
| 13 | Innovation Backlog | Future concepts — not current sprint |

Together, these thirteen documents are the complete product blueprint for CampaignOS 2.0.

For ideas not yet assigned to a roadmap phase, see `13_INNOVATION_BACKLOG.md`.
