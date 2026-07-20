# CampaignOS 2.0 — Screen Blueprints

**Purpose:** Describe what the user sees on every major screen — layout, content, actions, and emotional intent.  
**Last updated:** June 2026

---

## Design Language

CampaignOS 2.0 should feel like **Apple × Notion × Linear**:

- Large whitespace. Nothing crowded.
- Rounded cards with subtle shadows.
- Indigo accent on neutral slate palette (carried from v1).
- Typography hierarchy: one clear headline per screen, supportive subtext.
- Progress indicators over bullet lists.
- Empty states that teach, not scold.

Every screen answers: **"What should I do next?"**

---

## Screen 1: Dashboard

### Purpose
Jamie's daily home. Surfaces today's priorities and weekly context without overwhelm.

### What the user sees

**Header**
- Greeting: "Good evening, Jamie"
- Active school year badge: 2025–2026
- Subtle year progress: "18 of 24 events on track"

**Section: Today's Actions** (hero section)
- 1–3 cards, each with:
  - Action label: "Post Book Fair 7-day reminder"
  - Event name and due date
  - Channel icon (Facebook, Newsletter, etc.)
  - One primary button: "Do this now"
- If nothing due: calm empty state — "You're all caught up for today."

**Section: Waiting on Board**
- Compact list of items pending Dana's approval
- Count badge: "3 awaiting approval"
- Each row: event · channel · submitted date
- Action: "Send reminder to board" (future)

**Section: This Week**
- Horizontal timeline strip showing due items Mon–Sun
- Dots on days with actions due
- Click any day → filtered action list
- Link: "Open Workload Calendar" (future) — full List/Week/Month views with calendar modes

**Section: Workload Warnings** (future)
- Alert when multiple communications stack on one day: "Heavy day — 6 items due Thursday"
- Link to Workload Calendar in Communications mode for rescheduling suggestions

**Section: Upcoming Events**
- Next 5 events with workspace status pills
- Planning · In Progress · Complete
- Link: "Open workspace"

**Section: Year at a Glance** (collapsed by default)
- Mini calendar heatmap or progress bar
- Events by month

### Primary actions
- Click any Today's Action → deep-link to workspace item
- Click event → Event Workspace
- Click "Import calendar" if year is empty

### Emotional intent
Calm confidence. Jamie opens the app and immediately knows her evening plan.

---

## Screen 2: School Setup

### Purpose
One-time (and occasional) organization identity configuration.

### What the user sees

**Multi-step wizard** (existing v1 pattern, enhanced for 2.0):

1. **Welcome** — value prop, time estimate ("About 10 minutes")
2. **School** — name, district, school year, principal, websites
3. **Brand** — logos, colors, font
4. **Voice** — tone selector, default hashtags, sample preview
5. **Playbooks** — review default Communication Playbooks for the org
6. **Calendar** — upload school calendar file
7. **Finish** — summary + redirect to Calendar Review or Dashboard

### Primary actions
- Continue / Back through steps
- Skip calendar (optional)
- Complete → Calendar Review (if calendar uploaded) or Dashboard

### Emotional intent
"This is our school's hub." Not "I'm configuring software."

---

## Screen 3: Calendar Import Review

### Purpose
Review extracted events before they become workspaces.

### What the user sees

**Header banner**
- Gradient hero: "Review imported events"
- File name, upload date, events detected count

**Stats row** (6 cards)
- Total Events Found · PTO Events · School Events · Holidays · Early Release · Conflicts

**Action bar**
- Import All · Review Individually · Upload Different Calendar

**Events table**
- Columns: Event Name · Date · Category · Status · Edit · Delete
- Category badges with color coding
- Status: Ready · Needs Review · Conflict

### Primary actions
- Import All → creates events + workspaces + timelines
- Edit row → inline or modal correction
- Delete row → remove from import batch
- Click imported event (future) → preview playbook assignment

### Emotional intent
Control without tedium. Jamie corrects a few dates, imports 24 events, and feels ahead of the year.

---

## Screen 4: Events List

### Purpose
Browse and access all event workspaces for the active school year.

### What the user sees

**Header**
- Title: "Events"
- Subtitle: count and date range
- Primary button: "Create Event"

**Filter bar** (lightweight)
- Status: All · Planning · In Progress · Complete
- Category: All · PTO · School · Holiday
- Sort: Date ascending (default)

**Event cards** (grid)
- Event title, date, status badge
- Category tag
- Progress pill: "5/9 communications ready"
- Countdown: "12 days away"
- Button: "Open Workspace"

**Empty state**
- Illustration + "No events yet"
- CTA: "Import your calendar" or "Create your first event"

### Emotional intent
A calm inventory of the year's work — not a overwhelming list.

---

## Screen 5: Create Event

