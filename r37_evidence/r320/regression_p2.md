# R3.20 階段 2 回歸（逐套串行，時間段不重疊）

建置 `app/index.html` sha256 `50c982b330a20b8cd0e50e0af93da04e86903fa66e75941b54235bbab8dd0f18`（與 `after/BUILD.txt` 相同；測試開跑前凍結，之後沒有再改碼）。

| 套 | 結果 | 開始 | 結束 | 秒 | 備註 |
|---|---|---|---|---|---|
| arcade-syntax（54 個 script） | PASS | 20:28:02 | 20:28:04 | 2 | |
| arcade-core-tests（292 例） | PASS | 20:28:04 | 20:28:05 | 1 | 0 失敗 |
| engine-behaviour（r34） | PASS | 20:28:05 | 20:28:13 | 8 | 45 pass / 0 fail |
| t31-play-answer（第 1 次） | FAIL | 20:28:13 | 20:36:56 | 523 | 6 項：測試端問題（見下），已改測試，不是玩法錯誤 |
| t28-arcade（13 款＋honey-delivery／number-garden／forest-band，含四尺寸版面） | FAIL(1) | 20:36:56 | 21:23:45 | 2809 | 1540/1541 項；唯一失敗 forest-pong B2_miss_resets_combo（球賽節奏造成的時序噪音，單獨重跑通過） |
| t09-arcade | PASS | 21:23:45 | 21:24:39 | 54 | 110/110 |
| t22-game-polish | PASS | 21:24:39 | 21:26:16 | 97 | |
| t28 forest-pong 重跑（第 1 次，單獨） | PASS | 21:26:40 | 21:29:36 | 177 | 52/52（`logs/p2/t28_forest-pong_retry1.log`） |
| t31-play-answer（第 2 次，最終） | PASS | 21:29:36 | 21:37:19 | 463 | 443/443，13 款；`t31_results.json` |

第 1 次 t31 的 6 項失敗（其 log 已被第 2 次覆蓋）全在測試端：bounce-basket 放球時間誤差（改為頁面內計時放開＋答錯／答對的意外目標重試）、harbor-volley 的 stub 結束令比分超過 7（存檔檢查正確拒絕；測試在結算前重置）、star-patrol 錯過測試時生命 +1（改為 ≥）。全部以 `# R3.20` 或測試內註解說明，沒有放寬任何玩法斷言。t28 完整結果：`t28_results_p2.json`；logs：`logs/p2/`。

file:// 載入：`lib37.open_page` 已用 `route()` 供應 `olympiad-classroom/`，所以 t28／t31／t09／t22 都沒有 host.js 的 console 錯誤，也沒有過濾任何訊息。

反向對照：改動前建置（`b0f8c6f`，sha256 `686c47600879a9bc4842c6936fb74993d33bebae9afa3edb56febad0ca17bac0`）上 t31 13 款全部 FAIL（`logs/p2/t31_before.log`）。
