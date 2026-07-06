"use server";

import {
  loadMondaySettingsPageState,
  type MondaySettingsPageState,
} from "@/lib/monday/settings-loader";

export type { MondaySettingsPageState };

/** Client-only Monday settings loader — Supabase reads only; boards load separately when connected. */
export async function getMondaySettingsPageStateAction(): Promise<MondaySettingsPageState> {
  try {
    return await loadMondaySettingsPageState();
  } catch (error) {
    console.error(
      "getMondaySettingsPageStateAction failed unexpectedly:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    return {
      success: true,
      integrationConfigured: false,
      connected: false,
      syncEnabled: false,
      boardConfigured: false,
      accountSlug: null,
      savedMapping: null,
      pageLoadError:
        "Monday settings could not be loaded completely. Refresh the page — you can still connect Monday below.",
    };
  }
}
