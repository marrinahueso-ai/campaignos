"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
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
  claimOrganizationAccessAction,
  createTeamMemberAccountAction,
  removeTeamMemberAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationRole } from "@/types/organization-workspace";

interface TeamSettingsPanelProps {
  members: OrganizationUser[];
  roles: OrganizationRole[];
  canManage: boolean;
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
}

function statusBadge(status: OrganizationUser["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "invited":
      return <Badge variant="info">Invited</Badge>;
    case "deactivated":
      return <Badge variant="default">Deactivated</Badge>;
  }
}

export function TeamSettingsPanel({
  members,
  roles,
  canManage,
  showClaimBanner,
  currentUserEmail,
  siteOrigin,
  canProvisionAccounts,
}: TeamSettingsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [provisionedEmail, setProvisionedEmail] = useState<string | null>(null);
  const [provisionedPassword, setProvisionedPassword] = useState<string | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function handleCreateAccount(formData: FormData) {
    startTransition(async () => {
      const result = await createTeamMemberAccountAction(
        { error: null, success: false },
        formData,
      );
      if (result.error) {
        setError(result.error);
        setMessage(null);
        setProvisionedEmail(null);
        setProvisionedPassword(null);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Account created.");
      setProvisionedEmail(result.provisionedEmail ?? null);
      setProvisionedPassword(result.provisionedPassword ?? null);
      setShowCreateForm(false);
      router.refresh();
    });
  }

  async function copySignInDetails() {
    if (!provisionedEmail || !provisionedPassword) {
      return;
    }

    const text = [
      `CampaignOS sign-in: ${siteOrigin}/login`,
      `Email: ${provisionedEmail}`,
      `Password: ${provisionedPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Sign-in details copied.");
      setError(null);
    } catch {
      setError("Could not copy. Select and copy the details manually.");
    }
  }

  function handleClaim() {
    startTransition(async () => {
      const result = await claimOrganizationAccessAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Access granted.");
      router.refresh();
    });
  }

  function handleDeactivate(member: OrganizationUser) {
    startTransition(async () => {
      const result = await updateTeamMemberAction(member.id, {
        status: member.status === "deactivated" ? "active" : "deactivated",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemove(memberId: string) {
    if (!window.confirm("Remove this team member?")) {
      return;
    }

    startTransition(async () => {
      const result = await removeTeamMemberAction(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {showClaimBanner && (
        <div className="border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="font-display text-xl text-amber-950">Link your account</h3>
          <p className="mt-1 text-sm text-amber-900">
            This PTO workspace exists but has no signed-in users yet. Claim admin
            access as <span className="font-medium">{currentUserEmail}</span> to
            manage the team.
          </p>
          <Button
            type="button"
            className="mt-3"
            disabled={isPending}
            onClick={handleClaim}
          >
            Claim admin access
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Create a tester account with email and password, then share the sign-in
            details directly. No magic link or paid email required.
          </CardDescription>
        </CardHeader>

        {members.length === 0 ? (
          <p className="text-sm text-cos-muted">No team members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-cos-border text-cos-muted">
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Org role</th>
                  <th className="pb-3 pr-4 font-medium">Access</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  {canManage && <th className="pb-3 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-cos-border">
                    <td className="py-3 pr-4 font-medium text-cos-text">
                      {member.email}
                    </td>
                    <td className="py-3 pr-4 text-cos-muted">
                      {member.organizationRoleName ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-cos-muted">
                      {campaignRoleLabel(member.campaignRole)}
                    </td>
                    <td className="py-3 pr-4">{statusBadge(member.status)}</td>
                    {canManage && (
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {member.status !== "invited" && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleDeactivate(member)}
                            >
                              {member.status === "deactivated"
                                ? "Reactivate"
                                : "Deactivate"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRemove(member.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canManage && (
          <>
            {!canProvisionAccounts && (
              <p className="mt-4 text-sm text-amber-900">
                Add <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
                <code className="text-xs">.env.local</code> to create tester accounts
                from here.
              </p>
            )}

            {showCreateForm ? (
              <form
                action={handleCreateAccount}
                className="mt-6 space-y-4 rounded-xl border border-cos-border bg-cos-bg/50 p-5"
              >
                <Input
                  name="email"
                  label="Email"
                  type="email"
                  placeholder="communications@ptoees.org"
                  required
                />
                <Input
                  name="password"
                  label="Temporary password"
                  type="text"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
                <Select name="organizationRoleId" label="Organization role" defaultValue="">
                  <option value="">Select role (optional)</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
                <Select name="campaignRole" label="Access level" defaultValue="admin">
                  {CAMPAIGN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {campaignRoleLabel(role as CampaignRole)}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending || !canProvisionAccounts}>
                    Create account
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
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
                onClick={() => setShowCreateForm(true)}
                disabled={!canProvisionAccounts}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add tester account
              </Button>
            )}
          </>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {provisionedEmail && provisionedPassword && (
        <div className="rounded-xl border border-cos-border bg-cos-bg/50 p-4">
          <p className="text-sm font-medium text-cos-text">Share these sign-in details</p>
          <p className="mt-1 text-xs text-cos-muted">
            Send by text or in person. They sign in at {siteOrigin}/login with email &
            password.
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-cos-muted">Login URL</dt>
              <dd className="font-medium text-cos-text">{siteOrigin}/login</dd>
            </div>
            <div>
              <dt className="text-cos-muted">Email</dt>
              <dd className="font-medium text-cos-text">{provisionedEmail}</dd>
            </div>
            <div>
              <dt className="text-cos-muted">Password</dt>
              <dd className="font-medium text-cos-text">{provisionedPassword}</dd>
            </div>
          </dl>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={copySignInDetails}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy sign-in details
          </Button>
        </div>
      )}
    </div>
  );
}
