# CampaignOS 2.0 — Event Workspace

**Purpose:** Define the Event Workspace — the central unit of CampaignOS and the home for every PTO event.  
**Last updated:** June 2026

---

## What the Event Workspace Is

The Event Workspace is **not an edit page.**

It is a **project management home** for a single school event — the place where a Communications Chair plans, generates, reviews, approves, and publishes every piece of communication related to that event.

If CampaignOS is an operating system, the Event Workspace is the **application** that runs inside it.

---

## What the Event Workspace Is Not

- Not a form to fill out and leave
- Not a list of disconnected AI outputs
- Not a duplicate of the Events list
- Not a settings page

Jamie opens the workspace and *stays* — working through the event's communication plan over days or weeks.

---

## Entry Points

Jamie arrives at an Event Workspace from:

| Source | Context |
|--------|---------|
| **Events list** | "Open Workspace" on any event card |
| **Dashboard** | Today's Action or Upcoming Event link |
| **Calendar Review** | After importing a confirmed event |
| **Approval Center** | Dana deep-links for full event context |
| **Publishing Center** | Jump to source event for a publish item |

Every path lands on the same workspace URL: `/events/[event-name-or-id]`

---

## The Hero

The hero is the emotional anchor. Jamie should understand the event's status in 3 seconds.

### What the user sees

**Left side:**
- Category badge: "PTO Event" · "School Event" · "Fundraiser"
- Event name — large, confident typography
- Date · time · location — with icons
- Event owner: "Jamie M. · Communications Chair"

**Right side:**
- **Countdown card**
  - "12 days away" or "Today" or "Event completed"
  - Subtle progress toward event date
- **Status badge**
  - Planning · In Progress · Awaiting Approval · Ready to Publish · Complete
- **Progress ring**
  - "5 of 9 communications ready"
  - Segments: draft · generated · approved · published

**Quick actions:**
- Back to Events
- Generate All Drafts
- Submit for Board Approval
- View Publishing Queue (when items are approved)

### Why the hero exists

Jamie glances at the hero and knows: *where we are in time, what's left to do, and whether the board is blocking us.*

No scrolling required for situational awareness.

---

## Section 1: Event Overview

### Purpose
Capture the context the AI Brain needs to generate accurate communications.

### What the user sees

Editable fields in a clean two-column form:

| Field | Example |
|-------|---------|
| Description | "Annual fall book fair supporting the library fund..." |
| Time | 5:00 PM – 8:00 PM |
| Location | Lincoln Elementary Gymnasium |
| Audience | All families and staff |
| Theme | Reading adventure / community |
| Event Owner | Jamie M. |
| Budget | $500 planned (placeholder) |
| Volunteer Needs | 8 volunteers for setup and checkout |

**Save Overview** button with confirmation toast.

### Why it exists

Event context drives every generated asset. Jamie updates details once; all communications reflect the change on next generation.

### Reduces workload by

Eliminating repeated context entry across channels. Write the description once — the AI Brain adapts it for Facebook, newsletter, and morning announcements.

---

## Section 2: Event Resources (Future)

### Purpose
Curated links and files the PTO uses to run the event — and that the AI Brain pulls into generated communications automatically.

### What the user sees

A **Resources** panel with typed link cards:

| Resource type | Example |
|---------------|---------|
| Signup Genius | Volunteer shift signup |
| Registration link | Event registration URL |
| Google Form | Supply donations form |
| Donation link | PayPal or school payment portal |
| Sponsor form | Business sponsorship intake |
| Amazon Wishlist | Teacher supply wishlist |
| Membership Toolkit page | PTO membership portal |
| Google Docs / Sheets | Shared planning documents |
| PDFs | Price lists, maps, permission slips |
| Canva links | Editable design templates |
| Other URLs | Any additional link |

**Each resource card:**
- Type icon and label
- URL with copy button
- Optional description: "Use for volunteer signup CTAs"
- "Used in communications" indicator when AI has inserted the link

**Add Resource** button — paste URL, select type, save.

### Smart Links (future AI behavior)

