"""Deterministic R3.2 incremental build. Read the preserved R3.1 app, not live user data."""
from pathlib import Path
import re,json,hashlib,shutil
R=Path(__file__).resolve().parents[1];S=R/'r32_src';orig=R/'originals/R3_1';orig.mkdir(parents=True,exist_ok=True)
for rel in ['app/index.html','app/sw.js','server/local_server.mjs','START_HERE.html','PACKAGE_MANIFEST.json','SHA256SUMS.txt','README_先看這份.md']:
 p=orig/rel
 if not p.exists():p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,p)
def once(s,a,b):
 n=s.count(a)
 if n!=1:raise ValueError(f'expected one anchor, got {n}: {a[:100]}')
 return s.replace(a,b,1)
raw=(orig/'app/index.html').read_text();tags=list(re.finditer(r'(<script\b[^>]*>)(.*?)(</script>)',raw,re.S|re.I));patch={}
g=tags[22][2]
a="R2.pose(c,this.p.x,this.p.y-9,.64,'rabbit',this.skin==='sunset'?'#c68976':'#6c83bc',this.done&&this.won?'victory':!this.grounded?(this.p.vy<0?'jump':'fall'):Math.abs(this.p.vx)>12?'run':'idle',this.t,this.p.vx<0?-1:1);"
g=once(g,a,'WQAFeng.renderGame(c,this);');g+='\n'+(S/'afeng_rig.js').read_text();patch[22]=g
# Add pure recovery validators to an already-loaded contract script; indices stay stable.
patch[32]=tags[32][2]+'\n'+(S/'reliability_core.js').read_text()
h=tags[33][2]
h=once(h,'function v24CanWrite(){return !isLoggedIn()||v23HasLease()&&!loadBlocked;}',"function v24CanWrite(){try{return (!isLoggedIn()||v23HasLease()&&!loadBlocked)&&!window.WQR3?.dataBusy()&&!(isLoggedIn()&&localStorage.getItem('wq-r3-recovery:'+accountId()));}catch(_){return false;}}")
h=once(h,'function r3PauseWork(){',"function r3PauseWork(){if(mediaBusy)throw Error('教材圖片或音訊仍在處理，請等待完成或取消後再備份／還原');")
h=once(h,'function r3ReplaceKV(owner,values){',"function r3ReplaceKV(owner,values){WQR32Safety.validateKV(values,owner,DBKEY_PREFIX+owner);")
h=once(h,"if(!j)throw Error('找不到復原日誌');r3ReplaceKV(owner,j.before);","if(!j)throw Error('找不到復原日誌');WQR32Safety.validateJournal(j,owner,DBKEY_PREFIX+owner);validateDb(JSON.parse(j.before[DBKEY_PREFIX+owner]));r3ReplaceKV(owner,j.before);")
h=once(h,"if(marker==='prepared'){if(!j)throw Error('復原日誌遺失，不能安全恢復。請保留資料並從家庭備份還原。');r3ReplaceKV(owner,j.before);","if(marker==='prepared'){if(!j)throw Error('復原日誌遺失，不能安全恢復。請保留資料並從家庭備份還原。');WQR32Safety.validateJournal(j,owner,DBKEY_PREFIX+owner);validateDb(JSON.parse(j.before[DBKEY_PREFIX+owner]));r3ReplaceKV(owner,j.before);")
# Prevent resolving a blocked IDB open twice or leaking an eventually-opened connection.
a="r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();mediaPromise=null;};resolve(r.result);};r.onerror=()=>{mediaPromise=null;reject(r.error||Error('未能開啟教材儲存。'));};r.onblocked=()=>{mediaError='請關閉同網站的其他分頁，再重試。';refreshMediaNotice();};"
b="let settled=false;r.onsuccess=()=>{if(settled){r.result.close();return;}settled=true;r.result.onversionchange=()=>{r.result.close();mediaPromise=null;};resolve(r.result);};r.onerror=()=>{if(settled)return;settled=true;mediaPromise=null;reject(r.error||Error('未能開啟教材儲存。'));};r.onblocked=()=>{if(settled)return;settled=true;mediaPromise=null;mediaError='請關閉同網站的其他分頁，再重試。';refreshMediaNotice();reject(Error(mediaError));};"
h=once(h,a,b)
# One coherent export snapshot. Inert UI plus writer guard also blocks a pending media
# operation at its write boundary. Capture guards re-run after asynchronous digest.
a='async function r3Export(){r3Parent();r3PauseWork();'
b='async function r3Export(){r3Parent();r3PauseWork();const exportInert=document.body.inert;r3Busy=true;document.body.inert=true;try{'
h=once(h,a,b)
a="r3Download('WordQuest_Family_R3_'+F3.day()+'.json',pack);return pack;}"
b="if(owner!==accountId()||intent!==v23Owner()||!v23ParentAllowed()||!v23HasLease()||JSON.stringify(allKeys)!==JSON.stringify(r3ReadKV()))throw Error('匯出校驗期間資料或身份改變，沒有產生備份');const serial=JSON.stringify(pack,null,2);if(!WQR32Safety.canExport(new TextEncoder().encode(serial).length))throw Error('家庭備份超過140 MB，未產生無法還原的檔案');r3Download('WordQuest_Family_R32_'+F3.day()+'.json',serial);return pack;}finally{r3Busy=false;document.body.inert=exportInert;}}"
h=once(h,a,b)
# Saving from a media importer after await must see the same global transaction guard.
# v24CanWrite is used at both storeMedia/removeMedia write boundaries.
h=once(h,'<h2>一次備份整個家庭</h2>','<h2>一次備份整個家庭</h2><button class="btn soft" data-r32="health">裝置與保存檢查</button>')
h=once(h,'\ninstallMediaEvents();\nrender();','\n'+(S/'host_additions.js').read_text()+'\ninstallMediaEvents();\nrender();')
h=h.replace("appVersion:'R3.1.0'","appVersion:'R3.2.0'").replace("version:'R3.0.0',dataBusy","version:'R3.2.0',dataBusy").replace('R3.1 · 森林學園','R3.2 · 森林學園').replace('WordQuest R3.1 · 森林學園','WordQuest R3.2 · 森林學園')
patch[33]=h
out=raw
for i,m in reversed(list(enumerate(tags))):out=out[:m.start()]+m[1]+patch.get(i,m[2])+m[3]+out[m.end():]
out=re.sub(r'<title>.*?</title>','<title>WordQuest R3.2 · 保存驗收與阿峰街機動作</title>',out,count=1)
(R/'app/index.html').write_text(out)
(R/'app/sw.js').write_text((orig/'app/sw.js').read_text().replace("+'-3.1.0'","+'-3.2.0'"))
for source,dest in [('device_check.html','device-check.html'),('device_check.js','device-check.js'),('afeng_rig.js','afeng-rig.js'),('afeng_animation.html','afeng-animation.html')]:shutil.copy2(S/source,R/'app'/dest)
# Node and PowerShell launchers now share /app/ canonical URL while retaining old aliases.
server=(orig/'server/local_server.mjs').read_text()
server=once(server,"const target=path.resolve(app,'.'+(rel==='/'?'/index.html':rel));","if(rel==='/app'||rel==='/app/')rel='/index.html';else if(rel.startsWith('/app/'))rel=rel.slice(4);const target=path.resolve(app,'.'+(rel==='/'?'/index.html':rel));")
server=server.replace("+port+'/index.html", "+port+'/app/index.html")
(R/'server/local_server.mjs').write_text(server)
(R/'r32_evidence/build.json').write_text(json.dumps({'base':'R3.1.0','version':'R3.2.0','baseSHA256':hashlib.sha256(raw.encode()).hexdigest(),'appSHA256':hashlib.sha256(out.encode()).hexdigest(),'scriptsBefore':len(tags),'scriptsAfter':len(re.findall(r'<script\b',out)),'modifiedScriptIndices':list(patch),'gamePhysicsUnchanged':True,'namespacedDiagnosticsOnly':True},indent=2))
print('R3.2 built:',len(out.encode()),'bytes')
