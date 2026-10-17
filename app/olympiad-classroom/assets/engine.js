export const STORAGE_KEY = 'math-explorer-hk-v1';
export const freshState = () => ({version:1,contentRevision:2,completed:[],lessonStates:{},practice:{},checkpoints:{},checkHistory:{},results:[],activeTest:null,settings:{readAloud:false}});
export function normalizeNumber(value) {
  if(value===null || value===undefined) return null;
  const s=String(value).replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296)).trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}
export function answered(q,a) {
  if(q.type==='number') return normalizeNumber(a)!==null;
  if(q.type==='order') return Array.isArray(a) && a.length===q.answer.length && new Set(a).size===q.answer.length && a.every(id=>q.items.some(x=>x.id===id));
  return typeof a==='string' && q.choices.some(x=>x.id===a);
}
export function correct(q,a) {
  if(!answered(q,a)) return false;
  if(q.type==='number') return normalizeNumber(a)===q.answer;
  if(q.type==='order') return q.answer.every((id,i)=>id===a[i]);
  return a===q.answer;
}
export function answerText(q,a) {
  if(!answered(q,a)) return '未作答';
  if(q.type==='number') return `${normalizeNumber(a)}${q.unitLabel?' '+q.unitLabel:''}`;
  if(q.type==='order') return a.map(id=>q.items.find(x=>x.id===id)?.label||id).join(' → ');
  return `${a}．${q.choices.find(x=>x.id===a)?.text||''}`;
}
export function shuffle(a) {
  const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;
}
export function initialOrder(q) {
  let a=shuffle(q.items.map(x=>x.id));
  if(q.answer.every((id,i)=>id===a[i])) a=[...a.slice(1),a[0]];
  return a;
}
export function chooseQuestions(bank,mode,unitId,wrongIds=[],options={}) {
  if(mode==='wrong') return shuffle(bank.filter(q=>wrongIds.includes(q.id))).slice(0,8);
  const seen=new Set(options.seenIds||[]);
  let pool=bank.filter(q=>q.role==='assessment'&&(unitId==='all'||q.unitId===unitId));
  if(options.lessonIds)pool=pool.filter(q=>options.lessonIds.includes(q.lessonId));
  if(options.difficulty==='foundation')pool=pool.filter(q=>q.difficulty<=2);
  if(options.difficulty==='stretch')pool=pool.filter(q=>q.difficulty===3);
  if(options.newOnly)pool=pool.filter(q=>!seen.has(q.id));
  if(mode==='mc')pool=pool.filter(q=>q.type==='mc');
  const selected=[],unitCounts={},lessonCounts={},typeCounts={};
  // Balance methods and answer modes while preferring questions not previously seen.
  const wanted=mode==='mc'?['mc']:['mc','number','order','mc','number','mc','number','mc'];
  while(pool.length&&selected.length<8){
    const type=wanted[selected.length%wanted.length];
    const score=q=>(seen.has(q.id)?100:0)+(unitCounts[q.unitId]||0)*12+(lessonCounts[q.lessonId]||0)*8+(q.type===type?0:4)+(typeCounts[q.type]||0);
    pool=shuffle(pool).sort((a,b)=>score(a)-score(b));
    const q=pool.shift();selected.push(q);unitCounts[q.unitId]=(unitCounts[q.unitId]||0)+1;lessonCounts[q.lessonId]=(lessonCounts[q.lessonId]||0)+1;typeCounts[q.type]=(typeCounts[q.type]||0)+1;
  }
  return shuffle(selected);
}
export function seenQuestions(state){return [...new Set([...Object.keys(state.practice),...Object.keys(state.checkHistory||{}),...state.results.flatMap(r=>r.entries.map(e=>e.questionId))])];}
export function lessonEvidence(state,lesson){
  const record=state.checkpoints?.[lesson.id];
  if(record?.entries?.length===lesson.checkpointIds?.length&&record.entries.length>0&&record.entries.every(e=>e.correct&&e.firstAttempt))return 'independent';
  return state.completed.includes(lesson.id)?'viewed':'new';
}
export function gradeTest(test,bank,now=Date.now()) {
  const questions=test.questionIds.map(id=>bank.find(q=>q.id===id));
  const entries=questions.map(q=>({questionId:q.id,answer:test.answers[q.id]??null,status:!answered(q,test.answers[q.id])?'blank':correct(q,test.answers[q.id])?'correct':'wrong'}));
  return {id:test.id,mode:test.mode,unitId:test.unitId,startedAt:test.startedAt,finishedAt:now,elapsedMs:Math.max(0,Math.min(now-test.startedAt,test.durationMs||Infinity)),timed:!!test.durationMs,score:entries.filter(e=>e.status==='correct').length,total:entries.length,entries};
}
export function wrongQuestions(state) {
  const latest=new Map();
  const update=(id,status,at)=>{if(!latest.has(id)||at>=latest.get(id).at)latest.set(id,{status,at});};
  state.results.forEach((r,i)=>r.entries.forEach(e=>update(e.questionId,e.status,r.finishedAt||i)));
  Object.entries(state.practice).forEach(([id,p])=>{if(typeof p.lastCorrect==='boolean')update(id,p.lastCorrect?'correct':'wrong',p.updatedAt||0);});
  return [...latest].filter(([,v])=>v.status!=='correct').map(([k])=>k);
}
export function validateState(value,bank,lessons) {
  if(!value||value.version!==1||!Array.isArray(value.completed)||!Array.isArray(value.results)||!value.lessonStates||!value.practice) throw new Error('這個檔案不是學習紀錄備份。');
  const ids=new Set(bank.map(q=>q.id)), lessonIds=new Set(lessons.map(l=>l.id));
  if(value.completed.some(id=>!lessonIds.has(id)) || value.results.length>300) throw new Error('備份的課堂或紀錄格式不相符。');
  value.results.forEach(r=>{if(!r.id||!Array.isArray(r.entries)||r.entries.length>64||!Number.isFinite(r.finishedAt)||r.entries.some(e=>!ids.has(e.questionId)||!['correct','wrong','blank'].includes(e.status)))throw new Error('備份內有不完整的測驗紀錄。');});
  const s=freshState();s.completed=[...new Set(value.completed)];s.results=value.results;s.practice=Object.fromEntries(Object.entries(value.practice).filter(([id,p])=>ids.has(id)&&p&&typeof p==='object'));s.settings.readAloud=!!value.settings?.readAloud;
  s.checkHistory=Object.fromEntries(Object.entries(value.checkHistory||{}).filter(([id,n])=>ids.has(id)&&Number.isInteger(n)&&n>0));
  s.checkpoints=Object.fromEntries(Object.entries(value.checkpoints||{}).filter(([id,r])=>lessonIds.has(id)&&r&&Array.isArray(r.entries)&&r.entries.length<=4&&r.entries.every(e=>ids.has(e.questionId)&&typeof e.correct==='boolean'&&typeof e.firstAttempt==='boolean')));
  // A backup restores completed work. An in-progress test is deliberately not imported.
  return s;
}
