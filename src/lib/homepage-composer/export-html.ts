import { formatEventWhen } from "@/lib/homepage-composer/blurbs";
import type {
  HomepageCard,
  HomepageComposerState,
  HomepageResourceLink,
} from "@/lib/homepage-composer/types";
import { normalizeHref } from "@/lib/homepage-composer/urls";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Hero CTAs for export — respects buttonCount and skips blank labels. */
export function buildHomepageHeroButtonsHtml(
  header: HomepageComposerState["header"],
): string {
  const buttons: Array<{ label: string; url: string }> = [];
  if (header.button1Label.trim()) {
    buttons.push({
      label: header.button1Label.trim(),
      url: header.button1Url,
    });
  }
  if (header.buttonCount === 2 && header.button2Label.trim()) {
    buttons.push({
      label: header.button2Label.trim(),
      url: header.button2Url,
    });
  }
  if (buttons.length === 0) return "";
  return `<div class="ees-hero-btns">${buttons
    .map(
      (btn) =>
        `<a class="ees-btn" href="${escapeHtml(normalizeHref(btn.url))}">${escapeHtml(btn.label)}</a>`,
    )
    .join(" ")}</div>`;
}

/** Footer CTAs for export — respects buttonCount and skips blank labels. */
export function buildHomepageFooterButtonsHtml(
  footer: HomepageComposerState["footer"],
): string {
  const buttons: Array<{ label: string; url: string }> = [];
  if (footer.ctaButtonLabel.trim()) {
    buttons.push({
      label: footer.ctaButtonLabel.trim(),
      url: footer.ctaButtonUrl,
    });
  }
  if (footer.buttonCount === 2 && footer.ctaButton2Label.trim()) {
    buttons.push({
      label: footer.ctaButton2Label.trim(),
      url: footer.ctaButton2Url,
    });
  }
  return buttons
    .map(
      (b) =>
        `<a class="ees-btn" href="${escapeHtml(normalizeHref(b.url))}">${escapeHtml(b.label)}</a>`,
    )
    .join(" ");
}

/** Short manager-facing date: 2026-08-10 → 8/10/26 */
export function formatVisibilityShortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((p) => parseInt(p, 10));
  if (!y || !m || !d) return ymd;
  return `${m}/${d}/${String(y).slice(-2)}`;
}

/** Visibility window memo for download preview only. */
export function formatCardVisibilityMemo(card: HomepageCard): string {
  if (card.alwaysOn) return "Always on";
  const on = card.startsOn ? formatVisibilityShortDate(card.startsOn) : null;
  const off = card.expiresOn
    ? formatVisibilityShortDate(card.expiresOn)
    : null;
  if (on && off) return `on: ${on} · off: ${off}`;
  if (on) return `on: ${on} · always on`;
  if (off) return `off: ${off}`;
  return "Always on";
}

function cardAttrs(card: HomepageCard): string {
  const parts: string[] = ['class="ees-image-card"'];
  if (!card.alwaysOn && card.startsOn) {
    parts.push(`data-starts="${escapeHtml(card.startsOn)}"`);
  }
  if (!card.alwaysOn && card.expiresOn) {
    parts.push(`data-expires="${escapeHtml(card.expiresOn)}"`);
  }
  return parts.join(" ");
}

