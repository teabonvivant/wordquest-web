from pathlib import Path
import json, hashlib, base64, html, platform, subprocess, datetime, collections, re
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'report';OUT.mkdir(exist_ok=True)
files=[ROOT/'results/generation_results.json',ROOT/'results/core_results.json']+sorted((ROOT/'results').glob('browser_*_[0-9]*.json'))
rows=[row for p in files for row in json.loads(p.read_text())]
assert len(rows)==1000 and len({r['id'] for r in rows})==1000
assert all(r['status'] in ('PASS','FAIL') for r in rows)
counts=collections.Counter(r['status'] for r in rows)
assert counts=={'PASS':960,'FAIL':40},dict(counts)
for r in rows:
    if r['category'] not in ('GEN','UI'):r['method']='Node.js 實際核心函式／隔離儲存模擬' if r['category']=='STORAGE' else 'Node.js 實際核心函式'
    if r['category']=='GEN':r['method']='Node.js 出题；Python Fraction／獨立公式或枚舉核對'
    if r['status']=='FAIL':assert r.get('issue'),r
(ROOT/'results/all_1000_results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
CATS=[('GEN','出題與獨立答案核對',504,'84 個模板 × 6 個種子；獨立有理數計算、參數約束、選項、填字欄位。'),('GRADE','判分與輸入正規化',84,'每模板一組：正答、錯答、空白、全形；分數題另測 Unicode 分數斜線。'),('PARSER','數字及算式解析',80,'40 組有理數輸入與 40 組算式輸入，包括有效及應拒絕內容。'),('STATE','備份與資料驗證',96,'96 組明確資料變異；原型欄位、範圍、型別、長度、日期及跨路線關係。'),('LEARNING','學習紀錄及獎勵',56,'28 個技能的路線隔離，加 28 組掌握度、錯題、重溫及獎勵行為。'),('STORAGE','保存與還原',40,'在隔離的 localStorage 模擬器測試保存、錯誤回復、匯入、切換及刪除。'),('UI','瀏覽器畫面及操作',140,'84 個模板逐一填答提交，加 56 組流程、故障注入、教具、音效事件及版面檢查。')]
issues=[
{'id':'F-ARRAY-STATE','priority':'P1','title':'損壞資料可令掌握度及時限紀錄靜默消失','scope':'資料完整性；異常儲存／備份輸入',
 'trigger':'把 mastery.normal、mastery.olympiad 或 usage 由物件改為 []；重新讀取、完成一次作答或記錄時間，再保存並重新讀取。',
 'observed':'驗證器接受陣列。使用技能 ID 或日期作鍵寫入陣列後，JSON 序列化不保留這些字串鍵。實測答案紀錄仍在，但普通數學掌握度消失；60000 毫秒的時間紀錄重讀後變成 undefined。',
 'impact':'可能令孩子看似沒有進步，或每日時限漏計。這是異常資料觸發，不代表每次正常保存都失敗。',
 'source':['source/maths_script_1.js:129–145','source/maths_script_1.js:166–185','source/maths_script_2.js:44–53'],
 'fix':'對所有字典欄位使用一致的純物件驗證，明確拒絕 Array；舊資料遷移前先留不可覆蓋快照。不能用錯誤結構直接繼續保存。',
 'acceptance':'三種陣列輸入都安全拒絕；正常物件可以保存和還原；異常讀取不覆蓋原檔；學習和時限紀錄經完整讀寫往返仍一致。'},
{'id':'F-REGISTRY-BOOT','priority':'P1','title':'孩子名單損壞或儲存讀取被拒，啟動變白畫面','scope':'啟動可靠性；故障注入',
 'trigger':'將 wqm-profiles-v1 設為損壞 JSON，或令 localStorage.getItem 拋出 SecurityError，然後啟動頁面。',
 'observed':'registry() 與 bridge.profile() 在 Store 讀取保護區外拋錯。兩個瀏覽器案例都沒有任何可操作按鈕；分別收到 JSON 解析例外與 Denied。',
 'impact':'家長無法在程式內取得恢復說明或進入訪客模式。這裡模擬儲存被拒，沒有聲稱所有私隱模式或真機都會發生。',
 'source':['source/maths_script_2.js:33–46'],
 'fix':'將學員名單和儲存存取納入啟動錯誤邊界；保留原始內容，提供只讀恢復與不持久保存的訪客模式，避免自動清空。',
 'acceptance':'損壞 JSON、名單型別錯誤、getItem 拒絕均能顯示可操作的安全畫面；正常名單仍能切換；不因恢復而刪除英文或其他孩子資料。'},
{'id':'F-ATTEMPT-VALIDATION','priority':'P1','title':'舊作答紀錄驗證不完整，會卡住新練習或家長頁','scope':'資料模型驗證；兩種 UI 故障已重現',
 'trigger':'在舊 attempts 放入不存在／不相符模板、異常 seed、credit、difficulty、independent、mode，或 at=1e20；重新讀取後開新練習／家長頁。',
 'observed':'15 組不符合模型的資料通過 validateState。瀏覽器另重現：不存在模板的舊紀錄令 nextQuestion 顯示「題目模板不存在」；巨大時間戳令家長頁日期運算失敗。',
 'impact':'一筆損壞舊資料即可阻擋其他操作。其他未驗證欄位目前屬防護缺口，不把每個欄位都稱為獨立可利用的安全漏洞。',
 'source':['source/maths_script_1.js:133–134','source/maths_script_1.js:189–194','source/maths_script_3.js:115–116'],
 'fix':'驗證模板存在且與 skill／track 一致、seed 為 uint32、credit 範圍與型別、difficulty 為 1–3、布林與模式列舉，以及可用時間戳。對舊版本缺欄位先做版本化遷移，不可粗暴刪紀錄。',
 'acceptance':'15 組異常全部被安全拒絕／隔離；正常歷史備份仍可還原；即使歷史紀錄有問題，提供恢復入口而非讓新練習或週報無法打開。'},
{'id':'F-OUTBOX-CAPACITY','priority':'P1','title':'200 筆已結算獎勵仍會阻擋下一次課堂完成','scope':'長期使用邊界；已結算收據不是待同步項目',
 'trigger':'建立 200 筆仍在保留期內、settled=true 的獎勵紀錄，再完成符合獎勵條件的新課堂。',
 'observed':'enqueueReward 以整個 outbox 的長度判斷上限，拋出「請先處理待同步獎勵」。實際點擊課堂完成後，current.completed 仍為 false。',
 'impact':'程式將已完成同步的收據也算入待處理上限。這是構造 200 筆收據的邊界測試，未估算一般家庭多久會遇到。',
 'source':['source/maths_script_1.js:210–212','source/maths_script_3.js:171–182'],
 'fix':'分開待同步佇列與已結算去重紀錄；按容量及保留期整理收據，同時保留重試不重派的保障。課堂完成保存不應被獎勵同步失敗整筆取消。',
 'acceptance':'大量已結算紀錄不阻擋新課堂；真正待同步上限有清楚處理；在錢包完成但回執未寫入時重試也不重派；課堂進度先可靠保存。'},
{'id':'F-DELETE-BACKUP','priority':'P1','title':'刪除學員未刪除該學員的復原備份','scope':'資料刪除完整性；本機資料保留',
 'trigger':'匯入同一孩子的備份，令系統建立 :before-restore 快照，再從學員頁刪除這名學員。',
 'observed':'名單與主進度 key 被刪，但 wqm-state-v1:<account>:<child>:before-restore 仍保存完整狀態。函式層和 UI 都重現。',
 'impact':'介面已刪除學員，但本機仍有可復原的孩子資料；不是已證明的對外資料洩漏。',
 'source':['source/maths_script_2.js:40','source/maths_script_2.js:63–64'],
 'fix':'維護按帳戶／孩子分組的資料清單；刪除時涵蓋主檔、復原快照、相關暫存。不可呼叫 localStorage.clear()，以免連英文與其他學員也刪除。',
 'acceptance':'刪除後該孩子相關資料全部移除，其他孩子與英文資料不变；部分刪除失敗要回報，不能假裝已完全清除。'},
{'id':'F-FRACTION-SLASH','priority':'P2','title':'數值正確的 Unicode 分數被誤判格式錯誤','scope':'判分一致性；部分分數格式',
 'trigger':'在 3N5.1 分數題輸入 3⁄4 或 2⁄3，其中分隔符為 U+2044「⁄」，而非一般「/」。',
 'observed':'Q.parse 可正確解析；mark 的格式識別只檢查一般 /，把輸入當成整數，三個模板均誤拒。補充瀏覽器重現 2⁄3 被拒。',
 'impact':'貼上或某些輸入來源的等值分數會被判為格式錯誤；一般鍵盤 / 和全形格式的案例通過。',
 'source':['source/maths_script_1.js:23–38','source/maths_script_1.js:105–111'],
 'fix':'將数值解析、格式分類、最簡分數檢查共用同一個正規化入口，統一處理 NFKC、Unicode 分數斜線與負號。',
 'acceptance':'三個失敗模板全部通過；一般 /、全形、Unicode 斜線在同一規則下判分；不因此接受錯誤值或不符合最簡分數要求的答案。'},
{'id':'F-DRAFT-LOSS','priority':'P2','title':'暫停或切換導航會遺失未提交草稿','scope':'一般操作可遇到的使用體驗缺陷',
 'trigger':'輸入數值但不提交；按「稍後繼續」再恢復，或按其他導航後再恢復。應用題另填算式、答案及單位。',
 'observed':'三種流程分別遺失數字 123、算式／答案／單位，以及導航前的數字 15。已提交答案的恢復測試通過；看提示時保存草稿的測試也通過。',
 'impact':'孩子離開一下就要重新輸入，應用題尤其明顯。已完成的作答紀錄不等於未提交的草稿。',
 'source':['source/maths_script_3.js:125–131','source/maths_script_3.js:194','source/maths_script_3.js:219'],
 'fix':'在暫停、導航、切換及重繪前集中擷取各欄位草稿；按題目 ID 綁定並還原。頁面離開時的保存策略另需真瀏覽器驗證。',
 'acceptance':'數字、算式、單位、餘數及選項均能恢復；換題要清舊草稿；恢復不產生重複作答或重複獎勵。'},
{'id':'F-CURRENT-QUEUE','priority':'P2','title':'執行中練習缺少題目仍可被讀取','scope':'異常課堂狀態／恢復流程',
 'trigger':'令未完成 practice 的 stage=4，但 queues={}，重新讀取並續課。',
 'observed':'STATE-085 中驗證器接受。額外、未加入 1,000 項數目的重現確認：續課後只有標題與空白題目區，沒有答案欄和提交按鈕。',
 'impact':'孩子可進入沒有題目的課堂，沒有正常繼續作答的入口；可透過結束這輪退出，不是整個瀏覽器崩潰。',
 'source':['source/maths_script_1.js:153–157','source/maths_script_3.js:101–109'],
 'fix':'按 mode／track／stage 驗證題目佇列是否必需；缺少時安全隔離該課堂、保留作答紀錄並提供重新開始。',
 'acceptance':'需要題目的階段不能接受缺失／空佇列；導入、恢復及舊版本遷移皆有清楚處理；正常探索與小結阶段不能被誤拒。'},
{'id':'F-FOCUS-LOSS','priority':'P2','title':'鍵盤提交後焦點掉回 BODY','scope':'鍵盤可用性；未聲稱已完成輔助技術驗收',
 'trigger':'在答案欄以鍵盤 Enter 提交正答。',
 'observed':'重繪後 shadowRoot.activeElement=null，document.activeElement=BODY；沒有把焦點帶到回饋或下一步。',
 'impact':'純鍵盤使用者要重新尋找位置，不能連貫操作；滑鼠能點下一步不代表焦點管理正確。',
 'source':['source/maths_script_3.js:125–130','source/maths_script_3.js:148–159'],
 'fix':'完成重繪後將焦點送到回饋或「下一題」，同時保留清楚的狀態通知；下一題恢復到合理輸入點。',
 'acceptance':'只用 Tab／Shift+Tab／Enter 能完成整輪；每次提交和換題後焦點有合理位置；再用螢幕閱讀器做獨立驗收。'},
{'id':'F-USAGE-DATE','priority':'P3','title':'使用時間紀錄接受不存在的日期','scope':'日期驗證一致性；資料防護缺口',
 'trigger':'在 usage 放入 2026-02-30:1000。',
 'observed':'validateState 只檢查 YYYY-MM-DD 外形，沒有像其他欄位般驗證實際日曆日期，故接受 2 月 30 日。',
 'impact':'可能污染週報或時限資料；本案例只證明驗證缺口，沒有證明一般操作會產生這個日期。',
 'source':['source/maths_script_1.js:138–140'],
 'fix':'使用同一個日期驗證器，驗證格式、真實日期及系統採用的日期邊界。',
 'acceptance':'拒絕不存在日期，閏年及香港日期跨日正常；週報、重溫、錢包及 usage 使用同一套規則。'}]
for i in issues:
    i['cases']=[r['id'] for r in rows if r.get('issue')==i['id']]
    i['failed_cases']=len(i['cases']);assert i['cases']
assert sum(i['failed_cases'] for i in issues)==40
assert {i['id'] for i in issues}=={r['issue'] for r in rows if r['status']=='FAIL'}
(OUT/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2))
source=ROOT/'source/WordQuest_Maths_Try.html';sha=hashlib.sha256(source.read_bytes()).hexdigest()
fixtures=json.loads((ROOT/'results/generated_fixtures.json').read_text());unique=len({(x['question']['templateId'],x['question']['stem_zh'],x['question']['answer'],x['question']['remainder']) for x in fixtures})
manifest={'audit_date':'2026-09-29','product':'WordQuest Maths 0.1.0 standalone','source_name':'WordQuest_Maths_Try.html','source_origin':'Library indexed full-text materialization; raw ZIP and HTML original bytes unavailable','source_bytes':source.stat().st_size,'source_sha256':sha,'source_html_scripts':4,'source_modified':False,'case_count':1000,'status_counts':dict(counts),'root_causes':10,'browser':json.loads((ROOT/'results/browser_environment.json').read_text()),'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':platform.python_version(),'generation_seeds':[0,1,2,42,65535,4294967295],'generation_cases':504,'unique_template_prompt_answer_remainder':unique,'not_tested':['Actual V33 English build or merged application','Native localStorage and file/HTTP origins','Real mobile devices or Safari/WebKit','Human listening and Cantonese pronunciation quality','Teacher review or full P1-P6 coverage','Live host-wallet integration / cloud accounts / production security audit'],'result_files':[str(p.relative_to(ROOT)) for p in files],'supplemental_counted':False}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
category_rows=[]
for code,name,n,desc in CATS:
    a=[r for r in rows if r['category']==code];p=sum(r['status']=='PASS' for r in a);f=n-p;assert len(a)==n
    category_rows.append((code,name,n,p,f,desc))
