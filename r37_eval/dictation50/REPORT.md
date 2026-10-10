# 默書上傳及辨識（家長端 #range-new）— 50 份真實默書範圍評測報告

評測日期 2026-10-10 · 受測版本：commit `32f44ec` 的 `app/index.html` 凍結副本（SHA-256 `602a18a4d3a8fcb0…`）· 評測員 worker_eval（只量度，沒有改任何產品程式）

> **相片全部是合成相片，不是真手機相片。** 見第 1.2 節及第 5 節。

## 0. 結論（先看這裏）

| | 字詞辨識 /25 | 詞典及詞形 /25 | 預選準確 /25 | 易用及流暢 /25 | **總分 /100** |
|---|---|---|---|---|---|
| 貼文字（50 份） | 18.6 | 16.9 | 16.0 | 18.6 | **70.1** |
| 拍照（50 份，合成相片） | 18.1 | 18.9 | 15.9 | 19.6 | **72.5** |
| 兩者平均（100 次實測） | 18.3 | 17.9 | 16.0 | 19.1 | **71.3** |

按類型：詞語表 57.9、短文 86.9、混合 81.5（滿分 100）。

**回答用戶的三個問題**

1. **方便、容易用嗎？** 短文、句子、一般單字表很順：到第 2 步貼文字只需 2 次、拍照只需 1 次點擊，貼文字不足 1 秒，拍照（本機 tesseract）約 3 秒，手機及桌面版固定操作列都在首屏，沒有任何 console error。
   但**香港學校最常見的兩種詞表格式處理得差**：(a) 詞組（do a jigsaw puzzle、go cycling、say sorry to…）、(b) 「英文 ＋ 中文」同一行。貼文字有 14 份總分低於 60，全部屬這兩類；拍照有 11 份低於 60。
2. **會不會有很多字辨識不到？** 單字不會：OCR 原文逐字命中 94%（好／一般相片 99%／99%；刻意較差的相片 76%）。
   問題在「整項」：老師要默的整個字詞或詞組在候選卡中完整出現的比例只有 **74%（貼文字）／72%（拍照）**；其中單字 87%／86%，詞組只有 37%／19%（每份平均）。若不計 a/an/the、逐字計，是 100%／92%。
3. **評分是否可信？** 成績明顯「兩頭大」：貼文字總分中位數 84、平均 70；整項命中率低於 50% 的有 14 份（貼文字）／12 份（拍照）：貼文字的 14 份全是詞組表或中英對照表；拍照的 12 份中 7 份是這兩類格式（#13、14、15、16、19、20、21），3 份是編號／行首標點殘留令整行被排除（#02、03、18，見漏洞 7），2 份（#36、#48）是較差相片 OCR 失敗。「平均 71」其實是「大部分 85–95 分、少數格式幾乎用不了」。

**最嚴重的問題（詳見第 4 節）**：①「儲存範圍」在 10／50 份貼文字範圍上無聲失敗；②「英文 中文」同行令中文黏進英文欄；③詞組被拆成單字，詞組頭的 do／go／a 被當基本字藏起；④標題、欄名、指示語被預選成單字（43／50 份貼文字範圍）；⑤每個題庫沒有的字都要逐個「核對」（平均每份約 8–9 個，每個 3–4 點擊）。

## 1. 方法

### 1.1 資料：50 份真實默書範圍
全部取自 2026-10-10 取得的公開文件，原文逐字錄入 `build_sets.py`，每份記下網址、授權說明及備註（`sets/NN_*.json`）。
未能取得的來源如實不用：TMGPS P5 頁（被 Cloudflare 擋住，未嘗試繞過）、新加坡某校 PDF（只回傳網頁）、Chiu Sheung P6（只回傳網頁）。

| 類型 | 份數 | 來源 |
|---|---|---|
| 詞語表 | 25 | 香港小學公開默書／詞彙表 21 份（Po Yan Oblate PS、Lau Tak Yung Memorial PS、Tung Koon School、Wong Yiu Nam PS、tkokt.edu.hk 詞彙庫）；Dolch 前級／初級各 1；英國 National Curriculum 附錄 1 Year 3-4 及 5-6 法定拼字表各 1 |
| 短文／句子 | 15 | 香港學校默書句子或段落 7 份；Project Gutenberg 公有領域 8 份（McGuffey 初級讀本、Beatrix Potter《Peter Rabbit》、Aesop 寓言 5 篇、Andersen《The Real Princess》）|
| 混合 | 10 | 香港學校整張默書紙（詞表＋句子＋動詞表／補充）10 份 |

年級（香港學校來源按原文件；Gutenberg／Dolch／英國表的年級是評測員指定，已在各 json 註明）：P1 8、P2 4、P3 8、P4 11、P5 12、P6 7 份。
香港學校來源 38 份，其餘 12 份為海外／公有領域。**沒有找到 P6 的香港默書紙**，P6 只有詞彙庫兩份加英國表及寓言。

**target（老師會默的字詞）定義**（固定、可重現）：詞語表＝表上全部項目（詞組算整個）；動詞表＝每一格；
句子／短文＝字母數 ≥3、不在 `V20.COMMON`（App 自己的基本字表）、不是人名地名、去重（不分大小寫）的字詞。
來源沒有粗體生字標示，所以沒有使用「以來源為準」這一項。標題、編號、分數、指示語一律不是 target。
注意：這個規則與 App 的「略過基本字」用同一張表，所以短文的 precision 對 App 略有利（見第 5 節）。

<details><summary>50 份清單</summary>

