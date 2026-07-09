"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function BoardRosterHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.location.hash === "#board-roster") {
      router.replace("/settings/team-access");
    }
  }, [router]);

  return null;
}
