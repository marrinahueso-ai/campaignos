function escapeHtmlForDocumentTitle(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHomepageShareDocumentHtml(input: {
  title: string;
  bodyHtml: string;
}): string {
  const safeTitle = escapeHtmlForDocumentTitle(input.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    background: #f6f8f9;
    font-family: Arial, sans-serif;
  }
  .share-toolbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid #d9e8ec;
    box-shadow: 0 4px 16px rgba(28, 36, 48, 0.06);
  }
  .share-toolbar-copy {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    color: #4b5563;
  }
  .share-toolbar-copy strong {
    color: #0b2f5b;
  }
  .share-toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .share-btn {
    appearance: none;
    border: 1px solid #c7d8de;
    background: #fff;
    color: #0b2f5b;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .share-btn-primary {
    background: #1f7a5c;
    border-color: #1f7a5c;
    color: #fff;
  }
  .share-page-body {
    padding: 12px 0 32px;
  }
  @media print {
    .share-toolbar { display: none !important; }
    body { background: #fff; }
    .share-page-body { padding: 0; }
  }
</style>
</head>
<body>
<div class="share-toolbar" data-share-toolbar>
  <p class="share-toolbar-copy">
    <strong>Homepage preview</strong> — use <strong>Save as PDF</strong> to download, or share this page link.
  </p>
  <div class="share-toolbar-actions">
    <button type="button" class="share-btn share-btn-primary" data-share-print>
      Save as PDF
    </button>
  </div>
</div>
<div class="share-page-body">
${input.bodyHtml}
</div>
<script>
(function(){
  var btn = document.querySelector("[data-share-print]");
  if (btn) {
    btn.addEventListener("click", function(){ window.print(); });
  }
  if (new URLSearchParams(window.location.search).get("print") === "1") {
    window.addEventListener("load", function(){ window.print(); });
  }
})();
</script>
</body>
</html>`;
}
