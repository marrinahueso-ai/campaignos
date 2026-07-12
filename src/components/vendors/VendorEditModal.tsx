"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { VendorFieldSelect } from "@/components/vendors/VendorFieldSelect";
import { Textarea } from "@/components/ui/Textarea";
import { updateVendorAction } from "@/lib/vendors/actions";
import type { UpdateVendorInput, Vendor, VendorCategory } from "@/types/vendors";

interface VendorEditModalProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  categories: VendorCategory[];
  onSaved?: () => void;
}

export function VendorEditModal({
  open,
  onClose,
  vendor,
  categories,
  onSaved,
}: VendorEditModalProps) {
  const [form, setForm] = useState<UpdateVendorInput>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open || !vendor) {
    return null;
  }

  const values: Required<Pick<UpdateVendorInput, "name">> & UpdateVendorInput = {
    name: form.name ?? vendor.name,
    website: form.website ?? vendor.website,
    email: form.email ?? vendor.email,
    phone: form.phone ?? vendor.phone,
    addressLine1: form.addressLine1 ?? vendor.addressLine1,
    city: form.city ?? vendor.city,
    state: form.state ?? vendor.state,
    postalCode: form.postalCode ?? vendor.postalCode,
    categoryId: form.categoryId ?? vendor.categoryId,
    status: form.status ?? vendor.status,
    notesSummary: form.notesSummary ?? vendor.notesSummary,
  };

  function updateField<K extends keyof UpdateVendorInput>(
    key: K,
    value: UpdateVendorInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!vendor) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateVendorAction(vendor.id, values);
      if (!result.success) {
        setError(result.error ?? "Unable to update vendor.");
        return;
      }
      onSaved?.();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border border-cos-border bg-cos-card shadow-2xl"
      >
        <div className="border-b border-cos-border px-6 py-4">
          <h2 className="font-display text-2xl text-cos-text">Edit Vendor</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Vendor name" required>
            <Input
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </Field>
          <Field label="Category">
            <VendorFieldSelect
              value={values.categoryId ?? ""}
              onChange={(value) => updateField("categoryId", value || null)}
              options={[
                { value: "", label: "Select category" },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website">
              <Input
                value={values.website ?? ""}
                onChange={(event) => updateField("website", event.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={values.phone ?? ""}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Email">
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input
              value={values.addressLine1 ?? ""}
              onChange={(event) => updateField("addressLine1", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <Input
                value={values.city ?? ""}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </Field>
            <Field label="State">
              <Input
                value={values.state ?? ""}
                onChange={(event) => updateField("state", event.target.value)}
              />
            </Field>
            <Field label="ZIP">
              <Input
                value={values.postalCode ?? ""}
                onChange={(event) => updateField("postalCode", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Status">
            <VendorFieldSelect
              value={values.status ?? "active"}
              onChange={(value) =>
                updateField("status", value as Vendor["status"])
              }
              options={[
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending" },
                { value: "blocked", label: "Blocked" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </Field>
          <Field label="Notes summary">
            <Textarea
              value={values.notesSummary ?? ""}
              onChange={(event) => updateField("notesSummary", event.target.value)}
              rows={3}
            />
          </Field>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-cos-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
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
