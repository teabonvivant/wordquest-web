/* ===== R3.10 s50: dictation upload (#range-new) - fewer steps, word-length filter, auto recognise, fixed action bar =====
 * R3.12: two steps only. Step 2 saves directly (the old step 3 and its 我已對照原稿 tick are gone); needs-review items are a hint,
 * never a gate; duplicates fold silently; over 120 asks once; the success card replaces the range-list landing.
 * Runs inside the host closure after the p40 layer. p40 lives in its own IIFE, so its step is driven through its own
 * buttons (#p40-next1, #p40-back2) and read from #import-v20[data-p40-step]. */
const S50_LENS=[[0,'不限'],[3,'3+'],[4,'4+'],[5,'5+']];
const S50_DEFAULT={minLen:3,basic:true};
let s50Prefs=null,s50PrefsKey='',s50SkipOpen=false,s50BusyAuto=false;
let s50Saved=null,s50Over=false,s50Review=null;   // R3.12: success card / over-120 prompt / one-by-one review state
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
const s50Today=()=>{try{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t).value;return `${g('year')}-${g('month')}-${g('day')}`;}catch(_){return '';}};
/* What 儲存 will store: the selected cards, usable English only, the same word once (the copy that has a Chinese meaning wins). Never blocks. */
const s50Usable=c=>validEnglish(c.en)&&String(c.zh||'').length<=300;
function s50SaveList(){
 const out=[],at=new Map();
 for(const c of v20Selected()){
  if(!s50Usable(c))continue;
  const k=V20.fold(c.en);
  if(!at.has(k)){at.set(k,out.length);out.push(c);}
  else if(!out[at.get(k)].zh&&c.zh)out[at.get(k)]=c;
 }
 return out;
}

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
  ${pend.length?`<button type="button" class="btn quiet s50-accept" data-s50="accept">全部接受 (${pend.length})</button>`:''}
  <details class="s50-more"><summary>⋯ 更多</summary><div class="s50-menu">
   <button type="button" class="btn quiet" data-imp="filter" data-value="${v20.filter==='review'?'all':'review'}">${v20.filter==='review'?'顯示全部':`只看要核對的（${pend.length}）`}</button>
   <button type="button" class="btn quiet" data-imp="merge-mode" aria-pressed="${v20.mergeMode}">${v20.mergeMode?'取消合併':'合併字詞'}</button>
   <button type="button" class="btn quiet" data-imp="undo" ${v20.history.length?'':'disabled'}>復原</button>
   <button type="button" class="btn quiet" data-imp="edit-common">編輯基本字</button>
  </div></details>
 </div>
 ${v20.mergeMode?`<p class="s50-note">${v20.mergeStart?'再按同一行的最後一個字。':'按同一行的第一個字，再按最後一個字。'}</p>`:''}
 <div class="v20-grid s50-grid ${sentences?'sentences':''}">${subset.map(c=>v20Card(c,known)).join('')||'<p class="small muted s50-none">沒有符合的字。試試調低字母數。</p>'}</div>
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
 const list=s50SaveList(),n=list.length,pend=v20Pending();
 const raw=v20.items.filter(c=>!c.s50?.dup).length;
 if(s50Over&&n<=120)s50Over=false;
 const cnt=$('#v20-selected-count');
 if(cnt)cnt.textContent=`已選 ${n} 個`;
 const sm=$('#v20-pending-count');
 if(sm)sm.textContent='';
 /* the one primary button: it saves. It is never dead; 先揀字 answers with a nudge, a busy photo says so in its own label */
 const nx=$('#v20-confirm-next');
 if(nx){
  const busy=!!(ocrBusy||v20FileLoading);
  nx.disabled=busy;
  nx.textContent=busy?'辨認中…':v20.rawDirty?'先整理文字':n?`✓ 儲存 ${n} 個字`:'先揀字';
  nx.dataset.s50State=n?'ready':'empty';
 }
 const rb=$('#s50-review');
 if(rb){rb.hidden=!pend.length;rb.textContent=`逐個核對 (${pend.length})`;}
 const dock=$('#v20-import-dock');
 if(dock){
  dock.dataset.s50Over=s50Over?'1':'0';
  const ov=$('#s50-over');
  if(ov){ov.hidden=!s50Over;const t=ov.querySelector('[data-s50="save120"]');if(t)t.textContent='儲存前 120 個';}
 }
 const msg=$('#v20-message');
 if(msg&&v20.items.length&&!v20.rawDirty)msg.textContent=`共 ${raw} 項，已選 ${n} 個`;
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
/* there is no step 3: nothing renders a summary (the host function stays callable for older code paths and does nothing here) */
v20RenderSummary=function(){};

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
   v20.items.forEach(c=>{if(s50Shown(c)&&!(on&&c.s50&&c.s50.root&&!c.selected))c.selected=on;});   // s56: a same-family card is not swept in by 全選
   v20.message='';
   v20RenderWords();
  }
  else if(a==='addback'){
   const c=v20.items.find(x=>x.id===b.dataset.id);
   if(c){v20History();v20Touch();c.selected=true;v20RenderWords();}
  }
  else if(a==='accept'){
   v20History();v20Touch();
   v20Pending().forEach(c=>{c.reviewed=true;});
   v20.message='';
   v20RenderWords();
  }
  else if(a==='review')s50StartReview();
  else if(a==='save120'){s50Over=false;s50Commit(s50SaveList().slice(0,120));}
  else if(a==='over-back'){s50Over=false;s50FixLabels();}
  else if(a==='practice')s50Practice();
  else if(a==='again'){s50Saved=null;render();}
 }catch(err){try{console.warn('s50',err);}catch(_){}}
});
document.addEventListener('toggle',e=>{
 const d=e.target;
 if(d&&d.classList&&d.classList.contains('s50-skipped'))s50SkipOpen=d.open;
},true);