| # | id | 類型 | 年級 | 目標字數 | 來源（網址）|
|---|---|---|---|---|---|
| 01 | poyan_p1_vocab | 詞語表 | P1 | 10 | www.poyan.edu.hk/CustomPage/125/%E4%B8%8BP.1_Dictation_Exam.pdf |
| 02 | lty_p1_d1_vocab_hfw | 詞語表 | P1 | 10 | www.ltyschool.edu.hk/dev_module/upload_files/document/23-24_2nd_Term_P.1_Dict_ |
| 03 | lty_p1_d5_vocab_hfw | 詞語表 | P1 | 10 | www.ltyschool.edu.hk/dev_module/upload_files/document/23-24_2nd_Term_P.1_Dict_ |
| 04 | dolch_preprimer | 詞語表 | P1 | 40 | www.mrsperkins.com/files/dolchpre.pdf |
| 05 | dolch_primer | 詞語表 | P2 | 52 | www.mrsperkins.com/files/dolchpri.pdf |
| 06 | tkokt_p2_jobs | 詞語表 | P2 | 10 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P2%20Vocabulary%20Bank(new).pdf |
| 07 | tkokt_p2_seasons | 詞語表 | P2 | 10 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P2%20Vocabulary%20Bank(new).pdf |
| 08 | tkokt_p3_beach | 詞語表 | P3 | 10 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P3%20Vocabulary%20Bank(new).pdf |
| 09 | tkokt_p3_community | 詞語表 | P3 | 10 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P3%20Vocabulary%20Bank(new).pdf |
| 10 | tkokt_p3_countryside | 詞語表 | P3 | 10 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P3%20Vocabulary%20Bank(new).pdf |
| 11 | lty_p3_d1_vocab | 詞語表 | P3 | 5 | www.ltyschool.edu.hk/dev_module/upload_files/document/19-20_2nd_term_P3_Dict_H |
| 12 | tks_p3_vocab_quiz | 詞語表 | P3 | 8 | www.tks.edu.hk/sites/default/files/sites/default/files/24253rd/Dictation%20Boo |
| 13 | tks_p4_u1_target | 詞語表 | P4 | 10 | www.tks.edu.hk/sites/default/files/sites/default/files/25261st/P4dict.pdf |
| 14 | tks_p4_u2_target | 詞語表 | P4 | 10 | www.tks.edu.hk/sites/default/files/sites/default/files/25261st/P4dict.pdf |
| 15 | tkokt_p4_hkfood | 詞語表 | P4 | 16 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P4%20Vocabulary%20Bank(new1).pdf |
| 16 | tkokt_p4_scenic | 詞語表 | P4 | 12 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P4%20Vocabulary%20Bank(new1).pdf |
| 17 | wynps_p5_d1_adverbs | 詞語表 | P5 | 10 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 18 | wynps_p5_d4_clothing | 詞語表 | P5 | 10 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 19 | tks_p5_t1_u2_places | 詞語表 | P5 | 10 | www.tks.edu.hk/sites/default/files/sites/default/files/25261st/P5dict.pdf |
| 20 | tks_p5_t2_u6_chores | 詞語表 | P5 | 10 | www.tks.edu.hk/pdf/Edict/25262nd/Dictation%20Booklet_%20English_P5_second%20te |
| 21 | tkokt_p5_weather | 詞語表 | P5 | 24 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P5%20Vocabulary%20Bank(new).pdf |
| 22 | tkokt_p6_appearance | 詞語表 | P6 | 22 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P6%20Vocabulary%20Bank(new).pdf |
| 23 | tkokt_p6_clothing | 詞語表 | P6 | 24 | www.tkokt.edu.hk/CustomPage/85/VocabularyBank/P6%20Vocabulary%20Bank(new).pdf |
| 24 | nc_year34_words | 詞語表 | P4 | 109 | www.st-marysfields.leicester.sch.uk/content/uploads/sites/28/2024/06/national- |
| 25 | nc_year56_words | 詞語表 | P6 | 104 | www.st-marysfields.leicester.sch.uk/content/uploads/sites/28/2024/06/national- |
| 26 | poyan_p1_sentences | 短文 | P1 | 26 | www.poyan.edu.hk/CustomPage/125/%E4%B8%8BP.1_Dictation_Exam.pdf |
| 27 | mcguffey_lesson31 | 短文 | P2 | 32 | www.gutenberg.org/ebooks/14640 |
| 28 | potter_peter_rabbit | 短文 | P3 | 50 | www.gutenberg.org/ebooks/14838 |
| 29 | aesop_hare_tortoise | 短文 | P4 | 51 | www.gutenberg.org/ebooks/21 |
| 30 | aesop_lion_mouse | 短文 | P5 | 55 | www.gutenberg.org/ebooks/21 |
| 31 | aesop_north_wind_sun | 短文 | P6 | 56 | www.gutenberg.org/ebooks/21 |
| 32 | aesop_oak_reeds | 短文 | P6 | 39 | www.gutenberg.org/ebooks/21 |
| 33 | aesop_milkwoman_pail | 短文 | P6 | 53 | www.gutenberg.org/ebooks/21 |
| 34 | andersen_real_princess | 短文 | P6 | 60 | www.gutenberg.org/ebooks/1597 |
| 35 | poyan_p4_2324_sentences | 短文 | P4 | 37 | www.poyan.edu.hk/CustomPage/175/ENG/2_P4_4.exam.pdf |
| 36 | poyan_p4_2526_sentences | 短文 | P4 | 38 | www.poyan.edu.hk/CustomPage/200/2526_T4_P4_Dictation.pdf |
| 37 | wynps_p5_d2_passage | 短文 | P5 | 41 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 38 | wynps_p5_d4_passage | 短文 | P5 | 28 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 39 | wynps_p5_d6_passage | 短文 | P5 | 37 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 40 | tks_p5_t2_u5_text | 短文 | P5 | 20 | www.tks.edu.hk/pdf/Edict/25262nd/Dictation%20Booklet_%20English_P5_second%20te |
| 41 | lty_p1_d1_full | 混合 | P1 | 14 | www.ltyschool.edu.hk/dev_module/upload_files/document/23-24_2nd_Term_P.1_Dict_ |
| 42 | lty_p1_d4_full | 混合 | P1 | 15 | www.ltyschool.edu.hk/dev_module/upload_files/document/23-24_2nd_Term_P.1_Dict_ |
| 43 | poyan_p1_full | 混合 | P1 | 36 | www.poyan.edu.hk/CustomPage/125/%E4%B8%8BP.1_Dictation_Exam.pdf |
| 44 | lty_p3_d1_full | 混合 | P3 | 31 | www.ltyschool.edu.hk/dev_module/upload_files/document/19-20_2nd_term_P3_Dict_H |
| 45 | lty_p3_d4_full | 混合 | P3 | 30 | www.ltyschool.edu.hk/dev_module/upload_files/document/19-20_2nd_term_P3_Dict_H |
| 46 | poyan_p4_2223_full | 混合 | P4 | 91 | www.poyan.edu.hk/CustomPage/162/eng/2022-23__2nd_Semester_P4_Dictation_1.pdf |
| 47 | poyan_p4_2526_full | 混合 | P4 | 72 | www.poyan.edu.hk/CustomPage/200/2526_T4_P4_Dictation.pdf |
| 48 | wynps_p5_d5_full | 混合 | P5 | 37 | www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_eng |
| 49 | tks_p5_t1_u1_full | 混合 | P5 | 53 | www.tks.edu.hk/sites/default/files/sites/default/files/25261st/P5dict.pdf |
| 50 | tks_p4_u2_full | 混合 | P4 | 44 | www.tks.edu.hk/sites/default/files/sites/default/files/25261st/P4dict.pdf |

