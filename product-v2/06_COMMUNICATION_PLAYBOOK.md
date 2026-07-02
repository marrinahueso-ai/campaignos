# CampaignOS 2.0 — Communication Playbook

**Purpose:** Define Communication Playbooks — the reusable intelligence that drives auto-generated timelines for every event.  
**Last updated:** June 2026 (timing presets + calendar import defaults)

---

## Implemented Timing Presets (Application v1)

CampaignOS ships **timing presets** in code that drive playbook assignment, communication steps, Meta artwork milestones, and Posts & Schedule bundles. These presets are the live source of truth until organization-level playbook editing fully replaces them.

**Source files:**
- `src/lib/playbooks/timing-presets.ts` — countdown steps and channels
- `src/lib/artwork-v2/campaign-phases.ts` — Meta feed/story artwork per milestone
- `src/lib/events/event-type-inference.ts` — event type from calendar event title
- `src/lib/events/communication-strategy.ts` — import defaults and strategy filtering

### How event type maps to a preset

| Event type | Timing preset | Used for |
|------------|---------------|----------|
| `book_fair` | `book_fair` | Book fairs, read-a-thons |
| `pto_meeting` | `pto_meeting` | PTO/board meetings |
| `teacher_appreciation` | `recognition` | Appreciation days/weeks (day-of only in v1) |
| `early_release` | `early_release` | Early release / half days |
| All other types | `full_event` | Carnivals, festivals, general PTO/school events |

### Preset: Full Campaign (`full_event`)

**Default for:** Family events, carnivals, festivals, general PTO/school events when **Full Campaign** strategy is selected.

**Duration:** 31 days (save-the-date through thank-you)

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| Save the Date | 30 days before | Newsletter |
| Volunteer Drive | 21 days before | Email |
| Two-Week Reminder | 14 days before | Facebook |
| One-Week Push | 7 days before | Instagram |
| Final Details | 3 days before | Morning Announcements |
| Day Before | 1 day before | Facebook |
| Day Of | Event day | Facebook |
| Thank You / Recap | 1 day after | Newsletter |

This matches the **Fall Festival / Carnival** playbook below and is the standard “whole campaign” plan applied on calendar import for PTO and school events.

### Preset: Book Fair (`book_fair`)

**Duration:** 32 days

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| Save the Date | 30 days before | Newsletter |
| Two-Week Reminder | 14 days before | Facebook |
| One-Week Push | 7 days before | Email |
| Final Reminder | 3 days before | Instagram |
| Day Before | 1 day before | Morning Announcements |
| Day Of | Event day | Facebook |
| Thank You / Recap | 1 day after | Newsletter |

Book fairs use a **separate preset** (no 21-day volunteer node) so Scholastic-style events keep a tighter schedule.

### Preset: PTO Meeting (`pto_meeting`)

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| 3 Days Out | 3 days before | Newsletter |
| Day Before | 1 day before | Facebook |
| Day Of | Event day | Morning Announcements |
| Thank You / Recap | 1 day after | Newsletter |

### Preset: Recognition (`recognition`)

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| Day Of | Event day | Facebook |

### Preset: Early Release (`early_release`)

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| Day Before | 1 day before | Facebook |
| Day Of | Event day | Morning Announcements |

### Communication Strategy filters steps

| Strategy | Effect on preset steps |
|----------|------------------------|
| **Full Campaign** | All nodes in the preset |
| **Reminders Only** | Final window only: nodes at −3, −1, and 0 days (excludes save-the-date, volunteer drive, recap) |
| **Calendar Only** | No playbook assignment, no timeline |
| **Custom** | Reserved — no auto-generated steps in v1 |

---

## Calendar Import Defaults

When a school calendar is parsed, each row receives a **communication strategy** and **event type** before import. Jamie can override both manually on Calendar Review and again after import on the calendar Import list.

### Automatic defaults (parse)

| Signal | Default strategy | Event type |
|--------|------------------|------------|
| Category: PTO Event | Full Campaign | Inferred from title (e.g. “Book Fair” → `book_fair`, “Carnival” → `general_event` / full preset) |
| Category: School Event | Full Campaign | Inferred from title |
| Category: Early Release | Reminders Only | `early_release` |
| Category: Holiday | Calendar Only | — |
| Title contains “no school”, “break”, “holiday”, etc. | Calendar Only | — |
| Title contains “PTO meeting”, “board meeting” | Reminders Only | `pto_meeting` |

### Manual override (always available)

| Surface | What Jamie can change |
|---------|----------------------|
| **Calendar Review** (`/calendar/review`) | Plan type per row; **Edit** dialog for name, date, category, **event type**, plan type, and **campaign plan preview** |
| **Import list** (`/calendar` → Import list tab) | Plan type per imported event after import |
| **Event Workspace** | Skip milestones, reschedule posts, unapprove captions (Posts & Schedule) |

