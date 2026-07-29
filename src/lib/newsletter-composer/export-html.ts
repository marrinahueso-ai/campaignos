import { orderedLayoutBlocks } from "@/lib/newsletter-composer/defaults";
import type {
  NewsletterComposerState,
  NewsletterLayoutBlock,
  NewsletterStory,
} from "@/lib/newsletter-composer/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeHref(url: string): string {
  const t = url.trim();
  if (!t) return "#";
  if (t.startsWith("#")) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function storyById(
  state: NewsletterComposerState,
  id: string | null,
): NewsletterStory | null {
  if (!id) return null;
  return state.stories.find((s) => s.id === id) ?? null;
}

/** Distinct section band so Calendar / Volunteer / Sponsors don't blur together. */
function sectionBand(
  title: string,
  colors: NewsletterComposerState["colors"],
  tone: "news" | "calendar" | "volunteer" | "sponsors" | "links" | "follow",
): string {
  const styles: Record<
    typeof tone,
    { bg: string; bar: string; sub?: string }
  > = {
    news: { bg: "#f3f6f3", bar: colors.primary, sub: "Updates for your community" },
    calendar: { bg: "#eef8fa", bar: colors.accent, sub: "Key dates at a glance" },
    volunteer: {
      bg: "#f0faf7",
      bar: "#2f7a6b",
      sub: "We need a few hands",
    },
    sponsors: {
      bg: "#fff9e8",
      bar: colors.cta,
      sub: "Partners who make this possible",
    },
    links: { bg: "#f7f5f0", bar: colors.primary, sub: "Quick links" },
    follow: { bg: "#f7f5f0", bar: "#7a8478", sub: "Stay in the loop" },
  };
  const t = styles[tone];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 14px;">
  <tr>
    <td style="background:${esc(t.bg)};border-left:5px solid ${esc(t.bar)};border-radius:12px;padding:12px 14px;">
      <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${esc(t.bar)};">${esc(title)}</div>
      ${
        t.sub
          ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#5a655c;margin-top:3px;">${esc(t.sub)}</div>`
          : ""
      }
    </td>
  </tr>
</table>`;
}

function renderStory(
  story: NewsletterStory,
  colors: NewsletterComposerState["colors"],
): string {
  const badge = story.featured
    ? `<span style="display:inline-block;background:${esc(colors.cta)};color:#1c2430;font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px;margin-bottom:6px;">Featured</span><br/>`
    : "";
  const border = story.featured
    ? `border:1.5px solid ${esc(colors.cta)};background:#fffdf8;`
    : "border:1px solid #ebe4d8;background:#ffffff;";
  const cta =
    story.ctaLabel.trim() && story.ctaUrl.trim()
      ? `<a href="${esc(normalizeHref(story.ctaUrl))}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:${esc(colors.primary)};text-decoration:none;border-bottom:2px solid ${esc(colors.accent)};">${esc(story.ctaLabel)}</a>`
      : "";
  const thumb = story.imageUrl
    ? `<img src="${esc(story.imageUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:12px;object-fit:cover;" />`
    : `<div style="width:72px;height:72px;border-radius:12px;background:linear-gradient(145deg,#2f4a3c,${esc(colors.cta)});"></div>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;${border}border-radius:12px;">
  <tr>
    <td style="padding:12px;vertical-align:top;width:72px;">${thumb}</td>
    <td style="padding:12px 12px 12px 0;vertical-align:top;">
      ${badge}
      <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1c2430;margin:0 0 6px;">${story.featured ? "★ " : ""}${esc(story.title)}</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.45;color:#4a5563;">${esc(story.messaging)}</div>
      ${cta}
    </td>
  </tr>
</table>`;
}

