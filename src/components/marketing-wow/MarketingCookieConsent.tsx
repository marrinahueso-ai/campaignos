"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "heyralli-cookie-consent";

type ConsentValue = "accepted" | "essential";

export function MarketingCookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== "accepted" && stored !== "essential") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(value: ConsentValue) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-cos-border bg-cos-card p-4 shadow-2xl sm:p-5"
    >
      <p className="text-sm leading-relaxed text-cos-muted">
        We use essential cookies to keep you signed in, plus optional
        analytics to improve Hey Ralli. See{" "}
        <Link
          href="/privacy"
          className="font-semibold text-cos-text underline underline-offset-2"
        >
          Privacy
        </Link>{" "}
        for details.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          variant="primary"
          className="h-auto rounded-full px-4 py-2.5 text-[13px]"
          onClick={() => choose("accepted")}
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          className="h-auto rounded-full px-4 py-2.5 text-[13px]"
          onClick={() => choose("essential")}
        >
          Essential only
        </Button>
      </div>
    </div>
  );
}