### Purpose
Manual event creation when calendar import misses something.

### What the user sees
- Form: title, description, date, time, location, audience, theme
- **Event Type selector** — triggers Communication Playbook assignment
- Preview: "This event will use the Book Fair playbook (7 communications over 30 days)"
- Submit → creates event + workspace + auto timeline

### Emotional intent
Even manual creation feels intelligent — Jamie picks a type, CampaignOS plans the rest.

---

## Screen 6: Event Workspace

### Purpose
The project home for a single event. See dedicated doc `05_EVENT_WORKSPACE.md`.

### Layout summary

**Hero**
- Event name (large)
- Date · time · location
- Countdown · status · category · owner
- Progress ring
- Quick actions: Back to Events · Generate All · Submit for Approval
- Future: "Clone from last year" when Organizational Memory data exists

**Section 1: Event Overview** — editable details + budget/volunteer placeholders

**Section 2: Event Resources** (future) — Smart Links: Signup Genius, registration, Google Forms, donation links, Canva, PDFs, and other URLs. AI pulls correct links into generated copy.

**Section 3: Communication Timeline** — auto-generated countdown schedule

**Section 4: Communications Hub** — channel cards with generate/preview/approve

**Section 5: Creative Assets** — visual asset cards with upload/preview

**Section 6: Creative Intelligence** (future) — Inspiration Library uploads (old flyers, screenshots, Canva exports). AI analyzes layout, style, tone, and colors — modernizes past artwork using the school brand kit without copying originals.

**Section 7: Activity & History** — timeline of actions on this event; feeds Organizational Memory year over year

**Section 8: Collaboration Hub** (future — not current sprint) — event-specific comments, @mentions, approval notes, system activity, AI status summaries. No live chat in initial release.

### Emotional intent
Premium project management for volunteers. Spacious, clear, complete.

---

## Screen 7: Communication Timeline (within Workspace)

### Purpose
Show when to communicate — the heart of the operating system.

### What the user sees

**Vertical timeline** with nodes:

```
●  30 days out · Save the Date · Website + Newsletter     [Complete ✓]
●  14 days out · Two-Week Reminder · Facebook + Instagram  [Approved]
●  7 days out · One-Week Push · Facebook + Email           [Due Today ←]
○  3 days out · Final Reminder · Instagram Story           [Upcoming]
○  Day Before · Last Call · Facebook + Morning Announcements [Upcoming]
○  Day Of · Happening Today · All channels                 [Upcoming]
○  Thank You · Post-Event · Newsletter + Facebook          [Upcoming]
```

Each node expands to show:
- Due date (absolute and relative)
- Channels included
- Linked asset previews
- Status and actions: Review · Edit · Approve · Publish

**Reschedule indicator**
- If event date changes: "Timeline updated — 3 dates shifted"

### Emotional intent
Jamie sees the entire communication plan at a glance. No spreadsheet. No guesswork.

---

## Screen 8: Communications Hub (within Workspace)

### Purpose
Manage channel-specific content for the event.

### What the user sees

**Grid of channel cards** (3 columns on desktop):

| Card | Content |
|------|---------|
| Website Announcement | Status · Last updated · Preview · Generate · Preview · Approve |
| Newsletter | same pattern |
| Facebook | same pattern |
| Instagram | same pattern |
| Email | same pattern |
| Flyer | same pattern |
| Principal Notes | same pattern |
| Morning Announcements | same pattern |
| Volunteer Signup | same pattern |

Each card:
- Channel icon and name
- Status badge: Draft · Generated · Approved · Published
- Content preview (2 lines)
- Action row: Generate · Preview · Approve

**Bulk action bar**
- "Generate All Drafts" · "Submit All for Approval"

### Emotional intent
Every channel covered. Nothing forgotten. Jamie picks a card, does one thing, moves on.

---

## Screen 9: Creative Assets (within Workspace)

### Purpose
Manage visual files and creative briefs.

### What the user sees

**Grid of asset cards:**
- Hero Image · Square Graphic · Instagram Story · Flyer · Logo · Documents

Each card:
- Thumbnail or placeholder
- Filename or "No file uploaded"
- "AI Sprint 6+" badge on generative slots
- Actions: Upload · Replace · Preview

**Creative Intelligence panel** (future — see `13_INNOVATION_BACKLOG.md`):
- Upload inspiration: old flyers, screenshots, Canva exports, PDFs, reference images
- AI analyzes layout, style, spacing, tone, colors, and design language
- Generates modernized artwork applying the school brand kit — never copies the original
- Links to Inspiration Library, Brand DNA, Style Engine, and Learning Engine (future modules)

### Emotional intent
Creative files live with the event — not lost in Google Drive. Past school artwork becomes a starting point for smarter, on-brand generation.

---

