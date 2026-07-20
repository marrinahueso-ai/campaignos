# Report a Problem — beginner guide

This guide explains the **Report a Problem** button inside signed-in Hey Ralli.

---

## How I submit a report

1. Sign in to Hey Ralli.
2. Look in the **bottom-right corner** for a small button labeled **Report a Problem**.
3. Click it.
4. Fill in:
   - What were you trying to do?
   - What happened instead?
   - What did you expect to happen?
   - Additional notes (optional)
5. Leave **Include screenshot** checked unless the screen shows private information you should not share.
6. Click **Send report**.
7. You should see **Problem reported successfully** and a short **reference number**.
8. Stay on the same page — your unsaved work is not cleared.

If sending fails, click **Retry**.

---

## Where I find it inside Sentry

1. Open [hey-ralli.sentry.io](https://hey-ralli.sentry.io).
2. Open the **heyralli** project.
3. Go to **User Feedback** (sometimes under **Issues** → related feedback).
4. Open the newest report.
5. Check:
   - Your written answers
   - Tags like `feedback_type=manual_report_a_problem`
   - Safe context (page URL, environment, event id when on an event page)
   - Screenshot attachment (if included)

You can also search Issues for tag `feedback_type:manual_report_a_problem`.

---

## How I copy the report into Cursor

1. In Sentry, open the feedback / issue.
2. Copy the **browser URL** of that page (it looks like `https://hey-ralli.sentry.io/...`).
3. Paste the link into Cursor chat.
4. Optionally also paste:
   - The reference number from the success message
   - What page you were on
   - What you clicked right before the problem

That is enough for the assistant to investigate.

---

## How automatic Sentry errors differ from manual problem reports

| | Automatic error | Report a Problem |
|--|--|--|
| When it is created | The app crashes or an unexpected failure is reported by code | You click the button and describe the problem |
| Best for | Technical exceptions, failed API calls | “This feels wrong” even when nothing crashed |
| You see a form? | Usually no | Yes |
| Example | Server failed to save a campaign session | Artwork looks correct in Create with AI but wrong on the event page |

Both go to the same Sentry project (`heyralli`). Manual reports are tagged `manual_report_a_problem`.

---

## Who can see the button

The button is **not** shown to every production user.

It is shown when:

- You are on **development**, **preview**, or **staging**, or
- Your account is an **admin**, or
- Your email is listed as an owner / test user in environment variables

Regular production parent volunteers should not see it unless they are explicitly allowlisted.

---

## How to temporarily hide or disable the button

In Vercel → Project → Settings → Environment Variables, set one of:

- `REPORT_A_PROBLEM_ENABLED=false`  
  or
- `NEXT_PUBLIC_REPORT_A_PROBLEM=false`

Then **redeploy**.

To allow specific people in production, set:

- `REPORT_A_PROBLEM_OWNER_EMAILS=you@heyralli.com`
- `REPORT_A_PROBLEM_TEST_EMAILS=tester@example.com`

(Comma-separated lists are fine.)

Admins (`campaignRole=admin`) can also see it.

---

## Privacy reminder

Do **not** include in reports or screenshots:

- Passwords
- Login codes
- Payment card details
- Children’s personal information
- Private inbox / social messages
- API keys or secret tokens

Hey Ralli attaches safe technical context automatically (page URL, environment, organization id, event id when present). It does not intentionally attach secrets.
