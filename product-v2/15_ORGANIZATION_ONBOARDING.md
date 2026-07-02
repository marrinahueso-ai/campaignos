# CampaignOS 2.0 — Organization Onboarding

**Purpose:** Redesign the onboarding experience so CampaignOS learns how an organization operates *before* building campaigns.  
**Status:** Product & UX blueprint — no application code, no schema changes  
**Last updated:** June 2026  
**Supersedes (conceptually):** v1 School Setup wizard as the primary first-run experience

---

## Objective

CampaignOS should feel like **hiring a new Communications Director** — not installing software.

Before Jamie creates a single post, CampaignOS must understand:

| Dimension | Why it matters |
|-----------|----------------|
| **Who the organization is** | School identity, PTO/PTA/School structure, branding |
| **How they communicate** | Operating model: solo, shared leadership, or committee-driven |
| **Who owns what** | Organizational roles and responsibility defaults |
| **How approvals work** | Who signs off, on what, and when |
| **Which events deserve campaigns** | Communication Strategy per event type and imported date |
| **Their communication voice** | Tone, style, traditions — formerly scattered in AI Brain settings |
| **Their branding** | Logos, colors, reference creative |

**North-star outcome:** After onboarding, CampaignOS can propose an entire school year — events categorized, strategies assigned, responsibilities mapped, timelines ready — with **minimal additional decisions** from the user.

---

## Design Principles

1. **Conversation, not configuration** — plain-language questions; no admin-panel jargon.
2. **Progressive disclosure** — Step 2 (workflow model) determines how deep Steps 3–5 go.
3. **Roles ≠ users** — capture how the org *works*, not login accounts (auth comes later).
4. **Defaults first, overrides later** — onboarding sets org-level norms; event-level tweaks happen in Calendar Review and Event Workspace.
5. **One pass, one year** — optimized for August setup; re-entry allowed anytime via Organization Settings.
6. **Visible intelligence** — Jamie should feel CampaignOS *understood* her org, not that she filled out a form.

---

## Emotional Arc

```
Welcome → "They get how PTOs work"
    → Identity → "This is our school"
    → Workflow → "They asked the right question"
    → Roles & ownership → "They know who does what"
    → Voice & brand → "They sound like us"
    → Calendar → "They planned our whole year"
    → Summary → "We're ready"
    → Launch → "My Communications Operating System is live"
```

**Time budget:** 20–35 minutes for full-board path; 12–18 minutes for solo path.

---

## Onboarding Flow Overview

| Step | Name | Primary output |
|------|------|----------------|
| 1 | School Identity | Org profile + visual identity seeds |
| 2 | Organization Workflow | Operating model (solo / small team / committees) |
| 3 | Organization Workspace | Named organizational roles |
| 4 | Responsibility Matrix | Channel & function ownership defaults |
| 5 | Committee Ownership | Event-type → committee/owner defaults |
| 6 | Communication Style | Organization voice profile (AI Brain inputs) |
| 7 | Brand Assets | Logos, colors, reference creative library |
| 8 | Calendar Import | School year events + Communication Strategy suggestions |
| 9 | Review Organization | Confirmation summary |
| 10 | Launch | Handoff to Calendar Command Center |

Steps 3–5 **branch** based on Step 2. Steps 6–8 are **shared** across all paths (with different depth/emphasis).

---

## Step 1 — School Identity

**Screen title:** *"Let's start with your school."*  
**Subtitle:** *CampaignOS uses this everywhere — from calendar events to Facebook posts.*

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| School name | Yes | Display name across product |
| Organization type | Yes | PTO · PTA · PTSA · Booster Club · School-led · Other |
| District / region | Optional | Helps seasonal and regional tone |
| School year | Yes | e.g. 2025–2026 — anchors calendar import |
| Primary color | Yes | Hex or picker |
| Secondary color | Optional | |
| Mascot | Optional | Text + optional image later in Step 7 |
| Logo | Optional here | Full upload in Step 7; allow skip with reminder |

### UX notes

