# Newsletter Composer (QA)

**Status:** Living
**Owner:** Engineering / QA (Hey Ralli)
**Last updated:** August 10, 2026
**Related:** [Engineering companion](../engineering/newsletter-composer.md) · [Feature list](../product/feature-list.md) · [Homepage Composer QA](./homepage-composer.md) · [Access control](../engineering/access-control.md) · [Launch checklist](./launch-checklist.md)

Community email builder plus a durable **Newsletter → Approval → Send** workflow: draft in the composer, submit for approval through the org Approvals hub, then send/schedule separately once approved.

---

## Routes

| Surface | Path | Gate |
|---------|------|------|
| Create with AI chooser | `/create-with-ai` → **Newsletter** | Any active member |
| Composer | `/newsletter-composer` (`?newsletterId=` to reopen a durable draft) | `draft_edit` to save |
| Newsletters list | `/newsletters` | Any active member |
| Newsletter detail | `/newsletters/[id]` | Any active member |
| Prepare to send | `/newsletters/[id]/send` | `send_newsletter` |
| Newsletter Contacts | `/newsletter-contacts` | `manage_newsletter_contacts` |
| Unsubscribe (public) | `/newsletter/unsubscribe?token=...` | None — public, token-based |
| Home Page (sibling) | `/homepage-composer` | — |
| Social (sibling) | `/create-with-ai/social` | — |

No separate sidebar nav item for the composer itself — entry is Create with AI → Newsletter, a newsletter's own "Edit" action, or direct URL. `/newsletters` and `/newsletter-contacts` are on the dashboard nav.

---

## Composer workflow (drafting)

| Step | Label | What to do |
|------|-------|------------|
| 1 | **Header** | Subject, issue name, from name, brand colors, header image upload |
| 2 | **Message** | Leadership names + message, optional PTO note |
| 3 | **Stories** | Pull from events (month filter) and/or add manual stories; messaging, CTA, artwork; include/exclude; ★ featured |
| 4 | **Must-dos** | Calendar chips, volunteer asks (event signup URLs when known), sponsors (logo required), helpful link chips |
| 5 | **Footer** | Social networks, footer CTA headline/label/URL, fine print |
| 6 | **Layout** | Drag / sort layout blocks (header, message, stories, calendar, volunteer, sponsors, links, CTA, socials) |
| 7 | **Preview** | Phone vs desktop toggle; **Send a test email**; **Send for approval**; **Copy email HTML**; **Copy for Membership Toolkit** |

Draft status shows while editing ("Saving draft…", "Draft saved"). **The old standalone Send step is gone** — everything that used to live there now lives on Preview, plus the two new production actions.

---

## What shipped

- Scoop-style sections with distinct band styles (news, calendar, volunteer, sponsors, links, follow); stories from events + manual; featured star; include toggles sync into layout blocks; calendar chips, volunteer asks, sponsors with required logo; header/story/sponsor/volunteer image upload → hosted HTTPS URLs; desktop + phone preview; HTML export + Membership Toolkit export (unchanged from soft launch)
- Browser-local draft autosave (localStorage + IndexedDB v2 envelope, newest-wins, flush on hide/unload) **plus** a server-durable save once a draft has an id (`newsletters` row)
- Immutable version snapshots on submit, with a content fingerprint that auto-invalidates approval when content or audience changes after approval
- Submit-for-approval bridges into the org Approvals hub (same queue as Social/Flyer); approve / request-changes there **only marks the newsletter approved — it does not send**
- Separate **Send Now** / **Schedule** (with cancel/reschedule) at `/newsletters/[id]/send`, gated on `send_newsletter`
- Newsletter Contacts (manual add, CSV import with an authorization attestation) and Newsletter Audiences, both gated on `manage_newsletter_contacts`, both fully separate from Team & Access users/roles
- Send a test email to manually entered recipients (never the audience), gated on `draft_edit` or `send_newsletter`
- Public unsubscribe page + per-recipient hashed tokens; Resend webhook auto-suppresses hard bounces and spam complaints
- Server-generated compliance footer (org name, mailing address, unsubscribe link) — never author-editable

