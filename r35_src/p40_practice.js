/* ===== p40 part 2: practice with a school range (D3 voice fallback, D5 retries and hints, D6 wording, D12 study, D13, D25) ===== */
 const TYPED=['spell','listenSpell','cloze','sentence'];
 const CHOICE=['meaning','listenChoice','missing'];
 const LISTEN=['listenChoice','listenSpell','sentence'];
 const MAX_TRIES=3;      // the first answer plus two more tries
 const HINT_MAX=2;

 // Per-session state. Only the compact part below is written to storage (see the session validator anchor).
 function pst(){
  const s=db.session;if(!s)return null;
  if(!s.p40||typeof s.p40!=='object')s.p40={res:[],tries:0,hint:0,item:'',copy:false,wrong:[]};
  const it=currentItem();
  if(it&&s.p40.item!==it.id)Object.assign(s.p40,{item:it.id,tries:0,hint:0,copy:false,wrong:[]});
  if(!Array.isArray(s.p40.wrong))s.p40.wrong=[];
  return s.p40;
 }
 const expectedOf=(it,w)=>it.type==='missing'?it.missing.expected:it.type==='sentence'?(w.example||autoExample(w)):w.en;
 const alpha=c=>/[A-Za-z]/.test(c);
 function markHinted(it){
  if(!isLoggedIn()||!it)return;
  const c=pgChild();if(!c.hints.includes(it.id)){c.hints.push(it.id);c.hints=c.hints.slice(-2000);}
 }
 const hasPicture=w=>{try{return !!imageFor(w)||!!MEDIA_CATALOG[norm(w.en)];}catch(_){return false;}};

 // ---------------------------------------------------------------- voice (D3) ---------------------------------------------
 function speakTextOf(it,w){return it.type==='sentence'?(w.kind==='sentence'?w.en:w.example||autoExample(w)):w.en;}
 const T0=performance.now();
 /* 'ok' | 'none' (this device has no English voice) | 'failed' (the voice did not play) */
 function voiceState(it){
  const s=db.session,w=currentWord();if(!s||!w||!it)return 'ok';
  let has=false;try{has=!!usableAudio(speakTextOf(it,w)||'');}catch(_){}
  if(has)return s.audioStatus==='error'?'failed':'ok';
  if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return 'none';
  let n=-1;try{n=speechSynthesis.getVoices().length;}catch(_){}
  if(n===0&&performance.now()-T0>1500)return 'none';   // an empty list this long after load means the device has no voices
  if(n>0&&!bestBritishVoice())return 'none';
  return s.audioStatus==='error'?'failed':'ok';
 }
 function audioOptional(it){const S=pst();return !!(S&&S.copy)||voiceState(it)!=='ok';}
 const NOTE_NONE='這部裝置沒有英文聲音，請家長讀給孩子聽或改用其他裝置。';
 const NOTE_FAILED='這次沒有播出聲音。請再按一次，或請家長讀給孩子聽。';
 audioControlBody=function(it){
  const s=db.session,w=currentWord(),status=s?.audioStatus||'idle';
  const act=it.type==='sentence'?'speak-sentence':'speak-word';
  const text=w?speakTextOf(it,w):'';
  let has=false;try{has=!!usableAudio(text||'');}catch(_){}
  const vs=LISTEN.includes(it.type)||it.type==='spell'?voiceState(it):'ok';
  const label=s&&s.played?'🔊 再聽一次':it.type==='sentence'?'🔊 聽句子':'🔊 聽讀音';
  const line=status==='loading'?'正在準備讀音…':status==='playing'?'正在播放…':status==='played'?'已播完。':'';
  let prov=has?'已下載英式音檔':navigator.onLine?'裝置英式讀音 · 尚未存成音檔':bestBritishVoice()?'裝置離線英式讀音 · 未有固定音檔':'';
  let note='';
  if(vs!=='ok'&&!s?.feedback){
   const S=pst();
   const copyBtn=S&&S.copy?'':`<button type="button" class="btn secondary" data-p40="copy">${it.type==='listenChoice'?'看中文選字':'看字抄寫'}</button>`;
   note=`<div class="p40-voice-note" role="status"><p>${vs==='none'?NOTE_NONE:NOTE_FAILED}</p>${copyBtn}</div>`;
  }
  return `<div class="audio-row">${btn(label,act,'soft')}</div><div class="audio-status" role="status">${line}</div>${prov?`<p class="audio-provenance">${esc(prov)}</p>`:''}${note}`;
 };
 if('speechSynthesis' in window&&speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',()=>{if(lastRoute==='learn'&&db.session&&currentItem()){renderAudioState();syncSubmit();}});
 function startCopy(){
  const s=db.session,it=currentItem(),w=currentWord();if(!s||!it||!w||s.feedback)return;
  const S=pst();S.copy=true;markHinted(it);
  if(isLoggedIn())v24Expose([w.en]);
  save();render();
 }

 // ---------------------------------------------------------------- hints (D5) ---------------------------------------------
 function maskOf(t,n){
  let i=-1;
  return [...t].map(c=>{if(!alpha(c))return c===' '?'／':c;i++;return (i===0||(n>=4&&i===n-1))?c:'_';}).join(' ');
 }
 function hintHtml(it,w,level){
  if(CHOICE.includes(it.type)){
   const k=Math.min(level,HINT_MAX);
   return k?`已經拿走 ${k} 個不對的選項。`:'';
  }
  const exp=String(expectedOf(it,w));
  if(it.type==='sentence'){
   const ws=exp.split(/\s+/).filter(Boolean),last=(ws.at(-1)||'').replace(/[.!?]+$/,'');
   if(level<=1)return `這句有 ${ws.length} 個字，第一個字是 <span lang="en">${esc(ws[0]||'')}</span>。`;
   return `開頭是 <span lang="en">${esc(ws.slice(0,Math.min(3,Math.ceil(ws.length/2))).join(' '))} …</span>，最後一個字是 <span lang="en">${esc(last)}</span>。`;
  }
  const t=it.type==='cloze'?w.en:exp,n=[...t].filter(alpha).length,first=[...t].find(alpha)||t[0],k=t.trim().split(/\s+/).length;
  if(level<=1)return `第一個字母是 <span lang="en">${esc(first)}</span>，一共 ${n} 個字母${k>1?`，分成 ${k} 個字`:''}。`;
  return `<span lang="en" class="p40-mask">${esc(maskOf(t,n))}</span>（每個 _ 是一個字母）`;
 }
 const RETRY=['差一點點。看看提示，再試一次。','快對了。再看一次提示，再試一次。'];
 function helpPanel(it,w){
  const s=db.session,S=pst();if(!s||!S||s.feedback||it.type==='study')return '';
  let h='';
  if(S.tries>0)h+=`<p class="p40-encourage" role="status">${RETRY[Math.min(S.tries,2)-1]}</p>`;
  if(S.hint>0)h+=`<div class="p40-hint" id="p40-hint"><strong>提示</strong><p>${hintHtml(it,w,S.hint)}</p><p class="small muted">看了提示再答對，會記成「有提示時答對」。</p></div>`;
  if(S.copy){
   const shown=it.type==='listenChoice'?(w.zh?`中文意思：${esc(w.zh)}`:'這題沒有中文意思，請家長讀出來。'):`照著抄：<span class="word" lang="en">${esc(expectedOf(it,w))}</span>`;
   h+=`<div class="p40-copy" data-wq-exposure="${esc(w.en)}"><p>${shown}</p></div>`;
  }
  return h?`<div class="p40-help">${h}</div>`:'';
 }
 showHelp=function(){
  const s=db.session,it=currentItem(),w=currentWord();
  if(!s||!it||!w||s.feedback||it.type==='study')return;
  const S=pst();
  if(S.hint>=HINT_MAX)return;
  S.hint++;markHinted(it);save();render();
 };

 // ---------------------------------------------------------------- answer check (D5, D6) ---------------------------------------
 function record(w,it,correct,value,expected,detail){
  if(isLoggedIn())recordAttempt(w,it.type,correct,value,expected,it.origin,detail);
 }
 function settle(it,w,correct,kind,firstOk,f){
  const s=db.session,S=pst();
  s.feedback={correct,expected:f.expected,value:f.value,detail:f.detail,technical:false};
  s.scored=(s.scored||0)+1;
  S.res=S.res.filter(r=>r.q!==it.id);S.res.push({q:it.id,w:w.id,k:kind,f:!!firstOk});
  if(S.res.length>240)S.res=S.res.slice(-240);
  playSfx(correct?'correct':'wrong');save();render();
 }
 function checkAnswer(){
  const s=db.session,it=currentItem(),w=currentWord();
  if(!s||!it||!w||s.feedback||it.type==='study')return;
  const S=pst(),choice=CHOICE.includes(it.type);
  const value=String(choice?s.selected||'':s.answer||'').trim();
  if(!value){syncSubmit();return;}
  if(LISTEN.includes(it.type)&&!s.played&&!audioOptional(it)){syncSubmit();return;}
  if(choice&&!(it.type==='missing'?it.missing.letters:it.options).includes(value))return;
  const expected=expectedOf(it,w);
  const detail=it.type==='sentence'?scoreSentence(value,expected,w.en):WQEducation.wordScore(value,expected,v24Policy().grading==='strict'||w.en==='I');
  const correct=detail.correct;
  S.tries++;
  const first=S.tries===1,helped=S.hint>0||S.copy;
  const f={expected,value,detail};
  if(first)record(w,it,correct,value,expected,detail);         // the first answer is always recorded as it is
  if(correct){
   if(!first){markHinted(it);record(w,it,true,value,expected,detail);}   // an answer after a retry counts as "with a hint"
   settle(it,w,true,first&&!helped?'ok':S.copy?'copy':'hint',first&&!helped,f);
   return;
  }
  if(S.tries>=MAX_TRIES){settle(it,w,false,'shown',false,f);return;}
  // wrong, but there are tries left: give the next hint, keep the question open
  S.hint=Math.max(S.hint,Math.min(HINT_MAX,S.tries));markHinted(it);
  if(choice){S.wrong.push(value);s.selected=null;}
  playSfx('pop');save();render();
 }
 submitAnswer=v24GuardFunction(checkAnswer);
 syncSubmit=function(){
  const b=$('#submit-answer'),it=currentItem(),s=db.session;if(!b||!it||!s)return;
  const choice=CHOICE.includes(it.type),value=choice?s.selected:(s.answer||'').trim();
  const needAudio=LISTEN.includes(it.type)&&!s.played&&!audioOptional(it);
  b.disabled=!value||!!s.feedback||needAudio;
 };

 // ---------------------------------------------------------------- feedback text -------------------------------------------
 function lastReason(){const a=db.attempts.at(-1);return a&&a.evidenceV24?a.evidenceV24.reason:'';}
 const priorFb=feedbackHtml;
 feedbackHtml=function(w){
  const f=db.session?.feedback;if(!f)return '';
  priorFb(w);                                // keeps the "answer was shown" bookkeeping of the earlier layers
  const it=currentItem(),S=pst(),r=S&&S.res.find(x=>x.q===it?.id),kind=r?r.k:(f.correct?'ok':'shown');
  const exp=f.expected||w.en;
  let msg='',note='',mark=f.correct?'✓':'↻';
  if(f.technical){msg='這題先略過。';mark='↻';}
  else if(f.correct){
   if(kind==='ok')msg='答對了。';
   else{msg='答對了，這次有提示。';note='這題記成「有提示時答對」。下次自己再串對一次就好。';}
   if(f.detail&&f.detail.lexical&&f.detail.capitalization===false)msg='答對了。大小寫要留意，要寫成「'+esc(exp)+'」。';
  }else{
   msg='先記住這個答案。';note='看清楚拼法。這個字之後會再練。';
   if(f.detail){
    if(f.detail.lexical&&!f.detail.capitalization){msg='字母都對了，只是大小寫不同。';}
    else if(f.detail.lexical&&!f.detail.punctuation){msg='字都對了，留意標點。';}
    else if(!f.detail.lexical&&f.detail.targetCorrect){msg='要串的字對了，再留意其他字。';}
   }
  }
  const shown=!f.correct&&!f.technical?`<div class="correct-answer" lang="en">${esc(exp)}</div>`:'';
  const html=`<div class="feedback ${f.correct?'ok':'bad'} p40-fb" role="status"><span aria-hidden="true">${mark}</span><div><strong>${msg}</strong>${shown}${note?`<p class="small muted p40-note">${esc(note)}</p>`:''}</div></div>`;
  return !f.correct&&!f.technical?`<div data-wq-exposure="${esc(exp)}">${html}</div>`:html;
 };

 // ---------------------------------------------------------------- question body (D12, D13, D25) ---------------------------------
 const priorTask=taskBody;
 taskBody=function(it,w){
  let body=priorTask(it,w);
  const s=db.session;
  if(it.type==='study'){
   const studyOnly=s&&s.queue.every(q=>q.type==='study'),total=rangeWords(w.rangeId).length;
   if(studyOnly)body=`<p class="p40-studyline">${s.queue.length<total?`這個範圍有 ${total} 個字，這次先看 ${s.queue.length} 個，其餘的下次再看。`:`共 ${s.queue.length} 個字，一個一個看。`}</p>`+body;
   return body;
  }
  if(it.type==='spell'&&!w.zh&&!hasPicture(w))body=`<p class="p40-prompt">這個字沒有中文意思。按「聽讀音」，聽一聽再串。</p>`+body;
  return body+helpPanel(it,w);
 };
 const priorEff=effectiveType;
 effectiveType=function(w,t){
  let r=priorEff(w,t);
  if(r==='spell'&&!w.zh&&!hasPicture(w))r='listenSpell';       // no meaning and no picture: the question is spoken instead of blank
  return r;
 };
 P40.studyList=function(rid){
  const ws=rangeWords(rid),unseen=ws.filter(w=>!(w.studySeen>0)),seen=ws.filter(w=>w.studySeen>0);
  return [...unseen,...seen].slice(0,30);
 };

 // ---------------------------------------------------------------- finish page (D6, D16) ---------------------------------------------
 function finishRows(){
  const s=db.session;if(!s)return [];
  const res=(s.p40&&s.p40.res)||[],rank={ok:0,copy:1,hint:1,shown:2},by=new Map();
  const add=(wid,k)=>{const w=db.words.find(x=>x.id===wid);if(!w)return;const old=by.get(wid);if(!old||rank[k]>rank[old.k])by.set(wid,{w,k});};
  if(res.length)res.forEach(r=>add(r.w,r.k));
  else{
   // a session from before this change: read the answers recorded since it started
   const ids=new Set(s.queue.filter(q=>q.type!=='study').map(q=>q.wordId));
   for(const id of ids){const a=db.attempts.filter(x=>x.wordId===id&&x.time>=s.startedAt&&x.correct!==null&&!x.technical).at(-1);if(a)add(id,a.correct?(a.assisted?'hint':'ok'):'shown');}
  }
  return [...by.values()];
 }
 finishView=function(){
  const s=db.session,rows=finishRows(),studied=s?new Set(s.queue.filter(q=>q.type==='study').map(q=>q.wordId)).size:0;
  const n=rows.length,ok=rows.filter(r=>r.k!=='shown').length,again=rows.filter(r=>r.k!=='ok');
  const title=n?`今天練了 ${n} 個字，答對 ${ok} 個`:studied?`今天看了 ${studied} 個字`:'這一輪練習完成了';
  const line=n?(again.length?'這幾個字再練一下就會了，答錯沒有關係。':'全部都是自己答對，很好。'):studied?'看過了，接下來可以試試自己串。':'休息一下吧。';
  let coin='';
  try{
   if(isLoggedIn()){
    const got=a28LastAward&&a28LastAward.owner===a28Own()&&a28LastAward.sessionId===db.session?.id&&a28LastAward.award;
    coin=`<p class="chip star">🪙 ${activeChild()?.stars||0} 枚金幣</p>${got?`<p class="p40-gain">這次得到 ${got} 枚金幣。</p>`:''}`;
   }else coin='<p class="small muted">先試玩，不會保存紀錄。</p>';
  }catch(_){}
  const list=again.length?`<div class="p40-again"><h2>再練這些字</h2><ul class="list">${again.map(r=>`<li><div><strong lang="en" data-wq-exposure="${esc(r.w.en)}">${esc(r.w.en)}</strong><div class="small muted">${esc(r.w.zh||'')}</div></div><span>${r.k==='shown'?'看過答案':'有提示'}</span></li>`).join('')}</ul></div>`:'';
  const first=again.length?`<button type="button" class="btn primary big" data-p40="again">再練這些字</button>`:(!n&&studied?`<button type="button" class="btn primary big" data-act="start-practice" data-type="spell">練習串字</button>`:'');
  return `<section class="finish-panel card pad p40-finish"><div class="finish-icon" aria-hidden="true">🌟</div><h1>${title}</h1><p>${line}</p>${coin}${list}<div class="row p40-finish-actions">${first}${link('返回首頁','kid',first?'secondary':'primary')}${link('玩小遊戲','game','secondary')}</div></section>`;
 };
 function practiceAgain(){
  if(window.WQR3&&!WQR3.canPlay())return;
  if(!v24CanWrite()){toast(loadBlocked?'先恢復資料，再開始學習。':v23CapabilityError(),'bad');return;}
  const rows=finishRows().filter(r=>r.k!=='ok').slice(0,8);
  if(!rows.length){go('kid');return;}
  const q=[];
  for(const r of rows){
   if(r.k==='shown')q.push(prepareItem({id:uid('q'),wordId:r.w.id,type:'study',origin:'再練這些字'},r.w));
   q.push(prepareItem({id:uid('q'),wordId:r.w.id,type:effectiveType(r.w,'spell'),origin:'再練這些字'},r.w));
  }
  stopSpeech();db.session=newSession(q,'practice');save();go('learn');render();
 }
 P40.practiceAgain=practiceAgain;
