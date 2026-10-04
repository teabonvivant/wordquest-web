"""R3.6 q20 - the English lesson loop: fixed 8 words, automatic 考考你 (20 mixed questions), stars, tick and date.

Items covered: 2 (English half: no time limit is added here; see q40), 3 (8 words, no count choice), 5 (no 「自己選玩法」),
8 (starting something new never asks about the old round), 9 (learning flows straight into a 20-question mixed test),
13 (tick + date + best stars on every lesson card).

Engine (s25, WQ30Core):
  plan()           lesson = 8 study steps + 20 mixed questions (seeded by the session id; every word gets questions in different modes)
  record()         attempts remember whether a hint was used (`hinted`, optional in old data)
  stars()          5 stars = every question right without a hint; 4 >= 90%; 3 >= 75%; 2 >= 50%; else 1
Host (s33): l30Start, l30Unit, l30Learning, l30Finished, l30UnitCards, parent plan page, kid home text.
"""
import re

ENGINE = [
    # plan(): a lesson is 8 study steps and then the mixed quiz
    ("""  for(const stage of ['study','meaning','spell'])for(const k of selected){const q=makeQuestion(lib,k,stage,uid);if(q)queue.push(structuredClone(q));}
 }else selected.forEach(""",
     """  for(const k of selected){const q=makeQuestion(lib,k,'study',uid);if(q)queue.push(structuredClone(q));}
  for(const q of quizQueue(lib,uid,selected,sessionId,QUIZ_TOTAL,audio))queue.push(structuredClone(q));
 }else selected.forEach("""),
    # the quiz builder + star rule sit right before plan()
    ("\nfunction plan(lib,{uid,mode='lesson',count=4,",
     r"""
/* R3.6: the mixed quiz after a lesson. Every word gets questions in different modes (never the same word+mode twice),
   modes are spread as evenly as the words allow, and the order is shuffled so the same word is not asked twice in a row. */
const QUIZ_MODES=['meaning','listenChoice','missing','tiles','edit','focus','swap','spell','listenSpell','cloze'];
const QUIZ_TOTAL=20,LESSON_WORDS=8;
function quizQueue(lib,uid,words,sessionId,total=QUIZ_TOTAL,audio=true){
 const slots=new Map();for(const k of words){const list=[];for(const m of QUIZ_MODES){if(!audio&&['listenChoice','listenSpell'].includes(m))continue;const q=makeQuestion(lib,k,m,uid);if(q)list.push([m,q]);}slots.set(k,list);}
 const all=[...slots.values()].reduce((n,l)=>n+l.length,0),want=Math.min(total,all);
 const useWord=new Map(words.map(k=>[k,0])),useMode=new Map(QUIZ_MODES.map(m=>[m,0])),used=new Set(),picked=[];
 let sd=seed(sessionId+':quiz');const step=()=>{sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd;};
 while(picked.length<want){
  const open=words.filter(k=>slots.get(k).some(([m])=>!used.has(k+'|'+m)));if(!open.length)break;
  const least=Math.min(...open.map(k=>useWord.get(k))),k=shuffle(open.filter(x=>useWord.get(x)===least),step())[0];
  const options=slots.get(k).filter(([m])=>!used.has(k+'|'+m)),best=Math.min(...options.map(([m])=>useMode.get(m)));
  const [m,q]=shuffle(options.filter(([x])=>useMode.get(x)===best),step())[0];
  used.add(k+'|'+m);useWord.set(k,useWord.get(k)+1);useMode.set(m,useMode.get(m)+1);picked.push({k,q});
 }
 const pool=shuffle(picked,seed(sessionId+':order')),out=[];
 while(pool.length){
  const prev=out.length?out[out.length-1].k:null,left=new Map();for(const x of pool)left.set(x.k,(left.get(x.k)||0)+1);
  let at=-1;for(let i=0;i<pool.length;i++){if(pool[i].k===prev)continue;if(at<0||left.get(pool[i].k)>left.get(pool[at].k))at=i;}
  out.push(pool.splice(at<0?0:at,1)[0]);
 }
 return out.map(x=>x.q);
}
function starRule(good,total){if(!total)return 0;const r=good/total;return good===total?5:r>=0.9?4:r>=0.75?3:r>=0.5?2:1;}
function stars(c,s){
 const total=s.queue.filter(q=>q.mode!=='study').length,rows=c.attempts.filter(a=>a.session===s.id&&a.mode!=='study'&&!a.technical);
 return starRule(rows.filter(a=>a.correct===true&&!a.hinted).length,total);
}
function plan(lib,{uid,mode='lesson',count=4,audio=true,"""),
    # record(): remember a used hint
    ("independent,delayed,time:now,replays:s.replays,heard:s.audioHeard};",
     "independent,delayed,time:now,replays:s.replays,heard:s.audioHeard,hinted:!!s.hinted};"),
    # validateState(): `hinted` is an optional extra key (old records do not have it)
    ("'independent','delayed','time','replays','heard']);id(a.id);",
     "'independent','delayed','time','replays','heard','hinted']);id(a.id);if('hinted' in a)bool(a.hinted);"),
    ("return {MODES,clean,canonical,library,seed,shuffle,grade,masked,oneChange,makeQuestion,allowed,initial,child,get,pace,plan,expose,record,next,metrics,eligible,validateState,abandon};",
     "return {MODES,clean,canonical,library,seed,shuffle,grade,masked,oneChange,makeQuestion,allowed,initial,child,get,pace,plan,expose,record,next,metrics,eligible,validateState,abandon,stars,starRule,quizQueue,QUIZ_TOTAL,LESSON_WORDS};"),
]

