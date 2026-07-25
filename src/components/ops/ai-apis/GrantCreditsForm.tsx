"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { AI_RESERVE_SKUS, type AiReserveSkuId } from "@/lib/ai/credit-constants";
import {
  adjustAiReserveAction,
  grantAiBonusAction,
  grantAiReserveAction,
} from "@/lib/ops/ai-credits-actions";
import { cn } from "@/lib/utils/cn";

type Mode = "reserve" | "bonus" | "adjustment";

const SKU_OPTIONS = (
  Object.entries(AI_RESERVE_SKUS) as [
    AiReserveSkuId,
    (typeof AI_RESERVE_SKUS)[AiReserveSkuId],
  ][]
).map(([id, sku]) => ({
  id,
  label: `${sku.label} — $${sku.priceUsd} / ${sku.credits.toLocaleString()} credits`,
}));

type Props = {
  organizationId: string;
  organizationName: string;
  unlimited: boolean;
};

export function GrantCreditsForm({
  organizationId,
  organizationName,
  unlimited,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("reserve");
  const [sku, setSku] = useState<AiReserveSkuId>("reserve");
  const [credits, setCredits] = useState("1000");
  const [delta, setDelta] = useState("-500");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      let result:
        | { success: true; message: string }
        | { success: false; error: string };

      if (mode === "reserve") {
        result = await grantAiReserveAction({
          organizationId,
          sku,
          note: note.trim() || undefined,
        });
      } else if (mode === "bonus") {
        const amount = Number(credits);
        if (!Number.isFinite(amount)) {
          setError("Enter a valid credit amount.");
          return;
        }
        result = await grantAiBonusAction({
          organizationId,
          credits: amount,
          note: note.trim() || undefined,
        });
      } else {
        const amount = Number(delta);
        if (!Number.isFinite(amount)) {
          setError("Enter a valid adjustment amount.");
          return;
        }
        if (!note.trim()) {
          setError("A note is required for adjustments.");
          return;
        }
        result = await adjustAiReserveAction({
          organizationId,
          delta: amount,
          note: note.trim(),
        });
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
      setNote("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-3 rounded-xl border border-cos-border bg-cos-bg/40 p-3"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
          Grant credits
        </p>
        <p className="mt-1 text-xs text-cos-muted">
          Adds to <span className="font-medium text-cos-text">{organizationName}</span>
          ’s Reserve (rolls over). Not a monthly allowance top-up.
          {unlimited
            ? " This org is unlimited — grants still land in Reserve for bookkeeping."
            : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["reserve", "Reserve SKU"],
            ["bonus", "Bonus"],
            ["adjustment", "Adjust"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => {
              setMode(id);
              setMessage(null);
              setError(null);
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium",
              mode === id
                ? "bg-cos-dark text-[#f6f2eb]"
                : "border border-cos-border bg-cos-card text-cos-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "reserve" ? (
        <label className="block text-xs text-cos-muted">
          Package
          <select
            value={sku}
            disabled={pending}
            onChange={(event) => setSku(event.target.value as AiReserveSkuId)}
            className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
          >
            {SKU_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode === "bonus" ? (
        <label className="block text-xs text-cos-muted">
          Credits to add
          <input
            type="number"
            min={1}
            max={100_000}
            step={1}
            value={credits}
            disabled={pending}
            onChange={(event) => setCredits(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
          />
        </label>
      ) : null}

      {mode === "adjustment" ? (
        <label className="block text-xs text-cos-muted">
          Delta (use negative to reduce Reserve)
          <input
            type="number"
            min={-100_000}
            max={100_000}
            step={1}
            value={delta}
            disabled={pending}
            onChange={(event) => setDelta(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
          />
        </label>
      ) : null}

      <label className="block text-xs text-cos-muted">
        Note{mode === "adjustment" ? " (required)" : " (optional)"}
        <input
          type="text"
          value={note}
          disabled={pending}
          placeholder={
            mode === "adjustment"
              ? "Why this adjustment?"
              : "e.g. Premium included Reserve, support goodwill"
          }
          onChange={(event) => setNote(event.target.value)}
          className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-cos-dark px-3 py-2 text-sm font-medium text-[#f6f2eb] disabled:opacity-40"
      >
        {pending ? "Applying…" : "Apply grant"}
      </button>

      {message ? (
        <p className="text-xs text-cos-success-text" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-cos-error-text" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