md=['# WordQuest：1,000 項檢查報告','', '檢查日期：2026-09-29','', '**結論：960 項通過、40 項未通過，歸納為 10 類問題。本次未修改原程式；建議先修正 P1 問題，再做英文合併及整合回歸。**','',
'## 1. 檢查對象及限制','',
'本次可執行檢查對象是 WordQuest_Maths_Try.html（Maths 0.1.0 獨立試用版）。涵蓋 23 個普通數學入門技能及 5 個奧數主題、84 個題目模板。不是完整小一至小六題庫，也不是 V33 英文合併版。',
'取得方式是資料庫索引全文，208,912 bytes，與清單標示大小一致，包含完整 HTML 尾段及四段程式。原始 HTML／ZIP bytes 未能授權取出，因此此 SHA-256 只鎖定本次受測文字快照，不能證明與原 ZIP 位元組完全相同。',
'瀏覽器使用 Chromium '+manifest['browser']['engine'].replace('Chromium ','')+'。由於環境不能瀏覽 file:// 或 localhost，採 page.set_content 載入，並注入隔離記憶體 localStorage 模擬器。確有進行 DOM 點擊、填答、鍵盤輸入和畫面檢查；沒有將這些結果當成原生存檔、部署或手機真機認證。','',
'## 2. 數量與計數方法','',
'| 類別 | 項數 | 通過 | 未通過 |','|---|---:|---:|---:|']
for _,name,n,p,f,_ in category_rows:md.append(f'| {name} | {n} | {p} | {f} |')
md+=['| **合計** | **1000** | **960** | **40** |','',
'1,000 指有唯一 ID 的測例，不是 1,000 個獨立功能，也不是 1,000 個漏洞。參數化測例明確列出；同一根源可能令多個測例失敗。重跑和額外截圖不增加數目。',
f'504 組出題測例為 84 模板 × 6 種子，不保證每組都是不同題目。本批有 {unique} 個「模板＋題幹＋答案＋餘數」不同組合；同範圍題目產生重複數字不單獨列為 bug。',
'答案參考值由 Python Fraction、另寫公式／枚舉計算，不是直接用受測程式自己的判分結果作答案真值。',
'測試通過率不是安全程度、教學效果或商用品質分數；不能由此推論程式已完美。','']
for code,name,n,p,f,desc in category_rows:md.append(f'- {code}：{desc}')
md+=['','## 3. 問題與修正驗收條件','',
'優先級是本項目修正次序，不是 CVSS 安全評分。P1：資料／主要功能阻斷，建議合併前處理；P2：判分、操作或恢復體驗；P3：防護一致性。沒有找到或宣稱遠端入侵、外洩等未驗證攻擊。','']
for i in issues:
    md+=[f"### {i['priority']}｜{i['title']}",f"**{i['id']}** · {i['failed_cases']} 項失敗 · {i['scope']}",'',f"**重現：** {i['trigger']}",'',f"**實際結果：** {i['observed']}",'',f"**影響：** {i['impact']}",'',f"**建議修正：** {i['fix']}",'',f"**修正後驗收：** {i['acceptance']}",'',f"案例：{', '.join(i['cases'])}",f"程式位置：{'; '.join(i['source'])}",'']