</details>

### 1.2 兩種輸入
* **貼文字**：`raw_text` 原樣貼入「或直接貼上文字」（取自 PDF 文字層的複製貼上次序，多欄表欄序交錯，與家長自己複製出來的一樣）。
* **拍照（合成）**：`mkphoto.py` 用 PIL 把版面排成默書紙（印刷版面，如兩欄表），再模擬手機拍攝：旋轉 ±3°、透視（一邊收窄）、光暗不均（較差的加陰影帶）、模糊、降解像度、顆粒噪點、JPEG 壓縮；亂數種子＝id。
  字體 9 款（Liberation Sans/Serif、C059 學校襯線、DejaVu Sans/Serif、Nimbus Sans、URW Bookman、Carlito、Z003 草書體）；**本機沒有 Comic／手寫體**，Z003 只是「有手寫感」的代用。
  條件：好 25 份、一般 13 份、**較差 12 份**（陰影、斜拍、約 0.78 倍縮放、JPEG q55）。代表輸入圖見 `shots/SYNTHETIC_INPUT_*.jpg`。
* 兩種輸入都經 App 正常流程：第 1 步 → 自動辨認 → 第 2 步（預設「3+」、「略過基本字」開）。OCR 由 r35 的 stub 把 App 處理後的影像交給**本機 native tesseract 5.3**（不是 App 內的 tesseract.js）。

### 1.3 量度與腳本化的「家長」
每份、每種輸入在**兩個全新頁面**各跑一次（OCR 結果快取，兩次相同）：
* **流程 A（接受預選）**：不改選字，只「核對」被擋住的卡（✎→剔→保留修改），按「下一步」、剔「我已對照原稿」、按「儲存範圍」，檢查是否真的新增了範圍，並讀出實際儲存的字。
* **流程 B（細心家長）**：先比較三種篩選（預設／字母數不限／不限＋基本字不略過）所需點擊，選最省的；再取消不要的卡、加回被略過的、打字補上不存在的（「＋自己加入」）、遇多義字選第一個意思、核對、儲存。所有點擊都是真的 Playwright 點擊。
* 每步記錄：全部候選卡狀態（`s50`）、與 target 比對（不分大小寫、詞組整個）、`s55Lemma`、雜訊分類、版面（固定列是否在首屏、有否橫向捲動、字卡中心點擊命中什麼）、console error。
* 桌面 1440×900 另抽 5 份（04、15、28、37、46）實測並截圖；手機 390×844 全部 100 次都量度，同樣 5 份有截圖（`shots/`）。

### 1.4 評分（100 分，每次實測各自計分再取平均）
| 項目 | 分 | 計法 |
|---|---|---|
| 字詞辨識 | 25 | 25 × 整項命中率（target 整個字／詞組以同一字串出現在任何候選卡，含被略過者；不分大小寫）。拍照另列 OCR 原文逐字命中，**不入分** |
| 詞典及詞形 | 25 | 25 ×（0.6 × 找到的 target 中「有中文意思可用」〔卡上有中文，或詞典有多個義項待選〕的比例 ＋ 0.4 × 詞形變化 target 中「已認出、不標題庫沒有、有中文」的比例）；沒有詞形 target 時全用前者 |
| 預選準確 | 25 | 25 × 預選 F1（precision、recall 都用整項嚴格比對）。改成 target 所需點擊另列 |
| 易用及流暢 | 25 | 10 ×（1 − (接受預選到成功儲存的點擊 − 4〔拍照〕或 5〔貼文字〕) / 40)，儲存失敗得 0；＋5 × 時間（貼文字 ≤2 秒滿分；拍照以本機 OCR 秒數，≤5 秒滿分，30 秒 0 分）；＋3 固定列在首屏 ＋1 無橫向捲動 ＋1 無 console error；＋5 細心家長流程能成功儲存 |

「易用及流暢」只量度流程本身；格式處理得差但流程順暢的範圍（例如全部是詞組的表）這一項仍然很高，差在前三項。

## 2. 結果

### 總分

|  | 份數 | 字詞辨識 /25 | 詞典詞形 /25 | 預選準確 /25 | 易用流暢 /25 | 總分 /100 |
|---|---|---|---|---|---|---|
| 貼文字 | 50 | 18.6 | 16.9 | 16.0 | 18.6 | 70.1 |
| 拍照（合成相片） | 50 | 18.1 | 18.9 | 15.9 | 19.6 | 72.5 |
| 兩者平均 | 100 | 18.3 | 17.9 | 16.0 | 19.1 | 71.3 |

### 按類型

| 類型 | 份數 | 字詞辨識 /25 | 詞典詞形 /25 | 預選準確 /25 | 易用流暢 /25 | 總分 /100 |
|---|---|---|---|---|---|---|
| 詞語表（25） · 貼文字 | 25 | 12.9 | 11.0 | 10.6 | 19.1 | 53.5 |
| 詞語表（25） · 拍照 | 25 | 13.9 | 15.8 | 11.6 | 21.0 | 62.3 |
| 詞語表（25） · 兩者平均 | 50 | 13.4 | 13.4 | 11.1 | 20.0 | 57.9 |
| 短文（15） · 貼文字 | 15 | 24.9 | 22.1 | 23.4 | 17.9 | 88.2 |
| 短文（15） · 拍照 | 15 | 23.4 | 21.7 | 22.6 | 17.9 | 85.5 |
| 短文（15） · 兩者平均 | 30 | 24.1 | 21.9 | 23.0 | 17.9 | 86.9 |
| 混合（10） · 貼文字 | 10 | 23.4 | 24.1 | 18.6 | 18.2 | 84.4 |
| 混合（10） · 拍照 | 10 | 20.3 | 22.7 | 16.9 | 18.7 | 78.6 |
| 混合（10） · 兩者平均 | 20 | 21.9 | 23.4 | 17.8 | 18.5 | 81.5 |

### 按年級

