# Cursor Demo Command Contract

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-07-23

Paste one of the commands below into Cursor to create a new Hey Ralli marketing demo.

Before implementing animations, Cursor **must** create a validated `DemoSpec` first.

---

## Detailed command (preferred)

Copy everything below the line, fill the brackets, and paste into Cursor.

---

```text
CREATE A NEW HEY RALLI MARKETING DEMO

Demo name:
[NAME]

Product area:
[PRODUCT AREA]

Audience:
[AUDIENCE]

What should the demo show?
[PLAIN-LANGUAGE WORKFLOW]

Starting state:
[START]

Final result:
[FINISH]

Important information to display:
[TEXT, DATES, STATUSES, NUMBERS OR LISTS]

Preferred duration:
[SECONDS OR “CHOOSE FOR ME”]

Mobile priority:
[WHAT MUST REMAIN VISIBLE]

Do not include:
[EXCLUSIONS]

--------------------------------------------------
CURSOR MUST FOLLOW THIS PROCESS EXACTLY
--------------------------------------------------

1. Read src/marketing/demo-generator/README.md
2. Read src/marketing/engine/README.md
3. Read src/marketing/demo-generator/authoring/DEMO_BUILD_CHECKLIST.md
4. Inspect src/marketing/demos/CreateAI/ as the reference implementation
5. Inspect relevant product UI only for visual reference — do NOT import dashboard components, Supabase, auth, or live data
6. FIRST create a typed DemoSpec with defineDemoSpec() in the new demo folder
7. Create centralized static demoData.ts
8. Create defineTimeline() from the spec beats
9. Build local components + root Demo using the existing Marketing Motion Engine only
10. Register the demo in src/marketing/demo-generator/demoRegistry.ts (lazyDemo)
11. Confirm it appears in the private harness at /dev/motion-engine via the registry selector
12. Do NOT add the demo to any live marketing page, homepage, Features, Pricing, About, or navigation
13. Validate: normal motion, reduced motion, desktop, tablet, ~390px mobile, offscreen pause, hidden-tab pause, loop stability, accessibility
14. Run typecheck, lint, relevant tests, and production build
15. Stop before public integration
16. Report files created/modified, timeline, primitives used, preview URL, validation results, and that no public page changed

Rules:
- One shared DemoPlayer clock — no new rAF / setInterval animation systems
- Static fixtures only
- Reduced-motion completed state required
- Keep production guard on /dev/motion-engine
- Follow src/marketing/demo-generator folder contract
```

---

## Short natural-language command

You can also paste a shorter request. Cursor must still expand it into a full `DemoSpec` **before** writing timeline/components.

```text
Create a new Hey Ralli marketing demo for [PRODUCT AREA / NAME].

[2–5 sentences describing the workflow the visitor should understand without clicking.]

Use realistic static data. Keep it simple and around [SECONDS] seconds. The final state should clearly show [FINAL OUTCOME]. Do not add the demo to a live marketing page.

Follow the Demo Generator README and CreateAI reference. Create the DemoSpec first, then data, timeline, components, registry entry, private harness preview, and validation. Stop before public integration.
```

### Example: Volunteer Intelligence (next demo)

```text
Create a new Hey Ralli marketing demo for Volunteer Intelligence.

Show a user adding a SignUpGenius link. Hey Ralli reads the volunteer signup, calculates a 72% fill rate, identifies three positions that still need volunteers, and recommends sending a reminder.

Use realistic static data. Keep it simple and around 22 seconds. The final state should clearly show what is filled and what still needs attention. Do not add the demo to a live marketing page.

Follow the Demo Generator README and CreateAI reference. Create the DemoSpec first, then data, timeline, components, registry entry, private harness preview, and validation. Stop before public integration.
```

---

## After Cursor finishes

Open: `/dev/motion-engine` → **Marketing demos** → select the new demo.

Use [DEMO_REVIEW_CHECKLIST.md](./DEMO_REVIEW_CHECKLIST.md) before any public Features-page integration.
