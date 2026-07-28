import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("files ease UI contracts", () => {
  const shell = readSrc("../../../components/campaign-files/FilesEaseShell.tsx");
  const list = readSrc("../../../components/campaign-files/FilesEaseList.tsx");
  const folderBar = readSrc("../../../components/campaign-files/FilesFolderBar.tsx");
  const eventFiles = readSrc(
    "../../../components/events-phase3/EventDetailFilesEasePanel.tsx",
  );
  const upload = readSrc("../../../components/campaign-files/FileUploadDialog.tsx");
  const page = readSrc("../../../app/(dashboard)/files/page.tsx");

  it("wires /files to the Ease shell, not the dense FilesDocumentsShell", () => {
    assert.match(page, /FilesEaseShell/);
    assert.doesNotMatch(page, /FilesDocumentsShell/);
  });

  it("uses a quiet pill search for file or campaign name", () => {
    assert.match(shell, /Search by file or campaign name/);
    assert.match(shell, /type="search"/);
  });

  it("uses Newest / Name / Size / Type as quiet text sort controls", () => {
    assert.match(shell, /label: "Newest"/);
    assert.match(shell, /label: "Name"/);
    assert.match(shell, /label: "Size"/);
    assert.match(shell, /label: "Type"/);
    assert.match(shell, /role="group"\s*\n?\s*aria-label="Sort files"/);
  });

  it("filters campaigns with a dropdown (Coming up first, not a chip wall)", () => {
    assert.match(shell, /Coming up/);
    assert.match(shell, /Filter by campaign/);
    assert.match(shell, /COMING_UP_EVENT_LIMIT/);
    assert.doesNotMatch(shell, /All events\n/);
    assert.doesNotMatch(shell, /chipEvents/);
  });

  it("drops multiple files into an upload dialog for campaign + category", () => {
    assert.match(shell, /Drop files here — then choose the campaign and category/);
    assert.match(shell, /openUploadWithFiles/);
    assert.match(shell, /initialFiles=\{pendingUploadFiles\}/);
    assert.match(upload, /multiple/);
    assert.match(upload, /Pick the event and category/);
    assert.match(upload, /Category/);
    assert.doesNotMatch(shell, /Upload files/);
  });

  it("does not expose org-wide folder chrome at the page header", () => {
    assert.doesNotMatch(shell, /<FilesFolderBar/);
    assert.doesNotMatch(shell, /folderFilter/);
    assert.doesNotMatch(shell, /params\.set\("folder"/);
  });

  it("lists each campaign in its own box with per-campaign folder bar", () => {
    assert.match(list, /borderLeft: `4px solid \$\{group\.accentColor\}`/);
    assert.match(list, /group\.eventHref/);
    assert.match(list, /Open campaign files →/);
    assert.match(list, /<FilesFolderBar/);
    assert.match(list, /eventId=\{group\.eventId\}/);
  });

  it("deep links each campaign box to the event Files tab via eventFilesHref", () => {
    assert.match(shell, /import { eventFilesHref } from "@\/lib\/events\/event-responsibility"/);
    assert.doesNotMatch(shell, /\?tab=files/);
  });

  it("supports inline rename on the file row (Enter / blur saves)", () => {
    assert.match(list, /updateCampaignFileAction/);
    assert.match(list, /onKeyDown/);
    assert.match(list, /event\.key === "Enter"/);
    assert.match(list, /onBlur=\{\(\) => commitRename\(file\)\}/);
  });

  it("offers Rename / Move / Open / Download row actions and an icon-only delete", () => {
    assert.match(list, /Rename/);
    assert.match(list, /FileMoveFolderMenu/);
    assert.match(list, />\s*Open\s*</);
    assert.match(list, />\s*Download\s*</);
    assert.match(list, /deleteCampaignFileAction/);
    assert.match(list, /aria-label=\{`Delete \$\{file\.name\}`\}/);
    assert.match(list, /<X /);
  });

  it("exposes event-scoped folders for create, rename, delete, reorder, and move", () => {
    assert.match(folderBar, /New folder/);
    assert.match(folderBar, /All files/);
    assert.match(folderBar, /Unfiled/);
    assert.match(folderBar, /createFileFolderAction\(eventId, name\)/);
    assert.match(folderBar, /renameFileFolderAction\(eventId, folderId, name\)/);
    assert.match(folderBar, /deleteFileFolderAction\(eventId, folder\.id\)/);
    assert.match(folderBar, /reorderFileFoldersAction/);
    assert.match(folderBar, /Move left/);
    assert.match(folderBar, /Move right/);
    assert.match(eventFiles, /FilesFolderBar/);
    assert.match(eventFiles, /Campaign files/);
  });

  it("uses organization-facing copy on the Files page", () => {
    assert.match(shell, /organization/);
    assert.match(shell, /Your organization/);
    assert.doesNotMatch(shell, /PTA/i);
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

  it("filters files by folder in filterCampaignFiles", () => {
    const filters = readSrc("../filters.ts");
    assert.match(filters, /folderId === "unfiled"/);
    assert.match(filters, /filters\.folderId !== "all"/);
    assert.match(filters, /folderId: "all"/);
  });
});
