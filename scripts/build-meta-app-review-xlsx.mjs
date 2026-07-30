#!/usr/bin/env node
/**
 * Generates docs/ops/meta-app-review-assets/Hey-Ralli-Meta-App-Review.xlsx
 * from docs/ops/meta-app-review-use-cases.md §10 (permission matrix, screencast, screenshots).
 *
 * Run: node scripts/build-meta-app-review-xlsx.mjs
 */
import ExcelJS from "exceljs";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "docs/ops/meta-app-review-assets");
const OUTPUT_PATH = path.join(ASSETS_DIR, "Hey-Ralli-Meta-App-Review.xlsx");

const STATUS_OPTIONS = ["Done", "In progress", "Needs me", "Blocked"];

/** @param {string} filename */
function assetPath(filename) {
  return `docs/ops/meta-app-review-assets/${filename}`;
}

/** @param {string} filename */
function fileExists(filename) {
  return existsSync(path.join(ASSETS_DIR, filename));
}

/**
 * @param {string[]} filenames
 * @returns {{ labels: string; paths: string; allExist: boolean; anySkipped: boolean }}
 */
function screenshotRefs(filenames) {
  const labels = [];
  const paths = [];
  let allExist = true;
  let anySkipped = false;

  for (const name of filenames) {
    if (name.endsWith(".SKIPPED.txt")) {
      labels.push(`${name.replace(".SKIPPED.txt", ".png")} (SKIPPED)`);
      paths.push(assetPath(name));
      anySkipped = true;
      allExist = false;
    } else {
      const exists = fileExists(name);
      labels.push(exists ? name : `${name} (missing)`);
      paths.push(assetPath(name));
      if (!exists) allExist = false;
    }
  }

  return {
    labels: labels.join(" · "),
    paths: paths.join("\n"),
    allExist,
    anySkipped,
  };
}

/** @type {Array<{
 *   permission: string;
 *   group: string;
 *   why: string;
 *   feature: string;
 *   uiPath: string;
 *   ifNotGranted: string;
 *   expectedResult: string;
 *   screencastChapter: string;
 *   suggestedTimestamp: string;
 *   screenshots: string[];
 * }>} */
