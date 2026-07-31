# Newsletter Composer (QA)

**Status:** Living  
**Owner:** Engineering / QA (Hey Ralli)  
**Last updated:** July 31, 2026  
**Related:** [Engineering companion](../engineering/newsletter-composer.md) · [Feature list](../product/feature-list.md) · [Homepage Composer QA](./homepage-composer.md) · [Storage RLS](../engineering/storage-rls.md) · [Launch checklist](./launch-checklist.md)

Soft-launch scoop-style family email builder. Managers assemble header, leadership message, stories, must-dos (calendar / volunteer / sponsors), footer, reorder layout, preview phone + desktop, and copy email HTML or Membership Toolkit–ready rich text.

---

## Purpose

Produce a family newsletter email from org events and manual content — not a send pipeline inside Hey Ralli. Users copy HTML into their email tool (or paste for review).

---

## Routes

| Surface | Path |
|---------|------|
| Create with AI chooser | `/create-with-ai` → **Newsletter** |
| Composer | `/newsletter-composer` |
| Home Page (sibling) | `/homepage-composer` |
| Social (sibling) | `/create-with-ai/social` |

No separate sidebar nav item — entry is Create with AI → Newsletter (or direct URL).

---

## User workflow

| Step | Label | What to do |
|------|-------|------------|
| 1 | **Header** | Subject, issue name, from name, brand colors, header image upload |
| 2 | **Message** | Leadership names + message, optional PTO note |
| 3 | **Stories** | Pull from events (month filter) and/or add manual stories; messaging, CTA, artwork; include/exclude; ★ featured |
| 4 | **Must-dos** | Calendar chips, volunteer asks (event signup URLs when known), sponsors (logo required), helpful link chips |
| 5 | **Footer** | Social networks, footer CTA headline/label/URL, fine print |
| 6 | **Layout** | Drag / sort layout blocks (header, message, stories, calendar, volunteer, sponsors, links, CTA, socials) |
| 7 | **Preview** | Toggle **phone** vs **desktop** email chrome |
| 8 | **Send** | **Copy email HTML** (full email for ESPs) or **Copy for Membership Toolkit** (rich text, no images — placeholders for artwork); back to Create with AI |

Draft status shows while editing (“Saving draft…”, “Draft saved”).

---

## What shipped (soft launch)

- Scoop-style sections with distinct band styles (news, calendar, volunteer, sponsors, links, follow)
- Stories from events + manual; featured star; include toggles sync into layout blocks
- Calendar chips, volunteer asks (event or manual), sponsors with required logo upload
- Header / story / sponsor / volunteer image upload → hosted HTTPS URLs
- Desktop + phone preview components
- HTML export (full document, table layout, ~560px content width)
- Membership Toolkit export (simplified rich HTML + plain text; image placeholders, no `<img>`)
- Draft autosave: localStorage + IndexedDB v2 envelope (`newsletter-composer:v2:{org}`; reads v1); newest-wins load; flush on hide/unload
- Shared SettingsBox chrome with Homepage Composer

**Not shipped here:** in-app email send, AI blurb generate (Homepage-only today), server-side draft sync.

---

## Test focus / acceptance

### Entry & persistence

1. `/create-with-ai` → **Newsletter** → `/newsletter-composer`.
2. Edit subject + leadership message → navigate away → return — draft restored for the org.
3. Refresh — draft still present.
3b. **Chrome:** Edit subject → wait for “Draft saved” → hard-refresh — latest subject returns (not an older IndexedDB copy). Re-check Safari for parity.

### Content steps

4. Header: set colors + upload header image → Preview shows hosted image (not broken/empty).
5. Stories: add an event for the filtered month → story row with title/date; edit messaging + CTA; mark ★ featured → Preview shows Featured badge / ordering.
6. Manual story: title + messaging + optional art → included in Preview/Export.
7. Must-dos: add calendar chip; volunteer ask with signup URL; sponsor with **logo** (required) + name.
8. Footer: enable Instagram/Facebook/website; set CTA — Preview shows chips + fine print.
9. Layout: drag a block — Preview/Export order follows layout (featured stories before “More news & events” band when applicable).

### Preview / export

10. Phone vs desktop preview both render the same body content.
11. **Send** → Copy email HTML → paste into a mail tester / blank HTML file: sections readable, links work, images are `https://` (no giant base64).
11b. **Send** → Copy for Membership Toolkit → paste into a WYSIWYG (or MTK Quick Email): headings/lists/links survive; no images; lines like `[Image: …]` mark artwork to upload manually.
12. Excluded stories / disabled socials do not appear in either export.

### Access / empty

13. Org with events: month filter lists event months. No events: manual stories / chips / sponsors still work.
14. Artwork upload without sign-in / org fails with a clear error.

---

## Known limitations

- Soft launch — further polish deferred (Feature list).
- Drafts are **browser-local**, not cross-device (Chrome and Safari do not share drafts).
- Autosave debounces ~450ms and flushes on tab hide / unload (same pattern as Homepage).
- No AI Generate text / no credit burn on this surface today.
- **Send** means copy to clipboard (full HTML or MTK rich text) — Hey Ralli does not deliver the email.
- MTK paste does not include images; chairs upload artwork in Membership Toolkit using the placeholders.
- Sponsor logos are required for display; missing logo blocks a clean sponsor row.

---

## Manual smoke (5 minutes)

1. Create with AI → Newsletter.  
2. Set issue name + header image.  
3. Add one event story (featured) + one calendar chip + one sponsor with logo.  
4. Preview phone → desktop.  
5. Copy email HTML and confirm sections + images.  
6. Copy for Membership Toolkit and confirm rich paste + `[Image: …]` placeholders (no embedded images).
