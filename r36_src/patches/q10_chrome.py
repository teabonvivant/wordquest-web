"""R3.6 q10 - brand (學霸星球 SmartQuest Planet), home tiles, maths entry split, notice removal, admin entry.

Items covered: 1 (bigger home icons), 4 (admin entry), 6 (家長教學小貼士), 7 (remove disclaimer-type notes),
10 (rename), 11 (maths vs olympiad entries), 12 (visible way back to the home page from maths).

Pieces:
  * TEXT_EDITS   exact one-anchor edits to the host (s33) and the maths app (s39)
  * MATH_EDITS   structural edits of the maths app (scope: normal / olympiad; header with a home button)
  * </head>      + <style id="wq36-q10-css">  (r36_src/q10_chrome.css)
  * anchor       + r36_src/q10_chrome.js     (host closure code, injected before the render anchor)
  * extra_files  manifest with the new name
"""
import json, re

# ---------------------------------------------------------------------------------------------------- brand
BRAND_EDITS = [
    ('<span class="logo">W</span><span>WordQuest</span>',
     '<span class="logo" aria-hidden="true">★</span><span class="brand-name">學霸星球<small class="brand-en">SmartQuest Planet</small></span>'),
    ("brand.title=isTestAdmin()?'測試中心':'WordQuest 孩子首頁'", "brand.title=isTestAdmin()?'測試中心':'學霸星球 首頁'"),
    ("if(name)name.textContent=isTestAdmin()?'Admin':'WordQuest';", "if(name)name.textContent=isTestAdmin()?'Admin':'學霸星球';"),
    ('<p class="eyebrow">WordQuest · 測試專用</p><h1>測試中心</h1>', '<p class="eyebrow">學霸星球 · 測試專用</p><h1>測試中心</h1>'),
    ('<p class="eyebrow">WordQuest · 學一小段，玩一會</p>', '<p class="eyebrow">學霸星球 · 學一小段，玩一會</p>'),
    ('<span class="l30-eyebrow">WordQuest · 學一點，進步一點</span>', '<span class="l30-eyebrow">學霸星球 · 學一點，進步一點</span>'),
    ("badge.textContent='WordQuest · 森林學園'", "badge.textContent='學霸星球'"),
    ("app.setAttribute('aria-label','WordQuest 數學學習')", "app.setAttribute('aria-label','學霸星球 數學學習')"),
    ("dialog.setAttribute('aria-label','WordQuest 數學模組')", "dialog.setAttribute('aria-label','學霸星球 數學模組')"),
    # about panel (settings): name + version only
    ("<p class=\"small muted\">WordQuest'+(ver?' '+esc(ver):'')+' · 內容尚未經老師逐題審核。</p>",
     "<p class=\"small muted\">學霸星球 SmartQuest Planet'+(ver?' '+esc(ver):'')+'</p>"),
]

