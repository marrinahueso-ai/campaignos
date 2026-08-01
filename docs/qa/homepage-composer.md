# Homepage Composer (QA)

**Status:** Living  
**Owner:** Engineering / QA (Hey Ralli)  
**Last updated:** July 27, 2026  
**Related:** [Engineering companion](../engineering/homepage-composer.md) · [Feature list](../product/feature-list.md) · [Create with AI artwork inputs](./create-with-ai-artwork-inputs.md) · [Storage RLS](../engineering/storage-rls.md) · [Launch checklist](./launch-checklist.md)

Soft-launch Membership Toolkit–style homepage builder. Managers design header/footer once, refresh cards monthly, preview on/off dates, and export full-page HTML for external hosting.

---

## Purpose

Build a school/PTO homepage block (hero, announcements, event/custom cards with 1:1 artwork, footer CTA, helpful resources) and copy Membership Toolkit–compatible HTML. Drafts persist in the browser; artwork is hosted so export stays lean.

---

## Routes

| Surface | Path |
|---------|------|
| Create with AI chooser | `/create-with-ai` → **Home Page** |
| Composer | `/homepage-composer` |
| Shareable preview (public) | `/share/homepage/[token]` — noindex; Save as PDF via browser print |
| Social (sibling) | `/create-with-ai/social` |
| Newsletter (sibling) | `/newsletter-composer` |

No separate sidebar nav item — entry is Create with AI → Home Page (or direct URL).

---

## User workflow

| Step | Label | What to do |
|------|-------|------------|
| 1 | **Header** | Title, message, two CTAs, **cards section title**, announcements (emoji + text + optional on/off dates on one row), header colors |
| 2 | **Footer** | CTA title/body/button + colors; helpful resource chips (emoji, label, URL) |
| 3 | **Cards** | Pick events (month/year filter) and/or add evergreen custom cards; edit title, blurb, link URL + **link label**, card face **date**, on/off visibility, always-on; upload artwork or deep-link to Create with AI for milestones; sort/reorder |
| 4 | **Preview** | Full-page preview; **full month** (all cards) or date scrubber for on/off visibility; full-month **Open page** / **Save as PDF** (share page print) |
| 5 | **Export** | Copy full-page Membership Toolkit HTML |

Draft status shows in the chrome (“Saving draft…”, “Draft saved”).

---

## What shipped (soft launch)

- SettingsBox step layout + emoji pickers on announcements / resources
- Event cards seeded from campaign events (title, description, date/time, approved square art, volunteer signup URL when present)
- Evergreen **custom** cards with optional link URL, editable **link label**, card face **date** (display only — not visibility), **on date** / **off date** / **always on**
- Hosted 1:1 artwork: compress → upload → public URL (not base64 in export)
- Create with AI deep-link icons on event cards (open Social for that event / milestones)
- AI **Generate text** on card description (≤2 sentences; spends credits as `homepage_composer_blurb`)
- Durable draft autosave: localStorage + IndexedDB; flush on navigate / tab hide / unload
- Full-month + date-slider preview; shareable full-month link at `/share/homepage/[token]` (server snapshot + on/off memos); **Save as PDF** opens share page print dialog; export HTML includes show/hide script for `data-starts` / `data-expires`
- Approvals on share links — **Partial** / later (`share_status`, `approval_item_id` stub in DB; no UI yet)

---

## Test focus / acceptance

### Entry & persistence

1. From `/create-with-ai`, **Home Page** → lands on `/homepage-composer`.
2. Edit header title → leave for Create with AI → return — draft restored (same org).
3. Hard-refresh mid-edit — draft still present; status settles to “Draft saved”.

### Cards

4. Select an event for the current month → card appears with title/blurb/date/art when available.
5. Set **link label** (e.g. “Sign up →”) + link URL → Preview/Export show that label (default “Learn More →” when empty).
6. Set card face **date** distinct from on/off dates → face shows display date; visibility follows starts/expires/always-on.
7. Toggle **Always on** vs on/off dates → Preview full-month shows all; scrubber hides out-of-window cards.
8. Upload JPG/PNG/WebP artwork → card shows hosted `https://` URL (not a giant data URL in Export).
9. **Generate text** with title or notes → ≤2 sentences; blurb fills; credits ledger shows Homepage Blurb / `homepage_composer_blurb` when AI is configured.
10. Create with AI icon on an event card → opens Social / campaign builder for that event (not a dead link).

### Preview / export

11. Preview matches Export structure (hero, announcements, cards, footer CTA, resources).
12. Export HTML: no `data:` image URLs; cards with starts/expires carry `data-starts` / `data-expires`; script hides correctly for a chosen “today”.
13. Copy HTML succeeds; paste into a blank page / Membership Toolkit sandbox looks sane on desktop + narrow width.
14. **Chrome:** On Preview, drag the date slider — cards must roll on/off live (not stuck on the first paint). Artwork should appear (hosted `https://` or still-pending `data:`). Re-check in Safari for parity.
15. Full month → **Open page** → share URL opens in new tab / send to colleague → page renders all cards with on/off memos; **Save as PDF** opens print dialog (or `?print=1` auto-print). Live preview and Export/Copy HTML must **not** show those memos.

### Access / empty

16. Signed-in org with events: event picker populated. No events: can still add custom cards and export.
17. Signed out / no org: AI generate and artwork upload fail with clear sign-in messaging (draft may still use local key).

---

## Known limitations

- Soft launch — further blurb/copy polish deferred (see Feature list).
- Drafts are **browser-local** (per org id), not server-synced across devices.
- Quota: oversized localStorage may strip embedded data-URLs from the LS mirror; IndexedDB holds the full draft when available.
- Export omits unhosted (`data:`) artwork — upload first for production HTML.
- AI generate requires configured AI + available credits; no offline fallback copy.
- Not a live hosted site inside Hey Ralli — users paste HTML into Membership Toolkit / their CMS.

---

## Manual smoke (5 minutes)

1. Create with AI → Home Page.  
2. Tweak header + one announcement.  
3. Add one event card + one custom card; set link label + on/off dates; upload art on one.  
4. Generate text on the custom card.  
5. Preview scrubber across dates (**in Chrome**) → Export → confirm hosted images + dates.
