"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import type { AccessTemplate } from "@/lib/access-templates/types";
import type { OrganizationCommittee, OrganizationRole } from "@/types/organization-workspace";

interface EventOption {
  id: string;
  title: string;
}

interface TeamAccessInviteModalProps {
  open: boolean;
  onClose: () => void;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  events?: EventOption[];
  canProvisionAccounts: boolean;
  accessLabels?: Partial<Record<string, string>> | null;
  accessTemplates?: AccessTemplate[];
  prefill?: {
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
    eventIds?: string[];
    /** Access template id or base CampaignRole. */
    campaignRole?: string;
  } | null;
}

export function TeamAccessInviteModal({
  open,
  onClose,
  events = [],
  accessLabels = null,
  accessTemplates = [],
  prefill,
}: TeamAccessInviteModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(
    prefill?.eventIds ?? [],
  );

  const eventIdsCsv = useMemo(
    () => selectedEventIds.join(","),
    [selectedEventIds],
  );

  async function handleSubmit(formData: FormData) {
    formData.set("sendEmail", sendEmail ? "true" : "false");
    formData.set("eventIdsCsv", eventIdsCsv);
    startTransition(async () => {
      const result = await inviteTeamMemberAction(
        { error: null, success: false },
        formData,
      );
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
    setWarning(null);
    setMessage(null);
    setInviteUrl(null);
    setSelectedEventIds(prefill?.eventIds ?? []);
    onClose();
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title="Invite team member"
      subtitle="Send an invite email and always keep a copyable link."
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
              {isPending ? "Sending…" : "Send invite"}
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
            label="Full name"
            placeholder="Jamie Smith"
            defaultValue={prefill?.name ?? ""}
          />
          <div className="space-y-1.5">
            <Select
              name="campaignRole"
              label="Role"
              defaultValue={prefill?.campaignRole ?? "contributor"}
            >
              {(accessTemplates.length > 0
                ? accessTemplates.map((template) => ({
                    id: template.id,
                    label: template.displayName,
                  }))
                : CAMPAIGN_ROLES.map((role) => ({
                    id: role,
                    label:
                      accessLabels?.[role] ??
                      campaignRoleLabel(role as CampaignRole),
                  }))
              ).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-cos-muted">
              From Access templates — this assigns their login permissions.
            </p>
          </div>
          {/* Keep optional board-title id for legacy invite linking; hidden from UI. */}
          <input
            type="hidden"
            name="organizationRoleId"
            value={prefill?.organizationRoleId ?? ""}
          />
          <input
            type="hidden"
            name="committeeId"
            value={prefill?.committeeId ?? ""}
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Event assignments (optional)
            </legend>
            <p className="text-xs text-cos-muted">
              Assign one or more campaigns/events. Editable later from the member record.
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto border border-cos-border p-3">
              {events.length === 0 ? (
                <p className="text-sm text-cos-muted">No events available yet.</p>
              ) : (
                events.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-2 text-sm text-cos-text"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="rounded border-cos-border"
                    />
                    {event.title}
                  </label>
                ))
              )}
            </div>
            <input type="hidden" name="eventIdsCsv" value={eventIdsCsv} />
          </fieldset>

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
