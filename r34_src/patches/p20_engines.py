"""R3.4 p20 - rules, fairness and feel fixes for the 26 arcade games.

Every change is an exact string patch applied with ctx.once (one occurrence or the build fails).
Design rules that every patch obeys:
  * No new enumerable own property on a game instance (the checkpoint validator rejects unknown
    fields).  New per-instance state lives in the WeakMap helper wq34S(game); resuming a checkpoint
    simply starts that helper state fresh, which is always the lenient direction.
  * Health changes only inside engine update code (a28RulesTick mirrors it into run.lives).
  * Ranges enforced by WQGameSchema / WQR2Validate are respected (see the comments next to the
    few constants that moved close to them).
  * Draw-only helpers wrap prototype.draw and never mutate state.
Anchors are grouped by script so a failing anchor names the game that moved.
"""

HOST = []      # (label, old, new) patches for the host closure and shared scripts
ENGINES = []   # (label, old, new) patches for the game engines


def H(label, old, new):
    HOST.append((label, old, new))


def E(label, old, new):
    ENGINES.append((label, old, new))


# ---------------------------------------------------------------------------------------------
# Shared helpers (s13, loaded before every engine and before the host)
# ---------------------------------------------------------------------------------------------
H('helpers', r'''function registerGame(meta,Class){''', r'''/* R3.4 helpers: per-instance side state (never serialised) and the stored touch-latency calibration. */
globalThis.wq34S=(function(){const m=new WeakMap();return function(o){let v=m.get(o);if(!v){v={};m.set(o,v);}return v;};})();
globalThis.wq34Lat=function(){try{const v=Number(localStorage.getItem('wq34.lat'));return Number.isFinite(v)?Math.max(0,Math.min(260,v)):0;}catch(_){return 0;}};
function registerGame(meta,Class){''')

# ---------------------------------------------------------------------------------------------
# Host rules (s33 / s19 / s09 / audio)
# ---------------------------------------------------------------------------------------------
# A finished drift route and a finished moon climb used to be scored as failures.
H('win-drift-moon', r'''case 'forest-band':return true;default:return false;}}''',
  r'''case 'forest-band':return true;case 'drift-path':return WQCore.distance(g.pos,g.nodes[g.nodes.length-1])<50;case 'moon-bells':return g.bells[g.bells.length-1].used===true;default:return false;}}''')

# Canvas pointer input is handed back to games whose engines already implement it.
H('motion-set', r'''const a28Motion=new Set(['sky-rescue','forest-dash','moon-bells','valley-race','drift-path','forest-pong','bounce-basket','meadow-cricket','star-rhythm','color-orbit','block-studio','ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley'])''',
  r'''const a28Motion=new Set(['sky-rescue','forest-dash','valley-race','drift-path','ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley'])''')

# color-workshop has no pointer handler: the virtual cursor and five dead D-pad buttons are removed.
H('pointer-set', r'''const a28PointerGames=new Set(['juice-lines','little-engineer','honeycomb-puzzle','color-workshop','forest-band'])''',
  r'''const a28PointerGames=new Set(['juice-lines','little-engineer','honeycomb-puzzle','forest-band'])''')

# A retry keeps the points already earned in the run (the level is kept, so the score should be too).
H('retry-score', r'''g.level=old.level;g.load?.();''', r'''g.level=old.level;g.load?.();g.score=old.score;''')

# Colour workshop: two free wrong checks per ball, with a count of the wrong quarters.
H('cw-free-checks',
  r'''if(pgMeta.id==='color-workshop'&&id==='check'&&!pgGame.mask.size&&!pgGame.colors.every((v,i)=>v===pgGame.target[i])){return a28Fail('彩球驗收未通過，使用一次機會。');}''',
  r'''if(pgMeta.id==='color-workshop'&&id==='check'&&!pgGame.mask.size&&!pgGame.colors.every((v,i)=>v===pgGame.target[i])){const S=wq34S(pgGame);if(S.lv!==pgGame.level){S.lv=pgGame.level;S.wrong=0;}S.wrong++;if(S.wrong<=2){const n=pgGame.colors.reduce((a,v,i)=>a+(v!==pgGame.target[i]?1:0),0);pgGame.say('有 '+n+' 格顏色不同。'+(S.wrong===1?'免費再驗收一次。':'下次驗收不通過，會用去一次機會。'));pgGame.toolbar();if(!pgCheckpoint())pgOverlay();return;}return a28Fail('彩球驗收三次未通過，使用一次機會。');}''')

