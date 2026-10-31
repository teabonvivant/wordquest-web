/* R3.31 WQPad - every fill-in answer is built from tiles the child taps; no system keyboard.
   Works in any document (host page, tools iframe). A resolver returns {type,answer} for an input:
   type 'text' | 'num' | 'sentence' (tiles made from `answer` plus a few decoys), 'cells' (a fixed row of blanks),
   'digits' | 'frac' | 'expr' | 'units' (answer unknown: a small fixed pad). */
(function(){
 if(window.WQPad)return;
 const CONF={a:'eou',b:'dpq',c:'esk',d:'bpq',e:'ai',f:'tl',g:'qjy',h:'nbk',i:'ljy',j:'gi',k:'hxc',l:'ijt',m:'nwr',n:'mhr',o:'aeu',p:'qbd',q:'pgd',r:'nvt',s:'cz',t:'fl',u:'vnw',v:'uyw',w:'vm',x:'kz',y:'vgj',z:'sx'};
 const WORDS='the a is and we my go she he was are to in on at it of you can do not so up'.split(' ');
 const UNITS=['元','個','分鐘','厘米','米','公斤','克','毫升','公升','度','人','張','本','%'];
 const css=`.wqp{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:100%;margin:12px 0 4px;padding:0;box-sizing:border-box}
.wqp-t{min-width:46px;min-height:50px;padding:6px 12px;border:2px solid #cfd4ff;border-radius:14px;background:#fff;color:#27307a;font:800 24px/1 inherit;font-family:inherit;cursor:pointer;box-shadow:0 4px 0 #b7bff0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .12s,opacity .12s}
.wqp-t:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 #b7bff0}
.wqp-t:focus-visible{outline:3px solid #ffc94a;outline-offset:2px}
.wqp-t:disabled{opacity:.28;box-shadow:none;cursor:default}
.wqp-t.wide{min-width:84px;font-size:18px}.wqp-t.back{background:#ffe9a8;border-color:#e9b949;box-shadow:0 4px 0 #c5942b;color:#4a3000}
.wqp-t.zh{font-size:20px}.wqp-t.word{font-size:20px;padding:6px 14px}
.wqp-in[readonly]{caret-color:transparent;cursor:pointer}.wqp-in.wqp-act{outline:3px solid #ffc94a;outline-offset:1px}
@media (max-width:420px){.wqp{gap:6px}.wqp-t{min-width:42px;min-height:48px;font-size:22px}}
@media (max-width:420px) and (min-height:720px){.wqp{gap:8px}.wqp-t{min-width:54px;min-height:58px;font-size:26px}.wqp-t.wide{font-size:18px}.wqp-t.zh,.wqp-t.word{font-size:20px}}
@media (prefers-reduced-motion:reduce){.wqp-t{transition:none}}`;
 function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
 function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
 function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function decoys(chars,n,r,upper){
  const have=new Set(chars.map(c=>c.toLowerCase())),out=[];
  const near=[];chars.forEach(c=>{(CONF[c.toLowerCase()]||'').split('').forEach(x=>{if(!have.has(x)&&!near.includes(x))near.push(x);});});
  for(const x of shuffle(near,r)){if(out.length>=n)break;out.push(x);}
  const rest=shuffle('abcdefghijklmnopqrstuvwxyz'.split('').filter(x=>!have.has(x)&&!out.includes(x)),r);
  while(out.length<n&&rest.length)out.push(rest.shift());
  return out.map(x=>upper?x.toUpperCase():x);
 }
 function tilesFor(spec){
  const a=String(spec.answer==null?'':spec.answer),seed=hash(spec.type+'|'+a),r=rng(seed);
  let list=[];
  if(spec.type==='sentence'){
   const toks=a.trim().split(/\s+/).filter(Boolean),low=toks.map(t=>t.toLowerCase().replace(/[^a-z']/g,''));
   const extra=shuffle(WORDS.filter(w=>!low.includes(w)),r).slice(0,Math.min(4,Math.max(2,Math.round(toks.length/2))));
   list=toks.concat(extra).map(t=>({v:t,sp:true,cls:'word'}));
  }else if(spec.type==='num'){
   const ch=[...a].filter(c=>c!==' ');const have=new Set(ch);
   const ds=shuffle('0123456789'.split('').filter(d=>!have.has(d)),r).slice(0,Math.max(3,Math.min(4,ch.length)));
   list=ch.concat(ds).map(v=>({v}));
   if(/\s/.test(a))list.push({v:' ',label:'空格',cls:'wide'});
  }else{
   const ch=[...a].filter(c=>c!==' '),letters=ch.filter(c=>/\p{L}/u.test(c)),k=letters.length;
   const n=spec.decoy!=null?spec.decoy:k<=3?2:k<=6?3:k<=10?4:5,upper=letters.length&&letters.every(c=>c===c.toUpperCase());
   list=ch.concat(decoys(letters,n,r,upper)).map(v=>({v}));
   (a.match(/ /g)||[]).forEach(()=>list.push({v:' ',label:'空格',cls:'wide'}));
  }
  let out=shuffle(list,r),guard=0;
  const spelled=o=>spec.type==='sentence'?o.filter(t=>t.sp).map(t=>t.v).join(' ').startsWith(a.trim()):o.map(t=>t.v).join('').startsWith(a.replace(/ /g,''));
  while(out.length>1&&guard++<8&&spelled(out))out=shuffle(list,rng(seed+guard));
  return out;
 }
 function fixedTiles(type,hint){
  if(type==='units')return UNITS.map(v=>({v,cls:'zh'}));
  const d='0123456789'.split('').map(v=>({v}));
  if(type==='expr')return d.concat(['+','−','×','÷','(',')','.'].map(v=>({v})));
  if(type==='frac')return d.concat([{v:'/'}]);
  return d.concat(hint&&hint.dot===false?[]:[{v:'.'}]);
 }
 function pressed(btn,fx){try{if(fx&&typeof fx==='function')fx();}catch(_){}}
 const W={resolvers:[],fx:null},groups=new Set();
 function usedFlags(list,value,sentence){
  const used=list.map(()=>false);
  if(sentence){String(value).trim().split(/\s+/).filter(Boolean).forEach(w=>{const i=list.findIndex((t,k)=>!used[k]&&t.v===w);if(i>=0)used[i]=true;});return used;}
  for(const c of String(value)){const i=list.findIndex((t,k)=>!used[k]&&t.v===c);if(i>=0)used[i]=true;}
  return used;
 }
 function fire(inp){inp.dispatchEvent(new Event('input',{bubbles:true}));}
 function groupRoot(inp,spec){return (spec&&spec.group&&inp.closest(spec.group))||inp.closest('[data-wqp-group],.r37-fill,.r37-cells,.answerbox,.fraction-answer,.word-fields,.fg-fill-row,.l30-quiz form,form')||inp.parentNode;}
 function mount(inp,spec){
  if(inp.dataset.wqp)return;inp.dataset.wqp='1';
  inp.readOnly=true;inp.setAttribute('inputmode','none');inp.setAttribute('autocomplete','off');inp.classList.add('wqp-in');
  if(inp.placeholder&&!/選|點/.test(inp.placeholder))inp.placeholder='點下面的字';
  const root=groupRoot(inp,spec);let G=root._wqp;
  if(!G){
   G={root,inputs:[],pad:document.createElement('div'),active:null,spec:null};G.pad.className='wqp';G.pad.setAttribute('role','group');G.pad.setAttribute('aria-label','點選字母作答');
   root._wqp=G;groups.add(G);
   const after=root.matches('label,.field')?root:root;(after.nextSibling?after.parentNode.insertBefore(G.pad,after.nextSibling):after.parentNode.appendChild(G.pad));
  }
  G.inputs.push({inp,spec});inp._wqpG=G;
  inp.addEventListener('click',()=>activate(G,inp));
  inp.addEventListener('focus',()=>activate(G,inp));
  if(spec.type==='cells'){inp.addEventListener('click',()=>{if(inp.value){inp.value='';inp.dataset.v='';draw(G);}});}
  if(G.inputs.length===1||!G.active)activate(G,inp);
 }
 function curSpec(G){const e=G.inputs.find(x=>x.inp===G.active);return e?e.spec:G.inputs[0].spec;}
 function activate(G,inp){
  if(!G.inputs.some(x=>x.inp===inp))return;
  G.active=inp;G.inputs.forEach(x=>x.inp.classList.toggle('wqp-act',G.inputs.length>1&&x.inp===inp));draw(G);
 }
 function valueOf(G,spec){return spec.type==='cells'?G.inputs.map(x=>x.inp.value).join(''):G.active.value;}
 function draw(G){
  const spec=curSpec(G),inp=G.active||G.inputs[0].inp;
  if(!inp.isConnected){groups.delete(G);return;}
  G.dis=inp.disabled;
  const cellsMode=spec.type==='cells';
  const fixed=['digits','frac','expr','units'].includes(spec.type);
  let list;
  if(cellsMode){const a=String(spec.answer);list=tilesFor({type:'text',answer:(spec.hide||[]).map(i=>a[i]).join(''),decoy:2});}
  else if(fixed)list=fixedTiles(spec.type,spec);
  else list=tilesFor(spec);
  const disabled=inp.disabled,sentence=spec.type==='sentence';
  const used=cellsMode?usedFlags(list,valueOf(G,spec),false):(fixed?list.map(()=>false):usedFlags(list,inp.value,sentence));
  G.pad.innerHTML='';
  list.forEach((t,k)=>{
   const b=document.createElement('button');b.type='button';b.className='wqp-t'+(t.cls?' '+t.cls:'');b.textContent=t.label||t.v;b.disabled=disabled||used[k];
   b.setAttribute('aria-label',(t.label||t.v)+(sentence?'':'（點選）'));
   b.addEventListener('click',()=>{put(G,spec,t.v);pressed(b,W.fx);});
   G.pad.appendChild(b);
  });
  const back=document.createElement('button');back.type='button';back.className='wqp-t back wide';back.textContent='⌫ 退一格';back.disabled=disabled;back.setAttribute('aria-label','退一格');
  back.addEventListener('click',()=>{undo(G,spec);pressed(back,W.fx);});G.pad.appendChild(back);
 }
 function put(G,spec,v){
  const inp=G.active;if(!inp||inp.disabled)return;
  if(spec.type==='cells'){
   const c=G.inputs.map(x=>x.inp).find(x=>!x.value);if(!c)return;c.value=v;c.dataset.v=v;fire(c);
  }else if(spec.type==='sentence'){inp.value=(inp.value?inp.value+' ':'')+v;fire(inp);}
  else{const max=+inp.getAttribute('maxlength')||0;if(max&&inp.value.length>=max)return;inp.value+=v;fire(inp);}
  draw(G);
 }
 function undo(G,spec){
  const inp=G.active;if(!inp||inp.disabled)return;
  if(spec.type==='cells'){const cs=G.inputs.map(x=>x.inp).filter(x=>x.value);const c=cs[cs.length-1];if(c){c.value='';c.dataset.v='';}}
  else if(spec.type==='sentence'){inp.value=inp.value.trim().split(/\s+/).slice(0,-1).join(' ');fire(inp);}
  else{inp.value=[...inp.value].slice(0,-1).join('');fire(inp);}
  draw(G);
 }
 function mathSpec(inp){
  const id=inp.id||'',df=inp.dataset.field||'',fr=inp.dataset.frac||'',ph=inp.placeholder||'';
  if(id==='expression'||id==='c1-expression')return {type:'expr'};
  if(id==='c1-unit'||df==='unit')return {type:'units'};
  if(fr||id==='remainder'||id==='c1-remainder'||df==='remainder')return {type:'digits',dot:false};
  if(id==='answer-input'||id==='answer'||id==='c1-answer'||df==='value'||id==='ruler-guess'){
   if(/\//.test(ph)||/fraction/.test(inp.getAttribute('inputmode')||'')&&/分數|\//.test(ph))return {type:'frac'};
   return {type:'digits'};
  }
  return null;
 }
 let busy=false,queued=false;
 function scan(){
  if(busy)return;busy=true;
  try{
   groups.forEach(G=>{if(G.active&&G.active.isConnected&&G.active.disabled!==G.dis)draw(G);else if(!G.root.isConnected)groups.delete(G);});
   document.querySelectorAll('input:not([data-wqp]),textarea:not([data-wqp])').forEach(inp=>{
    if(inp.readOnly&&!inp.classList.contains('r37-cell'))return;
    const t=(inp.getAttribute('type')||'text').toLowerCase();if(!['text','number','search',''].includes(t)&&inp.tagName!=='TEXTAREA')return;
    let spec=null;
    for(const f of W.resolvers){try{spec=f(inp);}catch(_){spec=null;}if(spec)break;}
    if(!spec)spec=mathSpec(inp);
    if(spec)mount(inp,spec);
   });
  }finally{busy=false;}
 }
 function schedule(){if(queued)return;queued=true;(window.requestAnimationFrame||setTimeout)(()=>{queued=false;scan();});}
 function start(){
  const st=document.createElement('style');st.id='wqp-css';st.textContent=css;(document.head||document.documentElement).appendChild(st);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  scan();
 }
 W.scan=scan;W.tilesFor=tilesFor;
 window.WQPad=W;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
