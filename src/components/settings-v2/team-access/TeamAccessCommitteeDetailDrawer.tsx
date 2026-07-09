"use client";

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TeamAccessDrawer } from "@/components/settings-v2/team-access/TeamAccessDrawer";
import { formatCount } from "@/components/settings-v2/team-access/team-access-utils";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationCommittee } from "@/types/organization-workspace";

interface TeamAccessCommitteeDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  committee: OrganizationCommittee | null;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
}

export function TeamAccessCommitteeDetailDrawer({
  open,
  onClose,
  committee,
  workload,
  canManage,
}: TeamAccessCommitteeDetailDrawerProps) {
  if (!committee) {
    return null;
  }

  const chairs = parseCommitteeChairNames(committee.contactName);
  const hasOpenRole = chairs.length === 0;
  const stats = workload.byCommitteeId[committee.id];

  return (
    <TeamAccessDrawer open={open} onClose={onClose}>
      <div className="flex h-full flex-col px-6 py-6">
        <div className="pr-8">
          <div className="flex flex-wrap items-center gap-2">
            {hasOpenRole ? (
              <Badge variant="warning">Open role</Badge>
            ) : (
              <Badge variant="success">On track</Badge>
            )}
          </div>
          <h2 className="font-display mt-2 text-2xl text-cos-text">{committee.name}</h2>
          {committee.parentRoleName ? (
            <p className="mt-1 text-sm text-cos-muted">
              VP: {committee.parentRoleName}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Leadership
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cos-muted">Chair</dt>
                <dd className="text-cos-text">{chairs[0] ?? "Open"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cos-muted">Co-chair</dt>
                <dd className="text-cos-text">{chairs[1] ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-cos-border p-3 text-center">
              <p className="text-xs text-cos-muted">Open tasks</p>
              <p className="mt-1 font-medium text-cos-text">
                {formatCount(stats?.openTasks ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-cos-border p-3 text-center">
              <p className="text-xs text-cos-muted">Campaigns</p>
              <p className="mt-1 font-medium text-cos-text">
                {formatCount(stats?.campaigns ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-cos-border p-3 text-center">
              <p className="text-xs text-cos-muted">Approvals</p>
              <p className="mt-1 font-medium text-cos-text">
                {formatCount(stats?.approvalsWaiting ?? 0)}
              </p>
            </div>
          </div>

          {committee.playbookSlug ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Playbook
              </p>
              <Link
                href={`/settings/playbooks-milestones`}
                className="mt-2 inline-flex items-center gap-1 text-sm text-cos-text hover:text-cos-primary"
              >
                {committee.playbookSlug}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-cos-border pt-4">
          <Button href="/tasks" variant="secondary" size="sm" onClick={onClose}>
            View tasks
          </Button>
          <Button href="/events" variant="secondary" size="sm" onClick={onClose}>
            View campaigns
          </Button>
          {canManage ? (
            <>
              <Button variant="secondary" size="sm" type="button" disabled>
                Add member
              </Button>
              <Button variant="ghost" size="sm" type="button" disabled>
                <Mail className="h-4 w-4" />
                Send message
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </TeamAccessDrawer>
  );
}
