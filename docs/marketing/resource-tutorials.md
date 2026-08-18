# Resource tutorials (narrated)

**Status:** Living  
**Owner:** Marketing / Engineering  
**Last updated:** 2026-08-17  
**Related:** [Feature list](../product/feature-list.md) · [Architecture](../engineering/architecture.md)

## Purpose

User-initiated narrated walkthroughs on `/resources` Featured Tutorials. Separate from silent homepage Product Tour demos (`product-demo-videos.ts`).

On phones, `/resources` is in the marketing header **menu** (the top links hide below `md`) and in the footer. Homepage Product Tour video switching uses chips above the clip.

## Shipped tutorials

| Id | Title | MP4 | Poster |
|----|-------|-----|--------|
| `create-an-event` | Create your first event | `create-an-event-tutorial.mp4` | `create-an-event-tutorial.jpg` |
| `create-with-ai` | Creating social posts with AI | `create-with-ai-tutorial.mp4` | `create-with-ai-tutorial.jpg` |
| `approvals-scheduling` | Approving & scheduling content | `approvals-scheduling-tutorial.mp4` | `approvals-scheduling-tutorial.jpg` |

## Assets

| Kind | Path |
|------|------|
| MP4 | `public/videos/resources/<slug>-tutorial.mp4` |
| Poster | `public/images/resources/tutorials/<slug>-tutorial.jpg` |
| Registry | `src/lib/marketing/resource-tutorials.ts` |

Preserve audio on every copy/transcode. Do not strip AAC.

## Playback rules

- Listing: poster + play affordance only; `preload` never loads the full MP4 on page load (video element mounts only in the viewer).
- Viewer: lightbox modal, native `<video controls>`, `object-fit: contain`, no crop/cover in the player.
- Deep link: `/resources?tutorial=<id>`
- Captions: optional `captionsSrc` WebVTT. **None authored yet** — dialog notes when missing.

## Adding a tutorial

1. Add MP4 + poster under the paths above (clean kebab filename).
2. Register in `RESOURCE_TUTORIALS`.
3. Point a Featured card (or search entry) at `{ kind: "video", tutorialId }`.
4. Update tests in `resource-tutorials.test.ts` / feature-list if user-visible.
