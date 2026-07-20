"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createOrganizationAccessTemplateAction,
  deleteOrganizationAccessTemplateAction,
  saveOrganizationAccessTemplateAction,
} from "@/lib/access-templates/actions";
import {
  ACCESS_PERMISSION_DESCRIPTIONS,
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  type AccessPermissionKey,
  type AccessTemplate,
} from "@/lib/access-templates/types";
import { applySafetyLocks } from "@/lib/access-templates/defaults";
import { CAMPAIGN_ROLES, campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { cn } from "@/lib/utils/cn";

interface TeamAccessAccessTemplatesPanelProps {
  templates: AccessTemplate[];
  canEdit: boolean;
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#5c6b4f]" : "bg-cos-border",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function TeamAccessAccessTemplatesPanel({
  templates: initialTemplates,
  canEdit,
}: TeamAccessAccessTemplatesPanelProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id ?? "admin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [cloneFromId, setCloneFromId] = useState("contributor");

  useEffect(() => {
    setTemplates(initialTemplates);
    if (!initialTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(initialTemplates[0]?.id ?? "admin");
    }
  }, [initialTemplates, selectedId]);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const cloneOptions = useMemo(
    () =>
      templates.filter(
        (template) =>
          !template.isCustom &&
          template.id !== "admin" &&
          template.id !== "president" &&
          template.id !== "developer",
      ),
    [templates],
  );

  function updateSelected(patch: Partial<AccessTemplate>) {
    if (!selected) {
      return;
    }
    setTemplates((current) =>
      current.map((template) =>
        template.id === selected.id ? { ...template, ...patch } : template,
      ),
    );
    setMessage(null);
    setError(null);
  }

  function updatePermission(key: AccessPermissionKey, enabled: boolean) {
    if (!selected) {
      return;
    }
    let permissions = { ...selected.permissions, [key]: enabled };
    // List modes are mutually exclusive.
    if (key === "view_assigned_events_only" && enabled) {
      permissions.view_all_events = false;
      // Mode B: list-hide always implies work restricted to assigned.
      permissions.access_assigned_events_only = true;
    }
    if (key === "view_all_events" && enabled) {
      permissions.view_assigned_events_only = false;
    }
    // Turning off work-restriction while list-hide is on would leave an
    // incoherent Mode B — clear list-hide and restore see-all.
    if (key === "access_assigned_events_only" && !enabled) {
      permissions.view_assigned_events_only = false;
      permissions.view_all_events = true;
    }
    permissions = applySafetyLocks(
      selected.id,
      permissions,
      selected.baseRole,
    );
    updateSelected({ permissions });
  }

  function handleSave() {
    if (!selected || !canEdit) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveOrganizationAccessTemplateAction({
        templateId: selected.id,
        displayName: selected.displayName,
        description: selected.description,
        permissions: selected.permissions,
        baseRole: selected.baseRole,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to save template.");
        return;
      }
      setMessage("Access template saved. Names appear on People and invites.");
      router.refresh();
    });
  }

  function handleCreate() {
    if (!canEdit) {
      return;
    }
    const displayName = newName.trim();
    if (!displayName) {
      setError("Enter a name for the new role.");
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createOrganizationAccessTemplateAction({
        displayName,
        cloneFromTemplateId: cloneFromId,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to create role.");
        return;
      }
      setAdding(false);
      setNewName("");
      if (result.templateId) {
        setSelectedId(result.templateId);
      }
      setMessage("New role template created. Adjust permissions, then Save.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selected?.isCustom || !canEdit) {
      return;
    }
    if (
      !window.confirm(
        `Delete “${selected.displayName}”? People using this role must be reassigned first.`,
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganizationAccessTemplateAction({
        templateId: selected.id,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to delete role.");
        return;
      }
      setSelectedId("contributor");
      setMessage("Custom role deleted.");
      router.refresh();
    });
  }

  if (!selected) {
    return null;
  }

  const managePeopleLocked =
    selected.baseRole === "admin" || selected.baseRole === "president";

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      <SettingsV2Card className="rounded-2xl p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Templates
          </p>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setAdding((open) => !open);
                setError(null);
                setMessage(null);
              }}
              className="text-xs font-semibold text-[#5c6b4f] hover:underline"
            >
              {adding ? "Cancel" : "+ Add role"}
            </button>
          ) : null}
        </div>

        {adding ? (
          <div className="mb-3 space-y-2 rounded-xl border border-cos-border bg-cos-bg/60 p-3">
            <Input
              label="New role name"
              value={newName}
              placeholder="Treasurer, Team Parent…"
              disabled={isPending}
              onChange={(event) => setNewName(event.target.value)}
            />
            <label className="block space-y-1">
              <span className="text-xs font-medium text-cos-muted">
                Start from
              </span>
              <select
                value={cloneFromId}
                disabled={isPending}
                onChange={(event) => setCloneFromId(event.target.value)}
                className="h-10 w-full rounded-lg border border-cos-border bg-white px-3 text-sm"
              >
                {cloneOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.displayName}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={handleCreate}
            >
              {isPending ? "Creating…" : "Create role"}
            </Button>
          </div>
        ) : null}

        <div className="space-y-0.5">
          {templates.map((template) => {
            const active = template.id === selected.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-l-2 border-[#5c6b4f] bg-cos-bg font-semibold text-cos-text"
                    : "border-l-2 border-transparent text-cos-muted hover:bg-cos-bg/70 hover:text-cos-text",
                )}
              >
                <span className="truncate">{template.displayName}</span>
                {template.isCustom ? (
                  <span className="shrink-0 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
                    Custom
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </SettingsV2Card>

      <SettingsV2Card className="rounded-2xl p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-cos-text">
              {selected.displayName}
            </h2>
            <p className="mt-1 text-sm text-cos-muted">
              Rename for HOAs, churches, sports teams, schools, and more.
              {selected.isCustom
                ? " Custom roles can be assigned on invites."
                : " Built-in access ids stay stable so logins keep working."}
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {selected.isCustom ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleSave}
              >
                {isPending ? "Saving…" : "Save template"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <Input
            label="Display name"
            value={selected.displayName}
            disabled={!canEdit || isPending}
            onChange={(event) =>
              updateSelected({ displayName: event.target.value })
            }
            hint="Shown on People, invites, and Access & Settings."
          />
          <label className="block space-y-2">
            <span className="block text-sm font-medium text-cos-text">
              Description
            </span>
            <textarea
              value={selected.description}
              disabled={!canEdit || isPending}
              onChange={(event) =>
                updateSelected({ description: event.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-cos-primary/20 disabled:opacity-50"
            />
          </label>
          {selected.isCustom ? (
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-cos-text">
                Login access base
              </span>
              <select
                value={selected.baseRole}
                disabled={!canEdit || isPending}
                onChange={(event) =>
                  updateSelected({
                    baseRole: event.target.value as AccessTemplate["baseRole"],
                  })
                }
                className="h-11 w-full rounded-lg border border-cos-border bg-white px-3 text-sm disabled:opacity-50"
              >
                {CAMPAIGN_ROLES.filter(
                  (role) =>
                    role !== "admin" &&
                    role !== "president" &&
                    role !== "developer",
                ).map((role) => (
                  <option key={role} value={role}>
                    {campaignRoleLabel(role)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-cos-muted">
                Controls sign-in powers until permission toggles are fully
                enforced. Prefer Contributor or View Only for most custom roles.
              </p>
            </label>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Permissions
          </p>
          <ul className="mt-3 divide-y divide-cos-border border-t border-cos-border">
            {ACCESS_PERMISSION_KEYS.map((key) => {
              const locked = key === "manage_people" && managePeopleLocked;
              const description = ACCESS_PERMISSION_DESCRIPTIONS[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cos-text">
                      {ACCESS_PERMISSION_LABELS[key]}
                    </p>
                    {locked ? (
                      <p className="mt-0.5 text-xs text-cos-muted">
                        Always on for Admin and President so you cannot lock
                        yourself out.
                      </p>
                    ) : description ? (
                      <p className="mt-0.5 text-xs text-cos-muted">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  <Toggle
                    label={ACCESS_PERMISSION_LABELS[key]}
                    checked={selected.permissions[key]}
                    disabled={!canEdit || isPending || locked}
                    onChange={(next) => updatePermission(key, next)}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-6 text-xs text-cos-muted">
          Event access splits “see” from “work”: turn on both See all events and
          Can only work on assigned events to show every card but limit edits to
          assignments. Show only assigned events hides unassigned cards (and
          always limits work). Org-wide powers (people, billing, integrations)
          stay on leadership seats by default.
        </p>

        {message ? (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {!canEdit ? (
          <p className="mt-3 text-sm text-cos-muted">
            Only Admin or President can edit access templates.
          </p>
        ) : null}
      </SettingsV2Card>
    </div>
  );
}
