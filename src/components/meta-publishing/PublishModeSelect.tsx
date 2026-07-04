"use client";

import { Select } from "@/components/ui/Select";
import {
  PUBLISH_MODE_OPTIONS,
  type MetaPublishMode,
} from "@/lib/meta-publishing/publish-mode";

interface PublishModeSelectProps {
  value: MetaPublishMode;
  onChange: (mode: MetaPublishMode) => void;
  disabled?: boolean;
}

export function PublishModeSelect({
  value,
  onChange,
  disabled = false,
}: PublishModeSelectProps) {
  const selected = PUBLISH_MODE_OPTIONS.find((option) => option.value === value);

  return (
    <div className="space-y-1.5">
      <Select
        label="Publish mode"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as MetaPublishMode)}
      >
        {PUBLISH_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {selected && (
        <p className="text-xs text-cos-muted">{selected.description}</p>
      )}
    </div>
  );
}
