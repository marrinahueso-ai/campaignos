import { redirect } from "next/navigation";

import { BackgroundLibraryShell } from "@/components/ops/background-library/BackgroundLibraryShell";
import {
  getBackgroundLibrarySummary,
  listBackgroundAssetsByStatus,
  listBackgroundLibraries,
  listBackgroundSources,
} from "@/lib/background-library/queries";
import { canAccessOwnerOps } from "@/lib/ops/access";

export const metadata = {
  title: "Background Library",
  robots: { index: false, follow: false },
};

export const maxDuration = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function BackgroundLibraryOpsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await canAccessOwnerOps())) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tabRaw = first(params.tab) ?? "review";
  const tab =
    tabRaw === "published" ||
    tabRaw === "archived" ||
    tabRaw === "sources" ||
    tabRaw === "review"
      ? tabRaw
      : "review";

  const [summary, libraries, sources, pending, published, archived] =
    await Promise.all([
      getBackgroundLibrarySummary(),
      listBackgroundLibraries(),
      listBackgroundSources(),
      listBackgroundAssetsByStatus("pending_review"),
      listBackgroundAssetsByStatus("published"),
      listBackgroundAssetsByStatus("archived"),
    ]);

  return (
    <BackgroundLibraryShell
      tab={tab}
      summary={summary}
      libraries={libraries}
      sources={sources}
      pending={pending}
      published={published}
      archived={archived}
    />
  );
}
