# CampaignOS 2.0 — Innovation Backlog

**Purpose:** Capture future product concepts that extend the operating system beyond the current sprint scope.  
**Status:** Ideas and direction — **not current sprint**  
**Last updated:** June 2026

---

## How to Read This Document

Every item below is a **future concept**. None of these are committed for immediate build. They are organized by theme, labeled with maturity (Exploring · Planned · Future), and linked to the blueprint documents they would extend.

When an idea graduates to active development, it moves from this backlog into `12_FUTURE_ROADMAP.md` with a phase and exit criteria.

---

## 1. Workload Calendar

**Maturity:** Planned (Phase 3–4)  
**Extends:** `03_INFORMATION_ARCHITECTURE.md`, `04_SCREEN_BLUEPRINTS.md`, `08_COMMUNICATION_TIMELINE.md`

### Concept

A dedicated **Workload Calendar** that shows PTO volunteers both **school events** and **communication work** in one place — not just dates on a calendar, but the work required to communicate about those dates.

### Core capabilities

| Capability | Description |
|------------|-------------|
| **List view** | Chronological task list — events and communications sorted by due date |
| **Week view** | What communication work is due each day this week |
| **Month view** | Event density + communication workload heatmap |

### Calendar modes

Users toggle what the calendar surfaces:

| Mode | Shows |
|------|-------|
| **Events** | School events only — when things happen |
| **Communications** | Timeline nodes due — when Jamie needs to write, review, or post |
| **Publishing** | Approved items ready to go live |
| **Approvals** | Items waiting on board review |

### Workload warnings

When too many communications stack on one day, CampaignOS surfaces a **workload warning**:

> "Heavy communication day — 6 items due October 3. Consider spreading 2 items to adjacent days."

Warnings appear in:
- Workload Calendar (Month and Week views)
- Dashboard (proactive alert)
- Event Workspace (when editing timeline)

CampaignOS may suggest:
- Shifting optional playbook nodes
- Combining channels into fewer posts
- Delegating items to a co-chair (future)

### Why it exists

Jamie does not think in isolated events. She thinks: *"What does this week look like?"* The Workload Calendar answers that at a glance — and prevents burnout from invisible pile-ups.

### Not in current sprint

List/Week/Month views, calendar modes, and workload warnings are **future build**.

---

## 2. Event Resources / Smart Links

**Maturity:** Planned (Phase 4)  
**Extends:** `05_EVENT_WORKSPACE.md`, `07_AI_BRAIN.md`

### Concept

Each Event Workspace includes a **Resources** section — a curated list of links and files the PTO uses to run the event. The AI Brain eventually pulls the correct link into generated communications automatically.

### Supported resource types

| Type | Example use |
|------|-------------|
| SignUp Genius link | Volunteer shift signup |
| Registration link | Event registration form |
| Google Form | Feedback, RSVP, volunteer interest |
| Donation link | PayPal, Givebutter, school payment portal |
| Sponsor form | Business sponsorship interest |
| Amazon Wishlist | Supply donations |
| Membership Toolkit page | PTO membership signup |
| Google Docs | Shared planning documents |
| Google Sheets | Budget trackers, volunteer rosters |
| PDFs | Permission slips, price lists, maps |
| Canva links | Editable design templates |
| Other URLs | Any link the PTO needs |

### What the user sees

A Resources panel in the Event Workspace:

```
Resources · Fall Book Fair

📋 Volunteer Signup · SignUp Genius        [Copy link] [Edit]
📝 Registration · Google Form              [Copy link] [Edit]
💰 Donations · Givebutter                  [Copy link] [Edit]
📄 Price List · book-fair-prices.pdf       [Preview] [Replace]
🎨 Flyer Template · Canva link             [Open ↗] [Edit]

[+ Add resource]
```

Each resource has:
- Label (human-readable name)
- Type (from list above)
- URL or file
- Notes (optional — "Use for volunteer posts only")
- **Smart Link tag** — AI may include this in generated copy

### Smart Links (future AI behavior)

When the AI Brain generates a Volunteer Signup post, it automatically inserts the SignUp Genius link from Resources — not a placeholder `[LINK]`.

When generating a donation appeal, it pulls the Donation link.

Jamie never hunts for links in last year's Facebook posts.

### Why it exists

PTO events depend on a web of external tools. Resources centralize them. Smart Links eliminate the #1 edit volunteers make after AI generation: adding the correct URL.

