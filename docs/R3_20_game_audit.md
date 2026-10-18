# R3.20 階段 1 小遊戲盤點（誠實版）

交付等級：**預覽**（Chromium 自動測試＋截圖；沒有真機、沒有兒童實測、學習內容未經教師審核）。本檔只記錄**階段 1（底線修復）**做了什麼、沒做什麼，沒有「完成度」百分比；每款的 t28 一行是實測。 回歸未通過：r1-regression（改動前建置同樣失敗，見 regression.md）。
階段 1 的範圍：四尺寸一屏玩到結算、HUD 單一來源、結算卡（含連擊）、按鍵可讀性、18 款畫布標籤深色化、測試與證據。新玩法、專屬機制（L2）、旗艦深化（L3）、「答題＝玩法動作」留待階段 2–4。
Before 圖：`r37_evidence/r320/before/<id>__<尺寸>__<start|play|result>.jpg`；after 圖：`r37_evidence/r320/after/…`（每張有同名 `.json`＝`arc_probe.js` 量度）；前後對照：`r37_evidence/r320/compare/<id>.jpg`；尺寸 small=360×640、phone=390×844、land=844×390、desk=1440×900（tablet=768×1024，5 款，只記錄不判合格）。

## 一、26 款逐款

### 天空救援隊（`sky-rescue`，動作）

- **現況（階段 1 之前）**：3 款旗艦之一：飛機飛近小鳥救援、閃避風雲；自繪 HUD（心＋標題膠囊）。畫布內 HUD：A28.hud。before 圖：`r37_evidence/r320/before/sky-rescue__phone__play.jpg`、`r37_evidence/r320/before/sky-rescue__desk__play.jpg`、`r37_evidence/r320/before/sky-rescue__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：102/102 項通過。
- **未做（留待階段 2–4）**：L2：`flock` 金色鳥群事件（5 隻金鳥＋光環）（已有，階段 1 沒動）；L3：部分：晴空→雷雲雨線→流星夜三波背景、三層飄移雲；沒有 Peggle 式過關演出；「答題＝玩法動作」已有（角色碰字晶）；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字晶在飛機附近出現時可能與風雲重疊；分數由救援／寶石累計，倍率令分數略為膨脹。

### 極速森林跑酷（`forest-dash`，動作）

- **現況（階段 1 之前）**：3 款旗艦之一：三線跑道跳／滑；自繪 HUD。畫布內 HUD：A28.hud。before 圖：`r37_evidence/r320/before/forest-dash__phone__play.jpg`、`r37_evidence/r320/before/forest-dash__desk__play.jpg`、`r37_evidence/r320/before/forest-dash__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：97/97 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：角色用跑道線而非螢幕座標，所以沒做碰撞收集；沒有滾木等新障礙。

### 月光跳鈴（`moon-bells`，動作）

- **現況（階段 1 之前）**：往上跳鈴；畫布內自繪高度文字。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/moon-bells__phone__play.jpg`、`r37_evidence/r320/before/moon-bells__desk__play.jpg`、`r37_evidence/r320/before/moon-bells__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：沒有「字鈴＝超級跳」；高度分段換景未做。

### 漂移小徑（`drift-path`，動作）

- **現況（階段 1 之前）**：自動前進、左右漂移；畫布內自繪里程。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/drift-path__phone__play.jpg`、`r37_evidence/r320/before/drift-path__desk__play.jpg`、`r37_evidence/r320/before/drift-path__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 584 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：路牌選字未做；`speed` 縮放可能令彎道較急。

### 風谷賽道（`valley-race`，動作）

- **現況（階段 1 之前）**：三圈賽車；畫布內自繪圈速。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/valley-race__phone__play.jpg`、`r37_evidence/r320/before/valley-race__desk__play.jpg`、`r37_evidence/r320/before/valley-race__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：檢查點拱門標字＝氮氣未做。

### 遺跡郵差（`ruins-courier`，動作）

