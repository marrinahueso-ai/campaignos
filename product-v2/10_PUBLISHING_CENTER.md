# CampaignOS 2.0 — Publishing Center

**Purpose:** Define how approved communications go live — closing the loop and advancing the timeline.  
**Last updated:** June 2026

---

## Why Publishing Exists

Generating and approving content is half the job. **Getting it live** is the other half — and the part most tools ignore.

Jamie approves a Facebook post on Tuesday. She copies it to Facebook on Wednesday. She forgets to mark it done. On Thursday, the Dashboard still shows it as due. On Friday, she posts it again.

**The Publishing Center closes the loop** — connecting approved content to real-world channels and updating the entire system when something goes live.

---

## V2 Publishing Model

CampaignOS 2.0 does **not** auto-post to Facebook, Instagram, or email.

PTOs need human control. Platform APIs add complexity. Trust requires a human hand on the publish button.

**V2 workflow: Copy → Post manually → Mark as Published in CampaignOS.**

Future versions add direct scheduling integrations (Sprint 6+). The Publishing Center is designed for both.

---

## What the Publishing Center Is

A focused queue of **approved content ready to go live** — organized by due date, channel, and event.

It is not a social media dashboard. It is a **completion checklist** for Jamie.

---

## Entry Points

| Source | Context |
|--------|---------|
| **Dashboard → Today's Actions** | "Publish Book Fair 7-day Facebook post" |
| **Event Workspace hero** | "2 items ready to publish" |
| **Communication Timeline node** | [Publish] button on approved node |
| **Dedicated Publishing Center** | Full queue view (future nav or Dashboard section) |
| **Workload Calendar → Publishing mode** (future) | Approved items due by day in Week/Month view |

Jamie rarely visits a standalone Publishing page. She publishes from wherever she is — the action comes to her.

---

## What Jamie Sees

### Publishing Queue Item

Each item in the queue:

```
┌─────────────────────────────────────────────────────────┐
│  📘 Facebook  ·  Book Fair  ·  7-Day Reminder          │
│  Due today · Approved by Dana on Sep 19                 │
│                                                         │
│  "One week until our Fall Book Fair! 📚 Join us next    │
│   Thursday in the gym from 5–8 PM..."                   │
│                                                         │
│  [Copy to Clipboard]  [Open Facebook ↗]  [Mark Published]│
└─────────────────────────────────────────────────────────┘
```

### Queue organization

Default sort: **due date ascending** (most urgent first)

Filter options:
- By event
- By channel
- Due today · This week · Overdue

### Workload Calendar — Publishing mode (future)

In the Workload Calendar, **Publishing mode** shows approved items organized by due date:

| View | What Jamie sees |
|------|-----------------|
| **Week** | Approved items due each day — "3 to publish Thursday" |
| **Month** | Publishing density alongside communication workload |
| **List** | Full queue sorted by urgency |

Publishing mode complements the Publishing Center queue — calendar view for planning, queue view for execution.

See `13_INNOVATION_BACKLOG.md`. **Not current sprint.**

### Batch view

When multiple items are due:
> "3 items ready to publish today"
> Progress: 0 of 3 complete

Jamie works through them sequentially. Each "Mark Published" advances the progress bar.

---

## The Publish Flow

### Step 1: Copy

Jamie clicks **Copy to Clipboard**. Content copied with formatting appropriate to the channel.

Confirmation toast: "Copied! Paste into Facebook."

### Step 2: Post externally

Jamie opens Facebook (link provided), pastes, adds any final touches (photo, tag), and posts manually.

CampaignOS does not monitor external platforms in V2.

### Step 3: Mark as Published

Jamie returns to CampaignOS and clicks **Mark as Published**.

**Confirmation modal:**
> "Mark this Facebook post as published?"
> "This will update your timeline and remove it from today's actions."
> [Cancel] [Mark as Published]

### Step 4: System updates

On confirmation:
- Item status → Published
- Timeline node updates (partial or complete)
- Dashboard Today's Actions removes the item
- Activity log records: "Book Fair Facebook 7-day post published by Jamie"
- Progress ring in workspace advances
- If all channels for a timeline node are published → node turns green

**Jamie feels closure.** The system acknowledges the work is done.

---

## Publishing from the Timeline

Jamie can publish directly from a timeline node without visiting a separate center:

```
→  7 days out · ONE-WEEK PUSH · Due Today
     Facebook: Approved ✓  [Copy · Publish]
     Email: Approved ✓  [Copy · Publish]
```