### Not in current sprint

Resources section, resource types, and Smart Link AI injection are **future build**.

---

## 3. Creative Intelligence

**Maturity:** Exploring → Planned (Phase 5–6)  
**Extends:** `05_EVENT_WORKSPACE.md`, `07_AI_BRAIN.md`, `12_FUTURE_ROADMAP.md`

### Concept

CampaignOS should not just generate copy — it should **learn from a school's visual history** and produce modern, on-brand creative that respects what came before without copying it.

### Inspiration uploads

Users upload reference material for an event or organization:

- Old flyers (PDF, PNG, JPG)
- Screenshots of past social posts
- Canva exports
- Photos from previous years
- Hand-drawn mockups from volunteers

**Critical rule:** AI must **not copy** the original design. It analyzes and modernizes.

### What AI analyzes

| Dimension | Example insight |
|-----------|-----------------|
| **Layout** | "Flyers use centered headline, image below, details at bottom" |
| **Style** | "Hand-drawn, playful, elementary-school friendly" |
| **Spacing** | "Generous whitespace, large headline, compact body" |
| **Tone** | "Enthusiastic, exclamation-light, family-focused" |
| **Colors** | "Heavy use of school blue and gold; avoid red" |
| **Design language** | "Rounded corners, illustrated icons, no stock photography" |

### Output behavior

CampaignOS applies insights to produce **new artwork** that:
- Feels like the school's established visual identity
- Uses the current **Brand Kit** (logos, colors, fonts from School Setup)
- Looks modern and polished — not a dated Canva template from 2019
- Is appropriate for the event type and audience

Jamie uploads last year's Book Fair flyer. CampaignOS generates a fresh 2026 version that parents recognize as "Lincoln Elementary" but looks current.

### Creative Intelligence modules (future)

| Module | Purpose |
|--------|---------|
| **Inspiration Library** | Org-level archive of past flyers, posts, and reference images — searchable by event type and year |
| **Brand DNA** | Extracted visual identity profile: colors, typography tendencies, layout preferences, tone markers |
| **Style Engine** | Applies Brand DNA + inspiration analysis to new creative generation |
| **Learning Engine** | Improves over time based on which designs Jamie approves, edits, or rejects |

### Inspiration Library (future module)

Organization-level library accessible from Settings and Event Workspace:

- Browse past years' creative by event type
- Tag: Book Fair 2024, Fall Festival 2023, etc.
- "Use as inspiration" action on any archived item
- AI analyzes selected item — does not reproduce it

### Why it exists

PTOs reuse the same visual language year after year — but manually in Canva. Creative Intelligence captures that language and accelerates it, while keeping each year fresh.

### Not in current sprint

Inspiration uploads, Brand DNA, Style Engine, Learning Engine, and Inspiration Library are **future build**. Current Creative Assets section supports file upload only.

---

## 4. Collaboration Hub

**Maturity:** Future (Phase 7+)  
**Extends:** `05_EVENT_WORKSPACE.md`, `09_APPROVAL_WORKFLOW.md`  
**Explicitly deferred:** Do not build live chat in current or near-term sprints.

### Concept

Each Event Workspace may eventually include a **Collaboration Hub** — an event-specific activity and discussion space for the PTO team.

### Planned capabilities (all future)

| Capability | Description |
|------------|-------------|
| **Event-specific chat** | Threaded conversation scoped to one event — not org-wide Slack |
| **Status updates** | "Jamie marked Book Fair flyer as approved" |
| **Comments** | Inline comments on communications, assets, timeline nodes |
| **@mentions** | "@Dana please review the Facebook post" |
| **Approval comments** | Structured feedback tied to approval workflow (extends existing request-changes flow) |
| **System activity** | Auto-logged events: generated, submitted, approved, published |
| **AI status summaries** | "Book Fair is 60% complete. 2 items awaiting Dana's approval. Next due: 7-day Facebook post on Sep 27." |

### What it is not

- Not a replacement for email or group texts (those remain valid)
- Not a general-purpose team chat app
- Not a real-time messaging product in v1 of this feature

### Design intent

When built, the Collaboration Hub should feel like **Linear comments** or **Notion page discussions** — contextual, calm, attached to the work — not a noisy group chat.

### Why it exists (future)

