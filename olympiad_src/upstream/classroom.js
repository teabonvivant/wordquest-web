// Classroom scaffolds are ungraded. Independent evidence stays in engine.js.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fig=d=>d?.svg?`<div class="classroom-figure" role="img" aria-label="${esc(d.alt)}">${d.svg.replace('<svg ','<svg aria-hidden="true" focusable="false" ')}</div>`:'';
const button=(label,action,extra='')=>`<button class="button secondary small" data-action="classroom" data-do="${action}" ${extra}>${esc(label)}</button>`;
export function classroomState(s){return s.classroom||=( {ready:{},tool:null,explain:false} );}
export function initialTool(t){
 if(t.kind==='counters')return {values:[...t.start]};
 if(t.kind==='numberline')return {value:t.start};
 if(t.kind==='grid')return {position:[...t.start],trail:[t.start.join(',')]};
 if(t.kind==='tiles')return {selected:[...(t.selected||[])]};
 return {frame:0};
}
export function toolCorrect(t,s){
 if(t.kind==='counters')return s.values.every((n,i)=>n===t.target[i]);
 if(t.kind==='numberline')return s.value===t.target;
 if(t.kind==='grid')return s.position.every((n,i)=>n===t.target[i]);
 if(t.kind==='tiles')return s.selected.length===t.target.length&&t.target.every(n=>s.selected.includes(n));
 return s.frame===t.frames.length-1;
}
export function classroomAction(c,s,action,value){
 const r=s.ready||={};
 if(action==='ready-pick'){r.answer=value;r.checked=false;r.help=false;return;}
 if(action==='ready-check'){if(r.answer)r.checked=true;return;}
 if(action==='ready-help'){r.help=true;return;}
 if(action==='explain'){s.explain=!s.explain;return;}
 const t=c.tool;s.tool||=initialTool(t);const x=s.tool;
 if(action==='reset'){s.tool=initialTool(t);return;}
 if(action==='hint'){x.hint=true;return;}
 if(action==='check'){x.checked=true;return;}
 x.checked=false;
 if(t.kind==='counters'){
   const i=action.endsWith('left')?0:1,j=1-i;
   if(action.startsWith('add-')&&t.mode==='add'&&x.values[i]<(t.max||20))x.values[i]++;
   if(action.startsWith('remove-')&&t.mode==='add'&&x.values[i]>0)x.values[i]--;
   if(action.startsWith('move-')&&t.mode==='move'&&x.values[j]>0&&x.values[i]<(t.max||20)){x.values[j]--;x.values[i]++;}
 }else if(t.kind==='numberline')x.value=Math.max(t.min,Math.min(t.max,x.value+(action==='forward'?1:action==='back'?-1:0)*(t.jump||1)));
 else if(t.kind==='grid'){
   const d={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[action];if(!d)return;
   const p=x.position.map((n,i)=>n+d[i]);
   if(p[0]>=0&&p[0]<t.rows&&p[1]>=0&&p[1]<t.cols&&!(t.blocked||[]).some(b=>b.every((n,i)=>n===p[i]))){x.position=p;x.trail=[...new Set([...x.trail,p.join(',')])];}
 }else if(t.kind==='tiles'&&action==='tile'){
   const i=Number(value);if(!Number.isInteger(i)||i<0||i>=t.rows*t.cols)return;
   x.selected=x.selected.includes(i)?x.selected.filter(n=>n!==i):[...x.selected,i];
 }else if(t.kind==='frames')x.frame=Math.max(0,Math.min(t.frames.length-1,x.frame+(action==='next'?1:action==='prev'?-1:0)));
}
export function warmup(c,s,copy){
 const r=s.ready||{},q=c.ready,shown=r.checked||r.help,ok=r.answer===q.answer;
 return `<section class="classroom-ready" aria-labelledby="ready-heading"><h2 id="ready-heading">${esc(copy.readyTitle)}</h2><p class="classroom-prompt">${esc(q.prompt)}</p>${fig(q.diagram)}<div class="options">${q.choices.map(a=>`<button class="option" data-action="classroom" data-do="ready-pick" data-value="${esc(a.id)}" aria-pressed="${r.answer===a.id}">${fig(a.diagram)}${esc(a.text)}</button>`).join('')}</div><div class="actions">${button(copy.readyCheck,'ready-check',!r.answer?'disabled':'')}${button(copy.readyHelp,'ready-help')}</div>${shown?`<p class="classroom-feedback" role="status">${esc(r.help||ok?q.explanation:q.retry)}</p>`:''}</section>${c.words?.length?`<details class="classroom-words"><summary>${esc(copy.wordsTitle)}</summary><dl>${c.words.map(w=>`<div><dt>${esc(w.term)}</dt><dd>${esc(w.meaning)}</dd></div>`).join('')}</dl></details>`:''}`;
}
export function classroomTool(c,s,copy){
 const t=c.tool;s.tool||=initialTool(t);const x=s.tool;let body='';
 if(t.kind==='counters')body=`<div class="counter-trays">${x.values.map((n,i)=>`<section><h3>${esc(t.labels?.[i]||String(i+1))} <output>${n}</output></h3><div class="counter-pieces" aria-label="${n}">${Array.from({length:n},()=>'<i aria-hidden="true"></i>').join('')}</div>${t.mode==='add'?`<div class="actions">${button(i?copy.removeRight:copy.removeLeft,i?'remove-right':'remove-left',!n?'disabled':'')}${button(i?copy.addRight:copy.addLeft,i?'add-right':'add-left',n>=(t.max||20)?'disabled':'')}</div>`:''}</section>`).join('')}</div>${t.mode==='move'?`<div class="actions">${button(copy.moveLeft,'move-left',x.values[1]===0||x.values[0]>=t.max?'disabled':'')}${button(copy.moveRight,'move-right',x.values[0]===0||x.values[1]>=t.max?'disabled':'')}</div>`:''}`;
 if(t.kind==='numberline')body=`<div class="number-track" role="img" aria-label="${x.value}">${Array.from({length:t.max-t.min+1},(_,i)=>`<span class="${i+t.min===x.value?'current':''}">${i+t.min===x.value?'<b aria-hidden="true">▼</b>':''}${i+t.min}</span>`).join('')}</div><div class="actions">${button(copy.numberBack,'back',x.value<=t.min?'disabled':'')}${button(copy.numberForward,'forward',x.value>=t.max?'disabled':'')}</div>`;
 if(t.kind==='grid')body=`<div class="classroom-grid" style="--cols:${t.cols}" role="img" aria-label="${x.position[0]+1}, ${x.position[1]+1}">${Array.from({length:t.rows*t.cols},(_,i)=>{const p=[Math.floor(i/t.cols),i%t.cols],at=x.position.every((n,j)=>n===p[j]),goal=t.target.every((n,j)=>n===p[j]),blocked=(t.blocked||[]).some(a=>a.every((n,j)=>n===p[j]));return `<span class="${blocked?'blocked':goal?'goal':x.trail.includes(p.join(','))?'trail':''}">${blocked?'×':at?'●':goal?'★':''}</span>`;}).join('')}</div><div class="direction-pad">${['up','left','down','right'].map((a,i)=>button(['↑ '+copy.gridUp,'← '+copy.gridLeft,'↓ '+copy.gridDown,'→ '+copy.gridRight][i],a)).join('')}</div>`;
 if(t.kind==='tiles')body=`<div class="classroom-grid tile-grid" style="--cols:${t.cols}">${Array.from({length:t.rows*t.cols},(_,i)=>`<button data-action="classroom" data-do="tile" data-value="${i}" aria-pressed="${x.selected.includes(i)}" aria-label="${esc(t.labels?.[i]||i+1)}">${t.diagrams?.[i]?fig(t.diagrams[i]):esc(t.labels?.[i]||i+1)}<span class="tile-check" aria-hidden="true">${x.selected.includes(i)?'✓':'＋'}</span></button>`).join('')}</div>`;
 if(t.kind==='frames')body=fig(t.frames[x.frame].diagram)+`<div class="frame-controls">${button(copy.previousFrame,'prev',x.frame===0?'disabled':'')}<span>${esc(t.frames[x.frame].label)}<small>${x.frame+1} / ${t.frames.length}</small></span>${button(copy.nextFrame,'next',x.frame===t.frames.length-1?'disabled':'')}</div>`;
 const ok=toolCorrect(t,x);
 return `<section class="classroom-tool" aria-labelledby="tool-heading"><h2 id="tool-heading">${esc(copy.toolTitle)}</h2><p class="classroom-prompt">${esc(t.prompt)}</p>${body}<div class="actions">${t.kind!=='frames'?button(copy.toolCheck,'check'):''}${button(copy.toolHint,'hint')}${button(copy.toolReset,'reset')}</div>${x.hint?`<p class="classroom-hint">${esc(t.hint)}</p>`:''}${x.checked||t.kind==='frames'&&ok?`<div class="classroom-feedback" role="status">${t.kind!=='frames'?`<b>${esc(ok?copy.toolCorrect:copy.toolRetry)}</b>`:''}<p>${esc(ok?t.explanation:t.hint)}</p></div>`:''}${t.completionNote?`<p class="small muted">${esc(t.completionNote)}</p>`:''}</section>`;
}
export function explainBack(c,s,copy){return `<section class="classroom-explain"><h2>${esc(copy.explainTitle)}</h2><p class="classroom-prompt">${esc(c.explain.prompt)}</p>${button(copy.explainReveal,'explain',`aria-expanded="${!!s.explain}"`)}${s.explain?`<p class="classroom-feedback">${esc(c.explain.model)}</p>`:''}</section>`;}
export function teacherNotes(c,copy){const t=c.teacher;return `<details class="classroom-teacher"><summary>${esc(copy.teacherTitle)}</summary><h3>${esc(t.objective)}</h3><ul>${t.materials.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><dl><dt>觀察孩子</dt><dd>${esc(t.lookFor)}</dd><dt>遇到困難</dt><dd>${esc(t.ifStuck)}</dd><dt>延伸探索</dt><dd>${esc(t.extension)}</dd></dl></details>`;}