**Gated, not yet fully live everywhere:** production delivery to a newsletter's real audience (Send Now, scheduled sends, and the scheduled-send cron) requires `NEWSLETTER_PRODUCTION_SEND_ENABLED=true` **and** the two `20260810*` migrations applied on that environment. With the gate off, the send validator blocks with an explicit "production sending is disabled" error — drafting, approval, contacts/audiences, and test sends all work regardless.

**Not shipped:** AI blurb generate on this surface (Homepage-only today), multi-provider send (Resend only).

---

## Test focus / acceptance

### Entry & persistence

1. `/create-with-ai` → **Newsletter** → `/newsletter-composer`.
2. Edit subject + leadership message → navigate away → return — draft restored for the org.
3. Refresh — draft still present.
3b. **Chrome:** Edit subject → wait for "Draft saved" → hard-refresh — latest subject returns (not an older IndexedDB copy). Re-check Safari for parity.
3c. Save once with a `newsletterId` present (e.g. reopened from `/newsletters/[id]`) → confirm the durable `newsletters` row updates too (check `/newsletters/[id]` reflects the new subject after a save), not just the local draft.

### Content steps

4. Header: set colors + upload header image → Preview shows hosted image (not broken/empty).
5. Stories: add an event for the filtered month → story row with title/date; edit messaging + CTA; mark ★ featured → Preview shows Featured badge / ordering.
6. Manual story: title + messaging + optional art → included in Preview/Export.
7. Must-dos: add calendar chip; volunteer ask with signup URL; sponsor with **logo** (required) + name.
8. Footer: enable Instagram/Facebook/website; set CTA — Preview shows chips + fine print.
9. Layout: drag a block — Preview/Export order follows layout (featured stories before "More news & events" band when applicable).

### Preview / export (unchanged)

10. Phone vs desktop preview both render the same body content.
11. Copy email HTML → paste into a mail tester / blank HTML file: sections readable, links work, images are `https://` (no giant base64).
11b. Copy for Membership Toolkit → paste into a WYSIWYG (or MTK Quick Email): headings/lists/links survive; no images; lines like `[Image: …]` mark artwork to upload manually.
12. Excluded stories / disabled socials do not appear in either export.

### Approval ≠ send

