/** 0 = Sunday … 6 = Saturday */
export interface PreferredPostingWindow {
  daysOfWeek: number[];
  /** Inclusive, 0–23 */
  startHour: number;
  /** Inclusive, 0–23 */
  endHour: number;
}

export interface OrganizationPostingPreferences {
  timezone: string;
  preferredPostingHours: PreferredPostingWindow[] | null;
}

export interface PostingPreferencesInput {
  timezone: string;
  useCustomWindows: boolean;
  /** Weekday evening window when custom is enabled */
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
}
