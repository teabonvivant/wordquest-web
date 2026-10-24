"""R3.29 s65 - details of the old (R3.6) screens that cannot be fixed in the r37_src JS layer: wording, names and small logic of the
spelling classroom, the word workshop, the reports, the parent pages and the arcade lobby. Applied after s60 (file-name order), so the
helpers it calls (window.s65*) are defined in r37_src/s60_legacy.js. Every anchor must be unique (ctx.once raises otherwise)."""
import re


def sub_all(s, a, b, minimum=1):
    n = s.count(a)
    if n < minimum:
        raise ValueError(f'expected at least {minimum} of: {a[:80]} (got {n})')
    return s.replace(a, b)


def apply(s, ctx):
    o = ctx.once

    # ------------------------------------------------------------------ A-11 / C-12 / C-22: one name for one thing
    s = sub_all(s, '原有拼字教室報告', '拼字課堂報告')
    s = sub_all(s, '拼字教室', '拼字課堂')                       # the English course = 拼字課堂 (a single lesson stays 拼字小課 01)
    s = sub_all(s, '拼字課學習情況', '拼字課堂報告')
    s = sub_all(s, '給家長的學習報告', '字詞工房報告')
    s = sub_all(s, '組合學習報告', '字詞工房報告')
    s = sub_all(s, '看組合學習情況', '看字詞工房報告')
    s = sub_all(s, '詞語組合：孩子學得怎樣？', '字詞工房報告')
    s = sub_all(s, '安排詞語組合練習', '安排字詞工房練習')
    s = sub_all(s, '詞語組合工房', '字詞工房')
    s = sub_all(s, '詞語與圖片庫', '詞語圖片庫')
    s = sub_all(s, '80 個拼字與生活單元', '拼字課堂')
    s = sub_all(s, '學習報告', '默書報告', 0)                       # what is left is the dictation report (#report)
    s = sub_all(s, '安排下一次小課', '安排下一次學習')
    s = sub_all(s, '學習計劃', '安排下一次學習', 0)
    s = o(s, "'learning-plan','安排小課'", "'learning-plan','去安排'")
    s = o(s, "'learning-report','看學習情況'", "'learning-report','看拼字課堂報告'")
    # single lessons are always called 拼字小課 NN / 生活主題 NN (the plan page used the bare unit id)
    s = o(s, "<option value=\"${x.id}\" ${x.id===u?'selected':''}>${x.id} · ${esc(x.title)}</option>",
          "<option value=\"${x.id}\" ${x.id===u?'selected':''}>${x.id.startsWith('U')?'拼字小課 ':'生活主題 '}${x.id.slice(1)} · ${esc(x.title)}</option>")

    # ------------------------------------------------------------------ C-20: grades are written 小三, never 小3
    G = "${'一二三四五六'[%s.grade-1]||%s.grade}"
    for v in ('c', 'p', 'u', 'p.profile', 'store.profile'):
        s = s.replace('小${%s.grade}' % v, '小' + G % (v, v))
    s = s.replace('<option value="${n}">小${n}</option>', "<option value=\"${n}\">小${'一二三四五六'[n-1]}</option>")
    s = s.replace('<option value="${n}" ${n===3?\'selected\':\'\'}>小${n}</option>', "<option value=\"${n}\" ${n===3?'selected':''}>小${'一二三四五六'[n-1]}</option>")

    # ------------------------------------------------------------------ A-21: Cantonese diminutives in dictionary / story text
    s = s.replace('兔仔', '兔子').replace('熊仔', '小熊').replace('鴨仔', '小鴨')
    s = s.replace('一個（用在輔音音素前）', '一個').replace('一個（用在元音音素前）', '一個')

    # ------------------------------------------------------------------ A-05: a 12-word life-topic unit is learnt in two rounds
    s = o(s, "'先學 8 個詞，再做 20 題考考你。'}</p>${coin?",
          "(words.length>8?'共 '+words.length+' 個詞，分兩次學：每次先學 8 個還沒學過的詞，再做 20 題考考你。':'先學 8 個詞，再做 20 題考考你。')}</p>${coin?")
    s = o(s, "drill?'開始'+L30.MODES[drill].title:done?'再學一次':'開始這一課'",
          "drill?'開始'+L30.MODES[drill].title:(words.length>8&&window.s65Unseen(u)>0&&window.s65Unseen(u)<words.length)?'學下一組詞（'+window.s65Unseen(u)+' 個新詞）':done?'再學一次':'開始這一課'")
    s = o(s, "<p>${words.length} 個詞</p>${l30DoneBadge(u.id)}", "<p>${words.length>8?words.length+' 個詞 · 分兩次學':words.length+' 個詞'}</p>${l30DoneBadge(u.id)}")
    s = o(s, "<span>已學完 · ${l30Day(x.at)}</span>", "<span>${window.s65DoneLabel(uid)} · ${l30Day(x.at)}</span>")

    # ------------------------------------------------------------------ A-06: the quiz card says what to do; a listening question does not print the answer's meaning
    s = o(s, "else if(isAudio)body+=`<div class=\"l30-prompt\">${esc(w.meaning)}</div><button class=\"l30-audio\"",
          "else if(isAudio)body+=`<div class=\"l30-prompt\">${q.mode==='listenChoice'&&!fb?'聽讀音，選出你聽到的英文字':esc(w.meaning)}</div><button class=\"l30-audio\"")

    # ------------------------------------------------------------------ A-12 / A-16: workshop numbers come from the data
    s = o(s, '<p class="l31-help">15 組主題 · 92 個組合。看懂各部分，再學新詞的意思。</p>',
          '<p class="l31-help">${D31.groups.length} 組主題 · ${D31.recipes.length} 個組合。看懂各部分，再學新詞的意思。</p>')
    s = o(s, "L31('看全部 92 個組合','assembly')", "L31('看全部 '+D31.recipes.length+' 個組合','assembly')")
    s = o(s, "L31('92 個組合與 15 組主題','assembly','primary')", "L31(D31.recipes.length+' 個組合與 '+D31.groups.length+' 組主題','assembly','primary')")
    s = o(s, "function l31GroupCard(g){const done=l31Read().sessions.filter(s=>s.group===g.id&&s.status==='completed').length;",
          "function l31GroupCard(g){const done=new Set(l31Read().events.filter(e=>e.step!=='notice'&&g.recipes.includes(e.recipe)).map(e=>e.recipe)).size;")
    s = o(s, "<p>${g.recipes.length} 個組合 · ${done?'已完成 '+done+' 組':'先由 2 個組合開始'}</p>",
          "<p>${done?'已練 '+done+'／'+g.recipes.length+' 個組合':g.recipes.length+' 個組合 · 先由 2 個組合開始'}</p>")

    # ------------------------------------------------------------------ A-25: no system wording after a right answer in the workshop
    s = o(s, "<p>${fb.correct?'這次的操作已記錄。字塊練習不算自己掌握。':'第一次的答案會保留。",
          "<p>${fb.correct?'做得好，繼續下一步。':'第一次的答案會保留。")
    s = o(s, "<h1>字詞工房報告</h1><p>分開看：會砌字、明白意思、自己串對、隔日複習。這個頁面只供家長閱讀，不會改動孩子的紀錄。</p>",
          "<h1>字詞工房報告</h1><p>分開看：會砌字、明白意思、自己串對、隔日複習。字塊練習只算練習，不算自己掌握。這個頁面只供家長閱讀，不會改動孩子的紀錄。</p>")

    # ------------------------------------------------------------------ A-26: a word without a picture shows no instruction text
    s = o(s, "'<div class=\"l30-noart\">用中文和情境理解</div>'", "'<div class=\"l30-noart\" aria-hidden=\"true\">Aa</div>'")

    # ------------------------------------------------------------------ A-14 / C-05: the spelling-classroom report
    s = o(s, "[[m.seen,'看過教學'],[m.meaning,'認得詞義'],[m.independent,'曾自己串對'],[m.delayed,'通過隔日複習']]",
          "[[m.seen,'看過教學'],[m.meaning,'認得詞義'],[m.independent,'曾自己串對（剛看過答案即答，不計）'],[m.delayed,'通過隔日複習']]")
    s = o(s, "<p>${m.weak?`有 ${m.weak} 個意思最近答錯。可以分幾次重溫，不用重做所有題目。`:'最近沒有記錄到答錯的項目。'}</p>",
          "<p>${window.s65Watch(c,m)}</p>")
    s = o(s, "<h1>拼字課堂報告</h1><p>看過、認得、自己串對、隔日仍串對，是四種不同的紀錄。</p>",
          "<h1>拼字課堂報告</h1><p>看過、認得、自己串對、隔日仍串對，是四種不同的紀錄。</p><p class=\"l30-muted\">${window.s65QuestLine()}</p>")
    s = o(s, "<div class=\"l30-empty\"><h2>還沒有學習紀錄</h2><p>先完成一小課。</p></div>",
          "<div class=\"l30-empty\"><h2>還沒有拼字小課紀錄</h2><p>先完成一小課。闖關的成績不在這裏，請看家長星的「進度」。</p></div>")
    s = o(s, "`拼字課堂已完成 ${n.completed} 組。有 ${n.weak} 個意思最近要再練。`",
          "`拼字小課已完成 ${n.completed} 組（不含闖關）。${window.s65QuestLine(true)}有 ${n.weak} 個意思最近要再練。`")

    # ------------------------------------------------------------------ A-15: "剛看過後答對" says what the record really means
    s = s.replace('有提示時答對', '剛看過後答對')
    s = o(s, '<li><strong>剛看過後答對</strong><span>看了提示或答案後答對。</span></li>',
          '<li><strong>剛看過後答對</strong><span>答對前剛看過提示、答案或學習卡，包括同一輪學習裏剛學過的字。不是憑記憶自己串對，所以還不算掌握；隔一天再自己串對一次便可以。</span></li>')

    # ------------------------------------------------------------------ C-01: the parent's plan really shows up (English star "家長安排")
    s = s.replace('孩子首頁會直接顯示開始按鈕。', '孩子在英文星會看到「家長安排」的開始按鈕。')
    s = s.replace('已安排到孩子首頁。', '已安排。孩子在英文星會看到「家長安排」。')
    s = s.replace('儲存到孩子首頁', '儲存安排')
    s = s.replace('安排到孩子首頁', '儲存安排')

    # ------------------------------------------------------------------ C-02: the arcade lock says what really unlocks a game
    s = o(s, " const UNLOCK='做練習解鎖';", " const UNLOCK='學字解鎖';")
    s = o(s, "note=blocked?a28Label(id):`${UNLOCK}，還差 ${Math.max(0,g.words-n)} 項複習`;",
          "note=blocked?a28Label(id):`${UNLOCK}，還差 ${Math.max(0,g.words-n)} 項複習`;")
    s = o(s, "txt('p','p30-after','通過複習，這個遊戲就會開放。')",
          "txt('p','p30-after','在拼字課堂學字，隔一天（相隔 24 小時以上）自己串對，就算通過 1 項複習。闖關不計。項數夠了，這個遊戲就會開放。')")

    # ------------------------------------------------------------------ C-13: the how-to says there are English questions in the game
    s = o(s, "first.replaceWith(mk('p','p30-how',howHtml(gm)),txt('p','p30-goal',gm.g));",
          "first.replaceWith(mk('p','p30-how',howHtml(gm)),txt('p','p30-goal',gm.g),txt('p','p30-goal p30-learn',window.s65ArcLearn(id)));")
    s = o(s, "<p class=\"p30-goal\">${esc(gm.g)}</p>`:`<p>${esc(pgMeta.guide||'')}</p>`)",
          "<p class=\"p30-goal\">${esc(gm.g)}</p><p class=\"p30-goal p30-learn\">${esc(window.s65ArcLearn(id))}</p>`:`<p>${esc(pgMeta.guide||'')}</p>`)")

    # ------------------------------------------------------------------ C-03 / C-23: one coin rule, matching what is really paid
    RULES = ("<p>闖關第一次拿滿 5 顆星，得 1 枚金幣；頭目關（第 10 關）得 3 枚，第一次通過頭目關再多 2 枚。"
             "選擇題、填充題、默書拿滿 5 顆星，得 1 枚，每日最多 3 次。遊戲星的每日任務完成後可領 1 至 2 枚。"
             "部分角色多得 1 枚。答錯不會扣金幣，訂正不會多給。</p>"
             "<p>街機遊戲每局 1 至 4 枚金幣（按遊戲不同），沒有倒數計時。</p>")
    s, nrules = re.subn(r"<p>每次練習或測驗，全部自己答對.*?訂正不會多給金幣。每款遊戲要的金幣不同，由 1 枚到 4 枚。</p>", lambda m: RULES, s, count=1, flags=re.S)
    if nrules != 1:
        raise ValueError('coin rules paragraph not found')
    s = o(s, "每次練習或測驗拿滿 5 顆星，得 1 枚金幣。每日首四組有金幣。完成第三組，再多得 1 枚。每日最多 5 枚。同一組一天只得一次。每款遊戲要的金幣不同，由 1 枚到 4 枚。答錯不會扣金幣。",
          "闖關、練習或測驗拿滿 5 顆星，得金幣。每款街機遊戲每局要 1 至 4 枚金幣。答錯不會扣金幣。")
    s = o(s, "<div><small>今日學習所得</small><strong>${d.earned}<span> / 5 枚金幣</span></strong></div>", "")
    s = o(s, "本輪已玩 ${c.batch.used}/5 局 · 今日 ${d.earned}/5。金幣不會過期。", "本輪已玩 ${c.batch.used}/5 局。金幣不會過期。")
    s = o(s, "<details><summary>最近的金幣紀錄</summary>", "<details><summary>最近的街機金幣紀錄</summary>")
    s = o(s, "<p class=\"a28-eyebrow\">COLLECT COLOURS, NOT ADVANTAGES</p>", "<p class=\"a28-eyebrow\">只收集配色，不收集優勢</p>")
    s = s.replace('<h2>家庭完整備份與遊戲時間</h2>', '<h2>家庭完整備份</h2>')
    s = s.replace('金幣和遊戲用時', '金幣和遊戲進度').replace('讀取已換的時間和存檔', '讀取金幣和存檔')
    s = s.replace('金幣、已換的時間和遊戲存檔', '金幣和遊戲存檔')

    # ------------------------------------------------------------------ C-10: wording of the characters
    s = s.replace("button('查看全部角色','page')", "button('認識學習夥伴','page')")
    s = s.replace("button('認識角色與顯示設定','page')", "button('認識學習夥伴與顯示設定','page')")

    # ------------------------------------------------------------------ C-19: no dead button when nothing needs practice
    s = o(s, "`<button type=\"button\" class=\"btn primary big\" disabled>再練這些字</button><p class=\"p40-why\">目前沒有要再練的字。</p>`",
          "`<p class=\"p40-why\">目前沒有要再練的字。</p>`")

    return s