- **現況（階段 1 之前）**：R2：三區跑道，跳／滑／閃；R2.hud。畫布內 HUD：R2.hud。before 圖：`r37_evidence/r320/before/ruins-courier__phone__play.jpg`、`r37_evidence/r320/before/ruins-courier__desk__play.jpg`、`r37_evidence/r320/before/ruins-courier__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：97/97 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字門選線、寶箱事件未做。

### 雲島探險（`cloud-island`，動作）

- **現況（階段 1 之前）**：R2：平台跳躍，旗幟重生；R2.hud。畫布內 HUD：R2.hud。before 圖：`r37_evidence/r320/before/cloud-island__phone__play.jpg`、`r37_evidence/r320/before/cloud-island__desk__play.jpg`、`r37_evidence/r320/before/cloud-island__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：101/101 項通過。
- **未做（留待階段 2–4）**：L2：`coinarc` 光石弧事件（前方一排光石）（已有，階段 1 沒動）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字雲島＝彈跳鞋未做。

### 星環巡航（`star-patrol`，動作）

- **現況（階段 1 之前）**：R2：自動射擊、閃避核心、每區 6 波＋大敵機；R2.hud。畫布內 HUD：R2.hud。before 圖：`r37_evidence/r320/before/star-patrol__phone__play.jpg`、`r37_evidence/r320/before/star-patrol__desk__play.jpg`、`r37_evidence/r320/before/star-patrol__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：98/98 項通過。
- **未做（留待階段 2–4）**：L2：`overdrive` 事件（護盾即時充能、火力 +1）（已有，階段 1 沒動）；L3 旗艦深化（階段 3）；「答題＝玩法動作」已有（角色碰字晶）；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：射中字母艦＝散射升級未做；原有 6 波＋Boss 結構沒動。

### 燈塔深井（`lighthouse-well`，動作）

- **現況（階段 1 之前）**：R2：往下跳平台、降落傘；R2.hud。畫布內 HUD：R2.hud。before 圖：`r37_evidence/r320/before/lighthouse-well__phone__play.jpg`、`r37_evidence/r320/before/lighthouse-well__desk__play.jpg`、`r37_evidence/r320/before/lighthouse-well__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：97/97 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字平台未做。

### 跳跳投籃（`bounce-basket`，運動）

- **現況（階段 1 之前）**：蓄力投籃 7 球；畫布內自繪計分。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/bounce-basket__phone__play.jpg`、`r37_evidence/r320/before/bounce-basket__desk__play.jpg`、`r37_evidence/r320/before/bounce-basket__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：96/96 項通過。
- **未做（留待階段 2–4）**：L2：第 2／3 段籃框左右／上下移動（已有，階段 1 沒動）；L3：部分：籃框移動，但沒有字牌、風向事件、火熱球；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：籃框移動時 `hoop` 位置改動，已在 `!flying` 時才改；沒有雙籃。

### 森林乒乓（`forest-pong`，運動）

- **現況（階段 1 之前）**：對 AI 乒乓；畫布內自繪比分。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/forest-pong__phone__play.jpg`、`r37_evidence/r320/before/forest-pong__desk__play.jpg`、`r37_evidence/r320/before/forest-pong__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：99/99 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字靶球門未做。

### 草地擊球（`meadow-cricket`，運動）

- **現況（階段 1 之前）**：10 球擊球；畫布內自繪回合。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/meadow-cricket__phone__play.jpg`、`r37_evidence/r320/before/meadow-cricket__desk__play.jpg`、`r37_evidence/r320/before/meadow-cricket__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：96/96 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：外野字靶未做。

### 海港排球（`harbor-volley`，運動）

