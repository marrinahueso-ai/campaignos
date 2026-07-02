# CampaignOS 2.0 — The AI Brain

**Purpose:** Define how artificial intelligence works in CampaignOS — from the user's perspective, not the engineer's.  
**Last updated:** June 2026

---

## What the AI Brain Is

The AI Brain is the **invisible intelligence** at the center of CampaignOS.

Jamie never "talks to AI." She never writes prompts. She never sees a chat window.

She clicks **Generate** — and the right content appears in the right place, in the right voice, for the right channel, at the right moment in the timeline.

The AI Brain is not a feature. It is the **engine of the operating system.**

---

## What the AI Brain Is Not

- Not a chatbot on the side of the screen
- Not a blank-page writing assistant
- Not an autopilot that publishes without review
- Not a generic "make me a post" tool
- Not visible as a settings page or configuration panel

If Jamie thinks about "the AI," we've failed. She should think: *"CampaignOS wrote this for me."*

---

## The AI Brain's Job

| Job | User-facing outcome |
|-----|---------------------|
| **Understand context** | Content reflects the specific event, school, and moment |
| **Generate channel-native copy** | Facebook sounds like Facebook; newsletters sound like newsletters |
| **Respect organization voice** | Every output matches the PTO's tone and brand |
| **Follow playbook timing** | A "7 days out" post feels different from a "day of" post |
| **Reduce editing, not eliminate it** | Jamie tweaks 10%, not writes 100% |
| **Never surprise the board** | All output is draft until approved |

---

## What the AI Brain Knows

The AI Brain draws context from the entire CampaignOS hierarchy:

### From the Organization
- School name and PTO name
- Brand tone (friendly, professional, enthusiastic)
- Default hashtags
- Logo and color palette (for creative briefs)
- Mission statement

### From the School Year
- Active year context ("Welcome back to 2025–2026!")
- Seasonal awareness (fall kickoff vs. spring wrap-up)

### From the Event
- Title, description, date, time, location
- Audience (families, staff, students)
- Theme and category
- Event owner

### From the Communication Playbook
- Event type (Book Fair, PTO Meeting, etc.)
- Countdown node context ("30 days out" vs. "day of")
- Channel mapping for this node
- Content focus guidance per node

### From the Timeline
- What's already been published (don't repeat save-the-date language)
- What's coming next (build narrative arc across communications)
- Due date urgency

---

## What the AI Brain Produces

### 1. Channel Communications

For each Communications Hub card, the AI Brain generates channel-appropriate copy:

| Channel | Output characteristics |
|---------|----------------------|
| **Website Announcement** | 2–3 paragraphs, informative, link-friendly |
| **Newsletter** | 3–5 sentences, scannable, suitable for school bulletin |
| **Facebook** | Conversational, emoji-appropriate, clear CTA, community tone |
| **Instagram** | Shorter, visual-forward, hashtag suggestions |
| **Email** | Subject line + body, warm and direct |
| **Flyer** | Headline + body copy + call-to-action for print layout |
| **Principal Notes** | Professional, brief, staff-facing tone |
| **Morning Announcements** | 2–3 sentences, readable aloud by a student |
| **Volunteer Signup** | Action-oriented, specific roles and time commitments |

### 2. Timeline-Linked Messages

Each countdown node receives content tailored to its timing:
- **30 days out:** Save the date energy — informational, low urgency
- **7 days out:** Momentum — volunteer calls, logistics
- **Day before:** Reminder — time, place, what to bring
- **Day of:** Celebration — "happening today!"
- **Thank you:** Gratitude — community, impact, photos

### 3. Creative Briefs

For Creative Asset cards, the AI Brain generates:
- Artwork descriptions for Canva or a volunteer designer
- Suggested color usage from org brand palette
- Headline text for flyers and graphics
- Instagram Story layout suggestions

(Full image generation is a future capability — Sprint 6+.)

---

## How Jamie Experiences the AI Brain

### Scenario: Book Fair, 7-Day Reminder

1. Jamie opens the Book Fair workspace
2. Timeline shows: "7 days out · One-Week Push · Due today"
3. She clicks the node → sees Facebook and Email channels need content
4. She clicks **Generate** on the Facebook card
5. Within seconds, she sees:

> "One week until our Fall Book Fair! 📚 Join us next Thursday in the gym from 5–8 PM. Stock up on great reads and support our library. Volunteer slots still open — link in comments! #LincolnPTO #BookFair"

6. She changes "next Thursday" to "October 11" and clicks **Approve**
7. She copies the text, posts to Facebook, marks as **Published**
8. Timeline node turns green. Dashboard removes it from Today's Actions.

**Jamie never saw "AI." She saw CampaignOS working.**

---

## Generation Modes

### Generate One
Jamie generates a single channel card. Other cards untouched. Existing edits preserved.

### Generate All
Jamie generates all draft channel cards for the event in one action. Progress indicator: "Generating 9 communications..."

### Generate from Timeline
Jamie clicks a timeline node → generates all channels mapped to that node.

### Regenerate
Jamie is unhappy with one output. She clicks Regenerate on that card only. Previous version saved in history. Other cards unaffected.

---

## Voice & Tone Guardrails

The AI Brain must sound like a **helpful parent volunteer**, not a corporation:

| Do | Don't |
|----|-------|
| Warm, inclusive, community-focused | Corporate marketing speak |
| Clear calls to action | Vague "learn more" without context |
| Appropriate emoji on social (1–3) | Emoji overload |
| Respect parent time ("Join us Thursday at 5 PM") | Assumption of unlimited availability |
| Inclusive language ("families" not "moms and dads") | Exclusionary or gendered assumptions |
| School-appropriate tone | Salesy or urgent-scarcity tactics |

The organization's tone setting (friendly / professional / enthusiastic) adjusts the baseline.

---

## Safety & Trust

### Human review is mandatory
Nothing the AI Brain generates goes live without human action. Draft → Review → Approve → Publish.

### Board governance
Approved content is locked. Regeneration requires explicit unlock.

### Content safety
The AI Brain avoids:
- Promises about fundraising amounts not confirmed
- Statements that contradict school policy
- Content that could embarrass the school or PTO
- Personal information about staff or students

### Transparency
Jamie can always see:
- When content was generated
- Which version is current
- What she edited vs. what was generated

---

## The AI Brain and Decision Fatigue

| Decision Jamie used to make | AI Brain handles it |
|----------------------------|---------------------|
| "What should the Facebook post say?" | Generates channel-native copy |
| "When should we post about the book fair?" | Playbook + timeline |
| "Should this be formal or casual?" | Organization tone setting |
| "What channels do we need to cover?" | Playbook channel mapping |
| "What's the save-the-date vs. reminder tone?" | Timeline node context |
| "What should the flyer headline be?" | Creative brief generation |

Jamie's remaining decisions:
- Edit or accept the draft
- Approve or request changes
- Publish or skip
- Adjust the playbook if the schedule isn't right

**From 20 decisions to 4.**

---

## AI Brain Visibility in the Product

The AI Brain has **no nav item, no settings page, no chat widget.**

It appears only as:
- **Generate** buttons on communication cards
- **Generate All** in workspace hero
- **Regenerate** on individual cards
- Subtle attribution: "Draft generated by CampaignOS" (not "Powered by GPT-4")

Settings that influence the AI Brain live under Organization → Voice & Tone — framed as "how your school communicates," not "AI configuration."

---

## Learning Over Time (Future)

Future versions of the AI Brain will:
- Learn from Jamie's edits (preferred phrasing, local terminology)
- Improve playbooks based on what published content performed well
- Suggest playbook adjustments: "Your book fairs get more engagement with Instagram at 14 days — add a node?"

These are post-2.0 capabilities. The foundation is context-rich generation with human review.

---

## Success Criteria

Jamie generates a full set of Book Fair communications and edits less than 20% of the total word count before approving.

Dana reads the approved Facebook post and thinks: *"This sounds like us."*

The AI Brain is working when volunteers forget it's AI — and just trust CampaignOS.

---

## Relationship to Other 2.0 Systems

```
Communication Playbook → defines WHEN and WHICH channels
        ↓
Communication Timeline → visualizes the schedule
        ↓
AI Brain → generates WHAT for each channel at each moment
        ↓
Communications Hub → stores and displays generated assets
        ↓
Approval Workflow → humans review before publish
        ↓
Publishing Center → content goes live
```

The AI Brain is the middle of the chain — invisible, essential, trustworthy.