## Screen 10: Approval Center

### Purpose
Dana's review queue. See `09_APPROVAL_WORKFLOW.md`.

### What the user sees

**Header:** "Communications awaiting your review"

**Queue list:**
- Event name · channel · submitted by · date
- Content preview (expandable)
- Board checklist (checkboxes)
- Actions: Approve · Request Changes

**Empty state:** "Nothing waiting — your board is all caught up."

### Emotional intent
Fast, trustworthy governance. Minutes, not meetings.

---

## Screen 11: Publishing Center

### Purpose
Close the loop on approved content. See `10_PUBLISHING_CENTER.md`.

### What the user sees

**Header:** "Ready to publish"

**Item list:**
- Approved communications sorted by due date
- Channel icon · event · content preview
- "Copy to clipboard" button
- "Mark as Published" button
- Link to channel (Facebook, etc.) — external

**Confirmation modal on publish:**
- "Mark this Facebook post as published?"
- Updates timeline and Dashboard automatically

### Emotional intent
Satisfying closure. Jamie marks it done and sees progress advance.

---

## Screen 12: Settings

### Purpose
Organization preferences and playbook management.

### What the user sees

**Tabs or sections:**
- **Organization** — name, school, mission, tone, hashtags
- **Brand** — logos, colors, fonts
- **Communication Playbooks** — view, customize, create playbooks
- **Team** (future) — invite board members, assign roles
- **School Year** — active year, archive past years

### Emotional intent
Infrequent but important. Jamie visits once a season, not daily.

---

---

## Screen 14: Workload Calendar (Future)

### Purpose
Show PTO volunteers both school events and communication work in one calendar — answering *"What does this week look like?"*

See `13_INNOVATION_BACKLOG.md` for full concept. **Not current sprint.**

### What the user sees

**View switcher:** List · Week · Month

**Mode switcher:** Events · Communications · Publishing · Approvals

| View | Primary use |
|------|-------------|
| **List** | Chronological task list — events and communications sorted by due date |
| **Week** | What communication work is due each day this week |
| **Month** | Event density heatmap + communication workload intensity |

**Workload warnings**
- Amber banner when too many communications due on one day: "Heavy communication day — 6 items due October 3"
- Suggestions: shift optional nodes, combine channels, review adjacent days

**Entry points**
- Primary nav: Workload Calendar (future)
- Dashboard "This Week" → Open Workload Calendar
- Workload warning alert → filtered day view

### Emotional intent
Jamie sees her whole communication load — not just isolated events. No invisible pile-ups. No burnout surprises.

---

## Screen 13: Analytics (Lightweight)

### Purpose
Proof of value — not optimization obsession. See `11_ANALYTICS.md`.

### What the user sees

**Year summary card:**
- Events completed: 22/24
- Communications published: 156
- On-time rate: 94%
- Channels used: Facebook, Newsletter, Website (top 3)

**Per-event analytics** (in workspace footer):
- Timeline completion: 7/7
- Channels published: 5
- Approval cycle: 1.2 days average

**Organizational Memory** (future):
- Compare to prior-year same event: on-time rate, channels used, lessons learned
- "Last year's Book Fair: 7 communications, 94% on time"

### Emotional intent
"We did our job well." Board-ready, not growth-hacker metrics.

---

## Responsive Behavior

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Dashboard Today's Actions | Full cards | Stacked cards, one action prominent |
| Workload Calendar (future) | Week/Month grid with mode tabs | List view default; swipe between days |
| Event Workspace | Multi-column sections | Stacked sections, timeline first |
| Communications Hub | 3-column grid | Single column scroll |
| Event Resources (future) | Link cards in 2-column grid | Stacked link cards |
| Approval Center | Side-by-side preview + actions | Full-width stacked |
| Publishing Center | List with inline actions | One item per screen |

---

## Empty State Principles

1. **Never blame the user.** "No events yet" not "You haven't created anything."
2. **Always offer one next action.** Every empty state has a button.
3. **Show a preview of what's coming.** Ghost cards or illustrations of the populated state.
4. **Match the emotional tone.** Calm, encouraging, PTO-appropriate.

---

## Screen Priority for 2.0 Build

| Priority | Screens |
|----------|---------|
| P0 | Dashboard (action-oriented), Event Workspace, Communication Timeline, Communications Hub |
| P1 | Calendar Review (enhanced), Approval Center, Publishing Center |
| P2 | Settings (playbooks), Analytics, Create Event (with playbook selector) |
| Future | Workload Calendar, Event Resources / Smart Links, Creative Intelligence, Collaboration Hub, Organizational Memory — see `13_INNOVATION_BACKLOG.md` |

The v1 screens (School Setup, Calendar Review shell, Event Workspace shell) are the foundation. This blueprint defines what they become.
