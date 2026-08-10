"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Upload, X } from "lucide-react";

import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  addAudienceMembers,
  addContact,
  createAudience,
  importContactsCsv,
  removeAudienceMembers,
} from "@/lib/newsletter/actions";
import {
  guessCsvContactColumns,
  parseCsvText,
  type CsvContactColumnMapping,
} from "@/lib/newsletter/csv-parse";
import type {
  NewsletterAudience,
  NewsletterContact,
  NewsletterContactStatus,
  NewsletterImportContactRow,
} from "@/lib/newsletter/types";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface NewsletterContactsShellProps {
  contacts: NewsletterContact[];
  audiences: NewsletterAudience[];
  memberIdsByAudience: Record<string, string[]>;
  initialTab?: "contacts" | "audiences";
  initialAudienceId?: string | null;
  returnTo?: string | null;
}

const STATUS_BADGE: Record<
  NewsletterContactStatus,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  active: { label: "Active", variant: "success" },
  unsubscribed: { label: "Unsubscribed", variant: "default" },
  suppressed: { label: "Suppressed", variant: "warning" },
  bounced: { label: "Bounced", variant: "warning" },
  complained: { label: "Complained", variant: "warning" },
};

function ContactStatusBadge({ status }: { status: NewsletterContactStatus }) {
  const config = STATUS_BADGE[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function AddContactModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [consentNote, setConsentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await addContact({ email, firstName, lastName, consentNote });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setFirstName("");
      setLastName("");
      setConsentNote("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Add contact"
      subtitle="Only add people who've agreed to receive your newsletter."
      footer={
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-sm text-cos-error" role="alert">{error}</p> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !email.trim()}>
              {submitting ? "Adding…" : "Add contact"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-cos-text">First name</span>
            <input
              className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-cos-text">Last name</span>
            <input
              className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-cos-text">Email</span>
          <input
            type="email"
            className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-cos-text">
            Consent note <span className="font-normal text-cos-muted">(optional)</span>
          </span>
          <input
            className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            placeholder="e.g. Signed up at Back to School Night"
            value={consentNote}
            onChange={(e) => setConsentNote(e.target.value)}
          />
        </label>
      </div>
    </TeamAccessModal>
  );
}

function ImportCsvModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CsvContactColumnMapping>({
    emailColumn: 0,
    firstNameColumn: null,
    lastNameColumn: null,
  });
  const [attested, setAttested] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const header = rows[0] ?? [];
  const dataRows = rows.slice(1);

  function reset() {
    setFilename(null);
    setRows([]);
    setAttested(false);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsvText(text);
      if (parsed.length === 0) {
        setError("Couldn't read any rows from that file.");
        return;
      }
      setRows(parsed);
      setMapping(guessCsvContactColumns(parsed[0] ?? []));
      setFilename(file.name);
    };
    reader.onerror = () => setError("Couldn't read that file — try again.");
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!attested) {
      setError("You must confirm you're authorized to email these recipients.");
      return;
    }
    if (mapping.emailColumn == null) {
      setError("Choose which column contains the email address.");
      return;
    }
    const importRows: NewsletterImportContactRow[] = dataRows.map((row) => ({
      email: row[mapping.emailColumn] ?? "",
      firstName: mapping.firstNameColumn != null ? row[mapping.firstNameColumn] ?? "" : "",
      lastName: mapping.lastNameColumn != null ? row[mapping.lastNameColumn] ?? "" : "",
    }));

    setImporting(true);
    setError(null);
    try {
      const outcome = await importContactsCsv({
        rows: importRows,
        filename: filename ?? undefined,
        attested,
      });
      if (outcome.batchId === null && outcome.errors.length > 0) {
        setError(outcome.errors[0]);
        return;
      }
      setResult(
        `Imported ${outcome.createdCount} new, updated ${outcome.updatedCount}, skipped ${outcome.skippedCount}${
          outcome.suppressedSkippedCount > 0
            ? ` (${outcome.suppressedSkippedCount} previously unsubscribed/suppressed kept as-is)`
            : ""
        }.`,
      );
      onImported();
    } finally {
      setImporting(false);
    }
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import contacts from CSV"
      subtitle="Map your columns, then confirm you're authorized to email these recipients."
      wide
      footer={
        rows.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            {error ? <p className="text-sm text-cos-error" role="alert">{error}</p> : <span />}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                }}
                disabled={importing}
              >
                Start over
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing || !attested}>
                {importing ? "Importing…" : `Import ${dataRows.length} contacts`}
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-cos-brand-sage">{result}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-3">
          <label
            htmlFor="newsletter-csv-input"
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cos-border bg-cos-bg/60 px-6 py-10 text-center text-sm text-cos-muted transition hover:border-cos-brand-sage"
          >
            <Upload className="h-6 w-6 text-cos-muted" strokeWidth={1.5} />
            <span className="font-semibold text-cos-text">Choose a CSV file</span>
            <span>First row should be a header (Email, First Name, Last Name).</span>
          </label>
          <input
            id="newsletter-csv-input"
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {error ? <p className="text-sm text-cos-error">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-cos-text">Email column</span>
              <select
                className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                value={mapping.emailColumn}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, emailColumn: Number(e.target.value) }))
                }
              >
                {header.map((label, index) => (
                  <option key={index} value={index}>
                    {label || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-cos-text">First name column</span>
              <select
                className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                value={mapping.firstNameColumn ?? ""}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    firstNameColumn: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              >
                <option value="">(none)</option>
                {header.map((label, index) => (
                  <option key={index} value={index}>
                    {label || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-cos-text">Last name column</span>
              <select
                className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                value={mapping.lastNameColumn ?? ""}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    lastNameColumn: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              >
                <option value="">(none)</option>
                {header.map((label, index) => (
                  <option key={index} value={index}>
                    {label || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="max-h-48 overflow-auto rounded-xl border border-cos-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-cos-bg-alt text-cos-muted">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">First</th>
                  <th className="px-3 py-2">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cos-border">
                {dataRows.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-cos-text">{row[mapping.emailColumn] ?? ""}</td>
                    <td className="px-3 py-2 text-cos-text">
                      {mapping.firstNameColumn != null ? row[mapping.firstNameColumn] ?? "" : ""}
                    </td>
                    <td className="px-3 py-2 text-cos-text">
                      {mapping.lastNameColumn != null ? row[mapping.lastNameColumn] ?? "" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-cos-muted">
            Showing 5 of {dataRows.length} rows. Contacts already unsubscribed or suppressed are
            never reactivated by an import.
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
            />
            <span className="text-cos-text">
              I confirm these recipients are authorized to receive email from our organization
              (e.g. they opted in, are members, or are on our roster).
            </span>
          </label>
          {error ? <p className="text-sm text-cos-error">{error}</p> : null}
        </div>
      )}
    </TeamAccessModal>
  );
}

function AudiencesPanel({
  audiences,
  contacts,
  memberIdsByAudience,
  initialAudienceId,
  onChanged,
}: {
  audiences: NewsletterAudience[];
  contacts: NewsletterContact[];
  memberIdsByAudience: Record<string, string[]>;
  initialAudienceId?: string | null;
  onChanged: () => void;
}) {
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(
    () => {
      if (
        initialAudienceId &&
        audiences.some((audience) => audience.id === initialAudienceId)
      ) {
        return initialAudienceId;
      }
      return audiences[0]?.id ?? null;
    },
  );
  const [newAudienceOpen, setNewAudienceOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [checkedContactIds, setCheckedContactIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const selectedAudience = audiences.find((a) => a.id === selectedAudienceId) ?? null;
  const memberIds = new Set(selectedAudienceId ? memberIdsByAudience[selectedAudienceId] ?? [] : []);
  const members = contacts.filter((c) => memberIds.has(c.id));
  const nonMembers = contacts.filter(
    (c) =>
      !memberIds.has(c.id) &&
      (search.trim() === "" ||
        c.email.toLowerCase().includes(search.trim().toLowerCase()) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.trim().toLowerCase())),
  );

  async function handleCreateAudience() {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createAudience({ name: newName, description: newDescription });
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setNewName("");
      setNewDescription("");
      setNewAudienceOpen(false);
      setSelectedAudienceId(result.audienceId);
      onChanged();
    } finally {
      setCreating(false);
    }
  }

  async function handleAddSelected() {
    if (!selectedAudienceId || checkedContactIds.size === 0) return;
    setBusy(true);
    try {
      await addAudienceMembers({
        audienceId: selectedAudienceId,
        contactIds: Array.from(checkedContactIds),
      });
      setCheckedContactIds(new Set());
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(contactId: string) {
    if (!selectedAudienceId) return;
    setBusy(true);
    try {
      await removeAudienceMembers({ audienceId: selectedAudienceId, contactIds: [contactId] });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <SettingsBox
        title="Audiences"
        description="Groups you can propose or send to."
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => setNewAudienceOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        }
        compact
      >
        <div className="space-y-1.5">
          {newAudienceOpen ? (
            <div className="mb-2 space-y-2 rounded-xl border border-cos-border bg-cos-bg/60 p-2.5">
              <input
                className="h-9 w-full rounded-lg border border-cos-border bg-cos-card px-2.5 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                placeholder="Audience name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="h-9 w-full rounded-lg border border-cos-border bg-cos-card px-2.5 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              {createError ? <p className="text-xs text-cos-error">{createError}</p> : null}
              <Button
                type="button"
                size="sm"
                onClick={handleCreateAudience}
                disabled={creating || !newName.trim()}
              >
                {creating ? "Creating…" : "Create audience"}
              </Button>
            </div>
          ) : null}
          {audiences.length === 0 ? (
            <p className="text-sm text-cos-muted">No audiences yet.</p>
          ) : (
            audiences.map((audience) => {
              const count = memberIdsByAudience[audience.id]?.length ?? 0;
              return (
                <button
                  key={audience.id}
                  type="button"
                  onClick={() => setSelectedAudienceId(audience.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    selectedAudienceId === audience.id
                      ? "bg-cos-text text-cos-card"
                      : "text-cos-text hover:bg-cos-bg",
                  )}
                >
                  <span className="truncate font-medium">{audience.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      selectedAudienceId === audience.id ? "text-cos-card/70" : "text-cos-muted",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </SettingsBox>

      {selectedAudience ? (
        <div className="space-y-4">
          <SettingsBox
            title={`Members — ${selectedAudience.name}`}
            description={
              selectedAudience.description?.trim() ||
              "Review who is on this list. Remove anyone who shouldn’t receive this newsletter."
            }
            compact
          >
            {members.length === 0 ? (
              <p className="text-sm text-cos-muted">No members yet.</p>
            ) : (
              <ul className="divide-y divide-cos-border">
                {members.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-cos-text">
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName} ${contact.lastName}`.trim()
                          : contact.email}
                      </p>
                      <p className="truncate text-xs text-cos-muted">{contact.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ContactStatusBadge status={contact.status} />
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(contact.id)}
                        disabled={busy}
                        className="text-cos-muted transition hover:text-cos-error"
                        aria-label={`Remove ${contact.email}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SettingsBox>

          <SettingsBox title="Add contacts" description="Search and select contacts to add." compact>
            <input
              className="mb-2.5 h-9 w-full rounded-lg border border-cos-border bg-cos-card px-2.5 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {nonMembers.slice(0, 100).map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-cos-bg"
                >
                  <input
                    type="checkbox"
                    checked={checkedContactIds.has(contact.id)}
                    onChange={(e) =>
                      setCheckedContactIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(contact.id);
                        else next.delete(contact.id);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-cos-text">
                    {contact.firstName || contact.lastName
                      ? `${contact.firstName} ${contact.lastName}`.trim()
                      : contact.email}{" "}
                    <span className="text-cos-muted">({contact.email})</span>
                  </span>
                  <ContactStatusBadge status={contact.status} />
                </label>
              ))}
              {nonMembers.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-cos-muted">No matching contacts.</p>
              ) : null}
            </div>
            <Button
              type="button"
              className="mt-3"
              onClick={handleAddSelected}
              disabled={busy || checkedContactIds.size === 0}
            >
              Add {checkedContactIds.size > 0 ? checkedContactIds.size : ""} selected
            </Button>
          </SettingsBox>
        </div>
      ) : (
        <SettingsBox title="Members" description="Create an audience to get started.">
          <p className="text-sm text-cos-muted">Select or create an audience on the left.</p>
        </SettingsBox>
      )}
    </div>
  );
}

export function NewsletterContactsShell({
  contacts,
  audiences,
  memberIdsByAudience,
  initialTab = "contacts",
  initialAudienceId = null,
  returnTo = null,
}: NewsletterContactsShellProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"contacts" | "audiences">(initialTab);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : null;

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (contact) =>
        contact.email.toLowerCase().includes(query) ||
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query),
    );
  }, [contacts, search]);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="studio-page space-y-6">
      {safeReturnTo ? (
        <div>
          <Link
            href={safeReturnTo}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cos-muted transition hover:text-cos-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to newsletter
          </Link>
        </div>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <p className="studio-eyebrow">Hey Ralli</p>
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-cos-text">
            Newsletter Contacts
          </h1>
          <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-cos-muted">
            Manage who can receive your newsletters — separate from Team &amp; Access, which
            controls who can sign in and edit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add contact
          </Button>
        </div>
      </header>

      <div className="inline-flex rounded-full bg-cos-bg-alt p-1">
        <button
          type="button"
          onClick={() => setTab("contacts")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            tab === "contacts" ? "bg-cos-card text-cos-text shadow-sm" : "text-cos-muted",
          )}
        >
          Contacts
        </button>
        <button
          type="button"
          onClick={() => setTab("audiences")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            tab === "audiences" ? "bg-cos-card text-cos-text shadow-sm" : "text-cos-muted",
          )}
        >
          Audiences
        </button>
      </div>

      {tab === "contacts" ? (
        <div className="space-y-4">
          <input
            className="h-10 w-full max-w-sm rounded-full border border-cos-border bg-cos-card px-4 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredContacts.length === 0 ? (
            <div className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-10 text-center text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
              {contacts.length === 0
                ? "No contacts yet. Add one manually or import a CSV."
                : "No contacts match your search."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
              <div className="divide-y divide-cos-border">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-cos-text">
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName} ${contact.lastName}`.trim()
                          : contact.email}
                      </p>
                      <p className="truncate text-sm text-cos-muted">{contact.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm text-cos-muted">
                      <ContactStatusBadge status={contact.status} />
                      <span>Added {formatDateTime(contact.addedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <AudiencesPanel
          audiences={audiences}
          contacts={contacts}
          memberIdsByAudience={memberIdsByAudience}
          initialAudienceId={initialAudienceId}
          onChanged={refresh}
        />
      )}

      <AddContactModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          refresh();
        }}
      />
      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refresh}
      />
    </div>
  );
}
