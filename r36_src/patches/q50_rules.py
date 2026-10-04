"""R3.6 q50 - items 2, 8 (rest), 10 (rest): no time limit on learning, no "unfinished round" questions, brand leftovers.

Item 2  Learning has no timer. Only the arcade keeps an optional daily cap (parent setting, default 45 minutes).
          host   r3Tick counts arcade time only; assertStudy no longer checks time; canStudy() for lessons, canPlay() (with the arcade cap) for games
                 parent panel: one field "每日玩遊戲的時間上限"; the three per-subject suggested minutes are gone (stored as 0)
                 the home card "今天的跨科任務" (shared daily time plan) is removed
          maths  no daily maths time limit, no forced 20-minute break, limit select removed from the parent settings
Item 8  startPractice, practiceWeak, activateRange, family lesson switch and phonics start no longer ask about the old round.
Item 10 arcade hero / admin eyebrow, coin glyph, teaching-pack message, download file names say SmartQuest.
"""

HOST = [
    # ---- item 8: no "you have an unfinished round" questions ------------------------------------------------------------
    ("if(canResume()&&!confirm('你還有一輪未做完。要改做這一輪嗎？已答的題目會保留。'))return;", ""),
    ("if(canResume()&&!confirm('要改做補練錯題嗎？已答的題目會保留。'))return;", ""),
    ("if(canResume()&&!confirm('切換默書範圍會結束未完成的一輪。已答紀錄會保留，繼續？'))return;", ""),
    ("if(s&&s.stage!=='done'&&s.lessonId!==lid&&!confirm('開始另一個字？目前這個字的作答紀錄會保留。'))return;", ""),
    ("const old=pcSession();if(old&&old.mode!=='result'&&(old.lessonId!==id||old.mode!==mode)&&!confirm('要改做另一項嗎？做好的紀錄會保留。沒做完的小測要重做。'))return;", ""),
    # ---- item 2: time ------------------------------------------------------------------------------------------------
    ("function r3Tick(){",
     "function r3ArcadeMs(s){const d=s.usage?.[activeChild()?.id]?.[F3.day()];return d?(d.arcade||0):0;}\nfunction r3Tick(){"),
    ("const subject=r3CurrentSubject();if(!subject)return;try{const n=r3Clone(r3Settings());F3.addUsage(n,activeChild().id,subject,dt);r3SaveSettings(n);if(F3.usageTotal(n,activeChild().id)>=n.limitMinutes*60000)r3Block();}",
     "const subject=r3CurrentSubject();if(subject!=='arcade')return;try{const n=r3Clone(r3Settings());F3.addUsage(n,activeChild().id,subject,dt);r3SaveSettings(n);if(r3ArcadeMs(n)>=n.limitMinutes*60000)r3Block();}"),
    ("stopSpeech();window.WQMathApp?.pauseForLimit?.();if(document.getElementById('r3-time-limit')?.open)return;",
     "stopSpeech();if(document.getElementById('r3-time-limit')?.open)return;"),
    ("'今天先到這裏'", "'今天玩夠了'"),
    ("'今天的使用時間已用完（家庭設定的上限）。英文、數學和遊戲一起計算。家長確認後可以調整。'",
     "'今天的遊戲時間用完了。去學習，明天再玩。家長可以調整遊戲時間。'"),
    ("if(isLoggedIn()){const s=r3Settings();if(F3.usageTotal(s,activeChild().id)>=s.limitMinutes*60000)throw Error('今天的使用時間已用完。請休息一下，或由家長調整。');}},voice:()=>",
     "},assertPlay(){window.WQR3.assertStudy();if(isLoggedIn()){const s=r3Settings();if(r3ArcadeMs(s)>=s.limitMinutes*60000)throw Error('今天的遊戲時間用完了。明天再玩，或由家長調整。');}},canStudy:()=>{try{window.WQR3.assertStudy();return true;}catch(e){toast(e.message,'bad');return false;}},voice:()=>"),
    ("canPlay:()=>{try{window.WQR3.assertStudy();return true;}", "canPlay:()=>{try{window.WQR3.assertPlay();return true;}"),
    # buying a round must be refused BEFORE a coin is taken when the games clock is used up (pgPlay was guarded, a28Buy was not)
    ("const r3PriorArPlay=arPlay;arPlay=async function(){if(!WQR3.canPlay())return;return r3PriorArPlay.apply(this,arguments);};",
     "const r3PriorArPlay=arPlay;arPlay=async function(){if(!WQR3.canPlay())return;return r3PriorArPlay.apply(this,arguments);};\nconst r36PriorA28Buy=a28Buy;a28Buy=async function(){if(!WQR3.canPlay())return;return r36PriorA28Buy.apply(this,arguments);};"),
    ("remaining:()=>Math.max(0,r3Settings().limitMinutes*60000-F3.usageTotal(r3Settings(),activeChild()?.id))",
     "remaining:()=>Math.max(0,r3Settings().limitMinutes*60000-r3ArcadeMs(r3Settings()))"),
    ("function startDaily(){if(window.WQR3&&!WQR3.canPlay())return;", "function startDaily(){if(window.WQR3&&!WQR3.canStudy())return;"),
    ("function startPractice(type){if(window.WQR3&&!WQR3.canPlay())return;", "function startPractice(type){if(window.WQR3&&!WQR3.canStudy())return;"),
    ("function practiceAgain(){\n  if(window.WQR3&&!WQR3.canPlay())return;", "function practiceAgain(){\n  if(window.WQR3&&!WQR3.canStudy())return;"),
    ("<section><h2>每天的安排</h2><label>每日總時間上限（包括遊戲，分鐘）<input id=\"r3-limit\" type=\"number\" min=\"5\" max=\"180\" value=\"${s.limitMinutes}\"></label><label>英文建議分鐘<input id=\"r3-english\" type=\"number\" min=\"0\" max=\"60\" value=\"${s.englishMinutes}\"></label><label>普通數學建議分鐘<input id=\"r3-math\" type=\"number\" min=\"0\" max=\"60\" value=\"${s.mathMinutes}\"></label><label>奧數建議分鐘（填 0 就不安排）<input id=\"r3-olympiad\" type=\"number\" min=\"0\" max=\"60\" value=\"${s.olympiadMinutes}\"></label><button class=\"btn primary\" data-r3=\"save-plan\">儲存安排</button><p>這是在同一個瀏覽器裏的家長時限。它不能防止作弊，也不是裝置的螢幕時間管理。</p></section>",
     "<section><h2>遊戲時間</h2><label>每日玩遊戲的時間上限（分鐘）<input id=\"r3-limit\" type=\"number\" min=\"5\" max=\"180\" value=\"${s.limitMinutes}\"></label><button class=\"btn primary\" data-r3=\"save-plan\">儲存</button><p>學習沒有時間限制。</p></section>"),
    ("n.limitMinutes=Number(document.getElementById('r3-limit').value);n.englishMinutes=Number(document.getElementById('r3-english').value);n.mathMinutes=Number(document.getElementById('r3-math').value);n.olympiadMinutes=Number(document.getElementById('r3-olympiad').value);r3SaveSettings(n);r3Status('跨科安排已儲存。');",
     "n.limitMinutes=Number(document.getElementById('r3-limit').value);n.englishMinutes=0;n.mathMinutes=0;n.olympiadMinutes=0;r3SaveSettings(n);r3Status('遊戲時間已儲存。');"),
    ("<p>今天英文、數學和遊戲一共用了 ${Math.ceil(F3.usageTotal(set,c.id)/60000)}／${set.limitMinutes} 分鐘。計時從啟用這項功能時開始，更早的時間沒有紀錄，不會補上。</p>",
     "<p>今天玩遊戲用了 ${Math.ceil(r3ArcadeMs(set)/60000)}／${set.limitMinutes} 分鐘。</p>"),
    ("r3Dialog('家庭備份與跨科安排',", "r3Dialog('家庭備份與遊戲時間',"),
    ("<h2>家庭完整備份與跨科安排</h2>", "<h2>家庭完整備份與遊戲時間</h2>"),
    ("if(route==='kid'&&!document.getElementById('r3-daily')){", "if(false){"),
    # ---- item 10: leftovers ------------------------------------------------------------------------------------------
    ('<p class="a28-eyebrow">WORDQUEST · LEARN & PLAY</p>', '<p class="a28-eyebrow">SMARTQUEST PLANET · LEARN & PLAY</p>'),
    ('WORDQUEST V32 · ADMIN SANDBOX', 'SMARTQUEST PLANET · ADMIN SANDBOX'),
    ("throw Error('不是可用的 WordQuest 教材包。')", "throw Error('不是可用的教材包。')"),
    ("'WordQuest_My_Rhythm.json'", "'SmartQuest_My_Rhythm.json'"),
    ("'WordQuest-v28-diagnostics.json'", "'SmartQuest-diagnostics.json'"),
    ("'WordQuest_V30_Learning_Report.json'", "'SmartQuest_Learning_Report.json'"),
    ("'WordQuest_V31_Workshop_Report.json'", "'SmartQuest_Workshop_Report.json'"),
    ("'WordQuest_Device_R32.json'", "'SmartQuest_Device.json'"),
    ("'WordQuest-original-backup.json'", "'SmartQuest-original-backup.json'"),
    ("'WordQuest-v28-backup-'", "'SmartQuest-backup-'"),
    ("'WordQuest-v13-backup-'", "'SmartQuest-backup-'"),
    ("'WordQuest_Family_R32_'", "'SmartQuest_Family_'"),
    ("'WordQuest_Weekly_'", "'SmartQuest_Weekly_'"),
    ("'WordQuest-'+r.title", "'SmartQuest-'+r.title"),
    ("'WordQuest_Maths_unreadable_raw.txt'", "'SmartQuest_Maths_unreadable_raw.txt'"),
    ("'WordQuest_Maths_'+store.profile.id+'.json'", "'SmartQuest_Maths_'+store.profile.id+'.json'"),
]

