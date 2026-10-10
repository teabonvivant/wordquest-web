/* ===== R3.10 s50: dictation upload (#range-new) - fewer steps, word-length filter, auto recognise, fixed action bar =====
 * Runs inside the host closure after the p40 layer. p40 lives in its own IIFE, so its step is driven through its own
 * buttons (#p40-next1, #v20-confirm-next, #p40-back2) and read from #import-v20[data-p40-step]. */
const S50_LENS=[[0,'不限'],[3,'3+'],[4,'4+'],[5,'5+']];
const S50_DEFAULT={minLen:3,basic:true};
let s50Prefs=null,s50PrefsKey='',s50SkipOpen=false,s50BusyAuto=false;
function s50Key(){let id='';try{id=String(accountId()||'');}catch(_){}return 'wq50-dict-prefs:'+(id||'guest');}
function s50GetPrefs(){
 const k=s50Key();
 if(s50Prefs&&s50PrefsKey===k)return s50Prefs;
 let p={...S50_DEFAULT};
 try{const o=JSON.parse(localStorage.getItem(k)||'null');if(o&&typeof o==='object'){if([0,3,4,5].includes(o.minLen))p.minLen=o.minLen;if(typeof o.basic==='boolean')p.basic=o.basic;}}catch(_){}
 s50Prefs=p;s50PrefsKey=k;return p;
}
function s50SetPrefs(patch){const p=Object.assign(s50GetPrefs(),patch);try{localStorage.setItem(s50Key(),JSON.stringify(p));}catch(_){}return p;}
const s50Letters=en=>(String(en||'').match(/[A-Za-z]/g)||[]).length;
const s50Eligible=c=>!c.excludedReason&&c.kind!=='sentence'&&!/\s/.test(String(c.en||''));
const s50HostExcluded=c=>!!c.excludedReason&&!c.selected;
const s50Root=()=>$('#import-v20');
const s50Step=()=>Number(s50Root()?.dataset.p40Step||1);

