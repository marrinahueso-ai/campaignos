import { CREATE_WITH_AI_MODULES } from "@/lib/marketing/features-in-action";

/**
 * Public Features band — Create with AI chooser modules (Home Page · Social · Newsletter).
 * Copy-only; Motion demo for Social Media campaigns follows in the next story.
 */
export function CreateWithAiModulesSection() {
  return (
    <section
      id="create-with-ai-modules"
      aria-labelledby="create-with-ai-modules-heading"
      className="scroll-mt-24 border-b border-cos-border bg-cos-bg-alt/40 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="studio-eyebrow">Create with AI</p>
        <h2
          id="create-with-ai-modules-heading"
          className="font-display mt-3 max-w-3xl text-3xl leading-tight text-cos-text sm:text-4xl"
        >
          Three ways to create from the events you already planned.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-cos-muted sm:text-lg">
          Open Create with AI and choose Home Page, Social Media, or Newsletter.
          Each composer stays tied to your school calendar — no separate side
          projects, no vaporware placeholders.
        </p>

        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {CREATE_WITH_AI_MODULES.map((module) => (
            <li
              key={module.id}
              className="flex flex-col border border-cos-border bg-cos-bg px-6 py-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cos-brand-sage">
                {module.title}
              </p>
              <p className="mt-3 text-base leading-relaxed text-cos-text">
                {module.summary}
              </p>
              <ul className="mt-5 space-y-2.5 border-t border-cos-border pt-5">
                {module.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex gap-3 text-sm leading-relaxed text-cos-muted"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cos-brand-mustard"
                      aria-hidden
                    />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
