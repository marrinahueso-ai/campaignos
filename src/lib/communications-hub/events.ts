export const COMMUNICATIONS_HUB_RESET_EVENT = "communications-hub:reset-filters";

export function dispatchCommunicationsHubReset(): void {
  window.dispatchEvent(new CustomEvent(COMMUNICATIONS_HUB_RESET_EVENT));
}