const PERMISSIONS = [
  {
    permission: "pages_show_list",
    group: "Connect",
    why: "Discover Facebook Pages the volunteer admins so they can pick the school Page during Connect",
    feature: "Page list in Login for Business / OAuth asset picker",
    uiPath:
      "Settings → Integrations → Facebook & Instagram → Connect with Facebook",
    ifNotGranted:
      'OAuth fails or no_pages error — "couldn\'t find a Page to connect" on return to /settings/meta',
    expectedResult:
      "Reviewer selects test Page; /settings/meta shows connected Page name chip",
    screencastChapter: "2, 3",
    suggestedTimestamp: "1:15–2:45 (consent + Page picker); 2:45–3:20 (connected chips)",
    screenshots: ["04-meta-connected.png", "03-meta-consent.SKIPPED.txt"],
  },
  {
    permission: "business_management",
    group: "Connect",
    why: "Pages tied to Meta Business Suite require Business asset access during Connect",
    feature: "Business asset picker in Login for Business (when Meta prompts)",
    uiPath: "Same Connect flow as pages_show_list",
    ifNotGranted: "Connect may fail for Business-managed Pages without this scope",
    expectedResult:
      "Reviewer selects owning Business when prompted; connect completes",
    screencastChapter: "2, 3",
    suggestedTimestamp: "1:15–2:45 (Business + Page + IG selection on consent)",
    screenshots: ["03-meta-consent.SKIPPED.txt"],
  },
  {
    permission: "instagram_basic",
    group: "Connect",
    why: "Read linked Instagram Professional account identity for publish + inbox + insights",
    feature:
      "IG account chip on Settings; IG channel labels in Communications Hub and Insights",
    uiPath:
      "Settings → Integrations → Facebook & Instagram (connected state); Sidebar → Communications Hub",
    ifNotGranted:
      "Instagram publishing, DMs, and IG insights surfaces show unavailable / IG chip missing",
    expectedResult: "Connected state shows Linked Instagram chip",
    screencastChapter: "2, 3",
    suggestedTimestamp: "2:45–3:20 (Page + Linked Instagram chips on /settings/meta)",
    screenshots: ["04-meta-connected.png"],
  },
  {
    permission: "pages_manage_posts",
    group: "Connect",
    why: "Create and schedule organic Page feed posts on volunteer approval",
    feature:
      "Publish Now / Schedule from Approvals; native Graph schedule on Calendar DnD",
    uiPath:
      "Sidebar → Approvals (/approvals); Events → [event] → Approvals tab; Sidebar → Calendar",
    ifNotGranted:
      'Posts stay in Hey Ralli queue only — warning: "Meta is not connected — posts stay on the CampignOS schedule queue"; no live Page post',
    expectedResult:
      "Approved item publishes to test Page feed (or scheduled unpublished post in Page admin)",
    screencastChapter: "4",
    suggestedTimestamp: "3:20–4:20 (Approvals → Publish Now); 4:20–4:50 (live Page post)",
    screenshots: ["05-approvals-publish.png", "06-page-post-live.SKIPPED.txt"],
  },
  {
    permission: "pages_read_engagement",
    group: "Connect",
    why: "Read Page post content and engagement context for publish validation and Insights post carousel",
    feature: "Insights top-content discovery; publish/schedule context",
    uiPath: "Direct URL /insights → Refresh; Sidebar → Approvals",
    ifNotGranted: "Partial Insights/post discovery; publish may lack engagement context",
    expectedResult:
      "Org Insights shows Page posts in top content / sync (or honest empty on new Page)",
    screencastChapter: "4, 7",
    suggestedTimestamp: "6:45–7:30 (/insights Refresh, top content carousel)",
    screenshots: ["10-insights-org.png"],
  },
  {
    permission: "instagram_content_publish",
    group: "Connect",
    why: "Publish organic content to linked Instagram Professional account",
    feature:
      "Instagram leg of Publish Now / Schedule / publish-when-due cron",
    uiPath: "Sidebar → Approvals; Events → [event] → Approvals tab",
    ifNotGranted: "Instagram slot stays queued in Hey Ralli; no IG media published",
    expectedResult: "Approved Instagram slot appears on linked IG account",
    screencastChapter: "4",
    suggestedTimestamp: "3:20–4:20 (IG publish on approve)",
    screenshots: ["06-page-post-live.SKIPPED.txt"],
  },
  {
    permission: "pages_messaging",
    group: "Inbox",
    why: "Read and reply to organic Facebook Page Messenger conversations",
    feature: "Messenger threads in unified inbox",
    uiPath:
      "Sidebar → Communications Hub (/communications) → Messenger thread → reply composer",
    ifNotGranted:
      "Messenger channel missing from sync; reply sends fail with reconnect guidance",
    expectedResult: "Tester DM to Page appears in hub; reply delivers in Messenger",
    screencastChapter: "5",
    suggestedTimestamp: "4:50–5:45 (Messenger thread + reply)",
    screenshots: ["07-communications-hub.png", "08-inbox-reply.SKIPPED.txt"],
  },
  {
    permission: "pages_manage_metadata",
    group: "Inbox",
    why: "Subscribe Page webhooks and read conversation metadata for near-real-time inbox",
    feature: "Webhook-driven inbox updates; conversation metadata",
    uiPath: "Sidebar → Communications Hub; (backend) POST /api/meta/webhook",
    ifNotGranted:
      "Slower inbox updates (polling/manual Sync only); webhook subscription incomplete",
    expectedResult:
      "New Messenger message updates thread without full manual sync",
    screencastChapter: "5, 9",
    suggestedTimestamp:
      "4:50–5:45 (inbox sync); 8:05–8:30 optional (inbound DM without manual Sync)",
    screenshots: ["12-webhook-config.SKIPPED.txt"],
  },
  {
    permission: "pages_read_user_content",
    group: "Inbox",
    why: "Read Facebook post comments (author + body) for inbox sync",
    feature: "Page comment threads in Communications Hub",
    uiPath: "Sidebar → Communications Hub → Comments filter / comment thread",
    ifNotGranted:
      'FB comment sync skipped — error: "Missing token scopes… Some inbox channels may be unavailable until scopes are granted on reconnect."',
    expectedResult:
      "Comment on test Page post appears in hub with author + text",
    screencastChapter: "6",
    suggestedTimestamp: "5:45–6:45 (Page comment in hub)",
    screenshots: ["09-comment-engagement.SKIPPED.txt"],
  },
  {
    permission: "pages_manage_engagement",
    group: "Inbox",
    why: "Reply to and like Facebook Page comments",
    feature: "Comment reply composer; 👍/❤️ on comment bubbles",
    uiPath: "Sidebar → Communications Hub → comment thread",
    ifNotGranted:
      'Comment replies blocked; Settings shows reconnect hint: "Comment replies need one more Facebook approval…"',
    expectedResult: "Reply visible on Page comment; like toggles on Graph",
    screencastChapter: "6",
    suggestedTimestamp: "5:45–6:45 (comment reply + 👍)",
    screenshots: ["09-comment-engagement.SKIPPED.txt"],
  },
  {
    permission: "instagram_manage_messages",
    group: "Inbox",
    why: "Read and reply to Instagram DMs for the linked Professional account",
    feature: "Instagram DM threads in Communications Hub",
    uiPath: "Sidebar → Communications Hub → IG DM thread",
    ifNotGranted:
      "IG DM channel unavailable — missing-scope sync error for Instagram DMs",
    expectedResult: "Tester IG DM appears; reply delivers in Instagram",
    screencastChapter: "6",
    suggestedTimestamp: "5:45–6:45 (IG DM thread + reply)",
    screenshots: ["08-inbox-reply.SKIPPED.txt"],
  },
  {
    permission: "instagram_manage_comments",
    group: "Inbox",
    why: "Sync and moderate Instagram comments",
    feature: "IG comment threads in Communications Hub",
    uiPath: "Sidebar → Communications Hub → IG comment thread",
    ifNotGranted: "Instagram comment sync skipped with missing-scope error",
    expectedResult: "Comment on test IG media appears; reply succeeds",
    screencastChapter: "6",
    suggestedTimestamp: "5:45–6:45 (IG comment reply)",
    screenshots: ["09-comment-engagement.SKIPPED.txt"],
  },
  {
    permission: "instagram_manage_engagement",
    group: "Inbox",
    why: "Like Instagram comments (👍/❤️ maps to Like API)",
    feature: "Reaction bubbles on IG comment threads",
    uiPath: "Sidebar → Communications Hub → IG comment → 👍",
    ifNotGranted: "Like action fails / button unavailable until reconnect with scope",
    expectedResult: "Like registered on Instagram comment",
    screencastChapter: "6",
    suggestedTimestamp: "5:45–6:45 (like IG comment)",
    screenshots: ["09-comment-engagement.SKIPPED.txt"],
  },
  {
    permission: "read_insights",
    group: "Insights",
    why: "Sync organic Facebook Page Insights (views, reach, interactions)",
    feature: "Org Insights KPI cards, content overview, CSV export",
    uiPath:
      "Direct URL /insights (Org view — not in sidebar during soft launch) → Refresh",
    ifNotGranted:
      'Warning: "Reconnect Facebook to finish Page Insights setup."; KPIs empty / sync blocked',
    expectedResult:
      "Page KPIs populate after Refresh (or honest empty state on new Page)",
    screencastChapter: "7",
    suggestedTimestamp: "6:45–7:30 (/insights KPI Refresh; note no ads / no demographics)",
    screenshots: ["10-insights-org.png"],
  },
  {
    permission: "instagram_manage_insights",
    group: "Insights",
    why: "Sync organic Instagram account + media insights",
    feature: "IG series on Org Insights; Event Insights IG KPIs",
    uiPath:
      "/insights; Events → [event] → Insights tab (/events/[id]?tab=insights)",
    ifNotGranted:
      'Warning: "Reconnect Facebook to finish Instagram Insights setup."; IG metrics missing',
    expectedResult:
      "IG metrics appear alongside Page metrics for linked account",
    screencastChapter: "7, 8",
    suggestedTimestamp: "7:30–8:05 (Event → Insights tab)",
    screenshots: ["11-insights-event.png"],
  },
];

