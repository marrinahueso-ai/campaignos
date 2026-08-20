"use client";

import { TeamAccessBodyPortal } from "@/components/settings-v2/team-access/TeamAccessBodyPortal";
import {
  pilotBtnPrimary,
  pilotBtnSecondary,
  pilotSerif,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";

export type PilotConfirmKind =
  | "pause"
  | "restore"
  | "remove"
  | "cancel_invite"
  | "reset_login";

interface TeamAccessPilotConfirmDialogProps {
  open: boolean;
  kind: PilotConfirmKind;
  memberName: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const COPY: Record<
  PilotConfirmKind,
  {
    title: (name: string) => string;
    body: (name: string) => string;
    confirm: string;
    destructive: boolean;
  }
> = {
  pause: {
    title: (name) => `Pause ${name}'s access?`,
    body: (name) =>
      `${name} won't be able to sign in or work in this organization until access is restored.`,
    confirm: "Pause access",
    destructive: true,
  },
  restore: {
    title: (name) => `Restore ${name}'s access?`,
    body: (name) =>
      `${name} will be able to sign in again with their existing account.`,
    confirm: "Restore access",
    destructive: false,
  },
  remove: {
    title: (name) => `Remove ${name} from the organization?`,
    body: (name) =>
      `This removes ${name} from this organization. It can't be undone. Their events and board roster entry (if any) are not deleted.`,
    confirm: "Remove from organization",
    destructive: true,
  },
  cancel_invite: {
    title: (name) => `Cancel invite for ${name}?`,
    body: () =>
      "Their invitation link will stop working. You can invite them again later.",
    confirm: "Cancel invitation",
    destructive: true,
  },
  reset_login: {
    title: (name) => `Reset ${name}'s login?`,
    body: (name) =>
      `${name}'s current password will stop working. A new temporary password will be generated and they'll need to create a new password on next sign-in.`,
    confirm: "Reset login",
    destructive: true,
  },
};

export function TeamAccessPilotConfirmDialog({
  open,
  kind,
  memberName,
  pending = false,
  onConfirm,
  onClose,
}: TeamAccessPilotConfirmDialogProps) {
  if (!open) return null;

  const copy = COPY[kind];

  return (
    <TeamAccessBodyPortal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(32,27,23,0.4)] backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-[2.5rem] border border-[#e5e1d8] bg-white p-10 text-center shadow-2xl"
      >
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
            copy.destructive
              ? "bg-[#f9f2f0] text-[#c07a67]"
              : "bg-[#eef2f0] text-[#586c63]"
          }`}
        >
          {kind === "restore" ? "↻" : kind === "pause" ? "❚❚" : "✕"}
        </div>
        <h2
          className="mb-2 text-2xl font-bold tracking-tight text-[#201b17]"
          style={{ fontFamily: pilotSerif }}
        >
          {copy.title(memberName)}
        </h2>
        <p className="mb-8 text-sm font-medium leading-relaxed text-[#737373]">
          {copy.body(memberName)}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={
              copy.destructive
                ? "w-full rounded-3xl bg-[#c07a67] py-4 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                : pilotBtnPrimary
            }
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : copy.confirm}
          </button>
          <button
            type="button"
            className={pilotBtnSecondary}
            disabled={pending}
            onClick={onClose}
          >
            Keep as is
          </button>
        </div>
      </div>
    </div>
    </TeamAccessBodyPortal>
  );
}
