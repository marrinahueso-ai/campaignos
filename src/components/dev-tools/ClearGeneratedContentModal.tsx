"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CAMPAIGN_CLEAR_CONFIRM_TOKEN,
  CLEAR_CONFIRMATION_COPY,
} from "@/lib/dev-tools/constants";

interface ClearGeneratedContentModalProps {
  open: boolean;
  title: string;
  requireClearToken?: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onConfirm: (confirmToken: string) => void;
  onClose: () => void;
}

export function ClearGeneratedContentModal({
  open,
  title,
  requireClearToken = false,
  isSubmitting,
  errorMessage,
  onConfirm,
  onClose,
}: ClearGeneratedContentModalProps) {
  const [token, setToken] = useState("");
  const canConfirm =
    !requireClearToken || token.trim() === CAMPAIGN_CLEAR_CONFIRM_TOKEN;

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-generated-title"
    >
      <div className="w-full max-w-md border border-cos-border bg-cos-card p-6 shadow-lg">
        <h2
          id="clear-generated-title"
          className="font-display text-2xl text-cos-text"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-cos-muted">
          {CLEAR_CONFIRMATION_COPY}
        </p>

        {requireClearToken ? (
          <div className="mt-4">
            <p className="text-sm text-cos-muted">
              Type{" "}
              <strong className="text-cos-text">
                {CAMPAIGN_CLEAR_CONFIRM_TOKEN}
              </strong>{" "}
              to enable this action.
            </p>
            <Input
              className="mt-2"
              label="Confirmation"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={CAMPAIGN_CLEAR_CONFIRM_TOKEN}
              autoComplete="off"
            />
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 text-sm text-cos-warning-text" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!canConfirm || isSubmitting}
            onClick={() => onConfirm(token.trim())}
          >
            {isSubmitting ? "Clearing…" : "Clear generated content"}
          </Button>
        </div>
      </div>
    </div>
  );
}