/** @type {Array<{ num: number; scene: string; scopes: string; suggested: string }>} */
const SCREENCAST_CHAPTERS = [
  {
    num: 1,
    scene: "/login → sign in as reviewer test user",
    scopes: "—",
    suggested: "0:00–0:30",
  },
  {
    num: 2,
    scene:
      "Settings → Integrations → Facebook & Instagram → Connect with Facebook → full consent screen → select test Page + Business + IG",
    scopes: "All 15 at consent",
    suggested: "0:50–2:45",
  },
  {
    num: 3,
    scene: "Connected state on /settings/meta (Page + Linked Instagram chips)",
    scopes: "pages_show_list, business_management, instagram_basic",
    suggested: "2:45–3:20",
  },
  {
    num: 4,
    scene:
      "Sidebar → Approvals → approve → Publish Now → show live Page post",
    scopes:
      "pages_manage_posts, pages_read_engagement, instagram_content_publish",
    suggested: "3:20–4:50",
  },
  {
    num: 5,
    scene: "Sidebar → Communications Hub → Messenger reply",
    scopes: "pages_messaging, pages_manage_metadata",
    suggested: "4:50–5:45",
  },
  {
    num: 6,
    scene:
      "Comment reply + 👍 on Page comment; IG DM reply + sticker/GIF",
    scopes:
      "pages_read_user_content, pages_manage_engagement, instagram_manage_messages, instagram_manage_comments, instagram_manage_engagement",
    suggested: "5:45–6:45",
  },
  {
    num: 7,
    scene:
      'Navigate to /insights → Refresh → KPIs / top content (state "no ads / no demographics")',
    scopes: "read_insights, instagram_manage_insights",
    suggested: "6:45–7:30",
  },
  {
    num: 8,
    scene: "Events → [event] → Insights tab",
    scopes: "Event-scoped insights",
    suggested: "7:30–8:05",
  },
  {
    num: 9,
    scene: "(Optional) inbound DM updates thread without manual sync",
    scopes: "Webhooks / pages_manage_metadata",
    suggested: "8:05–8:30",
  },
];

