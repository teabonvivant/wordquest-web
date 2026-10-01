"""R3.1 character integration. Rebuild from the preserved R3 app, never from a live page."""
from pathlib import Path
import re,json,hashlib
R=Path(__file__).resolve().parents[1];S=R/'r31_src';orig=R/'originals/R3';orig.mkdir(exist_ok=True)
for name in ['index.html','sw.js']:
 p=orig/name
 if not p.exists():p.write_bytes((R/'app'/name).read_bytes())
for name in ['PACKAGE_MANIFEST.json','SHA256SUMS.txt','START_HERE.html']:
 p=orig/name
 if not p.exists():p.write_bytes((R/name).read_bytes())
def once(s,a,b):
 n=s.count(a)
 if n!=1:raise ValueError(f'Expected 1 anchor, got {n}: {a[:90]}')
 return s.replace(a,b,1)
raw=(orig/'index.html').read_text();scripts=list(re.finditer(r'(<script\b[^>]*>)(.*?)(</script>)',raw,re.S|re.I));patch={28:(S/'assets_data.js').read_text(),29:(S/'characters_core.js').read_text()}
# Preserve backup format and all slot keys, while validating the additional optional preference.
f=scripts[31][2]
f=once(f,"&&['rabbit','panda'].includes(row.preferences.gameBuddy),'角色偏好無效'", "&&['rabbit','panda'].includes(row.preferences.gameBuddy)&&(row.preferences.guide===undefined||row.preferences.guide==='auto'||['owl','fox','star','bee','rabbit','panda'].includes(row.preferences.guide)),'角色偏好無效'")
patch[31]=f;(S/'family_core_compatible.js').write_text(f)
h=scripts[32][2]
h=once(h,"function savePref(key,value){if(!Object.hasOwn(C.defaults,key))return;", "function savePref(key,value){if(!Object.hasOwn(C.defaults,key))return;if(window.WQR3?.dataBusy()){issue='家庭資料處理中，暫時不能更改學伴設定。';return;}")
h=once(h,"QA('[data-wq32-pref]').forEach(el=>el.checked=!!pref[el.dataset.wq32Pref]);", "QA('[data-wq32-pref]').forEach(el=>{if(el.tagName==='SELECT')el.value=pref[el.dataset.wq32Pref];else el.checked=!!pref[el.dataset.wq32Pref];});window.dispatchEvent(new CustomEvent('wq-forest-preferences-changed'));")
h=once(h,"const g=C.guide(c),d=C.roles[g.role]", "const g=C.guide(c,pref),d=C.roles[g.role]")
h=once(h,"card.dataset.state=g.state;card.setAttribute", "card.dataset.state=g.state;card.dataset.busy=String(!!c.busy);card.dataset.quiet=String(!!g.quiet);card.setAttribute")
h=once(h,"im.dataset.wq32Character=id;im.dataset.wq32Pose=pose;", "im.dataset.wq32Character=id;im.dataset.forestCharacter=C.roles[id]?.id||'';im.dataset.wq32Pose=pose;")
h=once(h,'function htmlImage(id,cls=\'\',alt=\'\'){return',"function htmlImage(id,cls='',alt=''){if(!pref.show)return '';return")
h=h.replace("老師教、精靈幫、同學陪你玩","森林學園 · 六位學習夥伴").replace("按角色認識夥伴，學習時每次只由一位帶路。","老師講解、助手陪伴、同學一起挑戰。學習時只由一位帶路。")
h=h.replace('月月和跳跳，一起探索街機','阿峰與糖栗老師，一起探索街機').replace('選一位電腦同學陪伴。','選一位角色陪伴。').replace("+' · 電腦同學'","+' · 街機學伴'")
# Add all-six fixed companion selection, without touching the legacy gameBuddy rule.
a="const row=elem('div','wq32-actions');row.append(button('查看全部角色','page'));"
b="const choice=elem('label','wq32-select-row','學伴安排'),select=elem('select');select.dataset.wq32Pref='guide';select.setAttribute('aria-label','學伴安排');for(const [id,name]of [['auto','按課堂自動安排'],...C.ids.map(id=>[id,C.roles[id].name])]){const option=elem('option','',name);option.value=id;select.append(option);}select.value=pref.guide;choice.append(select);s.append(choice);const row=elem('div','wq32-actions');row.append(button('查看全部角色','page'));"
h=once(h,a,b)
h=h.replace('播放短促動作','短暫進場動效（不是逐格角色動畫）')
h=h.replace('設定分帳戶、孩子及測試區保存於本機。角色偏好不在舊版學習備份中；圖片已內置，毋須另行下載。','設定分帳戶及孩子保存。R3家庭完整備份包含角色偏好；舊英文單科備份不包含。六位新角色圖片已內置。')
h=h.replace("[['front','正面'],['side','側面'],['back','背面'],...d.faces.map", "[['front','角色肖像'],...d.faces.map")
h=h.replace('沿用已設計的角色原圖，提供角度、表情切換及短促動作；不是完整走路或跑步動畫。','已接入本次新繪六位角色：肖像及五個表情。表情為原海報的小尺寸裁切；未有獨立側面、背面或逐格動作素材。')
h=h.replace('設定圖為最初概念，功能與名稱以本頁及 V32 實際介面為準。','這是本次重新繪製的概念海報，不是取回V33或0.1.3原件。海報文字和示意圖不作教材、出題或判分依據。')
h=h.replace('選一位，看看不同角度、表情，以及他在網站如何幫你。','選一位，看看角色肖像、表情，以及他在網站如何幫你。')
h=h.replace('請星星提供原有提示；本題會記作有提示','請刺刺提供原有提示；本題會記作有提示').replace('我是奧奧老師。','我是烈烈老師。')
h=h.replace("savePref(k,e.target.checked)","savePref(k,e.target.tagName==='SELECT'?e.target.value:e.target.checked)")
h=h.replace("'V32 · 獨立測試':'V32 · 學習夥伴版'","'R3.1 · 獨立測試':'R3.1 · 森林學園'").replace('WordQuest V32 · 原創動物學習夥伴','WordQuest R3.1 · 森林學園六角色').replace('請重新開啟 V32 完整版本','請重新開啟 R3.1 完整版本')
h=h.replace("appVersion:'32.0.0',characterVersion:'32.0.0'","appVersion:'3.1.0',characterVersion:'3.1.0'")
h=once(h," window.WQ32=Object.freeze",(S/'math_host_helpers.js').read_text()+"\n window.addEventListener('storage',e=>{if(e.key===owner){memory.delete(owner);owner='';refresh(true);window.dispatchEvent(new CustomEvent('wq-forest-preferences-changed'));}});\n window.WQ32=Object.freeze")
h=once(h,"window.WQ32=Object.freeze({version:'32.0.0',roles", "window.WQ32=Object.freeze({version:'3.1.0',getPreferences:()=>{readPrefs();return {...pref};},setPreference:savePref,mathHTML:forestMathHTML,roles")
h=once(h,"inspect:()=>({version:'32.0.0'", "inspect:()=>({version:'3.1.0'")
h=h.replace("roles:()=>C.ids.map(k=>({id:k,name:C.roles[k].name}))", "roles:()=>C.ids.map(k=>({id:k,characterId:C.roles[k].id,name:C.roles[k].name,animal:C.roles[k].animal}))")
# Prevent character buttons from bypassing family data transaction lock.
h=h.replace("appVersion:'R3.0.0'", "appVersion:'R3.1.0'").replace("WordQuest R3 · 家庭整合升級", "WordQuest R3.1 · 森林學園")
patch[32]=h
m=scripts[38][2];start=m.index(' function companion(){');end=m.index(' function render(){',start)
m=m[:start]+(S/'math_companion.js').read_text()+'\n'+m[end:]
a="${['home','normal','olympiad','lesson'].includes(view)?companion():''}"
m=once(m,a,'<div id="forest-math-slot">${companion()}</div>')
m=once(m,'shadow.append(style);app=document.createElement', "style.textContent+='\\n'+(root.WQForestMathCSS||'');shadow.append(style);app=document.createElement")
a="  app.addEventListener('click',action);"
b="""  app.addEventListener('click',e=>{const b=e.target.closest('[data-forest-options]');if(b){e.preventDefault();e.stopImmediatePropagation();const panel=app.querySelector('#forest-math-options');if(panel){panel.hidden=!panel.hidden;b.setAttribute('aria-expanded',String(!panel.hidden));}return;}},true);
  app.addEventListener('change',e=>{const k=e.target.dataset?.forestPref;if(k){e.stopImmediatePropagation();root.WQ32.setPreference(k,e.target.tagName==='SELECT'?e.target.value:e.target.checked);}},true);
  root.addEventListener('wq-forest-preferences-changed',refreshForestOnly);
  app.addEventListener('click',action);"""
