/* ===== R3.10 s50: dictation upload (#range-new) - fewer steps, word-length filter, auto recognise, fixed action bar =====
 * R3.12: two steps only. Step 2 saves directly (the old step 3 and its 我已對照原稿 tick are gone); needs-review items are a hint,
 * never a gate; duplicates fold silently; over 120 asks once; the success card replaces the range-list landing.
 * Runs inside the host closure after the p40 layer. p40 lives in its own IIFE, so its step is driven through its own
 * buttons (#p40-next1, #p40-back2) and read from #import-v20[data-p40-step]. */
const S50_LENS=[[0,'不限'],[3,'3+'],[4,'4+'],[5,'5+']];
const S50_DEFAULT={minLen:3,basic:true};
let s50Prefs=null,s50PrefsKey='',s50SkipOpen=false,s50BusyAuto=false;
let s50Saved=null,s50Over=false,s50Review=null;   // R3.12: success card / over-120 prompt / one-by-one review state
let s50AuthOpen=false,s50AuthArmed=false,s50Hold=0,s50Pend=null;   // R3.15: visitor card open / login page opened from it / sign-in in flight / one deferred save
function s50Key(){let id='';try{id=String(accountId()||'');}catch(_){}return 'wq50-dict-prefs:'+(id||'guest');}
function s50Stored(){
 const k=s50Key();
 if(s50Prefs&&s50PrefsKey===k)return s50Prefs;
 let p={...S50_DEFAULT};
 try{const o=JSON.parse(localStorage.getItem(k)||'null');if(o&&typeof o==='object'){if([0,3,4,5].includes(o.minLen))p.minLen=o.minLen;if(typeof o.basic==='boolean')p.basic=o.basic;}}catch(_){}
 s50Prefs=p;s50PrefsKey=k;return p;
}
/* R3.13: a list (one item per line) shows 不限 and no basic-word skipping until the parent chooses otherwise in this import */
function s50IsListLayout(){
 const live=v20.items.filter(c=>!c.excludedReason&&!(c.s50&&c.s50.dup)&&c.kind!=='sentence');
 const n=live.filter(c=>c.s50x&&c.s50x.list).length;
 return n>=3&&n>=live.length*0.6;
}
function s50GetPrefs(){
 if(v20&&v20.s50Eff)return v20.s50Eff;
 if(v20&&v20.items&&s50IsListLayout())return {minLen:0,basic:false};
 return s50Stored();
}
function s50SetPrefs(patch){
 const eff=Object.assign({},s50GetPrefs(),patch);
 if(v20)v20.s50Eff=eff;
 const p=Object.assign({},s50Stored(),patch);
 s50Prefs=p;
 try{localStorage.setItem(s50Key(),JSON.stringify(p));}catch(_){}
 return eff;
}
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
/* a selected card must be something 儲存 can store: clean it, else leave it un-selected and say why (never a silent drop at the end) */
function s50Sane(c){
 if(!c.selected||validEnglish(c.en))return;
 const t=s50Charset(c.en).replace(/^[^A-Za-z]+|[^A-Za-z.!?')]+$/g,'').trim();
 if(t&&validEnglish(t)){
  c.en=t;
  const g=V20.gloss(t,v20Dictionary);
  c.known=g.known;c.choices=g.choices;c.example=g.example;
  if(!c.zh)c.zh=g.zh;
  return;
 }
 c.selected=false;
 c.excludedReason=c.excludedReason||'英文格式不合，請核對';
}
function s50Apply(){
 const P=s50GetPrefs();
 const groups=new Map();
 for(const c of v20.items){
  try{s50Sane(c);}catch(_){}
  let m=c.s50;
  if(!m||typeof m!=='object'){m=c.s50={base:!!c.selected,sel:!!c.selected,manual:false,skip:false,dup:false};}
  else if(!!c.selected!==m.sel){m.manual=true;m.base=!!c.selected;}
  m.skip=false;
  if(!m.manual&&m.base&&s50Eligible(c)){
   const short=P.minLen>0&&s50Letters(c.en)<P.minLen;
   const key=V20.fold(c.en);
   /* the built-in basic list also holds in / on / an / is: those short ones belong to the length pills, so 不限 keeps them */
   const basic=P.basic&&v20.common.has(key)&&!(V20.COMMON.has(key)&&s50Letters(c.en)<3);
   /* R3.13: a word that sat on its own line of a list is an item of the teacher's list, not a word of a text: the pills do not cut it
    * until the parent touches them in this import */
   const exempt=!v20.s50Eff&&c.s50x&&c.s50x.list;
   m.skip=!exempt&&(short||basic);
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
 const words=[...new Set(list.map(c=>String(c.en).replace(/\s*[|｜]+\s*$/,'').trim()))];/* R3.29 A-23: a stray | at the end of a skipped line is not shown */
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
 const chips=skipped.map(c=>`<button type="button" class="s50-chip" data-s50="addback" data-id="${esc(c.id)}" aria-label="加回 ${esc(c.en)}"><span aria-hidden="true">＋</span><span lang="en-GB">${esc(String(c.en).replace(/\s*[|｜]+\s*$/,'').trim())}</span></button>`).join('')
  +excluded.map(c=>`<button type="button" class="s50-chip s50-chip-odd" data-imp="restore" data-id="${esc(c.id)}" title="${esc(c.excludedReason)}" aria-label="加回 ${esc(c.en)}（${esc(c.excludedReason)}）"><span aria-hidden="true">＋</span><span lang="en-GB">${esc(c.en.length>24?c.en.slice(0,23)+'…':c.en)}</span></button>`).join('');
 const poor=v20Photo&&s50OcrPoor();
 box.innerHTML=`${poor?`<div class="s50-retry s50-retry-2">${s50RetryHtml()}</div>`:''}<div class="s50-filters">
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
  const au=$('#s50-auth'),le=$('#s50-lease');
  if(au)au.hidden=!(s50AuthOpen&&!isLoggedIn());
  if(le)le.hidden=!(isLoggedIn()&&!v23HasLease());
 }
 const msg=$('#v20-message');
 if(msg&&v20.items.length&&!v20.rawDirty)msg.textContent=`共 ${raw} 項，已選 ${n} 個`;
 const root=s50Root();
 if(root)root.dataset.s50Items=v20.items.length?'1':'0';
}
const s50PriorRW=v20RenderWords;
v20RenderWords=function(){
 try{s50Normalise();}catch(e){try{console.warn('s50',e);}catch(_){}}
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
  else if(a==='retry-enh')s50Retry('enh');
  else if(a==='retry-crop')s50Retry('crop');
  else if(a==='practice')s50Practice();
  else if(a==='again'){s50Saved=null;render();}
  else if(a==='auth-login'||a==='auth-register')s50GoSignIn(a==='auth-register');
  else if(a==='auth-cancel'){s50AuthOpen=false;s50FixLabels();}
  else if(a==='auth-back'){s50AuthArmed=false;go('range-new');}
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
 s50Err('');
 if(v20.rawDirty){s50Err('原文改了，請先按「整理成可選字詞」。');$('#p40-back2')?.click();return;}
 if(ocrBusy||v20FileLoading)return;
 const list=s50SaveList();
 if(!list.length){s50Nudge();return;}
 if(!s50Gate())return;
 if(list.length>120){s50Over=true;s50FixLabels();return;}
 s50Commit(list);
}
function s50Commit(list){
 if(v20.saving||!list.length)return;
 if(!s50Gate())return;
 captureImportDraft();
 const c=activeChild();
 if(!c||v20Origin&&v20Origin!==v20Owner()){s50Err('孩子或帳戶已切換，請重新匯入。');return;}
 const title=(importDraft.title||'').trim()||'英文默書';
 if(title.length>120){s50Err('名稱請用 120 字以內。');$('#range-title')?.focus();return;}
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
  if(!save()||!s50Landed(r.id,list.length)){db=before;s50Err('儲存失敗，沒有寫入。選好的字和草稿還在，請先備份再試。');return;}
  clearImportDraft();
  mediaSelectedRange=r.id;mediaMessage='已加入你選定的默書內容。請核對圖片及準備讀音。';
  s50Saved={rid:r.id,n:list.length,title,dropped};
  s50Over=false;s50Review=null;s50Pend=null;
  render();
  if(!s50Root())toast(`已儲存 ${list.length} 個字。`);     // the parent unlock ran out in this very instant: the host drew its gate over the card
 }catch(e){
  db=before;
  s50Err('儲存失敗。原有教材沒有改動，草稿還在，請再試一次。');
 }finally{v20.saving=false;}
}
/* ===== R3.15 save landing: 儲存 never pretends =====================================================================
 * Three things must be true before anything is written, and each one that is missing is said where the parent is looking while the
 * draft stays: signed in (a visitor's save would vanish), the parent unlock (else the host swaps the page for its password screen
 * after the write) and the edit lease (another tab owns the account). A deferred save (s50Pend) runs once when the page is back. */
const S50_PEND_MS={lease:15000,parent:900000,auth:900000};
function s50Gate(){
 if(!isLoggedIn()){
  captureImportDraft();
  s50AuthOpen=true;s50Over=false;s50FixLabels();
  try{$('#s50-auth [data-s50="auth-login"]')?.focus({preventScroll:true});}catch(_){}
  return false;
 }
 if(!v23ParentAllowed()){
  captureImportDraft();                  // the inputs go away with the page: keep the name and the date
  s50Pend={kind:'parent',born:Date.now()};
  s50Over=false;
  render();                              // the host draws its parent password screen for #range-new; the list stays in memory
  return false;
 }
 if(!v23HasLease()){
  s50FixLabels();
  const le=$('#s50-lease');
  if(le){try{le.scrollIntoView({block:'nearest'});}catch(_){}le.classList.remove('s50-flash');void le.offsetWidth;le.classList.add('s50-flash');}
  return false;
 }
 return true;
}
/* the stored copy really holds the new range and all its words (a save() that said true is not taken on trust) */
function s50Landed(rid,n){
 try{
  const o=JSON.parse(localStorage.getItem(dbKey())||'null');
  return !!o&&o.ranges.some(x=>x.id===rid)&&o.words.filter(w=>w.rangeId===rid).length===n;
 }catch(_){return false;}
}
function s50GoSignIn(reg){
 captureImportDraft();
 s50AuthOpen=false;s50AuthArmed=true;
 go('login');
 if(reg)setTimeout(()=>{const c=$('#p10-register-card');if(c){try{c.scrollIntoView({block:'start'});}catch(_){}$('#register-name')?.focus({preventScroll:true});}},400);
}
/* sign in / register while the visitor's list is on the page: the list survives (the host's clearImportDraft is held off) and, when
 * the login page was opened from the 儲存 card, the save is made once afterwards */
async function s50AuthRun(fn,self,args){
 if(isLoggedIn()||!v20.items.length)return fn.apply(self,args);
 const auto=s50AuthArmed&&lastRoute==='login',was=accountId();
 s50Hold++;
 try{return await fn.apply(self,args);}
 finally{
  s50Hold--;
  try{if(isLoggedIn()&&accountId()!==was)s50AfterAuth(auto);}catch(e){try{console.warn('s50',e);}catch(_){}}
 }
}
function s50AfterAuth(auto){
 s50AuthOpen=false;s50AuthArmed=false;
 v20Origin=v20Owner();                    // the list now belongs to this account's child
 if(!auto)return;
 /* the password was just typed for this very save: that is the parent check (the host clears the unlock on every sign-in) */
 v23ParentOwner=v23Owner();v23ParentUntil=performance.now()+300000;
 s50Pend={kind:'auth',born:Date.now()};
 go('range-new');
}
const s50PriorLogin=loginAccount;
loginAccount=async function(){return s50AuthRun(s50PriorLogin,this,arguments);};
const s50PriorRegister=registerAccount;
registerAccount=async function(){return s50AuthRun(s50PriorRegister,this,arguments);};
/* 在這個分頁編輯 is the host's own button (data-v23="acquire"); pressing it also asks for the save to be made once the lease is ours */
window.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#s50-lease [data-v23="acquire"]');
 if(b&&lastRoute==='range-new')s50Pend={kind:'lease',born:Date.now()};
},true);
function s50Tick(){
 if(lastRoute!=='login')s50AuthArmed=false;
 if(lastRoute==='login'&&s50AuthArmed&&!$('#s50-auth-note')){
  const n=s50SaveList().length;
  const head=$('#app .p10-login-head')||$('#app').firstElementChild;
  if(head){
   const d=document.createElement('div');
   d.id='s50-auth-note';d.className='s50-auth-note';d.setAttribute('role','status');
   d.innerHTML=`<span>登入或建立帳戶後，會自動儲存剛才選好的 ${n} 個字。</span><button type="button" class="btn quiet" data-s50="auth-back">取消，返回選字</button>`;
   head.after(d);
  }
 }
 if(lastRoute!=='range-new'){s50AuthOpen=false;s50Pend=null;return;}
 if(!s50Pend)return;
 if(Date.now()-s50Pend.born>(S50_PEND_MS[s50Pend.kind]||60000)){s50Pend=null;return;}
 if(s50Pend.kind==='parent'){
  const pw=$('#v23-parent-password');
  if(pw&&!$('#s50-gate-note')){
   const p=document.createElement('p');
   p.id='s50-gate-note';p.className='small';p.setAttribute('role','status');
   p.textContent=`輸入後會自動儲存剛才選好的 ${s50SaveList().length} 個字。`;
   (pw.closest('section')?.querySelector('label')||pw).before(p);
  }
 }
 if(s50Pend.fired||!s50Root()||!isLoggedIn())return;       // the password screen (or the login page) is still showing: wait
 if(s50Step()!==2||!v20.items.length){s50Pend=null;return;}
 const mine=s50Pend;mine.fired=true;
 setTimeout(()=>{
  if(s50Pend!==mine)return;
  s50Pend=null;
  if(lastRoute==='range-new'&&s50Root())s50TrySave();
 },0);
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
clearImportDraft=function(){
 if(s50Hold>0)return;                  // R3.15: a visitor signing in keeps the list (the host clears the draft on every sign-in)
 s50Saved=null;s50Over=false;s50Review=null;s50AuthOpen=false;s50Pend=null;
 return s50PriorClear.apply(this,arguments);
};

const s50PriorPhoto=updateImportPhoto;
updateImportPhoto=function(){
 const r=s50PriorPhoto.apply(this,arguments);
 const n=$('#ocr-file-name');if(n)n.hidden=!v20Photo;
 return r;
};

/* ---- R3.34 photo: even out the light before recognition. A phone photo is darker on one side or in a corner (shadow of the hand,
 * a lamp); the OCR then drops whole columns. Each pixel is divided by the local paper brightness (block means of 8 px, 5x5 max,
 * 9x9 blur), so the paper turns white and the ink stays dark. ---- */
function s50EvenLight(canvas){
 const W=canvas.width,H=canvas.height,ctx=canvas.getContext('2d'),img=ctx.getImageData(0,0,W,H),d=img.data,B=8;
 const w=Math.ceil(W/B),h=Math.ceil(H/B),g=new Float32Array(W*H),m=new Float32Array(w*h),n=new Float32Array(w*h);
 for(let i=0,j=0;i<d.length;i+=4,j++)g[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=((y/B)|0)*w+((x/B)|0);m[k]+=g[y*W+x];n[k]++;}
 for(let k=0;k<m.length;k++)m[k]/=n[k];
 const pass=(src,r,f)=>{const o=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=f===Math.max?0:0,c=0;
  for(let dy=-r;dy<=r;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-r;dx<=r;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;const s=src[yy*w+xx];
   if(f===Math.max)v=Math.max(v,s);else{v+=s;c++;}}}o[y*w+x]=f===Math.max?v:v/c;}return o;};
 const bg=pass(pass(m,2,Math.max),4,null);
 for(let y=0;y<H;y++){const fy=Math.min(h-1,Math.max(0,(y+.5)/B-.5)),y0=fy|0,y1=Math.min(h-1,y0+1),ty=fy-y0;
  for(let x=0;x<W;x++){const fx=Math.min(w-1,Math.max(0,(x+.5)/B-.5)),x0=fx|0,x1=Math.min(w-1,x0+1),tx=fx-x0;
   const b=(bg[y0*w+x0]*(1-tx)+bg[y0*w+x1]*tx)*(1-ty)+(bg[y1*w+x0]*(1-tx)+bg[y1*w+x1]*tx)*ty;
   const v=Math.max(0,Math.min(255,g[y*W+x]/Math.max(b,1)*255)),i=(y*W+x)*4;d[i]=d[i+1]=d[i+2]=v;}}
 ctx.putImageData(img,0,0);
 return canvas;
}
{const s50PriorProcess=v20ProcessPhoto;v20ProcessPhoto=function(){const c=s50PriorProcess.apply(this,arguments);try{s50EvenLight(c);}catch(_){}return c;};}

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
  /* R3.15: what is missing before a save can land - a sign-in (visitor) or the edit lease (a second tab) */
  const au=document.createElement('div');
  au.id='s50-auth';au.className='s50-gate';au.hidden=true;au.setAttribute('role','alert');
  au.innerHTML='<strong>先登入才可儲存</strong><span>選好的字會保留，登入後自動儲存。</span><div class="s50-gate-btns"><button type="button" class="btn quiet" data-s50="auth-cancel">取消</button><button type="button" class="btn secondary" data-s50="auth-register">建立帳戶</button><button type="button" class="btn primary" data-s50="auth-login">登入</button></div>';
  const le=document.createElement('div');
  le.id='s50-lease';le.className='s50-gate';le.hidden=true;le.setAttribute('role','alert');
  le.innerHTML='<strong>這個分頁暫時不能儲存</strong><span>另一個分頁正在編輯這個帳戶。選好的字會保留。</span><div class="s50-gate-btns"><button type="button" class="btn primary" data-v23="acquire">在這個分頁編輯</button></div>';
  inner.before(au,le);
 }
}
function s50SavedCard(root){
 let card=root.querySelector('#s50-saved');
 if(!s50Saved){card?.remove();delete root.dataset.s50Saved;return;}
 root.dataset.s50Saved='1';
 if(card)return;
 card=document.createElement('section');
 card.id='s50-saved';card.className='card s50-saved';card.setAttribute('role','status');
 card.innerHTML=`<div class="s50-saved-mark" aria-hidden="true">✓</div><h2>已儲存 ${s50Saved.n} 個字</h2>${s50Saved.dropped>0?`<p class="small muted">另有 ${s50Saved.dropped} 項格式不對，沒有儲存。</p>`:''}<div class="s50-saved-btns"><button type="button" class="btn primary big" data-s50="practice">開始練習</button><button type="button" class="btn secondary big" data-s50="again">再上傳</button></div>`;
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
 try{s50RetryUi();}catch(_){}
 if(!root._s50RetryObs){
  /* p40 sets the warn / bad class on #ocr-status after it wrote the text: look again when the status changes */
  let t=0;
  root._s50RetryObs=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{try{s50RetryUi();}catch(_){}},30);});
  root._s50RetryObs.observe(root,{subtree:true,attributes:true,attributeFilter:['class'],childList:true,characterData:true});
 }
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
 try{s50Tick();}catch(e){try{console.warn('s50',e);}catch(_){}}
 return r;
};

/* ===== R3.13 layout reader =====================================================================================
 * V20.candidates cuts every line into words. A school list is not a text: "go cycling", "towel 毛巾", "B. Vocabulary (10%@2%)",
 * "accident(ally)" and "Dim Sum" are one item each. This reads the lines of a freshly parsed document as a whole (blank / junk /
 * heading / list line / prose), and rebuilds the items of the list lines and headings once, before s50Apply sees them.
 * Prose lines keep the core's own word items. Nothing here runs on a document the parent already worked on (item.s50 present). */
const S50_ZH='㐀-䶿一-鿿豈-﫿　-〿＀-￯';
const S50_ZH_CH='\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff';
const S50_ZH_RUN=new RegExp('['+S50_ZH_CH+'](?:['+S50_ZH+']|[,;/·](?=['+S50_ZH_CH+'])|\\s+(?=['+S50_ZH_CH+']))*','g');   // OCR spaces the characters out: 大 嶼 山
const s50HasZh=t=>/[㐀-䶿一-鿿豈-﫿]/.test(t);
const S50_LEAD=/^[\s ]*(?:(?:\(?\d{1,3}\s*[.)、:：]|[•●▪·*\-–—.:|]|[A-Za-z]\)|[lI|!](?=\.))+\s*)+/;
const S50_LEAD_LABEL=/^(?:sentences?|passage|paragraph|text|dictation|example|answer)$/i;
const S50_STRICT_HEAD=/^(?:vocabulary|dictation|sentences|recitation|syllabus|semester|phonics|bonus)$/i;
const S50_LAYOUT_WORDS=/\b(?:vocabulary|dictation|sentences|recitation|syllabus|semester|phonics|bonus|thematic|quiz|word list|sight words|high frequency words|target vocabulary|read dictation)\b/i;
const S50_INSTR_A=/^[*\s]*(?:please (?:study|read|write|revise|learn|complete|fill|answer|circle|underline|copy|spell|memori[sz]e|prepare)|you (?:need|have) to (?:fill|study|write|read|learn|revise|complete|answer)|here (?:is|are) (?:some|an?) examples?)\b/i;
const S50_INSTR_B=/^[*\s]*(?:say|read|write|circle|underline|listen|look at|fill|match|tick|copy|study|revise|learn|spell|choose|complete|answer|draw|colou?r)\b.*\b(?:words?|sentences?|following|syllables?|letters?|blanks?|table|examples?|passage|text|below|above|pictures?|each)\b.*[.:]\s*$/i;
/* R3.36 more of the teacher's notes: what will be dictated, what is for reading only, the parent's signature */
const S50_INSTR_C=/^[*\s]*(?:(?:all|the|these|those|only)\s+)*(?:following\s+|new\s+)?(?:words?|phrases?|sentences?|vocabulary|items?|spellings?|following)\b[^.!?]{0,30}?\s(?:will|are to|need(?:s)? to|must|should|is to)\s+(?:be\s+)?(?:dictated|tested|memori[sz]ed|learnt|learned|revised|studied)\b/i;
const S50_INSTR_D=/^[*\s]*(?:words?|phrases?|vocabulary|spellings?|sentences?)\s+(?:to|for)\s+(?:learn|study|revise|dictation|memori[sz]e|spell|recite)\b/i;
const S50_INSTR_E=/\b(?:parent'?s?'?|guardian'?s?)\s+signature\b|^signature\b|\b(?:in bold|underlined|highlighted)\b.*\b(?:words?|phrases?|sentences?)\b|\b(?:words?|phrases?|sentences?)\b.*\b(?:in bold|underlined|highlighted|in red)\b/i;
const S50_SKIP_RE="不用默寫?|不需(?:要)?默寫?|毋須默寫?|無須默寫?|免默|只需認讀|只須認讀|只需讀|只需閱讀|認讀即可|不用背|no need to (?:dictate|memori[sz]e|write|spell|learn)|(?:for )?reading only|read only|not (?:for|in) (?:the )?dictation|(?:will )?not (?:be )?(?:dictated|tested)";
const S50_SKIP=new RegExp(S50_SKIP_RE,'i');
const S50_SKIP_NOTE=new RegExp('\\s*[(（\\[【*]*\\s*(?:'+S50_SKIP_RE+')[^)）\\]】]*[)）\\]】]?','gi');
const S50_SKIP_WHY='老師註明只需認讀，不用默';
/* a line of Chinese with no English item on it (or only Unit / p.12): the teacher's note, never a word's meaning */
const S50_ZH_INSTR=/默|溫習|背誦|認讀|範圍|家長|簽署|簽名|日期|注意|備註|以下|下列|下面|上面|以上|粗體|劃線|畫線|底線|請|需要|只需|只須|必須|部分|生字|詞語|句子|課文/;
function s50ZhInstr(s){
 if(!s50HasZh(s))return false;
 const en=s.replace(/[\u3400-\u9fff\uf900-\ufaff]/g,' ').replace(/\b(?:unit|lesson|chapter|module|dictation|spelling|test|quiz|vocabulary|words?|sentences?|p|pp|page|pages|no|date|term|book|part|section)\b\.?/gi,' ');
 if(/[A-Za-z]{2,}/.test(en))return false;
 const zh=s.replace(/[^\u3400-\u9fff\uf900-\ufaff]/g,'');
 return /默|範圍|家長|簽署|生字|詞語|句子|課文|注意|備註|日期/.test(s)&&zh.length>=2||S50_ZH_INSTR.test(s)&&zh.length>=4||/[，。：；！？]/.test(s)&&zh.length>=4||zh.length>=10;
}
const s50ZhJoin=t=>String(t||'').replace(/([\u3400-\u9fff\uf900-\ufaff，。：；、])\s+(?=[\u3400-\u9fff\uf900-\ufaff，。：；、])/g,'$1');   // OCR: 只 需 認 讀
function s50SkipOnly(s){
 return S50_SKIP.test(s)&&!/[A-Za-z]{2,}/.test(s.replace(S50_SKIP_NOTE,' ').replace(/[\u3400-\u9fff\uf900-\ufaff]/g,' ').replace(/\b(?:the|these|those|following|words?|sentences?|phrases?|passage|text|part|section|below|above|only|and|are|is|for|they|it|please)\b/gi,' '));
}
const S50_MONTH=/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*(?:\d{1,2}(?:st|nd|rd|th)?\s*,?\s*)?\d{4}\b/i;
const S50_AUX=/\b(?:is|are|am|was|were|has|have|had|can|will|do|does|did|likes?|wants?)\b/;
const S50_PUNCT=/[.!?,;:"“”]|(?:^|\s)['‘’]|['‘’](?:\s|$)/;
const S50_NAME_SUFFIX=/(?:ly|ed|ing|tion|sion|ment|ness|ful|less|ous|ive|able|ible|al|ic|ent|ant|ish|ize|ise|er|est)$/i;
const S50_FUNC=new Set('the a an and or but of to in on at for from with by as is are was were be been am it its he she they we you i me my your his her their our this that these those there here not no do does did have has had will would can could should may might must than then so if when what who how which where'.split(' '));
const S50_ARTICLE=new Set('the a an his her my our their its your this that these those some any no'.split(' '));
const s50Words=t=>String(t||'').trim().split(/\s+/).filter(Boolean);
const s50Dict=k=>{try{return !!v20Dictionary.has(k);}catch(_){return false;}};
const s50LettersOnly=t=>String(t||'').replace(/[^A-Za-z]/g,'');

/* the characters validEnglish allows; everything else (% @ * & + _ [ ] …) is dropped, runs of spaces folded */
function s50Charset(t){
 return String(t||'').replace(/[‘]/g,"'").replace(/[^A-Za-z0-9\s'’“”".,!?;:()\-–/]+/g,' ').replace(/\s+/g,' ').trim();
}
/* OCR: "acap" -> "a cap", "alion" -> "a lion" when the whole is unknown and the rest is a known word */
function s50ArticleGlue(w){
 const k=w.toLowerCase();
 if(w.length<4||s50Dict(k))return w;
 if(/^an[aeiou]/i.test(w)&&w.length>=5&&s50Dict(k.slice(2)))return w.slice(0,2)+' '+w.slice(2);
 if(/^a/i.test(w)&&s50Dict(k.slice(1))&&k.length>=4)return w.slice(0,1)+' '+w.slice(1);
 if(/a$/.test(w)&&k.length>=5&&s50Dict(k.slice(0,-1)))return w.slice(0,-1)+' a';
 return w;
}
/* syllable marks (wa'ter, Pon'to), a lone trailing apostrophe (round'), a broken hyphen (hide-and- seek) */
function s50Tidy(t){
 let s=String(t||'').replace(/([A-Za-z])-\s+([a-z])/g,'$1-$2');
 s=s.replace(/\b([A-Za-z]{2,})['’‘]([A-Za-z]{2,})\b/g,(m,a,b)=>{
  if(/^(?:s|t|ll|re|ve|d|m)$/i.test(b))return m;
  const j=a+b;
  return s50Dict(j.toLowerCase())||/^[A-Z][a-z]+$/.test(a)?j:m;
 });
 s=s.replace(/\b([A-Za-z]{3,})['’‘](?=\s|$)/g,(m,a)=>/s$/i.test(a)||!s50Dict(a.toLowerCase())?m:a);
 return s.replace(/\s+/g,' ').trim();
}
/* "accident(ally)" -> accident, accidentally; "busy/business" -> busy, business; "break (breaks)"; "equip (–ped, –ment)" */
function s50Expand(t){
 let m=/^([A-Za-z][A-Za-z'’-]*)\(([A-Za-z]+)\)$/.exec(t);
 if(m)return [m[1],m[1]+m[2]];
 m=/^(.*?[A-Za-z])\s*\(([^()]*)\)$/.exec(t);
 if(m&&/[+=→]/.test(m[2]))return [m[1]];            // "criticise (critic + ise)": a spelling hint, not a second word
 if(m&&!/\s/.test(m[1])&&/^[A-Za-z\s,\-–—]+$/.test(m[2])){
  const out=[m[1]];
  for(const p of m[2].split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean)){
   const sf=/^[-–—]\s*([A-Za-z]+)$/.exec(p);
   if(sf)out.push(m[1]+sf[1]);else if(/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(p))out.push(p);
  }
  return out;
 }
 if(/^[A-Za-z]+(?:\/[A-Za-z]+)+$/.test(t))return t.split('/');
 return [t];
}
/* English + Chinese in one string -> [{en, zh}]; a Latin piece takes the Chinese that follows it (zh first: the one before it) */
function s50Pairs(t){
 const runs=[...t.matchAll(S50_ZH_RUN)];
 if(!runs.length)return [{en:t,zh:''}];
 const out=[];
 let pos=0,pendingZh='',lead='';
 for(const r of runs){
  const piece=t.slice(pos,r.index);
  const en=piece.replace(/^[\s,;，；、:：=|\-–—→(（\[]+|[\s,;，；、:：=|\-–—→(（\[]+$/g,'').trim();
  const zh=r[0].replace(/\s+/g,'');
  if(en&&/[A-Za-z]/.test(en)){out.push({en,zh:zh.replace(/[\u3000-\u303f\uff00-\uffef]+$/,'')});pendingZh='';}
  else if(!en&&out.length)out[out.length-1].zh+=zh;
  else{pendingZh=zh;if(!out.length&&!lead)lead=zh;}
  pos=r.index+r[0].length;
 }
 const tail=t.slice(pos).replace(/^[\s,;，；、:：=|\-–—→(（\[]+|[\s,;，；、:：=|\-–—→)）\]]+$/g,'').trim();
 if(tail&&/[A-Za-z]/.test(tail))out.push({en:tail,zh:pendingZh,lead:!!pendingZh&&pendingZh===lead});
 out.lead=lead;
 return out;
}
function s50CleanSeg(raw){
 let t=String(raw||'').replace(S50_LEAD,'');
 t=t.replace(/^(?:e\.?\s?g\.?|i\.?\s?e\.?)\s+/i,'').replace(/^[A-Z]\.\s+(?=[a-z])/,'');
 return t.replace(/[\s*·|_]+$/,'').trim();
}

/* ---- line level ---- */
function s50HeadingWhy(t,ctx){
 const s=t.replace(S50_LEAD,'').trim();
 const words=s50Words(s);
 if(!s)return '';
 if(/\d\s*%|%\s*@|@\s*\d/.test(t))return '版面標題（含 % 或 @）';
 if(/^\(?\d+\s*words?\)?\.?$/i.test(s))return '字數提示';
 if(/^[A-Z]\.\s*$/.test(s)||/^[A-Z]\.\s+(?![a-z])/.test(t.trim()))return '版面標題';   // "J. firefighter": an OCR'd 3. before a list item
 const letters=s50LettersOnly(s);
 if(letters.length>=4&&letters===letters.toUpperCase()&&words.length>=2)return '全大寫標題';
 if(/^(?:primary|p\.?)\s*\d/i.test(s)||/^\d{4}\s*[-–/]\s*\d{2,4}\b/.test(s)||/^\d{1,2}(?:st|nd|rd|th)\b/i.test(s)||S50_MONTH.test(s))return '年級或日期';
 if(/\bschool\s*$/i.test(s)&&words.length>=3&&words.length<=7&&words.filter(w=>/^[A-Z]/.test(w)).length>=2)return '校名';
 const sz=s50ZhJoin(s);
 if(s50SkipOnly(sz))return '指示語（不用默）';
 if(S50_INSTR_A.test(s)||S50_INSTR_B.test(s)||S50_INSTR_C.test(s)||S50_INSTR_D.test(s)||S50_INSTR_E.test(s))return '指示語';
 if(s50ZhInstr(sz))return '中文指示';
 if(/^(?:spelling|dictation|vocabulary)\s+(?:test|quiz|list|book)\b/i.test(s)&&words.length<=8)return '版面標題';
 const lab=/^([A-Za-z][\w.]*(?:\s+[A-Z0-9][\w.]*){0,2})\s*[:：]\s*(.*)$/.exec(s);
 if(lab&&S50_LEAD_LABEL.test(lab[1])&&words.length>=4)return '';   // "Sentence: The cat is on the mat.": the label is dropped, the sentence is kept
 if(lab&&(words.length<=12)&&/^[A-Z]/.test(lab[1])&&!s50HasZh(lab[2]||'')&&(lab[1].split(/\s+/).length===1||lab[1].split(/\s+/).every(w=>/^[A-Z0-9]/.test(w))))return '標籤行';
 if(/^(?:name|class|date|no|class no|ready|topic|note|remarks?)\b\s*[:：_.\d(]/i.test(s))return '姓名、班別或日期';
 if(words.length===1&&S50_STRICT_HEAD.test(s))return '版面字';
 if(words.length>1&&words.length<=8&&!/[.!?]$/.test(s)&&S50_LAYOUT_WORDS.test(s))return '版面標題';
 if(/^(?:word list|unit|lesson|chapter|module|term|years?)\b.*\d/i.test(s)&&words.length<=8)return '課名或頁碼';
 return '';
}
function s50SentenceLike(w,txt){return w.length>=4&&/^[A-Z]/.test(txt)&&S50_AUX.test(txt);}

/* OCR: cells of a table row come as one line with single spaces when the gap is not wide enough for the core's own cut. The
 * boxes tell: a gap of more than 0.8 x the word height is a column gap, an ordinary word space is about 0.35 x. */
/* the boxes of a segment, clipped to it ("2.actor" starts before the segment "actor") */
function s50TokensIn(line,sg){
 const out=[];
 for(const t of line.tokens||[]){
  if(!(t.end>sg.start&&t.start<sg.end))continue;
  const a=Math.max(t.start,sg.start),b=Math.min(t.end,sg.end);
  out.push({text:String(line.text).slice(a,b),start:a,end:b,confidence:t.confidence,bbox:t.bbox});
 }
 return out;
}
function s50SplitByGap(line,sg){
 const tk=s50TokensIn(line,sg).filter(t=>t.bbox);
 if(tk.length<3||tk.length>8)return [sg];
 /* the tallest word of the row (an ascender or a capital): "a" alone is only x-height high */
 const hs=tk.filter(t=>(t.text.match(/[A-Za-z]/g)||[]).length>=2).map(t=>t.bbox.y1-t.bbox.y0).filter(h=>h>0).sort((a,b)=>a-b);
 const h=hs.length?hs[hs.length-1]:0;
 if(!h)return [sg];
 const cuts=[];
 for(let i=1;i<tk.length;i++)if(tk[i].bbox.x0-tk[i-1].bbox.x1>0.8*h)cuts.push(i);
 if(!cuts.length)return [sg];
 const out=[];let from=0;
 for(const c of [...cuts,tk.length]){
  const part=tk.slice(from,c);
  if(part.length){const a=part[0].start,b=part[part.length-1].end;out.push({start:a,end:b,text:line.text.slice(a,b)});}
  from=c;
 }
 return out;
}
const s50SegText=(sg)=>s50Tidy(s50CleanSeg(sg.text));
/* kinds: blank | junk | head | bi (English + Chinese) | cand (a short line without sentence punctuation) | prose */
function s50ClassifyLines(d){
 const lines=d.lines||[];
 const info=lines.map((line,i)=>{
  const t=String(line.text||'');
  const o={i,line,t,kind:'prose',why:''};
  if(!t.trim()){o.kind='blank';return o;}
  const s=t.replace(S50_LEAD,'').trim();
  if(!/[A-Za-z㐀-鿿]/.test(s)||(/^[A-Za-z]?[\s\d.,\-–|]*$/.test(s)&&(s.match(/[A-Za-z]/g)||[]).length<=1&&!/^[aAI]$/.test(s))){o.kind='junk';return o;}
  o.segs=V20.segments(line);
  let tt=t;
  if(d.fromOCR&&!s50HasZh(t)){
   o.segs=o.segs.flatMap(sg=>s50SplitByGap(line,sg)).map(sg=>s50OcrSeg(line,sg)).filter(sg=>sg.text&&/[A-Za-z]/.test(sg.text));
   tt=o.segs.map(sg=>sg.text).join('   ');
   o.t=tt;
   const tz=tt.replace(S50_LEAD,'').trim();
   if(!o.segs.length||/^[A-Za-z]?[\s\d.,\-–|]*$/.test(tz)&&!/^[aAI]$/.test(tz)){o.kind='junk';return o;}
  }
  o.why=s50HeadingWhy(tt,d);
  if(o.why){o.kind='head';o.skip=S50_SKIP.test(s50ZhJoin(tt));return o;}
  if(s50HasZh(t)){o.kind='bi';return o;}
  const ok=o.segs.length>0&&o.segs.every(sg=>{
   const c=s50SegText(sg),core=c.replace(/\([^()]*\)/g,' ').trim(),w=s50Words(core);
   return w.length>=1&&w.length<=6&&!S50_PUNCT.test(core)&&!s50SentenceLike(w,core)&&/[A-Za-z]/.test(core);
  });
  o.kind=ok?'cand':'prose';
  return o;
 });
 const zhLines=info.filter(o=>o.kind==='bi').length,contentN=info.filter(o=>!['blank','junk'].includes(o.kind)).length;
 const bilingual=zhLines>=3&&zhLines>=contentN*0.4;
 if(bilingual){
  /* everything before the first Chinese line is a title or a column header */
  const first=info.findIndex(o=>o.kind==='bi');
  for(let j=0;j<first;j++)if(['cand','prose'].includes(info[j].kind)){info[j].kind='head';info[j].why='標題或欄名';}
  /* a header row between tables: no Chinese, several columns of capitalised words */
  for(const o of info)if(o.kind==='cand'&&o.segs.length>=2&&o.segs.every(sg=>/^[A-Z]/.test(s50CleanSeg(sg.text)))){o.kind='head';o.why='欄名';}
 }
 /* a verb table's column names (Present / Present continuous / Past): only when two of them stand close together, so that
  * "present" or "past" alone in a vocabulary list stays a word */
 {
  const VC=/^(?:simple\s+)?(?:present(?:\s+continuous|\s+tense)?|past(?:\s+tense)?|future)$/i;
  const content=info.filter(o=>!['blank','junk'].includes(o.kind));
  const isVc=o=>o.kind==='cand'&&o.segs.length>0&&o.segs.every(sg=>VC.test(s50CleanSeg(sg.text)));
  content.forEach((o,i)=>{
   if(!isVc(o))return;
   const near=content.slice(Math.max(0,i-3),i+4).filter(x=>x!==o&&isVc(x)).length>0;
   if(near||o.segs.length>=2){o.kind='head';o.why='動詞表欄名';}
  });
 }
 /* the top of a table: a title in Title Case above lower-case items, or a row of column names (Noun / Description / Places ...) */
 {
  const content=info.filter(o=>!['blank','junk'].includes(o.kind));
  const top=content.slice(0,5);
  const colWord=new Set('noun nouns verb verbs adjective adjectives adverb meaning meanings description descriptions features feature location locations places place activities activity materials fabrics body parts clothes name type example examples phrase phrases word words topic category item items column'.split(' '));
  for(const o of top){
   if(o.kind!=='cand')continue;
   const ws=s50Words(s50CleanSeg(o.t)).map(w=>w.toLowerCase().replace(/[^a-z]/g,'')).filter(Boolean);
   if(ws.length&&ws.every(w=>colWord.has(w))&&(ws.length>=2||o.segs.length>=1&&top.indexOf(o)<2&&colWord.has(ws[0])&&!/^[a-z]/.test(s50CleanSeg(o.t))))
    {o.kind='head';o.why='欄名';}
  }
  const f=content[0];
  if(f&&f.kind==='cand'&&f.segs.length===1){
   const ws=s50Words(s50CleanSeg(f.t));
   const next=content.slice(1,6).filter(o=>o.kind==='cand'||o.kind==='bi');
   const lower=next.filter(o=>/^[a-z]/.test(s50CleanSeg(o.t))).length;
   if(ws.length<=4&&ws.every(w=>/^[A-Z]/.test(w))&&next.length>=3&&lower>=3&&lower>=next.length*0.6){f.kind='head';f.why='標題';}
  }
 }
 /* a run of at least two short lines is a list; a short line alone between prose lines is just a short line */
 let j=0;
 while(j<info.length){
  if(info[j].kind!=='cand'){j++;continue;}
  let k=j;
  while(k<info.length&&(info[k].kind==='cand'||info[k].kind==='blank'||info[k].kind==='junk'))k++;
  const run=info.slice(j,k).filter(o=>o.kind==='cand');
  let prose=!(run.length>=2||bilingual);
  if(!prose&&!bilingual){
   /* wrapped prose without punctuation (a narrow column in a photo) is a run of short lines too: its lines are longer and made of
    * function words; a list's items are 1-4 words and mostly content words */
   const cells=run.flatMap(o=>o.segs.map(sg=>s50Words(s50SegText(sg).replace(/\([^()]*\)/g,' '))));
   const tot=cells.reduce((a,w)=>a+w.length,0),n=cells.length||1;
   const stop=cells.flat().filter(w=>S50_FUNC.has(w.toLowerCase().replace(/[^a-z']/g,''))).length;
   const m=tot/n,f=stop/Math.max(1,tot);
   if(m>=4.5||(m>=3.5&&f>=0.4))prose=true;
   /* two or three short lines hanging off a real prose line are the ragged end of that paragraph */
   if(!prose&&run.length<=3){
    const around=[];
    for(let a=j-1;a>=0;a--){if(info[a].kind==='junk')continue;around.push(info[a]);break;}
    for(let a=k;a<info.length;a++){if(info[a].kind==='junk')continue;around.push(info[a]);break;}
    const strong=o=>o.kind==='prose'&&(s50Words(s50CleanSeg(o.t)).length>=7||/[.!?;]/.test(s50CleanSeg(o.t).replace(/\.$/,'')));
    if(around.some(strong))prose=true;
   }
  }
  if(prose)run.forEach(o=>{o.kind='prose';});
  j=Math.max(k,j+1);
 }
 return {info,bilingual};
}

/* ---- item building ---- */
function s50Overlap(olds,line,a,b){
 return olds.filter(c=>c.lineId===line.id&&(!c.span||(c.span[1]>a&&c.span[0]<b)));
}
function s50Make(d,line,seg,olds,en,zh,opt={}){
 d.s50seq=(d.s50seq||0)+1;
 const mini=V20.fromText(en+' | ',d.id+'-n'+d.s50seq);
 const c=V20.candidates(mini,{mode:'list',dictionary:v20Dictionary,common:v20.common})[0];
 if(!c)return null;
 const src=s50Overlap(olds,line,seg.start,seg.end);
 const tk=s50TokensIn(line,seg);
 const tkEn=tk.filter(t=>/[A-Za-z]/.test(t.text));   // the Chinese beside the word has its own (unreliable) confidence
 const conf=tkEn.length?tkEn.map(t=>t.confidence).filter(x=>Number.isFinite(x)&&x>=0):src.map(x=>x.confidenceRaw).filter(Number.isFinite);
 const g=V20.gloss(c.en,v20Dictionary);
 /* R3.35 Chinese read from a photo is often one character off (大嶼山 -> 次嶼山): the dictionary meaning wins; the photo's Chinese
  * is only used for a phrase the dictionary does not have, and then it asks to be checked */
 const zhOcr=!!d.fromOCR&&!!String(zh||'').trim();
 const teacher=zhOcr&&g.zh?'':String(zh||'').trim();
 const sentence=/[.!?]$/.test(c.en);
 const reasons=[];
 if(conf.length&&Math.min(...conf)<75)reasons.push('原相這裏需要再看');
 if(/[0-9]/.test(c.en)&&/[A-Za-z][0-9]|[0-9][A-Za-z]/.test(c.en))reasons.push('數字可能混入字母');
 const parts=c.en.split(/[\s-]+/).filter(Boolean);
 const allKnown=parts.length>1&&parts.every(p=>s50Dict(V20.fold(p)));
 if(!g.known&&!sentence&&!allKnown)reasons.push('內置題庫沒有這個字，核對後可以保留');
 if(g.choices.length>1&&!teacher)reasons.push('請選今次的意思');
 if(zhOcr&&teacher)reasons.push('中文由相片讀出，請核對');
 Object.assign(c,{
  sourceRegionId:d.id,lineId:line.id,paragraphId:line.paragraphId,sourceText:line.originalText||line.text,
  originalText:String(seg.text||c.en).slice(0,240),zh:teacher||g.zh||'',kind:sentence?'sentence':/\s/.test(c.en)?'phrase':'word',
  sourceTokenIds:src.flatMap(x=>x.sourceTokenIds||[]),sourceBoxes:src.flatMap(x=>x.sourceBoxes||[]),
  confidenceRaw:conf.length?Math.min(...conf):null,reviewReasons:reasons,reviewed:false,selected:true,excludedReason:'',
  span:[seg.start,seg.end],explicit:false,known:g.known||allKnown,choices:g.choices,example:g.example,
  common:!/\s/.test(c.en)&&v20.common.has(V20.fold(c.en)),
 });
 c.s50x={list:true,zh:!!teacher};
 return c;
}
/* a list line / heading that cannot be English at all is kept, but not selected */
const S50_OK_EN=/^[A-Za-z][A-Za-z0-9'’\-./ ]*$/;
function s50Looks(en,ocr){
 if(!S50_OK_EN.test(en))return '不像英文單字';
 const ws=en.split(/[\s/]+/).filter(Boolean);
 if(!(en.match(/[A-Za-z]/g)||[]).length)return '不像英文單字';
 if(ocr){
  if(ws.some(w=>w.replace(/[^A-Za-z]/g,'').length>1&&!/[aeiouyAEIOUY]/.test(w)))return '不像英文單字';
  if(ws.some(w=>/[a-z][A-Z]/.test(w)))return '不像英文單字';
  if(en.replace(/[^A-Za-z]/g,'').length<2&&!/^(?:a|I)$/.test(en))return '太短，可能不是單字';
 }
 return '';
}
/* OCR: words after the English that are not words (Chinese read as latin noise) are cut off; so are leading marks */
function s50NoiseWord(w,prev){
 const core=String(w).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g,'');
 if(!core)return true;
 if(/[^A-Za-z'’\-.,/()]/.test(core))return true;
 if(core.length<=1&&!/^[aAI]$/.test(core))return true;
 if(core.length>=2&&core.length<=3&&core===core.toUpperCase()&&prev&&/[a-z]/.test(prev))return true;
 if(core.length>=2&&!/[aeiouyAEIOUY]/.test(core))return true;
 /* a short trailing word that is no word at all (Chinese read as "ae", "eR", "iLL") */
 if(prev&&core.length<=3&&!/^[aAI]$/.test(core)&&(/[a-z][A-Z]/.test(core)||!s50Dict(core.toLowerCase())))return true;
 return false;
}
/* R3.37 a short last word that ends a known name or phrase is part of it (Tai O) */
function s50KnownTail(ws){
 if(ws.length<2||!/^[A-Za-z]{1,3}$/.test(String(ws[ws.length-1]).replace(/[^A-Za-z]/g,'')))return false;
 for(const n of [2,3]){if(ws.length<n)break;const t=ws.slice(-n).join(' ').replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'');try{if(V20.gloss(t,v20Dictionary).known)return true;}catch(_){}}
 return false;
}
function s50TrimNoise(t){
 const ws=s50Words(t);
 while(ws.length>1&&s50NoiseWord(ws[ws.length-1],ws[ws.length-2])&&!s50KnownTail(ws))ws.pop();
 return ws.join(' ');
}
/* the same on the words' boxes: a trailing word the engine itself was unsure of (confidence < 58) is not part of the item */
function s50OcrSeg(line,sg,useConf){
 const tk=s50TokensIn(line,sg),art=sg.art?'a ':'';
 if(!tk.length)return {start:sg.start,end:sg.end,text:art+s50TrimNoise(sg.text),art:!!art};
 const lowConf=t=>!!useConf&&Number.isFinite(t.confidence)&&t.confidence>=0&&t.confidence<58;
 let a=0,b=tk.length;
 while(b-a>1&&(s50NoiseWord(tk[b-1].text,tk[b-2].text)||lowConf(tk[b-1]))&&!s50KnownTail(tk.slice(a,b).map(t=>t.text)))b--;
 /* R3.37 "2. a lion": the article shares the low confidence of the list number before it */
 const art0=i=>/^(?:a|an|the)$/i.test(tk[i].text)&&i+1<b&&/^[A-Za-z]{2,}$/.test(tk[i+1].text)&&s50Dict(V20.fold(tk[i+1].text))&&!lowConf(tk[i+1]);
 while(b-a>1&&(s50NoiseWord(tk[a].text,'')||lowConf(tk[a])&&!art0(a)))a++;
 const start=tk[a].start,end=tk[b-1].end;
 /* "-@ panda": the engine read the article a as @ */
 if(a>0&&/^[^A-Za-z0-9@]*@$/.test(tk[a-1].text)&&/^[a-z]{2,}$/.test(tk[a].text)&&s50Dict(tk[a].text))return {start,end,text:'a '+String(line.text).slice(start,end),art:true};
 return {start,end,text:art+String(line.text).slice(start,end),art:!!art};
}
/* R3.36 a second reading of the photo as one block (psm 6) when the parent left 自動分欄: lists in one column and short passages often
 * come out better, a page in several columns worse. The reading with more confident dictionary words, less half a point per unsure
 * scrap, wins; a tie keeps the first. */
function s50OcrScore(data){
 let n=0;
 for(const bl of data&&data.blocks||[])for(const p of bl.paragraphs||[])for(const l of p.lines||[])for(const w of l.words||[]){
  const t=String(w.text||'').trim();
  if(w.confidence>=80&&/^[A-Za-z]{2,}$/.test(t)&&s50Dict(V20.fold(t)))n++;
  else if(t&&w.confidence<60)n-=0.5;   // the one-block reading also reads the table and the background as letters
 }
 return n;
}
window.s50Recognize=async function(worker,image,psm,valid){
 const opt={text:true,blocks:true,tsv:true,hocr:false,pdf:false};
 const run=async m=>{await worker.setParameters({tessedit_pageseg_mode:m,preserve_interword_spaces:'1',user_defined_dpi:'300'});return worker.recognize(image,{},opt);};
 window.s50PassLabel='';
 const a=await run(psm);
 if(String(psm)!=='3'||!valid())return a;
 let b=null;
 window.s50PassLabel='再核對一次';
 try{b=await run('6');}catch(_){b=null;}finally{window.s50PassLabel='';}
 if(!b||!valid())return a;
 return s50OcrScore(b.data)>s50OcrScore(a.data)?b:a;
};
let s50Wrap=null;
/* a photo's Chinese given to an item made earlier: only when the dictionary has no meaning for it, and then to be checked */
function s50GiveZh(c,zh){
 if(!zh||c.known&&c.zh)return;
 c.zh=zh;
 if(!c.reviewReasons.includes('中文由相片讀出，請核對'))c.reviewReasons.push('中文由相片讀出，請核對');
}
function s50Rebuild(d,old){
 s50Wrap=null;
 const {info,bilingual}=s50ClassifyLines(d);
 const byLine=new Map();
 for(const c of old){(byLine.get(c.lineId)||byLine.set(c.lineId,[]).get(c.lineId)).push(c);}
 const lineIds=new Set((d.lines||[]).map(l=>l.id));
 const out=[];
 const ocr=!!d.fromOCR;
 let nList=0,nProse=0;
 const raw=(d.lines||[]).map(l=>l.text).join('\n');
 const offs=[];let acc=0;for(const l of d.lines||[]){offs.push(acc);acc+=String(l.text||'').length+1;}
 const lowerSeen=new Set((raw.match(/\b[a-z]{2,}\b/g)||[]));
 /* R3.37 a numbered list whose long item wraps onto an un-numbered line ("9. The Hong Kong" / "Observation Wheel"): the line goes on
  * the item above it. Only in a list that is numbered almost throughout. */
 const numbered=o=>/^[^A-Za-z0-9]*\(?\d{1,3}\s*[.)、]/.test(String(o.line.text||''));
 const cands=info.filter(o=>o.kind==='cand'),nNum=cands.filter(numbered).length;
 const contList=!bilingual&&nNum>=3&&cands.length-nNum<=Math.max(1,nNum/3);
 let s50Cont=null;
 for(const o of info){
  const olds=byLine.get(o.line.id)||[];
  if(o.kind==='blank'||o.kind==='junk')continue;
  if(o.kind==='head'){
   s50Wrap=null;
   const en=s50Tidy(s50Charset(s50CleanSeg(o.t).replace(/[%@]+/g,' ').replace(/\(\s*\d*\s*\)/g,' ')));
   if(!(en.match(/[A-Za-z]/g)||[]).length){continue;}
   const seg={start:0,end:o.t.length,text:o.t};
   const c=s50Make(d,o.line,seg,olds,en.slice(0,80),'');
   if(c){c.selected=false;c.excludedReason='可能是標題或指示：'+o.why;c.reviewReasons=[];c.s50x={list:false,head:true};out.push(c);}
   continue;
  }
  if(o.kind!=='bi')s50Wrap=null;
  if(o.kind!=='cand')s50Cont=null;
  if(o.kind==='bi'||o.kind==='cand'){
   let contPrev=null;
   if(o.kind==='cand'&&contList&&s50Cont&&!numbered(o)&&(o.segs||[]).length===1){
    let nx=null;for(let a=o.i+1;a<info.length;a++){if(['blank','junk'].includes(info[a].kind))continue;nx=info[a];break;}
    if(!nx||nx.kind!=='cand'||numbered(nx))contPrev=s50Cont;
   }
   s50Cont=null;
   const wrapOn=ocr&&bilingual&&o.kind==='bi';let lineFirst=true,lastMade=null,lastBare=false;
   const segs=(o.segs||V20.segments(o.line)).map(sg=>ocr&&!s50HasZh(sg.text)?s50OcrSeg(o.line,sg,true):sg).filter(sg=>sg.text&&/[A-Za-z\u3400-\u9fff]/.test(sg.text));
   for(const sg of segs){
    const t0=s50Tidy(s50CleanSeg(sg.text));
    if(!t0)continue;
    const pairs=o.kind==='bi'?s50Pairs(t0):[{en:t0,zh:''}];
    let cur=0;
    for(const pr of pairs){
     let psg=sg,carry='';
     if(wrapOn&&lineFirst){
      const prev=s50Wrap;
      if(prev&&pairs.lead){s50GiveZh(prev,pairs.lead);}
      else if(prev&&!pairs.lead&&/^[A-Za-z]/.test(t0)&&out[out.length-1]===prev&&!/[.!?]$/.test(prev.en)){out.pop();nList--;carry=prev.en;}
     }
     if(contPrev&&lineFirst&&out[out.length-1]===contPrev){out.pop();nList--;carry=contPrev.en;}
     lineFirst=false;
     const prSkip=S50_SKIP.test(pr.en+' '+pr.zh);
     let prZh=wrapOn&&pr.lead?'':pr.zh;
     if(prSkip)prZh=prZh.replace(S50_SKIP_NOTE,'').replace(/[\s(（\[【*，,]+$/,'');
     if(pairs.length>1){const k=String(sg.text).indexOf(pr.en,cur);if(k>=0){psg={start:sg.start+k,end:sg.start+k+pr.en.length,text:pr.en};cur=k+pr.en.length;}}
     let en=s50Tidy(s50CleanSeg(prSkip?pr.en.replace(S50_SKIP_NOTE,' '):pr.en));
     if(ocr)en=s50TrimNoise(en);
     if(!en||!/[A-Za-z]/.test(en))continue;
     if(carry)en=carry+' '+en;
     /* the writer gave Chinese: keep the English whole (duck/goose feathers); no Chinese: split a/b and word(suffix) */
     const forms=prZh||carry||s50Dict(V20.fold(en))?[en]:s50Expand(en);   // a dictionary entry itself (his/her, o'clock) is never taken apart
     for(let f of forms){
      f=s50Charset(f);
      if(ocr)f=f.split(' ').map(w=>/^[a-z][A-Z]+$/.test(w)&&s50Dict(w.toLowerCase())?w.toLowerCase():w.length>3?s50ArticleGlue(w):w).join(' ').replace(/^((?:a|an)) /i,'$1 ');
      f=f.replace(/^[^A-Za-z]+|[^A-Za-z.!?')]+$/g,'').trim();
      if(!f)continue;
      const c=s50Make(d,o.line,psg,olds,f,prZh);
      if(!c)continue;
      lastMade=c;lastBare=!prZh;
      const bad=s50Looks(c.en,ocr);
      if(prSkip){c.selected=false;c.excludedReason=S50_SKIP_WHY;c.reviewReasons=[];}
      else if(bad){c.selected=false;c.excludedReason=bad;c.reviewReasons=[];}
      /* R3.37 "3. no": a known word on a numbered line shares the list number's low confidence (30, not 40) */
      else if(ocr&&c.confidenceRaw!==null&&c.confidenceRaw<(c.known&&numbered(o)?30:40)){c.selected=false;c.excludedReason='辨認不太清楚';c.reviewReasons=[];}
      out.push(c);nList++;
     }
    }
   }
   s50Wrap=wrapOn&&lastMade&&lastBare&&!lastMade.excludedReason?lastMade:null;
   s50Cont=o.kind==='cand'&&numbered(o)&&lastMade&&lastBare&&!lastMade.excludedReason&&s50Words(lastMade.en).length<=5?lastMade:null;
   continue;
  }
  /* prose: the core's word items, tidied; names are left un-selected */
  const here=offs[o.i];
  const lead=/^\s*([A-Za-z]+)\s*[:：]/.exec(o.t);
  const leadEnd=lead&&S50_LEAD_LABEL.test(lead[1])?lead[0].length:0;
  for(const c of olds){
   c.s50x={list:false};
   if(leadEnd&&c.span&&c.span[1]<=leadEnd)continue;                       // the word "Sentence" of "Sentence: The cat..."
   if(c.kind==='sentence'||c.excludedReason){out.push(c);continue;}
   if(c.kind==='word'||c.kind==='phrase'){
    const t=s50Tidy(c.en);
    if(t!==c.en&&t){c.en=t;const g=V20.gloss(t,v20Dictionary);c.known=g.known;c.choices=g.choices;c.example=g.example;if(!c.zh)c.zh=g.zh;
     c.reviewReasons=c.reviewReasons.filter(r=>!/題庫沒有/.test(r)||!g.known);}
   }
   /* R3.27: a name from the proper-noun list (Peter, Chan, Mr) counts even when known; one that is also a common word (Mark, Rose)
    * only away from the start of a sentence */
   const pn=window.wqProper?window.wqProper(c.en):null,listed=pn&&['name','surname','title'].includes(pn.type);
   if(c.kind==='word'&&c.selected&&/^[A-Z][a-z]{1,}\.?$/.test(c.en)&&(listed||!c.known&&!S50_NAME_SUFFIX.test(c.en))&&!lowerSeen.has(c.en.toLowerCase())){
    const a=here+(c.span?c.span[0]:0),before=raw.slice(0,a).replace(/[\s"'“‘(]+$/,'');
    const prev=(/([A-Za-z']+)$/.exec(before)||[])[1];
    if(!(prev&&S50_ARTICLE.has(prev.toLowerCase()))&&!(pn&&pn.common&&(!before||/[.!?:]$/.test(before)))){c.selected=false;c.s50x.name=true;}
   }
   out.push(c);nProse++;
  }
 }
 /* R3.36 "以下句子只需認讀，不用默寫" / "Reading only:": the lines after it (or before it, for 以上 / above) up to the next heading,
  * and only one block (a list or a passage), are kept but not selected */
 const skip=new Set();
 info.forEach((o,k)=>{
  if(o.kind!=='head'||!o.skip)return;
  const step=/以上|上面|上列|上述|\babove\b/i.test(s50ZhJoin(o.t))?-1:1;let grp=null;
  for(let a=k+step;a>=0&&a<info.length;a+=step){
   const x=info[a];
   if(x.kind==='blank'||x.kind==='junk')continue;
   if(x.kind==='head')break;
   const g=x.kind==='prose'?'p':'l';
   if(grp&&g!==grp)break;
   grp=g;skip.add(x.line.id);
  }
 });
 if(skip.size)for(const c of out)if(skip.has(c.lineId)&&!(c.s50x&&c.s50x.head)){c.selected=false;c.excludedReason=S50_SKIP_WHY;c.reviewReasons=[];}
 /* items of lines the reader did not see (should not happen) keep their place at the end */
 for(const c of old)if(!lineIds.has(c.lineId)){c.s50x={list:false};out.push(c);}
 d.s50layout=bilingual?'bilingual':nList>=3&&nList>=nProse*1.5?'list':nProse&&nList?'mixed':'text';
 return out;
}
/* Called before s50Apply on every render: only a document whose items have never been through s50Apply is read. */
function s50Normalise(){
 if(!v20||v20.mode!=='list'||!window.WQImportCore)return;
 for(const d of v20.documents||[]){
  if(!d||d.s50n||!Array.isArray(d.lines))continue;
  const idx=[];
  v20.items.forEach((c,i)=>{if(c.sourceRegionId===d.id)idx.push(i);});
  if(!idx.length)continue;
  d.s50n=true;
  const old=idx.map(i=>v20.items[i]);
  if(old.some(c=>c.s50||c.parts||c.s50x))continue;
  let neu;
  try{neu=s50Rebuild(d,old);}catch(e){try{console.warn('s50 layout',e);}catch(_){}continue;}
  const first=idx[0],set=new Set(old);
  const rest=v20.items.filter(c=>!set.has(c));
  const before=v20.items.slice(0,first).filter(c=>!set.has(c));
  v20.items=before.concat(neu,rest.slice(before.length));
  if(d.fromOCR&&d.p40&&d.p40.unclear)s50Recheck(d,neu);
 }
}
/* R3.36 p40 judged the photo "unclear" on the core's items (a sheet where every line has Chinese beside it can leave none of
 * them usable); the same rule is asked again of the items read above, and a clear page goes on to step 2 as usual */
function s50Recheck(d,items){
 const sel=items.filter(c=>c.selected),conf=sel.map(c=>c.confidenceRaw).filter(Number.isFinite).sort((a,b)=>a-b);
 const st={raw:items.length,pre:sel.length,known:sel.filter(c=>c.known).length,conf};
 st.medConf=conf.length?(conf.length%2?conf[conf.length>>1]:(conf[conf.length/2-1]+conf[conf.length/2])/2):0;
 st.unclear=st.raw>0&&(st.pre<3||(st.raw>40&&st.pre/st.raw<.3)||st.known/Math.max(1,st.pre)<.35||(conf.length>0&&st.medConf<60));
 if(st.unclear||!window.WQP40)return;
 d.p40=st;
 setTimeout(()=>{if(v20.documents.includes(d))WQP40.ocrDone(d,items);},0);
}

/* ===== R3.13 poor recognition: offer the two hidden helpers (straighten / more contrast) instead of a dead end ===== */
let s50ReplaceAt=0;
function s50OcrPoor(){
 const docs=(v20.documents||[]).filter(d=>d&&d.fromOCR&&d.p40);
 return docs.some(d=>d.p40.unclear||(d.p40.conf&&d.p40.conf.length&&d.p40.medConf<70)||d.p40.pre<3);
}
function s50RetryHtml(){
 return '<span>辨認不清？</span><button type="button" class="btn quiet" data-s50="retry-enh">加強對比再試</button><button type="button" class="btn quiet" data-s50="retry-crop" aria-label="拉直或框選再試">拉直再試</button>';
}
/* step 1: under the recognition status when it ended in "unclear / nothing found / failed" */
function s50RetryUi(){
 const root=s50Root();if(!root)return;
 const st=root.querySelector('#ocr-status');
 let box=root.querySelector('#s50-retry');
 const bad=!!(st&&v20Photo&&!ocrBusy&&(st.classList.contains('p40-warn')||st.classList.contains('p40-bad'))&&st.textContent.trim());
 if(!bad){box?.remove();return;}
 if(!box){
  box=document.createElement('div');box.id='s50-retry';box.className='s50-retry';box.innerHTML=s50RetryHtml();
  st.after(box);
 }
}
function s50DropOcr(){
 const ids=new Set((v20.documents||[]).filter(d=>d&&d.fromOCR).map(d=>d.id));
 if(!ids.size)return;
 v20History();v20Touch();
 v20.documents=v20.documents.filter(d=>!ids.has(d.id));
 v20.items=v20.items.filter(c=>!ids.has(c.sourceRegionId));
 v20.parsedRaw=v20.documents.map(d=>d.raw).join('\n\n');
 importDraft.raw=v20.parsedRaw;
 const ta=$('#raw-words');if(ta)ta.value=importDraft.raw;
 v20.s50Eff=null;
}
function s50Retry(mode){
 if(!v20Photo||ocrBusy||v20FileLoading)return;
 if(s50Step()===2)$('#p40-back2')?.click();
 if(mode==='crop'){s50ReplaceAt=Date.now();v20Crop();return;}
 s50ReplaceAt=Date.now();
 const root=s50Root();
 const cb=document.createElement('input');cb.type='checkbox';cb.id='v20-enhance';cb.hidden=true;cb.checked=true;
 (root||document.body).append(cb);
 try{s50AutoRun();}finally{setTimeout(()=>cb.remove(),0);}
}
const s50PriorUpdateOCR=updateOCR;
updateOCR=function(){
 const r=s50PriorUpdateOCR.apply(this,arguments);
 try{s50RetryUi();}catch(_){}
 return r;
};
const s50PriorAutoRun=s50AutoRun;
s50AutoRun=function(){
 if(s50ReplaceAt&&Date.now()-s50ReplaceAt<180000){
  s50ReplaceAt=0;
  try{s50DropOcr();}catch(e){try{console.warn('s50',e);}catch(_){}}
 }
 return s50PriorAutoRun.apply(this,arguments);
};
/* ===== a failed save is said where the parent is looking (the fixed bar), not only in a toast or a hidden line ===== */
function s50Err(msg){
 const dock=$('#v20-import-dock');
 let e=$('#s50-err');
 if(!e&&dock){
  e=document.createElement('p');e.id='s50-err';e.className='s50-err';e.setAttribute('role','alert');
  dock.prepend(e);
 }
 if(e){e.textContent=msg||'';e.hidden=!msg;}
 if(msg)try{toast(msg,'bad');}catch(_){}
}
