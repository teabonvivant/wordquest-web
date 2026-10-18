# R3.21 三款學習遊戲：字母砲台・字母迷宮・字卡征途

分支 `r321-arc3`。設計書 `docs/R321_三款新遊戲設計書.md`，代理共同須知 `docs/R321_代理共同須知.md`。

## 檔案
- 共用核心 `r37_src/gx_core.js`（`WQ37GX`）：音效（WebAudio 合成＋音樂主題）、特效、觸控字母／數字盤、`GX.Learn`（學習項隊列、錯題回流 2–4 項後最多 2 次、關末以已答對項補間隔、星級＝首次答對率）、預習卡、答錯學習卡（≥2 秒）、結算卡（逐項報告）、暫停（聲音／音樂分開）、怎麼玩卡、外殼 `GX.shell`。
- 遊戲：`td_game.js`（`WQ37TD`）、`maze_game.js`（`WQ37Maze`）、`card_game.js`（`WQ37Card`）。
- Host 接入：`s10_core.js`（`R37_G3`、解鎖、取題、重溫、發獎、錯題寫入）、`s20_ui.js`（遊戲星入口、`r37G3Map`）、`s30_wiring.js`（`#lv/td|mz|cd`、`#g3/play`）、`s36_g3.css`。四個庫放在 `runner-game` 的 script 區塊內（`build_math_m1.py` 要求恰好 43 個原始 script）。
- 美術：`app/assets/r321/`（44 張 webp，Codex 生成；清單 `ASSETS.md`）。已加入 service worker 預快取。

## 進度與獎勵
軌道鍵 `td-en td-ma mz-en mz-ma cd-en cd-ma`（`r37LvKey(track,w,s)`）。關卡解鎖：同遊戲同科目上一關過關，或對應英文單元／數學關已過關，或 Admin。首次過關 +1 金幣、魔王關 +3、首次 5★ 再 +1；重玩不再給。答錯項目寫入既有錯題庫（`o.wrong`／`o.miss`）。

## 測試（`r37_tests/`）
`t40_gx_learn.js`（node，學習邏輯）、`t41_td.py`、`t42_maze.py`、`t43_card.py`（各遊戲，長；見檔頭參數）、`t44_g3_host.py`（host 整合，120 項）、`gx_fixture/`（獨立開發與測試用頁面）。證據截圖在 `r37_evidence/r321/`（不入 git）。

## 已知限制
- 最差幀 < 33ms 在 4× CPU 限速的無 GPU 單核環境無法證明（空白 canvas 對照也有同樣峰值）；需真機確認。
- QWERTY 字母盤鍵寬 30–35px（鍵高 ≥44px），符合 WCAG 2.2 AA 的 24px，未達 44px 寬。
- 聲音只驗證有觸發，未經真人聽感審核。
- 真人（6–12 歲）試玩尚未進行。
