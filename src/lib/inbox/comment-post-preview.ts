import { isCommentChannel, isTaggedChannel } from "@/lib/inbox/constants";
import type { InboxThread } from "@/lib/inbox/types";

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
  const postPermalink =
    typeof meta.post_permalink === "string" && meta.post_permalink.trim()
      ? meta.post_permalink
      : null;
  const permalink =
    typeof meta.permalink === "string" && meta.permalink.trim() ? meta.permalink : null;

  return postPermalink ?? permalink;
}

export function hasThreadPostPermalink(thread: InboxThread): boolean {
  if (!isCommentChannel(thread.channelType) && !isTaggedChannel(thread.channelType)) {
    return false;
  }

  return Boolean(readThreadPostPermalink(thread));
}