# ------------------------------------------------------------------------------------- item 6 and item 7
NOTICE_EDITS = [
    # item 6: heading text
    ('<summary>給家長：這課怎樣教？</summary>', '<summary>家長教學小貼士</summary>'),
    ('<h2>這課怎樣教</h2>${pcBtn(\'關閉\',\'close-note\'', '<h2>家長教學小貼士</h2>${pcBtn(\'關閉\',\'close-note\''),
    # item 7: spelling classroom + learning screens
    ('<div class="l30-note">聲音由裝置讀出，不是老師錄音。</div>', ''),
    ('<p class="l30-subtle">裝置英語語音示範 · 不是教師錄音。看過不等於已經記得。</p>', ''),
    ('<p class="l30-muted">意思用來分清同音字，不會顯示拼法。</p>', ''),
    ('<p class="l30-subtle">${s.replays} 次完整播放 · 可重聽，不扣分。</p>', ''),
    ('<p class="l30-subtle">可以按鍵盤 1–${q.choices.length} 選擇，再按 Enter 提交。</p>', ''),
    ('<p class="l30-subtle">每塊只用一次。因為已顯示字母，這題算「有提示」。</p>', ''),
    ('<p class="l30-muted">先想一想，再試作答。</p>', ''),
    # workshop (l31)
    ('<p id="l31-audio-state" class="l31-help" role="status">讀音來自裝置，不是教師錄音，也不會自動評核發音。</p>',
     '<p id="l31-audio-state" class="l31-help" role="status"></p>'),
    ("update('播放完成。這是裝置語音，不是教師錄音。')", "update('播放完成。')"),
    # item 4: in the test area the log-in card is the only login (Admin and 1234 already filled in); the three older helper lines go
    ("if(WQ_TEST_MODE&&route==='login'&&!$('#l30-test-entry')){", "if(false){"),
    ('autocomplete="current-password" placeholder="輸入 1234"></div><div class="wq29-actions">${btn(\'登入測試中心\'',
     'autocomplete="current-password" value="1234"></div><div class="wq29-actions">${btn(\'登入測試中心\''),
    # parent help / plan
    ('<p class="l30-muted">低年級先用 2 至 3 個詞，可以分幾次完成。這只是預設值，不能代替對孩子程度的評估。</p>', ''),
    ('<p>相機、裝置語音和相片辨認，會受瀏覽器權限和網絡影響。資料只存在這部裝置，不會自動傳到其他裝置。</p>',
     '<p>資料只存在這部裝置，不會自動傳到其他裝置。</p>'),
    # arcade rules paragraph
    ('這是 WordQuest 的規則，不保證孩子永遠記得。', ''),
    # image / sound source panel in the word library: keep the image credit, drop the voice disclaimers
    ('裝置語音只用來幫助聽和讀。沒有教師錄音，也不會自動評核發音。圖片來源和 SHA-256 清單，附在原始碼裏。', '圖片來源和 SHA-256 清單，附在原始碼裏。'),
    # voice settings option label
    ('裝置的聲音（沒有網絡時能否使用，視乎裝置）', '裝置的聲音'),
    # photo recognition message: keep the instruction, drop the hedge
    ("v20.message='相片可能太暗、太斜或字太小，結果只供參考。請把不對的取消，或按上一步重新拍照。'",
     "v20.message='相片可能太暗、太斜或字太小。請把不對的取消，或按上一步重新拍照。'"),
    # phonics 'note' dialog: drop the audio / scoring remarks
    ('<p>不會錄音評分，也不會用字母名稱拼出音素。讀音來自已存的音檔，或裝置的聲音。</p>', ''),
]

# ---------------------------------------------------------------------------------------------- maths app (s39)
MATH_TEXT_EDITS = [
    ('<div class="note about-math"><strong>關於數學內容</strong><p>題目依小學課程範圍編寫，還沒有經教師逐題審核。發現題目有問題，請在題目頁按「這題可能有問題」。</p></div>', ''),
    ("文字仍可使用。這個版本沒有內置真人錄音。", "文字仍可使用。"),
]


def _between(s, a, b, new, ctx):
    """Replace the text from the unique marker a up to (not including) the unique marker b."""
    if s.count(a) != 1 or s.count(b) != 1:
        raise ValueError(f'markers not unique: {a[:60]!r} {s.count(a)} / {b[:60]!r} {s.count(b)}')
    i, j = s.index(a), s.index(b)
    if j < i:
        raise ValueError('marker order')
    return s[:i] + new + s[j:]


