import { cn } from "@/lib/utils/cn";
import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? props.name ?? (label ? generatedId : undefined);

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium tracking-[0.12em] text-cos-muted uppercase"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "flex min-h-24 w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted/70 focus:border-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20 disabled:cursor-not-allowed disabled:opacity-50",
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

Textarea.displayName = "Textarea";
