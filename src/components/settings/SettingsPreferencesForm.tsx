"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function SettingsPreferencesForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaved(false);

    // TODO: Persist organization settings to Supabase.
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Basic information used across generated campaigns.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Input
            name="organizationName"
            label="Organization Name"
            placeholder="Lincoln Elementary PTO"
            defaultValue="Lincoln Elementary PTO"
          />
          <Input
            name="schoolName"
            label="School Name"
            placeholder="Lincoln Elementary School"
            defaultValue="Lincoln Elementary School"
          />
          <Textarea
            name="mission"
            label="Mission Statement"
            placeholder="Our mission is to support teachers and enrich student experiences..."
            defaultValue="Supporting our school community through volunteer engagement and fundraising."
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Preferences</CardTitle>
          <CardDescription>
            Defaults for AI-generated social media content.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Select name="tone" label="Brand Tone" defaultValue="friendly">
            <option value="friendly">Friendly & Welcoming</option>
            <option value="professional">Professional</option>
            <option value="enthusiastic">Enthusiastic</option>
          </Select>
          <Select name="postFrequency" label="Default Post Frequency" defaultValue="weekly">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
          </Select>
          <Input
            name="hashtags"
            label="Default Hashtags"
            placeholder="#LincolnPTO #SchoolSpirit"
            defaultValue="#LincolnPTO #SchoolSpirit"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Brain</CardTitle>
          <CardDescription>
            Teach CampaignOS your organization voice, channel tone, and communication
            preferences before AI generation.
          </CardDescription>
        </CardHeader>
        <Button href="/settings/ai-brain" variant="secondary">
          Configure AI Brain
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization Workspace</CardTitle>
          <CardDescription>
            How your PTO works — roles, members, channel ownership, and committee
            defaults.
          </CardDescription>
        </CardHeader>
        <Button href="/settings/organization" variant="secondary">
          Configure Organization
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canva</CardTitle>
          <CardDescription>
            Import designs directly into campaign artwork — no manual download step.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button href="/settings/canva" variant="secondary">
            Connect Canva
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta Publishing</CardTitle>
          <CardDescription>
            Connect Facebook and Instagram for automatic feed + story posting after
            approval.
          </CardDescription>
        </CardHeader>
        <Button href="/settings/meta" variant="secondary">
          Connect Meta
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Playbooks</CardTitle>
          <CardDescription>
            Manage countdown communication plans for every event type.
          </CardDescription>
        </CardHeader>
        <Button href="/settings/playbooks" variant="secondary">
          Manage Playbooks
        </Button>
      </Card>

      <div className="flex items-center justify-between">
        {saved && (
          <p className="text-sm text-emerald-600">Settings saved successfully.</p>
        )}
        <div className="ml-auto">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
