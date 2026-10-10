# -*- coding: utf-8 -*-
import json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import recs

D = json.loads((HERE / 'audit.json').read_text())
RK = json.loads((HERE / 'ranked.json').read_text())
PG = {p['id']: p for p in D['pages']}
VP = ['phone', 'tabP', 'tabL', 'desk']
VPL = {'phone': '手機 390×844', 'tabP': '平板直 820×1180', 'tabL': '平板橫 1180×820', 'desk': '桌面 1440×900'}


def need(p, v, dialog=False):
    d = p['vp'].get(v)
    if not d:
        return None
    if dialog:
        od = d.get('open_dialogs') or []
        if od:
            sc = od[0].get('scroller')
            return sc['over'] if sc else 0
    return d['need_px']


def fmt(n):
    return '—' if n is None else ('0' if n <= 8 else f'{n:,}')


LOCKED = {'family-lesson'}


rows = []
for r in RK:
    p = PG[r['id']]
    dlg = r['id'] in ('game-intro', 'game-ach')
    nd = [need(p, v, dlg) for v in VP]
    ph = p['vp']['phone']
    desc = max(p['vp'][v]['text']['desc'] for v in VP)
    if dlg:
        od = ph.get('open_dialogs') or []
        desc = od[0]['units'] if od else desc
    nav = ph['nav_px'] > 0 and ph.get('bar_px', 0) > 0
    ic_t = ph['icons']['total'] - (6 if nav else 0)
    ic_d = ph['icons']['decor'] - (6 if nav else 0)
    if r['id'] == 'game-ach': ic_t, ic_d = 14, 14
    if r['id'] == 'game-intro': ic_t, ic_d = 3, 1
    rows.append(dict(r, nd=nd, desc_show=desc, ic_t=max(ic_t, 0), ic_d=max(ic_d, 0)))

# ------------------------------------------------------------ aggregate numbers
P = [p for p in D['pages'] if p['id'] != 'g-register']
N = len(P)
cnt = {}
for v in VP:
    cnt[v] = (sum(1 for p in P if (need(p, v, p['id'] in ('game-intro', 'game-ach')) or 0) > 8),
              sum(1 for p in P if (need(p, v, p['id'] in ('game-intro', 'game-ach')) or 0) > p['vp'][v]['vh'] * 0.8))
anyscroll = sum(1 for p in P if any((need(p, v, p['id'] in ('game-intro', 'game-ach')) or 0) > 8 for v in VP))
top_desc = sorted(rows, key=lambda r: -r['desc_show'])
seen = set(); top10 = []
for r in top_desc:
    key = r['name'].split('（')[0]
    base = r['id'].replace('f-', '').replace('g-', '')
    if base in seen or (base in ('settings', 'report', 'login')): pass
    top10.append(r)
# dedupe obvious twins
twins = {'f-settings': 'settings', 'f-report-empty': 'report', 'g-login': 'f-login-loggedin', 'game-intro': 'game-lobby', 'game-ach': 'game-lobby'}
top10 = [r for r in top_desc if r['id'] not in twins and r['id'] != 'learning-plan'][:10]  # learning-plan 415 字大部分是 80 課清單，不是說明


def sev_icon(s):
    return {'嚴重': '🔴 嚴重', '偏高': '🟠 偏高', '中': '🟡 中', '輕': '🟢 輕'}[s]


