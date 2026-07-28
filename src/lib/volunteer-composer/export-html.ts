import { normalizeHref } from "@/lib/homepage-composer/urls";
import type {
  VolunteerButton,
  VolunteerComposerState,
  VolunteerOpportunity,
} from "@/lib/volunteer-composer/types";
import {
  opportunityCtaLabel,
  opportunityVisibility,
  PREVIEW_FULL_MONTH,
} from "@/lib/volunteer-composer/visibility";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBadgeDate(ymd: string | null): string {
  if (!ymd || ymd.length < 10) return "—";
  return `${ymd.slice(5, 7)}-${ymd.slice(8, 10)}`;
}

export function formatOpportunityWindow(role: VolunteerOpportunity): string {
  if (role.alwaysOn) return "Always on";
  const on = role.startsOn ? formatBadgeDate(role.startsOn) : "—";
  const off = role.expiresOn ? formatBadgeDate(role.expiresOn) : "—";
  return `On ${on} → Off ${off}`;
}

function activeButtons(
  count: 1 | 2,
  button1: VolunteerButton,
  button2: VolunteerButton,
): VolunteerButton[] {
  const list = [button1];
  if (count === 2) list.push(button2);
  return list.filter((b) => b.label.trim());
}

function capitalizeSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function parseHowTo(line: string): { strong: string; span: string } {
  const parts = line.split("—");
  const strong = (parts[0] || line).trim();
  const span =
    parts.length > 1
      ? capitalizeSentence(parts.slice(1).join("—"))
      : "";
  return { strong, span };
}

