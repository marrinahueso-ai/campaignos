import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import fs from "node:fs";
import path from "node:path";

type Row = {
  status: "PASS" | "FAIL" | "SKIPPED";
  title: string;
  workflow: string;
  explanation: string;
  screenshot?: string;
};

function workflowFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("invite") || lower.includes("password setup")) {
    return "Invite accept";
  }
  if (lower.includes("upload_artwork") || lower.includes("upload access")) {
    return "Create with AI / upload gate";
  }
  if (lower.includes("login")) return "Login";
  if (lower.includes("dashboard")) return "Dashboard";
  if (lower.includes("team") || lower.includes("people & responsibilities")) {
    return "Team & Access";
  }
  if (lower.includes("create with ai") || lower.includes("campaign-builder")) {
    return "Create with AI";
  }
  if (lower.includes("inspiration") || lower.includes("playbook")) {
    return "Creative Setup / Milestones";
  }
  if (lower.includes("artwork") || lower.includes("caption")) {
    return "Preview / Generation";
  }
  if (lower.includes("approval")) return "Approvals";
  if (lower.includes("calendar")) return "Calendar";
  if (lower.includes("blank") || lower.includes("loads")) return "App load";
  return "Hey Ralli smoke";
}

function plainEnglish(result: TestResult, title: string): string {
  if (result.status === "passed") {
    return `Looks good: "${title}" completed as expected.`;
  }
  if (result.status === "skipped") {
    return (
      result.errors[0]?.message ||
      "Skipped because test credentials or staging data were not configured."
    );
  }
  const message =
    result.errors.map((error) => error.message || "").join(" ").trim() ||
    "The page did not behave as expected.";
  return message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .slice(0, 4)
    .join(" ");
}

class PlainEnglishReporter implements Reporter {
  private rows: Row[] = [];
  private reportPath = path.join(
    process.cwd(),
    "test-results",
    "hey-ralli",
    "hey-ralli-report.txt",
  );

  onBegin(_config: FullConfig, _suite: Suite) {
    fs.mkdirSync(path.dirname(this.reportPath), { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const screenshot = result.attachments.find(
      (attachment) => attachment.name === "screenshot" && attachment.path,
    )?.path;

    const status =
      result.status === "passed"
        ? "PASS"
        : result.status === "skipped"
          ? "SKIPPED"
          : "FAIL";

    this.rows.push({
      status,
      title: test.title,
      workflow: workflowFromTitle(test.title),
      explanation: plainEnglish(result, test.title),
      screenshot,
    });
  }

  onEnd(_result: FullResult) {
    const lines = [
      "Hey Ralli smoke test report",
      "===========================",
      "",
    ];

    for (const row of this.rows) {
      lines.push(`Status: ${row.status}`);
      lines.push(`Workflow: ${row.workflow}`);
      lines.push(`Test: ${row.title}`);
      lines.push(`Explanation: ${row.explanation}`);
      if (row.screenshot) {
        lines.push(`Screenshot: ${row.screenshot}`);
      }
      lines.push("---");
    }

    const passed = this.rows.filter((row) => row.status === "PASS").length;
    const failed = this.rows.filter((row) => row.status === "FAIL").length;
    const skipped = this.rows.filter((row) => row.status === "SKIPPED").length;
    lines.push("");
    lines.push(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    fs.writeFileSync(this.reportPath, `${lines.join("\n")}\n`, "utf8");
    console.log(`\nPlain-English report saved to: ${this.reportPath}\n`);
    console.log(lines.join("\n"));
  }
}

export default PlainEnglishReporter;