L = []
A = L.append
A('# 學霸星球 UI 精簡審查（頁面、捲動、說明文字、icon）')
A('')
A('> 審查對象：`r312/eval_app.html`（凍結副本）。只審查，不改產品。量度：Playwright＋Chromium，四個視口，Admin 測試帳戶（`?mode=admin-test`）為主，另以訪客／新家庭帳戶補量登入、家長密碼閘、空狀態。')
A('> 原始數據 `audit.json`（每頁每尺寸的全部指標）、截圖 `shots/<頁面id>__<phone|tabP|tabL|desk>.jpg`，量度腳本 `measure.js`、`run_audit.py`、`run_guest.py`。')
A('')
A('## 0. 先講結論（給老闆）')
A('')
A(f'1. **新星球殼（星系、各星球主頁、闖關地圖、闖關答題）基本達標**：全部在四個尺寸一屏放得下、文字極少。老闆說的「要上下拉」「廢話多」「無用 icon」**幾乎全部來自舊課堂／家長頁被包進星球外殼**，不是新頁。')
A(f'2. 共量 **{N} 個頁面／狀態**，其中 **{anyscroll} 個**在至少一個尺寸需要捲動；手機 {cnt["phone"][0]} 個、平板直 {cnt["tabP"][0]} 個、平板橫 {cnt["tabL"][0]} 個、桌面 {cnt["desk"][0]} 個（其中需捲超過 0.8 屏：{cnt["phone"][1]}／{cnt["tabP"][1]}／{cnt["tabL"][1]}／{cnt["desk"][1]}）。')
A('3. **桌面版也要捲**（老闆最先投訴的）：舊頁在桌面只用單欄、每頁還要先過三層頭部。例：拼字教室桌面要捲 7,929px（≈ 9 屏）、遊戲街機 1,906px、設定 2,137px、報告 2,860px。')
A('4. 所有舊頁共用一個「包裝」：舊站頂欄 57px＋星球頂欄 60px＋底部導覽 63px＝**180px（手機 21%、桌面 20%）**被框架吃掉，頁內再有舊分頁列、老師角色卡、返回按鈕。')
A('5. 另發現 **4 個實際缺陷**（不是「囉嗦」而是壞了）：①拼字家族舊課頁鎖死不能捲；②家長密碼閘標題與說明看不見；③默書報告頁標題深藍字落深色底；④單元學習頁浮動按鈕蓋住中文意思。')
A('')
A('## 1. 量度方法與限制')
A('')
A('- 視口：手機 390×844（觸控）、平板直 820×1180（觸控）、平板橫 1180×820（觸控）、桌面 1440×900。')
A('- 「需捲動 px」＝要把全部內容帶到底部導覽之上，需要捲動的距離：取 ①文件、②內捲容器（`.r37-legbody`、對話框）③內容超出視口三者最大值。≤8px 視為不用捲。舊頁的內容區是內捲容器（body 鎖住 `overflow:hidden`），所以「頁面」本身不會動，只有內容區在動。')
A('- 「說明字數」＝整頁（含需捲動部分）可見的說明文字：中文字＋英文詞；已排除題目內容、生字本身、≤8 字的按鈕／標籤／標題、底部導覽。「icon 數」為 emoji＋SVG，已扣除底部導覽 6 個；「裝飾」＝icon 旁已有文字標籤、或在標題／段落內的 icon。')
A('- 截圖是 scroll=0 的視口截圖（首屏）；沒有整頁長圖。')
A('- **限制**：①Chromium 模擬，不是真機（真 iPhone Safari 可視高度約少 90–110px，需捲更多）；②26 款街機只審了大廳與玩法預覽彈窗，沒有逐款進入遊戲；字母獵場／星際跑酷只量了開場與首幀，答對／答錯學習卡（R3.9）見 `t11`；③相片 OCR 沒有真相片；④沒有量虛擬鍵盤彈出狀態；⑤「說明字數」以程序啟發式分類，個別頁面（詞庫、課堂）的詞條內容以人手核對。')
A('')
A('## 2. 頁面總表（按「用戶最常用 × 嚴重度」排序）')
A('')
A('排序分＝嚴重度分 × (13 − 使用頻率排名)。嚴重度分：需捲屏數（≥3 屏 +4／≥1 屏 +3／≥0.3 屏 +2／有捲 +1）＋說明字數（≥150 +3／≥60 +2／≥25 +1）＋<44px 控件 ≥8 個 +1＋裝飾 icon ≥10 +1＋人手標記的缺陷（對比、遮擋、鎖死）。🔴≥7、🟠 4–6、🟡 2–3、🟢 ≤1。')
A('')
A('| # | 頁面（id） | 分組 | 手機／平板直／平板橫／桌面 需捲 px | 說明字數 | icon（裝飾） | 嚴重度 |')
A('|---|---|---|---|---|---|---|')
for i, r in enumerate(rows, 1):
    nds_txt = ' ／ '.join(fmt(x) for x in r['nd']) + ('（頁面鎖死，捲不動）' if r['id'] in LOCKED else '')
    A(f"| {i} | {r['name']}（`{r['id']}`） | {r['grp']} | {nds_txt} | {r['desc_show']} | {r['ic_t']}（{r['ic_d']}） | {sev_icon(r['sev'])} |")
