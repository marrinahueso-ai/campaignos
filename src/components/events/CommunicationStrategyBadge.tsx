import { Badge } from "@/components/ui/Badge";
import {
  COMMUNICATION_STRATEGY_BADGE_VARIANTS,
  COMMUNICATION_STRATEGY_LABELS,
} from "@/lib/events/communication-strategy";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CommunicationStrategyBadgeProps {
  strategy: CommunicationStrategy;
  className?: string;
}

export function CommunicationStrategyBadge({
  strategy,
  className,
}: CommunicationStrategyBadgeProps) {
  return (
    <Badge
      variant={COMMUNICATION_STRATEGY_BADGE_VARIANTS[strategy]}
      className={className}
    >
      {COMMUNICATION_STRATEGY_LABELS[strategy]}
    </Badge>
  );
}
