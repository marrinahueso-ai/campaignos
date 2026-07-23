"use client";

import { useTimelineContextOptional } from "./DemoTimeline";

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(1).padStart(4, "0")}`;
}

/**
 * Keyboard-accessible authoring controls for a DemoPlayer.
 * Hidden by default — enable with `showControls` or render manually.
 */
export function DemoControls({ className }: { className?: string }) {
  const timeline = useTimelineContextOptional();
  if (!timeline) return null;

  const {
    currentTime,
    duration,
    progress,
    isPlaying,
    playbackRate,
    play,
    pause,
    seek,
    restart,
    setPlaybackRate,
    reducedMotion,
  } = timeline;

  return (
    <div
      className={
        className ??
        "mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3 text-sm text-[var(--cos-text)]"
      }
      data-marketing-demo-controls
    >
      <button
        type="button"
        className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)] px-3 py-1.5 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
        onClick={() => (isPlaying ? pause() : play())}
        aria-label={isPlaying ? "Pause demo" : "Play demo"}
        disabled={reducedMotion}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      <button
        type="button"
        className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)] px-3 py-1.5 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
        onClick={() => restart()}
        aria-label="Restart demo"
        disabled={reducedMotion}
      >
        Restart
      </button>

      <label className="flex min-w-[12rem] flex-1 items-center gap-2">
        <span className="sr-only">Scrub timeline</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={currentTime}
          onChange={(event) => {
            pause();
            seek(Number(event.target.value));
          }}
          className="w-full accent-[var(--cos-accent)]"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          disabled={reducedMotion}
        />
      </label>

      <span className="tabular-nums text-[var(--cos-muted)]" aria-live="off">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <label className="flex items-center gap-1.5 text-[var(--cos-muted)]">
        <span className="sr-only">Playback speed</span>
        <select
          value={String(playbackRate)}
          onChange={(event) => setPlaybackRate(Number(event.target.value))}
          className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)] px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
          aria-label="Playback speed"
          disabled={reducedMotion}
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </label>

      <span className="text-xs text-[var(--cos-muted)]">
        {Math.round(progress * 100)}%
        {reducedMotion ? " · reduced motion" : ""}
      </span>
    </div>
  );
}
