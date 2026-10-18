# R3.20 — 小遊戲全面優化（學霸星球 SmartQuest Planet）

交付等級：**預覽**（Chromium 自動測試＋截圖證明；沒有真機、沒有兒童實測、學習內容未經教師審核）。本文不使用「完成／可上線／商用版」字眼。
逐款狀況、完成度（誠實）及其他遊戲入口見 `docs/R3_20_game_audit.md`；證據在 `r37_evidence/r320/`。

底版仍是 R3.6（`bd28b55`）＋ R3.7 補丁層；`app/index.html` 只由 `python3 tools/build_r37.py` 產生，**不要手改**。新增檔案：

| 檔案 | 內容 |
|---|---|
| `r37_src/s70_arcplus.js` / `.css` | 共用「街機強化核心」`WQArcPlus`（host closure 內，不掛 `window`；測試經 `window.__r37` 取用） |
| `r37_src/s71_arcgames.js` | 26 款逐款配接器（`thr`／`speed`／`pos`／`prog`／`math`）＋ 4 款專屬機制（L2） |
| `r37_src/patches/s70_arcplus.py` | 注入 CSS／JS，並在 R3.6 文字上做 3 個小錨點（見下） |
| `r37_src/runner_game.js`、`fps_game.js` | 修正 A（星際跑酷）、修正 B（字母獵場） |
| `r37_tests/t28…t30`、`arc_lib.py`、`r320_capture.py`、`r320_perf.py` | 新測試與證據腳本 |

## 一、修正 A：星際跑酷（`r37_src/runner_game.js`）

| 項目 | 改動前 | 改動後 |
|---|---|---|
| 生字門排程 | 每道 12–18 s（以 `base` 速度換算；實測約 16 s），首道 9–12 s，Boss 最後 3 道 5.5–7 s，無盡 10–14 s | 以**跑程秒數 × 當時名義速度**排程（速度爬升不再把門距壓短）：一般 5.0–6.5 s，首道 4.5–6.5 s，Boss 最後 3 道 3.5–4.8 s，無盡 5.2–6.6 s（隨距離最多縮 15%） |
| 實測門距（不含學習卡、不含拼字時間；`t29`） | 約 16 s（讀碼推算；`runner_before_measure.py` 另量過） | 平均 **6.6–6.7 s**（最短 5.9 s、最長 7.4 s）；首道 6.5–6.7 s；Boss 最後 3 道 5.1–5.8 s；無盡頭 60 s 6.1–6.8 s |
| 關卡長度 | 門數 `[6, 8, 10]` | 門數 **`[10, 12, 14]`**（Boss 關其中最後 3 道為 Boss 門）；一般關跑程 77–92 s |
| 減速 | 門前固定 640 px 內以 `dt×5` 趨向 0.62（約 2 s 前才開始、轉變很急） | 預警區 = 門的 `wp = 名義速度 × 1.6`（≥ 450 px），實際約 **2.3 s 前**開始（拼字門整段保持）；時間常數 **0.5 s**，最低 **0.60**；判定後約 1.05 s 回到 ≥ 0.95；相鄰兩格 `ts` 變化 ≤ 1.3 %。仍經 `ts` 實作，`curSpeed()` 不變 |
| 障礙 | 門前留空 900 px、門後 700 px | 門前留空 = 預警距離 + 150 px，門後 350 px；每道門後第一個圖案**必出跳／滑障礙**（`gapK` 計數）→ 一般關約 15–29 個跳／滑障礙／60 s，各門間隔 ≥ 60 % 內有至少 1 個 |
| Boss 避讓 | 門前 1100／1700 px、門後 500 px | 門前 `wp+150`／`wp+450` px，門後 350 px |
| `_debug` | — | 新增 `ts`、`gateX`、`runT`、`warnPx`、`effSpeed`、`obsK`、`kSpawned`、`obsXs`、`distNow`；`_debugGateAt(px)` 供慢速牆鐘測試 |

測試：`r37_tests/t29_runner_gate.py`（E1–E5）；`test_runner.py` 13/13 通過（`# R3.20:` 改了門數 `[10,12,11+4]`、`_debugGateAt`、Boss 前 11 道）。

