import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  ARTWORK_REBUILD_DESCRIPTION,
  ARTWORK_REBUILD_TITLE,
} from "@/lib/creative-studio/artwork-section-disabled";

export function ArtworkRebuildPlaceholder() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-cos-text">{ARTWORK_REBUILD_TITLE}</h1>
      <p className="mt-3 text-sm leading-relaxed text-cos-muted">{ARTWORK_REBUILD_DESCRIPTION}</p>
      <Button href="/dashboard" size="sm" variant="secondary" className="mt-8">
        Return to Today
      </Button>
      <Link
        href="/events"
        className="mt-4 text-sm text-cos-muted underline-offset-4 hover:text-cos-text hover:underline"
      >
        View campaigns
      </Link>
    </div>
  );
}