A('')
A('註：`game-intro`、`game-ach` 的捲動 px 為彈窗內的捲動距離。`play-*`、`fps-play` 為全屏遊玩畫面，沒有頂欄與導覽。同一頁在訪客／家庭帳戶重複出現者（`g-*`、`f-*`）只列帳戶狀態差異。')
A('')
A('## 3. 頁面清單（可到達性）')
A('')
A('從 `R37_ROUTE`（新殼路由）＋舊 `render()` 的 route map＋星球導覽按鈕兩邊核對，共：')
A('')
A('| 類別 | 路由／入口 |')
A('|---|---|')
A('| 星球殼 | `#kid`、`#p/english`、`#p/math`、`#p/olympiad`、`#p/games`、`#p/dictation`、`#p/parent`（4 分頁：難度／進度／孩子／設定備份）、`#p/chars` |')
A('| 闖關 | `#lv/english`、`#lv/math`、`#lv/olympiad`、`#lv/runner`、`#lv/fps`、`#lp/play`（學詞→答題→回饋→結果） |')
A('| 遊戲 | `#fps`、`#fp/play`、`#rn/play`、`#game`（大廳）＋玩法預覽彈窗＋🏅成就彈窗、`#game-settings`；`#playground`／`#arcade-play`／`#gameplay` 只是轉址提示頁 |')
A('| 默書（舊頁入殼） | `#learn`（今日默書／練習）、`#ranges`、`#range-new`（3 步）、`#report`、`#practice` |')
A('| 英文舊頁（入殼） | `#classroom`、`#unit?id=`、`#library`、`#learning`、`#assembly`、`#assembly-unit?id=`、`#assembly-learn`、`#companions` |')
A('| 英文舊頁（未入殼） | `#family-lesson`、`#phonics-lesson`（用舊樣式，無星球頂欄） |')
A('| 家長舊頁 | `#parent`、`#children`（＋新增孩子表單）、`#settings`、`#learning-report`、`#learning-plan`、`#learning-help`、`#assembly-report`、`#assembly-plan`、`#legacy-family`、`#legacy-phonics`、`#offline`、`#credits` |')
A('| 帳戶 | `#login`（登入／建立同頁）、家長密碼閘、`#admin`（測試中心） |')
A('| 對話框（Shadow DOM 全屏） | 數學島（首頁／群島／教具工房／家長與進度）、思維之塔（首頁／策略卡／單課）；街機玩法預覽、成就；R3.9 答題學習卡（在遊戲內） |')
A('')
A('已知「不入殼」或「重複入口」：`#practice`（與星球頁快速測驗重複）、`#parent`（與 `#p/parent` 重複）、`#companions`（角色頁已有）、`#learning`（進行中課堂的另一個入口）。這些是最好的刪頁候選。')
A('')
A('## 4. 共通問題（跨頁）')
A('')
A('| # | 問題 | 影響 | 證據 |')
A('|---|---|---|---|')
A('| C1 | **三層框架**：舊站頂欄（★帳戶名／孩子名／聲音／家長，57px）＋星球頂欄（← 星球名 🪙，60–85px）＋底部導覽（63px） | 所有舊頁；手機 21%、平板橫 22% 高度先被吃掉 | `head_px` 57、`bar_px` 60、`nav_px` 63；孩子名顯示兩次（「Admin…」晶片＋「Admin 測試學生」）；「家長」在頂欄與導覽各一個；「聲音：開」常駐 |')
A('| C2 | **舊頁包裝＝長單欄內捲**：內容區 `.r37-legbody` 固定在頂欄與導覽之間，內容照舊單欄堆疊 | 桌面也要捲（7,929px） | classroom 手機 12,467／桌面 7,929；assembly 5,400；library 3,234；report 3,278 |')
A('| C3 | **老師角色卡＋「聽廣東話說明」**每頁重複，說明另有「裝置沒有廣東話聲音…」 | 約 15 頁 | classroom、unit、assembly*、ranges、offline、practice、companions… |')
A('| C4 | **舊分頁列**（離線教材／總覽／默書範圍／孩子／學習報告／設定備份）出現在不相干頁面，連「遊戲設定」也有；高 38px | 約 12 頁 | children、ranges、range-new、report、settings、game-settings |')
A('| C5 | **返回多重**：頂欄「←」、星球名連結、頁內「返回孩子頁／返回遊戲街機／返回工房／返回拼字教室」，另有隱藏於頂欄之下的「返回一般網站」連結 | 每頁 2–3 個 | `back_controls` 欄 |')
A('| C6 | **說明文字集中在家長與設定類**：settings 484–644 字、wqm-cards 439、assembly 428、learning-plan 415、wqm-parent 415、game-settings 273 | 家長常用頁 | 見第 2 節 |')
A('| C7 | **對比度缺陷**：家長密碼閘標題與說明（白字落米白卡）、報告標題（深藍字落深色底）、默書進度「2/10 暫停」（深灰落深藍） | 3 頁 | 截圖 `f-parent-gate`、`report`、`dict-daily-*` |')
A('| C8 | **視覺語言不一**：登入頁、離線教材、拼字家族課、發音教學、測試中心用淺米色舊樣式，其餘深色星空；登入頁底部導覽蓋住表單 | 5 頁 | 截圖 `g-login`、`offline`、`family-lesson` |')
A('| C9 | **觸控目標與字級**：舊分頁 38px、遊戲設定 37 個控件 <44px、闖關關卡名 10px、角色頁價錢鈕 41px | 手機 19 頁有 ≥4 個 | `tiny_count`、`min_font` |')
A('| C10 | **同一資料多次顯示**：金幣（頂欄＋大卡＋價錢）、孩子名、星球名（頂欄＋標題）、「0/60」進度 | 星球頁／遊戲大廳 | `repeats` |')
A('| C11 | **沒有「內容為王」的版面斷點**：平板直／橫、桌面只是把手機單欄放大，沒有雙欄／側欄／網格 | 全部舊頁 | tabP／tabL／desk 截圖 |')
A('')
A('## 5. 逐頁建議（按上表順序）')
A('')
A('每頁：**現況**（數據）、**建議**（刪／改 icon＋2–4 字標籤／收進 ⓘ 或 ⋯／版面）。只建議，不改。')
A('')
for i, r in enumerate(rows, 1):
    p = PG[r['id']]
    reach, now, rec = recs.RECS[r['id']]
    ph = p['vp']['phone']
    A(f"### {i}. {r['name']}（`{r['id']}`）{sev_icon(r['sev'])}")
    A('')
    A(f"- **到達**：{reach}")
    nds = ' ／ '.join(f"{VPL[v].split()[0]} {fmt(n)}" for v, n in zip(VP, r['nd']))
    A(f"- **需捲動 px**：{nds}；頭部（舊頂欄＋星球頂欄＋導覽）= {ph['head_px']}+{ph.get('bar_px', 0)}+{ph['nav_px']} px")
    A(f"- **說明字數**：{r['desc_show']}（整頁）；icon {r['ic_t']}（裝飾 {r['ic_d']}）；<44px 控件 {r['tiny']}；返回類控件 {len(ph['back_controls'])}：{'、'.join(ph['back_controls']) or '無'}")
    dt = ph.get('desc_top') or []
    if r['id'] in ('game-intro', 'game-ach'):
        od = ph.get('open_dialogs') or []
        dt = [{'u': od[0]['units'], 'txt': od[0]['txt']}] if od else []
    if dt:
        A('- **最長說明原文**：')
        for t in dt[:5]:
            txt = t['txt'].replace('\n', ' ')
            A(f"  - （{t['u']} 字）{txt[:110]}{'…' if len(txt) > 110 else ''}")
    A(f"- **現況**：{now}")
    A(f"- **建議**：{rec}")
    A('')

