import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REVISION_DEMO_APPROVER,
  REVISION_DEMO_CREATOR,
} from "@/components/approvals-revision/fixture";
import { mapApprovalItemToRevision } from "@/components/approvals-revision/map-item";
import { RevisionWorkspace } from "@/components/approvals-revision/RevisionWorkspace";
import type { RevisionMode } from "@/components/approvals-revision/types";
import { getUnifiedApprovalsSchedulingDataComplete } from "@/lib/approvals-scheduling/queries";

export const metadata = {
  title: "Revision · Approvals",
};

interface RevisionPageProps {
  searchParams: Promise<{
    itemId?: string;
    mode?: string;
    demo?: string;
  }>;
}

function parseMode(raw: string | undefined): RevisionMode {
  return raw === "approver" ? "approver" : "creator";
}

export default async function ApprovalsRevisionPage({
  searchParams,
}: RevisionPageProps) {
  const params = await searchParams;
  const mode = parseMode(params.mode);
  const isDemo = params.demo === "1" || params.demo === "true";

  if (isDemo || !params.itemId) {
    const model =
      mode === "approver" ? REVISION_DEMO_APPROVER : REVISION_DEMO_CREATOR;
    return (
      <div className="studio-page pb-10">
        {!params.itemId && !isDemo ? (
          <p className="mb-3 text-sm text-cos-muted">
            No item selected — showing the mockup fixture.{" "}
            <Link
              href="/approvals/revision?demo=1&mode=creator"
              className="font-semibold text-cos-brand-sage underline"
            >
              Creator demo
            </Link>
            {" · "}
            <Link
              href="/approvals/revision?demo=1&mode=approver"
              className="font-semibold text-cos-brand-sage underline"
            >
              Approver demo
            </Link>
            {" · "}
            <Link href="/approvals" className="font-semibold underline">
              Approvals
            </Link>
          </p>
        ) : null}
        <RevisionWorkspace model={model} />
      </div>
    );
  }

  const data = await getUnifiedApprovalsSchedulingDataComplete();
  const item = data.items.find((row) => row.id === params.itemId);
  if (!item) {
    notFound();
  }

  const model = mapApprovalItemToRevision(item, mode);

  return (
    <div className="studio-page pb-10">
      <RevisionWorkspace model={model} />
    </div>
  );
}