When Jamie generates a Facebook post that mentions volunteer signup, the AI Brain inserts the correct Signup Genius link from Resources — not a placeholder.

Same for donation links in fundraiser copy, registration URLs in save-the-date posts, and Canva links in creative briefs.

### Why it exists

Links scatter across email threads, Google Drive folders, and last year's Facebook posts. Resources centralizes them — and makes generated copy actionable on first draft.

### Not in current sprint

Resources section and Smart Links are **future build**. See `13_INNOVATION_BACKLOG.md`.

---

## Section 3: Communication Timeline

### Purpose
The communication plan — auto-generated from the event's Communication Playbook.

This is the **most important section** in the workspace. It answers: *"When am I supposed to say what?"*

### What the user sees

A vertical timeline with numbered nodes, each representing a countdown milestone:

**Example: Book Fair playbook**
```
✓  30 days · Save the Date          · Website, Newsletter        · Complete
✓  14 days · Two-Week Reminder       · Facebook, Instagram        · Approved
→  7 days  · One-Week Push           · Facebook, Email            · Due Today
   3 days  · Final Reminder           · Instagram Story            · Upcoming
   1 day   · Day Before               · Facebook, Announcements    · Upcoming
   0 days  · Day Of                   · All channels               · Upcoming
  +1 day   · Thank You                · Newsletter, Facebook       · Upcoming
```

**Each node shows:**
- Countdown label and absolute date
- Channels included (icons)
- Status: Upcoming · Due Today · Overdue · Draft Ready · Approved · Published
- Expand to see linked asset previews
- Actions: Review · Edit · Approve · Publish · Skip

**Timeline header:**
- Playbook name: "Book Fair Playbook"
- "7 communications over 32 days"
- Link: "Change playbook" (reassign event type)

### Why it exists

Planning *when* to communicate is the hidden workload that burns volunteers out. The timeline eliminates it entirely.

### Reduces workload by

Replacing manual calendar planning, spreadsheet reminders, and mental tracking with an auto-generated, event-aware schedule.

### Workload warnings (future)

When this event's timeline nodes stack with other events on the same day, Jamie sees a warning in the timeline header:

> "October 3 is a heavy day — 4 communications due across 2 events."

Link to Workload Calendar for week-level view and rescheduling suggestions.

### Behavior when event date changes

All timeline nodes recalculate automatically. Jamie reschedules the Book Fair from October 4 to October 11 — every node shifts by 7 days. She sees: "Timeline updated. 7 dates shifted."

---

## Section 4: Communications Hub

### Purpose
Channel-specific content — the *what* that maps to timeline nodes.

### What the user sees

Nine channel cards in a responsive grid:

1. Website Announcement
2. Newsletter
3. Facebook
4. Instagram
5. Email
6. Flyer
7. Principal Notes
8. Morning Announcements
9. Volunteer Signup

**Each card contains:**
- Channel name and icon
- Status badge: Draft · Generated · Approved · Published
- "Published" badge when live
- Last updated timestamp
- 2-line content preview
- Actions: **Generate** · **Preview** · **Approve**

**Bulk actions:**
- Generate All Drafts
- Submit All for Approval

### Why it exists

PTOs communicate across many channels with different formats and tones. The Communications Hub ensures every channel is covered — nothing forgotten.

### Reduces workload by

- Generating channel-appropriate content from one event context
- Showing at a glance which channels still need work
- Linking each card to its timeline node(s)

### Preview experience

Clicking Preview opens a modal showing the full content formatted for that channel — how it would appear on Facebook, in a newsletter, etc. Jamie reads, edits if needed, closes.

---

## Section 5: Creative Assets

### Purpose
Visual files and creative briefs for the event.

### What the user sees

Six asset cards:

| Asset | Purpose |
|-------|---------|
| Hero Image | Website banner, newsletter header |
| Square Graphic | Facebook/Instagram feed post |
| Instagram Story | Vertical story format |
| Flyer | Printable PDF for school walls |
| Logo | PTO/school logo overlay |
| Documents | Volunteer forms, price lists, etc. |