# Little engineer: going back to the design view is free; only a finished stuck run is a plain retry.
H('le-free-return',
  r'''if(pgMeta.id==='little-engineer'&&id==='run'&&pgGame.running){return a28Fail('試行已結束，使用一次機會；保留車架再調整。');}''', r'''''')

# Star rhythm: remembered input latency (calibrated from the count-in taps, see the engine patch).
H('rhythm-latency', r"""latency:0,_tools:[],_hint:''""", r"""latency:wq34Lat(),_tools:[],_hint:''""")

# Number garden snapshots now allow the gentler targets.
H('ng-validate', r'''ok([512,1024,2048].includes(s.target),'目標')''', r'''ok([256,512,1024,2048].includes(s.target),'目標')''')

# Music of the five R2 games was about 14 dB under the effects; double the note gain.
H('r2-music-gain', r'''g.api.music?.(scales[theme%3][n%8]*(n%4===0?.5:1),.19,'triangle',.035);''',
  r'''g.api.music?.(scales[theme%3][n%8]*(n%4===0?.5:1),.19,'triangle',.07);''')

# ---------------------------------------------------------------------------------------------
# s14: moon-bells, bounce-basket, drift-path, meadow-cricket, forest-pong, valley-race
# ---------------------------------------------------------------------------------------------
E('moon-win', r'''if(!b.used){b.used=true;this.score+=20;this.sound(600+(b.id%8)*60,.14);}''',
  r'''if(!b.used){b.used=true;this.score+=20;this.sound(600+(b.id%8)*60,.14);if(b.id===this.bells.length-1){this.score+=300;this.end('登上月亮了！高度 '+Math.floor(this.maxH/10)+' 米。','登上月亮');}}''')
E('moon-rescue', r'''registerGame({id:'moon-bells',''', r'''{const U=MoonBells.prototype.update;MoonBells.prototype.update=function(dt){const p=this.p,S=wq34S(this);if(!this.done&&p.vy>0&&p.y-this.camera>590&&!S.saved){S.saved=true;p.vy=-650;this.say('月亮泡泡接住你了！');this.sound(880,.2,'triangle',.12);}return U.call(this,dt);};}
registerGame({id:'moon-bells',''')

# The computer paddle drifts (so it can be beaten) and drifts more the longer a rally lasts (no endless stalemate).
E('pong-ai', r'''this.ax+=WQCore.clamp(b.x-this.ax,-[150,235,335][this.d]*dt,[150,235,335][this.d]*dt);''',
  r'''this.ax+=WQCore.clamp(b.x+Math.sin(this.t*1.9)*[70,50,34][this.d]*(1+Math.min(3,(this.hits-(wq34S(this).base||0))/8))-this.ax,-[150,235,335][this.d]*dt,[150,235,335][this.d]*dt);''')
E('pong-rally', r'''registerGame({id:'forest-pong',''', r'''{const S0=ForestPong.prototype.serve;ForestPong.prototype.serve=function(dir){wq34S(this).base=this.hits||0;return S0.call(this,dir);};}
registerGame({id:'forest-pong',''')
E('pong-serve', r'''vx:90*(this.r()>.5?1:-1),vy:dir*[240,300,360][this.d]''', r'''vx:(90+this.r()*110)*(this.r()>.5?1:-1),vy:dir*[240,300,360][this.d]''')

E('basket-charge', r'''if(this.charging)this.charge=Math.min(1,this.charge+dt*.75);''', r'''if(this.charging)this.charge=Math.min(1,this.charge+dt*.5);''')
E('basket-window', r'''Math.abs(b.x-this.hoop.x)<[39,33,28][this.d]&&!this.scored''', r'''Math.abs(b.x-this.hoop.x)<[46,40,34][this.d]&&!this.scored''')
E('basket-drag-guard', r'''if(type==='up'){const dx=this.drag.x-p.x,dy=this.drag.y-p.y;this.launch(''', r'''if(type==='up'){const dx=this.drag.x-p.x,dy=this.drag.y-p.y;if(Math.hypot(dx,dy)>28)this.launch(''')
E('basket-badge', r"""'按住 Space 蓄力，放開投籃'""", r"""'按住蓄力放手，或拖拉小球彈射'""")
E('basket-preview', r'''registerGame({id:'bounce-basket',''', r'''{const Dr=BounceBasket.prototype.draw;BounceBasket.prototype.draw=function(){Dr.call(this);if(this.charging&&!this.flying){const v=350+this.charge*290,vx=v*.82,vy=-v*.86,b=this.ball,ps=[];for(let i=0;i<18;i++){const t=i*.06;ps.push({x:b.x+vx*t,y:b.y+vy*t+285*t*t});}D.line(this.c,ps,'#829b72',3,[4,9]);}};}
registerGame({id:'bounce-basket',''')

