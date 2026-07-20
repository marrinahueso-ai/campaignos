"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import type { ActiveOrganizationOption } from "@/lib/auth/active-organization";
import { setActiveOrganizationAction } from "@/lib/auth/active-organization-actions";
import { cn } from "@/lib/utils/cn";

type OrganizationSwitcherProps = {
  organizations: ActiveOrganizationOption[];
  activeOrganizationId: string | null;
};

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (organizations.length <= 1) {
    return null;
  }

  const active =
    organizations.find(
      (entry) => entry.organizationId === activeOrganizationId,
    ) ?? organizations[0];

  function switchTo(organizationId: string) {
    if (organizationId === activeOrganizationId || pending) {
      setOpen(false);
      return;
    }

    setError(null);
    setOpen(false);
    startTransition(() => {
      void (async () => {
        try {
          const result = await setActiveOrganizationAction(organizationId);
          // Successful switch redirects; failures return a result object.
          if (result && !result.success) {
            setError(result.error ?? "Could not switch organization.");
          }
        } catch (error) {
          // next/navigation redirect() rejects the action promise on success.
          const digest =
            error && typeof error === "object" && "digest" in error
              ? String((error as { digest?: string }).digest ?? "")
              : "";
          if (digest.startsWith("NEXT_REDIRECT")) {
            return;
          }
          setError("Could not switch organization.");
        }
      })();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Organization: ${active?.organizationName ?? "Select"}`}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex max-w-[14rem] items-center gap-1.5 border border-cos-border bg-cos-bg px-2.5 py-1.5 text-left text-xs transition-colors",
          "text-cos-text hover:border-cos-text/40 disabled:opacity-60",
        )}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-cos-muted" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate font-medium">
          {active?.organizationName ?? "Organization"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cos-muted" strokeWidth={1.5} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close organization menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 min-w-[14rem] border border-cos-border bg-cos-card py-1 shadow-lg"
          >
            {organizations.map((org) => {
              const isActive = org.organizationId === active?.organizationId;
              return (
                <li key={org.organizationId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={pending}
                    onClick={() => switchTo(org.organizationId)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors",
                      isActive
                        ? "bg-cos-bg text-cos-text"
                        : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-cos-text">
                        {org.organizationName}
                      </span>
                      {org.roleLabel ? (
                        <span className="block truncate text-[11px] text-cos-muted">
                          {org.roleLabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full z-50 mt-1 max-w-[14rem] text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