13. Fill a minimal newsletter, subject required → **Send for approval** as a user with `submit_approval` (no `send_newsletter`) — succeeds; status becomes **Needs approval**; approver notified (or "notified in the app only" if email isn't configured).
14. As an approver with `approve_comms` but **without** `send_newsletter`: open the Approvals hub, approve the newsletter — succeeds; status becomes **Approved**. Confirm **no email is delivered to the audience** as a side effect of this action (no `newsletter_sends` row is created).
15. As a user with `send_newsletter` but who did **not** approve it: open `/newsletters/[id]/send` — the prepare-to-send validator loads and Send Now / Schedule are available (approval itself was never gated on holding send access).
16. Request changes from the Approvals hub with a note → status becomes **Changes requested**, note visible to the creator, creator notified; resubmitting after edits sends "resubmitted" copy instead of "approval assigned."

### Audience change forces re-approval

17. Approve a newsletter, then go back and change its **audience** (not content) → status rolls back to **Draft**; the approved version/audience pointers clear; any pending scheduled send for it is cancelled. Confirm via `/newsletters/[id]` audit trail (`approval_invalidated`, reason "Content changed after approval").
18. Approve a newsletter, then only change its **proposed send time** (not content, not audience) → approval is **not** invalidated; status stays **Approved**/**Scheduled**.
19. Approve a newsletter, edit body copy (e.g. a story's message) → same invalidation as #17.

### Send validator / production gate

20. With `NEWSLETTER_PRODUCTION_SEND_ENABLED` unset or `false`: approve a newsletter, open `/newsletters/[id]/send` — the validator explicitly reports production sending is disabled; Send Now / Schedule are blocked. Test send still works on the same newsletter.
21. With the gate enabled in a test environment with the migrations applied: approve a newsletter with at least one eligible contact in the approved audience, Send Now succeeds — a `newsletter_sends` row completes `sent`, recipients get real emails with a working unsubscribe link.
22. Attempt Send Now on a newsletter whose current draft no longer matches its approved version (edit after approval, before re-submitting) — validator blocks with "re-submit for approval."
23. Attempt Send Now with zero eligible contacts in the approved audience (e.g. an empty or fully-suppressed audience) — validator blocks with "no eligible recipients."
24. Double-click Send Now (or resend the same request) on an already-sent newsletter — no duplicate email; the existing `newsletter_sends` row is returned untouched (idempotency key).
25. Schedule a future send, then reschedule the time — approval status is unaffected; then cancel the schedule — newsletter returns to **Approved** (not **Draft**).

### Test send

26. From Preview, send a test to 1–2 manually entered addresses. Confirm: subject prefixed `[TEST]`, a yellow "not delivered to your audience" banner at the top, unsubscribe link is a dead `#` (no real token), and the send does **not** change the newsletter's status, version, or appear in `/newsletters/[id]`'s send history.
27. A user with only `draft_edit` (no `send_newsletter`) can still send a test.

### Contacts, audiences & unsubscribe

28. `/newsletter-contacts`: add a contact manually; import a small CSV (must check the authorization attestation or the import is rejected); confirm duplicate emails within one CSV are skipped, not double-created.
29. Re-import a CSV containing an email that was previously **unsubscribed** — confirm the contact's status stays `unsubscribed` (name fields may still refresh); it is never silently reactivated.
30. Create an audience, add/remove members from the contacts list; confirm eligible/excluded counts on a newsletter's audience reflect only `active` members, deduped by email.
31. Click a real unsubscribe link (or hit `/newsletter/unsubscribe?token=<known token>` in a test env) — contact flips to `unsubscribed`; visiting the same link again shows "already unsubscribed" instead of erroring; an invalid/garbage token shows "link not found," not a stack trace.
32. Confirm a newsletter contact is **not** listed anywhere in Team & Access, and a Team & Access member is **not** automatically a newsletter contact.

### Access / empty

33. Org with events: month filter lists event months. No events: manual stories / chips / sponsors still work.
34. Artwork upload without sign-in / org fails with a clear error.
35. A user without `manage_newsletter_contacts` hitting `/newsletter-contacts` sees a clear "you don't have permission" message, not a crash.
36. A user without `send_newsletter` hitting `/newsletters/[id]/send` sees a clear "you don't have permission" message; a newsletter not yet `approved`/`scheduled` shows "needs to go through approval before it can be sent."

---

## Known limitations

- Composer drafts are still **browser-local** for the fast-path autosave (Chrome and Safari do not share drafts); the durable server save only covers fields the composer explicitly pushes on save, keyed by newsletter id.
- No AI Generate text / no credit burn on this surface today.
- Resend is the only wired delivery provider.
- Production send is fail-closed by default (`NEWSLETTER_PRODUCTION_SEND_ENABLED`) — most environments will show sends blocked until an operator explicitly enables it and confirms the migrations are applied.
- MTK paste does not include images; chairs upload artwork in Membership Toolkit using the placeholders.
- Sponsor logos are required for display; missing logo blocks a clean sponsor row.

---

## Manual smoke (10 minutes)

1. Create with AI → Newsletter. Set issue name + header image. Add one event story (featured) + one calendar chip + one sponsor with logo. Preview phone → desktop.
2. Send a test email to yourself; confirm the TEST banner and dead unsubscribe link.
3. Send for approval. As an approver (different permission set, `approve_comms` only), approve it from the Approvals hub — confirm no audience email went out.
4. As a `send_newsletter` holder, open `/newsletters/[id]/send`; confirm the validator reports the production gate status accurately for your environment.
5. Change the audience on the now-approved newsletter — confirm it drops back to Draft; re-submit for approval.
6. Copy email HTML and confirm sections + images; Copy for Membership Toolkit and confirm rich paste + `[Image: …]` placeholders (no embedded images).