/** @type {Array<{ num: number; filename: string; description: string; notes?: string }>} */
const SCREENSHOT_CHECKLIST = [
  {
    num: 0,
    filename: "00-login-page.png",
    description: "Login page (bonus)",
  },
  { num: 1, filename: "01-login.png", description: "/login signed-in dashboard" },
  {
    num: 2,
    filename: "02-settings-integrations.png",
    description: "Settings → Integrations with Facebook & Instagram row",
  },
  {
    num: 3,
    filename: "03-meta-consent.png",
    description:
      "Facebook Login for Business consent (all permission lines visible)",
    notes: "SKIPPED — org already connected; use Reconnect or fresh org",
  },
  {
    num: 4,
    filename: "04-meta-connected.png",
    description: "/settings/meta connected chips (Page + Linked Instagram)",
  },
  {
    num: 5,
    filename: "05-approvals-publish.png",
    description: "Approvals queue with Publish Now / scheduled item",
  },
  {
    num: 6,
    filename: "06-page-post-live.png",
    description: "Published post on test Facebook Page (browser)",
    notes: "SKIPPED — capture on facebook.com as Meta tester",
  },
  {
    num: 7,
    filename: "07-communications-hub.png",
    description: "Communications Hub thread list",
  },
  {
    num: 8,
    filename: "08-inbox-reply.png",
    description: "Reply sent in Messenger or IG DM thread",
    notes: "SKIPPED — seed tester DMs, open thread, show reply composer",
  },
  {
    num: 9,
    filename: "09-comment-engagement.png",
    description: "Page or IG comment with reply / like",
    notes: "SKIPPED — seed Page/IG comments on test assets",
  },
  {
    num: 10,
    filename: "10-insights-org.png",
    description:
      "/insights Org KPI view (note: not in sidebar — use direct URL)",
  },
  {
    num: 11,
    filename: "11-insights-event.png",
    description: "Event → Insights tab",
  },
  {
    num: 12,
    filename: "12-webhook-config.png",
    description:
      "Meta Developer App → Webhooks → /api/meta/webhook (optional)",
    notes: "SKIPPED — screenshot in developers.facebook.com",
  },
];

