/* R3.3 p20 host code (runs inside the main script scope, just before installMediaEvents();render();).
 * Depends on WQP20 (p20_family_pure.js, embedded in front of this file) and on the main script's own bindings.
 *   WQ32-01  rescue mode for a leftover recovery marker whose journal is missing/invalid
 *   WQ32-02  IndexedDB media cleanup after deleteChild (tombstone + retry) and orphan filtering on export/restore
 *   N11      parent gate shown INSIDE the open dialog when the 5-minute parent confirmation has expired
 * Ordinary writes stay blocked while a marker exists (v24CanWrite / save / v24GuardEvent are untouched):
 * only the family management actions use the dedicated rescue path (r3Parent(true), r3Transaction(...,{rescue:true})).
 */

/* ---- shared helpers: function declarations so patched call sites work even before this block has executed ---- */
function wq20Marked(){try{return isLoggedIn()&&!!localStorage.getItem(r3Marker());}catch(_){return false;}}
function wq20MarkerLeased(){try{return wq20Marked()&&v23HasLease();}catch(_){return false;}}
function wq20MarkerMsg(){return '上次家庭交易未完成，已暫停寫入。請到「家長 → 家庭管理」按「恢復中斷交易」；日誌遺失時，請用家庭備份還原。';}
function wq20BlockedText(){if(wq20MarkerLeased())return wq20MarkerMsg();return loadBlocked?'原有資料需要恢復；目前不會改動。':v23CapabilityError();}
function wq20SafeSettings(){try{return r3Settings();}catch(e){if(wq20Marked())return F3.defaults();throw e;}}
function wq20RestoreNote(){return wq20Marked()?'<strong>上次家庭交易未完成：</strong>還原成功後，未完成標記會一併清除並解除暫停寫入；若還原失敗，目前資料和標記會保留。':'';}
function wq20ValidateJournal(owner){return j=>{WQR32Safety.validateJournal(j,owner,DBKEY_PREFIX+owner);validateDb(JSON.parse(j.before[DBKEY_PREFIX+owner]));};}