- Show a **live preview card** ("Lincoln Elementary PTO · 2025–2026") updating as fields change.
- Organization type affects copy elsewhere ("PTO Meeting" vs "PTSA Meeting").
- Do not mention playbooks, AI, or timelines yet — this step is purely *identity*.

### Output artifact

`OrganizationIdentity` — consumed by all downstream steps and generation.

---

## Step 2 — Organization Workflow

**Screen title:** *"How does your organization communicate?"*  
**Subtitle:** *There's no wrong answer. CampaignOS adapts to how you actually work.*

This is the **branching question**. Do not ask "How many users?" or "Invite your team."

### Choices (single select)

#### ○ I'm the only person managing communications
**Label:** *Solo Communications*  
**Description:** *You wear all the hats — social, newsletter, website, flyers.*

**What CampaignOS assumes:**
- One implicit owner for all channels
- Approvals are self-review or optional principal sign-off
- Committee ownership defaults to "Communications Chair" (Jamie)
- Onboarding Steps 3–5 are **shortened** (see Experience Variants)

---

#### ○ A small leadership team shares the work
**Label:** *Leadership Team*  
**Description:** *President, VP Communications, and a few board members divide responsibilities.*

**What CampaignOS assumes:**
- Named leadership roles matter (President, VP Comms, etc.)
- Responsibility matrix is **leadership-weighted**
- Approvals typically require President or designated approver
- Committee ownership maps to VPs, not full committee roster

---

#### ○ Different committees own different events
**Label:** *Committee-Driven*  
**Description:** *Book Fair committee, Hospitality, Fundraising — each runs their event's communications.*

**What CampaignOS assumes:**
- Full Organization Workspace (Step 3)
- Full Responsibility Matrix (Step 4)
- Full Committee Ownership (Step 5)
- Approvals may chain: committee → VP Communications → President
- Auto-assignment is highest value here

### UX notes

- Each option includes a **one-line example** from a real PTO scenario.
- Selection is reversible later in Organization Settings.
- Progress indicator shows this step as *"How you work"* — distinct from identity.

### Output artifact

`OrganizationWorkflowModel`: `solo` | `leadership_team` | `committee_driven`

---

## Step 3 — Organization Workspace

**Screen title:** *"Who's on your team?"*  
**Subtitle:** *These are organizational roles — not login accounts. CampaignOS uses them to assign work later.*

### Default role cards

Present as **editable cards** with optional name/contact notes (not auth):

| Role | Typical responsibilities |
|------|------------------------|
| **President** | Final approvals, board messaging |
| **VP Communications** | Overall comms strategy, timeline oversight |
| **VP Events** | Event logistics, committee coordination |
| **Creative Chair** | Flyers, graphics, Canva/social visuals |
| **Volunteer Coordinator** | Volunteer posts, SignUpGenius comms |
| **Website Chair** | Website announcements, calendar sync |
| **Newsletter Editor** | Weekly/monthly newsletter |
| **Principal** | Morning announcements, staff-facing notes |
| **+ Add custom role** | Hospitality Chair, Fundraising Chair, etc. |

### Interaction

- Toggle roles **on/off** based on relevance.
- Optional: "Name (optional)" field per role — e.g. "Sarah Chen."
- Solo path: auto-enable only **Communications Lead** (single card, rename allowed).
- Leadership path: pre-enable President, VP Communications, VP Events, Creative Chair.
- Committee path: show full roster + encourage custom committee chairs.

### UX notes

- Explain clearly: *"You won't create passwords here. This helps CampaignOS know who normally owns what."*
- Empty names are fine — role title alone is sufficient for auto-assignment labels.

### Output artifact

`OrganizationRole[]` — role key, display label, optional assignee name, active flag.

---

## Step 4 — Responsibility Matrix

**Screen title:** *"Who usually handles each channel?"*  
**Subtitle:** *CampaignOS will suggest assignees when creating timelines. You can always change them per event.*

### Matrix rows (default channels/functions)

| Function | Maps to org role (dropdown) |
|----------|----------------------------|
| Facebook | |
| Instagram | |
| Newsletter | |
| Website | |
| Morning Announcements | |
| Artwork / Flyers | |
| Volunteer Communications | |
| Sponsor Communications | |
| **Approvals** | |
| **Publishing** | |