Small PTO teams coordinate via fragmented channels. Context gets lost. "Which flyer did Dana approve?" becomes answerable inside the workspace.

### Not in current sprint

Live chat, comments, @mentions, and Collaboration Hub UI are **explicitly not current sprint**. Approval comments may evolve from existing approval workflow first.

---

## 5. Organizational Memory

**Maturity:** Planned (Phase 6)  
**Extends:** `05_EVENT_WORKSPACE.md`, `06_COMMUNICATION_PLAYBOOK.md`, `11_ANALYTICS.md`

### Concept

CampaignOS remembers each event **year over year**. Past events become institutional knowledge — not lost when the Communications Chair rotates.

### What is retained per event (archived school years)

| Memory type | Example |
|-------------|---------|
| **Flyers and creative** | 2024 Book Fair flyer, 2025 version |
| **Communication timelines** | Which nodes were used, skipped, or shifted |
| **Results** | On-time rate, channels published, completion date |
| **Notes** | "Start volunteer signup 2 weeks earlier next year" |
| **Links and resources** | SignUp Genius, donation links from that year |
| **Approvals** | Who approved what, when |
| **Lessons learned** | Chair's end-of-event summary |

### What the user sees

When Jamie creates **Book Fair 2026**, CampaignOS surfaces:

> "You ran Book Fair in 2024 and 2025. View last year's workspace · Clone timeline · See what worked"

**Clone from prior year:**
- Copy playbook customizations
- Copy resource links (with review prompt)
- Copy lessons learned as notes
- Do NOT copy approved/published content verbatim — regenerate fresh

**Learn from prior year:**
- AI Brain references last year's successful communications as context (tone, structure — not copy)
- Timeline suggests adjustments based on notes: "Last year you noted volunteer signup was late — moved node from 7 days to 14 days"

### Succession value

Incoming Chair in August 2027 inherits:
- Three years of Book Fair history
- What channels were used
- What the board expects
- What volunteers responded to

No more "ask last year's chair over coffee."

### Why it exists

PTO volunteer turnover is annual. Institutional memory is the difference between a school that communicates consistently and one that starts over every August.

### Not in current sprint

Year-over-year archiving, clone-from-prior-year, and lessons learned are **future build** (Phase 6).

---

## 6. Additional Future Concepts

These items are captured for exploration but not yet specified in detail:

| Concept | One-line description | Maturity |
|---------|---------------------|----------|
| **Playbook Marketplace** | PTOs share custom playbooks with other PTOs | Future |
| **Workload balancing AI** | Auto-suggest spreading communications across days | Exploring |
| **Principal portal** | Read-only view for school admin to see upcoming PTO comms | Future |
| **Multi-chair roles** | Co-Communications Chair with split workload | Planned |
| **SMS reminders** | Text volunteers when their comm task is due | Future |
| **Translation layer** | Generate communications in languages spoken by school families | Future |
| **District view** | Superintendent sees aggregate comm health across schools | Future |
| **Voice input** | "Add the spring carnival to the calendar" | Exploring |

---

## Priority Ranking (Product Opinion)

When these concepts graduate from backlog to roadmap, suggested order:

| Priority | Concept | Rationale |
|----------|---------|-----------|
| 1 | Event Resources / Smart Links | High value, low complexity, immediate AI synergy |
| 2 | Workload Calendar | Directly reduces decision fatigue and burnout |
| 3 | Organizational Memory | Retention and succession — sticky long-term value |
| 4 | Creative Intelligence | Differentiation — but depends on Brand Kit maturity |
| 5 | Collaboration Hub | Useful but not blocking core loop |

---

## Document Cross-References

| Backlog theme | Primary blueprint docs updated |
|---------------|-------------------------------|
| Workload Calendar | 03, 04, 08, 12 |
| Event Resources | 05, 07, 12 |
| Creative Intelligence | 05, 07, 12 |
| Collaboration Hub | 05, 09, 12 |
| Organizational Memory | 05, 06, 11, 12 |

---

## Explicit Non-Goals (Backlog)

These will not be pursued even as future concepts:

- Real-time chat as a standalone product
- Copying copyrighted designs from inspiration uploads
- Auto-posting without approval
- Engagement optimization dashboards
- Non-PTO organization types (until PTO PMF proven)

---

*This document is a living backlog. Add ideas here. Promote ideas to the roadmap when ready. Nothing in this file is a commitment to build.*
