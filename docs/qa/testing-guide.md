# Hey Ralli Testing Guide

This guide is for non-developers. It explains the two quality tools set up for Hey Ralli:

1. **Sentry** — watches for real errors while people use the app  
2. **Playwright** — runs automatic “smoke tests” that click through important pages

---

## What Sentry does

Sentry is like a silent alarm system for Hey Ralli.

When something breaks in the app (a page crash, a failed AI generation, a failed email send, a failed Meta publish, and similar), Sentry can record:

- that an error happened
- which page or area it happened on
- which release/environment it happened in

Sentry is configured with **privacy-first** settings. It should **not** record passwords, auth tokens, payment details, uploaded file contents, private messages, or children’s information.

Sentry only sends data when you add a Sentry project DSN (see “What I need to do” in the summary).

---

## What Playwright does

Playwright is an automated browser.

It opens Hey Ralli like a real person would and checks critical workflows, for example:

- Does the app load?
- Can someone reach the login page?
- Can a test user sign in?
- Do Dashboard and Team & Access load?
- Does Create with AI load?
- Create with AI Creative Setup wiring (playbook, Overall inspiration comment, logo/colors/voice, Your Selections persistence)? (`13-create-with-ai-artwork-inputs`) — see [create-with-ai-artwork-inputs.md](./create-with-ai-artwork-inputs.md)
- (Optional / longer) Artwork generate → Send for approval notice → Approvals hub badges? (`09-artwork-generation-approval`)
- (Optional / longer) Golden artwork inputs generate / Edit Artwork regenerate? (`13b-create-with-ai-artwork-generation-inputs`, gated by `HEY_RALLI_SKIP_ARTWORK_GENERATION`)
- Ask Ralli Assistant: sidebar open, org/ops vs FAQ routing, Approvals how-to (`12-ask-ralli-assistant`) — see [ask-ralli-assistant.md](../engineering/ask-ralli-assistant.md)
- Does an invalid invite link show a clear error?
- (Optional) Does a pending invite show password setup?
- (Optional) Are Inspiration uploads hidden when `upload_artwork` is off?

It never intentionally deletes production data. Authenticated tests are designed to use **test/staging credentials** only.

---

## How I run the tests

### 1. Make sure the app is running locally

In a terminal, from the project folder:

```bash
npm run dev
```

Leave that running.

### 2. Run the smoke tests

In a second terminal:

```bash
npm run test:hey-ralli
```

### 3. Watch the tests visually (optional)

```bash
npm run test:hey-ralli:ui
```

This opens Playwright’s visual interface so you can watch or re-run tests.

### Optional environment values for signed-in tests

Add these to `.env.local` (never commit this file):

```bash
HEY_RALLI_BASE_URL=http://localhost:3000
HEY_RALLI_TEST_EMAIL=your-staging-user@example.com
HEY_RALLI_TEST_PASSWORD=your-staging-password
HEY_RALLI_TEST_EVENT_ID=your-staging-event-id
# Optional — member with upload_artwork denied (e.g. developer template override)
HEY_RALLI_TEST_NO_UPLOAD_EMAIL=restricted-staging-user@example.com
HEY_RALLI_TEST_NO_UPLOAD_PASSWORD=their-staging-password
# Optional — pending invite token from Team & Access (staging only)
HEY_RALLI_TEST_INVITE_TOKEN=paste-pending-invite-token-here
# Optional — keep true in CI to avoid burning AI credits (smokes 09 / 13b)
HEY_RALLI_SKIP_ARTWORK_GENERATION=true
```

If those values are missing, login/dashboard/Create-with-AI/restricted-upload/invite-form tests will be **skipped** instead of failing against production. The invalid-invite smoke test always runs.

Artwork input matrix (what feeds AI artwork, Layer A vs C): [create-with-ai-artwork-inputs.md](./create-with-ai-artwork-inputs.md).

**School calendar import dedupe** (ICS UID / Google id / AI fingerprint; Update on date change) — not Meta post DnD: [calendar-import-dedupe.md](./calendar-import-dedupe.md).

- Unit: `npm run test:calendar-import`
- Playwright: `npm run test:hey-ralli -- tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts`

**Meta Calendar DnD / native Graph schedules** (Approve → `graph_schedule_id`; drag reschedule without re-approval) — not school-event import: [meta-calendar-dnd.md](./meta-calendar-dnd.md).

- Unit: `npm run test:communications-calendar` and `npm run test:meta-publishing`
- Playwright: none yet (manual checklist in that doc)

---

## Where I see failed-test screenshots

When a test fails, screenshots are saved under:

`test-results/hey-ralli/`

There is also a plain-English text report at:

`test-results/hey-ralli/hey-ralli-report.txt`

And an HTML report at:

`playwright-report/hey-ralli/`

Open the HTML report with:

```bash
npx playwright show-report playwright-report/hey-ralli
```

---

## Where I see Sentry errors

1. Go to [https://sentry.io](https://sentry.io)
2. Open your Hey Ralli organization/project
3. Click **Issues**

You will only see errors after:

- you create the Sentry project
- you add `NEXT_PUBLIC_SENTRY_DSN` to local and Vercel env vars
- the app is redeployed / restarted

---

## What information to send a developer

When something fails, send:

- the test name that failed
- the plain-English explanation from `hey-ralli-report.txt`
- the screenshot file path (or the screenshot itself)
- the approximate time it happened
- whether it was local or heyralli.com
- the Sentry Issue link (if Sentry shows one)

---

## What I should never paste into Cursor or a support message

Never paste:

- passwords
- magic-link emails with tokens
- Supabase service role keys
- Sentry auth tokens
- Meta access tokens
- Resend API keys
- Stripe keys
- `.env.local` contents
- private parent/child information
- uploaded private files

---

## How to disable either integration safely

### Disable Sentry

In `.env.local` and in Vercel Environment Variables, set:

```bash
SENTRY_ENABLED=false
```

Or remove / blank out:

```bash
NEXT_PUBLIC_SENTRY_DSN=
```

Then restart the local app or redeploy.

### Disable Playwright tests

Do nothing in production. Playwright only runs when you (or CI) run:

```bash
npm run test:hey-ralli
```

It does not run automatically for website visitors.

---

## Important safety notes

- Use a **staging/test login** for automated tests, not your main admin password if you can avoid it.
- Do not point destructive experiments at the live production database.
- Stripe is not currently installed in this codebase; Sentry is still set to scrub Stripe-related fields if they appear later.
