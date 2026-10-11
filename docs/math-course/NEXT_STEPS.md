# NEXT_STEPS — M2

## 下一次開啟先做

1. 以GitHub最新main為準，讀取PROJECT_STATE及KNOWN_ISSUES。
2. 在真實瀏覽器以390px手機、平板及桌面打開「數學 → 主題課堂」，檢查圖卡大小、按鈕、字體、朗讀及前後導覽。
3. 帶小一至小六各一名學生試用，觀察能否自行看圖理解；按照實際卡住的地方修改，不以程式測試數量代替可用性驗收。
4. 教師逐主題核對示例、教學深度、應用課與官方完整範圍的缺口。

## 技術

保留M1進度／原答案格式。修改course_visuals.js、course_visual.css或course_ui.js後執行 `python3 tools/build_math_m1.py`，再跑核心與visual_ui_test。正式部署、PWA快取更新、兩名孩子隔離及家庭備份還原仍須實機驗收。
