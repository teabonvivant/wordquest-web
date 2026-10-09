"""R3.7 s20 - every test uses two modes only: 選擇題 (multiple choice) and 填充題 (fill in). Parent difficulty (5 levels) drives option count, near-spelling options and question count."""

OLD_PRACTICE = """ ['🖼️','看圖選英文','meaning'],['👂','聽音選英文','listenChoice'],['🔤','補字母','missing'],['✍️','自己串字','spell'],['📝','句子填字','cloze'],['🎧','聽寫句子','sentence']
 ].map(([i,n,t])=>`<button class="practice-card" data-act="start-practice" data-type="${t}" ${!r?'disabled':''}><span class="bigicon">${i}</span><strong>${n}</strong></button>`).join('')}</div>`}"""
NEW_PRACTICE = """ ['✅','選擇題','mcq'],['✍️','填充題','fill']
 ].map(([i,n,t])=>`<button class="practice-card" data-act="start-practice" data-type="${t}" ${!r?'disabled':''}><span class="bigicon">${i}</span><strong>${n}</strong></button>`).join('')}</div>`}"""

OLD_START = """function startPractice(type){if(window.WQR3&&!WQR3.canStudy())return;if(!['meaning','listenChoice','missing','spell','listenSpell','cloze','sentence'].includes(type))return;const r=latestRange(),ws=r?rangeWords(r.id):[];if(!ws.length){toast('請家長先加入默書範圍。','bad');return;}
 const q=shuffle(ws).slice(0,8).map(w=>prepareItem({id:uid('q'),wordId:w.id,type:effectiveType(w,type),origin:'默書練習'},w));"""
NEW_START = """function startPractice(type){if(window.WQR3&&!WQR3.canStudy())return;const seq={mcq:['meaning','listenChoice'],fill:['spell','listenSpell','cloze'],meaning:['meaning'],listenChoice:['listenChoice'],spell:['spell'],listenSpell:['listenSpell'],cloze:['cloze']}[type];if(!seq)return;const r=latestRange(),ws=r?rangeWords(r.id):[];if(!ws.length){toast('請家長先加入默書範圍。','bad');return;}
 const q=shuffle(ws).slice(0,r37Diff().qs).map((w,i)=>prepareItem({id:uid('q'),wordId:w.id,type:effectiveType(w,seq[i%seq.length]),origin:'默書練習'},w));"""

CARDS = ("const l30CardSpecs=[\n ['study','學新詞','看圖片、聽讀音，先認識意思。','books'],\n ['meaning','看圖選字','看圖片或中文，找出正確英文。','camera'],\n ['listenChoice','聽音選字','聽完整的英文，再選答案。','headphones'],\n ['missing','補字母','把不見了的字母補回來。','puzzle'],\n ['spell','自己串字','看中文意思，自己寫英文。','pencil'],\n ['listenSpell','聽音默字','聽讀音，自己輸入完整英文。','headphones'],\n ['cloze','句子練習','在有意思的句子裏填入英文。','books'],\n ['review','重溫錯字','再練最近需要幫助的詞語。','owl']\n];", "const l30CardSpecs=[\n ['study','學新詞','看圖片、聽讀音，先認識意思。','books'],\n ['mcq','選擇題','看圖或聽音，選出正確英文。','camera'],\n ['fill','填充題','自己寫出英文或填上字。','pencil'],\n ['review','重溫錯字','再練最近需要幫助的詞語。','owl']\n];")

EDITS = [
    CARDS,
    ("const QUIZ_MODES=['meaning','listenChoice','missing','tiles','edit','focus','swap','spell','listenSpell','cloze'];",
     "const QUIZ_MODES=['meaning','listenChoice','spell','listenSpell','cloze'];"),
    (OLD_PRACTICE, NEW_PRACTICE),
    (OLD_START, NEW_START),
    ("function effectiveType(w,t){if(t==='study')return t;", "function effectiveType(w,t){if(t==='study')return t;if(t==='missing')t='meaning';if(t==='sentence'&&w.kind!=='sentence')t='listenSpell';"),
    ("return shuffle([w.en,...shuffle(pool).slice(0,3)]);}", "return r37Options(w,pool);}"),
    ("mixed:{title:'混合重溫',skill:'mixed'}};", "mixed:{title:'混合重溫',skill:'mixed'},mcq:{title:'選擇題',skill:'mixed'},fill:{title:'填充題',skill:'mixed'}};"),
    ("const suitable=['lesson','mixed'].includes(mode)?ids:", "const suitable=['lesson','mixed','mcq','fill'].includes(mode)?ids:"),
    ("}else selected.forEach((k,i)=>{const m=mode==='mixed'?['spell','meaning','missing','spell'][i%4]:mode;const q=makeQuestion(lib,k,m,uid);if(q)queue.push(structuredClone(q));});",
     "}else selected.forEach((k,i)=>{const seq=mode==='mixed'?['spell','meaning','listenChoice','cloze']:mode==='mcq'?['meaning','listenChoice']:mode==='fill'?['spell','listenSpell','cloze']:[mode];let q=null;for(let j=0;j<seq.length&&!q;j++)q=makeQuestion(lib,k,seq[(i+j)%seq.length],uid);if(q)queue.push(structuredClone(q));});"),
    ("(!mode||mode==='review'||u.words.some(w=>L30.makeQuestion(LIB30,w,mode,u.id)))", "(!mode||['review','mcq','fill'].includes(mode)||u.words.some(w=>L30.makeQuestion(LIB30,w,mode,u.id)))"),
    ("const q=ws.map(w=>prepareItem({id:uid('q'),wordId:w.id,type:weakTypes(w)[0],origin:'錯題'},w));", "const q=ws.map(w=>prepareItem({id:uid('q'),wordId:w.id,type:effectiveType(w,weakTypes(w)[0]),origin:'錯題'},w));"),
]

OPTIONS_JS = """
function r37Options(w,pool){const D=R37_DIFF[r37Get().diff-1],n=D.opts-1;let p=shuffle(pool);if(D.near)p=[...p].sort((a,b)=>r37Edit(a,w.en)-r37Edit(b,w.en));return shuffle([w.en,...p.slice(0,n)]);}
"""


def apply(s, ctx):
    for a, b in EDITS:
        s = ctx.once(s, a, b)
    s = ctx.once(s, '\ninstallMediaEvents();\nrender();', OPTIONS_JS + '\ninstallMediaEvents();\nrender();')
    return s
