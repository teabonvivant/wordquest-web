"""Reproducible R3 build from immutable R2 source. End users need no Python."""
from pathlib import Path
import re,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def once(s,a,b):
    if s.count(a)!=1: raise RuntimeError(f'Expected one patch anchor ({s.count(a)}): {a[:100]}')
    return s.replace(a,b,1)
s=(ROOT/'originals/R2/index.html').read_text()
scripts=list(re.finditer(r'(<script\b[^>]*>)(.*?)(</script>)',s,re.S|re.I)); patches={}
t=scripts[22].group(2)
t=once(t,"['action','護盾'],['x','切換']","['action','護盾'],['hold','慢移'],['x','切換']")
t=once(t,'class RuinsCourierR2', (ROOT/'r3_src/arcade_pose.js').read_text()+'\nclass RuinsCourierR2')
t=once(t,"if(this.slide){c.translate(0,20);c.scale(1.3,.48);}D.animal(c,0,0,1.05,'fox',this.skin==='moonlight'?'#939edb':'#458c98');", "if(this.slide)c.translate(0,10);R2.pose(c,0,0,1.05,'fox',this.skin==='moonlight'?'#939edb':'#458c98',this.done&&this.won?'victory':this.slide?'slide':this.jump>0?'jump':this.inv>0?'hit':'run',this.t);")
t=once(t,"D.animal(c,this.p.x,this.p.y-9,.64,'rabbit',this.skin==='sunset'?'#c68976':'#6c83bc');", "R2.pose(c,this.p.x,this.p.y-9,.64,'rabbit',this.skin==='sunset'?'#c68976':'#6c83bc',this.done&&this.won?'victory':!this.grounded?(this.p.vy<0?'jump':'fall'):Math.abs(this.p.vx)>12?'run':'idle',this.t,this.p.vx<0?-1:1);")
t=once(t,"D.animal(c,this.p.x,y-9,.61,'panda','#cf9c70');", "R2.pose(c,this.p.x,y-9,.61,'panda','#cf9c70',this.done&&this.won?'victory':this.parachute?'jump':this.p.vy>20?'fall':Math.abs(this.p.vx||0)>10?'run':'idle',this.t,this.p.vx<0?-1:1);")
t=once(t,"D.animal(c,a.x,a.y-6,.96,who?'fox':'rabbit',who?'#d19278':'#5c8cac');", "R2.pose(c,a.x,a.y-6,.96,who?'fox':'rabbit',who?'#d19278':'#5c8cac',this.done&&this.won&&!who?'victory':this.servePause>0&&this.server===who?'serve':!who&&this.spike>0?'spike':a.y<440?'jump':Math.abs(a.vx)>12?'run':'idle',this.t,who?-1:1);")
patches[22]=t
# Existing private host APIs remain private. New data manager shares their authorization.
t=scripts[31].group(2)
t=once(t,'\ninstallMediaEvents();\nrender();','\n'+(ROOT/'r3_src/host_family.js').read_text()+'\ninstallMediaEvents();\nrender();')
t=once(t,'<div class="a28-touch-controls" aria-label="輕觸遊戲控制">','<div class="a28-touch-controls" data-r3-keys="${keys.length}" aria-label="輕觸遊戲控制">')
t=once(t,'  function assertWritable(){','  function assertWritable(){\n    if(root.WQR3?.dataBusy())throw Error("家庭資料處理中，數學暫停寫入");')
for a,b in [
 ('function startDaily(){','function startDaily(){if(window.WQR3&&!WQR3.canPlay())return;'),
 ('function startPractice(type){','function startPractice(type){if(window.WQR3&&!WQR3.canPlay())return;'),
 ('function startMiniGame(type){','function startMiniGame(type){if(window.WQR3&&!WQR3.canPlay())return;')]:t=once(t,a,b)
