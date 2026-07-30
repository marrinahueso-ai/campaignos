import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Send,
  User,
} from "lucide-react";

const STEPS = [
  {
    icon: Send,
    title: "Someone on your team sends it",
    description: "A campaign is ready for review",
  },
  {
    icon: User,
    title: "It lands with an approver",
    description: "We’ll email them and show a badge on Approvals",
  },
  {
    icon: CheckCircle2,
    title: "Review & approve",
    description: "Approve, or request changes with a note",
  },
  {
    icon: Calendar,
    title: "Scheduled or sent",
    description: "It goes live on your Page or arrives as a post kit",
  },
  {
    icon: CheckCircle2,
    title: "Live & complete",
    description: "See how it performed in Insights",
  },
];

export function ApprovalFlowGuide() {
  return (
    <section className="rounded-[22px] border border-cos-border bg-cos-card/80 px-6 py-6">
      <h2 className="font-display text-2xl text-cos-text">How approvals work</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cos-border bg-[#f6f2eb]">
                <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-cos-text">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-cos-muted">
                  {step.description}
                </p>
              </div>
              {index < STEPS.length - 1 ? (
                <ChevronRight
                  className="absolute -right-2 top-3 hidden h-4 w-4 text-cos-muted lg:block"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