E('drift-start', r'''this.nodes=[{x:-150,y:0},{x:145,y:0}]''', r'''this.nodes=[{x:-150,y:0},{x:330,y:0}]''')

E('cricket-say', r'''else{this.say('揮早了，看準金色圈再按。');}''', r'''else{this.say(this.ball.x>210?'揮早了，球還沒到金色圈。':'揮慢了，球已經過了金色圈。');}''')
E('cricket-speed', r'''vx:-[235,305,375][this.d]''', r'''vx:-[235,305,375][this.d]*(.88+.24*this.r())''')
E('cricket-ball', r'''D.circle(c,this.ball.x,this.ball.y,10,'#fff7df','#c8b080')''', r'''D.circle(c,this.ball.x,this.ball.y,13,'#fffdf2','#8f7a4a')''')

# Steering rate is deliberately left alone: a grid of bots (look-ahead, reaction time, noise) did worse with a lower rate.
E('race-offroad', r'''near.d>roadWidth?52:''', r'''near.d>roadWidth?95:''')
E('race-car', r'''D.car(c,this.car.x,this.car.y,this.car.a,.65);''', r'''D.car(c,this.car.x,this.car.y,this.car.a,.95);''')
E('race-gate-score', r'''this.nextGate++;this.sound(420+this.nextGate*70,.07);''', r'''this.nextGate++;this.sound(420+this.nextGate*70,.07);this.score+=100;''')

# ---------------------------------------------------------------------------------------------
# s17: forest-band, star-rhythm
# ---------------------------------------------------------------------------------------------
E('band-autoplay', r'''this.edit=0;this.playing=false;this.stepIndex=0;''', r'''this.edit=0;this.playing=!this.preview;this.stepIndex=0;''')
E('band-hint', r'''this.hint('按播放，開關每一拍；先選樂器，再點下方 1–16 拍。作品可保存及匯出。')''',
  r'''this.hint('合奏已自動播放。先選樂器，再點下方 1–16 拍加減節奏；作品可保存及匯出。')''')
E('band-playhead', r'''registerGame({id:'forest-band',''', r'''{const Dr=ForestBand.prototype.draw;ForestBand.prototype.draw=function(){Dr.call(this);if(!this.playing||this.lastStep<0)return;const c=this.c,x=210+this.lastStep*31;c.save();c.globalAlpha=.3;D.round(c,x-2,276,31,5*43-6,8,'#ffffff');c.restore();D.round(c,x,266,27,6,3,'#4d7657');for(let row=0;row<5;row++)if(this.active[row]&&this.patterns[row][this.lastStep])D.circle(c,x+13.5,278+row*43+17,19,null,'#ffffffd0');};}
registerGame({id:'forest-band',''')

E('rhythm-grace', r'''if(!this.hitCurrent){this.combo=0;this.mark='下一拍再來';this.markTime=.5;}''', r'''if(!this.hitCurrent){this.combo=0;this.mark='下一拍再來';this.markTime=.5;if(this.index<3)this.hits++;}''')
E('rhythm-badge', r"""'跟着預備拍，準備出發'""", r"""'跟着預備拍輕拍，幫你校準節拍'""")
E('rhythm-calibrate', r'''registerGame({id:'star-rhythm',''', r'''{const A=StarRhythm.prototype.act;StarRhythm.prototype.act=function(k){
 if(k==='action'&&!this.done){
  const S=wq34S(this),p=this.period;
  if(this.t<p*4.6){ /* count-in: taps measure the device latency instead of being judged */
   if(this.t>p*.6&&!S.cal3){const m=this.t%p,off=(m<p/2?m:m-p)*1000;if(Math.abs(off)<p*450){(S.cal=S.cal||[]).push(off);if(S.cal.length>=3){S.cal3=true;const a=S.cal.slice().sort((x,y)=>x-y),med=a[a.length>>1],lat=med>55?Math.max(0,Math.min(260,Math.round(med*.9))):0;this.api.latency=lat;try{localStorage.setItem('wq34.lat',String(lat));}catch(_){}this.mark=lat?'已校準節拍':'節拍很準';this.markTime=1;}}}
   return;}
  const q=(S.taps=S.taps||[]);q.push(this.t);while(q.length&&q[0]<this.t-p*1.5)q.shift();
  if(S.lock&&this.t<S.lock)return;
  if(q.length>=3){S.lock=this.t+p*1.2;this.combo=0;this.mark='一拍只按一下';this.markTime=.7;q.length=0;return;}
 }
 return A.call(this,k);};}
registerGame({id:'star-rhythm',''')