## 二、修正 B：字母獵場（`r37_src/fps_game.js`）

| 項目 | 改動前 | 改動後 |
|---|---|---|
| 搖桿方向 | 第 1488 行 `ky = W − S − jy`，而 `jy = −dy/m`（手指向上 jy > 0）→ **向上拖變後退** | `ky = W − S + jy`（鍵盤 W／↑／S／↓ 部分沒動）。`t30` 以 0、0.7、2.5 rad 三個朝向，觸控＋鍵盤實測前後左右 |
| 怪物 | 每級 1–4 隻電蟲＋1–3 隻吐口水怪（吐口水會發火球），Boss 期間照刷 | **同時最多 1 隻**電蟲；首隻 22–32 s 後出現，之後每級 40／36／32／28／25 s；**吐口水怪退役**（`_cmd('spitter')` 仍可召喚供測試，但不再自動發射；`fireProj` 只剩 `_cmd('proj')`）；未擊中 12 s 後離場；Boss 期間 0 隻 |
| 怪物接觸 | 扣 1 心 | **不扣心**：本回合計時 −3 s、連擊歸零、擊退；射中怪物 +30 分（原 +50） |
| 回合計時 | `[0,0,30,26,22]`（1–2 級不限時、歸零無後果） | **`[40,34,28,24,20]`**（5 級都限時、逐級遞減）；題目膠囊下計時條加粗（14u 高、≥ 120 px 寬），最後 5 s 轉紅並每秒 `tick`；學習卡、暫停、波次橫幅期間計時暫停 |
| 超時 | 無 | **本回合失敗**：錯題 +1、連擊歸零、扣 1 心、字重新排隊（闖關模式）；學習卡顯示正確英文 ≥ 2 s 並在場上高亮正確泡泡；卡收起後才進下一回合（沒開學習卡時立即進下一回合） |
| `_debug` | — | `timeLeft`、`timeouts`、`bugHits`、`enemyLog`、`projLog`、`shotPts`、`timedOut`、`bugAges`、`joy`；`_debugStep(n,dt)`、`_cmd('face',a)` |

測試：`r37_tests/t30_fps_focus.py`（F1–F5）。`test_fps.py` 的 `test_spitter`、`test_spawn_scaling` 已改寫（加 `# R3.20:`）。

## 三、街機強化核心（`WQArcPlus`，26 款共用）

掛接：載入時把 26 款 `Class.prototype.tick／draw／act／pointer／tool` 包一層（`WQGames` 登記表），每局狀態放 `WeakMap`，**不在遊戲物件加任何自有鍵**（`pgGame` 鍵與 B8 逐款比對）；存檔 schema 沒改，核心狀態不入存檔（「保存並返回」後連擊、波次按遊戲自己的進度重算）。引擎 script 內沒有新增鉤子；唯一碰到底版文字的 3 個錨點（`patches/s70_arcplus.py`）：`r2Fit` 為 HUD／學習條預留高度、`a28RulesTick` 的 `misses` 加「寬免」偏移（B9）。

