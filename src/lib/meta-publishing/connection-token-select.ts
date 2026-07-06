import "server-only";

import {
  filterInboxRelevantScopes,
  hasFacebookCommentReplyScopes,
} from "@/lib/inbox/scopes";
import { pickPageFromTokenResult } from "@/lib/meta-publishing/connection-utils";
import { debugToken, type ResolvedMetaPage } from "@/lib/meta-publishing/graph-api";

async function scorePageTokenCandidate(page: ResolvedMetaPage): Promise<{
  page: ResolvedMetaPage;
  score: number;
}> {
  const debug = await debugToken({ inputToken: page.accessToken });
  const scopes = filterInboxRelevantScopes(debug.scopes);

  let score = 0;
  if (debug.isValid) {
    score += 10;
  }
  if (hasFacebookCommentReplyScopes(scopes)) {
    score += 100;
  }
  score += scopes.length * 5;

  // Page tokens from a long-lived user token never expire (debug_token expires_at is 0 → null).
  if (!debug.expiresAt) {
    score += 200;
  } else {
    const daysUntilExpiry =
      (new Date(debug.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysUntilExpiry > 30) {
      score += 80;
    } else if (daysUntilExpiry > 7) {
      score += 40;
    } else {
      score -= 150;
    }
  }

  return { page, score };
}

/**
 * When OAuth resolves the same Page via short- and long-lived user tokens, pick the Page
 * access token that is least likely to expire and has the most inbox scopes.
 */
export async function pickBestPageFromTokenResult(
  pages: ResolvedMetaPage[],
  preferredPageId?: string,
): Promise<ResolvedMetaPage | null> {
  if (pages.length === 0) {
    return null;
  }

  const targetPage = pickPageFromTokenResult(pages, preferredPageId);
  if (!targetPage) {
    return null;
  }

  const uniqueByToken = new Map<string, ResolvedMetaPage>();
  for (const page of pages) {
    if (page.id !== targetPage.id) {
      continue;
    }
    uniqueByToken.set(page.accessToken, page);
  }

  if (uniqueByToken.size <= 1) {
    return targetPage;
  }

  const scored = await Promise.all([...uniqueByToken.values()].map(scorePageTokenCandidate));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.page ?? targetPage;
}
