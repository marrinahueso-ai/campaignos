import {
  HEADING_IMAGE_DISPLAY,
  newsletterBodyFontPx,
  newsletterFontStack,
  newsletterHeaderTitleFontPx,
  newsletterHeadingFontPx,
} from "@/lib/newsletter-composer/block-styles";
import { orderedLayoutBlocks } from "@/lib/newsletter-composer/defaults";
import type {
  NewsletterCanvasBlock,
  NewsletterCanvasButton,
  NewsletterCanvasColumn,
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
  const stories = Array.isArray(state.stories) ? state.stories : [];
  return stories.find((s) => s.id === id) ?? null;
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
      const title = state.issueName.trim() || "Newsletter";
      const edition = state.issueEdition.trim();
      if (state.headerImageUrl) {
        const img = `
    <img src="${esc(state.headerImageUrl)}" alt="${esc(state.headerImageAlt.trim() || title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px;" />`;
        const linked = state.headerImageLink.trim()
          ? `<a href="${esc(state.headerImageLink.trim())}" style="text-decoration:none;">${img}</a>`
          : img;
        return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td style="border-radius:14px;overflow:hidden;">
    ${linked}
  </td></tr>
</table>`;
      }
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr>
    <td style="background:linear-gradient(135deg,${esc(colors.primary)},${esc(colors.accent)});border-radius:14px;padding:22px 18px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 6px;">${esc(title)}</div>
      ${
        edition
          ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.92);">${esc(edition)}</div>`
          : ""
      }
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

// ---------------------------------------------------------------------------
// Block Builder canvas rendering — used whenever `state.canvasBlocks` is
// present. System kinds (hero/message/calendar/volunteer/sponsors/links/
// cta/socials) reuse `renderBlock` above by proxying through an equivalent
// `NewsletterLayoutBlock`; "event" and the "Add your own" kinds render here.
// ---------------------------------------------------------------------------

function formatEventDateLabel(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function renderEventBlockHtml(
  block: NewsletterCanvasBlock,
  state: NewsletterComposerState,
): string {
  const story = storyById(state, block.storyId);
  if (!story || !story.included) return "";
  const { colors } = state;

  const showArt = block.showArtwork && Boolean(story.imageUrl?.trim());
  const imgAlt = story.imageAlt || story.title;
  const imgHrefRaw = story.imageLink?.trim();
  const wrapImg = (tag: string) =>
    imgHrefRaw
      ? `<a href="${esc(normalizeHref(imgHrefRaw))}" style="text-decoration:none;">${tag}</a>`
      : tag;

  const metaBits = [formatEventDateLabel(story.date), story.time?.trim() || null].filter(
    Boolean,
  ) as string[];
  if (block.showLocation && story.location?.trim()) metaBits.push(story.location.trim());
  const metaLine = metaBits.join(" · ");

  const description =
    block.showDescription && story.messaging.trim()
      ? `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#4a5563;margin-top:8px;">${esc(story.messaging)}</div>`
      : "";

  const cta =
    block.showVolunteerLink && story.ctaLabel.trim() && story.ctaUrl.trim()
      ? `<a href="${esc(normalizeHref(story.ctaUrl))}" style="display:inline-block;margin-top:12px;background:${esc(colors.primary)};color:#fffcf7;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:9px 16px;border-radius:999px;text-decoration:none;">${esc(story.ctaLabel)}</a>`
      : "";

  const badge = story.featured
    ? `<span style="display:inline-block;background:${esc(colors.cta)};color:#1c2430;font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px;margin-bottom:6px;">Featured event</span><br/>`
    : "";

  if (block.eventLayout === "artwork-only") {
    if (!showArt) return "";
    const tag = `<img src="${esc(story.imageUrl!)}" alt="${esc(imgAlt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px;object-fit:cover;" />`;
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr><td>${wrapImg(tag)}</td></tr>
</table>`;
  }

  if (block.eventLayout === "compact") {
    const thumb = showArt
      ? wrapImg(
          `<img src="${esc(story.imageUrl!)}" alt="${esc(imgAlt)}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;" />`,
        )
      : `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(145deg,#2f4a3c,${esc(colors.cta)});"></div>`;
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid #ebe4d8;border-radius:12px;background:#ffffff;">
  <tr>
    <td style="padding:10px;vertical-align:top;width:56px;">${thumb}</td>
    <td style="padding:10px 12px 10px 0;vertical-align:middle;">
      <div style="font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1c2430;">${esc(story.title)}</div>
      ${metaLine ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#5c655c;margin-top:2px;">${esc(metaLine)}</div>` : ""}
    </td>
  </tr>
</table>`;
  }

  // "featured" and "card" share the rich layout — featured is bigger + badged.
  const isFeatured = block.eventLayout === "featured";
  const thumbSize = isFeatured ? 168 : 96;
  const thumb = showArt
    ? wrapImg(
        `<img src="${esc(story.imageUrl!)}" alt="${esc(imgAlt)}" width="${thumbSize}" style="display:block;width:100%;max-width:${thumbSize}px;height:auto;border-radius:12px;object-fit:cover;" />`,
      )
    : `<div style="width:${thumbSize}px;height:${thumbSize}px;border-radius:12px;background:linear-gradient(145deg,#2f4a3c,${esc(colors.cta)});"></div>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;${
    isFeatured
      ? `border:1.5px solid ${esc(colors.cta)};background:#fffdf8;`
      : "border:1px solid #ebe4d8;background:#ffffff;"
  }border-radius:14px;">
  <tr>
    <td style="padding:14px;vertical-align:top;width:${thumbSize}px;">${thumb}</td>
    <td style="padding:14px 14px 14px 0;vertical-align:top;">
      ${isFeatured ? badge : ""}
      <div style="font-family:Georgia,serif;font-size:${isFeatured ? 20 : 16}px;font-weight:700;color:#1c2430;margin:0 0 4px;">${esc(story.title)}</div>
      ${metaLine ? `<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${esc(colors.primary)};">${esc(metaLine)}</div>` : ""}
      ${description}
      ${cta}
    </td>
  </tr>
</table>`;
}

function renderHeadingImageBand(block: NewsletterCanvasBlock): string {
  if (!block.imageUrl) return "";
  const { width, height } = HEADING_IMAGE_DISPLAY;
  const tag = `<img src="${esc(block.imageUrl)}" alt="${esc(block.imageAlt)}" width="${width}" height="${height}" style="display:block;width:100%;max-width:${width}px;height:${height}px;object-fit:cover;border-radius:12px;" />`;
  const wrapped = block.imageLink.trim()
    ? `<a href="${esc(normalizeHref(block.imageLink))}" style="text-decoration:none;">${tag}</a>`
    : tag;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
  <tr><td style="text-align:center;">${wrapped}</td></tr>
</table>`;
}

function renderHeadingBlockHtml(block: NewsletterCanvasBlock): string {
  const imageBand = renderHeadingImageBand(block);
  if (!block.heading.trim() && !imageBand) return "";
  const align = block.textAlign ?? "center";
  const color = block.textColor?.trim() || "#1c2430";
  const font = newsletterFontStack(block.fontFamily, "Georgia,serif");
  const size = newsletterHeadingFontPx(block.fontSize);
  const heading = block.heading.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 6px;">
  <tr><td style="text-align:${esc(align)};font-family:${esc(font)};font-size:${size}px;font-weight:700;color:${esc(color)};line-height:1.25;">${esc(block.heading)}</td></tr>
</table>`
    : "";
  return `${imageBand}${heading}`;
}

function renderTextBlockHtml(block: NewsletterCanvasBlock): string {
  if (!block.text.trim()) return "";
  const align = block.textAlign ?? "left";
  const color = block.textColor?.trim() || "#333333";
  const font = newsletterFontStack(block.fontFamily, "Arial,sans-serif");
  const size = newsletterBodyFontPx(block.fontSize);
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
  <tr><td style="text-align:${esc(align)};font-family:${esc(font)};font-size:${size}px;line-height:1.55;color:${esc(color)};">${esc(block.text).replace(/\n/g, "<br/>")}</td></tr>
</table>`;
}

function renderImageBlockHtml(block: NewsletterCanvasBlock): string {
  if (!block.imageUrl) return "";
  const tag = `<img src="${esc(block.imageUrl)}" alt="${esc(block.imageAlt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;object-fit:cover;" />`;
  const wrapped = block.imageLink.trim()
    ? `<a href="${esc(normalizeHref(block.imageLink))}" style="text-decoration:none;">${tag}</a>`
    : tag;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
  <tr><td>${wrapped}</td></tr>
</table>`;
}

function resolveBlockButtons(block: NewsletterCanvasBlock): NewsletterCanvasButton[] {
  if (Array.isArray(block.buttons) && block.buttons.length > 0) {
    return block.buttons.filter((b) => b.label.trim()).slice(0, 2);
  }
  if (block.buttonLabel.trim()) {
    return [
      {
        id: "legacy",
        label: block.buttonLabel,
        url: block.buttonUrl,
        backgroundColor: null,
        textColor: null,
      },
    ];
  }
  return [];
}

function renderCtaAnchor(
  button: NewsletterCanvasButton,
  colors: NewsletterComposerState["colors"],
  extraStyle = "",
): string {
  const bg = button.backgroundColor?.trim() || colors.primary;
  const fg = button.textColor?.trim() || "#fffcf7";
  return `<a href="${esc(normalizeHref(button.url || "#"))}" style="display:inline-block;background:${esc(bg)};color:${esc(fg)};font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:11px 22px;border-radius:999px;text-decoration:none;${extraStyle}">${esc(button.label)}</a>`;
}

function renderButtonBlockHtml(
  block: NewsletterCanvasBlock,
  colors: NewsletterComposerState["colors"],
): string {
  const buttons = resolveBlockButtons(block);
  if (!buttons.length) return "";
  const layout = block.buttonLayout === "row" ? "row" : "stack";

  if (layout === "row" && buttons.length > 1) {
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr>
    ${buttons
      .map(
        (b) =>
          `<td style="text-align:center;padding:4px 6px;vertical-align:middle;">${renderCtaAnchor(b, colors)}</td>`,
      )
      .join("")}
  </tr>
</table>`;
  }

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  ${buttons
    .map(
      (b) =>
        `<tr><td style="text-align:center;padding:4px 0;">${renderCtaAnchor(b, colors)}</td></tr>`,
    )
    .join("")}
</table>`;
}

function renderHeroBlockHtml(
  block: NewsletterCanvasBlock,
  state: NewsletterComposerState,
): string {
  const { colors } = state;
  const title = state.issueName.trim() || "Newsletter";
  const edition = state.issueEdition.trim();
  const parts: string[] = [];

  if (state.headerImageUrl) {
    const img = `
    <img src="${esc(state.headerImageUrl)}" alt="${esc(state.headerImageAlt.trim() || title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px;" />`;
    const linked = state.headerImageLink.trim()
      ? `<a href="${esc(state.headerImageLink.trim())}" style="text-decoration:none;">${img}</a>`
      : img;
    parts.push(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr><td style="border-radius:14px;overflow:hidden;">
    ${linked}
  </td></tr>
</table>`);
  }

  const textColor = block.textColor?.trim() || "#ffffff";
  const hasStyleOverrides = Boolean(
    block.backgroundColor?.trim() ||
      block.showCta ||
      (textColor.toLowerCase() !== "#ffffff") ||
      (block.fontFamily != null && block.fontFamily !== "georgia") ||
      (block.fontSize != null && block.fontSize !== "md"),
  );

  // Keep legacy image-only headers until the author customizes style / CTA.
  if (state.headerImageUrl && !hasStyleOverrides) {
    return parts.join("\n");
  }

  const bg =
    block.backgroundColor?.trim() ||
    `linear-gradient(135deg,${colors.primary},${colors.accent})`;
  const font = newsletterFontStack(block.fontFamily, "Georgia,serif");
  const titleSize = newsletterHeaderTitleFontPx(block.fontSize);
  const align = block.textAlign ?? "center";
  const ctaButtons = block.showCta ? resolveBlockButtons(block).slice(0, 1) : [];
  const ctaHtml = ctaButtons.length
    ? `<div style="margin-top:14px;">${renderCtaAnchor(ctaButtons[0]!, colors)}</div>`
    : "";

  parts.push(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr>
    <td style="background:${esc(bg)};border-radius:14px;padding:22px 18px;text-align:${esc(align)};">
      <div style="font-family:${esc(font)};font-size:${titleSize}px;font-weight:700;color:${esc(textColor)};margin:0 0 6px;">${esc(title)}</div>
      ${
        edition
          ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:${esc(textColor)};opacity:0.92;">${esc(edition)}</div>`
          : ""
      }
      ${ctaHtml}
    </td>
  </tr>
</table>`);

  return parts.join("\n");
}

function renderTextImageBlockHtml(
  block: NewsletterCanvasBlock,
  colors: NewsletterComposerState["colors"],
): string {
  if (!block.heading.trim() && !block.text.trim() && !block.imageUrl) return "";
  const img = block.imageUrl
    ? (() => {
        const tag = `<img src="${esc(block.imageUrl!)}" alt="${esc(block.imageAlt)}" width="240" style="display:block;width:100%;max-width:240px;height:auto;border-radius:12px;object-fit:cover;" />`;
        return block.imageLink.trim()
          ? `<a href="${esc(normalizeHref(block.imageLink))}" style="text-decoration:none;">${tag}</a>`
          : tag;
      })()
    : `<div style="width:100%;max-width:240px;height:150px;border-radius:12px;background:#ebe4d8;"></div>`;
  const cta = block.buttonLabel.trim()
    ? `<a href="${esc(normalizeHref(block.buttonUrl || "#"))}" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:${esc(colors.primary)};text-decoration:none;border-bottom:2px solid ${esc(colors.accent)};">${esc(block.buttonLabel)}</a>`
    : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr>
    <td width="45%" style="vertical-align:top;padding-right:14px;">${img}</td>
    <td style="vertical-align:top;">
      ${block.heading.trim() ? `<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#1c2430;margin-bottom:6px;">${esc(block.heading)}</div>` : ""}
      ${block.text.trim() ? `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#4a5563;">${esc(block.text)}</div>` : ""}
      ${cta}
    </td>
  </tr>
</table>`;
}

function renderColumnCard(col: NewsletterCanvasColumn): string {
  const img = col.imageUrl
    ? (() => {
        const tag = `<img src="${esc(col.imageUrl!)}" alt="${esc(col.imageAlt)}" style="display:block;width:100%;height:auto;border-radius:10px;object-fit:cover;" />`;
        return col.imageLink.trim()
          ? `<a href="${esc(normalizeHref(col.imageLink))}" style="text-decoration:none;">${tag}</a>`
          : tag;
      })()
    : `<div style="width:100%;height:120px;border-radius:10px;background:#ebe4d8;"></div>`;
  const cta = col.buttonLabel.trim()
    ? `<a href="${esc(normalizeHref(col.buttonUrl || "#"))}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#0b2f5b;text-decoration:none;">${esc(col.buttonLabel)}</a>`
    : "";
  return `${img}
      ${col.heading.trim() ? `<div style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1c2430;margin-top:8px;">${esc(col.heading)}</div>` : ""}
      ${col.text.trim() ? `<div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#4a5563;margin-top:4px;">${esc(col.text)}</div>` : ""}
      ${cta}`;
}

function nonEmptyColumns(block: NewsletterCanvasBlock): NewsletterCanvasColumn[] {
  return block.columns.filter((c) => c.imageUrl || c.heading.trim() || c.text.trim());
}

function renderColumnsBlockHtml(block: NewsletterCanvasBlock): string {
  const cols = nonEmptyColumns(block);
  if (!cols.length) return "";
  const widthPct = Math.floor(100 / cols.length);
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr>${cols
    .map(
      (c) =>
        `<td width="${widthPct}%" style="vertical-align:top;padding:6px;">${renderColumnCard(c)}</td>`,
    )
    .join("")}</tr>
</table>`;
}

function renderGridBlockHtml(block: NewsletterCanvasBlock): string {
  const cols = nonEmptyColumns(block);
  if (!cols.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < cols.length; i += 2) {
    const slice = cols.slice(i, i + 2);
    rows.push(
      `<tr>${slice
        .map(
          (c) =>
            `<td width="50%" style="vertical-align:top;padding:6px;">${renderColumnCard(c)}</td>`,
        )
        .join("")}${slice.length === 1 ? `<td width="50%"></td>` : ""}</tr>`,
    );
  }
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  ${rows.join("")}
</table>`;
}

function renderCarouselBlockHtml(block: NewsletterCanvasBlock): string {
  const cols = nonEmptyColumns(block).slice(0, 3);
  if (!cols.length) return "";
  const widthPct = Math.floor(100 / cols.length);
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr>${cols
    .map(
      (c) =>
        `<td width="${widthPct}%" style="vertical-align:top;padding:6px;">${renderColumnCard(c)}</td>`,
    )
    .join("")}</tr>
</table>`;
}

function renderListBlockHtml(block: NewsletterCanvasBlock): string {
  const items = block.items.filter((i) => i.text.trim());
  if (!items.length && !block.heading.trim()) return "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
  <tr><td style="background:#f7f5f0;border-radius:12px;padding:14px 16px;">
    ${
      block.heading.trim()
        ? `<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#5c655c;margin-bottom:8px;">${esc(block.heading)}</div>`
        : ""
    }
    <ul style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#333;">
      ${items.map((i) => `<li>${esc(i.text)}</li>`).join("")}
    </ul>
  </td></tr>
</table>`;
}

function renderDividerBlockHtml(): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr><td style="border-top:1px solid #ebe4d8;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

function renderSpacerBlockHtml(block: NewsletterCanvasBlock): string {
  const height = Math.max(4, Math.min(160, block.spacingPx || 24));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</td></tr></table>`;
}

function renderFooterBlockHtml(
  block: NewsletterCanvasBlock,
  state: NewsletterComposerState,
): string {
  const text = block.text.trim() || state.footerFinePrint;
  const ctaButtons =
    block.showCta
      ? resolveBlockButtons(block).slice(0, 1)
      : [];
  if (!text.trim() && !ctaButtons.length) return "";

  const bg = block.backgroundColor?.trim() || "transparent";
  const color = block.textColor?.trim() || "#999999";
  const font = newsletterFontStack(block.fontFamily, "Arial,sans-serif");
  const size = newsletterBodyFontPx(block.fontSize ?? "sm");
  const align = block.textAlign ?? "center";
  const ctaHtml = ctaButtons.length
    ? `<div style="margin:0 0 12px;">${renderCtaAnchor(ctaButtons[0]!, state.colors)}</div>`
    : "";
  const finePrint = text.trim()
    ? `<div style="font-family:${esc(font)};font-size:${size}px;color:${esc(color)};line-height:1.5;">${esc(text).replace(/\n/g, "<br/>")}</div>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
  <tr><td style="background:${esc(bg)};border-radius:12px;text-align:${esc(align)};padding:14px 12px;border-top:1px solid #eee;">
    ${ctaHtml}
    ${finePrint}
  </td></tr>
</table>`;
}

/** Proxy shim so system kinds reuse the legacy `renderBlock` renderer verbatim. */
function renderCanvasBlock(
  block: NewsletterCanvasBlock,
  state: NewsletterComposerState,
): string {
  const proxy = (kind: NewsletterLayoutBlock["kind"]) =>
    renderBlock({ id: block.id, kind, storyId: null, label: "", detail: "" }, state);

  switch (block.kind) {
    case "hero":
      return renderHeroBlockHtml(block, state);
    case "message":
      return proxy("message");
    case "calendar":
      return proxy("calendar");
    case "volunteer":
      return proxy("volunteer");
    case "sponsors":
      return proxy("sponsors");
    case "links":
      return proxy("links");
    case "cta":
      return proxy("cta");
    case "socials":
      return proxy("socials");
    case "event":
      return renderEventBlockHtml(block, state);
    case "heading":
      return renderHeadingBlockHtml(block);
    case "text":
      return renderTextBlockHtml(block);
    case "image":
      return renderImageBlockHtml(block);
    case "button":
      return renderButtonBlockHtml(block, state.colors);
    case "textImage":
      return renderTextImageBlockHtml(block, state.colors);
    case "columns":
      return renderColumnsBlockHtml(block);
    case "grid":
      return renderGridBlockHtml(block);
    case "carousel":
      return renderCarouselBlockHtml(block);
    case "list":
      return renderListBlockHtml(block);
    case "divider":
      return renderDividerBlockHtml();
    case "spacer":
      return renderSpacerBlockHtml(block);
    case "footer":
      return renderFooterBlockHtml(block, state);
    default:
      return "";
  }
}

/** Body HTML for the Block Builder canvas — ordered, one render call per block. */
function renderCanvasBody(state: NewsletterComposerState): string {
  const blocks = state.canvasBlocks ?? [];
  return blocks
    .map((block) => renderCanvasBlock(block, state))
    .filter(Boolean)
    .join("\n");
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

function renderAnyBody(state: NewsletterComposerState): string {
  return Array.isArray(state.canvasBlocks) && state.canvasBlocks.length > 0
    ? renderCanvasBody(state)
    : renderBody(state);
}

/**
 * In-app preview fragment that never throws.
 * Incomplete / legacy composer snapshots must not blank Approvals or Library.
 */
export function tryExportNewsletterPreviewFragment(
  state: unknown,
): string | null {
  if (!state || typeof state !== "object") return null;
  try {
    const html = renderAnyBody(state as NewsletterComposerState);
    return html.trim() ? html : null;
  } catch {
    return null;
  }
}

/** Email-safe HTML for community newsletters (table layout). */
export function exportNewsletterHtml(state: NewsletterComposerState): string {
  const body = renderAnyBody(state);

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
  return renderAnyBody(state);
}

/** Single-block fragment — powers the Block Builder canvas's WYSIWYG preview. */
export function exportCanvasBlockFragment(
  block: NewsletterCanvasBlock,
  state: NewsletterComposerState,
): string {
  return renderCanvasBlock(block, state);
}
