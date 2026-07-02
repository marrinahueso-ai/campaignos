"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
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
  createOrganizationCommitteeAction,
  createOrganizationRoleAction,
  deleteOrganizationCommitteeAction,
  deleteOrganizationRoleAction,
  updateOrganizationCommitteeAction,
  updateOrganizationRoleAction,
} from "@/lib/organization-workspace/actions";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationRoleKind,
} from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

interface OrganizationRosterSectionProps {
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
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

function roleHasPerson(role: OrganizationRole): boolean {
  return Boolean(role.contactName?.trim());
}

function committeeHasPerson(committee: OrganizationCommittee): boolean {
  return parseCommitteeChairNames(committee.contactName).length > 0;
}

function RosterFillBadge({ filled }: { filled: boolean }) {
  return (
    <Badge variant={filled ? "success" : "warning"}>
      {filled ? "Filled" : "Open"}
    </Badge>
  );
}

const rosterCardHover =
  "transition-all duration-200 hover:border-cos-border hover:shadow-md";

const committeeCardHover =
  "transition-all duration-200 hover:border-cos-border hover:bg-cos-accent-soft/60 hover:shadow-sm hover:-translate-y-px";

function ContactLine({
  email,
  phone,
}: {
  email: string | null;
  phone: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cos-muted">
      <span className="inline-flex items-center gap-1">
        <Mail className="h-3.5 w-3.5 text-cos-dark-muted" />
        {email ? (
          <a href={`mailto:${email}`} className="text-cos-accent hover:underline">
            {email}
          </a>
        ) : (
          <span className="text-cos-dark-muted">No email</span>
        )}
      </span>
      <span className="inline-flex items-center gap-1">
        <Phone className="h-3.5 w-3.5 text-cos-dark-muted" />
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="text-cos-accent hover:underline"
          >
            {phone}
          </a>
        ) : (
          <span className="text-cos-dark-muted">No phone</span>
        )}
      </span>
    </div>
  );
}

