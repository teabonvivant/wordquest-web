# WordQuest R3.3 · 手機版穩定與資料安全（止血版）

## 這次交付

以 R3.2 完整程式增量修正。R3.2 審計及原始碼分析找到的四項已知缺陷（WQ32-01 至 WQ32-04）與手機上「一碰就壞」的版面問題（N1–N4、N10、N12）、街機結算多扣一幣（N5）、拼字教室無音效（N9）、註冊不問年級（N7）、結束一組失敗（N6）、公開 Admin／1234（N8）等，已逐項修好並各有回歸測試。**這是止血版：沒有新增玩法、沒有會員系統、沒有教師審核，也不是商用版。**

R3.3 不是手改的 12 MB 檔案：`app/index.html`、`app/sw.js`、`server/local_server.mjs` 全部由 `tools/build_r33.py` 以凍結的 R3.2 原件（`originals/R3_2/`，SHA-256 已核對）加上 `r33_src/patches/` 的補丁模組重建，每個補丁錨點必須在原件剛好出現一次，否則建置失敗。同一輸入會產生逐位元組相同的輸出。

## 修了什麼

| 編號 | 問題 | R3.3 的做法 |
| --- | --- | --- |
| WQ32-01（高） | 復原標記存在但日誌遺失時，有效備份無法還原，家庭管理面板也打不開 | 面板可開並顯示復原指引；普通寫入仍被擋；還原前先把現場寫成日誌（`rescue-before`），失敗時回滾並保留標記；日誌其實可用時拒絕，引導去「恢復中斷交易」；救援期間可清除帳戶但加強警告 |
| WQ32-02（中） | 刪除學員後其 IndexedDB 圖片、註記仍留在家庭匯出 | 刪除同一交易內清除；失敗寫入墓碑並重試；匯出及還原過濾孤兒列；`audio:` 共享錄音不動 |
| WQ32-03（中） | 語音 API 延後送出本文可繞過並行與頻率限制 | 通過檢查後同步佔位再讀本文；讀本文 10 秒期限；客戶端中止會取消上游；上游前失敗退回計數 |
| WQ32-04（中） | 「準備網頁」被硬停用 | 在 http(s) 安全環境註冊 Service Worker，確認快取內有 `index.html` 才顯示「已準備」；新增 `manifest.webmanifest` 與圖示；啟用時清除本應用舊版快取；伺服器加 ETag／304 與 br／gzip |
| N3（高） | 浮動「＋ 數學／奧數」鈕蓋住底部導航 | 上移到導航之上，專注流程隱藏 |
| N1（高） | 手機輸入題第一下點「提交答案」無反應 | 輸入框聚焦時不再讓版面位移（導師卡改為保留空間） |
| N2（高） | 舊引擎 #learn 按鈕被導航蓋住，點到會離開課堂 | 手機上 #learn 隱藏導航，「休息」按鈕標示清楚 |
| N4（高） | 默書匯入底部「核對及加入」被導航蓋住 | 匯入列抬高到導航之上 |
| N5（中） | 街機結算畫面預設焦點在「再投 1 幣」，連按跳躍鍵多扣一幣 | 預設焦點在「返回大堂」；「再投 1 幣」出現後鎖 700 ms，鎖定期內 Space／Enter 一律吞掉；之後 Tab＋Enter 仍可購買 |
| N6（中） | L30 拼字塊已點選時「結束這組」失敗 | 核心新增 `abandon`，清字塊並保持其他驗證嚴格 |
| N7（中） | 註冊不問年級，第一位孩子寫死小三 | 註冊必填年級；家長區每位孩子可「修改年級」（要家長閘與寫入權） |
| N8（中） | 登入頁公開 Admin／1234 與測試區連結 | 全部移除；測試沙盒只在 `file:` 或 localhost／127.0.0.1／[::1] 並帶 `?mode=admin-test` 時可用 |
| N9（中） | L30／L31 答題完全無聲 | 答對、答錯、完成、拼字塊、金幣入帳都有音效，遵守「聲效」開關與語音播放中靜音 |
| N10／N11／N12／N13 | 思維之塔按鈕對比 1.11:1；家長閘過期時對話框內無提示；數學不寫歷史；示範範圍 water 無中文；圖庫核取方塊畸形；訪客文案與行為不符 | 逐項修正；數學開啟時加一筆歷史，Back 關閉對話框 |

## 開啟及升級

與 R3.2 相同：先在舊版家長頁匯出「家庭完整備份」，不要用清除瀏覽器資料來升級。使用同一瀏覽器、模式及網址；更換主機名稱、連接埠或瀏覽器看不到舊資料。**本倉庫不含你瀏覽器內的真實學員紀錄。**

- 開 `START_HERE.html`，或在 Windows 用 `START_WINDOWS.cmd`，或有 Node 20+ 時執行 `node server/local_server.mjs` 後開 `http://127.0.0.1:8765/app/index.html`。
- 已安裝 R3.2 的瀏覽器：新的 Service Worker 會先等待，所有分頁關閉後才切換並清除舊快取，這是不強制切換的既有策略。
- 新註冊的帳戶要選年級；舊帳戶資料不變，年級可在家長區修改。
- 登入頁不再顯示 Admin 帳密。測試沙盒（免費玩全部街機、加測試金幣）只在本機打開 `?mode=admin-test` 才存在；用區域網路 IP 開發時，請改用 localhost。