def apply(s, ctx):
    once = ctx.once
    for old, new in BRAND_EDITS + NOTICE_EDITS + MATH_TEXT_EDITS:
        s = once(s, old, new)
    s = apply_maths(s, ctx)
    s = once(s, '''   +'<button type="button" class="p10-tile math" data-wqm-open="home"><span class="p10-ti" aria-hidden="true">🔢</span><span class="p10-tn">數學</span></button>\'
''', '''   +'<button type="button" class="p10-tile math" data-wqm-open="home"><span class="p10-ti" aria-hidden="true">🔢</span><span class="p10-tn">數學</span></button>'
   +'<button type="button" class="p10-tile oly" data-wqm-open="olympiad"><span class="p10-ti" aria-hidden="true">🧩</span><span class="p10-tn">奧數</span></button>\'
''')
    # the subjects card that repeated the same choices is not needed any more
    s = once(s, "if(rt==='kid'&&!$('#wq-subjects')){", "if(false){")
    css = (ctx.src / 'q10_chrome.css').read_text()
    js = (ctx.src / 'q10_chrome.js').read_text()
    s = once(s, '</head>', '<style id="wq36-q10-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + js + anchor)
    return s


def apply_maths(s, ctx):
    once = ctx.once
    # ---- scope: normal maths and olympiad are two entries into the same dialog -------------------------------------
    s = _between(s, " function nav(){return `<nav class=\"nav\" aria-label=\"數學功能\">", " function home(){const state=store.state,days=",
        " let wq36Scope='normal';\n function wq36Oly(){return wq36Scope==='olympiad';}\n"
        " function wq36Fix(){if(wq36Oly()){if(['home','normal','tools'].includes(view))view='olympiad';}else if(['olympiad','cards'].includes(view))view='home';}\n"
        " function nav(){const items=wq36Oly()?[['olympiad','思維之塔'],['cards','策略卡'],['parent','家長與進度']]:[['home','數學首頁'],['normal','數學群島'],['tools','教具工房'],['parent','家長與進度']];"
        "return `<nav class=\"nav\" aria-label=\"${wq36Oly()?'奧數功能':'數學功能'}\">${items.map(([id,n])=>btn(n,'nav:'+id,view===id?'active':'')).join('')}</nav>`;}\n"
        " function header(){const p=store.profile,oly=wq36Oly();return `<header class=\"topbar\"><div class=\"row wq36-left\">"
        "${root.WQM_INTEGRATED?btn('🏠 回首頁','close','primary wq36-home'):''}"
        "<div class=\"brand\"><div class=\"brandmark\" aria-hidden=\"true\">${oly?'◇':'＋'}</div><div>學霸星球<small>${oly?'奧數 · 思維之塔':'數學群島'}</small></div></div></div>"
        "<div class=\"row\"><span class=\"small name\">${esc(p.name)} · 小${p.grade}</span><span class=\"wallet\">◉ <strong id=\"balance\">${store.balance()}</strong> 金幣</span>"
        "${root.WQM_INTEGRATED?'':btn(p.persistent?'切換孩子':'家長設定','nav:profiles','quiet')}</div></header>${nav()}`;}\n", ctx)
    # question screens: 「← 返回」 plus a home button
    s = once(s, "function r35Header(){return r35Focus()?`<header class=\"focusbar\">${btn('← 返回','pause','quiet backbtn')}</header>`:header();}",
             "function r35Header(){return r35Focus()?`<header class=\"focusbar\">${btn('← 返回','pause','quiet backbtn')}${root.WQM_INTEGRATED?btn('🏠 首頁','close','quiet backbtn wq36-home-small'):''}</header>`:header();}")
    # home page of normal maths: no olympiad card, no 「兩條路線」
    s = once(s, '<span class="small muted">同一個學習檔案，兩條路線</span>', '')
    s = _between(s, " <article class=\"card track-card dark\"><span class=\"symbol\">◇</span><h3>思維之塔</h3>", " <article class=\"card track-card\"><span class=\"symbol\">▦</span><h3>教具工房</h3>", "", ctx)
    s = once(s, '<h2>今天想去哪裏？</h2>', '<h2>今天想學甚麼？</h2>')
    # render: keep the view inside the scope
    s = once(s, " function render(){if(!store)return;const s=current();let content;", " function render(){if(!store)return;wq36Fix();const s=current();let content;")
    # open(): choose the scope from the entry that was tapped; a round of the other subject is dropped without asking
    s = once(s, "   initStore();\n   if(!store.state.current && ['home','normal','olympiad','parent'].includes(requested))view=requested;",
             "   initStore();\n   if(requested==='olympiad')wq36Scope='olympiad';else if(['home','normal'].includes(requested))wq36Scope='normal';\n"
             "   else if(store.state.current)wq36Scope=store.state.current.track==='olympiad'?'olympiad':'normal';\n"
             "   if(store.state.current&&!store.state.current.completed&&['home','normal','olympiad'].includes(requested)&&(store.state.current.track==='olympiad')!==wq36Oly()){try{save(n=>{n.current=null;});view='home';}catch(e){fail(e);}}\n"
             "   if(!store.state.current && ['home','normal','olympiad','parent'].includes(requested))view=requested;")
    # the 'resume' page becomes a small card on the scope's home page (nothing blocks the child from choosing something new)
    s = once(s, " function wq36Fix(){if(wq36Oly()){", " function wq36Fix(){if(view==='resume')view=wq36Oly()?'olympiad':'home';if(wq36Oly()){")
    s = once(s, "  else content=({home,normal:catalog,olympiad,cards,tools:toolsPage,parent,profiles,lesson})[view]?.()||home();",
             "  else content=({home,normal:catalog,olympiad,cards,tools:toolsPage,parent,profiles,lesson})[view]?.()||home();\n"
             "  if(current()&&!current().completed&&['home','olympiad'].includes(view))content=`<div class=\"wq36-resume\"><span>有一課做到一半</span>${btn('繼續上次學習','resume','primary')}</div>`+content;")
    # maths CSS for the home button and the resume card; the 「回首頁」 button also returns to the child home page
    s = once(s, " const R35CSS=\"", " const R36CSS=\"/* R3.6 q10: maths chrome */\\n.wq36-left{gap:12px;flex-wrap:nowrap;min-width:0}\\n.wq36-home{min-height:52px;padding:8px 16px;font-size:17px;border-radius:16px;white-space:nowrap;flex:0 0 auto}\\n.wq36-home-small{margin-left:auto;min-height:48px}\\n.focusbar{gap:10px;justify-content:space-between}\\n.wq36-resume{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;margin:0 0 14px;border-radius:18px;background:#fff5df;border:1px solid #e3d2b3;font-weight:700}\\n@media(max-width:560px){.wq36-left .brand small{display:none}.wq36-left .brand{font-size:19px}.topbar{min-height:0;padding:10px 0;gap:10px}}\\n\";\n const R35CSS=\"")
    s = once(s, "style.textContent+='\\n'+R35CSS;", "style.textContent+='\\n'+R35CSS;style.textContent+='\\n'+R36CSS;")
    s = once(s, "    case 'close':close();break;", "    case 'close':if(close()!==false)root.WQ36Home?.();break;")
    # items 8 (maths half): no questions about an unfinished round; the old round is simply replaced
    s = once(s, "if(current()&&!current().completed&&!confirm('要結束未完成的數學練習，並開始模擬卷嗎？已提交的答案會保留。'))return;", "")
    s = once(s, "if(current()&&!current().completed&&!confirm('結束尚未完成的一輪？已提交答案會保留。'))return;\n    ui.forceRemedy", "ui.forceRemedy")
    s = once(s, "if(parts[0]==='daily'||parts[0]==='diagnostic'){if(current()&&!current().completed&&!confirm('結束上一輪？已提交答案會保留。'))return;makePlan", "if(parts[0]==='daily'||parts[0]==='diagnostic'){makePlan")
    s = once(s, "if(parts[0]==='game'){if(current()&&!current().completed&&!confirm('結束尚未完成的一輪？已提交答案會保留。'))return;const id=", "if(parts[0]==='game'){const id=")
    return s


def apply_sw(sw, ctx):
    return sw


def extra_files(ctx):
    p = ctx.root / 'app/manifest.webmanifest'
    m = json.loads(p.read_text())
    m['name'] = '學霸星球 SmartQuest Planet'
    m['short_name'] = '學霸星球'
    m['description'] = '香港小朋友的英文與數學學習遊樂園'
    return {'app/manifest.webmanifest': json.dumps(m, ensure_ascii=False, indent=2) + '\n'}
