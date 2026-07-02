"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  createOrganizationMemberAction,
  deleteOrganizationMemberAction,
  updateOrganizationMemberAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationMember,
  OrganizationRole,
} from "@/types/organization-workspace";

interface OrganizationMembersSectionProps {
  members: OrganizationMember[];
  roles: OrganizationRole[];
  showIntro?: boolean;
}

export function OrganizationMembersSection({
  members,
  roles,
  showIntro = true,
}: OrganizationMembersSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggleActive(member: OrganizationMember) {
    startTransition(async () => {
      const result = await updateOrganizationMemberAction(member.id, {
        active: !member.active,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function handleDelete(memberId: string) {
    startTransition(async () => {
      const result = await deleteOrganizationMemberAction(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganizationMemberAction(
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
        <CardTitle>Members</CardTitle>
        {showIntro && (
          <CardDescription>
            Optional named people linked to a role. Role contact cards above
            hold the shared email and phone for each position — update those
            when board members change each year.
          </CardDescription>
        )}
      </CardHeader>

      {members.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No members added yet. Add names and emails manually.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-cos-border text-cos-muted">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Active</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-cos-border">
                  <td className="py-3 pr-4 font-medium text-cos-text">
                    {member.name}
                  </td>
                  <td className="py-3 pr-4 text-cos-muted">{member.email}</td>
                  <td className="py-3 pr-4 text-cos-muted">
                    {member.roleName ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleActive(member)}
                      className="inline-flex"
                    >
                      <Badge variant={member.active ? "success" : "default"}>
                        {member.active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(member.id)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-cos-dark-muted" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <form action={handleCreate} className="mt-4 space-y-4 rounded-lg border border-cos-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label="Name" placeholder="Sarah Chen" required />
            <Input
              name="email"
              label="Email"
              type="email"
              placeholder="sarah@example.com"
              required
            />
          </div>
          <Select name="organizationRoleId" label="Role" defaultValue="">
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              Add member
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
          className="mt-4"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add member
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
