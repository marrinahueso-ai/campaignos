# CampaignOS 2.0 — Approval Workflow

**Purpose:** Define how board approval works — fast, trustworthy, and free of email chaos.  
**Last updated:** June 2026

---

## Why Approval Exists

PTO communications go out in the school's name. Board members — presidents, vice presidents, treasurers — are accountable to the community.

No responsible PTO publishes without review.

But approval today looks like this:
- Jamie texts Dana a screenshot
- Dana replies "looks good" in a group chat
- Nobody can find that approval three months later
- A controversial post goes live because someone forgot to ask

**CampaignOS replaces informal approval with a structured, auditable, fast workflow.**

---

## Design Principles

1. **Fast for the board** — approve in minutes, not meetings
2. **Clear for Jamie** — always know what's waiting and what's approved
3. **Auditable** — every decision logged with who, when, and what
4. **Non-bureaucratic** — checklist, not committee
5. **Trust-building** — Dana sees exactly what parents will see

---

## Personas

| Persona | Role | Goal |
|---------|------|------|
| **Jamie** | Communications Chair | Get content approved quickly |
| **Dana** | PTO President / Board Reviewer | Review before it goes public |
| **Board member** | Occasional reviewer | Approve specific items when asked |

---

## The Approval Flow

```
Jamie generates content
        ↓
Jamie reviews and edits drafts
        ↓
Jamie clicks "Submit for Approval"
        ↓
Dana receives notification
        ↓
Dana opens Approval Center
        ↓
Dana reviews content + checklist
        ↓
Dana approves · requests changes · or rejects
        ↓
Jamie notified of decision
        ↓
Approved content moves to Publishing Center
```

---

## Submitting for Approval (Jamie's Experience)

### What Jamie sees

Inside the Event Workspace, after generating content:

**Submit bar:**
> "3 communications ready for board review"
> [Submit All for Approval] [Submit Selected]

**Per-item submit:**
Each Communications Hub card has: [Submit for Approval]

### What happens on submit

1. Selected items move to "Awaiting Approval" status
2. Items appear in Dana's Approval Center
3. Items appear on Dashboard → "Waiting on Board"
4. Jamie sees confirmation: "Submitted to Dana for review"
5. Items are locked from casual editing (explicit unlock required)

### What Jamie can still do while waiting

- View submitted content
- Cancel submission (returns to draft)
- Submit additional items
- Work on other events

Jamie cannot publish until approved.

---

## Approval Center (Dana's Experience)

### Entry points

- Dashboard: "3 communications awaiting your review"
- Email notification: "Jamie submitted Book Fair communications for review"
- Direct link from notification

### What Dana sees

**Header:**
> "Communications awaiting your review"
> "3 items · 2 events"

**Queue list** — sorted by urgency (due date):

Each item shows:
- Event name and countdown context
- Channel (Facebook, Newsletter, etc.)
- Submitted by · submitted date
- Due date (from timeline)
- Full content preview (formatted for the channel)
- Board checklist

**Board checklist** (per event, configurable):
- [ ] Content is accurate and appropriate
- [ ] Event details (date, time, location) are correct
- [ ] Principal has been notified (if required)
- [ ] No conflict with school district messaging
- [ ] Aligns with PTO budget and policies

Dana checks items and clicks:
- **Approve** — content moves to approved status
- **Request Changes** — opens note field, returns to Jamie as draft
- **Reject** — rare; requires note explaining why

### Dana's time investment

Target: **under 5 minutes** for a typical submission batch.

Dana reads previews — not attachments. She checks boxes — not forms. She approves — not edits.

---

## Approval States

| State | Jamie sees | Dana sees | Can publish? |
|-------|-----------|-----------|--------------|
| **Draft** | Editable | Nothing | No |
| **Submitted** | "Waiting on Dana" | In queue | No |
| **Changes Requested** | Dana's note + editable | Resolved | No |
| **Approved** | Green badge | Completed | Yes |
| **Rejected** | Dana's note + editable | Resolved | No |

