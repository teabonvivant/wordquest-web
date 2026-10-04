"""R3.6 q30 - item 14: every test has a pass mark. Coins are paid for 5 stars only (every question right, no hint).

Star rule (same everywhere): all right = 5, >=90% = 4, >=75% = 3, >=50% = 2, otherwise 1. A right answer that used a hint counts as not right.
Flows covered: English lessons and drills (l30), workshop (l31), school-range practice/daily (db.session), spelling families (fg),
phonics quiz (pc), maths and olympiad rounds (s39 finishSession). The star rule itself lives in WQ30Core.starRule; the maths app
carries a copy (wq36Stars) because it runs in its own module; a test pins the two together.
"""

HOST = [
    # English lessons / drills: coin only at 5 stars
    ("s.award=a28Grant(key,new Date(s.startedAt).toISOString(),L30.eligible(c,s));s.awarded=true;",
     "s.award=a28Grant(key,new Date(s.startedAt).toISOString(),L30.eligible(c,s)&&L30.stars(c,s)===5);s.awarded=true;"),
    # workshop
    ("live.award=a28Grant(key,new Date(live.startedAt).toISOString(),C31.eligible(c,live));live.settled=true;",
     "live.award=a28Grant(key,new Date(live.startedAt).toISOString(),C31.eligible(c,live)&&q36L31Stars(c,live).stars===5);live.settled=true;"),
    ("<p>${rows.filter(e=>e.correct).length}／${rows.length} 次首次答對。原答案及訂正均保留。</p>",
     "${q36L31Block(s)}"),
    ("'同一天，相同的組合只得一次金幣。每日金幣上限是 5 枚，和主站練習一起計。剛看過答案才串對的，不算隔日掌握。'",
     "'同一天，相同的組合只得一次金幣。'"),
    # school-range practice / daily
    ("records.length>=expectedCount&&s.scored===expectedCount);",
     "records.length>=expectedCount&&s.scored===expectedCount&&q36SessionStars(s).stars===5);"),
    ("<h1>這一輪完成了</h1><p>學習成果和金幣分開記錄。答錯不會扣金幣。</p>",
     "<h1>這一輪完成了</h1>${q36SessionBlock(db.session)}"),
    # school-range practice: the R3.4 finish page (it replaces the one above)
    ("<h1>${title}</h1><p>${line}</p>${coin}${list}",
     "<h1>${title}</h1><p>${line}</p>${q36SessionBlock(s)}${coin}${list}"),
    ("const title=n?`今天練了 ${n} 個字，答對 ${ok} 個`:", "const title=n?`今天練了 ${n} 個字`:"),
    # spelling families
    ("return a28Grant('family:'+terms.join('|'),s.startedAt,terms.length>=3);}",
     "return a28Grant('family:'+terms.join('|'),s.startedAt,terms.length>=3&&q36FamilyStars(s).stars===5);}"),
    ("<h1>這一輪完成了</h1><p>${isLoggedIn()?`這一輪自己串對 ${correct} / ${independent.length} 次。`:'訪客不會儲存紀錄或金幣。'}</p>",
     "<h1>這一輪完成了</h1>${isLoggedIn()?q36FamilyBlock(s):'<p>訪客不會儲存紀錄或金幣。</p>'}"),
    # phonics quiz
    ("function a28RewardPhonics(s,l,pending){return a28Grant('phonics:'+l.id,s.startedAt,!pending&&s.answers.length===5);}",
     "function a28RewardPhonics(s,l,pending){return a28Grant('phonics:'+l.id,s.startedAt,!pending&&s.answers.length===5&&s.answers.every(a=>a.correct===true));}"),
    ("<div class=\"pc-score\">${r.score}<small> / ${5-r.pending}</small></div>",
     "${r.pending?'<div class=\"pc-score\">'+r.score+'<small> / '+(5-r.pending)+'</small></div>':q36PhonicsBlock(r)}"),
    ("'五題已作答。先看錯在哪裏，再重溫。'", "(r.score===5?'五題全對！':'先看錯在哪裏，再重溫。')"),
    ("${r.pending?'先補聽，再領金幣':'這一課今天已得過金幣，或今天的金幣已滿。'}",
     "${r.pending?'先補聽，再領金幣':r.score<5?'這次沒有金幣，再試一次吧。':'這一課今天已得過金幣，或今天的金幣已滿。'}"),
    ("${isLoggedIn()?`只要完成就有金幣，不看分數。每日最多 5 枚，和其他學習一起計。`:'這次訪客成績不會轉入新帳戶。'}不是口說發音評分。",
     "${isLoggedIn()?'':'這次訪客成績不會轉入新帳戶。'}"),
]

MATHS = [
    (" function summaryHTML(s){",
     " function wq36Stars(g,t){return t>0&&g>=t?5:t>0&&g/t>=.9?4:t>0&&g/t>=.75?3:t>0&&g/t>=.5?2:1;}\n function summaryHTML(s){"),
    ("good=r.filter(r=>r.correct).length,stars=good/count>=.8?3:good/count>=.5?2:1;",
     "good=r.filter(r=>r.correct).length,clean=r.filter(r=>r.correct&&!(r.hint>0)).length,stars=wq36Stars(clean,count);"),
    ("${'★'.repeat(stars)}${'☆'.repeat(3-stars)}", "${'★'.repeat(stars)}${'☆'.repeat(5-stars)}"),
    ("'這輪沒有多得金幣。今天可能已完成同一個任務，或需要多練習。'",
     "(stars<5?'滿 5 顆星，才有金幣。':'這輪沒有多得金幣。今天可能已完成同一個任務。')"),
    ("const valid=s.mode!=='diagnostic'&&r.length>=needed&&r.filter(r=>r.correct).length>=Math.ceil(needed*.6);",
     "const all=s.results.filter(r=>r.mode!=='guided'&&r.mode!=='challenge-demo'),valid=s.mode!=='diagnostic'&&r.length>=needed&&r.length===all.length&&all.every(r=>r.correct&&!(r.hint>0));"),
]


def apply(s, ctx):
    once = ctx.once
    for old, new in HOST + MATHS:
        s = once(s, old, new)
    css = (ctx.src / 'q30_stars.css').read_text()
    js = (ctx.src / 'q30_stars.js').read_text()
    s = once(s, '</head>', '<style id="wq36-q30-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + js + anchor)
    return s