- **現況（階段 1 之前）**：R2：5 分賽排球；R2.hud。畫布內 HUD：R2.hud。before 圖：`r37_evidence/r320/before/harbor-volley__phone__play.jpg`、`r37_evidence/r320/before/harbor-volley__desk__play.jpg`、`r37_evidence/r320/before/harbor-volley__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：102/102 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」已有（角色碰字晶）；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字靶區未做；球員可及範圍較窄，字晶位置固定在 y 405–435。

### 蜜糖快遞（`honey-delivery`，解謎）

- **現況（階段 1 之前）**：8 關：割繩讓蜜糖落杯；自繪關卡文字。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/honey-delivery__phone__play.jpg`、`r37_evidence/r320/before/honey-delivery__desk__play.jpg`、`r37_evidence/r320/before/honey-delivery__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：標字熊、風扇未做；蜜糖掉出時該局以原規則扣命。

### 翻滾方塊（`rolling-block`，解謎）

- **現況（階段 1 之前）**：10 關翻滾方塊走到洞口。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/rolling-block__phone__play.jpg`、`r37_evidence/r320/before/rolling-block__desk__play.jpg`、`r37_evidence/r320/before/rolling-block__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字鑰目標洞、冰面未做。

### 果汁畫線（`juice-lines`，解謎）

- **現況（階段 1 之前）**：畫線讓果汁流進杯子。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/juice-lines__phone__play.jpg`、`r37_evidence/r320/before/juice-lines__desk__play.jpg`、`r37_evidence/r320/before/juice-lines__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：標字杯、分流器未做。

### 彩球工房（`color-workshop`，解謎）

- **現況（階段 1 之前）**：10 件：混色訂單。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/color-workshop__phone__play.jpg`、`r37_evidence/r320/before/color-workshop__desk__play.jpg`、`r37_evidence/r320/before/color-workshop__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 584 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：英文色名訂單未做。

### 小小工程師（`little-engineer`，解謎）

- **現況（階段 1 之前）**：連桿搭橋；自繪文字。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/little-engineer__phone__play.jpg`、`r37_evidence/r320/before/little-engineer__desk__play.jpg`、`r37_evidence/r320/before/little-engineer__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 584 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：終點旗標字、彈簧零件未做。

### 數字花園（`number-garden`，策略）

- **現況（階段 1 之前）**：2048 式合成到 512。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/number-garden__phone__play.jpg`、`r37_evidence/r320/before/number-garden__desk__play.jpg`、`r37_evidence/r320/before/number-garden__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：99/99 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：「算式種子」格（6×2 合到 12）未做——只有字晶算式。

### 方塊工坊（`block-studio`，策略）

- **現況（階段 1 之前）**：俄羅斯方塊式消行。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/block-studio__phone__play.jpg`、`r37_evidence/r320/before/block-studio__desk__play.jpg`、`r37_evidence/r320/before/block-studio__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：本次 t28 取樣沒有看到 `D.badge`／`D.message` 標籤被畫出（若之後出現，包裝照樣生效）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字寶石方塊未做；`speed` 縮放令下落較快。

### 蜂巢拼拼（`honeycomb-puzzle`，策略）

- **現況（階段 1 之前）**：六角格擺放拼圖。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/honeycomb-puzzle__phone__play.jpg`、`r37_evidence/r320/before/honeycomb-puzzle__desk__play.jpg`、`r37_evidence/r320/before/honeycomb-puzzle__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字蜂格未做。

### 旋轉色環（`color-orbit`，策略）

- **現況（階段 1 之前）**：旋轉色環消色。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/color-orbit__phone__play.jpg`、`r37_evidence/r320/before/color-orbit__desk__play.jpg`、`r37_evidence/r320/before/color-orbit__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：字珠配對未做。

### 纏繞花園（`garden-paths`，策略）

- **現況（階段 1 之前）**：六角路徑接花。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/garden-paths__phone__play.jpg`、`r37_evidence/r320/before/garden-paths__desk__play.jpg`、`r37_evidence/r320/before/garden-paths__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：路徑接字花未做。

### 星軌節拍（`star-rhythm`，創作）

- **現況（階段 1 之前）**：32 拍節奏遊戲。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/star-rhythm__phone__play.jpg`、`r37_evidence/r320/before/star-rhythm__desk__play.jpg`、`r37_evidence/r320/before/star-rhythm__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 515 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：96/96 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：每拍帶字母的拼字節拍未做；`speed` 關閉以免與音訊節拍脫鈎。

### 森林節奏社（`forest-band`，創作）

- **現況（階段 1 之前）**：五樂器步進編曲，自由創作。畫布內 HUD：自繪。before 圖：`r37_evidence/r320/before/forest-band__phone__play.jpg`、`r37_evidence/r320/before/forest-band__desk__play.jpg`、`r37_evidence/r320/before/forest-band__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 283 px（< 348，列為已知限制）；1440×900 畫布高 497 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：遊玩中有畫出 `D.badge`／`D.message`，已包裝成深色玻璃（底 `rgba(18,24,68,.88)`、字 `#F4F6FF`；t28 H3 數值＋像素取樣）。場景內物件標籤（例如繩子上的「左／右」）屬場景，沒有改。
- **t28 結果**：L1 共通層 t28：95/95 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：音節鼓點未做。

