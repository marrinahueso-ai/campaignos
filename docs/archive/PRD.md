# CampaignOS — Product Requirements Document (PRD)

**Version:** 1.0 Draft  
**Status:** Draft for review  
**Scope:** PTO-only, Version 1  
**Last updated:** June 2026

---

## 1. Overview

CampaignOS is an AI communications assistant and operating system for Parent-Teacher Organization (PTO) volunteers. It helps PTOs plan, generate, review, and track school event communications from a calendar-first workflow.

This PRD defines Version 1 requirements. V1 proves the core loop:

**Calendar → Events → Event Workspace → AI Campaign → Approval → Publish**

---

## 2. Goals

### Business Goals
- Validate product-market fit with PTO Communications Chairs
- Achieve repeatable onboarding: calendar in → campaigns out within first session
- Build foundation for paid SaaS (pricing TBD post-validation)

### User Goals
- Reduce time spent writing event communications
- Eliminate missed reminders and inconsistent messaging
- Give board members a clear approval workflow
- Centralize all event communication assets in one place

### Non-Goals (V1)
- Auto-publishing to social media platforms
- Multi-tenant school district administration
- Support for non-PTO organizations (boosters, sports, etc.)
- Advanced analytics / engagement dashboards
- Native graphic design or image generation

---

## 3. Target Users

| Role | Description | Primary Needs |
|------|-------------|---------------|
| **Communications Chair** | Volunteer running PTO messaging | Create events, generate campaigns, track reminders |
| **Board Reviewer** | President, VP, or designated approver | Review and approve outgoing content |
| **PTO Admin** | Sets up org profile and preferences | Configure tone, school info, defaults |

V1 assumes a small team (1–5 people) sharing one PTO workspace. Role-based permissions are simplified in V1.

---

## 4. Core Features

### 4.1 PTO Profile & Settings

**Description:** Organization-level configuration used across all generated content.

**Requirements:**
- PTO / organization name
- School name
- Mission statement (optional)
- Default brand tone (friendly, professional, enthusiastic)
- Default hashtags
- Default post frequency preference

**Acceptance criteria:**
- Settings persist and influence AI generation prompts
- Settings are editable at any time
- Changes apply to future generations, not retroactively to approved content

---

### 4.2 Calendar Intake

**Description:** Import or enter the school calendar to bootstrap events.

**Requirements (V1):**
- Manual event creation (title, description, date, time, location, audience, theme, status)
- Manual bulk entry / paste (structured text → draft events) — *stretch*
- Calendar file upload (PDF/image) with AI extraction — *stretch / Phase 1.5*

**V1 Minimum:** Manual event creation with full event fields, stored in database.

**Acceptance criteria:**
- User can create an event with all required fields
- Event appears on Dashboard (Upcoming Events) and Events list immediately
- Event date drives "upcoming" vs. "past" classification

---

### 4.3 Dashboard

**Description:** Daily command center for PTO volunteers.

**Requirements:**
- **Today's Priorities** — tasks due today (V1: empty state; populated when reminders/tasks ship)
- **Upcoming Events** — events with date ≥ today, sorted by date
- **Campaigns Needing Approval** — events with pending approval assets (V1: empty state until approval workflow ships)
- **Recent Activity** — audit log of workspace actions (V1: empty state until activity logging ships)

**Acceptance criteria:**
- Dashboard loads real data from Supabase — no placeholder/mock content
- Empty states include actionable guidance
- No vanity metrics (engagement rate, follower count, etc.)

---

### 4.4 Events List

**Description:** Browse and manage all PTO events.

**Requirements:**
- List all events sorted by date
- Show event status badge (draft, scheduled, published, archived)
- Show key metadata: date, time, location, audience
- Link to Event Workspace (when available)
- Empty state with CTA to create first event

**Acceptance criteria:**
- Events list reflects database state
- Archived events are visible but visually distinct

---

### 4.5 Event Workspace

**Description:** Single home for all communications related to one event.

**Requirements:**

#### 4.5.1 Event Details
- Editable fields: title, description, date, time, location, audience, theme, status
- Status lifecycle: draft → scheduled → published → archived

#### 4.5.2 Campaign Assets (AI-generated)
- Social captions (Facebook, Instagram)
- Newsletter blurb
- Website / homepage copy
- Artwork prompt (text description for Canva/design)

#### 4.5.3 Reminder Timeline
- Suggested schedule based on event date:
  - Save the date
  - 2 weeks out
  - 1 week out
  - Day before
  - Day of
- Each reminder linked to a draft asset or standalone message

#### 4.5.4 Approval Checklist
- Board review items (configurable defaults per event type)
- Checkbox completion tracking
- Approval status per asset and per event

#### 4.5.5 Activity Log
- Timestamped record of creates, edits, generations, approvals, publishes

**Acceptance criteria:**
- All sections accessible from one event page
- AI generation populates all asset types in one action
- User can edit any generated content before approval
- Approved content is locked from casual editing (requires explicit unlock or new version)

---

### 4.6 AI Campaign Generation

**Description:** Generate a full communication package from event context + PTO settings.