### Interaction

- Each row: dropdown of **active roles from Step 3**.
- Solo path: all rows default to Communications Lead; Approvals = "Self" or Principal.
- Leadership path: pre-fill sensible defaults (VP Comms → social, Newsletter Editor → newsletter, President → Approvals).
- Committee path: full matrix required; show helper text per row.

### Smart defaults engine (conceptual)

When user selects a role in Step 3, CampaignOS pre-fills matrix using industry norms:

```
VP Communications → Facebook, Instagram, Publishing
Newsletter Editor → Newsletter
Website Chair → Website
Creative Chair → Artwork
Volunteer Coordinator → Volunteer Communications
President → Approvals
```

User confirms or adjusts — never a blank grid.

### Output artifact

`ResponsibilityMatrix` — function → role mapping. Used for timeline task labels, calendar filters, and future notifications.

---

## Step 5 — Committee Ownership

**Screen title:** *"Who usually runs these events?"*  
**Subtitle:** *When CampaignOS sees a Book Fair on your calendar, it already knows who to involve.*

### Event type rows

| Event type | Default owner role | Default Communication Strategy |
|------------|-------------------|-------------------------------|
| Book Fair | | Full Campaign |
| Teacher Appreciation | | Full Campaign |
| Spirit Night | | Full Campaign |
| Hospitality | | Reminder Only |
| Fundraising | | Full Campaign |
| General PTO Meeting | | Reminder Only |
| Family Events | | Full Campaign |
| Volunteer Recruitment | | Reminder Only |

### Interaction

- Each row: **owner role** dropdown + **strategy** selector (Full Campaign · Reminder Only · Calendar Only · Custom).
- "Use organization defaults" button resets to CampaignOS recommendations.
- Solo path: all owners = Communications Lead; strategies still configured (important for year planning).
- Committee path: map Book Fair → Book Fair Chair, Hospitality → Hospitality Chair, etc.

### Relationship to Communication Strategy

This step **seeds** Communication Strategy defaults by event type. Step 8 (Calendar Import) applies these defaults per imported event; user can override per row in Calendar Review.

| Strategy | Onboarding meaning |
|----------|-------------------|
| **Full Campaign** | Playbook + timeline + drafts + publishing |
| **Reminder Only** | Minimal reminders via General Event playbook |
| **Calendar Only** | Date visibility only — no campaign |
| **Custom** | Reserved — user configures channels later |

### Output artifact

`CommitteeOwnershipDefaults` — event type → { owner role, communication strategy }.

---

## Step 6 — Communication Style

**Screen title:** *"Help CampaignOS sound like your community."*  
**Subtitle:** *Answer a few friendly questions — no marketing degree required.*

This step **absorbs the AI Brain / Organization Intelligence profile** into onboarding. No "AI settings" screen.

### Question format (conversational cards)

**Card 1 — Tone**  
*"When your PTO posts on Facebook, it usually sounds…"*  
○ Warm and welcoming · ○ Professional and concise · ○ Fun and energetic · ○ Mix — depends on the event

**Card 2 — Emoji**  
*"How do you feel about emojis in posts?"*  
○ Love them · ○ Sometimes · ○ Rarely · ○ Never

**Card 3 — Post length**  
*"Your typical Facebook post is…"*  
○ Short (1–2 sentences) · ○ Medium (a short paragraph) · ○ Longer storytelling

**Card 4 — Writing style**  
*"Which feels closest?"*  
Show 2–3 **sample post snippets** in different styles; user picks favorite.

**Card 5 — Community personality**  
*"Our school community is best described as…"* (free text, 1–2 sentences)

**Card 6 — Traditions**  
*"Any phrases, events, or traditions CampaignOS should know?"*  
Examples: "Friday Flag Ceremony," "Go Lions!," "Coffee with the Principal"  
(Optional multi-line)

### UX notes

- Show a **live "sample post"** that updates as answers change (uses school name from Step 1).
- Reassure: *"You can refine this anytime. CampaignOS learns from your edits over time."*
- Do not expose prompt engineering, model names, or "training documents" language.

### Output artifact

