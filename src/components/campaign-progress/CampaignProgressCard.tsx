import { CampaignProgressStrip } from "@/components/campaign-progress/CampaignProgressStrip";
import { Card } from "@/components/ui/Card";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";

interface CampaignProgressCardProps {
  progress: CampaignProgressSnapshot;
}

export function CampaignProgressCard({ progress }: CampaignProgressCardProps) {
  return (
    <Card className="scroll-mt-8 overflow-hidden p-0">
      <CampaignProgressStrip progress={progress} />
    </Card>
  );
}
