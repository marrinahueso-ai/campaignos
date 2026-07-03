import "server-only";

import { escapeHtml } from "@/lib/utils/html";
import type { EmailAttachment } from "@/lib/email/send";

export interface StoryReminderEmailContent {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
}

export interface StoryReminderEmailInput {
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

export async function buildStoryReminderEmail(
  input: StoryReminderEmailInput,
): Promise<StoryReminderEmailContent> {
  const subject = `Story ready to post: ${input.eventTitle} — ${input.milestoneTitle}`;

  const storyCaptionBlock = input.storyCaption?.trim()
    ? `<p><strong>Story caption</strong></p><pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(input.storyCaption.trim())}</pre>`
    : "";

  const feedCaptionBlock = input.feedCaption?.trim()
    ? `<p><strong>Feed caption</strong></p><pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(input.feedCaption.trim())}</pre>`
    : "";

  const eventLinkBlock = input.eventLink?.trim()
    ? `<p><strong>Event link for stickers</strong><br /><a href="${escapeHtml(input.eventLink.trim())}">${escapeHtml(input.eventLink.trim())}</a></p>`
    : "";

  const storyDownloadBlock = input.storyArtworkUrl
    ? `<p><a href="${escapeHtml(input.storyArtworkUrl)}">Download story image</a> (also attached when possible)</p>`
    : "";

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#18181b;max-width:560px;">
      <p style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(input.organizationName)}</p>
      <h1 style="font-size:22px;margin:0 0 8px;">Story ready to post on Instagram</h1>
      <p style="margin:0 0 16px;color:#52525b;">
        <strong>${escapeHtml(input.eventTitle)}</strong> · ${escapeHtml(input.milestoneTitle)}
      </p>
      <p style="margin:0 0 16px;">Scheduled for <strong>${escapeHtml(input.scheduledLabel)}</strong>.</p>
      <p style="margin:0 0 16px;">
        Open the post kit to download assets, copy captions, and post your story manually — add music, link stickers, and tags in the Instagram app.
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(input.postKitUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open post kit</a>
      </p>
      ${storyDownloadBlock}
      ${storyCaptionBlock}
      ${feedCaptionBlock}
      ${eventLinkBlock}
    </div>
  `.trim();

  const textParts = [
    `Story ready to post: ${input.eventTitle} — ${input.milestoneTitle}`,
    `Scheduled: ${input.scheduledLabel}`,
    "",
    "Open post kit:",
    input.postKitUrl,
  ];

  if (input.storyArtworkUrl) {
    textParts.push("", "Story image:", input.storyArtworkUrl);
  }
  if (input.storyCaption?.trim()) {
    textParts.push("", "Story caption:", input.storyCaption.trim());
  }
  if (input.feedCaption?.trim()) {
    textParts.push("", "Feed caption:", input.feedCaption.trim());
  }
  if (input.eventLink?.trim()) {
    textParts.push("", "Event link:", input.eventLink.trim());
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
