"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import { giveAppAccessAction } from "@/lib/auth/actions";
import {
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";

const GIVE_APP_ACCESS_ROLES: CampaignRole[] = [
  "contributor",
  "tester",
  "developer",
  "admin",
];

interface TeamAccessGiveAppAccessModalProps {
  open: boolean;
  onClose: () => void;
  member: UnifiedTeamMember | null;
}

export function TeamAccessGiveAppAccessModal({
  open,
  onClose,
  member,
}: TeamAccessGiveAppAccessModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open || !member) {
      return;
    }
    setEmail(member.email || "");
    setError(null);
    setWarning(null);
    setMessage(null);
    setInviteUrl(null);
    setSendEmail(true);
  }, [open, member]);

  function handleClose() {
    setError(null);
    setWarning(null);
    setMessage(null);
    setInviteUrl(null);
    onClose();
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      setError("Could not copy invite link.");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member?.organizationMemberId) {
      setError("This person is missing a roster record.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const campaignRole = formData.get("campaignRole")?.toString() as CampaignRole;

    startTransition(async () => {
      const result = await giveAppAccessAction({
        organizationMemberId: member.organizationMemberId!,
        email: email.trim(),
        campaignRole,
        sendEmail,
      });
      if (result.error) {
        setError(result.error);
        setWarning(null);
        return;
      }
      setError(null);
      setWarning(result.warning ?? null);
      setMessage(result.message ?? null);
      setInviteUrl(result.inviteUrl ?? null);
      router.refresh();
    });
  }

  if (!member) {
    return null;
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title="Give app access"
      subtitle={`${member.displayName} — create a login invite without changing roster assignments.`}
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
            <Button
              type="submit"
              form="give-app-access-form"
              disabled={isPending || !member.organizationMemberId}
            >
              {isPending ? "Granting…" : "Give app access"}
            </Button>
          </div>
        )
      }
    >
      {inviteUrl ? (
        <div className="space-y-3">
          {message ? (
            <p className="text-sm font-medium text-cos-text">{message}</p>
          ) : null}
          {warning ? (
            <p className="text-sm text-amber-800" role="alert">
              {warning}
            </p>
          ) : null}
          <p className="text-sm text-cos-muted">
            Copyable invite link — they must sign in with the invited email.
          </p>
          <p className="break-all text-sm font-medium text-cos-text">{inviteUrl}</p>
          <Button type="button" variant="secondary" size="sm" onClick={copyInviteLink}>
            <Copy className="h-4 w-4" />
            Copy invite link
          </Button>
        </div>
      ) : (
        <form id="give-app-access-form" onSubmit={handleSubmit} className="space-y-4">
          {!member.organizationMemberId ? (
            <p className="text-sm text-amber-800" role="alert">
              This contact is not linked to a roster person yet. Add them to the
              roster first, then grant app access.
            </p>
          ) : null}
          <Input
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Select name="campaignRole" label="App access level" defaultValue="contributor">
            {GIVE_APP_ACCESS_ROLES.map((role) => (
              <option key={role} value={role}>
                {campaignRoleLabel(role)}
              </option>
            ))}
          </Select>
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
