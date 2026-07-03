import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  target?: string;
  rel?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cos-primary text-[#f6f2eb] hover:bg-cos-primary-hover focus-visible:ring-cos-primary",
  secondary:
    "border border-cos-border bg-cos-card text-cos-text hover:bg-cos-bg focus-visible:ring-cos-muted",
  tertiary:
    "text-cos-muted hover:text-cos-text focus-visible:ring-cos-muted",
  ghost:
    "text-cos-muted hover:bg-cos-bg hover:text-cos-text focus-visible:ring-cos-muted",
  danger:
    "bg-cos-error text-white hover:bg-cos-error-text focus-visible:ring-cos-error",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      href,
      target,
      rel,
      children,
      ...props
    },
    ref,
  ) => {
    const styles = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg disabled:pointer-events-none disabled:opacity-50",
      variantStyles[variant],
      sizeStyles[size],
      className,
    );

    if (href) {
      if (href.startsWith("/api/")) {
        return (
          <a href={href} className={styles} target={target} rel={rel}>
            {children}
          </a>
        );
      }

      return (
        <Link href={href} className={styles} target={target} rel={rel}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} type={type} className={styles} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
