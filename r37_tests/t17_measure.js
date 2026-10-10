(opts)=>{
const vw=innerWidth, vh=innerHeight;
const EXC=(opts&&opts.exclude)||'';
const CJK=/[㐀-鿿豈-﫿　-〿＀-￯]/g;
const EMO=/\p{Extended_Pictographic}/gu;
const units=s=>{s=String(s||'');const c=(s.match(/[㐀-鿿豈-﫿]/g)||[]).length;const w=(s.replace(/[㐀-鿿豈-﫿]/g,' ').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g)||[]).length;return c+w;};
const vis=e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;if(r.right<0||r.left>vw+2||r.bottom<-2)return false;return true;};
const SH=!!(opts&&opts.shadow);const R=SH?document.querySelector('#wqm-app-host').shadowRoot:document;
const app=SH?(R.querySelector('.wqm')||[...R.children].find(c=>c.tagName!=='STYLE')):(document.querySelector('#app')||document.body);
const all=[...(SH?R:document.body).querySelectorAll('*')].filter(e=>!['SCRIPT','STYLE','NOSCRIPT','LINK','META','TEMPLATE','PATH','CIRCLE','RECT','G','DEFS','LINE','POLYGON','USE','STOP','LINEARGRADIENT','RADIALGRADIENT','ELLIPSE','TEXT','TSPAN','CLIPPATH','POLYLINE','MASK','FILTER'].includes(e.tagName.toUpperCase()));
// hidden ancestors cache
const visCache=new Map();
function isVis(e){if(visCache.has(e))return visCache.get(e);let v=true;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)v=false;else if(e.parentElement&&e.parentElement!==document.documentElement)v=isVis(e.parentElement);visCache.set(e,v);return v;}
function insideFixed(e){for(let x=e;x&&x!==document.body;x=x.parentElement){const cs=getComputedStyle(x);if(cs.position==='fixed'){const r=x.getBoundingClientRect();if(r.height<vh*0.5)return x;}}return null;}
function sel(e){let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/).slice(0,2).join('.');return s;}
const out={vw,vh,hash:location.hash,title:document.title};
// document and scrollers
const de=document.documentElement,bd=document.body;
out.doc={sh:de.scrollHeight,bsh:bd.scrollHeight,sw:de.scrollWidth,oy_html:getComputedStyle(de).overflowY,oy_body:getComputedStyle(bd).overflowY,scrollY:scrollY};
const scrollers=[];
if(SH){const dl=document.querySelector('#wqm-dialog');if(dl&&dl.scrollHeight>dl.clientHeight+2)scrollers.push({sel:'dialog#wqm-dialog',ch:dl.clientHeight,sh:dl.scrollHeight,over:dl.scrollHeight-dl.clientHeight});}
// s60: elements marked data-s60-list are lists that scroll inside their own container; reported separately (need_px_nolist)
const LISTS=[...(SH?R:document).querySelectorAll('[data-s60-list]')].filter(e=>isVis(e));
const inList=e=>LISTS.some(l=>l===e||l.contains(e));
const scrollersNL=[];
for(const e of all){const cs=getComputedStyle(e);if(!isVis(e))continue;
  if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>0){const o={sel:sel(e),ch:e.clientHeight,sh:e.scrollHeight,over:e.scrollHeight-e.clientHeight};scrollers.push(o);if(!inList(e))scrollersNL.push(o);}
}
scrollers.sort((a,b)=>b.over-a.over);out.scrollers=scrollers.slice(0,4);
out.list_containers=LISTS.length;
// fixed / sticky bars
const bars=[];
for(const e of all){const cs=getComputedStyle(e);if(cs.position!=='fixed'&&cs.position!=='sticky')continue;if(!isVis(e))continue;const r=e.getBoundingClientRect();if(r.width<vw*0.3||r.height<20||r.height>vh*0.6)continue;
  if(e.tagName==='CANVAS')continue;
  bars.push({sel:sel(e),top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),pos:cs.position,txt:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,30)});}
