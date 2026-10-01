"""Apply the R2 arcade implementation to the preserved R1; no third-party build tools.
Run: python tools/build_arcade_r2.py. End users open the prebuilt app/index.html.
"""
from pathlib import Path
import re,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'originals/R1/index.html').read_text()
def once(s,old,new):
 n=s.count(old)
 if n!=1:raise ValueError(f'Patch anchor must occur once, got {n}: {old[:100]}')
 return s.replace(old,new,1)
ids="'ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley'"
scripts=list(re.finditer(r'(<script\b[^>]*>)(.*?)(</script>)',s,re.S|re.I))
patches={}
# Extend the existing stable-ID wallet; never re-migrate V28 balances.
t=scripts[19].group(2)
t=once(t,"const VERSION = '28.0.0';","const VERSION = '28.0.0+arcade-r2';")
t=once(t,"'garden-paths','little-engineer','sweet-studio'];","'garden-paths','little-engineer','sweet-studio',"+ids+"];")
t=once(t,'const words = [0,0,0,0,0,0,5,5,5,5,15,15,15,30,30,30,30,50,50,50,50];','const words = [0,0,0,0,0,0,5,5,5,5,15,15,15,30,30,30,30,50,50,50,50,0,0,5,5,0];')
t=once(t,'Object.keys(v.bests).length<=63','Object.keys(v.bests).length<=ids.length*3')
patches[19]=t
# Retain every old snapshot contract, and add a separate explicit new-game contract.
t=scripts[9].group(2)
t=once(t,"default:throw Error('unknown game');","case 'ruins-courier':case 'cloud-island':case 'star-patrol':case 'lighthouse-well':case 'harbor-volley':return globalThis.WQR2Validate(id,s);\n default:throw Error('unknown game');")
patches[9]=t
t=scripts[22].group(2);t=once(t,"const special=new Set(['sky-rescue','forest-dash','sweet-studio']);","const special=new Set(['sky-rescue','forest-dash','sweet-studio',"+ids+"]);")
patches[22]=t
# Host changes are all within its existing private application closure.
t=scripts[30].group(2)
t=once(t,"a28Filter='全部'","a28Filter='新街機'")
t=once(t,"const items=COIN28.catalog.filter(g=>a28Filter==='全部'||a28Meta(g.id).category===a28Filter);","const items=COIN28.catalog.filter(g=>a28Filter==='全部'||a28Filter==='新街機'&&WQR2.ids.includes(g.id)||a28Meta(g.id).category===a28Filter).sort((a,b)=>Number(WQR2.ids.includes(b.id))-Number(WQR2.ids.includes(a.id)));")
t=once(t,"['全部','動作','運動','解謎','策略','創作'].map(t=>a28Btn","['新街機','全部','動作','運動','解謎','策略','創作'].map(t=>a28Btn")
t=t.replace('封面插畫 · 21 部街機可預覽','原有21款＋5款新街機 · 全部可預覽').replace('<span> / 21</span>','<span> / ${COIN28.catalog.length}</span>').replace('gameCount:21','gameCount:COIN28.catalog.length').replace('21 部街機、全彩預覽','26 部街機、全彩預覽')
t=once(t,'data-cabinet="${g.id}"','data-cabinet="${g.id}" data-r2-new="${WQR2.ids.includes(g.id)}"')
t=once(t,"function a28Objective(id){return ({","function a28Objective(id){if(WQR2.ids.includes(id))return ({'ruins-courier':'3格生命 · 三段送信1500米','cloud-island':'3格生命 · 三座雲島及安全旗幟','star-patrol':'3格生命 · 三區編隊與守關','lighthouse-well':'3格生命 · 深入60層','harbor-volley':'先5分、領先2分 · 最多7分'})[id];return ({")
t=once(t,"function a28Winning(g){switch(g.meta.id)","function a28Winning(g){if(WQR2.ids.includes(g.meta.id))return g.won===true;switch(g.meta.id)")
t=once(t,"'forest-pong','bounce-basket','meadow-cricket','star-rhythm'].includes(pgMeta.id)){r.lives=0","'forest-pong','bounce-basket','meadow-cricket','star-rhythm',"+ids+"].includes(pgMeta.id)){r.lives=0")
t=once(t,"if(['sky-rescue','forest-dash','sweet-studio'].includes(pgMeta.id)&&!pgFree)","if(['sky-rescue','forest-dash','sweet-studio',"+ids+"].includes(pgMeta.id)&&!pgFree)")
t=once(t,"'star-rhythm','color-orbit','block-studio']);","'star-rhythm','color-orbit','block-studio',"+ids+"]);")
t=once(t,"tone:(...v)=>{if(!preview&&epoch===a28Epoch)pgAudio.tone(...v);},clock:","tone:(...v)=>{if(!preview&&epoch===a28Epoch)pgAudio.tone(...v);},music:(f,d,wave,vol)=>{if(!preview&&epoch===a28Epoch)pgAudio.tone(f,d,wave,vol,null,'music');},clock:")
t=once(t,"candidate.draw();const snapshot=SNAP28.capture(candidate);","candidate.draw();const snapshot=SNAP28.capture(candidate);")
# Preview remains read-only; draw actual seeded game state rather than promotional screenshots.
t=once(t,"g.draw();const src=cv.toDataURL('image/webp',.84)","if(WQR2.ids.includes(id))for(let i=0;i<80;i++)g.tick(1/60);g.draw();const src=cv.toDataURL('image/webp',.84)")
t=once(t,"KeyC:'hold',KeyQ:'q'","KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold',KeyX:'x',KeyQ:'q'")
t=once(t,"if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();pgPause();return;}","if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();pgPause();if(r2Immersive)r2ExitFullscreen();return;}")
t=once(t,"else if(a==='leave'){if(!pgPause())return;pgGame=null;","else if(a==='leave'){if(!pgPause())return;r2ExitFullscreen();pgGame=null;")
t=once(t,"pgGame.keys.clear();a28DrawHeld=false;","pgGame.keys.clear();if(WQR2.ids.includes(pgGame.meta.id)){if('jumpHeld' in pgGame)pgGame.jumpHeld=false;if('jumpBuffer' in pgGame)pgGame.jumpBuffer=0;if('spike' in pgGame)pgGame.spike=0;}a28DrawHeld=false;")
t=once(t,"if(pgGame)pgGame.keys.delete(k);","if(pgGame){pgGame.keys.delete(k);if(WQR2.ids.includes(pgGame.meta.id)&&['up','action'].includes(k)){if('jumpHeld' in pgGame)pgGame.jumpHeld=pgGame.keys.has('up')||pgGame.keys.has('action');if('jumpBuffer' in pgGame&&!pgGame.jumpHeld)pgGame.jumpBuffer=0;if('spike' in pgGame)pgGame.spike=0;}}")
t=once(t,"${a28Btn('操作說明','help','','quiet')}${pgMeta.id===", "${a28Btn('操作說明','help','','quiet')}${a28Btn('放大／還原','r2-full','','soft')}${pgMeta.id===")
t=once(t,'<p id="pg-hint" class="small muted"></p><div id="pg-status"','<p id="pg-hint" class="small muted"></p>${r2AudioPanel()}<div id="pg-status"')
# No data-loss rollover when three difficulty bests exist for all 26 games.
t=once(t,'sfxEnabled:settings.sfxEnabled!==false},createdAt:','sfxEnabled:settings.sfxEnabled!==false,arcadeSfxVolume:num(settings.arcadeSfxVolume,0,100,60),arcadeMusicVolume:num(settings.arcadeMusicVolume,0,100,35)},createdAt:')
a=t.index('const pgAudio={');b=t.index('// Learning signals:',a);t=t[:a]+(ROOT/'arcade_src/audio.js').read_text()+'\n'+t[b:]
# A cancelled start must not leave audio running after an asynchronous resume.
t=t.replace("if(owner!==a28Own()||epoch!==a28Epoch||intent!==a28StartIntent||document.hidden)return;","if(owner!==a28Own()||epoch!==a28Epoch||intent!==a28StartIntent||document.hidden){pgAudio.pause();return;}")
t=t.replace('21 款','26 款').replace('21 部','26 部')
t=once(t,'\ninstallMediaEvents();\nrender();','\n'+(ROOT/'arcade_src/host_extension.js').read_text()+'\ninstallMediaEvents();\nrender();')
patches[30]=t
for i,m in reversed(list(enumerate(scripts))):
 new=patches.get(i,m.group(2));tag=m.group(1)+new+m.group(3)
 if i==21:tag+='\n<script data-wq-r2="engines">\n'+(ROOT/'arcade_src/engines.js').read_text()+'\n</script>'
 s=s[:m.start()]+tag+s[m.end():]
s=once(s,'</head>','<style data-wq-r2="layout">'+(ROOT/'arcade_src/arcade.css').read_text()+'</style>\n</head>')
s=re.sub(r'<title>.*?</title>','<title>WordQuest 英文＋數學＋街機 R2</title>',s,count=1)
(ROOT/'app/index.html').write_text(s)
(ROOT/'arcade_evidence/build.json').write_text(json.dumps({'version':'R2.0.0','base':'V32-M0.1.2-R1','source_note':'new implementation from recovered design/history, not recovered V33 source','output_sha256':hashlib.sha256(s.encode()).hexdigest(),'new_game_ids':ids,'legacy_ids_unchanged':True},ensure_ascii=False,indent=2))
print('R2 built',len(s.encode()),'bytes')