| 模組 | 行為 |
|---|---|
| HUD（DOM，`.a28-viewport` 內） | 畫布**上方**深色玻璃 HUD：生命（SVG 心＋護盾）、分數、連擊倍率環（×1–×5，×2 雙倍時再乘）、第 N/3 段、進度條；畫布**下方**學習條（下一顆字晶倒數／題目＋3 個 ≥ 56 px 選項＋增益徽章）。旗艦 3＋R2 5 款原有的畫布內 HUD（`A28.hud`／`R2.hud`）在遊玩中不再繪製 |
| 連擊與倍率 | 事件連擊＝單 tick 分數跳升 ≥ `thr` 計一次；失誤（生命減少）歸零；安靜一陣自動歸零（動作／運動 7 s、其餘 14 s）。倍率 ×1／×2（3 連）／×3（6）／×4（10）／×5（15），**真的乘進分數**（多加 `delta×(倍率−1)` 並記在 `bonus`，不重複計算；分數由狀態重算的遊戲每 tick 把 bonus 補回） |
| 導演 | 每局 3 段（進度或時間觸發；動作／運動 24 s／52 s、其餘 42 s／90 s）：橫幅 ≤ 1 s、音效、每段一個隨機事件（雙倍時段／金幣雨／慢動作／護盾／磁石／相似字干擾）；另每 34–55 s 一個事件；動作類遊戲第 2／3 段 dt ×1.12／×1.25（單步上限 1/50 s） |
| 學習時刻（字晶） | 動作／運動首顆 9 s、其餘 16 s，之後約每 26／44 s：HUD 下方顯示中文／🔊／算式，畫布上 3 顆字晶；答對→強化（護盾／×2 九秒／加分）＋小卡 2.4 s 自動收起（0.8 s 後可點）；**答錯不扣命**、遊戲凍結（`tick` 跳過，`pgPlaying` 不變）、卡顯示正確英文／算式 ≥ 2 s 才可關、最多 8 s、2.6 s 再讀一次。題源：`r37GameWords`（學過的字，不足用後備字），數學用 `r37DiffN('math')` 分級的簡單算式；4–5 級英文用拼法相近的干擾字。遵守 `wq37-nolearn=1`。**不寫 `recordAttempt`** |
| 收集方式 | 有螢幕座標的遊戲（sky-rescue、star-patrol、harbor-volley）**用角色碰字晶**；其餘遊戲點畫布上的字晶、按下方選項或按 1／2／3。——這是「補丁層」做法的限制，詳見未完成項 |
| 特效 | 畫布粒子池（高 64／低 24）、浮字、閃白（≤ 0.35、約 0.12 s）、震動（≤ 8 px、約 0.25 s 收；以 canvas 元素位移，所以重設 transform 的美術也有效）、背景三層飄移雲（D.bg／A28.sky／R2.sky 後）、邊緣暗角；`prefers-reduced-motion`：震動、閃白、飄移背景關閉，粒子改 ≤ 6 顆靜態星點 |
| 音效 | 預設參數表經 `pgAudio.tone`（同一 AudioContext）：good／bad（低而柔）／combo(n)（五聲音階上行，封頂 8 級）／power／event／phase／tick／clear／fail；`sfxEnabled=false` 時 0 個節點 |
| 結算 | 在 s35 的 `.arx-res` 後加 `.ap-res`：最高連擊、到達波次、字晶答對 x/y、本局生字 ✓／✗（錯的列出正確拼法／算式）。t09 字串保留 |
| 效能分級 | rAF 間隔平均 > 22 ms（≥ 100 格）→ `low`（粒子上限 24、關背景飄移） |
| `_debug` | `WQArcPlus._debug()`、`_force(kind)`（learn／answer／phase／event／combo／score／tier／clear／burst／lose／shield） |

### 專屬機制（L2，4 款，其餘只有共通層）
- **sky-rescue**：晴空→雷雲（雨線）→流星夜三波背景；`flock` 事件＝一排 5 隻金鳥（金色光環）。
- **cloud-island**：`coinarc` 事件＝前方一排光石弧。
- **star-patrol**：`overdrive` 事件＝護盾即時充能、火力 +1。
- **bounce-basket**：第 2／3 段籃框左右／上下移動。

## 四、B9：s35「生字補給」生命 +1 在 12 款遊戲被覆寫嗎？

**確認有此風險並已修正**：12 款遊戲的 `a28RulesTick` 每格以 `g.health`（8 款）或 `3 − misses`（4 款）重算 `lives`，s35 只加 `r.lives` 會在下一格被蓋掉。修法：s35 呼叫 `WQArcPlus.addLife(pgGame)`（`g.health+1`，或「寬免」偏移 `wq34S(g).forgive`，`a28RulesTick` 兩處計入）。`t28` B9 逐款驗證（12 款）：生命 2→3 在 500 ms 後仍是 3。

