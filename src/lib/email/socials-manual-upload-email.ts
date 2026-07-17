import "server-only";

import { escapeHtml } from "@/lib/utils/html";
import type { EmailAttachment } from "@/lib/email/send";
import { resolveStoryKitCaption } from "@/lib/campaign-builder-v2/manual-email-scheduling";
import { resolveSiteOrigin } from "@/lib/site/url";

export interface SocialsManualUploadEmailContent {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
}

export interface SocialsManualUploadEmailInput {
  eventTitle: string;
  milestoneTitle: string;
  scheduledLabel: string;
  storyCaption: string | null;
  feedCaption: string | null;
  eventLink: string | null;
  postKitUrl: string;
  storyArtworkUrl: string | null;
  organizationName: string;
}

function instagramPostBridgeUrl(): string {
  return `${resolveSiteOrigin()}/go/instagram-post`;
}

/** Helps Gmail users create a filter so Hey Ralli kits stay out of Promotions. */
function gmailPrimaryFilterUrl(): string {
  return `${resolveSiteOrigin()}/go/email-primary`;
}

function buildFilename(eventTitle: string, milestoneTitle: string): string {
  const safe = `${eventTitle}-${milestoneTitle}`
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || "story"}-instagram-story.png`;
}

async function fetchStoryAttachment(
  storyArtworkUrl: string | null,
  eventTitle: string,
  milestoneTitle: string,
): Promise<EmailAttachment[]> {
  if (!storyArtworkUrl) {
    return [];
  }

  try {
    const response = await fetch(storyArtworkUrl);
    if (!response.ok) {
      return [];
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    return [
      {
        filename: buildFilename(eventTitle, milestoneTitle),
        content: buffer,
        contentType,
      },
    ];
  } catch {
    return [];
  }
}

/**
 * Professional Hey Ralli template for manual Instagram upload kits.
 * Sent from Socials@heyralli.com via Resend (display name: Hey Ralli).
 */
export async function buildSocialsManualUploadEmail(
  input: SocialsManualUploadEmailInput,
): Promise<SocialsManualUploadEmailContent> {
  const subject = `Ready to post: ${input.eventTitle} — ${input.milestoneTitle}`;
  const instagramUrl = instagramPostBridgeUrl();
  const emailPrimaryUrl = gmailPrimaryFilterUrl();

  const previewImg = input.storyArtworkUrl
    ? `<tr>
        <td style="padding:0 32px 24px;">
          <a href="${escapeHtml(input.storyArtworkUrl)}" style="display:block;text-decoration:none;">
            <img
              src="${escapeHtml(input.storyArtworkUrl)}"
              alt="Instagram story artwork"
              width="280"
              style="display:block;margin:0 auto;width:280px;max-width:100%;height:auto;border-radius:16px;border:1px solid #ddd4c8;"
            />
          </a>
          <p style="margin:12px 0 0;text-align:center;font-size:13px;color:#5c554c;">
            <a href="${escapeHtml(input.storyArtworkUrl)}" style="color:#b8956f;font-weight:600;text-decoration:underline;">Download 9:16 story image</a>
          </p>
        </td>
      </tr>`
    : "";

  // One caption with the artwork — prefer Instagram/story, else shared feed text.
  const caption = resolveStoryKitCaption(input.storyCaption, input.feedCaption);

  const captionBlock = caption
    ? `<tr>
        <td style="padding:0 32px 20px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">Caption</p>
          <div style="background:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.55;color:#2a2622;white-space:pre-wrap;">${escapeHtml(caption)}</div>
        </td>
      </tr>`
    : "";

  const eventLinkBlock = input.eventLink?.trim()
    ? `<tr>
        <td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">Link for Instagram sticker</p>
          <a href="${escapeHtml(input.eventLink.trim())}" style="color:#2a2622;font-size:15px;font-weight:600;word-break:break-all;">${escapeHtml(input.eventLink.trim())}</a>
        </td>
      </tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ebe4d9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe4d9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#f6f2eb;border:1px solid #ddd4c8;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#2a2622;padding:22px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#f6f2eb;letter-spacing:0.02em;">Hey Ralli</p>
              <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#a89f94;letter-spacing:0.08em;text-transform:uppercase;">Story post kit</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2a2622;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c554c;">${escapeHtml(input.organizationName)}</p>
              <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:#2a2622;">Your story is ready to post</h1>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#5c554c;">
                <strong style="color:#2a2622;">${escapeHtml(input.eventTitle)}</strong>
                &nbsp;·&nbsp;${escapeHtml(input.milestoneTitle)}
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#5c554c;">
                Post by <strong style="color:#2a2622;">${escapeHtml(input.scheduledLabel)}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#2a2622;">
                Download the 9:16 image, copy the caption, then open Instagram to post.
                Add your link sticker in Stories when you’re ready.
              </p>
            </td>
          </tr>
          ${previewImg}
          ${captionBlock}
          ${eventLinkBlock}
          <tr>
            <td style="padding:0 32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <a href="${escapeHtml(instagramUrl)}" style="display:inline-block;background:#2a2622;color:#f6f2eb;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:14px;font-weight:600;margin:0 10px 10px 0;">
                Post to Instagram
              </a>
              <a href="${escapeHtml(input.postKitUrl)}" style="display:inline-block;background:transparent;color:#2a2622;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid #2a2622;margin:0 0 10px 0;">
                Open in Hey Ralli
              </a>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.45;color:#5c554c;">
                Opens Instagram on your phone when possible. Meta doesn’t allow preloading Stories from email — use the downloaded image from your camera roll.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <a href="${escapeHtml(emailPrimaryUrl)}" style="display:inline-block;background:#e8dfd2;color:#2a2622;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:600;">
                Keep Hey Ralli in Primary
              </a>
              <p style="margin:10px 0 0;font-size:12px;line-height:1.45;color:#5c554c;">
                One-time Gmail setup so approvals, reminders, and post kits stay in Primary — not Promotions.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 22px;border-top:1px solid #ddd4c8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#5c554c;">
              Sent by Hey Ralli · <a href="mailto:Socials@heyralli.com" style="color:#5c554c;">Socials@heyralli.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textParts = [
    "Hey Ralli — Story post kit",
    "",
    `${input.eventTitle} · ${input.milestoneTitle}`,
    `Post by: ${input.scheduledLabel}`,
    "",
    "Post to Instagram:",
    instagramUrl,
    "",
    "Open in Hey Ralli:",
    input.postKitUrl,
    "",
    "Keep all Hey Ralli mail in Primary:",
    emailPrimaryUrl,
  ];

  if (input.storyArtworkUrl) {
    textParts.push("", "Story image:", input.storyArtworkUrl);
  }
  if (caption) {
    textParts.push("", "Caption:", caption);
  }
  if (input.eventLink?.trim()) {
    textParts.push("", "Link for Instagram sticker:", input.eventLink.trim());
  }

  const attachments = await fetchStoryAttachment(
    input.storyArtworkUrl,
    input.eventTitle,
    input.milestoneTitle,
  );

  return {
    subject,
    html,
    text: textParts.join("\n"),
    attachments,
  };
}
