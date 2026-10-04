"""R3.6 q60 - item 7 (second pass): explanatory and "this is not ..." notices come out of the whole program.

q10 handled the lesson, quiz and result screens. This pass walks the rest: the buddy lines, parent pages, report footnotes,
maths pages and admin pages. Rules used:
  * removed: sentences that only say what a feature is NOT (not a teacher recording / not a test / not a cloud / not a rating /
    "does not mean mastered"), transitional notes ("the old practice is still there"), and repeated storage/security caveats
  * kept: privacy and backup warnings that protect data (do not clear browser data, export before reset), error messages,
    confirmations, teaching content inside lessons (e.g. "chair is not 'air'"), the parent-password and test-mode labels
A sentence that is dropped must exist in the program, otherwise the build stops (so a later change cannot silently re-add it).
"""

DROPS = [
    # --- child / parent pages (host) ---
    '圖片是 Noto 彩色圖案，用來幫助理解詞義，不是照片，也不能表示詞的所有意思。',
    '不是每個字都有公共錄音。',
    '這不是聽力測驗。',
    '這不是臨床或標準化的能力測驗。',
    '這是這次重新繪製的概念海報，不是舊版 V33 或 0.1.3 的原圖。',
    '同一輪看過提示後答對，只表示這一輪能串出，不代表隔天還記得。',
    '沒有紀錄不是答錯，也不是 0 分。',
    '尚未有紀錄；不代表 0 分。',
    '沒有紀錄不等於已經全部掌握。',
    '答對次數不等於已掌握的字數。',
    '答對次數不等於已經記得的字數。',
    '解鎖不代表學過或答對。',
    '這不代表全部內容都已掌握。',
    '這只是常用字分組，不代表孩子已會串。',
    '只改分組，不會改選取，也不代表孩子已學會。',
    '這是寬鬆練習的結果，不代表嚴格默書已掌握。',
    '分數只用來排次序，方便核對，不是正確率。',
    '紀錄只在這部裝置，不是朋友的成績。',
    '默書在這裏是練習，不是考試。',
    '這不是雲端備份，也不能防止裝置擁有人改動檔案。',
    '這不是雲端後台，看不到別人的帳戶和答題紀錄。',
    '這不是雲端後台。',
    '這個檢查不能證明金幣或成績是真的，也不是加密。',
    '這只是這部裝置上的保護，不是網上登入。',
    '這只是這部裝置上的保護，不是雲端的安全登入。',
    '這只是這部裝置的家庭設定，不是安全鎖，也不是雲端帳戶。',
    '它不能防止孩子改動資料。',
    '這只是這部裝置的設定，不能防止別人改動。',
    '這是存在本機的試用帳戶，不是雲端登入。',
    '資料只存在這部裝置，不能防止作弊。',
    '這些資料只存在這部裝置，沒有經過任何伺服器核實。',
    '家長密碼只用來在這部裝置上確認身份，不是網上的安全驗證。',
    '測試通過，不代表所有孩子的資料都已成功備份或還原。',
    '功能可用，不代表換裝置或重新開啟後也沒有問題。',
    '入口開放，不代表這些功能已在真機上測試過。',
    '但這不是有後台權限的站長帳戶。',
    '會先播放已存的音檔。沒有的話，用裝置的英式聲音。',
    '按喇叭聽完整讀音。',
    '進度會自動儲存。',
    '題號和草稿會儲存。用輸入法選字時，按 Enter 不會提交。',
    '原有的學校／教室報告仍保留。',
    '跟讀不會錄音，也不會自動評分。',
    '上面的讀音按鈕會播放整個字。',
    # --- maths and olympiad ---
    '不是任何主辦機構的真題、評級或正式競賽成績。',
    '每層有五個基礎選題，不是完整的競賽課程。',
    '模擬卷全部是原創，沒有複製正式試卷，也不代表任何主辦機構的成績或排名。',
    '難度還沒有用真實孩子的數據校準。',
    '這不是全科能力評級。',
    '它也不是全科或比賽的能力評級。',
    '策略卡不等於比賽能力或認證。',
    '簡化的港幣教具，不是真鈔圖樣。',
    '這兩款是數學操作練習，不是完整的遊戲。',
    '原有的英文小遊戲沒有改動。',
    '答句由數值和單位組成，不會用 AI 批改自由文字。',
    '沒有紀錄不代表已掌握。',
    '這只是這個版本的條件，不代表已經全面掌握這個策略。',
    '這是本機試用版，不是雲端帳戶。',
    '這個家長頁只在這部裝置上，不是安全的鎖，不能防止被繞過。',
    '這個頁面設定數學的時間上限。家庭備份與跨科安排頁另有每日總時間上限和合併的週報。',
    '這是探索教具，不是額外的題目。',
    '教具以程式圖形和數值為準；角色海報不是題目或標準答案。',
    '是程式內的同學角色，不是真人對手；不改變遊戲難度。',
    # --- second sweep over the rendered pages: footers, parent report, settings, companions ---
    '本機試用帳戶，不是雲端服務。',
    '橙色字母只是今課的重點，不代表音節或詞根。',
    '（這不是瀏覽器可用的儲存空間）',
    '接字塊、補字和自己串字會分開記錄，不會影響正式的默書成績。訪客不會儲存紀錄。',
    '串字題仍會顯示中文意思。',
    '聽完、跟讀自報和小測會分開記錄，不會改動正式默書的能力紀錄。',
    '每日金幣有上限，完整小測和其他學習一起計。',
    '較早的紀錄沒有記下孩子有沒有看過提示，所以不在上面分類。',
    '訪客紀錄只留在這次打開的頁面。登入後的紀錄存在這部裝置，不會上載到雲端。',
    '會先播放已存的英式音檔。沒有音檔時，才用裝置的英式聲音。沒有網絡時只用裝置內的英式聲音。播不到的題目可以跳過，不計錯。請到「離線教材」準備音檔。',
    '只改角色顯示，不改教材、金幣、生命或學習紀錄。',
    '設定會分開儲存在每個帳戶和每位孩子名下。家庭完整備份包含角色設定，舊的英文單科備份不包含。六位角色的圖片已內置在程式裏。',
    '已加入這次新畫的六位角色：肖像和五個表情。表情是從原海報裁出來的小圖。沒有單獨的側面、背面或逐格動作圖。',
    '不要讓孩子用測試版。',
    '單次拼字家族少於三個字，沒有金幣。',
    # --- third sweep: collapsed sections (read with textContent) and the maths side ---
    '這些紀錄只存在這個瀏覽器，不會從其他瀏覽器自動帶過來。找不到舊版 V33 的原檔，所以不會猜測它的存檔格式，也不會轉換。',
    '舊紀錄沒有刪除。新課程不會把舊紀錄裏的「看過教學」，自動當作已掌握。',
    '以下是舊版票券的紀錄。沒用完的票已換回金幣。',
    '只改角色顯示。草稿、提示、答案和金幣都不會變。',
    '數學資料另外存放，避免被英文舊版的檢查程式刪掉。舊的英文單科匯出不包含數學。',
    '預覽裏的分數、生命和收集物，不會記在你的帳戶裏。',
    # --- fourth sweep: the word workshop still carried a keyboard hint
    '可用 Tab 和 Enter，也可以直接輕觸。',
]

