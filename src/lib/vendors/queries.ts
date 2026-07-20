import "server-only";

import { cache } from "react";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
import {
  buildVendorDirectorySummary,
  pickLatestAssignment,
} from "@/lib/vendors/filters";
import {
  mapVendorActivityLogRow,
  mapVendorAssignmentRow,
  mapVendorCategoryRow,
  mapVendorContactRow,
  mapVendorDocumentRow,
  mapVendorNoteRow,
  mapVendorRow,
} from "@/lib/vendors/mappers";
import { VENDOR_DOCUMENTS_BUCKET } from "@/lib/vendors/storage";
import { createClient } from "@/lib/supabase/server";
import type {
  EventVendorRow,
  EventVendorsData,
  VendorCategory,
  VendorCategoryRow,
  VendorContactRow,
  VendorDetailData,
  VendorDirectoryPageData,
  VendorDirectoryRow,
  VendorEventAssignmentRow,
  VendorEventSummary,
  VendorRow,
} from "@/types/vendors";

export const areVendorTablesAvailable = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase.from("vendors").select("id").limit(1);
  return !error || !isMissingSchemaError(error);
});

export async function getVendorCategories(
  organizationId: string,
): Promise<VendorCategory[]> {
  if (!(await areVendorTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_categories")
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch vendor categories:", error.message);
    return [];
  }

  return ((data ?? []) as VendorCategoryRow[]).map(mapVendorCategoryRow);
}

async function getOrgVendors(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch vendors:", error.message);
    return [];
  }

  return ((data ?? []) as VendorRow[]).map(mapVendorRow);
}

async function getOrgVendorContacts(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_primary", { ascending: false });

  if (error) {
    return [];
  }

  return ((data ?? []) as VendorContactRow[]).map(mapVendorContactRow);
}

async function getOrgAssignments(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_event_assignments")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    return [];
  }

  return ((data ?? []) as VendorEventAssignmentRow[]).map(mapVendorAssignmentRow);
}

async function getOrgEventsForVendors(organizationId: string) {
  const schoolYearIds = await getOrganizationSchoolYearIds(organizationId);
  if (!schoolYearIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date")
    .in("school_year_id", schoolYearIds)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
  }));
}

function buildAssignmentSummaries(
  assignments: ReturnType<typeof mapVendorAssignmentRow> extends infer T ? T[] : never,
  eventMap: Map<string, { title: string; date: string }>,
): Map<string, VendorEventSummary[]> {
  const byVendor = new Map<string, VendorEventSummary[]>();

  for (const assignment of assignments) {
    const event = eventMap.get(assignment.eventId);
    if (!event) {
      continue;
    }

    const summary: VendorEventSummary = {
      assignmentId: assignment.id,
      eventId: assignment.eventId,
      eventTitle: event.title,
      eventDate: event.date,
      assignmentStatus: assignment.assignmentStatus,
    };

    const existing = byVendor.get(assignment.vendorId) ?? [];
    existing.push(summary);
    byVendor.set(assignment.vendorId, existing);
  }

  return byVendor;
}

/** Lean picker data for Event Detail Add Vendor / link — no assignment matrix. */
export async function getVendorDirectoryPickerData(): Promise<{
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
  availableVendors: Array<{ id: string; name: string }>;
}> {
  const organization = await getCurrentOrganization();
  if (!organization || !(await areVendorTablesAvailable())) {
    return { categories: [], events: [], availableVendors: [] };
  }

  const [vendors, categories, events] = await Promise.all([
    getOrgVendors(organization.id),
    getVendorCategories(organization.id),
    getOrgEventsForVendors(organization.id),
  ]);

  return {
    categories,
    events,
    availableVendors: vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
    })),
  };
}

