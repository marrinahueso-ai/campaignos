# CampaignOS 2.0 — Communication Timeline

**Purpose:** Define the Communication Timeline — the auto-generated schedule that tells volunteers when to communicate.  
**Last updated:** June 2026 (timing preset reference)

---

## Timing preset reference

Communication timeline steps are generated from **timing presets** defined in `src/lib/playbooks/timing-presets.ts`. See `product-v2/06_COMMUNICATION_PLAYBOOK.md` → **Implemented Timing Presets (Application v1)** for the full node tables, calendar import defaults, and manual override surfaces.

**Quick reference — Full Campaign default (`full_event`):**  
30 → 21 → 14 → 7 → 3 → 1 → 0 → +1 days (Save the Date through Thank You).

**Reminders Only** uses the final window only: −3, −1, 0.

---

## What the Communication Timeline Is

The Communication Timeline is the **visual communication plan** for a single event.

It is a vertical sequence of countdown milestones — each with a due date, assigned channels, generated content, and a status — auto-created from the event's Communication Playbook the moment the event workspace is born.

It is the single most important surface for eliminating decision fatigue.

---

## The Core Insight

PTO volunteers know *what* events they have. They struggle with *when* and *how often* to talk about them.

Spreadsheets, Google Calendar reminders, sticky notes, and mental tracking fail because:
- Every event type has a different rhythm
- Channels multiply the schedule (Facebook on Tuesday, newsletter on Thursday)
- Rescheduling an event breaks the whole plan
- New volunteers inherit nothing

**The Communication Timeline replaces all of this with one intelligent, event-aware view.**

---

## What the User Sees

### Timeline View (inside Event Workspace)

A vertical timeline, top to bottom, earliest to latest:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓  SAVE THE DATE                                    Complete
     September 4 · 30 days before Book Fair
     Website · Newsletter
     "Mark your calendars for our Fall Book Fair..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓  TWO-WEEK REMINDER                                Approved
     September 20 · 14 days before
     Facebook · Instagram
     "Two weeks until Book Fair! Here's what to expect..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  →  ONE-WEEK PUSH                                    Due Today
     September 27 · 7 days before
     Facebook · Email
     "One week away! Volunteer slots still open..."
     [Review] [Edit] [Approve] [Publish]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ○  FINAL REMINDER                                   Upcoming
     October 1 · 3 days before
     Instagram Story
     Not yet generated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ○  DAY BEFORE                                       Upcoming
     October 3 · 1 day before
     Facebook · Morning Announcements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ○  DAY OF                                           Upcoming
     October 4 · Event day
     All channels

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ○  THANK YOU                                        Upcoming
     October 5 · 1 day after
     Newsletter · Facebook

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Timeline Header

- Playbook name: "Book Fair Playbook"
- Summary: "7 communications · 32-day span"
- Progress: "2 complete · 1 due today · 4 upcoming"
- Action: "Change playbook"

---

## Timeline Node Anatomy

Every node on the timeline contains:

| Element | Purpose |
|---------|---------|
| **Label** | Human-readable milestone name |
| **Due date** | Absolute date + relative offset |
| **Channels** | Icons for assigned channels |
| **Content preview** | First 2 lines of generated copy |
| **Status** | Visual state (see below) |
| **Actions** | Contextual buttons |

---

## Timeline Node States

| State | Visual | Meaning | User action |
|-------|--------|---------|-------------|
| **Upcoming** | Gray circle | Not yet due, content may not exist | Generate early (optional) |
| **Draft Ready** | Blue circle | Content generated, not yet reviewed | Review · Edit |
| **Due Today** | Amber pulse | Due date is today | Review · Approve · Publish |
| **Overdue** | Red indicator | Past due, not published | Urgent action needed |
| **Awaiting Approval** | Amber lock | Submitted to board | Wait or nudge board |
| **Approved** | Green check | Board signed off | Publish |
| **Published** | Green filled | Live and marked done | View only |
| **Skipped** | Gray strikethrough | Jamie chose to skip | Undo skip |

Jamie scans color to understand urgency. No reading required.

---

## How Timelines Are Created

### Automatic creation

1. Event is created or imported
2. Event type assigned → Communication Playbook selected
3. System calculates each node's due date from event date + playbook offsets
4. Timeline renders in workspace — immediately
5. Channels mapped per playbook node
6. Content is NOT generated until Jamie clicks Generate (or Generate All)

### What Jamie sees after import

> "Fall Book Fair · 7 communications scheduled · First: Save the Date on September 4"

She did nothing except confirm the event on Calendar Review.

---

## Timeline ↔ Communications Hub Connection

Each timeline node links to one or more Communications Hub cards:

```
Timeline Node: "7 days out · One-Week Push"
    ├── Facebook card (generated content)
    └── Email card (generated content)
```

Clicking a timeline node expands to show linked channel cards inline — or deep-links to the Communications Hub card.

Editing content in the Hub updates the timeline preview. Approving in either place updates both.

---

## Timeline ↔ Publishing Connection

When Jamie marks a channel as Published:
- Timeline node progress updates (partial if multi-channel)
- Node completes when ALL mapped channels are published
- Dashboard Today's Actions removes the item
- Activity log records the publish event

---

## Rescheduling Behavior

When Jamie changes an event date:

1. System recalculates all node due dates
2. Timeline displays: "Event rescheduled · 7 dates updated"
3. Published nodes are preserved (historical record)
4. Approved-but-unpublished nodes shift to new dates
5. Jamie sees a summary of changes before confirming

**Example:**
Book Fair moved from October 4 → October 11.
- "Save the Date" was already published → stays published (historical)
- "7 days out" shifts from September 27 → October 4 → status resets to Draft Ready if not yet published
- Jamie confirms the shift

---

## Dashboard Integration

The Communication Timeline powers Dashboard sections:

| Dashboard section | Timeline data |
|-------------------|---------------|
| **Today's Actions** | All nodes with due date = today and status ≠ published |
| **This Week** | All nodes due within 7 days |
| **Overdue** | All nodes past due and not published (urgent badge) |

Jamie never checks the timeline to know what's due — the Dashboard tells her.

---

## Timeline Across the Year

At the organization level, all event timelines aggregate:

**This Week view (Dashboard):**
```
Mon · Book Fair 7-day · Facebook
Tue · PTO Meeting notice · Newsletter
Wed · (nothing due)
Thu · Teacher Appreciation daily · Announcements
Fri · Book Fair day-before · Facebook + Announcements
```

Jamie sees her **entire week's communication workload** across all events — not just one workspace at a time.

This Dashboard view is the precursor to the dedicated **Workload Calendar** (future), which adds List, Week, and Month views with calendar modes: Events · Communications · Publishing · Approvals.

---

## Workload Calendar Integration (Future)

The Communication Timeline feeds the Workload Calendar at the organization level:

| Workload Calendar view | Timeline data used |
|------------------------|-------------------|
| **List** | All nodes across all events, sorted by due date |
| **Week** | Nodes due Mon–Sun — what communication work is due each day |
| **Month** | Event density + communication workload heatmap per day |

**Calendar modes filter what appears:**

| Mode | Shows |
|------|-------|
| Events | School event dates only |
| Communications | Timeline nodes due (generate, review, edit) |
| Publishing | Approved items ready to mark published |
| Approvals | Items awaiting board review |

Jamie toggles from Month view (spot overload) → Week view (plan the week) → List view (execute tasks).

See `04_SCREEN_BLUEPRINTS.md` and `13_INNOVATION_BACKLOG.md`. **Not current sprint.**

---

## Workload Warnings

When too many communications are due on one day, CampaignOS surfaces a warning:

> "Heavy communication day — 6 items due October 3. Consider spreading 2 optional items to adjacent days."

**Warning triggers:**
- Configurable threshold (default: 4+ communications on one day)
- Aggregates across all active event timelines
- Considers optional vs. required nodes differently

**Where warnings appear:**
- Workload Calendar Month and Week views (future)
- Dashboard proactive alert
- Event Workspace timeline header when editing nodes on a heavy day

**Suggested actions:**
- Shift optional playbook nodes ± 1 day
- Combine channels where playbook allows
- Review adjacent days in Week view

Warnings prevent burnout from invisible pile-ups — the hidden cost of running 20+ events per year.

See `06_COMMUNICATION_PLAYBOOK.md` (Playbook Stacking) and `13_INNOVATION_BACKLOG.md`.

---

## Skipping and Optional Nodes

Some playbook nodes are marked **optional** (e.g., Instagram Story for a low-priority event).

Jamie can:
- Skip a node → strikethrough, excluded from progress
- Unskip → restores to upcoming
- Skip reason optional: "Not using Instagram this year"

Skipped nodes do not appear in Dashboard actions.

---

## Timeline Completion

An event's timeline is **complete** when:
- All required nodes are published or skipped
- All optional nodes are published, skipped, or past due (with confirmation)

The workspace hero shows: **"Book Fair communications complete ✓"**

The event status transitions to **Complete**.

---

## Empty Timeline State

If no playbook is assigned:

> "Assign an event type to generate your communication timeline."
> [Choose Event Type ▾]

Once assigned, the timeline populates instantly.

---

## Delight Details

- Nodes animate to green when published (subtle, satisfying)
- "Due today" nodes have a gentle pulse — not alarming red
- Timeline scrolls to the next action node when Jamie opens the workspace
- Completed timelines collapse into a compact summary view
- "Copy entire timeline" exports a shareable schedule for board meetings (future)

---

## Reducing Workload

| Before CampaignOS | With Communication Timeline |
|-------------------|----------------------------|
| Build a spreadsheet of post dates | Timeline auto-generated from playbook |
| Set phone reminders for each post | Dashboard surfaces due items |
| Forget a channel | Playbook maps channels per node |
| Recalculate when event moves | Dates shift automatically |
| Wonder "did we post the save-the-date?" | Published nodes show green |
| New chair starts from zero | Timeline inherited with event |

---

## Success Criteria

Jamie opens the Book Fair workspace and can answer in 10 seconds:
- What's due today?
- What's coming this week?
- What's already done?
- What's waiting on the board?

The timeline is the answer to all four.

---

## Relationship to Playbooks and AI Brain

```
Communication Playbook
    → defines node structure, offsets, channels
Communication Timeline
    → visualizes the schedule with dates and status
AI Brain
    → fills each node with channel-appropriate content
Approval + Publishing
    → moves nodes through completion
```

The timeline is the connective tissue of the operating system.