| 年級 | 份數 | 字詞辨識 /25 | 詞典詞形 /25 | 預選準確 /25 | 易用流暢 /25 | 總分 /100 |
|---|---|---|---|---|---|---|
| P1 · 貼文字 | 8 | 25.0 | 24.8 | 19.0 | 22.8 | 91.6 |
| P1 · 拍照 | 8 | 19.2 | 24.8 | 14.7 | 22.8 | 81.4 |
| P1 · 兩者平均 | 16 | 22.1 | 24.8 | 16.8 | 22.8 | 86.5 |
| P2 · 貼文字 | 4 | 15.0 | 12.3 | 11.7 | 17.9 | 56.9 |
| P2 · 拍照 | 4 | 23.8 | 22.7 | 19.7 | 21.8 | 88.0 |
| P2 · 兩者平均 | 8 | 19.4 | 17.5 | 15.7 | 19.9 | 72.4 |
| P3 · 貼文字 | 8 | 16.7 | 14.8 | 13.8 | 18.3 | 63.6 |
| P3 · 拍照 | 8 | 19.9 | 21.6 | 16.5 | 20.5 | 78.5 |
| P3 · 兩者平均 | 16 | 18.3 | 18.2 | 15.2 | 19.4 | 71.1 |
| P4 · 貼文字 | 11 | 16.2 | 16.9 | 15.0 | 17.5 | 65.6 |
| P4 · 拍照 | 11 | 14.2 | 16.2 | 13.5 | 18.1 | 62.0 |
| P4 · 兩者平均 | 22 | 15.2 | 16.5 | 14.3 | 17.8 | 63.8 |
| P5 · 貼文字 | 12 | 17.9 | 15.8 | 15.9 | 18.9 | 68.5 |
| P5 · 拍照 | 12 | 15.4 | 15.3 | 14.2 | 19.7 | 64.6 |
| P5 · 兩者平均 | 24 | 16.6 | 15.5 | 15.1 | 19.3 | 66.5 |
| P6 · 貼文字 | 7 | 20.5 | 15.2 | 19.6 | 15.2 | 70.5 |
| P6 · 拍照 | 7 | 21.9 | 17.7 | 21.3 | 15.9 | 76.7 |
| P6 · 兩者平均 | 14 | 21.2 | 16.4 | 20.4 | 15.6 | 73.6 |

### 逐份成績（貼文字 / 拍照 總分；括號為 字詞/詞典/預選/易用）

| # | id | 類型 | 年級 | 目標字數 | 貼文字 | 拍照 |
|---|---|---|---|---|---|---|
| 01 | poyan_p1_vocab | list | P1 | 10 | 98 (25/25/24/24) | 92 (22/25/21/24) |
| 02 | lty_p1_d1_vocab_hfw | list | P1 | 10 | 92 (25/25/17/25) | 64 (8/25/6/25) |
| 03 | lty_p1_d5_vocab_hfw | list | P1 | 10 | 94 (25/25/20/24) | 52 (2/25/0/24) |
| 04 | dolch_preprimer | list | P1 | 40 | 89 (25/25/16/24) | 86 (24/25/15/22) |
| 05 | dolch_primer | list | P2 | 52 | 90 (25/25/17/24) | 90 (25/25/17/24) |
| 06 | tkokt_p2_jobs | list | P2 | 10 | 20 (2/0/2/15) | 94 (25/22/23/24) |
| 07 | tkokt_p2_seasons | list | P2 | 10 | 29 (8/0/6/15) | 79 (20/19/17/23) |
| 08 | tkokt_p3_beach | list | P3 | 10 | 34 (10/0/9/15) | 71 (20/12/17/21) |
| 09 | tkokt_p3_community | list | P3 | 10 | 20 (2/0/2/15) | 65 (12/20/11/22) |
| 10 | tkokt_p3_countryside | list | P3 | 10 | 20 (2/0/2/15) | 80 (20/23/17/20) |
| 11 | lty_p3_d1_vocab | list | P3 | 5 | 87 (20/25/17/25) | 80 (20/25/10/25) |
| 12 | tks_p3_vocab_quiz | list | P3 | 8 | 85 (25/22/17/21) | 86 (25/22/17/22) |
| 13 | tks_p4_u1_target | list | P4 | 10 | 20 (0/0/0/20) | 20 (0/0/0/20) |
| 14 | tks_p4_u2_target | list | P4 | 10 | 57 (5/25/4/23) | 57 (5/25/4/23) |
| 15 | tkokt_p4_hkfood | list | P4 | 16 | 26 (6/0/4/15) | 36 (8/5/5/18) |
| 16 | tkokt_p4_scenic | list | P4 | 12 | 17 (0/0/0/17) | 20 (0/0/0/20) |
| 17 | wynps_p5_d1_adverbs | list | P5 | 10 | 78 (25/8/24/21) | 78 (25/8/24/21) |
| 18 | wynps_p5_d4_clothing | list | P5 | 10 | 78 (15/25/13/25) | 55 (2/25/3/25) |
| 19 | tks_p5_t1_u2_places | list | P5 | 10 | 16 (0/0/0/16) | 17 (0/0/0/17) |
| 20 | tks_p5_t2_u6_chores | list | P5 | 10 | 23 (0/0/0/23) | 25 (0/0/0/25) |
| 21 | tkokt_p5_weather | list | P5 | 24 | 30 (8/0/6/15) | 44 (11/7/9/17) |
| 22 | tkokt_p6_appearance | list | P6 | 22 | 34 (10/0/9/15) | 68 (19/13/19/17) |
| 23 | tkokt_p6_clothing | list | P6 | 24 | 41 (10/8/8/15) | 55 (14/12/12/18) |
| 24 | nc_year34_words | list | P4 | 109 | 84 (24/21/24/15) | 64 (16/15/18/15) |
| 25 | nc_year56_words | list | P6 | 104 | 79 (24/16/24/15) | 79 (24/16/24/15) |
| 26 | poyan_p1_sentences | text | P1 | 26 | 97 (25/25/25/22) | 97 (25/25/25/22) |
| 27 | mcguffey_lesson31 | text | P2 | 32 | 89 (25/24/22/18) | 89 (25/24/23/18) |
| 28 | potter_peter_rabbit | text | P3 | 50 | 86 (25/23/23/15) | 84 (24/22/23/15) |
| 29 | aesop_hare_tortoise | text | P4 | 51 | 85 (25/20/24/16) | 85 (25/20/24/16) |
| 30 | aesop_lion_mouse | text | P5 | 55 | 82 (25/18/25/15) | 82 (25/18/24/15) |
| 31 | aesop_north_wind_sun | text | P6 | 56 | 83 (25/19/24/15) | 81 (25/19/23/15) |
| 32 | aesop_oak_reeds | text | P6 | 39 | 88 (25/22/24/17) | 86 (23/23/23/17) |
| 33 | aesop_milkwoman_pail | text | P6 | 53 | 84 (25/21/24/15) | 84 (25/21/24/15) |
| 34 | andersen_real_princess | text | P6 | 60 | 84 (25/21/24/15) | 84 (25/21/24/15) |
| 35 | poyan_p4_2324_sentences | text | P4 | 37 | 93 (25/24/24/20) | 92 (25/24/24/19) |
| 36 | poyan_p4_2526_sentences | text | P4 | 38 | 95 (25/24/25/22) | 64 (9/18/13/24) |
| 37 | wynps_p5_d2_passage | text | P5 | 41 | 87 (24/20/24/19) | 87 (24/20/24/19) |
| 38 | wynps_p5_d4_passage | text | P5 | 28 | 88 (25/24/20/18) | 92 (25/24/22/20) |
| 39 | wynps_p5_d6_passage | text | P5 | 37 | 89 (25/23/22/19) | 88 (25/23/23/18) |
| 40 | tks_p5_t2_u5_text | text | P5 | 20 | 95 (25/24/23/23) | 88 (22/24/21/20) |
| 41 | lty_p1_d1_full | mixed | P1 | 14 | 83 (25/23/12/22) | 80 (23/23/11/23) |
| 42 | lty_p1_d4_full | mixed | P1 | 15 | 88 (25/25/16/22) | 88 (23/25/16/24) |
| 43 | poyan_p1_full | mixed | P1 | 36 | 93 (25/25/23/20) | 92 (25/25/23/19) |
| 44 | lty_p3_d1_full | mixed | P3 | 31 | 86 (23/24/19/19) | 73 (18/23/16/17) |
| 45 | lty_p3_d4_full | mixed | P3 | 30 | 93 (25/24/22/21) | 88 (21/24/20/22) |
| 46 | poyan_p4_2223_full | mixed | P4 | 91 | 85 (24/24/22/15) | 85 (24/24/22/15) |
| 47 | poyan_p4_2526_full | mixed | P4 | 72 | 87 (25/24/23/15) | 87 (25/24/23/15) |
| 48 | wynps_p5_d5_full | mixed | P5 | 37 | 79 (21/24/17/18) | 41 (3/11/4/23) |
| 49 | tks_p5_t1_u1_full | mixed | P5 | 53 | 78 (21/24/17/15) | 79 (21/24/18/15) |
| 50 | tks_p4_u2_full | mixed | P4 | 44 | 73 (20/23/15/15) | 73 (20/23/15/15) |

