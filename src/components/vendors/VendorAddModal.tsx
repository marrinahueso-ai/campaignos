"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { VendorFieldSelect } from "@/components/vendors/VendorFieldSelect";
import { Textarea } from "@/components/ui/Textarea";
import { createVendorAction, assignVendorToEventAction } from "@/lib/vendors/actions";
import type {
  CreateVendorInput,
  VendorAssignmentStatus,
  VendorCategory,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type Step = "basics" | "event" | "review";

interface VendorAddModalProps {
  open: boolean;
  onClose: () => void;
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
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
  // Confirmed so the directory card shows the event link (pending badges are hidden).
  assignmentStatus: "confirmed",
};

export function VendorAddModal({
  open,
  onClose,
  categories,
  events,
  defaultEventId,
  onCreated,
}: VendorAddModalProps) {
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState<CreateVendorInput>({
    ...EMPTY_FORM,
    eventId: defaultEventId ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [existingVendorId, setExistingVendorId] = useState<string | null>(null);
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const selectedEventId = form.eventId ?? defaultEventId ?? null;
  const selectedEvent = eventOptions.find((event) => event.id === selectedEventId);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep("basics");
    setForm({
      ...EMPTY_FORM,
      eventId: defaultEventId ?? null,
      assignmentStatus: "confirmed",
    });
    setError(null);
    setExistingVendorId(null);
    setCreatedVendorId(null);
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

  function resetAndClose() {
    setStep("basics");
    setForm({ ...EMPTY_FORM, eventId: defaultEventId ?? null });
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
        eventId: selectedEventId,
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

  function handleRetryLink() {
    const vendorId = existingVendorId ?? createdVendorId;
    const eventId = selectedEventId;
    if (!vendorId || !eventId) {
      setError("Choose an event to link this vendor.");
      return;
    }

    startTransition(async () => {
      const result = await assignVendorToEventAction(
        vendorId,
        eventId,
        form.assignmentStatus ?? "confirmed",
      );
      if (!result.success) {
        setError(result.error ?? "Unable to link vendor to event.");
        return;
      }
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
    if (!selectedEventId) {
      setError(
        "No event selected to link this vendor to. Go back and choose an event.",
      );
      setStep("event");
      return;
    }

    startTransition(async () => {
      try {
        const result = await assignVendorToEventAction(
          existingVendorId,
          selectedEventId,
          form.assignmentStatus ?? "confirmed",
        );
        if (!result.success) {
          setError(result.error ?? "Unable to link existing vendor.");
          return;
        }
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
                  Tie this vendor to an event
                </p>
                <p className="mt-1 text-sm text-cos-muted">
                  Linking adds them on that event&apos;s Vendors tab and keeps history
                  in the directory. You can skip this and link later.
                </p>
              </div>

              {eventOptions.length === 0 ? (
                <div className="rounded-lg border border-cos-border bg-cos-bg/60 p-4 text-sm text-cos-muted">
                  No events are available to link yet.{" "}
                  <Link href="/events" className="text-cos-dark underline">
                    Create an event
                  </Link>{" "}
                  first, or continue without linking.
                </div>
              ) : (
                <>
                  <Field label="Event">
                    <VendorFieldSelect
                      value={form.eventId ?? ""}
                      onChange={(value) => updateField("eventId", value || null)}
                      options={[
                        { value: "", label: "No event yet" },
                        ...eventOptions.map((event) => ({
                          value: event.id,
                          label: `${event.title} — ${event.date}`,
                        })),
                      ]}
                    />
                  </Field>
                  {form.eventId ? (
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
              )}

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
                label="Event"
                value={
                  selectedEvent
                    ? `${selectedEvent.title} (${form.assignmentStatus ?? "confirmed"})`
                    : "None — link later from the event or vendor profile"
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
                    {selectedEventId
                      ? "Link the existing vendor to this event instead of creating a duplicate."
                      : "An existing vendor matched. Go back and choose an event, then link them."}
                  </p>
                  {selectedEventId ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={handleLinkExisting}
                      disabled={pending}
                    >
                      {pending ? "Linking..." : "Link existing vendor to event"}
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
                      Choose an event
                    </Button>
                  )}
                </div>
              ) : null}
              {createdVendorId && selectedEventId && !existingVendorId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRetryLink}
                  disabled={pending}
                >
                  {pending ? "Linking..." : "Retry linking to event"}
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
                {existingVendorId && selectedEventId ? (
                  <Button
                    type="button"
                    onClick={handleLinkExisting}
                    disabled={pending}
                  >
                    {pending ? "Linking..." : "Link existing vendor to event"}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={pending}>
                    {pending
                      ? "Saving..."
                      : selectedEventId
                        ? "Create & link to event"
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