A('## 6. 設計規則草案（可直接寫進開發規範）')
A('')
A('| # | 規則 | 量化標準 | 對應現況 |')
A('|---|---|---|---|')
A('| R1 | **首屏全顯**：主要頁面在 390×844、820×1180、1180×820、1440×900 四個視口不需捲動；超過的清單用「固定篩選／操作列＋內容區內捲＋分頁／載入更多」，整頁不得超過 1.5 屏 | 需捲 ≤ 8px（主頁面）；清單頁 ≤ 1.5 屏 | 42／88 頁在手機要捲 |')
A('| R2 | **一條頂欄**：只留 ← 、頁名、🪙（可加頭像選單 ⋯）；聲音／孩子切換／家長／登出收進頭像選單；刪舊站頂欄 | 頂欄 ≤ 48px；框架（頂＋底）≤ 15% 視口高 | 現為 180px（21%） |')
A('| R3 | **說明字數上限**：每頁正文說明 ≤ 20 字、≤ 1 句；其餘用 ⓘ（點開底部抽屜，≤ 60 字）；標題 ≤ 8 字；按鈕 2–4 字 | 說明字數 ≤ 20；單段 ≤ 25 | 家長／設定類 250–640 字 |')
A('| R4 | **icon 規則**：功能 icon 一律「icon＋2–4 字」；純裝飾 icon 刪；同一頁同一圖示不重複；標題內不放 emoji | 裝飾 icon ≤ 3／頁 | 舊頁每頁 9–13 個 |')
A('| R5 | **一個返回**：只在左上角 ←；刪頁內「返回…」按鈕、星球名連結、隱藏的「返回一般網站」 | 每頁返回類控件 = 1 | 現為 2–3 個 |')
A('| R6 | **去老師角色卡**：角色只留小頭像＋≤12 字氣泡，或只在首次出現；「聽廣東話說明」改為 🔊 圖示按鈕 | 不佔整行 | 約 15 頁 |')
A('| R7 | **響應式斷點**：≤480px 單欄（主操作固定底欄）、481–899px 兩欄、≥900px 側欄／三欄；列表網格 3／5／8 欄隨寬度變化；使用 `100dvh`＋`env(safe-area-inset-*)` | 平板與桌面不得只放大手機版 | C11 |')
A('| R8 | **家長頁＝設定表單**：分頁（難度／進度／孩子／設定），每項一行（標籤＋控件＋ⓘ）；危險操作（清除資料、還原）收進「進階」並二次確認 | 設定頁 ≤ 1.5 屏 | settings 484–644 字 |')
A('| R9 | **觸控與字級**：目標 ≥ 44×44px；正文 ≥ 14px、標籤 ≥ 12px；對比 ≥ 4.5:1 | <44px 控件 = 0 | 遊戲設定 37 個 |')
A('| R10 | **一種視覺語言**：登入、離線教材、舊課堂頁全部改用星球外殼；禁止深色字落深色底、淺色字落淺卡 | — | C7、C8 |')
A('| R11 | **刪頁優先於改頁**：重複或已被取代的頁面直接轉址（`#practice`→`#p/english`、`#parent`→`#p/parent`、`#companions`、`#learning-help`、`#legacy-*`、`#phonics-lesson`、`#family-lesson`、`#playground` 等） | 路由數 −10 | 第 3 節 |')
A('| R12 | **同一資料只顯示一次**（金幣、孩子名、星球名、進度） | — | C10 |')
A('')
A('## 7. 建議的改版次序')
A('')
A('1. **先修 4 個缺陷**（家長密碼閘對比、報告標題對比、`#family-lesson` 鎖死、`#unit` 浮動按鈕遮擋）。')
A('2. **改框架（一次改、全頁受益）**：刪舊站頂欄→單一頂欄；去老師卡與舊分頁列；舊頁內容區改成「固定頭＋內捲＋固定底欄」；桌面／平板橫改雙欄。預期：舊頁一次減少約 120px 框架高度。')
A('3. **三個最長頁**：拼字教室（80 課→網格或併入闖關地圖）、遊戲街機（26 遊戲→2/3/5 欄網格＋固定篩選）、默書報告（只顯示 3 個數）。')
A('4. **家長頁**：設定／備份／學習計劃／離線教材改成一頁四分頁表單，說明全進 ⓘ。')
A('5. **刪頁**：`#practice`、`#parent`、`#companions`、`#learning-help`、`#legacy-family`、`#legacy-phonics`、`#phonics-lesson`、`#playground`（轉址）。')
A('')
A('## 8. 附：說明字數最多的 10 頁（整頁，去除孿生頁；`learning-plan` 的 415 字大部分是 80 課清單內容，不計）')
A('')
A('| # | 頁面 | 說明字數 | 手機需捲 px |')
A('|---|---|---|---|')
for i, r in enumerate(top10, 1):
    A(f"| {i} | {r['name']}（`{r['id']}`） | {r['desc_show']} | {fmt(r['nd'][0])} |")