Imported events persist the chosen `communication_strategy` and `event_type`; playbook steps are generated from the timing preset at import time.

### Preset: Holiday / No School (`holiday`)

**Default for:** Holidays, breaks, and no-school days when **Reminders Only** is selected.

**Duration:** 8 days

| Node | Offset | Channel (v1) |
|------|--------|--------------|
| Week Before Reminder | 7 days before | Newsletter |
| Day Before | 1 day before | Morning Announcements |
| Return Reminder | 1 day after | Newsletter |

With **Reminders Only**, holidays use the −7 and −1 nodes only (excludes return reminder).

---

## School year rollover & import memory

Each organization can maintain multiple **school years** (`school_years` table). Settings → **School year & calendar**:

1. **Close prior year & begin next** — archives the active year and opens a planning year for the next upload.
2. **Calendar subscribe feed** — optional ICS URL stored on the active school year (auto-sync coming later).
3. **Per-year calendar imports** — each upload links to the active school year; imported events inherit `school_year_id`.

**Import categorization memory** (`import_event_preferences`):

- When Jamie sets plan type / event type on Calendar Review and imports, CampaignOS saves preferences keyed by normalized event title.
- The next calendar upload (next year) applies saved preferences automatically — e.g. "Volunteer Badge Making" stays **Full campaign**.

Jamie can still override any row manually or click **Apply recommended plans** to reset to defaults.

---

## Per-event playbook overrides (Event Workspace)

On the **Communication Plan** step, Jamie can **Customize playbook timing** for a single event:

- Edit relative days (e.g. 77 days before instead of 30)
- Add or remove milestones
- Change channel per milestone

Overrides save to `event_communication_steps` for that event only and do not change organization playbooks.

---

## What a Communication Playbook Is

A Communication Playbook is a **proven countdown schedule** for a type of school event.

It answers two questions Jamie should never have to answer herself:

1. **When** should we communicate about this event?
2. **Which channels** should each communication use?

When Jamie creates or imports a Book Fair event, CampaignOS applies the **Book Fair Playbook** — and a full communication timeline appears instantly.

No spreadsheet. No guesswork. No "I think we usually post two weeks before?"

---

## Why Playbooks Exist

PTOs run the same types of events every year:
- Book fairs
- Fall festivals
- Teacher appreciation weeks
- General PTO meetings
- Fundraisers
- Spirit weeks
- Holiday programs

Experienced volunteers carry these schedules in their heads. New volunteers start from zero.

**Playbooks encode institutional knowledge into the product.**

A first-year Communications Chair inherits the same communication plan a five-year veteran would build — on day one.

---

## Playbook Structure

Every playbook contains:

| Element | Description |
|---------|-------------|
| **Name** | Human-readable: "Book Fair" |
| **Description** | When to use this playbook |
| **Event category** | PTO Event, School Event, Fundraiser, etc. |
| **Countdown nodes** | Ordered list of communication milestones |
| **Channel mapping** | Which channels each node uses |
| **Content guidance** | Tone and focus hints for the AI Brain |
| **Default duration** | Typical span from first communication to thank-you |

Each **countdown node** contains:

| Field | Example |
|-------|---------|
| Label | "7 days out · One-Week Push" |
| Offset | Event date minus 7 days |
| Channels | Facebook, Email |
| Content focus | "Urgency, volunteer sign-ups, what to bring" |
| Required | Yes / Optional |

---

## Default Organization Playbooks

Every organization receives a library of default playbooks at setup. Jamie can customize but never starts from blank.

---

### Playbook: Book Fair

**Best for:** Scholastic book fairs, read-a-thons, library fundraisers

**Duration:** 32 days (first communication to thank-you)

| Node | Offset | Channels | Content Focus |
|------|--------|----------|---------------|
| Save the Date | 30 days before | Website, Newsletter | Announce dates, purpose, volunteer call |
| Two-Week Reminder | 14 days before | Facebook, Instagram | Build excitement, share theme |
| One-Week Push | 7 days before | Facebook, Email | Urgency, hours, payment info |
| Final Reminder | 3 days before | Instagram Story | Last call, visual teaser |
| Day Before | 1 day before | Facebook, Morning Announcements | Tomorrow reminder, logistics |
| Day Of | Event day | All channels | "Happening today!" energy |
| Thank You | 1 day after | Newsletter, Facebook | Gratitude, funds raised, photos |

**Why this schedule:**
Book fairs need early awareness (volunteers, classroom prep) and a strong final push (parents forget). The thank-you closes the loop and builds community.

