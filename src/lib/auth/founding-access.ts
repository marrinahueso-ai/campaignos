const TRUTHY = new Set(["1", "true", "yes", "on"]);

function parseFoundingAccessCodes(): Set<string> {
  const codes = new Set<string>();

  const list = process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES?.trim();
  if (list) {
    for (const entry of list.split(",")) {
      const normalized = entry.trim().toUpperCase();
      if (normalized) {
        codes.add(normalized);
      }
    }
  }

  const single = process.env.CAMPAIGNOS_BETA_ACCESS_CODE?.trim();
  if (single) {
    codes.add(single.toUpperCase());
  }

  return codes;
}

export function isFoundingAccessCodeRequired(): boolean {
  const value = process.env.CAMPAIGNOS_REQUIRE_ACCESS_CODE?.trim().toLowerCase();
  return value ? TRUTHY.has(value) : false;
}

export function validateFoundingAccessCode(code: string | null | undefined): boolean {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  const configuredCodes = parseFoundingAccessCodes();
  return configuredCodes.size > 0 && configuredCodes.has(normalized);
}

export interface FoundingAccessResolution {
  valid: boolean;
  billingExempt: boolean;
  normalizedCode: string | null;
  error: string | null;
}

/** Validate optional founding access code during school setup. */
export function resolveFoundingAccess(
  code: string | null | undefined,
): FoundingAccessResolution {
  const normalizedCode = code?.trim().toUpperCase() || null;
  const required = isFoundingAccessCodeRequired();

  if (!normalizedCode) {
    if (required) {
      return {
        valid: false,
        billingExempt: false,
        normalizedCode: null,
        error: "A founding access code is required to get started.",
      };
    }

    return {
      valid: true,
      billingExempt: false,
      normalizedCode: null,
      error: null,
    };
  }

  if (!validateFoundingAccessCode(normalizedCode)) {
    return {
      valid: false,
      billingExempt: false,
      normalizedCode,
      error: "That access code is not valid. Check the code and try again.",
    };
  }

  return {
    valid: true,
    billingExempt: true,
    normalizedCode,
    error: null,
  };
}

export function isOrganizationBillingExempt(organization: {
  billingExemptAt?: string | null;
}): boolean {
  return Boolean(organization.billingExemptAt);
}
