"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { TeamAccessBodyPortal } from "@/components/settings-v2/team-access/TeamAccessBodyPortal";
import {
  CREATE_ROLE_ADMIN_KEYS,
  CREATE_ROLE_COMM_KEYS,
  EVENT_ACCESS_MODE_OPTIONS,
  buildPermissionsFromCreateRoleForm,
  deriveEventAccessMode,
  eventAccessModeLabel,
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
import { createOrganizationAccessTemplateAction } from "@/lib/access-templates/actions";
import type { AccessPermissionKey } from "@/lib/access-templates/types";
import { cn } from "@/lib/utils/cn";

type CreateRoleFormState = ReturnType<typeof defaultFormState>;

const PERMISSION_FORM_KEY: Partial<
  Record<AccessPermissionKey, keyof CreateRoleFormState>
> = {
  draft_edit: "draftEdit",
  submit_approval: "submitApproval",
  approve_comms: "approveComms",
  publish_social: "publishSocial",
  upload_artwork: "uploadArtwork",
  manage_people: "managePeople",
  manage_billing: "manageBilling",
  manage_integrations: "manageIntegrations",
};

function permissionChecked(
  form: CreateRoleFormState,
  key: AccessPermissionKey,
): boolean {
  const formKey = PERMISSION_FORM_KEY[key];
  if (!formKey) {
    return false;
  }
  return Boolean(form[formKey]);
}

interface TeamAccessCreateRoleDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string, displayName: string) => void;
}

function PilotCheckbox({
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition",
        checked
          ? "border-[#586c63] bg-[#eef2f0]/30"
          : "border-[#e5e1d8] bg-white hover:border-[#586c63]/50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
          checked
            ? "border-[#586c63] bg-[#586c63] text-white"
            : "border-[#e5e1d8] bg-[#f5f2eb]",
        )}
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#201b17]">{label}</span>
        <span className="mt-0.5 block text-xs font-medium text-[#737373]">
          {description}
        </span>
      </span>
    </label>
  );
}

function defaultFormState() {
  return {
    displayName: "",
    description: "",
    eventMode: "all" as EventAccessMode,
    draftEdit: true,
    submitApproval: false,
    approveComms: false,
    publishSocial: false,
    uploadArtwork: false,
    managePeople: false,
    manageBilling: false,
    manageIntegrations: false,
  };
}

