import {STORAGE_KEY,freshState,normalizeNumber,answered,correct,answerText,initialOrder,chooseQuestions,gradeTest,wrongQuestions,validateState,seenQuestions,lessonEvidence} from './engine.js?v=c4b3008db9c7';
import {questionSpeech} from './voice-text.js?v=c4b3008db9c7';
import {createRecordedNarration} from './voice-controls.js?v=c4b3008db9c7';
import {classroomState,classroomAction,warmup,classroomTool,explainBack,teacherNotes} from './classroom.js?v=c4b3008db9c7';

const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const main=$('#main'), page=location.pathname.split('/').filter(Boolean)[0]||'home', params=new URLSearchParams(location.search);
const recordedVoice=createRecordedNarration(),recordedReady=recordedVoice.init();
let data, state, timer, lastAudioText='', storageAvailable=true, importCandidate=null, speechRequest=0;
let currentLesson=null, currentQuestion=null, remediationOpened=false, sourceData=null;
const solutionSteps={}, solutionContext={};
const stages=['認識任務','老師示範','自己操作','小練習','自己試','帶走方法'];
const stageIndex=n=>n===0?0:n<=3?1:n===4?2:n===5?3:n===6?4:5;
const t=key=>data?.revision?.[key]||'';
const graphic=d=>d?.svg?`<span class="option-graphic" role="img" aria-label="${esc(d.alt)}">${d.svg.replace('<svg ','<svg aria-hidden="true" focusable="false" ')}</span>`:'';
const cards=items=>items?.length?`<dl class="word-cards">${items.map(c=>`<div><dt>${esc(c.label)}</dt><dd>${esc(c.text)}</dd></div>`).join('')}</dl>`:'';
const remediationUrl=q=>url('lesson',q.lessonId)+'&step='+(q.remediationStep||1);
const typeLabel={mc:'選擇題 · 選一個答案',number:'數字填空 · 只填數字',order:'排序題 · 用按鈕移動，再確認'};
const speakerIcon='<svg class="reading-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/></svg>';
const url=(p,id)=>`/${p}/${id?'?id='+encodeURIComponent(id):''}`;
const lessonById=id=>data.lessons.find(l=>l.id===id);
const questionById=id=>data.questions.find(q=>q.id===id);
const unitById=id=>data.units.find(u=>u.id===id);
const character=id=>data.copy.characters.find(c=>c.id===id)||data.copy.characters[0];
const image=(id,cls='portrait')=>`<img class="${cls}" src="/assets/${id}.png" alt="${esc(character(id).name)}" width="160" height="210">`;
const readButton=text=>`<button class="read-button" data-action="read" data-text="${esc(text)}">${speakerIcon}聽一聽</button>`;
const announce=text=>{$('#announcer').textContent='';requestAnimationFrame(()=>{$('#announcer').textContent=text;});};
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{storageAvailable=false;$('#storage-notice').hidden=false;$('#storage-notice').textContent='這個瀏覽器暫時不能儲存進度。離開前可到「我的學習」匯出備份。';}}
function load(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');state=raw&&raw.version===1?{...freshState(),...raw,contentRevision:raw.contentRevision||1}:freshState();if(!Array.isArray(state.results)||!Array.isArray(state.completed)||!state.lessonStates||!state.practice)state=freshState();}catch{state=freshState();storageAvailable=false;$('#storage-notice').hidden=false;$('#storage-notice').textContent='未能讀取原有進度，已開啟新學習頁面。你可以匯入之前的備份。';}state.settings={readAloud:false,...state.settings};state.checkpoints||={};state.checkHistory||={};if(state.contentRevision!==2){for(const [id,l] of Object.entries(state.lessonStates)){if(l.phase===6)l.phase=state.completed.includes(id)?7:6;}state.contentRevision=2;}}
async function speak(text,manual=false){
 const request=++speechRequest;
 if(!text)return;
 if(!manual&&!state.settings.readAloud){recordedVoice.stop();return;}
 const ready=await recordedReady;
 if(request!==speechRequest)return;
 if(ready){window.speechSynthesis?.cancel();lastAudioText=text;await recordedVoice.play(text);return;}
 if(!('speechSynthesis' in window)){announce('這個瀏覽器未能朗讀，文字會繼續顯示。');if(manual)showNotice('這個瀏覽器沒有朗讀功能；可換用支援語音的瀏覽器。');return;}
 speechSynthesis.cancel();lastAudioText=text;const utter=new SpeechSynthesisUtterance(text);const voices=speechSynthesis.getVoices();
 const hkVoices=voices.filter(v=>/zh[-_]HK|yue/i.test(v.lang));
 const voice=hkVoices.find(v=>/Tracy|Sin[- ]?Ji|HiuGaai|HiuMaan/i.test(v.name))||hkVoices.find(v=>!/Danny|WanLung/i.test(v.name));
 if(!voice){showNotice(recordedVoice.unavailableMessage||t('audioUnavailable'));return;}
 utter.voice=voice;utter.lang=voice.lang;utter.rate=.82;utter.pitch=1;
 const actor=$('.coach')||$('.hero-scene');actor?.classList.add('speaking');
 utter.onend=()=>actor?.classList.remove('speaking');utter.onerror=()=>{actor?.classList.remove('speaking');showNotice(t('audioUnavailable'));};speechSynthesis.speak(utter);
}
function showNotice(s){$('#storage-notice').hidden=false;$('#storage-notice').textContent=s;}
function setTitle(s){document.title=`${s}｜數學探險所`;}
function breadcrumb(items){return `<div class="breadcrumb"><a href="/">主頁</a>${items.map(([name,link])=>`<span aria-hidden="true">/</span>${link?`<a href="${link}">${esc(name)}</a>`:`<span>${esc(name)}</span>`}`).join('')}</div>`;}
function pageHead(title,description=''){return `<div class="page-head"><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>`;}
function coach(id,title,text){lastAudioText=`${title}。${text}`;return `<div class="coach responding" data-speaker="${id}">${image(id)}<div><div class="coach-name">${esc(character(id).name)}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${readButton(lastAudioText)}</div></div>`;}
function diagram(d){if(!d?.svg)return '';return `<figure class="diagram"><div class="diagram-graphic" role="img" aria-label="${esc(d.alt)}">${d.svg.replace('<svg ','<svg aria-hidden="true" focusable="false" ')}<\/div><figcaption>${readButton(d.alt)}</figcaption></figure>`;}
function unitTile(u){const completed=u.lessonIds.filter(id=>state.completed.includes(id)).length,independent=u.lessonIds.filter(id=>lessonEvidence(state,lessonById(id))==='independent').length;const marks={observe:'分',count:'數',puzzle:'拼',space:'轉',pattern:'律',route:'路',measure:'量',logic:'想'};return `<a class="unit-tile" href="${url('unit',u.id)}" style="--unit-color:${u.color}"><span class="unit-mark" aria-hidden="true">${esc(u.mark||marks[u.id])}</span><div><h3 class="unit-title">${esc(u.title)}</h3><p>${esc(u.subtitle)}</p><p class="unit-progress">${completed} / ${u.lessonIds.length} ${esc(t('viewedLabel'))}${independent?` · ${independent} ${esc(t('independentLabel'))}`:''}</p></div></a>`;}

function nextLesson(){return data.lessons.find(l=>state.lessonStates[l.id]&&!state.completed.includes(l.id))||data.lessons.find(l=>!state.completed.includes(l.id))||data.lessons[0];}
function renderHome(){setTitle('一起開始探索');const h=data.copy.home,n=nextLesson();main.innerHTML=`<section class="home-hero"><div class="hero-copy"><h1>${esc(h.title)}</h1><p>${esc(h.description)}</p><div class="actions"><a class="button" href="${url('lesson',n.id)}">${esc(state.completed.length||Object.keys(state.lessonStates).length?h.continueLabel:h.startLabel)}</a><a class="button text" href="/learn/">看看所有課堂</a></div><p class="hero-note">${esc(n.title)} · 約 ${n.minutes} 分鐘</p></div><div class="hero-scene"><div class="welcome-bubble">${esc(character('owl').line)}</div>${image('owl','hero-owl welcome-motion')}${image('rabbit','hero-rabbit')}</div></section><section aria-label="${esc(h.howTitle)}" class="how-row">${h.howSteps.map((s,i)=>`<div class="how-item"><span class="how-step">${i+1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`).join('')}</section><div class="section-head"><h2>從你想探索的地方開始</h2><a class="text-link" href="/learn/">全部課堂</a></div><div class="unit-grid">${data.units.slice(0,4).map(unitTile).join('')}</div><div class="section-head"><h2>你的學習同伴</h2></div><div class="teacher-team">${data.copy.characters.map(c=>`<div class="team-member">${image(c.id,'')}<div><h3>${esc(c.name)}</h3><p>${esc(c.role)}</p></div></div>`).join('')}</div>`;lastAudioText=h.teacherWelcome;}
function renderLearn(){setTitle('教學模式');main.innerHTML=breadcrumb([['教學模式']])+pageHead('今天想學哪個方法？',t('learnIntro'))+`<div class="unit-grid">${data.units.map(unitTile).join('')}</div>`;}

function renderUnit(){const u=unitById(params.get('id'));if(!u)return notFound();setTitle(u.title);main.innerHTML=breadcrumb([['教學模式','/learn/'],[u.title]])+`<div class="unit-intro"><div>${pageHead(u.title,u.description)}</div>${image(lessonById(u.lessonIds[0]).teacher,'')}</div><div class="lesson-list">${u.lessonIds.map((id,i)=>{const l=lessonById(id),e=lessonEvidence(state,l);return `<a class="lesson-link" href="${url('lesson',id)}"><span class="lesson-number">${i+1}</span><div><h3>${esc(l.title)}</h3><p>${esc(l.goal)}</p></div><div><span class="pill">${esc(e==='independent'?t('independentLabel'):e==='viewed'?t('viewedLabel'):l.level==='stretch'?t('stretchLabel'):t('foundationLabel'))}</span><span class="small">約 ${l.minutes} 分鐘</span></div></a>`;}).join('')}</div><div class="actions"><a class="button secondary" href="/test/?unit=${u.id}">試試這個單元的小測</a></div>`;}

function lessonState(id){
 const s=state.lessonStates[id] ||= {phase:0,practiceIndex:0,activityAnswer:null,activityFeedback:null,activityDone:false,practiceAnswers:{},practiceFeedback:{},hints:{},revealed:{},orderDrafts:{}};
 for(const key of ['practiceAnswers','practiceFeedback','hints','revealed','orderDrafts','predictions','demoFrames','checkpointAnswers','checkpointFeedback'])s[key]||={};
 s.checkpointIndex||=0;return s;
}

function getDraft(q,scope){const owner=scope==='quiz'?state.activeTest:lessonState(currentLesson.id);owner.orderDrafts||={};return owner.orderDrafts[q.id] ||= initialOrder(q);}
function controls(q,answer,scope){
 const locked=scope==='checkpoint'&&lessonState(currentLesson.id).checkpointFeedback[q.id];
 const disabled=locked?'disabled':'';
 if(q.type==='select')return `<div class="options visual-options" role="group" aria-label="選擇合適的項目">${q.items.map(x=>`<button class="option" data-action="select-activity" data-value="${esc(x.id)}" aria-pressed="${Array.isArray(answer)&&answer.includes(x.id)}"><span class="choice-letter" aria-hidden="true">${Array.isArray(answer)&&answer.includes(x.id)?'✓':'＋'}</span><span class="choice-content">${graphic(x.diagram)}<span>${esc(x.label)}</span></span></button>`).join('')}</div>`;
 if(q.type==='mc')return `<div class="options visual-options" role="group" aria-label="選擇一個答案">${q.choices.map(c=>`<button class="option" data-action="pick" data-scope="${scope}" data-value="${esc(c.id)}" aria-pressed="${answer===c.id}" ${disabled}><span class="choice-letter">${esc(c.id)}</span><span class="choice-content">${graphic(c.diagram)}<span>${esc(c.text)}</span></span></button>`).join('')}</div>`;
 if(q.type==='number')return `<div class="numeric-entry"><label for="answer-input">你的答案</label><input id="answer-input" data-number="${scope}" inputmode="numeric" pattern="[0-9０-９]*" autocomplete="off" aria-describedby="input-help" value="${esc(answer??'')}" ${disabled}><span>${esc(q.unitLabel||'')}</span><span id="input-help" class="input-help">只輸入數字，不用填單位。</span></div>`;
 const order=getDraft(q,scope);return `<ol class="order-list" aria-label="目前的排列次序">${order.map((id,i)=>{const item=q.items.find(x=>x.id===id);return `<li class="order-item"><span class="order-position">${i+1}</span><span class="order-label">${graphic(item.diagram)}${esc(item.label)}</span><span class="order-move"><button data-action="move" data-scope="${scope}" data-index="${i}" data-dir="-1" ${i===0||locked?'disabled':''} aria-label="把${esc(item.label)}上移">↑</button><button data-action="move" data-scope="${scope}" data-index="${i}" data-dir="1" ${i===order.length-1||locked?'disabled':''} aria-label="把${esc(item.label)}下移">↓</button></span></li>`;}).join('')}</ol><button class="button secondary small order-confirm" data-action="confirm-order" data-scope="${scope}" ${disabled}>${Array.isArray(answer)?'已記錄這個次序 · 再次確認':'用這個次序'}</button>`;
}

function questionNarration(q){return questionSpeech(q);}
function questionBlock(q,answer,scope){return `<p class="question-type">${typeLabel[q.type]||'選出所有合適的項目'}</p><p class="question-prompt">${esc(q.prompt)}</p>${readButton(questionNarration(q))}${cards(q.cards)}${diagram(q.diagram)}${controls(q,answer,scope)}<p class="inline-message" id="answer-message" role="status"></p>`;}

function solution(q,answer,showAnswer=true){
 solutionContext[q.id]={answer,showAnswer};
 const i=Math.min(2,Math.max(0,solutionSteps[q.id]||0));
 const feedback=answer!==undefined&&!correct(q,answer)?(!answered(q,answer)?data.copy.messages.empty:q.wrongFeedback?.[answer]||q.misconception):'';
 return `<div class="worked-solution" data-solution="${esc(q.id)}"><div class="solution-heading"><h3>${esc(t('solutionTitle'))}</h3><span>${i+1} / 3</span></div>${feedback?`<p class="solution-feedback">${esc(feedback)}</p>`:''}<div class="solution-card"><span class="step-dot">${i+1}</span><p>${esc(q.steps[i])}</p></div>${diagram(q.solutionDiagrams?.[i]||q.solutionDiagram)}${readButton(q.steps[i])}<div class="frame-controls"><button class="button secondary small" data-action="solution-prev" data-id="${esc(q.id)}" ${i===0?'disabled':''}>${esc(t('solutionPrevious'))}</button><button class="button secondary small" data-action="solution-next" data-id="${esc(q.id)}" ${i===2?'disabled':''}>${esc(t('solutionNext'))}</button></div>${i===2?`<p class="solution-answer">${showAnswer?`答案：${esc(answerText(q,q.answer))}`:esc(q.explanation)}</p>`:''}</div>`;
}

function renderLesson(){
 const l=lessonById(params.get('id'));if(!l)return notFound();currentLesson=l;const s=lessonState(l.id),u=unitById(l.unitId);
 if(!remediationOpened&&params.has('step')){s.phase=Math.min(3,Math.max(1,Number(params.get('step'))||1));remediationOpened=true;}
 s.phase=Math.min(7,Math.max(0,s.phase||0));const ph=s.phase;setTitle(l.title);let body='',bottom='';
 if(ph===0){
   body=coach(l.teacher,l.title,l.story)+cards([{label:t('lessonStart'),text:l.goal}])+warmup(l.classroom,classroomState(s),data.classroomCopy);
   if(l.prerequisites?.length)body+=`<div class="prerequisites"><span>${esc(t('prerequisiteLabel'))}</span>${l.prerequisites.map(id=>`<a href="${url('lesson',id)}">${esc(lessonById(id).title)}</a>`).join('')}</div>`;
   bottom=`<button class="button" data-action="listen-start">${speakerIcon}${esc(t('listenStart'))}</button><button class="button secondary" data-action="lesson-next">${esc(t('silentStart'))}</button>`;
 }else if(ph<=3){
   const step=l.steps[ph-1],frames=step.frames||[],fi=Math.min(frames.length-1,s.demoFrames[ph]||0),pred=s.predictions[ph]||{};
   const atEnd=!frames.length||fi===frames.length-1,ready=atEnd&&(!step.check||pred.ok||pred.help);
   body=coach(l.teacher,step.title,step.text)+`<div class="step-count">示範 ${ph} / 3</div><div class="demonstration" data-frame="${Math.max(0,fi)}">${diagram(frames.length?frames[fi].diagram:step.diagram)}</div>`;
   if(frames.length)body+=`<div class="frame-controls"><button class="button secondary small" data-action="frame-prev" ${fi===0?'disabled':''}>${esc(t('previousFrame'))}</button><span class="frame-label">${esc(frames[fi].label)}<small>${fi+1} / ${frames.length}</small></span><button class="button warm small" data-action="frame-next" ${atEnd?'disabled':''}>${esc(t('nextFrame'))}</button></div>`;
   body+=cards(step.cards);
   if(step.check&&atEnd){const c=step.check;body+=`<section class="prediction"><h3>${esc(c.prompt)}</h3>${readButton(c.prompt+'。'+c.choices.map(x=>x.text).join('。'))}${diagram(c.diagram)}<div class="options">${c.choices.map(x=>`<button class="option" data-action="predict-pick" data-value="${esc(x.id)}" aria-pressed="${pred.answer===x.id}"><span class="choice-content">${graphic(x.diagram)}${esc(x.text)}</span></button>`).join('')}</div><button class="button warm small" data-action="predict-check">${esc(t('checkPrediction'))}</button>${pred.tries?`<div class="feedback ${pred.ok?'':'wrong'}" role="status"><p>${esc(pred.ok||pred.help?c.feedback:typeof c.wrongFeedback==='string'?c.wrongFeedback:c.wrongFeedback[pred.answer]||t('predictionRetry'))}</p></div>`:''}${!pred.ok&&pred.tries>=2?`<button class="button text" data-action="predict-help">${esc(t('predictionHelp'))}</button>`:''}</section>`;}
   bottom=`<button class="button secondary" data-action="lesson-back">再看上一步</button><button class="button" data-action="lesson-next" ${!ready?'disabled':''}>${ph===3?'到我試一試':'下一步'}</button>`;
 }else if(ph===4){
   const a=l.activity,q={...a,type:a.kind,id:l.id+'-activity'};currentQuestion=q;
   body=classroomTool(l.classroom,classroomState(s),data.classroomCopy)+coach('rabbit','到你動手了',a.instruction)+questionBlock(q,s.activityAnswer,'activity');
   if(s.activityFeedback!==null)body+=`<div class="feedback ${s.activityFeedback?'':'wrong'}"><h3>${s.activityFeedback?(s.activityAssisted?t('correctAfterHelp'):data.copy.messages.correct):data.copy.messages.retry}</h3><p>${esc(s.activityFeedback?a.explanation:a.hints[Math.min(1,(s.activityTries||1)-1)])}</p></div>`;
   body+=`<div class="actions"><button class="button warm" data-action="check-activity">看看合不合適</button><button class="button text" data-action="activity-help" ${(s.activityHelp||0)>=2?'disabled':''}>${esc(s.activityHelp?t('activityHelp2'):t('activityHelp1'))}</button></div>`;
   if(s.activityHelp)body+=`<div class="hint-box">${image('bird','')}<p>${esc(a.hints[Math.min(1,s.activityHelp-1)])}</p></div>`;
   if(!s.activityDone&&((s.activityTries||0)>=2||(s.activityHelp||0)>=2))body+=`<button class="button secondary" data-action="activity-demo">${esc(t('predictionHelp'))}</button>`;
   bottom=`<button class="button secondary" data-action="lesson-back">重看示範</button><button class="button" data-action="lesson-next" ${!s.activityDone?'disabled':''}>做小練習</button>`;
 }else if(ph===5){
   s.practiceIndex=Math.min(s.practiceIndex,l.practiceIds.length-1);const q=questionById(l.practiceIds[s.practiceIndex]);currentQuestion=q;
   const answer=s.practiceAnswers[q.id],fb=s.practiceFeedback[q.id];
   body=coach(l.teacher,`小練習 ${s.practiceIndex+1} / ${l.practiceIds.length}`,q.skill)+questionBlock(q,answer,'practice');
   if(fb)body+=`<div class="feedback ${fb.correct?'':'wrong'}"><h3>${esc(fb.correct?data.copy.messages.correct:data.copy.messages.retry)}</h3>${!fb.correct?`<p>${esc(q.wrongFeedback?.[answer]||q.misconception)}</p>`:''}</div>`;
   body+=`<div class="actions"><button class="button warm" data-action="check-practice">核對答案</button><button class="button text" data-action="hint" ${s.hints[q.id]>=2?'disabled':''}>${s.hints[q.id]?'再給一個提示':'點點，給我提示'}</button>${fb&&!fb.correct?'<button class="button text" data-action="reveal">看老師解題</button>':''}</div>`;
   if(s.hints[q.id])body+=`<div class="hint-box">${image('bird','')}<p>${esc(q.hints[s.hints[q.id]-1])}</p></div>`;
   if(fb?.correct||s.revealed[q.id])body+=solution(q,answer);
   bottom=`<button class="button secondary" data-action="lesson-back">重看操作</button><button class="button" data-action="practice-next" ${!(fb?.correct||s.revealed[q.id])?'disabled':''}>${esc(s.practiceIndex===l.practiceIds.length-1?t('tryFirst'):'下一題')}</button>`;
 }else if(ph===6){
   s.checkpointIndex=Math.min(s.checkpointIndex,l.checkpointIds.length-1);const q=questionById(l.checkpointIds[s.checkpointIndex]);currentQuestion=q;
   const answer=s.checkpointAnswers[q.id],fb=s.checkpointFeedback[q.id];
   body=coach(l.teacher,`${t('checkpointTitle')} ${s.checkpointIndex+1} / ${l.checkpointIds.length}`,t('checkpointIntro'))+questionBlock(q,answer,'checkpoint');
   if(!fb)body+=`<button class="button warm" data-action="check-checkpoint">${esc(t('checkpointSubmit'))}</button>`;
   else body+=`<div class="feedback ${fb.correct?'':'wrong'}"><h3>${esc(fb.correct?data.copy.messages.correct:data.copy.messages.retry)}</h3><p>${esc(fb.firstAttempt?(fb.correct?t('checkpointSuccess'):t('checkpointSupport')):t('checkpointSeen'))}</p></div>${solution(q,answer)}`;
   bottom=`<button class="button secondary" data-action="lesson-back">重看操作</button><button class="button" data-action="checkpoint-next" ${!fb?'disabled':''}>${esc(s.checkpointIndex===l.checkpointIds.length-1?t('checkpointDone'):t('checkpointNext'))}</button>`;
 }else{
   const independent=lessonEvidence(state,l)==='independent',index=data.lessons.findIndex(x=>x.id===l.id),next=data.lessons[index+1];
   body=coach('rabbit','把方法帶走',l.buddyLine)+`<div class="success-takeaway">${esc(l.takeaway)}</div><div class="evidence-note"><span class="pill">${esc(independent?t('independentLabel'):t('viewedLabel'))}</span><p>${esc(independent?t('checkpointSuccess'):t('checkpointSupport'))}</p></div>`;
   body+=explainBack(l.classroom,classroomState(s),data.classroomCopy);
   const retrySteps=[...new Set(l.checkpointIds.filter(id=>s.checkpointFeedback[id]&&!s.checkpointFeedback[id].correct).map(id=>questionById(id).remediationStep))];
   if(retrySteps.length)body+=`<div class="actions">${retrySteps.map(step=>`<a class="button secondary small" href="${url('lesson',l.id)}&step=${step}">${esc(t('returnStep'))}：${esc(l.steps[step-1].title)}</a>`).join('')}</div>`;
   bottom=`<button class="button secondary" data-action="restart-lesson">重看這一課</button>${!independent?`<button class="button" data-action="transfer-lesson">${esc(t('transferTestLabel'))}</button>`:''}${next?`<a class="button ${!independent?'secondary':''}" href="${url('lesson',next.id)}">下一課</a>`:`<a class="button" href="/test/">試試小測</a>`}`;
 }
 main.innerHTML=breadcrumb([['教學模式','/learn/'],[u.title,url('unit',u.id)],[l.title]])+`<div class="lesson-top"><h1>${esc(l.title)}</h1><span class="pill">${esc(l.level==='stretch'?t('stretchLabel'):t('foundationLabel'))}</span></div><div class="lesson-layout"><ol class="stage-rail" aria-label="學習步驟">${stages.map((label,i)=>`<li class="${stageIndex(ph)===i?'current':stageIndex(ph)>i?'done':''}" ${stageIndex(ph)===i?'aria-current="step"':''}><span class="stage-dot">${stageIndex(ph)>i?'✓':i+1}</span><span>${esc(i===4?t('checkpointTitle'):label)}</span></li>`).join('')}</ol><section class="learning-board" aria-label="課堂內容">${body}<div class="board-bottom">${bottom}</div></section></div>`;
 if(ph>=4&&ph<=6)lastAudioText=questionNarration(currentQuestion);else if(ph>=1&&ph<=3){const st=l.steps[ph-1],fr=st.frames?.[s.demoFrames[ph]||0];lastAudioText=st.title+'。'+st.text+'。'+(fr?.diagram.alt||st.diagram.alt);}
 if(ph===0||ph===7)main.insertAdjacentHTML('beforeend',teacherNotes(l.classroom,data.classroomCopy));
 save();
}

function renderTest(){
 setTitle('測試模式');const wrong=wrongQuestions(state),unit=params.get('unit')||'all',studied=state.completed.length>0;
 main.innerHTML=breadcrumb([['測試模式']])+pageHead(t('freshTestLabel'),t('freshTestNote'))+(state.activeTest?`<div class="resume-box"><p>你有一份小測未完成。</p><div class="actions"><a class="button" href="/quiz/">繼續未完成的小測</a><button class="button text" data-action="abandon">重新選一份</button></div></div>`:'')+`<div class="test-layout"><form class="test-form" id="test-form"><fieldset><legend>想怎樣試？</legend><div class="mode-options"><label class="mode-choice"><input type="radio" name="mode" value="mixed" checked><span><strong>混合小測</strong><small>${esc(t('testModeMixedNote'))}</small></span></label><label class="mode-choice"><input type="radio" name="mode" value="mc"><span><strong>選擇題挑戰</strong><small>${esc(t('testModeMcNote'))}</small></span></label><label class="mode-choice"><input type="radio" name="mode" value="wrong" ${wrong.length?'':'disabled'}><span><strong>錯題再試</strong><small>目前 ${wrong.length} 題待重練，每次最多 8 題。</small></span></label></div></fieldset><fieldset id="test-range"><legend>${esc(t('newQuestionsLabel'))}</legend><label class="check-row"><input type="radio" name="scope" value="studied" ${studied?'checked':'disabled'}>${esc(t('studiedLabel'))}</label><label class="check-row"><input type="radio" name="scope" value="all" ${studied?'':'checked'}>${esc(t('allTopicsLabel'))}</label>${!studied?`<p class="small muted">${esc(t('noStudiedTest'))} <a href="/learn/">${esc(t('startTeaching'))}</a></p>`:''}<select name="unit" id="test-unit" class="select-field" aria-label="選擇測驗單元"><option value="all">綜合各單元</option>${data.units.map(u=>`<option value="${u.id}" ${unit===u.id?'selected':''}>${esc(u.title)}</option>`).join('')}</select><label class="select-label" for="test-difficulty">${esc(t('difficultyLabel'))}</label><select name="difficulty" id="test-difficulty" class="select-field"><option value="foundation">${esc(t('difficultyStart'))}</option><option value="all">${esc(t('difficultyAll'))}</option><option value="stretch">${esc(t('difficultyStretch'))}</option></select></fieldset><fieldset><legend>要計時嗎？</legend><label class="check-row"><input type="checkbox" name="timed">挑戰 15 分鐘完成</label><p class="small muted">不勾選就不限時；計時結束會自動交卷。</p></fieldset><p id="test-message" class="inline-message" role="status"></p><button class="button" type="submit" ${state.activeTest?'disabled':''}>開始小測</button></form><aside class="test-aside">${image('fox','')}<h2>交卷後，一起找方法</h2><p>${esc(data.copy.messages.testWelcome)}</p><ul><li>每題 1 分，答錯不扣分。</li><li>可以先跳過，再回來作答。</li><li>交卷後可看圖解和解說。</li></ul></aside></div>`;
 lastAudioText=t('freshTestLabel')+'。'+t('freshTestNote');
}

function validTest(){const t=state.activeTest;return t&&Array.isArray(t.questionIds)&&t.questionIds.length&&t.questionIds.every(id=>questionById(id));}
function renderQuiz(){
 if(!validTest()){main.innerHTML=empty('fox','還未開始小測','選一個模式，準備好就開始。','去選小測','/test/');return;}
 const t=state.activeTest;if(t.durationMs&&Date.now()>=t.startedAt+t.durationMs){finishTest(true);return;}
 t.index=Math.min(Math.max(t.index||0,0),t.questionIds.length-1);const q=questionById(t.questionIds[t.index]);currentQuestion=q;const num=t.questionIds.filter(id=>answered(questionById(id),t.answers[id])).length;setTitle('小測進行中');
 main.innerHTML=`<div class="quiz-head"><div><h1>慢慢想，再作答</h1><div class="quiz-counter">第 ${t.index+1} / ${t.questionIds.length} 題 · ${esc(unitById(q.unitId).title)}</div></div><span class="timer" id="timer" role="timer">${t.durationMs?'':'不限時'}</span></div><div class="quiz-layout"><section class="quiz-card">${questionBlock(q,t.answers[q.id],'quiz')}<div class="quiz-actions"><button class="button secondary" data-action="quiz-prev" ${t.index===0?'disabled':''}>上一題</button><button class="button" data-action="${t.index===t.questionIds.length-1?'submit-test':'quiz-next'}">${t.index===t.questionIds.length-1?'檢查並交卷':'下一題 →'}</button></div></section><aside class="quiz-sidebar"><p>跳到題目</p><div class="quiz-nav">${t.questionIds.map((id,i)=>`<button class="question-dot ${answered(questionById(id),t.answers[id])?'has-answer':''} ${i===t.index?'current':''}" data-action="quiz-jump" data-index="${i}" aria-label="第${i+1}題，${answered(questionById(id),t.answers[id])?'已答':'未答'}" ${i===t.index?'aria-current="step"':''}>${i+1}</button>`).join('')}</div><p>${num} / ${t.questionIds.length} 題已答<br>深綠色是現在這題</p><div class="quiz-progress"><span style="width:${num/t.questionIds.length*100}%"></span></div><button class="button secondary" data-action="submit-test" style="margin-top:18px">檢查並交卷</button><p style="margin-top:18px">進度會留在這個瀏覽器。計時測試離開頁面後仍會繼續計時。</p></aside></div>`;lastAudioText=questionNarration(q);save();updateTimer();
}
function updateTimer(){clearTimeout(timer);if(page!=='quiz'||!validTest())return;const t=state.activeTest;if(!t.durationMs)return;const ms=t.startedAt+t.durationMs-Date.now();if(ms<=0){finishTest(true);return;}const sec=Math.ceil(ms/1000);if($('#timer')){$('#timer').textContent=`剩餘 ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;$('#timer').classList.toggle('urgent',sec<=60);}timer=setTimeout(updateTimer,500);}
function empty(id,title,text,label,link){return `<div class="empty-state">${image(id,'')}<h1>${esc(title)}</h1><p>${esc(text)}</p><div class="actions"><a class="button" href="${link}">${esc(label)}</a></div></div>`;}
function resultQuestion(entry,index,open=false){const q=questionById(entry.questionId);if(!q)return '';const status={correct:'答對',wrong:'再想一想',blank:'未作答'}[entry.status];return `<details class="result-question" ${open?'open':''}><summary><span class="pill ${entry.status==='wrong'?'status-wrong':''}">${status}</span><span>${index+1}. ${esc(q.skill)}</span></summary><div class="result-body"><p class="question-prompt">${esc(q.prompt)}</p>${readButton(questionNarration(q))}${cards(q.cards)}${diagram(q.diagram)}<div class="answer-line"><div><small>你的答案</small><strong>${esc(answerText(q,entry.answer))}</strong></div><div><small>正確答案</small><strong>${esc(answerText(q,q.answer))}</strong></div></div>${solution(q,entry.answer,false)}<a class="button secondary small" href="${remediationUrl(q)}">${esc(t('returnStep'))}：${esc(lessonById(q.lessonId).title)}</a></div></details>`;}

function renderResults(){const r=state.results.find(x=>x.id===params.get('id'))||(!params.get('id')?state.results.at(-1):null);if(!r){main.innerHTML=empty('rabbit','這裏還沒有成績','完成一次小測，就可以在這裏逐題看解說。','開始小測','/test/');return;}setTitle('小測成績與解題');const wrong=r.entries.filter(e=>e.status==='wrong').length,blank=r.entries.filter(e=>e.status==='blank').length;const byUnit=data.units.map(u=>{const e=r.entries.filter(e=>questionById(e.questionId)?.unitId===u.id);return {u,count:e.length,good:e.filter(e=>e.status==='correct').length};}).filter(o=>o.count);
 main.innerHTML=breadcrumb([['我的學習','/progress/'],['這次的小測']])+`<div class="result-top">${image('rabbit','')}<div><h1>一起看看你的方法</h1><p>${esc(data.copy.messages.resultIntro)}</p></div><div class="score">${r.score}<small> / ${r.total} 分</small></div></div><div class="result-breakdown"><span class="status-correct">答對 ${r.score} 題</span><span class="status-wrong">答錯 ${wrong} 題</span><span>漏答 ${blank} 題</span><span>用了 ${Math.floor(r.elapsedMs/60000)} 分 ${Math.floor(r.elapsedMs/1000)%60} 秒${r.autoSubmitted?' · 時間到，自動交卷':''}</span></div><details class="results-methods"><summary>這次各單元的表現</summary><p class="small muted">只反映這次題目的作答，題數較少，不能用來判斷全部能力。</p><div class="skill-results">${byUnit.map(o=>`<div class="skill-row"><span>${esc(o.u.title)}</span><div class="skill-bar" aria-hidden="true"><i style="width:${o.good/o.count*100}%"></i></div><strong>${o.good} / ${o.count}</strong></div>`).join('')}</div></details><div class="actions">${wrong+blank?`<button class="button" data-action="retry-result" data-id="${r.id}">把這次錯題再試一次</button>`:'<a class="button" href="/learn/">再學一個方法</a>'}<button class="button secondary" data-action="transfer-result" data-id="${r.id}">${esc(t('transferTestLabel'))}</button><a class="button secondary" href="/test/">選另一份小測</a></div><div class="section-head"><h2>逐題看解說</h2><span class="small muted">按題目展開</span></div>${r.entries.map((e,i)=>resultQuestion(e,i,i===r.entries.findIndex(x=>x.status!=='correct'))).join('')}`;
}
function renderReview(){setTitle('我的錯題');const ids=wrongQuestions(state);main.innerHTML=breadcrumb([['我的學習','/progress/'],['我的錯題']])+pageHead('回來，再想一次','保留最近一次答錯或漏答的題目；重練答對後，就會從這裏移走。')+(ids.length?`<div class="actions"><button class="button" data-action="retry-all">重練錯題（最多 8 題）</button></div>${ids.map((id,i)=>{let e;[...state.results].reverse().some(r=>{e=r.entries.find(x=>x.questionId===id);return !!e;});return resultQuestion(e||{questionId:id,answer:state.practice[id]?.lastAnswer,status:'wrong'},i);}).join('')}`:empty('bird','暫時沒有待重練的題目','完成小測後，答錯或漏答的題目會留在這裏，讓你慢慢重溫。','去做小測','/test/'));}
function renderProgress(){setTitle('我的學習');const n=nextLesson(),wrong=wrongQuestions(state);main.innerHTML=breadcrumb([['我的學習']])+pageHead('你走過的學習路','課堂進度和小測紀錄儲存在這個瀏覽器，可以隨時回來繼續。')+`<div class="progress-overview"><div><strong>${state.completed.length} / ${data.lessons.length}</strong><span>${esc(t('viewedLabel'))}</span></div><div><strong>${state.results.length}</strong><span>已完成小測</span></div><div><strong>${wrong.length}</strong><span>待重練題目</span></div></div><div class="actions"><a class="button" href="${url('lesson',n.id)}">繼續學習</a><a class="button secondary" href="/review/">看我的錯題</a></div>${renderEvidence()}<div class="section-head"><h2>各單元進度</h2></div><div class="unit-grid">${data.units.map(unitTile).join('')}</div><div class="section-head"><h2>小測紀錄</h2></div>${state.results.length?`<div class="history-list">${[...state.results].reverse().map(r=>`<a class="history-item" href="${url('results',r.id)}"><div><h3>${esc(r.unitId==='all'?'綜合小測':unitById(r.unitId)?.title||'錯題重練')}</h3><p>${new Date(r.finishedAt).toLocaleString('zh-HK')} · ${r.mode==='wrong'?'錯題重練':r.mode==='mc'?'選擇題挑戰':'混合小測'}</p></div><strong>${r.score} / ${r.total}</strong><span class="text-link">看解說</span></a>`).join('')}</div>`:'<p class="muted">完成第一份小測後，成績和解說會放在這裏。</p>'}<div class="backup-area"><h2>把學習紀錄帶走</h2><p>沒有登入及自動同步。換裝置前，可以匯出檔案，再在另一個瀏覽器匯入。匯入會取代這裏的已完成紀錄，未完成的小測不會匯入。</p><div class="actions"><button class="button secondary" data-action="export">匯出紀錄</button><button class="button secondary" data-action="import">匯入紀錄</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div><p id="backup-message" class="inline-message" role="status"></p></div>`;}
function renderGuide(){setTitle('學習指南');const g=data.copy.guide;main.innerHTML=breadcrumb([['學習指南']])+pageHead(g.title,g.intro)+`<div class="guide-layout"><nav class="guide-nav" aria-label="指南目錄">${g.sections.map((s,i)=>`<a href="#guide-${i}">${esc(s.title)}</a>`).join('')}</nav><article>${g.sections.map((s,i)=>`<section class="article-section" id="guide-${i}"><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>${readButton(s.text)}</section>`).join('')}</article></div>`;}
function renderPlan(){setTitle('教學設計');const p=data.plan;main.innerHTML=breadcrumb([['教學設計']])+pageHead(p.title,p.intro)+`<ol class="plan-flow">${p.selfLearningFlow.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="section-head"><h2>怎樣教，孩子才跟得上</h2></div>${p.teaching.map(s=>`<section class="article-section"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></section>`).join('')}<div class="section-head"><h2>用不同方式，看看是否明白</h2></div>${p.assessment.map(s=>`<section class="article-section"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></section>`).join('')}<div class="section-head"><h2>網站的學習路徑</h2></div><table class="route-table"><thead><tr><th>頁面</th><th>孩子可以做甚麼</th></tr></thead><tbody>${[['教學模式','/learn/','選單元，跟老師逐步學。'],['測試模式','/test/','選題型、單元及是否計時。'],['我的學習','/progress/','繼續課堂，查看成績和解說。'],['我的錯題','/review/','重看方法，再獨立作答。']].map(r=>`<tr><td><a href="${r[1]}">${r[0]}</a></td><td>${r[2]}</td></tr>`).join('')}</tbody></table><p><a class="text-link" href="/sources/">${esc(t('sourceLinkLabel'))}</a></p><div class="section-head"><h2>課程與使用安排</h2></div>${p.roadmap.map(s=>`<section class="article-section"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></section>`).join('')}`;}
function notFound(){setTitle('找不到這一頁');main.innerHTML=empty('bird','這一頁走錯路了','回到學習地圖，再選一堂課。','返回學習地圖','/learn/');}
function render(){clearTimeout(timer);({home:renderHome,learn:renderLearn,unit:renderUnit,lesson:renderLesson,test:renderTest,quiz:renderQuiz,results:renderResults,review:renderReview,progress:renderProgress,guide:renderGuide,plan:renderPlan,sources:renderSources}[page]||notFound)();
 if(page==='home'){
  $('.welcome-bubble')?.insertAdjacentHTML('beforeend',readButton(character('owl').line));
  document.querySelectorAll('.team-member>div').forEach((el,i)=>el.insertAdjacentHTML('beforeend',readButton(data.copy.characters[i].line)));
 }
 if(page==='test')$('.test-aside p')?.insertAdjacentHTML('afterend',readButton(data.copy.messages.testWelcome));
}
function rerenderWithFocus(action,value){render();const selector=`[data-action="${action}"]${value!==undefined?`[data-value="${CSS.escape(String(value))}"]`:''}`;$(selector)?.focus({preventScroll:true});}
function message(text){const el=$('#answer-message');if(el)el.textContent=text;announce(text);}
function valueFor(scope){if(scope==='quiz')return state.activeTest.answers[currentQuestion.id];const s=lessonState(currentLesson.id);return scope==='activity'?s.activityAnswer:s.practiceAnswers[currentQuestion.id];}
function setAnswer(scope,value){
 if(scope==='quiz'){state.activeTest.answers[currentQuestion.id]=value;}
 else{const s=lessonState(currentLesson.id);if(scope==='activity'){s.activityAnswer=value;s.activityFeedback=null;s.activityDone=false;}
 else if(scope==='checkpoint'){if(s.checkpointFeedback[currentQuestion.id])return;s.checkpointAnswers[currentQuestion.id]=value;}
 else{s.practiceAnswers[currentQuestion.id]=value;delete s.practiceFeedback[currentQuestion.id];delete s.revealed[currentQuestion.id];}}
 save();
}

function showDialog(title,text,action,label){$('#dialog-content').innerHTML=`<h2 id="dialog-title">${esc(title)}</h2><p>${esc(text)}</p><div class="actions"><button class="button secondary" data-action="close-dialog">返回</button><button class="button" data-action="${action}">${esc(label)}</button></div>`;$('#confirm-dialog').showModal();}
function newTest(questions,mode='mixed',unitId='all',timed=false){state.activeTest={id:crypto.randomUUID?.()||String(Date.now()),questionIds:questions.map(q=>q.id),answers:{},orderDrafts:{},index:0,mode,unitId,startedAt:Date.now(),durationMs:timed?15*60000:null};save();location.href='/quiz/';}
function finishTest(auto=false){if(!validTest())return;const result=gradeTest(state.activeTest,data.questions);result.autoSubmitted=auto;state.results.push(result);state.results=state.results.slice(-300);state.activeTest=null;clearTimeout(timer);save();location.href=url('results',result.id);}
function phaseNext(){
 const s=lessonState(currentLesson.id);
 if(s.phase===4&&!s.activityDone)return;
 if(s.phase>=1&&s.phase<=3){const step=currentLesson.steps[s.phase-1],pred=s.predictions[s.phase];if(step.frames?.length&&(s.demoFrames[s.phase]||0)<step.frames.length-1)return;if(step.check&&!pred?.ok&&!pred?.help)return;}
 s.phase=Math.min(7,s.phase+1);save();renderLesson();$('.learning-board')?.scrollIntoView({block:'start',behavior:'instant'});speak(lastAudioText);
}

function renderEvidence(){
 const independent=data.lessons.filter(l=>lessonEvidence(state,l)==='independent').length;
 const records=Object.entries(state.practice).filter(([id])=>questionById(id)?.role==='practice').map(([,p])=>p);
 const first=records.filter(p=>p.firstCorrect&&p.hintsOnFirst===0).length;
 const supported=records.filter(p=>p.lastCorrect&&(!p.firstCorrect||p.hintsOnFirst>0)).length;
 return `<section class="learning-evidence"><h2>${esc(t('practiceEvidenceTitle'))}</h2><p>${esc(t('progressEvidenceNote'))}</p><dl><div><dt>${esc(t('independentLabel'))}</dt><dd>${independent} / ${data.lessons.length}</dd></div><div><dt>${esc(t('firstTryLabel'))}</dt><dd>${first} / ${records.length}</dd></div><div><dt>${esc(t('supportedLabel'))}</dt><dd>${supported}</dd></div></dl></section>`;
}
function renderSources(){
 setTitle(t('sourceTitle'));
 if(!sourceData){main.innerHTML=pageHead(t('sourceTitle'),t('sourceIntro'));fetch('/assets/source-map.json').then(r=>{if(!r.ok)throw new Error('source map');return r.json();}).then(d=>{sourceData=d;renderSources();}).catch(()=>{main.innerHTML=pageHead(t('sourceTitle'),t('sourceBoundary'));});return;}
 const labels=t('sourceCountsLabels'),statuses=t('sourceStatusLabels'),coverageLabels=t('sourceCoverageLabels');
 const counts=sourceData.counts;
 main.innerHTML=breadcrumb([['教學設計','/plan/'],[t('sourceTitle')]])+pageHead(t('sourceTitle'),t('sourceIntro'))+`<p>${esc(t('sourceBoundary'))}</p><dl class="source-counts">${['files','years','questions','verified','keyOnly','unclear'].map(k=>`<div><dt>${esc(labels[k])}</dt><dd>${counts[k]}</dd></div>`).join('')}</dl><ul class="source-caveats">${t('sourceCaveats').map(c=>`<li>${esc(c)}</li>`).join('')}</ul><section class="source-coverage"><h2>${esc(t('sourceCoverageTitle'))}</h2><p>${esc(t('sourceCoverageNote'))}</p><dl class="source-counts">${['method','foundation','not_covered'].map(k=>`<div><dt>${esc(coverageLabels[k])}</dt><dd>${sourceData.coverageCounts[k]||0}</dd></div>`).join('')}</dl></section><p>${esc(t('sourceMappedNote'))}</p>${sourceData.years.map(y=>`<details class="source-year"><summary>${y.year} · ${y.questions.length} ${esc(t('sourceQuestionCountLabel'))}</summary><div class="source-rows">${y.questions.map(q=>`<article><h3>${y.year} · ${q.number}</h3><p>${esc(q.summary)}</p><p><span class="pill">${esc(coverageLabels[q.coverage])}</span></p><p class="small muted">${esc(q.coverageReason)}</p><p class="small muted">${esc(statuses[q.answerStatus])}${q.suppliedAnswer?' · '+esc(q.suppliedAnswer):''}</p><div class="source-lessons">${q.lessonIds.length?q.lessonIds.map(id=>`<a href="${url('lesson',id)}">${esc(lessonById(id)?.title||id)}</a>`).join(''):`<span class="small muted">${esc(t('sourceUnmapped'))}</span>`}</div></article>`).join('')}</div></details>`).join('')}`;
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||!data)return;const a=b.dataset.action,scope=b.dataset.scope,s=currentLesson?lessonState(currentLesson.id):null,q=currentQuestion;
 switch(a){
 case 'classroom':{if(!s)break;const action=b.dataset.do,value=b.dataset.value;classroomAction(currentLesson.classroom,classroomState(s),action,value);save();renderLesson();const selector=`[data-action="classroom"][data-do="${CSS.escape(action)}"]${value!==undefined?`[data-value="${CSS.escape(value)}"]`:''}`;$(selector)?.focus({preventScroll:true});break;}
 case 'listen-start':state.settings.readAloud=true;save();updateAudioButton();phaseNext();break;
 case 'frame-prev':case 'frame-next':{const frames=currentLesson.steps[s.phase-1].frames;s.demoFrames[s.phase]=Math.min(frames.length-1,Math.max(0,(s.demoFrames[s.phase]||0)+(a==='frame-next'?1:-1)));save();renderLesson();speak(frames[s.demoFrames[s.phase]].label+'。'+frames[s.demoFrames[s.phase]].diagram.alt);$(`[data-action="${a}"]:not(:disabled)`)?.focus({preventScroll:true});break;}
 case 'predict-pick':{const pred=s.predictions[s.phase]||{};s.predictions[s.phase]={...pred,answer:b.dataset.value,ok:false,help:false};save();renderLesson();$(`[data-action="predict-pick"][data-value="${CSS.escape(b.dataset.value)}"]`)?.focus({preventScroll:true});break;}
 case 'predict-check':{const c=currentLesson.steps[s.phase-1].check,pred=s.predictions[s.phase]||{};if(!pred.answer){announce(data.copy.messages.empty);speak(data.copy.messages.empty,true);break;}pred.tries=(pred.tries||0)+1;pred.ok=pred.answer===c.answer;s.predictions[s.phase]=pred;save();renderLesson();speak(pred.ok?c.feedback:typeof c.wrongFeedback==='string'?c.wrongFeedback:c.wrongFeedback[pred.answer]||t('predictionRetry'));$('.prediction .feedback')?.scrollIntoView({block:'nearest'});break;}
 case 'predict-help':{const c=currentLesson.steps[s.phase-1].check,pred=s.predictions[s.phase];if(pred?.tries<2)break;pred.help=true;pred.answer=c.answer;save();renderLesson();speak(c.feedback);break;}
 case 'activity-demo':{if((s.activityTries||0)<2&&(s.activityHelp||0)<2)break;s.activityAnswer=Array.isArray(q.answer)?[...q.answer]:q.answer;if(q.type==='order')s.orderDrafts[q.id]=[...q.answer];s.activityDone=true;s.activityFeedback=true;s.activityAssisted=true;save();renderLesson();speak(q.explanation);break;}
 case 'solution-prev':case 'solution-next':{const sq=questionById(b.dataset.id),ctx=solutionContext[sq.id];solutionSteps[sq.id]=Math.min(2,Math.max(0,(solutionSteps[sq.id]||0)+(a==='solution-next'?1:-1)));const box=b.closest('.worked-solution');box.outerHTML=solution(sq,ctx.answer,ctx.showAnswer);document.querySelector(`[data-solution="${CSS.escape(sq.id)}"] [data-action="${a}"]:not(:disabled)`)?.focus({preventScroll:true});speak(sq.steps[solutionSteps[sq.id]]);break;}
 case 'check-checkpoint':{
   if(s.checkpointFeedback[q.id])break;const answer=s.checkpointAnswers[q.id];if(!answered(q,answer)){message(data.copy.messages.empty);break;}
   const ok=correct(q,answer),firstAttempt=!state.checkHistory[q.id];state.checkHistory[q.id]=(state.checkHistory[q.id]||0)+1;s.checkpointFeedback[q.id]={correct:ok,firstAttempt};
   const record=state.practice[q.id]||{firstAnswer:answer,firstCorrect:ok,hintsOnFirst:0,attempts:0};record.attempts++;record.lastAnswer=answer;record.lastCorrect=ok;record.updatedAt=Date.now();state.practice[q.id]=record;
   save();renderLesson();speak(ok?data.copy.messages.correct:q.wrongFeedback?.[answer]||q.misconception);break;
 }
 case 'checkpoint-next':{
   if(!s.checkpointFeedback[q.id])break;
   if(s.checkpointIndex<currentLesson.checkpointIds.length-1)s.checkpointIndex++;
   else{const entries=currentLesson.checkpointIds.map(id=>({questionId:id,answer:s.checkpointAnswers[id],...s.checkpointFeedback[id]}));state.checkpoints[currentLesson.id]||={entries,finishedAt:Date.now()};s.phase=7;if(!state.completed.includes(currentLesson.id))state.completed.push(currentLesson.id);}
   save();renderLesson();$('.learning-board')?.scrollIntoView({block:'start',behavior:'instant'});speak(lastAudioText);break;
 }
 case 'transfer-result':{
   if(state.activeTest){showNotice('你有未完成的小測。請先到測試模式繼續或重新選擇。');break;}
   const r=state.results.find(x=>x.id===b.dataset.id),entries=r.entries.some(e=>e.status!=='correct')?r.entries.filter(e=>e.status!=='correct'):r.entries;
   const ids=[...new Set(entries.map(e=>questionById(e.questionId).lessonId))],qs=chooseQuestions(data.questions,'mixed','all',[],{lessonIds:ids,seenIds:seenQuestions(state),newOnly:true});
   if(qs.length)newTest(qs,'mixed','all');else{showNotice(t('transferUnavailable'));speak(t('transferUnavailable'));}break;
 }
 case 'transfer-lesson':{
   if(state.activeTest){showNotice('你有未完成的小測。請先到測試模式繼續或重新選擇。');break;}
   const qs=chooseQuestions(data.questions,'mixed',currentLesson.unitId,[],{lessonIds:[currentLesson.id],seenIds:seenQuestions(state),newOnly:true});
   if(qs.length)newTest(qs,'mixed',currentLesson.unitId);else{showNotice(t('transferUnavailable'));speak(t('transferUnavailable'));}break;
 }
 case 'read':speak(b.dataset.text,true);break;
 case 'lesson-next':phaseNext();break;
 case 'lesson-back':s.phase=s.phase>=5?4:Math.max(0,s.phase-1);save();renderLesson();speak(lastAudioText);break;
 case 'restart-lesson':s.phase=0;s.practiceIndex=0;s.activityFeedback=null;s.activityDone=false;s.activityAnswer=null;s.activityHelp=0;s.activityAssisted=false;s.predictions={};s.demoFrames={};save();renderLesson();break;
 case 'pick':setAnswer(scope,b.dataset.value);rerenderWithFocus(a,b.dataset.value);break;
 case 'select-activity':{const selected=Array.isArray(s.activityAnswer)?[...s.activityAnswer]:[];const i=selected.indexOf(b.dataset.value);i>=0?selected.splice(i,1):selected.push(b.dataset.value);setAnswer('activity',selected);rerenderWithFocus(a,b.dataset.value);break;}
 case 'move':{const arr=getDraft(q,scope),i=+b.dataset.index,j=i+(+b.dataset.dir);if(j<0||j>=arr.length)break;[arr[i],arr[j]]=[arr[j],arr[i]];setAnswer(scope,null);render();const target=$(`[data-action="move"][data-index="${j}"][data-dir="${b.dataset.dir}"]:not(:disabled)`)||$(`[data-action="move"][data-index="${j}"]:not(:disabled)`);target?.focus({preventScroll:true});announce('已調整次序。記得按「用這個次序」。');break;}
 case 'confirm-order':setAnswer(scope,[...getDraft(q,scope)]);render();$('[data-action="confirm-order"]')?.focus({preventScroll:true});message('已記錄這個次序。');break;
 case 'check-activity':{const answer=s.activityAnswer;const present=q.type==='select'?Array.isArray(answer)&&answer.length:answered(q,answer);if(!present){message(data.copy.messages.empty);break;}const ok=q.type==='select'?answer.length===q.answer.length&&q.answer.every(x=>answer.includes(x)):correct(q,answer);s.activityFeedback=ok;s.activityTries=(s.activityTries||0)+1;s.activityDone=ok;save();renderLesson();speak(ok?q.explanation:q.hints[Math.min(1,s.activityTries-1)]);$('.feedback')?.scrollIntoView({block:'nearest'});break;}
 case 'activity-help':s.activityHelp=Math.min(2,(Number(s.activityHelp)||0)+1);save();renderLesson();speak(currentLesson.activity.hints[s.activityHelp-1]);break;
 case 'check-practice':{const answer=s.practiceAnswers[q.id];if(!answered(q,answer)){message(q.type==='number'&&String(answer??'').trim()?'請只填一個整數，不用輸入單位。':data.copy.messages.empty);break;}const ok=correct(q,answer);s.practiceFeedback[q.id]={correct:ok};const record=state.practice[q.id]||{firstAnswer:answer,firstCorrect:ok,hintsOnFirst:s.hints[q.id]||0,attempts:0};record.attempts++;record.lastAnswer=answer;record.lastCorrect=ok;record.updatedAt=Date.now();state.practice[q.id]=record;save();renderLesson();speak(ok?data.copy.messages.correct:q.wrongFeedback?.[answer]||data.copy.messages.retry);$('.feedback')?.scrollIntoView({block:'nearest'});break;}
 case 'hint':s.hints[q.id]=Math.min(2,(s.hints[q.id]||0)+1);save();renderLesson();speak(q.hints[s.hints[q.id]-1]);$('.hint-box')?.scrollIntoView({block:'nearest'});break;
 case 'reveal':s.revealed[q.id]=true;save();renderLesson();speak(q.steps[0]);$('.worked-solution')?.scrollIntoView({block:'start'});break;
 case 'practice-next':{const fb=s.practiceFeedback[q.id];if(!fb?.correct&&!s.revealed[q.id])break;if(s.practiceIndex<currentLesson.practiceIds.length-1)s.practiceIndex++;else{s.phase=6;}save();renderLesson();$('.learning-board')?.scrollIntoView({block:'start',behavior:'instant'});speak(lastAudioText);break;}
 case 'quiz-prev':state.activeTest.index--;save();renderQuiz();speak(lastAudioText);break;
 case 'quiz-next':state.activeTest.index++;save();renderQuiz();speak(lastAudioText);break;
 case 'quiz-jump':state.activeTest.index=+b.dataset.index;save();renderQuiz();speak(lastAudioText);break;
 case 'submit-test':{const t=state.activeTest,count=t.questionIds.filter(id=>!answered(questionById(id),t.answers[id])).length;showDialog('準備交卷？',count?`還有 ${count} 題未作答。可以返回補答，或現在交卷；未答的題目得 0 分。`:'所有題目已作答。交卷後就可以看成績和逐題解說。','finish-test','交卷看結果');break;}
 case 'finish-test':$('#confirm-dialog').close();finishTest();break;
 case 'close-dialog':$('#confirm-dialog').close();break;
 case 'abandon':showDialog('重新選小測？','這份未完成小測的答案會清除。已完成的成績會保留。','confirm-abandon','重新選擇');break;
 case 'confirm-abandon':state.activeTest=null;save();$('#confirm-dialog').close();renderTest();break;
 case 'retry-result':{if(state.activeTest){showNotice('你有未完成的小測。請先到測試模式繼續或重新選擇。');break;}const r=state.results.find(r=>r.id===b.dataset.id);newTest(r.entries.filter(e=>e.status!=='correct').map(e=>questionById(e.questionId)),'wrong','all');break;}
 case 'retry-all':if(state.activeTest)showNotice('你有未完成的小測。請先到測試模式繼續或重新選擇。');else newTest(chooseQuestions(data.questions,'wrong','all',wrongQuestions(state)),'wrong','all');break;
 case 'export':{const blob=new Blob([JSON.stringify({...state,activeTest:null},null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=`數學探險所-學習紀錄-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(href),2000);$('#backup-message').textContent='已準備好備份下載。請保存這個 JSON 檔案。';break;}
 case 'import':$('#backup-file').click();break;
 case 'confirm-import':state=importCandidate;importCandidate=null;save();$('#confirm-dialog').close();renderProgress();$('#backup-message').textContent='已匯入已完成的學習紀錄。';break;
 }
});
document.addEventListener('input',e=>{if(e.target.matches('[data-number]')){setAnswer(e.target.dataset.number,e.target.value);if($('#answer-message'))$('#answer-message').textContent='';}});
document.addEventListener('change',async e=>{
 if(e.target.name==='mode'){const isWrong=e.target.value==='wrong';$('#test-range').disabled=isWrong;}
 if(e.target.id==='backup-file'){try{const file=e.target.files[0];if(!file)return;if(file.size>4*1024*1024)throw new Error('檔案太大，請選擇網站匯出的學習紀錄。');importCandidate=validateState(JSON.parse(await file.text()),data.questions,data.lessons);showDialog('匯入這份紀錄？',`備份有 ${importCandidate.completed.length} 堂已完成課堂及 ${importCandidate.results.length} 次小測。匯入會取代這裏的紀錄。`,'confirm-import','匯入並取代');}catch(err){$('#backup-message').textContent=err.message||'檔案無法讀取，請選擇網站匯出的 JSON 檔案。';}}
});
document.addEventListener('submit',e=>{if(e.target.id!=='test-form')return;e.preventDefault();if(state.activeTest)return;const fd=new FormData(e.target),mode=fd.get('mode'),unit=fd.get('unit')||'all';const qs=chooseQuestions(data.questions,mode,unit,wrongQuestions(state),{lessonIds:fd.get('scope')==='studied'?state.completed:undefined,difficulty:fd.get('difficulty'),seenIds:seenQuestions(state)});if(qs.length)newTest(qs,mode,unit,fd.has('timed'));else{$('#test-message').textContent=t('noQuestions');speak(t('noQuestions'));}});
$('#audio-toggle').addEventListener('click',()=>{state.settings.readAloud=!state.settings.readAloud;save();updateAudioButton();if(state.settings.readAloud)speak(lastAudioText||data.copy.home.teacherWelcome,true);else{speechRequest++;recordedVoice.stop();window.speechSynthesis?.cancel();}});
function updateAudioButton(){const b=$('#audio-toggle');b.setAttribute('aria-pressed',String(state.settings.readAloud));b.textContent=state.settings.readAloud?'朗讀已開啟':'開啟朗讀';}
window.addEventListener('pagehide',()=>{speechRequest++;recordedVoice.stop();window.speechSynthesis?.cancel();});
try{const response=await fetch('/assets/content.json?v=c4b3008db9c7',{cache:'no-cache'});if(!response.ok)throw new Error('內容尚未載入');data=await response.json();load();const group=['learn','unit','lesson'].includes(page)?'learn':['test','quiz','results'].includes(page)?'test':['progress','review'].includes(page)?'progress':'';document.querySelector(`[data-nav="${group}"]`)?.setAttribute('aria-current','page');updateAudioButton();render();document.querySelector('.site-footer div').insertAdjacentHTML('beforeend','<a href="/sources/">'+esc(t('sourceLinkLabel'))+'</a>');if(state.settings.readAloud&&['lesson','quiz'].includes(page))setTimeout(()=>speak(lastAudioText),150);}catch(error){main.innerHTML=`<div class="empty-state"><h1>課堂暫時未能打開</h1><p>請檢查網絡，然後重新載入。</p><a class="button" href="${esc(location.pathname+location.search)}">重新載入</a></div>`;console.error(error);}
