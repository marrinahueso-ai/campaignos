"use client";

import { useEffect, useRef, useState } from "react";

import { BackgroundLibraryPicker } from "@/components/background-library/BackgroundLibraryPicker";

const FLYER_LIBRARY_SOURCE = "hey-ralli-flyer";
const FLYER_LIBRARY_HOST_SOURCE = "hey-ralli-flyer-host";

type FlyerComposerEmbedProps = {
  frameKey: string;
  src: string;
};

/**
 * Client bridge: iframe + Background Library picker via postMessage so the
 * static flyer HTML can open the same school picker as Social.
 */
export function FlyerComposerEmbed({ frameKey, src }: FlyerComposerEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if ((data as { source?: string }).source !== FLYER_LIBRARY_SOURCE) return;
      if ((data as { type?: string }).type === "open-background-library") {
        setLibraryOpen(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function postToFlyer(payload: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(
      { source: FLYER_LIBRARY_HOST_SOURCE, ...payload },
      window.location.origin,
    );
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[560px] flex-col overflow-hidden bg-[#f6f2eb] lg:-mx-8 lg:-my-10">
      <iframe
        key={frameKey}
        ref={iframeRef}
        src={src}
        title="Flyer composer"
        className="min-h-0 w-full flex-1 border-0 bg-[#f6f2eb]"
        allow="microphone"
      />
      <BackgroundLibraryPicker
        open={libraryOpen}
        onClose={() => {
          setLibraryOpen(false);
          postToFlyer({ type: "background-library-cancelled" });
        }}
        onSelect={(asset) => {
          setLibraryOpen(false);
          postToFlyer({
            type: "background-library-selected",
            asset: {
              id: asset.id,
              publicUrl: asset.publicUrl,
              title: asset.title,
            },
          });
        }}
      />
    </div>
  );
}
