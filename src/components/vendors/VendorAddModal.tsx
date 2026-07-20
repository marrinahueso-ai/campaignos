"use client";

import { useMemo, useState, useTransition } from "react";
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
  assignmentStatus: "pending",
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
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories],
  );

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
    onClose();
  }

  function handleSubmit() {
    setError(null);
    setExistingVendorId(null);
    startTransition(async () => {
      const result = await createVendorAction(form);
      if (!result.success || !result.vendorId) {
        setError(result.error ?? "Unable to create vendor.");
        setExistingVendorId(result.existingVendorId ?? null);
        return;
      }
      onCreated?.(result.vendorId);
      resetAndClose();
    });
  }

  function handleLinkExisting() {
    const eventId = form.eventId ?? defaultEventId ?? null;
    if (!existingVendorId) {
      setError(
        "Could not identify the existing vendor to link. Close and use Add Existing, or change the email.",
      );
      return;
    }
    if (!eventId) {
      setError(
        "No event selected to link this vendor to. Go back and choose an event.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await assignVendorToEventAction(
          existingVendorId,
          eventId,
          form.assignmentStatus ?? "pending",
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
              <Field label="Connect to event (optional)">
                <VendorFieldSelect
                  value={form.eventId ?? ""}
                  onChange={(value) => updateField("eventId", value || null)}
                  options={[
                    { value: "", label: "No event yet" },
                    ...events.map((event) => ({
                      value: event.id,
                      label: `${event.title} — ${event.date}`,
                    })),
                  ]}
                />
              </Field>
              {form.eventId && (
                <Field label="Assignment status">
                  <VendorFieldSelect
                    value={form.assignmentStatus ?? "pending"}
                    onChange={(value) =>
                      updateField("assignmentStatus", value as VendorAssignmentStatus)
                    }
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "confirmed", label: "Confirmed" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />
                </Field>
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
                  events.find(
                    (event) =>
                      event.id === (form.eventId ?? defaultEventId ?? ""),
                  )?.title ?? "None"
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
                    {(form.eventId ?? defaultEventId)
                      ? "Link the existing vendor to this event instead of creating a duplicate."
                      : "An existing vendor matched. Go back and choose an event, then link them."}
                  </p>
                  {(form.eventId ?? defaultEventId) ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={handleLinkExisting}
                      disabled={pending}
                    >
                      {pending ? "Linking..." : "Link existing vendor to event"}
                    </Button>
                  ) : null}
                </div>
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
                {existingVendorId && (form.eventId ?? defaultEventId) ? (
                  <Button
                    type="button"
                    onClick={handleLinkExisting}
                    disabled={pending}
                  >
                    {pending ? "Linking..." : "Link existing vendor to event"}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={pending}>
                    {pending ? "Saving..." : "Create Vendor"}
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
