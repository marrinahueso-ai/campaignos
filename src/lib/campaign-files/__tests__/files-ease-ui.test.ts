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
  const contextUpload = readSrc(
    "../../../components/campaign-files/EventContextFileUpload.tsx",
  );
  const tasks = readSrc(
    "../../../components/events-phase3/EventDetailTasksEasePanel.tsx",
  );
  const volunteers = readSrc(
    "../../../components/events-phase3/EventDetailVolunteersEasePanel.tsx",
  );
  const page = readSrc("../../../app/(dashboard)/files/page.tsx");
  const filters = readSrc("../filters.ts");
  const typeGroups = readSrc("../type-groups.ts");

  it("wires /files to the Ease shell, not the dense FilesDocumentsShell", () => {
    assert.match(page, /FilesEaseShell/);
    assert.doesNotMatch(page, /FilesDocumentsShell/);
  });

  it("uses smart-filing search and type pills on org Files", () => {
    assert.match(shell, /Search files…/);
    assert.match(shell, /FilesTypeGroupPills/);
    assert.match(shell, /typeGroup/);
    assert.match(shell, /Event/);
    assert.match(shell, /handleEventFilterChange/);
  });

  it("uses Newest / Name / Size / Type as quiet text sort controls", () => {
    assert.match(shell, /label: "Newest"/);
    assert.match(shell, /label: "Name"/);
    assert.match(shell, /label: "Size"/);
    assert.match(shell, /label: "Type"/);
    assert.match(shell, /role="group"\s*\n?\s*aria-label="Sort files"/);
  });

  it("drops multiple files into an upload dialog with inferred type", () => {
    assert.match(shell, /type is inferred automatically/);
    assert.match(shell, /openUploadWithFiles/);
    assert.match(shell, /initialFiles=\{pendingUploadFiles\}/);
    assert.match(upload, /multiple/);
    assert.match(upload, /suggest a document category from the name/);
    assert.match(upload, /category", "auto"/);
    assert.doesNotMatch(upload, /CAMPAIGN_FILE_CATEGORIES/);
    assert.doesNotMatch(shell, /Upload files/);
  });

  it("does not expose org-wide folder chrome at the page header", () => {
    assert.doesNotMatch(shell, /<FilesFolderBar/);
    assert.doesNotMatch(shell, /folderFilter/);
    assert.doesNotMatch(shell, /params\.set\("folder"/);
  });

  it("lists each event in its own box without folder bar hero chrome", () => {
    assert.match(list, /borderLeft: `4px solid \$\{group\.accentColor\}`/);
    assert.match(list, /group\.eventHref/);
    assert.match(list, /Open campaign files →/);
    assert.match(list, /showFolderBar = false/);
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

  it("uses event Files smart filing with type pills and generated section", () => {
    assert.match(eventFiles, /FilesTypeGroupPills/);
    assert.match(eventFiles, /Filed automatically by type/);
    assert.match(eventFiles, /GeneratedPostAssetsSection/);
    assert.match(eventFiles, /category", "auto"/);
    assert.match(eventFiles, /Folders \(optional\)/);
  });

  it("event Files drop and picker upload every selected file, not only the first", () => {
    assert.match(eventFiles, /uploadMany/);
    assert.match(eventFiles, /Array\.from\(event\.dataTransfer\.files/);
    assert.match(eventFiles, /Array\.from\(event\.target\.files/);
    assert.match(eventFiles, /multiple/);
    assert.match(eventFiles, /Uploading \$\{uploaded \+ 1\} of \$\{files\.length\}/);
    assert.doesNotMatch(eventFiles, /files\?\.\[0\]/);
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
  });

  it("keeps the shared EventContextFileUpload component's contract intact", () => {
    assert.match(contextUpload, /FileDocumentCategoryQuickEdit/);
    assert.match(contextUpload, /uploadContext/);
  });

  it("Volunteers and Tasks tabs no longer wire the quiet context-upload widget (redesigned)", () => {
    // Volunteers moved to a dedicated SignUpGenius connect/roster flow;
    // Tasks dropped inline file upload entirely. Neither references
    // EventContextFileUpload/uploadContext anymore — pin that intentionally.
    assert.doesNotMatch(volunteers, /EventContextFileUpload/);
    assert.doesNotMatch(volunteers, /uploadContext/);
    assert.doesNotMatch(tasks, /EventContextFileUpload/);
    assert.doesNotMatch(tasks, /uploadContext/);
  });

  it("shows post-upload document category quick edit", () => {
    assert.match(eventFiles, /FileDocumentCategoryQuickEdit/);
    assert.match(eventFiles, /uploadContext", "event_files"/);
    assert.match(upload, /uploadContext", "org_files"/);
    assert.match(upload, /FileDocumentCategoryQuickEdit/);
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

  it("filters files by folder and type group in filterCampaignFiles", () => {
    assert.match(filters, /folderId === "unfiled"/);
    assert.match(filters, /filters\.folderId !== "all"/);
    assert.match(filters, /folderId: "all"/);
    assert.match(filters, /typeGroup/);
    assert.match(filters, /fileMatchesTypeGroup/);
    assert.match(typeGroups, /inferUploadCategory/);
  });
});