HOST = [
    # kid home text
    ("先學 ${d.assignment?.count||L30.pace(c?.grade||1)} 個詞語，認識意思。再自己串字試一試。", "先學 8 個詞語，再做 20 題考考你。"),
    # the card list of units: badge instead of the long hints
    ("<p>${words.length} 個候選詞 · ${done?'已完成 '+done+' 組練習':'可以從 2 個詞開始'}</p><span class=\"l30-go\"><span>看內容及玩法</span><span>→</span></span></a>`;}).join('');",
     "<p>${words.length} 個詞</p>${l30DoneBadge(u.id)}<span class=\"l30-go\"><span>進入這一課</span><span>→</span></span></a>`;}).join('');"),
    ("找到 ${units.length} 個單元 · 不用趕時間，可以分幾次學。", "找到 ${units.length} 個單元"),
    # answer feedback: no reassurance footers
    ("'先看正確答案，下一次再試。答錯不扣金幣。'", "'先看正確答案，下一次再試。'"),
    # the final step of a lesson
    ("l30Button(s.index+1===s.queue.length?'完成這一組':'下一題','next','','primary')", "l30Button(s.index+1===s.queue.length?'看成績':'下一題','next','','primary')"),
    ("l30Button(q.mode==='study'?'我已看過，下一步':'提交答案','submit',", "l30Button(q.mode==='study'?(s.mode==='lesson'&&s.queue[s.index+1]&&s.queue[s.index+1].mode!=='study'?'開始考考你':'我已看過，下一步'):'提交答案','submit',"),
    # stage label and counters
    ("let body=`<div class=\"l30-eyebrow\">${esc(L30.MODES[q.mode].title)}</div>`;",
     "const q36=l30Stage(s,q);let body=`<div class=\"l30-eyebrow\">${q36.label&&q.mode!=='study'?esc(q36.label)+' · ':''}${esc(L30.MODES[q.mode].title)}</div>${q36.intro?'<div class=\"q36-quiz-intro\" role=\"status\"><strong>學完了！</strong> 現在考考你：'+q36.total+' 題，全部答對就有 5 顆星。</div>':''}`;"),
    ("<span class=\"l30-tag\">第 ${s.index+1}／${s.queue.length} 步</span>", "<span class=\"l30-tag\">${esc(q36.tag)}</span>"),
    # parent plan page: no word-count choice
    ("<p>先選一組詞，再選數量。孩子首頁會直接顯示開始按鈕。</p>", "<p>選一課。孩子首頁會直接顯示開始按鈕。</p>"),
    ("<label>本次詞數<select id=\"l30-plan-count\">${[2,3,4,5,6,8].map(n=>`<option value=\"${n}\" ${n===(a?.count||L30.pace(activeChild()?.grade||1))?'selected':''}>${n} 個</option>`).join('')}</select></label>", ""),
    ("if(a==='save-plan'){const unit=$('#l30-plan-unit')?.value,count=Number($('#l30-plan-count')?.value);if(!LIB30.units.has(unit)||![2,3,4,5,6,8].includes(count))return;",
     "if(a==='save-plan'){const unit=$('#l30-plan-unit')?.value,count=L30.LESSON_WORDS;if(!LIB30.units.has(unit))return;"),
    # no prompts about an unfinished round: the old one is closed and the new one starts
    ("""if(!isLoggedIn()){go('login');return;}if(!l30FlushExposure()||!l30Checkpoint()||!pgPause())return;
 const old=l30Session();if(old){l30ShowDialog('已有未完成的練習','上一組的題目、草稿和答案都保留了。請先完成，或在練習頁結束這一組，再開新的一組。',l30Link('繼續上次練習','learning','primary'));return;}
 const u=LIB30.units.get(uid);if(!u)return;const c=l30Read();if(c.sessions.length>=1000){toast('課程紀錄已滿，請家長先備份。','bad');return;}
 let count=Number($('#l30-count')?.value)||c.assignment?.unit===uid&&c.assignment.count||L30.pace(activeChild()?.grade||1);count=Math.max(1,Math.min(8,count));
 const terms=word?[word]:l30Ordered(u,c);l30StopAudio();
 if(l30Commit(()=>{const st=l30State();st.sessions.push(L30.plan(LIB30,{uid,mode,count:word?1:count,""",
     """if(!isLoggedIn()){go('login');return;}if(!l30FlushExposure()||!l30Checkpoint()||!pgPause())return;
 const old=l30Session();
 const u=LIB30.units.get(uid);if(!u)return;const c=l30Read();if(c.sessions.length>=1000){toast('課程紀錄已滿，請家長先備份。','bad');return;}
 const count=L30.LESSON_WORDS;
 const terms=word?[word]:l30Ordered(u,c);l30StopAudio();
 if(l30Commit(()=>{const st=l30State();if(old){const live=st.sessions.find(x=>x.id===old.id);if(live&&live.status==='active')L30.abandon(live,Date.now());}st.sessions.push(L30.plan(LIB30,{uid,mode,count:word?1:count,audio:('speechSynthesis' in window),"""),
    ("""if(l31Session()){l30ShowDialog('上一組還未完成','字塊、答案和已答的紀錄都保留了。請先繼續，或結束這一組，再開始新的一組。',L31('繼續組合練習','assembly-learn','primary'));return;}
""", ""),
    ("if(l31Commit(()=>C31.create(LIB31,l31State(),{group,mode,count:n,childId:activeChild().id,sessionId:l31SessionId(),terms}),{redraw:false})){go('assembly-learn');render();}",
     "if(l31Commit(()=>{const st=l31State(),live=C31.active(st);if(live)C31.abandon(live);C31.create(LIB31,st,{group,mode,count:n,childId:activeChild().id,sessionId:l31SessionId(),terms});},{redraw:false})){go('assembly-learn');render();}"),
]