# Every paid or free new-engine play/resume funnels through a28 launch; patched below after anchor verification.
extra=ROOT/'r3_src/host_offline.js'
if extra.exists(): t=once(t,'\ninstallMediaEvents();\nrender();','\n'+extra.read_text()+'\ninstallMediaEvents();\nrender();')
t=t.replace("Tesseract.createWorker('eng',1,{logger", "Tesseract.createWorker('eng',1,{...(await window.WQR3OCR.options()),logger")
t=once(t," window.WQ32=Object.freeze", " window.addEventListener('wq-r3-data-replaced',()=>{memory.clear();owner='';readPrefs();applyPrefs();refresh(true);});\n window.WQ32=Object.freeze")
t=once(t,"for(const k of [key,key+':before-restore'])copies.push([k,localStorage.getItem(k)]);", "for(const k of [key,key+':before-restore',...['normal','sandbox'].map(mode=>'wordquest-v32-characters:'+mode+':'+accountId()+':'+ch.id)])copies.push([k,localStorage.getItem(k)]);")
t=once(t,"let copies=[];","let copies=[],familyCleanup=null;")
t=once(t,"if(copies.length)assertWritable();", "if(removed.length){const fk='wq-r3-family:'+accountId(),raw=localStorage.getItem(fk);if(raw){const f=window.WQFamilyCore.validateSettings(JSON.parse(raw));for(const ch of removed){delete f.usage[ch.id];f.migrationReceipts=f.migrationReceipts.filter(r=>r.target!==ch.id);}f.revision++;copies.push([fk,raw]);familyCleanup=[fk,JSON.stringify(f)];}}if(copies.length)assertWritable();")
t=once(t,"for(const[k]of copies)localStorage.removeItem(k);", "for(const[k]of copies)localStorage.removeItem(k);if(familyCleanup)localStorage.setItem(...familyCleanup);")
t=once(t,"if(priorSave()===true)return true;","if(priorSave()===true){if(familyCleanup)r3ReloadSettings();return true;}")
patches[31]=t
# Keep original core algorithms and historical templates. Only extend parameter representation.
t=scripts[33].group(2)
t=once(t,"else p[k]=evaluate(v.expr,p).toString();", """else if(v.lookup){const i=Number(p[v.lookup.from]);assert(Number.isInteger(i)&&Array.isArray(v.lookup.values)&&i>=0&&i<v.lookup.values.length,'參數對照無效');p[k]=clone(v.lookup.values[i]);}else if(v.decimal){const places=v.decimal.places;int(places,0,3);const x=evaluate(v.decimal.expr,p),scale=10**places,y=x.mul(scale);assert(y.d===1n,'小數不能四捨五入後冒充精確值');const n=y.n.toString();p[k]=places?n.padStart(places+1,'0').slice(0,-places)+'.'+n.padStart(places+1,'0').slice(-places):n;}else p[k]=evaluate(v.expr,p).toString();""")
t=once(t,"if(t.type==='choice'&&choices.length<(t.choiceCount||4))", "if(t.choiceLabels){for(const val of Object.keys(t.choiceLabels))if(!choices.some(c=>c.value===val))choices.push({value:val,code:'RECHECK'});for(const c of choices){assert(t.choiceLabels[c.value],'選項缺少文字');c.label=t.choiceLabels[c.value];}}\n    if(t.type==='choice'&&choices.length<(t.choiceCount||4))")
t=once(t,"remainder:t.answer.remainder?", "answerLabel:t.choiceLabels?.[answer]||null,answerSentence:t.answer.sentence||'',verification:t.verification||null,remainder:t.answer.remainder?")
t=once(t,'obj(out);int(out.revision,0,1e9);', "obj(out);if(out.r3MigrationDigests!==undefined){array(out.r3MigrationDigests,300);assert(new Set(out.r3MigrationDigests).size===out.r3MigrationDigests.length,'重複搬移收據');for(const d of out.r3MigrationDigests)assert(typeof d==='string'&&/^[a-f0-9]{64}$/.test(d),'搬移收據格式錯誤');}int(out.revision,0,1e9);")
# School grade constrains daily/diagnostic pools; cross-grade manual study stays open.
t=once(t,"s.track===track&&accessible(state,s,lib,grade)", "s.track===track&&(track!=='normal'||s.grade<=grade)&&accessible(state,s,lib,grade)")
# Tools model extensions use bounded fields, restore whitelist in UI.
t=once(t,"version:'0.1.2'", "version:'0.1.2+r3'")
patches[33]=t
# Same-owner restore remains unchanged; explicit legacy migration is an additional, audited path.
t=scripts[34].group(2)
m=(ROOT/'r3_src/math_migration.js').read_text() if (ROOT/'r3_src/math_migration.js').exists() else ''
t=once(t,'  balance(){',m+'\n  balance(){')
patches[34]=t
# UI details and new tools.
t=scripts[35].group(2)
t=once(t,"function canStudy(){","function canStudy(){root.WQR3?.assertStudy();")
t=once(t,"function speech(text,lang){","function speech(text,lang){if(root.WQR3?.voice().mode==='server'){root.speechSynthesis?.cancel();root.WQR3Speech.speak(text,lang,store.state.settings.slow).catch(e=>toast(e.message));return;}")
t=t.replace("root.speechSynthesis?.cancel();","root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();")
t=t.replace("23 個入門技能","${L.data.skills.filter(s=>s.track==='normal').length} 個練習技能")
t=once(t,"目前開放小一至小三「數」範疇的 <strong>","現在提供小一至小六五個範疇的 <strong>")
t=once(t,"，不是 15 個單元的完整課程。其他單元只保留課程索引，未有課堂或題庫。", "；79個單元均有可作答的基礎選段。這不是每個官方學習重點均完成的全套課本；新增內容待教師審核。")
t=t.replace("${st==='N'?'':' · 待開發'}",'')
t=t.replace("應找回＿＿元。", "${answerSentence(s.feedback?.answer??{value:s.draft,unit:s.draftUnit},q)}")
t=once(t,"esc(sk.lesson.alternative)","esc(C.fill(sk.lesson.alternative,ex.params))")
t=once(t,"fraction(ex.answer)","(ex.answerLabel?esc(typeof ex.answerLabel==='string'?ex.answerLabel:store.state.settings.language==='en'?ex.answerLabel.en:ex.answerLabel.zh):fraction(ex.answer))")
t=once(t,"function questionView(q){", "function answerSentence(a,q){const value=a?.value??'',u=a?.unit||q?.unit||'＿＿';return esc((q?.answerSentence||'應找回{value}{unit}。').replace('{value}',value===''?'＿＿':value).replace('{unit}',u));}\n function questionView(q){")
t=once(t,"btn(fraction(c.value),", "btn(c.label?esc(typeof c.label==='string'?c.label:language==='en'?c.label.en:c.label.zh):fraction(c.value),")
t=t.replace("function illustration(q){const p=q.params;", "function illustration(q){if(q.visual?.startsWith('r3:'))return root.WQMathVisuals?.question(q)||'';const p=q.params;")
t=once(t,"const toolLabels={tenframe:","const toolLabels={clock:'可調鐘面',angle:'量角器',solid:'立體積木',ruler:'間距與量度',chart:'統計圖',tenframe:")
t=once(t,"function defaultTool(kind='tenframe',q=null){return C.toolModel(kind,q);}","function defaultTool(kind='tenframe',q=null){const t={...C.toolModel(kind,q),hour:Number(q?.params.hour??3),minute:Number(q?.params.minute??0),angle:Number(q?.params.angle??60),sx:3,sy:2,sz:2,rulerStart:0,rulerEnd:6,chartA:3,chartB:5,chartC:4};return root.WQMathVisuals.bindTool(t,q);}")
t=once(t,"[['h',0,9],['t',0,99]", "[['hour',0,23],['minute',0,59],['angle',0,180],['sx',1,5],['sy',1,5],['sz',1,5],['rulerStart',0,19],['rulerEnd',1,20],['chartA',0,20],['chartB',0,20],['chartC',0,20],['h',0,9],['t',0,99]")
t=once(t,"const t=ui.tools;let body='';", "const t=ui.tools;let body=root.WQMathVisuals?.tool(kind,t)||'';")
t=once(t,"const id=e.target.id,v=Number(e.target.value),t=ui.tools;", "const id=e.target.id,v=Number(e.target.value),t=ui.tools;if(id.startsWith('tool-r3-')){root.WQMathVisuals.change(t,id.slice(8),v);t.changed++;redrawTool();return;}")
t=once(t,"if(parts[0]==='tool'){toolAction(parts);return;}","if(parts[0]==='tool'){toolAction(parts);return;}\n   if(parts[0]==='r3tool'){canStudy();root.WQMathVisuals.step(ui.tools,parts[1],Number(parts[2]));ui.tools.changed++;redrawTool();return;}\n   if(parts[0]==='olylevel'){ui.olyLevel=Number(parts[1]);render();return;}\n   if(parts[0]==='mock'){makeMock(Number(parts[1]));return;}")
t=once(t,"getState:()=>C.clone(store?.state)", "startDaily:(track='normal')=>makePlan('daily',track),pauseForLimit:()=>{if(store&&dialog?.open){preserveWork(true);view='resume';render();}},getState:()=>C.clone(store?.state)")
t=once(t,"${btn('匯入同一孩子的備份','import')}","${btn('匯入同一孩子的備份','import')}${btn('搬入舊學員紀錄','migrate','secondary')}")
t=t.replace("['save-settings','import','export','clear-maths','delete-profile','create-profile']", "['save-settings','import','migrate','confirm-migrate','export','clear-maths','delete-profile','create-profile']")
ui_extra=ROOT/'r3_src/math_ui_extra.js'
if ui_extra.exists():
 t=once(t," async function action(e){",'\n'+ui_extra.read_text()+"\n async function action(e){")
 t=once(t,"    case 'import':", "    case 'migrate':await chooseMigration();break;\n    case 'confirm-migrate':confirmMigration();break;\n    case 'import':")