function renderBlock(
  block: NewsletterLayoutBlock,
  state: NewsletterComposerState,
): string {
  const { colors } = state;
  switch (block.kind) {
    case "header": {
      const title = state.issueName.split("·")[0]?.trim() || state.issueName;
      if (state.headerImageUrl) {
        return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td style="border-radius:14px;overflow:hidden;">
    <img src="${esc(state.headerImageUrl)}" alt="${esc(title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px;" />
  </td></tr>
</table>`;
      }
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr>
    <td style="background:linear-gradient(135deg,${esc(colors.primary)},${esc(colors.accent)});border-radius:14px;padding:22px 18px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 6px;">${esc(title)}</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.92);">${esc(state.issueName)}</div>
    </td>
  </tr>
</table>`;
    }
    case "message": {
      if (!state.leadershipMessage.trim()) return "";
      const from = state.leadershipNames.trim()
        ? `<strong style="display:block;margin-bottom:4px;">From ${esc(state.leadershipNames)}</strong>`
        : "";
      const pto = state.ptoNote.trim()
        ? `<div style="margin-top:10px;font-size:12px;color:#4a5563;">${esc(state.ptoNote)}</div>`
        : "";
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
  <tr>
    <td style="background:#fff9e8;border-left:4px solid ${esc(colors.messageBar)};border-radius:10px;padding:14px 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;color:${esc(colors.primary)};">
      ${from}
      ${esc(state.leadershipMessage)}
      ${pto}
    </td>
  </tr>
</table>`;
    }
    case "story": {
      const story = storyById(state, block.storyId);
      if (!story || !story.included) return "";
      return renderStory(story, colors);
    }
    case "calendar": {
      const chips = state.calendarChips
        .filter((c) => c.label.trim())
        .slice()
        .sort((a, b) => {
          if (a.date && b.date) return a.date.localeCompare(b.date);
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });
      if (!chips.length) return "";
      return `
${sectionBand("Upcoming calendar", colors, "calendar")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td style="text-align:center;background:#f8fcfd;border:1px solid #d5eef3;border-radius:12px;padding:14px 10px;">
    ${chips
      .map(
        (c) =>
          `<span style="display:inline-block;background:#ffffff;border:1px solid #c5e4ea;color:${esc(colors.primary)};font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:7px 11px;border-radius:999px;margin:3px;">${esc(c.label)}</span>`,
      )
      .join("")}
  </td></tr>
</table>`;
    }
    case "volunteer": {
      const asks = state.volunteerAsks.filter((v) => v.included);
      if (!asks.length) return "";
      return `
${sectionBand("Volunteer", colors, "volunteer")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  ${asks
    .map((v, i) => {
      const link = v.signupUrl.trim()
        ? `<div style="margin-top:8px;"><a href="${esc(normalizeHref(v.signupUrl))}" style="display:inline-block;background:#2f7a6b;color:#ffffff;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:7px 14px;border-radius:999px;text-decoration:none;">Sign up →</a></div>`
        : "";
      const bg = i % 2 === 0 ? "#f3fbfc" : "#ffffff";
      const photo = v.imageUrl?.trim()
        ? `<img src="${esc(v.imageUrl)}" width="88" height="88" alt="" style="display:block;width:88px;height:88px;border-radius:14px;object-fit:cover;border:2px solid #c5e4ea;" />`
        : `<div style="width:88px;height:88px;border-radius:14px;background:linear-gradient(145deg,#2f7a6b,#7bc4b0);border:2px solid #c5e4ea;text-align:center;line-height:88px;font-family:Arial,sans-serif;font-size:28px;color:#ffffff;font-weight:800;">${i + 1}</div>`;
      return `<tr><td style="padding:0 0 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid #c5e4ea;border-radius:14px;">
          <tr>
            <td style="padding:14px 12px 14px 14px;vertical-align:top;font-family:Arial,sans-serif;font-size:13px;color:#333;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#2f7a6b;margin-bottom:4px;">Need #${i + 1}</div>
              <strong style="color:${esc(colors.primary)};font-size:15px;">${esc(v.title)}</strong>
              <div style="margin-top:5px;color:#4a5563;line-height:1.45;">${esc(v.details)}</div>
              ${link}
            </td>
            <td width="100" style="padding:14px 14px 14px 4px;vertical-align:middle;text-align:right;">
              ${photo}
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join("")}
</table>`;
    }
    case "sponsors": {
      // Logos are required — skip sponsors without an image.
      const sponsors = state.sponsors.filter(
        (s) => s.name.trim() && s.imageUrl?.trim(),
      );
      if (!sponsors.length && !state.sponsorCtaLabel.trim()) return "";
      const rows: string[] = [];
      for (let i = 0; i < sponsors.length; i += 2) {
        const slice = sponsors.slice(i, i + 2);
        rows.push(
          `<tr>${slice
            .map((s) => {
              const inner = `
            <img src="${esc(s.imageUrl!)}" alt="${esc(s.name)}" width="140" height="70" style="display:block;margin:0 auto 8px;max-width:140px;max-height:70px;width:auto;height:auto;object-fit:contain;" />
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#333;">${esc(s.name)}</div>
            ${s.note.trim() ? `<div style="font-family:Arial,sans-serif;font-size:11px;color:#666;margin-top:4px;">${esc(s.note)}</div>` : ""}`;
              const wrapped = s.url.trim()
                ? `<a href="${esc(normalizeHref(s.url))}" style="text-decoration:none;color:inherit;">${inner}</a>`
                : inner;
              return `<td width="50%" style="padding:6px;vertical-align:top;"><div style="border:1px solid #f0e2b8;border-radius:10px;padding:14px 10px;text-align:center;background:#fffdf8;">${wrapped}</div></td>`;
            })
            .join("")}${
            slice.length === 1
              ? `<td width="50%" style="padding:6px;"></td>`
              : ""
          }</tr>`,
        );
      }
      return `
${sectionBand("Thank you sponsors", colors, "sponsors")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows.join("")}
    </table>
  </td></tr>
  ${
    state.sponsorCtaLabel.trim()
      ? `<tr><td style="padding-top:10px;text-align:center;">
    <a href="${esc(normalizeHref(state.sponsorCtaUrl || "#"))}" style="display:inline-block;background:${esc(colors.cta)};color:#1c2430;font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:10px 16px;border-radius:999px;text-decoration:none;">${esc(state.sponsorCtaLabel)}</a>
  </td></tr>`
      : ""
  }
</table>`;
    }
    case "links": {
      const links = state.helpfulLinks.filter((l) => l.label.trim());
      if (!links.length) return "";
      return `
${sectionBand("Helpful links", colors, "links")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td style="text-align:center;">
    ${links
      .map((l) => {
        const inner = `${l.emoji ? `${esc(l.emoji)} ` : ""}${esc(l.label)}`;
        return l.url.trim()
          ? `<a href="${esc(normalizeHref(l.url))}" style="display:inline-block;background:#eef8fa;color:${esc(colors.primary)};font-family:Arial,sans-serif;font-size:12px;font-weight:600;padding:8px 12px;border-radius:999px;margin:3px;text-decoration:none;">${inner}</a>`
          : `<span style="display:inline-block;background:#eef8fa;color:${esc(colors.primary)};font-family:Arial,sans-serif;font-size:12px;font-weight:600;padding:8px 12px;border-radius:999px;margin:3px;">${inner}</span>`;
      })
      .join("")}
  </td></tr>
</table>`;
    }
    case "cta": {
      if (!state.footerCtaHeadline.trim() && !state.footerCtaLabel.trim())
        return "";
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td style="background:#f3fbfc;border:2px solid ${esc(colors.accent)};border-radius:12px;padding:18px 16px;text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${esc(colors.accent)};margin-bottom:8px;">Get involved</div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:${esc(colors.primary)};margin-bottom:10px;">${esc(state.footerCtaHeadline)}</div>
      <a href="${esc(normalizeHref(state.footerCtaUrl || "#"))}" style="display:inline-block;background:#2f4a3c;color:#fffcf7;font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:10px 16px;border-radius:999px;text-decoration:none;">${esc(state.footerCtaLabel || "Get Involved →")}</a>
    </td>
  </tr>
</table>`;
    }
    case "socials": {
      const socials = state.socials.filter((s) => s.enabled && s.label.trim());
      return `
${sectionBand("Follow us", colors, "follow")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
  <tr><td style="text-align:center;padding:4px 0 0;">
    ${
      socials.length
        ? socials
            .map(
              (s) =>
                `<a href="${esc(normalizeHref(s.url || "#"))}" style="display:inline-block;background:#f3f0ea;border:1px solid #ebe4d8;border-radius:999px;padding:7px 12px;margin:3px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1c2430;text-decoration:none;">${esc(s.label)}</a>`,
            )
            .join("")
        : ""
    }
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#999;line-height:1.4;margin-top:16px;padding-top:14px;border-top:1px solid #eee;">${esc(state.footerFinePrint)}<br/>Unsubscribe · Update preferences</div>
  </td></tr>
</table>`;
    }
    default:
      return "";
  }
}

/**
 * Build body HTML with clear section breaks:
 * Featured → News & events → Calendar → Volunteer → Sponsors → Footer.
 */
function renderBody(state: NewsletterComposerState): string {
  const blocks = orderedLayoutBlocks(state);
  const parts: string[] = [];
  let newsBandInserted = false;
  let sawFeatured = false;

  for (const block of blocks) {
    if (block.kind === "story") {
      const story = storyById(state, block.storyId);
      if (!story || !story.included) continue;

      if (story.featured) {
        parts.push(renderStory(story, state.colors));
        sawFeatured = true;
        continue;
      }

      if (!newsBandInserted) {
        parts.push(
          sectionBand(
            sawFeatured ? "More news & events" : "News & events",
            state.colors,
            "news",
          ),
        );
        newsBandInserted = true;
      }
      parts.push(renderStory(story, state.colors));
      continue;
    }

    const html = renderBlock(block, state);
    if (html) parts.push(html);
  }

  return parts.join("\n");
}

/** Email-safe HTML for community newsletters (table layout). */
export function exportNewsletterHtml(state: NewsletterComposerState): string {
  const body = renderBody(state);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(state.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:20px 18px 28px;">
            ${body}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Inner fragment for in-app preview (no full document chrome). */
export function exportNewsletterPreviewFragment(
  state: NewsletterComposerState,
): string {
  return renderBody(state);
}
