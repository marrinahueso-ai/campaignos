# CampaignOS Design System V1 — Calmness in the Storm

**Status:** Visual foundation — guides UI polish and future screens  
**Last updated:** June 2026  
**Philosophy:** `16_CAMPAIGNOS_EXPERIENCE_PHILOSOPHY.md`, `19_CALMNESS_IN_THE_STORM.md`  
**Navigation context:** `17_NAVIGATION_EXPERIENCE_REDlESIGN.md`

---

## 1. Brand feeling

CampaignOS should feel like **calmness in the storm** — a warm morning workspace where school communications feel organized, achievable, and supported.

**Inspired by:** Apple, Things 3, Bear Notes, Notion, Headspace.

**Not inspired by:** Monday, ClickUp, Airtable, Power BI, startup-purple dashboards.

**Emotional contract:**

| Users should feel | Users should never feel |
|-------------------|-------------------------|
| Organized | Behind |
| Supported | Guilty |
| Confident | Confused |
| Prepared | Overwhelmed |

**Design question for every decision:**

> Does this reduce visual noise?

If not, remove it.

---

## 2. Color tokens

Core palette — warm, soft, human. Purple is for **one primary action per screen**, not decoration.

| Token | Hex | Usage |
|-------|-----|-------|
| `--cos-bg` | `#FCFCFA` | App background — warm white |
| `--cos-card` | `#FFFFFF` | Elevated surfaces |
| `--cos-text` | `#1F2937` | Primary text |
| `--cos-muted` | `#64748B` | Secondary text, metadata |
| `--cos-border` | `#E7ECEB` | Dividers, soft outlines |
| `--cos-primary` | `#4F46E5` | Primary action only |
| `--cos-success` | `#6F8F72` | Complete, published, calm confirmation |
| `--cos-info` | `#DDECF8` | Scheduled, informational |
| `--cos-warning` | `#E7D9B8` | Needs review, gentle nudge |
| `--cos-error` | `#C97B63` | True blockers only — terracotta, not alarm red |

**Rules:**

- Use indigo sparingly — links, one CTA, active wayfinding hint.
- Use sage for success — never bright green badges everywhere.
- Use terracotta for overdue — never `#EF4444` alarm red for normal PTO life.
- Avoid beige overload — warm white + sage accents, not a sepia app.

---

## 3. Typography scale

**Font:** Geist Sans (system fallback). Warm, readable, not corporate.

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Page greeting | 2.25–2.75rem | Semibold | Today hero only |
| Section title | 0.875rem | Medium | Sentence case preferred |
| Card title | 1.25–1.5rem | Semibold | Today's Focus |
| Body | 1rem | Regular | Default reading size |
| Metadata | 0.875rem | Regular | Due dates, weather, counts |
| Label | 0.75rem | Medium | Layer chips, tiny labels |

**Avoid:** ALL CAPS section headers unless weekday timeline labels (MONDAY). Prefer sentence case: "Waiting on you" not "WAITING ON YOU".

**Line length:** Cap prose at ~65 characters (`max-w-2xl`) even in wide layouts.

---

## 4. Spacing rules

**Rhythm:** Generous vertical space between chapters. Sections should breathe.

| Context | Spacing |
|---------|---------|
| Between major sections | 3–3.5rem (`gap-12`–`gap-14`) |
| Inside sections | 1.25–1.5rem |
| List item gaps | 1.5rem |
| Page padding | 1rem mobile / 2rem desktop |
| Max content width | 1200–1400px for Today; full workspace elsewhere |

**Rule:** Increase whitespace before adding borders.

---

## 5. Card styles

**Use cards sparingly.** Most content is open lists with typography hierarchy.

**When to use a card:**

- Today's Focus (one hero recommendation)
- Optional event preview on detail views

**Card recipe (`.cos-card`):**

```
background: var(--cos-card)
border-radius: 1rem
border: 1px solid var(--cos-border) at ~80% opacity
shadow: 0 1px 3px rgba(15, 23, 42, 0.04) — never heavy drop shadows
padding: 1.75–2rem
```

**Do not:** nest cards beside cards. Prefer dividers and whitespace.

---

## 6. Button hierarchy

| Variant | When | Style |
|---------|------|-------|
| **Primary** | One main action per screen | Indigo fill, white text |
| **Secondary** | Supporting actions | White fill, soft border |
| **Tertiary** | Inline links, cancel, low priority | Text only, muted → text on hover |

**Avoid:** Giant purple buttons. Avoid primary styling on every link.

**Component:** `Button` — `primary` | `secondary` | `tertiary` | `danger` (blockers only)

---

## 7. Status colors

Calm mapping for publishing and task states:

| Status | Color family | Tailwind classes |
|--------|--------------|------------------|
| Published / Complete | Sage | `bg-cos-success-bg text-cos-success-text` |
| Scheduled | Soft blue | `bg-cos-info text-cos-info-text` |
| Draft | Slate neutral | `bg-slate-100 text-slate-700` |
| Needs review | Sand | `bg-cos-warning text-cos-warning-text` |
| Approved | Soft blue | Same as scheduled |
| Overdue / blocker | Terracotta | `bg-cos-error-bg text-cos-error-text` |

**Source of truth:** `src/lib/design-system/status-colors.ts`

---

## 8. Empty state language

Empty states are **relief**, not failure.

| Instead of | Use |
|------------|-----|
| No items | You're all caught up. |
| No data | Nothing here yet — you're all set for now. |
| No approvals | Nothing is waiting on anyone else right now. |
| No upcoming events | Nothing scheduled yet — add one when you're ready. |
| Local weather unavailable | *(hide the line entirely)* |
| Error | Let's try that again. |

**Tone:** Teammate, not system log.

---

## 9. Motion principles

- **Subtle:** 150–200ms color and opacity transitions only.
- **No bounce:** No playful spring animations on productivity surfaces.
- **No urgency:** No pulsing red dots or shaking alerts.
- **Celebrate small wins:** Optional gentle fade-in on "You're all caught up" — never confetti.
- **Respect focus:** Page load should feel still, not animated.

---

## 10. Calmness checklist

Before shipping any screen:

- [ ] One obvious primary action?
- [ ] Purple used ≤ 2 times on screen?
- [ ] Red reserved for true blockers?
- [ ] Empty states feel like relief?
- [ ] Copy sounds like a teammate?
- [ ] Whitespace > borders?
- [ ] No dashboard metric hero?
- [ ] Would a busy PTO President feel calmer after this page?

---

## Implementation reference

| Asset | Location |
|-------|----------|
| CSS variables | `src/app/globals.css` |
| Token constants | `src/lib/design-system/tokens.ts` |
| Status styles | `src/lib/design-system/status-colors.ts` |
| Button / Card / Badge | `src/components/ui/` |

**V1 scope:** Global tokens + light polish on Sidebar, Today, Calendar layers, shared UI primitives. Full app migration is incremental — do not rewrite every page at once.

---

## Closing

CampaignOS is successful when the interface disappears and volunteers feel:

*"I know exactly what to do next."*

That is calmness in the storm.
