"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  updateOrganizationProfileAction,
  type OrganizationProfileFormState,
} from "@/lib/organizations/profile-actions";
import { COMMON_US_TIMEZONES } from "@/types/posting-preferences";
import type { Organization } from "@/types";

const initialState: OrganizationProfileFormState = {
  error: null,
  success: false,
};

interface OrganizationProfileFormProps {
  organization: Organization;
}

export function OrganizationProfileForm({
  organization,
}: OrganizationProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrganizationProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Profile saved.
        </p>
      ) : null}

      <Input
        name="name"
        label="School Name"
        defaultValue={organization.name}
        required
      />
      <Select
        name="timezone"
        label="Organization timezone"
        defaultValue={organization.timezone || "America/Chicago"}
        required
      >
        {COMMON_US_TIMEZONES.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
      <p className="-mt-2 text-xs text-cos-muted">
        Required for posting schedule heatmaps and suggested publish times.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          name="district"
          label="District"
          defaultValue={organization.district ?? ""}
        />
        <Input
          name="schoolYear"
          label="School Year"
          defaultValue={organization.schoolYear ?? ""}
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          name="weatherCity"
          label="Weather city"
          defaultValue={organization.weatherCity ?? ""}
          placeholder="Franklin"
        />
        <Input
          name="weatherState"
          label="Weather state"
          defaultValue={organization.weatherState ?? ""}
          placeholder="TN"
        />
      </div>
      <p className="-mt-2 text-xs text-cos-muted">
        Used for live weather on the Dashboard. Prefer City + State (e.g. Franklin,
        TN) so forecasts match your school.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          name="principal"
          label="Principal"
          defaultValue={organization.principal ?? ""}
        />
        <Input
          name="mascot"
          label="Mascot"
          defaultValue={organization.mascot ?? ""}
        />
      </div>
      <Input
        name="schoolWebsite"
        label="School Website"
        type="url"
        defaultValue={organization.schoolWebsite ?? ""}
      />
      <Input
        name="ptoWebsite"
        label="PTO Website"
        type="url"
        defaultValue={organization.ptoWebsite ?? ""}
      />

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save profile"}
        </Button>
        <Button href="/settings/organization" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
