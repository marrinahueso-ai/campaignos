"use client";

import { useActionState } from "react";
import { Brain, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CHANNEL_PREFERENCE_HINT,
  CTA_STYLES,
  EMOJI_USAGE_OPTIONS,
  NEWSLETTER_LENGTH_OPTIONS,
  WRITING_STYLES,
} from "@/lib/organization-intelligence/constants";
import {
  saveAiBrainProfileAction,
  type IntelligenceActionState,
} from "@/lib/organization-intelligence/actions";
import type { OrganizationAiProfile } from "@/types/organization-intelligence";

const initialState: IntelligenceActionState = { error: null, success: false };

interface AiBrainProfileFormProps {
  profile: OrganizationAiProfile | null;
}

export function AiBrainProfileForm({ profile }: AiBrainProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveAiBrainProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cos-accent" />
            Organization Voice
          </CardTitle>
          <CardDescription>
            Describe how your PTO sounds — the personality behind every generated
            message.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <Textarea
            name="organizationVoice"
            label="Organization Voice"
            placeholder="Warm, inclusive, and parent-friendly. We celebrate community and always thank volunteers."
            defaultValue={profile?.organizationVoice ?? ""}
            rows={4}
          />
          <Select
            name="writingStyle"
            label="Writing Style"
            defaultValue={profile?.writingStyle ?? ""}
          >
            <option value="">Select a style</option>
            {WRITING_STYLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Textarea
            name="audienceDefaults"
            label="Audience Defaults"
            placeholder="All families and staff — inclusive language, school-appropriate tone."
            defaultValue={profile?.audienceDefaults ?? ""}
            rows={3}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
          <CardDescription>
            General rules CampaignOS should follow when drafting communications.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <Textarea
            name="communicationPreferences"
            label="Communication Preferences"
            placeholder="Lead with dates and locations. Always mention volunteer opportunities. Avoid fundraising promises."
            defaultValue={profile?.communicationPreferences ?? ""}
            rows={4}
          />
          <Textarea
            name="channelPreferences"
            label="Channel Preferences"
            placeholder={CHANNEL_PREFERENCE_HINT}
            defaultValue={profile?.channelPreferences ?? ""}
            rows={3}
          />
          <Select
            name="defaultCtaStyle"
            label="Default CTA Style"
            defaultValue={profile?.defaultCtaStyle ?? ""}
          >
            <option value="">Select a CTA style</option>
            {CTA_STYLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            name="emojiUsage"
            label="Emoji Usage"
            defaultValue={profile?.emojiUsage ?? "moderate"}
          >
            {EMOJI_USAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            name="newsletterLength"
            label="Newsletter Length"
            defaultValue={profile?.newsletterLength ?? "medium"}
          >
            {NEWSLETTER_LENGTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Tone</CardTitle>
          <CardDescription>
            How each channel should feel when CampaignOS writes for your school.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            name="facebookTone"
            label="Facebook Tone"
            placeholder="Conversational, community-focused, 1–2 emoji, clear volunteer CTA."
            defaultValue={profile?.facebookTone ?? ""}
            rows={3}
          />
          <Textarea
            name="instagramTone"
            label="Instagram Tone"
            placeholder="Short, visual-forward, energetic, hashtag-friendly."
            defaultValue={profile?.instagramTone ?? ""}
            rows={3}
          />
          <Textarea
            name="websiteTone"
            label="Website Tone"
            placeholder="Informative, scannable paragraphs with date, time, and location upfront."
            defaultValue={profile?.websiteTone ?? ""}
            rows={3}
          />
          <Textarea
            name="principalMessagingStyle"
            label="Principal Messaging Style"
            placeholder="Professional, brief, staff-facing, aligned with school policy."
            defaultValue={profile?.principalMessagingStyle ?? ""}
            rows={3}
          />
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          {state.success && !state.error && (
            <p className="text-sm text-emerald-600">AI Brain profile saved.</p>
          )}
        </div>
        <Button type="submit" disabled={isPending} className="sm:ml-auto">
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save AI Brain Profile"}
        </Button>
      </div>
    </form>
  );
}
