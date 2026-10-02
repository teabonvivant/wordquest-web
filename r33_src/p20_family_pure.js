/* R3.3 p20 pure helpers (family data safety). No DOM, no storage, no IndexedDB: everything here is a plain function
 * so Node tests can load it directly. The patch module embeds this file verbatim in front of p20_family_data.js.
 *
 * Contents
 *  - rescue decision table for a leftover recovery marker (WQ32-01)
 *  - media garbage-collection tombstone + orphan-key helpers (WQ32-02)
 *  - stored-data check used before a rescue export
 *  - "does this click need the parent gate" predicate for dialogs (N11)
 */
(function(root,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;root.WQP20=a;})(globalThis,function(){
 'use strict';
 const MARKERS=['prepared','committed','rolled-back'];
 const TOMB_MAX=8000,TOMB_KEY_PREFIX='wq-r3-media-gc:';
 const MSG={
  recover:'復原日誌完整。請先按「恢復中斷交易」，把資料恢復到上次交易前；不要用備份或清除去覆蓋完好的復原日誌。',
  error:'未能讀取復原日誌庫（瀏覽器儲存可能被封鎖或有其他分頁佔用）。為免覆蓋資料，救援還原和清除暫停。請關閉其他分頁、檢查瀏覽器儲存設定，再重新開啟本頁。'
 };

 /* ---- WQ32-01: rescue decision -------------------------------------------------------------- */
 // marker: raw localStorage value of wq-r3-recovery:<owner> (null when absent).
 // jstate: 'ok' (valid journal) | 'missing' | 'invalid' | 'error' (journal store could not be read).
 // mode 'none'            no marker, nothing to rescue
 //      'rescue'          marker exists but the journal cannot restore it: a family backup may replace the data
 //      'refuse-recover'  the journal is usable (or the marker is committed / rolled-back): "恢復中斷交易" must run first
 //      'refuse-error'    the journal store is unreadable: change nothing
 function rescueDecision(marker,jstate){
  if(marker===null||marker===undefined||marker==='')return {mode:'none',reason:'no-marker',message:''};
  if(jstate==='error')return {mode:'refuse-error',reason:'journal-unreadable',message:MSG.error};
  if(!MARKERS.includes(marker))return {mode:'rescue',reason:'marker-unknown',message:''};
  if(marker!=='prepared')return {mode:'refuse-recover',reason:'marker-'+marker,message:MSG.recover};
  if(jstate==='ok')return {mode:'refuse-recover',reason:'journal-ok',message:MSG.recover};
  if(jstate==='missing')return {mode:'rescue',reason:'journal-missing',message:''};
  if(jstate==='invalid')return {mode:'rescue',reason:'journal-invalid',message:''};
  return {mode:'refuse-error',reason:'journal-unreadable',message:MSG.error};
 }
 // validate(row) must throw for an unusable journal (the host passes the same validators r3Recover uses).
 function journalStatus(row,validate){
  if(row===undefined||row===null)return 'missing';
  try{validate(row);return 'ok';}catch(_){return 'invalid';}
 }
 // Text shown at the top of the family panel while a marker exists.
 function rescueGuide(decision,jstate){
  const d=decision||{mode:'none'};
  if(d.mode==='none')return {kind:'none',title:'',text:''};
  if(d.mode==='refuse-recover')return {kind:'recover',title:'上次家庭交易未完成：請先恢復',text:MSG.recover};
  if(d.mode==='refuse-error')return {kind:'error',title:'未能讀取復原日誌',text:MSG.error};
  const why=d.reason==='journal-missing'?'找不到復原日誌':d.reason==='journal-invalid'?'復原日誌已損壞':'未完成標記的內容不明';
  return {kind:'rescue',title:'上次家庭交易未完成（'+why+'）',
   text:'系統不能自動恢復，作答與存檔已暫停，以免弄壞資料。請按次序處理：①先按「匯出家庭完整備份」留一份現場資料（可能不完整，只作保存）。②按「還原家庭備份」，選最近一次有效的家庭備份檔；成功後未完成標記會自動清除。③真的沒有備份，才用下面的「清除目前帳戶資料（最後手段）」重新開始（所有孩子、教材和紀錄會清空）。'};
 }
 // A rescue export must never produce an empty or damaged backup that looks complete.
 function rescueExportCheck(raw,validate){
  if(typeof raw!=='string'||!raw)return {ok:false,reason:'現場沒有家庭主資料，沒有產生空白備份。'};
  let o;try{o=JSON.parse(raw);}catch(_){return {ok:false,reason:'現場家庭主資料已損壞，沒有產生備份。'};}
  try{validate(o);}catch(_){return {ok:false,reason:'現場家庭主資料未通過檢查，沒有產生備份。'};}
  if(!o||!Array.isArray(o.children)||!o.children.length)return {ok:false,reason:'現場家庭主資料沒有任何孩子，沒有產生空白備份。'};
  return {ok:true,reason:''};
 }

 /* ---- WQ32-02: media tombstone + orphan keys ----------------------------------------------- */
 const tombKey=owner=>TOMB_KEY_PREFIX+owner;
 function normIds(list){
  const seen=new Set(),out=[];
  if(!Array.isArray(list))return out;
  for(const x of list){if(typeof x!=='string'||!x||x.length>200||seen.has(x))continue;seen.add(x);out.push(x);}
  return out.length>TOMB_MAX?out.slice(out.length-TOMB_MAX):out; // over the cap: the oldest ids are dropped (export filter still hides their media)
 }
 function parseTombstone(raw){
  if(typeof raw!=='string'||!raw)return [];
  let o;try{o=JSON.parse(raw);}catch(_){return [];}
  if(!o||typeof o!=='object'||o.v!==1||!Array.isArray(o.ids))return [];
  return normIds(o.ids);
 }
 const serializeTombstone=ids=>JSON.stringify({v:1,ids:normIds(ids)});
 const mergeTombstone=(existing,add)=>normIds([...(existing||[]),...(add||[])]);
 function subtractTombstone(ids,remove){const r=new Set(remove||[]);return (ids||[]).filter(x=>!r.has(x));}

 // image:<wordId>:<text> and note:<wordId>:<text>. audio:* is account-shared and never touched.
 function mediaKind(key){if(typeof key!=='string')return null;const m=/^(image|note):/.exec(key);return m?m[1]:null;}
 // Every substring between the kind prefix and a later ':' is a possible word id (ids are uuid-like, but text may hold ':').
 function wordIdCandidates(key){
  const k=mediaKind(key);if(!k)return null;
  const rest=key.slice(k.length+1),out=[];
  for(let i=1;i<rest.length;i++)if(rest[i]===':')out.push(rest.slice(0,i));
  return out;
 }
 // Orphan = a well-formed image:/note: key whose word id is not in the live set. Unknown formats are kept.
 function isOrphanMediaKey(key,live){
  const c=wordIdCandidates(key);
  if(!c||!c.length)return false;
  return !c.some(id=>live.has(id));
 }
 function liveMediaRows(rows,words){
  const live=new Set((words||[]).map(w=>w&&w.id).filter(x=>typeof x==='string'));
  return (rows||[]).filter(r=>!isOrphanMediaKey(r&&r.key,live));
 }
 // Keys to delete for a set of deleted word ids. A word id that is still live always wins.
 function gcMatch(key,tombIds,live){
  const c=wordIdCandidates(key);
  if(!c||!c.length)return false;
  return c.some(id=>tombIds.has(id))&&!c.some(id=>live.has(id));
 }

 /* ---- N11: which clicks inside an open dialog need the parent gate ----------------------------- */
 const R3_GATED=['export-family','choose-family','confirm-restore','recover','legacy-math','save-plan','save-voice'];
 // a: {act,admin,pg,r3,r32,inR3Dialog} (dataset values or null); parentActions: the app's v23ParentActions Set.
 function needsParentGate(a,parentActions){
  if(!a)return false;
  if(a.admin!=null)return true;
  if(a.pg==='save-settings')return true;
  if(a.act&&parentActions&&parentActions.has(a.act))return true;
  if(a.inR3Dialog&&a.r3&&R3_GATED.includes(a.r3))return true;
  if(a.inR3Dialog&&a.r32!=null)return true;
  return false;
 }

 return Object.freeze({MARKERS,TOMB_MAX,MSG,rescueDecision,journalStatus,rescueGuide,rescueExportCheck,tombKey,parseTombstone,serializeTombstone,
  mergeTombstone,subtractTombstone,mediaKind,wordIdCandidates,isOrphanMediaKey,liveMediaRows,gcMatch,R3_GATED,needsParentGate});
});
