# 學霸星球 SmartQuest Planet R3.7 · 先看這份

先在舊版匯出「家庭完整備份」，再解壓整個ZIP。開啟 START_HERE.html；一般使用不用安裝Python。

R3.7（本版）：星系主頁（六個星球）、英文／數學／奧數闖關、全站測試只剩選擇題與填充題、家長 5 級難度、新遊戲「字母獵場」（第一身射擊）與「星際跑酷」、12 個角色與每日任務。詳見 README_R3_7.md、docs/R3_7_審查與改動報告.md。沒有真機、真人兒童、教師審核驗證，也不是商用版。重建：python3 tools/build_r37.py（底版 R3.6 = commit bd28b55）　新測試：r37_tests/t01…t05（WQ33_APP=app/index.html python3 r37_tests/t01_shell_levels.py）

--- 以下是 R3.6 及更早的說明（歷史資料） ---

先在舊版匯出「家庭完整備份」，再解壓整個ZIP。開啟 START_HERE.html；一般使用不用安裝Python。

完整使用及限制：README_R3_6.md（學習規則、星星與金幣）、README_R3_5.md（文字、首次使用、練習流程與默書練習）、README_R3_4.md（街機手感與手機玩法）、README_R3_3.md（止血版）。
R3.6 在 R3.5 之上照 15 項要求改：首頁大圖案、學習沒有時限、每課 8 字加 20 題「考考你」、5 星才有金幣、26 款遊戲各有價錢、數學與奧數分開、改名「學霸星球 SmartQuest Planet」、Admin 測試帳戶（只限本機）；沒有真機、真人兒童、教師審核驗證，也不是商用版。報告：docs/R3_6_審查與改動報告.md。
R3.5 在 R3.4 之上改寫全站文字，修好首次使用、英文課堂、遊戲街機、默書練習和數學的問題，並把默書定位為練習；沒有真機、真人兒童、教師審核驗證，也不是商用版。報告：docs/R3_5_審查與改動報告.md。
R3.4 在 R3.3 之上改良 26 款街機與手機橫屏玩法，沒有真機、真人兒童、教師審核驗證，也不是商用版。
R3.3 是止血版：修好 R3.2 審查的四項問題與手機版面問題；沒有真機、真人兒童、教師審核及真實默書相片OCR驗證。
重建：python3 tools/build_r36.py（需先設定 WQ36_BASE_DIR 指向 R3.5 檔案樹）　新測試：python3 r36_tests/run_r36.py（R3.5：python3 r35_tests/run_release.py；R3.4：python3 r34_tests/run_release.py；R3.3：python3 r33_tests/run_release.py）
早期README及報告是歷史資料，不代表本輪結果。