# ---------------------------------------------------------------------------------------------
# s15: honey-delivery, rolling-block, juice-lines, color-workshop, little-engineer
# ---------------------------------------------------------------------------------------------
# The cup is moved off the candy's axis so that "cut everything at once" no longer wins every level.
E('honey-cup', r'''this.target={x:this.candy.x,y:458};''',
  r'''this.target={x:this.candy.x+((this.d>0||this.level>2)?[-150,150][this.level%2]:-110),y:458};''')
E('honey-stars', r'''this.stars=[{x:this.target.x,y:310,taken:false},{x:this.target.x+(this.d?45:0),y:375,taken:false}];''',
  r'''this.stars=[{x:this.target.x,y:372,taken:false},{x:this.target.x+(this.d?45:0),y:418,taken:false}];''')
E('honey-cat', r'''D.animal(c,660,447,.65,'cat')''', r'''D.animal(c,this.target.x<500?700:100,447,.65,'cat')''')
E('honey-hint', r"""this.hint('點繩子剪斷，或按「剪左／右繩」。把蜜糖送進下方杯子。');""",
  r"""this.hint('虛線是「現在剪斷」的落點，變綠色就剪！兩條繩要先剪一條，等蜜糖擺到好位置再剪另一條。');""")
E('honey-arc', r'''registerGame({id:'honey-delivery',''', r'''{const Dr=HoneyDelivery.prototype.draw;HoneyDelivery.prototype.draw=function(){Dr.call(this);if(this.failed||this.d>1||this.done||this.ropes.filter(r=>!r.cut).length>1)return;const c=this.c,p=this.candy;let x=p.x,y=p.y,vx=p.vx,vy=p.vy;const ps=[{x,y}];for(let i=0;i<540&&y<this.target.y;i++){vy+=470/180;vx*=Math.pow(.999,1/3);x+=vx/180;y+=vy/180;if(i%9===8)ps.push({x,y});}const ok=Math.abs(x-this.target.x)<[74,63,51][this.d],col=ok?'#4f9a68':'#c98466';D.line(c,ps,col,3,[3,9]);D.circle(c,x,this.target.y,7,col);};}
registerGame({id:'honey-delivery',''')

# rolling-block: a real difficulty ramp (banded seed search keeps every board BFS-solvable), swipe, visible hint.
E('rb-ramp', r'''this.board=WQCore.blockLevel(338+this.level*79+this.d*1721,this.d);''',
  r'''{let sd=338+this.level*79+this.d*1721,bd=null;const lo=Math.min(12,3+this.level+this.d);for(let k=0;k<80;k++){bd=WQCore.blockLevel(sd+k*7,this.d);if(bd.solution&&bd.solution.length>=lo&&bd.solution.length<=lo+3)break;}this.board=bd;}''')
E('rb-swipe', r'''class RollingBlock extends WQGame{''', r'''class RollingBlock extends WQGame{
 pointer(type,p){const S=wq34S(this);if(type==='down')S.s=p;else if(type==='move'&&S.s){const dx=p.x-S.s.x,dy=p.y-S.s.y;if(Math.max(Math.abs(dx),Math.abs(dy))>40){this.act(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));S.s=p;}}else if(type==='up'&&S.s){const dx=p.x-S.s.x,dy=p.y-S.s.y;if(Math.max(Math.abs(dx),Math.abs(dy))>28)this.act(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));S.s=null;}else if(type==='cancel')S.s=null;}''')
E('rb-hint-badge', r'''[this.showHint],400,520);''', r'''[this.showHint],650,37);''')
E('rb-hint-text', r'''this.hint('用方向鍵翻滾長方體，直立落在金色目標格才過關。')''', r'''this.hint('用方向鍵或在畫面上滑動，翻滾長方體；直立落在金色目標格才過關。')''')

