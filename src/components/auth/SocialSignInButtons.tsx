"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { getOAuthSignInUrl } from "@/lib/auth/actions";
import {
  OAUTH_PROVIDER_LABELS,
  OAUTH_SIGN_IN_PROVIDERS,
  type OAuthSignInProvider,
} from "@/lib/auth/oauth-providers";
import { cn } from "@/lib/utils/cn";

interface SocialSignInButtonsProps {
  inviteToken?: string | null;
  nextPath?: string | null;
  variant?: "default" | "studio";
}

function ProviderIcon({ provider }: { provider: OAuthSignInProvider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.9v-8.41H7.08v-3.5h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87v2.24h3.32l-.53 3.5h-2.79v8.42C19.61 23.09 24 18.09 24 12.07z" />
    </svg>
  );
}

export function SocialSignInButtons({
  inviteToken = null,
  nextPath = null,
  variant = "default",
}: SocialSignInButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] =
    useState<OAuthSignInProvider | null>(null);
  const [isPending, startTransition] = useTransition();
  const isStudio = variant === "studio";

  function handleSignIn(provider: OAuthSignInProvider) {
    startTransition(async () => {
      setError(null);
      setPendingProvider(provider);

      const result = await getOAuthSignInUrl(provider, inviteToken, nextPath);
      if ("error" in result) {
        setError(result.error);
        setPendingProvider(null);
        return;
      }

      window.location.assign(result.url);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {OAUTH_SIGN_IN_PROVIDERS.map((provider) => {
          const loading = isPending && pendingProvider === provider;

          return (
            <button
              key={provider}
              type="button"
              disabled={isPending}
              onClick={() => handleSignIn(provider)}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cos-border bg-white px-4 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:cursor-not-allowed disabled:opacity-60",
                isStudio && "tracking-wide",
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ProviderIcon provider={provider} />
              )}
              Continue with {OAUTH_PROVIDER_LABELS[provider]}
            </button>
          );
        })}
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cos-border" />
        </div>
        <p className="relative mx-auto w-fit bg-[#f6f2eb] px-3 text-xs text-cos-muted">
          or use email
        </p>
      </div>

      {error && <p className="text-sm text-cos-error-text">{error}</p>}
    </div>
  );
}
