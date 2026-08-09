"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { TeamAccessCreateRoleDrawer } from "@/components/settings-v2/team-access/TeamAccessCreateRoleDrawer";
import {
  CREATE_ROLE_ADMIN_KEYS,
  CREATE_ROLE_COMM_KEYS,
  EVENT_ACCESS_MODE_OPTIONS,
  applyEventAccessMode,
  deriveEventAccessMode,
  type EventAccessMode,
} from "@/components/settings-v2/team-access/team-access-event-mode";
import {
  pilotBtnPrimary,
  pilotBtnSecondary,
  pilotInput,
  pilotLabel,
  pilotSectionLabel,
  pilotSerif,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";
import {
  deleteOrganizationAccessTemplateAction,
  saveOrganizationAccessTemplateAction,
} from "@/lib/access-templates/actions";
import { applySafetyLocks } from "@/lib/access-templates/defaults";
import {
  type AccessPermissionKey,
  type AccessTemplate,
} from "@/lib/access-templates/types";
import { cn } from "@/lib/utils/cn";

interface TeamAccessRolesSettingsContentProps {
  accessTemplates: AccessTemplate[];
  canEdit: boolean;
  memberCountsByTemplateId: Record<string, number>;
}

function PilotToggle({
  checked,
  disabled,
  onChange,
  label,
  description,
  lockedNote,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
  lockedNote?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#201b17]">{label}</p>
        {lockedNote ? (
          <p className="mt-0.5 text-xs font-medium text-[#737373]">
            {lockedNote}
          </p>
        ) : (
          <p className="mt-0.5 text-xs font-medium text-[#737373]">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#586c63]" : "bg-[#e5e1d8]",
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
    </div>
  );
}

function visibleSystemTemplates(
  templates: AccessTemplate[],
  selectedId: string,
): AccessTemplate[] {
  return templates.filter(
    (template) =>
      !template.isCustom &&
      ((template.id !== "developer" && template.id !== "tester") ||
        template.id === selectedId),
  );
}

export function TeamAccessRolesSettingsContent({
  accessTemplates: initialTemplates,
  canEdit,
  memberCountsByTemplateId,
}: TeamAccessRolesSettingsContentProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(
    initialTemplates.find((template) => !template.isCustom)?.id ??
      initialTemplates[0]?.id ??
      "contributor",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTemplates(initialTemplates);
    if (!initialTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(
        initialTemplates.find((template) => !template.isCustom)?.id ??
          initialTemplates[0]?.id ??
          "contributor",
      );
    }
  }, [initialTemplates, selectedId]);

  const selected = useMemo(
    () =>
      templates.find((template) => template.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const systemTemplates = useMemo(
    () => visibleSystemTemplates(templates, selectedId),
    [templates, selectedId],
  );

  const customTemplates = useMemo(
    () => templates.filter((template) => template.isCustom),
    [templates],
  );

  const managePeopleLocked =
    selected?.baseRole === "admin" || selected?.baseRole === "president";

  const memberCount = selected
    ? (memberCountsByTemplateId[selected.id] ?? 0)
    : 0;

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

  function updateEventMode(mode: EventAccessMode) {
    if (!selected) {
      return;
    }
    const permissions = applySafetyLocks(
      selected.id,
      applyEventAccessMode(selected.permissions, mode),
      selected.baseRole,
    );
    updateSelected({ permissions });
  }

  function updatePermission(key: AccessPermissionKey, enabled: boolean) {
    if (!selected) {
      return;
    }
    const permissions = applySafetyLocks(
      selected.id,
      { ...selected.permissions, [key]: enabled },
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
        setError(result.error ?? "Unable to save role.");
        return;
      }
      setMessage("Role saved. Changes apply to everyone with this role.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selected?.isCustom || !canEdit) {
      return;
    }
    if (memberCount > 0) {
      return;
    }
    if (
      !window.confirm(
        `Delete “${selected.displayName}”? This cannot be undone.`,
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

  function handleCreated(templateId: string, _displayName?: string) {
    void _displayName;
    setCreateOpen(false);
    setSelectedId(templateId);
    setMessage("New role created. Review permissions and save if needed.");
    router.refresh();
  }

  if (!selected) {
    return null;
  }

  const eventMode = deriveEventAccessMode(selected.permissions);

  function renderRoleButton(template: AccessTemplate) {
    const active = template.id === selectedId;
    const count = memberCountsByTemplateId[template.id] ?? 0;
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => setSelectedId(template.id)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-sm transition",
          active
            ? "border-l-[3px] border-[#586c63] bg-[#eef2f0]/50 font-bold text-[#201b17]"
            : "border-l-[3px] border-transparent font-medium text-[#737373] hover:bg-[#f5f2eb] hover:text-[#201b17]",
        )}
      >
        <span className="truncate">{template.displayName}</span>
        <span className="shrink-0 text-xs font-semibold opacity-70">
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/team-access"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#737373] transition-colors hover:text-[#201b17]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Team
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={pilotSectionLabel}>Advanced role definitions</p>
            <h1
              className="mt-1 text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.05] tracking-tight text-[#201b17]"
              style={{ fontFamily: pilotSerif }}
            >
              Roles & permissions
            </h1>
            <p className="mt-2 max-w-[52ch] text-sm font-medium text-[#737373]">
              Define what each role can see and do. Names appear on People,
              invites, and access changes.
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              className={pilotBtnPrimary}
              onClick={() => {
                setCreateOpen(true);
                setError(null);
                setMessage(null);
              }}
            >
              + Create role
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-5 py-4">
        <p className="text-sm font-bold text-amber-950">Changes affect everyone</p>
        <p className="mt-1 text-sm font-medium text-amber-900/90">
          Saving a role updates permissions for every person assigned to it.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-[1.75rem] border border-[#e5e1d8] bg-white p-3 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/60">
                System roles
              </p>
              <div className="space-y-0.5">
                {systemTemplates.map(renderRoleButton)}
              </div>
            </div>

            {customTemplates.length > 0 ? (
              <div>
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/60">
                  Custom roles
                </p>
                <div className="space-y-0.5">
                  {customTemplates.map(renderRoleButton)}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="rounded-[1.75rem] border border-[#e5e1d8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                className="text-2xl font-bold tracking-tight text-[#201b17]"
                style={{ fontFamily: pilotSerif }}
              >
                {selected.displayName}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#737373]">
                {selected.isCustom
                  ? "Custom role — can be deleted when no one uses it."
                  : "Built-in role — rename and adjust permissions for your organization."}
              </p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                {selected.isCustom ? (
                  <button
                    type="button"
                    className={pilotBtnSecondary}
                    disabled={isPending || memberCount > 0}
                    title={
                      memberCount > 0
                        ? `${memberCount} member${memberCount === 1 ? "" : "s"} use this role`
                        : undefined
                    }
                    onClick={handleDelete}
                  >
                    Delete role
                  </button>
                ) : null}
                <button
                  type="button"
                  className={pilotBtnPrimary}
                  disabled={isPending}
                  onClick={handleSave}
                >
                  {isPending ? "Saving…" : "Save role"}
                </button>
              </div>
            ) : null}
          </div>

          {selected.isCustom && memberCount > 0 ? (
            <p className="mt-4 rounded-xl bg-[#f5f2eb] px-4 py-3 text-sm font-medium text-[#737373]">
              {memberCount} member{memberCount === 1 ? "" : "s"} use this role.
              Reassign them before deleting.
            </p>
          ) : null}

          <div className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className={pilotLabel}>Display name</span>
              <input
                type="text"
                value={selected.displayName}
                disabled={!canEdit || isPending}
                onChange={(event) =>
                  updateSelected({ displayName: event.target.value })
                }
                className={pilotInput}
              />
            </label>
            <label className="block space-y-2">
              <span className={pilotLabel}>Description</span>
              <textarea
                value={selected.description}
                disabled={!canEdit || isPending}
                onChange={(event) =>
                  updateSelected({ description: event.target.value })
                }
                rows={2}
                className={`${pilotInput} resize-none`}
              />
            </label>
          </div>

          <section className="mt-8 space-y-4">
            <h3 className={pilotSectionLabel}>Event access</h3>
            <div className="space-y-3">
              {EVENT_ACCESS_MODE_OPTIONS.map((option) => {
                const active = eventMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canEdit || isPending}
                    onClick={() => updateEventMode(option.value)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition disabled:opacity-60",
                      active
                        ? "border-[#586c63] bg-[#eef2f0]/30"
                        : "border-[#e5e1d8] bg-white hover:border-[#586c63]/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-[#586c63] bg-[#586c63]"
                          : "border-[#e5e1d8] bg-[#f5f2eb]",
                      )}
                    >
                      {active ? (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-xs font-bold tracking-widest",
                          active ? "text-[#586c63]" : "text-[#201b17]",
                        )}
                      >
                        {option.title}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-[#737373]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <h3 className={pilotSectionLabel}>Communications</h3>
            {CREATE_ROLE_COMM_KEYS.map((item) => (
              <PilotToggle
                key={item.key}
                label={item.label}
                description={item.description}
                checked={selected.permissions[item.key]}
                disabled={!canEdit || isPending}
                onChange={(next) => updatePermission(item.key, next)}
              />
            ))}
          </section>

          <section className="mt-8 space-y-3">
            <h3 className={pilotSectionLabel}>Administration</h3>
            {CREATE_ROLE_ADMIN_KEYS.map((item) => {
              const locked =
                item.key === "manage_people" && managePeopleLocked;
              return (
                <PilotToggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={selected.permissions[item.key]}
                  disabled={!canEdit || isPending || locked}
                  lockedNote={
                    locked
                      ? "Always on for Admin and President"
                      : undefined
                  }
                  onChange={(next) => updatePermission(item.key, next)}
                />
              );
            })}
          </section>

          {message ? (
            <p className="mt-6 flex items-center gap-2 text-sm font-medium text-[#586c63]">
              <Check className="h-4 w-4" />
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-6 text-sm font-medium text-[#c07a67]" role="alert">
              {error}
            </p>
          ) : null}
          {!canEdit ? (
            <p className="mt-6 text-sm font-medium text-[#737373]">
              Only Admin or President can edit roles and permissions.
            </p>
          ) : null}
        </div>
      </div>

      <TeamAccessCreateRoleDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