export async function getVendorDirectoryPageData(): Promise<VendorDirectoryPageData> {
  const organization = await getCurrentOrganization();
  const [canWrite, canManage] = await Promise.all([
    hasPermission("draft_edit"),
    hasPermission("manage_people"),
  ]);

  if (!organization) {
    return {
      vendors: [],
      categories: [],
      events: [],
      summary: {
        totalVendors: 0,
        confirmedThisYear: 0,
        upcomingEventsWithVendors: 0,
        favoriteVendors: 0,
      },
      canWrite,
      canManage,
    };
  }

  if (!(await areVendorTablesAvailable())) {
    return {
      vendors: [],
      categories: [],
      events: [],
      summary: {
        totalVendors: 0,
        confirmedThisYear: 0,
        upcomingEventsWithVendors: 0,
        favoriteVendors: 0,
      },
      canWrite,
      canManage,
    };
  }

  const [vendors, categories, contacts, assignments, events] = await Promise.all([
    getOrgVendors(organization.id),
    getVendorCategories(organization.id),
    getOrgVendorContacts(organization.id),
    getOrgAssignments(organization.id),
    getOrgEventsForVendors(organization.id),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const contactsByVendor = new Map<string, ReturnType<typeof mapVendorContactRow>[]>();

  for (const contact of contacts) {
    const list = contactsByVendor.get(contact.vendorId) ?? [];
    list.push(contact);
    contactsByVendor.set(contact.vendorId, list);
  }

  const assignmentsByVendor = buildAssignmentSummaries(assignments, eventMap);
  const upcomingEventIds = new Set<string>();

  const rows: VendorDirectoryRow[] = vendors.map((vendor) => {
    const vendorAssignments = assignmentsByVendor.get(vendor.id) ?? [];
    const latestAssignment = pickLatestAssignment(vendorAssignments);
    const eventIds = vendorAssignments.map((assignment) => assignment.eventId);

    for (const assignment of vendorAssignments) {
      if (assignment.eventDate >= new Date().toISOString().slice(0, 10)) {
        upcomingEventIds.add(assignment.eventId);
      }
    }

    const vendorContacts = contactsByVendor.get(vendor.id) ?? [];
    const primaryContact =
      vendorContacts.find((contact) => contact.isPrimary) ?? vendorContacts[0] ?? null;

    return {
      vendor,
      category: vendor.categoryId ? categoryMap.get(vendor.categoryId) ?? null : null,
      primaryContact,
      latestAssignment,
      assignmentCount: vendorAssignments.length,
      eventIds,
    };
  });

  return {
    vendors: rows,
    categories,
    events,
    summary: buildVendorDirectorySummary(rows, upcomingEventIds),
    canWrite,
    canManage,
  };
}

export async function getVendorById(vendorId: string) {
  if (!(await areVendorTablesAvailable())) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapVendorRow(data as VendorRow);
}

export async function getVendorDetailData(
  vendorId: string,
): Promise<VendorDetailData | null> {
  const organization = await getCurrentOrganization();
  const [canWrite, canManage] = await Promise.all([
    hasPermission("draft_edit"),
    hasPermission("manage_people"),
  ]);
  const vendor = await getVendorById(vendorId);

  if (!organization || !vendor || vendor.organizationId !== organization.id) {
    return null;
  }

  const supabase = await createClient();

  const [
    categories,
    contactsResult,
    assignmentsResult,
    notesResult,
    documentsResult,
    activityResult,
    events,
  ] = await Promise.all([
    getVendorCategories(organization.id),
    supabase
      .from("vendor_contacts")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("is_primary", { ascending: false }),
    supabase
      .from("vendor_event_assignments")
      .select("*")
      .eq("vendor_id", vendorId)
      .is("deleted_at", null),
    supabase
      .from("vendor_notes")
      .select("*")
      .eq("vendor_id", vendorId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_documents")
      .select("*")
      .eq("vendor_id", vendorId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_activity_logs")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(50),
    getOrgEventsForVendors(organization.id),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const eventMap = new Map(events.map((event) => [event.id, event]));

  const assignments = ((assignmentsResult.data ?? []) as VendorEventAssignmentRow[]).map(
    mapVendorAssignmentRow,
  );

  const assignmentSummaries: VendorEventSummary[] = assignments
    .map((assignment) => {
      const event = eventMap.get(assignment.eventId);
      if (!event) {
        return null;
      }
      return {
        assignmentId: assignment.id,
        eventId: assignment.eventId,
        eventTitle: event.title,
        eventDate: event.date,
        assignmentStatus: assignment.assignmentStatus,
      };
    })
    .filter((value): value is VendorEventSummary => value !== null)
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate));

  return {
    vendor,
    category: vendor.categoryId ? categoryMap.get(vendor.categoryId) ?? null : null,
    contacts: ((contactsResult.data ?? []) as VendorContactRow[]).map(mapVendorContactRow),
    assignments: assignmentSummaries,
    notes: ((notesResult.data ?? []) as import("@/types/vendors").VendorNoteRow[]).map(
      mapVendorNoteRow,
    ),
    documents: ((documentsResult.data ?? []) as import("@/types/vendors").VendorDocumentRow[])
      .filter((row) => !row.deleted_at)
      .map(mapVendorDocumentRow),
    activityLogs: (activityResult.data ?? []).map((row) =>
      mapVendorActivityLogRow(
        row as {
          id: string;
          organization_id: string;
          vendor_id: string;
          event_id: string | null;
          action: string;
          details: string | null;
          actor_name: string | null;
          created_at: string;
        },
      ),
    ),
    canWrite,
    canManage,
  };
}

export async function getEventVendorsData(
  eventId: string,
  context?: {
    organizationId?: string;
    campaignRole?: CampaignRole;
  },
): Promise<EventVendorsData> {
  const [organization, canWrite] = await Promise.all([
    context?.organizationId
      ? Promise.resolve({ id: context.organizationId })
      : getCurrentOrganization(),
    hasPermission("draft_edit"),
  ]);

  if (!organization || !(await areVendorTablesAvailable())) {
    return { vendors: [], canWrite };
  }

  const supabase = await createClient();
  const { data: assignmentRows, error } = await supabase
    .from("vendor_event_assignments")
    .select("*")
    .eq("event_id", eventId)
    .eq("organization_id", organization.id)
    .is("deleted_at", null);

  if (error || !assignmentRows?.length) {
    return { vendors: [], canWrite };
  }

  const assignments = (assignmentRows as VendorEventAssignmentRow[]).map(
    mapVendorAssignmentRow,
  );
  const vendorIds = assignments.map((assignment) => assignment.vendorId);

  const [vendorsResult, contactsResult, categories] = await Promise.all([
    supabase.from("vendors").select("*").in("id", vendorIds).is("deleted_at", null),
    supabase
      .from("vendor_contacts")
      .select("*")
      .in("vendor_id", vendorIds)
      .order("is_primary", { ascending: false }),
    getVendorCategories(organization.id),
  ]);

  const vendorMap = new Map(
    ((vendorsResult.data ?? []) as VendorRow[]).map((row) => [
      row.id,
      mapVendorRow(row),
    ]),
  );
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const contactsByVendor = new Map<string, ReturnType<typeof mapVendorContactRow>[]>();

  for (const row of (contactsResult.data ?? []) as VendorContactRow[]) {
    const contact = mapVendorContactRow(row);
    const list = contactsByVendor.get(contact.vendorId) ?? [];
    list.push(contact);
    contactsByVendor.set(contact.vendorId, list);
  }

  const vendors: EventVendorRow[] = assignments
    .map((assignment): EventVendorRow | null => {
      const vendor = vendorMap.get(assignment.vendorId);
      if (!vendor) {
        return null;
      }

      const vendorContacts = contactsByVendor.get(vendor.id) ?? [];
      const primaryContact =
        vendorContacts.find((contact) => contact.isPrimary) ??
        vendorContacts[0] ??
        null;

      return {
        assignmentId: assignment.id,
        vendor,
        category: vendor.categoryId ? categoryMap.get(vendor.categoryId) ?? null : null,
        primaryContact,
        assignmentStatus: assignment.assignmentStatus,
        logoUrl: null,
      };
    })
    .filter((value): value is EventVendorRow => value !== null)
    .sort((left, right) => left.vendor.name.localeCompare(right.vendor.name));

  const logoPaths = vendors
    .map((row) => row.vendor.logoPath)
    .filter((path): path is string => Boolean(path));

  let signedByPath = new Map<string, string>();
  if (logoPaths.length > 0) {
    const { data: signedRows, error: signError } = await supabase.storage
      .from(VENDOR_DOCUMENTS_BUCKET)
      .createSignedUrls(logoPaths, 3600);

    if (!signError && signedRows) {
      signedByPath = new Map(
        signedRows
          .filter((row) => row.path && row.signedUrl && !row.error)
          .map((row) => [row.path as string, row.signedUrl as string]),
      );
    }
  }

  const withLogos = vendors.map((row) => {
    if (!row.vendor.logoPath) {
      return row;
    }
    return {
      ...row,
      logoUrl: signedByPath.get(row.vendor.logoPath) ?? null,
    };
  });

  return { vendors: withLogos, canWrite };
}

export async function getAllOrgVendorsForDedup(organizationId: string) {
  return getOrgVendors(organizationId);
}