Each channel has its own publish action. The node completes when both are published.

---

## Publishing from the Communications Hub

Approved cards show a **Publish** action alongside Generate and Preview:

```
Facebook · Approved ✓ · Published badge
[Copy] [Mark as Published]
```

After publishing, the card shows a green "Published" badge and locks from editing.

---

## Published Content Protection

Once marked as published:
- Content is **locked** from casual editing
- Card shows "Published on Sep 27 by Jamie"
- Regenerate requires explicit "Unlock and regenerate" with warning
- Audit trail preserved

If Jamie needs to correct a published post:
1. Click "Request correction"
2. Edit the content
3. Resubmit for approval (expedited)
4. Republish

Corrections are logged — not hidden.

---

## Overdue Publishing

If an approved item passes its due date without being published:

- Timeline node shows **Overdue** (red indicator)
- Dashboard surfaces it prominently: "Overdue: Book Fair Facebook post was due yesterday"
- No automatic escalation — Jamie decides whether to publish late or skip

Skip option: "Skip this communication" with optional reason.

---

## Publishing and the Timeline

| Action | Timeline effect |
|--------|-----------------|
| Mark one channel published | Node shows partial completion |
| Mark all channels published | Node turns green · Complete |
| Skip node | Node struck through · Skipped |
| Publish after due date | Node green but flagged "Published late" |

Timeline progress drives workspace completion percentage.

---

## Publishing and the Dashboard

| Dashboard state | Trigger |
|-----------------|---------|
| Today's Actions includes publish item | Approved + due today + not published |
| Overdue badge | Approved + past due + not published |
| "All caught up" | No items due or overdue |
| Week view dot | Days with publish items due |

Jamie's Dashboard is essentially a **Publishing todo list** combined with generation and approval tasks.

---

## Multi-Channel Publishing

Some timeline nodes map to multiple channels (e.g., "Day Of · All channels").

Jamie publishes each channel independently:
- Copy Facebook → post → mark published
- Copy Instagram → post → mark published
- Copy morning announcement → send to office → mark published

The node completes only when all required channels are published or skipped.

Progress within the node: "2 of 4 channels published"

---

## Publishing Record

Every publish event is logged:

| Field | Example |
|-------|---------|
| Event | Fall Book Fair |
| Channel | Facebook |
| Timeline node | 7 days out · One-Week Push |
| Published by | Jamie M. |
| Published at | Sep 27, 2026 · 7:42 PM |
| Content version | v2 (edited after initial generation) |

This record supports year-end reporting and succession planning.

---

## Future: Direct Publishing (Sprint 6+)

The Publishing Center is designed to evolve:

| V2 (manual) | Future (integrated) |
|-------------|---------------------|
| Copy to clipboard | Schedule to Facebook |
| Open Facebook link | Schedule to Instagram |
| Mark as published | Auto-mark on publish |
| Manual email paste | Send via email integration |

The queue, timeline, and Dashboard model stay the same. Only the publish action changes from manual to scheduled.

---

## Reducing Workload

| Before | After |
|--------|-------|
| "Did I post that already?" | Published badge + activity log |
| Approved post sits in email drafts | Publishing queue surfaces it on due date |
| Timeline doesn't reflect reality | Mark published → timeline updates instantly |
| Dashboard shows stale tasks | Completed items disappear automatically |
| No record of what went live | Full publish history per event |

---

## Empty States

**Nothing to publish:**
> "You're all caught up. Approved communications will appear here when they're ready to go live."

Calm. Satisfying. Jamie earned this empty state.

---

## Delight Details

- Satisfying check animation when marking published
- Progress bar advances with each publish
- "All published for today" confirmation message
- Streak counter (future): "5 days in a row — all communications on time"

---

## Success Criteria

Jamie publishes the Book Fair 7-day Facebook post and within 3 clicks knows:
- It's marked done in CampaignOS
- The timeline node is green
- It won't appear on tomorrow's Dashboard
- Dana can see it was published in the activity log

Publishing feels like **closing a tab** — not starting a new task.

---

## Relationship to the Operating System

```
Communication Playbook → Timeline → AI Brain → Draft
        ↓
Approval Workflow → Approved
        ↓
Publishing Center → Published
        ↓
Timeline Complete → Event Complete
        ↓
Analytics → Proof of value
```

Publishing is the moment the operating system delivers on its promise: **the right message, at the right time, through the right channel — done.**