`OrganizationVoiceProfile` — structured inputs for generation (tone, emoji policy, length preference, style sample, personality, traditions).

---

## Step 7 — Brand Assets

**Screen title:** *"Show CampaignOS your look."*  
**Subtitle:** *Upload what you have — even one logo helps.*

### Upload zones

| Asset | Required | Purpose |
|-------|----------|---------|
| PTO / school logo | Recommended | Posts, flyers, headers |
| Mascot image | Optional | Spirit content, graphics |
| School colors | Pre-filled from Step 1 | Confirm or adjust |
| Previous flyers (PDF/PNG) | Optional | Style reference for creative |
| Brand guide (PDF) | Optional | Future creative intelligence |

### UX notes

- Drag-and-drop with thumbnail previews.
- "Skip for now" allowed — dashboard shows gentle reminder until at least logo uploaded.
- Previous flyers feed **creative reference library** (future Engine — not required at launch).

### Output artifact

`BrandAssetLibrary` — storage references + confirmed color tokens.

---

## Step 8 — Calendar Import

**Screen title:** *"Let's plan your whole school year."*  
**Subtitle:** *Upload your district calendar. CampaignOS will sort events and suggest what needs a campaign.*

### Flow

1. **Upload** — PDF, ICS, CSV, or paste dates (same as v1 Calendar Import).
2. **Extract & categorize** — AI/rules classify: PTO Event · School Event · Holiday · Early Release · Other.
3. **Apply defaults** — each row receives:
   - Committee owner (from Step 5)
   - Communication Strategy (from Step 5, overridable)
   - Suggested playbook (when Full Campaign or Reminder Only)
4. **Review table** — enhanced Calendar Review:

| Column | Description |
|--------|-------------|
| Event name | Editable |
| Date | Editable |
| Category | Badge |
| Strategy | Dropdown: Full Campaign · Reminder Only · Calendar Only · Custom |
| Owner | Role dropdown from Step 3 |
| Status | Ready · Needs Review · Conflict |

5. **Bulk actions** — "Mark all holidays as Calendar Only," "Mark all PTO events as Full Campaign."

### CampaignOS suggestions (example logic)

| Category | Default strategy | Rationale |
|----------|-----------------|-----------|
| PTO Event | Full Campaign | Needs full comms plan |
| School Event | Reminder Only | Awareness, not marketing |
| Holiday | Calendar Only | No comms workload |
| Early Release | Calendar Only | Date visibility only |
| Fundraiser (PTO) | Full Campaign | Revenue-critical |

### Output artifact

`ImportedEventBatch[]` — events ready for workspace creation with strategy + owner pre-applied.

**Key metric for Step 9:** count of events where strategy ≠ Calendar Only → **"campaigns identified."**

---

## Step 9 — Review Organization

**Screen title:** *"Your organization profile is ready."*  
**Subtitle:** *Here's what CampaignOS learned. You can edit any of this later.*

### Summary checklist (dynamic counts)

```
✓ Organization configured          Lincoln Elementary PTO · 2025–2026
✓ Workflow model                   Committee-driven
✓ 8 leadership roles               President, VP Communications, …
✓ Responsibility matrix            10 functions assigned
✓ 6 committee defaults             Book Fair → Book Fair Chair · Full Campaign
✓ Communication voice              Warm and welcoming · Emojis: sometimes
✓ Brand assets                     Logo uploaded · 2 reference flyers
✓ 38 events imported               26 campaigns identified · 12 calendar-only
```

### Visual summary sections

1. **Identity card** — school name, colors, logo thumbnail.
2. **How you work** — workflow model in plain language.
3. **Who owns what** — compact matrix preview (top 5 rows + "see all").
4. **Voice preview** — sample generated post in org voice.
5. **Year at a glance** — mini calendar heatmap: campaign events vs calendar-only.

### Primary actions

- **Edit** — jump back to any step (accordion or step list).
- **Looks good — launch** → Step 10.

### Emotional intent

Jamie feels: *"CampaignOS already did the hard thinking. I just confirmed."*

---

## Step 10 — Launch

**Screen title:** *"Your Communications Operating System is ready."*

