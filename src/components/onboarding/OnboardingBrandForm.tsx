"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveOnboardingBrandAction,
  skipOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";

export type OnboardingBrandKitLogo = {
  id: string;
  label: string;
  category: "pto_logo" | "school_logo" | "other";
  url: string;
};

type ExtraLogoDraft = {
  key: string;
  category: "pto_logo" | "school_logo" | "other";
  label: string;
  previewUrl: string | null;
};

interface OnboardingBrandFormProps {
  initialPrimary: string;
  initialSecondary: string;
  initialMascot: string;
  initialPtoLogo: string | null;
  initialSchoolLogo: string | null;
  initialExtraLogos: OnboardingBrandKitLogo[];
}

function LogoThumb({
  url,
  alt,
  className = "h-14 w-14",
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const resolved = resolveAssetImageUrl(url) ?? url;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={`${className} rounded-lg border border-cos-border bg-white object-contain p-1`}
    />
  );
}

export function OnboardingBrandForm({
  initialPrimary,
  initialSecondary,
  initialMascot,
  initialPtoLogo,
  initialSchoolLogo,
  initialExtraLogos,
}: OnboardingBrandFormProps) {
  const router = useRouter();
  const formId = useId();
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [mascot, setMascot] = useState(initialMascot);
  const [ptoLogoUrl, setPtoLogoUrl] = useState(initialPtoLogo);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(initialSchoolLogo);
  const [extraLogos, setExtraLogos] = useState(initialExtraLogos);
  const [ptoPreview, setPtoPreview] = useState<string | null>(null);
  const [schoolPreview, setSchoolPreview] = useState<string | null>(null);
  const [extraDrafts, setExtraDrafts] = useState<ExtraLogoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPtoLogoUrl(initialPtoLogo);
    setSchoolLogoUrl(initialSchoolLogo);
    setExtraLogos(initialExtraLogos);
  }, [initialPtoLogo, initialSchoolLogo, initialExtraLogos]);

  useEffect(() => {
    return () => {
      if (ptoPreview) URL.revokeObjectURL(ptoPreview);
    };
  }, [ptoPreview]);

  useEffect(() => {
    return () => {
      if (schoolPreview) URL.revokeObjectURL(schoolPreview);
    };
  }, [schoolPreview]);

  const displayPto = ptoPreview ?? ptoLogoUrl;
  const displaySchool = schoolPreview ?? schoolLogoUrl;

  function onPrimaryFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "pto" | "school",
  ) {
    const file = event.target.files?.[0] ?? null;
    const nextUrl = file ? URL.createObjectURL(file) : null;
    if (kind === "pto") {
      if (ptoPreview) URL.revokeObjectURL(ptoPreview);
      setPtoPreview(nextUrl);
    } else {
      if (schoolPreview) URL.revokeObjectURL(schoolPreview);
      setSchoolPreview(nextUrl);
    }
    setSuccess(false);
  }

  function addExtraLogoRow() {
    setExtraDrafts((rows) => [
      ...rows,
      {
        key: `${formId}-${rows.length}-${Date.now()}`,
        category: "other",
        label: "",
        previewUrl: null,
      },
    ]);
    setSuccess(false);
  }

  function removeExtraLogoRow(key: string) {
    setExtraDrafts((rows) => {
      const target = rows.find((row) => row.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return rows.filter((row) => row.key !== key);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <OnboardingProgress current="brand" />
      <div>
        <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
          Build your brand kit
        </h1>
        <p className="mt-2 text-sm text-cos-muted">
          Logos, colors, and mascot — skip anytime and come back from Get
          started.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              setError(null);
              setSuccess(false);
              const result = await saveOnboardingBrandAction(formData);
              if (result?.error) {
                setError(result.error);
                if (result.ptoLogoUrl) setPtoLogoUrl(result.ptoLogoUrl);
                if (result.schoolLogoUrl) setSchoolLogoUrl(result.schoolLogoUrl);
                return;
              }
              if (result?.success) {
                if (result.ptoLogoUrl) setPtoLogoUrl(result.ptoLogoUrl);
                if (result.schoolLogoUrl) setSchoolLogoUrl(result.schoolLogoUrl);
                if (result.extraLogos?.length) {
                  setExtraLogos((prev) => {
                    const seen = new Set(prev.map((item) => item.id));
                    const merged = [...prev];
                    for (const item of result.extraLogos) {
                      if (seen.has(item.id)) continue;
                      merged.push(item);
                      seen.add(item.id);
                    }
                    return merged;
                  });
                }
                if (ptoPreview) {
                  URL.revokeObjectURL(ptoPreview);
                  setPtoPreview(null);
                }
                if (schoolPreview) {
                  URL.revokeObjectURL(schoolPreview);
                  setSchoolPreview(null);
                }
                for (const draft of extraDrafts) {
                  if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
                }
                setExtraDrafts([]);
                setSuccess(true);
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-3">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="ptoLogo"
              >
                PTO logo
              </label>
              <Input
                id="ptoLogo"
                name="ptoLogo"
                type="file"
                accept="image/*"
                onChange={(event) => onPrimaryFileChange(event, "pto")}
              />
              {displayPto ? (
                <div className="mt-2 flex items-center gap-3">
                  <LogoThumb url={displayPto} alt="PTO logo preview" />
                  <p className="text-xs text-cos-muted">
                    {ptoPreview ? "Ready to save" : "Saved"}
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="schoolLogo"
              >
                School logo
              </label>
              <Input
                id="schoolLogo"
                name="schoolLogo"
                type="file"
                accept="image/*"
                onChange={(event) => onPrimaryFileChange(event, "school")}
              />
              {displaySchool ? (
                <div className="mt-2 flex items-center gap-3">
                  <LogoThumb url={displaySchool} alt="School logo preview" />
                  <p className="text-xs text-cos-muted">
                    {schoolPreview ? "Ready to save" : "Saved"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {extraLogos.length > 0 ? (
            <div>
              <p className="mb-1.5 text-sm font-medium">Additional logos</p>
              <ul className="flex flex-wrap gap-3">
                {extraLogos.map((logo) => (
                  <li key={logo.id} className="space-y-1">
                    <LogoThumb url={logo.url} alt={logo.label} />
                    <p className="max-w-[4.5rem] truncate text-[11px] text-cos-muted">
                      {logo.label}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {extraDrafts.map((draft, index) => (
            <div
              key={draft.key}
              className="space-y-2 rounded-xl border border-cos-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Another logo</p>
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => removeExtraLogoRow(draft.key)}
                >
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="mb-1 block text-xs text-cos-muted"
                    htmlFor={`extra-cat-${draft.key}`}
                  >
                    Category
                  </label>
                  <select
                    id={`extra-cat-${draft.key}`}
                    name="extraLogoCategory"
                    value={draft.category}
                    onChange={(event) =>
                      setExtraDrafts((rows) =>
                        rows.map((row) =>
                          row.key === draft.key
                            ? {
                                ...row,
                                category: event.target
                                  .value as ExtraLogoDraft["category"],
                              }
                            : row,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-2 text-sm text-cos-text"
                  >
                    <option value="pto_logo">PTO logo</option>
                    <option value="school_logo">School logo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs text-cos-muted"
                    htmlFor={`extra-label-${draft.key}`}
                  >
                    Label
                  </label>
                  <Input
                    id={`extra-label-${draft.key}`}
                    name="extraLogoLabel"
                    value={draft.label}
                    onChange={(event) =>
                      setExtraDrafts((rows) =>
                        rows.map((row) =>
                          row.key === draft.key
                            ? { ...row, label: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="e.g. Spirit mark"
                  />
                </div>
              </div>
              <Input
                name="extraLogo"
                type="file"
                accept="image/*"
                required
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setExtraDrafts((rows) =>
                    rows.map((row) => {
                      if (row.key !== draft.key) return row;
                      if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
                      return {
                        ...row,
                        previewUrl: file ? URL.createObjectURL(file) : null,
                      };
                    }),
                  );
                }}
              />
              {draft.previewUrl ? (
                <LogoThumb
                  url={draft.previewUrl}
                  alt={`Additional logo ${index + 1}`}
                />
              ) : null}
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addExtraLogoRow}
            disabled={isPending}
          >
            Add another logo
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="primaryColor"
              >
                Primary
              </label>
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="secondaryColor"
              >
                Accent
              </label>
              <Input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="mascot">
              Mascot
            </label>
            <Input
              id="mascot"
              name="mascot"
              value={mascot}
              onChange={(event) => setMascot(event.target.value)}
              placeholder="e.g. Eagles"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-emerald-800" role="status">
              Brand saved. Your logos are ready — continue when you are.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {success ? (
              <Button type="button" href="/onboarding/invite">
                Continue
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await skipOnboardingPromptAction("brand");
                })
              }
            >
              Skip for now
            </Button>
          </div>
        </form>

        <div
          className="overflow-hidden rounded-2xl border border-cos-border p-6"
          style={{
            background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          <div className="rounded-xl bg-white/95 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Live preview
            </p>
            {(displayPto || displaySchool || extraLogos.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {displayPto ? (
                  <LogoThumb
                    url={displayPto}
                    alt="PTO logo"
                    className="h-12 w-12"
                  />
                ) : null}
                {displaySchool ? (
                  <LogoThumb
                    url={displaySchool}
                    alt="School logo"
                    className="h-12 w-12"
                  />
                ) : null}
                {extraLogos.slice(0, 4).map((logo) => (
                  <LogoThumb
                    key={logo.id}
                    url={logo.url}
                    alt={logo.label}
                    className="h-12 w-12"
                  />
                ))}
              </div>
            )}
            <p className="font-display mt-2 text-2xl text-cos-text">
              {mascot.trim() || "Your mascot"}
            </p>
            <p className="mt-2 text-sm text-cos-muted">
              Campaign artwork and posts will pick up these logos and colors.
            </p>
            <div className="mt-4 flex gap-2">
              <span
                className="h-8 w-8 rounded-full border border-cos-border"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="h-8 w-8 rounded-full border border-cos-border"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
