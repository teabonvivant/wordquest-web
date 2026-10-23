/* HK-M4: ungraded scaffolds. Never writes scores, coins or mastery. */
(function(root){'use strict';
const packs=root.WQClassroomData.lessons,C=root.WQClassroomCopy,states=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,extra='')=>`<button class="btn soft" data-c1="classroom:${action}" ${extra}>${esc(label)}</button>`;
const go=(label,step)=>`<button class="btn primary" data-c1="step:${step}">${esc(label)}</button>`;
const fig=d=>d?.svg?`<div class="classroom-figure"><div class="classroom-figure-scroll" role="img" aria-label="${esc(d.alt)}">${d.svg.replace('<svg ','<svg aria-hidden="true" focusable="false" ')}</div>${btn("＋ 放大本題圖","zoom",'aria-expanded="false"')}<p class="classroom-zoom-note small">小螢幕可以左右移動圖卡。</p></div>`:'';
function state(key){if(!states.has(key))states.set(key,{stage:'warmup',choice:null,checked:false,help:false,model:0,task:0,revealed:false,pad:'drawing',paths:[],grid:[],count:0,number:0});return states.get(key);}
function teacher(key){const p=packs[key],t=p.teacher;return `<details class="classroom-teacher"><summary>${esc(C.teacherTitle)}</summary><h3>${esc(C.objectiveLabel)}</h3><p>${esc(t.objective)}</p><dl>${[[C.materialsLabel,t.materials.join('、')],[C.observeLabel,t.lookFor],[C.supportLabel,t.ifStuck],[C.extendLabel,t.extension]].map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${t.notes?`<p>${esc(t.notes)}</p>`:''}${p.modelNotes?.length?`<h3>${esc(C.modelNotesTitle)}</h3><ul>${p.modelNotes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<p>${esc(p.connections)}</p></details>`;}
function words(p){return `<details class="classroom-words"><summary>${esc(C.vocabularyTitle)}</summary><dl>${p.vocabulary.map(w=>`<div><dt>${esc(w.term)}</dt><dd>${esc(w.meaning)}</dd></div>`).join('')}</dl></details>`;}
function intro(key){const p=packs[key],s=state(key),r=p.readiness;let body='';
 if(s.stage==='warmup')body=`<span class="pill gold">${esc(C.warmupTitle)}</span><h2 id="classroom-heading" tabindex="-1">${esc(r.prompt)}</h2>${fig(r.diagram)}<div class="classroom-choices">${r.choices.map(x=>{const mk=s.checked&&s.choice?(x.id===r.answer?'ok':x.id===s.choice?'bad':''):'';return `<button class="btn soft${mk?' mk-'+mk:''}" data-c1="classroom:pick:${x.id}" aria-pressed="${s.choice===x.id}">${mk==='ok'?'✓ ':mk==='bad'?'✕ ':''}${esc(x.text)}</button>`;}).join('')}</div><div class="actions">${btn(C.warmupCheck,'check',s.choice?'':'disabled')}${btn(C.warmupHelp,'help')}</div>${s.checked||s.help?`<div class="classroom-feedback${s.checked&&s.choice?(s.choice===r.answer?' fb-ok':' fb-no'):''}" role="status">${s.checked&&s.choice?`<h3 class="fb-head ${s.choice===r.answer?'ok':'no'}">${s.choice===r.answer?'✓ 答對了！':'✕ 再想想，答案是 '+esc(r.choices.find(x=>x.id===r.answer)?.text||'')}</h3>`:''}<p>${esc(s.help||s.choice===r.answer?r.explanation:r.retry)}</p></div>`:''}<div class="actions">${btn(C.nextModel,'stage:model')}</div>${words(p)}`;
 else{const steps=p.modelSteps?.length?p.modelSteps:[p.explain.model];s.model=Math.min(s.model,steps.length-1);body=`<span class="pill gold">${esc(C.modelTitle)} · ${s.model+1}/${steps.length}</span><h2 id="classroom-heading" tabindex="-1">${esc(C.modelTitle)}</h2>${fig(p.diagram)}<p class="classroom-sentence" aria-live="polite">${esc(steps[s.model])}</p><div class="actions">${s.model?btn('←','model:'+(s.model-1),'aria-label="上一步"'):btn(C.backWarmup,'stage:warmup')}${s.model<steps.length-1?btn('→','model:'+(s.model+1),'aria-label="下一步"'):btn(C.nextModel,'stage:examples')}</div>${words(p)}`;}
 return `<section class="panel classroom-panel" data-classroom="intro">${body}</section>${teacher(key)}`;
}
function board(key){const s=state(key);let body='';
 if(s.pad==='drawing')body=`<p class="small">${esc(C.drawingInstructions)}</p><svg class="classroom-canvas" viewBox="0 0 640 320" role="img" aria-label="${esc(C.drawingTitle)}"><defs><pattern id="classroom-paper" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#dce3e5" stroke-width="1"/></pattern></defs><rect width="640" height="320" fill="url(#classroom-paper)"/><g class="classroom-ink" fill="none" stroke="#284f65" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${s.paths.map(d=>`<path d="${d}"/>`).join('')}</g></svg>${btn(C.clearDrawing,'clear')}`;
 if(s.pad==='grid')body=`<p class="small">${esc(C.gridInstructions)}</p><div class="classroom-grid">${Array.from({length:40},(_,i)=>btn(String(i+1),'cell:'+i,`aria-label="第${Math.floor(i/5)+1}行，第${i%5+1}格" aria-pressed="${s.grid.includes(i)}"`)).join('')}</div><p class="small" aria-live="polite">${s.grid.length} / 40</p>${btn(C.gridClear,'clear')}`;
 if(s.pad==='counter')body=`<output class="classroom-number" aria-live="polite">${s.count}</output><div class="classroom-counters" aria-hidden="true">${Array.from({length:s.count},()=>'<i></i>').join('')}</div><div class="actions">${btn(C.counterRemove,'count:-1',s.count?'':'disabled')}${btn(C.counterAdd,'count:1',s.count>=30?'disabled':'')}</div>`;
 if(s.pad==='number')body=`<output class="classroom-number" aria-live="polite">${s.number}</output><div class="classroom-numberline">${Array.from({length:21},(_,i)=>`<span class="${i===s.number?'current':''}">${i===s.number?'<b aria-hidden="true">▼</b>':''}${i}</span>`).join('')}</div><div class="actions">${btn(C.numberBack,'number:-1',s.number?'':'disabled')}${btn(C.numberForward,'number:1',s.number>=20?'disabled':'')}</div>`;
 return `<div class="classroom-workpad"><div class="classroom-pad-tabs" role="group" aria-label="${esc(C.drawingTitle)}">${[['drawing',C.drawingTitle],['grid',C.gridTitle],['counter',C.counterTitle],['number',C.numberLineTitle]].map(([id,label])=>btn(label,'pad:'+id,`aria-pressed="${s.pad===id}"`)).join('')}</div>${body}<p class="small muted">${esc(C.ungradedNote)}</p></div>`;
}
function workshop(key,live=false){const p=packs[key],s=state(key);s.task=Math.min(s.task,p.toolTask.length-1);return `<div class="classroom-panel" data-classroom="workshop" data-live="${live}"><span class="pill gold">${esc(C.toolTitle)} · ${s.task+1}/${p.toolTask.length}</span><p class="classroom-sentence" aria-live="polite">${esc(p.toolTask[s.task])}</p><div class="classroom-task-nav">${btn('←','task:'+(s.task-1),`aria-label="上一個動作" ${s.task?'':'disabled'}`)}${btn('→','task:'+(s.task+1),`aria-label="下一個動作" ${s.task+1>=p.toolTask.length?'disabled':''}`)}</div>${!live?fig(p.diagram)+board(key):`<details><summary>${esc(C.drawingTitle)}</summary>${fig(p.diagram)}${board(key)}</details>`}</div>`;}
function explain(key){const p=packs[key],s=state(key);return `<section class="panel classroom-panel" data-classroom="explain"><span class="pill gold">${esc(C.explainTitle)}</span><h2 id="classroom-heading" tabindex="-1">${esc(p.explain.prompt)}</h2>${fig(p.diagram)}${btn(C.talkCheck,'reveal',`aria-expanded="${s.revealed}"`)}${s.revealed?`<div class="classroom-feedback"><p>${esc(p.explain.model)}</p></div><details class="classroom-misconception"><summary>${esc(C.misconceptionTitle)}</summary><p>${esc(p.misconception.wrongIdea)}</p><p>${esc(p.misconception.repair)}</p></details>`:''}<div class="actions">${go(C.nextTool,1)}${go(C.nextPractice,3)}</div></section>${teacher(key)}`;}
function act(key,action){const s=state(key),[type,value]=action.split(':');
 if(type==='stage'){s.stage=value;s.model=0;}
 if(type==='model')s.model=Number(value);
 if(type==='pick'){s.choice=value;s.checked=false;s.help=false;}
 if(type==='check')s.checked=!!s.choice;
 if(type==='help')s.help=true;
 if(type==='reveal')s.revealed=!s.revealed;
 if(type==='task')s.task=Math.max(0,Math.min(packs[key].toolTask.length-1,Number(value)));
 if(type==='pad')s.pad=value;
 if(type==='cell'){const n=Number(value);if(n>=0&&n<40)s.grid=s.grid.includes(n)?s.grid.filter(x=>x!==n):[...s.grid,n];}
 if(type==='count')s.count=Math.max(0,Math.min(30,s.count+Number(value)));
 if(type==='number')s.number=Math.max(0,Math.min(20,s.number+Number(value)));
 if(type==='clear'){if(s.pad==='drawing')s.paths=[];if(s.pad==='grid')s.grid=[];}
}
/* answer cue: the app's right / wrong sound (host bridge, absent in the stand-alone preview) and the feedback scrolled into view next to the options */
function cue(app,ok,anchorSel){
 const head=app.querySelector('.fb-head');if(!head)return false;
 try{root.WQAnswerSfx&&root.WQAnswerSfx(ok);}catch(e){}
 try{
  const doc=root.document,up=n=>n.parentElement||(n.getRootNode&&n.getRootNode().host)||null;
  let sc=up(head);while(sc&&sc!==doc.body&&sc!==doc.documentElement){if(/(auto|scroll)/.test(root.getComputedStyle(sc).overflowY)&&sc.scrollHeight>sc.clientHeight+2)break;sc=up(sc);}
  let top=0,bottom=root.innerHeight;
  const nav=doc.querySelector('dialog[open] .r37-nav')||doc.querySelector('.r37-nav');if(nav&&root.getComputedStyle(nav).position==='fixed')bottom=Math.min(bottom,nav.getBoundingClientRect().top);
  const bar=doc.querySelector('dialog[open] .r37-bar,dialog[open] .r37-dbar');if(bar)top=Math.max(top,bar.getBoundingClientRect().bottom);
  const anchor=anchorSel&&app.querySelector(anchorSel),h=head.getBoundingClientRect(),a=anchor?anchor.getBoundingClientRect():h;
  const hb=h.bottom+56,avail=bottom-top-16;let dy=0;
  if(hb-Math.min(a.top,h.top)<=avail){if(hb>bottom-8)dy=hb-(bottom-8);else if(Math.min(a.top,h.top)<top+8)dy=Math.min(a.top,h.top)-(top+8);}
  else dy=h.top-(top+12);
  if(Math.abs(dy)>=2){if(sc&&sc!==doc.body&&sc!==doc.documentElement)sc.scrollTop+=dy;else root.scrollBy(0,dy);}
 }catch(e){}
 return true;
}
function mount(scope,key){const svg=scope.querySelector('.classroom-canvas');if(!svg||svg.dataset.bound)return;svg.dataset.bound='true';let stroke=null,path=null;const s=state(key);
 const point=e=>{const r=svg.getBoundingClientRect();return [Math.max(0,Math.min(640,(e.clientX-r.left)/r.width*640)),Math.max(0,Math.min(320,(e.clientY-r.top)/r.height*320))].map(n=>n.toFixed(1)).join(' ');};
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();svg.setPointerCapture(e.pointerId);stroke='M'+point(e);path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',stroke);svg.querySelector('.classroom-ink').append(path);});
 svg.addEventListener('pointermove',e=>{if(!stroke)return;stroke+=' L'+point(e);path.setAttribute('d',stroke);});
 const finish=()=>{if(stroke){s.paths.push(stroke);if(s.paths.length>150)s.paths.shift();}stroke=null;path=null;};svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
}
function handle(app,key,action,button,render){if(action==='zoom'){const box=button.closest('.classroom-figure'),expanded=box.classList.toggle('expanded');button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'縮小圖卡':'＋ 放大本題圖';return;}act(key,action);const container=button.closest('[data-classroom]');if(container?.dataset.classroom==='workshop'){const live=container.dataset.live==='true',opened=container.querySelector('details')?.open;container.outerHTML=workshop(key,live);const details=app.querySelector('[data-classroom=workshop] details');if(details&&opened)details.open=true;mount(app,key);}else render();if(action==='check'){const s2=state(key);if(s2.choice)cue(app,s2.choice===packs[key].readiness.answer,'.classroom-choices');}if(action.startsWith('stage:')||action.startsWith('model:')){const heading=app.querySelector('#classroom-heading')||app.querySelector('#c2-card-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'nearest'});}else{const target=[...app.querySelectorAll('[data-c1]')].find(b=>b.dataset.c1==='classroom:'+action&&!b.disabled);target?.focus({preventScroll:true});}}
root.WQClassroom={get:key=>packs[key],state,intro,workshop,explain,teacher,mount,handle,cue,reset:()=>states.clear()};
})(globalThis);