## 五、玩法說明（每類一段）
- **動作（9）**：遊戲照舊；3 段波次（背景、速度 ×1.12／×1.25、事件）、連擊倍率、字晶（sky-rescue／star-patrol 用角色碰，其餘點選）。
- **運動（4）**：投籃／乒乓／擊球／排球照舊；字晶用點選；bounce-basket 第 2／3 段籃框移動。
- **解謎（5）**：每約 44 s 出一顆字晶；答對的強化是護盾（有生命概念時）或 ×2。
- **策略（5）**：number-garden／block-studio 的字晶是算式（選答案）；其餘為英文字。
- **創作（3）**：star-rhythm 每顆字晶同樣點選；節拍遊戲不縮放 dt。

## 六、限制與未完成（誠實清單）
- **學習入核心只做到一半**（第 2 輪補強：14 款棋盤／益智／創作類改為 `dockOnly`，題目只在下方學習條作答，字晶不再畫在棋盤上、也不攔截畫布點擊；這解決「遮擋」，但答題動作仍不是玩法動作）：只有 3 款（sky-rescue、star-patrol、harbor-volley）是用「角色碰字晶」；其餘 23 款的答題是點字晶／選項，不是遊戲本身的玩法動作。brief 的 R6「答題動作＝玩法動作」**未達標**（要逐款改引擎碼）。
- **L2 專屬機制只有 4 款**（目標 ≥ 13）；L3 旗艦深化（Peggle 式過關演出、number-garden 算式種子、honey-delivery 標字熊、star-rhythm 拼字節拍）**未做**，只有 sky-rescue 的三波背景＋金鳥群。
- 18 款遊戲的場景點陣／畫布內 HUD 仍是原樣（淺色粉彩），只加了暗角、飄移背景和 DOM HUD；畫布內自繪的分數／生命文字在這 18 款沒有遮去（audit 逐款註明）。
- 沒有真機（iPhone／Android／iPad）、沒有兒童實測；WebKit 只有煙霧測試；學習內容（干擾字、算式）未經教師審核。
- 分數倍率令分數略為膨脹；`TARGETS`（挑戰星門檻）沒調整，星星略易取得（見 audit）。
- `arcade_src/` 不在建置內，只屬歷史來源，沒改。

## 六之二、第 2 輪修正（驗收清單對應）
- 倍率加分不再被 s35 連擊計數當成新一次得分（`WQArcPlus.bonusOf`），t09 的「連擊 ×3」及「連擊最高紀錄」恢復；結算卡手機版不再溢出（結算時 `ap-done`：隱藏 HUD／學習條，視窗高度回復自動）。
- 外層頂列的「N 格生命／N 分」膠囊在遊玩中隱藏（只留 DOM HUD 一套，數值一致）；主鍵（蓄力投籃、剪下一條等）回復金色實底、深色字、不折行；「字晶出現！」改金字＋深色描邊。
- 結算畫面不再出題（`startQ` 在遊戲結束後不開），學習條在結算畫面隱藏。
- 版面：sweet-studio 桌面縮短遊戲區、360×640 縮鍵高；block-studio 鍵寬 ≥ 44。
- 旗艦 5 款加了雙層漂移景深（雲／光斑／蜜瓣／數字／星光條；低效能機只畫一層、減少動態時不畫），這是 L3 的**一小部分**，專屬新機制仍未做。
- t28 測試修正：C3 用實際視窗寬 `w`；miss 類遊戲（forest-pong、bounce-basket、meadow-cricket、star-rhythm）以引擎公式精確扣一失誤；dockOnly 遊戲用學習條作答。t30：F2 間距 `>= 25 - 1e-6`、F3 時鐘容差 1.8–2.4 s（幀邊界）。

## 七、改動的舊斷言（G4）
見各測試檔 `# R3.20:` 註解：`test_runner.py`（門數、`_debugGateAt`、Boss 前 11 道）、`test_fps.py`（`test_spitter`、`test_spawn_scaling`）。其餘待回歸結果補充（`r37_evidence/r320/regression.md`）。

## 八、重建與測試
```
python3 tools/build_r37.py                                   # 產生 app/index.html、app/sw.js（SW 快取 …-3.20）
WQ33_APP=$PWD/app/index.html python3 r37_tests/t28_arcade_r320.py     # 26 款共通層＋版面（結果 r37_evidence/r320/t28_results.json）
python3 r37_tests/t29_runner_gate.py ; python3 r37_tests/t30_fps_focus.py
```

