# CampaignOS 2.0 — Information Architecture

**Purpose:** Define how the product is organized — mentally, visually, and in navigation.  
**Last updated:** June 2026

---

## The Mental Model

CampaignOS is organized as a **top-down hierarchy**, mirroring how a PTO actually thinks about the school year:

```
Organization (Who we are)
    └── School Year (What year we're planning)
            └── Calendar (All our dates)
                    └── Events (Each date becomes a project)
                            └── Event Workspace (Everything for one event)
                                    └── Communication Timeline (When to communicate)
                                            └── Generated Assets (What to say)
                                                    └── Approval (Board sign-off)
                                                            └── Publishing (Going live)
                                                                    └── Analytics (Did it work?)
```

Users never need to memorize this tree. The product **surfaces the right level** based on context. Jamie usually lives at Dashboard → Event Workspace → Timeline Item. Dana lives at Approval Center. Both feel like the whole product.

---

## Primary Navigation

The left sidebar stays intentionally small. Five items. No feature sprawl.

| Nav Item | Purpose | Answers |
|----------|---------|---------|
| **Dashboard** | Daily command center | "What should I do next?" |
| **School Setup** | Organization & brand identity | "Who are we?" |
| **Calendar Review** | Import and confirm school dates | "What's on our calendar?" |
| **Events** | Browse all event workspaces | "What events am I managing?" |
| **Workload Calendar** | See events + communication tasks across the year | "What does this week look like?" |
| **Settings** | Org preferences, playbooks, team | "How should CampaignOS behave?" |

**Deliberately NOT in primary nav (initially):**
- Approval Center (surfaces on Dashboard when needed)
- Publishing Center (surfaces from timeline items, Workload Calendar, and Dashboard)
- Analytics (surfaces within events and a lightweight year view)
- AI Brain (invisible — no "AI settings" nav item)
- Collaboration Hub (future — lives inside Event Workspace, not global nav)

**Note:** Workload Calendar may enter primary nav once List/Week/Month views ship (Phase 3–4). Until then, Week workload preview lives on Dashboard.

This keeps navigation calm. Deep features appear contextually, not as permanent menu clutter.

---

## Secondary Surfaces (Contextual, Not Nav Items)

These appear when relevant — as Dashboard sections, workspace tabs, or action flows:

| Surface | Entry points | Purpose |
|---------|--------------|---------|
| **Event Workspace** | Events list, Dashboard, Calendar Review | Project home for one event |
| **Workload Calendar** | Dashboard, primary nav (future) | Events + comm tasks across year |
| **Communication Timeline** | Inside Event Workspace | When to communicate |
| **Communications Hub** | Inside Event Workspace | Channel-specific assets |
| **Event Resources** | Inside Event Workspace | Smart links and files for the event |
| **Creative Assets / Creative Intelligence** | Inside Event Workspace | Visual files, inspiration, AI creative |
| **Approval Center** | Dashboard alert, email link | Board review queue |
| **Publishing Center** | Dashboard, Workload Calendar, timeline item | Mark content as live |
| **Collaboration Hub** | Inside Event Workspace (future) | Team comments, status, @mentions |
| **Analytics** | Event workspace footer, year summary | Did parents engage? |

---

## Hierarchy Detail: Organization

**What the user sees:**
- School name, PTO name, district
- Brand logos, colors, fonts
- Communication tone and default hashtags
- Communication Playbook library (org-level defaults)

**Why it exists:**
Every event inherits the organization's voice. Jamie sets this once in August. The AI Brain uses it all year.

**User mental model:**
> "This is our school's communication identity."

---

## Hierarchy Detail: School Year

**What the user sees:**
- Active year selector (2025–2026)
- Year progress indicator
- Archive of past years (future)

**Why it exists:**
PTOs think in school years, not calendar years. All events, timelines, and analytics scope to the active year.

**User mental model:**
> "This is the year I'm planning right now."

---

## Hierarchy Detail: Calendar

CampaignOS treats "calendar" as two related but distinct concepts:

### Calendar Import & Review
**What the user sees:**
- Imported calendar file metadata
- Review dashboard with extracted events
- Category tags: PTO Event, School Event, Holiday, Early Release
- Conflict indicators

**Why it exists:**
The calendar is the source of truth. CampaignOS converts passive dates into active projects.

**User mental model:**
> "These are all the dates I need to worry about this year."

### Workload Calendar (future — see `13_INNOVATION_BACKLOG.md`)
**What the user sees:**
- **List view** — chronological mix of events and communication tasks
- **Week view** — what communication work is due each day
- **Month view** — event density + communication workload heatmap
- **Calendar modes:** Events · Communications · Publishing · Approvals
- **Workload warnings** when too many communications fall on one day

**Why it exists:**
Jamie needs to see the *work*, not just the dates. A school calendar shows when the Book Fair is. The Workload Calendar shows that Jamie has 4 posts due the week before.

**User mental model:**
> "What does my communication week look like?"

---

## Hierarchy Detail: Events

**What the user sees:**
- Events list/grid sorted by date
- Status badges: Planning · In Progress · Awaiting Approval · Ready to Publish · Complete
- Event type tag (Book Fair, PTO Meeting, etc.)
- Quick link: Open Workspace

**Why it exists:**
Events are the atomic unit of work. Each one is a self-contained communication project.

**User mental model:**
> "Each of these is something I need to communicate about."

---

## Hierarchy Detail: Event Workspace

**What the user sees:**
- Hero: name, date, countdown, status, category, owner
- Progress indicator: communications ready / approved / published
- Seven sections (see Screen Blueprints and Event Workspace docs):
  1. Event Overview
  2. Event Resources (Smart Links)
  3. Communication Timeline
  4. Communications Hub
  5. Creative Assets / Creative Intelligence
  6. Activity & Organizational Memory
  7. Collaboration Hub (future)

