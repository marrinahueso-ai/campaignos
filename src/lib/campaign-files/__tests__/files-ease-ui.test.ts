import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("files ease UI contracts", () => {
  const shell = readSrc("../../../components/campaign-files/FilesEaseShell.tsx");
  const list = readSrc("../../../components/campaign-files/FilesEaseList.tsx");
  const upload = readSrc("../../../components/campaign-files/FileUploadDialog.tsx");
  const page = readSrc("../../../app/(dashboard)/files/page.tsx");

  it("wires /files to the Ease shell, not the dense FilesDocumentsShell", () => {
    assert.match(page, /FilesEaseShell/);
    assert.doesNotMatch(page, /FilesDocumentsShell/);
  });

  it("uses a quiet pill search for file or event name", () => {
    assert.match(shell, /Search by file or event name/);
    assert.match(shell, /type="search"/);
  });

  it("uses Newest / Name / Size / Type as quiet text sort controls", () => {
    assert.match(shell, /label: "Newest"/);
    assert.match(shell, /label: "Name"/);
    assert.match(shell, /label: "Size"/);
    assert.match(shell, /label: "Type"/);
    assert.match(shell, /role="group"\s*\n?\s*aria-label="Sort files"/);
  });

  it("filters events with a dropdown (Coming up first, not a chip wall)", () => {
    assert.match(shell, /Coming up/);
    assert.match(shell, /Filter by event/);
    assert.match(shell, /COMING_UP_EVENT_LIMIT/);
    assert.doesNotMatch(shell, /All events\n/);
    assert.doesNotMatch(shell, /chipEvents/);
  });

  it("drops multiple files into an upload dialog for event + label", () => {
    assert.match(shell, /Drop files here — then choose the event and label/);
    assert.match(shell, /openUploadWithFiles/);
    assert.match(shell, /initialFiles=\{pendingUploadFiles\}/);
    assert.match(upload, /multiple/);
    assert.match(upload, /Pick the event and label/);
    assert.match(upload, /Label/);
    assert.doesNotMatch(shell, /Upload files/);
  });

  it("lists each event in its own box with a left color stripe", () => {
    assert.match(list, /borderLeft: `4px solid \$\{group\.accentColor\}`/);
    assert.match(list, /group\.eventHref/);
    assert.match(list, /Open event files →/);
  });

  it("deep links each event box to the event Files tab via eventFilesHref", () => {
    assert.match(shell, /import { eventFilesHref } from "@\/lib\/events\/event-responsibility"/);
    assert.doesNotMatch(shell, /\?tab=files/);
  });

  it("supports inline rename on the file row (Enter / blur saves)", () => {
    assert.match(list, /updateCampaignFileAction/);
    assert.match(list, /onKeyDown/);
    assert.match(list, /event\.key === "Enter"/);
    assert.match(list, /onBlur=\{\(\) => commitRename\(file\)\}/);
  });

  it("offers Rename / Open / Download row actions and an icon-only delete", () => {
    assert.match(list, /Rename/);
    assert.match(list, />\s*Open\s*</);
    assert.match(list, />\s*Download\s*</);
    assert.match(list, /deleteCampaignFileAction/);
    assert.match(list, /aria-label=\{`Delete \$\{file\.name\}`\}/);
    assert.match(list, /<X /);
  });

  it("keeps chrome switches instant via local state + history.replaceState", () => {
    assert.match(shell, /history\.replaceState/);
    assert.match(shell, /syncUrl/);
    assert.doesNotMatch(shell, /router\.replace\(/);
  });

  it("reuses the shared campaign-files upload/rename actions", () => {
    assert.match(shell, /FileUploadDialog/);
    assert.match(upload, /uploadCampaignFileAction/);
    assert.match(list, /updateCampaignFileAction/);
  });
});