/* Recompute which items the filter keeps. Hand-made choices (a change that this function did not make) always win. */
function s50Apply(){
 const P=s50GetPrefs();
 const groups=new Map();
 for(const c of v20.items){
  let m=c.s50;
  if(!m||typeof m!=='object'){m=c.s50={base:!!c.selected,sel:!!c.selected,manual:false,skip:false,dup:false};}
  else if(!!c.selected!==m.sel){m.manual=true;m.base=!!c.selected;}
  m.skip=false;
  if(!m.manual&&m.base&&s50Eligible(c)){
   const short=P.minLen>0&&s50Letters(c.en)<P.minLen;
   const key=V20.fold(c.en);
   /* the built-in basic list also holds in / on / an / is: those short ones belong to the length pills, so 不限 keeps them */
   const basic=P.basic&&v20.common.has(key)&&!(V20.COMMON.has(key)&&s50Letters(c.en)<3);
   m.skip=short||basic;
  }
  const want=m.skip?false:m.base;
  if(!s50HostExcluded(c)||want){
   const key=V20.fold(c.en)+'\u0000'+(c.zh||'');
   (groups.get(key)||groups.set(key,[]).get(key)).push([c,want]);
  }
  m.dup=false;
  c.selected=want;
  m.sel=want;
 }
 /* identical words: one card, one selected entry (the first one the parent chose by hand, else the first) */
 for(const g of groups.values()){
  if(g.length<2)continue;
  let rep=g.find(([c,w])=>c.s50.manual&&w)||g[0];
  for(const [c] of g){
   if(c===rep[0])continue;
   c.s50.dup=true;c.s50.skip=false;c.selected=false;c.s50.sel=false;
  }
 }
}
const s50Shown=c=>!c.s50?.dup&&!c.s50?.skip&&!s50HostExcluded(c);
function s50ChipLine(list){
 const words=[...new Set(list.map(c=>c.en))];
 return words.slice(0,3).join('、')+(words.length>3?'…':'');
}
function s50RenderEditor(){
 const box=$('#word-editor');if(!box||!v20.items.length)return;
 const P=s50GetPrefs(),known=v20KnownWords();
 const pend=v20Pending();
 const shown=v20.items.filter(s50Shown);
 const view=shown.filter(c=>v20.filter==='review'?V20.pending(c):v20.filter==='unselected'?!c.selected:true);
 const subset=view.slice(0,v20.showLimit);
 const skipped=v20.items.filter(c=>c.s50&&c.s50.skip&&!c.s50.dup);
 const excluded=v20.items.filter(s50HostExcluded);
 const nSkip=skipped.length+excluded.length;
 const sentences=v20.mode==='sentences'||(shown.length>0&&shown.every(c=>c.kind==='sentence'));
 const seg=S50_LENS.map(([v,t])=>`<button type="button" data-s50="len" data-v="${v}" aria-pressed="${P.minLen===v}">${t}</button>`).join('');
 const chips=skipped.map(c=>`<button type="button" class="s50-chip" data-s50="addback" data-id="${esc(c.id)}" aria-label="加回 ${esc(c.en)}"><span aria-hidden="true">＋</span><span lang="en-GB">${esc(c.en)}</span></button>`).join('')
  +excluded.map(c=>`<button type="button" class="s50-chip s50-chip-odd" data-imp="restore" data-id="${esc(c.id)}" title="${esc(c.excludedReason)}" aria-label="加回 ${esc(c.en)}（${esc(c.excludedReason)}）"><span aria-hidden="true">＋</span><span lang="en-GB">${esc(c.en.length>24?c.en.slice(0,23)+'…':c.en)}</span></button>`).join('');
 box.innerHTML=`<div class="s50-filters">
  <div class="s50-row"><span class="s50-lab" id="s50-lab">字母數</span><div class="s50-seg" role="group" aria-labelledby="s50-lab">${seg}</div></div>
  <button type="button" class="s50-sw" role="switch" aria-checked="${P.basic}" data-s50="basic"><span class="s50-knob" aria-hidden="true"></span><span>略過基本字<small>（the、and、you…）</small></span></button>
 </div>
 <div class="s50-tools">
  <button type="button" class="btn quiet" data-s50="all">全選</button><button type="button" class="btn quiet" data-s50="none">全不選</button>
  <details class="s50-more"><summary>⋯ 更多</summary><div class="s50-menu">
   <button type="button" class="btn quiet" data-imp="filter" data-value="${v20.filter==='review'?'all':'review'}">${v20.filter==='review'?'顯示全部':`只看要核對的（${pend.length}）`}</button>
   <button type="button" class="btn quiet" data-imp="merge-mode" aria-pressed="${v20.mergeMode}">${v20.mergeMode?'取消合併':'合併字詞'}</button>
   <button type="button" class="btn quiet" data-imp="undo" ${v20.history.length?'':'disabled'}>復原</button>
   <button type="button" class="btn quiet" data-imp="edit-common">編輯基本字</button>
  </div></details>
 </div>
 ${v20.mergeMode?`<p class="s50-note">${v20.mergeStart?'再按同一行的最後一個字。':'按同一行的第一個字，再按最後一個字。'}</p>`:''}
 <div class="v20-grid s50-grid ${sentences?'sentences':''}">${subset.map(c=>v20Card(c,known)).join('')||'<p class="small muted s50-none">沒有符合的字。可以把「字母數」調低，或看下面「已略過」。</p>'}</div>
 ${view.length>subset.length?`<button class="btn secondary full" data-imp="more">再顯示 ${Math.min(120,view.length-subset.length)} 個</button>`:''}
 ${nSkip?`<details class="s50-skipped" ${s50SkipOpen?'open':''}><summary><span>已略過 ${nSkip} 個</span><small>（${esc(s50ChipLine([...skipped,...excluded]))}）</small></summary><div class="s50-chips">${chips}</div></details>`:''}`;
}
function s50ShrinkLong(){
 document.querySelectorAll('#word-editor .s50-grid:not(.sentences) .v20-token strong').forEach(e=>{
  const n=e.textContent.length;
  e.dataset.len=n>=12?'xl':n>=9?'l':'';
 });
}
function s50FixLabels(){
 const n=v20Selected().length,pend=v20Pending();
 const raw=v20.items.filter(c=>!c.s50?.dup).length;
 const cnt=$('#v20-selected-count');
 if(cnt)cnt.textContent=`已選 ${n} 個`;
 const sm=$('#v20-pending-count');
 if(sm){
  if(n>120)sm.textContent='最多 120 個，請取消一些';
  else if(pend.length)sm.innerHTML=`<button type="button" class="s50-linkbtn" data-imp="filter" data-value="${v20.filter==='review'?'all':'review'}">${v20.filter==='review'?'顯示全部':pend.length+' 項要核對 ›'}</button>`;
  else sm.textContent=n?'':'請先選字';
 }
 const nx=$('#v20-confirm-next');
 if(nx)nx.textContent='下一步 →';
 const msg=$('#v20-message');
 if(msg&&v20.items.length&&!v20.rawDirty){
  const skipped=v20.items.filter(c=>c.s50?.skip&&!c.s50?.dup||s50HostExcluded(c)).length;
  msg.textContent=`找到 ${raw} 項，先選了 ${n} 個${skipped?`，略過 ${skipped} 個`:''}。`;
 }
 const root=s50Root();
 if(root)root.dataset.s50Items=v20.items.length?'1':'0';
}
const s50PriorRW=v20RenderWords;
v20RenderWords=function(){
 try{s50Apply();}catch(e){try{console.warn('s50',e);}catch(_){}}
 const r=s50PriorRW.apply(this,arguments);
 try{s50RenderEditor();s50ShrinkLong();s50FixLabels();}catch(e){try{console.warn('s50',e);}catch(_){}}
 return r;
};
v20Info=function(c){
 if(V20.pending(c))return '請核對';
 if(c.reviewed)return '已核對';
 if(c.excludedReason)return '未加入';
 return c.kind==='phrase'?'詞組':'';
};
/* step 3: the summary keeps its list and the one required tick; the explanations go */
const s50PriorSummary=v20RenderSummary;
v20RenderSummary=function(){
 const r=s50PriorSummary.apply(this,arguments);
 try{
  const box=$('#v20-summary-content');
  if(box){
   box.querySelectorAll(':scope>p.small.muted').forEach(p=>p.remove());
   const lab=box.querySelector('.v20-summary-check');
   if(lab&&lab.lastChild&&lab.lastChild.nodeType===3)lab.lastChild.textContent='我已對照原稿，確認無誤';
  }
  const save=$('#v20-save-range');
  if(save)save.textContent='儲存範圍';
  /* the reason a disabled 儲存 gives travels with the fixed bar */
  const bar=$('#v20-summary .p40-bar'),why=$('#p40-why3');
  if(bar&&why&&why.parentNode!==bar)bar.prepend(why);
 }catch(e){}
 return r;
};