# juice-lines: the water supply is limited (a good ramp matters), levels use different positions,
# rename the water refill so it no longer costs an attempt, bigger drops and a rising catch sound.
E('jl-tool-id', r'''{id:'reset',label:'重新裝水'}''', r'''{id:'refill',label:'重新裝水'}''')
E('jl-refill', r'''if(k==='reset'){this.particles=[];this.caught=0;this.emit=0;}''', r'''if(k==='refill'){this.particles=[];this.caught=0;this.emit=0;wq34S(this).spawned=0;}''')
E('jl-spawn', r'''while(this.emit>=1&&this.particles.length<180){this.emit--;this.particles.push(''',
  r'''while(this.emit>=1&&this.particles.length<180){this.emit--;wq34S(this).spawned=(wq34S(this).spawned||0)+1;this.particles.push(''')
E('jl-supply', r'''update(dt){if(this.pouring){this.emit+=dt*12;''',
  r'''update(dt){{const S=wq34S(this);if(this.pouring&&(S.spawned||0)>=this.required*3){this.pouring=false;this.emit=0;this.toolbar();this.say('水用完了。改一改線條，再按「重新裝水」。');}}if(this.pouring){this.emit+=dt*12;''')
E('jl-level-pos', r'''this.emitter={x:this.level%2?180:620,y:85};this.cup={x:this.level%2?595:205,y:450};''',
  r'''{const L=(this.level-1)%8;this.emitter={x:[180,620,400,140,660,300,520,100][L],y:85};this.cup={x:[595,205,560,640,160,520,260,700][L],y:450};wq34S(this).spawned=0;}''')
E('jl-guide', r'''D.line(c,[{x:this.emitter.x-35,y:140},{x:this.cup.x+(this.level%2?-45:45),y:420}],'#b9c6a9',3,[7,12]);''',
  r'''if(this.level<=2){const sg=this.cup.x<this.emitter.x?1:-1;D.line(c,[{x:this.emitter.x+sg*35,y:140},{x:this.cup.x+sg*45,y:420}],'#b9c6a9',3,[7,12]);}''')
E('jl-badge', r'''D.badge(c,`畫線餘量 ${Math.max(0,Math.round(this.budget-this.ink))}`,400,33);''',
  r'''D.badge(c,`畫線餘量 ${Math.max(0,Math.round(this.budget-this.ink))} · 水量 ${Math.max(0,this.required*3-(wq34S(this).spawned||0))}`,400,33);''')
E('jl-drop', r'''D.circle(c,p.x,p.y,4.3,'#dfa957')''', r'''D.circle(c,p.x,p.y,6,'#e6b25e','#f3d79b')''')
E('jl-catch-sound', r'''if(this.caught%5===0)this.sound(650+this.caught*5,.045);''', r'''this.sound(560+Math.min(this.caught,40)*14,.035,'sine',.06);''')

# color-workshop: bilingual paint buttons, larger labels, no life cost for the white-ball button.
E('cw-tool-id', r'''{id:'reset',label:'還原白球'}''', r'''{id:'whiten',label:'還原白球'}''')
E('cw-whiten', r'''if(k==='reset'){this.colors=[0,0,0,0];this.mask.clear();this.moves=0;}''', r'''if(k==='whiten'){this.colors=[0,0,0,0];this.mask.clear();this.moves=0;}''')
E('cw-label', r'''label:'染'+n''', r'''label:'染'+n+' '+['coral','sky','gold','green'][i]''')
E('cw-text', r'''r>100?15:12''', r'''r>100?21:16''')

# little-engineer: a stuck run returns to the design view (free), fast forward, fewer parts = more points.
E('le-stuck-reset', r'''this.simT=0;}''', r'''this.simT=0;{const S=wq34S(this);S.bx=0;S.bt=0;S.ff=1;}}''')
E('le-stuck', r'''this.score=Math.max(this.score,Math.floor(Math.max(0,cargo.x-190)));''',
  r'''this.score=Math.max(this.score,Math.floor(Math.max(0,cargo.x-190)));{const S=wq34S(this);if(this.simT-(S.bt||0)>=6){if(cargo.x-(S.bx||0)<30){this.running=false;this.loadSim();this.toolbar();this.say('車架卡住了，已返回設計；保留車架，再調整一下。');this.sound(260,.18,'triangle',.1);return;}S.bx=cargo.x;S.bt=this.simT;}}''')
E('le-ff-tool', r'''{id:'run',label:this.running?'返回設計':'試行'}''',
  r'''{id:'run',label:this.running?'返回設計':'試行'},{id:'ff',label:wq34S(this).ff>1?'快轉 ×3 開':'快轉 ×3',active:wq34S(this).ff>1,disabled:!this.running}''')
