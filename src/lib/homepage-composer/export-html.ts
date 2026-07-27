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
  options: { includeDataImages?: boolean } = {},
): string {
  const hosted = exportImageUrl(card.imageUrl, options);
  const img = hosted
    ? `<div class="img-square"><img src="${escapeHtml(hosted)}" alt="${escapeHtml(card.title)}" /></div>`
    : `<div class="img-square img-placeholder"></div>`;

  const when = formatEventWhen(card.date, card.time);
  const cardHref = normalizeHref(card.linkUrl);
  const hasLink = Boolean(card.linkUrl.trim()) && cardHref !== "#";
  const linkLabel = (card.linkLabel ?? "").trim() || "Learn More →";
  const cta = hasLink
    ? `<a href="${escapeHtml(cardHref)}"${cardHref.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(linkLabel)}</a>`
    : when
      ? `<span class="ees-card-note">${escapeHtml(when)}</span>`
      : "";

  // With a CTA link, show the card display date above the link.
  // Without a link, the date is the bottom line (ees-card-note above).
  const whenLine =
    hasLink && when
      ? `<p><span class="ees-when"><strong>${escapeHtml(when)}</strong></span></p>`
      : "";

  return `<div ${cardAttrs(card)}>
${img}
<div class="ees-image-card-content">
<h3 style="text-align:center;">${escapeHtml(card.title)}</h3>
<p>${escapeHtml(card.blurb)}</p>
${whenLine}
${cta}
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
};

/** Full-page Membership Toolkit HTML (header + cards + footer + resources + script). */
export function exportHomepageHtml(
  state: HomepageComposerState,
  options: ExportHomepageOptions = {},
): string {
  const { header, footer, cards, resources } = state;
  const asOf = options.asOfDate?.trim() || null;
  const showAllCards = Boolean(options.showAllCards);
  const includeDataImages = Boolean(options.includeDataImages);
  const hc = header.colors;
  const fc = footer.colors;

  const cardsBlock =
    cards.length > 0
      ? `<h2 class="ees-section-title">Back-to-School Essentials</h2>
<div class="ees-image-card-grid">
${cards.map((card) => renderCard(card, { includeDataImages })).join("\n")}
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
  .map(
    (a) =>
      `<div>${escapeHtml(`${a.emoji ? `${a.emoji} ` : ""}${a.text}`.trim())}</div>`,
  )
  .join("\n")}
</div>`
      : "";

  // Hover accent matches live EES / Membership Toolkit homepage.
  const hoverAccent = "#1f7a5c";

  return `<style><!--
.ees-home-wrap{max-width:1100px;margin:0 auto;padding:20px;font-family:Arial,sans-serif}
.ees-hero{background:linear-gradient(135deg,${hc.backgroundStart},${hc.backgroundEnd});color:${hc.textColor};padding:40px 30px;border-radius:22px;text-align:center;margin-bottom:18px}
.ees-hero h1{font-size:36px;margin:0 0 16px;color:${hc.textColor};line-height:1.15}
.ees-hero p{font-size:18px;line-height:1.65;margin:0 auto 20px;max-width:750px;color:${hc.textColor};opacity:.96}
.ees-hero-btns{margin-top:4px}
.ees-btn{display:inline-block;background:${hc.buttonBackground};color:${hc.buttonText}!important;padding:14px 24px;border-radius:999px;font-weight:bold;text-decoration:none!important;margin:6px;transition:all .3s ease}
.ees-btn:hover{transform:translateY(-2px)}
.ees-announcement{background:${hc.announcementBackground};border-left:5px solid ${hc.buttonBackground};padding:12px 18px;border-radius:12px;margin:0 0 28px;font-size:15px;line-height:1.5;color:${hc.announcementText}}
.ees-announcement div{margin:4px 0}
.ees-section-title{color:#0b2f5b;font-size:28px;margin:30px 0 16px;text-align:center}
.ees-image-card-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:stretch}
.ees-image-card{background:#fff;border:2px solid #d9e8ec;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08);transition:all .3s ease;display:flex;flex-direction:column;height:100%}
.ees-image-card:hover{transform:translateY(-4px);border-color:${hoverAccent};box-shadow:0 8px 20px rgba(31,122,92,.25)}
.ees-image-card .img-square{width:100%;aspect-ratio:1/1;background:#eef8fa;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.ees-image-card .img-square img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.ees-image-card .img-placeholder{background:linear-gradient(135deg,${hc.backgroundStart},${hc.backgroundEnd})}
.ees-image-card-content{padding:15px;text-align:center;display:flex;flex-direction:column;flex:1}
.ees-image-card-content h3{color:#0b2f5b;margin:0 0 8px;font-size:19px;font-weight:700;line-height:1.2}
.ees-image-card-content p{color:#333;line-height:1.4;margin:0 0 10px;font-size:14px;flex:1}
.ees-image-card-content a,.ees-card-note,.ees-when{color:#0b6f89;font-weight:bold;text-decoration:none;font-size:14px;display:inline-block;margin-top:auto;padding-top:8px}
.ees-image-card-content a:hover{color:${hoverAccent};text-decoration:underline}
.ees-cta{margin-top:35px;background:${fc.background};border:2px solid ${hc.backgroundEnd};border-radius:20px;padding:30px;text-align:center;color:${fc.textColor}}
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
<div class="ees-hero-btns"><a class="ees-btn" href="${escapeHtml(normalizeHref(header.button1Url))}">${escapeHtml(header.button1Label)}</a> <a class="ees-btn" href="${escapeHtml(normalizeHref(header.button2Url))}">${escapeHtml(header.button2Label)}</a></div>
</div>
${announcement}
${cardsBlock}
<div class="ees-cta">
<h2>${escapeHtml(footer.ctaTitle)}</h2>
<p>${escapeHtml(footer.ctaBody)}</p>
<a class="ees-btn" href="${escapeHtml(normalizeHref(footer.ctaButtonUrl))}">${escapeHtml(footer.ctaButtonLabel)}</a>
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
  var cards=document.querySelectorAll(".ees-image-card[data-expires],.ees-image-card[data-starts]");
  for(var i=0;i<cards.length;i++){
    var el=cards[i];
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
  }`
  }
})();
</script>`;
}
