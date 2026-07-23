import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ProductStorySectionProps {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  benefits: readonly string[];
  visual: ReactNode;
  /** When true, visual appears on the left on desktop. */
  reverse?: boolean;
}

export function ProductStorySection({
  id,
  eyebrow,
  heading,
  body,
  benefits,
  visual,
  reverse = false,
}: ProductStorySectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-cos-border py-16 sm:py-20 lg:py-24"
    >
      <div
        className={cn(
          "mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-14 lg:px-10",
          reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div className="max-w-xl">
          <p className="studio-eyebrow">{eyebrow}</p>
          <h2 className="font-display mt-3 text-3xl leading-tight text-cos-text sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-cos-muted sm:text-lg">
            {body}
          </p>
          <ul className="mt-6 space-y-2.5">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-3 text-sm leading-relaxed text-cos-text sm:text-base"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cos-brand-sage"
                  aria-hidden
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">{visual}</div>
      </div>
    </section>
  );
}