---

### Playbook: General PTO Meeting

**Best for:** Monthly meetings, budget votes, board elections

**Duration:** 8 days

| Node | Offset | Channels | Content Focus |
|------|--------|----------|---------------|
| Meeting Notice | 7 days before | Newsletter, Website | Date, time, location, agenda preview |
| Day-Before Reminder | 1 day before | Facebook, Email | "Tomorrow at 7 PM" with agenda link |
| Morning Of | Event day (AM) | Morning Announcements | Brief reminder for drop-off crowd |
| Thank You / Recap | 1 day after | Newsletter, Facebook | Highlights, decisions, next meeting |

**Why this schedule:**
Meetings need less promotion than events but higher clarity. Parents need the agenda early and a morning-of nudge.

---

### Playbook: Teacher Appreciation Week

**Best for:** Teacher/staff appreciation days and weeks

**Duration:** 65 days (planning-heavy)

| Node | Offset | Channels | Content Focus |
|------|--------|----------|---------------|
| Planning Kickoff | 60 days before | Email (internal), Facebook | Volunteer sign-ups, theme reveal |
| One Month Out | 30 days before | Newsletter, Website | Schedule of appreciation days |
| Two-Week Push | 14 days before | Facebook, Instagram | Daily themes, how families can help |
| One-Week Details | 7 days before | All channels | Day-by-day plan, supply lists |
| Daily During Week | Each day of week | Morning Announcements, Instagram Story | "Today: bring a note for your teacher" |
| Thank You | 1 day after | Newsletter, Facebook | Gratitude to teachers and volunteer helpers |

**Why this schedule:**
Teacher appreciation requires sustained daily communication during the week itself — not just before-and-after. The playbook handles daily nodes automatically.

---

### Playbook: Fall Festival / Carnival

**Best for:** Large outdoor community events

**Duration:** 31 days