A('')
A('## 9. 附：最嚴重 10 項（缺陷＋影響）')
A('')
SEV10 = [
 ('拼字教室 `#classroom`：手機 12,467px（≈18 屏）、桌面 7,929px；80 張單元卡一次全畫；老師卡＋搜尋三控件佔首屏', '最常用英文入口，最直接是老闆投訴的「要上下拉」'),
 ('舊頁框架 180px（舊頂欄＋星球頂欄＋底部導覽），孩子名重複、家長／聲音重複', '全部舊頁、每次進入都吃掉 21% 高度'),
 ('遊戲街機大廳：手機 2,092px、桌面 1,906px，金幣顯示兩次，每卡 5 行字', '兒童最常用頁面之一，桌面也要拉'),
 ('設定／備份：484–644 字技術說明、手機 2,990px、14 個 <44px', '家長要用的頁面，文字最「廢話」'),
 ('默書報告：手機 3,278px，標題深藍落深色底看不見，12 行舊版紀錄重複', '默書是核心功能，報告是家長最常看'),
 ('家長密碼閘：標題與說明近乎看不見（對比缺陷）', '家長無法理解要輸入甚麼'),
 ('登入／建立帳戶：手機 1,528px、222 字、兩張表單堆疊、導覽蓋住欄位', '第一次使用的人先過此頁'),
 ('詞語組合工房：手機 5,400px、428 字說明、37 段說明', '「沿用以前教學模式」的典型'),
 ('`#family-lesson`：內容 1,523px 但頁面鎖死不能捲動', '實際缺陷，下半部拿不到'),
 ('數學島／策略卡／家長對話框：手機 3,070–5,926px、說明 415–439 字，全屏彈窗另有三層頭部', '數學、奧數星的主要入口'),
]
for i, (a, b) in enumerate(SEV10, 1):
    A(f"{i}. {a} —— {b}")
A('')
(HERE / 'AUDIT.md').write_text('\n'.join(L), encoding='utf-8')
print('AUDIT.md lines', len(L))
print('cnt', cnt, 'any', anyscroll, 'N', N)
print('top10', [(r['id'], r['desc_show']) for r in top10])