**Inputs:**
- Event details (title, description, date, time, location, audience, theme)
- PTO settings (tone, hashtags, school name, mission)

**Outputs:**
| Asset | Format | Notes |
|-------|--------|-------|
| Facebook caption | Text, ≤ recommended length | Includes CTA |
| Instagram caption | Text + hashtag suggestions | Shorter, visual-friendly |
| Newsletter blurb | 2–4 sentences | Suitable for school newsletter |
| Website copy | 1–2 paragraphs | For PTO or school homepage |
| Artwork prompt | Text | For Canva AI or volunteer designer |
| Reminder timeline | Structured schedule | Dates relative to event date |
| Approval checklist | Checklist items | Board governance items |

**Acceptance criteria:**
- Generation completes in < 30 seconds (target)
- Content reflects event-specific context (not generic boilerplate)
- User can regenerate individual assets without losing others
- All outputs are editable

---

### 4.7 Approval Workflow

**Description:** Board members review generated content before it goes live.

**Requirements:**
- Submit event campaign for approval
- Reviewer sees all assets in Event Workspace
- Approve, request changes, or reject with note
- Approval checklist must be completed before final approval
- Status visible on Dashboard ("Campaigns Needing Approval")

**Acceptance criteria:**
- Only approved assets can be marked as published
- Approval history is logged in Activity
- Communications Chair is notified of reviewer feedback

---

### 4.8 Publish & Track (V1 — Manual)

**Description:** Mark approved content as published after manual sharing.

**Requirements:**
- Copy-to-clipboard for each approved asset
- Mark individual assets or reminders as "published"
- Reminder timeline reflects completed items

**Acceptance criteria:**
- Published items are visually distinct from drafts
- User can see what's still outstanding for an event

---

## 5. Technical Requirements

| Area | Requirement |
|------|-------------|
| Framework | Next.js 15, App Router, React, TypeScript |
| Styling | Tailwind CSS, responsive design |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (required before multi-user approval workflow) |
| AI | LLM API (provider TBD) with structured prompts per asset type |
| Architecture | Clean separation: UI components, server actions, data queries, types |
| Deployment | Vercel (or equivalent) |

---

## 6. Data Model (Summary)

See `DATABASE_BLUEPRINT.md` for full schema. Core entities:

- **organizations** — PTO profile and settings
- **events** — school events with full context fields
- **campaigns** — generated campaign run per event
- **campaign_assets** — individual generated content pieces
- **reminders** — scheduled communication items
- **approval_records** — approval decisions and checklist state
- **activity_log** — workspace audit trail

---

## 7. Success Metrics (V1)

| Metric | Target |
|--------|--------|
| Time to first event created | < 5 minutes from sign-up |
| Time to first AI campaign generated | < 15 minutes from sign-up |
| Campaign generation satisfaction | ≥ 70% "good enough to edit" (survey) |
| Weekly active PTO workspaces | Growth metric (baseline TBD) |
| Board approval cycle time | < 48 hours median |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI generates inappropriate or off-brand content | Human review required; editable outputs; PTO tone settings |
| Calendar extraction accuracy is low | V1 starts with manual entry; upload is stretch goal |
| Volunteers don't return after first use | Dashboard priorities and reminder timeline create habit loops |
| Board won't adopt approval workflow | Keep checklist lightweight; show value in first approval |
| Scope creep into full marketing platform | PRD non-goals enforced; PTO-only V1 |

---

## 9. Release Phases

### Phase 0 — Foundation (Current)
- Project scaffold, Supabase setup, auth prep
- Manual event CRUD
- Dashboard with real upcoming events + empty states

### Phase 1 — Event Workspace & AI Generation
- Event Workspace UI
- AI campaign generation (all asset types)
- Edit and save generated content

### Phase 2 — Approval & Publish
- Approval workflow and checklist
- Campaigns Needing Approval on Dashboard
- Manual publish tracking and reminder timeline

### Phase 3 — Calendar Intake
- Paste/import bulk dates
- Calendar file upload with AI extraction

### Phase 4 — Polish & Launch
- Onboarding flow
- Activity log
- Email notifications
- Beta with 3–5 real PTOs

---

## 10. Open Questions

1. Which LLM provider and cost model for V1?
2. Pricing: free beta → per-PTO subscription? Per school?
3. Do we need multi-user auth in V1 or is single shared login acceptable for beta?
4. Which calendar upload formats are highest priority (PDF vs. Google Calendar export)?
5. Should reminder timeline items auto-generate copy, or only suggest dates?

---

## 11. Appendix: V1 Feature Checklist

- [x] Event creation with full fields (title, description, date, time, location, audience, theme, status)
- [x] Events stored in Supabase
- [x] Dashboard Upcoming Events (live data)
- [x] Events list (live data)
- [ ] PTO settings persisted to Supabase
- [ ] Event Workspace page
- [ ] AI campaign generation
- [ ] Reminder timeline
- [ ] Approval checklist and workflow
- [ ] Campaigns Needing Approval (live data)
- [ ] Recent Activity log
- [ ] Calendar upload / intake
- [ ] Auth and multi-user roles