function CommitteeItem({
  committee,
  disabled,
  onError,
}: {
  committee: OrganizationCommittee;
  disabled: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (!window.confirm(`Remove "${committee.name}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOrganizationCommitteeAction(committee.id);
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
      const result = await updateOrganizationCommitteeAction(committee.id, {
        name: formData.get("name")?.toString() ?? committee.name,
        contactName: formData.get("contactName")?.toString() || null,
        contactEmail: formData.get("contactEmail")?.toString() || null,
        contactPhone: formData.get("contactPhone")?.toString() || null,
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
        className="rounded-lg border border-cos-border bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            name="name"
            label="Committee / position"
            defaultValue={committee.name}
            required
          />
          <Input
            name="contactName"
            label="Chair names"
            defaultValue={committee.contactName ?? ""}
            placeholder="Sarah Chen, Jamie Smith"
          />
          <Input
            name="contactEmail"
            label="Email"
            type="email"
            defaultValue={committee.contactEmail ?? ""}
          />
          <Input
            name="contactPhone"
            label="Phone"
            type="tel"
            defaultValue={committee.contactPhone ?? ""}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="submit" size="sm" disabled={disabled || isPending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  const chairNames = parseCommitteeChairNames(committee.contactName);
  const filled = committeeHasPerson(committee);

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3",
        committeeCardHover,
        filled
          ? "border-emerald-200 bg-white"
          : "border-amber-200 border-dashed bg-amber-50/30",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-cos-text">{committee.name}</p>
        {chairNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chairNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm text-cos-text ring-1 ring-emerald-100"
              >
                <User className="h-3.5 w-3.5 text-emerald-600" />
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-amber-700/80">No chair assigned yet</p>
        )}
        <ContactLine email={committee.contactEmail} phone={committee.contactPhone} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <RosterFillBadge filled={filled} />
        <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isPending}
          onClick={() => setIsEditing(true)}
          aria-label={`Edit ${committee.name}`}
        >
          <Pencil className="h-4 w-4 text-cos-muted" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isPending}
          onClick={handleDelete}
          aria-label={`Remove ${committee.name}`}
        >
          <Trash2 className="h-4 w-4 text-cos-dark-muted" />
        </Button>
        </div>
      </div>
    </div>
  );
}

function RoleGroup({
  role,
  committees,
  disabled,
  onError,
  onAddCommittee,
}: {
  role: OrganizationRole;
  committees: OrganizationCommittee[];
  disabled: boolean;
  onError: (message: string | null) => void;
  onAddCommittee: (roleId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  function handleDelete() {
    if (
      !window.confirm(
        `Remove "${role.name}" and ${committees.length} committee(s)?`,
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
        contactName: formData.get("contactName")?.toString() || null,
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

  const filled = roleHasPerson(role);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
      className={cn(
        "group border bg-cos-card",
        rosterCardHover,
        filled
          ? "border-cos-border"
          : "border-dashed border-cos-border bg-cos-bg/30",
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 transition-colors duration-200 hover:bg-cos-accent-soft/40 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-cos-dark-muted transition-transform",
                isOpen && "rotate-180",
              )}
            />
            <h3 className="font-display text-2xl text-cos-text">{role.name}</h3>
            <Badge variant="info">{roleKindLabel(role.roleKind)}</Badge>
            {committees.length > 0 && (
              <span className="text-xs text-cos-muted">
                {committees.length} committee{committees.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {!isEditing && (
            <div className="mt-2 pl-6">
              {role.contactName ? (
                <p className="inline-flex items-center gap-1 text-sm font-medium text-cos-text">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  {role.contactName}
                </p>
              ) : (
                <p className="text-sm text-amber-700/80">No person assigned yet</p>
              )}
              <ContactLine email={role.contactEmail} phone={role.contactPhone} />
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-col items-end gap-2"
          onClick={(event) => event.preventDefault()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RosterFillBadge filled={filled} />
          <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => setIsEditing((current) => !current)}
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
      </summary>

      <div className="border-t border-cos-border px-5 pb-5 pt-4">
        {isEditing && (
          <form action={handleSave} className="mb-4 space-y-4 rounded-lg bg-cos-bg p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="name" label="Role title" defaultValue={role.name} required />
              <Select name="roleKind" label="Role type" defaultValue={role.roleKind ?? "other"}>
                <option value="president">President</option>
                <option value="vp">VP</option>
                <option value="other">Other</option>
              </Select>
              <Input
                name="contactName"
                label="Person name"
                defaultValue={role.contactName ?? ""}
                placeholder="Jamie Smith"
              />
              <Input
                name="description"
                label="What they handle"
                defaultValue={role.description ?? ""}
              />
              <Input
                name="contactEmail"
                label="Email"
                type="email"
                defaultValue={role.contactEmail ?? ""}
              />
              <Input
                name="contactPhone"
                label="Phone"
                type="tel"
                defaultValue={role.contactPhone ?? ""}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={disabled || isPending}>
                Save role
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {committees.length === 0 ? (
          <p className="text-sm text-cos-muted">No committees under this role yet.</p>
        ) : (
          <div className="space-y-2 border-l-2 border-cos-border pl-4">
            {committees.map((committee) => (
              <CommitteeItem
                key={committee.id}
                committee={committee}
                disabled={disabled || isPending}
                onError={onError}
              />
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled || isPending}
          onClick={() => onAddCommittee(role.id)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add committee
        </Button>
      </div>
    </details>
  );
}

export function OrganizationRosterSection({
  roles,
  committees,
  showIntro = true,
}: OrganizationRosterSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showCommitteeForm, setShowCommitteeForm] = useState(false);
  const [committeeParentRoleId, setCommitteeParentRoleId] = useState("");

  const committeesByRole = useMemo(() => {
    const grouped = new Map<string, OrganizationCommittee[]>();
    for (const role of roles) {
      grouped.set(role.id, []);
    }
    grouped.set("unassigned", []);
    for (const committee of committees) {
      const key = committee.parentRoleId ?? "unassigned";
      const bucket = grouped.get(key) ?? grouped.get("unassigned")!;
      bucket.push(committee);
    }
    return grouped;
  }, [roles, committees]);

  async function handleCreateRole(formData: FormData) {
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
      setShowRoleForm(false);
      router.refresh();
    });
  }

  async function handleCreateCommittee(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganizationCommitteeAction(
        { error: null, success: false },
        formData,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setShowCommitteeForm(false);
      setCommitteeParentRoleId("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board & committees</CardTitle>
        {showIntro && (
          <CardDescription>
            Leadership roles with committees nested underneath. Cards labeled{" "}
            <strong>Filled</strong> have a person assigned; <strong>Open</strong>{" "}
            slots still need someone.
          </CardDescription>
        )}
      </CardHeader>

      {roles.length === 0 ? (
        <p className="text-sm text-cos-muted">
          Upload a roster above or add your first leadership role.
        </p>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <RoleGroup
              key={role.id}
              role={role}
              committees={committeesByRole.get(role.id) ?? []}
              disabled={isPending}
              onError={setError}
              onAddCommittee={(roleId) => {
                setCommitteeParentRoleId(roleId);
                setShowCommitteeForm(true);
              }}
            />
          ))}
        </div>
      )}

      {(committeesByRole.get("unassigned") ?? []).length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="cos-section-title">Unassigned committees</h3>
          {(committeesByRole.get("unassigned") ?? []).map((committee) => (
            <CommitteeItem
              key={committee.id}
              committee={committee}
              disabled={isPending}
              onError={setError}
            />
          ))}
        </div>
      )}

      {showRoleForm ? (
        <form
          action={handleCreateRole}
          className="mt-6 space-y-4 border border-cos-border bg-cos-bg/50 p-5"
        >
          <p className="text-sm font-medium text-cos-text">Add leadership role</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label="Role title" placeholder="VP Events" required />
            <Select name="roleKind" label="Role type" defaultValue="vp">
              <option value="president">President</option>
              <option value="vp">VP</option>
              <option value="other">Other</option>
            </Select>
            <Input name="contactName" label="Person name" placeholder="Jamie Smith" />
            <Input name="description" label="What they handle" />
            <Input name="contactEmail" label="Email" type="email" />
            <Input name="contactPhone" label="Phone" type="tel" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              Add role
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRoleForm(false)}
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
          onClick={() => setShowRoleForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add leadership role
        </Button>
      )}

      {showCommitteeForm && (
        <form
          action={handleCreateCommittee}
          className="mt-4 space-y-4 rounded-xl border border-cos-border bg-cos-bg/50 p-5"
        >
          <p className="text-sm font-medium text-cos-text">Add committee</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label="Committee / position" required />
            <Select
              name="parentRoleId"
              label="Reports to"
              defaultValue={committeeParentRoleId}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <Input name="contactName" label="Chair name" placeholder="Sarah Chen" />
            <Input name="contactEmail" label="Email" type="email" />
            <Input name="contactPhone" label="Phone" type="tel" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              Add committee
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCommitteeForm(false);
                setCommitteeParentRoleId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
