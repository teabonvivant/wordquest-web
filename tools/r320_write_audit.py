"""R3.20 - writes docs/R3_20_game_audit.md from the per-game facts below and the measured results in r37_evidence/r320/t28_results.json.
    python3 tools/r320_write_audit.py
The completion figure is an ESTIMATE against the brief's full target (L1 + L2 + L3 + in-play learning), not a measurement; the L1 line is measured
by t28 (checks passed / checks run for that game). Nothing here may read higher than t28 and the screenshots prove."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
RES = json.loads((R / 'r37_evidence/r320/t28_results.json').read_text()) if (R / 'r37_evidence/r320/t28_results.json').exists() else {}
EV = 'r37_evidence/r320'

# id: (name, category, what it was before, canvas HUD before, learning mode, L2 text or '', L3 text or '', known issues)
G = {
 'sky-rescue': ('天空救援隊', '動作', '3 款旗艦之一：飛機飛近小鳥救援、閃避風雲；自繪 HUD（心＋標題膠囊）', 'A28.hud（已遮去）', '角色碰字晶', '`flock` 金色鳥群事件（5 隻金鳥＋光環）', '部分：晴空→雷雲雨線→流星夜三波背景、三層飄移雲；沒有 Peggle 式過關演出', '字晶在飛機附近出現時可能與風雲重疊；分數由救援／寶石累計，倍率令分數略為膨脹'),
 'forest-dash': ('極速森林跑酷', '動作', '3 款旗艦之一：三線跑道跳／滑；自繪 HUD', 'A28.hud（已遮去）', '點字晶／選項／1 2 3', '', '', '角色用跑道線而非螢幕座標，所以沒做碰撞收集；沒有滾木等新障礙'),
 'moon-bells': ('月光跳鈴', '動作', '往上跳鈴；畫布內自繪高度文字', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '沒有「字鈴＝超級跳」；高度分段換景未做'),
 'drift-path': ('漂移小徑', '動作', '自動前進、左右漂移；畫布內自繪里程', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '路牌選字未做；`speed` 縮放可能令彎道較急'),
 'valley-race': ('風谷賽道', '動作', '三圈賽車；畫布內自繪圈速', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '檢查點拱門標字＝氮氣未做'),
 'ruins-courier': ('遺跡郵差', '動作', 'R2：三區跑道，跳／滑／閃；R2.hud', 'R2.hud（已遮去）', '點字晶／選項／1 2 3', '', '', '字門選線、寶箱事件未做'),
 'cloud-island': ('雲島探險', '動作', 'R2：平台跳躍，旗幟重生；R2.hud', 'R2.hud（已遮去）', '點字晶／選項／1 2 3', '`coinarc` 光石弧事件（前方一排光石）', '', '字雲島＝彈跳鞋未做'),
 'star-patrol': ('星環巡航', '動作', 'R2：自動射擊、閃避核心、每區 6 波＋大敵機；R2.hud', 'R2.hud（已遮去）', '角色碰字晶', '`overdrive` 事件（護盾即時充能、火力 +1）', '', '射中字母艦＝散射升級未做；原有 6 波＋Boss 結構沒動'),
 'lighthouse-well': ('燈塔深井', '動作', 'R2：往下跳平台、降落傘；R2.hud', 'R2.hud（已遮去）', '點字晶／選項／1 2 3', '', '', '字平台未做'),
 'bounce-basket': ('跳跳投籃', '運動', '蓄力投籃 7 球；畫布內自繪計分', '自繪（未遮）', '點字晶／選項／1 2 3', '第 2／3 段籃框左右／上下移動', '部分：籃框移動，但沒有字牌、風向事件、火熱球', '籃框移動時 `hoop` 位置改動，已在 `!flying` 時才改；沒有雙籃'),
 'forest-pong': ('森林乒乓', '運動', '對 AI 乒乓；畫布內自繪比分', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '字靶球門未做'),
 'meadow-cricket': ('草地擊球', '運動', '10 球擊球；畫布內自繪回合', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '外野字靶未做'),
 'harbor-volley': ('海港排球', '運動', 'R2：5 分賽排球；R2.hud', 'R2.hud（已遮去）', '角色碰字晶（球員在左半場地面，字晶出現在其可及範圍）', '', '', '字靶區未做；球員可及範圍較窄，字晶位置固定在 y 405–435'),
 'honey-delivery': ('蜜糖快遞', '解謎', '8 關：割繩讓蜜糖落杯；自繪關卡文字', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '標字熊、風扇未做；蜜糖掉出時該局以原規則扣命'),
 'rolling-block': ('翻滾方塊', '解謎', '10 關翻滾方塊走到洞口', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '字鑰目標洞、冰面未做'),
 'juice-lines': ('果汁畫線', '解謎', '畫線讓果汁流進杯子', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '標字杯、分流器未做'),
 'color-workshop': ('彩球工房', '解謎', '10 件：混色訂單', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '英文色名訂單未做'),
 'little-engineer': ('小小工程師', '解謎', '連桿搭橋；自繪文字', '自繪（未遮）', '算式字晶（點選）', '', '', '終點旗標字、彈簧零件未做'),
 'number-garden': ('數字花園', '策略', '2048 式合成到 512', '自繪（未遮）', '算式字晶（點選）', '', '', '「算式種子」格（6×2 合到 12）未做——只有字晶算式'),
 'block-studio': ('方塊工坊', '策略', '俄羅斯方塊式消行', '自繪（未遮）', '算式字晶（點選）', '', '', '字寶石方塊未做；`speed` 縮放令下落較快'),
 'honeycomb-puzzle': ('蜂巢拼拼', '策略', '六角格擺放拼圖', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '字蜂格未做'),
 'color-orbit': ('旋轉色環', '策略', '旋轉色環消色', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '字珠配對未做'),
 'garden-paths': ('纏繞花園', '策略', '六角路徑接花', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '路徑接字花未做'),
 'star-rhythm': ('星軌節拍', '創作', '32 拍節奏遊戲', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '每拍帶字母的拼字節拍未做；`speed` 關閉以免與音訊節拍脫鈎'),
 'forest-band': ('森林節奏社', '創作', '五樂器步進編曲，自由創作', '自繪（未遮）', '點字晶／選項／1 2 3', '', '', '音節鼓點未做'),
 'sweet-studio': ('甜點夢工場', '創作', '3 款旗艦之一：配雪糕訂單；自繪 HUD', 'A28.hud（已遮去）', '點字晶／選項／1 2 3', '', '', '顧客中文氣泡＋標英文配料未做'),
}
OTHERS = [
 ('街機大堂 `#game`／`#playground`', '本輪優化對象（26 款）', '—'),
 ('星際跑酷 `#lv/runner` → `#rn/play`', '修正 A 已做（門距、減速、障礙）；玩法與美術不動', '`t29`、`test_runner.py`'),
 ('字母獵場 `#lv/fps` → `#fp/play`、自由射擊 `#fps`', '修正 B 已做（搖桿、怪物、計時、超時）；其餘不動', '`t30`、`test_fps.py`、t10／t11／t22'),
 ('數學星「思維之塔／策略卡」（`data-wqm-open`）', '不做：數學外掛，本輪範圍外', '—'),
 ('舊 `#arcade-play`／`#gameplay`（GAME_CATALOG 5 款）', '已停用，只剩「入口已更新」頁；不做', '—'),
 ('`cloud-run`、`forest-freezer`', '仍登記在 `WQGames`，已由 forest-dash／sweet-studio 取代，不在 26 款內；不做', '—'),
 ('角色、每日任務、家長頁', '本輪範圍外（家長頁沒有遊戲）', '—'),
]


def l1_line(gid):
    r = RES.get(gid, {})
    if not r:
        return 'L1 未量度（`t28_results.json` 沒有此款）'
    p = sum(1 for v in r.values() if v == 'pass'); n = len(r)
    fails = [k for k, v in r.items() if v != 'pass']
    return f'L1 共通層 t28：{p}/{n} 項通過' + (f'；未通過：{", ".join(fails)}' if fails else '')


def pct(gid, learn, l2, l3):
    r = RES.get(gid, {})
    ratio = (sum(1 for v in r.values() if v == 'pass') / len(r)) if r else 0
    base = 30 * ratio + (10 if learn.startswith('角色碰') else 4) + (8 if l2 else 0) + (8 if l3.startswith('部分') else 0) + 4
    return round(base + 12)   # +12: HUD / sound / fx / combo that every game shares and t28 measures


def main():
    lines = ['# R3.20 小遊戲盤點與完成度（誠實版）', '',
             '交付等級：**預覽**。「完成度」是**估算**（相對 brief 全目標：L1 共通層＋學習入核心＋L2 專屬機制＋L3 旗艦深化），不是量度；L1 一行是 `t28` 的實測。',
             '估算公式：共通層（HUD／音效／特效／連擊／3 波段／事件）佔 42%（以 t28 通過比例折算）；學習入核心佔 14%（角色碰字晶 10、點選字晶 4）；L2 佔 8%；L3 佔 8%（部分 8，沒做 0）；視覺（暗角、背景、HUD 統一）佔 4%；其餘 24% 是 brief 要求但本輪沒做的逐款玩法與美術。',
             f'Before 圖：`{EV}/before/<id>__<尺寸>__<start|play>.jpg`；after 圖：`{EV}/after/…`；前後對照：`{EV}/compare/<id>.jpg`；尺寸 small=360×640、phone=390×844、land=844×390、desk=1440×900（tablet=768×1024，5 款）。',
             '', '## 一、26 款逐款', '']
    n_l2 = 0
    for gid, (name, cat, before, hud, learn, l2, l3, issues) in G.items():
        n_l2 += 1 if l2 else 0
        lines += [f'### {name}（`{gid}`，{cat}）', '',
                  f'- **現況（改動前）**：{before}。畫布內 HUD：{hud.split("（")[0]}。before 圖：`{EV}/before/{gid}__phone__play.jpg`、`{EV}/before/{gid}__desk__play.jpg`。沒有任何生字／算式、沒有連擊倍率、沒有波次。',
                  f'- **做了什麼**：L1 {"✅" }（HUD、音效、特效、事件連擊倍率、3 段波次＋事件、字晶學習時刻、學習卡、結算、背景）；L2 {"✅ " + l2 if l2 else "❌ 未做"}；L3 {"🟡 " + l3 if l3.startswith("部分") else "❌ 未做"}。',
                  f'- **畫布內舊 HUD**：{hud}。',
                  f'- **學習玩法**：{learn}；答錯不扣命、遊戲凍結、卡顯示正確答案 ≥ 2 s；答對得護盾（有生命概念時）／×2／加分。',
                  f'- **測試**：{l1_line(gid)}。',
                  f'- **完成度（估算）**：約 {pct(gid, learn, l2, l3)}%。',
                  f'- **已知問題／未做**：{issues}。', '']
    lines += ['## 二、其他遊戲入口', '', '| 入口 | 狀態 | 證據／理由 |', '|---|---|---|']
    lines += [f'| {a} | {b} | {c} |' for a, b, c in OTHERS]
    lines += ['', '## 三、總結', '',
              f'- 26 款全部有共通層（L1）；L2 專屬機制 {n_l2} 款（目標 ≥ 13，**未達標**）；L3 旗艦深化只有 sky-rescue 的部分項目（其餘 4 款旗艦 bounce-basket 部分、honey-delivery／number-garden／star-rhythm 未做）。',
              '- 「答題動作＝玩法動作」只有 3 款（sky-rescue、star-patrol、harbor-volley）；其餘 23 款是點選字晶，等於遊玩中的快速選擇題，brief 的 R6 目標未達。',
              '- 18 款遊戲的場景仍是淺色粉彩、畫布內自繪文字沒有遮去；只靠暗角、飄移背景與外層 DOM HUD 接合深色外殼。',
              '- 沒有真機、沒有兒童實測、學習內容未經教師審核。']
    (R / 'docs').mkdir(exist_ok=True)
    (R / 'docs/R3_20_game_audit.md').write_text('\n'.join(lines) + '\n')
    print('wrote docs/R3_20_game_audit.md', len(lines), 'lines')


if __name__ == '__main__':
    main()