/* ---- WQ32-01: rescue mode ------------------------------------------------------------------------------------ */
// Reads the marker and the journal and classifies them. Never writes.
async function wq20Inspect(){
 const owner=accountId(),marker=localStorage.getItem(r3Marker(owner));let row,jstate;
 try{row=await r3Journal('get',owner);jstate=WQP20.journalStatus(row,wq20ValidateJournal(owner));}catch(_){row=undefined;jstate='error';}
 return {owner,marker,row,jstate,decision:WQP20.rescueDecision(marker,jstate)};
}
// Throws unless a family backup / reset may replace the data right now (journal unusable). Returns the inspection.
async function wq20RescueCheck(){
 const info=await wq20Inspect();
 if(info.decision.mode==='none')throw Error('未完成標記已不存在，請重新操作。');
 if(info.decision.mode!=='rescue')throw Error(info.decision.message);
 return info;
}
// Called by r3Transaction (rescue) before anything is changed. The current state becomes a NEW valid journal
// (label 'rescue-before'), so a crash during the replacement is recoverable with "恢復中斷交易".
async function wq20RescueBegin(owner,before,beforeMedia){
 const info=await wq20RescueCheck();
 if(info.owner!==owner)throw Error('帳戶已改變，沒有改動任何資料。');
 try{WQR32Safety.validateJournal({owner,before,beforeMedia,at:Date.now(),label:'rescue-before'},owner,DBKEY_PREFIX+owner);}
 catch(e){throw Error('現場資料不完整，不能先建立安全快照，沒有改動任何資料：'+e.message);}
 return {marker:info.marker,row:info.row};
}
// Failure after the replacement started: put the in-memory live state back and keep the original marker and journal.
async function wq20RescueRollback(owner,before,beforeMedia,orig){
 r3ReplaceKV(owner,before);
 await r3ReplaceMedia(owner,beforeMedia||[]);
 if(orig&&orig.row&&typeof orig.row==='object'&&orig.row.owner===owner){try{await r3Journal('put',orig.row);}catch(_){await r3Journal('delete',owner);}}
 else await r3Journal('delete',owner);
 localStorage.setItem(r3Marker(owner),orig&&orig.marker!=null?orig.marker:'prepared');
}
function wq20RescueExportCheck(){
 const r=WQP20.rescueExportCheck(localStorage.getItem(dbKey()),validateDb);
 if(!r.ok)throw Error(r.reason);
}
// Family panel: explanation on top, buttons that make no sense during a rescue disabled.
const wq20PriorPanel=r3Panel;
r3Panel=function(){
 if(!wq20Marked())return wq20PriorPanel.apply(this,arguments);
 r3Parent(true); // gate / lease errors must reach the caller
 let d;
 try{d=wq20PriorPanel.apply(this,arguments);}catch(_){d=wq20MinimalPanel();} // damaged family settings must not hide the restore button
 wq20DecoratePanel();
 return d;
};
function wq20MinimalPanel(){
 return r3Dialog('家庭備份與救援','<div class="r3-grid"><section><h2>備份與還原</h2><button class="btn primary" data-r3="export-family">匯出家庭完整備份</button><button class="btn secondary" data-r3="choose-family">還原家庭備份</button><input id="r3-family-file" type="file" accept=".json,application/json" hidden><button class="btn soft" data-r3="recover">恢復中斷交易</button></section></div>');
}
function wq20DecoratePanel(){
 const dlg=document.getElementById('r3-dialog');if(!dlg)return;
 dlg.querySelector('#wq20-rescue')?.remove();
 const box=document.createElement('section');box.id='wq20-rescue';box.className='dangerbox';box.setAttribute('role','status');
 box.innerHTML='<h2 style="margin:0 0 6px">救援說明</h2><p id="wq20-rescue-text" style="margin:0">正在檢查復原日誌…</p><div id="wq20-rescue-actions" style="margin-top:8px"></div>';
 (dlg.querySelector('#r3-dialog-body')||dlg).prepend(box);
 for(const b of dlg.querySelectorAll('[data-r3="save-plan"],[data-r3="save-voice"],[data-r3="legacy-math"]')){b.disabled=true;b.title='上次家庭交易未完成，這個功能暫停。';}
 void wq20FillRescue(dlg);
}
async function wq20FillRescue(dlg){
 let info=null;try{info=await wq20Inspect();}catch(_){}
 if(!dlg.isConnected)return;
 const decision=info?info.decision:WQP20.rescueDecision(localStorage.getItem(r3Marker())||'x','error'),g=WQP20.rescueGuide(decision,info?info.jstate:'error');
 const text=dlg.querySelector('#wq20-rescue-text'),acts=dlg.querySelector('#wq20-rescue-actions');if(!text)return;
 dlg.querySelector('#wq20-rescue')?.setAttribute('data-kind',g.kind);
 if(g.kind==='none'){dlg.querySelector('#wq20-rescue')?.remove();return;}
 text.textContent='';const h=document.createElement('strong');h.textContent=g.title;text.append(h,document.createElement('br'),document.createTextNode(g.text));
 if(g.kind!=='rescue'){for(const b of dlg.querySelectorAll('[data-r3="choose-family"]')){b.disabled=true;b.title=g.kind==='recover'?'請先按「恢復中斷交易」':'暫時不能還原';}}
 if(g.kind==='rescue'&&acts){acts.innerHTML='<button class="btn quiet" type="button" data-wq20="reset">清除目前帳戶資料（最後手段）</button>';}
}