function exportImageUrl(
  imageUrl: string | null,
  options: { includeDataImages?: boolean } = {},
): string | null {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  // Export must stay lean for Membership Toolkit; in-app preview may show data: URLs.
  if (url.startsWith("data:")) {
    return options.includeDataImages ? url : null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function renderCard(
  card: HomepageCard,
  options: { includeDataImages?: boolean; includeVisibilityMemos?: boolean } = {},
): string {
  const hosted = exportImageUrl(card.imageUrl, options);
  const img = hosted
    ? `<div class="img-square"><img src="${escapeHtml(hosted)}" alt="${escapeHtml(card.title)}" /></div>`
    : `<div class="img-square img-placeholder"></div>`;

  const when = formatEventWhen(card.date, card.time);
  const cardHref = normalizeHref(card.linkUrl);
  const hasLink = Boolean(card.linkUrl.trim()) && cardHref !== "#";
  const linkLabel = (card.linkLabel ?? "").trim() || "Learn More →";
  const dateSlot = when
    ? `<span class="ees-when">${escapeHtml(when)}</span>`
    : "";
  const linkSlot = hasLink
    ? `<a href="${escapeHtml(cardHref)}"${cardHref.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(linkLabel)}</a>`
    : "";
  const cardMeta = `<div class="ees-card-meta">
<p class="ees-card-meta-date">${dateSlot}</p>
<p class="ees-card-meta-link">${linkSlot}</p>
</div>`;

  const visibilityMemo = options.includeVisibilityMemos
    ? `<p class="ees-visibility-memo">${escapeHtml(formatCardVisibilityMemo(card))}</p>`
    : "";

  return `<div ${cardAttrs(card)}>
${img}
<div class="ees-image-card-content">
<h3 style="text-align:center;">${escapeHtml(card.title)}</h3>
<p class="ees-card-blurb">${escapeHtml(card.blurb)}</p>
${cardMeta}
${visibilityMemo}
</div>
</div>`;
}

function renderResources(
  resources: HomepageResourceLink[],
  titleColor: string,
): string {
  const active = resources.filter((r) => r.label.trim().length > 0);
  if (active.length === 0) return "";

  const links = active
    .map((r) => {
      const href = normalizeHref(r.url);
      return `<a class="ees-resource" href="${escapeHtml(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : ""}><span class="ees-resource-emoji">${escapeHtml(r.emoji || "🔗")}</span>${escapeHtml(r.label)}</a>`;
    })
    .join("\n");

  return `<h2 class="ees-section-title" style="color:${escapeHtml(titleColor)}">Helpful Resources</h2>
<div class="ees-resources-wrap">
<div class="ees-resource-grid">
${links}
</div>
</div>`;
}

export type ExportHomepageOptions = {
  /** YYYY-MM-DD — force "today" for show/hide (preview scrubber). */
  asOfDate?: string | null;
  /** Preview: show every card (ignore starts/expires) so managers can audit the full set. */
  showAllCards?: boolean;
  /**
   * In-app preview only: allow data: image URLs so artwork shows before upload.
   * Never enable for Export / Copy HTML.
   */
  includeDataImages?: boolean;
  /**
   * Download / audit preview only: show on/off visibility memo under each card.
   * Never enable for Membership Toolkit Export / Copy HTML.
   */
  includeVisibilityMemos?: boolean;
};

/** Full-page Membership Toolkit HTML (header + cards + footer + resources + script). */
export function exportHomepageHtml(
  state: HomepageComposerState,
  options: ExportHomepageOptions = {},
): string {
  const { header, footer, cards, resources, cardsSectionTitle } = state;
  const asOf = options.asOfDate?.trim() || null;
  const showAllCards = Boolean(options.showAllCards);
  const includeDataImages = Boolean(options.includeDataImages);
  const includeVisibilityMemos = Boolean(options.includeVisibilityMemos);
  const hc = header.colors;
  const fc = footer.colors;

  const cardsTitle = cardsSectionTitle.trim();
  const cardsBlock =
    cards.length > 0
      ? `${cardsTitle ? `<h2 class="ees-section-title">${escapeHtml(cardsTitle)}</h2>\n` : ""}<div class="ees-image-card-grid">
${cards
  .map((card) =>
    renderCard(card, { includeDataImages, includeVisibilityMemos }),
  )
  .join("\n")}
</div>`
      : "";

  const resourcesBlock = renderResources(resources, "#0b2f5b");

  const activeAnnouncements = (header.announcements ?? []).filter((a) =>
    a.text.trim(),
  );
  const announcement =
    activeAnnouncements.length > 0
      ? `<div class="ees-announcement">
${activeAnnouncements
  .map((a) => {
    const attrs: string[] = [];
    if (!a.alwaysOn && a.startsOn) {
      attrs.push(`data-starts="${escapeHtml(a.startsOn)}"`);
    }
    if (!a.alwaysOn && a.expiresOn) {
      attrs.push(`data-expires="${escapeHtml(a.expiresOn)}"`);
    }
    const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
    return `<div class="ees-announcement-line"${attrStr}>${escapeHtml(`${a.emoji ? `${a.emoji} ` : ""}${a.text}`.trim())}</div>`;
  })
  .join("\n")}
</div>`
      : "";

  // Hover accent matches live EES / Membership Toolkit homepage.
  const hoverAccent = "#1f7a5c";

  const footerButtons = buildHomepageFooterButtonsHtml(footer);

  return `<style><!--
.ees-home-wrap{max-width:1100px;margin:0 auto;padding:20px;font-family:Arial,sans-serif}
.ees-hero{background:linear-gradient(135deg,${hc.backgroundStart},${hc.backgroundEnd});color:${hc.textColor};padding:40px 30px;border-radius:22px;text-align:center;margin-bottom:18px}
.ees-hero h1{font-size:36px;margin:0 0 16px;color:${hc.textColor};line-height:1.15}
.ees-hero p{font-size:18px;line-height:1.65;margin:0 auto 20px;max-width:750px;color:${hc.textColor};opacity:.96}
.ees-hero-btns{margin-top:4px}
.ees-btn{display:inline-block;background:${hc.buttonBackground};color:${hc.buttonText}!important;padding:14px 24px;border-radius:999px;font-weight:bold;text-decoration:none!important;margin:6px;transition:all .3s ease}
.ees-btn:hover{transform:translateY(-2px)}
.ees-announcement{background:${hc.announcementBackground};border-left:5px solid ${hc.buttonBackground};padding:12px 18px;border-radius:12px;margin:0 0 28px;font-size:15px;line-height:1.5;color:${hc.announcementText}}
.ees-announcement .ees-announcement-line{margin:4px 0}
.ees-section-title{color:#0b2f5b;font-size:28px;margin:30px 0 16px;text-align:center}
.ees-image-card-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:stretch}
.ees-image-card{background:#fff;border:2px solid #d9e8ec;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08);transition:all .3s ease;display:flex;flex-direction:column;height:100%}
.ees-image-card:hover{transform:translateY(-4px);border-color:${hoverAccent};box-shadow:0 8px 20px rgba(31,122,92,.25)}
.ees-image-card .img-square{width:100%;aspect-ratio:1/1;background:#eef8fa;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.ees-image-card .img-square img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.ees-image-card .img-placeholder{background:linear-gradient(135deg,${hc.backgroundStart},${hc.backgroundEnd})}
.ees-image-card-content{padding:15px;text-align:center;display:flex;flex-direction:column;flex:1}
.ees-image-card-content h3{color:#0b2f5b;margin:0 0 8px;font-size:19px;font-weight:700;line-height:1.2}
.ees-card-blurb{color:#333;line-height:1.4;margin:0;font-size:14px;flex:1}
.ees-card-meta{margin-top:auto;padding-top:4px;flex-shrink:0;width:100%}
.ees-card-meta-date,.ees-card-meta-link{margin:0;min-height:1.35em;line-height:1.35;font-size:14px}
.ees-card-meta-date{margin-bottom:1px}
.ees-card-meta-date .ees-when,.ees-card-meta-link a{color:#0b6f89;font-weight:bold;text-decoration:none;display:inline-block}
.ees-card-meta-link a:hover{color:${hoverAccent};text-decoration:underline}
${
  includeVisibilityMemos
    ? ".ees-visibility-memo{margin:8px 0 0!important;padding-top:6px;border-top:1px dashed #d9e8ec;color:#6b7c8a!important;font-size:11px!important;font-weight:600!important;line-height:1.35;flex:0 0 auto!important}\n"
    : ""
}.ees-cta{margin-top:35px;background:${fc.background};border:2px solid ${hc.backgroundEnd};border-radius:20px;padding:30px;text-align:center;color:${fc.textColor}}
.ees-cta h2{color:${fc.textColor};margin-top:0}
.ees-cta p{margin-bottom:18px;line-height:1.6;color:${fc.textColor}}
.ees-cta .ees-btn{background:${fc.buttonBackground};color:${fc.buttonText}!important}
.ees-resources-wrap{margin-top:10px}
.ees-resource-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.ees-resource{background:${fc.resourceBackground};border:2px solid transparent;border-radius:999px;padding:18px 10px;text-align:center;font-weight:bold;color:${fc.resourceText}!important;text-decoration:none!important;font-size:14px;transition:all .3s ease;line-height:1.5;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ees-resource:hover{background:#dff2f5;border-color:${hoverAccent};transform:translateY(-3px)}
.ees-resource-emoji{display:block;font-size:22px;line-height:1.2;margin-bottom:4px}
@media(max-width:1000px){.ees-image-card-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:800px){.ees-image-card-grid,.ees-resource-grid{grid-template-columns:1fr}.ees-hero h1{font-size:28px}}
--></style>
<div class="ees-home-wrap">
<div class="ees-hero">
<h1 style="text-align:center;"><span style="font-size:24pt;">${escapeHtml(header.title)}</span></h1>
<p>${escapeHtml(header.message)}</p>
${buildHomepageHeroButtonsHtml(header)}
</div>
${announcement}
${cardsBlock}
<div class="ees-cta">
<h2>${escapeHtml(footer.ctaTitle)}</h2>
<p>${escapeHtml(footer.ctaBody)}</p>
${footerButtons}
</div>
${resourcesBlock}
</div>
<script>
(function(){
  ${
    showAllCards
      ? "/* Preview: full month — show every card */"
      : `function parseYmd(s){
    var p=s.split("-");
    if(p.length!==3)return null;
    var d=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));
    d.setHours(0,0,0,0);
    return d;
  }
  var today=${asOf ? `parseYmd(${JSON.stringify(asOf)})||new Date()` : "new Date()"};
  if(today){ today.setHours(0,0,0,0); }
  var scheduled=document.querySelectorAll(".ees-image-card[data-expires],.ees-image-card[data-starts],.ees-announcement-line[data-expires],.ees-announcement-line[data-starts]");
  for(var i=0;i<scheduled.length;i++){
    var el=scheduled[i];
    el.style.display="";
    var starts=el.getAttribute("data-starts");
    var expires=el.getAttribute("data-expires");
    if(starts){
      var startDate=parseYmd(starts);
      if(startDate && today < startDate){ el.style.display="none"; continue; }
    }
    if(expires){
      var expireDate=parseYmd(expires);
      if(expireDate && today > expireDate){ el.style.display="none"; }
    }
  }
  var bar=document.querySelector(".ees-announcement");
  if(bar){
    var lines=bar.querySelectorAll(".ees-announcement-line");
    var any=false;
    for(var j=0;j<lines.length;j++){
      if(lines[j].style.display!=="none"){ any=true; break; }
    }
    bar.style.display=any?"":"none";
  }`
  }
})();
</script>`;
}
