import Link from "next/link";

/** Public Privacy Policy body — calm school-appropriate copy from the WOW mockup. */
export function PrivacyPolicyContent() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated July 26, 2026</p>
      <h2>Who we are</h2>
      <p>
        Hey Ralli helps school and PTA teams plan events, create communications,
        approve and schedule social posts, and coordinate volunteers. We build
        for trusted community operators — not ad networks.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account and membership data (name, email, role, organization)</li>
        <li>Workspace content you create (events, captions, files, approvals)</li>
        <li>
          Integration data you connect (e.g. Meta pages, Google Calendar) with
          your consent
        </li>
        <li>
          Essential cookies for sign-in and security; optional analytics if
          accepted
        </li>
      </ul>
      <h2>How we use data</h2>
      <p>
        To provide your workspace, send transactional email, improve reliability,
        and (when enabled) understand product usage. We do not sell student or
        parent lists.
      </p>
      <h2>Cookies</h2>
      <p>
        Essential cookies keep sessions secure. Analytics cookies are optional
        and can be declined from the consent bar on the homepage.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:hello@heyralli.com">hello@heyralli.com</a>
      </p>
      <p style={{ marginTop: 28 }}>
        <Link href="/terms" className="btn-text">
          Read Terms of Service
        </Link>
      </p>
    </>
  );
}

/** Public Terms of Service body — from the WOW mockup funnel. */
export function TermsOfServiceContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated July 26, 2026</p>
      <h2>Using Hey Ralli</h2>
      <p>
        You must have authority to create or join an organization workspace.
        Founding access codes and invite links are personal to the intended
        recipient.
      </p>
      <h2>Your content</h2>
      <p>
        You retain ownership of school and PTA content you upload. You grant us
        a limited license to host, process, and display it so the product works —
        including connected channels you authorize (e.g. Meta).
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>
          No unlawful, harassing, or misleading communications to parents or
          volunteers
        </li>
        <li>No sharing credentials outside your organization</li>
        <li>
          Respect platform rules for Facebook, Instagram, and other integrations
        </li>
      </ul>
      <h2>Billing</h2>
      <p>
        Paid plans renew monthly unless canceled. Trials and AI credit allotments
        follow the Pricing page and Billing settings in-product.
      </p>
      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@heyralli.com">hello@heyralli.com</a>
      </p>
      <p style={{ marginTop: 28 }}>
        <Link href="/privacy" className="btn-text">
          Read Privacy Policy
        </Link>
      </p>
    </>
  );
}