function exportImageUrl(
  imageUrl: string | null,
  options: { includeDataImages?: boolean } = {},
): string | null {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  if (url.startsWith("data:")) {
    return options.includeDataImages ? url : null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function renderButtons(
  buttons: VolunteerButton[],
  className: string,
  style?: string,
): string {
  if (buttons.length === 0) return "";
  return `<div class="${className}">${buttons
    .map((b) => {
      const href = normalizeHref(b.url);
      const external =
        href.startsWith("http") || href.startsWith("mailto:")
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
      const styleAttr = style ? ` style="${style}"` : "";
      return `<a class="vol-btn" href="${escapeHtml(href)}"${external}${styleAttr}>${escapeHtml(b.label)}</a>`;
    })
    .join("\n")}</div>`;
}

function renderOpportunityFace(
  role: VolunteerOpportunity,
  options: { includeDataImages?: boolean },
): string {
  const hosted = exportImageUrl(role.imageUrl, options);
  if (hosted) {
    return `<span class="vol-thumb"><img src="${escapeHtml(hosted)}" alt="" /></span>`;
  }
  return `<span class="vol-emoji" aria-hidden="true">${escapeHtml(role.emoji || "🤝")}</span>`;
}

function renderOpportunityCard(
  role: VolunteerOpportunity,
  asOf: string,
  options: { includeWindowMemo?: boolean; includeDataImages?: boolean },
): string {
  const vis = opportunityVisibility(role, asOf);
  if (!vis.show) return "";
  const canSignup = vis.key === "open" && Boolean(role.signupUrl.trim());
  const href = role.signupUrl.trim()
    ? normalizeHref(role.signupUrl)
    : "#";
  const cta = opportunityCtaLabel(vis);
  const attrs: string[] = ['class="vol-card' + (vis.dimmed ? " dimmed" : "") + '"'];
  if (!role.alwaysOn && role.startsOn) {
    attrs.push(`data-starts="${escapeHtml(role.startsOn)}"`);
  }
  if (!role.alwaysOn && role.expiresOn) {
    attrs.push(`data-expires="${escapeHtml(role.expiresOn)}"`);
  }
  if (role.alwaysOn) attrs.push('data-always-on="1"');
  if (role.signupUrl.trim()) {
    attrs.push(`data-signup="${escapeHtml(normalizeHref(role.signupUrl))}"`);
  }

  const windowMemo = options.includeWindowMemo
    ? `<p class="vol-window">${escapeHtml(formatOpportunityWindow(role))}</p>`
    : "";

  return `<article ${attrs.join(" ")}>
<span class="vol-status ${vis.key}">● ${escapeHtml(vis.label)}</span>
<div class="vol-title-row">${renderOpportunityFace(role, options)}<h3>${escapeHtml(role.title || "Untitled role")}</h3></div>
<p class="vol-blurb">${escapeHtml(role.blurb)}</p>
${role.whenLabel.trim() ? `<p class="vol-when">${escapeHtml(role.whenLabel)}</p>` : ""}
${windowMemo}
<a class="vol-cta${canSignup ? "" : " disabled"}" href="${escapeHtml(href)}"${canSignup ? ' target="_blank" rel="noopener noreferrer"' : ' tabindex="-1" aria-disabled="true"'}>${escapeHtml(cta)}</a>
</article>`;
}

export type ExportVolunteerOptions = {
  /** YYYY-MM-DD or full-month — preview scrubber. */
  asOfDate?: string | null;
  /** Preview audit: show window memos under cards. */
  includeWindowMemos?: boolean;
  /** Allow data: image URLs in preview (not for MTK paste). */
  includeDataImages?: boolean;
};

/** Full-page HTML for Membership Toolkit /volunteerwithus. */
export function exportVolunteerHtml(
  state: VolunteerComposerState,
  options: ExportVolunteerOptions = {},
): string {
  const { header, footer } = state;
  const asOf = options.asOfDate?.trim() || PREVIEW_FULL_MONTH;
  const includeWindowMemos = Boolean(options.includeWindowMemos);
  const includeDataImages = Boolean(options.includeDataImages);
  const hc = header.colors;
  const fc = footer.colors;
  const org = header.organizationLabel.trim() || "Your organization";
  const headerBtns = activeButtons(
    header.buttonCount,
    header.button1,
    header.button2,
  );
  const footerBtns = activeButtons(
    footer.buttonCount,
    footer.button1,
    footer.button2,
  );
  const howTo = header.howToSteps.map(parseHowTo);

  const cards =
    state.opportunities.length === 0
      ? `<p class="vol-empty">Volunteer opportunities will appear here soon.</p>`
      : state.opportunities
          .map((role) =>
            renderOpportunityCard(role, asOf, {
              includeWindowMemo: includeWindowMemos,
              includeDataImages,
            }),
          )
          .join("\n");

  const howToBlock = `<div class="vol-howto">
${howTo
  .map(
    (s, i) => `<div class="vol-step"><span class="vol-num">${i + 1}</span><strong>${escapeHtml(s.strong)}</strong>${s.span ? `<span class="vol-step-detail">${escapeHtml(s.span)}</span>` : ""}</div>`,
  )
  .join("\n")}
</div>`;

  const sectionTitle = state.opportunitiesSectionTitle.trim();
  const sectionSub = state.opportunitiesSectionSub.trim();

  return `<!-- Volunteer With Us · full page for /volunteerwithus -->
<style><!--
.vol-wrap{max-width:1100px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;color:#2a2622}
.vol-hero{background:linear-gradient(135deg,${hc.backgroundStart},${hc.backgroundEnd});color:${hc.textColor};padding:40px 30px;border-radius:22px;text-align:center;margin-bottom:18px}
.vol-hero .vol-eyebrow{margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.9}
.vol-hero h1{font-size:36px;margin:0 0 14px;color:${hc.textColor};line-height:1.15}
.vol-hero p{font-size:17px;line-height:1.6;margin:0 auto 18px;max-width:720px;color:${hc.textColor};opacity:.96}
.vol-hero .vol-btns{margin-top:4px}
.vol-btn{display:inline-block;background:${hc.buttonBackground};color:${hc.buttonText}!important;padding:12px 22px;border-radius:999px;font-weight:bold;text-decoration:none!important;margin:6px;transition:transform .2s ease}
.vol-btn:hover{transform:translateY(-2px)}
.vol-howto{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:0 0 28px}
.vol-step{background:#f6f2eb;border:1px solid #e4ddd2;border-radius:16px;padding:16px;text-align:left}
.vol-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:${hc.backgroundEnd};color:#fff;font-size:13px;font-weight:700;line-height:1;margin-bottom:8px;text-align:center}
.vol-step strong{display:block;font-size:15px;margin-bottom:4px;color:#2a2622}
.vol-step-detail{display:block;font-size:13px;line-height:1.45;color:#5c554c}
.vol-section-title{color:#2f4a3c;font-size:26px;margin:8px 0 6px;text-align:center}
.vol-section-sub{text-align:center;color:#5c554c;font-size:14px;margin:0 0 18px;line-height:1.5}
.vol-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.vol-card{background:#fff;border:2px solid #d9e8ec;border-radius:16px;padding:18px;box-shadow:0 4px 12px rgba(0,0,0,.06);display:flex;flex-direction:column}
.vol-card.dimmed{opacity:.72}
.vol-status{font-size:12px;font-weight:700;margin-bottom:8px}
.vol-status.open{color:#2f4a3c}
.vol-status.soon{color:#7a7166}
.vol-status.closed{color:#a65a3a}
.vol-title-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.vol-emoji{font-size:22px;line-height:1;flex-shrink:0}
.vol-thumb{display:block;width:48px;height:48px;border-radius:12px;overflow:hidden;flex-shrink:0;background:#ebe4d9;border:1px solid #d9e8ec}
.vol-thumb img{display:block;width:100%;height:100%;object-fit:cover}
.vol-card h3{margin:0;font-size:18px;color:#0b2f5b;line-height:1.25}
.vol-blurb{font-size:14px;line-height:1.45;color:#333;margin:0 0 8px;flex:1}
.vol-when,.vol-window{margin:0 0 6px;font-size:13px;font-weight:600;color:#0b6f89}
.vol-window{color:#6b7c8a;font-size:11px}
.vol-cta{display:inline-block;margin-top:10px;background:${hc.buttonBackground};color:${hc.buttonText}!important;padding:10px 16px;border-radius:999px;font-weight:bold;text-decoration:none!important;font-size:14px;align-self:flex-start}
.vol-cta.disabled{background:#cfc8bc;color:#5c554c!important;pointer-events:none}
.vol-empty{grid-column:1/-1;text-align:center;color:#7a7166;padding:24px;background:#f6f2eb;border-radius:14px}
.vol-cta-band{margin-top:28px;background:${fc.background};color:${fc.textColor};border-radius:20px;padding:28px;text-align:center}
.vol-cta-band h2{margin:0 0 10px;color:${fc.textColor};font-size:24px}
.vol-cta-band p{margin:0 0 16px;line-height:1.55;color:${fc.textColor};opacity:.95}
.vol-cta-band .vol-btn{background:${fc.buttonBackground};color:${fc.buttonText}!important}
.vol-foot{margin-top:18px;text-align:center;font-size:12px;color:#7a7166}
@media(max-width:800px){.vol-howto,.vol-grid{grid-template-columns:1fr}.vol-hero h1{font-size:28px}}
--></style>
<div class="vol-wrap" id="volunteer-with-us">
<header class="vol-hero">
<p class="vol-eyebrow">${escapeHtml(org)}</p>
<h1>${escapeHtml(header.title.trim() || "Volunteer With Us")}</h1>
${header.intro.trim() ? `<p>${escapeHtml(header.intro)}</p>` : ""}
${renderButtons(headerBtns, "vol-btns")}
</header>
${howToBlock}
${sectionTitle ? `<h2 class="vol-section-title" id="opportunities">${escapeHtml(sectionTitle)}</h2>` : `<div id="opportunities"></div>`}
${sectionSub ? `<p class="vol-section-sub">${escapeHtml(sectionSub)}</p>` : ""}
<div class="vol-grid">
${cards}
</div>
${
  footer.ctaTitle.trim() || footer.ctaBody.trim() || footerBtns.length
    ? `<div class="vol-cta-band">
${footer.ctaTitle.trim() ? `<h2>${escapeHtml(footer.ctaTitle)}</h2>` : ""}
${footer.ctaBody.trim() ? `<p>${escapeHtml(footer.ctaBody)}</p>` : ""}
${renderButtons(footerBtns, "vol-btns")}
</div>`
    : ""
}
<p class="vol-foot">${escapeHtml(org)}</p>
</div>
<script>
(function(){
  function parseYmd(s){
    var p=String(s||"").split("-");
    if(p.length!==3)return null;
    var d=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));
    d.setHours(0,0,0,0);
    return d;
  }
  var asOf=${
    asOf === PREVIEW_FULL_MONTH
      ? "null"
      : `parseYmd(${JSON.stringify(asOf)})`
  };
  var today=asOf||new Date();
  if(today) today.setHours(0,0,0,0);
  var cards=document.querySelectorAll(".vol-card");
  for(var i=0;i<cards.length;i++){
    var el=cards[i];
    var status=el.querySelector(".vol-status");
    var cta=el.querySelector(".vol-cta");
    var always=el.getAttribute("data-always-on")==="1";
    var starts=el.getAttribute("data-starts");
    var expires=el.getAttribute("data-expires");
    var signup=el.getAttribute("data-signup")||"";
    var key="open";
    if(!asOf){
      key=signup?"open":"soon";
    } else if(always){
      key=signup?"open":"soon";
    } else if(starts && today < parseYmd(starts)){
      key="soon";
    } else if(expires && today > parseYmd(expires)){
      key="closed";
    } else {
      key=signup?"open":"soon";
    }
    el.classList.toggle("dimmed", key!=="open");
    if(status){
      status.className="vol-status "+key;
      status.textContent="● "+(key==="open"?"Open":key==="closed"?"Closed":"Coming soon");
    }
    if(cta){
      var can=key==="open"&&signup;
      cta.textContent=key==="closed"?"Sign-up closed":key==="soon"||!signup?"Sign up coming soon":"Sign up →";
      cta.classList.toggle("disabled", !can);
      cta.setAttribute("href", can?signup:"#");
      if(can){ cta.setAttribute("target","_blank"); cta.setAttribute("rel","noopener noreferrer"); }
      else { cta.removeAttribute("target"); cta.setAttribute("aria-disabled","true"); }
    }
  }
})();
</script>`;
}