## 九、階段 1：底線修復（一屏版面合約）

交付等級：**預覽**。階段 1 只修底線，沒有新玩法、沒有 L2／L3；全部文字不含「完成／可上線／商用版」。逐款見 `docs/R3_20_game_audit.md`，證據在 `r37_evidence/r320/`（`after/`、`compare/`、`perf.json`、`regression.md`、`sw/`），執行記錄見 `_team_runs/r320-p1/build-log.md`。

**改了什麼**（只動 `r37_src/s70_arcplus.js`／`.css`；`fps_game.js`、`runner_game.js` 沒動）：
- **一屏版面合約**：遊玩頁（遊玩、學習卡、暫停、結算）高度＝視窗高度減頁面頂邊（`layout()` 設 `--ap-h`），CSS 直排：頭列｜遊玩區（吃剩餘高度，內含 HUD／畫布／學習條）｜按鍵｜頁腳；`r2Fit()` 把畫布放進剩餘空間。360×640、390×844、1440×900 不捲動；844×390 沿用沉浸式三欄，左欄按遊戲工具鈕數量自動分欄（`landTools()`）。桌面頁腳只留一行按鈕＋一行說明，音量收成右下小按鈕（點開向上彈出）。360×640 隱藏一次性的「橫向」提示（它要佔 50 px）。學習條無題目時一行、有題目時兩行。
- **結算卡**：覆蓋在遊玩區中央，精簡排版、不內捲；三格統計「最高連擊 ×N｜到達波次｜字晶答對」；本局生字最多 2 行、其餘「＋N 個」；N＝s70 `maxCombo`＝`WQArc._combo().max`（結算時對齊）。結算後 `_force('learn')` 不開卡。
- **HUD 單一來源**：遊玩中只有 DOM HUD；`a28RulesTick` 之後再刷新生命／分數（四款「失誤計命」遊戲不再慢一格）；`_debug().hudShown` 從 DOM 讀出。
- **按鍵**：觸控鍵／工具鈕／結算鈕不折行（`nowrap`）、對比 ≥ 4.5:1；主鍵金色實底。
- **畫布標籤**：包裝 `D.badge`／`D.message`，遊玩中改畫深色玻璃（`_debug().canvasHud` 記錄）；預覽／大堂縮圖不變。
- **測試**：新共用探測 `r37_tests/arc_probe.js`（t28、`r320_capture.py`、`r320_probe_run.py` 共用，t28 C5 有反向對照）；t28 新增 H1／H2／H3／K1／R1／C5；`r320_regression.py` 記錄每套建置 SHA256 與起訖時間。

**改動的舊斷言**（皆有 `# R3.20:`）：`t26`（鍵在畫布下方且在視窗內，不再要求在遊玩區方框內）、`t22`（關閉 ⋯ 選單改為點擊背板，不用 evaluate click）、`t30`（F2 以整數格數比較；F3 在單一 evaluate 內逐格量度、斷言剛好 120 格）、`test_fps.py`／`t29`／`t30`（瀏覽器改用 `/usr/bin/chromium`，本機預設 headless shell 不存在）。

**第 2 輪修正**（驗收第 1 輪的問題清單）：star-patrol 360×640 鍵列不再被裁；工具鈕多的款加 `ap-heavy`（學習條浮在畫布下緣、桌面滑鼠用較矮工具鈕、頁腳鈕移到按鍵列下、360×640 縮窄頁面頂邊）；forest-band 說明字對比；準備卡「⚡ 生字補給 3 題」鈕不再溢出；`_force('lose')` 到 0 命時用遊戲的 `end()` 結束（結算卡正常出現，`pgReason='finished'`）；t28 B9 改單一同步 evaluate；探測加 `lowText`（一般文字對比）；離線測試改為停止本機伺服器並直接登記 `sw.js`（證據在 `r37_evidence/r320/sw/`）。after 圖補了 learn 狀態（26×4＋平板 5）。