### 原始指標（各份平均）

| 指標 | 貼文字 | 拍照 |
|---|---|---|
| 目標字詞（整詞／整詞組）出現在候選中 | 74% | 72% |
| 　其中單字 | 87% | 86% |
| 　其中詞組 | 37% | 19% |
| 寬鬆（逐字、不計 a/an/the） | 100% | 92% |
| OCR 原文逐字命中（只拍照） | - | 94% |
| 找到的目標有中文意思 | 67% | 76% |
| 詞形變化目標：已認出且有中文 | 81% | 82% |
| 預選 precision | 60% | 62% |
| 預選 recall | 71% | 68% |
| 預選 F1 | 64% | 64% |
| 預選 precision（寬鬆） | 82% | 80% |
| 預選 recall（寬鬆） | 90% | 76% |
| 預選改成目標所需點擊（平均） | 20.4 | 22.0 |
| 接受預選、核對擋住項目到可儲存的點擊（平均） | 30.2 | 30.5 |
| 改成目標並儲存的總點擊（平均） | 41.7 | 44.6 |
| 到第 2 步秒數（平均；拍照含 OCR） | 0.1 | 3.1 |
| 預選了的雜訊卡（平均／份） | 11.2 | 8.9 |
| 預選且標「內置題庫沒有這個字」（平均／份） | 6.7 | 6.5 |

### 2.1 怎樣讀這些數
* **拍照 ≈ 貼文字，但原因不同。** 同一份範圍比較（拍照總分 − 貼文字總分）：紙上沒有中文的 40 份，好／一般／較差相片分別 -3.1（n=20）、-4.7（n=10）、-11.3（n=10）；
  有中英對照的 10 份，好／一般／較差相片卻是 +26.7（n=5）、+56.1（n=3）、+20.0（n=2）——因為貼文字會把中文黏進英文欄，而拍照時 eng 辨認模型讀不到中文，中文自然被丟掉（同時也丟了學校自己的中文釋義）。所以拍照總分高過貼文字**不代表拍照比較好**。
* **照片條件**：好 72.8、一般 78.3、較差 65.7。三組的範圍組成不同（較差組 12 份中有 6 份是詞語表、4 份短文、2 份混合），要看上面的同份比較才公平。較差相片 OCR 逐字命中降到 76%，其中 4 份低於 65%（#48 只有 25%、#36 37%、#20 54%、#24 63%）。
* **年級**：P1 最高（短詞、單字表）；P4–P5 最低，因為這兩級的香港默書表正好是動詞詞組表、英中對照表。年級與格式混在一起，不能解讀為「P4–P5 比較難辨認」。

## 3. 分項觀察

### 3.1 字詞辨識（OCR 及拆字）
* 整項命中：貼文字 74%、拍照 72%；寬鬆（逐字、不計冠詞）100%／92%。兩者差距就是詞組被拆開的代價。
* 詞組（148 個 target，來自 23 份）：貼文字完整保留 39（26%），拍照 21（14%）。完整保留的幾乎全是「內置詞庫剛好有收的詞組」：a + 名詞（a skirt、a bear、a footbridge）、listen to、look after、traffic lights、General Studies。
* 拍照 OCR 常見錯誤（只在較差相片明顯）：a cap→acap、lion→alion、enjoy→lenjoy、little→litte、crushed→frushed、remain→femain、powerful→powertul、dancing→daticing；大片讀不到的：#48（較差相片）。未見 rn→m 這類字母合併錯誤，錯誤多是「冠詞黏字」及模糊字。
* 好／一般相片的 OCR 逐字命中 98.7%／99.4%，但整項命中只有 76%／76%——損失幾乎全部發生在 App 的拆字和濾字，不是 OCR。

