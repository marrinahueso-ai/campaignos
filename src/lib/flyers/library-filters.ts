import type { FlyerStatus } from "@/lib/flyers/types";
import {
  flyerChangesHref,
  flyerComposerEditHref,
  flyerReviewHref,
} from "@/lib/flyer-composer/approval";

export type FlyerLibraryFilter =
  | "all"
  | "draft"
  | "pending"
  | "changes"
  | "approved";

export const FLYER_LIBRARY_FILTERS: {
  id: FlyerLibraryFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "pending", label: "Pending" },
  { id: "changes", label: "Changes" },
  { id: "approved", label: "Approved" },
];

export function parseFlyerLibraryFilter(
  value: string | null | undefined,
): FlyerLibraryFilter {
  switch (value) {
    case "draft":
    case "pending":
    case "changes":
    case "approved":
      return value;
    default:
      return "all";
  }
}

export function flyerMatchesLibraryFilter(
  status: FlyerStatus,
  filter: FlyerLibraryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "draft":
      return status === "draft";
    case "pending":
      return status === "needs_approval";
    case "changes":
      return status === "changes_requested";
    case "approved":
      return status === "approved";
    default:
      return true;
  }
}

/** Where the library card should open for a given status. */
export function flyerLibraryHref(flyer: {
  id: string;
  status: FlyerStatus;
}): string {
  switch (flyer.status) {
    case "draft":
      return flyerComposerEditHref({ flyerId: flyer.id });
    case "changes_requested":
      return flyerChangesHref(flyer.id);
    case "needs_approval":
    case "approved":
      return flyerReviewHref(flyer.id);
    default:
      return flyerReviewHref(flyer.id);
  }
}
