import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaybookEditor } from "@/components/playbooks/PlaybookEditor";
import { getPlaybookWithSteps } from "@/lib/playbooks/queries";

interface EditPlaybookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPlaybookPageProps) {
  const { id } = await params;
  const data = await getPlaybookWithSteps(id);
  return { title: data ? `Edit ${data.playbook.name}` : "Edit Playbook" };
}

export default async function EditPlaybookPage({ params }: EditPlaybookPageProps) {
  const { id } = await params;
  const data = await getPlaybookWithSteps(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/settings/playbooks"
          className="text-sm font-medium text-cos-accent hover:text-cos-muted"
        >
          ← Back to Playbooks
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-cos-text">
          {data.playbook.name}
        </h1>
      </div>

      <PlaybookEditor playbook={data.playbook} initialSteps={data.steps} />
    </div>
  );
}
