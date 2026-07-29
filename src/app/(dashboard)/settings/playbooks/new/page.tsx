import Link from "next/link";
import { PlaybookEditor } from "@/components/playbooks/PlaybookEditor";

export const metadata = {
  title: "Create communication plan",
};

export default function NewPlaybookPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/settings/playbooks-milestones"
          className="text-sm font-medium text-cos-accent hover:text-cos-muted"
        >
          ← Back to Communication Plans
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-cos-text">Create communication plan</h1>
      </div>

      <PlaybookEditor />
    </div>
  );
}
