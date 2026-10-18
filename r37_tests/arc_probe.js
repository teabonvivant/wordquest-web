/* R3.20 arc_probe.js - the one ruler for the arcade play page. Shared by t28, r320_capture.py and the acceptance run.
 * Load it with page.add_script_tag(path=...) then call window.__arcProbe({state}) -> plain JSON.
 * Everything is measured from the real DOM (no game knowledge): document scroll, every visible element of the play page that leaves the window,
 * clipped text, inner scrolling of the result card, and every visible button with its label colour / background colour / contrast / line count. */
(()=>{
 const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05);};
 const parse=s=>{const m=/rgba?\(([^)]+)\)/.exec(s||'');if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {c:[p[0],p[1],p[2]],a:p.length>3?p[3]:1};};
 const vis=e=>{try{return e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});}catch(_){const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden';}};
 const box=e=>{const r=e.getBoundingClientRect();return {l:+r.left.toFixed(1),t:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
 const nm=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 /* an element fully clipped by an ancestor that hides overflow does not count as "outside" (it is not on screen either) */
 const clippedAway=e=>{
  const r=e.getBoundingClientRect();
  for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){
   const cs=getComputedStyle(p);
   if(/(hidden|clip)/.test(cs.overflowX+cs.overflowY)){const q=p.getBoundingClientRect();if(r.right<=q.left||r.left>=q.right||r.bottom<=q.top||r.top>=q.bottom)return true;}
  }
  return false;
 };
 /* effective background: first non-transparent ancestor; a gradient takes the worst stop */
 const bgOf=(e,fg)=>{
  for(let p=e;p&&p.nodeType===1;p=p.parentElement){
   const cs=getComputedStyle(p),bi=cs.backgroundImage;
   if(bi&&bi!=='none'&&/gradient/.test(bi)){
    const cols=[...bi.matchAll(/rgba?\([^)]*\)/g)].map(m=>parse(m[0])).filter(x=>x&&x.a>.3);
    if(cols.length){let worst=null,wr=1e9;for(const k of cols){const r=ratio(fg,k.c);if(r<wr){wr=r;worst=k.c;}}return {c:worst,grad:true};}
   }
   const b=parse(cs.backgroundColor);
   if(b&&b.a>.5)return {c:b.c,grad:false};
  }
  return {c:[255,255,255],grad:false};
 };
 /* line count of ONE text run: the rects of each text node are grouped by top; sibling boxes (badge + label side by side) are counted per text node, the max wins */
 const lines=e=>{let mx=0;const wk=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while((n=wk.nextNode())){if(!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);const tops=new Set();for(const r of rg.getClientRects()){if(r.width>0&&r.height>0)tops.add(Math.round(r.top/4));}mx=Math.max(mx,tops.size);}return mx;};
 const hasText=e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||!!e.textContent.trim();
 window.__arcProbe=function(opts){
  opts=opts||{};
  const W=innerWidth,H=innerHeight,se=document.scrollingElement;
  const pl0=document.querySelector('.a28-play');
  /* vscroll: the document scrolls, OR the play page (fixed height, overflow hidden by the layout contract) has content it has to cut off */
  const playCut=!!(pl0&&pl0.scrollHeight>pl0.clientHeight+1);
  const out={state:opts.state||'',W,H,hscroll:se.scrollWidth>W+1,vscroll:se.scrollHeight>H+1||playCut,playCut,sx:se.scrollWidth,sy:se.scrollHeight,outside:[],clipped:[],innerScroll:[],buttons:[],canvas:null,hud:null,dupStats:0,dupWhere:[],lowText:[]};
  const play=document.querySelector('.a28-play');
  const roots=[play,document.getElementById('pg-overlay')].filter(Boolean);
  const seen=new Set();
  for(const root of roots){
   const all=[root,...root.querySelectorAll('*')];
   for(const e of all){
    if(seen.has(e))continue;seen.add(e);
    if(/^(script|style|link|meta|path|circle|defs|g|title)$/i.test(e.tagName))continue;
    if(!vis(e))continue;
    const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    if(clippedAway(e))continue;
    if(r.left<-1||r.top<-1||r.right>W+1||r.bottom>H+1)out.outside.push(Object.assign({el:nm(e),txt:(e.textContent||'').trim().slice(0,24)},box(e)));
   }
  }
  const selClip='.ap-hud span,.ap-hud b,.ap-hud small,button,.a28-touch-key,.ap-rs span,.ap-rs b,.ap-rs small,.ap-cw,.ap-ct,.a28-playstats>*,.a28-playhead *,.ap-tip,.ap-opt,.ap-go,.arx-chip,.ap-chip';
  for(const root of roots){
   for(const e of root.querySelectorAll(selClip)){
    if(!vis(e)||!hasText(e))continue;
    const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    const cs=getComputedStyle(e);
    if(cs.display==='inline')continue;
    const hid=/(hidden|clip|auto|scroll)/.test(cs.overflowY);
    const par=e.parentElement&&e.parentElement.closest('.ap-hud,.a28-playstats,.ap-rs,.ap-dock,.a28-touch-controls,.a28-game-footer');
    const pb=par&&getComputedStyle(par).display!=='contents'?par.getBoundingClientRect():null;
    const spill=pb&&(r.right>pb.right+1||r.left<pb.left-1);   /* a pill that leaves the bar it belongs to */
    if(e.scrollWidth>e.clientWidth+1||(hid&&e.scrollHeight>e.clientHeight+1)||spill){
     /* an element that only scrolls (overflow visible) but is not hidden still spills; count it when it can clip */
     out.clipped.push(Object.assign({el:nm(e),txt:(e.textContent||'').trim().slice(0,24),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight},box(e)));
    }
   }
  }
  const card=document.querySelector('#pg-overlay .a28-overlaycard');
  for(const e of [card,...(card?card.querySelectorAll('*'):[]),document.getElementById('pg-overlay')]){
   if(!e||!vis(e))continue;
   const cs=getComputedStyle(e);
   if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+1)out.innerScroll.push({el:nm(e),sh:e.scrollHeight,ch:e.clientHeight});
  }
  for(const e of document.querySelectorAll('.a28-play button,.a28-play .a28-touch-key,#pg-overlay button,.a28-play [role=button]')){
   if(!vis(e))continue;
   const r=e.getBoundingClientRect();if(r.width<2||r.height<2||clippedAway(e))continue;
   const cs=getComputedStyle(e),fg=parse(cs.color);if(!fg)continue;
   const bg=bgOf(e,fg.c),op=parseFloat(cs.opacity)||1;
   const dis=e.disabled||e.getAttribute('aria-disabled')==='true';
   out.buttons.push({el:nm(e),txt:(e.textContent||'').trim().slice(0,24),w:+r.width.toFixed(1),h:+r.height.toFixed(1),lines:lines(e),fg:fg.c,bg:bg.c,grad:bg.grad,contrast:+ratio(fg.c,bg.c).toFixed(2),disabled:!!dis,key:e.dataset&&e.dataset.a28key||'',touch:e.classList.contains('a28-touch-key'),b:+r.bottom.toFixed(1),l:+r.left.toFixed(1),r:+r.right.toFixed(1)});
  }
  const cv=document.getElementById('pg-canvas');if(cv)out.canvas=box(cv);
  const vp=document.querySelector('.a28-viewport');if(vp)out.vp=box(vp);
  const hud=document.querySelector('.ap-hud');
  if(hud&&vis(hud)){
   const lv=hud.querySelectorAll('.ap-lives i:not(.sh)'),on=hud.querySelectorAll('.ap-lives i.on'),sc=hud.querySelector('.ap-score b');
   out.hud={lives:lv.length?on.length:null,hearts:lv.length,score:sc?+sc.textContent.replace(/[^0-9]/g,''):null,box:box(hud)};
  }
  /* any other visible element that shows the lives / score: the outer pills and result lines, but not the HUD itself */
  const hudEl=hud&&vis(hud)?hud:null;
  for(const e of document.querySelectorAll('.a28-playstats>*,.a28-playstats span,#a28-live-stat,.a28-playhead [class*=stat],.a28-playhead [class*=pill]')){
   if(!vis(e)||(hudEl&&hudEl.contains(e)))continue;
   const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
   const t=(e.innerText||'').trim();
   if(/生命|命|分|♥|❤|心/.test(t)){out.dupStats++;out.dupWhere.push(nm(e)+':'+t.slice(0,16));}
  }
  /* R3.20 r2: visible plain text (captions, hints, tips - not buttons) must also be readable: contrast >= 4.5 against its effective background */
  for(const e of document.querySelectorAll('.a28-play *,#pg-overlay *')){
   if(/^(script|style|button|canvas|svg|path|circle|option|summary)$/i.test(e.tagName)||e.closest('button,.a28-touch-key,#pg-readable,.sr-only,[aria-hidden=true],details:not([open]),#pg-hint:empty'))continue;
   if(!vis(e)||clippedAway(e))continue;
   const own=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join('');
   if(!own||!/[0-9A-Za-z\u4e00-\u9fff]/.test(own))continue;   /* symbol-only text (★ ◆ ✓) is decoration, not reading text */
   const r=e.getBoundingClientRect();if(r.width<4||r.height<4||r.right<0||r.bottom<0||r.left>W||r.top>H)continue;
   const cs=getComputedStyle(e),fg=parse(cs.color);if(!fg)continue;
   const bg=bgOf(e,fg.c),c=ratio(fg.c,bg.c);
   if(c<4.5)out.lowText.push({el:nm(e),txt:own.slice(0,24),fg:fg.c,bg:bg.c,contrast:+c.toFixed(2)});
  }
  /* R3.20 r3: overlaps. (a) two visible buttons that overlap by > 4 px on both axes, (b) a button overlapped by visible text, (c) a button whose centre point
   * is covered by another element (elementFromPoint), (d) two leaf text / button boxes of the result card that overlap, (e) button label padding < 4 px,
   * (f) a button flush with the window edge (< 4 px). Every list holds [a,b] label pairs. */
  out.overlaps={bb:[],bt:[],cov:[],card:[],pad:[],edge:[]};
  {
   const lab=e=>(e.textContent||e.className||'').toString().trim().slice(0,14);
   const ov=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>4&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>4;
   const btn=[...document.querySelectorAll('.a28-play button,.a28-play .a28-touch-key,.a28-play [role=button],#pg-overlay button')].filter(e=>vis(e)).map(e=>({e,r:e.getBoundingClientRect()})).filter(x=>x.r.width>2&&x.r.height>2&&x.r.bottom>0&&x.r.top<H&&!clippedAway(x.e));
   const txt=[...document.querySelectorAll('.a28-play *')].filter(e=>vis(e)&&!e.closest('button,.a28-touch-key,[role=button],#pg-overlay,#pg-readable,canvas')&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>{const g=document.createRange();g.selectNodeContents(e);return {e,r:g.getBoundingClientRect()};}).filter(x=>x.r.width>2&&x.r.height>2&&x.e.getBoundingClientRect().width>=4&&!clippedAway(x.e));
   for(let i=0;i<btn.length;i++){
    const a=btn[i];
    for(let j=i+1;j<btn.length;j++){const b=btn[j];if(a.e.contains(b.e)||b.e.contains(a.e))continue;if(ov(a.r,b.r))out.overlaps.bb.push([lab(a.e),lab(b.e)]);}
    for(const t of txt){if(t.e.contains(a.e))continue;if(ov(a.r,t.r))out.overlaps.bt.push([lab(a.e),lab(t.e)]);}
    const x=a.r.left+a.r.width/2,y=a.r.top+a.r.height/2;
    if(x>=0&&y>=0&&x<W&&y<H){const t=document.elementFromPoint(x,y);if(t&&!(a.e===t||a.e.contains(t)||t.contains(a.e)))out.overlaps.cov.push([lab(a.e),lab(t)]);}
    const rg=document.createRange();rg.selectNodeContents(a.e);const tr=rg.getBoundingClientRect();
    if(tr.width){const pl=tr.left-a.r.left,pr=a.r.right-tr.right;if(pl<4||pr<4)out.overlaps.pad.push([lab(a.e),+pl.toFixed(1),+pr.toFixed(1)]);}
    if(a.r.left<4||W-a.r.right<4)out.overlaps.edge.push([lab(a.e),+a.r.left.toFixed(1),+(W-a.r.right).toFixed(1)]);
   }
   const c=document.querySelector('#pg-overlay .a28-overlaycard');
   if(c&&vis(c)){
    const items=[...c.querySelectorAll('*')].filter(e=>vis(e)&&(e.matches('button,.btn')||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))).filter(e=>!e.closest('button,.btn')||e.matches('button,.btn'));
    const B=items.map(e=>{let r;if(e.matches('button,.btn')||!/[0-9A-Za-z\u4e00-\u9fff]/.test(e.textContent))r=e.getBoundingClientRect();else{const g=document.createRange();g.selectNodeContents(e);r=g.getBoundingClientRect();}return {e,r};}).filter(x=>x.r.width>2&&x.r.height>2);
    for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if(a.e.contains(b.e)||b.e.contains(a.e))continue;if(ov(a.r,b.r))out.overlaps.card.push([lab(a.e),lab(b.e)]);}
   }
  }
  return out;
 };
})();