out.bars=bars;
const topBars=bars.filter(b=>b.top<=4&&b.bottom<vh*0.5), botBars=bars.filter(b=>b.bottom>=vh-4&&b.top>vh*0.5);
out.head_px=topBars.reduce((m,b)=>Math.max(m,b.bottom),0);
out.nav_px=botBars.reduce((m,b)=>Math.max(m,vh-b.top),0);
{const nv=(SH?null:document.querySelector('.r37-nav'));if(nv&&isVis(nv)){const r=nv.getBoundingClientRect();out.nav_px=Math.max(0,Math.round(vh-r.top));}
 const hd=SH?null:document.querySelector('body>header,header');let hdCovered=false;if(hd&&isVis(hd)){const r0=hd.getBoundingClientRect();const tp=document.elementFromPoint(Math.min(vw-4,Math.max(4,r0.left+30)),Math.min(vh-1,r0.top+r0.height/2));hdCovered=!!tp&&!hd.contains(tp);}
 if(hd&&isVis(hd)&&!hdCovered){const r=hd.getBoundingClientRect();out.head_px=Math.max(0,Math.round(r.bottom));out.legacy_header_txt=(hd.innerText||'').replace(/\s+/g,' ').trim().slice(0,60);out.legacy_header_ctrls=[...hd.querySelectorAll('a,button')].filter(isVis).length;}else{out.legacy_header_ctrls=0;}
 const bar=SH?null:document.querySelector('.r37-bar,.r37-top,.r37-ptop');if(bar&&isVis(bar)){const r=bar.getBoundingClientRect();out.bar_px=Math.round(r.height);out.bar_bottom=Math.round(r.bottom);}else out.bar_px=0;}
const availBottom=vh-out.nav_px;out.avail_bottom=availBottom;
// content extent (leaf elements with own text or replaced)
let cb=0,cbEl='',cr=0,cbNL=0;
for(const l of LISTS){const r=l.getBoundingClientRect();cbNL=Math.max(cbNL,r.bottom+scrollY);}
for(const e of all){if(!isVis(e))continue;const t=e.tagName;let own='';for(const n of e.childNodes)if(n.nodeType===3)own+=n.nodeValue;own=own.trim();
  const repl=['IMG','CANVAS','INPUT','SELECT','TEXTAREA','VIDEO'].includes(t)||(t==='svg'&&!e.closest('button,a')); // svg considered below
  if(!own&&!repl)continue;
  if(insideFixed(e)){continue;}
  if(e.closest('.r37-nav,header,#toast,.r37-bar,.r37-top'))continue;
  const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
  if(t==='CANVAS'&&r.width>=vw*.9&&r.height>=vh*.9)continue; // full-screen starfield/game canvas
  const bot=r.bottom+scrollY;
  if(bot>cb){cb=bot;cbEl=sel(e)+':'+(own||t).slice(0,18);}
  if(bot>cbNL&&!inList(e))cbNL=bot;
  if(r.right>cr)cr=r.right;
}
out.content_bottom=Math.round(cb);out.content_bottom_el=cbEl;
out.need_content=Math.max(0,Math.round(cb-availBottom));
const docRange=Math.max(0,de.scrollHeight-vh);
const contRange=out.scrollers.reduce((m,s)=>Math.max(m,s.over),0);
out.scroll_range_doc=docRange;out.scroll_range_cont=contRange;
out.need_px=Math.max(out.need_content,docRange,contRange);
out.need_content_nolist=Math.max(0,Math.round(cbNL-availBottom));
out.need_px_nolist=Math.max(out.need_content_nolist,docRange,scrollersNL.reduce((m,s)=>Math.max(m,s.over),0));
out.clipped=out.need_content>12&&docRange<=2&&contRange<=2;
out.open_dialogs=[...document.querySelectorAll('dialog[open]')].map(d=>{const r=d.getBoundingClientRect();let sc=null;const cand=[d,...d.querySelectorAll('*')];for(const x of cand){const cs=getComputedStyle(x);if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&x.scrollHeight>x.clientHeight+2){sc={sel:sel(x),over:x.scrollHeight-x.clientHeight,ch:x.clientHeight};break;}}
  const btns=[...d.querySelectorAll('button,a')].filter(b=>b.offsetParent!==null);const lowest=btns.reduce((mx,b)=>Math.max(mx,b.getBoundingClientRect().bottom),0);
  const txt=(d.innerText||'').replace(/\s+/g,' ').trim();
  return {id:d.id,top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),scroller:sc,lowest_btn_bottom:Math.round(lowest),units:units(txt),txt:txt.slice(0,120)};});
