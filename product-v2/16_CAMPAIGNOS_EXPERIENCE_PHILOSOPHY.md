# CampaignOS 2.0 — Experience Philosophy

**Purpose:** Define how CampaignOS should *feel* — the product voice, emotional contract, and language standards that guide every screen.  
**Status:** Product blueprint — documentation only, no schema changes  
**Last updated:** June 2026  
**Companion docs:** `15_ORGANIZATION_ONBOARDING.md`, `17_NAVIGATION_EXPERIENCE_REDlESIGN.md`

---

## North star

**CampaignOS should feel like a real friend helping PTO volunteers manage it all.**

Not a project management tool. Not an admin panel. Not “AI software.” A calm, capable communications partner who knows the school, remembers who does what, and helps volunteers stay on top of events without feeling overwhelmed.

---

## Core principles

### 1. A real friend helping volunteers manage it all

The product speaks like someone on the board who’s been through book fair chaos before — warm, practical, never condescending. CampaignOS is *with* Jamie, not *watching* Jamie.

### 2. Never make volunteers feel behind; make them feel supported

Avoid red-alarm UX for normal PTO life. Surface what matters, celebrate progress, and frame gaps as “here’s a gentle nudge” — not “you’re failing.” Empty states should feel like relief, not guilt.

### 3. Every screen should answer: “What should I do next?”

Each view has one primary job: orient → prioritize → act. Secondary information stays available but never competes with the next step. If a screen can’t answer that question, it’s not ready.

### 4. Automate repetitive work, not human judgment

CampaignOS drafts, schedules, and remembers. Humans approve tone, approve flyers, and decide what the community needs to hear. The product never implies the volunteer’s judgment is replaceable.

### 5. AI should feel invisible and helpful, not like a chatbot

No “Generate AI content” buttons. No robot mascots. No prompt-engineering UI. Help arrives as natural offers: *“Want me to draft this for you?”* — then gets out of the way.

### 6. Workflow should power the product, but not be exposed as software jargon

Engines, matrices, strategies, and pipelines stay internal. Users see events, dates, people, and next steps — not system architecture.

### 7. Users think in events, dates, people, and next steps

Design around how PTO volunteers actually talk:

- “Book Fair is in three weeks — who’s posting?”
- “Rebecca still needs to approve the flyer.”
- “What’s due this week?”

Not: “Responsibility matrix row updated.”

### 8. Effortless for one person, scales naturally to a full board

Solo communications chairs get a simple Today view. Committee-driven PTOs get roles, ownership, and handoffs — without a different product or mode switch labeled “enterprise.”

### 9. Reduce clicks

Every extra tap is a tax on volunteers who do this on Sunday night after kids are in bed. Prefer smart defaults, inline actions, and “done in one place” over deep settings trees.

### 10. Learn once, reuse everywhere

Organization setup (roles, responsibilities, committees, voice, brand) feeds calendar import, event workspaces, drafts, publishing, and approvals. Jamie should never re-enter the same fact twice.

---

## Product language standards

### Tone

| Do | Don’t |
|----|-------|
| Plain, conversational | Corporate SaaS |
| Specific names and dates | Abstract system states |
| “You’re caught up” | “Zero pending items” |
| “What needs your attention” | “Dashboard overview” |
| Offer help | Command the user |

### Examples — bad → better

| Bad | Better |
|-----|--------|
| “Approval request pending.” | “Rebecca still needs to approve the flyer.” |
| “Communication Strategy = Calendar Only.” | “This event can stay on the calendar. No campaign needed.” |
| “Generate AI content.” | “Want me to draft this for you?” |
| “Communication Health: 43%.” | “You’re halfway through Book Fair communications — 4 posts left.” |
| “Assign playbook to event.” | “Set up the Book Fair communication plan.” |
| “Responsibility matrix default.” | “Who usually handles Facebook for your PTO?” |
| “Engine 7.1 Organization Workspace.” | “How your PTO works — roles and who owns what.” |
| “Calendar Command Center — Planning tab.” | “Calendar — what’s due this week.” |
| “Publication schedule queue.” | “Ready to post.” |
| “No data.” | “Nothing here yet — you’re all set for now.” |

### Words to avoid in user-facing copy

- Engine, sprint, migration, schema
- Matrix, pipeline, workflow (as nouns shown to users)
- AI Brain (prefer “Your organization’s voice”)
- Strategy (prefer “how much communication this event needs”)
- System role, RLS, integration (until actually configuring one)

### Words we keep (when humanized)

- **Event** — volunteers say this
- **Calendar** — universal
- **Draft / Ready / Scheduled / Published** — publishing states everyone understands
- **Role / Committee** — how PTOs actually organize

---

## Screen-level guidance

### Today (future home)

Feels like opening a text from a organized friend: “Here’s what needs you today. Everything else can wait.”

### Calendar

One place to see the school year — events *and* the work around them. Layers, not tabs labeled like software modules.

### Event workspace

A project folder for one event: what’s happening, who’s involved, what’s due, what’s ready to post. Not a “workspace initialized by Engine 3.”

### People (organization)

“How we work” — roles and committees, not HR software. No passwords in v1.

### Settings

School identity, brand, voice, connections. Boring on purpose — visited rarely because CampaignOS already learned the org.

---

## Relationship to onboarding

Onboarding (`15_ORGANIZATION_ONBOARDING.md`) is the first conversation. This philosophy governs every conversation after. Steps 3–5 (roles, responsibilities, committees) should feel like describing your PTO to a friend — the same components power **People** in navigation (`17_NAVIGATION_EXPERIENCE_REDlESIGN.md`).

---

## Success signals

Jamie should say:

- “It already knew Book Fair was Sarah’s thing.”
- “I wasn’t sure what to do next — then I opened Today.”
- “It didn’t feel like software. It felt like someone helping.”

---

## Non-goals (this philosophy sprint)

- No navigation rebuild
- No new backend features
- No removal of existing routes
- No chatbot UI

Copy polish and blueprints only — implementation follows in **Engine 7.15 — Today Experience**.