E('le-ff', r'''tool(k){if(k==='run'){this.running=!this.running;''', r'''tool(k){if(k==='ff'){const S=wq34S(this);S.ff=S.ff===3?1:3;this.toolbar();return;}if(k==='run'){this.running=!this.running;''')
E('le-ff-acc', r'''this.acc=(this.acc||0)+dt;''', r'''this.acc=(this.acc||0)+dt*(wq34S(this).ff||1);''')
E('le-bonus', r'''if(cargo.x>700&&cargo.y<500){this.score+=300;''', r'''if(cargo.x>700&&cargo.y<500){this.score+=300+Math.max(0,7-this.design.length)*40;''')

# ---------------------------------------------------------------------------------------------
# s16: number-garden, color-orbit, honeycomb-puzzle, garden-paths, block-studio
# ---------------------------------------------------------------------------------------------
E('ng-target', r'''this.target=[512,1024,2048][this.d]''', r'''this.target=[256,512,1024][this.d]''')
E('ng-text', r'''可以繼續挑戰更大數字。''', r'''做得好！''')
E('ng-swipe', r'''if(Math.max(Math.abs(dx),Math.abs(dy))>20)''', r'''if(Math.max(Math.abs(dx),Math.abs(dy))>34)''')
E('ng-milestone', r'''if(next.score)this.sound(320+Math.min(700,next.score*3),.08);''',
  r'''if(next.score)this.sound(320+Math.min(700,next.score*3),.08);{const mx=Math.max(...this.board.flat()),S=wq34S(this);if(mx>(S.mx||0)){S.mx=mx;if(mx>=64){const W={64:'sixty-four',128:'one hundred twenty-eight',256:'two hundred fifty-six',512:'five hundred twelve',1024:'one thousand twenty-four',2048:'two thousand forty-eight'};this.say(mx+' = '+(mx/2)+' + '+(mx/2)+(W[mx]?' · '+W[mx]:''));this.sound(880,.2,'triangle',.12);}}}''')

E('co-ramp', r'''this.drop.r-=[56,81,111][this.d]*dt;''', r'''this.drop.r-=[56,81,111][this.d]*(1+Math.min(1.5,this.chain*.035))*dt;''')
E('co-smooth', r'''this.visualRot=this.rotation;''', r'''{const dd=((this.rotation-this.visualRot+9)%6)-3;this.visualRot=Math.abs(dd)<.01?this.rotation:(this.visualRot+dd*Math.min(1,dt*16)+6)%6;}''')
E('co-pointer', r'''class ColorOrbit extends WQGame{''', r'''class ColorOrbit extends WQGame{
 pointer(type,p){if(type==='down')this.act(p.x<400?'left':'right');}''')

E('hc-two-tap', r'''if(type==='down'){if(p.y>425){''',
  r'''if(type==='down'&&p.y<=425&&matchMedia('(pointer:coarse)').matches){const c0=this.closest(p),S=wq34S(this);if(c0&&!(S.armed&&this.hover&&this.hover.q===c0.q&&this.hover.r===c0.r)){this.hover=c0;S.armed=true;return;}S.armed=false;}if(type==='down'){if(p.y>425){''')
E('hc-clear-ghost', r'''this.stock[this.selected]=null;''', r'''this.stock[this.selected]=null;this.hover=null;''')
E('hc-fair-deal', r'''registerGame({id:'honeycomb-puzzle',''', r'''{const R0=HoneycombPuzzle.prototype.refill;HoneycombPuzzle.prototype.refill=function(){for(let k=0;k<8;k++){R0.call(this);let fit=0;for(const p of this.stock){if(!p)continue;let sh=p.shape,f=false;for(let t=0;t<6&&!f;t++){f=this.cells.some(cell=>WQCore.hexFit(sh,cell.q,cell.r,this.valid,this.occupied));sh=WQCore.hexRotate(sh);}if(f)fit++;}if(fit>=2)break;}};}
registerGame({id:'honeycomb-puzzle',''')

