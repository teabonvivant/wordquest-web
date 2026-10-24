"""R3.29 s95 - core detail fixes in the baked R3.5/R3.6 pages (A-11, A-12, A-14, A-15, A-16, A-21, A-25, A-26 and the listening card of A-06).
The old sources (r3_src/base, r35_src, r36_src) are not edited; the text they render is changed here, after every other patch (file-name order)."""


def apply(s, ctx):
    once = ctx.once

    def swap_all(s, a, b, min_n=1):
        n = s.count(a)
        if n < min_n:
            raise ValueError(f'expected at least {min_n} of {a[:80]!r}, got {n}')
        return s.replace(a, b)

    # A-12: the numbers on the workshop pages come from the data, not from a sentence written months ago
    s = once(s, '<p class="l31-help">15 組主題 · 92 個組合。', '<p class="l31-help">${D31.groups.length} 組主題 · ${D31.recipes.length} 個組合。')
    s = once(s, "${L31('看全部 92 個組合','assembly')}", "${L31('看全部 '+D31.recipes.length+' 個組合','assembly')}")
    s = once(s, "${L31('92 個組合與 15 組主題','assembly','primary')}", "${L31(D31.recipes.length+' 個組合與 '+D31.groups.length+' 組主題','assembly','primary')}")

    # A-16: the card counts the recipes that were really practised (a finished practice is two recipes, not one 「組」)
    s = once(s, "function l31GroupCard(g){const done=l31Read().sessions.filter(s=>s.group===g.id&&s.status==='completed').length;",
             "function l31GroupCard(g){const done=new Set(l31Read().events.filter(e=>e.step!=='notice'&&g.recipes.includes(e.recipe)).map(e=>e.recipe)).size;")
    s = once(s, "<p>${g.recipes.length} 個組合 · ${done?'已完成 '+done+' 組':'先由 2 個組合開始'}</p>",
             "<p>${done?'已練 '+done+'／'+g.recipes.length+' 個組合':g.recipes.length+' 個組合 · 先由 2 個組合開始'}</p>")

    # A-25: a child is not shown the record-keeping note after every right answer (the parent report explains it)
    s = once(s, "'這次的操作已記錄。字塊練習不算自己掌握。'", "'做得好，繼續下一步。'")

    # A-26: a card without a picture stays quiet
    s = once(s, "'<div class=\"l30-noart\">用中文和情境理解</div>'", "''")

    # A-06: the listening choice card does not print the Chinese meaning before the answer (it would make the listening useless)
    s = once(s, " else if(isAudio)body+=`<div class=\"l30-prompt\">${esc(w.meaning)}</div><button class=\"l30-audio\"",
             " else if(isAudio)body+=`<div class=\"l30-prompt\">${q.mode==='listenChoice'&&!fb?'聽一聽，選出聽到的英文':esc(w.meaning)}</div><button class=\"l30-audio\"")

    # A-14: the parent report lists what was answered wrong in the last 14 days, even when it was right on the next try
    s = once(s, "<p>${m.weak?`有 ${m.weak} 個意思最近答錯。可以分幾次重溫，不用重做所有題目。`:'最近沒有記錄到答錯的項目。'}</p>",
             "<p>${(()=>{const rw=[...new Map(c.attempts.filter(x=>x.mode!=='study'&&!x.technical&&x.correct===false&&Date.now()-(x.time||0)<14*86400000).map(x=>LIB30.words.get(x.target)).filter(Boolean).map(w=>[w.id,w])).values()];return m.weak?`有 ${m.weak} 個意思最近答錯。可以分幾次重溫，不用重做所有題目。`:rw.length?`最近 14 天曾答錯：${rw.slice(0,12).map(w=>esc(w.form)).join('、')}${rw.length>12?'…':''}（之後的題目已答對，仍可以再溫習一次）。`:'最近沒有記錄到答錯的項目。';})()}</p>")
    s = once(s, "[[m.seen,'看過教學'],[m.meaning,'認得詞義'],[m.independent,'曾自己串對']", "[[m.seen,'看過教學'],[m.meaning,'認得詞義'],[m.independent,'曾自己串對（剛看過答案即答不計）']")

    # A-15: "assisted" also covers answers typed right after the card was shown; the name says so
    s = swap_all(s, '有提示時答對', '看過提示或答案後答對')

    # A-11: one name per feature (入口 課堂／字詞工房／詞庫)
    s = swap_all(s, '原有拼字教室報告', '拼字課堂報告', 0)
    s = swap_all(s, '拼字教室', '拼字課堂')
    s = swap_all(s, '詞語組合工房', '字詞工房')
    s = swap_all(s, '詞語與圖片庫', '詞語圖片庫')

    # A-21: written Chinese, not Cantonese colloquial
    s = swap_all(s, '兔仔', '兔子')
    s = swap_all(s, '"zhHK":"一個（用在輔音音素前）"', '"zhHK":"一個"', 0)
    return s