# literals that occur more than once on purpose
MULTI = [
    ('<span class="a28-coin" aria-hidden="true">W</span>', '<span class="a28-coin" aria-hidden="true">幣</span>', 2),
    ("'WordQuest_registry_recovery.txt'", "'SmartQuest_registry_recovery.txt'", 2),
]

MATHS = [
    ("if((store.state.usage[C.hkDay()]||0)>=store.state.settings.limit*60000)throw Error('今天的數學時間已用完，明天再來。家長可在設定調整時限。');if(awaitingBreak)throw Error('先讓眼睛休息，再繼續。');", ""),
    ("if(continuous>=1200000){awaitingBreak=true;root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();render();}", ""),
    ("<div class=\"field\"><label for=\"limit\">每天數學使用時限</label><select id=\"limit\">${[5,10,15,20,30,45,60,90].map(n=>`<option value=\"${n}\" ${state.settings.limit===n?'selected':''}>${n} 分鐘</option>`).join('')}</select></div>", ""),
    ("st.limit=Number(app.querySelector('#limit').value);", ""),
]


def apply(s, ctx):
    once = ctx.once
    for old, new in HOST + MATHS:
        s = once(s, old, new)
    for old, new, n in MULTI:
        if s.count(old) != n:
            raise ValueError(f'expected {n} of {old[:50]!r}, got {s.count(old)}')
        s = s.replace(old, new)
    return s
