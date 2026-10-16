(opts)=>{
/* R3.18 t23 scan: one pass over the visible page (or a shadow root) -> light surfaces, filled buttons, emoji icons, low contrast text.
   opts: {shadow:bool, readOk:[css selectors of white reading cards that are allowed]} */
const SH=!!(opts&&opts.shadow);
const R=SH?(document.querySelector('dialog#wq-course-dialog[open]')?document.querySelector('#wq-course-host'):document.querySelector('#wqm-app-host')).shadowRoot:document;
const READ=((opts&&opts.readOk)||[]).join(',');
const vw=innerWidth,vh=innerHeight;
const rgba=s=>{const m=String(s).match(/[\d.]+/g);if(!m||m.length<3)return null;return [+m[0],+m[1],+m[2],m.length>3?+m[3]:1];};
const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);};
const lum=c=>.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);
const over=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1];};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const parentOf=e=>e.parentElement||(e.getRootNode&&e.getRootNode().host)||null;
const vis=e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>=2&&r.height>=2&&r.right>0&&r.left<vw&&r.bottom>0&&r.top<vh;};
const hidAnc=e=>{for(let x=e;x;x=parentOf(x)){const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return true;}return false;};
const sel1=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(e.className&&typeof e.className==='string'&&e.className.trim())s+='.'+e.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
const sel=e=>{let s=sel1(e);if(!/[.#]/.test(s)){let p=e.parentElement,n=0;while(p&&n<3&&!/[.#]/.test(sel1(p))){p=p.parentElement;n++;}if(p)s=sel1(p)+'>'+s;}return s;};
const BASE=[11,16,48,1];
/* worst-case background colours behind element e (gradients -> every stop; photos -> the dark wash) */
function backs(e){
 let layers=[];
 for(let x=e;x;x=parentOf(x)){
  const cs=getComputedStyle(x);
  const bc=rgba(cs.backgroundColor);
  const bi=cs.backgroundImage;
  let cols=null;
  if(bi&&bi!=='none'){
   if(/gradient/.test(bi)){const found=padColours(cs);if(found&&found.length)cols=found;}
   else if(/url\(/.test(bi)){cols=[[11,16,48,1]];}
  }
  if(cols){layers.push(cols);if(cols.every(c=>c[3]>=.97))break;}
  else if(bc&&bc[3]>0){layers.push([bc]);if(bc[3]>=.97)break;}
 }
 let acc=[BASE];
 for(const ls of layers.reverse()){const nxt=[];for(const c of ls)for(const b of acc)nxt.push(over(c,b));acc=nxt.length>12?nxt.slice(0,12):nxt;}
 return acc;
}
const splitTop=v=>{const a=[];let d=0,cur='';for(const ch of v){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){a.push(cur.trim());cur='';}else cur+=ch;}if(cur.trim())a.push(cur.trim());return a;};
/* colours that paint the padding box: skip trailing border-box gradient layers (the 1px gradient edge trick) */
function padColours(cs){
 const bi=cs.backgroundImage;if(!bi||bi==='none')return null;
 const layers=splitTop(bi),clips=splitTop(cs.backgroundClip||''),bw=parseFloat(cs.borderTopWidth)||0;
 const keep=layers.filter((l,i)=>!(layers.length>1&&i>0&&bw>0&&(clips[i%clips.length]||'')==='border-box'&&!/url\(/.test(l)));
 const cols=[];for(const l of keep)if(/gradient/.test(l))for(const m of (l.match(/rgba?\([^)]*\)/g)||[]))cols.push(rgba(m));
 return cols.filter(Boolean);
}
const out={light:[],filled:[],emoji:[],contrast:[],read:[]};
const EMO=/\p{Extended_Pictographic}/u,EMOK=/^[★☆❤▶✓✔✕✖↻←→↑↓▾▸×✗⏸]$/u;
const all=[...R.querySelectorAll('*')].filter(e=>!['SCRIPT','STYLE','NOSCRIPT','LINK','META','TEMPLATE','PATH','CIRCLE','RECT','G','DEFS','LINE','POLYGON','USE','STOP','LINEARGRADIENT','RADIALGRADIENT','OPTION','TITLE','CLIPPATH','TEXT','TSPAN','ELLIPSE','POLYLINE','FILTER','MASK'].includes(e.tagName.toUpperCase()));
const GAME=e=>e.closest('canvas,#r37-fps-box,#r37-run-box');
for(const e of all){
 if(!vis(e)||hidAnc(e)||GAME(e))continue;
 const cs=getComputedStyle(e),r=e.getBoundingClientRect(),t=e.tagName;
 const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();
 // light surfaces / filled buttons
 if(!['INPUT','SELECT','TEXTAREA','IMG','SVG','CANVAS','HTML','BODY'].includes(t.toUpperCase())&&!e.closest('#toast,.r37-orb,.r37-bigorb,.r37-planet,.r37-sun,.r37-av,.r37-ic,.r37-cimg')){
  const bc=rgba(cs.backgroundColor);
  let cols=null;
  if(bc&&bc[3]>=.6)cols=[bc];
  const g=padColours(cs);if(g){const f=g.filter(c=>c[3]>=.6);if(f.length)cols=f;}
  if(cols&&r.width>=44&&r.height>=28&&!e.closest('.s60-more,.r37-node,.r37-wtab')){
   const L=Math.max(...cols.map(lum)),c=cols[0];
   const hex='#'+[c[0],c[1],c[2]].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
   const cls=String(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className);
   const isBtn=(t==='BUTTON'||e.getAttribute('role')==='button'||/(^|[ _-])(btn|button|primary|go|cta|ok|next|sec|fpsgo)([ _-]|$)/.test(cls)||/l30-btn|wq29|p10-dict-btn|l31-chip/.test(cls))&&!/tile|card|node|wtab|tab\b|chip|opt\b|nav|planet|char|df\b/.test(cls)&&!e.closest('.r37-nav');
   const rec={sel:sel(e),w:Math.round(r.width),h:Math.round(r.height),bg:hex,txt:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,20)};
   if(READ&&e.closest(READ)&&L>.2)out.read.push(rec);
   else if(isBtn){if(hex!=='#ffc94a'&&L>.06||hex==='#ffc94a')out.filled.push(Object.assign(rec,{ok:hex==='#ffc94a'}));}
   else if(L>.2)out.light.push(rec);
  }
 }
 // emoji used as an icon (control / heading text starting with a pictograph)
 if(own&&EMO.test(own)){
  const content=e.closest('.l30-word,.l30-qcard,.l30-wordcard,.r37-qe,.r37-wem,.r37-wc,.q36-card,.l30-sample,.l30-miniart,[data-content]');
  if(!content){
   const found=[...own].filter(ch=>EMO.test(ch)&&!EMOK.test(ch));
   if(found.length)out.emoji.push({sel:sel(e),ch:found.join('').slice(0,6),txt:own.slice(0,20)});
  }
 }
 // text contrast
 if(own&&!/^[\s·|/\\\-–—•]+$/.test(own)){
  const fg=rgba(cs.color);if(!fg||fg[3]===0||e.closest('#toast'))continue;
  const bg=backs(e);
  let worst=99,wb=null;
  for(const b of bg){const f=fg[3]<1?over(fg,b):fg;const c=cr(f,b);if(c<worst){worst=c;wb=b;}}
  const px=parseFloat(cs.fontSize);if(px<1)continue;
  const need=(px>=24||(px>=18.66&&+cs.fontWeight>=700))?3:4.5;
  if(worst<need)out.contrast.push({sel:sel(e),ratio:Math.round(worst*10)/10,fg:cs.color,bg:wb?'rgb('+wb.slice(0,3).map(Math.round).join(',')+')':'',px,txt:own.slice(0,24)});
 }
}
// de-duplicate by selector+text
const dd=a=>{const s=new Set();return a.filter(x=>{const k=x.sel+'|'+(x.txt||x.ch||'');if(s.has(k))return false;s.add(k);return true;});};
for(const k of Object.keys(out))out[k]=dd(out[k]);
return out;
}
