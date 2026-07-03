"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  BarChart3,
  CircleDollarSign,
  MapPin,
  Plus,
  Tag,
  Target,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { OpenFilledBadge } from "@/components/event-playbooks/OpenFilledBadge";
import {
  saveApprovedSquareImageAction,
  saveEventPlanningOverviewAction,
  saveEventPlanningQuickLinksAction,
  saveEventPlanningVendorsAction,
} from "@/lib/event-playbooks/planning-actions";
import {
  mergePlanningQuickLinks,
  PLANNING_QUICK_LINK_DEFINITIONS,
  type PlanningQuickLinkKey,
  type PlanningQuickLinksMap,
  type PlanningVendorEntry,
} from "@/lib/event-playbooks/planning-constants";
import { EVENT_TYPES } from "@/lib/playbooks/constants";
import { DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";

interface EventPlanningSettingsPanelProps {
  event: Event;
}

export function EventPlanningSettingsPanel({ event }: EventPlanningSettingsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goal, setGoal] = useState(event.goal ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [budget, setBudget] = useState(event.budget ?? "");
  const [audience, setAudience] = useState(event.audience ?? "");
  const [expectedAttendance, setExpectedAttendance] = useState(
    event.expectedAttendance ?? "",
  );
  const [eventType, setEventType] = useState<EventType>(
    event.eventType ?? DEFAULT_EVENT_TYPE,
  );

  const [quickLinks, setQuickLinks] = useState(() =>
    mergePlanningQuickLinks(event.planningQuickLinks),
  );
  const [vendors, setVendors] = useState<PlanningVendorEntry[]>(
    event.planningVendors.length ? event.planningVendors : [],
  );
  const [imageStatus, setImageStatus] = useState<"open" | "filled">(
    event.approvedSquareImageStatus,
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    event.approvedSquareImageUrl,
  );

  const vendorFilledCount = useMemo(
    () => vendors.filter((v) => v.status === "filled").length,
    [vendors],
  );

  function saveOverview() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveEventPlanningOverviewAction(event.id, {
        goal,
        location,
        budget,
        audience,
        expectedAttendance,
        eventType,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Event overview saved.");
      router.refresh();
    });
  }

  function saveQuickLinks(next: PlanningQuickLinksMap) {
    setQuickLinks(mergePlanningQuickLinks(next));
    startTransition(async () => {
      await saveEventPlanningQuickLinksAction(event.id, next);
      router.refresh();
    });
  }

  function saveVendors(next: PlanningVendorEntry[]) {
    setVendors(next);
    startTransition(async () => {
      await saveEventPlanningVendorsAction(event.id, next);
      router.refresh();
    });
  }

  function updateQuickLink(
    key: PlanningQuickLinkKey,
    patch: Partial<{ url: string; status: "open" | "filled" }>,
  ) {
    const next = { ...quickLinks, [key]: { ...quickLinks[key], ...patch } };
    saveQuickLinks(next);
  }

  function addVendor() {
    const next = [
      ...vendors,
      {
        id: crypto.randomUUID(),
        name: "",
        notes: "",
        status: "open" as const,
      },
    ];
    setVendors(next);
  }

  function updateVendor(id: string, patch: Partial<PlanningVendorEntry>) {
    setVendors((current) =>
      current.map((vendor) => (vendor.id === id ? { ...vendor, ...patch } : vendor)),
    );
  }

  function removeVendor(id: string) {
    const next = vendors.filter((vendor) => vendor.id !== id);
    saveVendors(next);
  }

  function commitVendors() {
    saveVendors(vendors.filter((v) => v.name.trim()));
  }

  async function handleImageUpload(file: File) {
    setError(null);
    const dataUrl = await readSquareImage(file);
    if (!dataUrl) {
      setError("Approved image must be square (1:1 aspect ratio).");
      return;
    }

    setImagePreview(dataUrl);
    setImageStatus("filled");
    startTransition(async () => {
      const result = await saveApprovedSquareImageAction(event.id, {
        imageDataUrl: dataUrl,
        status: "filled",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function clearImage() {
    setImagePreview(null);
    setImageStatus("open");
    startTransition(async () => {
      await saveApprovedSquareImageAction(event.id, {
        imageDataUrl: null,
        status: "open",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <p
          className={
            error
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-text"
          }
        >
          {error ?? message}
        </p>
      )}

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Event overview</CardTitle>
          <CardDescription>
            Fill in planning details shown on the Overview tab. Links can be wired later.
          </CardDescription>
        </CardHeader>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field icon={Target} label="Goal">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="Welcome families and start the school year strong."
              className={inputClass}
            />
          </Field>
          <Field icon={Users} label="Audience">
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="EES Families (K-5)"
              className={inputClass}
            />
          </Field>
          <Field icon={MapPin} label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="EES Cafeteria & Classrooms"
              className={inputClass}
            />
          </Field>
          <Field icon={BarChart3} label="Expected attendance">
            <input
              value={expectedAttendance}
              onChange={(e) => setExpectedAttendance(e.target.value)}
              placeholder="500+ families"
              className={inputClass}
            />
          </Field>
          <Field icon={CircleDollarSign} label="Budget">
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="$2,850 allocated"
              className={inputClass}
            />
          </Field>
          <Field icon={Tag} label="Event type">
            <Select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className={inputClass}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="button" className="mt-6" onClick={saveOverview} disabled={pending}>
          Save event overview
        </Button>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>
            Exact list from your planning mockup — add URLs now, link destinations later.
          </CardDescription>
        </CardHeader>

        <ul className="mt-6 space-y-3">
          {PLANNING_QUICK_LINK_DEFINITIONS.map(({ key, label, icon: Icon }) => {
            const entry = quickLinks[key];
            return (
              <li
                key={key}
                className="flex flex-col gap-3 border border-cos-border bg-cos-bg p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cos-card text-cos-muted">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cos-text">{label}</p>
                    <input
                      value={entry.url}
                      onChange={(e) =>
                        setQuickLinks((current) => ({
                          ...current,
                          [key]: { ...current[key], url: e.target.value },
                        }))
                      }
                      onBlur={() => saveQuickLinks(quickLinks)}
                      placeholder="Paste link (optional for now)"
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                </div>
                <OpenFilledBadge
                  status={entry.status}
                  onToggle={() =>
                    updateQuickLink(key, {
                      status: entry.status === "filled" ? "open" : "filled",
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Vendor list</CardTitle>
              <CardDescription>
                Add vendors for this event. Import from calendar review will connect here
                later.
              </CardDescription>
            </div>
            <OpenFilledBadge
              status={vendors.length > 0 && vendorFilledCount === vendors.length ? "filled" : "open"}
              readOnly
            />
          </div>
        </CardHeader>

        <ul className="mt-6 space-y-3">
          {vendors.map((vendor) => (
            <li
              key={vendor.id}
              className="grid gap-3 border border-cos-border bg-cos-bg p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <input
                value={vendor.name}
                onChange={(e) => updateVendor(vendor.id, { name: e.target.value })}
                placeholder="Vendor name"
                className={inputClass}
              />
              <input
                value={vendor.notes}
                onChange={(e) => updateVendor(vendor.id, { notes: e.target.value })}
                placeholder="Contact / notes"
                className={inputClass}
              />
              <OpenFilledBadge
                status={vendor.status}
                onToggle={() =>
                  updateVendor(vendor.id, {
                    status: vendor.status === "filled" ? "open" : "filled",
                  })
                }
              />
              <button
                type="button"
                onClick={() => removeVendor(vendor.id)}
                className="inline-flex items-center justify-center p-2 text-cos-muted hover:text-red-600"
                aria-label="Remove vendor"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={addVendor}>
            <Plus className="h-4 w-4" />
            Add vendor
          </Button>
          <Button type="button" size="sm" onClick={commitVendors} disabled={pending}>
            Save vendor list
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Approved 1:1 image</CardTitle>
              <CardDescription>
                Upload a square image only. Shown on overview once marked filled.
              </CardDescription>
            </div>
            <OpenFilledBadge status={imageStatus} readOnly />
          </div>
        </CardHeader>

        {imagePreview && imageStatus === "filled" ? (
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row">
            <div className="relative aspect-square w-full max-w-[220px] overflow-hidden border border-cos-border bg-cos-bg">
              <Image
                src={imagePreview}
                alt="Approved square artwork"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={clearImage}>
              Remove image
            </Button>
          </div>
        ) : (
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-cos-border bg-cos-bg px-6 py-10 text-center hover:bg-cos-card">
            <Upload className="h-6 w-6 text-cos-muted" />
            <span className="text-sm font-medium text-cos-text">Upload square image (1:1)</span>
            <span className="text-xs text-cos-muted">PNG or JPG · max 2 MB</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleImageUpload(file);
                }
              }}
            />
          </label>
        )}
      </Card>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-cos-text">
        <Icon className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:outline-none focus:ring-1 focus:ring-cos-border";

async function readSquareImage(file: File): Promise<string | null> {
  if (file.size > 2 * 1024 * 1024) {
    return null;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const isSquare = await new Promise<boolean>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth === img.naturalHeight);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });

  return isSquare ? dataUrl : null;
}
