/**
 * Narrated Hey Ralli Resource tutorials (user-initiated playback + audio).
 *
 * Videos:  /public/videos/resources/*.mp4
 * Posters: /public/images/resources/tutorials/*.jpg
 *
 * Distinct from silent homepage marketing demos in `product-demo-videos.ts`.
 */

export type ResourceTutorialId =
  | "create-an-event"
  | "create-with-ai"
  | "create-a-flyer"
  | "approvals-scheduling";

export type ResourceTutorial = {
  id: ResourceTutorialId;
  title: string;
  description: string;
  /** Public MP4 path — do not strip audio when adding assets */
  src: string;
  /** Poster JPEG shown on cards; never autoplay the MP4 on the listing */
  poster: string;
  /** Accessible name for the tutorial control / dialog */
  label: string;
  /**
   * Optional WebVTT captions track. Null until we add caption files separately.
   * Do not invent captions here.
   */
  captionsSrc: string | null;
};

export const RESOURCE_TUTORIALS: Record<ResourceTutorialId, ResourceTutorial> = {
  "create-an-event": {
    id: "create-an-event",
    title: "Create your first event",
    description:
      "See how to add your event details, choose a communication plan, and create your event workspace.",
    src: "/videos/resources/create-an-event-tutorial.mp4",
    poster: "/images/resources/tutorials/create-an-event-tutorial.jpg",
    label: "Create your first event — narrated Hey Ralli tutorial",
    captionsSrc: null,
  },
  "create-with-ai": {
    id: "create-with-ai",
    title: "Creating social posts with AI",
    description:
      "Turn one event into ready-to-share artwork, captions, and a coordinated social campaign with Create with AI.",
    src: "/videos/resources/create-with-ai-tutorial.mp4",
    poster: "/images/resources/tutorials/create-with-ai-tutorial.jpg",
    label: "Creating social posts with AI — narrated Hey Ralli tutorial",
    captionsSrc: null,
  },
  "create-a-flyer": {
    id: "create-a-flyer",
    title: "Create a flyer",
    description:
      "See how to generate a print-ready school flyer from an event with Create with AI — then refine it and send it for approval.",
    src: "/videos/resources/create-a-flyer-tutorial.mp4",
    poster: "/images/resources/tutorials/create-a-flyer-tutorial.jpg",
    label: "Create a flyer — narrated Hey Ralli tutorial",
    captionsSrc: null,
  },
  "approvals-scheduling": {
    id: "approvals-scheduling",
    title: "Approving & scheduling content",
    description:
      "See how your team sends content for review, requests changes, approves posts, and keeps scheduled communications on track.",
    src: "/videos/resources/approvals-scheduling-tutorial.mp4",
    poster: "/images/resources/tutorials/approvals-scheduling-tutorial.jpg",
    label: "Approving & scheduling content — narrated Hey Ralli tutorial",
    captionsSrc: null,
  },
};

export const RESOURCE_TUTORIAL_IDS = Object.keys(
  RESOURCE_TUTORIALS,
) as ResourceTutorialId[];

export function getResourceTutorial(
  id: string | null | undefined,
): ResourceTutorial | null {
  if (!id) return null;
  return id in RESOURCE_TUTORIALS
    ? RESOURCE_TUTORIALS[id as ResourceTutorialId]
    : null;
}

/** Query param used to deep-link a tutorial viewer on `/resources`. */
export const RESOURCE_TUTORIAL_QUERY_PARAM = "tutorial";

/**
 * Captions status for docs / a11y notes.
 * Narrated tutorials may ship without VTT until caption tracks are authored.
 */
export const RESOURCE_TUTORIALS_CAPTIONS_STATUS =
  "No caption/subtitle tracks yet on Resource tutorials; add WebVTT via captionsSrc when ready.";
