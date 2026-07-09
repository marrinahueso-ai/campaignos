"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { inviteTeamMemberAction } from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationCommittee, OrganizationRole } from "@/types/organization-workspace";

interface TeamAccessInviteModalProps {
  open: boolean;
  onClose: () => void;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  canProvisionAccounts: boolean;
  prefill?: {
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
  } | null;
}

export function TeamAccessInviteModal({
  open,
  onClose,
  roles,
  committees,
  prefill,
}: TeamAccessInviteModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteTeamMemberAction(
        { error: null, success: false },
        formData,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setInviteUrl(result.inviteUrl ?? null);
      router.refresh();
    });
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      setError("Could not copy invite link.");
    }
  }

  function handleClose() {
    setError(null);
    setInviteUrl(null);
    onClose();
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title="Invite team member"
      subtitle="Send an invite link or share credentials."
      footer={
        inviteUrl ? (
          <div className="flex justify-end">
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" form="invite-member-form" disabled={isPending}>
              Send invite
            </Button>
          </div>
        )
      }
    >
      {inviteUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-cos-muted">
            Share this invite link. They sign in with Google using the invited email.
          </p>
          <p className="break-all text-sm font-medium text-cos-text">{inviteUrl}</p>
          <Button type="button" variant="secondary" size="sm" onClick={copyInviteLink}>
            <Copy className="h-4 w-4" />
            Copy invite link
          </Button>
        </div>
      ) : (
        <form id="invite-member-form" action={handleSubmit} className="space-y-4">
          <Input
            name="email"
            label="Email address"
            type="email"
            placeholder="name@schoolpto.org"
            defaultValue={prefill?.email ?? ""}
            required
          />
          <Input
            name="fullName"
            label="Full name (optional)"
            placeholder="Jamie Smith"
            defaultValue={prefill?.name ?? ""}
          />
          <Select
            name="organizationRoleId"
            label="Role"
            defaultValue={prefill?.organizationRoleId ?? ""}
          >
            <option value="">Select role (optional)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <Select name="campaignRole" label="Access level" defaultValue="contributor">
            {CAMPAIGN_ROLES.map((role) => (
              <option key={role} value={role}>
                {campaignRoleLabel(role as CampaignRole)}
              </option>
            ))}
          </Select>
          <Select
            name="committeeId"
            label="Committee (optional)"
            defaultValue={prefill?.committeeId ?? ""}
          >
            <option value="">None</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>
                {committee.name}
              </option>
            ))}
          </Select>
          <Textarea
            label="Message (optional)"
            name="message"
            placeholder="Welcome to the team!"
            rows={3}
          />
          <label className="flex items-center gap-2 text-sm text-cos-text">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="rounded border-cos-border"
            />
            Send invite email
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </TeamAccessModal>
  );
}
