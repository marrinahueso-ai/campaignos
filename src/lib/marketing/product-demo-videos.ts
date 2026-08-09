/**
 * Final Screen Studio product demos for marketing surfaces.
 * Videos: /public/videos/marketing/*.mp4
 * Posters: /public/images/marketing-home/posters/*.jpg
 */

export type MarketingProductDemoId =
  | "dashboard"
  | "calendar"
  | "event-planning"
  | "create-with-ai"
  | "approvals"
  | "volunteers";

export type MarketingProductDemoAsset = {
  id: MarketingProductDemoId;
  /** Public MP4 path */
  src: string;
  /** Poster JPEG path (never show a black frame) */
  poster: string;
  /** Accessible description of the product UI shown */
  label: string;
};

export const MARKETING_PRODUCT_DEMOS: Record<
  MarketingProductDemoId,
  MarketingProductDemoAsset
> = {
  dashboard: {
    id: "dashboard",
    src: "/videos/marketing/dashboard-demo.mp4",
    poster: "/images/marketing-home/posters/dashboard-demo.jpg",
    label:
      "Hey Ralli dashboard overview — today's schedule, volunteers, and posts",
  },
  calendar: {
    id: "calendar",
    src: "/videos/marketing/calendar-demo.mp4",
    poster: "/images/marketing-home/posters/calendar-demo.jpg",
    label:
      "Hey Ralli calendar — events, scheduled posts, and published communications",
  },
  "event-planning": {
    id: "event-planning",
    src: "/videos/marketing/event-planning-demo.mp4",
    poster: "/images/marketing-home/posters/event-planning-demo.jpg",
    label:
      "Hey Ralli event workspace — planning, approvals, volunteers, and community",
  },
  "create-with-ai": {
    id: "create-with-ai",
    src: "/videos/marketing/create-with-ai-demo.mp4",
    poster: "/images/marketing-home/posters/create-with-ai-demo.jpg",
    label:
      "Create with AI social campaign — artwork, captions, and milestone preview",
  },
  approvals: {
    id: "approvals",
    src: "/videos/marketing/approvals-demo.mp4",
    poster: "/images/marketing-home/posters/approvals-demo.jpg",
    label:
      "Hey Ralli Approvals — review, schedule, and publish school communications",
  },
  volunteers: {
    id: "volunteers",
    src: "/videos/marketing/volunteers-demo.mp4",
    poster: "/images/marketing-home/posters/volunteers-demo.jpg",
    label:
      "Hey Ralli Volunteers — staffing fill status and coordination by event",
  },
};
