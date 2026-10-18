# R3.20 回歸測試紀錄

建置：`/home/workspace/wordquest-web-dev/app/index.html`；逐套依序、單一瀏覽器；失敗最多再跑 2 次（共用機器有已知不穩定）。log：`r37_evidence/r320/logs/`。

| 套件 | 結果 | 嘗試 | 用時 | 開始 → 結束 | 建置 SHA256 | log |
|---|---|---|---|---|---|---|
| levels-math-unit | 通過 | 1（exit 0） | 3 s | 2026-10-18 08:44:22 → 2026-10-18 08:44:24 | `9e317962a869…` | `r37_evidence/r320/logs/levels-math-unit.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| en-content-unit | 通過 | 1（exit 0） | 0 s | 2026-10-18 08:44:24 → 2026-10-18 08:44:25 | `9e317962a869…` | `r37_evidence/r320/logs/en-content-unit.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| math-mark-unit | 通過 | 1（exit 0） | 0 s | 2026-10-18 08:44:25 → 2026-10-18 08:44:25 | `9e317962a869…` | `r37_evidence/r320/logs/math-mark-unit.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| morph-unit | 通過 | 1（exit 0） | 0 s | 2026-10-18 08:44:25 → 2026-10-18 08:44:25 | `9e317962a869…` | `r37_evidence/r320/logs/morph-unit.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| r319-toolTask | 通過 | 1（exit 0） | 0 s | 2026-10-18 08:44:25 → 2026-10-18 08:44:26 | `9e317962a869…` | `r37_evidence/r320/logs/r319-toolTask.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| arcade-syntax | 通過 | 1（exit 0） | 3 s | 2026-10-18 08:44:26 → 2026-10-18 08:44:28 | `9e317962a869…` | `r37_evidence/r320/logs/arcade-syntax.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| arcade-core-tests | 通過 | 1（exit 0） | 2 s | 2026-10-18 08:44:28 → 2026-10-18 08:44:31 | `9e317962a869…` | `r37_evidence/r320/logs/arcade-core-tests.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t01-shell-levels | 通過 | 1（exit 0） | 81 s | 2026-10-18 08:44:31 → 2026-10-18 08:45:52 | `9e317962a869…` | `r37_evidence/r320/logs/t01-shell-levels.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t02-math-levels | 通過 | 1（exit 0） | 37 s | 2026-10-18 08:45:52 → 2026-10-18 08:46:29 | `9e317962a869…` | `r37_evidence/r320/logs/t02-math-levels.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t03-parent-chars | 通過 | 1（exit 0） | 43 s | 2026-10-18 08:46:29 → 2026-10-18 08:47:12 | `9e317962a869…` | `r37_evidence/r320/logs/t03-parent-chars.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t04-games | 通過 | 1（exit 0） | 63 s | 2026-10-18 08:47:12 → 2026-10-18 08:48:15 | `9e317962a869…` | `r37_evidence/r320/logs/t04-games.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t05-admin-regression | 通過 | 1（exit 0） | 42 s | 2026-10-18 08:48:15 → 2026-10-18 08:48:57 | `9e317962a869…` | `r37_evidence/r320/logs/t05-admin-regression.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t07-visual-daily | 通過 | 1（exit 0） | 49 s | 2026-10-18 08:48:57 → 2026-10-18 08:49:45 | `9e317962a869…` | `r37_evidence/r320/logs/t07-visual-daily.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t08-integration-fx | 通過 | 1（exit 0） | 39 s | 2026-10-18 08:49:45 → 2026-10-18 08:50:24 | `9e317962a869…` | `r37_evidence/r320/logs/t08-integration-fx.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t09-arcade | 通過 | 1（exit 0） | 61 s | 2026-10-18 08:50:24 → 2026-10-18 08:51:25 | `9e317962a869…` | `r37_evidence/r320/logs/t09-arcade.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t10-fps-levels | 通過 | 1（exit 0） | 108 s | 2026-10-18 08:51:25 → 2026-10-18 08:53:13 | `9e317962a869…` | `r37_evidence/r320/logs/t10-fps-levels.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| fps-module | 通過 | 2（exit 1, 0） | 271 s | 2026-10-18 08:53:13 → 2026-10-18 08:57:44 | `9e317962a869…` | `r37_evidence/r320/logs/fps-module.try2.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| runner-module | 通過 | 1（exit 0） | 175 s | 2026-10-18 08:57:44 → 2026-10-18 09:00:39 | `9e317962a869…` | `r37_evidence/r320/logs/runner-module.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t11-learn-card | 通過 | 1（exit 0） | 60 s | 2026-10-18 09:00:39 → 2026-10-18 09:01:39 | `9e317962a869…` | `r37_evidence/r320/logs/t11-learn-card.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t12-dictation-import | 通過 | 1（exit 0） | 73 s | 2026-10-18 09:01:39 → 2026-10-18 09:02:52 | `9e317962a869…` | `r37_evidence/r320/logs/t12-dictation-import.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t13-morph-import | 通過 | 1（exit 0） | 12 s | 2026-10-18 09:02:52 → 2026-10-18 09:03:04 | `9e317962a869…` | `r37_evidence/r320/logs/t13-morph-import.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t14-morph-ui | 通過 | 1（exit 0） | 79 s | 2026-10-18 09:03:04 → 2026-10-18 09:04:23 | `9e317962a869…` | `r37_evidence/r320/logs/t14-morph-ui.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t15-dictation-save | 通過 | 1（exit 0） | 157 s | 2026-10-18 09:04:23 → 2026-10-18 09:07:00 | `9e317962a869…` | `r37_evidence/r320/logs/t15-dictation-save.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t17-legacy-fit | 通過 | 1（exit 0） | 229 s | 2026-10-18 09:07:00 → 2026-10-18 09:10:48 | `9e317962a869…` | `r37_evidence/r320/logs/t17-legacy-fit.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t18-dictation-study | 通過 | 1（exit 0） | 113 s | 2026-10-18 09:10:48 → 2026-10-18 09:12:41 | `9e317962a869…` | `r37_evidence/r320/logs/t18-dictation-study.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t19-save-landing | 通過 | 4（exit 1, 1, 1, 0） | 870 s | 2026-10-18 09:12:41 → 2026-10-18 12:01:35 | `9e317962a869…` | `r37_evidence/r320/logs/t19-save-landing.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） 重測：第一輪 3 次嘗試失敗（建置 9e317962a869…），其後在同一建置重跑（9e317962a869…） |
| t20-brand-ui | 通過 | 1（exit 0） | 161 s | 2026-10-18 09:24:07 → 2026-10-18 09:26:48 | `9e317962a869…` | `r37_evidence/r320/logs/t20-brand-ui.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t21-webkit-smoke | 通過 | 4（exit 1, 1, 1, 0） | 224 s | 2026-10-18 09:26:48 → 2026-10-18 12:02:49 | `9e317962a869…` | `r37_evidence/r320/logs/t21-webkit-smoke.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） 重測：第一輪 3 次嘗試失敗（建置 9e317962a869…），其後在同一建置重跑（9e317962a869…） |
| t22-game-polish | 通過 | 1（exit 0） | 117 s | 2026-10-18 09:29:18 → 2026-10-18 09:31:15 | `9e317962a869…` | `r37_evidence/r320/logs/t22-game-polish.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t23-consistency | 通過 | 1（exit 0） | 268 s | 2026-10-18 09:31:15 → 2026-10-18 09:35:42 | `9e317962a869…` | `r37_evidence/r320/logs/t23-consistency.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t24-learning-loop | 通過 | 1（exit 0） | 38 s | 2026-10-18 09:35:42 → 2026-10-18 09:36:20 | `9e317962a869…` | `r37_evidence/r320/logs/t24-learning-loop.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t25-dz-syllable | 通過 | 1（exit 0） | 25 s | 2026-10-18 09:36:20 → 2026-10-18 09:36:45 | `9e317962a869…` | `r37_evidence/r320/logs/t25-dz-syllable.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t26-r319-ui | 通過 | 1（exit 0） | 289 s | 2026-10-18 09:36:45 → 2026-10-18 09:41:34 | `9e317962a869…` | `r37_evidence/r320/logs/t26-r319-ui.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t27-r319-teach | 通過 | 1（exit 0） | 54 s | 2026-10-18 09:41:34 → 2026-10-18 09:42:28 | `9e317962a869…` | `r37_evidence/r320/logs/t27-r319-teach.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t28-arcade-r320 | 通過 | 2（exit 1, 0） | 4569 s | 2026-10-18 09:42:28 → 2026-10-18 10:58:37 | `9e317962a869…` | `r37_evidence/r320/logs/t28-arcade-r320.try2.log`（失敗嘗試的 log 同目錄 `.tryN.log`） retry = subset forest-pong |
| t29-runner-gate | 通過 | 1（exit 0） | 5 s | 2026-10-18 10:58:37 → 2026-10-18 10:58:42 | `9e317962a869…` | `r37_evidence/r320/logs/t29-runner-gate.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t30-fps-focus | 通過 | 1（exit 0） | 47 s | 2026-10-18 10:58:42 → 2026-10-18 10:59:29 | `9e317962a869…` | `r37_evidence/r320/logs/t30-fps-focus.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| arcade-browser | 通過 | 1（exit 0） | 19 s | 2026-10-18 10:59:29 → 2026-10-18 10:59:47 | `9e317962a869…` | `r37_evidence/r320/logs/arcade-browser.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| arcade-safety | 通過 | 1（exit 0） | 20 s | 2026-10-18 10:59:47 → 2026-10-18 11:00:07 | `9e317962a869…` | `r37_evidence/r320/logs/arcade-safety.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| arcade-compat | 通過 | 1（exit 0） | 24 s | 2026-10-18 11:00:07 → 2026-10-18 11:00:31 | `9e317962a869…` | `r37_evidence/r320/logs/arcade-compat.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| r1-regression | **失敗** | 3（exit 2, 2, 2） | 155 s | 2026-10-18 11:00:31 → 2026-10-18 11:03:06 | `9e317962a869…` | `r37_evidence/r320/logs/r1-regression.try3.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t16-dictation-real | 通過 | 1（exit 0） | 2643 s | 2026-10-18 11:03:06 → 2026-10-18 11:47:09 | `9e317962a869…` | `r37_evidence/r320/logs/t16-dictation-real.try1.log`（失敗嘗試的 log 同目錄 `.tryN.log`） |
| t06-live-admin | 未跑：不適用（需要正式網站及 WQ_ADMIN_PW，本輪不部署） | — | — | — | — | — |

