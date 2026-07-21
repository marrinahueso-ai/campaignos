# Ask Ralli Assistant

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 21, 2026  
**Related:** [Architecture](./architecture.md) · [Feature list](../product/feature-list.md) · [QA overview](../qa/architecture-overview.md) · [Testing guide](../qa/testing-guide.md)

In-app coach + product guide for Hey Ralli. Users open **Hey Ralli Assistant** from the sidebar (pinned under Insights) and ask operational, briefing, draft, insights, or how-to questions.

**Product rule:** Answers that cite org/event facts must come from loaded context packs (or curated FAQ). Do not invent approvals, tasks, events, metrics, or volunteer counts.

---

## 1. Architecture (routing & sources)

Entry: `askRalliAssistantAction` → `askRalliProductHelp` in `src/lib/ralli-assistant/ask.ts` (name is historical; it routes all Ask Ralli paths).

### Routing precedence (high → low)

| Order | Path | `source` | When |
|------:|------|----------|------|
| 1 | Content draft helper | `content` | Phase 4 write/rewrite intents (`shouldRouteToContentAsk`) |
| 2 | Insights / health / risk | `insights` | Phase 5 (`shouldRouteToInsightsAsk`); yields to content |
| 3 | Org / role briefing | `org` | Phase 2 (+ Phase 3 org-level volunteers/comms) |
| 4 | Event ops coach | `ops` | Phase 1 (+ Phase 3 event-scoped volunteers/comms); also when `eventId` forced |
| 5 | Product-help FAQ | `faq` | Curated topics in `product-help-knowledge.ts` |
| 6 | OpenAI product help | `ai` | Unmatched how-to when AI is configured |
| — | Deterministic fallbacks | `org` / `ops` / `faq` | Missing AI key or model failure → pack/FAQ text, never silent invent |

Classic ops/org status asks (**“what’s next”**, **“today’s summary”**, **“what do I have this week”**, **“what needs my approval”**) must **not** fall through to Calendar/Tasks FAQ keyword collisions. Routing helpers live in `ask-routing.ts` + `*-intent.ts`.

### Sources (what each does)

| Source | Role | Context |
|--------|------|---------|
| `faq` | Curated how-to (“Where do I find approvals?”) | Static topics + link chips |
| `org` | Org/role briefing across the board | `org-briefing-context` pack |
| `ops` | Event-scoped next steps / health of one campaign | `ops-context` pack (+ volunteers/comms sections) |
| `content` | Reminder / caption draft helper | Event resolve + session/Meta captions when available |
| `insights` | Health / risk / performance recommendations | Campaign-director + Meta Insights when metrics exist; honest empty state otherwise |
| `ai` | Free-form product navigation help | System prompt from `buildProductHelpSystemPrompt` — still no org facts |

### Event resolve + forced `eventId`

1. Fuzzy title match via `event-resolver.ts` (`resolveEventFromQuestion`).
2. Pathname `/events/{id}` scopes ops when present.
3. **Ambiguous** (≥2 matches) → answer lists options + **dated chips**; picking a chip re-asks with the same question and `eventId` set.
4. Forced `eventId` skips ambiguity and wins over fuzzy match.

Widget: `src/components/layout/RalliAiAssistantWidget.tsx` (`pickEventOption` → `ask(…, option.eventId)`).

### Context packs & no hallucinated facts

- Org: `buildOrgBriefingContextPack` → serialized JSON into the model; deterministic `formatDeterministicOrgBriefingAnswer` if AI is off/fails.
- Ops: `ops-context` (+ Phase 3 volunteers/comms loaders).
- Insights: metrics when present; otherwise “no performance data yet” + ops fallback.
- Display polish: `answer-display.ts` strips markdown links when link/event chips are shown (chips are the destinations).

### UI placement

Sidebar (`Sidebar.tsx`): scrollable nav ends at Insights; **Hey Ralli Assistant** is pinned below so it stays on screen. Expanded: card + “Ask Ralli →”. Collapsed: sparkles icon (`aria-label="Hey Ralli Assistant"`).

Dialog eyebrows by source: ops/org → **Your next steps**; insights → **Insights**; content → **Draft helper**; faq/ai → **Product how-tos**.

---

## 2. Engineer guide

### Key files

