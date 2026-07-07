"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createOrganizationRoleAction,
  deleteOrganizationRoleAction,
  updateOrganizationRoleAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationRole,
  OrganizationRoleKind,
} from "@/types/organization-workspace";

interface OrganizationRolesSectionProps {
  roles: OrganizationRole[];
  showIntro?: boolean;
}

function roleKindLabel(kind: OrganizationRoleKind | null): string {
  switch (kind) {
    case "president":
      return "President";
    case "vp":
      return "VP";
    default:
      return "Role";
  }
}

function RoleContactCard({
  role,
  disabled,
  onError,
}: {
  role: OrganizationRole;
  disabled: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (
      !window.confirm(
        `Remove "${role.name}"? Committee and channel assignments using this role will be cleared.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOrganizationRoleAction(role.id);
      if (result.error) {
        onError(result.error);
        return;
      }
      onError(null);
      router.refresh();
    });
  }

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const roleKind = formData.get("roleKind")?.toString() ?? "other";
      const result = await updateOrganizationRoleAction(role.id, {
        name: formData.get("name")?.toString() ?? role.name,
        description: formData.get("description")?.toString() || null,
        contactEmail: formData.get("contactEmail")?.toString() || null,
        contactPhone: formData.get("contactPhone")?.toString() || null,
        roleKind:
          roleKind === "president" || roleKind === "vp" || roleKind === "other"
            ? roleKind
            : "other",
      });

      if (result.error) {
        onError(result.error);
        return;
      }

      onError(null);
      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <form
        action={handleSave}
        className="rounded-xl border border-cos-border bg-white p-5 shadow-sm"
      >
        <div className="space-y-4">
          <Input
            name="name"
            label="Role name"
            defaultValue={role.name}
            required
          />
          <Select name="roleKind" label="Role type" defaultValue={role.roleKind ?? "other"}>
            <option value="president">President</option>
            <option value="vp">VP</option>
            <option value="other">Other</option>
          </Select>
          <Input
            name="description"
            label="What they handle"
            defaultValue={role.description ?? ""}
            placeholder="Board approvals, final sign-off"
          />
          <Input
            name="contactEmail"
            label="Contact email"
            type="email"
            defaultValue={role.contactEmail ?? ""}
            placeholder="president@ptoees.org"
          />
          <Input
            name="contactPhone"
            label="Contact phone"
            type="tel"
            defaultValue={role.contactPhone ?? ""}
            placeholder="(555) 555-0100"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={disabled || isPending}>
              Save contact card
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <article className="rounded-xl border border-cos-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-cos-text">{role.name}</h3>
            <Badge variant="info">{roleKindLabel(role.roleKind)}</Badge>
          </div>
          {role.description && (
            <p className="text-sm text-cos-muted">{role.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => setIsEditing(true)}
            aria-label={`Edit ${role.name}`}
          >
            <Pencil className="h-4 w-4 text-cos-muted" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isPending}
            onClick={handleDelete}
            aria-label={`Remove ${role.name}`}
          >
            <Trash2 className="h-4 w-4 text-cos-dark-muted" />
          </Button>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-cos-muted">
          <Mail className="h-4 w-4 shrink-0 text-cos-dark-muted" />
          {role.contactEmail ? (
            <a
              href={`mailto:${role.contactEmail}`}
              className="truncate text-cos-accent hover:underline"
            >
              {role.contactEmail}
            </a>
          ) : (
            <span className="text-cos-dark-muted">No email yet</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-cos-muted">
          <Phone className="h-4 w-4 shrink-0 text-cos-dark-muted" />
          {role.contactPhone ? (
            <a
              href={`tel:${role.contactPhone.replace(/\s/g, "")}`}
              className="text-cos-accent hover:underline"
            >
              {role.contactPhone}
            </a>
          ) : (
            <span className="text-cos-dark-muted">No phone yet</span>
          )}
        </div>
      </dl>
    </article>
  );
}

export function OrganizationRolesSection({
  roles,
  showIntro = true,
}: OrganizationRolesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganizationRoleAction(
        { error: null, success: false },
        formData,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leadership roles</CardTitle>
        {showIntro && (
          <CardDescription>
            Your board and VP contact cards — update names, emails, and phone
            numbers each school year. Hey Ralli uses these for channel ownership
            and committee defaults.
          </CardDescription>
        )}
      </CardHeader>

      {roles.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No roles yet. Add your President and VP roles to get started.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <RoleContactCard
              key={role.id}
              role={role}
              disabled={isPending}
              onError={setError}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <form
          action={handleCreate}
          className="mt-6 space-y-4 rounded-xl border border-cos-border bg-cos-bg/50 p-5"
        >
          <p className="text-sm font-medium text-cos-text">Add a role</p>
          <Input
            name="name"
            label="Role name"
            placeholder="VP Events"
            required
          />
          <Select name="roleKind" label="Role type" defaultValue="vp">
            <option value="president">President</option>
            <option value="vp">VP</option>
            <option value="other">Other</option>
          </Select>
          <Input
            name="description"
            label="What they handle (optional)"
            placeholder="Book fair, spirit nights, family events"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="contactEmail"
              label="Contact email"
              type="email"
              placeholder="events@ptoees.org"
            />
            <Input
              name="contactPhone"
              label="Contact phone"
              type="tel"
              placeholder="(555) 555-0100"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              Add role
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add role
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