/* ---- WQ32-02: IndexedDB media cleanup -------------------------------------------------------------------------- */
let wq20GcBusy=null,wq20GcAgain=false,wq20GcBackoff=0;
function wq20TombRead(owner){try{return WQP20.parseTombstone(localStorage.getItem(WQP20.tombKey(owner)));}catch(_){return [];}}
function wq20TombWrite(owner,ids){try{if(ids.length)localStorage.setItem(WQP20.tombKey(owner),WQP20.serializeTombstone(ids));else localStorage.removeItem(WQP20.tombKey(owner));return true;}catch(_){return false;}}
function wq20DropMediaCache(owner,keys){
 if(owner!==mediaOwner)return;
 for(const k of keys){const u=mediaUrls.get(k);if(u){try{URL.revokeObjectURL(u);}catch(_){}mediaUrls.delete(k);}mediaCache.delete(k);}
}
// One readwrite transaction deletes every image:/note: row of the deleted words; audio:* (account-shared) is never touched.
async function wq20GcDelete(owner,tomb,live){
 const d=await openMediaDb();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction('assets','readwrite'),st=tx.objectStore('assets'),removed=[];
  const rq=st.index('owner').openCursor(IDBKeyRange.only(owner));
  rq.onsuccess=()=>{const c=rq.result;if(!c)return;const k=c.value&&c.value.key;if(WQP20.gcMatch(k,tomb,live)){removed.push(k);c.delete();}c.continue();};
  rq.onerror=()=>{};
  tx.oncomplete=()=>resolve(removed);tx.onabort=()=>reject(tx.error||Error('教材清理失敗'));tx.onerror=()=>{};
 });
}
async function wq20GcOnce(owner,opts){
 if(!owner||owner==='guest'||!isLoggedIn()||accountId()!==owner)return 0;
 const live=new Set(db.words.map(w=>w.id)),stored=wq20TombRead(owner),all=WQP20.mergeTombstone(stored,opts&&opts.ids),pending=all.filter(id=>!live.has(id));
 if(!pending.length){if(stored.length)wq20TombWrite(owner,[]);return 0;} // only live words left in the list: nothing to delete, forget them
 const tomb=new Set(pending),removed=await wq20GcDelete(owner,tomb,live);
 // processed ids (and ids that came back to life) leave the tombstone; ids added while the transaction ran stay
 const liveNow=new Set(db.words.map(w=>w.id)); // fresh set: a child deleted while this run was in flight must keep its ids
 wq20TombWrite(owner,wq20TombRead(owner).filter(id=>!tomb.has(id)&&!liveNow.has(id)));
 wq20DropMediaCache(owner,removed);
 return removed.length;
}
// Single flight. A request that arrives while a run is active makes it run once more afterwards.
function wq20MediaGc(owner,opts){
 if(wq20GcBusy){wq20GcAgain=true;return wq20GcBusy;}
 const run=(async()=>{try{let n=0;do{wq20GcAgain=false;n+=await wq20GcOnce(owner,opts);}while(wq20GcAgain);return n;}finally{wq20GcBusy=null;}})();
 wq20GcBusy=run;return run;
}
function wq20GcFailed(){wq20GcBackoff=performance.now()+30000;}
// Timer retry: only the writer tab, no marker, no data transaction, 30 s back-off after a failure.
function wq20GcTick(){
 try{
  if(!isLoggedIn()||wq20GcBusy||performance.now()<wq20GcBackoff)return;
  const owner=accountId();if(!owner||!localStorage.getItem(WQP20.tombKey(owner)))return;
  if(!v23HasLease()||loadBlocked||r3Busy||mediaBusy||localStorage.getItem(r3Marker(owner)))return;
  wq20MediaGc(owner).catch(wq20GcFailed);
 }catch(_){}
}
setInterval(wq20GcTick,4000);setTimeout(wq20GcTick,1200);
// Outermost deleteChild layer: record the word ids first (crash safety), delete, then clean IndexedDB.
const wq20PriorDelete=deleteChild;
deleteChild=function(id){
 let owner='',ids=[],wrote=false,prior=null;
 try{
  if(isLoggedIn()){owner=accountId();ids=db.words.filter(w=>w.childId===id).map(w=>w.id).filter(x=>typeof x==='string');}
  if(owner&&ids.length){prior=localStorage.getItem(WQP20.tombKey(owner));wrote=wq20TombWrite(owner,WQP20.mergeTombstone(WQP20.parseTombstone(prior),ids));}
 }catch(_){}
 const undo=()=>{if(!wrote)return;try{if(prior===null)localStorage.removeItem(WQP20.tombKey(owner));else localStorage.setItem(WQP20.tombKey(owner),prior);}catch(_){}};
 let out;
 try{out=wq20PriorDelete.apply(this,arguments);}catch(e){undo();throw e;}
 let gone=false;try{gone=!db.children.some(c=>c.id===id);}catch(_){}
 if(!gone){undo();return out;} // cancelled or failed: the child (and its media) stay, the tombstone goes back to what it was
 if(ids.length&&owner){
  wq20MediaGc(owner,{ids}).catch(()=>{wq20GcFailed();if(!wrote)wq20TombWrite(owner,WQP20.mergeTombstone(wq20TombRead(owner),ids));});
 }
 return out;
};
// Export: retry pending cleanups first (not during a rescue), then hide orphans. Restore filters the same way.
async function wq20ExportMediaRows(owner){
 if(!wq20Marked()){try{await wq20MediaGc(owner);}catch(_){wq20GcFailed();}}
 return WQP20.liveMediaRows(await readMediaOwner(owner),db.words);
}
function wq20LiveMediaRows(rows,words){return WQP20.liveMediaRows(rows,words);}