m=once(m,a,b)
m=m.replace("version:'0.1.2',integrationVersion:'V32-M0.1.2-R1'", "version:'3.1.0',integrationVersion:'R3.1-FOREST'")
patch[38]=m
s=raw
for i,mt in reversed(list(enumerate(scripts))):
 tag=mt[1]+patch.get(i,mt[2])+mt[3]
 if i==29:tag+='\n<script data-wq-forest="css">globalThis.WQForestMathCSS='+json.dumps((S/'forest_math.css').read_text(),ensure_ascii=False)+';</script>'
 s=s[:mt.start()]+tag+s[mt.end():]
s=once(s,'</head>','<style data-wq-forest="layout">'+(S/'forest.css').read_text()+'</style>\n</head>')
s=re.sub(r'<title>.*?</title>','<title>WordQuest R3.1 · 森林學園角色整合版</title>',s,count=1)
(R/'app/index.html').write_text(s)
sw=(orig/'sw.js').read_text().replace("+'-3.0.0'","+'-3.1.0'")
(R/'app/sw.js').write_text(sw)
e=R/'r31_evidence';e.mkdir(exist_ok=True)
e.joinpath('build.json').write_text(json.dumps({'version':'R3.1.0','baseSha256':hashlib.sha256(raw.encode()).hexdigest(),'appSha256':hashlib.sha256(s.encode()).hexdigest(),'baseScripts':len(scripts),'scriptPatches':list(patch),'addedScripts':1,'mathCurriculumAndCoreUnchanged':True,'artSource':'new six generated concept posters in current conversation','notRecoveredV33':True},indent=2))
print('Built',len(s.encode()),'bytes')
