"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { OrganizationRosterImportPanel } from "@/components/organization-workspace/OrganizationRosterImportPanel";
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
  deleteOrganizationCommitteeAction,
  updateOrganizationCommitteeAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

interface OrganizationCommitteesSectionProps {
  committees: OrganizationCommittee[];
  roles: OrganizationRole[];
  showIntro?: boolean;
}

function CommitteeRow({
  committee,
  roles,
  disabled,
  onError,
}: {
  committee: OrganizationCommittee;
  roles: OrganizationRole[];
  disabled: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (!window.confirm(`Remove committee "${committee.name}"?`)) {
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
        parentRoleId: formData.get("parentRoleId")?.toString() || null,
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
          <Input name="name" label="Committee" defaultValue={committee.name} required />
          <Select
            name="parentRoleId"
            label="Reports to"
            defaultValue={committee.parentRoleId ?? ""}
          >
            <option value="">Unassigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
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

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-cos-border bg-cos-bg/60 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-cos-text">{committee.name}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cos-muted">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-cos-dark-muted" />
            {committee.contactEmail ? (
              <a
                href={`mailto:${committee.contactEmail}`}
                className="text-cos-accent hover:underline"
              >
                {committee.contactEmail}
              </a>
            ) : (
              <span className="text-cos-dark-muted">No email</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-cos-dark-muted" />
            {committee.contactPhone ? (
              <a
                href={`tel:${committee.contactPhone.replace(/\s/g, "")}`}
                className="text-cos-accent hover:underline"
              >
                {committee.contactPhone}
              </a>
            ) : (
              <span className="text-cos-dark-muted">No phone</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
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
  );
}

export function OrganizationCommitteesSection({
  committees,
  roles,
  showIntro = true,
}: OrganizationCommitteesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [addUnderRoleId, setAddUnderRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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
  }, [committees, roles]);

  async function handleCreate(formData: FormData) {
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
      setShowForm(false);
      setAddUnderRoleId("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Committees</CardTitle>
        {showIntro && (
          <CardDescription>
            Committees grouped under each VP or leadership role. Import your
            full roster at once, or add committees one at a time.
          </CardDescription>
        )}
      </CardHeader>

      <OrganizationRosterImportPanel />

      <div className="mt-8 space-y-6">
        {roles.map((role) => {
          const roleCommittees = committeesByRole.get(role.id) ?? [];

          return (
            <section key={role.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cos-border pb-2">
                <div>
                  <h3 className="font-semibold text-cos-text">{role.name}</h3>
                  {role.contactEmail && (
                    <p className="text-sm text-cos-muted">{role.contactEmail}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAddUnderRoleId(role.id);
                    setShowForm(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add committee
                </Button>
              </div>

              {roleCommittees.length === 0 ? (
                <p className="text-sm text-cos-muted">
                  No committees under this role yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {roleCommittees.map((committee) => (
                    <CommitteeRow
                      key={committee.id}
                      committee={committee}
                      roles={roles}
                      disabled={isPending}
                      onError={setError}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {(committeesByRole.get("unassigned") ?? []).length > 0 && (
          <section className="space-y-3">
            <h3 className="border-b border-cos-border pb-2 font-semibold text-cos-text">
              Unassigned committees
            </h3>
            <div className="space-y-2">
              {(committeesByRole.get("unassigned") ?? []).map((committee) => (
                <CommitteeRow
                  key={committee.id}
                  committee={committee}
                  roles={roles}
                  disabled={isPending}
                  onError={setError}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {showForm && (
        <form
          action={handleCreate}
          className="mt-6 space-y-4 rounded-xl border border-cos-border bg-cos-bg/50 p-5"
        >
          <p className="text-sm font-medium text-cos-text">Add committee</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label="Committee name" required />
            <Select
              name="parentRoleId"
              label="Reports to"
              defaultValue={addUnderRoleId}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
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
                setShowForm(false);
                setAddUnderRoleId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!showForm && committees.length === 0 && roles.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add committee manually
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
