import { notFound } from "next/navigation";
import { MotionEngineHarness } from "@/marketing/engine/harness/MotionEngineHarness";

export const dynamic = "force-dynamic";

/**
 * Development-only Marketing Motion Engine harness.
 *
 * Local URL: /dev/motion-engine
 *
 * Production guard: returns 404 when NODE_ENV === "production".
 * Not linked from marketing or product navigation.
 */
export default function MotionEngineDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--cos-bg)]">
      <MotionEngineHarness />
    </main>
  );
}
