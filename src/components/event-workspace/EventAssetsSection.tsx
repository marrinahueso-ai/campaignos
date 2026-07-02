import { EventAssetCard } from "@/components/event-workspace/EventAssetCard";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EVENT_ASSET_GROUPS } from "@/lib/event-workspace/constants";
import type { EventAsset } from "@/types/event-workspace";

interface EventAssetsSectionProps {
  eventId: string;
  assets: EventAsset[];
}

function groupAssetsByCategory(
  assets: EventAsset[],
): Map<string, EventAsset[]> {
  const grouped = new Map<string, EventAsset[]>();

  for (const group of EVENT_ASSET_GROUPS) {
    grouped.set(group.id, []);
  }

  const assigned = new Set<string>();

  for (const group of EVENT_ASSET_GROUPS) {
    if (group.types.length === 0) {
      continue;
    }

    const groupAssets = assets
      .filter((asset) => group.types.includes(asset.assetType))
      .sort((left, right) => left.assetType.localeCompare(right.assetType));

    grouped.set(group.id, groupAssets);
    for (const asset of groupAssets) {
      assigned.add(asset.id);
    }
  }

  const unassigned = assets.filter((asset) => !assigned.has(asset.id));
  if (unassigned.length > 0) {
    const other = grouped.get("other") ?? [];
    grouped.set("other", [...other, ...unassigned]);
  }

  return grouped;
}

export function EventAssetsSection({
  eventId,
  assets,
}: EventAssetsSectionProps) {
  const groupedAssets = groupAssetsByCategory(assets);

  return (
    <Card
      id="event-assets"
      padding="none"
      className="scroll-mt-8 overflow-hidden"
    >
      <CardHeader className="border-b border-cos-border px-6 py-5">
        <CardTitle>Event Assets</CardTitle>
        <CardDescription>
          A calm home for artwork, flyers, photos, and documents attached to
          this event.
        </CardDescription>
      </CardHeader>

      <div className="space-y-8 p-6">
        {EVENT_ASSET_GROUPS.map((group) => {
          const groupAssets = groupedAssets.get(group.id) ?? [];
          const hasSlots = group.types.length > 0;

          if (!hasSlots && groupAssets.length === 0) {
            return (
              <section key={group.id}>
                <h3 className="text-sm font-medium text-cos-text">
                  {group.label}
                </h3>
                {group.emptyHint && (
                  <p className="mt-2 text-sm text-cos-muted">{group.emptyHint}</p>
                )}
              </section>
            );
          }

          if (groupAssets.length === 0) {
            return null;
          }

          return (
            <section key={group.id}>
              <h3 className="text-sm font-medium text-cos-text">
                {group.label}
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groupAssets.map((asset) => (
                  <EventAssetCard
                    key={asset.id}
                    eventId={eventId}
                    asset={asset}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
