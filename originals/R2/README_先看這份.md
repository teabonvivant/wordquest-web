# WordQuest 英文＋數學＋街機 R2

## 開始使用

解壓整個ZIP，開啟 `START_HERE.html`，再按「開啟英文＋數學＋街機 R2」。成品位於 `app/index.html`，不需安裝Python或Node。
街機大堂預設「新街機」，「全部」可查看26款；確認投幣後再按開始，暫停與接續不重複收費。未開放也有全彩預覽。

Windows可用 `START_WINDOWS.cmd`（系統PowerShell，固定127.0.0.1:8765）；原啟動器未在Windows真機驗證。不需要管理員權限，不要為它關閉公司安全政策。

## 版本與來源

基礎：已交付 `WordQuest_V32_Maths_Integrated_R1_20260929.zip`。本版新增5款：遺跡郵差、雲島探險、星環巡航、燈塔深井、海港排球；保留原有21款及英文／數學整合。
從歷次對話取回玩法和缺陷記錄。V33原始ZIP及其審核ZIP仍無授權原始內容可讀。本版為新實作的R2，不是原樣復原V33，也未加入缺失的Maths0.1.3新角色原件。

## 資料保護

升級前先在舊程式分別匯出英文備份及數學備份；保留舊程式副本。不要覆蓋唯一備份。不同瀏覽器、網址、file路徑之間不會自動搬資料。
沿用R1的本機帳戶、孩子及arcadeV28格式；原有21款的最高分和有效未完成局面保留，新5款另記分。R1兩款代表遊戲已在真正介面建立局面，再以測試儲存接續到R2；不是讀取過用戶真實瀏覽器紀錄。
未知V33存檔不猜測轉換。ZIP不包含用戶電腦未匯出的個人學員資料。這仍是本機網頁，不是雲端同步或防作弊系統。

## 執行結果

本輪 555/555 個案例通過；另外 36/36 段JavaScript語法通過。
完整明細：`docs/街機R2_升級及驗證報告.html`、`arcade_evidence/summary.json`。
案例不是獨立功能數或真人趣味評分。故障案例使用明示夾具；沒有真學生數據。

## 檢查界線

真實Chromium DOM操作、原生AudioContext訊號；但載入用set_content，儲存／Web Locks／WebCrypto API為明示替身。未驗收原生重開瀏覽器持久化、原生跨分頁競爭、Windows啟動器、Safari、手機真機、真人聽感及學習效果。相機／OCR／第三方CDN不在本輪範圍。
數學仍是23個普通數學入門技能＋5個奧數主題，不是已完成小一至小六全課程。

## 檔案

- `app/index.html`：整合成品。
- `arcade_src/`：五款遊戲、音訊、宿主接駁及CSS。
- `arcade_tests/`、`arcade_evidence/`：本輪測試程式及證據。
- `docs/街機R2_開發交接.md`：架構、重建、測試及下一步。
- `originals/R1/`：本輪修改前的R1主程式、入口、manifest及舊工具。
- `originals/WordQuest_Program_and_Data_20260929/`：保留既有原始程式、圖像、報告、1,000項舊審核包等。
- `tests/`、`evidence/`、`docs/本輪套用及驗證報告.html`：R1歷史驗證，不與本輪重複累計。

## 開發重建

`python tools/build_arcade_r2.py` 或 `python tools/build.py` 重建R2。一般用戶不必執行。
原R1工具已封存；舊名稱build.py/make_delivery.py/package_release.py/verify_build.py會轉到R2入口，避免誤建回R1。