/* ---- R3.12 save: one press on step 2 ---- */
function s50Nudge(){
 const g=$('#word-editor .s50-grid')||$('#word-editor');
 if(!g)return;
 try{g.scrollIntoView({block:'nearest'});}catch(_){}
 g.classList.remove('s50-flash');void g.offsetWidth;g.classList.add('s50-flash');
 setTimeout(()=>g.classList.remove('s50-flash'),1500);
 const m=$('#v20-message');if(m)m.textContent='先點選要練的字。';
}
function s50TrySave(){
 if(v20.saving)return;
 if(v20.rawDirty){toast('原文改了，請先按「整理成可選字詞」。','bad');$('#p40-back2')?.click();return;}
 if(ocrBusy||v20FileLoading)return;
 const list=s50SaveList();
 if(!list.length){s50Nudge();return;}
 if(list.length>120){s50Over=true;s50FixLabels();return;}
 s50Commit(list);
}
function s50Commit(list){
 if(v20.saving||!list.length)return;
 captureImportDraft();
 const c=activeChild();
 if(!c||v20Origin&&v20Origin!==v20Owner()){toast('孩子或帳戶已切換，請重新匯入。','bad');return;}
 const title=(importDraft.title||'').trim()||'英文默書';
 if(title.length>120){toast('名稱請用 120 字以內。','bad');$('#range-title')?.focus();return;}
 let date=String(importDraft.date||'');
 if(date){try{WQEducation.validDate(date);}catch(_){date='';}}
 const dropped=v20Selected().length-list.length;
 const before=structuredClone(db);
 v20.saving=true;
 try{
  const r={id:uid('r'),childId:c.id,title,dictationDate:date,createdAt:new Date().toISOString()};
  db.ranges.push(r);
  for(const x of list){
   const meta=V20.gloss(x.en,v20Dictionary);
   const sources=[{original:x.originalText.slice(0,240),context:x.sourceText.slice(0,500),region:x.sourceRegionId,boxes:x.sourceBoxes},...(x.moreSources||[]).map(s=>({original:s.text.slice(0,240),context:s.sourceText.slice(0,500),region:s.regionId,boxes:s.boxes}))].slice(0,10);
   db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en:x.en,zh:x.zh,kind:x.kind,example:meta.choices.length===1&&meta.zh===x.zh?meta.example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null,importEvidence:v20ValidateEvidence({mode:v20.mode,checked:true,sources})});
  }
  c.activeRangeId=r.id;db.session=null;
  if(!save()){db=before;toast('儲存失敗。選好的字和草稿還在，請先備份再試。','bad');return;}
  const wasLogged=isLoggedIn();
  clearImportDraft();
  mediaSelectedRange=r.id;mediaMessage='已加入你選定的默書內容。請核對圖片及準備讀音。';
  s50Saved={rid:r.id,n:list.length,title,dropped,trial:!wasLogged};
  s50Over=false;s50Review=null;
  render();
 }catch(e){
  db=before;
  toast('儲存失敗。原有教材沒有改動，草稿還在，請再試一次。','bad');
 }finally{v20.saving=false;}
}
/* every route into saving ends here: the host's save-range button, the old 確認加入 and the dock all mean the same thing */
saveRange=function(){return s50TrySave();};
v20Summary=function(){return s50TrySave();};
function s50Practice(){
 v23ParentUntil=0;
 s50Saved=null;
 startDaily();
 const rt=(location.hash||'#kid').slice(1).split('?')[0];
 if(['ranges','range-new'].includes(rt))go('kid');
}