export function TeamAccessCreateRoleDrawer({
  open,
  onClose,
  onCreated,
}: TeamAccessCreateRoleDrawerProps) {
  const [form, setForm] = useState(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(defaultFormState());
      setError(null);
      setCreatedTemplateId(null);
    }
  }, [open]);

  const previewPermissions = useMemo(
    () =>
      buildPermissionsFromCreateRoleForm({
        eventMode: form.eventMode,
        draftEdit: form.draftEdit,
        submitApproval: form.submitApproval,
        approveComms: form.approveComms,
        publishSocial: form.publishSocial,
        uploadArtwork: form.uploadArtwork,
        managePeople: form.managePeople,
        manageBilling: form.manageBilling,
        manageIntegrations: form.manageIntegrations,
      }),
    [form],
  );

  const summaryCommKeys = CREATE_ROLE_COMM_KEYS.filter(
    (item) => previewPermissions[item.key],
  );
  const summaryAdminKeys = CREATE_ROLE_ADMIN_KEYS.filter(
    (item) => previewPermissions[item.key],
  );

  if (!open) {
    return null;
  }

  function handleClose() {
    if (isPending) {
      return;
    }
    onClose();
  }

  function handleDone() {
    if (createdTemplateId) {
      onCreated(createdTemplateId, form.displayName.trim());
    }
    onClose();
  }

  function handleSubmit() {
    const displayName = form.displayName.trim();
    if (!displayName) {
      setError("Role name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createOrganizationAccessTemplateAction({
        displayName,
        description: form.description.trim() || undefined,
        baseRole: "contributor",
        permissions: buildPermissionsFromCreateRoleForm({
          eventMode: form.eventMode,
          draftEdit: form.draftEdit,
          submitApproval: form.submitApproval,
          approveComms: form.approveComms,
          publishSocial: form.publishSocial,
          uploadArtwork: form.uploadArtwork,
          managePeople: form.managePeople,
          manageBilling: form.manageBilling,
          manageIntegrations: form.manageIntegrations,
        }),
      });

      if (!result.success || !result.templateId) {
        setError(result.error ?? "Unable to create role.");
        return;
      }

      setCreatedTemplateId(result.templateId);
    });
  }

  return (
    <TeamAccessBodyPortal>
    <div className="fixed inset-0 z-[70] flex justify-end bg-[rgba(32,27,23,0.35)] backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close drawer"
        className="flex-1"
        onClick={handleClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-role-drawer-title"
        className="relative flex h-full w-full max-w-[850px] flex-col border-l border-[#e5e1d8] bg-[#fdfcf7] shadow-2xl"
      >
        {createdTemplateId ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(253,252,247,0.92)] p-8">
            <div className="w-full max-w-sm rounded-[2.5rem] border border-[#e5e1d8] bg-white p-10 text-center shadow-2xl">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2f0] text-2xl text-[#586c63]">
                ✓
              </div>
              <h3
                className="mb-2 text-2xl font-bold tracking-tight text-[#201b17]"
                style={{ fontFamily: pilotSerif }}
              >
                Role created
              </h3>
              <p className="mb-8 text-sm font-medium text-[#737373]">
                {form.displayName.trim()} is ready. Assign it when you invite
                someone or change access on People.
              </p>
              <button
                type="button"
                className={`${pilotBtnPrimary} w-full`}
                onClick={handleDone}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 border-b border-[#e5e1d8] px-8 py-6 sm:px-10">
          <div>
            <p className={pilotSectionLabel}>New role</p>
            <h2
              id="create-role-drawer-title"
              className="mt-1 text-3xl font-bold tracking-tight text-[#201b17] sm:text-4xl"
              style={{ fontFamily: pilotSerif }}
            >
              Create role
            </h2>
            <p className="mt-2 text-sm font-medium text-[#737373]">
              Define what someone with this role can see and do in Hey Ralli.
            </p>
          </div>
          <button
            type="button"
            className="text-2xl text-[#737373] hover:text-[#201b17]"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex-1 space-y-8 overflow-y-auto px-8 py-6 sm:px-10">
            <section className="space-y-4">
              <h3 className={pilotSectionLabel}>Role details</h3>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className={pilotLabel}>Role name</span>
                  <input
                    type="text"
                    value={form.displayName}
                    disabled={isPending}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Fundraising Lead"
                    className={pilotInput}
                  />
                </label>
                <label className="block space-y-2">
                  <span className={pilotLabel}>Description</span>
                  <textarea
                    value={form.description}
                    disabled={isPending}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What this role is responsible for…"
                    rows={3}
                    className={`${pilotInput} resize-none`}
                  />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className={pilotSectionLabel}>Event access</h3>
              <div className="space-y-3">
                {EVENT_ACCESS_MODE_OPTIONS.map((option) => {
                  const active = form.eventMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          eventMode: option.value,
                        }))
                      }
                      className={cn(
                        "flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition",
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

            <section className="space-y-4">
              <h3 className={pilotSectionLabel}>Communications</h3>
              <div className="space-y-3">
                {CREATE_ROLE_COMM_KEYS.map((item) => {
                  const formKey = PERMISSION_FORM_KEY[item.key];
                  if (!formKey) return null;
                  return (
                    <PilotCheckbox
                      key={item.key}
                      label={item.label}
                      description={item.description}
                      checked={permissionChecked(form, item.key)}
                      disabled={isPending}
                      onChange={(next) =>
                        setForm((current) => ({ ...current, [formKey]: next }))
                      }
                    />
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className={pilotSectionLabel}>Administration</h3>
              <div className="space-y-3">
                {CREATE_ROLE_ADMIN_KEYS.map((item) => {
                  const formKey = PERMISSION_FORM_KEY[item.key];
                  if (!formKey) return null;
                  return (
                    <PilotCheckbox
                      key={item.key}
                      label={item.label}
                      description={item.description}
                      checked={permissionChecked(form, item.key)}
                      disabled={isPending}
                      onChange={(next) =>
                        setForm((current) => ({ ...current, [formKey]: next }))
                      }
                    />
                  );
                })}
              </div>
            </section>

            {error ? (
              <p className="text-sm font-medium text-[#c07a67]" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[#e5e1d8] bg-[#f5f2eb]/50 px-8 py-6 lg:w-[280px] lg:shrink-0 lg:border-t-0 lg:border-l">
            <h3 className={pilotSectionLabel}>Live access summary</h3>
            <div className="mt-4 space-y-4 rounded-2xl border border-[#e5e1d8] bg-white p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#737373]/70">
                  Events
                </p>
                <p className="mt-1 text-sm font-bold text-[#201b17]">
                  {eventAccessModeLabel(
                    deriveEventAccessMode(previewPermissions),
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#737373]/70">
                  Communications
                </p>
                {summaryCommKeys.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {summaryCommKeys.map((item) => (
                      <li
                        key={item.key}
                        className="text-sm font-medium text-[#201b17]"
                      >
                        ✓ {item.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#737373]/70">
                    No communication permissions
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#737373]/70">
                  Administration
                </p>
                {summaryAdminKeys.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {summaryAdminKeys.map((item) => (
                      <li
                        key={item.key}
                        className="text-sm font-medium text-[#201b17]"
                      >
                        ✓ {item.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#737373]/70">
                    No admin permissions
                  </p>
                )}
              </div>

              {form.eventMode !== "all" ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  Event assignments control which events they can work on.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e5e1d8] px-8 py-6 sm:flex-row sm:px-10">
          <button
            type="button"
            className={`${pilotBtnSecondary} flex-1`}
            disabled={isPending}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${pilotBtnPrimary} flex-1`}
            disabled={isPending || !form.displayName.trim()}
            onClick={handleSubmit}
          >
            {isPending ? "Creating…" : "Create role"}
          </button>
        </div>
      </aside>
    </div>
    </TeamAccessBodyPortal>
  );
}
