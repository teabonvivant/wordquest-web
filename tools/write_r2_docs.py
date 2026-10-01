"""Generate delivery pages from executed test evidence. Does not fabricate missing results."""
from pathlib import Path
import json,html,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'arcade_evidence'
def load(n):return json.loads((E/n).read_text())
suites=[('引擎、舊局面相容、玩法及錢包規則','core_results.json'),('五款街機、操作、暫停及畫面尺寸','browser_results.json'),('原生音訊、音量、觸控事件及儲存失敗','safety_results.json'),('由 R1 實際建立舊局，再交給 R2 續玩','compatibility_results.json')]
allcases=[];counts=[]
for name,f in suites:
 xs=load(f);counts.append((name,len(xs),sum(bool(x['pass']) for x in xs)));allcases += [{**x,'suite':name} for x in xs]
xs=load('r1_regression/integration_results.json');counts.append(('英文＋數學整合回歸',len(xs),sum(x['status']=='PASS' for x in xs)));allcases += [{**x,'suite':'英文＋數學整合回歸','pass':x['status']=='PASS'} for x in xs]
syntax=load('syntax.json');total=sum(n for _,n,_ in counts);passed=sum(n for _,_,n in counts)
sha=hashlib.sha256((ROOT/'app/index.html').read_bytes()).hexdigest()
summary={'version':'R2.0.0','base':'V32 + Maths 0.1.2 integrated R1','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'case_total':total,'case_pass':passed,'case_fail':total-passed,'syntax_total':len(syntax),'syntax_pass':sum(x['pass'] for x in syntax),'app_sha256':sha,'suites':[{'name':n,'total':t,'pass':p} for n,t,p in counts],'limits':['Chromium DOM via set_content; file/HTTP navigation blocked in execution environment','Storage, Web Locks, WebCrypto API adapters are explicit test substitutes','AudioContext and analyser samples are native Chromium','No physical phone/Safari/Windows/native disk persistence certification','Synthetic accounts, balances and answers; no real student dataset supplied','V33 source ZIP inaccessible; reconstructed from history on R1, not literal V33 restore']}
(E/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
style='''*{box-sizing:border-box}body{margin:0;background:#f4f2e9;color:#263d48;font:16px/1.85 system-ui,"Microsoft JhengHei",sans-serif}main{max-width:1120px;margin:auto;padding:45px 24px 80px}h1{font-size:clamp(29px,5vw,44px);line-height:1.3;margin:12px 0 20px}h2{font-size:25px;margin:38px 0 14px}h3{font-size:19px}.kicker{font-size:12px;letter-spacing:2px;font-weight:750;color:#637975}.card,details{background:#fffef8;border:1px solid #d7ddd0;border-radius:20px;padding:23px;margin:20px 0}.note{border-left:4px solid #b9863f;background:#f6e9cd;padding:18px 22px;margin:22px 0;border-radius:0 15px 15px 0}.buttons{display:flex;flex-wrap:wrap;gap:12px}.button{display:inline-block;background:#285c59;color:white;padding:13px 21px;border-radius:13px;text-decoration:none;font-weight:750}.button.secondary{background:#e0e8df;color:#28554d}a{color:#235e60}small,.muted{color:#62726d}table{border-collapse:collapse;width:100%;font-size:15px}td,th{padding:14px 12px;text-align:left;border-bottom:1px solid #dce2d7;vertical-align:top}th{background:#e9eee5}.scroll{overflow:auto}code{overflow-wrap:anywhere;font-size:13px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;background:#eef1e8;padding:15px;border-radius:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.stats{display:flex;gap:15px;flex-wrap:wrap}.stats>div{background:#e4ece2;border-radius:16px;padding:17px 22px;flex:1;min-width:140px}.stats b{display:block;font-size:30px}.pass{color:#266345}.fail{color:#a13222}summary{cursor:pointer;font-weight:700}img{max-width:100%;border-radius:16px;border:1px solid #cfdbce}figure{margin:0}li{margin:9px 0}@media(max-width:680px){main{padding:28px 17px 55px}.grid{grid-template-columns:1fr}.card,details{padding:18px}.button{width:100%;text-align:center}th,td{padding:12px 9px}}'''
def doc(title,body):return f'<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><style>{style}</style></head><body><main>{body}</main></body></html>'
games=[('遺跡郵差','ruins-courier','三段1500米路線；跳欄、滑拱門、找石牆缺口，不能只靠左右換線通关。','← → 換線；↑／Space 跳；↓ 滑行'),('雲島探險','cloud-island','三座平台關卡；短跳、高跳、移動台、彈簧、短衝；安全旗幟重生。','← → 移動；↑／Space 跳；X 短衝'),('星環巡航','star-patrol','三區、每區六波編隊與守關機；集中／散射、能量升級、護盾及半血換彈幕。','方向鍵移動；Space 護盾；X 切換；Shift 慢移'),('燈塔深井','lighthouse-well','60層，移動、輸送、脆裂、彈簧及危險平台；選落點及使用降落傘。','← → 移動；↓ 穿台；Space 降落傘'),('海港排球','harbor-volley','有反應時間的電腦對手、高球、短球、扣球、三觸球；先5分領先2分，最多7分。','← → 移動；↑ 跳；Space 擊球；↓＋Space 短球')]
game_table='<div class="scroll"><table><tr><th>遊戲</th><th>玩法</th><th>電腦操作</th></tr>'+''.join(f'<tr><td><b>{n}</b></td><td>{d}</td><td>{k}</td></tr>' for n,_,d,k in games)+'</table></div>'
start=f'''<div class="kicker">WORDQUEST · ENGLISH + MATHS + ARCADE R2</div><h1>英文、數學、街機<br>在同一個學習入口。</h1><p>在已交付 R1 上加入五款原創街機，保留原有21款遊戲、學員及金幣規則。這是按可取回記錄重新實作的 <b>R2</b>，不是成功取回 V33 原始套件。</p><div class="buttons"><a class="button" href="app/index.html">開啟英文＋數學＋街機 R2</a><a class="button secondary" href="app/index.html#game">直接進入街機大堂</a><a class="button secondary" href="docs/街機R2_升級及驗證報告.html">本輪升級及檢查報告</a></div><div class="note"><b>先解壓整個 ZIP，然後再開啟本頁。</b>程式已建好，一般使用不需要 Python。已有資料請先在原版本分別匯出英文與數學備份。不要直接覆蓋唯一一份舊檔案或未知 V33 存檔。</div><h2>五款新街機</h2>{game_table}<div class="card"><h2 style="margin-top:0">怎樣開始？</h2><p>進入程式 → 沿用本機帳戶或建立新帳戶 → 選擇孩子 → 按「街機」→「新街機」。先看真實玩法預覽，再確認投幣及按開始。未開放的遊戲仍有全彩預覽。</p><p>每局1金幣，沿用每輪5次入場的既有規則。暫停及接續不再收費；遊戲收集物只增加遊戲分數，不增加學習金幣。可按「放大／還原」；手機旋轉橫向時，控制鍵移到右方。</p><p>音量在遊戲下方「音量與試音」調整。聲效及新街機配樂分開控制，仍受頁首總聲效開關管理。</p></div><h2>已執行的檢查</h2><div class="stats"><div><b>{passed}/{total}</b>本輪案例通過</div><div><b>{sum(x['pass'] for x in syntax)}/{len(syntax)}</b>JavaScript 語法檢查</div><div><b>26</b>保留21款＋新增5款</div></div><p>自動化結果不是遊戲趣味評分。真正的手機、Safari、Windows啟動器及原生跨分頁／重開瀏覽器儲存仍待驗證。</p><h2>Windows 固定網址啟動</h2><p>可執行 <code>START_WINDOWS.cmd</code>，沿用系統 PowerShell 本機啟動器，不需另裝 Python。程式只綁定 <code>127.0.0.1:8765</code>；保持視窗開啟，關閉即停止。這個啟動器未在 Windows 真機驗收；受公司安全政策阻擋時，不要關閉防護。</p><div class="note">不同瀏覽器、檔案位置或網址不會自動共用舊資料。此 ZIP 包含程式及開發資料，不包含你電腦裏尚未匯出的個人學員紀錄。未知 V33 備份格式未確認，請保留原件。</div><h2>檔案入口</h2><p><a href="docs/街機R2_開發交接.md">R2 開發交接</a> · <a href="arcade_evidence/summary.json">本輪結果摘要 JSON</a> · <a href="originals/R1/README_先看這份.md">R1 原說明</a> · <a href="docs/本輪套用及驗證報告.html">上一輪 R1 歷史報告</a></p><p class="muted">R1 及更舊報告均保留作追查，不把歷史「通過」字樣當成本輪已重新驗證。</p>'''
(ROOT/'START_HERE.html').write_text(doc('WordQuest R2｜開始使用',start.replace('通关','通關')))
rows=''.join(f'<tr><td>{n}</td><td>{p}/{t}</td></tr>' for n,t,p in counts)
report=f'''<div class="kicker">WORDQUEST R2 · IMPLEMENTATION + EXECUTED CHECKS</div><h1>街機 R2<br>升級及驗證報告</h1><p><a href="../START_HERE.html">返回開始頁</a> · <a href="../app/index.html#game">開啟街機</a></p><div class="note"><b>版本來源：</b>英文 V32＋Maths 0.1.2 整合 R1。參照歷次對話記錄，實作五款新街機。V33 原創街機 ZIP 及其審核 ZIP 的原始內容仍不可取得；本版不冒稱已讀取或原樣還原 V33 原碼。</div><h2>1. 套用內容</h2>{game_table}<p>所有新增場景由 Canvas 程式繪製；音效和短配樂為合成音。新增街機本身不需要下載外部圖像或音樂。未更換原有英文字庫、數學題庫、判分及角色原图。原有英文相機／OCR的網絡依賴不在本輪驗收範圍。</p><h2>2. 舊紀錄與金幣</h2><div class="card"><p>沿用 R1 的帳戶、孩子及 <code>arcadeV28</code> 資料格式。原有21個遊戲ID及舊分數保留；新增五個ID另外記分。最佳成績上限由63格擴為78格，容納26遊戲×3難度。</p><p>入場1幣、每輪5次、有效學習派幣及家長限制均沿用既有規則。暫停／接續／還原不重新扣幣；不自動續幣。純遊戲分數和收集物不轉成學習金幣。</p><p>測試在 R1 實際介面建立了 <b>sky-rescue 和 number-garden</b> 的已投幣暫停局面，再把序列化的測試儲存交給R2。R2可接續同一收據和局面，保留餘額、英文詞語及孩子資料。這是相容性測試樣本，不是已存取用戶真正瀏覽器資料。</p></div><h2>3. 本輪處理的問題</h2><div class="scroll"><table><tr><th>問題／要求</th><th>本輪處理與驗證</th></tr><tr><td>遊玩前音效解鎖立即被暫停</td><td>重排音效解鎖流程。原生 AudioContext 量到非零訊號，暫停即停止排程。</td></tr><tr><td>即時音量與靜音不完全生效</td><td>分開音效／配樂總線，清除舊自動化再設定即時增益；以兩總線增益及真正分析器樣本核對零音量。</td></tr><tr><td>跑酷只換線便足夠</td><td>加入橫跨三線的木欄與拱門，要求跳躍／滑行；單用換線的測試路線不能完成。</td></tr><tr><td>重生連死、保護時間再次墮下</td><td>雲島及深井回到安全平台；保護時間再次跌出場外會安全復位且保留剩餘保護時間，不重複扣命或產生無效高度。</td></tr><tr><td>手機放大反而畫面縮小</td><td>按實際可用空間計算canvas尺寸；放大時隱藏裝飾角色列；橫向鍵盤移到旁邊，另有可閱讀HTML即時狀態。</td></tr><tr><td>觸控取消後仍當作按住跳躍</td><td>取消事件清除相應的按住／預輸入狀態；同時按兩個跳躍鍵則保留尚未放開的一個。</td></tr><tr><td>排球末局第四次觸球局面不合法</td><td>得分時重設觸球計數；結束局亦可通過嚴格存檔核對。</td></tr><tr><td>飛行能量升級只有數字變動</td><td>能量升級實際增加發射物力度；保留集中與散射差異。</td></tr></table></div><h2>4. 已執行結果</h2><div class="stats"><div><b>{passed}/{total}</b>案例通過</div><div><b>{total-passed}</b>最終未通過</div><div><b>{len(syntax)}</b>另外的語法檢查</div></div><div class="scroll"><table><tr><th>測試範圍</th><th>通過／總數</th></tr>{rows}</table></div><p>各案例有獨立ID，但包含相同功能的不同難度、種子及畫面尺寸；不是{total}個獨立功能。工程化測試和機械路線不是真人覺得好玩的證明。</p><p>跑酷、雲島及深井有完整受控路線通關測試；飛行的守關階段及排球終局另有明示狀態夾具。沒有把人工設定局面說成真人全關卡實玩。</p><p>第一次音量／觸控測試失敗記錄保留於 <a href="../arcade_evidence/safety_first_run.json">safety_first_run.json</a>。其中持續按鍵的早期測試沒有先捲到按鈕位置，是測試腳本問題；已修正腳本。音量總線未生效則是實際程式問題，已修改後重跑。不把首次失敗及重跑數量重複計入上表。</p><p>交付前並行啟動三組瀏覽器檢查時，其中一次在載入新頁面時發生 Chromium「Page crashed」。中斷記錄保留於 <a href="../arcade_evidence/parallel_run_interruption.json">parallel_run_interruption.json</a>；其後改為逐組執行並重跑通過。這個中斷未被計作通過，也未以測試結果推論真機記憶體壓力已通過。</p><h2>5. 真實瀏覽器截圖</h2><p>下列為 Chromium 實際程式畫面；不是新畫的宣傳示意圖。裝置尺寸模擬仍不等同真正 iPhone／Android。</p><div class="grid"><figure><img src="../arcade_evidence/ruins-courier_390x844.png" alt="390像素直向跑酷操作"><figcaption>直向：放大模式及觸控按鈕。</figcaption></figure><figure><img src="../arcade_evidence/star-patrol_844x390.png" alt="844像素橫向飛行操作"><figcaption>橫向：畫面和控制鍵分區。</figcaption></figure></div><h2>6. 程式來源與保留資料</h2><p>R1的35段既有腳本中，31段未變動；修改局面驗證、街機目錄／錢包、快照介面及應用宿主4段，再加1段新遊戲引擎。既有英文／數學引擎及題庫維持原位。逐段SHA-256見 <a href="../arcade_evidence/source_comparison.json">source_comparison.json</a>。</p><p>新原始碼在 <code>arcade_src/</code>；可重建測試在 <code>arcade_tests/</code>；結果在 <code>arcade_evidence/</code>。R1主程式、入口及舊建置工具在 <code>originals/R1/</code>，更舊完整资料及素材仍在 <code>originals/WordQuest_Program_and_Data_20260929/</code>。</p><h2>7. 驗收限制</h2><div class="note"><p><b>本輪實際做到：</b>Chromium DOM、真實點擊／鍵盤／Pointer Event 路徑、原生Web Audio訊號及不同視窗尺寸。</p><p><b>測試替身：</b>因執行環境禁止檔案／HTTP導航，用 <code>page.set_content()</code> 載入完整頁面；儲存、Web Locks、WebCrypto API接駁使用明示替身。所有學員、餘額、作答均為測試夾具。</p><p><b>未驗收：</b>原生磁碟保存與真正關閉再開瀏覽器、原生跨分頁競爭、Windows啟動器、Safari及手機真機、揚聲器聽感、真實小朋友的難度與趣味、相機／OCR／外部CDN。不是雲端帳戶、安全考試系統或無漏洞／商用認證。</p></div><h2>8. 逐項結果</h2><p>只展開需要查閱的組別，避免一開始載入大量表格。</p>'''
for name,_,_ in counts:
 matching=[x for x in allcases if x['suite']==name]
 report+=f'<details><summary>{html.escape(name)} · {len(matching)}項</summary><table><tr><th>ID</th><th>案例</th><th>結果</th></tr>'+''.join(f'<tr><td>{html.escape(x["id"])}</td><td>{html.escape(x["name"])}</td><td class="{"pass" if x["pass"] else "fail"}">{"通過" if x["pass"] else "未通過"}</td></tr>' for x in matching)+'</table></details>'
report+=f'<p class="muted">程式SHA-256：<code>{sha}</code></p>'
(ROOT/'docs/街機R2_升級及驗證報告.html').write_text(doc('WordQuest R2 升級及驗證報告',report.replace('原图','原圖').replace('完整资料','完整資料').replace('通关','通關')))
readme=f'''# WordQuest 英文＋數學＋街機 R2

## 開始使用

解壓整個ZIP，開啟 `START_HERE.html`，再按「開啟英文＋數學＋街機 R2」。成品位於 `app/index.html`，不需安裝Python或Node。
街機大堂預設「新街機」，「全部」可查看26款；確認投幣後再按開始，暫停與接續不重複收費。未開放也有全彩預覽。

Windows可用 `START_WINDOWS.cmd`（系統PowerShell，固定127.0.0.1:8765）；原啟動器未在Windows真機验證。不需要管理員權限，不要為它關閉公司安全政策。

## 版本與來源

基礎：已交付 `WordQuest_V32_Maths_Integrated_R1_20260929.zip`。本版新增5款：遺跡郵差、雲島探險、星環巡航、燈塔深井、海港排球；保留原有21款及英文／數學整合。
從歷次對話取回玩法和缺陷記錄。V33原始ZIP及其審核ZIP仍無授權原始內容可讀。本版為新實作的R2，不是原樣復原V33，也未加入缺失的Maths0.1.3新角色原件。

## 資料保護

升級前先在舊程式分別匯出英文備份及數學備份；保留舊程式副本。不要覆蓋唯一備份。不同瀏覽器、網址、file路徑之間不會自動搬資料。
沿用R1的本機帳戶、孩子及arcadeV28格式；原有21款的最高分和有效未完成局面保留，新5款另記分。R1兩款代表遊戲已在真正介面建立局面，再以測試儲存接續到R2；不是讀取過用戶真實瀏覽器紀錄。
未知V33存檔不猜測轉換。ZIP不包含用戶電腦未匯出的個人學員資料。這仍是本機網頁，不是雲端同步或防作弊系統。

## 執行結果

本輪 {passed}/{total} 個案例通過；另外 {sum(x['pass'] for x in syntax)}/{len(syntax)} 段JavaScript語法通過。
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
'''
(ROOT/'README_先看這份.md').write_text(readme.replace('验證','驗證'))
print('Docs generated:',passed,'/',total)