### 3.2 詞典及詞形
* 找到的 target 有中文意思可用：貼文字 67%、拍照 76%（貼文字較低，因為黏了中文的卡在比對時算「找不到」）。
* 被標「內置題庫沒有這個字」且預選的卡：貼文字 335 張，其中真新字（含標題字如 Dolch、Pre-Primer）256、人名地名 61、詞形變化沒認出 16、詞組 2；
  拍照 326 張：真新字 228、OCR 錯字 37、人名地名 43、詞形 16、詞組 2。
* 詞形（以獨立規則＋不規則表找出 189 個詞形變化 target）：已認出且有中文 81%（貼文字）／82%（拍照）。複數、過去式、-ing、不規則（broke、bought、flew、hid…）大致可靠；
  沒認出的主要是 **-ly 副詞及比較級**（softly、patiently、impatiently、rudely、noisily、simply、comfortably、shortly、badly、closer）共 16 個，及黏了中文因而找不到的複數（kites、woods、arms、lips、legs、eyebrows、shoulders）。
* 釋義品質：縮寫 didn't →「做了」、shouldn’t →「應該」、we’ll →「我們」、he’s →「他」、There’s →「那裏」（丟了否定／助動詞；isn’t、can’t、don’t 則正確）；人名及 McGregor's、Prince's、Pon'to 沒有中文。
  多義字（names、visited、cooks、teaching、taught、felt…）不預填中文，要家長另按一個「意思」鈕（再 +1 點擊）。學校紙上的中文與卡上詞典中文不同的，在有對照的 10 份中占 27／67（貼文字）：App 用詞典釋義覆蓋了老師的中文。

### 3.3 預選準確
* 預設預選與 target 比：precision 60%／62%，recall 71%／68%，F1 64%／64%（貼文字／拍照）。寬鬆（逐字）precision 82%／80%、recall 90%／76%。
* 預選裏的雜訊（每份平均，貼文字／拍照）：標題／欄名／指示語 4.4／3.7、
  詞組碎片 3.3／3.1、人名 1.8／1.4、
  含中文的卡 1.4／0、OCR 垃圾 0／0.8、編號標點 0.4／0。
* 把預選改成 target 所需的**點擊**（只計選字，不含核對）：平均 20.4（貼文字）／22.0（拍照）；其中缺的字要打字補（每個 2 點擊＋打字）。
* **如果家長完全接受預選**，儲存下來的範圍（90 次成功儲存）：precision 65%、recall 74%；平均 8.3 個字沒有中文。

### 3.4 易用及流暢
| | 貼文字 | 拍照 |
|---|---|---|
| 到第 2 步的點擊（輸入動作另計） | 2（開貼上框＋整理）＋ 貼上 | 1（上傳）＋ 選相 |
| 到第 2 步的時間（平均） | 0.1 秒 | 3.1 秒（本機 tesseract 1.1–1.6 秒；**不是手機上 WASM 的時間**） |
| 接受預選直到儲存成功的點擊（平均） | 30.2（50 份中 10 份儲存失敗） | 30.5（0 份失敗） |
| 細心家長改成 target 並儲存的點擊（平均） | 41.7 | 44.6 |
| 預選裏要逐個「核對」的卡（平均／最多） | 8.4／29（#25） | 8.8／36（#24） |
| ≥10 個待核對的份數 | 19／50 | 20／50 |
| 固定操作列在首屏（390×844） | 50／50 | 50／50 |
| 第 2 步內容長度（手機，最多） | 6.5 屏 | 6.3 屏 |
| 第 3 步「儲存範圍」在首屏 | 100／100 次 | |
| console error | 0 | 0 |

桌面 1440×900（5 份拍照）：固定列在首屏 5／5，無橫向捲動，首屏可見 24–28 張卡，最長 2.9 屏。

## 4. 漏洞清單（按影響排序）

> 「份數」＝ 50 份範圍中受影響的份數（貼文字／拍照分開寫）。重現時用 `sets/` 內該份的 `raw_text`（貼文字）或 `shots/SYNTHETIC_INPUT_*.jpg`（拍照）。以下都是**建議方向**，沒有改任何程式。

### 1.【致命】「儲存範圍」無聲失敗：預選了不合格的卡，步驟 2–3 都沒有擋，最後按儲存沒有反應
* **重現**：貼文字範圍 `08_tkokt_p3_beach`（`1.towel 毛巾` …）→ 整理 → 核對擋住的卡 → 下一步 → 剔「我已對照原稿」→ 儲存範圍。
* **實際**：沒有新範圍；錯誤訊息「「towel 毛巾」格式需要修改。」寫進了**第 2 步隱藏起來的** `#v20-message`，第 3 步只看到被重設的剔選框和「請先勾選上面的「我已對照原稿」」（剔框明明已剔）——見 `shots/PASTE_08_tkokt_p3_beach_390_save_fail.png`。第 3 步的清單把這些卡標「可加入」。
* **預期**：不合格的卡在第 2 步就標為要核對（或在第 3 步清單標紅並擋住儲存），並在第 3 步顯示原因。
* **影響**：貼文字 10／50（06–10、15、21–23 的中英對照表，及 #49 的標題「Tenses (30% @ 2%)」被預選成詞組）；拍照 0／50（中文被丟掉，所以沒這問題）。
* **建議**：`validEnglish` 在「預選」時就要檢查；第 3 步按儲存失敗時把訊息顯示在第 3 步並捲動到該項；標題行「D. Tenses (30% @ 2%)」這類含 `%`、`@` 的行不應成為詞組候選。

### 2.【嚴重】「英文 中文」同行 → 中文黏進英文欄，學校的中文被詞典釋義取代
* **重現**：貼上 `1.towel 毛巾` 或 `towel 毛巾`、`1. towel 毛巾`（三種寫法結果一樣；見 `probe_results.json`）。只有「towel | 毛巾」或 Tab 分隔才正確。
* **實際**：整行成為一張「詞組」卡 `en = "towel 毛巾"`，中文欄顯示的是詞典的釋義（舞蹈演員 → 卡上寫「舞蹈員」），不是老師紙上的；68 張這類卡、9 份。含中文的卡無法「核對」（驗證只准英文字母），只能略過或改字。
* **預期**：行內出現中日韓字就把它當中文欄；老師的中文優先於詞典。
* **影響**：貼文字 9／50（P2–P6 的詞彙庫對照表）；拍照則是另一種問題（見 9）。**這是香港學校詞彙庫最常見的格式。**
* **建議**：解析時以「最後一段連續 CJK」切出中文；說明文字提示可用 `|`。