// horizontal overflow
out.h_overflow_doc=de.scrollWidth>vw+1;
const hov=[];
for(const e of all){if(!isVis(e))continue;const r=e.getBoundingClientRect();if(r.width<2)continue;if(insideFixed(e)&&e.closest('#r37-fps-box'))continue;
  if(r.right>vw+2||r.left<-2){let sc=false;for(let x=e.parentElement;x&&x!==document.body;x=x.parentElement){const o=getComputedStyle(x).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'||o==='clip'){sc=true;break;}}
   if(!sc){let own='';for(const n of e.childNodes)if(n.nodeType===3)own+=n.nodeValue;hov.push({sel:sel(e),l:Math.round(r.left),r:Math.round(r.right),txt:own.trim().slice(0,16)});}}}
out.h_overflow_elems=hov.length;out.h_overflow_sample=hov.slice(0,4);
// controls
const ctrlSel='a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[data-act],[data-r37],[data-pg],[data-r3],[data-v23],[onclick]';
let ctrls=[...R.querySelectorAll(ctrlSel+',[data-action]')].filter(e=>isVis(e)&&vis(e));
// de-dup nested
ctrls=ctrls.filter(e=>!ctrls.some(o=>o!==e&&o.contains(e)&&o.tagName!=='LABEL'));
const tiny=[],below=[];let inlineTiny=0;

const ctrlInfo=ctrls.map(e=>{const r=e.getBoundingClientRect();const txt=(e.innerText||e.getAttribute('aria-label')||e.value||e.placeholder||e.title||'').replace(/\s+/g,' ').trim();return {e,r,txt};});
for(const c of ctrlInfo){const {e,r,txt}=c;const fx=!!insideFixed(e);
  const mn=Math.min(r.width,r.height);
  if(mn<44&&!(e.closest('#r37-fps-box'))){const inl=getComputedStyle(e).display==='inline'&&e.tagName==='A';if(inl)inlineTiny++;else tiny.push({txt:txt.slice(0,14),w:Math.round(r.width),h:Math.round(r.height),sel:sel(e)});}
  if(!fx&&r.bottom+scrollY>availBottom+2)below.push({txt:txt.slice(0,16),bottom:Math.round(r.bottom+scrollY)});
}
let covered=0;const covS=[];
for(const c of ctrlInfo){const r=c.r;const cx=r.left+r.width/2,cy=r.top+r.height/2;if(cx<0||cy<0||cx>vw||cy>vh)continue;
  const root=SH?R:document;const t=root.elementFromPoint?root.elementFromPoint(cx,cy):null;
  if(t&&!(t===c.e||c.e.contains(t)||t.contains(c.e))){covered++;if(covS.length<4)covS.push(c.txt.slice(0,14)+' <- '+sel(t));}}
out.ctrl_covered=covered;out.ctrl_covered_sample=covS;
out.ctrl_total=ctrlInfo.length;out.tiny_count=tiny.length;out.tiny_inline=inlineTiny;out.tiny_sample=tiny.slice(0,8);
out.ctrl_below_fold=below.length;out.ctrl_below_sample=below.slice(0,6);
// primary action
if(opts&&opts.primary){const pe=[...document.querySelectorAll(opts.primary)].filter(isVis);if(pe.length){const r=pe[0].getBoundingClientRect();out.primary={sel:opts.primary,bottom:Math.round(r.bottom+scrollY),in_view:(r.bottom+scrollY)<=availBottom+1&&r.top>=-1,txt:(pe[0].innerText||'').trim().slice(0,12)};}else out.primary={sel:opts.primary,missing:true};}
// text blocks
const isCtrl=e=>/^(A|BUTTON|SUMMARY|LABEL|OPTION|INPUT|SELECT)$/.test(e.tagName)||e.getAttribute('role')==='button'||e.getAttribute('role')==='tab';
const inlineDisp=cs=>['inline','contents','inline-block','inline-flex','inline-grid'].includes(cs.display);
const blocks=[];
function hasTextDesc(e){return (e.innerText||'').trim().length>0;}
const contentCls=/(^|\s)(r37-qt|r37-qe|r37-opt|r37-sc|r37-wc|r37-q|word|cloze-sentence|question-cue|r37-fill|letter-box|meaning)(\s|$)/;
function walk(e){
  if(!isVis(e))return;const t=e.tagName.toUpperCase();if(['SCRIPT','STYLE','CANVAS','SVG','NOSCRIPT','TEXTAREA','SELECT','OPTION','DIALOG-HIDDEN'].includes(t))return;
  if(t==='INPUT')return;
  const cs=getComputedStyle(e);
  // find block-level child elements with text
  const kids=[...e.children].filter(k=>isVis(k));
  const blockKids=kids.filter(k=>{const kc=getComputedStyle(k);const kt=k.tagName.toUpperCase();if(['SVG','CANVAS','IMG','BR','SCRIPT','STYLE','INPUT'].includes(kt))return false;
     if(!hasTextDesc(k))return false;
     const nonInline=!inlineDisp(kc)||(isCtrl(k)&&false);
     return nonInline||isCtrl(k)&&!inlineDisp(kc);});
  const textBlocks=kids.filter(k=>blockKids.includes(k));
  let own='';for(const n of e.childNodes)if(n.nodeType===3)own+=n.nodeValue;
  const hasInlineText=(e.innerText||'').trim().length>0;
  if(textBlocks.length===0||isCtrl(e)&&!textBlocks.length){
    const txt=(e.innerText||'').replace(/\s+/g,' ').trim();if(!txt)return;
    blocks.push({el:e,txt,ctrl:isCtrl(e)||!!e.closest('button,a[href],summary'),tag:t});return;}
  // mixed: own text directly in a container with block children -> own text is a block as well
  if(own.trim()){blocks.push({el:e,txt:own.replace(/\s+/g,' ').trim(),ctrl:false,tag:t});}
  for(const k of kids)walk(k);
}
walk(app);
// also header/nav outside #app
const outside=[...document.body.children].filter(c=>c!==app&&!c.contains(app)&&c.id!=='toast');
let navLabelUnits=0;
const exSel=EXC;
const items=[];
for(const b of blocks){
  const e=b.el;
  const inFixedNav=e.closest('.r37-nav');
  const isContent=(exSel&&e.closest(exSel))||e.closest('[lang="en"]')||contentCls.test(e.className||'')||e.closest('.r37-wc,.r37-opt,.r37-qt,.r37-q,.r37-sc,.question-cue,.word,.study-content,.letter-row,.options,.letter-options');
  const u=units(b.txt);
  if(!u)continue;
  let cls='desc';
  if(inFixedNav)cls='nav';
  else if(isContent)cls='content';
  else if(b.ctrl&&u<=8)cls='label';
  else if(/^H[1-3]$/.test(b.tag)&&u<=12)cls='title';
  else if(/^[\d\s\/·%＋+\-—:.,★❤🪙✓×]+$/.test(b.txt)||u<=3)cls='label';
  else if(u<=8&&!b.ctrl)cls='label';
  items.push({txt:b.txt,u,cls,tag:b.tag,sel:sel(e)});
}
const sum=c=>items.filter(i=>i.cls===c).reduce((a,i)=>a+i.u,0);
out.text={total:items.reduce((a,i)=>a+i.u,0),desc:sum('desc'),label:sum('label'),title:sum('title'),content:sum('content'),nav:sum('nav')};
const descs=items.filter(i=>i.cls==='desc').sort((a,b)=>b.u-a.u);
out.desc_count=descs.length;
out.desc_top=descs.slice(0,5).map(d=>({u:d.u,txt:d.txt.slice(0,160),sel:d.sel}));
// repeated text
const seen={};for(const i of items){if(i.cls==='nav'||i.cls==='content')continue;const k=i.txt;if(k.length<2)continue;seen[k]=(seen[k]||0)+1;}
out.repeats=Object.entries(seen).filter(([k,v])=>v>=2).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>k.slice(0,20)+' ×'+v);
// small fonts
let small=0,minf=99;const smallS=[];
for(const b of blocks){const fs=parseFloat(getComputedStyle(b.el).fontSize);if(fs<minf)minf=fs;if(fs<12&&units(b.txt)>=2){small++;if(smallS.length<3)smallS.push(b.txt.slice(0,14)+' '+fs+'px');}}
out.small_font_blocks=small;out.min_font=minf===99?null:minf;out.small_font_sample=smallS;
// icons
const icon={total:0,ctrl_only:0,ctrl_label:0,inline_decor:0,svg:0,img:0,glyph:{}};
const gl=icon.glyph;
const domains=[document.body];
function iconCtx(e){// classify container
  const c=e.closest('button,a[href],summary,[role=button],[data-act],[data-r37]');
  return c;}