**第 3 輪修正**（驗收第 2 輪的問題清單，全部在 `s70_arcplus.css`／`.js`）：
- star-patrol 844×390：右欄動作鍵（護盾／慢移／切換）改貼著第 1–2 行底部，不再被左欄方向鍵撐高的第 1 行推到頁腳鈕上。
- 1440×900 工具鈕多的款（`ap-heavy`：forest-band、color-workshop、little-engineer、sweet-studio）：頁腳四鈕＋音量鈕移到頭列右側，按鍵列與工具鈕獨佔底部一行，不再互相疊；其他款的音量鈕上移 24 px，不再蓋住說明行。
- 結算／準備卡：子項不再縮到互相疊壓（`flex-shrink:0`）；`fitCard()` 在內容比卡高時依序收起：生字清單 → 重複的紀錄橫幅 → 副標題及註腳 → 挑戰星 → 最高分行（「最高連擊 ×N」不收）。360 寬「再試一次 · 不扣金幣」字級 15 px、內距 ≥ 8 px。
- 手機工具鈕最窄 44 px（forest-band 拍子鍵 1–16 放不下就換行）、工具鈕列左右留 4 px。
- 測試：`arc_probe.js` 加 `overlaps`（按鈕／按鈕、按鈕／文字、按鈕中心被蓋住、結算卡兩行文字重疊、文字內距 < 4 px、貼邊 < 4 px）；t28 把它們與「觸控工具鈕 ≥ 44×44」列為斷言，C5 反向對照加「故意疊兩個鍵必須報錯」；`r320_probe_run.py` 同步。`t21_webkit_smoke.py` 改向系統要空閒埠（固定埠 8791 被本機另一專案佔用，每頁 404 → 30/57；改後 57/57）。`tools/r320_regression_retest.py` 可在同一建置重跑單套並併入 `regression.json`（舊嘗試與 log 保留）。

**測試結果（凍結建置 SHA256 `9e317962…0a01`）**：共用探測 312 組（26 款 × 4 尺寸 × play／learn／result）及 436 張 after 探測全部 0 問題（含重疊、貼邊）；t28 完整跑 2524/2525（forest-pong B2 不穩定，重跑通過），版面（含新斷言）全過；回歸 41／42 套通過，`r1-regression` 在改動前建置同樣失敗；`t19` 整套回歸時 3 次失敗、同一建置單獨重跑 126/126（原因未查明）；`fps-module` 第 2 次通過。效能（4 倍節流）8 款中 3 款不超過改動前，5 款（star-patrol、forest-dash、sky-rescue、honeycomb-puzzle、valley-race）略高，原因是推測，未修。

**限制／未達標**：forest-band 360×640 畫布寬 282.8 px（要求 ≥ 280，只多 2.8 px）、桌面畫布高 497 px 仍比改動前（549 px）小；結算後隱藏的 HUD 內部（star-rhythm、meadow-cricket）仍記 1 顆亮心；結算時成就提示會短暫蓋住結算卡頂部一行小字（及桌面頭列按鈕下緣約 6 px），沒有修；手機上畫布內小字仍小；18 款場景仍是淺色；L2 只有 4 款、L3、答題＝玩法動作未做；沒有真機／兒童實測；平板 768×1024 只截圖不判定。

## 十、階段 2：動作 9 款＋運動 4 款的玩法深化（答題＝玩法動作）

交付等級：**預覽**（沒有真機、沒有兒童實測、學習內容未經教師審核；以下全部是自動測試與截圖證明的範圍）。範圍只有 13 款：sky-rescue、forest-dash、moon-bells、drift-path、valley-race、ruins-courier、cloud-island、star-patrol、lighthouse-well、bounce-basket、forest-pong、meadow-cricket、harbor-volley。其餘 13 款（解謎 5、策略 5、創作 3）沒有改。執行記錄：`_team_runs/r320-p2/build-log.md`；逐款現況：`docs/R3_20_game_audit.md`；證據：`r37_evidence/r320/`（`t31_results.json`、`regression_p2.md`、`logs/p2/`、`after/`、`compare/`、`perf_p2.json`）。

