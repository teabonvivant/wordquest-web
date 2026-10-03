"""R3.5 p10 - first-run screens and chrome (S1-01, D1/D8 entry, S1-02, S1-07, S2-01/02/03, S2-08, S2-12, S2-13, S2-15, S2-21,
S3-03, S3-06, S3-07, S3-16; S2-17 grade tag).

Pieces:
  * </head>                                   + <style id="wq35-p10-css">  (r35_src/p10_firstrun.css)
  * "\\ninstallMediaEvents();\\nrender();"        + r35_src/p10_firstrun.js     (host closure code; the anchor text is kept)
  * three small text edits that remove engineering wording (S1-07) and one structural edit (S2-21: the workshop promo card
    is only inserted on the child home).
All other changes happen at run time from the JS file, with structural anchors only (ids, classes, data attributes).
"""

# S1-07: engineering wording in child / parent screens (the maths footers belong to the maths module)
TEXT_EDITS = [
    # wallet note on the workshop result card
    ("'目前金幣：'+C.safeCount(activeChild()?.stars)+'。由原站結算，不重複派發。'",
     "'你的金幣：'+C.safeCount(activeChild()?.stars)+' 枚。'"),
    # workshop list header: the disclosure lives in settings only
    ("找到 ${groups.length} 組。組合與詞義已作工程校對，尚未經真人教師逐題簽核。</p>",
     "找到 ${groups.length} 組。</p>"),
    # spelling classroom first screen
    ('<div class="l30-note">內容已作程式及文字校對，尚未經真人教師逐題簽核。聲音使用裝置英語語音，不是教師錄音；暫不能用來評核孩子發音。</div>',
     '<div class="l30-note">聲音由裝置讀出，不是老師錄音。</div>'),
    # settings: backup panel (version in the heading line and in the button)
    ('<p class="eyebrow">WORDQUEST V28 · 金幣街機更新</p><h2>版本與備份檢查</h2>',
     '<h2>備份與儲存狀態</h2>'),
    ('data-act="export-data">匯出 V28 備份</button>',
     'data-act="export-data">匯出學習備份</button>'),
    # game settings: old ticket history
    ('以下只保留舊版票券歷史；未用額度在 V28 首次升級時一次轉回金幣。',
     '以下是舊版票券的紀錄。沒用完的票已換回金幣。'),
    # S2-21: the workshop promo card belongs to the child home only (not to the practice page or the spelling classroom)
    ("if(['kid','practice','classroom'].includes(route)&&!$('#l31-home-entry'))",
     "if(['kid'].includes(route)&&!$('#l31-home-entry'))"),
]


def apply(s, ctx):
    once = ctx.once
    css = (ctx.src / 'p10_firstrun.css').read_text()
    js = (ctx.src / 'p10_firstrun.js').read_text()
    for old, new in TEXT_EDITS:
        s = once(s, old, new)
    s = once(s, '</head>', '<style id="wq35-p10-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + js + anchor)
    return s