md+=['## 4. 已有證據支持的正常功能','',
'504 組出題的獨立數學答案、84 個模板的瀏覽器正答提交，以及 80 組數字／算式解析案例全部通過。這證明指定樣本內的行為，不代表所有隨機輸入、教學語義都正確。',
'普通數學完整六階段、奧數完整六階段與策略卡、兩條路線掌握度隔離、錯題用兩道新題重練、每日 10 題及起步 15 題均有對應通過案例。',
'帳戶切換、防止另一學員備份覆蓋、保存失敗回復、重複作答／獎勵、家長時限等在報告列明條件下通過；這些儲存和帳戶測試使用的是本機橋接／隔離模擬，不是真實英文共用錢包。',
'六種視窗尺寸（320、390、640、768、844、1440 px）的指定畫面沒有整頁水平溢出。這不等於完整手機相容性或無障礙認證。',
'音效測到 WebAudio 音符建立及關閉設定；缺少粵語聲線時有文字提示。沒有真人試聽，因此不聲稱聲音好聽、音量合適或粵語發音已驗收。','',
'## 5. 未驗證，不可當成通過','',
'英文 V33 與數學實際合併後的帳戶、獎勵、總時限、總報告、遊戲中開關數學，以及舊版本資料遷移，仍需要在真正合併版測試。原始 V33 ZIP 只有清單記錄，未取得可執行內容。',
'真實 localStorage、瀏覽器關閉／重開、真實跨分頁同時写入、file/HTTP 部署、Android／iPhone／Safari、真實雲端服務、老師覆核和學童試用未納入驗收。',
'雖有格式安全及 HTML 文字案例，本輪不是全面滲透測試，也没有以大量 pass 數代替小遊戲手感、教學吸引力或真人體驗。','',
'## 6. 建議下一輪順序','',
'先修資料型別／作答驗證、啟動恢復、刪除完整性及獎勵收據上限；再修分數正規化、草稿、課堂恢復及焦點。按相同 ID 重跑 40 個失败案例，再重跑全部 1,000 項，確保沒有破壞原有正常功能。',
'之後在真正 V33 合併版加做英文↔數學跨模組回歸與真機測試。修正建議和驗收條件不是已完成的修補；本包是檢查交付，不是升級版本。','',
'## 7. 檔案及重現','',
'直接打開 report/WordQuest_1000_Checks_Report.html 可看完整報告；看報告不需要 Python 或 Node.js。1000 項逐條結果在 results/all_1000_results.json，原始分批輸出也有保留。',
'測試程式在 tests/；tests/run_all.py 負責重新執行。重跑需要 Python、Node.js、Playwright 及 Chromium。瀏覽器路徑可用 CHROMIUM_PATH 指定。全部資料為測試虛構學員；沒有使用真實學童資料。',
f'受測快照 SHA-256：`{sha}`','',
'早期 evidence/ 截圖可能截到淡入動畫中途；以 review_*_settled.png 為靜止畫面參考。補充缺題佇列與分數重現沒有另加進 1,000 項。']
(OUT/'WordQuest_1000_Checks_Report.md').write_text('\n'.join(md),encoding='utf-8')
# Standalone report: embedded evidence and no external assets.
H=html.escape
imgs={p.name:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (ROOT/'evidence').glob('*.png')}
cathtml=''.join(f'<tr><td>{H(name)}<small>{H(desc)}</small></td><td>{n}</td><td>{p}</td><td class="badnum">{f}</td></tr>' for _,name,n,p,f,desc in category_rows)
issuehtml=''
for idx,i in enumerate(issues,1):
    issuehtml+=f'''<article class="issue" id="{i['id']}"><div class="issue-top"><span class="priority {i['priority']}">{i['priority']}</span><span>{i['failed_cases']} 個失敗測例</span></div><h3>{idx:02d}　{H(i['title'])}</h3><p class="muted">{H(i['scope'])} · <code>{i['id']}</code></p><p><b>實測結果</b>　{H(i['observed'])}</p><p><b>對使用者的影響</b>　{H(i['impact'])}</p><details><summary>重現步驟、修正方向及驗收條件</summary><dl><dt>重現</dt><dd>{H(i['trigger'])}</dd><dt>建議修正（尚未執行）</dt><dd>{H(i['fix'])}</dd><dt>修正後驗收</dt><dd>{H(i['acceptance'])}</dd><dt>程式位置</dt><dd>{H('; '.join(i['source']))}</dd><dt>對應測例</dt><dd>{H(', '.join(i['cases']))}</dd></dl></details></article>'''