/** @type {Array<{ useCase: string; scopes: string }>} */
const USE_CASE_CROSSWALK = [
  {
    useCase: "Connect Facebook Page + Instagram",
    scopes: "All 15 (single consent)",
  },
  {
    useCase: "Publish & schedule",
    scopes:
      "pages_manage_posts, pages_read_engagement, instagram_content_publish, instagram_basic",
  },
  {
    useCase: "Approvals → Meta",
    scopes: "Same publish scopes",
  },
  {
    useCase: "Communications Hub / Inbox",
    scopes: "All inbox scopes in §10.3 B + pages_manage_metadata",
  },
  {
    useCase: "Inbox reactions",
    scopes:
      "pages_manage_engagement, instagram_manage_engagement, pages_messaging, instagram_manage_messages",
  },
  {
    useCase: "Stickers + GIFs in DMs",
    scopes:
      "Messaging scopes only (stickers/GIFs = DM image attachments; GIPHY is non-Meta)",
  },
  {
    useCase: "Organic Insights (org)",
    scopes:
      "read_insights, instagram_manage_insights, pages_read_engagement",
  },
  { useCase: "Event Insights", scopes: "Same insights scopes" },
  {
    useCase: "Webhooks",
    scopes: "pages_manage_metadata (+ messaging scopes for payload content)",
  },
  {
    useCase: "Login with Facebook (account)",
    scopes:
      "None of the 15 Page scopes — Supabase identity at /login, /signup only",
  },
];

/** @type {Array<{ field: string; value: string; notes?: string }>} */
const SHARED_CREDENTIALS = [
  {
    field: "Reviewer email",
    value: "local.developer@heyralli.dev",
    notes: "Hey Ralli test seat with manage_integrations on demo org",
  },
  {
    field: "Reviewer password",
    value: "(see .env.local → HEY_RALLI_TEST_PASSWORD — not in git)",
    notes: "Do not paste into Meta portal notes",
  },
  {
    field: "Org / role",
    value: "Test org with manage_integrations on connecting user",
  },
  {
    field: "Meta app mode",
    value: "Development — reviewer must be Meta app Tester or Admin",
  },
  { field: "Test Facebook Page name", value: "", notes: "FOUNDER: Page name in asset picker" },
  { field: "Test Facebook Page ID", value: "", notes: "FOUNDER: numeric Page ID" },
  {
    field: "Linked Instagram Professional account",
    value: "",
    notes: "FOUNDER: @handle linked to test Page",
  },
  {
    field: "Test Business (if prompted)",
    value: "",
    notes: "FOUNDER: Business name owning the test Page",
  },
  { field: "Production app URL", value: "https://heyralli.com" },
  {
    field: "OAuth redirect",
    value: "https://heyralli.com/api/meta/oauth/callback",
  },
  {
    field: "Webhook callback URL",
    value: "https://heyralli.com/api/meta/webhook",
  },
  { field: "Privacy policy URL", value: "https://heyralli.com/privacy" },
  {
    field: "Screenshot pack folder",
    value: "docs/ops/meta-app-review-assets/",
  },
  { field: "Screencast file URL", value: "", notes: "FOUNDER: upload URL or filename" },
  {
    field: "Screencast total length",
    value: "",
    notes: "FOUNDER: mm:ss (~6–8 min script; see Screencast chapters sheet)",
  },
];

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const WRAP = { wrapText: true, vertical: "top" };

/**
 * @param {ExcelJS.Worksheet} sheet
 * @param {string[]} headers
 * @param {Record<number, number>} [widths]
 */
