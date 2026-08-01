"use client";

import type { ReactNode } from "react";
import { clearLocalCampaignBuilderStorageOnSignOut } from "@/lib/campaign-builder-v2/clear-on-signout";
import { clearTasksEaseLocalStorageOnSignOut } from "@/lib/tasks-v2/tasks-ease-storage-scope";

interface SignOutFormProps {
  children: ReactNode;
  className?: string;
}

/**
 * Drop-in replacement for `<form action="/auth/signout" method="POST">`.
 * Runs local shared-device cleanup synchronously on submit, before the
 * browser's native POST navigation proceeds — the server route can only
 * clear cookies, not this browser's localStorage.
 */
export function SignOutForm({ children, className }: SignOutFormProps) {
  return (
    <form
      action="/auth/signout"
      method="POST"
      className={className}
      onSubmit={() => {
        clearLocalCampaignBuilderStorageOnSignOut();
        clearTasksEaseLocalStorageOnSignOut();
      }}
    >
      {children}
    </form>
  );
}