**Each card contains:**
- Thumbnail or elegant placeholder
- Filename or "No file uploaded"
- Status: Pending · Uploaded · Placeholder
- Future badge: "AI Generation — Coming Soon"
- Actions: Upload · Replace · Preview

### Why it exists

Visual assets are half of school event communication. They belong with the event — not scattered in Google Drive, Canva, or a volunteer's camera roll.

### Reduces workload by

Centralizing creative files and (future) auto-generating artwork briefs and images from event context.

---

## Section 6: Creative Intelligence (Future)

### Purpose
Turn past school artwork into inspiration for modern, on-brand creative — without copying old designs.

### What the user sees

**Inspiration uploads:**
- Old flyers, screenshots, Canva exports, PDFs, reference images
- Drag-and-drop or file picker
- Thumbnail gallery with upload date and notes

**AI analysis** (not current sprint):
- Layout structure, style, spacing, tone, colors, design language
- "This flyer uses bold headers, warm autumn palette, centered hero image"

**Modernization output:**
- AI generates new artwork applying the **school brand kit**
- Does **not** copy the original design — interprets and modernizes
- Jamie reviews, adjusts, approves

### Future modules (see `13_INNOVATION_BACKLOG.md`)

| Module | Role |
|--------|------|
| **Inspiration Library** | Org-wide gallery of past artwork and reference images |
| **Brand DNA** | Extracted visual identity patterns from brand kit + past materials |
| **Style Engine** | Rules for applying brand DNA to new creative |
| **Learning Engine** | Improves over time from approved/rejected creative choices |

### Why it exists

Every PTO has a folder of "last year's flyer." Creative Intelligence makes that folder useful — not as a copy-paste source, but as a design brief the AI understands.

### Not in current sprint

Inspiration uploads, Brand DNA, Style Engine, and Learning Engine are **future build**.

---

## Section 7: Activity & History

### Purpose
Audit trail and lifecycle record for the event.

### What the user sees

A chronological log:

```
Aug 15 · Calendar imported · Book Fair detected from district calendar
Aug 15 · Workspace created · Book Fair playbook assigned
Aug 16 · Communications generated · 9 channel drafts created
Aug 18 · Submitted for approval · Sent to Dana for board review
Aug 19 · Board approval · Website announcement approved
Sep 22 · Published · Save the Date posted to website and newsletter
...
```

**Timeline visualization** (existing v1 pattern, enhanced):
- Calendar Imported → Workspace Created → Communications Generated → Board Approval → Published → Event Completed

### Why it exists

Board accountability. Year-end reporting. Succession planning — next year's Chair inherits a clear record.

### Reduces workload by

Eliminating "did we already post that?" confusion. Everything is logged.

### Organizational Memory (future)

Each event retains history **year over year**. CampaignOS remembers:

- Last year's flyers and creative assets
- Communication timelines and what was published when
- Results and on-time rates
- Notes and lessons learned
- Links and resources used
- Approval history and board feedback

**Future event actions:**
- **Clone from prior year** — duplicate workspace structure, playbook, resources, and notes into a new event
- **Learn from prior year** — AI suggests timeline adjustments based on last year's execution

Jamie creates "Fall Book Fair 2026" and sees: "2025 Book Fair available — clone timeline and resources?"

This is the succession planning layer — next year's Chair inherits an operating record, not a blank slate.

See `13_INNOVATION_BACKLOG.md` and `11_ANALYTICS.md`.

---

## Section 8: Collaboration Hub (Future — Not Current Sprint)

### Purpose
Event-specific coordination without building live chat yet.

### What the user sees (future)

A **Collaboration** panel within the workspace:

| Activity type | Example |
|---------------|---------|
| Status updates | "Jamie marked 7-day Facebook post as published" |
| Comments | "Can we mention the new payment option?" |
| @mentions | "@Dana please review the flyer copy" |
| Approval comments | Dana's feedback attached to specific items |
| System activity | Timeline regenerated, playbook changed |
| AI status summaries | "Book Fair is 60% complete — 2 items awaiting approval" |

### What we are NOT building yet

- Live chat or real-time messaging
- Slack-style channels
- Push notifications for every comment