### 甜點夢工場（`sweet-studio`，創作）

- **現況（階段 1 之前）**：3 款旗艦之一：配雪糕訂單；自繪 HUD。畫布內 HUD：A28.hud。before 圖：`r37_evidence/r320/before/sweet-studio__phone__play.jpg`、`r37_evidence/r320/before/sweet-studio__desk__play.jpg`、`r37_evidence/r320/before/sweet-studio__phone__result.jpg`。
- **階段 1 已做（只列 t28 及截圖證明了的）**：量度（`arc_probe.js`，play／learn／result 狀態）：390×844 畫布寬 382 px；360×640 畫布寬 352 px；1440×900 畫布高 584 px。探測 12 組（4 尺寸 × play／learn／result）中 12 組沒有捲動、截字、出界、低對比文字。
- **畫布標籤處理**：旗艦／R2 款：畫布內舊 HUD（`A28.hud`／`R2.hud`）遊玩中不畫，只留 DOM HUD；沒有 `D.badge`／`D.message` 淺色標籤。
- **t28 結果**：L1 共通層 t28：101/101 項通過。
- **未做（留待階段 2–4）**：L2 專屬機制（階段 2）；L3 旗艦深化（階段 3）；「答題＝玩法動作」未做（階段 3–4）；現在是點選字晶／下方選項；畫布內小字在手機上偏小（階段 2／3 逐款搬到 DOM HUD）。
- **已知問題**：顧客中文氣泡＋標英文配料未做。

## 二、其他遊戲入口

| 入口 | 狀態 | 證據／理由 |
|---|---|---|
| 街機大堂 `#game`／`#playground` | 本輪優化對象（26 款） | — |
| 星際跑酷 `#lv/runner` → `#rn/play` | 修正 A 已做（門距、減速、障礙）；玩法與美術不動 | `t29`、`test_runner.py` |
| 字母獵場 `#lv/fps` → `#fp/play`、自由射擊 `#fps` | 修正 B 已做（搖桿、怪物、計時、超時）；其餘不動 | `t30`、`test_fps.py`、t10／t11／t22 |
| 數學星「思維之塔／策略卡」（`data-wqm-open`） | 不做：數學外掛，本輪範圍外 | — |
| 舊 `#arcade-play`／`#gameplay`（GAME_CATALOG 5 款） | 已停用，只剩「入口已更新」頁；不做 | — |
| `cloud-run`、`forest-freezer` | 仍登記在 `WQGames`，已由 forest-dash／sweet-studio 取代，不在 26 款內；不做 | — |
| 角色、每日任務、家長頁 | 本輪範圍外（家長頁沒有遊戲） | — |

## 三、總結與未達標處

- 階段 1 只做底線修復；L2 專屬機制仍是 4 款（sky-rescue、cloud-island、star-patrol、bounce-basket 的小機制），目標 ≥ 13 款留待階段 2。
- 「答題動作＝玩法動作」只有 3 款（sky-rescue、star-patrol、harbor-volley）；其餘 23 款仍是點選字晶，留待階段 3–4。
- 18 款遊戲的場景仍是淺色粉彩（階段 1 只統一畫布標籤顏色）；手機上畫布縮到約 0.48 倍時，畫布內 14 px 字只有約 6.7 CSS px，重要資訊尚未搬到 DOM。
- 沒有真機、沒有兒童實測、學習內容未經教師審核；WebKit 只有煙霧測試。
- 360×640 畫布寬 < 348 px 的遊戲見各款「階段 1 已做」一行。