| Path | Purpose |
|------|---------|
| `src/lib/ralli-assistant/actions.ts` | Server action entry |
| `src/lib/ralli-assistant/ask.ts` | Orchestrator + source union |
| `src/lib/ralli-assistant/ask-routing.ts` | Precedence helpers |
| `src/lib/ralli-assistant/*-intent.ts` | Phrase detectors (ops, org, content, insights, volunteers, comms) |
| `src/lib/ralli-assistant/event-resolver.ts` | Match / ambiguous / forced eventId |
| `src/lib/ralli-assistant/ops-*.ts` | Phase 1 (+3) event coach |
| `src/lib/ralli-assistant/org-*.ts` | Phase 2 briefing |
| `src/lib/ralli-assistant/content-*.ts` | Phase 4 drafts |
| `src/lib/ralli-assistant/insights-*.ts` | Phase 5 |
| `src/lib/ralli-assistant/product-help-knowledge.ts` | FAQ topics + links |
| `src/lib/ralli-assistant/answer-display.ts` | Chip-aware body cleanup |
| `src/components/layout/RalliAiAssistantWidget.tsx` | Dialog UI |
| `src/components/layout/Sidebar.tsx` | Pin under Insights |

Unit tests: `src/lib/ralli-assistant/__tests__/*.test.ts`.

### How to extend

1. **New how-to FAQ** — Add a topic in `product-help-knowledge.ts` (keywords, steps, `links`). Keep navigation how-tos out of ops/org intents (`isHowToNavigationQuestion`).
2. **New ops/org intent** — Extend the relevant `*-intent.ts`, ensure `ask-routing.ts` precedence still prefers status asks over FAQ collisions, and load only facts that exist in a context pack.
3. **New phase / source** — Add coach module + `AskRalliSource` value; insert a `shouldRouteTo…` check in `ask.ts` **above** FAQ; map eyebrow in the widget; add unit tests + a Playwright case if user-visible.
4. **New deep links** — Prefer structured `ProductHelpLink[]` chips over markdown links in model output.

### Env

- `OPENAI_API_KEY` — optional; without it, org/ops/insights/content use deterministic pack answers / clear empty states; FAQ still works.
- Playwright auth: `HEY_RALLI_TEST_EMAIL` / `HEY_RALLI_TEST_PASSWORD` (staging only) via `.env.local`.

---

## 3. QA guide

### Playwright smoke

| Spec | `tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts` |
|------|--------------------------------------------------------|
| Run | `./scripts/hey-ralli-test.sh tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts` |
| Or | `npm run test:hey-ralli -- tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts` |
| Needs | App on `HEY_RALLI_BASE_URL` (default `http://localhost:3000`) + test credentials |

**Coverage in that spec**

1. Open Ask Ralli from sidebar → dialog  
2. “Give me today’s summary” / “What needs my approval?” → org/ops (`Your next steps` + Approvals/Today chips), not Calendar FAQ  
3. Ambiguous event chips — asserted only if staging returns them; otherwise annotated skip (unit tests cover resolver)  
4. “Where do I find approvals?” → FAQ + Approvals link (`Product how-tos`)

### Manual test matrix (Phases 1–5)

| Phase | Example questions | Expect |
|-------|-------------------|--------|
| **1 Event ops** | “What should I do next for {Event}?” / ask from `/events/{id}` | Event-scoped next steps; Approvals/event chips; not generic Calendar FAQ |
| **2 Org briefing** | “Give me today’s summary”, “What needs my approval?”, “What do I have this week?” | Org pack facts; **Your next steps**; Approvals / Today chips |
| **3 Volunteers / comms** | “Do I need more volunteers?”, “What’s missing in communications?” | Volunteers/comms sections when data exists; honest gaps otherwise |
| **4 Content** | “Write tomorrow’s reminder”, “Rewrite this caption” | Draft helper path; event resolve / chips if needed |
| **5 Insights** | “What’s my biggest risk?”, “Is my event healthy?” | Insights eyebrow or health/risk language; Metrics empty → honest “no performance data” + ops fallback |
| **FAQ** | “Where do I find approvals?”, “How do I create a campaign?” | **Product how-tos** + deep-link chips |

### UX / regression checklist

- [ ] Sidebar: Ask Ralli card pinned **under Insights** (visible without scrolling the whole nav away)
- [ ] Suggestion chips open a useful answer without typing
- [ ] Ambiguity: dated event option chips → click regenerates with that event (same question)
- [ ] Answer body does not show raw markdown `[Label](/path)` when chips are present
- [ ] Close dialog / backdrop works; AI Brain note links to Settings

### Three known regression bugs (must stay fixed)

| Bug | Bad behavior | Good behavior |
|-----|--------------|---------------|
| What’s next for event + “need to do” | Collapsed to Tasks FAQ | Event ops coach (`ops`) |
| “What do I have this week?” | Collapsed to Calendar FAQ | Org briefing (`org`) |
| “Today’s summary” | Collapsed to Calendar / how-to only | Org briefing with structured today/week content |

---

## 4. Doc map

| Audience | Start here |
|----------|------------|
| Engineers | This doc + `src/lib/ralli-assistant/` |
| QA | §3 above + [testing-guide.md](../qa/testing-guide.md) |
| Status | [feature-list.md](../product/feature-list.md) (AI Brain & assistant) |
