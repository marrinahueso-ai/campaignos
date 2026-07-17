import "server-only";

import { normalizeSignUpGeniusPayload } from "@/lib/event-volunteers/signupgenius-normalize";
import type { VolunteerSignupSnapshot } from "@/lib/event-volunteers/types";
import {
  validateSignUpGeniusUrl,
  type ValidatedSignUpGeniusUrl,
} from "@/lib/event-volunteers/url";

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT =
  "HeyRalli-VolunteerStats/1.0 (+https://heyralli.com; aggregate-stats-only)";

export type SignUpGeniusReadResult =
  | { ok: true; snapshot: VolunteerSignupSnapshot; validated: ValidatedSignUpGeniusUrl }
  | { ok: false; error: string; code: VolunteerReadErrorCode };

export type VolunteerReadErrorCode =
  | "invalid_url"
  | "unsupported_host"
  | "not_public"
  | "login_required"
  | "access_code"
  | "timeout"
  | "unavailable"
  | "empty_parse"
  | "changed_markup"
  | "redirect_blocked";

function userMessage(code: VolunteerReadErrorCode): string {
  switch (code) {
    case "invalid_url":
      return "Enter a valid SignUpGenius signup link.";
    case "unsupported_host":
      return "Only SignUpGenius links are supported.";
    case "not_public":
      return "This signup does not appear to be publicly readable.";
    case "login_required":
      return "This signup requires a login. Use a public signup link.";
    case "access_code":
      return "This signup requires an access code and cannot be connected.";
    case "timeout":
      return "SignUpGenius took too long to respond. Try again.";
    case "unavailable":
      return "SignUpGenius is unavailable right now. Try again shortly.";
    case "empty_parse":
      return "No volunteer assignments were found on that signup.";
    case "changed_markup":
      return "We could not read this signup format. Try again or replace the link.";
    case "redirect_blocked":
      return "The signup link redirected to an unsupported destination.";
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timer);
  }
}

function assertAllowedRedirect(location: string | null): string | null {
  if (!location) return null;
  try {
    const next = new URL(location, "https://www.signupgenius.com");
    if (next.protocol !== "https:") return "redirect_blocked";
    const host = next.hostname.toLowerCase();
    if (
      host !== "www.signupgenius.com" &&
      host !== "signupgenius.com" &&
      host !== "m.signupgenius.com"
    ) {
      return "redirect_blocked";
    }
    return null;
  } catch {
    return "redirect_blocked";
  }
}

function sanitizeText(value: unknown, max = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, max);
}

async function readOgTitle(
  pageUrl: string,
  cookie: string,
): Promise<string | undefined> {
  try {
    const res = await fetchWithTimeout(pageUrl, {
      method: "GET",
      headers: {
        Accept: "text/html",
        "User-Agent": USER_AGENT,
        Cookie: cookie,
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const blocked = assertAllowedRedirect(res.headers.get("location"));
      if (blocked) return undefined;
    }
    if (!res.ok) return undefined;
    const html = await res.text();
    const og = html.match(
      /property=["']og:title["']\s+content=["']([^"']+)["']/i,
    );
    return sanitizeText(og?.[1], 200);
  } catch {
    return undefined;
  }
}

export async function readSignUpGeniusSignup(
  rawUrl: string,
): Promise<SignUpGeniusReadResult> {
  const validated = validateSignUpGeniusUrl(rawUrl);
  if ("error" in validated) {
    const code =
      validated.error.includes("SignUpGenius") &&
      validated.error.includes("supported")
        ? "unsupported_host"
        : "invalid_url";
    return { ok: false, error: userMessage(code), code };
  }

  try {
    const pageRes = await fetchWithTimeout(validated.normalizedHref, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
    });

    if (pageRes.status >= 300 && pageRes.status < 400) {
      const blocked = assertAllowedRedirect(pageRes.headers.get("location"));
      if (blocked) {
        return {
          ok: false,
          error: userMessage("redirect_blocked"),
          code: "redirect_blocked",
        };
      }
    }

    if (pageRes.status === 401 || pageRes.status === 403) {
      return {
        ok: false,
        error: userMessage("login_required"),
        code: "login_required",
      };
    }

    if (!pageRes.ok) {
      return {
        ok: false,
        error: userMessage("unavailable"),
        code: "unavailable",
      };
    }

    const cookie = (pageRes.headers.getSetCookie?.() ?? [])
      .map((entry) => entry.split(";")[0])
      .filter(Boolean)
      .join("; ");

    const title =
      (await readOgTitle(validated.normalizedHref, cookie)) ?? undefined;

    const apiRes = await fetchWithTimeout(
      "https://www.signupgenius.com/SUGboxAPI.cfm?go=s.getSignupInfo",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json; charset=UTF-8",
          Origin: "https://www.signupgenius.com",
          Referer: validated.normalizedHref,
          "User-Agent": USER_AGENT,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({
          forSignUpView: true,
          urlid: validated.urlid,
          portalid: 0,
        }),
      },
    );

    if (apiRes.status >= 300 && apiRes.status < 400) {
      const blocked = assertAllowedRedirect(apiRes.headers.get("location"));
      if (blocked) {
        return {
          ok: false,
          error: userMessage("redirect_blocked"),
          code: "redirect_blocked",
        };
      }
    }

    if (!apiRes.ok) {
      return {
        ok: false,
        error: userMessage("unavailable"),
        code: "unavailable",
      };
    }

    const payload = (await apiRes.json()) as {
      SUCCESS?: boolean;
      DATA?: Parameters<typeof normalizeSignUpGeniusPayload>[0];
      MESSAGE?: unknown;
    };

    if (!payload.SUCCESS || !payload.DATA) {
      const message = JSON.stringify(payload.MESSAGE ?? "").toLowerCase();
      if (message.includes("access") && message.includes("code")) {
        return {
          ok: false,
          error: userMessage("access_code"),
          code: "access_code",
        };
      }
      if (message.includes("login") || message.includes("sign in")) {
        return {
          ok: false,
          error: userMessage("login_required"),
          code: "login_required",
        };
      }
      return {
        ok: false,
        error: userMessage("not_public"),
        code: "not_public",
      };
    }

    // Drop PII before any further processing.
    const data = {
      ...payload.DATA,
      participants: undefined,
    };

    const normalized = normalizeSignUpGeniusPayload(data, {
      sourceTitle: title,
      sourceUrl: validated.normalizedHref,
    });

    if ("error" in normalized) {
      return {
        ok: false,
        error: userMessage(normalized.error),
        code: normalized.error,
      };
    }

    return { ok: true, snapshot: normalized, validated };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: userMessage("timeout"), code: "timeout" };
    }
    return {
      ok: false,
      error: userMessage("unavailable"),
      code: "unavailable",
    };
  }
}