for(const e of all){if(!isVis(e))continue;
  if(e.closest('.r37-stars,.r37-hearts,.r37-pips,.r37-bar2,.r37-prog'))continue;
  if(e.tagName.toLowerCase()==='svg'&&!e.closest('svg:not(:scope)')){const r=e.getBoundingClientRect();if(r.width<4)continue;icon.svg++;icon.total++;
    const c=iconCtx(e);const lbl=c?units((c.innerText||'').trim()):0;
    if(c){if(lbl>0)icon.ctrl_label++;else icon.ctrl_only++;}else icon.inline_decor++;
    continue;}
  if(e.tagName==='IMG'){const r=e.getBoundingClientRect();if(r.width<4)continue;icon.img++;continue;}
  let own='';for(const n of e.childNodes)if(n.nodeType===3)own+=n.nodeValue;
  const m=own.match(EMO);if(m){for(const g of m){icon.total++;gl[g]=(gl[g]||0)+1;}
    const c=iconCtx(e);
    const txtLen=units((c?c.innerText:e.parentElement?.innerText)||'');
    for(const g of m){if(c){const rest=units((c.innerText||'').replace(EMO,''));if(rest>0)icon.ctrl_label++;else icon.ctrl_only++;}else icon.inline_decor++;}
  }
}
icon.dup=Object.entries(gl).filter(([g,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([g,n])=>g+'×'+n);
icon.decor=icon.ctrl_label+icon.inline_decor;
delete icon.glyph;
out.icons=icon;
// back-like controls
const backs=ctrlInfo.filter(c=>/^(←|＜|<|‹)|^(返回|回到|回星|回)/.test(c.txt)||/返回/.test(c.e.getAttribute('aria-label')||'')).map(c=>c.txt.slice(0,12));
out.back_controls=backs;
// ellipsis / clipped text
let trunc=0;const truncS=[];
for(const e of all){if(!isVis(e))continue;const cs=getComputedStyle(e);
  let own='';for(const n of e.childNodes)if(n.nodeType===3)own+=n.nodeValue;if(!own.trim())continue;
  const clipX=(cs.overflowX==='hidden'||cs.overflowX==='clip')&&e.scrollWidth>e.clientWidth+2;
  const ell=cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1;
  const clipY=(cs.overflowY==='hidden'||cs.overflowY==='clip')&&e.scrollHeight>e.clientHeight+3&&e.clientHeight>0;
  const lc=cs.webkitLineClamp&&cs.webkitLineClamp!=='none'&&e.scrollHeight>e.clientHeight+2;
  if(clipX||ell||clipY||lc){trunc++;if(truncS.length<4)truncS.push(own.trim().slice(0,16));}
}
out.truncated=trunc;out.truncated_sample=truncS;
// h1 y
const h1=[...R.querySelectorAll('h1,h2')].filter(isVis)[0];out.h1_y=h1?Math.round(h1.getBoundingClientRect().top):null;out.h1_txt=h1?h1.innerText.trim().slice(0,16):'';
return out;}
