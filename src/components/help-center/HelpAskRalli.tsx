import Link from "next/link";

/** Note on Help Center — Ask Ralli opens from the top-rail ?, not the sidebar. */
export function HelpAskRalli() {
  return (
    <section className="border border-cos-border bg-cos-card px-5 py-5 sm:px-6">
      <h2 className="font-display text-xl text-cos-text">Ask Ralli</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-cos-muted">
        Prefer chat? Use the{" "}
        <span className="font-semibold text-cos-text">?</span> button in the top
        bar to ask what’s next, draft a reminder, or get a how-to — without
        leaving your page. Or stay here and browse the articles above.
      </p>
      <p className="mt-3 text-sm">
        <Link
          href="/dashboard"
          className="font-semibold text-cos-text underline decoration-cos-border underline-offset-2 hover:decoration-cos-text"
        >
          Back to Dashboard →
        </Link>
      </p>
    </section>
  );
}
