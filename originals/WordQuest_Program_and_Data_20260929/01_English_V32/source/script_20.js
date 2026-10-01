
/* Original vector character/scenery drawing. Artwork is not a whole-screen mockup. */
(function(){
'use strict';
const art={};
art.grad=(c,x,y,r,light,dark)=>{const g=c.createRadialGradient(x-r*.3,y-r*.4,r*.08,x,y,r);g.addColorStop(0,light);g.addColorStop(1,dark);return g;};
art.panel=(c,x,y,w,h,color='#fff8e9')=>{c.save();c.shadowColor='#1c285f26';c.shadowBlur=16;c.shadowOffsetY=5;D.round(c,x,y,w,h,18,color);c.restore();D.round(c,x+2,y+2,w-4,h-4,16,null,'#ffffffaa');};
art.sky=(c,t=0,night=false)=>{
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.setLineDash([]);
 const g=c.createLinearGradient(0,0,0,560);g.addColorStop(0,night?'#273363':'#71c9f4');g.addColorStop(.6,night?'#746098':'#c7f2f5');g.addColorStop(1,night?'#dd92aa':'#fff0ce');c.fillStyle=g;c.fillRect(0,0,800,560);
 D.circle(c,658,86,43,night?'#ffedbf':'#fff6cc');D.circle(c,655,83,55,night?'#ffe5a51a':'#fffbdd38');
 for(let i=0;i<9;i++){const x=((i*197-t*(8+i%3*4))%1100+1100)%1100-150;art.cloud(c,x,72+(i*69)%310,.75+(i%3)*.4);}
 for(let i=0;i<4;i++){const x=((i*277-t*15)%1170+1170)%1170-150;art.island(c,x,378+(i%2)*80,.5+(i%3)*.2);}
};
art.cloud=(c,x,y,s=1)=>{c.save();c.translate(x,y);c.scale(s,s);D.ellipse(c,0,24,60,15,'#639cbe18');const g=c.createLinearGradient(0,-32,0,37);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#d2eafb');D.circle(c,-31,8,22,g);D.circle(c,-7,-3,33,g);D.circle(c,27,7,26,g);D.round(c,-50,9,107,29,17,g);D.ellipse(c,-15,-16,18,7,'#ffffffac');c.restore();};
art.island=(c,x,y,s)=>{c.save();c.translate(x,y);c.scale(s,s);D.poly(c,[{x:-80,y:0},{x:82,y:0},{x:29,y:90},{x:-9,y:117},{x:-52,y:57}],'#b78872');D.poly(c,[{x:5,y:2},{x:63,y:0},{x:18,y:91},{x:-9,y:114}],'#a57973');D.ellipse(c,0,1,84,26,'#70bd9b');D.ellipse(c,-7,-6,78,22,'#95d8a6');D.line(c,[{x:-36,y:29},{x:-16,y:78}],'#edb796',6);art.tree(c,-37,-12,.42);D.round(c,16,-47,38,40,6,'#fff3d1');D.poly(c,[{x:8,y:-45},{x:34,y:-65},{x:63,y:-45}],'#ee9a84');D.round(c,28,-30,13,22,4,'#758fc0');c.restore();};
art.tree=(c,x,y,s=1)=>{c.save();c.translate(x,y);c.scale(s,s);D.round(c,-12,-65,24,83,10,'#8f7058');D.line(c,[{x:1,y:-5},{x:-3,y:-56}],'#b8986e',4);for(const [a,b,r]of[[-28,-86,37],[28,-92,41],[0,-116,44],[3,-65,41]])D.circle(c,a,b,r,art.grad(c,a,b,r,'#8ce0a5','#3c987c'));D.ellipse(c,-18,-129,18,10,'#c3eab77a');c.restore();};
art.flower=(c,x,y,s,col='#f4a396')=>{for(let i=0;i<5;i++)D.circle(c,x+Math.cos(i*1.256)*s,y+Math.sin(i*1.256)*s,s*.7,col);D.circle(c,x,y,s*.55,'#fff0a9');};
art.gem=(c,x,y,s=1)=>{c.save();c.translate(x,y);c.scale(s,s);D.poly(c,[{x:0,y:-12},{x:10,y:-3},{x:8,y:8},{x:0,y:13},{x:-8,y:8},{x:-10,y:-3}],'#ffe08a','#bd843a',1.5);D.poly(c,[{x:0,y:-12},{x:0,y:12},{x:-8,y:8},{x:-10,y:-3}],'#fff3b0');c.restore();};
const oldbg=D.bg;
D.bg=function(c,type='garden'){
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.setLineDash([]);c.lineWidth=1;
 const p={garden:['#d4eddf','#fff3d9'],cream:['#fff3db','#ebd1b5'],rose:['#fce0e2','#f4c6b9'],blue:['#d1eaf7','#afcddd'],night:['#212941','#3a4c75']}[type]||['#d4eddf','#fff3d9'];
 const g=c.createLinearGradient(0,0,800,560);g.addColorStop(0,p[0]);g.addColorStop(1,p[1]);c.fillStyle=g;c.fillRect(0,0,800,560);
 for(let i=0;i<14;i++){const x=(i*137+27)%800,y=(i*91+38)%560;D.circle(c,x,y,35+i%4*16,type==='night'?'#9fbbdf08':'#ffffff22');}
 D.round(c,14,14,772,532,28,null,type==='night'?'#aecad21a':'#ffffff55');
};
D.animal=function(c,x,y,s=1,type='rabbit',accent='#738fbf',bob=0){
 c.save();c.translate(x,y+bob);c.scale(s,s);
 const fur=type==='fox'?['#ffc17d','#df8655']:type==='owl'?['#d3b090','#a27d67']:type==='cat'?['#c4dbe0','#8ab3b9']:type==='panda'?['#fff9ee','#dddbe1']:['#fff9eb','#e9ddcb'];
 const f=art.grad(c,0,-8,38,...fur),white='#fff9ea';
 D.ellipse(c,0,46,30,7,'#20325a24');
 if(type==='fox'){c.save();c.rotate(-.6);D.ellipse(c,31,27,25,13,fur[1]);D.ellipse(c,50,27,8,12,white);c.restore();}
 D.ellipse(c,0,22,25,28,f);D.ellipse(c,-19,42,13,7,fur[1]);D.ellipse(c,18,42,13,7,fur[1]);
 D.ellipse(c,-24,16,10,17,f);D.ellipse(c,24,17,10,17,f);
 D.round(c,-24,14,48,20,9,accent);D.line(c,[{x:-17,y:18},{x:17,y:18}],'#ffffff6b',2);D.circle(c,3,25,4,'#ffd88a');
 if(type==='rabbit')for(const a of[-15,15]){c.save();c.translate(a,-31);c.rotate(a<0?-.13:.15);D.ellipse(c,0,-22,11,29,f);D.ellipse(c,0,-24,5,20,'#eab8b4');c.restore();}
 else if(type==='panda'){D.circle(c,-23,-33,13,'#38405a');D.circle(c,23,-33,13,'#38405a');}
 else if(type!=='owl'){D.poly(c,[{x:-29,y:-15},{x:-28,y:-45},{x:-6,y:-30}],fur[1]);D.poly(c,[{x:29,y:-15},{x:28,y:-45},{x:6,y:-30}],fur[1]);D.poly(c,[{x:-24,y:-21},{x:-24,y:-36},{x:-13,y:-28}],'#ffc5b1');D.poly(c,[{x:24,y:-21},{x:24,y:-36},{x:13,y:-28}],'#ffc5b1');}
 D.ellipse(c,0,-9,33,30,f);
 if(type==='fox'){D.ellipse(c,-14,3,18,14,white);D.ellipse(c,14,3,18,14,white);}
 if(type==='panda'){D.ellipse(c,-13,-10,12,15,'#424557');D.ellipse(c,13,-10,12,15,'#424557');}
 if(type==='owl'){D.circle(c,-13,-10,17,white);D.circle(c,13,-10,17,white);}
 D.ellipse(c,-12,-10,7,10,'#4e393a');D.ellipse(c,12,-10,7,10,'#4e393a');
 for(const a of[-12,12]){D.circle(c,a-2,-14,2.8,'#fff');D.circle(c,a+2,-6,1.4,'#fff4d6');}
 D.ellipse(c,-24,5,5,3,'#eab3a899');D.ellipse(c,24,5,5,3,'#eab3a899');
 D.ellipse(c,0,0,4,3,'#9a6662');c.beginPath();c.moveTo(-7,8);c.quadraticCurveTo(0,17,7,8);c.strokeStyle='#8c6460';c.lineWidth=2;c.stroke();
 if(type==='fox'){D.line(c,[{x:-28,y:-28},{x:28,y:-28}],'#755c48',6);D.ellipse(c,-13,-30,12,9,'#6b7389');D.ellipse(c,13,-30,12,9,'#6b7389');D.ellipse(c,-14,-32,8,5,'#bce4f1');D.ellipse(c,12,-32,8,5,'#bce4f1');}
 c.restore();
};
art.plane=(c,x,y,s=1,lean=0,t=0,skin='classic')=>{
 c.save();c.translate(x,y);c.rotate(lean);c.scale(s,s);
 const color=skin==='moonlight'?'#918bcf':skin==='sunset'?'#f0aa66':'#ee826f';
 D.ellipse(c,-8,31,66,10,'#254a7130');
 D.poly(c,[{x:-48,y:5},{x:-77,y:-30},{x:-63,y:-32},{x:-28,y:1}],color,'#9c5f69',2);
 D.ellipse(c,-1,12,26,49,'#9b6069');D.ellipse(c,-2,7,24,47,color);D.ellipse(c,-5,0,16,39,'#fbc9a7');
 D.animal(c,-5,-20,.53,'fox','#538c9e');
 D.ellipse(c,-5,0,48,20,art.grad(c,-5,0,50,'#ffcba2',color));
 D.ellipse(c,38,1,20,20,'#faf0ce');D.ellipse(c,48,1,11,16,'#45657c');
 D.round(c,-33,-17,45,7,3,'#ffe4b9');D.line(c,[{x:55,y:-25},{x:55,y:27}],'#8cc5d85c',6);
 c.save();c.translate(56,0);c.scale(1,Math.cos(t*36)*.75+.3);D.ellipse(c,0,0,4,33,'#f7e8b7');c.restore();D.circle(c,56,0,5,'#d0a26c');
 D.circle(c,-13,9,7,'#fff0cf');D.circle(c,-13,9,3,'#e89663');c.restore();
};
art.heart=(c,x,y,on)=>{c.save();c.translate(x,y);c.beginPath();c.moveTo(0,9);c.bezierCurveTo(-22,-4,-12,-18,0,-8);c.bezierCurveTo(12,-18,22,-4,0,9);c.fillStyle=on?'#f68b97':'#cfcbdd';c.fill();c.restore();};
art.hud=(c,health,title,sub)=>{art.panel(c,24,20,222,48,'#ffffffd9');for(let i=0;i<3;i++)art.heart(c,50+i*32,45,i<health);D.text(c,title,226,43,17,'#34426a','right',800);if(sub)D.text(c,sub,775,42,16,'#273b64','right');};
art.scoop=(c,x,y,r,color)=>{D.circle(c,x,y,r,art.grad(c,x,y,r,'#fff7ed',color));D.ellipse(c,x-r*.23,y-r*.45,r*.47,r*.17,'#fff7ed99');for(let i=0;i<6;i++)D.circle(c,x+Math.cos(i*1.8)*r*.72,y+r*.55+(i%2)*2,r*.18,color);};
globalThis.WQArcadeArt=art;
})();

