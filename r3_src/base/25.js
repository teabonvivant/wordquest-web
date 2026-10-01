
/* WordQuest V30 — deterministic content, strict local contracts, no UI or network. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.WQ30Core=f();})(globalThis,function(){
'use strict';
const MODES={study:{title:'學新詞',skill:'exposure'},meaning:{title:'看圖選字',skill:'meaning'},focus:{title:'找相同字塊',skill:'supported'},tiles:{title:'按字塊拼字',skill:'supported'},swap:{title:'換字變新詞',skill:'supported'},missing:{title:'補字母',skill:'supported'},sort:{title:'詞語分組',skill:'supported'},listenChoice:{title:'聽音選字',skill:'listeningChoice'},spell:{title:'自己串字',skill:'spelling'},listenSpell:{title:'聽音默字',skill:'dictation'},cloze:{title:'句子填字',skill:'context'},edit:{title:'找錯再改好',skill:'supported'},mixed:{title:'混合重溫',skill:'mixed'}};
const BAD=new Set(['__proto__','prototype','constructor']);
const clean=s=>String(s??'').normalize('NFKC').replace(/[’‘]/g,"'").trim().replace(/\s+/g,' ');
const canonical=s=>clean(s).toLowerCase();
const fail=m=>{throw Error('學習資料：'+m);};
function obj(o){if(!o||typeof o!=='object'||Array.isArray(o))fail('物件格式');for(const k of Object.keys(o))if(BAD.has(k))fail('不安全欄位');return o;}
function arr(a,n){if(!Array.isArray(a)||a.length>n)fail('清單上限');return a;}
function text(v,n=500){if(typeof v!=='string'||v.length>n||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail('文字格式');return v;}
function id(v){text(v,110);if(!/^[\w-]+$/.test(v)||BAD.has(v))fail('識別碼');return v;}
function int(v,min=0,max=1e15){if(!Number.isSafeInteger(v)||v<min||v>max)fail('整數範圍');return v;}
function bool(v){if(typeof v!=='boolean')fail('布林值');return v;}
function exact(o,keys){obj(o);if(Object.keys(o).some(k=>!keys.includes(k)))fail('未知欄位');}
function library(data){const words=new Map(data.words.map(w=>[w.id,w])),units=new Map(data.units.map(u=>[u.id,u])),questions=new Map(data.questions.map(q=>[q.id,q]));if(words.size!==data.words.length||units.size!==data.units.length||questions.size!==data.questions.length)fail('重複內容ID');return {data,words,units,questions};}
function seed(s){let n=2166136261;for(const c of s){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function shuffle(a,n){a=a.slice();for(let i=a.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;let j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function field(q){return q.mode==='missing'?q.missing:q.answer;}
function grade(q,answer,strict=true){const a=clean(answer),e=clean(field(q));const exactMatch=a===e,lexical=canonical(a)===canonical(e);return {correct:strict?exactMatch:lexical,exact:exactMatch,lexical,caseOnly:lexical&&!exactMatch,empty:!a};}
function masked(sentence,word){const re=new RegExp('(^|[^A-Za-z])('+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?=$|[^A-Za-z])','gi');let count=0;let value=sentence.replace(re,(_,a)=>{count++;return a+'＿＿';});return {valid:count>0,mask:value,count};}
function oneChange(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n+=a[i]!==b[i];return n===1;}
function makeQuestion(lib,target,mode,unit){
 const w=lib.words.get(target),u=lib.units.get(unit);if(!w||!u||!u.words.includes(target))return null;
 if(mode==='study')return {id:'q_'+target+'_study',target,mode,answer:w.form,version:1,prompt:w.meaning};
 if(['focus','sort'].includes(mode)){
  const f=u.focus[target];if(!f)return null;if(mode==='focus'){const stored=lib.questions.get('q_'+unit+'_'+target.slice(2)+'_focus');return stored?structuredClone(stored):null;}const labels=[...new Set(Object.values(u.focus).filter(Boolean).map(x=>x.label))];
  if(mode==='sort'&&labels.length<2)return null;
  return {id:'q_'+unit+'_'+target+'_'+mode,target,unit,mode,answer:f.label,version:1,prompt:mode==='sort'?'把詞語放進正確的字塊組':'這個詞包含哪個目標字塊？',indices:f.indices,choices:mode==='sort'?labels:[...new Set([...labels,'其他字塊'])]};
 }
 if(mode==='swap'){
  const peer=u.words.map(k=>lib.words.get(k)).find(v=>v.id!==target&&oneChange(v.form,w.form));
  if(!peer)return null;return {id:'q_'+unit+'_'+target+'_swap',target,unit,mode,answer:w.form,version:1,prompt:w.meaning,from:peer.form};
 }
 return lib.questions.get('q_'+target.slice(2)+'_'+mode)||null;
}
function allowed(lib,uid){const u=lib.units.get(uid);if(!u)return[];return Object.keys(MODES).filter(m=>m==='mixed'||u.words.some(k=>makeQuestion(lib,k,m,uid)));}
function initial(){return {version:1,children:{}};}
function child(){return {sessions:[],attempts:[],exposures:{},summary:{},assignment:null,source:'builtin',onboarded:false};}
function get(root,cid){id(cid);return root.children[cid]||(root.children[cid]=child());}
function pace(grade){return [0,2,3,4,4,5,5][grade]||3;}
function plan(lib,{uid,mode='lesson',count=4,childId,now=Date.now(),sessionId,terms=null}){
 const u=lib.units.get(uid);if(!u)fail('單元不存在');if(!MODES[mode]&&mode!=='lesson')fail('模式不存在');int(count,1,8);int(now,1);id(childId);id(sessionId);
 const ids=terms?terms.filter(x=>u.words.includes(x)):u.words.slice();const suitable=['lesson','mixed'].includes(mode)?ids:ids.filter(k=>makeQuestion(lib,k,mode,uid));const selected=[...new Set(suitable)].slice(0,count);let queue=[];
 if(mode==='lesson'){
  for(const stage of ['study','meaning','spell'])for(const k of selected){const q=makeQuestion(lib,k,stage,uid);if(q)queue.push(structuredClone(q));}
 }else selected.forEach((k,i)=>{const m=mode==='mixed'?['spell','meaning','missing','spell'][i%4]:mode;const q=makeQuestion(lib,k,m,uid);if(q)queue.push(structuredClone(q));});
 if(!queue.length)fail('這組內容不適合此模式，請改選其他玩法。');
 queue=queue.map((q,i)=>({...q,choices:q.choices?shuffle(q.choices,seed(sessionId+':'+i)):undefined}));
 return {id:sessionId,childId,unit:uid,mode,status:'active',contentVersion:lib.data.contentVersion,queue,index:0,draft:'',selected:'',tiles:[],feedback:null,startedAt:now,finishedAt:0,award:0,awarded:false,strict:true,exposedIndex:-1,hinted:false,audioHeard:false,audioStatus:'idle',replays:0};
}
function expose(c,words,now){int(now,1);for(const k of words){id(k);c.exposures[k]=Math.max(c.exposures[k]||0,now);}}
function summary(){return {seen:0,heard:0,meaning:0,spelling:0,dictation:0,supported:0,firstIndependent:0,lastIndependent:0,delayedAt:0,lastResult:null,lastAttempt:0,dueAt:0};}
function record(c,s,lib,answer,{now=Date.now(),technical=false}={}){
 int(now,1);if(s.finishedAt||s.index>=s.queue.length||s.feedback)return {duplicate:true};const q=s.queue[s.index],w=lib.words.get(q.target);if(!w)fail('詞語不存在');const aid=s.id+'-'+s.index;
 if(c.attempts.some(a=>a.id===aid))return {duplicate:true};if(['listenSpell','listenChoice'].includes(q.mode)&&!s.audioHeard&&!technical)fail('尚未成功聽完，這題未作評分。');
 const g=grade(q,answer,s.strict);if(!technical&&q.mode!=='study'&&g.empty)fail('先試填答案；留白不會扣分。');
 if(c.attempts.length>=16000)fail('已達紀錄容量，請先由家長備份；本題未提交。');
 const assisted=s.hinted||['focus','tiles','swap','missing','sort','edit'].includes(q.mode);
 const lastExposure=c.exposures[q.target]||0,recent=lastExposure>0&&now-lastExposure<600000;
 const exactCorrect=!technical&&g.exact;
 const skill=MODES[q.mode].skill,independent=exactCorrect&&!assisted&&!recent&&['spell','listenSpell','cloze'].includes(q.mode);
 const m=c.summary[q.target]||(c.summary[q.target]=summary());
 let delayed=false;
 if(q.mode==='study'){m.seen++;expose(c,[q.target],now);}else if(!technical){
  if(q.mode==='meaning'&&exactCorrect)m.meaning++;
  if(skill==='supported'&&exactCorrect)m.supported++;
  if(independent){m.spelling+=q.mode==='spell'?1:0;m.dictation+=q.mode==='listenSpell'?1:0;
   delayed=m.meaning>0&&m.firstIndependent>0&&now-m.firstIndependent>=86400000&&now-lastExposure>=86400000;
   m.firstIndependent=m.firstIndependent||now;m.lastIndependent=now;if(delayed)m.delayedAt=m.delayedAt||now;
  }
  m.lastResult=g.correct;m.lastAttempt=now;m.dueAt=now+(exactCorrect?86400000:3600000);
 }
 if(s.audioHeard)m.heard++;
 const a={id:aid,session:s.id,target:q.target,unit:s.unit,mode:q.mode,answer:clean(answer),correct:technical||q.mode==='study'?null:g.correct,exact:technical||q.mode==='study'?false:g.exact,technical,assisted,recent,independent,delayed,time:now,replays:s.replays,heard:s.audioHeard};
 c.attempts.push(a);
 s.feedback={correct:a.correct,exact:a.exact,technical,expected:field(q),answer:a.answer,caseOnly:g.caseOnly,independent,delayed};
 // Feedback reveals the answer AFTER the evidence has been classified.
 if(q.mode!=='study'&&!technical)expose(c,[q.target],now);
 return {attempt:a,summary:m};
}
function next(s,now=Date.now()){if(!s.feedback)return false;s.index++;s.draft='';s.selected='';s.tiles=[];s.feedback=null;s.hinted=false;s.audioHeard=false;s.audioStatus='idle';s.replays=0;if(s.index>=s.queue.length){s.finishedAt=now;s.status='completed';}return true;}
function metrics(c){const ss=Object.values(c.summary);return {seen:ss.filter(x=>x.seen).length,meaning:ss.filter(x=>x.meaning).length,independent:ss.filter(x=>x.firstIndependent).length,delayed:ss.filter(x=>x.delayedAt).length,weak:ss.filter(x=>x.lastResult===false).length,completed:c.sessions.filter(s=>s.status==='completed').length};}
function eligible(c,s){const graded=s.queue.filter(q=>q.mode!=='study');const records=c.attempts.filter(a=>a.session===s.id&&a.mode!=='study');return s.status==='completed'&&!!s.finishedAt&&graded.length>0&&graded.length===records.length&&records.every(a=>!a.technical)&&s.index===s.queue.length;}
function validateState(raw,children,lib){
 if(raw==null)return initial();exact(raw,['version','children']);if(raw.version!==1)fail('版本');const out=initial(),cids=new Set(children.map(c=>c.id));obj(raw.children);
 if(Object.keys(raw.children).length>50)fail('孩子容量');
 for(const [cid,v] of Object.entries(raw.children)){
  if(!cids.has(cid))continue;exact(v,['sessions','attempts','exposures','summary','assignment','source','onboarded']);const c=child();
  c.onboarded=bool(v.onboarded);c.source=text(v.source,30);if(!['builtin','school'].includes(c.source))fail('教材來源');
  obj(v.exposures);if(Object.keys(v.exposures).length>10000)fail('曝光容量');for(const [k,n]of Object.entries(v.exposures)){if(!lib.words.has(k))fail('曝光詞不存在');c.exposures[k]=int(n,1);}
  obj(v.summary);for(const [k,m]of Object.entries(v.summary)){
   if(!lib.words.has(k))fail('摘要詞不存在');exact(m,Object.keys(summary()));const o=summary();for(const key of Object.keys(o))if(key!=='lastResult')o[key]=int(m[key],0,key.endsWith('At')||key.includes('Independent')||['lastAttempt'].includes(key)?1e15:1000000);if(m.lastResult!==null&&typeof m.lastResult!=='boolean')fail('結果');o.lastResult=m.lastResult;c.summary[k]=o;
  }
  const aIDs=new Set();c.attempts=arr(v.attempts,16000).map(a=>{
   exact(a,['id','session','target','unit','mode','answer','correct','exact','technical','assisted','recent','independent','delayed','time','replays','heard']);id(a.id);id(a.session);if(aIDs.has(a.id))fail('重複作答');aIDs.add(a.id);
   if(!lib.words.has(a.target)||!lib.units.has(a.unit)||!MODES[a.mode])fail('作答內容');if(a.correct!==null&&typeof a.correct!=='boolean')fail('結果類型');
   for(const k of ['exact','technical','assisted','recent','independent','delayed','heard'])bool(a[k]);if(a.technical&&a.correct!==null)fail('技術失敗不能評分');if(a.independent&&(!a.exact||a.assisted||a.recent||a.technical||!['spell','listenSpell','cloze'].includes(a.mode)))fail('獨立證據矛盾');if(a.delayed&&!a.independent)fail('延後證據矛盾');
   text(a.answer);int(a.time,1);int(a.replays,0,1000);return {...a};
  });
  const sessions=new Set();c.sessions=arr(v.sessions,1000).map(s=>{
   exact(s,['id','childId','unit','mode','status','contentVersion','queue','index','draft','selected','tiles','feedback','startedAt','finishedAt','award','awarded','strict','exposedIndex','hinted','audioHeard','audioStatus','replays']);id(s.id);if(sessions.has(s.id)||s.childId!==cid)fail('學習歸屬');sessions.add(s.id);
   if(!lib.units.has(s.unit)||!MODES[s.mode]&&s.mode!=='lesson')fail('課程模式');if(!['active','completed','abandoned'].includes(s.status))fail('課程狀態');if((s.status==='active')!==!s.finishedAt)fail('完成狀態矛盾');text(s.contentVersion,60);const qs=arr(s.queue,30).map(q=>{
    obj(q);if(!lib.words.has(q.target)||!lib.units.get(s.unit).words.includes(q.target)||!MODES[q.mode])fail('題目目標');const expected=makeQuestion(lib,q.target,q.mode,s.unit);if(!expected)fail('不適用題型');
    if(q.answer!==expected.answer||q.prompt!==expected.prompt||q.version!==1)fail('題目答案已更改');
    for(const k of ['mask','missing','position','incorrect','from'])if(q[k]!==expected[k])fail('題目結構已更改');
    if(expected.choices){arr(q.choices,6);if(new Set(q.choices).size!==q.choices.length||[...q.choices].sort().join('\u0000')!==[...expected.choices].sort().join('\u0000'))fail('選項損壞');}
    else if(q.choices!=null)fail('多餘選項');
    return {...expected,...(q.choices?{choices:q.choices.slice()}:{} )};
   });if(!qs.length)fail('空課程');int(s.index,0,qs.length);int(s.startedAt,1);int(s.finishedAt);if(s.finishedAt&&s.finishedAt<s.startedAt)fail('時間倒退');if(s.finishedAt&&s.index!==qs.length)fail('完成位置');int(s.award,0,2);bool(s.awarded);bool(s.strict);bool(s.hinted);int(s.exposedIndex,-1,qs.length-1);
   text(s.draft);text(s.selected,300);if(s.index<qs.length&&s.selected&&!qs[s.index].choices?.includes(s.selected))fail('未列出的選項');const tiles=arr(s.tiles,100).map(n=>int(n,0,100));if(new Set(tiles).size!==tiles.length)fail('重複字塊');if(tiles.length&&(qs[s.index]?.mode!=='tiles'||tiles.some(i=>i>=qs[s.index].answer.length)))fail('字塊範圍');
   if(s.feedback){exact(s.feedback,['correct','exact','technical','expected','answer','caseOnly','independent','delayed']);if(!aIDs.has(s.id+'-'+s.index))fail('回饋缺作答');for(const k of ['exact','technical','caseOnly','independent','delayed'])bool(s.feedback[k]);text(s.feedback.expected);text(s.feedback.answer);const a=c.attempts.find(x=>x.id===s.id+'-'+s.index);if(s.index>=qs.length||s.feedback.expected!==field(qs[s.index])||s.feedback.answer!==a.answer||s.feedback.correct!==a.correct||s.feedback.exact!==a.exact||s.feedback.technical!==a.technical||s.feedback.independent!==a.independent||s.feedback.delayed!==a.delayed)fail('回饋與作答不符');}
   const records=c.attempts.filter(a=>a.session===s.id);for(const a of records){const qi=Number(a.id.slice(s.id.length+1));const q=qs[qi];if(!Number.isInteger(qi)||!q||qi>s.index||a.target!==q.target||a.unit!==s.unit||a.mode!==q.mode||a.time<s.startedAt)fail('作答次序或歸屬不符');const g=grade(q,a.answer,s.strict);if(q.mode!=='study'&&!a.technical&&(a.exact!==g.exact||a.correct!==g.correct))fail('判分與原答案不符');}if(s.status==='completed'&&records.length!==qs.length)fail('完成但作答不齊');if(s.status==='active'&&records.length!==s.index+(s.feedback?1:0))fail('作答位置不符');return {...s,queue:qs,tiles,audioHeard:false,audioStatus:'idle',replays:int(s.replays,0,1000)};
  });
  if(c.sessions.filter(s=>s.status==='active').length>1)fail('多個進行中課程');for(const a of c.attempts)if(!sessions.has(a.session))fail('作答缺課程');if(v.assignment){exact(v.assignment,['unit','count','byParent','at']);if(!lib.units.has(v.assignment.unit))fail('指定課');c.assignment={unit:v.assignment.unit,count:int(v.assignment.count,1,8),byParent:bool(v.assignment.byParent),at:int(v.assignment.at,1)};}
  out.children[cid]=c;
 }
 return out;
}
return {MODES,clean,canonical,library,seed,shuffle,grade,masked,oneChange,makeQuestion,allowed,initial,child,get,pace,plan,expose,record,next,metrics,eligible,validateState};
});

