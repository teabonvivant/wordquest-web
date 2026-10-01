
'use strict';
const D={
 palette:['#eebf66','#76ab93','#df947d','#86afc6','#ac9ac4','#e2bb91'],
 round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,Math.max(0,w),Math.max(0,h),Math.max(0,Math.min(r,w/2,h/2)));if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},
 circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,Math.max(0,r),0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},
 ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();},
 line(c,points,color,width=2,dash=[]){if(!points.length)return;c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);},
 poly(c,points,fill,stroke,width=1){if(!points.length)return;c.beginPath();c.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}},
 text(c,t,x,y,size=18,color='#304d40',align='center',weight=600){c.fillStyle=color;c.font=`${weight} ${size}px "Noto Sans TC","Noto Sans CJK TC", "Microsoft JhengHei", system-ui, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(t),x,y);},
 hex(c,x,y,r,fill,stroke='#ffffff80',width=2){const pts=Array.from({length:6},(_,i)=>({x:x+Math.cos(Math.PI/6+i*Math.PI/3)*r,y:y+Math.sin(Math.PI/6+i*Math.PI/3)*r}));this.poly(c,pts,fill,stroke,width);},
 star(c,x,y,r=12,fill='#efc76e'){const pts=Array.from({length:10},(_,i)=>({x:x+Math.cos(i*Math.PI/5-Math.PI/2)*r*(i%2?.45:1),y:y+Math.sin(i*Math.PI/5-Math.PI/2)*r*(i%2?.45:1)}));this.poly(c,pts,fill);},
 bg(c,type='garden'){c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.lineWidth=1;c.setLineDash([]);let a='#edf2df',b='#e3eccd';if(type==='night'){a='#233f47';b='#314e57';}if(type==='cream'){a='#faf3e3';b='#eee4cf';}if(type==='rose'){a='#f4e3d8';b='#efcfbd';}if(type==='blue'){a='#dcebef';b='#c4dbe0';}const g=c.createLinearGradient(0,0,0,560);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,0,800,560);for(let x=22;x<800;x+=40)for(let y=20;y<560;y+=40)this.circle(c,x,y,1,type==='night'?'#f3e8c91a':'#68815410');},
 cloud(c,x,y,s=1,color='#fffcf0'){c.save();c.translate(x,y);c.scale(s,s);this.circle(c,-25,5,17,color);this.circle(c,0,-5,25,color);this.circle(c,29,7,16,color);this.round(c,-39,3,82,21,10,color);c.restore();},
 hills(c,y=430){c.fillStyle='#b1c791';c.beginPath();c.moveTo(0,560);c.lineTo(0,y);c.quadraticCurveTo(180,y-150,360,y);c.quadraticCurveTo(650,y-110,800,y+5);c.lineTo(800,560);c.fill();c.fillStyle='#9eb783';c.beginPath();c.moveTo(0,560);c.lineTo(0,y+60);c.quadraticCurveTo(430,y-50,800,y+100);c.lineTo(800,560);c.fill();},
 animal(c,x,y,s=1,type='rabbit',accent='#578569',bob=0){c.save();c.translate(x,y+bob);c.scale(s,s);const fur=type==='fox'?'#d69d72':type==='owl'?'#bca88a':type==='cat'?'#cad1b4':'#faf1df';this.ellipse(c,0,43,30,7,'#2947371c');this.ellipse(c,0,17,25,30,fur);if(type==='rabbit'){this.ellipse(c,-13,-42,9,24,fur);this.ellipse(c,13,-42,9,24,fur);this.ellipse(c,-13,-42,4,16,'#e6b4a8');this.ellipse(c,13,-42,4,16,'#e6b4a8');}else if(type==='fox'||type==='cat'){this.poly(c,[{x:-27,y:-13},{x:-22,y:-47},{x:-3,y:-28}],fur);this.poly(c,[{x:27,y:-13},{x:22,y:-47},{x:3,y:-28}],fur);}this.circle(c,0,-10,28,fur);if(type==='fox'){this.ellipse(c,0,0,20,14,'#fff0d6');}if(type==='owl'){this.circle(c,-11,-13,13,'#f8efdc');this.circle(c,11,-13,13,'#f8efdc');}this.circle(c,-10,-13,2.8,'#30483d');this.circle(c,10,-13,2.8,'#30483d');this.ellipse(c,0,-3,3,2.3,'#b78372');this.line(c,[{x:-5,y:3},{x:0,y:6},{x:5,y:3}],'#796759',1.5);this.ellipse(c,-20,-2,4,2.5,'#e5af9b');this.ellipse(c,20,-2,4,2.5,'#e5af9b');this.round(c,-23,17,46,13,6,accent);this.circle(c,0,23,3,'#f3d38a');this.ellipse(c,-17,40,12,5,fur);this.ellipse(c,17,40,12,5,fur);c.restore();},
 car(c,x,y,angle=0,s=1,col='#db9272'){c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);this.round(c,-22,-19,13,9,3,'#3f564a');this.round(c,10,-19,13,9,3,'#3f564a');this.round(c,-22,10,13,9,3,'#3f564a');this.round(c,10,10,13,9,3,'#3f564a');this.round(c,-30,-15,60,30,12,col);this.round(c,-5,-11,20,22,6,'#eaf3df');this.round(c,23,-10,4,6,2,'#ffedb2');this.round(c,23,4,4,6,2,'#ffedb2');c.restore();},
 cup(c,x,y,w=92,h=75,fill=0,color='#dda367'){this.poly(c,[{x:x-w/2,y},{x:x+w/2,y},{x:x+w/2-12,y:y+h},{x:x-w/2+12,y:y+h}],'#fff8e1','#c3b99b',2);if(fill>0){const hh=(h-8)*Math.min(1,fill);this.round(c,x-w/2+14,y+h-hh-4,w-28,hh,4,color);}this.line(c,[{x:x-w/2,y},{x:x+w/2,y}],'#e2d9be',5);},
 badge(c,text,x=400,y=40,fill='#fffdf0',color='#365d49'){const w=Math.max(85,text.length*15+28);this.round(c,x-w/2,y-18,w,36,12,fill);this.text(c,text,x,y,14,color);},
 message(c,text){this.round(c,150,474,500,49,16,'#fffef3e8');this.text(c,text,400,499,16,'#3b5f49');}
};
class WQGame{
 constructor(api){this.api=api;this.c=api.ctx;this.d=api.difficulty||0;this.preview=!!api.preview;this.meta=api.meta;this.r=WQCore.rng(api.seed||1247);this.t=0;this.score=0;this.level=1;this.keys=new Set();this.done=false;this.notice='';this.noticeTime=0;this.stat='第 1 關';}
 tick(dt){if(this.done)return;this.t+=dt;this.noticeTime=Math.max(0,this.noticeTime-dt);this.update(dt);}
 update(){}draw(){}act(){}tool(){}pointer(){}
 key(k,on){if(on){this.keys.add(k);this.act(k);}else this.keys.delete(k);}
 tools(items){if(!this.preview)this.api.tools(items.map(i=>typeof i==='string'?{id:i,label:i}:i));}
 hint(t){if(!this.preview)this.api.hint(t);}
 say(t){this.notice=t;this.noticeTime=2.3;if(!this.preview)this.api.announce(t);}
 sound(f=660,d=.08,wave='sine',v=.1){if(!this.preview)this.api.tone(f,d,wave,v);}
 end(text,title='這局完成了'){if(this.done)return;this.done=true;this._wqNext=false;if(!this.preview)this.api.complete({title,text});}
 next(text,fn){if(this.done)return;this.done=true;this._wqNext=true;if(!this.preview)this.api.complete({title:'完成了！',text,next:()=>{this.done=false;fn();}});}
 noticeDraw(){if(this.noticeTime>0)D.message(this.c,this.notice);}
}
const WQGames=[];
function registerGame(meta,Class){
 WQGames.push({...meta,Class});
 if(typeof WQGameSchema!=='undefined'){
 const sample=new Class({meta,ctx:null,seed:123,difficulty:1,preview:true,tools(){},hint(){},announce(){},tone(){},clock(){return 0},instrument(){},complete(){},getData(){return null},putData(){},downloadJSON(){},importJSON(){}});
 WQGameSchema.register(meta.id,sample,(globalThis.WQStateFields||{})[meta.id]||[]);
 }
}

