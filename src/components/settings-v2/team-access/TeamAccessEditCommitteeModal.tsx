"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import {
  createOrganizationCommitteeAction,
  updateOrganizationCommitteeAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

interface EventOption {
  id: string;
  title: string;
}

interface TeamAccessEditCommitteeModalProps {
  open: boolean;
  onClose: () => void;
  committee: OrganizationCommittee | null;
  roles: OrganizationRole[];
  events?: EventOption[];
  defaultParentRoleId?: string;
}

export function TeamAccessEditCommitteeModal({
  open,
  onClose,
  committee,
  roles,
  events = [],
  defaultParentRoleId = "",
}: TeamAccessEditCommitteeModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isCreate = !committee;
  const chairs = committee ? parseCommitteeChairNames(committee.contactName) : [];
  const vpRoles = roles.filter(
    (role) => !role.archivedAt && (role.roleKind === "vp" || role.roleKind === "president"),
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const chairName = formData.get("chairName")?.toString()?.trim() ?? "";
    const coChairName = formData.get("coChairName")?.toString()?.trim() ?? "";
    const contactName = [chairName, coChairName].filter(Boolean).join(", ") || null;
    const assignedEventId =
      formData.get("assignedEventId")?.toString()?.trim() || null;

    startTransition(async () => {
      if (isCreate) {
        formData.set("contactName", contactName ?? "");
        const result = await createOrganizationCommitteeAction(
          { error: null, success: false },
          formData,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await updateOrganizationCommitteeAction(committee.id, {
          name: formData.get("name")?.toString() ?? committee.name,
          parentRoleId: (formData.get("parentRoleId") as string) || null,
          contactName,
          contactEmail: formData.get("contactEmail")?.toString() || null,
          contactPhone: formData.get("contactPhone")?.toString() || null,
          assignedEventId,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      setError(null);
      router.refresh();
      onClose();
    });
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title={isCreate ? "Create committee" : "Edit committee"}
      subtitle={committee?.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="committee-form" disabled={isPending}>
            {isCreate ? "Create committee" : "Save changes"}
          </Button>
        </div>
      }
    >
      <form id="committee-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          label="Committee name"
          defaultValue={committee?.name ?? ""}
          required
        />
        <Select
          name="parentRoleId"
          label="Supervising VP"
          defaultValue={committee?.parentRoleId ?? defaultParentRoleId}
        >
          <option value="">Unassigned</option>
          {(vpRoles.length > 0 ? vpRoles : roles).map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Input
          name="chairName"
          label="Chair"
          defaultValue={chairs[0] ?? ""}
          placeholder="Sarah Chen"
        />
        <Input
          name="coChairName"
          label="Co-chair"
          defaultValue={chairs[1] ?? ""}
          placeholder="Jamie Smith"
        />
        <Select
          name="assignedEventId"
          label="Assigned event (optional)"
          defaultValue={committee?.assignedEventId ?? ""}
        >
          <option value="">None</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </Select>
        <Input
          name="contactEmail"
          label="Email"
          type="email"
          defaultValue={committee?.contactEmail ?? ""}
        />
        <Input
          name="contactPhone"
          label="Phone"
          type="tel"
          defaultValue={committee?.contactPhone ?? ""}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </TeamAccessModal>
  );
}
