import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type RequestCookie = {
  name: string;
  value: string;
};

type CookieStoreLike = {
  getAll(): RequestCookie[];
  get(name: string): RequestCookie | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- match next/headers cookie set signature loosely
  set(...args: any[]): void;
}

const cookieStoreAls = new AsyncLocalStorage<CookieStoreLike>();

/** Snapshot of request cookies for use inside Server Component `after()` callbacks. */
export function freezeCookieStore(
  cookies: ReadonlyArray<RequestCookie>,
): CookieStoreLike {
  const list = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
  }));

  return {
    getAll() {
      return list.map((cookie) => ({ ...cookie }));
    },
    get(name: string) {
      const match = list.find((cookie) => cookie.name === name);
      return match ? { ...match } : undefined;
    },
    set() {
      // after() cannot mutate the response cookie jar
    },
  };
}

export function getRequestCookieStoreOverride(): CookieStoreLike | undefined {
  return cookieStoreAls.getStore();
}

/**
 * Run work with a frozen cookie snapshot so createClient() / org cookie reads
 * do not call next/headers cookies() inside Server Component after().
 */
export function runWithRequestCookies<T>(
  cookies: ReadonlyArray<RequestCookie>,
  fn: () => T,
): T {
  return cookieStoreAls.run(freezeCookieStore(cookies), fn);
}