# whole-function replacements (start marker, end marker, new text)
SPANS = []


def part(js, name):
    m = re.search(r'/\*@@%s@@\*/\n(.*?)/\*@@END@@\*/' % name, js, re.S)
    return m.group(1)


def _span(s, a, b, new):
    if s.count(a) != 1 or s.count(b) != 1:
        raise ValueError(f'span markers: {a[:50]!r}={s.count(a)} {b[:50]!r}={s.count(b)}')
    i, j = s.index(a), s.index(b)
    if j < i:
        raise ValueError('span order ' + a[:40])
    return s[:i] + new + s[j:]


def apply(s, ctx):
    once = ctx.once
    for old, new in ENGINE:
        s = once(s, old, new)
    for old, new in HOST:
        s = once(s, old, new)
    js = (ctx.src / 'q20_lesson.js').read_text()
    # l30Unit, l30Finished are replaced as a whole; the helpers come with them
    s = _span(s, "function l30Unit(){\n", "function l30Library(){\n", part(js, 'UNIT'))
    s = _span(s, "function l30Finished(s){", "function l30Submit(technical=false){", part(js, 'FINISHED'))
    css = (ctx.src / 'q20_lesson.css').read_text()
    s = once(s, '</head>', '<style id="wq36-q20-css">\n' + css + '</style>\n</head>')
    return s
