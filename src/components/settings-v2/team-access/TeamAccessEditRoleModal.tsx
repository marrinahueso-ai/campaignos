"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import {
  createOrganizationRoleAction,
  updateOrganizationRoleAction,
} from "@/lib/organization-workspace/actions";
import type { OrganizationRole } from "@/types/organization-workspace";

interface TeamAccessEditRoleModalProps {
  open: boolean;
  onClose: () => void;
  role: OrganizationRole | null;
}

export function TeamAccessEditRoleModal({
  open,
  onClose,
  role,
}: TeamAccessEditRoleModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isCreate = !role;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      if (isCreate) {
        const result = await createOrganizationRoleAction(
          { error: null, success: false },
          formData,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const roleKind = formData.get("roleKind")?.toString() ?? "other";
        const result = await updateOrganizationRoleAction(role.id, {
          name: formData.get("name")?.toString() ?? role.name,
          description: formData.get("description")?.toString() || null,
          contactName: formData.get("contactName")?.toString() || null,
          contactEmail: formData.get("contactEmail")?.toString() || null,
          contactPhone: formData.get("contactPhone")?.toString() || null,
          roleKind:
            roleKind === "president" || roleKind === "vp" || roleKind === "other"
              ? roleKind
              : "other",
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
      title={isCreate ? "Add leadership role" : "Edit role"}
      subtitle={role?.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="role-form" disabled={isPending}>
            {isCreate ? "Add role" : "Save changes"}
          </Button>
        </div>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          label="Role title"
          defaultValue={role?.name ?? ""}
          placeholder="VP Events"
          required
        />
        <Select name="roleKind" label="Role type" defaultValue={role?.roleKind ?? "vp"}>
          <option value="president">President</option>
          <option value="vp">VP</option>
          <option value="other">Other</option>
        </Select>
        <Input
          name="contactName"
          label="Person name"
          defaultValue={role?.contactName ?? ""}
          placeholder="Jamie Smith"
        />
        <Input
          name="description"
          label="What they handle"
          defaultValue={role?.description ?? ""}
        />
        <Input
          name="contactEmail"
          label="Email"
          type="email"
          defaultValue={role?.contactEmail ?? ""}
        />
        <Input
          name="contactPhone"
          label="Phone"
          type="tel"
          defaultValue={role?.contactPhone ?? ""}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </TeamAccessModal>
  );
}
