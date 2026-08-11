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

function imagePlaceholder(label: string): { html: string; text: string } {
  const line = `[Image: ${label}]`;
  return { html: `<p>${esc(line)}</p>`, text: line };
}

function joinParts(parts: string[], sep: string): string {
  return parts.filter(Boolean).join(sep);
}

function renderStoryMtk(story: NewsletterStory): {
  html: string;
  text: string;
} {
  const title = story.featured ? `★ ${story.title}` : story.title;
  const htmlParts: string[] = [`<h3>${esc(title)}</h3>`];
  const textParts: string[] = [title, ""];

  if (story.imageUrl?.trim()) {
    const ph = imagePlaceholder(story.title.trim() || "story photo");
    htmlParts.push(ph.html);
    textParts.push(ph.text);
  }

  if (story.messaging.trim()) {
    htmlParts.push(`<p>${esc(story.messaging)}</p>`);
    textParts.push(story.messaging);
  }

  if (story.ctaLabel.trim() && story.ctaUrl.trim()) {
    const href = normalizeHref(story.ctaUrl);
    htmlParts.push(
      `<p><a href="${esc(href)}">${esc(story.ctaLabel)}</a></p>`,
    );
    textParts.push(`${story.ctaLabel}: ${href}`);
  }

  return {
    html: joinParts(htmlParts, "\n"),
    text: joinParts(textParts, "\n"),
  };
}