## 四、第 2、3 輪修正與仍然存在的問題（誠實版）

- 第 2 輪修正：star-patrol 360×640 的鍵列不再被裁；工具鈕多的款（`ap-heavy`）學習條改浮在畫布下緣、360×640 縮窄頁面頂邊；準備卡的「⚡ 生字補給 3 題」鈕不再溢出；`_force('lose')` 到 0 命時用遊戲自己的 `end()` 結束；t28 B9 改單一同步 evaluate；探測新增 `lowText`。
- **第 3 輪修正**（驗收第 2 輪的問題清單）：(1) star-patrol 844×390 的「切換」鍵被頁腳鈕蓋住——右欄動作鍵改為貼著第 1–2 行的底部，不再被左欄方向鍵的高度推到頁腳上；(2) 1440×900 的 little-engineer／sweet-studio／color-workshop（及 forest-band）按鈕互相重疊——`ap-heavy` 的頁腳鈕與音量鈕移到頭列右側，按鍵列與工具鈕獨佔底部一行；(3) 結算卡內容太多時不再互相疊壓——`fitCard()` 依序收起：生字清單 → 重複的紀錄橫幅 → 副標題及註腳 → 挑戰星 → 最高分行，「最高連擊 ×N」一直保留；(4) forest-band 手機的拍子鍵 1–16 最窄 44 px，放不下就換行（不再擠成 27 px）；(5) 探測 `arc_probe.js` 新增 `overlaps`（按鈕／按鈕、按鈕／文字、按鈕中心被蓋住、結算卡內兩行文字重疊、按鈕文字內距 < 4 px、按鈕貼著視窗邊 < 4 px），t28 把它們與「觸控工具鈕 ≥ 44×44」都列為斷言，並有反向對照（故意疊兩個鍵必須報錯）；(6) 360 寬「再試一次 · 不扣金幣」字級 15 px、內距 ≥ 8 px；(7) 桌面「音量與試音」鈕不再蓋住頁腳說明；(9) 手機工具鈕列左右留 4 px。
- 結果：312 組（26 款 × 4 尺寸 × play／learn／result）及 436 張 after 探測，沒有捲動、截字、出界、低對比文字、按鈕重疊、貼邊。
- 360×640 的 forest-band 畫布寬只有 282.8 px（要求 ≥ 280，只多 2.8 px），拍子鍵排成 5 排；桌面畫布高 497 px（要求 ≥ 480），改動前是 549 px，**仍比改動前小**。
- 效能（`perf.json`，CPU 4 倍節流、390×844、3 輪中位數）：8 款中 3 款不超過改動前（block-studio、juice-lines、little-engineer）；star-patrol、forest-dash、sky-rescue、honeycomb-puzzle、valley-race 的 p95 或長幀略高（一格 16.7 ms 的差距、0–5 個長幀），原因是推測（s70 背景＋粒子＋DOM HUD 更新，共用機器有噪音），未逐款剖析、未修。
- 結算後隱藏的 HUD 內部（star-rhythm、meadow-cricket）仍顯示 1 顆亮心，引擎是 0；HUD 在結算時不顯示，畫面上沒有，但日後若在結算時顯示會不一致。
- forest-band 結算時「解鎖成就」提示（約幾秒後自動消失）會短暫蓋住結算卡頂部的一行小字，桌面版也會蓋住頭列按鈕下緣約 6 px；沒有修（提示由成就系統顯示，不在本層）。
- 回歸：`r1-regression` 在改動前建置同樣失敗（數學外掛 `completed-home`），不是本階段造成；`t21-webkit-smoke` 的 30/57 是測試固定使用埠 8791、而該埠被本機另一個專案的伺服器佔用（每頁 404），已改為向系統要空閒埠後 57/57；`t19` 整套回歸時 3 次失敗、同一建置單獨重跑 126/126（原因未查明）；`t28` forest-pong B2、`fps-module` 第 1 次失敗後重跑通過。細節在 `regression.md`。
- 390×844 的 sky-rescue 等款畫布上下有空白深色區（畫布 267 px 高），版面合格但空間未用好，留待之後階段。
