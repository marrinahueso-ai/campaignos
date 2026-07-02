/** True when Postgres/Supabase reports a missing table or column (migration not applied). */
export function isMissingSchemaError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("column") && message.includes("schema cache")
  );
}
