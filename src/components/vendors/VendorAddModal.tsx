"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { VendorFieldSelect } from "@/components/vendors/VendorFieldSelect";
import { Textarea } from "@/components/ui/Textarea";
import { loadEventVendorDirectoryAction } from "@/lib/events-phase3/actions";
import { createVendorAction, assignVendorToEventAction } from "@/lib/vendors/actions";
import type {
  CreateVendorInput,
  VendorAssignmentStatus,
  VendorCategory,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type Step = "basics" | "event" | "review";

type VendorEventOption = { id: string; title: string; date: string };

interface VendorAddModalProps {
  open: boolean;
  onClose: () => void;
  categories: VendorCategory[];
  events: VendorEventOption[];
  defaultEventId?: string;
  onCreated?: (vendorId: string) => void;
}

const EMPTY_FORM: CreateVendorInput = {
  name: "",
  website: "",
  email: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  categoryId: null,
  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  eventId: null,
  eventIds: [],
  // Confirmed so the directory card shows the event link (pending badges are hidden).
  assignmentStatus: "confirmed",
};

function seedEventIds(defaultEventId?: string): string[] {
  return defaultEventId ? [defaultEventId] : [];
}

export function VendorAddModal({
  open,
  onClose,
  categories: initialCategories,
  events: initialEvents,
  defaultEventId,
  onCreated,
}: VendorAddModalProps) {
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState<CreateVendorInput>({
    ...EMPTY_FORM,
    eventId: defaultEventId ?? null,
    eventIds: seedEventIds(defaultEventId),
  });
  const [error, setError] = useState<string | null>(null);
  const [existingVendorId, setExistingVendorId] = useState<string | null>(null);
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState(initialCategories);
  const [events, setEvents] = useState(initialEvents);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories],
  );

  const eventOptions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...events].sort((left, right) => {
      const leftUpcoming = left.date >= today ? 0 : 1;
      const rightUpcoming = right.date >= today ? 0 : 1;
      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming - rightUpcoming;
      }
      return left.date.localeCompare(right.date);
    });
  }, [events]);

  const selectedEventIds = useMemo(() => {
    const ids = form.eventIds?.length
      ? form.eventIds
      : form.eventId
        ? [form.eventId]
        : seedEventIds(defaultEventId);
    return Array.from(new Set(ids.filter(Boolean)));
  }, [form.eventIds, form.eventId, defaultEventId]);

  const selectedEvents = eventOptions.filter((event) =>
    selectedEventIds.includes(event.id),
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep("basics");
    setForm({
      ...EMPTY_FORM,
      eventId: defaultEventId ?? null,
      eventIds: seedEventIds(defaultEventId),
      assignmentStatus: "confirmed",
    });
    setError(null);
    setExistingVendorId(null);
    setCreatedVendorId(null);
    setCategories(initialCategories);
    setEvents(initialEvents);
    setEventsLoadError(null);

    // Always refresh events when opening — Vendor Master depends on this list
    // (Event tab can still link via defaultEventId alone).
    let cancelled = false;
    setEventsLoading(true);
    void loadEventVendorDirectoryAction().then((result) => {
      if (cancelled) return;
      setEventsLoading(false);
      if (!result.success) {
        setEventsLoadError(result.error);
        return;
      }
      setCategories((prev) =>
        result.data.categories.length > 0 ? result.data.categories : prev,
      );
      setEvents((prev) =>
        result.data.events.length > 0 ? result.data.events : prev,
      );
    });

    return () => {
      cancelled = true;
    };
    // Intentionally only re-run when the dialog opens / default event changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid refetch loops from array identity
  }, [open, defaultEventId]);

  if (!open) {
    return null;
  }

  function updateField<K extends keyof CreateVendorInput>(
    key: K,
    value: CreateVendorInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleEvent(eventId: string) {
    setForm((current) => {
      const currentIds = current.eventIds?.length
        ? current.eventIds
        : current.eventId
          ? [current.eventId]
          : [];
      const nextIds = currentIds.includes(eventId)
        ? currentIds.filter((id) => id !== eventId)
        : [...currentIds, eventId];
      return {
        ...current,
        eventIds: nextIds,
        eventId: nextIds[0] ?? null,
      };
    });
  }

  function resetAndClose() {
    setStep("basics");
    setForm({
      ...EMPTY_FORM,
      eventId: defaultEventId ?? null,
      eventIds: seedEventIds(defaultEventId),
    });
    setError(null);
    setExistingVendorId(null);
    setCreatedVendorId(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    setExistingVendorId(null);
    startTransition(async () => {
      const payload: CreateVendorInput = {
        ...form,
        eventIds: selectedEventIds,
        eventId: selectedEventIds[0] ?? null,
      };
      const result = await createVendorAction(payload);
      if (!result.success || !result.vendorId) {
        setError(result.error ?? "Unable to create vendor.");
        setExistingVendorId(result.existingVendorId ?? null);
        setCreatedVendorId(result.vendorId);
        return;
      }
      onCreated?.(result.vendorId);
      resetAndClose();
    });
  }

  async function linkVendorToSelectedEvents(vendorId: string) {
    if (selectedEventIds.length === 0) {
      setError("Choose at least one event to link this vendor.");
      setStep("event");
      return false;
    }

    for (const eventId of selectedEventIds) {
      const result = await assignVendorToEventAction(
        vendorId,
        eventId,
        form.assignmentStatus ?? "confirmed",
      );
      if (!result.success) {
        setError(result.error ?? "Unable to link vendor to event.");
        return false;
      }
    }
    return true;
  }

  function handleRetryLink() {
    const vendorId = existingVendorId ?? createdVendorId;
    if (!vendorId) {
      setError("Choose an event to link this vendor.");
      return;
    }

    startTransition(async () => {
      const ok = await linkVendorToSelectedEvents(vendorId);
      if (!ok) return;
      onCreated?.(vendorId);
      resetAndClose();
    });
  }

  function handleLinkExisting() {
    if (!existingVendorId) {
      setError(
        "Could not identify the existing vendor to link. Close and use Add Existing, or change the email.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const ok = await linkVendorToSelectedEvents(existingVendorId);
        if (!ok) return;
        onCreated?.(existingVendorId);
        resetAndClose();
      } catch (linkError) {
        console.error("Link existing vendor failed:", linkError);
        setError("Unable to link existing vendor. Please try Add Existing instead.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vendor-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border border-cos-border bg-cos-card shadow-2xl"
      >
        <div className="border-b border-cos-border px-6 py-4">
          <h2 id="add-vendor-title" className="font-display text-2xl text-cos-text">
            Add Vendor
          </h2>
          <StepIndicator step={step} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "basics" && (
            <div className="space-y-4">
              <Field label="Vendor name" required>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Sweet Bites Bakery"
                />
              </Field>
              <Field label="Category">
                <VendorFieldSelect
                  value={form.categoryId ?? ""}
                  onChange={(value) => updateField("categoryId", value || null)}
                  options={[
                    { value: "", label: "Select category" },
                    ...categoryOptions,
                  ]}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Website">
                  <Input
                    value={form.website ?? ""}
                    onChange={(event) => updateField("website", event.target.value)}
                    placeholder="sweetbites.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone ?? ""}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="(615) 555-0123"
                  />
                </Field>
              </div>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="sarah@sweetbites.com"
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.addressLine1 ?? ""}
                  onChange={(event) => updateField("addressLine1", event.target.value)}
                  placeholder="123 Main St"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="City">
                  <Input
                    value={form.city ?? ""}
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </Field>
                <Field label="State">
                  <Input
                    value={form.state ?? ""}
                    onChange={(event) => updateField("state", event.target.value)}
                  />
                </Field>
                <Field label="ZIP">
                  <Input
                    value={form.postalCode ?? ""}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Primary contact name">
                <Input
                  value={form.contactName ?? ""}
                  onChange={(event) => updateField("contactName", event.target.value)}
                  placeholder="Sarah Baker"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact title">
                  <Input
                    value={form.contactTitle ?? ""}
                    onChange={(event) => updateField("contactTitle", event.target.value)}
                    placeholder="Owner"
                  />
                </Field>
                <Field label="Contact phone">
                  <Input
                    value={form.contactPhone ?? ""}
                    onChange={(event) => updateField("contactPhone", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === "event" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-cos-text">
                  Link to events
                </p>
                <p className="mt-1 text-sm text-cos-muted">
                  Select one or more events. The vendor will appear on each event&apos;s
                  Vendors tab. You can skip and link later.
                </p>
              </div>

              {eventsLoading ? (
                <p className="text-sm text-cos-muted">Loading events…</p>
              ) : null}

              {eventsLoadError ? (
                <p className="text-sm text-red-600" role="alert">
                  {eventsLoadError}
                </p>
              ) : null}

              {!eventsLoading && eventOptions.length === 0 ? (
                <div className="rounded-lg border border-cos-border bg-cos-bg/60 p-4 text-sm text-cos-muted">
                  No events are available to link yet.{" "}
                  <Link href="/events" className="text-cos-dark underline">
                    Create an event
                  </Link>{" "}
                  first, or continue without linking.
                </div>
              ) : null}

              {eventOptions.length > 0 ? (
                <>
                  <div className="max-h-56 space-y-1 overflow-y-auto border border-cos-border p-2">
                    {eventOptions.map((event) => {
                      const checked = selectedEventIds.includes(event.id);
                      return (
                        <label
                          key={event.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 px-2 py-2 text-sm transition-colors hover:bg-cos-bg",
                            checked && "bg-cos-accent-soft/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEvent(event.id)}
                            className="mt-0.5 h-4 w-4 accent-cos-dark"
                          />
                          <span>
                            <span className="block font-medium text-cos-text">
                              {event.title}
                            </span>
                            <span className="block text-xs text-cos-muted">
                              {event.date}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedEventIds.length > 0 ? (
                    <Field label="Assignment status">
                      <VendorFieldSelect
                        value={form.assignmentStatus ?? "confirmed"}
                        onChange={(value) =>
                          updateField(
                            "assignmentStatus",
                            value as VendorAssignmentStatus,
                          )
                        }
                        options={[
                          { value: "confirmed", label: "Confirmed" },
                          { value: "pending", label: "Pending" },
                          { value: "completed", label: "Completed" },
                        ]}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}

              <Field label="Notes (optional)">
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  placeholder="Delicious treats, prefers 2 weeks notice..."
                />
              </Field>
            </div>
          )}

          {step === "review" && (
            <dl className="space-y-3 text-sm">
              <ReviewItem label="Name" value={form.name} />
              <ReviewItem
                label="Category"
                value={
                  categories.find((category) => category.id === form.categoryId)?.name ??
                  "—"
                }
              />
              <ReviewItem label="Website" value={form.website || "—"} />
              <ReviewItem label="Contact" value={form.contactName || "—"} />
              <ReviewItem
                label="Events"
                value={
                  selectedEvents.length > 0
                    ? selectedEvents
                        .map(
                          (event) =>
                            `${event.title} (${form.assignmentStatus ?? "confirmed"})`,
                        )
                        .join("; ")
                    : "None — link later from an event or this vendor's profile"
                }
              />
              <ReviewItem label="Notes" value={form.notes || "—"} />
            </dl>
          )}

          {error && (
            <div className="mt-4 space-y-3" role="alert">
              <p className="text-sm text-red-600">{error}</p>
              {existingVendorId ? (
                <div className="rounded-lg border border-cos-border bg-cos-bg/50 p-3">
                  <p className="text-sm text-cos-muted">
                    {selectedEventIds.length > 0
                      ? "Link the existing vendor to the selected event(s) instead of creating a duplicate."
                      : "An existing vendor matched. Go back and choose an event, then link them."}
                  </p>
                  {selectedEventIds.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={handleLinkExisting}
                      disabled={pending}
                    >
                      {pending ? "Linking..." : "Link existing vendor to event(s)"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => {
                        setError(null);
                        setStep("event");
                      }}
                    >
                      Choose events
                    </Button>
                  )}
                </div>
              ) : null}
              {createdVendorId && selectedEventIds.length > 0 && !existingVendorId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRetryLink}
                  disabled={pending}
                >
                  {pending ? "Linking..." : "Retry linking to event(s)"}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-cos-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step !== "basics" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setStep(step === "review" ? "event" : "basics")
                }
              >
                Back
              </Button>
            )}
            {step === "basics" && (
              <Button
                type="button"
                onClick={() => {
                  if (!form.name.trim()) {
                    setError("Vendor name is required.");
                    return;
                  }
                  setError(null);
                  setStep("event");
                }}
              >
                Next
              </Button>
            )}
            {step === "event" && (
              <Button type="button" onClick={() => setStep("review")}>
                Next
              </Button>
            )}
            {step === "review" && (
              <>
                {existingVendorId && selectedEventIds.length > 0 ? (
                  <Button
                    type="button"
                    onClick={handleLinkExisting}
                    disabled={pending}
                  >
                    {pending ? "Linking..." : "Link existing vendor to event(s)"}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={pending}>
                    {pending
                      ? "Saving..."
                      : selectedEventIds.length > 0
                        ? `Create & link (${selectedEventIds.length})`
                        : "Create Vendor"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["basics", "event", "review"];
  const labels = ["Basics", "Connect event", "Review"];

  return (
    <div className="mt-3 flex gap-2">
      {steps.map((value, index) => (
        <span
          key={value}
          className={cn(
            "text-xs tracking-wide uppercase",
            step === value ? "text-cos-dark font-semibold" : "text-cos-muted",
          )}
        >
          {labels[index]}
          {index < steps.length - 1 ? " · " : ""}
        </span>
      ))}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-cos-muted">{label}</dt>
      <dd className="text-cos-text">{value}</dd>
    </div>
  );
}