完整建置 SHA256：`9e317962a869e9c41fdfc1238b686b5021714da1954a0e32c7c7e3c587f50a01`
通過 41／42；未跑 1（見表）。逐套串行：每套的「開始 → 結束」時段互不重疊。

## 說明（第 3 輪）

- **建置**：表內全部用同一建置（SHA256 見上）。第 3 輪改碼後重拍 after、重跑 perf／離線／全套回歸；沒有用舊建置的結果冒充。
- **t28**：第 1 次完整跑 2524/2525（forest-pong `B2_miss_resets_combo`，已知不穩定），失敗款重跑 `t28_results_retry.json` 通過；版面 C2／C3／C4／K1／R1／C5（含新增的重疊／觸控工具鈕斷言與反向對照）全過。
- **fps-module**：第 1 次失敗、第 2 次通過（共用機器不穩定）。
- **t19-save-landing**：整套回歸時 3 次嘗試都失敗（「登入後草稿自動儲存」一組）；之後在同一建置單獨重跑 126/126 通過，改動前建置（R3.19）也是 126/126（`_team_runs/r320-p1/work/r3/t19_before.log`、`t19_after.log`）。失敗集中在 09:10–09:20 UTC，原因未查明；與街機（只改了 s70）無關。以重測結果計，但逐次記錄保留在表內（`.first-run.tryN.log`）。
- **t21-webkit-smoke**：30/57 的原因找到了——測試固定使用埠 8791，而這台機器上另一個專案的預覽伺服器正佔用該埠，每一頁都回 404（log 內 `Error response / 404`）。改為向系統要空閒埠（`# R3.20`），重跑 57/57。這不是 WebKit 版本問題，也不是本階段改動造成。
- **r1-regression**：失敗（`completed-home` 逾時），改動前建置（R3.19）同樣失敗，log 在 `before_regression/r1-regression.before.log`；屬數學外掛，本階段沒有動。
- **t06**：不適用（需要正式網站）。