t=t.replace("store.state.cards.length+' / 5'", "store.state.cards.length+' / '+L.data.cards.length")
t=t.replace("fraction(q.answer)", "(q.answerLabel?esc(typeof q.answerLabel==='string'?q.answerLabel:store.state.settings.language==='en'?q.answerLabel.en:q.answerLabel.zh):fraction(q.answer))")
t=t.replace("數範疇起步測試", "基礎選題起步測試")
t=t.replace("Math.min(store.profile.grade,3)", "store.profile.grade")
t=t.replace("s.track===track&&C.accessible(n,s,L,store.profile.grade)", "s.track===track&&(track!=='normal'||s.grade<=store.profile.grade)&&C.accessible(n,s,L,store.profile.grade)")
# Label exploratory model separately from exact question illustrations.
t=once(t,"const t=ui.tools;let body=root.WQMathVisuals?.tool(kind,t)||'';","const t=ui.tools;let body=root.WQMathVisuals?.tool(kind,t)||'';")
# Revised olympiad page and optional new tier structure.
oly=ROOT/'r3_src/olympiad_ui.js'
if oly.exists():
 a=t.index(' function olympiad(){');b=t.index(' function ',a+5)
 t=t[:a]+oly.read_text()+'\n'+t[b:]
# Don't advertise obsolete backup limitation once full-family entry exists.
t=t.replace('原英文「匯出」不會包含此資料，請兩份都備份。','舊英文單科匯出不包含數學；R3家長頁「家庭完整備份」則一次包含全部孩子與媒體。')
t=t.replace("app.querySelectorAll('input,select').forEach(e=>e.addEventListener('change',changeHandler));", "app.querySelectorAll('input,select').forEach(e=>e.addEventListener('change',changeHandler));")
t=t.replace("el.querySelectorAll('select')", "el.querySelectorAll('select,input[type=range]')")
t=t.replace("本版時限和週報只統計數學模組，未把英文使用時間合併。", "此頁顯示數學時限；家庭備份與跨科安排頁另有全站總時限及合併週報。")
t=t.replace("sent.textContent='應找回 '+ans.value+' '+(app.querySelector('#unit')?.value||'＿＿')+'。';", "sent.textContent='應找回 '+(ans.value||'＿＿')+' '+(app.querySelector('#unit')?.value||'＿＿')+'。';")
t=once(t,'<h3>${toolLabels[kind]}</h3>${body}','<h3>${toolLabels[kind]}</h3>${t.r3Note?\'<p class="note">\'+esc(t.r3Note)+\'</p>\':\'\'}${body}')
t=t.replace('WordQuest Maths 0.1.2 · V32 整合 R1','WordQuest Maths R3 · 保留0.1.2舊紀錄相容')
t=t.replace('23 個普通數學入門技能 ＋ 5 個奧數主題；其餘課程未完成。','102個普通數學技能選段＋20個奧數選題；79個普通數學單元有基礎練習，並非全套官方學習重點均已完成。')
patches[35]=t
for i,m in reversed(list(enumerate(scripts))):
 tag=m.group(1)+patches.get(i,m.group(2))+m.group(3)
 if i==30: tag+='\n<script data-wq-r3="family-core">'+(ROOT/'r3_src/family_core.js').read_text()+'</script>'
 if i==32:
  for name in ['curriculum_extension.js','math_visuals.js']:
   p=ROOT/'r3_src'/name
   if p.exists():tag+='\n<script data-wq-r3="'+name+'">'+p.read_text()+'</script>'
 s=s[:m.start()]+tag+s[m.end():]
s=once(s,'</head>','<style data-wq-r3="family">'+(ROOT/'r3_src/family.css').read_text()+'</style>\n</head>')
s=re.sub(r'<title>.*?</title>','<title>WordQuest R3 · 英文、數學、奧數與街機</title>',s,count=1)
(ROOT/'app/index.html').write_text(s)
(ROOT/'r3_evidence/build.json').write_text(json.dumps({'version':'R3.0.0','base_sha256':hashlib.sha256((ROOT/'originals/R2/index.html').read_bytes()).hexdigest(),'app_sha256':hashlib.sha256(s.encode()).hexdigest(),'scripts':len(re.findall(r'<script\b',s,re.I)),'build':'source generated; this record is not functional validation'},ensure_ascii=False,indent=2))
print('R3 built',len(s.encode()))
