
/* V31: deterministic assembly learning, no network/UI. Do not treat client data as trusted. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.WQ31Core=f();})(globalThis,function(){
'use strict';
const KIND={chunk:'加字塊，記新詞',compound:'兩個詞合成',blend:'剪字塊，混新詞'};
const STEPS={notice:'先認識基本部分',assemble:'自己動手組合',meaning:'理解新詞意思',recall:'收起提示，自己串'};
const MAX_EVENTS=8000,MAX_SESSIONS=400,WAIT=600000,DAY=86400000;
const bad=new Set(['__proto__','prototype','constructor']);
function fail(m){throw Error('組合工房：'+m);}
function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))fail('物件格式');for(const k of Object.keys(v))if(bad.has(k))fail('保留欄位');return v;}
function exact(v,keys){obj(v);if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('欄位缺少或多出');}
function array(a,n){if(!Array.isArray(a)||a.length>n)fail('清單容量');return a;}
function num(n,min=0,max=1e15){if(!Number.isSafeInteger(n)||n<min||n>max)fail('整數範圍');return n;}
function text(s,n=160){if(typeof s!=='string'||s.length>n||/[\u0000-\u001f]/.test(s))fail('文字格式');return s;}
function id(s){text(s,100);if(!/^[\w-]+$/.test(s)||bad.has(s))fail('識別碼');return s;}
function bool(b){if(typeof b!=='boolean')fail('布林值');return b;}
function clean(s){return String(s??'').normalize('NFKC').replace(/[’‘]/g,"'").trim().replace(/\s+/g,' ');}
function library(d){
 const groups=new Map(),recipes=new Map();
 for(const g of array(d.groups,200)){id(g.id);if(groups.has(g.id)||!KIND[g.kind])fail('組別');groups.set(g.id,g);}
 for(const r of array(d.recipes,3000)){id(r.id);if(recipes.has(r.id)||!groups.has(r.group)||groups.get(r.group).kind!==r.kind)fail('重複或不明詞');
  if(!/^[a-z]+$/.test(r.form)||r.parts.join('')!==r.form||r.sources.length!==r.parts.length)fail('組合與答案不符');
  r.sources.forEach((s,i)=>{num(s.start,0,s.word.length);num(s.end,s.start+1,s.word.length);if(s.word.slice(s.start,s.end)!==r.parts[i]||s.take!==r.parts[i])fail('剪取位置不符');if(r.kind==='compound'&&s.word!==s.take)fail('完整合成詞被剪短');});
  recipes.set(r.id,r);
 }
 for(const g of groups.values())if(!g.recipes.length||new Set(g.recipes).size!==g.recipes.length||g.recipes.some(k=>recipes.get(k)?.group!==g.id))fail('組別詞表');
 return {data:d,groups,recipes};
}
function initial(){return {version:1,children:{}};}
function child(){return {sessions:[],events:[],exposures:{},assignment:null};}
function get(root,cid){id(cid);return root.children[cid]||(root.children[cid]=child());}
function active(c){return c.sessions.find(s=>s.status==='active')||null;}
function expected(lib,q){const r=lib.recipes.get(q.recipe);if(!r||!STEPS[q.step])fail('題目不存在');return q.step==='meaning'?r.meaning:r.form;}
function create(lib,c,{group,mode='guided',count=3,childId,sessionId,now=Date.now(),terms=null}){
 id(childId);id(sessionId);num(now,1);num(count,1,6);const g=lib.groups.get(group);if(!g||!['guided','build','recall'].includes(mode))fail('組別或玩法不存在');
 if(active(c))fail('先繼續或結束上一組');if(c.sessions.length>=MAX_SESSIONS||c.events.length+count*4>MAX_EVENTS)fail('紀錄已達容量；請家長先備份');if(c.sessions.some(s=>s.id===sessionId))fail('課程編號重複');
 let ids=terms||g.recipes;array(ids,20);if(!ids.length||ids.some(k=>!g.recipes.includes(k)))fail('指定詞不屬於本組');ids=[...new Set(ids)].slice(0,count);
 const steps=mode==='guided'?['notice','assemble','meaning','recall']:mode==='build'?['assemble','meaning']:['recall'];
 const queue=ids.flatMap(recipe=>steps.map(step=>({recipe,step})));
 const s={id:sessionId,childId,group,mode,queue,index:0,status:'active',startedAt:now,finishedAt:0,draft:'',picked:[],cuts:[],hinted:false,feedback:null,award:0,settled:false};c.sessions.push(s);return s;
}
function expose(c,ids,now){num(now,1);for(const k of ids){id(k);c.exposures[k]=Math.max(c.exposures[k]||0,now);}}
function submit(lib,c,s,answer,{now=Date.now(),externalExposure=0}={}){
 num(now,s.startedAt);num(externalExposure);if(s.status!=='active'||s.feedback)return {duplicate:true};const q=s.queue[s.index],r=lib.recipes.get(q.recipe),key=s.id+'_'+s.index;
 if(c.events.some(e=>e.id===key))return {duplicate:true};if(c.events.length>=MAX_EVENTS)fail('作答紀錄已滿');
 const value=clean(answer);if(q.step!=='notice'&&!value)fail('先試一試，空白不會當作答錯');text(value);
 const correct=q.step==='notice'?true:value===clean(expected(lib,q)),lastExposure=Math.max(c.exposures[q.recipe]||0,externalExposure),recent=lastExposure>0&&now-lastExposure<WAIT;
 const independent=q.step==='recall'&&correct&&!s.hinted&&!recent;
 const prior=c.events.filter(e=>e.recipe===r.id&&e.independent),meaning=c.events.some(e=>e.recipe===r.id&&e.step==='meaning'&&e.correct);
 const delayed=independent&&meaning&&prior.length>0&&now-prior[0].at>=DAY&&now-lastExposure>=DAY;
 const e={id:key,session:s.id,recipe:q.recipe,step:q.step,index:s.index,answer:value,correct,hinted:s.hinted,exposureAt:lastExposure,independent,delayed,at:now,correctedAt:0};
 c.events.push(e);s.feedback={event:key,correct,corrected:correct,expected:expected(lib,q)};
 // Only actual target display reveals it; basic sources alone need not show the new word.
 if(q.step!=='notice')expose(c,[r.id],now);
 return {event:e};
}
function correct(lib,c,s,value,now=Date.now()){
 if(!s.feedback||s.feedback.corrected)fail('沒有待訂正答案');const q=s.queue[s.index];if(clean(value)!==clean(expected(lib,q)))fail('請看清楚正確答案再完成訂正');
 const e=c.events.find(e=>e.id===s.feedback.event);num(now,e.at);e.correctedAt=now;s.feedback.corrected=true;
 expose(c,[q.recipe],now);return true;
}
function next(c,s,now=Date.now()){
 if(!s.feedback?.corrected||s.status!=='active')return false;num(now,s.startedAt);s.index++;s.feedback=null;s.draft='';s.picked=[];s.cuts=[];s.hinted=false;
 if(s.index===s.queue.length){s.status='completed';s.finishedAt=now;}return true;
}
function abandon(s,now=Date.now()){num(now,s.startedAt);s.status='abandoned';s.finishedAt=now;s.feedback=null;s.draft='';s.picked=[];s.cuts=[];s.award=0;s.settled=true;}
function eligible(c,s){return s.status==='completed'&&s.queue.length>=2&&new Set(s.queue.map(q=>q.recipe)).size>=2&&c.events.filter(e=>e.session===s.id).length===s.queue.length&&c.events.filter(e=>e.session===s.id).every(e=>e.correct||e.correctedAt>0);}
function metrics(c){const rows=new Map();for(const e of c.events){let m=rows.get(e.recipe);if(!m){m={seen:0,assembled:0,meaning:0,independent:0,delayed:0,lastAt:0,lastCorrect:null};rows.set(e.recipe,m);}if(e.step==='notice')m.seen++;if(e.correct&&e.step==='assemble')m.assembled++;if(e.correct&&e.step==='meaning')m.meaning++;m.independent+=e.independent?1:0;m.delayed+=e.delayed?1:0;if(e.step!=='notice'){m.lastCorrect=e.correct;m.lastAt=e.at;}}
 return {rows,completed:c.sessions.filter(s=>s.status==='completed').length,assembled:[...rows.values()].filter(m=>m.assembled).length,meaning:[...rows.values()].filter(m=>m.meaning).length,independent:[...rows.values()].filter(m=>m.independent).length,delayed:[...rows.values()].filter(m=>m.delayed).length};}
function validate(raw,children,lib){
 if(raw==null)return initial();exact(raw,['version','children']);if(raw.version!==1)fail('版本不支援');obj(raw.children);if(Object.keys(raw.children).length>50)fail('孩子數量');const out=initial(),cids=new Set(children.map(c=>c.id));
 for(const [cid,v] of Object.entries(raw.children)){
  id(cid);if(!cids.has(cid))continue;exact(v,['sessions','events','exposures','assignment']);const c=child();obj(v.exposures);
  if(Object.keys(v.exposures).length>lib.recipes.size)fail('曝光容量');for(const [rid,n]of Object.entries(v.exposures)){if(!lib.recipes.has(rid))fail('曝光目標');c.exposures[rid]=num(n,1);}
  const ids=new Set();c.sessions=array(v.sessions,MAX_SESSIONS).map(s=>{
   exact(s,['id','childId','group','mode','queue','index','status','startedAt','finishedAt','draft','picked','cuts','hinted','feedback','award','settled']);id(s.id);if(ids.has(s.id)||s.childId!==cid)fail('課程歸屬或重複');ids.add(s.id);
   const g=lib.groups.get(s.group);if(!g||!['guided','build','recall'].includes(s.mode)||!['active','completed','abandoned'].includes(s.status))fail('課程資料');
   const allowed=s.mode==='guided'?['notice','assemble','meaning','recall']:s.mode==='build'?['assemble','meaning']:['recall'];
   array(s.queue,24);if(!s.queue.length||s.queue.length%allowed.length)fail('課程步驟');const seen=new Set();s.queue.forEach((q,i)=>{exact(q,['recipe','step']);if(!g.recipes.includes(q.recipe)||q.step!==allowed[i%allowed.length])fail('題目序列');if(i%allowed.length===0){if(seen.has(q.recipe))fail('重複題目');seen.add(q.recipe);}else if(q.recipe!==s.queue[i-i%allowed.length].recipe)fail('組合目標跳換');});
   num(s.index,0,s.queue.length);num(s.startedAt,1);num(s.finishedAt);if(s.finishedAt&&s.finishedAt<s.startedAt||s.status==='active'&&s.finishedAt!==0||s.status!=='active'&&!s.finishedAt||s.status==='completed'&&s.index!==s.queue.length||s.status==='active'&&s.index>=s.queue.length)fail('狀態與完成時間矛盾');
   text(s.draft);bool(s.hinted);bool(s.settled);num(s.award,0,2);if(s.award&&(!s.settled||s.status!=='completed')||s.status==='active'&&s.settled)fail('獎勵與狀態矛盾');
   array(s.picked,3);if(new Set(s.picked).size!==s.picked.length)fail('重複字塊');const r=lib.recipes.get(s.queue[s.index]?.recipe);for(const n of s.picked)num(n,0,(r?.parts.length||1)-1);
   array(s.cuts,3);for(let i=0;i<s.cuts.length;i++){text(s.cuts[i],40);if(s.cuts[i]&&(!r||!r.sources[i]?.word.includes(s.cuts[i])))fail('剪取內容無效');}
   if((s.picked.length||s.cuts.length)&&s.queue[s.index]?.step!=='assemble')fail('非組合題持有字塊');
   if(s.feedback){exact(s.feedback,['event','correct','corrected','expected']);id(s.feedback.event);bool(s.feedback.correct);bool(s.feedback.corrected);if(!r||s.feedback.expected!==expected(lib,s.queue[s.index]))fail('回饋答案');}
   return structuredClone(s);
  });if(c.sessions.filter(s=>s.status==='active').length>1)fail('同時有兩組進行中');
  const sessions=new Map(c.sessions.map(s=>[s.id,s])),eventIds=new Set();
  c.events=array(v.events,MAX_EVENTS).map(e=>{
   exact(e,['id','session','recipe','step','index','answer','correct','hinted','exposureAt','independent','delayed','at','correctedAt']);id(e.id);const s=sessions.get(e.session);if(!s||eventIds.has(e.id))fail('作答歸屬或重複');eventIds.add(e.id);num(e.index,0,s.queue.length-1);const q=s.queue[e.index];
   if(e.id!==s.id+'_'+e.index||e.recipe!==q.recipe||e.step!==q.step||e.index>s.index)fail('作答位置');text(e.answer);for(const k of ['correct','hinted','independent','delayed'])bool(e[k]);num(e.at,s.startedAt);num(e.exposureAt);num(e.correctedAt);if(e.correctedAt&&e.correctedAt<e.at)fail('訂正時間');
   if(e.correct!==(q.step==='notice'||clean(e.answer)===clean(expected(lib,q))))fail('原答案與評分不符');
   const ind=q.step==='recall'&&e.correct&&!e.hinted&&(e.exposureAt===0||e.at-e.exposureAt>=WAIT);
   if(e.independent!==ind||e.delayed&&!e.independent)fail('獨立證據不符');if(s.finishedAt&&e.at>s.finishedAt||s.finishedAt&&e.correctedAt>s.finishedAt)fail('作答在完成之後');return {...e};
  });
  for(const s of c.sessions){const events=c.events.filter(e=>e.session===s.id);const count=s.status==='completed'?s.queue.length:s.index+(s.feedback?1:0);if(s.status==='abandoned'){if(events.length>s.index+1)fail('放棄位置不符');}else if(events.length!==count)fail('答題數不符');
   for(let i=0;i<events.length;i++)if(events[i].index!==i)fail('作答有空洞');
   if(s.feedback){const e=events.at(-1);if(!e||e.id!==s.feedback.event||e.correct!==s.feedback.correct||s.feedback.corrected!==(e.correct||e.correctedAt>0)||e.index!==s.index)fail('回饋與事件矛盾');}
   if(s.status==='completed'&&!events.every(e=>e.correct||e.correctedAt>0))fail('未訂正就完成');
  }
  for(let i=0;i<c.events.length;i++){const e=c.events[i];if(e.delayed){const old=c.events.slice(0,i).filter(x=>x.recipe===e.recipe);if(!old.some(x=>x.step==='meaning'&&x.correct)||!old.some(x=>x.independent&&e.at-x.at>=DAY)||e.at-e.exposureAt<DAY)fail('延後證據不足');}}
  if(v.assignment){exact(v.assignment,['group','count','at']);if(!lib.groups.has(v.assignment.group))fail('指定組別');num(v.assignment.count,1,6);num(v.assignment.at,1);c.assignment={...v.assignment};}
  out.children[cid]=c;
 }
 return out;
}
return {KIND,STEPS,WAIT,DAY,MAX_EVENTS,MAX_SESSIONS,clean,library,initial,child,get,active,create,expose,submit,correct,next,abandon,eligible,metrics,validate,expected};
});

