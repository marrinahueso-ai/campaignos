import { cn } from "@/lib/utils/cn";

interface VendorFieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function VendorFieldSelect({
  value,
  onChange,
  options,
  className,
}: VendorFieldSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-dark",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
