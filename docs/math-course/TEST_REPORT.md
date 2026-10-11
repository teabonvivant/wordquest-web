# TEST_REPORT — HK-M1

日期：2026-10-11。實際測試環境：Node.js 22.16.0；Chromium 144.0.7559.96；Python Playwright。瀏覽器測試在本機隔離頁面執行，詳見下述限制。

| 測試 | 結果 | 證據 |
|---|---:|---|
| 核心資料／流程測試 | 15項通過，0失敗 | math_course_evidence/engine_results.json |
| 現行普通數學模板批改案例 | 385模板×40種子＝15,400案例通過 | 同上 |
| 瀏覽器主要流程 | 22項通過，0失敗 | math_course_evidence/browser_results.json |
| 16工具×2章節：顯示、重設、檢查、桌面與390px排版 | 32組通過，0失敗 | math_course_evidence/tools_results.json |
| 完整app行內腳本語法 | 48段通過 | math_course_evidence/syntax_results.json |

15,400案例是實際執行的生成與標準答案批改一致性測試，不是15,400條人工核定官方教學目標，也不是獨立教師審題。16工具的32組是顯示與基本操作煙霧測試，不代表每一種數學操作已全組合驗證。

主要流程驗證包括：六年級課堂數、星星教具實際完成、不把提示答對當獨立答對、首次答案不可覆寫、測驗期間無提示與解答、草稿序列化後回復相同題目、空白題確認、交卷後完整解說、零分文案、錯題重學入口、探索筆記、圓形圖活動界線、手機排版，以及R3.9實際數學按鈕、原奧數介面、英文及街機入口。以上瀏覽器路徑沒有未捕捉JS錯誤。

## 嚴格區分未測項目

瀏覽器政策不允許URL導航，故使用set_content載入原始HTML，Web Storage採明確的記憶體測試替身。沒有改動管理政策。未驗證HTTP/PWA、原生磁碟持久性、真實Android/iOS、正式Google登入、完整家庭還原、語音裝置與真實兒童學習成效。

程式測試通過不等於教材完整、教育局審批、無所有漏洞或符合商用驗收。範圍及未完成工作以KNOWN_ISSUES.md為準。

## 重跑

```sh
python tools/build_math_m1.py
node math_course_tests/engine_test.cjs
python math_course_tests/browser_test.py
python math_course_tests/tools_test.py
```

Python瀏覽器測試需要已安裝Playwright及Chromium；測試檔目前使用`/usr/bin/chromium`，其他系統請修改執行檔路徑。正常使用程式不需要Python／測試套件。

## 2026-10-11 GitHub 上傳前重跑

在本次上傳環境重新通過核心 15 項、15,400 次生成與批改案例、完整 app 48 段行內腳本及 Service Worker 語法檢查。40 個準備包檔案 SHA-256 及四個底本 Git blob 均已核對。證據：`math_course_evidence/github_upload_validation.json`。

本次環境未安裝 Playwright／Chromium，沒有重跑上文的 22 項瀏覽器與 32 組教具測試；其 JSON 和畫面保留為原交付階段證據。未驗證正式部署、真機及實際持久儲存。