function addHeaderRow(sheet, headers, widths = {}) {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { ...WRAP, horizontal: "center" };
  });
  row.height = 28;
  headers.forEach((_, i) => {
    const col = i + 1;
    sheet.getColumn(col).width = widths[col] ?? 22;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/** @param {ExcelJS.Worksheet} sheet @param {string} colLetter @param {number} lastRow */
function addStatusValidation(sheet, colLetter, lastRow) {
  for (let r = 2; r <= lastRow; r++) {
    sheet.dataValidations.add(`${colLetter}${r}`, {
      type: "list",
      allowBlank: true,
      formulae: [`"${STATUS_OPTIONS.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid status",
      error: `Choose: ${STATUS_OPTIONS.join(", ")}`,
    });
  }
}

/** @param {ExcelJS.Worksheet} sheet */
function styleDataRows(sheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = WRAP;
    });
  });
}

function buildInstructionsSheet(workbook) {
  const sheet = workbook.addWorksheet("Instructions");
  sheet.getColumn(1).width = 110;

  const lines = [
    "Hey Ralli — Meta App Review workbook",
    "",
    "IMPORTANT: Meta Developer Portal scope",
    "If the Meta portal only lists oEmbed (or Threads), that is separate from this workbook.",
    "This workbook covers the 15 Facebook Page + Instagram Professional scopes requested in Hey Ralli OAuth",
    "(META_COMBINED_OAUTH_SCOPE_LIST). We do not use oEmbed or Threads unless explicitly added later.",
    "All 15 scopes are granted in ONE Connect OAuth: Settings → Integrations → Facebook & Instagram.",
    "",
    "How to use",
    "1. Work the Permissions sheet row by row — one permission at a time.",
    "2. Set Status: Done | In progress | Needs me | Blocked.",
    "3. Fill Suggested video timestamp (actual start–end after editing your screencast).",
    "4. Add Reviewer notes and mark Meta portal submitted? (Y/N) when each permission is filed.",
    "5. Complete Shared credentials, Screencast chapters, and Screenshots checklist sheets.",
    "6. Regenerate this file after doc updates: node scripts/build-meta-app-review-xlsx.mjs",
    "",
    "Status legend",
    "Done — permission narrative + media ready for Meta portal.",
    "In progress — partially filled or screencast/screenshot in draft.",
    "Needs me — founder-only action (test Page details, consent capture, inbox seed data, etc.).",
    "Blocked — waiting on Meta, missing tester role, or external dependency.",
    "",
    "Soft-launch UI reminders",
    "• Connect Meta: Header ⚙ Settings → Integrations → Facebook & Instagram (/settings/meta)",
    "• Insights is NOT in the sidebar — use direct URL https://heyralli.com/insights",
    "• Event Insights: Sidebar → Events → [event] → Insights tab",
    "• Communications Hub: Sidebar → Communications Hub (/communications)",
    "",
    "Living documentation",
    "• Use cases + permission matrix: docs/ops/meta-app-review-use-cases.md",
    "• Screenshot folder: docs/ops/meta-app-review-assets/",
    "• Capture log + screencast script: docs/ops/meta-app-review-assets/SCREENCAST-TIMESTAMPS.md",
    "• Re-capture screenshots: node scripts/capture-meta-app-review.mjs --base-url https://heyralli.com",
    "",
    "Reviewer test account (email only — password in .env.local, not committed)",
    "local.developer@heyralli.dev",
  ];

  for (const line of lines) {
    const row = sheet.addRow([line]);
    if (line.startsWith("Hey Ralli") || line.startsWith("IMPORTANT")) {
      row.getCell(1).font = { bold: true, size: line.startsWith("Hey Ralli") ? 14 : 12 };
    } else if (
      line.endsWith("legend") ||
      line.endsWith("use") ||
      line.startsWith("Soft-launch") ||
      line.startsWith("Living")
    ) {
      row.getCell(1).font = { bold: true, size: 12 };
    }
  }
}

function buildPermissionsSheet(workbook) {
  const sheet = workbook.addWorksheet("Permissions");
  const headers = [
    "Status",
    "Permission name (scope)",
    "Group",
    "Why Hey Ralli needs it",
    "Exact feature that uses it",
    "Exact UI path",
    "What happens if not granted",
    "Expected result",
    "Screencast chapter (# from §10.5)",
    "Suggested video timestamp (start–end)",
    "Screenshot file(s)",
    "Screenshot link/path",
    "Reviewer notes",
    "Meta portal submitted? (Y/N)",
  ];

  addHeaderRow(sheet, headers, {
    1: 14,
    2: 28,
    3: 12,
    4: 36,
    5: 32,
    6: 38,
    7: 36,
    8: 32,
    9: 14,
    10: 28,
    11: 34,
    12: 42,
    13: 24,
    14: 16,
  });

  for (const p of PERMISSIONS) {
    const shots = screenshotRefs(p.screenshots);
    sheet.addRow([
      "",
      p.permission,
      p.group,
      p.why,
      p.feature,
      p.uiPath,
      p.ifNotGranted,
      p.expectedResult,
      p.screencastChapter,
      p.suggestedTimestamp,
      shots.labels,
      shots.paths,
      "",
      "",
    ]);
  }

  addStatusValidation(sheet, "A", PERMISSIONS.length + 1);
  styleDataRows(sheet);
}

function buildSharedCredentialsSheet(workbook) {
  const sheet = workbook.addWorksheet("Shared credentials");
  addHeaderRow(sheet, ["Field", "Value", "Notes"], { 1: 34, 2: 48, 3: 40 });

  for (const row of SHARED_CREDENTIALS) {
    sheet.addRow([row.field, row.value, row.notes ?? ""]);
  }
  styleDataRows(sheet);
}

function buildScreencastSheet(workbook) {
  const sheet = workbook.addWorksheet("Screencast chapters");
  addHeaderRow(
    sheet,
    [
      "Chapter #",
      "Scene",
      "Scopes proved",
      "Suggested timestamp",
      "Actual timestamp (founder)",
      "Done?",
    ],
    { 1: 10, 2: 52, 3: 44, 4: 22, 5: 22, 6: 10 },
  );

  for (const ch of SCREENCAST_CHAPTERS) {
    sheet.addRow([ch.num, ch.scene, ch.scopes, ch.suggested, "", ""]);
  }
  styleDataRows(sheet);
}

function buildScreenshotsSheet(workbook) {
  const sheet = workbook.addWorksheet("Screenshots checklist");
  addHeaderRow(
    sheet,
    ["#", "Filename", "Capture description", "Captured?", "Path", "Notes"],
    { 1: 6, 2: 28, 3: 44, 4: 12, 5: 48, 6: 36 },
  );

  for (const item of SCREENSHOT_CHECKLIST) {
    const captured = fileExists(item.filename) ? "Y" : "";
    const skippedFile = `${item.filename.replace(".png", "")}.SKIPPED.txt`;
    const skipped = !captured && fileExists(skippedFile);
    sheet.addRow([
      item.num,
      item.filename,
      item.description,
      captured ? "Y" : skipped ? "N (skipped)" : "",
      assetPath(captured ? item.filename : skipped ? skippedFile : item.filename),
      item.notes ?? (captured ? "" : skipped ? "Founder follow-up required" : "Not yet captured"),
    ]);
  }
  styleDataRows(sheet);
}

function buildCrosswalkSheet(workbook) {
  const sheet = workbook.addWorksheet("Use case crosswalk");
  addHeaderRow(sheet, ["Use case (§3 / §10.4)", "Scopes involved"], {
    1: 36,
    2: 72,
  });

  for (const row of USE_CASE_CROSSWALK) {
    sheet.addRow([row.useCase, row.scopes]);
  }
  styleDataRows(sheet);
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hey Ralli";
  workbook.created = new Date();

  buildInstructionsSheet(workbook);
  buildPermissionsSheet(workbook);
  buildSharedCredentialsSheet(workbook);
  buildScreencastSheet(workbook);
  buildScreenshotsSheet(workbook);
  buildCrosswalkSheet(workbook);

  await mkdir(ASSETS_DIR, { recursive: true });
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(OUTPUT_PATH, buffer);

  const pngCount = SCREENSHOT_CHECKLIST.filter((s) => fileExists(s.filename)).length;
  const skippedCount = SCREENSHOT_CHECKLIST.filter((s) => {
    const skippedFile = `${s.filename.replace(".png", "")}.SKIPPED.txt`;
    return !fileExists(s.filename) && fileExists(skippedFile);
  }).length;

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Sheets: ${workbook.worksheets.map((w) => w.name).join(", ")}`);
  console.log(`Permission rows: ${PERMISSIONS.length}`);
  console.log(`Screenshots on disk: ${pngCount}/${SCREENSHOT_CHECKLIST.length} (${skippedCount} skipped)`);

  const permShotSummary = PERMISSIONS.map((p) => {
    const shots = screenshotRefs(p.screenshots);
    return {
      permission: p.permission,
      hasRealPng: p.screenshots.some((f) => f.endsWith(".png") && fileExists(f)),
      needsFounder: shots.anySkipped || !shots.allExist,
    };
  });
  const withPng = permShotSummary.filter((s) => s.hasRealPng).length;
  const needsFounder = permShotSummary.filter((s) => s.needsFounder).length;
  console.log(`Permissions with ≥1 real PNG: ${withPng}/${PERMISSIONS.length}`);
  console.log(`Permissions needing founder screenshots/media: ${needsFounder}/${PERMISSIONS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
