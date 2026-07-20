"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function SentryClientVerifyButton() {
  const [status, setStatus] = useState<string>("Ready to send browser test error.");

  useEffect(() => {
    // Keep this page out of normal browsing history noise.
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/dev/sentry-verify");
    }
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="font-serif text-2xl text-cos-text">Sentry browser verification</h1>
      <p className="text-sm text-cos-muted">
        Temporary page for confirming Sentry receives browser errors. Do not share this
        link publicly.
      </p>
      <button
        type="button"
        className="rounded-md bg-cos-ink px-4 py-2 text-sm text-white"
        onClick={() => {
          Sentry.withScope((scope) => {
            scope.setTag("sentry_verify", "client");
            scope.setLevel("error");
            Sentry.captureException(
              new Error("Hey Ralli Sentry browser verification error (safe test)"),
            );
          });
          setStatus("Browser test error sent. Check Sentry Issues for sentry_verify=client.");
        }}
      >
        Send browser test error
      </button>
      <p className="text-sm text-cos-text">{status}</p>
    </div>
  );
}