**Implementation:** This schedule is the default **`full_event`** timing preset in the application (see [Implemented Timing Presets](#implemented-timing-presets-application-v1)). Carnivals and festivals inferred from event titles use this plan when assigned **Full Campaign**.

| Node | Offset | Channels |
|------|--------|----------|
| Save the Date | 30 days before | Newsletter |
| Volunteer Drive | 21 days before | Email |
| Two-Week Reminder | 14 days before | Facebook |
| One-Week Push | 7 days before | Instagram |
| Final Details | 3 days before | Morning Announcements |
| Day Before | 1 day before | Facebook |
| Day Of | Event day | Facebook |
| Thank You / Recap | 1 day after | Newsletter |

---

### Playbook: Fundraiser (General)

**Best for:** Fun runs, auctions, product sales

**Duration:** 28 days

| Node | Offset | Channels |
|------|--------|----------|
| Launch | 28 days before | Website, Newsletter, Facebook |
| Mid-Campaign | 14 days before | Facebook, Email |
| Final Push | 7 days before | All channels |
| Last Day | 1 day before | Facebook, Instagram |
| Results / Thank You | 3 days after | Newsletter, Facebook |

---

### Playbook: School Concert / Performance

**Best for:** Winter concerts, spring plays, talent shows

**Duration:** 21 days

| Node | Offset | Channels |
|------|--------|----------|
| Announcement | 21 days before | Newsletter, Website |
| Two-Week Reminder | 14 days before | Facebook |
| Ticket / Details | 7 days before | Facebook, Email, Morning Announcements |
| Day Before | 1 day before | All channels |
| Day Of | Event day | Morning Announcements, Instagram |
| Thank You | 1 day after | Facebook, Newsletter |

---

### Playbook: Holiday / No School

**Best for:** Breaks, holidays, early release days

**Duration:** 7 days

| Node | Offset | Channels |
|------|--------|----------|
| Reminder | 7 days before | Newsletter, Website |
| Day Before | 1 day before | Morning Announcements |
| Return Reminder | Day before return | Newsletter, Facebook |

**Why this schedule:**
Low-communication events still need coverage. This lightweight playbook prevents them from being forgotten entirely.

---

## Playbook Assignment

### Automatic assignment

When an event is imported from a calendar:
1. Parser categorizes the event (PTO Event, School Event, Holiday, Early Release)
2. Event type is inferred from the title (Book Fair, Carnival, PTO Meeting, etc.)
3. Communication strategy defaults apply (Full Campaign for most PTO/school events)
4. Jamie confirms or changes plan type and event type on **Calendar Review**
5. Timeline and Meta milestones generate on import from the matching timing preset

### Manual assignment

When Jamie creates an event manually:
1. She selects event type from a dropdown
2. She selects communication strategy (Full Campaign, Reminders Only, Calendar Only)
3. Event Workspace **Plan** step shows timing summary and artwork milestones
4. Timeline generates on save

When reviewing an import:
1. Each row shows plan type and a compact milestone preview
2. **Edit** opens event type, plan type, and full campaign plan preview chips
3. Changes persist in `parsed_events` until import, then on the live event record

### Changing playbooks

Jamie can reassign a playbook on an existing event:
- Warning: "Changing playbooks will regenerate your timeline. Approved content will be preserved."
- Timeline recalculates; existing approved assets remain linked where channel matches

---

## Organization Customization

### What organizations can customize

| Customizable | Locked |
|--------------|--------|
| Add/remove countdown nodes | Core playbook structure |
| Change offsets (± days) | Channel options per node |
| Add/remove channels per node | Playbook naming conventions |
| Edit content guidance for AI | Default playbook library |
| Create custom playbooks | — |
| Set default playbook per category | — |

### Custom playbook creation (future premium)

Jamie saves "Spring Carnival 2025" as a custom playbook after a successful year. Next year's Chair inherits it.

**Organizational Memory connection (future):**
- Clone a prior-year event's playbook execution as a starting custom playbook
- AI suggests node adjustments based on last year's on-time data and skipped nodes
- "Last year's Book Fair skipped Instagram Story — keep or restore?"

See `13_INNOVATION_BACKLOG.md`.

---

## Playbook → Timeline → Assets Chain

```
Playbook assigned to event
        ↓
Timeline nodes generated (dates calculated from event date)
        ↓
Each node maps to channel(s)
        ↓
AI Brain generates content per channel when requested
        ↓
Assets linked to timeline nodes
        ↓
Approval and publishing follow timeline order
```

Jamie experiences this as: *"I imported the Book Fair and my whole communication plan appeared."*

---

## Playbook Stacking & Workload Warnings (Future)

When multiple events share playbook nodes on the same day, communication workload piles up invisibly.

**Example:** Book Fair 7-day push and Fall Festival 7-day push both land on October 3.

CampaignOS detects stacking and surfaces **workload warnings**:

| Surface | Warning |
|---------|---------|
| Workload Calendar (Week/Month) | Heatmap intensity + day detail |
| Dashboard | "Heavy communication day — 6 items due Thursday" |
| Event Workspace timeline | "This date overlaps with 2 other events" |

**Suggested mitigations:**
- Shift optional playbook nodes (± 1 day)
- Combine channels into fewer posts where appropriate
- Flag for co-chair delegation (future)

Playbooks define *what* to communicate. Workload warnings help Jamie manage *when* — without rewriting playbooks from scratch.

See `08_COMMUNICATION_TIMELINE.md` and `13_INNOVATION_BACKLOG.md`.

---

## Smart Links in Generation (Future)

When Event Resources are configured in the workspace, the AI Brain inserts the correct link into generated copy:

| Communication context | Resource pulled |
|----------------------|-----------------|
| Volunteer signup CTA | Signup Genius link |
| Donation ask | Donation / payment link |
| Registration reminder | Registration URL |
| Design reference | Canva template link |

Jamie no longer hunts for links after generation. Resources + playbooks + AI Brain produce copy that is ready to post.

See `05_EVENT_WORKSPACE.md` (Event Resources) and `13_INNOVATION_BACKLOG.md`.

---

## Playbook Library (Settings)

In Settings → Communication Playbooks, Jamie sees:

- **Default playbooks** — provided by CampaignOS, read-only structure
- **Organization playbooks** — customized versions
- **Custom playbooks** — created by the org

Each playbook card shows:
- Name and description
- Node count and typical duration
- Channels used
- "Preview timeline" action
- "Customize" action

---

## Reducing Decision Fatigue

| Without playbooks | With playbooks |
|-------------------|----------------|
| "When should we start promoting?" | Timeline starts at 30 days — already set |
| "Which channels for the save-the-date?" | Website + Newsletter — already mapped |
| "Did we forget Instagram?" | Every channel covered per node |
| "What's the schedule for teacher appreciation?" | Daily nodes auto-generated for the week |
| "New chair starts from scratch" | Inherits proven playbook library |

---

## Playbook Quality Principles

1. **Based on real PTO behavior** — not marketing best practices
2. **Conservative by default** — fewer communications beats spamming parents
3. **Channel-appropriate** — morning announcements are short; newsletters are detailed
4. **Editable** — playbooks are starting points, not prisons
5. **Transparent** — Jamie always sees WHY a node exists and can skip optional ones

---

## Success Criteria

A first-year Communications Chair imports 20 events and every one receives an appropriate playbook with a visible timeline — without configuring a single schedule manually.

That is the playbook promise.
