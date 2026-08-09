"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Mail, RefreshCw, UserPlus } from "lucide-react";
import { TeamAccessPilotEventPicker } from "@/components/settings-v2/team-access/TeamAccessPilotEventPicker";
import {
  pilotBtnPrimary,
  pilotBtnSecondary,
  pilotInput,
  pilotLabel,
  pilotSerif,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";
import {
  deriveEventAccessMode,
  eventAccessModeLabel,
  isAssignedOnlyAccess,
} from "@/components/settings-v2/team-access/team-access-event-mode";
import type { AccessTemplate } from "@/lib/access-templates/types";
import {
  createTeamMemberAccountAction,
  inviteTeamMemberAction,
} from "@/lib/auth/actions";
import { copyToClipboard } from "@/lib/utils/clipboard";

type AddMethod = "invite" | "create";

type WizardStep = "method" | "person" | "login" | "role" | "events" | "success";

export interface TeamAccessPilotAddMemberModalProps {
  open: boolean;
  onClose: () => void;
  events: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
  accessTemplates: AccessTemplate[];
  canProvisionAccounts: boolean;
  organizationRoles?: Array<{ id: string; name: string }>;
}

function generateTempPassword(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `ralli-${random}`;
}

function defaultTemplateId(templates: AccessTemplate[]): string {
  const chair = templates.find((template) => template.id === "committee_chair");
  const contributor = templates.find((template) => template.id === "contributor");
  return chair?.id ?? contributor?.id ?? templates[0]?.id ?? "contributor";
}

function visibleRoleTemplates(templates: AccessTemplate[]): AccessTemplate[] {
  const filtered = templates.filter(
    (template) => template.id !== "developer" && template.id !== "tester",
  );
  return filtered.length > 0 ? filtered : templates;
}

function stepsForMethod(method: AddMethod): WizardStep[] {
  if (method === "create") {
    return ["method", "person", "login", "role", "events", "success"];
  }
  return ["method", "person", "role", "events", "success"];
}

function stepTitle(step: WizardStep, method: AddMethod): string {
  switch (step) {
    case "method":
      return "Add team member";
    case "person":
      return "About this person";
    case "login":
      return "Login details";
    case "role":
      return "Choose access role";
    case "events":
      return "Link events";
    case "success":
      return method === "invite" ? "Invite sent" : "Account ready";
  }
}

function stepSubtitle(step: WizardStep, method: AddMethod): string {
  switch (step) {
    case "method":
      return "Choose how they should join Hey Ralli.";
    case "person":
      return "Who are you adding to the team?";
    case "login":
      return "They sign in with email and this temporary password.";
    case "role":
      return "What can they do in Hey Ralli?";
    case "events":
      return "Optional — link the events they work on.";
    case "success":
      return method === "invite"
        ? "Share the invite link so they can sign in."
        : "Share these sign-in details in person or by text.";
  }
}

export function TeamAccessPilotAddMemberModal({
  open,
  onClose,
  events,
  accessTemplates,
  canProvisionAccounts,
  organizationRoles,
}: TeamAccessPilotAddMemberModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<AddMethod>("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ptoTitleText, setPtoTitleText] = useState("");
  const [organizationRoleId, setOrganizationRoleId] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState(() =>
    defaultTemplateId(accessTemplates),
  );
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [provisionedEmail, setProvisionedEmail] = useState<string | null>(null);
  const [provisionedPassword, setProvisionedPassword] = useState<string | null>(
    null,
  );

  const roleTemplates = useMemo(
    () => visibleRoleTemplates(accessTemplates),
    [accessTemplates],
  );

  const selectedTemplate = useMemo(
    () =>
      accessTemplates.find((template) => template.id === selectedTemplateId) ??
      null,
    [accessTemplates, selectedTemplateId],
  );

  const assignedOnlyWarning = selectedTemplate
    ? isAssignedOnlyAccess(selectedTemplate.permissions)
    : false;

  const wizardSteps = useMemo(() => stepsForMethod(method), [method]);
  const stepIndex = wizardSteps.indexOf(step);
  const isFirstStep = stepIndex <= 0;
  const isSuccess = step === "success";

  useEffect(() => {
    if (!open) return;
    setStep("method");
    setMethod("invite");
    setFullName("");
    setEmail("");
    setPhone("");
    setPtoTitleText("");
    setOrganizationRoleId("");
    setPassword(generateTempPassword());
    setShowPassword(false);
    setSelectedTemplateId(defaultTemplateId(accessTemplates));
    setSelectedEventIds([]);
    setError(null);
    setWarning(null);
    setSuccessMessage(null);
    setInviteUrl(null);
    setProvisionedEmail(null);
    setProvisionedPassword(null);
  }, [open, accessTemplates]);

  useEffect(() => {
    if (step === "login" && !password) {
      setPassword(generateTempPassword());
    }
  }, [step, password]);

  if (!open) return null;

  function handleClose() {
    onClose();
  }

  function goBack() {
    setError(null);
    if (isFirstStep || isSuccess) {
      handleClose();
      return;
    }
    const prev = wizardSteps[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function canAdvanceFromCurrentStep(): boolean {
    switch (step) {
      case "method":
        return method === "invite" || (method === "create" && canProvisionAccounts);
      case "person":
        return email.trim().length > 0;
      case "login":
        return password.length >= 8;
      case "role":
        return selectedTemplateId.length > 0;
      case "events":
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    setError(null);
    if (step === "events") {
      void submit();
      return;
    }
    const next = wizardSteps[stepIndex + 1];
    if (next) setStep(next);
  }

  async function submit() {
    const formData = new FormData();
    formData.set("email", email.trim());
    formData.set("fullName", fullName.trim());
    formData.set("campaignRole", selectedTemplateId);
    formData.set("eventIdsCsv", selectedEventIds.join(","));
    formData.set("committeeId", "");
    formData.set("organizationRoleId", organizationRoleId);

    startTransition(async () => {
      if (method === "invite") {
        formData.set("message", "");
        formData.set("sendEmail", "true");

        const result = await inviteTeamMemberAction(
          { error: null, success: false },
          formData,
        );

        if (result.error) {
          setError(result.error);
          setWarning(null);
          return;
        }

        setError(null);
        setWarning(result.warning ?? null);
        setSuccessMessage(result.message ?? null);
        setInviteUrl(result.inviteUrl ?? null);
        setProvisionedEmail(null);
        setProvisionedPassword(null);
        setStep("success");
        router.refresh();
        return;
      }

      formData.set("password", password);

      const result = await createTeamMemberAccountAction(
        { error: null, success: false },
        formData,
      );

      if (result.error) {
        setError(result.error);
        setWarning(null);
        return;
      }

      setError(null);
      setWarning(result.warning ?? null);
      setSuccessMessage(result.message ?? null);
      setInviteUrl(null);
      setProvisionedEmail(result.provisionedEmail ?? email.trim());
      setProvisionedPassword(result.provisionedPassword ?? password);
      setStep("success");
      router.refresh();
    });
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await copyToClipboard(inviteUrl);
    } catch {
      setError("Could not copy invite link.");
    }
  }

  async function copySignInDetails() {
    if (!provisionedEmail || !provisionedPassword) return;
    const text = [
      "Hey Ralli sign-in",
      `Email: ${provisionedEmail}`,
      `Password: ${provisionedPassword}`,
    ].join("\n");
    try {
      await copyToClipboard(text);
    } catch {
      setError("Could not copy sign-in details.");
    }
  }

  async function copyPasswordOnly() {
    try {
      await copyToClipboard(password);
    } catch {
      setError("Could not copy password.");
    }
  }

  function renderMethodStep() {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMethod("invite")}
          className={`flex w-full items-start gap-4 rounded-2xl border-2 p-6 text-left transition ${
            method === "invite"
              ? "border-[#586c63] bg-[#eef2f0]/30"
              : "border-[#e5e1d8] bg-white hover:border-[#586c63]"
          }`}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f5f2eb] text-[#586c63]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#201b17]">Invite by email</p>
            <p className="mt-1 text-sm font-medium text-[#737373]">
              Send an invite link. They sign in with Google or the invited email.
            </p>
          </div>
          {method === "invite" ? (
            <span className="text-xl font-bold text-[#586c63]">✓</span>
          ) : null}
        </button>

        <button
          type="button"
          disabled={!canProvisionAccounts}
          onClick={() => {
            if (canProvisionAccounts) setMethod("create");
          }}
          className={`flex w-full items-start gap-4 rounded-2xl border-2 p-6 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
            method === "create"
              ? "border-[#586c63] bg-[#eef2f0]/30"
              : "border-[#e5e1d8] bg-white hover:border-[#586c63]"
          }`}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f5f2eb] text-[#586c63]">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#201b17]">Create login</p>
            <p className="mt-1 text-sm font-medium text-[#737373]">
              Set up email-and-password access now. Share the credentials yourself.
            </p>
            {!canProvisionAccounts ? (
              <p className="mt-2 text-sm font-medium text-amber-900">
                Account provisioning is not available on this server. Use invite
                by email instead.
              </p>
            ) : null}
          </div>
          {method === "create" ? (
            <span className="text-xl font-bold text-[#586c63]">✓</span>
          ) : null}
        </button>

        <p className="rounded-2xl bg-[#f5f2eb]/80 px-4 py-3 text-sm font-medium text-[#737373]">
          Already on Hey Ralli in another organization? Invite the same email —
          they keep one login and can switch organizations from the header.
        </p>
      </div>
    );
  }

  function renderPersonStep() {
    const emailLabel =
      method === "create" ? "Email / login" : "Email address";

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <label className={pilotLabel} htmlFor="add-member-full-name">
            Full name
          </label>
          <input
            id="add-member-full-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jamie Smith"
            className={pilotInput}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <label className={pilotLabel} htmlFor="add-member-email">
            {emailLabel}
          </label>
          <input
            id="add-member-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@email.com"
            className={pilotInput}
            required
            autoComplete="email"
          />
          {method === "create" ? (
            <p className="px-1 text-xs font-medium text-[#737373]">
              Hey Ralli signs in with email. Username-only accounts are not
              supported yet.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className={pilotLabel} htmlFor="add-member-pto-title">
            PTO title (optional)
          </label>
          {organizationRoles && organizationRoles.length > 0 ? (
            <select
              id="add-member-pto-title"
              value={organizationRoleId}
              onChange={(event) => setOrganizationRoleId(event.target.value)}
              className={pilotInput}
            >
              <option value="">Select title (optional)</option>
              {organizationRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="add-member-pto-title"
              type="text"
              value={ptoTitleText}
              onChange={(event) => setPtoTitleText(event.target.value)}
              placeholder="e.g. Communications VP"
              className={pilotInput}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className={pilotLabel} htmlFor="add-member-phone">
            Phone (optional)
          </label>
          <input
            id="add-member-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(555) 555-5555"
            className={pilotInput}
            autoComplete="tel"
          />
        </div>
      </div>
    );
  }

  function renderLoginStep() {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#e5e1d8] bg-[#f5f2eb]/50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#737373]">
            Login email
          </p>
          <p className="mt-1 text-base font-bold text-[#201b17]">
            {email.trim() || "—"}
          </p>
        </div>

        <div className="space-y-2">
          <label className={pilotLabel} htmlFor="add-member-password">
            Temporary password
          </label>
          <div className="flex gap-2">
            <input
              id="add-member-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${pilotInput} min-w-0 flex-1 font-mono text-sm`}
              minLength={8}
              required
            />
            <button
              type="button"
              className="grid h-[3.25rem] w-12 shrink-0 place-items-center rounded-2xl border-2 border-[#e5e1d8] bg-white text-[#737373] hover:bg-[#f5f2eb] hover:text-[#201b17]"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="px-1 text-xs font-medium text-[#737373]">
            At least 8 characters. They can change it after signing in.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-2.5 text-xs font-bold text-[#201b17] hover:bg-[#f5f2eb]"
            onClick={() => void copyPasswordOnly()}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy password
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-2.5 text-xs font-bold text-[#201b17] hover:bg-[#f5f2eb]"
            onClick={() => setPassword(generateTempPassword())}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Generate another
          </button>
        </div>
      </div>
    );
  }

  function renderRoleStep() {
    if (roleTemplates.length === 0) {
      return (
        <p className="text-sm font-medium text-[#737373]">
          No access roles configured yet.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {roleTemplates.map((template) => {
          const active = template.id === selectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplateId(template.id)}
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
      </div>
    );
  }

  function renderEventsStep() {
    return (
      <TeamAccessPilotEventPicker
        events={events}
        selectedIds={selectedEventIds}
        onChange={setSelectedEventIds}
        disabled={isPending}
        assignedOnlyWarning={assignedOnlyWarning}
      />
    );
  }

  function renderSuccessStep() {
    if (method === "invite" && inviteUrl) {
      return (
        <div className="space-y-4">
          {successMessage ? (
            <p className="text-sm font-medium text-[#201b17]">{successMessage}</p>
          ) : null}
          {warning ? (
            <p className="text-sm font-medium text-amber-900" role="alert">
              {warning}
            </p>
          ) : null}
          <p className="text-sm font-medium text-[#737373]">
            Share this invite link. They&apos;ll need to sign in with the invited
            email.
          </p>
          <p className="break-all rounded-2xl bg-[#f5f2eb] px-4 py-3 text-sm font-bold text-[#201b17]">
            {inviteUrl}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-2.5 text-sm font-bold text-[#201b17] hover:bg-[#f5f2eb]"
            onClick={() => void copyInviteLink()}
          >
            <Copy className="h-4 w-4" />
            Copy invite link
          </button>
        </div>
      );
    }

    if (provisionedEmail && provisionedPassword) {
      return (
        <div className="space-y-4">
          {successMessage ? (
            <p className="text-sm font-medium text-[#201b17]">{successMessage}</p>
          ) : null}
          {warning ? (
            <p className="text-sm font-medium text-amber-900" role="alert">
              {warning}
            </p>
          ) : null}
          <p className="text-sm font-medium text-[#737373]">
            Share these credentials. They sign in with email and password.
          </p>
          <dl className="space-y-3 rounded-2xl bg-[#f5f2eb] px-5 py-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-[#737373]">
                Email / login
              </dt>
              <dd className="mt-1 font-bold text-[#201b17]">{provisionedEmail}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-[#737373]">
                Temporary password
              </dt>
              <dd className="mt-1 font-mono font-bold text-[#201b17]">
                {provisionedPassword}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-2.5 text-sm font-bold text-[#201b17] hover:bg-[#f5f2eb]"
            onClick={() => void copySignInDetails()}
          >
            <Copy className="h-4 w-4" />
            Copy sign-in details
          </button>
        </div>
      );
    }

    return (
      <p className="text-sm font-medium text-[#737373]">
        Something went wrong — close and try again.
      </p>
    );
  }

  function renderStepBody() {
    switch (step) {
      case "method":
        return renderMethodStep();
      case "person":
        return renderPersonStep();
      case "login":
        return renderLoginStep();
      case "role":
        return renderRoleStep();
      case "events":
        return renderEventsStep();
      case "success":
        return renderSuccessStep();
    }
  }

  const nextLabel =
    step === "events" ? (isPending ? "Adding…" : "Add member") : "Next";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(32,27,23,0.4)] backdrop-blur-[4px]"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[3rem] border border-[#e5e1d8] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-4 sm:p-10">
          <div>
            <h2
              id="add-member-modal-title"
              className="mb-2 text-3xl font-bold tracking-tight text-[#201b17] sm:text-4xl"
              style={{ fontFamily: pilotSerif }}
            >
              {stepTitle(step, method)}
            </h2>
            <p className="text-base font-medium text-[#737373]">
              {stepSubtitle(step, method)}
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

        <div className="flex-1 overflow-y-auto px-8 pb-4 sm:px-10">
          {renderStepBody()}
          {error ? (
            <p className="mt-4 text-sm font-medium text-[#c07a67]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e5e1d8] p-8 sm:flex-row sm:p-10">
          <button
            type="button"
            className={`${pilotBtnSecondary} flex-1`}
            disabled={isPending}
            onClick={goBack}
          >
            {isFirstStep || isSuccess ? "Cancel" : "Back"}
          </button>
          {isSuccess ? (
            <button
              type="button"
              className={`${pilotBtnPrimary} flex-1`}
              onClick={handleClose}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              className={`${pilotBtnPrimary} flex-1`}
              disabled={isPending || !canAdvanceFromCurrentStep()}
              onClick={goNext}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