### 3.【嚴重】多字詞組被拆成單字，詞組頭的 do／go／a 又被當基本字藏起，連「合併字詞」也接不起來
* **重現**：貼上 `go cycling`、`do a jigsaw puzzle`、`say sorry to`（#13、#14、#19、#20、#50）。
* **實際**：只有內置詞庫收錄的詞組保持完整（見 3.1）。其餘每個字各成一卡：「jigsaw」「puzzle」，而 do／a／go／to 在「已略過」裏。`合併字詞` 要先按第一個字，但「a」「do」「go」只有 1–2 個字母，被「3+」略過、根本沒有卡可按（`probe_results.json` merge_a_car_park：只合併到「car park」，沒有「a」）；要先按「不限」，再開「⋯更多→合併字詞」，按首字、按末字，第一個詞組共 5 點擊（之後每個 2 點擊）；用「＋自己加入」打字則每個 2 點擊＋打字。「Dim Sum」更變成「Dim 昏暗的」「Sum 總和」兩張卡。
* **預期**：同一行的多個字（沒有逗號）保留成詞組，或至少提供「整行當一個詞組」的選擇（模式分頁在 R3.10 被隱藏）。
* **影響**：23 份有詞組 target；貼文字 109／148（74%）被拆，涉及 17 份；拍照 127／148（86%）被拆或讀不到，涉及 22 份。得分最低的五份（#19、#16、#13、#20、#15）都是這個原因。
* **建議**：list 模式下，「一行一項」的版面（每行 ≤5 個字、無句號）預設整行成詞組；詞組頭的基本字不要自動略過。

### 4.【嚴重】標題、欄名、指示語被預選成要默的單字
* **重現**：貼入任何整張默書紙（#41–50）或帶 `Theme: …`、`B. Vocabulary (10%@2%)` 的表。
* **實際**：Vocabulary、Sentences、Dictation、Target、Theme、Recitation、Verb、Table、Present、Past、Please study、Semester、Syllabus… 都成為預選的卡，且多數在詞庫內所以是「綠卡」，家長不易察覺（見 `shots/SYNTHETIC_15_tkokt_p4_hkfood_photo_390_step2.png`，最前面 6 張全是欄名）。人名（Ben、Lam、Pam、Mike…）亦被預選並標「題庫沒有」。
* **影響**：貼文字 43／50（共 222 張，每份平均 4.4）；拍照 41／50（183 張）。人名 21／50（88 張）。
* **預期**：App 已有「可能是標題或日期」的排除（日期、Name 行都有被排除），應擴大到 `A.`／`B.` 帶括號分數的標題行、全大寫小標題、含 `%`、`@` 的行及常見版面字（Vocabulary、Sentences…）。
* **建議**：把以 `^[A-D]\.\s` 或含 `%` 的行整行排除；人名（句中大寫）預設不選。

### 5.【高】每個「題庫沒有」的字都要逐個核對（3 點擊；多義字 4 點擊）才能儲存
* **實際**：預選裏平均 8.4（貼文字）／8.8（拍照）張待核對卡；≥10 張的有貼文字 19 份、拍照 20 份（最多 29 張，#25 英國 Year 5-6 表）。每張要「✎ → 剔 → 保留修改」。短文類最重（每份平均約 11 張），接受預選要 ~38 點擊才儲存得到。
* **預期**：單字拼寫沒有問題、只是詞庫沒收的字，不應要求逐個「確認」；至少給「全部標為已核對」。
* **影響**：貼文字 47／50 份至少 1 張，拍照 46／50。
* **建議**：把「題庫沒有這個字」降為提示（黃點），不阻擋儲存；或在第 3 步清單加「全部確認」。

### 6.【高】預設「3+、略過基本字」令詞語表漏選高頻字
* **重現**：Dolch 前級（#04）、LTY 的 High Frequency Words（#02、#03）。
* **實際**：a、and、can、for、go、I、in、is、it、me、my、not、one、the、to、two、up、we、you（#04：20／40）、that、yes、no、here、be 等被略過，recall 只有 50%（#04）、70%（#02）。介面只有「略過 20 個」一行小字。
* **預期**：詞語表（每項都是 target）不應以「基本字」過濾；或提示「你的表內有 N 個被略過」。
* **影響**：貼文字 7／50 份（#02、03、04、05、41、42、50；共 53 個 target 被藏）；拍照同樣 7 份，另有少量短文因 OCR 變形的短字（etc、fat、sums）被略過（共 61 個）。
* **建議**：偵測到 list 版面（行短、無句號）時預設「不限＋不略過基本字」；現在家長要自己按「不限」＋關閉開關（2 點擊）。

### 7.【中】拍照：編號被 OCR 當成獨立欄，行首殘留「. 」「- 」令整行被判「不像英文單字」而排除
* **重現**：`shots/SYNTHETIC_INPUT_02_lty_p1_d1_vocab_hfw.jpg`（好／一般相片）。OCR 輸出 `- a lion`、`3. a panda`、`. a tiger`、`.no`（#02）及獨立的 `B 1 2 3 4 5`、`.acap`（#03）。
* **實際**：整行進入「已略過」，原因「不像英文單字」；#02 整項命中 30%、#03 10%、#18 10%，而 OCR 逐字命中 91–100%。
* **影響**：拍照 11／50 份、43 個 target（#02、03、07、09、18、21、22、23、42、44、45）。
* **建議**：驗證前先去掉行首／行尾的非字母符號及數字編號；`acap` 之類以詞庫「a+詞」補救。

### 8.【中】手機上，待核對卡的「核對」鈕蓋住字卡中央
* **實際**：390 px 闊度下，358／419（貼文字）、393／442（拍照）張待核對卡，卡片中心點是「核對」鈕；拇指按卡片中央會開核對視窗而不是選取。README 說「字卡整張可點」。Playwright 在這些卡上直接按中心會被攔截（本評測要改按卡頂）。
* **建議**：核對鈕放到卡片角落，或改成與「✎」同一位置。

