"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { CampaignRowActions } from "@/components/campaigns/CampaignRowActions";
import { CampaignStatusPill } from "@/components/campaigns/CampaignStatusPill";
import { CampaignThumbnail } from "@/components/campaigns/CampaignThumbnail";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatCampaignUpdatedDate,
  getCampaignDisplayStatus,
  getCampaignTypeLabel,
  getEventOwnerName,
  type CampaignSortField,
} from "@/lib/events/campaign-page-filters";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { formatEventDate } from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

const SORTABLE_COLUMNS: {
  key: CampaignSortField;
  label: string;
}[] = [
  { key: "title", label: "Campaign" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "date", label: "Date" },
  { key: "owner", label: "Owner" },
  { key: "updated", label: "Last updated" },
];

interface CampaignsTableViewProps {
  events: Event[];
  today: string;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
  sortField: CampaignSortField;
  sortDirection: "asc" | "desc";
  onSort: (field: CampaignSortField) => void;
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: CampaignSortField;
  sortField: CampaignSortField;
  sortDirection: "asc" | "desc";
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
  }

  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
  ) : (
    <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
  );
}

export function CampaignsTableView({
  events,
  today,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
  sortField,
  sortDirection,
  onSort,
}: CampaignsTableViewProps) {
  return (
    <div className="overflow-hidden border border-cos-border bg-cos-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {SORTABLE_COLUMNS.map((column) => (
              <TableHead key={column.key}>
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 transition-colors hover:text-cos-text",
                    sortField === column.key && "text-cos-text",
                  )}
                >
                  {column.label}
                  <SortIcon
                    field={column.key}
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
            ))}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {events.map((event) => {
            const ownership = ownershipByEventId?.get(event.id);
            const metaScheduled = metaScheduledEventIds?.has(event.id) ?? false;
            const displayStatus = getCampaignDisplayStatus(event, {
              metaScheduled,
              ownership,
              today,
            });

            return (
              <TableRow key={event.id}>
                <TableCell>
                  <Link
                    href={`/events/${event.id}#overview`}
                    className="inline-flex min-w-0 items-center gap-3 font-medium text-cos-text transition-colors hover:text-cos-primary"
                  >
                    <CampaignThumbnail
                      artwork={artworkByEventId.get(event.id) ?? null}
                      title={event.title}
                      size="sm"
                    />
                    <span className="truncate">{event.title}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-cos-muted">
                  {getCampaignTypeLabel(event.communicationStrategy)}
                </TableCell>
                <TableCell>
                  <CampaignStatusPill status={displayStatus} />
                </TableCell>
                <TableCell className="text-cos-muted">
                  {formatEventDate(event.date)}
                </TableCell>
                <TableCell className="text-cos-muted">
                  {getEventOwnerName(event, ownership)}
                </TableCell>
                <TableCell className="text-cos-muted">
                  {formatCampaignUpdatedDate(event)}
                </TableCell>
                <TableCell>
                  <CampaignRowActions event={event} compact />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
