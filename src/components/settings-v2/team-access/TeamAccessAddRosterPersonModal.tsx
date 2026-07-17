"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { createRosterPersonAction } from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

interface EventOption {
  id: string;
  title: string;
}

interface TeamAccessAddRosterPersonModalProps {
  open: boolean;
  onClose: () => void;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  events?: EventOption[];
}

export function TeamAccessAddRosterPersonModal({
  open,
  onClose,
  roles,
  committees,
  events = [],
}: TeamAccessAddRosterPersonModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  function handleClose() {
    setError(null);
    setSelectedEventIds([]);
    onClose();
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString()?.trim() ?? "";
    const email = formData.get("email")?.toString()?.trim() || null;
    const phone = formData.get("phone")?.toString()?.trim() || null;
    const organizationRoleId =
      formData.get("organizationRoleId")?.toString() || null;
    const committeeId = formData.get("committeeId")?.toString() || null;
    const committeeRoleRaw = formData.get("committeeRole")?.toString() || "";
    const committeeRole =
      committeeRoleRaw === "chair" ||
      committeeRoleRaw === "co_chair" ||
      committeeRoleRaw === "member" ||
      committeeRoleRaw === "supervising_vp"
        ? committeeRoleRaw
        : null;

    startTransition(async () => {
      const result = await createRosterPersonAction({
        name,
        email,
        phone,
        organizationRoleId,
        committeeId: committeeId || null,
        committeeRole: committeeId ? committeeRole : null,
        eventIds: selectedEventIds,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
      handleClose();
    });
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title="Add roster person"
      subtitle="Add someone to the board roster without granting app access."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-roster-person-form" disabled={isPending}>
            {isPending ? "Saving…" : "Add to roster"}
          </Button>
        </div>
      }
    >
      <form id="add-roster-person-form" onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Full name" placeholder="Jamie Smith" required />
        <Input
          name="email"
          label="Email (optional)"
          type="email"
          placeholder="name@schoolpto.org"
        />
        <Input name="phone" label="Phone (optional)" type="tel" placeholder="(555) 555-5555" />
        <Select name="organizationRoleId" label="Board role (optional)" defaultValue="">
          <option value="">None</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Select name="committeeId" label="Team (optional)" defaultValue="">
          <option value="">None</option>
          {committees.map((committee) => (
            <option key={committee.id} value={committee.id}>
              {committee.name}
            </option>
          ))}
        </Select>
        <Select name="committeeRole" label="Event responsibility (optional)" defaultValue="member">
          <option value="chair">Event Lead</option>
          <option value="co_chair">Assistant Lead</option>
          <option value="member">Team Member</option>
          <option value="supervising_vp">Supervisor</option>
        </Select>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Event assignments (optional)
          </legend>
          <div className="max-h-40 space-y-2 overflow-y-auto border border-cos-border p-3">
            {events.length === 0 ? (
              <p className="text-sm text-cos-muted">No events available yet.</p>
            ) : (
              events.map((eventItem) => (
                <label
                  key={eventItem.id}
                  className="flex items-center gap-2 text-sm text-cos-text"
                >
                  <input
                    type="checkbox"
                    checked={selectedEventIds.includes(eventItem.id)}
                    onChange={() => toggleEvent(eventItem.id)}
                    className="rounded border-cos-border"
                  />
                  {eventItem.title}
                </label>
              ))
            )}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </TeamAccessModal>
  );
}
