WordQuest R3.2 本輪漏洞檢查證據｜2026-09-30

先開啟 WordQuest_R3_2_Vulnerability_Audit_20260930.html。audit_results.json 是總結果。
4 個根因：日誌缺失救援被擋、刪孩子媒體殘留、選配語音限流競爭、离線準備硬停用。
原版沒有修改，ZIP 不是修正版。全部學員與媒體都是測試素材。

native_evidence、media_evidence、arcade_native_evidence、english_native_evidence、builtin_wallet_evidence：63 項原生檢查，60 通過、3 失敗。
server_evidence：2 個真實 HTTP 併發測試均失敗，屬同一限流根因；付費上游是替身。
data_evidence：6222 個新生成數學案例及獨立 Fraction 驗算；英文題目結構核對。
regression_rerun：原有 448 項核心／契約測試本輪另複本重跑，全通過；不能當成原生 UI 證明。
file_inventory_verified.json：1199 檔案 SHA-256 與格式檢查。
packaged_source_syntax.json：130 個 JS／片段、71 個 Python 按其情境解析。
syntax_results.json：40 個當前 HTML 內嵌 script 的 node --check。
dependency_audit：僅選配 OCR 現時依賴解析樹的 npm audit，0 公告不等於所有已建置 CDN／WASM 均沒有漏洞。

重現（僅隔離測試環境，切勿使用日常孩子資料）：
1. 本證據 ZIP 不重複附上 129 MB 原始 ZIP；需另備 WordQuest_R3_2_Complete.zip，SHA-256 見報告。
2. 安裝 Node、Python，以及 Playwright／Chromium（例如 npm install playwright，再安裝其瀏覽器）。
3. 在新工作目錄建 audit_work，將 reproduction 裏的 runner 複製至 audit_work；將本包的 native_evidence 及 media_evidence 也複製至 audit_work，供還原測試使用。
4. python3 audit_work/extract_current.py /absolute/path/WordQuest_R3_2_Complete.zip
5. 在另一終端進入 audit_work/program/WordQuest_R3_2，執行 node server/local_server.mjs（迴路 127.0.0.1:8765）。不需付費語音金鑰。
6. 設 WQ_AUDIT_CHROME 為 Chromium／Chrome 絕對路徑。若 Playwright 不在普通 module 搜尋路徑，設 WQ_AUDIT_PLAYWRIGHT 為其 package 絕對路徑。Chinese 字型自行安裝；這不影響保存測試。
7. 從工作目錄循序跑：
   node audit_work/generate_audit.cjs
   python3 audit_work/independent_math_audit.py
   node audit_work/english_data_audit.cjs
   node audit_work/native_audit.cjs
   node audit_work/native_media_audit.cjs
   node audit_work/native_arcade_audit.cjs
   node audit_work/native_english_audit.cjs
   node audit_work/native_builtin_wallet_audit.cjs
   node audit_work/server_race.mjs
   server_race.mjs 的相對 import 已按 audit_work 路徑安排；請保留指定目錄結構。
8. 原有回歸（可在原始套件另複本跑）為 r32_tests/arcade_regression.cjs、family_contracts.cjs、new_core.cjs、server_contracts.mjs。

每個 native runner 使用一次性合成家庭；native_audit 使用 audit_work/synthetic_profile 專用測試設定檔，重現前請在新工作目錄跑。
故障注入只涉及人造家庭；missing journal 不是真機斷電；viewport 不是真手機；鍵盤／Canvas／AudioContext smoke 不代表所有關卡或人耳聆聽。
重現 runner 提供執行時路徑參數；測試逻輯保留，原始執行檔亦附於 tested_runners。