/* ---- N11: parent gate inside the open dialog --------------------------------------------------------------------- */
let wq20GateBtn=null;
function wq20DialogGate(e){
 if(!isLoggedIn()||v23ParentAllowed())return;
 const t=e.target;if(!t||!t.closest)return;
 const dlg=t.closest('dialog[open]');if(!dlg||dlg.id==='wqm-dialog'||t.closest('#wq20-gate'))return;
 const pick=(sel,key)=>{const el=t.closest(sel);return el?el.dataset[key]:null;};
 const a={act:pick('[data-act]','act'),admin:pick('[data-admin]','admin'),pg:pick('[data-pg]','pg'),r3:pick('[data-r3]','r3'),r32:pick('[data-r32]','r32'),inR3Dialog:!!t.closest('#r3-dialog')};
 if(!WQP20.needsParentGate(a,v23ParentActions))return;
 e.preventDefault();e.stopImmediatePropagation(); // the inherited handler would draw the gate into #app, i.e. behind this modal
 wq20ShowGate(dlg,t.closest('button,[data-act],[data-r3],[data-r32]')||t);
}
function wq20ShowGate(dlg,btn){
 dlg.querySelector('#wq20-gate')?.remove();wq20GateBtn=btn;
 const label=((btn&&btn.textContent)||'').trim().slice(0,30),box=document.createElement('div');
 box.id='wq20-gate';box.className='dangerbox';box.setAttribute('role','group');box.setAttribute('aria-label','家長驗證');box.style.cssText='margin:12px 0;display:grid;gap:8px';
 box.innerHTML='<strong>家長驗證已過期，請重新輸入密碼</strong><p class="small" style="margin:0">家長確認只維持 5 分鐘。驗證後會回到這個視窗，已填寫的內容不會丟失；然後請再按一次'+(label?'「'+esc(label)+'」':'剛才的按鈕')+'。</p><label for="wq20-gate-password">家長密碼</label><input id="wq20-gate-password" class="input" type="password" maxlength="128" autocomplete="current-password"><div><button type="button" class="btn primary" data-wq20="gate-unlock">確認家長身份</button></div><p id="wq20-gate-error" role="status" style="margin:0"></p>';
 const foot=dlg.querySelector('.v20-dialog-foot'),body=dlg.querySelector('#r3-dialog-body');
 if(foot)foot.before(box);else if(body)body.prepend(box);else dlg.append(box);
 const input=box.querySelector('#wq20-gate-password');try{box.scrollIntoView({block:'nearest'});input.focus();}catch(_){}
}
// Same verification, throttling and lock-out as v23Unlock, but no render(): the page behind the dialog is left alone.
async function wq20GateUnlock(){
 if(authBusy)return;const box=document.getElementById('wq20-gate');if(!box)return;
 const owner=v23Owner(),pw=document.getElementById('wq20-gate-password')?.value||'',say=t=>{const e=document.getElementById('wq20-gate-error');if(e)e.textContent=t;};
 if(performance.now()<v23AuthBlockedUntil){say('嘗試太多，請稍後再試。');return;}
 authBusy=true;
 try{
  if(!await WQAuth.verify(pw,currentAccount())){v23AuthFailures++;if(v23AuthFailures>=5)v23AuthBlockedUntil=performance.now()+30000;say('密碼不正確。');return;}
  if(owner!==v23Owner()){say('孩子或帳戶已切換，請關閉視窗後重新操作。');return;}
  v23AuthFailures=0;v23ParentOwner=owner;v23ParentUntil=performance.now()+300000;
  const label=((wq20GateBtn&&wq20GateBtn.textContent)||'').trim().slice(0,30),b=document.getElementById('wq20-gate');
  if(b){b.className='notice';b.setAttribute('role','status');b.innerHTML='<strong>已完成家長驗證</strong><p style="margin:0">請再按一次'+(label?'「'+esc(label)+'」':'剛才的按鈕')+'。</p>';}
  if(wq20GateBtn&&wq20GateBtn.isConnected)try{wq20GateBtn.focus();}catch(_){}
 }catch(err){say(err.message);}finally{authBusy=false;}
}
window.addEventListener('click',e=>{try{wq20DialogGate(e);}catch(_){}},true);
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-wq20]');if(!b)return;e.preventDefault();
 const act=b.dataset.wq20;
 if(act==='gate-unlock')void wq20GateUnlock();
 else if(act==='reset'){document.getElementById('r3-dialog')?.close();void resetAll();}
});
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='wq20-gate-password'&&e.key==='Enter'&&!e.repeat&&!e.isComposing){e.preventDefault();void wq20GateUnlock();}});
