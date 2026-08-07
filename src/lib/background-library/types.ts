import type {
  BACKGROUND_ASSET_STATUSES,
  BACKGROUND_SEASONS,
  BACKGROUND_SCHOOL_LEVELS,
} from "./constants.ts";

export type BackgroundAssetStatus = (typeof BACKGROUND_ASSET_STATUSES)[number];
export type BackgroundSeason = (typeof BACKGROUND_SEASONS)[number];
export type BackgroundSchoolLevel = (typeof BACKGROUND_SCHOOL_LEVELS)[number];

export type BackgroundLibrary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

export type BackgroundSource = {
  id: string;
  title: string;
  notes: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
  variationCount: number;
};

export type BackgroundAsset = {
  id: string;
  sourceId: string | null;
  status: BackgroundAssetStatus;
  title: string;
  filenameLabel: string;
  description: string;
  tags: string[];
  colors: string[];
  style: string;
  audience: string;
  objects: string[];
  season: BackgroundSeason;
  schoolLevel: BackgroundSchoolLevel;
  storagePath: string;
  publicUrl: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  libraryIds: string[];
  libraryNames: string[];
};

export type BackgroundLibrarySummary = {
  total: number;
  pendingReview: number;
  published: number;
  archived: number;
  totalUses: number;
  sources: number;
};
