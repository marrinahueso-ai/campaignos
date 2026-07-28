/** Static download path for the board / team roster Excel template. */
export const BOARD_ROSTER_IMPORT_TEMPLATE_PATH =
  "/templates/board-roster-import.xlsx";

/**
 * Column layout expected by {@link parseRosterXlsx}:
 * - A: Leadership position (bold rows become roles; plain rows are ignored unless B has a committee)
 * - B: Committee / team name, or contact name/email on leadership rows
 * - C: Prior-year chair (optional)
 * - D: Current-year chair (preferred when present)
 */
export const BOARD_ROSTER_IMPORT_COLUMNS = [
  "Position",
  "Committee / Team",
  "Prior year chair",
  "Current year chair",
] as const;
