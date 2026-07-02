export interface DraftPerformanceMeta {
  model?: string | null;
  configuredModel?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  usedFallbackModel?: boolean;
  eventId?: string;
  channel?: string;
  communicationItemId?: string;
}

export class DraftPerformanceTracker {
  private readonly startedAt = performance.now();
  private readonly steps = new Map<string, number>();
  private meta: DraftPerformanceMeta = {};

  /** Mark when the server action / mutation handler received the request. */
  static markActionReceived(): DraftPerformanceTracker {
    const tracker = new DraftPerformanceTracker();
    tracker.steps.set("actionReceived", 0);
    return tracker;
  }

  record(step: string, durationMs: number): void {
    this.steps.set(step, Math.round(durationMs));
  }

  async time<T>(step: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.record(step, performance.now() - start);
    }
  }

  timeSync<T>(step: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.record(step, performance.now() - start);
    }
  }

  setMeta(partial: DraftPerformanceMeta): void {
    this.meta = { ...this.meta, ...partial };
  }

  getStep(step: string): number {
    return this.steps.get(step) ?? 0;
  }

  printSummary(): void {
    const total = Math.round(performance.now() - this.startedAt);
    const line = (label: string, key: string) =>
      `- ${label}: ${this.getStep(key)} ms`;

    const lines = [
      "",
      "AI Draft Performance",
      line("event load", "eventLoad"),
      line("grounding", "grounding"),
      line("brand voice", "brandVoice"),
      line("strategy", "strategy"),
      line("prompt assembly", "promptAssembly"),
      line("OpenAI", "openAi"),
      line("parsing", "parsing"),
      line("scoring", "scoring"),
      line("save version", "saveVersion"),
      line("status update", "statusUpdate"),
      line("activity log", "activityLog"),
      line("revalidate", "revalidate"),
      `- total: ${total} ms`,
    ];

    if (this.meta.model || this.meta.promptTokens != null) {
      lines.push("");
      lines.push("AI Draft Metadata");
      if (this.meta.configuredModel) {
        lines.push(`- configured model: ${this.meta.configuredModel}`);
      }
      if (this.meta.model) {
        lines.push(`- model used: ${this.meta.model}`);
      }
      if (this.meta.promptTokens != null) {
        lines.push(`- prompt tokens: ${this.meta.promptTokens}`);
      }
      if (this.meta.completionTokens != null) {
        lines.push(`- completion tokens: ${this.meta.completionTokens}`);
      }
      if (this.meta.totalTokens != null) {
        lines.push(`- total tokens: ${this.meta.totalTokens}`);
      }
      lines.push(
        `- fallback model used: ${this.meta.usedFallbackModel ? "yes" : "no"}`,
      );
    }

    console.info(lines.join("\n"));
  }
}

export async function timeAsync<T>(
  tracker: DraftPerformanceTracker,
  step: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracker.time(step, fn);
}
