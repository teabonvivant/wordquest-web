
/* Three original non-violent flagship engines, with keyboard and touch actions. */
'use strict';
const A28=globalThis.WQArcadeArt;
class SkyRescue28 extends WQGame {
 constructor(api){super(api);this.p={x:180,y:290};this.health=3;this.invincible=0;this.shield=0;this.energy=0;this.distance=0;this.rescued=0;this.combo=0;this.spawn=1;this.items=[];this.sparks=[];this.scene=0;this.skin='classic';this.tools([]);this.hint('方向鍵／WASD 飛行，Space 展開護盾。接近小鳥完成救援；寶石只計分，不會增加入場金幣。');}
 act(k){if(k==='action'&&this.energy>=5){this.energy=0;this.shield=3;this.sound(780,.18,'triangle');this.say('護盾展開！');}}
 update(dt){const v=[245,275,300][this.d];this.p.x=WQCore.clamp(this.p.x+((this.keys.has('right')?1:0)-(this.keys.has('left')?1:0))*v*dt,74,660);this.p.y=WQCore.clamp(this.p.y+((this.keys.has('down')?1:0)-(this.keys.has('up')?1:0))*v*dt,104,491);
 this.invincible=Math.max(0,this.invincible-dt);this.shield=Math.max(0,this.shield-dt);this.distance+=dt*33;this.scene=Math.floor(this.rescued/4)%3;this.spawn-=dt;
 if(this.spawn<=0){this.spawn=[1.7,1.45,1.25][this.d];const lane=130+Math.floor(this.r()*4)*99;this.items.push({x:860,y:lane,kind:'bird',hit:false});this.items.push({x:940,y:130+((Math.round((lane-130)/99)+2)%4)*99,kind:'cloud',hit:false});this.items.push({x:960,y:lane,kind:'gem',hit:false});}
 for(const o of this.items){o.x-=([148,174,194][this.d]+Math.min(44,this.rescued*2))*dt;
 if(o.hit||Math.hypot((o.x-this.p.x)*.9,o.y-this.p.y)> (o.kind==='cloud'?49:45))continue;
 o.hit=true;
 if(o.kind==='cloud'){if(this.shield>0){this.score+=10;this.sound(330,.08);}else if(this.invincible<=0){this.health--;this.invincible=1.8;this.combo=0;this.sound(190,.12,'sine');if(this.health<=0){this.end(`救援 ${this.rescued} 隻小鳥；下次留意前方風雲。`,'飛行任務結束');return;}}}
 else{this.combo++;this.energy=Math.min(5,this.energy+1);this.score+=o.kind==='bird'?100+Math.min(this.combo,10)*5:20;if(o.kind==='bird')this.rescued++;this.sound(o.kind==='bird'?840:1080,.07,'triangle');for(let i=0;i<5;i++)this.sparks.push({x:o.x,y:o.y,vx:(this.r()-.5)*100,vy:(this.r()-.5)*100,life:.55});if(this.rescued>=12){this.end('12 隻小鳥都回到安全的雲海小島。','救援任務完成');return;}}}
 this.items=this.items.filter(o=>o.x>-90&&!o.hit);this.sparks=this.sparks.filter(o=>(o.life-=dt)>0);for(const s of this.sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;}this.stat=`救援 ${this.rescued} / 12 · 護盾能量 ${this.energy}/5`;
 }
 draw(){const c=this.c;A28.sky(c,this.t,this.scene===2);for(let i=0;i<3;i++){const x=((i*325-this.t*47)%1100+1100)%1100-140;A28.cloud(c,x,526,1.9);}
 for(const o of this.items){if(o.kind==='cloud'){c.save();c.translate(o.x,o.y);D.ellipse(c,0,16,45,15,'#66709b');D.circle(c,-20,0,26,'#8f9bb7');D.circle(c,9,-9,34,'#9ca6bb');D.circle(c,33,5,24,'#8490ac');D.line(c,[{x:-24,y:31},{x:6,y:33},{x:30,y:27}],'#b9c6d5',4);c.restore();}else if(o.kind==='bird'){c.save();c.translate(o.x,o.y);D.ellipse(c,0,18,19,5,'#33537723');D.ellipse(c,0,0,19,14,'#ffe68e');D.circle(c,13,-7,11,'#fff0b0');D.ellipse(c,-6,-7+Math.sin(this.t*13)*6,16,8,'#edb267');D.poly(c,[{x:23,y:-7},{x:34,y:-4},{x:23,y:0}],'#e4a371');D.circle(c,15,-10,2.6,'#44455e');c.restore();}else A28.gem(c,o.x,o.y,1.3);}
 if(this.shield>0){D.circle(c,this.p.x,this.p.y,66,'#c8ecff3b','#f4fcffc9');D.circle(c,this.p.x,this.p.y,70,null,'#90dce878');}
 c.globalAlpha=this.invincible>0&&Math.floor(this.t*10)%2?.48:1;A28.plane(c,this.p.x,this.p.y,1.05,((this.keys.has('down')?1:0)-(this.keys.has('up')?1:0))*.17,this.t,this.skin);c.globalAlpha=1;
 for(const s of this.sparks){c.globalAlpha=s.life/.55;D.circle(c,s.x,s.y,4,'#fff8c0');}c.globalAlpha=1;
 A28.hud(c,this.health,'天空救援隊',`${this.rescued} / 12 小鳥回家`);A28.panel(c,27,494,208,44,'#ffffffdb');D.text(c,'SPACE',66,516,12,'#52638a');for(let i=0;i<5;i++)D.round(c,105+i*22,507,16,18,5,i<this.energy?'#efb264':'#c5d6e1');this.noticeDraw();
 }
}
class ForestDash28 extends WQGame {
 constructor(api){super(api);this.lane=1;this.visualLane=1;this.jump=0;this.jumpV=0;this.slide=0;this.health=3;this.invincible=0;this.rows=[];this.spawn=.8;this.distance=0;this.gems=0;this.combo=0;this.skin='classic';this.tools([]);this.hint('← →／A D 換路，↑／W／Space 跳躍，↓／S 滑行。木樁要跳過，花拱要滑過；三格生命，沒有倒數。');}
 act(k){if(k==='left')this.lane=Math.max(0,this.lane-1);if(k==='right')this.lane=Math.min(2,this.lane+1);if((k==='up'||k==='action')&&this.jump===0){this.jumpV=460;this.slide=0;this.sound(420,.05);}if(k==='down'&&this.jump===0)this.slide=.7;}
 update(dt){this.visualLane+=(this.lane-this.visualLane)*Math.min(1,dt*16);this.invincible=Math.max(0,this.invincible-dt);this.slide=Math.max(0,this.slide-dt);if(this.jump>0||this.jumpV>0){this.jumpV-=1100*dt;this.jump=Math.max(0,this.jump+this.jumpV*dt);if(this.jump===0)this.jumpV=0;}
 this.distance+=dt*[26,32,37][this.d];this.spawn-=dt;
 if(this.spawn<=0){this.spawn=[1.6,1.35,1.18][this.d];const lane=Math.floor(this.r()*3);this.rows.push({z:1.15,lane,kind:this.r()<.5?'stump':'arch',checked:false});this.rows.push({z:1.15,lane:(lane+1)%3,kind:'gem',checked:false});}
 for(const o of this.rows){o.z-=dt*([.27,.31,.35][this.d]+Math.min(.04,this.distance/14000));if(!o.checked&&o.z<.075){o.checked=true;if(o.lane===this.lane){if(o.kind==='gem'){this.gems++;this.combo++;this.score+=30+Math.min(10,this.combo)*2;this.sound(820,.05);}else if((o.kind==='stump'&&this.jump<36||o.kind==='arch'&&(this.slide===0||this.jump>0))&&this.invincible===0){this.health--;this.invincible=1.8;this.combo=0;this.sound(185,.09);if(this.health<=0){this.end(`走過 ${Math.floor(this.distance)} 米；收集 ${this.gems} 顆露珠。`,'森林旅程結束');return;}}}}}
 this.rows=this.rows.filter(o=>o.z>-.12);if(this.distance>=1500){this.end('已穿過三個森林路段，送達樹屋驛站。','森林郵差完成');return;}this.stat=`${Math.floor(this.distance)} / 1500 米 · 露珠 ${this.gems}`;
 }
 point(lane,z){const f=Math.max(0,1-z);return{x:400+(lane-1)*224*f,y:176+f*f*315,s:.15+f*.95};}
 draw(){const c=this.c;const night=this.distance>1000;A28.sky(c,this.t*.2,night);D.poly(c,[{x:327,y:170},{x:473,y:170},{x:786,y:560},{x:12,y:560}],'#d6b692');D.poly(c,[{x:337,y:171},{x:463,y:171},{x:739,y:560},{x:60,y:560}],'#f1d3a2');
 for(let i=0;i<17;i++){const z=((i/17+this.distance/1200)%1),f=z*z;const y=172+f*385,w=73+f*670;D.line(c,[{x:400-w/2,y},{x:400+w/2,y}],'#c7987466',1+f*3);}
 for(const lane of [.5,1.5]){D.line(c,[{x:400+(lane-1)*54,y:173},{x:400+(lane-1)*448,y:560}],'#ffffff55',3);}
 for(let i=0;i<8;i++){const z=((i/8+this.distance/2200)%1);const f=.15+z*z;A28.tree(c,350-z*420,174+z*z*470,.13+z*1.2);A28.tree(c,450+z*430,174+z*z*470,.16+z*1.2);}
 for(const o of [...this.rows].sort((a,b)=>b.z-a.z)){const p=this.point(o.lane,o.z);c.save();c.translate(p.x,p.y);c.scale(p.s,p.s);if(o.kind==='gem'){A28.gem(c,0,-22,1.7);}else if(o.kind==='stump'){D.round(c,-34,-47,68,54,10,'#b87f57');D.ellipse(c,0,-46,34,12,'#f6ce8e');D.ellipse(c,0,-46,21,7,'#ddb075');D.line(c,[{x:-20,y:-21},{x:-16,y:-4}],'#e5b77f',4);}else{D.round(c,-47,-111,15,125,6,'#88a890');D.round(c,32,-111,15,125,6,'#88a890');D.round(c,-51,-92,102,33,10,'#70b28e');for(let i=0;i<4;i++)A28.flower(c,-35+i*23,-75,7,i%2?'#f8d284':'#efaab1');}c.restore();}
 const x=400+(this.visualLane-1)*224;D.ellipse(c,x,504,37,10,'#7d64452e');c.save();c.globalAlpha=this.invincible>0&&Math.floor(this.t*9)%2?.4:1;c.translate(x,449-this.jump);if(this.slide>0){c.translate(0,25);c.scale(1.2,.57);}D.animal(c,0,Math.sin(this.t*15)*(this.jump?0:2),1.18,'rabbit',this.skin==='moonlight'?'#777ab6':this.skin==='sunset'?'#e8a677':'#668fac');c.restore();
 A28.hud(c,this.health,'森林跑酷',`${Math.floor(this.distance)} / 1500 米`);this.noticeDraw();
 }
}
class SweetStudio28 extends WQGame {
 constructor(api){super(api);this.flavors=['雲呢拿','草莓','抹茶','朱古力'];this.cols=['#ffe4a2','#f69fa9','#a7cc91','#c5987f'];this.tops=['彩糖','藍莓','餅乾'];this.names=['月月','棉棉','飛飛'];this.orders=[];this.cup=[];this.topping=0;this.selected=0;this.served=0;this.health=3;this.combo=0;this.skin='classic';this.makeOrders();this.toolbar();this.hint('1–4 加雪糕；Q／E 切換配料；← → 選客人；Backspace 退一步；Space 交杯。做錯才扣生命，客人不會因時間離開。');}
 makeOrders(){while(this.orders.length<3){const n=this.d===2?3:2;this.orders.push({recipe:Array.from({length:n},()=>Math.floor(this.r()*4)),top:Math.floor(this.r()*3),animal:['rabbit','panda','fox'][Math.floor(this.r()*3)]});}}
 toolbar(){this.tools([...this.flavors.map((f,i)=>({id:'flavor'+i,label:(i+1)+' '+f})),...this.tops.map((t,i)=>({id:'topping'+i,label:t,active:this.topping===i})),{id:'undo',label:'退一步'},{id:'clear',label:'清空杯子'},{id:'serve',label:'交給客人'}]);}
 act(k){if(k==='left'){this.selected=(this.selected+2)%3;this.toolbar();}if(k==='right'){this.selected=(this.selected+1)%3;this.toolbar();}if(k==='action')this.tool('serve');if(k==='undo')this.tool('undo');if(/^digit[1-4]$/.test(k))this.tool('flavor'+(Number(k.slice(-1))-1));if(k==='q')this.tool('topping'+((this.topping+2)%3));if(k==='e')this.tool('topping'+((this.topping+1)%3));}
 tool(k){if(this.done)return;if(/^flavor[0-3]$/.test(k)){if(this.cup.length<3){this.cup.push(Number(k.at(-1)));this.sound(480+this.cup.length*120,.04);}}else if(/^topping[0-2]$/.test(k))this.topping=Number(k.at(-1));else if(k==='undo')this.cup.pop();else if(k==='clear')this.cup=[];else if(k==='serve'){const o=this.orders[this.selected];if(this.cup.length===o.recipe.length&&this.cup.every((n,i)=>n===o.recipe[i])&&this.topping===o.top){this.served++;this.combo++;this.score+=100+this.combo*10;this.say(`第 ${this.served} 杯完成！`);this.sound(880,.1,'triangle');this.orders.splice(this.selected,1);this.makeOrders();this.cup=[];if(this.served>=6+this.d*2){this.end(`${this.served} 杯甜點完成，謝謝你的細心。`,'甜點工場收工');return;}}else{this.health--;this.combo=0;this.say('這杯與訂單不同，留意由下至上的口味。');this.sound(230,.08);if(this.health<=0){this.end(`完成 ${this.served} 杯；下次先看訂單，再交給客人。`,'這次營業結束');return;}}}this.toolbar();}
 pointer(type,p){if(type==='down'&&p.y>82&&p.y<278){const i=Math.floor((p.x-44)/240);if(i>=0&&i<3){this.selected=i;this.toolbar();}}}
 update(){this.stat=`完成 ${this.served} / ${6+this.d*2} 杯 · 連續 ${this.combo} 杯`;}
 draw(){const c=this.c;D.bg(c,this.skin==='moonlight'?'night':this.skin==='sunset'?'rose':'cream');D.round(c,28,64,744,297,21,'#fff1dce5');for(let i=0;i<11;i++){D.round(c,28+i*68,64,68,37,8,i%2?'#ffddbd':this.skin==='moonlight'?'#b4afd6':this.skin==='sunset'?'#eaa2a5':'#a2c9b9');D.ellipse(c,62+i*68,99,34,13,i%2?'#ffddbd':this.skin==='moonlight'?'#b4afd6':this.skin==='sunset'?'#eaa2a5':'#a2c9b9');}
 for(let i=0;i<3;i++){const x=49+i*240,o=this.orders[i];A28.panel(c,x,130,221,115,i===this.selected?'#fffbef':'#ffffffb8');D.round(c,x,130,221,115,18,null,i===this.selected?'#d09251':'#edd0cb');D.text(c,'客人 '+(i+1)+(i===this.selected?' · 正在製作':''),x+110,152,16,'#77526b');o.recipe.forEach((f,j)=>{A28.scoop(c,x+57+j*48,192,18,this.cols[f]);D.text(c,j+1,x+57+j*48,221,12,'#754e63');});D.text(c,this.tops[o.top],x+181,197,15,'#78516b');D.animal(c,x+112,308,.72,o.animal,['#ad9bcb','#729fa8','#e8ac73'][i],Math.sin(this.t*2+i)*2);}
 D.round(c,10,359,780,188,22,'#dbaa82');D.round(c,10,350,780,41,12,'#ffe9c6');D.line(c,[{x:31,y:390},{x:769,y:390}],'#c68f73',4);
 D.round(c,41,408,229,109,15,'#f7daba');for(let i=0;i<4;i++){const x=77+i*52;A28.scoop(c,x,453,22,this.cols[i]);D.text(c,i+1,x,492,17,'#674e63');}
 D.ellipse(c,403,523,77,10,'#825b4930');D.poly(c,[{x:355,y:457},{x:451,y:457},{x:433,y:524},{x:373,y:524}],'#fff9e7','#deaa7b',2);D.round(c,377,487,53,20,8,'#eeb7b1');D.text(c,'WQ',403,498,12,'#935f6d');this.cup.forEach((f,i)=>A28.scoop(c,403+(i%2?10:-6),452-i*37,30,this.cols[f]));if(this.cup.length){const y=424-(this.cup.length-1)*37;for(let i=0;i<5;i++)D.circle(c,382+i*10,y+(i%2)*4,3,this.topping===0?D.palette[i]:this.topping===1?'#879fc5':'#ae805b');}
 D.animal(c,653,457,1.07,'panda','#9175b0');D.round(c,621,381,65,28,10,'#fff9ed');D.circle(c,633,379,14,'#fffaf0');D.circle(c,654,371,18,'#fffaf0');D.circle(c,676,379,14,'#fffaf0');
 A28.hud(c,this.health,'甜點工場',`${this.served} / ${6+this.d*2} 杯`);this.noticeDraw();
 }
}
const A28Flagships=[
 {id:'sky-rescue',name:'天空救援隊',en:'SKY RESCUE',category:'動作',tag:'雲海飛行',desc:'駕駛小狐狸的雙翼機，把迷路小鳥送回雲海。',guide:'方向鍵或 WASD 飛行，Space 使用護盾。每局三格生命，救援十二隻小鳥完成任務。每救援／收集五次可使用護盾。沒有武器或射擊；收集物只加分。',keys:[['left','←'],['up','↑'],['down','↓'],['right','→'],['action','護盾']],Class:SkyRescue28},
 {id:'forest-dash',name:'極速森林跑酷',en:'FOREST DASH',category:'動作',tag:'三線冒險',desc:'跳過木樁、滑過花拱，穿越陽光與月夜森林。',guide:'← →／A D 換路，↑／W／Space 跳躍，↓／S 滑行。三格生命，完成一千五百米路線即完成一局；露珠只加分，沒有倒數。',keys:[['left','←'],['right','→'],['up','跳躍'],['down','滑行']],Class:ForestDash28},
 {id:'sweet-studio',name:'甜點夢工場',en:'SWEET STUDIO',category:'創作',tag:'無倒數經營',desc:'替動物朋友製作分層雪糕，收集完美訂單。',guide:'數字1至4選口味，Q／E改配料，← →換客人，Backspace退一步，Space交杯。只有交錯訂單才扣一格生命；沒有等候倒數。完成六至十張訂單結束一局。',keys:[['left','上一位'],['right','下一位'],['undo','退一步'],['action','交杯']],Class:SweetStudio28}
];
for(const m of A28Flagships){WQGames.push(m);WQArcade28.ids.includes(m.id);WQGameSchema.register(m.id,new m.Class({meta:m,ctx:null,seed:23,difficulty:1,preview:true,tools(){},hint(){},announce(){},tone(){},clock(){return 0},instrument(){},complete(){}}));}
globalThis.WQFlagship28=A28Flagships;

