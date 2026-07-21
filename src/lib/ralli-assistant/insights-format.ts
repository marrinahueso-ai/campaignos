import type { ProductHelpLink } from "./product-help-knowledge.ts";

export type InsightsScope = "event" | "org";

export type InsightsRiskItem = {
  label: string;
  severity: string;
  eventTitle?: string | null;
};

export type InsightsRecommendationItem = {
  title: string;
  priority: string;
  href?: string | null;
};

export type InsightsNextAction = {
  label: string;
  href: string | null;
};

export type InsightsMetaSection = {
  available: boolean;
  unavailableReason: string | null;
  summary: string | null;
  topPost: {
    title: string;
    reach: number | null;
    engagement: number | null;
    platform: string;
  } | null;
  items: Array<{ title: string; body: string }>;
};

export type InsightsHealthSection = {
  healthScore: number | null;
  readinessLabel: string | null;
  summary: string | null;
  missingPieces: string[];
};

export type InsightsContextPack = {
  scope: InsightsScope;
  organizationName: string | null;
  event: {
    id: string;
    title: string;
    date: string;
  } | null;
  health: InsightsHealthSection;
  risks: InsightsRiskItem[];
  recommendations: InsightsRecommendationItem[];
  nextAction: InsightsNextAction | null;
  highestImpactOpsAction: InsightsNextAction | null;
  meta: InsightsMetaSection;
  focusEventTitle: string | null;
  links: ProductHelpLink[];
};

export function buildInsightsLinks(eventId?: string | null): ProductHelpLink[] {
  const links: ProductHelpLink[] = [
    { label: "Insights", href: "/insights" },
    { label: "Approvals", href: "/approvals" },
    { label: "Today", href: "/dashboard" },
    { label: "Campaigns", href: "/events" },
    { label: "Communications Hub", href: "/communications" },
  ];

  if (eventId) {
    links.unshift(
      { label: "Event page", href: `/events/${eventId}` },
      {
        label: "Create with AI",
        href: `/events/${eventId}/campaign-builder`,
      },
    );
  }

  return links;
}

export function emptyMetaSection(reason: string | null = null): InsightsMetaSection {
  return {
    available: false,
    unavailableReason:
      reason ?? "I don’t have performance data yet — connect Meta and sync Insights.",
    summary: null,
    topPost: null,
    items: [],
  };
}

export function serializeInsightsContextForPrompt(
  pack: InsightsContextPack,
): string {
  return JSON.stringify(
    {
      scope: pack.scope,
      organizationName: pack.organizationName,
      event: pack.event,
      health: pack.health,
      risks: pack.risks.slice(0, 8),
      recommendations: pack.recommendations.slice(0, 8),
      nextAction: pack.nextAction,
      highestImpactOpsAction: pack.highestImpactOpsAction,
      meta: {
        available: pack.meta.available,
        unavailableReason: pack.meta.unavailableReason,
        summary: pack.meta.summary,
        topPost: pack.meta.topPost,
        items: pack.meta.items.slice(0, 6),
      },
      focusEventTitle: pack.focusEventTitle,
      links: pack.links,
    },
    null,
    2,
  );
}

function formatRiskLine(risk: InsightsRiskItem): string {
  const eventBit = risk.eventTitle ? ` (${risk.eventTitle})` : "";
  return `• ${risk.label}${eventBit}`;
}

export function formatDeterministicInsightsAnswer(
  pack: InsightsContextPack,
): string {
  const lines: string[] = [];
  const subject =
    pack.scope === "event" && pack.event
      ? pack.event.title
      : pack.focusEventTitle
        ? pack.focusEventTitle
        : pack.organizationName ?? "your organization";

  if (pack.scope === "event" && pack.event) {
    const score =
      pack.health.healthScore == null
        ? "health score unavailable"
        : `${pack.health.healthScore}/100 health`;
    const readiness = pack.health.readinessLabel
      ? ` — ${pack.health.readinessLabel}`
      : "";
    lines.push(`**${pack.event.title}** — ${score}${readiness}.`);
    if (pack.health.summary) {
      lines.push(pack.health.summary);
    }
  } else {
    lines.push(`Here’s what stands out for ${subject}:`);
  }

  if (pack.risks.length > 0) {
    lines.push("");
    lines.push("**Biggest risks**");
    for (const risk of pack.risks.slice(0, 4)) {
      lines.push(formatRiskLine(risk));
    }
  } else if (pack.scope === "event") {
    lines.push("");
    lines.push("No critical campaign risks stood out from the current plan.");
  }

  if (pack.health.missingPieces.length > 0) {
    lines.push("");
    lines.push(
      `**What’s missing:** ${pack.health.missingPieces.slice(0, 5).join("; ")}.`,
    );
  }

  if (pack.recommendations.length > 0) {
    lines.push("");
    lines.push("**Highest-impact next steps**");
    for (const rec of pack.recommendations.slice(0, 4)) {
      lines.push(`• ${rec.title}`);
    }
  }

  const impact = pack.highestImpactOpsAction ?? pack.nextAction;
  if (impact) {
    lines.push("");
    lines.push(`**Do this today:** ${impact.label}`);
  }

  lines.push("");
  if (pack.meta.available && pack.meta.summary) {
    lines.push(`**Performance:** ${pack.meta.summary}`);
    if (pack.meta.topPost) {
      lines.push(
        `Top post: “${pack.meta.topPost.title}” (${(pack.meta.topPost.engagement ?? 0).toLocaleString()} interactions, ${(pack.meta.topPost.reach ?? 0).toLocaleString()} reach on ${pack.meta.topPost.platform}).`,
      );
    }
  } else {
    lines.push(
      pack.meta.unavailableReason ??
        "I don’t have Meta performance data yet.",
    );
    if (impact) {
      lines.push(
        `Until Insights has metrics, the highest-impact ops move is: ${impact.label}`,
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}
