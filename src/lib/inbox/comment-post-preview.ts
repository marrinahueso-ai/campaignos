import { isCommentChannel, isTaggedChannel } from "@/lib/inbox/constants";
import type { InboxChannelType, InboxThread } from "@/lib/inbox/types";

export interface CommentPostPreviewData {
  caption: string | null;
  imageUrl: string | null;
  permalink: string | null;
}

const GENERIC_SUBJECTS = new Set([
  "Facebook post",
  "Instagram post",
  "Facebook post comment",
]);

/** Public Facebook post URL from Graph post id ({page_id}_{story_fbid}). */
export function buildFacebookPostPermalink(postId: string): string {
  return `https://www.facebook.com/${postId.trim()}`;
}

/** Prefer canonical post-id URL; Graph permalink_url often 404s for Page posts. */
export function resolveFacebookPostPermalink(input: {
  postId: string;
  graphPermalink?: string | null;
}): string {
  return buildFacebookPostPermalink(input.postId);
}

function readMetaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isFacebookChannel(channelType: InboxChannelType): boolean {
  return channelType === "facebook_comment" || channelType === "facebook_tag";
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isGraphApiUrl(url: string): boolean {
  return url.includes("graph.facebook.com");
}

function permalinkLooksLikeCommentUrl(url: string, thread: InboxThread): boolean {
  const parts = thread.externalThreadId.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const commentId = parts[1];
  return commentId ? url.includes(commentId) : false;
}

export function buildCommentPostMetadata(input: {
  caption: string | null;
  imageUrl: string | null;
  permalink: string | null;
  postId?: string | null;
  mediaId?: string | null;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(input.postId ? { postId: input.postId } : {}),
    ...(input.mediaId ? { mediaId: input.mediaId } : {}),
    permalink: input.permalink,
    post_permalink: input.permalink,
    post_caption: input.caption,
    post_image_url: input.imageUrl,
    ...input.extra,
  };
}

export function readCommentPostPreview(thread: InboxThread): CommentPostPreviewData | null {
  if (!isCommentChannel(thread.channelType)) {
    return null;
  }

  const meta = thread.metadata;
  const captionFromMeta =
    typeof meta.post_caption === "string" && meta.post_caption.trim()
      ? meta.post_caption
      : null;
  const captionFromSubject =
    thread.subject && !GENERIC_SUBJECTS.has(thread.subject) ? thread.subject : null;

  const imageUrl =
    typeof meta.post_image_url === "string" && meta.post_image_url.trim()
      ? meta.post_image_url
      : null;

  const permalink =
    (typeof meta.post_permalink === "string" && meta.post_permalink.trim()
      ? meta.post_permalink
      : null) ??
    (typeof meta.permalink === "string" && meta.permalink.trim() ? meta.permalink : null);

  return {
    caption: captionFromMeta ?? captionFromSubject,
    imageUrl,
    permalink,
  };
}

export function hasCommentPostPreview(thread: InboxThread): boolean {
  const preview = readCommentPostPreview(thread);
  if (!preview) {
    return false;
  }

  return Boolean(preview.caption || preview.imageUrl || preview.permalink);
}

export function readThreadPostPermalink(thread: InboxThread): string | null {
  const meta = thread.metadata;
  const stored =
    readMetaString(meta, "post_permalink") ?? readMetaString(meta, "permalink");
  const postId =
    readMetaString(meta, "postId") ??
    readMetaString(meta, "mediaId") ??
    thread.externalPostId;

  if (isFacebookChannel(thread.channelType) && postId) {
    return buildFacebookPostPermalink(postId);
  }

  if (
    stored &&
    isValidHttpUrl(stored) &&
    !isGraphApiUrl(stored) &&
    !permalinkLooksLikeCommentUrl(stored, thread)
  ) {
    return stored;
  }

  return null;
}

export function hasThreadPostPermalink(thread: InboxThread): boolean {
  if (!isCommentChannel(thread.channelType) && !isTaggedChannel(thread.channelType)) {
    return false;
  }

  return Boolean(readThreadPostPermalink(thread));
}
