/* ===== p40 part 1: add-range flow (S3-09 three steps, D4 messages, D7 plain errors, D9 landing, D11 draft, D22, D23) ===== */
 const route=()=>(location.hash||'#kid').slice(1).split('?')[0];
 const guard=fn=>{try{return fn();}catch(e){try{console.warn('p40',e&&e.message||e);}catch(_){}}};
 const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
 const store={
  get(k){try{return localStorage.getItem(k);}catch(_){return null;}},
  set(k,v){try{localStorage.setItem(k,v);return true;}catch(_){return false;}},
  del(k){try{localStorage.removeItem(k);}catch(_){}}
 };
 const P40={};            // functions the host-closure anchors call (window.WQP40)
 const STEP_NAMES=['拍照或輸入','檢查單字','儲存'];
 let step=1,landing=null,ocrInterrupted=false,draftTimer=0,draftNote='',titleTouched=false,flash='';

 // ---------------------------------------------------------------- plain error text (D7) ----------------------------------
 const TECH=/[A-Za-z]{4,}\/|\.(?:js|wasm|gz|json)\b|HTTP|\b[45]\d\d\b|Failed|fetch|loader|undefined|\bError\b|NetworkError|下載失敗|不是有效|檔案大小|OCR檔案|WASM/i;
 function plainFail(msg){
  msg=String(msg||'');
  if(navigator.onLine===false)return ['現在沒有網絡，未能辨認相片。','連上網絡後再按一次，也可以直接輸入文字。'];
  if(/逾時|timeout|timed out|abort/i.test(msg))return ['辨認用了太長時間。','請把相片框小一點再試，也可以直接輸入文字。'];
  if(/太多|太大|像素|大小/.test(msg)&&!/OCR|wasm|模型/i.test(msg))return ['相片的內容太多或太大。','請框選小一點的範圍，也可以直接輸入文字。'];
  if(TECH.test(msg)||/載入|下載|未齊|元件|離線|網絡/.test(msg))return ['辨認功能沒有載入成功。','請檢查網絡後再按一次，也可以直接輸入文字。'];
  return ['這次沒有辨認成功。','請再按一次，也可以直接輸入文字。'];
 }
 function techDetails(msg){return '<details class="p40-tech"><summary>詳細資料</summary><p>'+esc(msg)+'</p></details>';}
 function showOcrStatus(plain,tech,cls){
  updateOCR(plain,0);
  const st=$('#ocr-status');if(!st)return;
  st.classList.toggle('p40-warn',cls==='warn');st.classList.toggle('p40-bad',cls==='bad');
  if(tech)st.insertAdjacentHTML('beforeend',techDetails(tech));
  $('#v20-text-details')?.setAttribute('open','');
 }
 P40.ocrError=function(e){
  const raw=String(e&&e.message||e||''),[a,b]=plainFail(raw);
  showOcrStatus(a+b,TECH.test(raw)||!/[㐀-鿿]/.test(raw)?raw:'', 'bad');
 };
 P40.ocrEmpty=function(){showOcrStatus('這張相片沒有辨認到英文。請重新拍照，也可以直接輸入文字。','','warn');};
 // D4: the success line only shows for a clear result.
 P40.ocrDone=function(doc,items){
  const st=(doc&&doc.p40)||{raw:items.length,pre:items.filter(c=>c.selected).length,unclear:false};
  tidyHeaders(doc,items);
  if(st.unclear){
   updateOCR('辨認結果不太清楚。請檢查或重新拍照。',100);
   const el=$('#ocr-status');if(el){el.classList.add('p40-warn');el.classList.remove('p40-bad');}
   v20.message='相片可能太暗、太斜或字太小，結果只供參考。請把不對的取消，或按上一步重新拍照。';
  }else{
   const found=`找到 ${st.raw} 項，先選了 ${st.pre} 個像單字的。請對照原稿檢查。`;
   updateOCR(found,100);
   const el=$('#ocr-status');if(el){el.classList.remove('p40-warn','p40-bad');}
   v20.message=found+(st.raw>st.pre?` 另外 ${st.raw-st.pre} 項不像單字（例如標題、日期、雜點），放在「未加入內容」，需要時可以加回來。`:'');
   step=2;
   applyStep();window.scrollTo(0,0);
  }
 };
 // D22: take a unit title and a date from the paper itself when the parent has not typed one.
 function tidyHeaders(doc,items){
  guard(()=>{
   const def=/^(英文默書|默書 \d+月\d+日)$/;
   const hl=(doc&&doc.lines||[]).slice(0,5).map(l=>String(l.text||'').trim()).find(t=>/^Unit\s*\d+/i.test(t));
   if(hl&&(!importDraft.title||def.test(importDraft.title.trim()))&&!titleTouched){importDraft.title=hl.replace(/\s+/g,' ').slice(0,60);}
   const raw=String(doc&&doc.raw||'');
   const found=new Set();
   const mon={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
   for(const m of raw.matchAll(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(20\d\d)\b/gi))found.add(`${m[3]}-${String(mon[m[2].slice(0,3).toLowerCase()]).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
   for(const m of raw.matchAll(/\b(20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/g))found.add(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
   const ok=[...found].filter(d=>WQEducation.validDate(d));
   if(ok.length===1&&!importDraft.date){importDraft.date=ok[0];flash='已從相片填入日期，請核對。';}
   const t=$('#range-title');if(t)t.value=importDraft.title;const d=$('#range-date');if(d)d.value=importDraft.date;
  });
 }

 // ---------------------------------------------------------------- step engine (S3-09) ---------------------------------------
 function goStep(n){
  n=Math.max(1,Math.min(3,n));
  if(n>=2&&!v20.items.length)n=1;
  if(n===3&&!v20Selected().length)n=2;
  step=n;
  if(n===3)ensureStep3();
  applyStep();
  window.scrollTo(0,0);
 }
 function ensureStep3(){
  const root=$('#import-v20');if(!root)return;
  let box=$('#v20-summary');
  if(!box){
   box=mk('section','card p40-step3');box.id='v20-summary';
   box.innerHTML='<h2>3. 儲存</h2><div id="v20-summary-content"></div><div class="p40-bar"><button type="button" class="btn quiet" data-p40="step" data-step="2">← 回上一步</button><button class="btn primary" data-act="save-range" id="v20-save-range" disabled>儲存範圍</button></div><p class="p40-why" id="p40-why3" role="status"></p>';
   root.querySelector('.v20-layout')?.after(box);
  }
  v20RenderSummary();
 }
 function applyStep(){
  const root=$('#import-v20');if(!root)return;
  if(!v20.items.length&&step>1)step=1;
  root.dataset.p40Step=String(step);
  let nav=$('#p40-steps');
  if(!nav){nav=mk('ol','p40-steps');nav.id='p40-steps';nav.setAttribute('aria-label','加入範圍的三個步驟');const old=root.querySelector('.v20-stepper');if(old){old.after(nav);old.hidden=true;}else root.prepend(nav);}
  nav.innerHTML=STEP_NAMES.map((t,i)=>{const n=i+1,state=n===step?'now':n<step?'done':'todo',inner=`<span class="p40-num">${n<step?'✓':n}</span><span class="p40-name">${t}</span>`;return `<li class="p40-step ${state}" ${n===step?'aria-current="step"':''}>${n<step?`<button type="button" data-p40="step" data-step="${n}">${inner}</button>`:inner}</li>`;}).join('');
  // headings and extras per step
  const h1=root.querySelector('.v20-source>h2');if(h1)h1.textContent='1. 拍照或輸入';
  const h2=root.querySelector('.v20-selection .row>h2');if(h2)h2.textContent='2. 檢查單字';
  if(!$('#p40-tips')){
   const tips=mk('div','p40-tips','<strong>拍照小提示</strong><ul><li>光線要夠亮，避開反光和影子。</li><li>把紙放平，相機對正，不要歪。</li><li>字要拍得夠大、夠清楚，一次拍一欄。</li></ul>');tips.id='p40-tips';
   root.querySelector('.v20-choices')?.before(tips);
  }
  if(!$('#p40-bar1')){
   const bar=mk('div','p40-bar','<p class="p40-why" id="p40-why1" role="status"></p><button type="button" class="btn primary" data-p40="step" data-step="2" id="p40-next1">下一步：檢查單字</button>');bar.id='p40-bar1';
   root.querySelector('.v20-source')?.append(bar);
  }
  const head=root.querySelector('.v20-selection .row');
  if(head&&!$('#p40-back2')){const b=mk('button','btn quiet','← 上一步');b.type='button';b.id='p40-back2';b.dataset.p40='step';b.dataset.step='1';head.prepend(b);}
  const priv=root.querySelectorAll('.v20-source>details')[1];
  if(priv){const ps=priv.querySelectorAll('p');if(ps[1]&&!ps[1].dataset.p40){ps[1].dataset.p40='draft';ps[1].textContent='沒儲存的草稿會自動留在這部裝置，儲存範圍後才清除。相片不會保留，要再辨認請重新選擇。加入教材只保存已選的單字和對應文字，不保存整張相片。';}}
  if(step===3)ensureStep3();
  reasons();
  countLine();
  syncDraftNote();
 }
 // disabled buttons always say why (S3-09)
 function why(id,text){const el=document.getElementById(id);if(!el)return;el.textContent=text||'';el.hidden=!text;}
 function reasons(){
  if(!$('#import-v20'))return;
  const sel=v20Selected(),pend=v20Pending();
  const run=$('#run-ocr');
  let r1='';
  if(!v20Photo)r1='請先按「拍照」或「上傳圖片」，再辨認。';else if(v20FileLoading)r1='相片還在讀取，請稍等。';else if(ocrBusy)r1='正在辨認，請稍等。';
  let runWhy=$('#p40-why-run');
  if(run&&!runWhy){runWhy=mk('p','p40-why');runWhy.id='p40-why-run';runWhy.setAttribute('role','status');run.closest('.row')?.after(runWhy);}
  if(runWhy){runWhy.textContent=run&&run.disabled?r1:'';runWhy.hidden=!(run&&run.disabled&&r1);}
  const next=$('#p40-next1');
  if(next){
   let r='';
   if(!v20.items.length)r='還沒有單字。請先辨認相片，或在下面輸入文字再按「整理成可選字詞」。';
   else if(v20.rawDirty)r='文字改了，請先按「整理成可選字詞」。';
   else if(ocrBusy)r='正在辨認，請稍等。';
   next.disabled=!!r;why('p40-why1',r);
  }
  const dock=$('#v20-confirm-next');
  if(dock&&dock.disabled){
   const small=$('#v20-pending-count');
   let r='請先選好要練的單字。';
   if(v20.rawDirty)r='原文改了，請先按「整理成可選字詞」。';else if(v20FileLoading)r='相片還在讀取，請稍等。';else if(ocrBusy)r='正在辨認，請稍等。';
   if(small)small.textContent=r;
  }
  const save=$('#v20-save-range');
  if(save){
   const chk=$('#confirm-import');let r='';
   if(save.disabled){
    if(pend.length)r=`還有 ${pend.length} 項要核對。請回上一步核對，或略過。`;
    else if(sel.length>120)r='最多 120 項。請回上一步取消一些單字。';
    else if(!sel.length)r='還沒有選單字。請回上一步選一些。';
    else if(chk&&chk.disabled)r='有完全一樣的項目。請回上一步合併或取消。';
    else if(chk&&!chk.checked)r='請先勾選上面的「我已對照原稿」。';
   }
   why('p40-why3',r);
  }
 }
 P40.reasons=reasons;

 // wrappers keep the original functions and add the step / reason logic
 const priorRW=v20RenderWords;v20RenderWords=function(){const r=priorRW.apply(this,arguments);guard(()=>{reasons();countLine();scheduleDraft();});return r;};
 const priorRS=v20RenderSummary;v20RenderSummary=function(){const r=priorRS.apply(this,arguments);guard(reasons);return r;};
 const priorPhoto=updateImportPhoto;updateImportPhoto=function(){const r=priorPhoto.apply(this,arguments);guard(reasons);return r;};
 const priorOCRStatus=updateOCR;updateOCR=function(msg,p){const r=priorOCRStatus.apply(this,arguments);const st=$('#ocr-status');if(st)st.classList.remove('p40-warn','p40-bad');return r;};
 const priorParse=v20Parse;
 v20Parse=function(){
  const before=v20.parsedRaw+'|'+v20.items.length;
  const r=priorParse.apply(this,arguments);
  guard(()=>{if(v20.items.length&&!v20.rawDirty&&before!==v20.parsedRaw+'|'+v20.items.length){step=2;applyStep();window.scrollTo(0,0);}});
  return r;
 };
 // The summary is an inline third step now, not a pop-up.
 v20Summary=function(){
  if(v20.rawDirty){toast('請先整理剛修改的原文。','bad');return;}
  if(!v20Selected().length)return;
  goStep(3);
 };
 function countLine(){
  const box=$('#v20-message');if(!box||step!==2)return;
  let line=$('#p40-count');
  if(!line){line=mk('p','p40-count');line.id='p40-count';box.before(line);}
  const all=v20.items.length,sel=v20Selected().length,pend=v20Pending().length;
  line.textContent=`共 ${all} 項，已選 ${sel} 個。${pend?`有 ${pend} 項要核對。`:''}請對照原稿，不對的取消或修改。`;
 }

 // ---------------------------------------------------------------- draft autosave (D11) ------------------------------------
 const draftKey=()=>'wq35-p40-draft:'+accountId()+':'+(activeChild()?.id||'');
 function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>guard(saveDraft),500);}
 function saveDraft(force){
  if(!isLoggedIn())return;
  if(!force&&route()!=='range-new')return;
  captureImportDraft();
  const hasItems=v20.items.length>0,raw=importDraft.raw||'';
  if(!hasItems&&!raw.trim()){store.del(draftKey());return;}
  const slim=o=>JSON.stringify(o,(k,v)=>k==='previewURL'||k==='engineText'?undefined:v);
  let payload={v:1,t:Date.now(),title:importDraft.title,date:importDraft.date,raw,mode:v20.mode,step,items:v20.items,docs:v20.documents,parsedRaw:v20.parsedRaw,common:[...v20.common]};
  let text=slim(payload);
  if(text.length>700000)text=slim({v:1,t:Date.now(),title:importDraft.title,date:importDraft.date,raw,mode:v20.mode,step:1,items:null});
  store.set(draftKey(),text);
 }
 function dropDraft(){clearTimeout(draftTimer);store.del(draftKey());draftNote='';}
 function restoreDraft(){
  if(!isLoggedIn()||v20.items.length||(importDraft.raw||'').trim())return false;
  const text=store.get(draftKey());if(!text)return false;
  try{
   const d=JSON.parse(text);if(!d||d.v!==1)throw Error('draft');
   importDraft.title=String(d.title||importDraft.title).slice(0,120);importDraft.date=WQEducation.validDate(d.date)?d.date:'';importDraft.raw=String(d.raw||'').slice(0,30000);
   titleTouched=true;
   if(Array.isArray(d.items)&&d.items.length&&Array.isArray(d.docs)){
    v20.mode=['list','passage','sentences'].includes(d.mode)?d.mode:'list';v20.items=d.items;v20.documents=d.docs;v20.parsedRaw=String(d.parsedRaw||'');v20.common=new Set(d.common||[]);v20.rawDirty=false;v20.revision++;
    step=d.step===3?2:Math.max(1,Math.min(2,d.step||1));
   }else if(d.items===null){
    // too big to keep the list: rebuild it from the saved text
    v20.rawDirty=false;
    if(importDraft.raw.trim()){const doc=V20.fromText(importDraft.raw,uid('text'));v20.documents=[doc];v20.items=V20.candidates(doc,{mode:v20.mode,dictionary:v20Dictionary,common:v20.common});v20.parsedRaw=importDraft.raw;step=2;}
   }else step=1;
   v20Origin=v20Owner();
   draftNote='已找回上次沒做完的草稿。相片不會保留，需要時請重新選擇。';
   return true;
  }catch(e){store.del(draftKey());return false;}
 }
 function syncDraftNote(){
  const root=$('#import-v20');if(!root)return;
  let el=$('#p40-draftnote');
  if(!draftNote){el?.remove();return;}
  if(!el){el=mk('div','p40-draftnote');el.id='p40-draftnote';el.setAttribute('role','status');($('#p40-steps')||root.firstElementChild).after(el);}
  el.innerHTML=`<span>${esc(draftNote)}</span><button type="button" class="btn quiet" data-p40="discard">重新開始</button>`;
 }
 function discardDraft(){
  if(!confirm('放棄這份草稿，重新開始？')){return;}
  clearImportDraft();dropDraft();step=1;titleTouched=false;titleDefault();render();
 }
 window.addEventListener('pagehide',()=>guard(()=>{if(route()==='range-new')saveDraft();}));
 document.addEventListener('input',e=>{
  if(['range-title','range-date','raw-words'].includes(e.target.id)){
   if(e.target.id==='range-title')titleTouched=true;
   scheduleDraft();
  }
 },true);
 const priorClear=clearImportDraft;
 clearImportDraft=function(){const r=priorClear.apply(this,arguments);guard(()=>{dropDraft();step=1;titleTouched=false;});return r;};

 // ---------------------------------------------------------------- defaults (D22) ------------------------------------------
 function titleDefault(){
  if(titleTouched||importDraft.title&&importDraft.title!=='英文默書')return;
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const g=t=>p.find(x=>x.type===t)?.value;
  importDraft.title=`默書 ${+g('month')}月${+g('day')}日`;
 }

 // ---------------------------------------------------------------- render hooks --------------------------------------------
 const priorRangeNew=rangeNewView;
 rangeNewView=function(){
  guard(()=>{
   if(isLoggedIn()&&step===1&&!v20.items.length&&!(importDraft.raw||'').trim())restoreDraft();
   titleDefault();
  });
  return priorRangeNew.apply(this,arguments);
 };
 P40.afterRangeNew=function(entering){
  if(entering){
   if(v20.items.length&&step<2&&!v20.rawDirty)step=2;
   if(ocrInterrupted){ocrInterrupted=false;if(v20Photo)showOcrStatus('你剛才離開了頁面，辨認已停止。請再按一次「辨認所選範圍」。','', 'warn');}
  }
  applyStep();
  if(flash){const m=$('#v20-message');if(m&&!m.textContent)m.textContent=flash;flash='';}
 };
