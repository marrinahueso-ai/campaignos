export interface AccountNotificationPreferences {
  approvalNeedsAttention: boolean;
  inboxFollowUps: boolean;
  weeklySummaryEmail: boolean;
}

export interface SettingsEaseAccountData {
  displayName: string;
  email: string;
  workspaceName: string;
  roleLabel: string;
  notificationPreferences: AccountNotificationPreferences;
  /** True when erase must re-check the email/password credential. */
  eraseRequiresPassword: boolean;
}

export const DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES: AccountNotificationPreferences =
  {
    approvalNeedsAttention: true,
    inboxFollowUps: true,
    weeklySummaryEmail: false,
  };

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Normalize DB / form values to the three Account toggles. */
export function normalizeAccountNotificationPreferences(
  raw: unknown,
): AccountNotificationPreferences {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    approvalNeedsAttention: asBoolean(
      source.approvalNeedsAttention,
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.approvalNeedsAttention,
    ),
    inboxFollowUps: asBoolean(
      source.inboxFollowUps,
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.inboxFollowUps,
    ),
    weeklySummaryEmail: asBoolean(
      source.weeklySummaryEmail,
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.weeklySummaryEmail,
    ),
  };
}

/** Approval emails that wait on the recipient to approve or revise. */
export function isApprovalNeedsAttentionType(
  notificationType: string,
): boolean {
  return (
    notificationType === "approval_assigned" ||
    notificationType === "approval_resubmitted" ||
    notificationType === "change_requested"
  );
}
