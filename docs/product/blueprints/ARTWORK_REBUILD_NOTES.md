# Artwork Rebuild Notes

**Status:** Artwork v2 **complete** (June 2026)  
**Active entry:** Event Workspace → **Artwork** tab (`/events/[id]#artwork`)

---

## Current state (Artwork v2)

### Active experience

1. **Event Workspace → Artwork tab** — full workflow via `ArtworkV2Shell`
2. **Screen flow:** Pick campaign item → Describe artwork → Generate → Review (2-up) → Approved
3. **Generation:** `generateArtworkV2Action` — human-directed only; exactly 2 versions
4. **Review actions:** Approve, Deny, Like this but adjust (appends 2 new versions)
5. **Image display:** `object-contain`, neutral `#f7f6f3` background, no cropping (`GeneratedArtworkFrame`)
6. **Hero promotion:** Approved artwork becomes event hero image **only when no hero image exists**

### Inactive (preserved on disk)

- **`/creative-studio`** — placeholder: “Artwork is being rebuilt.”
- **Sidebar** — no Artwork / Creative Studio nav link
- **Legacy generation** — `generateArtworkConceptsAction` blocked while `ARTWORK_SECTION_DISABLED = true`
- **Creative Director path** — prompt builders, style memory, auto-inspiration not used by v2

### Preserved data

- All database tables and migrations
- Storage buckets and uploaded/generated files
- `event_assets`, `event_artwork_concepts`, versions, approval records
- Legacy code under `src/lib/ai-artwork/`, `src/components/creative-studio/`, `src/lib/creative-director/`

---

## Why the old section was removed

The previous Artwork / Creative Studio implementation accumulated layers of automatic creative direction that worked against user intent:

| Problem | Examples |
|---------|----------|
| Hidden prompt assembly | Creative Director blocks, art direction, quality bars |
| Event context injection | School name, brand colors, platform wording, event facts |
| Style learning | Style memory, approved-artwork profiles, auto-inspiration ranking |
| Inspiration over-specification | “Do not copy”, “use as guide”, reference guidance text |
| Prompt builders | Brief-driven templates, negative prompts |

Users could not get predictable results because CampaignOS was acting as a second Creative Director.

---

## Artwork v2 principle

> **User is the Creative Director.**  
> **CampaignOS only manages workflow and storage.**

### What Artwork v2 sends to the image model

**Initial generation:**

1. **User manual prompt** — exactly as typed
2. **Optional inspiration image** — one image attached to the API; no text explaining how to use it
3. **Technical output size / aspect ratio** — via API `size` param for the selected asset type

**Adjust generation:**

1. **Original manual prompt** (unchanged from first describe step)
2. **User adjustment comments** (from modal)
3. **Same optional inspiration image** if one was used
4. **Same technical output size**

Combined adjust prompt format: `{original}\n\n{comments}` — nothing else.

### What Artwork v2 does NOT do

- Inject event title, date, school name, or brand colors into the prompt
- Add typography, layout, composition, mood, or style instructions
- Run style memory or approved-artwork learning into generation
- Auto-select inspiration or rank reference artwork
- Append quality bars, negative prompts, or “do not copy” language
- Rewrite or enhance the user's prompt

---

## Phase summary

| Phase | Deliverable |
|-------|-------------|
| 1 | Workflow shell — pick / create / review / approved screens |
| 2 | Review UX — 2-up grid, object-contain, approve/deny/adjust placeholders |
| 3 | `generateArtworkV2Action` — 2 real versions, clean prompt path |
| 4 | Approve / deny / adjust wired; hero promotion when empty |
| 5 | Live UX verification + documentation |

---

## Key files

| File | Role |
|------|------|
| `src/components/artwork-v2/ArtworkV2Shell.tsx` | State machine + server action wiring |
| `src/lib/artwork-v2/actions.ts` | generate / approve / deny / adjust |
| `src/lib/artwork-v2/generation.ts` | Shared 2-version OpenAI + storage loop |
| `src/lib/artwork-v2/prompt.ts` | Adjust prompt = original + comments |
| `src/lib/artwork-v2/hero.ts` | Promote approved art to hero when empty |
| `src/lib/artwork-v2/image-size.ts` | Asset type → technical size preset |
| `src/components/artwork/GeneratedArtworkFrame.tsx` | object-contain frame |
| `src/components/event-workspace/CampaignCreativeTab.tsx` | Mounts v2 shell on Artwork tab |
| `src/lib/creative-studio/artwork-section-disabled.ts` | Legacy generation still blocked |
| `scripts/verify-artwork-v2-generation.ts` | Prompt audit proof (9 checks) |

---

## Review behavior

| Action | Behavior |
|--------|----------|
| **Approve** | Concept → approved; other pending concepts discarded; campaign asset updated; hero set if empty |
| **Deny** | Version removed from grid; hard delete or `discarded` status; parent asset untouched |
| **Adjust** | Modal → 2 new versions **appended** to grid; originals remain until denied |
| **Empty grid** | “No versions left. Try generating again.” |

---

## Verification (June 2026)

```bash
npm run dev:clean
npm run lint          # pass
npm run verify        # pass — CampaignOS Healthy
npx tsx scripts/verify-artwork-v2-generation.ts   # 9/9 prompt checks
```

Test event: **`dcf56e7f-d90e-4372-9750-b2c43e0b9c77`** (Fun Run, full campaign)

Interactive flow (pick item → generate → deny → adjust → approve → return) requires browser + `OPENAI_API_KEY` for end-to-end OpenAI verification.

---

## Related docs

- `docs/SPRINTS.md` — Artwork v2 sprint entry
- `docs/RELEASE_0_5.md` — Release checkpoint including Artwork v2
- `docs/ARTWORK_FOUNDATION_REPAIR_PLAN.md` — earlier repair planning (pre-removal)
