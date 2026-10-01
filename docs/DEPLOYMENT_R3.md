# 啟動、離線資源及固定聲線

## 一般使用
解壓後開 START_HERE.html。基本學習與街機不需要Python。更可靠的本機資料來源應使用固定localhost網址；本套件附START_WINDOWS.cmd（Windows PowerShell靜態伺服器）或Node伺服器，均只綁定127.0.0.1。Windows啟動器未在真機驗收，不保證所有公司安全政策允許執行。

Windows靜態啟動器服務app/而非整個壓縮包。禁止任意Host、向上路徑、連接點／符號連結，附WASM MIME；不提供語音API。它沿用 http://127.0.0.1:8765/app/index.html。

可選Node20+：
```
node server/local_server.mjs
```
開啟 http://127.0.0.1:8765/index.html。同一來源仍請先備份再換啟動方式；SW快取路徑不同，不假設自動搬移。

## 固定聲線：可選，需要自己配置
只在本機shell設環境變數AZURE_SPEECH_KEY及AZURE_SPEECH_REGION，再啟動START_WITH_VOICE.cmd或Node指令。不要把金鑰寫進HTML、上傳公開倉庫或發到聊天。程式不包含任何真實金鑰。

家長頁選固定服務並明示同意。介面只接受同網站/api/路徑；附帶Node服務為/api/speech。語音請求只在同來源JSON、自訂標頭、已配置服務下處理；有長度、大小、逾時、併發與速率限制。請求含需朗讀的教材文字，會傳送到家長選擇的Microsoft服務。未配置時顯示服務未配置，預設仍是裝置聲線，不宣稱任何裝置都有指定粵語或英式聲線。

固定聲線的伺服器請求處理器已用合成請求／假上游檢查，未呼叫真實付費API、未試聽真人自然度。API金鑰與流量計費由帳戶持有人管理；沒有代為註冊或啟用付費服務。

## 離線OCR準備
在HTTPS或localhost開啟，家長頁按「準備離線OCR」，閱讀下載確認；程式會按清單下載Tesseract.js5.1.1、worker、全部4種核心JS/WASM與英文traineddata.gz，共11件資源。先下載至暫存快取，逐件檢查狀態、大小、魔數和SHA-256；全部成功才切換有效版本。中途失敗不把半套檔案當成已安裝。

ZIP沒有包含以上大型第三方二進制。執行環境的外部下載失敗，沒有以空白文件冒充模型。完整下載、首次安裝、斷網OCR及Service Worker更新仍待真實網絡／瀏覽器驗收，不能保證首次完全離線辨識。程式核心及已內嵌圖片不依賴這些OCR資源。

正式離線測試：首次連線準備成功後，關閉網站再開，斷網，用已知答案的印刷英文照片核對結果。切勿將手寫或特殊字體的結果誤當支援保證；家長仍須核對辨識詞語。

## 公開部署限制
這是本機／試用交付，不是已完成多租戶商用平台。附帶伺服器不能直接改綁0.0.0.0公開使用；公網站還要實作服務端登入授權、個資政策、API濫用保護、備援、HTTPS及真實跨裝置儲存。沒有以本機家長驗證冒充服務端安全。

## 開發重建
```
python tools/build_curriculum_r3.py
python tools/build_r3.py
python r3_tests/run_release.py
```
測試依賴Python 3、BeautifulSoup、Playwright及Chromium、Node。測試夾具中的合成名字／密碼只供測試。一般用家不需要安裝這些開發工具。某些舊歷史測試保留原路徑，只作版本證據；本輪可重跑入口為r3_tests。
