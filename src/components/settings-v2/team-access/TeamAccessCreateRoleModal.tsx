"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { BUILT_IN_ROLES } from "@/components/settings-v2/team-access/permissions-matrix";

interface TeamAccessCreateRoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function TeamAccessCreateRoleModal({
  open,
  onClose,
}: TeamAccessCreateRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("volunteer");

  function handleCreate() {
    onClose();
    setName("");
    setDescription("");
    setTemplate("volunteer");
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Create role"
      subtitle="Define a custom role with a permission template."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!name.trim()}>
            Create role
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Role name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Fundraising Lead"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this role is responsible for..."
          rows={3}
        />
        <Select
          label="Base template"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
        >
          {BUILT_IN_ROLES.map((role) => (
            <option key={role.id} value={role.template}>
              {role.name}
            </option>
          ))}
        </Select>
        <p className="text-sm text-cos-muted">
          Custom role creation is a shell for now. Permissions inherit from the
          selected template.
        </p>
      </div>
    </TeamAccessModal>
  );
}
