import { notFound } from "next/navigation";
import { SentryClientVerifyButton } from "@/components/monitoring/SentryClientVerifyButton";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";
import { isSentryVerifySecretValid } from "@/lib/monitoring/sentry-verify";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ secret?: string }>;
}

/**
 * Temporary browser-side Sentry verification page.
 * Requires ?secret= matching SENTRY_VERIFY_SECRET (or CRON_SECRET). Returns 404 otherwise.
 */
export default async function SentryVerifyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!isSentryVerifySecretValid(params.secret)) {
    notFound();
  }

  if (!isSentryEnabled()) {
    return (
      <main className="p-8">
        <h1 className="font-serif text-2xl">Sentry is not enabled</h1>
        <p className="mt-2 text-sm text-cos-muted">
          NEXT_PUBLIC_SENTRY_DSN is missing or SENTRY_ENABLED=false in this deployment.
        </p>
      </main>
    );
  }

  return (
    <main>
      <SentryClientVerifyButton />
    </main>
  );
}
