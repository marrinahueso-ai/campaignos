import { Calendar, CheckCircle2, Flag, Send, User } from "lucide-react";

const STEPS = [
  {
    icon: Send,
    title: "Someone on your team sends it",
    description: "A campaign is ready for review",
    complete: false,
  },
  {
    icon: User,
    title: "It lands with an approver",
    description: "We’ll email them and show a badge on Approvals",
    complete: false,
  },
  {
    icon: CheckCircle2,
    title: "Review & approve",
    description: "Approve, or request changes with a note",
    complete: false,
    emphasize: true,
  },
  {
    icon: Calendar,
    title: "Scheduled or sent",
    description: "It goes live on your Page or arrives as a post kit",
    complete: false,
  },
  {
    icon: CheckCircle2,
    title: "Live & complete",
    description: "See how it performed in Insights",
    complete: true,
  },
];

export function ApprovalFlowGuide() {
  return (
    <section className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-7 shadow-[0_8px_28px_rgba(28,36,48,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-cos-text italic">
          How approvals work
        </h2>
        <a
          href="mailto:hello@heyralli.com?subject=Approvals%20feedback"
          className="inline-flex items-center gap-1.5 rounded-full border border-cos-border bg-[#f6f2eb] px-3 py-1.5 text-xs font-bold text-cos-muted transition hover:border-[#6b8171] hover:text-cos-text"
        >
          <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
          Report a Problem
        </a>
      </div>

      <ol className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
        <div
          className="pointer-events-none absolute top-5 right-8 left-8 hidden border-t border-dashed border-cos-border lg:block"
          aria-hidden
        />
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative z-[1] flex flex-col items-start gap-3">
              <div
                className={
                  step.complete
                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#2f4a3c] text-[#fffcf7]"
                    : "flex h-10 w-10 items-center justify-center rounded-full border border-cos-border bg-[#f6f2eb] text-cos-text"
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-bold text-cos-text">{step.title}</p>
                <p
                  className={
                    step.emphasize
                      ? "mt-1 text-xs leading-relaxed font-semibold text-cos-text"
                      : "mt-1 text-xs leading-relaxed text-cos-muted"
                  }
                >
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
