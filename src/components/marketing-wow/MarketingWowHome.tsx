import Link from "next/link";
import { MarketingCookieConsent } from "@/components/marketing-wow/MarketingCookieConsent";
import { MarketingWowFloatingNav } from "@/components/marketing-wow/MarketingWowFloatingNav";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import "./marketing-wow.css";

interface MarketingWowHomeProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

export function MarketingWowHome({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowHomeProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;

  return (
    <div className="mw">
      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/home-hero.png" alt="" />
          <div className="hero-veil" />
          <div className="hero-grain" />
        </div>

        <div className="m-nav">
          <div
            aria-hidden="true"
            style={{ width: 1, height: 1, overflow: "hidden" }}
          >
            nav
          </div>
          <nav className="m-nav-links" aria-label="Marketing">
            <a href="#tour">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#invite">Invite</a>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <div className="m-nav-actions">
            {isSignedIn ? (
              <Link href={workspaceHref} className="btn btn-ghost-light">
                {needsSchoolSetup ? "Continue setup" : "Enter workspace"}
              </Link>
            ) : (
              <Link href="/login" className="btn btn-ghost-light">
                Log in
              </Link>
            )}
          </div>
        </div>

        <div className="hero-inner">
          <p className="hero-brand">
            Hey <span>Ralli</span>
          </p>
          <h1 className="hero-headline">
            School communications, finally calm.
          </h1>
          <p className="hero-support">
            Plan the year, create with AI, approve &amp; schedule social, rally
            volunteers — one workspace for PTA teams who are done with chaos.
          </p>
          <div className="hero-ctas">
            <Link
              href={needsSchoolSetup ? workspaceHref : "/signup"}
              className="btn btn-primary"
            >
              Start your organization
            </Link>
            <Link href="/login" className="btn btn-ghost-light">
              Log in
            </Link>
          </div>
        </div>
      </header>

      <section className="section tour" id="tour">
        <div className="section-inner">
          <p className="section-kicker">Product tour</p>
          <h2 className="section-title">
            Built for the people who make school feel like home.
          </h2>
          <p className="section-lead">
            Not another parent Facebook group. A quiet ops studio for events,
            approvals, calendar, volunteers, vendors, and Meta — so your
            community hears the right thing at the right time.
          </p>

          <div className="tour-grid">
            <div className="tour-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/fall-festival-campaign.png"
                alt="Fall festival campaign artwork created in Hey Ralli"
              />
            </div>
            <ol className="tour-list">
              <li>
                <strong>Create with AI</strong>
                <p>
                  Home Page HTML, family newsletters, and social campaigns —
                  artwork and copy that sound like your school, ready for human
                  approval.
                </p>
              </li>
              <li>
                <strong>Approve &amp; schedule</strong>
                <p>
                  Clear ownership before anything goes live on Facebook or
                  Instagram.
                </p>
              </li>
              <li>
                <strong>Calendar, volunteers, vendors</strong>
                <p>
                  The whole year in view — who is covering what, and what still
                  needs a hand.
                </p>
              </li>
              <li>
                <strong>Ask Ralli</strong>
                <p>
                  An ops coach that knows your events, milestones, and what to do
                  next today.
                </p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section promise">
        <div className="section-inner">
          <p className="section-kicker">The feeling</p>
          <h2 className="section-title">
            This is the future of school communications.
          </h2>
          <p className="section-lead">
            Fewer frantic group chats. Fewer late posts. More parents who show up
            knowing exactly what’s happening — because your team had a calm place
            to decide.
          </p>
          <span className="promise-rule" aria-hidden="true" />
        </div>
      </section>

      <section className="section pricing" id="pricing">
        <div className="section-inner">
          <p className="section-kicker">Pricing</p>
          <h2 className="section-title">Plans that fit real PTA budgets.</h2>
          <p className="section-lead">
            14-day trial with AI credits included. No corporate contracts.
            Upgrade when the year gets bigger.
          </p>
          <div className="pricing-row">
            <article className="plan">
              <h3>Starter</h3>
              <p className="price">
                $49<span>/mo</span>
              </p>
              <p>Essentials for smaller teams getting organized.</p>
            </article>
            <article className="plan featured">
              <h3>Professional</h3>
              <p className="price">
                $79<span>/mo</span>
              </p>
              <p>More capacity and assistants for active PTOs.</p>
            </article>
            <article className="plan">
              <h3>Premium</h3>
              <p className="price">
                $129<span>/mo</span>
              </p>
              <p>Best for most schools — room to grow all year.</p>
            </article>
          </div>
          <p className="pricing-note">
            Full feature comparison lives on the{" "}
            <Link href="/pricing" className="btn-text">
              Pricing page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="section invite-band" id="invite">
        <div className="section-inner">
          <div>
            <p className="section-kicker">Team access</p>
            <h2 className="section-title">Already have an invite?</h2>
            <p className="section-lead" style={{ marginTop: 14 }}>
              Your president or admin sends a secure link. Open it to set your
              password and join the workspace — no founding code needed.
            </p>
          </div>
          <Link href="/login" className="btn btn-primary">
            Log in to join
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">Hey Ralli</p>
            <p className="footer-tag">Organize · Create · Connect</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#tour">Product tour</a>
            <a href="#pricing">Pricing</a>
            <Link href="/pricing">Full pricing</Link>
            <Link href="/signup">Start organization</Link>
            <Link href="/login">Log in</Link>
          </div>
          <div className="footer-col">
            <h4>Legal &amp; help</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Cookies</Link>
            <a href="mailto:hello@heyralli.com">
              Contact · hello@heyralli.com
            </a>
          </div>
          <p className="footer-copy">© 2026 Hey Ralli</p>
        </div>
      </footer>

      <MarketingCookieConsent />
      <MarketingWowFloatingNav />
    </div>
  );
}