The Collaboration Hub is **async coordination** — comments and activity tied to the event, not a separate chat product.

### Why it exists

Board members and co-chairs need context without email threads. Approval comments, status updates, and AI summaries keep everyone aligned inside the workspace.

### Not in current sprint

Collaboration Hub is **future build**. Do not implement live chat in initial releases.

---

## Workspace States

The workspace visually adapts to lifecycle stage:

| State | Hero indicator | Primary action |
|-------|---------------|----------------|
| **Planning** | Gray status · empty timeline | "Generate communication plan" |
| **In Progress** | Blue status · partial timeline | "Continue: 7-day reminder due today" |
| **Awaiting Approval** | Amber status · board badge | "Waiting on Dana — 3 items" |
| **Ready to Publish** | Green status · approved items | "Publish 2 approved posts" |
| **Complete** | Muted status · full timeline green | "View summary" |

Jamie always knows which state she's in without reading documentation.

---

## Workspace Progress Model

Progress is measured in communications, not arbitrary percentages:

```
Communications: 5 ready · 2 approved · 1 published · 1 overdue
Timeline:       3 of 7 nodes complete
Approval:       2 of 5 items approved
Publishing:     1 of 2 approved items published
```

The progress ring in the hero aggregates these into one visual: **"You're 60% done with Book Fair communications."**

---

## Relationship to Communication Playbooks

When an event workspace is created:

1. Event type is assigned (manually or from calendar import)
2. Matching Communication Playbook is applied
3. Timeline nodes are auto-generated with dates relative to event date
4. Channel mapping per node is inherited from playbook
5. AI Brain generates content for each node on demand or in bulk

Jamie does not configure the timeline. She inherits it and edits if needed.

---

## Relationship to the AI Brain

The AI Brain reads:
- Event Overview fields
- Organization voice and brand
- Playbook context (event type, audience expectations)
- Timeline node (countdown context: "7 days out" vs. "day of")
- Event Resources (future) — correct links for CTAs
- Creative Intelligence inspiration (future) — style and tone cues
- Organizational Memory (future) — prior-year execution patterns

And produces:
- Channel-appropriate copy for each Communications Hub card
- Creative briefs for asset cards
- Timeline-linked reminder messages

Jamie never talks to the AI Brain directly. She clicks Generate and receives drafts.

---

## Mobile Experience

On mobile, the workspace stacks vertically:

1. Hero (compact)
2. Next Action card (prominent — "Due today: 7-day Facebook post")
3. Communication Timeline (scrollable)
4. Communications Hub (single column)
5. Event Resources (future — collapsed accordion)
6. Creative Assets (collapsed accordion)
7. Activity (collapsed accordion)
8. Collaboration Hub (future — collapsed accordion)

The mobile workspace optimizes for **doing the next thing**, not browsing all sections.

---

## Delight Details

Small moments that make the workspace feel premium:

- Countdown updates daily without refresh
- Confetti micro-animation when all communications are published (subtle)
- "Nice work" confirmation when marking an item published
- Timeline node slides to green when complete
- Empty channel cards show a gentle illustration, not a blank box
- Event date change shows a friendly "Timeline updated" toast with shift summary

---

## Success Criteria

Jamie opens the Book Fair workspace and within 30 seconds can answer:

1. When is the event?
2. What's due today or this week?
3. What still needs board approval?
4. What's already published?
5. What should I do next?

If she can answer all five without leaving the workspace, the design succeeds.

---

## What Exists Today (v1 Foundation)

The current Event Workspace (Sprint 5) includes:
- Hero with countdown and status
- Event Overview (editable)
- Communications Hub (9 channel cards)
- Creative Assets (6 asset cards)
- Timeline (mock lifecycle)

**Not yet built (future — see `13_INNOVATION_BACKLOG.md`):**
- Event Resources / Smart Links
- Creative Intelligence / Inspiration Library
- Collaboration Hub
- Organizational Memory / prior-year clone

CampaignOS 2.0 transforms this shell into the fully connected operating system described above — with live playbooks, intelligent timelines, approval flows, publishing loops, and year-over-year memory.
