"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateAllDraftsAction } from "@/lib/communications-brain/actions";

interface GenerateAllDraftsButtonProps {
  eventId: string;
}

export function GenerateAllDraftsButton({ eventId }: GenerateAllDraftsButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerateAll() {
    startTransition(async () => {
      await generateAllDraftsAction(eventId);
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" disabled={isPending} onClick={handleGenerateAll}>
      <Sparkles className="h-4 w-4" />
      {isPending ? "Drafting…" : "Draft all messages"}
    </Button>
  );
}
