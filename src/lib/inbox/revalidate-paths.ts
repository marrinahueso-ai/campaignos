import { revalidatePath } from "next/cache";

export const INBOX_ROUTE_PATHS = ["/inbox", "/communications"] as const;

export function revalidateInboxRoutes(): void {
  for (const path of INBOX_ROUTE_PATHS) {
    revalidatePath(path);
  }
}
