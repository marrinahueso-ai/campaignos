import { BarChart3 } from "lucide-react";
import { LifecycleHubPage } from "@/components/layout/LifecycleHubPage";

export const metadata = {
  title: "Insights",
};

const sections = [
  {
    id: "campaign-analytics",
    title: "Campaign Analytics",
    description: "Track reach, completion, and readiness across campaigns.",
  },
  {
    id: "engagement",
    title: "Engagement",
    description: "See how families respond to your communications.",
  },
  {
    id: "ai-recommendations",
    title: "AI Recommendations",
    description: "Suggestions to improve timing, tone, and channel mix.",
  },
];

export default function InsightsPage() {
  return (
    <LifecycleHubPage
      title="Insights"
      description="Understand what is working and where to focus next."
      icon={BarChart3}
      sections={sections}
    />
  );
}