function renderBlockMtk(
  block: NewsletterLayoutBlock,
  state: NewsletterComposerState,
): { html: string; text: string } | null {
  switch (block.kind) {
    case "header": {
      const title = state.issueName.trim() || "Newsletter";
      const edition = state.issueEdition.trim();
      const htmlParts: string[] = [];
      const textParts: string[] = [];
      if (state.headerImageUrl?.trim()) {
        const ph = imagePlaceholder("header logo");
        htmlParts.push(ph.html);
        textParts.push(ph.text);
      }
      htmlParts.push(`<h2>${esc(title)}</h2>`);
      textParts.push(title);
      if (edition) {
        htmlParts.push(`<p>${esc(edition)}</p>`);
        textParts.push(edition);
      }
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    case "message": {
      if (!state.leadershipMessage.trim()) return null;
      const htmlParts: string[] = [];
      const textParts: string[] = [];
      if (state.leadershipNames.trim()) {
        htmlParts.push(
          `<h2>From ${esc(state.leadershipNames)}</h2>`,
        );
        textParts.push(`From ${state.leadershipNames}`);
      } else {
        htmlParts.push("<h2>Leadership message</h2>");
        textParts.push("Leadership message");
      }
      htmlParts.push(`<p>${esc(state.leadershipMessage)}</p>`);
      textParts.push(state.leadershipMessage);
      if (state.ptoNote.trim()) {
        htmlParts.push(`<p><em>${esc(state.ptoNote)}</em></p>`);
        textParts.push(state.ptoNote);
      }
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    case "story": {
      const story = storyById(state, block.storyId);
      if (!story || !story.included) return null;
      return renderStoryMtk(story);
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
      if (!chips.length) return null;
      return {
        html: joinParts(
          [
            "<h2>Upcoming calendar</h2>",
            `<ul>${chips.map((c) => `<li>${esc(c.label)}</li>`).join("")}</ul>`,
          ],
          "\n",
        ),
        text: joinParts(
          ["Upcoming calendar", ...chips.map((c) => `• ${c.label}`)],
          "\n",
        ),
      };
    }
    case "volunteer": {
      const asks = state.volunteerAsks.filter((v) => v.included);
      if (!asks.length) return null;
      const htmlParts: string[] = ["<h2>Volunteer</h2>"];
      const textParts: string[] = ["Volunteer", ""];
      asks.forEach((v, i) => {
        htmlParts.push(`<h3>${esc(v.title)}</h3>`);
        textParts.push(v.title);
        if (v.imageUrl?.trim()) {
          const ph = imagePlaceholder(v.title.trim() || "volunteer photo");
          htmlParts.push(ph.html);
          textParts.push(ph.text);
        }
        if (v.details.trim()) {
          htmlParts.push(`<p>${esc(v.details)}</p>`);
          textParts.push(v.details);
        }
        if (v.signupUrl.trim()) {
          const href = normalizeHref(v.signupUrl);
          htmlParts.push(`<p><a href="${esc(href)}">Sign up →</a></p>`);
          textParts.push(`Sign up: ${href}`);
        }
        if (i < asks.length - 1) textParts.push("");
      });
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    case "sponsors": {
      const sponsors = state.sponsors.filter(
        (s) => s.name.trim() && s.imageUrl?.trim(),
      );
      if (!sponsors.length && !state.sponsorCtaLabel.trim()) return null;
      const htmlParts: string[] = ["<h2>Thank you sponsors</h2>"];
      const textParts: string[] = ["Thank you sponsors", ""];
      for (const s of sponsors) {
        const ph = imagePlaceholder(s.name.trim() || "sponsor logo");
        htmlParts.push(ph.html);
        textParts.push(ph.text);
        if (s.url.trim()) {
          const href = normalizeHref(s.url);
          htmlParts.push(
            `<p><strong><a href="${esc(href)}">${esc(s.name)}</a></strong></p>`,
          );
          textParts.push(`${s.name}: ${href}`);
        } else {
          htmlParts.push(`<p><strong>${esc(s.name)}</strong></p>`);
          textParts.push(s.name);
        }
        if (s.note.trim()) {
          htmlParts.push(`<p>${esc(s.note)}</p>`);
          textParts.push(s.note);
        }
      }
      if (state.sponsorCtaLabel.trim()) {
        const href = normalizeHref(state.sponsorCtaUrl || "#");
        htmlParts.push(
          `<p><a href="${esc(href)}">${esc(state.sponsorCtaLabel)}</a></p>`,
        );
        textParts.push(`${state.sponsorCtaLabel}: ${href}`);
      }
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    case "links": {
      const links = state.helpfulLinks.filter((l) => l.label.trim());
      if (!links.length) return null;
      const itemsHtml = links
        .map((l) => {
          const label = `${l.emoji ? `${l.emoji} ` : ""}${l.label}`;
          if (l.url.trim()) {
            const href = normalizeHref(l.url);
            return `<li><a href="${esc(href)}">${esc(label)}</a></li>`;
          }
          return `<li>${esc(label)}</li>`;
        })
        .join("");
      const itemsText = links.map((l) => {
        const label = `${l.emoji ? `${l.emoji} ` : ""}${l.label}`;
        return l.url.trim()
          ? `• ${label}: ${normalizeHref(l.url)}`
          : `• ${label}`;
      });
      return {
        html: joinParts(
          ["<h2>Helpful links</h2>", `<ul>${itemsHtml}</ul>`],
          "\n",
        ),
        text: joinParts(["Helpful links", ...itemsText], "\n"),
      };
    }
    case "cta": {
      if (!state.footerCtaHeadline.trim() && !state.footerCtaLabel.trim())
        return null;
      const htmlParts: string[] = ["<h2>Get involved</h2>"];
      const textParts: string[] = ["Get involved"];
      if (state.footerCtaHeadline.trim()) {
        htmlParts.push(`<p><strong>${esc(state.footerCtaHeadline)}</strong></p>`);
        textParts.push(state.footerCtaHeadline);
      }
      const label = state.footerCtaLabel.trim() || "Get Involved →";
      const href = normalizeHref(state.footerCtaUrl || "#");
      htmlParts.push(`<p><a href="${esc(href)}">${esc(label)}</a></p>`);
      textParts.push(`${label}: ${href}`);
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    case "socials": {
      const socials = state.socials.filter((s) => s.enabled && s.label.trim());
      const htmlParts: string[] = ["<h2>Follow us</h2>"];
      const textParts: string[] = ["Follow us"];
      if (socials.length) {
        htmlParts.push(
          `<ul>${socials
            .map((s) => {
              const href = normalizeHref(s.url || "#");
              return `<li><a href="${esc(href)}">${esc(s.label)}</a></li>`;
            })
            .join("")}</ul>`,
        );
        for (const s of socials) {
          textParts.push(`• ${s.label}: ${normalizeHref(s.url || "#")}`);
        }
      }
      if (state.footerFinePrint.trim()) {
        htmlParts.push(`<p>${esc(state.footerFinePrint)}</p>`);
        textParts.push(state.footerFinePrint);
      }
      return {
        html: joinParts(htmlParts, "\n"),
        text: joinParts(textParts, "\n"),
      };
    }
    default:
      return null;
  }
}

export type NewsletterMtkExport = {
  html: string;
  text: string;
};

/**
 * Simplified rich-text fragment for Membership Toolkit Quick Email (WYSIWYG).
 * No email chrome, no &lt;img&gt; — image spots become plain placeholders.
 */
export function exportNewsletterMtk(state: NewsletterComposerState): NewsletterMtkExport {
  const blocks = orderedLayoutBlocks(state);
  const htmlSections: string[] = [];
  const textSections: string[] = [];
  let newsBandInserted = false;
  let sawFeatured = false;

  for (const block of blocks) {
    if (block.kind === "story") {
      const story = storyById(state, block.storyId);
      if (!story || !story.included) continue;

      if (story.featured) {
        const rendered = renderStoryMtk(story);
        htmlSections.push(rendered.html);
        textSections.push(rendered.text);
        sawFeatured = true;
        continue;
      }

      if (!newsBandInserted) {
        const band = sawFeatured ? "More news & events" : "News & events";
        htmlSections.push(`<h2>${esc(band)}</h2>`);
        textSections.push(band);
        newsBandInserted = true;
      }
      const rendered = renderStoryMtk(story);
      htmlSections.push(rendered.html);
      textSections.push(rendered.text);
      continue;
    }

    const rendered = renderBlockMtk(block, state);
    if (rendered) {
      htmlSections.push(rendered.html);
      textSections.push(rendered.text);
    }
  }

  return {
    html: htmlSections.join("\n<hr>\n"),
    text: textSections.join("\n\n---\n\n"),
  };
}
