import Link from "next/link";

/** Shared marketing footer — used by the homepage and Pricing. */
export function MarketingWowFooter() {
  return (
    <footer className="bg-cos-dark px-6 py-14 text-[#f6f2eb]/78 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl text-[#f6f2eb]">Hey Ralli</p>
          <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-cos-brand-sage uppercase">
            Organize · Create · Connect
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.14em] text-cos-brand-sage uppercase">
            Product
          </h4>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link href="/#tour" className="hover:text-[#f6f2eb]">
              Product tour
            </Link>
            <Link href="/why-hey-ralli" className="hover:text-[#f6f2eb]">
              Why Hey Ralli
            </Link>
            <Link href="/pricing" className="hover:text-[#f6f2eb]">
              Pricing
            </Link>
            <Link href="/resources" className="hover:text-[#f6f2eb]">
              Resources
            </Link>
            <Link href="/about" className="hover:text-[#f6f2eb]">
              About
            </Link>
            <Link href="/get-started" className="hover:text-[#f6f2eb]">
              Start organization
            </Link>
            <Link href="/login" className="hover:text-[#f6f2eb]">
              Log in
            </Link>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.14em] text-cos-brand-sage uppercase">
            Legal &amp; help
          </h4>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link href="/privacy" className="hover:text-[#f6f2eb]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#f6f2eb]">
              Terms
            </Link>
            <a href="mailto:hello@heyralli.com" className="hover:text-[#f6f2eb]">
              Contact · hello@heyralli.com
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-[#f6f2eb]/12 pt-6 text-xs text-[#f6f2eb]/50">
        © {new Date().getFullYear()} Hey Ralli
      </div>
    </footer>
  );
}
