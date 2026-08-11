import Link from "next/link";

export const metadata = {
  title: "Choose a newsletter template",
};

export default function NewsletterTemplateSelectionPage() {
  return (
    <div className="studio-page space-y-12 pb-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.02em] text-cos-text">
          Choose a starting point
        </h1>
        <p className="mt-3 text-lg text-cos-muted">
          Select a template to open the newsletter builder. You can customize everything once
          you&apos;re inside.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/newsletter-composer?template=standard-school-update"
          className="group block rounded-[22px] border-2 border-cos-border bg-cos-card p-4 transition hover:-translate-y-0.5 hover:border-[#0d7e5e] hover:shadow-[0_12px_32px_rgba(28,36,48,0.1)]"
        >
          <div className="relative mb-6 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-cos-border bg-gradient-to-br from-[#e8eee9] to-[#f4f1ea]">
            <div className="px-6 text-center">
              <p className="font-display text-2xl font-semibold text-cos-text">School Update</p>
              <p className="mt-2 text-sm text-cos-muted">
                Message · Events · Upcoming · Volunteers · Sponsors
              </p>
            </div>
            <span className="absolute inset-0 flex items-center justify-center bg-[#0d7e5e]/0 opacity-0 transition group-hover:bg-[#0d7e5e]/10 group-hover:opacity-100">
              <span className="translate-y-2 rounded-full bg-[#0d7e5e] px-5 py-2.5 text-sm font-bold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                Select Template
              </span>
            </span>
          </div>
          <div className="px-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold text-cos-text">
                Standard School Update
              </h2>
              <span className="rounded bg-[#e6f3ee] px-2 py-1 text-[10px] font-extrabold tracking-widest text-[#0d7e5e] uppercase">
                Popular
              </span>
            </div>
            <p className="text-sm leading-relaxed text-cos-muted">
              Perfect for weekly updates — principal&apos;s message, upcoming dates, and classroom
              news. Opens the same block builder.
            </p>
          </div>
        </Link>

        <div className="rounded-[22px] border-2 border-dashed border-cos-border bg-white/50 p-4 opacity-70">
          <div className="mb-6 flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-cos-border bg-cos-bg">
            <span className="text-sm font-medium text-cos-muted/70">Coming soon</span>
          </div>
          <div className="px-1">
            <h2 className="mb-2 font-display text-2xl font-semibold text-cos-muted/70">
              Fundraiser Gala
            </h2>
            <p className="text-sm text-cos-muted/50">
              A layout designed for ticketed events and RSVPs.
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border-2 border-dashed border-cos-border bg-white/50 p-4 opacity-70">
          <div className="mb-6 flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-cos-border bg-cos-bg">
            <span className="text-sm font-medium text-cos-muted/70">Coming soon</span>
          </div>
          <div className="px-1">
            <h2 className="mb-2 font-display text-2xl font-semibold text-cos-muted/70">
              Semester Highlights
            </h2>
            <p className="text-sm text-cos-muted/50">
              Visual-first layout to celebrate school activities.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/newsletters"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Back to My Library
        </Link>
      </div>
    </div>
  );
}