### Body copy (example)

> You imported **38 events** and CampaignOS identified **26 campaigns** for the 2025–2026 school year.  
> Responsibility defaults are set. Your voice and brand are loaded.  
> **Next:** open your Calendar Command Center to see the full year.

### Primary CTA

**Open Calendar Command Center** → `/calendar` (Planning tab default)

### Secondary CTAs

- View Dashboard
- Review imported events (Calendar → Review Imports tab)
- Organization Settings (edit profile)

### First-run overlay (Calendar Command Center)

Brief coach marks (3 max):

1. **Planning tab** — *"What communication work is due."*
2. **Events tab** — *"What's happening at school."*
3. **Filters** — *"Filter by owner, channel, or strategy."*

Dismiss permanently after first visit.

---

## Experience Variants

The software stays **one product**. Only onboarding depth and default density change.

### Comparison matrix

| Dimension | Solo | Small Team | Full Board |
|-----------|------|------------|------------|
| **Step 2 selection** | Solo Communications | Leadership Team | Committee-Driven |
| **Step 3 roles** | 1 card (Communications Lead) | 4–6 leadership roles | Full roster + custom |
| **Step 4 matrix** | Auto-filled, collapsible | Pre-filled, editable | Full grid, required |
| **Step 5 committees** | Strategy defaults only; owner = self | Leadership owners + strategies | Full committee mapping |
| **Approvals default** | Self or Principal | President | President or VP Comms |
| **Calendar import owner column** | Hidden (all Jamie) | Visible, optional | Visible, encouraged |
| **Step 9 summary emphasis** | Campaign count + voice | Roles + matrix | Full matrix + committees |
| **Time to complete** | 12–18 min | 18–25 min | 25–35 min |

---

### Single-user experience

**Persona:** Jamie alone — "I do everything."

**Onboarding behavior:**
- Step 2 selects Solo → Steps 3–5 collapse into a single **"You're the communications team"** confirmation screen.
- Responsibility matrix hidden behind "Advanced" expand — all channels → Communications Lead.
- Committee ownership shows **Communication Strategy defaults only** (still critical for year planning).
- Copy emphasizes: *"When your board grows, you can add roles anytime."*

**After onboarding:**
- Calendar shows all work assigned to Jamie.
- Approval workflow simplified (optional self-approve with audit log).
- No empty "unassigned" filters — product never feels like it's waiting for a team.

**Software simplicity rule:** Same calendar, same workspaces — assignment labels always show "Communications Lead" instead of "Unassigned."

---

### Small-team experience

**Persona:** Jamie + President + one or two VPs.

**Onboarding behavior:**
- Step 3 pre-enables President, VP Communications, VP Events, Creative Chair.
- Step 4 pre-fills matrix with leadership-appropriate defaults; user adjusts 2–3 rows typically.
- Step 5 maps major event types to VPs (not full committee roster).
- Calendar import shows **Owner** column with role names; names optional.

**After onboarding:**
- Calendar filters by role useful but not overwhelming.
- Approval defaults to President for board-facing channels (newsletter, website).
- Publishing may be VP Communications.

**Software simplicity rule:** Never require inviting users during onboarding. Roles appear as **labels and filters** until auth/multi-user ships.

---

### Full-board experience

**Persona:** Large PTO — committees own Book Fair, Hospitality, Fundraising independently.

**Onboarding behavior:**
- Full Steps 3–5 with custom role creation encouraged.
- Responsibility matrix is a **centerpiece screen** — "This is how CampaignOS will route work."
- Committee ownership maps event types to committee chairs.
- Calendar import emphasizes per-row owner + strategy review.

**After onboarding:**
- Calendar Command Center filters by committee/owner are primary navigation aid.
- Event Workspace shows owner badge from import defaults.
- Future: committee chairs receive scoped views (their events only).

**Software simplicity rule:** Committee-driven orgs see **more structure in onboarding**, not more nav items. Depth is in data model and filters, not new top-level screens.

---

## Relationship to Existing Product Surfaces

