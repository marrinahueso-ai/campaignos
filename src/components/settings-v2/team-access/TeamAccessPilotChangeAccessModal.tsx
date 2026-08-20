"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamAccessPilotDialog } from "@/components/settings-v2/team-access/TeamAccessPilotDialog";
import {
  pilotBtnPrimary,
  pilotBtnSecondary,
  pilotSerif,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  type AccessTemplate,
} from "@/lib/access-templates/types";
import {
  deriveEventAccessMode,
  eventAccessModeLabel,
  isAssignedOnlyAccess,
} from "@/components/settings-v2/team-access/team-access-event-mode";

interface TeamAccessPilotChangeAccessModalProps {
  open: boolean;
  onClose: () => void;
  templates: AccessTemplate[];
  currentTemplateId: string;
  pending?: boolean;
  onSave: (templateId: string) => Promise<string | null>;
}

export function TeamAccessPilotChangeAccessModal({
  open,
  onClose,
  templates,
  currentTemplateId,
  pending = false,
  onSave,
}: TeamAccessPilotChangeAccessModalProps) {
  const [selectedId, setSelectedId] = useState(currentTemplateId);
  const [showPerms, setShowPerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId(currentTemplateId);
      setShowPerms(false);
      setError(null);
    }
  }, [open, currentTemplateId]);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const visibleTemplates = templates.filter(
    (template) =>
      (template.id !== "developer" && template.id !== "tester") ||
      template.id === selectedId ||
      template.id === currentTemplateId,
  );

  if (!open) return null;

  async function handleSave() {
    setError(null);
    const err = await onSave(selectedId);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  return (
    <TeamAccessPilotDialog
      onClose={onClose}
      labelledBy="change-access-modal-title"
      className="max-w-xl"
    >
        <div className="flex items-start justify-between gap-4 p-8 pb-4 sm:p-10">
          <div>
            <h2
              id="change-access-modal-title"
              className="mb-2 text-3xl font-bold tracking-tight text-[#201b17] sm:text-4xl"
              style={{ fontFamily: pilotSerif }}
            >
              Change access
            </h2>
            <p className="text-base font-medium text-[#737373]">
              Choose which Hey Ralli access role they should have.
            </p>
          </div>
          <button
            type="button"
            className="text-2xl text-[#737373] hover:text-[#201b17]"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-8 pb-4 sm:px-10">
          {visibleTemplates.map((template) => {
            const active = template.id === selectedId;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition ${
                  active
                    ? "border-[#586c63] bg-[#eef2f0]/30"
                    : "border-[#e5e1d8] bg-white hover:border-[#586c63]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-lg font-bold ${
                        active ? "text-[#586c63]" : "text-[#201b17]"
                      }`}
                    >
                      {template.displayName}
                    </p>
                    {template.isCustom ? (
                      <span className="rounded-full bg-[#eef2f0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#586c63]">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-[#737373]">
                    {template.description ||
                      eventAccessModeLabel(
                        deriveEventAccessMode(template.permissions),
                      )}
                  </p>
                </div>
                {active ? (
                  <span className="text-xl font-bold text-[#586c63]">✓</span>
                ) : null}
              </button>
            );
          })}

          {selected ? (
            <div className="pt-2">
              <button
                type="button"
                className="w-full rounded-xl border border-[#e5e1d8] py-3 text-xs font-bold hover:bg-[#f5f2eb]"
                onClick={() => setShowPerms((value) => !value)}
              >
                {showPerms ? "Hide permissions" : "See permissions"}
              </button>
              {showPerms ? (
                <ul className="mt-3 space-y-1.5 rounded-2xl border border-[#e5e1d8] bg-[#f5f2eb]/40 p-4 text-sm">
                  <li className="font-medium text-[#737373]">
                    Events:{" "}
                    <span className="font-bold text-[#201b17]">
                      {eventAccessModeLabel(
                        deriveEventAccessMode(selected.permissions),
                      )}
                    </span>
                  </li>
                  {ACCESS_PERMISSION_KEYS.filter(
                    (key) =>
                      key !== "view_all_events" &&
                      key !== "view_assigned_events_only" &&
                      key !== "access_assigned_events_only",
                  ).map((key) => (
                    <li
                      key={key}
                      className={
                        selected.permissions[key]
                          ? "font-medium text-[#201b17]"
                          : "text-[#737373]/70"
                      }
                    >
                      {selected.permissions[key] ? "✓" : "—"}{" "}
                      {ACCESS_PERMISSION_LABELS[key]}
                    </li>
                  ))}
                  {isAssignedOnlyAccess(selected.permissions) ? (
                    <li className="pt-2 text-xs font-medium text-amber-800">
                      Event assignments control which events they can work on.
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-[#c07a67]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e5e1d8] p-8 sm:flex-row sm:p-10">
          <button
            type="button"
            className={`${pilotBtnSecondary} flex-1`}
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${pilotBtnPrimary} flex-1`}
            disabled={pending || selectedId === currentTemplateId}
            onClick={() => void handleSave()}
          >
            {pending ? "Saving…" : "Save access"}
          </button>
        </div>
    </TeamAccessPilotDialog>
  );
}