/* ---- R3.12 review: only when asked, one card after another; saving an edit counts as checked ---- */
function s50StartReview(){
 const list=v20Pending();
 if(!list.length)return;
 s50Review={total:list.length,done:0,seen:new Set(),opening:true};
 v20Edit(list[0].id);
}
const s50PriorEdit=v20Edit;
v20Edit=function(id){
 const mine=!!(s50Review&&s50Review.opening);
 if(s50Review)s50Review.opening=false;
 if(!mine)s50Review=null;
 const r=s50PriorEdit.apply(this,arguments);
 try{
  const d=$('#v20-edit-dialog');
  if(d){
   const tick=d.querySelector('.v20-check');if(tick)tick.style.display='none';    // the per-card tick is gone: 保留修改 means checked
   if(s50Review){
    s50Review.seen.add(id);
    const h=d.querySelector('.v20-dialog-head h2');
    if(h)h.textContent=`核對 ${Math.min(s50Review.done+1,s50Review.total)} / ${s50Review.total}`;
    const sv=d.querySelector('[data-imp="save-edit"]');
    if(sv)sv.textContent=s50Review.done+1>=s50Review.total?'✓ 完成':'✓ 下一個';
   }
   else{const sv=d.querySelector('[data-imp="save-edit"]');if(sv)sv.textContent='✓ 保留';}
  }
 }catch(_){}
 return r;
};
const s50PriorSaveEdit=v20SaveEdit;
v20SaveEdit=function(id){
 const chk=$('#v20-item-checked');if(chk)chk.checked=true;
 const r=s50PriorSaveEdit.apply(this,arguments);
 try{
  const dlg=$('#v20-edit-dialog');
  if(s50Review&&!(dlg&&dlg.open)){
   s50Review.done++;
   const next=v20Pending().find(c=>!s50Review.seen.has(c.id));
   if(next){s50Review.opening=true;v20Edit(next.id);}
   else s50Review=null;
  }
 }catch(_){}
 return r;
};

/* starting a new import (or a discarded draft) retires the success card; s50Commit sets it after its own clear */
const s50PriorClear=clearImportDraft;
clearImportDraft=function(){s50Saved=null;s50Over=false;s50Review=null;return s50PriorClear.apply(this,arguments);};

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

