/** Allow only same-origin relative paths after sign-in. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next?.trim()) {
    return null;
  }

  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.startsWith("/login") || value.startsWith("/auth/signout")) {
    return null;
  }

  return value;
}
