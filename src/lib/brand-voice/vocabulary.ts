import type { VocabularyDictionary } from "@/lib/brand-voice/types";
import type { Organization } from "@/types";
import type { OrganizationAiProfile } from "@/types/organization-intelligence";

const DEFAULT_DISALLOWED = [
  "leverage",
  "synergy",
  "stakeholders",
  "optimize",
  "streamline",
  "best-in-class",
  "world-class",
  "cutting-edge",
  "robust solution",
  "deliverables",
  "touch base",
  "circle back",
  "at this time",
  "in order to",
  "we are excited to announce",
  "dear valued",
  "dear community member",
];

const DEFAULT_PREFERRED = [
  "families",
  "community",
  "together",
  "join us",
  "save the date",
  "thank you",
];

export function buildVocabularyDictionary(input: {
  organization: Organization | null;
  profile: OrganizationAiProfile | null;
  eventTitle: string;
}): VocabularyDictionary {
  const { organization, profile, eventTitle } = input;
  const preferredFromProfile = extractQuotedPhrases(profile?.organizationVoice);
  const prefsFromNotes = extractPreferredFromPreferences(
    profile?.communicationPreferences,
  );

  const schoolName = organization?.name?.trim();
  const ptoLabel = schoolName ? `${schoolName} PTO` : "PTO";

  return {
    preferredTerms: unique([
      ...DEFAULT_PREFERRED,
      ...preferredFromProfile,
      ...prefsFromNotes,
    ]),
    disallowedTerms: unique([
      ...DEFAULT_DISALLOWED,
      ...extractDisallowedFromPreferences(profile?.communicationPreferences),
    ]),
    preferredSchoolNames: schoolName ? [schoolName] : [],
    preferredPtoTerms: unique([ptoLabel, "PTO", "our PTO"]),
    preferredEventNames: eventTitle.trim() ? [eventTitle.trim()] : [],
    preferredBrandingLanguage: buildBrandingLanguage(organization, profile),
  };
}

function buildBrandingLanguage(
  organization: Organization | null,
  profile: OrganizationAiProfile | null,
): string[] {
  const terms: string[] = [];

  if (organization?.mascot?.trim()) {
    terms.push(`School mascot: ${organization.mascot.trim()} (use only when verified)`);
  }
  if (organization?.district?.trim()) {
    terms.push(organization.district.trim());
  }
  if (profile?.channelPreferences?.trim()) {
    terms.push(profile.channelPreferences.trim());
  }

  return terms;
}

function extractQuotedPhrases(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const matches = text.match(/["“]([^"”]+)["”]/g);
  if (!matches) return [];
  return matches.map((entry) => entry.replace(/["“”]/g, "").trim()).filter(Boolean);
}

function extractPreferredFromPreferences(
  preferences: string | null | undefined,
): string[] {
  if (!preferences?.trim()) return [];
  return preferences
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && part.length < 60);
}

function extractDisallowedFromPreferences(
  preferences: string | null | undefined,
): string[] {
  if (!preferences?.trim()) return [];
  const lower = preferences.toLowerCase();
  const disallowed: string[] = [];
  if (lower.includes("avoid") && lower.includes("fundraising")) {
    disallowed.push("fundraising promises");
  }
  if (lower.includes("no jargon")) {
    disallowed.push("education jargon", "acronyms without explanation");
  }
  return disallowed;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
