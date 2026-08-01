import Link from "next/link";

import { HelpAskRalli } from "@/components/help-center/HelpAskRalli";
import {
  HELP_ARTICLES,
  HELP_SUPPORT_EMAIL,
  type HelpArticle,
} from "@/lib/help-center/articles";

function ArticleCard({ article }: { article: HelpArticle }) {
  return (
    <article
      id={article.id}
      className="scroll-mt-28 border border-cos-border bg-cos-card px-5 py-5 sm:px-6 sm:py-6"
    >
      <h2 className="font-display text-xl text-cos-text sm:text-2xl">
        {article.title}
      </h2>
      <p className="mt-1.5 text-sm text-cos-muted">{article.summary}</p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-cos-text">
        {article.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {article.links.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="border border-cos-border bg-cos-bg-alt px-3 py-1.5 text-xs font-semibold text-cos-text transition hover:border-cos-brand-sage hover:bg-white"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function HelpCenter() {
  return (
    <div className="studio-page space-y-8 pb-12">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-cos-muted">
          Help
        </p>
        <h1 className="mt-1 font-display text-3xl text-cos-text sm:text-4xl">
          Help Center
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted sm:text-base">
          Short how-tos for getting set up, creating posts, approvals, and
          billing. Still stuck? Email us — we usually reply within two business
          days.
        </p>
      </header>

      <nav aria-label="Help topics" className="flex flex-wrap gap-2">
        {HELP_ARTICLES.map((article) => (
          <a
            key={article.id}
            href={`#${article.id}`}
            className="border border-cos-border bg-cos-card px-3 py-1.5 text-xs font-medium text-cos-muted transition hover:border-cos-border hover:text-cos-text"
          >
            {article.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-4">
        {HELP_ARTICLES.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      <HelpAskRalli />

      <section className="border border-cos-border bg-cos-bg-alt px-5 py-5 sm:px-6">
        <h2 className="font-display text-xl text-cos-text">Contact support</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cos-muted">
          For account, billing, or something that looks broken, email{" "}
          <a
            href={`mailto:${HELP_SUPPORT_EMAIL}?subject=Hey%20Ralli%20help`}
            className="font-semibold text-cos-text underline decoration-cos-border underline-offset-2 hover:decoration-cos-text"
          >
            {HELP_SUPPORT_EMAIL}
          </a>
          . Include your school name and what you were trying to do.
        </p>
      </section>
    </div>
  );
}
