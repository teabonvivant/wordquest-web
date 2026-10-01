# 來源與第三方依賴

本輪沒有包含第三方OCR二進制或字型檔；離線OCR是使用者明示選擇才執行的下載流程。既有原版資料與圖像作使用者專案歷史保留，未新增任何不明來源的商用授權聲明。

普通數學沿原有EDB2017單元索引擴充原創基礎選段，不代表香港教育局認可教材、不代表完成整個單元。
https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/ma/curr/pmc2017_tc.pdf

Tesseract.js固定API版本5.1.1（Apache-2.0）與全部核心變體的本地路徑規則：
https://github.com/naptha/tesseract.js/blob/v5.1.1/docs/local-installation.md
https://github.com/naptha/tesseract.js/blob/v5.1.1/package.json
https://github.com/naptha/tesseract.js/blob/v5.1.1/src/worker-script/index.js
下載的實際資源適用各上游授權；引擎API固定版本不等於所有遠端模型URL永不改變。下載完成的SHA-256記錄用作完整性核對，不冒充上游數字簽署。

Microsoft Speech服務介面與可用聲線參考（是否可用視帳戶／區域而定）：
https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
https://learn.microsoft.com/azure/ai-services/speech-service/language-support

Service Worker／Cache API部署說明：
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
https://developer.mozilla.org/en-US/docs/Web/API/Cache

上述為設計依據，不是本套件已在各種瀏覽器完成端到端驗收的證據。