summary_json=json.dumps(rows,ensure_ascii=False).replace('<','\\u003c')
images_json=json.dumps(imgs).replace('<','\\u003c')
css='''*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#213d38;font:16px/1.75 system-ui,-apple-system,"Noto Sans TC","Microsoft JhengHei",sans-serif}main{max-width:1160px;margin:auto;padding:42px 28px 70px}header{background:#193f3a;color:#fffdf5;padding:44px;border-radius:24px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700;opacity:.8}h1{font-size:clamp(28px,4vw,48px);line-height:1.25;margin:14px 0 18px}h2{font-size:28px;margin:0 0 14px}h3{font-size:21px;line-height:1.55;margin:12px 0}.lead{font-size:18px;max-width:860px}.muted{color:#637670}.pill{display:inline-block;padding:4px 12px;border:1px solid #ffffff50;border-radius:30px;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}.metric{background:white;border:1px solid #dce1d7;border-radius:18px;padding:22px}.number{font-size:42px;font-weight:750;line-height:1.2}.metric span{display:block;margin-top:10px;color:#5d7069}.warning{background:#fff0cf;border-left:4px solid #bd8133;padding:20px 24px;border-radius:12px;margin:24px 0}.note{background:#eaf0e8;padding:20px 24px;border-radius:14px}.section{margin-top:48px}nav{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0}nav a{padding:9px 16px;border:1px solid #cbd5cb;border-radius:24px;color:inherit;text-decoration:none}table{width:100%;border-collapse:collapse;background:white}th,td{padding:16px;text-align:right;border-bottom:1px solid #e0e5dd;vertical-align:top}th:first-child,td:first-child{text-align:left;width:70%}th{background:#e6eee5}td small{display:block;font-size:13px;color:#61766c;max-width:660px}tfoot{font-weight:bold}.tablebox{border:1px solid #dbe2d8;border-radius:16px;overflow:hidden}.badnum{color:#a34232;font-weight:700}.issue{padding:26px 30px;background:white;border:1px solid #dce2d9;border-radius:18px;margin:16px 0}.issue-top{display:flex;gap:12px;align-items:center;font-size:13px;color:#66766c}.priority{font-weight:750;border-radius:6px;padding:3px 10px}.P1{color:#a33e2d;background:#fbe6dd}.P2{color:#845515;background:#fff0cb}.P3{color:#43665e;background:#e9f0e7}details>summary{cursor:pointer;font-weight:650;padding:12px 0;list-style-position:inside}details[open]>summary{margin-bottom:8px}dt{font-weight:750;margin-top:14px}dd{margin:3px 0 0}code{font-family:ui-monospace,monospace;font-size:13px;overflow-wrap:anywhere}p{margin:12px 0}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.gallery figure{margin:0;background:white;border:1px solid #dce2d9;border-radius:18px;padding:15px}.gallery img{width:100%;height:340px;object-fit:contain;object-position:top;background:#f7f6ef}.gallery figcaption{font-size:14px;margin-top:12px}.filters{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#f5f4eff2;padding:14px 0;z-index:1}.filters input,.filters select,button{border:1px solid #bfcec0;border-radius:10px;background:white;color:inherit;padding:12px;font:inherit;min-height:46px}.filters input{flex:1;min-width:160px}button{cursor:pointer}.test{background:#fff;border:1px solid #dce2d9;border-radius:12px;padding:4px 18px;margin:9px 0}.test summary{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}.status{font-size:12px;font-weight:750;padding:3px 8px;border-radius:5px}.PASS{color:#2d6652;background:#e9f4e9}.FAIL{color:#a64032;background:#fce7df}.test h4{margin:12px 0 4px}.test pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f6f1;padding:14px;border-radius:10px;font-size:13px;line-height:1.65;max-height:360px;overflow:auto}.test img{max-width:100%;max-height:720px;object-fit:contain;border:1px solid #ddd}.pager{display:flex;gap:14px;align-items:center;justify-content:center;padding:20px 0}.hash{overflow-wrap:anywhere;font-size:13px}footer{border-top:1px solid #d2dacd;padding:22px 0;color:#66756a;font-size:13px;margin-top:45px}a{color:#215e50}.two{display:grid;grid-template-columns:1fr 1fr;gap:20px}.two article{background:white;border:1px solid #dce2d9;border-radius:16px;padding:22px}.two h3{margin-top:0}@media(max-width:700px){main{padding:18px 16px 45px}header{padding:28px 22px;border-radius:18px}.metrics{grid-template-columns:1fr 1fr;gap:10px}.metric{padding:18px}.number{font-size:34px}.section{margin-top:36px}h2{font-size:25px}.issue{padding:20px}.gallery,.two{grid-template-columns:1fr}.gallery img{height:400px}.filters{position:static}th,td{padding:12px 9px}th:first-child,td:first-child{width:auto}td small{display:none}.lead{font-size:16px}}@media print{body{background:white}main{max-width:none;padding:0}header{color:#213d38;background:#f0f4ed;break-inside:avoid}.filters,.pager,#ledger,.gallery{display:none}.issue{break-inside:avoid}.section{margin-top:25px}details{display:block}nav{display:none}}'''
js='''const rows=JSON.parse(document.getElementById('audit-data').textContent),images=JSON.parse(document.getElementById('audit-images').textContent);const status=document.getElementById('status'),cat=document.getElementById('cat'),search=document.getElementById('search'),list=document.getElementById('cases'),count=document.getElementById('shown');let page=0;const size=40;function el(tag,text,cls){let e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}function draw(){let q=search.value.trim().toLowerCase(),v=rows.filter(r=>(!status.value||r.status===status.value)&&(!cat.value||r.category===cat.value)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));let pages=Math.max(1,Math.ceil(v.length/size));page=Math.min(page,pages-1);list.replaceChildren();for(const r of v.slice(page*size,(page+1)*size)){let d=el('details',undefined,'test'),s=el('summary');s.append(el('span',r.status==='PASS'?'通過':'未通過','status '+r.status),el('code',r.id),el('span',r.name));d.append(s);for(const [title,text] of [['預期結果',r.expected],['實際结果',typeof r.actual==='object'?JSON.stringify(r.actual,null,2):String(r.actual)],['方法',r.method||''],['操作',r.actions&&r.actions.length?r.actions.join(' → '):'函式層測試／直接載入指定測試狀態'],['問題編號',r.issue||'無']]){d.append(el('h4',title),el(title==='實際结果'?'pre':'p',text))}if(r.pageErrors&&r.pageErrors.length)d.append(el('h4','未處理瀏覽器錯誤'),el('pre',r.pageErrors.join('\\n')));if(r.evidence){let id=r.evidence.split('/').pop(),src=images[id];if(src){let e=el('details'),sum=el('summary','查看當次截圖（可能在進場動畫中途）'),im=el('img');im.loading='lazy';im.alt=r.id+' 實測證據';im.src=src;e.append(sum,im);d.append(e)}}list.append(d)}count.textContent=`符合條件 ${v.length} 項 · 第 ${page+1} / ${pages} 頁`;document.getElementById('prev').disabled=page===0;document.getElementById('next').disabled=page>=pages-1}for(let e of [status,cat,search])e.addEventListener('input',()=>{page=0;draw()});document.getElementById('prev').onclick=()=>{page--;draw()};document.getElementById('next').onclick=()=>{page++;draw()};document.getElementById('export-json').onclick=()=>{let blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='WordQuest_1000_results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};draw();'''
page=f'''<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WordQuest｜1,000 項檢查報告</title><style>{css}</style></head><body><main>
<header><div class="eyebrow">WORDQUEST / PRE-INTEGRATION AUDIT / 2026.09.29</div><h1>1,000 項檢查<br>找出合併前要修正的問題</h1><p class="lead">本次數學／奧數獨立試用版共 960 項通過、40 項未通過，歸納為 10 類問題。出題及一般課堂流程有正常證據，但資料恢復、獎勵上限和草稿保存仍需修正。</p><span class="pill">檢查交付 · 未改動原程式 · 不是升級版</span></header>
<div class="metrics"><div class="metric"><div class="number">1,000</div><span>已執行的唯一測例</span></div><div class="metric"><div class="number">960</div><span>通過</span></div><div class="metric"><div class="number badnum">40</div><span>未通過</span></div><div class="metric"><div class="number">10</div><span>歸納後的問題類別</span></div></div>
<div class="warning"><strong>先說清楚檢查範圍</strong><p>受測對象是 <b>WordQuest Maths 0.1.0 獨立試用版</b>，不是 V33 英文合併版。瀏覽器實測有真正點擊、填答與鍵盤操作，但存檔使用隔離的記憶體模擬；不能當成原生儲存、真機或上線認證。</p></div>
<nav><a href="#scope">範圍與計數</a><a href="#issues">10 類問題</a><a href="#evidence">畫面證據</a><a href="#limits">未驗證範圍</a><a href="#ledger">逐項結果</a></nav>
<section id="scope" class="section"><h2>01　測了甚麼</h2><p>23 個普通數學入門技能、5 個奧數主題、84 個題目模板。這仍是入門模組，不能當作完整小一至小六或完整奧數課程。</p><div class="tablebox"><table><thead><tr><th>測試類別</th><th>項數</th><th>通過</th><th>未通過</th></tr></thead><tbody>{cathtml}</tbody><tfoot><tr><td>合計</td><td>1000</td><td>960</td><td>40</td></tr></tfoot></table></div><div class="note"><strong>數目代表測例，不代表功能或漏洞數。</strong><p>參數化檢查逐項保留 ID、输入條件、預期及實際結果；同一問題可以令多個測例失敗。504 組生成案例是 84 模板 × 6 種子，本批共有 {unique} 個不同的「模板＋題幹＋答案＋餘數」組合。重跑與補拍截圖不另加數目。</p><p>數學參考答案另以 Python Fraction、公式或枚舉運算核對，不是拿程式自己的判分作真值。通過比例不是安全、教學或商用品質評分。</p></div></section>
<section id="issues" class="section"><h2>02　10 類需要優化的問題</h2><p>5 類 P1 建議合併前處理，4 類 P2 涉及判分、操作或恢復，1 類 P3 屬日期防護一致性。這是本項目修正優先級，不是安全漏洞嚴重度認證。</p>{issuehtml}</section>
<section id="evidence" class="section"><h2>03　畫面證據</h2><p>以下在進場動畫完成後截取。數學模板的正答流程通過，不等於所有輸入格式與操作都沒有問題。</p><div class="gallery"><figure><img src="{imgs['review_mobile_word_settled.png']}" alt="390 像素應用題頁面"><figcaption>390px 應用題：正常顯示算式、答案及單位；版面寬度檢查通過。</figcaption></figure><figure><img src="{imgs['review_fraction_unicode_rejected.png']}" alt="Unicode 分數被誤拒"><figcaption>補充重現：2⁄3 的數值正確，但 Unicode 分數斜線被當成錯誤格式。</figcaption></figure><figure><img src="{imgs['review_missing_queue.png']}" alt="缺少題目佇列的恢復畫面"><figcaption>補充重現：異常練習資料被接受後，續課沒有答案欄與提交按鈕。</figcaption></figure></div><p class="muted">每個失敗 UI 案例另保留原始當次截圖；可在逐項結果展開。截圖不是每種裝置的真人可用性驗收。</p></section>
<section id="limits" class="section"><h2>04　可確認與未驗證的界線</h2><div class="two"><article><h3>已有通過證據</h3><p>504 組獨立答案核對、84 個模板逐一正答提交、80 組解析檢查，以及普通數學／奧數六階段課堂、策略卡、錯題重練與路線隔離。</p><p>指定六種視窗尺寸沒有整頁水平溢出。啟用音效建立 WebAudio 音符，關閉後不建立；沒有可用粵語聲線時提供提示。</p></article><article><h3>不能當成已完成</h3><p>真正 V33 英文↔數學合併、跨模組錢包與時限、原生 localStorage、真實同時多分頁寫入、file/HTTP 部署、Android／iPhone／Safari。</p><p>真人粵語試聽、教師覆核、學童試玩、整體小遊戲手感及全面滲透測試也未完成。沒有以自動化數字代替這些驗收。</p></article></div><div class="warning"><b>修正順序</b><p>先處理 P1 的資料、啟動、刪除與獎勵，再處理判分、草稿、恢復及焦點；先重跑 40 個失敗案例，再跑全套 1,000 項。之後才在真正 V33 合併版做跨模組回歸和真機驗收。</p></div></section>
<section id="ledger" class="section"><h2>05　1,000 項完整檢查結果</h2><p>預設只顯示 40 個未通過案例；選「全部」可查看完整 1,000 項。每項可展開預期、實際結果與操作。這些結果是修正前基線。</p><div class="filters"><label>狀態 <select id="status"><option value="FAIL">未通過</option><option value="">全部</option><option value="PASS">通過</option></select></label><label>類別 <select id="cat"><option value="">所有類別</option>{''.join(f'<option value="{c}">{H(n)}</option>' for c,n,*_ in CATS)}</select></label><input id="search" aria-label="搜尋案例" placeholder="搜尋 ID、功能或問題編號"><button id="export-json">匯出完整 JSON</button></div><p id="shown" aria-live="polite"></p><div id="cases"></div><div class="pager"><button id="prev">上一頁</button><button id="next">下一頁</button></div><noscript><p>本區需要啟用 JavaScript；完整逐項結果亦收錄於 results/all_1000_results.json。</p></noscript></section>
<section class="section"><h2>06　來源與可重現性</h2><p>來源：WordQuest_Maths_Try.html 的索引全文，208,912 bytes，含完整 HTML 結尾及 4 段程式。原 HTML／ZIP 原始位元組未能取得；本次雜湊只識別受測全文快照，不證明與原 ZIP 完全相同。</p><p>環境：{H(manifest['browser']['engine'])} · Node.js {H(manifest['node'])} · Python {H(manifest['python'])}。受限環境以 set_content 載入頁面、以隔離儲存模擬器執行。測試使用虛構學員。</p><p class="hash"><b>受測快照 SHA-256</b><br><code>{sha}</code></p><p>完整套件包含 HTML／Markdown 報告、全部 JSON 結果、10 類問題表、截圖、受測文字快照與可重跑測試程式。看這份報告不需要安裝 Python 或 Node.js。</p></section>
<footer>WordQuest｜2026-09-29 檢查快照 · 本報告不是完美／商用／安全認證。未通過不等於 40 個獨立漏洞；未測試不當成通過。</footer></main><script id="audit-data" type="application/json">{summary_json}</script><script id="audit-images" type="application/json">{images_json}</script><script>{js}</script></body></html>'''
(OUT/'WordQuest_1000_Checks_Report.html').write_text(page,encoding='utf-8')
print('Report generated:',len(rows),'cases',dict(counts),'roots',len(issues),'html bytes',len(page.encode()),'SHA',sha)
