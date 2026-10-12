# 學霸星球數學 M3：先教，再練，再測

本版修正教學與題目不相配的問題，並新增32個讀圖／生活應用題型。

由 `START_HERE.html` 或 `app/index.html` 進入「數學 → 主題課堂」。獨立預覽是 `math_course_preview.html`。

- 每課明確列出示範題型；同課的練習與小測只考該範圍。
- 例題使用實際數字分步教，圖與題目對應，提供逐步提示及訂正解說。
- 分數採上下格輸入；主要流程收成跟我學、換你做、小測。
- 歷史答案和已保存的紀錄保留；未完成舊課不換題。

這是部分教材及流程修正版，不是全港學校試卷的等同模擬，也沒有宣稱補齊所有課程重點。

修改後執行：

```
python3 tools/build_math_m1.py
node math_course_tests/engine_test.cjs
node math_course_tests/pedagogy_test.cjs
node math_course_tests/visual_ui_test.cjs
```

`school_content.json` 是新增題目與158個章節範圍的可編輯來源；`school_bundle.js` 由建置產生。
詳細審查、測試與限制見 `docs/math-course/`。