### 一個共用介面＋13 個配接器
- `r37_src/s70_arcplus.js`／`.css`：共用「玩法作答」介面——`cfg[id].play` 的遊戲，三個英文答案不再是浮在畫面上的字晶，而是遊戲世界裏的**目標**（同大小、36 px 粗體、白字深色描邊的字牌；三個外觀相同；正確目標的位置由三格洗牌袋決定，每三題各位置各一次）。下方學習條只有提示（中文／🔊／圖）＋一句動詞＋三個**不可點**的圖例 `.ap-leg`（≥14 px）。選項鈕、點畫布、數字鍵 1–3 一律不能作答。答對給本款獎勵；答錯凍結 ≥2 秒、不扣命、倍率只降一級（連擊 7＝×3 → 3＝×2；失去生命仍歸零）；全部目標離場而沒選＝「錯過」（不扣命、學習條顯示正確答案 ≥3 秒、6 秒後才出下一題）。目標出現後，倍率的段速加快暫停；有些款另有 2.5 秒「充氣」（目標可見但碰不到）或慢動作，保證字牌完全可見到最早可碰到 ≥2.5 秒遊戲時間（`_debug().play.visibleT／reachT`）。
- 本局三星（結算卡 `.ap-res` 內，s35 的「分數挑戰」歷來最佳星不變）：★分數（≥ 該款第一顆挑戰星的分數）、★生字（答 ≥2 題且準確率 ≥75%，錯過不算答）、★連擊（最高連擊 ≥ 該款 `comboStar`：bounce-basket 3、meadow-cricket／forest-pong／harbor-volley 4，其餘 6）。「本局 n / 3 星」有 `aria-label`；門檻放在 `title`，卡上只有一個「×」數字（最高連擊）。
- `r37_src/s72_arcplay.js`：13 個配接器（每款約 60–120 行），只用旁置物件（WeakMap／`s.pl`），不在遊戲物件加欄位、不呼叫 `g.r()`、不在引擎每格重算的欄位上做 tick 之後的改動、不超過存檔檢查上限。每款一個專屬機制、一個專屬事件（導演的第一個定時事件一定是本款的）、`_debug().diff` 的三段難度數字（只增不減）。獎勵單位 `unit`：bounce-basket 3、meadow-cricket 4（金幣雨和答題加分用它）。
- 必修的 3 個既有錯誤：**F1** cloud-island 的 `coinarc` 令遊戲停機（光石變 16 顆，存檔檢查丟錯）→ 改為重用光石物件，永遠 9 顆；**F2** bounce-basket 移動籃框只移動畫出來的籃框 → `patches/s70_arcplus.py` 在引擎 `update()` 的籃框位置加 `wq34S(this).hx／hy` 偏移，判定與繪製同一位置；**F3** bounce-basket 用分數反推入球數（金幣雨＝20 個入球）→ 入球數改用 `score − WQArcPlus.bonusOf(g)`（`a28RulesTick`、`a28Winning` 兩處）。這三處是引擎底版文字唯一的改動。

### 13 款玩法（每款一行：作答動作／專屬機制／專屬事件）
| 遊戲 | 作答動作 | 專屬機制 | 專屬事件 |
|---|---|---|---|
| sky-rescue | 飛機穿過寫着正確字的寶石（寶石列慢慢向左漂） | 金鳥鏈：連救 5 隻金鳥 → 3 秒彩虹尾跡吸物 | 金鳥群 |
| forest-dash | 換到有正確字的跑道穿過字門 | 滾木（影子預警 1.5 秒） | 螢火蟲燈籠 |
| moon-bells | 跳上寫着正確字的鈴鐺 | 超級跳（答對 vy −650） | 月光鳥（再一次跌落救援） |
| drift-path | 按「轉彎」的時機讓小車經過正確字的燈 | 完美過彎連 3 次 → 氮氣 | 夜光路 |
| valley-race | 把車開過正確字的字墊 | 乾淨駕駛氮氣槽 | 彩虹加速帶 |
| ruins-courier | 換到有正確字的跑道收郵包 | 集郵寶箱 | 寶箱 |
| cloud-island | 碰到正確字的光石 | 彈跳鞋（起跳 ×1.25） | 光石弧（修 F1） |
| star-patrol | 射中正確字的字母艦（4 下） | 反彈護盾 | 火力全開 |
| lighthouse-well | 落在寫着正確字的平台上 | 燈芯光圈（越深越暗） | 燈籠 |
| bounce-basket | 球第一個碰到的氣球 | 火熱球（下一個入球 +3） | 起風 |
| forest-pong | 球穿過正確字的燈籠 | 旋球 | 螢火引路 |
| meadow-cricket | 只向正確字的球揮棒 | 擊球方向＋金圈 | 慢球 |
| harbor-volley | 球過網後的落點區 | 三傳攻勢 | 海鷗 |