/* ---- choices: length pills, basic-words switch, select all / none, add back ---- */
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-s50]');
 if(!b||b.disabled)return;
 const a=b.dataset.s50;
 try{
  if(a==='len'){s50SetPrefs({minLen:Number(b.dataset.v)});v20RenderWords();}
  else if(a==='basic'){s50SetPrefs({basic:!s50GetPrefs().basic});v20RenderWords();}
  else if(a==='all'||a==='none'){
   const on=a==='all';
   v20History();v20Touch();
   v20.items.forEach(c=>{if(s50Shown(c))c.selected=on;});
   v20.message='';
   v20RenderWords();
  }
  else if(a==='addback'){
   const c=v20.items.find(x=>x.id===b.dataset.id);
   if(c){v20History();v20Touch();c.selected=true;v20RenderWords();}
  }
 }catch(err){try{console.warn('s50',err);}catch(_){}}
});
document.addEventListener('toggle',e=>{
 const d=e.target;
 if(d&&d.classList&&d.classList.contains('s50-skipped'))s50SkipOpen=d.open;
},true);

const s50PriorPhoto=updateImportPhoto;
updateImportPhoto=function(){
 const r=s50PriorPhoto.apply(this,arguments);
 const n=$('#ocr-file-name');if(n)n.hidden=!v20Photo;
 return r;
};

/* ---- photo: recognise as soon as a picture is chosen (or cropped) ---- */
function s50AutoRun(){
 if(!v20Photo||ocrBusy||v20FileLoading||lastRoute!=='range-new'||v20.rawDirty)return;
 const keep=window.confirm;
 window.confirm=()=>true;           // runOCR asks once before adding to an existing list; here the parent just picked a photo
 try{return runOCR();}finally{window.confirm=keep;}
}
const s50PriorSetFile=setOcrFile;
setOcrFile=async function(){
 const r=await s50PriorSetFile.apply(this,arguments);
 try{if(v20Photo&&!v20FileLoading)s50AutoRun();}catch(e){}
 return r;
};
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-imp="crop-done"]');
 if(!b)return;
 setTimeout(()=>{try{if(!$('#v20-crop')?.open)s50AutoRun();}catch(_){}},60);
});

/* ---- page: tidy the first step after every render of #range-new ---- */
function s50Enhance(){
 const root=s50Root();if(!root)return;
 root.dataset.s50='1';
 root.dataset.s50Items=v20.items.length?'1':'0';
 const t=root.querySelector('#v20-text-details');
 if(t&&!t.dataset.s50&&!(importDraft.raw||'').trim()&&!v20.items.length){t.dataset.s50='1';t.removeAttribute('open');}
 const dl=root.querySelector('label[for="range-date"]');if(dl&&dl.textContent!=='日期（可不填）')dl.textContent='日期（可不填）';
 const fn=root.querySelector('#ocr-file-name');if(fn)fn.hidden=!v20Photo;
 if(!root.querySelector('.s50-priv')){
  const p=document.createElement('p');p.className='s50-priv';p.textContent='相片只在這部裝置處理，不會上傳。請先裁走姓名、校名。';
  root.querySelector('.v20-source')?.append(p);
 }
 const tips=root.querySelector('#p40-tips');
 if(tips&&!tips.dataset.s50){tips.dataset.s50='1';tips.innerHTML='<span>光線夠亮、紙放平、一次拍一欄。</span>';}
 if(!root._s50Obs){
  const sc=()=>{const body=root.closest('.r37-legbody');if(body)body.scrollTop=0;};
  root._s50Obs=new MutationObserver(sc);root._s50Obs.observe(root,{attributes:true,attributeFilter:['data-p40-step']});
 }
}
const s50PriorRender=render;
render=function(){
 const r=s50PriorRender.apply(this,arguments);
 try{if(lastRoute==='range-new')s50Enhance();}catch(e){try{console.warn('s50',e);}catch(_){}}
 return r;
};
