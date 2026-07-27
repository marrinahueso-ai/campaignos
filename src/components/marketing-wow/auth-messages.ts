export function marketingAuthErrorMessage(
  code: string | null | undefined,
  options?: {
    setupIntent?: boolean;
    inviteEmail?: string | null;
  },
): string | null {
  if (!code) return null;
  switch (code) {
    case "auth":
      return options?.setupIntent
        ? "Sign-in link expired or invalid. Request a new one below."
        : "Sign-in link expired or invalid. Sign in with email and password or Google.";
    case "code_required":
      return "Choose a plan, then enter a valid founding access code at checkout to start your organization.";
    case "existing_org":
      return "This email already has a workspace. Sign in to continue, or use an invite link to join another team.";
    case "org_required":
      return "Finish checkout with a founding access code before using Hey Ralli.";
    case "account_deactivated":
      return "Your account has been deactivated. Contact an admin to be reinvited — this is not a new organization signup.";
    case "invite_email":
      return options?.inviteEmail
        ? `Sign in with the invited email (${options.inviteEmail}) to join this team.`
        : "Sign in with the invited email to join this team.";
    default:
      return null;
  }
}
