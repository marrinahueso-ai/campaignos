import { defineTimeline } from "@/marketing/engine";
import { COMMUNICATIONS_HUB_SPEC } from "./communicationsHubSpec";

void COMMUNICATIONS_HUB_SPEC;

export const COMMUNICATIONS_HUB_TIMELINE = defineTimeline({
  id: "communications-hub",
  duration: 18,
  loop: true,
  cues: [
    { at: 0, id: "inbox", label: "Inbox" },
    { at: 3.5, id: "open", label: "Open thread" },
    { at: 6.5, id: "draft", label: "AI draft" },
    { at: 12.5, id: "send", label: "Move to send" },
    { at: 13.4, id: "send-click", label: "Click send" },
    { at: 14, id: "toast", label: "Toast" },
    { at: 16.5, id: "hold", label: "Hold" },
  ],
});
