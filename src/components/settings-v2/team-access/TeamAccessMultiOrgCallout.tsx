import { Building2 } from "lucide-react";

/**
 * Admin-facing note: how one person can belong to multiple organizations.
 * Shown on Settings → Team & Access when the viewer can manage people.
 */
export function TeamAccessMultiOrgCallout() {
  return (
    <aside
      className="mb-[18px] rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] px-[22px] py-4 shadow-[0_8px_28px_rgba(28,36,48,0.04)]"
      aria-labelledby="team-access-multi-org-heading"
    >
      <div className="flex gap-3">
        <Building2
          className="mt-0.5 h-4 w-4 shrink-0 text-[#7a7166]"
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="min-w-0">
          <h2
            id="team-access-multi-org-heading"
            className="m-0 text-[13px] font-bold text-[#2a2622]"
          >
            Adding someone who already uses Hey Ralli
          </h2>
          <p className="mt-1.5 mb-0 text-[13px] leading-snug text-[#5c554c]">
            The same person can belong to more than one organization. Invite
            their email here — use the same address they already sign in with.
            They&apos;ll accept the invite (or sign in with that email), and
            this organization is added to their account.
          </p>
          <ul className="mt-2.5 mb-0 list-disc space-y-1 pl-[1.15rem] text-[13px] leading-snug text-[#5c554c]">
            <li>Roles and permissions are set per organization.</li>
            <li>
              After they join, they switch workspaces from the organization menu
              in the header.
            </li>
            <li>
              You cannot add someone who is already an active member of this
              organization — resend their invite if they have not accepted yet.
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
