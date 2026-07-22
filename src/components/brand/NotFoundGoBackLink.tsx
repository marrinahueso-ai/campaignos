"use client";

import { useRouter } from "next/navigation";

export function NotFoundGoBackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/dashboard");
      }}
      className="text-sm text-cos-muted underline underline-offset-4 transition-colors hover:text-cos-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg"
    >
      Go back to the previous page
    </button>
  );
}