### 9.【中】拍照時，紙上的中文被丟掉（學校的中文釋義全失）
* **實際**：App 只載入 eng 辨認資料；中文欄不被讀入。結果是卡上沒有學校的中文釋義（有對照的 10 份共 148 個 target：拍照 88 個沒有卡或沒有中文、35 個與紙上相同、25 個不同）。第一次的、較嚴厲的較差相片實驗中，`designer 294+6`、`lawyer (#6` 這類「英文＋中文碎片」被判無效而排除（見 `results_pass1_harsh_poor.json`）。
* **建議**：辨認時加 chi_tra，或把含中文的行按位置切成兩欄；至少在「相片辨認及私隱」說明只認英文時，提示家長裁走中文欄。

### 10.【中】較差相片：整張 OCR 幾乎失敗，只有一句「辨認結果不太清楚」
* **實際**：12 份較差相片 OCR 逐字命中平均 76%，最差 #48 只剩 25%、#36 37%。較嚴厲的第一輪實驗中，3／12 張完全辨認不到英文（只出現「這張相片沒有辨認到英文。請重新拍照，也可以直接輸入文字。」），另 1 張只辨認到 2 項。
* **注意**：這是合成相片、本機 tesseract，不代表真實手機；僅作「相片差到什麼程度會失敗」的下限參考。
* **建議**：辨認前自動裁掉桌面／做二值化；第 1 步的「框選／拉直」及「稍為加強文字對比」目前被隱藏，失敗時應主動提供。

### 11.【低】縮寫、所有格及音節記號的釋義和拆字
* didn't →「做了」、shouldn’t →「應該」、we’ll →「我們」、he’s →「他」、There’s →「那裏」（丟了 not／will／is）；McGregor's、Prince's 沒中文；McGuffey 的音節記號 `Pon'to`、`wa'ter`、`a round'` 變成怪卡（第 27 份）。
* 連字號斷行 `hide-and- seek` → 只得 `hide-and` 一張卡（#10）。

### 12.【低】已收錄詞組吞掉單字 target
* `at last`、`at least`、`out of`、`a few`、`plenty of`、`a little`、`in front of`、`a pair of` 在短文中被整句成詞組卡，單字 last／least／out／few／plenty／little／front／pair 不再是獨立候選（9 份：#29、33、34、37、44、46、48、49、50）。這不一定是錯，但老師若要默單字，家長要自己拆開（卡上有「拆成單字」）。

### 13.【低】-ly 副詞、比較級被標「題庫沒有」
* softly、patiently、impatiently、rudely、noisily（#17 全部 5 個）、simply、comfortably、shortly、badly、closer 等 16 個，其基本字（soft、patient、rude…）都在題庫，詞形層沒有連上。

### 已確認沒問題的項目
* 版面：固定列 100／100 在首屏、桌面及手機無橫向捲動、無 console error、第 3 步「儲存範圍」在首屏。
* 短文／句子（#26–40）貼文字：整項命中 ≥98%，預選 F1 0.81–0.99（15 份中 12 份 ≥0.9）；好／一般相片同樣；P1 簡單詞表（#01、#05）約 90–98 分。
* 複數、過去式、-ing、不規則動詞表（#46、#47）能連到原形並帶中文。
* 完全重複的字只留一張（`dup`），不再出現「合併相同項目」。

## 5. 限制（請一併閱讀）
1. **相片是合成的**：PIL 排版＋人工劣化，不是真手機相片；沒有手寫、沒有真實鏡頭畸變、摺紙、反光、手指。本機沒有 Comic／手寫字體。成績不能直接當真機成績。
2. **OCR 引擎不同**：用本機 native tesseract 5.3（經 r35 stub），不是 App 內的 tesseract.js（WASM）；準確度與秒數都可能不同。「秒數」只反映本機，**手機上實際等多久沒有量度**。
3. **「較差」相片的嚴厲程度是評測員選的**。第一輪（較嚴厲）4／12 張幾乎讀不到（3 張完全沒有英文、1 張只得 2 項），結果存於 `results_pass1_harsh_poor.json`，沒有計入分數；第二輪（採用）調得較溫和。兩輪的 OCR 失敗率顯示這個項目對劣化條件很敏感。
4. **資料偏向**：香港來源只有 5 個學校網站（其中 tkokt.edu.hk 的校名未能核實）；多是 P3–P5；沒有 P6 默書紙；沒有掃描件或手寫默書紙；沒有真正的 Fry 表。
5. **部分版面是重組的**：Dolch 字格、英國表、TKOKT 對照表的「行式」版面由 PDF 文字層重排，與學校原本紙張的版面未必完全一樣；TKS／WYNPS 兩欄表的貼上次序則保留 PDF 文字層的次序。
6. **「家長」是腳本**：點擊數是真點擊，但沒有量度人的閱讀、猶豫時間；多義字一律揀第一個意思（不判對錯）；遇不能核對的卡只會略過再打字補。真人第一次用的點擊數大概更多。
7. **target 定義有循環成分**：短文的 target 排除了 `V20.COMMON`，與 App 的「略過基本字」同表，所以短文的 precision 略有利於 App。詞語表沒有這個問題。人名地名由評測員逐份標註。
8. **分數是評測員自訂的公式**（第 1.4 節），權重不是標準；「易用及流暢」只計流程，不計預選好不好，所以格式處理得差的範圍仍能拿高分。
9. 詞形 target 由獨立規則推出（有少數誤判，如 thing、lover）；詞形分數只當參考。
10. 每份每種輸入只跑一次（流程確定性高，OCR 已快取）；沒有量度隨機變異。

## 6. 檔案與重跑
* `sets/NN_*.json`：50 份資料（來源、授權說明、`raw_text`、`photo_text`、`targets`、備註）。`build_sets.py` 為建立腳本。
* `run_eval.py`：`WQ33_APP=<凍結 index.html> python3 r37_eval/dictation50/run_eval.py`（`--only 06,07`、`--inputs paste`、`--fresh`、`--force`）。
* `results.json`：逐份逐輸入原始數據（含每張卡的狀態、OCR 原文、點擊明細）；`summary.json`、`bugs.json`、`tables.md`：由 `analyze.py`、`bugs.py`、`make_tables.py`、`make_report.py` 產生。
* `probe_merge.py` → `probe_results.json`：詞組合併、中英同行寫法的小實驗。
* `mkphoto.py`：合成相片；`shots/`：5 份×（手機第 2、3 步、桌面第 2 步）截圖，及 3 張代表輸入圖與一張儲存失敗截圖。
