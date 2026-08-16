"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { inboxParticipantInitials } from "@/lib/inbox/avatars";
import { cn } from "@/lib/utils/cn";

type InboxParticipantAvatarProps = {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  /** Outer circle size + text size classes. */
  className?: string;
  /** When true, show a User icon instead of "?" for missing names. */
  showUserIconFallback?: boolean;
};

/**
 * Contact / page avatar with honest initials fallback when the URL is missing
 * or fails to load (expired Meta CDN, CSP, network).
 */
export function InboxParticipantAvatar({
  avatarUrl,
  name,
  className,
  showUserIconFallback = false,
}: InboxParticipantAvatarProps) {
  const [failed, setFailed] = useState(false);
  const trimmedUrl = avatarUrl?.trim() || null;
  const initials = inboxParticipantInitials(name);
  const showImage = Boolean(trimmedUrl) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [trimmedUrl]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-cos-bg font-semibold text-cos-text",
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          src={trimmedUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {initials !== "?" ? (
            initials
          ) : showUserIconFallback ? (
            <User className="h-4 w-4 text-cos-muted" strokeWidth={1.75} />
          ) : (
            initials
          )}
        </span>
      )}
    </div>
  );
}
