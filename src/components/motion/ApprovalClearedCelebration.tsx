"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Calendar, Check } from "lucide-react";
import { useSystemReducedMotion } from "@/marketing/engine/hooks/useReducedMotion";
import "./approval-cleared-celebration.css";

const CONFETTI_COLORS = [
  "#2f4a3c",
  "#2a7a86",
  "#c4922e",
  "#f6f2eb",
  "#6b8171",
  "#b07a1a",
  "#ebe4d9",
];

const AUTO_DISMISS_MS = 2200;

type ConfettiPiece = {
  id: string;
  left: string;
  width: string;
  height: string;
  background: string;
  borderRadius: string;
  dx: string;
  dy: string;
  rot: string;
  dur: string;
  delay: string;
};

export type ApprovalClearedCelebrationProps = {
  open: boolean;
  /** Schedule hero line, e.g. "Thu, Aug 27 · 9:00 AM" */
  scheduleLabel?: string | null;
  /** Softer subline under the headline */
  scheduleSubline?: string | null;
  onDismiss: () => void;
};

function buildPieces(count: number, burstDelay = 0): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const left = 4 + Math.random() * 92;
    const dx = (Math.random() - 0.5) * 120;
    const dy = 140 + Math.random() * 100;
    const rot = 100 + Math.random() * 320;
    const dur = 1.55 + Math.random() * 0.55;
    const delay = burstDelay + Math.random() * 0.25;
    const w = 5 + Math.random() * 6;
    const h = 6 + Math.random() * 8;
    pieces.push({
      id: `${burstDelay}-${i}-${left.toFixed(2)}`,
      left: `${left}%`,
      width: `${w}px`,
      height: `${h}px`,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      borderRadius:
        Math.random() > 0.5 ? "50%" : Math.random() > 0.5 ? "1px" : "2px 6px",
      dx: `${dx}px`,
      dy: `${dy}px`,
      rot: `${rot}deg`,
      dur: `${dur}s`,
      delay: `${delay}s`,
    });
  }
  return pieces;
}

/**
 * Final Approve & schedule win: “Ready to Ralli” + brand confetti (~2s).
 * Reduced motion: static headline + check, no particles.
 */
export function ApprovalClearedCelebration({
  open,
  scheduleLabel,
  scheduleSubline,
  onDismiss,
}: ApprovalClearedCelebrationProps) {
  const reducedMotion = useSystemReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [confettiActive, setConfettiActive] = useState(false);
  const [cardMode, setCardMode] = useState<"go" | "static" | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) {
      setPieces([]);
      setConfettiActive(false);
      setCardMode(null);
      return;
    }

    if (reducedMotion) {
      setCardMode("static");
      setPieces([]);
      setConfettiActive(false);
    } else {
      setCardMode("go");
      setPieces(buildPieces(52));
      setConfettiActive(true);
      const burst = window.setTimeout(() => {
        setPieces((prev) => [...prev, ...buildPieces(28, 0)]);
      }, 420);
      const clearConfetti = window.setTimeout(() => {
        setConfettiActive(false);
      }, AUTO_DISMISS_MS);
      return () => {
        window.clearTimeout(burst);
        window.clearTimeout(clearConfetti);
      };
    }
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      dismissRef.current();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) {
    return null;
  }

  const when = scheduleLabel?.trim() || null;
  const sub =
    scheduleSubline?.trim() ||
    (when ? `Ready to post · ${when}` : "Approved and ready to post");

  return (
    <div className="ralli-yay" role="dialog" aria-modal="true" aria-live="polite">
      <button
        type="button"
        className="ralli-yay__backdrop"
        aria-label="Dismiss celebration"
        onClick={onDismiss}
      />
      <div className="ralli-yay__stage">
        <div
          className={`ralli-yay__confetti${confettiActive ? " is-active" : ""}`}
          aria-hidden="true"
        >
          {pieces.map((piece) => (
            <span
              key={piece.id}
              className="ralli-yay__piece"
              style={
                {
                  left: piece.left,
                  width: piece.width,
                  height: piece.height,
                  background: piece.background,
                  borderRadius: piece.borderRadius,
                  "--dx": piece.dx,
                  "--dy": piece.dy,
                  "--rot": piece.rot,
                  "--dur": piece.dur,
                  "--delay": piece.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div
          className={[
            "ralli-yay__card",
            cardMode === "go" ? "is-go" : "",
            cardMode === "static" ? "is-static" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="ralli-yay__check" aria-hidden="true">
            <Check strokeWidth={2.6} />
          </div>
          <h2 className="ralli-yay__headline">Ready to Ralli</h2>
          <p className="ralli-yay__sub">{sub}</p>
          {when ? (
            <div className="ralli-yay__schedule">
              <div className="ralli-yay__schedule-icon" aria-hidden="true">
                <Calendar className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="ralli-yay__schedule-kicker">Locked to schedule</p>
                <p className="ralli-yay__schedule-when">{when}</p>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="ralli-yay__dismiss"
            onClick={onDismiss}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
