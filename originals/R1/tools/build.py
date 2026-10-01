"""Rebuild R1 from the preserved V32 and Maths 0.1.2 source. Standard Python only.
End users do not need Python: app/index.html is already built.
"""
from pathlib import Path
import re, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'originals'/'WordQuest_Program_and_Data_20260929'
def once(s,old,new):
    if s.count(old)!=1:raise ValueError(f'Expected one patch anchor, found {s.count(old)}: {old[:100]}')
    return s.replace(old,new,1)
english=(BASE/'01_English_V32/WordQuest_V32_Integrated.html').read_text()
plugin=(BASE/'02_Maths_0.1.2/WordQuest_Maths_Plugin_0.1.2.html.txt').read_text()
bridge=(ROOT/'patches/host_bridge.js').read_text()
english=once(english,'\ninstallMediaEvents();\nrender();','\n'+bridge+'\ninstallMediaEvents();\nrender();')
english=re.sub(r'<title>.*?</title>','<title>WordQuest V32＋數學 0.1.2｜整合 R1</title>',english,count=1)
plugin=once(plugin,'function createHostBridge(){','function createHostBridge(){\n  if(root.WQMathHost?.apiVersion===1)return root.WQMathHost;')
plugin=once(plugin,"check(){const p=this.bridge.profile();","check(){this.bridge.assertWritable?.();const p=this.bridge.profile();")
# Do not expose parent controls without the existing English parent check.
anchor="if(parts[0]==='tool'){toolAction(parts);return;}"
guard="""if(root.WQM_INTEGRATED && (['nav:parent','completed-parent'].includes(a)||['save-settings','import','export','clear-maths','delete-profile','create-profile'].includes(a)) && bridge.parentAllowed?.()===false){
     preserveWork(true);close();bridge.openParentGate?.();return;
   }
   """
plugin=once(plugin,anchor,guard+anchor)
plugin=once(plugin,"${tag('本機家長頁 · 無身份驗證')}","${tag(root.WQM_INTEGRATED?'沿用英文家長驗證':'本機家長頁 · 無身份驗證')}")
# One route-aware opening function used by the original launcher and new subject cards.
openfn="""function open(requested='home'){
   if(!root.WQM_INTEGRATED)return;
   if(!bridge)throw Error('未能連接英文帳戶；沒有建立另一個錢包。');
   if(dialog?.open){if(current()&&!current().completed&&view==='lesson')preserveWork(true);dialog.focus();return;}
   bridge.beforeOpen?.();
   if(requested==='parent'&&bridge.parentAllowed?.()===false){bridge.openParentGate?.();return;}
   initStore();
   if(!store.state.current && ['home','normal','olympiad','parent'].includes(requested))view=requested;
   if(requested==='parent')view='parent';
   render();dialog.showModal();activeSince=Date.now();app.querySelector('button')?.focus();
 }
 """
plugin=once(plugin,'function close(){',openfn+'function close(){')
plugin=once(plugin,"try{bridge.beforeOpen?.();initStore();render();dialog.showModal();activeSince=Date.now();app.querySelector('button')?.focus();}catch(e){alert(e.message);}","try{open('home');}catch(e){alert(e.message);}")
plugin=once(plugin,"root.WQMathApp=Object.freeze({version:'0.1.2',", "root.WQMathApp=Object.freeze({version:'0.1.2',integrationVersion:'V32-M0.1.2-R1',open,close,")
plugin=once(plugin,'WordQuest Maths 0.1.2 · 本機功能試用版','WordQuest Maths 0.1.2 · V32 整合 R1')
# Shared characters reuse the exact V32 embedded images and original identities;
# this is NOT a reconstruction of the missing 0.1.3 art package.
plugin=once(plugin,"function render(){if(!store)return;", """function companion(){
  if(!root.WQM_INTEGRATED||!root.WQ32Art||!root.WQ32)return '';
  const s=current(),key=view==='lesson'?(s?.feedback?(s.feedback.correct?'bee':'star'):(ui.toolOpen?'fox':'owl')):view==='olympiad'?'rabbit':'owl';
  const src=root.WQ32Art[key+'-front'],name=root.WQ32.roles().find(r=>r.id===key)?.name||'學習夥伴';
  if(!src||!/^data:image\\//.test(src))return '';
  const line=view==='lesson'?(s?.feedback?(s.feedback.correct?'看看你用了甚麼方法，再繼續下一題。':'先看看回饋，再用另一個方法試試。'):'先看清楚題目；需要時可以按原有提示。'):view==='olympiad'?'可以先畫圖、列表，再說說你的想法。':'先動手，再想通；選一課就可以開始。';
  return `<aside class="wqm-v32-companion"><img src="${src}" alt="${esc(name)}"><div><strong>${esc(name)}</strong><p>${line}</p><small>沿用 V32 夥伴 · 不改答案或判分</small></div></aside>`;
 }
 function render(){if(!store)return;""")
plugin=once(plugin,'${content}<footer class="foot">','${[\'home\',\'normal\',\'olympiad\',\'lesson\'].includes(view)?companion():\'\'}${content}<footer class="foot">')
plugin=once(plugin,"style.textContent=root.WQMathCSS;","style.textContent=root.WQMathCSS+'\\n.wqm-v32-companion{display:flex;gap:16px;align-items:center;padding:12px 18px;margin:16px 0;background:#fffdf7;border:1px solid #deded0;border-radius:20px}.wqm-v32-companion img{width:72px;height:92px;object-fit:contain}.wqm-v32-companion p{margin:4px 0}.wqm-v32-companion small{color:#536357}.wqm-v32-companion strong{font-size:17px}@media(max-width:440px){.wqm-v32-companion{gap:10px;padding:10px}.wqm-v32-companion img{width:48px;height:62px}}';")
from patch_math import patch_math
plugin=patch_math(plugin)
# Preserve the original payload separately; this patched plugin is the reproducible deliverable.
(ROOT/'app/WordQuest_Maths_Plugin_R1.html.txt').write_text(plugin)
pos=english.lower().rfind('</body>');assert pos>0
merged=english[:pos]+'\n<!-- WordQuest V32 + Maths 0.1.2 Integration R1 -->\n'+plugin+english[pos:]
(ROOT/'app/index.html').write_text(merged)
(ROOT/'evidence/build.json').write_text(json.dumps({'build':'V32-M0.1.2-R1','english_base_sha256':hashlib.sha256((BASE/'01_English_V32/WordQuest_V32_Integrated.html').read_bytes()).hexdigest(),'math_base_sha256':hashlib.sha256((BASE/'02_Maths_0.1.2/WordQuest_Maths_Plugin_0.1.2.html.txt').read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(merged.encode()).hexdigest(),'input_latest_retrievable':{'english':'V32','maths':'0.1.2'},'not_recovered':['V33 Original Arcade','Maths 0.1.3 Character Features'],'new_art_generated':False},ensure_ascii=False,indent=2))
print('BUILT',len(merged.encode()),'bytes')