**Why it exists:**
One event = one home. Eliminates tool-switching and context loss.

**User mental model:**
> "Everything for the Book Fair is here."

---

## Hierarchy Detail: Communication Timeline

**What the user sees:**
- Vertical timeline of countdown nodes
- Each node: label, due date, channel, status, content preview
- Auto-generated from Communication Playbook

**Why it exists:**
Eliminates the hidden work of planning *when* to communicate. The timeline IS the communication plan.

**User mental model:**
> "This tells me exactly when to post what."

---

## Hierarchy Detail: Generated Assets

**What the user sees:**
- Per-channel communication cards (Facebook, Newsletter, etc.)
- Creative asset cards (Hero Image, Flyer, etc.)
- Status, preview, edit, approve actions

**Why it exists:**
Separates *when* (timeline) from *what* (assets). Timeline nodes link to specific assets.

**User mental model:**
> "This is the actual copy and creative I'll use."

---

## Hierarchy Detail: Approval

**What the user sees:**
- Approval queue on Dashboard and dedicated Approval Center
- Per-item preview with board checklist
- Approve · Request Changes · Reject

**Why it exists:**
PTOs are board-governed. Nothing public-facing goes out without review. CampaignOS makes this fast, not bureaucratic.

**User mental model:**
> "The board signed off on this before it went live."

---

## Hierarchy Detail: Publishing

**What the user sees:**
- Approved items ready to go live
- Copy-to-clipboard per channel
- Mark as Published confirmation
- Timeline auto-updates

**Why it exists:**
Closes the loop. Jamie knows what's live vs. what's still pending.

**User mental model:**
> "It's out there. I can move on."

---

## Hierarchy Detail: Analytics

**What the user sees:**
- Lightweight per-event metrics: published count, channels used, timeline completion
- Year-level summary: events completed, communications sent, on-time rate
- No vanity dashboards

**Why it exists:**
PTOs need proof of value for the board, not engagement optimization. "We communicated on time all year" is the win.

**User mental model:**
> "We did our job. Parents were informed."

---

## Content Relationships

Every piece of content belongs to exactly one event:

```
Event
 ├── Event Resources (links, forms, files — Smart Links for AI)
 ├── Communication Timeline (many nodes)
 │     └── each node links to → Generated Asset (one channel)
 ├── Communications Hub (many channel assets)
 ├── Creative Assets / Inspiration uploads (visual files + reference material)
 ├── Approval Records (many decisions)
 ├── Publication Records (many publish events)
 ├── Activity & Organizational Memory (audit trail + prior-year history)
 ├── Collaboration Hub (future — comments, @mentions, chat)
 └── Analytics (aggregated from above)
```

Nothing floats orphaned. If Jamie asks "where does this Facebook post belong?" — the answer is always: inside an event workspace.

---

## Navigation Patterns

### Pattern 1: Dashboard → Action → Workspace → Item
The primary daily flow. Dashboard shows "Post Book Fair 7-day reminder." Click → Book Fair workspace → 7-day timeline node → Facebook asset → Edit → Approve → Publish.

### Pattern 2: Events → Workspace
Browse all events. Click any card → full workspace.

### Pattern 3: Calendar Review → Workspace
Import calendar. Confirm event. Optionally jump directly into new workspace.

### Pattern 4: Approval → Workspace
Dana receives approval request. Reviews in Approval Center. Can deep-link into full workspace for context.

### Pattern 5: Settings → Playbooks
Jamie adjusts org-level playbook defaults. Changes apply to future events, not retroactively to approved content.

### Pattern 6: Workload Calendar → Day → Task
Jamie opens Workload Calendar in Week view, mode: Communications. She sees 4 items due Thursday. She clicks one → lands in the correct workspace and timeline node.

### Pattern 7: Prior-year Event → Clone (future)
Next year's Chair opens Book Fair 2026. CampaignOS surfaces Book Fair 2025 memory. She clones timeline customizations and resources — not verbatim content.

---

## Breadcrumb Mental Model

Users should always know where they are:

```
Dashboard  ›  Fall Book Fair  ›  7-Day Reminder  ›  Facebook Post
```

Breadcrumbs are contextual, not always visible. The hero banner on the Event Workspace serves as the primary anchor.

---

## Search & Findability (Future)

Jamie should be able to search:
- Event names
- Timeline items ("book fair facebook")
- Published content

Search returns events first, then assets within events. Never a flat list of disconnected posts.

---

## Mobile Consideration

PTO volunteers often work on phones. Information architecture must support:
- Dashboard Today's Actions (mobile-first)
- Timeline item review and approve
- Copy-to-clipboard for publishing

Full workspace editing is desktop-comfortable; daily actions are mobile-capable.

---

## What Changed from 1.0

| 1.0 | 2.0 |
|-----|-----|
| Events as list items | Events as workspaces with full lifecycle |
| Manual communication cards | Auto-generated timelines from playbooks |
| Dashboard with upcoming events only | Dashboard as action-oriented command center |
| Settings as org profile | Settings includes playbook library |
| No publishing loop | Publishing Center closes the loop |
| No analytics | Lightweight, meaningful analytics |
| No workload calendar | Workload Calendar with List/Week/Month views (future) |
| No event resources | Smart Links section in workspace (future) |
| No creative intelligence | Inspiration Library + Brand DNA (future) |
| No organizational memory | Year-over-year event history (future) |

The skeleton from 1.0 (School Setup, Calendar Review, Events, Event Workspace shell) remains. The information architecture above completes the operating system. See `13_INNOVATION_BACKLOG.md` for future concepts.