/* ---- page: tidy both steps after every render of #range-new ---- */
function s50FixSteps(){
 const nav=document.querySelector('#import-v20 #p40-steps');
 if(!nav)return;
 const lis=nav.querySelectorAll(':scope>li');
 if(lis.length>2)lis[2].remove();
 const nm=nav.querySelector(':scope>li:nth-child(2) .p40-name');
 if(nm&&nm.textContent!=='檢查並儲存')nm.textContent='檢查並儲存';
 nav.setAttribute('aria-label','加入範圍的兩個步驟');
}
/* the name and the date live on step 2 (one small row) next to the button that saves; a date defaults to today */
function s50Meta(root){
 let meta=root.querySelector('#s50-meta');
 if(!meta){
  const t=root.querySelector('#range-title')?.closest('.v20-field'),d=root.querySelector('#range-date')?.closest('.v20-field'),sel=root.querySelector('.v20-selection');
  if(t&&d&&sel){
   meta=document.createElement('div');meta.id='s50-meta';meta.className='s50-meta';
   meta.append(t,d);
   const head=sel.querySelector(':scope>.row.between');
   if(head)head.after(meta);else sel.prepend(meta);
   root.querySelector('.v20-source .form-grid')?.remove();
  }
 }
 const tl=root.querySelector('label[for="range-title"]');if(tl&&tl.textContent!=='名稱')tl.textContent='名稱';
 const dl=root.querySelector('label[for="range-date"]');if(dl&&dl.textContent!=='日期')dl.textContent='日期';
}
function s50SeedDate(){
 if(v20.s50Seeded||s50Step()!==2||!v20.items.length)return;
 v20.s50Seeded=true;
 if(!importDraft.date){
  importDraft.date=s50Today();
  const d=$('#range-date');if(d&&!d.value)d.value=importDraft.date;
 }
}
function s50Dock(root){
 const dock=root.querySelector('#v20-import-dock');
 if(!dock||dock.dataset.s50)return;
 dock.dataset.s50='1';
 const inner=dock.querySelector('.inner'),save=dock.querySelector('#v20-confirm-next');
 if(inner&&save&&!dock.querySelector('#s50-review')){
  const rb=document.createElement('button');
  rb.type='button';rb.id='s50-review';rb.className='btn quiet s50-review';rb.dataset.s50='review';rb.hidden=true;rb.textContent='逐個核對';
  save.before(rb);
  const ov=document.createElement('div');
  ov.id='s50-over';ov.className='s50-over';ov.hidden=true;ov.setAttribute('role','alert');
  ov.innerHTML='<span>只儲存前 120 個？</span><button type="button" class="btn quiet" data-s50="over-back">返回</button><button type="button" class="btn primary" data-s50="save120">儲存前 120 個</button>';
  inner.before(ov);
 }
}
function s50SavedCard(root){
 let card=root.querySelector('#s50-saved');
 if(!s50Saved){card?.remove();delete root.dataset.s50Saved;return;}
 root.dataset.s50Saved='1';
 if(card)return;
 card=document.createElement('section');
 card.id='s50-saved';card.className='card s50-saved';card.setAttribute('role','status');
 card.innerHTML=`<div class="s50-saved-mark" aria-hidden="true">✓</div><h2>已儲存 ${s50Saved.n} 個字</h2>${s50Saved.trial?'<p class="small muted">試玩範圍，離開後不會儲存。</p>':''}${s50Saved.dropped>0?`<p class="small muted">另有 ${s50Saved.dropped} 項格式不對，沒有儲存。</p>`:''}<div class="s50-saved-btns"><button type="button" class="btn primary big" data-s50="practice">開始練習</button><button type="button" class="btn secondary big" data-s50="again">再上傳</button></div>`;
 (root.querySelector('#p40-steps')||root.firstElementChild).after(card);
}
function s50Enhance(){
 const root=s50Root();if(!root)return;
 root.dataset.s50='1';
 root.dataset.s50Items=v20.items.length?'1':'0';
 const t=root.querySelector('#v20-text-details');
 if(t&&!t.dataset.s50&&!(importDraft.raw||'').trim()&&!v20.items.length){t.dataset.s50='1';t.removeAttribute('open');}
 const fn=root.querySelector('#ocr-file-name');if(fn)fn.hidden=!v20Photo;
 root.querySelector('.s50-priv')?.remove();
 const tips=root.querySelector('#p40-tips');
 if(tips&&!tips.dataset.s50){tips.dataset.s50='1';tips.innerHTML='<span>光線夠亮、紙放平。相片不上傳。</span>';}
 s50Meta(root);
 s50Dock(root);
 const nav=root.querySelector('#p40-steps');
 if(nav&&!nav._s50Obs){nav._s50Obs=new MutationObserver(s50FixSteps);nav._s50Obs.observe(nav,{childList:true});}
 s50FixSteps();
 s50SeedDate();
 s50SavedCard(root);
 s50FixLabels();
 if(!root._s50Obs){
  const sc=()=>{const body=root.closest('.r37-legbody');if(body)body.scrollTop=0;s50SeedDate();s50FixLabels();};
  root._s50Obs=new MutationObserver(sc);root._s50Obs.observe(root,{attributes:true,attributeFilter:['data-p40-step']});
 }
}
const s50PriorRender=render;
render=function(){
 if((location.hash||'#kid').slice(1).split('?')[0]!=='range-new')s50Saved=null;
 const r=s50PriorRender.apply(this,arguments);
 try{if(lastRoute==='range-new')s50Enhance();}catch(e){try{console.warn('s50',e);}catch(_){}}
 return r;
};
