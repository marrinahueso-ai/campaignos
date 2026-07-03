import type { ResolvedMetaPage } from "@/lib/meta-publishing/graph-api";
import type { MetaConnection } from "@/lib/meta-publishing/types";

export function pickPageFromTokenResult(
  pages: ResolvedMetaPage[],
  preferredPageId?: string,
): ResolvedMetaPage | null {
  if (preferredPageId) {
    return pages.find((page) => page.id === preferredPageId) ?? null;
  }

  const linkedInstagramPage = pages.find((page) => page.instagramAccountId);
  if (linkedInstagramPage) {
    return linkedInstagramPage;
  }

  const testPage = pages.find((page) => /test|pto/i.test(page.name));
  return testPage ?? pages[0] ?? null;
}

export function isMetaConnectionConfigured(connection: MetaConnection | null): boolean {
  return Boolean(connection?.facebookPageId && connection.pageAccessToken);
}

export function isInstagramPublishingConfigured(connection: MetaConnection | null): boolean {
  return Boolean(connection?.instagramAccountId?.trim());
}