E('gp-d2', r"""this.swapped=false;this.tools([{id:'swap'""", r"""this.swapped=this.d===2;this.tools([{id:'swap'""")
E('gp-d2-place', r"""this.rot=0;this.swapped=false;return;}""", r"""this.rot=0;this.swapped=this.d===2;return;}""")
E('gp-d2-say', r"""if(this.swapped){this.say('每一塊路片只可交換一次。');return;}""", r"""if(this.swapped){this.say(this.d===2?'挑戰級沒有備用路片可以交換。':'每一塊路片只可交換一次。');return;}""")
E('gp-goal', r"""'讓路線多繞一點，再多繞一點'""", r"""'金線越長越好，別走出邊界'""")
# Look-ahead: dotted preview of where the golden route goes if the tile is placed now (draw only).
E('gp-look', r"""registerGame({id:'garden-paths',""", r"""{const D0=GardenPaths.prototype.draw;const look=g=>{const placed=new Map(g.placed);placed.set(WQCore.hexKey(g.pos.q,g.pos.r),WQCore.rotatePairs(g.tile,g.rot));const used=new Set(g.used),segs=[];let p={...g.pos},res='open';for(let n=0;n<250;n++){const key=WQCore.hexKey(p.q,p.r),tile=placed.get(key);if(!tile)break;const out=WQCore.pairExit(tile,p.entry),edge=key+':'+[p.entry,out].sort().join('-');if(used.has(edge)){res='loop';break;}used.add(edge);segs.push({q:p.q,r:p.r,entry:p.entry,out});const dir=WQCore.HEX_DIRS[out];p={q:p.q+dir[0],r:p.r+dir[1],entry:(out+3)%6};if(!g.valid.has(WQCore.hexKey(p.q,p.r))){res='exit';break;}}return{segs,res};};
GardenPaths.prototype.draw=function(){D0.call(this);if(this.done)return;const c=this.c,r=look(this),col=r.res==='open'?'#58a06f':'#d0604c';c.save();c.setLineDash([5,8]);for(const s of r.segs)this.curve(s.q,s.r,s.entry,s.out,col,4);c.restore();D.text(c,r.res==='exit'?'這樣放，金線會走出邊界':r.res==='loop'?'這樣放，金線會合成花環並結束':'這樣放，金線會繼續延長（綠色虛線）',400,540,15,col);};}
registerGame({id:'garden-paths',""")

E('bs-ramp', r"""-this.lines*.006""", r"""-this.lines*.015""")

# ---------------------------------------------------------------------------------------------
# s21: sky-rescue, forest-dash, sweet-studio
# ---------------------------------------------------------------------------------------------
E('sky-first', r"""this.spawn=1;this.items=[];""", r"""this.spawn=.9;this.items=[{x:400,y:229,kind:'bird',hit:false},{x:470,y:427,kind:'cloud',hit:false},{x:500,y:229,kind:'gem',hit:false}];""")
E('sky-corner', r"""*v*dt,104,491);""", r"""*v*dt,104,440);""")
E('sky-miss', r"""this.items=this.items.filter(o=>o.x>-90&&!o.hit);""", r"""for(const o of this.items)if(o.kind==='bird'&&!o.hit&&o.x<=-90)this.combo=0;this.items=this.items.filter(o=>o.x>-90&&!o.hit);""")
E('sky-pitch', r"""this.sound(o.kind==='bird'?840:1080,.07,'triangle');""", r"""this.sound((o.kind==='bird'?840:1080)*Math.pow(1.0595,Math.min(this.combo,12)),.07,'triangle');""")

E('dash-rows', r"""this.rows.push({z:1.15,lane,kind:this.r()<.5?'stump':'arch',checked:false});this.rows.push({z:1.15,lane:(lane+1)%3,kind:'gem',checked:false});""",
  r"""{const k=this.r()<.5?'stump':'arch';if(this.distance>350&&this.r()<.4){for(let l=0;l<3;l++)this.rows.push({z:1.15,lane:l,kind:k,checked:false});this.rows.push({z:1.6,lane:1,kind:'gem',checked:false});}else{this.rows.push({z:1.15,lane,kind:k,checked:false});this.rows.push({z:1.15,lane:(lane+1)%3,kind:'gem',checked:false});}}""")
E('dash-distance', r"""this.distance+=dt*[26,32,37][this.d];""", r"""this.distance+=dt*[26,32,37][this.d];this.score+=dt*[13,16,18.5][this.d];""")
E('dash-pitch', r"""this.gems++;this.combo++;this.score+=30+Math.min(10,this.combo)*2;this.sound(820,.05);""",
  r"""this.gems++;this.combo++;this.score+=30+Math.min(10,this.combo)*2;this.sound(820*Math.pow(1.0595,Math.min(this.combo,12)),.05);""")

E('sweet-taps', r"""pointer(type,p){if(type==='down'&&p.y>82&&p.y<278){""",
  r"""pointer(type,p){if(type==='down'){for(let i=0;i<4;i++)if(Math.hypot(p.x-(77+i*52),p.y-453)<30){this.tool('flavor'+i);return;}if(p.x>350&&p.x<455&&p.y>415&&p.y<525){this.tool('undo');return;}if(p.x>600&&p.x<710&&p.y>370&&p.y<510){this.tool('serve');return;}}if(type==='down'&&p.y>82&&p.y<278){""")