## 重建與測試

```sh
python3 tools/build_r33.py                       # 重建 app/、server/、manifest、圖示（r33_evidence/build.json 記錄雜湊）
python3 tools/build_r33.py --only p10_layout --out /tmp/x   # 只套某個補丁，供開發
python3 r33_tests/run_release.py                 # R3.3 新測試，逐項依序執行（不要並行）
WQ33_APP=/path/index.html python3 r33_tests/test_layout.py  # 任何測試都可指定被測的 index.html
python3 tools/package_r33.py                     # 重新產生 PACKAGE_MANIFEST.json 與 SHA256SUMS.txt
```

新測試每項都同時跑「凍結的 R3.2（應失敗）」與「補丁後（應通過）」，證明測試真的能抓到問題。舊版測試仍可執行：`python3 r3_tests/run_release.py`、`r31_tests/run_all.py`、`r32_tests/run_release.py`、`arcade_tests/*`、`tests/*`。舊測試會覆寫自己的證據資料夾，執行後請用 `git checkout -- <證據資料夾>` 還原。

R3.3 新測試（Chromium，真實 DOM、IndexedDB、鍵盤與滑鼠／觸控事件）：

| 範圍 | 檔案 | 檢查數 |
| --- | --- | --- |
| 版面 N1–N4、N10、N12 | `test_layout.py`、`hit_test.py` | 357、260 |
| 家庭資料 WQ32-01／02、N11 | `p20_*` | 26、80、32、47 |
| 伺服器與離線 WQ32-03／04 | `p30_*` | 16、30、19 |
| 街機、音效、圖庫 N5／N9／N13b | `p40_*` | 53、59、45 |
| 學習與帳戶 N6／N7／N8／N13a | `test_p50_learning_account.py` | 150 |

整合結果見 `r33_evidence/final_runner.json`、`r33_evidence/*.log` 及 `r33_evidence/legacy_logs/`。

## 舊測試的處理

- `tests/harness.py`、`r32_tests/native_acceptance.py`：註冊時若有 `#register-grade` 就選小三（註冊現在必填年級）。
- `r32_tests/browser_new.py`、`r32_tests/server_native_http.mjs`：版本字串改為 R3.3。
- `r31_tests/characters_browser.py`：把「備份的 appVersion 恰好等於 R3.1.0」改為 R3.x 格式檢查（R3.2 原件上這一項已經失敗，與本輪無關）。
- `arcade_tests/r1_regression.py`（即 `tests/integration_checks.py`）有 10 項失敗，在凍結的 R3.2 原件上完全相同：是 R3 以前的舊斷言（28 項技能／84 個模板、3 個 R3 模板的輸入題），不是 R3.3 引入。

## 已知限制與未驗證

- **沒有真機驗證**：所有手機測試是 Chromium 的觸控與手機尺寸模擬（320、360、390、412 寬等）；iOS Safari、Android Chrome 的軟鍵盤、地址欄伸縮、「加入主畫面」都沒有實測。
- **沒有人耳驗證**：新增音效只以頻率與次數斷言，未經人聽。語音讀題的自動朗讀只以呼叫次數驗證。
- **沒有真人兒童、教師與真實默書相片 OCR 驗證**；教材仍待真人教師逐題覆核。
- 離線準備：只在 Chromium 以本機 HTTP 驗證；窄頻寬下 12 MB 安裝是否在 45 秒內完成未測。`tools/serve.ps1`（Windows 啟動器）沒有 ETag／壓縮、沒有 `/api/speech`，只增加了 `.webmanifest` 的 MIME 類型，也沒有在 Windows 實機執行。
- 家庭資料救援：只在 Chromium 以注入故障測試；救援回滾把媒體暫存在記憶體，媒體極大時有記憶體風險；沒有真實當機測試。IndexedDB 內早前遺留的孤兒媒體只在匯出及還原時過濾，不會主動掃除。
- 已存為空的舊帳戶 `water` 不會自動補回，只修新帳戶與訪客範圍。
- 測試沙盒在 `file:` 打開時仍可用（既有測試依賴）；任何人下載 HTML 後本機打開 `?mode=admin-test` 都能進入，只影響該本機獨立儲存。
- 發現但沒修：L31 提示列在 360×640、375×667 捲動位置為 0 時會蓋住答案輸入框中心；離線頁勾選「同意取得英文錄音」後按「準備離線教材」仍提示先勾選（R3.2 已存在，疑為重繪洗掉勾選）；浮動鈕在某些捲動位置仍會暫時疊到內容。
- 沒有完成：會員與雲端同步、內容審核、單檔拆分與圖片外置、六角色全動作、學習引擎整合與間隔重溫、測驗模式、字母拼讀教學、默書範圍匯入重做等，屬後續階段，見分析報告的升級路線。

## 檔案

新增：`tools/build_r33.py`、`tools/package_r33.py`、`originals/R3_2/`、`r33_src/`、`r33_tests/`、`r33_evidence/`、`app/manifest.webmanifest`、`app/icons/`。修改：`app/index.html`、`app/sw.js`、`server/local_server.mjs`、`tools/serve.ps1`、上節列出的測試檔，以及 README／清單檔。`GITHUB_UPLOAD_MANIFEST.json` 記錄的是 R3.2 上傳時的內容，保留不動。
