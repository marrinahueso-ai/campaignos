import { redeemUnsubscribeToken } from "@/lib/newsletter/unsubscribe";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cos-bg px-4 py-16">
      <div className="w-full max-w-md rounded-[22px] border border-cos-border bg-cos-card p-7 text-center shadow-[0_8px_28px_rgba(28,36,48,0.08)]">
        {children}
      </div>
    </main>
  );
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token?.trim()) {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-cos-text">Invalid unsubscribe link</h1>
        <p className="mt-2 text-sm text-cos-muted">
          This link is missing its token. Use the unsubscribe link from a specific email instead.
        </p>
      </Shell>
    );
  }

  const result = await redeemUnsubscribeToken(token);

  if (result.outcome === "unsubscribed") {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-cos-text">You&apos;re unsubscribed</h1>
        <p className="mt-2 text-sm text-cos-muted">
          {result.contactEmail ? `${result.contactEmail} won't` : "You won't"} receive further
          newsletters from {result.organizationName ?? "this organization"}.
        </p>
      </Shell>
    );
  }

  if (result.outcome === "already_unsubscribed") {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-cos-text">Already unsubscribed</h1>
        <p className="mt-2 text-sm text-cos-muted">
          {result.contactEmail ?? "This address"} was already unsubscribed from{" "}
          {result.organizationName ?? "this organization"}&apos;s newsletters.
        </p>
      </Shell>
    );
  }

  if (result.outcome === "expired") {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-cos-text">Link expired</h1>
        <p className="mt-2 text-sm text-cos-muted">
          This unsubscribe link has expired. Use the unsubscribe link from a more recent email, or
          contact the sender directly.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-cos-text">Link not found</h1>
      <p className="mt-2 text-sm text-cos-muted">
        This unsubscribe link is invalid. Use the unsubscribe link from a specific email, or
        contact the sender directly.
      </p>
    </Shell>
  );
}