E('sweet-empty', r"""else if(k==='serve'){const o=this.orders[this.selected];""", r"""else if(k==='serve'){if(!this.cup.length){this.say('先加雪糕，再交給客人。');this.toolbar();return;}const o=this.orders[this.selected];""")
E('sweet-flavors', r"""this.flavors=['雲呢拿','草莓','抹茶','朱古力'];""", r"""this.flavors=['雲呢拿 vanilla','草莓 strawberry','抹茶 matcha','朱古力 chocolate'];""")

# ---------------------------------------------------------------------------------------------
# s22: ruins-courier, cloud-island, star-patrol, lighthouse-well, harbor-volley
# ---------------------------------------------------------------------------------------------
E('ruins-warmup', r"""const id=this.rowId++,pattern=id%6,lane=""", r"""const id=this.rowId++,pattern=id<2?9:id%6,lane=""")
E('ruins-hints', r"""next.kind===2?'↔ 找到缺口':'留意前方路線'""",
  r"""next.kind===2?'↔ 找到缺口':next.kind===3?'↑ 跳過裂縫，或換線':next.kind===4?'↔ 避開石牆，再跳過橫欄':next.kind===5?'↔ 走有露珠的一線，或↓滑過':'留意前方路線'""")
E('ruins-density', r"""this.nextAt+=82+this.r()*15;""", r"""this.nextAt+=70+this.r()*14;""")

E('cloud-keys', r"""this.dash=0;this.jumpHeld=false;this.keys.clear();this.camera=R2.clamp(this.p.x-180,0,this.mapEnd-760);""",
  r"""this.dash=0;this.jumpHeld=this.keys.has('up')||this.keys.has('action');this.camera=R2.clamp(this.p.x-180,0,this.mapEnd-760);""")
E('cloud-heal', r"""this.level++;this.build();this.inv=1.2;this.say('下一座雲島；生命不重置。');""",
  r"""this.level++;this.build();this.inv=1.2;this.health=Math.min(3,this.health+1);this.say('下一座雲島；回復一顆心。');""")
E('cloud-y', r"""const y=i%4===0?460:[440,408,445][i%3]""", r"""const y=i%4===0?460:[420,385,425][i%3]""")
E('cloud-goat', r"""draw(c,g.p.x,g.p.y-3,.62,pose(""", r"""draw(c,g.p.x,g.p.y-3,.78,pose(""")

E('star-kill', r"""R2.particles(this,hit.x,hit.y,'#8eedda');""", r"""R2.particles(this,hit.x,hit.y,'#8eedda');this.sound(520+Math.min(this.chain||0,20)*18,.06,'triangle',.06);""")
E('star-slow', r"""const speed=this.keys.has('hold')?120:300""", r"""const speed=this.keys.has('hold')||this.orbs.some(o=>Math.abs(o.x-this.p.x)<90&&Math.abs(o.y-this.p.y)<140)?150:300""")
E('star-boss-d0', r"""n=b.hp<b.max*.5?7:5;""", r"""n=(b.hp<b.max*.5?7:5)-(this.d===0?2:0);""")

E('well-grace', r"""['safe','moving','belt','crumble','spring','safe','hazard'][id%7]""", r"""(id<12&&id%7===6?'safe':['safe','moving','belt','crumble','spring','safe','hazard'][id%7])""")
E('well-label', r"""R2.text(c,'頂部警戒線',400,94,12,'#f1bea2')""", r"""R2.text(c,'頂部警戒線',400,94,16,'#f1bea2')""")
E('well-panda', r"""R2.pose(c,this.p.x,y-9,.61,'panda'""", r"""R2.pose(c,this.p.x,y-9,.78,'panda'""")

E('harbor-ai', r"""this.aiError=(this.r()-.5)*[65,35,15][this.d];""", r"""this.aiError=(this.r()-.5)*[65,35,15][this.d]*(1+Math.min(3,Math.max(0,this.rally-6)/6));""")
E('harbor-text', r"""'按 Space 發球'""", r"""'按「擊球」發球'""")


def _apply(s, items, once):
    for label, old, new in items:
        try:
            s = once(s, old, new)
        except ValueError as e:
            raise ValueError(f'p20 [{label}]: {e}') from None
    return s


def apply(s, ctx):
    s = _apply(s, HOST, ctx.once)
    s = _apply(s, ENGINES, ctx.once)
    return s