REPL = [
    ('（不是完整動畫）', ''),
    # where the voice comes from is not the child's business: no status line about device voice / stored file
    ("let msg=has?'已下載英式音檔':navigator.onLine?'裝置英式讀音 · 尚未存成音檔':bestBritishVoice()?'裝置離線英式讀音 · 未有固定音檔':'未有離線讀音，這題可先跳過';",
     "let msg=has||navigator.onLine||bestBritishVoice()?'':'未有離線讀音，這題可先跳過';"),
    ("let prov=has?'已下載英式音檔':navigator.onLine?'裝置英式讀音 · 尚未存成音檔':bestBritishVoice()?'裝置離線英式讀音 · 未有固定音檔':'';", "let prov='';"),
    # the school-range practice is called 默書練習 everywhere
    ("origin:'自選練習'", "origin:'默書練習'"),
    # buddy lines (host)
    ('先看本課的內容；看過答案後立即串對，會記作練習。', '準備好了，就按「開始這一課」。'),
    ('用已認識的詞和字塊學新詞。不只是按拼音分類。', '用已認識的詞和字塊，學新詞。'),
    ('辨認結果要核對。樓層、頁碼或不確定的字，不會當作已確認的教材。', '辨認結果要核對，再儲存。'),
    ('核對圖片和讀音後再儲存。教材的管理方式不變。', '核對圖片和讀音後再儲存。'),
    ('這是真實玩法預覽，還沒開始，不會扣金幣。看清楚按鍵再選擇。', '先看看怎樣玩。'),
    # buddy lines (characters module)
    ('先看裝置的提示。角色不會判斷這題對不對。', '先看裝置的提示。'),
    ('提示已打開。這次會記作「有提示」。', '提示已打開。這題不算滿星。'),
    ('慢慢想，需要時才按原有提示。', '慢慢想，需要時才按提示。'),
    ('先看原有回饋，再試另一個方法。', '先看回饋，再試另一個方法。'),
    ('先觀察字塊，再跟原有步驟組合。', '先觀察字塊，再一步一步組合。'),
    ('先看清楚數量，再跟原有步驟練習。', '先看清楚數量，再一步一步練習。'),
    ('想想你用了甚麼方法。成績以這一課的結果為準。', '想想你用了甚麼方法。'),
    # hero line, labels, transitional workshop note
    ("else subText='約 5 分鐘'+(words?'。先學 '+words+' 個單字。':'。');",
     "else subText=words?'先學 '+words+' 個字，再考考你。':'先學幾個字，再考考你。';"),
    ("pcBtn('家長教法','note','','quiet')", "pcBtn('家長教學小貼士','note','','quiet')"),
    # item 3: a lesson is 8 words whatever the grade, so the three places that said "the number of words follows the grade" go
    ('。每課詞數會按年級調整。`', '。`'),
    ('幼稚園高班可選「小一」。每課詞數會按年級調整，之後可在家長區修改。', '幼稚園高班可選「小一」。之後可在家長區修改。'),
    ('每課詞數會按年級調整。已經開始的小課不會改變。', ''),
    # the buddy only points at the result card that is already on screen
    ('這一組完成了。成績和金幣，請看下面。', '這一組完成了。'),
    ('<h2>原本的練習仍然保留</h2><p>這個工房是新的學習路線。學校範圍、80 個拼字與生活單元、圖片和遊戲，都不會刪除。</p>', ''),
]

CSS = """/* q60: a notice whose text was removed must not leave an empty box behind */
p:empty:not([role]):not([aria-live]),.small:empty:not([role]):not([aria-live]),.l30-subtle:empty,.audio-provenance:empty,.forest-note:empty,.wq32-subtle:empty,.wq32-setting-status:empty,.notice:empty:not([role]):not([aria-live]),.l30-note:empty,.pc-audio-status:empty:not([role]):not([aria-live]),.pc-follow-note:empty,.wq29-caption:empty,.l31-help:empty,.muted:empty:not([role]):not([aria-live]){display:none}
"""


def apply(s, ctx):
    once = ctx.once
    dropped = {}
    for sent in DROPS:
        n = s.count(sent)
        if n < 1:
            raise ValueError('sentence to drop not found: ' + sent[:40])
        dropped[sent] = n
        s = s.replace(sent, '')
    for old, new in REPL:
        n = s.count(old)
        if n < 1:
            raise ValueError('text to replace not found: ' + old[:40])
        s = s.replace(old, new)
    s = once(s, '</head>', '<style id="wq36-q60-css">\n' + CSS + '</style>\n</head>')
    ctx.evidence['droppedSentences'] = dropped
    return s
