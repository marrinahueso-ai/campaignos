import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

export function channelLabelForBundle(bundle: MetaPublishBundle): string {
  if (!bundle.channel) {
    return "Other channel";
  }

  return CHANNEL_LABELS[bundle.channel] ?? bundle.channel;
}