### 測試與改動的斷言
- 新測試 `r37_tests/t31_play_answer.py`：13 款各 33–36 項：目標（3 個、36 px、在畫布內、不重疊、樣式相同、中心點是畫布、無選項鈕、圖例 ≥14 px）、非動作路徑被拒、答對（遊戲自己的動作＋獎勵）、答錯（凍結、不扣命、倍率降一級）、專屬機制、難度只增不減、事件＋存檔檢查靜默 ≥2 秒、閱讀時間 ≥2.5 秒、公平（30 題各位置 ≥5）、錯過、`wq37-nolearn=1`、結算三星（與 debug 資料及規則重算一致、最高連擊三處相同）；另有 bounce-basket 的 F2／F3 斷言與 3 款 390×844 觸控抽查。主斷言不用 `_force('answer')`；測試只可把玩家擺到目標附近，最後一步一定是引擎物理／按鍵加配接器的 hit 判定。改動前建置（`b0f8c6f`）上 13 款全部 FAIL（`r37_evidence/r320/logs/p2/t31_before.log`）。
- `t28`（13 款＋honey-delivery／number-garden／forest-band 冒煙）：13 款的 B3 改用 `_force('answer')`（作答路徑由 t31 驗）、`B3_chips_big` 改為「無選項鈕＋圖例 ≥14 px」、`B3_right_power` 接受 `play-reward`、不再做 `B3_touch_collect`；`B2_phase2` 在遊戲已自己升到第 2 段時不要求再有橫幅；bounce-basket 的失誤數公式改用 F3 的真實入球數；forced run 內關閉自動出題（idle 玩家會「答」跑道／字門）；`B2_miss_resets_combo` 先讓核心看到補滿的心。全部有 `# R3.20: 階段 2` 註明；沒有放寬任何數值容差。
- `lib37.open_page`：合併奧數課堂後 file:// 載入 `olympiad-classroom/host.js` 會被 CORS 擋、每頁多一條 console 錯誤；改用 `route()` 把該目錄的檔案連同 `access-control-allow-origin` 交給頁面（與網站同一份檔案，沒有過濾或忽略任何錯誤）。

### 限制與缺口（誠實清單）
- 兒童可玩性**未經實測**：閱讀時間 2.5 秒、慢動作倍數、drift-path 早轉／遲轉（燈只差 20 px）、harbor-volley 落點預測對 6–8 歲可能偏難，待兒童實測。
- 字牌是畫布內 36 px（手機約 17 CSS px），圖例在下方 ≥14 px；`wq37-nolearn=1` 時不出目標（本局第二星改為「到達第 3 段」）。
- 目標是 s72 的旁置物件，引擎不知道它們；儲存並返回後進行中的題目作廢（不計對錯）。
- 多款的「難度」是補丁層在持續欄位上的調整（引擎的影子車、引擎的常數不能改）：valley-race 以車速代替影子車；drift-path 的直路縮短只動 `cur+2` 之後的路段；詳見 audit。
- 分數膨脹：倍率與獎勵令分數高於 R3.6，s35 `TARGETS` 沒有改，「分數挑戰」星比以前易拿；調整門檻留待階段 4。
- 沒有做：5 款旗艦的視差、大機制、音效分層、過關演出（階段 4）；解謎／策略／創作 13 款玩法（階段 3）。