---

## Request Changes Flow

1. Dana clicks "Request Changes" on a Facebook post
2. She writes: "Please add the ticket price ($5) and remove the emoji from the headline"
3. Jamie receives notification: "Dana requested changes on Book Fair Facebook post"
4. Item returns to Draft status with Dana's note visible
5. Jamie edits, resubmits
6. Dana reviews again

**No email thread. No lost context. No "which version did you approve?"**

---

## Bulk Approval

For low-risk communications (e.g., a save-the-date that's standard every year):

Dana can **Approve All** on an event batch with one checklist completion.

Guardrail: checklist must be fully checked before bulk approve is enabled.

---

## Approval and the Timeline

Timeline nodes reflect approval status:

```
→  7 days out · One-WEEK PUSH · Due Today
     Facebook · Email
     Facebook: Approved ✓  ·  Email: Awaiting Approval
     [Publish Facebook] [Wait for Email approval]
```

A node with mixed channel approval shows partial progress. Jamie can publish approved channels while waiting on others.

---

## Approval and the Dashboard

| Dashboard section | Approval data |
|-------------------|---------------|
| **Waiting on Board** (Jamie) | Items Jamie submitted, pending Dana |
| **Needs Your Review** (Dana) | Items in Dana's queue |
| **Today's Actions** | Approved items ready to publish (not approval itself) |

Jamie never chases Dana via text. The Dashboard shows what's stuck.

---

## Notifications

| Event | Who gets notified | Channel |
|-------|-------------------|---------|
| Content submitted | Dana | Email + in-app |
| Content approved | Jamie | In-app |
| Changes requested | Jamie | Email + in-app |
| Content rejected | Jamie | Email + in-app |
| Approval overdue (48h+) | Dana | Email reminder (future) |

Notifications link directly to the item — not to a generic dashboard.

---

## Audit Trail

Every approval decision is logged in the event's Activity & History:

```
Sep 18 · Submitted for approval · Book Fair Facebook post · by Jamie
Sep 19 · Approved · Book Fair Facebook post · by Dana
Sep 19 · Changes requested · Book Fair Email · by Dana
         "Add volunteer link and confirm 5 PM start time"
Sep 19 · Resubmitted · Book Fair Email · by Jamie
Sep 20 · Approved · Book Fair Email · by Dana
```

Board members can review this log at any time. No more "I never approved that."

---

## Approval Permissions (Future)

| Role | Can submit | Can approve | Can publish |
|------|-----------|-------------|-------------|
| Communications Chair | Yes | No | Yes (approved only) |
| PTO President | Yes | Yes | Yes |
| Board Member | No | Yes | No |
| Admin | Yes | Yes | Yes |

V2 launch may use a simplified model: Jamie submits, Dana approves. Role permissions expand post-launch.

---

## Reducing Workload

| Before | After |
|--------|-------|
| Screenshot → text → "looks good" | Structured submit → one-click approve |
| "Did the board approve this?" | Status badge: Approved by Dana, Sep 19 |
| Lost approval in group chat | Audit trail in Activity log |
| Board meeting to review posts | 5-minute Approval Center session |
| Jamie publishes without review | System blocks publish until approved |

---

## Empty States

**Jamie — nothing submitted:**
> "Generated communications will appear here when you submit them for board review."

**Dana — nothing to review:**
> "You're all caught up. Approved communications will move to Jamie's publishing queue."

Both feel calm, not empty.

---

## Success Criteria

Dana approves a batch of Book Fair communications in under 5 minutes without emailing Jamie.

Jamie always knows what's approved, what's waiting, and what Dana wants changed.

The board trusts CampaignOS because they can see everything before it goes public.

---

## Relationship to Publishing

Approval is the gate. Publishing is the door.

```
Draft → Submit → Approve → Publish
```

Only **Approved** items appear in the Publishing Center. The approval workflow protects the PTO's reputation; the publishing workflow closes Jamie's loop.
