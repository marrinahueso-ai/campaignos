import { cn } from "@/lib/utils/cn";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: "default" | "studio";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, variant = "default", ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium tracking-[0.12em] text-cos-muted uppercase"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-11 w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted/70 focus:border-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20 disabled:cursor-not-allowed disabled:opacity-50",
            variant === "studio" && "bg-white",
            error && "border-cos-error focus:border-cos-error focus:ring-cos-error/20",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-cos-muted">{hint}</p>}
        {error && <p className="text-xs text-cos-error-text">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