| Current (v1 / Release 0.5) | Future (this blueprint) |
|----------------------------|-------------------------|
| School Setup wizard (`/school-setup`) | Absorbed into Steps 1, 7, partial 6 |
| Calendar Review (`/calendar/review`) | Step 8 + Review Imports tab |
| AI Brain (`/settings/ai-brain`) | Step 6 Communication Style |
| Communication Strategy per event | Step 5 defaults + Step 8 per-row override |
| Calendar Command Center (`/calendar`) | Step 10 launch destination |
| Playbook assignment | Auto from Step 5 + Step 8 when strategy warrants |

**Navigation note (future):** "School Setup" may become **"Organization"** in Settings for re-entry; first-run is a dedicated `/onboarding` flow with progress persistence.

---

## Data Artifacts (Conceptual — No Schema Here)

Onboarding produces an **Organization Profile Package**:

```
OrganizationIdentity
OrganizationWorkflowModel
OrganizationRole[]
ResponsibilityMatrix
CommitteeOwnershipDefaults
OrganizationVoiceProfile
BrandAssetLibrary
ImportedEventBatch[]
OnboardingCompletionMeta { completedAt, workflowModel, version }
```

These feed:

- **Calendar Command Center** — events, strategies, owners, filters
- **Event Workspace** — inherited owner, strategy, playbook
- **Communication Timeline** — auto-assignment from matrix
- **AI generation** — voice profile + brand + context
- **Approval workflow** — approver role from matrix
- **Publishing Center** — publisher role from matrix

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Onboarding completion rate | > 80% of signups |
| Median time to complete (solo) | < 18 minutes |
| Median time to complete (committee) | < 35 minutes |
| Events imported per org | > 20 median |
| Campaigns identified / imported | > 50% (rest calendar-only — intentional) |
| User confidence (survey) | "CampaignOS understands our org" ≥ 4.5/5 |
| Time to first Calendar Command Center visit | < 5 minutes after Step 10 |

---

## Failure Modes to Avoid

| Anti-pattern | Why it hurts |
|--------------|--------------|
| Asking for user accounts during onboarding | Jamie isn't ready to invite the board on day one |
| Blank responsibility matrix | Feels like homework; defeats "Communications Director" promise |
| Skipping Communication Strategy on import | Re-creates "every event gets a full campaign" overload |
| Separate AI Brain settings screen | Splits voice from identity; Jamie won't find it |
| Dumping to empty Dashboard after setup | No payoff moment; Calendar Command Center is the reward |
| One-size onboarding for all org sizes | Solo users feel overwhelmed; committees feel underspecified |

---

## Open Questions (Future Design Sessions)

1. **Re-onboarding mid-year** — new board takes over in January; how much carries forward?
2. **Multi-school districts** — one PTO, multiple campuses (out of scope for MVP).
3. **Principal participation** — invite principal to approve morning announcements only?
4. **Import without calendar** — manual event entry path for orgs without PDF calendar.
5. **Onboarding progress save** — email resume link vs local persistence.

---

## Document Index

| Related doc | Relationship |
|-------------|--------------|
| `02_CUSTOMER_JOURNEY.md` | Stage 2–3 updated by this flow |
| `04_SCREEN_BLUEPRINTS.md` | Screen 2 (School Setup) superseded for first-run |
| `06_COMMUNICATION_PLAYBOOK.md` | Playbooks assigned from Step 5 + 8 defaults |
| `07_AI_BRAIN.md` | Voice inputs move to Step 6 |
| `08_COMMUNICATION_TIMELINE.md` | Timelines created post-import for campaign events |
| `09_APPROVAL_WORKFLOW.md` | Approver from Step 4 matrix |
| `03_INFORMATION_ARCHITECTURE.md` | Organization hierarchy enriched |

---

## Summary

Organization Onboarding transforms CampaignOS from *event software* into an **organization-aware Communications Operating System**. By learning identity, workflow, roles, responsibilities, voice, brand, and calendar in one guided hire-a-Communications-Director flow, the product can propose a full school year with strategies, owners, and timelines — while staying simple for solo volunteers through progressive disclosure, not separate products.

**Next implementation engine (when approved):** Organization Onboarding — not Engine 7. This document is the product source of truth until build begins.
