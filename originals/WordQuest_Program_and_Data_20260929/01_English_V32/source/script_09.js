
/* V23: per-engine checkpoint contracts. This is validation, not anti-cheat.
   A broken game is isolated; no callbacks, methods, prototypes, NaN or live audio clocks are restored. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.WQGameSchema=f();})(globalThis,function(){
'use strict';
const templates=Object.create(null);
function ok(v,m){if(!v)throw Error('遊戲存檔格式：'+m);}
function num(v,a=-1e12,b=1e12){ok(Number.isFinite(v)&&v>=a&&v<=b,'數值超出範圍');}
function integer(v,a=0,b=1e9){num(v,a,b);ok(Number.isInteger(v),'整數');}
function obj(v){ok(v&&typeof v==='object'&&!Array.isArray(v),'物件');}
function arr(v,min=0,max=5000){ok(Array.isArray(v)&&v.length>=min&&v.length<=max,'陣列長度');return v;}
function xy(v){obj(v);num(v.x);num(v.y);}
function velocity(v){xy(v);num(v.vx);num(v.vy);}
function optBool(v,k){if(v[k]!==undefined)ok(typeof v[k]==='boolean',k+' 布林值');}
function matrix(v,rows,cols,pred=Number.isFinite){arr(v,rows,rows).forEach(r=>arr(r,cols,cols).forEach(x=>ok(pred(x),'棋盤值')));}
function pairs(v){arr(v,3,3).forEach(p=>arr(p,2,2).forEach(n=>integer(n,0,5)));ok(new Set(v.flat()).size===6,'六端口配對');}
function piece(v){arr(v,1,4);const n=arr(v[0],1,4).length;v.forEach(r=>arr(r,n,n).forEach(x=>ok(x===0||x===1,'方塊值')));ok(v.flat().filter(Boolean).length===4,'四格積木');}
function scan(v,key='',depth=0){ok(depth<26,'深度');if(typeof v==='number'){if(key==='ghostBest'&&v===Infinity)return;num(v);return;}if(typeof v==='string'){ok(v.length<=2000,'字串長度');return;}if(v==null||typeof v==='boolean')return;if(v instanceof Set){ok(v.size<=5000,'集合');for(const x of v)scan(x,'',depth+1);return;}if(v instanceof Map){ok(v.size<=5000,'映射');for(const[k,x]of v){scan(k,'',depth+1);scan(x,'',depth+1);}return;}if(Array.isArray(v)){arr(v,0,10000).forEach(x=>scan(x,'',depth+1));return;}obj(v);for(const[k,x]of Object.entries(v)){ok(!['__proto__','constructor','prototype'].includes(k),'保留鍵');scan(x,k,depth+1);}}
// Required fields are generated from the actual constructors by registerGame.
function register(id,sample,optional=[]){const props=Object.create(null);for(const[k,v]of Object.entries(sample)){if(['api','c','r','meta','keys','preview'].includes(k))continue;props[k]=v===null?'nullable':v instanceof Set?'set':v instanceof Map?'map':Array.isArray(v)?'array':typeof v;}templates[id]={props,optional:new Set(['_wqNext',...optional])};}
function validate(id,s,d){const template=templates[id];ok(template,'未登記遊戲');obj(s);scan(s);for(const[k,kind]of Object.entries(template.props)){ok(Object.hasOwn(s,k),'缺少 '+k);const v=s[k];if(kind==='nullable')continue;ok(kind==='array'?Array.isArray(v):kind==='set'?v instanceof Set:kind==='map'?v instanceof Map:typeof v===kind,k+' 類型');}
 for(const k of Object.keys(s))ok(Object.hasOwn(template.props,k)||template.optional.has(k),'未預期欄位 '+k);
 integer(s.d,0,2);ok(s.d===d,'難度與存檔不一致');num(s.t,0);num(s.score,0,1e15);integer(s.level,1,10000);ok(typeof s.done==='boolean','完成狀態');
 switch(id){
 case 'sky-rescue':xy(s.p);integer(s.health,0,3);num(s.invincible,0,3);num(s.shield,0,4);integer(s.energy,0,5);num(s.distance,0);integer(s.rescued,0,12);integer(s.combo);integer(s.scene,0,2);num(s.spawn,-1,3);ok(['classic','sunset','moonlight'].includes(s.skin),'飛機塗裝');arr(s.items,0,120).forEach(o=>{xy(o);ok(['bird','cloud','gem'].includes(o.kind),'飛行物件');ok(typeof o.hit==='boolean','碰撞記錄');});arr(s.sparks,0,80).forEach(o=>{velocity(o);num(o.life,0,1);});break;
 case 'forest-dash':integer(s.lane,0,2);num(s.visualLane,0,2);num(s.jump,0,180);num(s.jumpV,-1000,500);num(s.slide,0,1);integer(s.health,0,3);num(s.invincible,0,3);num(s.distance,0,1600);integer(s.gems);integer(s.combo);ok(['classic','sunset','moonlight'].includes(s.skin),'跑酷造型');arr(s.rows,0,80).forEach(o=>{num(o.z,-.2,2);integer(o.lane,0,2);ok(['stump','arch','gem'].includes(o.kind),'跑道物件');ok(typeof o.checked==='boolean','跑道碰撞紀錄');});break;
 case 'sweet-studio':integer(s.health,0,3);integer(s.selected,0,2);integer(s.served,0,10);integer(s.combo);arr(s.flavors,4,4);arr(s.cols,4,4);arr(s.tops,3,3);arr(s.names,3,3);integer(s.topping,0,2);arr(s.cup,0,3).forEach(n=>integer(n,0,3));arr(s.orders,3,3).forEach(o=>{arr(o.recipe,2,3).forEach(n=>integer(n,0,3));integer(o.top,0,2);ok(['rabbit','panda','fox'].includes(o.animal),'顧客角色');});break;
 case 'cloud-run':integer(s.lane,0,5);arr(s.tiles,1,100).forEach(t=>{obj(t);num(t.z);arr(t.holes,6,6).forEach(b=>ok(typeof b==='boolean','洞口'));integer(t.star,-1,5);integer(t.col,0,2);});break;
 case 'valley-race':arr(s.path,5,100).forEach(xy);xy(s.car);num(s.car.a);num(s.car.v);integer(s.nextGate,1,4);arr(s.samples,0,1200).forEach(xy);arr(s.ghost,0,1200).forEach(xy);if(s.editPoints)arr(s.editPoints,0,18).forEach(xy);break;
 case 'drift-path':xy(s.pos);xy(s.camera);integer(s.dir,0,1);arr(s.nodes,2,100).forEach(xy);arr(s.trail,0,200).forEach(xy);break;
 case 'moon-bells':xy(s.p);num(s.p.vy);arr(s.bells,1,1000).forEach(xy);if(s.target!=null)num(s.target);break;
 case 'forest-pong':xy(s.ball);num(s.ball.vx);num(s.ball.vy);break;
 case 'bounce-basket':velocity(s.ball);xy(s.hoop);arr(s.turnScores,2,2).forEach(v=>num(v,0));integer(s.player,0,1);break;
 case 'meadow-cricket':velocity(s.ball);ok(['pitch','hit','miss'].includes(s.ball.mode),'板球模式');break;
 case 'honey-delivery':velocity(s.candy);xy(s.target);arr(s.ropes,1,12).forEach(r=>{xy(r);num(r.len,1,1000);ok(typeof r.cut==='boolean','繩索');});arr(s.stars,0,10).forEach(p=>{xy(p);ok(typeof p.taken==='boolean','星星狀態');});break;
 case 'rolling-block':obj(s.board);xy(s.board.start);xy(s.board.goal);ok(s.board.tiles instanceof Set&&s.board.tiles.size>0&&s.board.tiles.size<=63,'平台');for(const k of s.board.tiles)ok(/^[0-8],[0-6]$/.test(k),'平台座標');xy(s.p);integer(s.p.o,0,2);arr(s.history,0,10000).forEach(p=>{xy(p);integer(p.o,0,2)});if(s.board.solution)arr(s.board.solution,0,250).forEach(x=>ok(['left','right','up','down'].includes(x),'解法'));break;
 case 'juice-lines':xy(s.emitter);xy(s.cup);arr(s.lines,0,2000).forEach(l=>arr(l,1,5000).forEach(xy));arr(s.particles,0,2000).forEach(p=>{velocity(p);optBool(p,'gone');});if(s.current)arr(s.current,0,5000).forEach(xy);num(s.budget,1,10000);num(s.required,1,1000);break;
 case 'color-workshop':arr(s.palette,5,5);arr(s.names,5,5);arr(s.colors,4,4).forEach(n=>integer(n,0,4));arr(s.target,4,4).forEach(n=>integer(n,0,4));ok(s.mask instanceof Set,'遮罩');for(const x of s.mask)ok(['left','right','top','bottom'].includes(x),'遮罩名稱');break;
 case 'little-engineer':arr(s.design,1,12).forEach(p=>{xy(p);num(p.r,1,100);optBool(p,'wheel');optBool(p,'cargo');});ok(s.design.filter(p=>p.cargo===true).length===1,'貨箱數目');arr(s.nodes,s.design.length,s.design.length).forEach(p=>{xy(p);num(p.r,1,100);num(p.px);num(p.py);optBool(p,'wheel');optBool(p,'cargo');});ok(s.nodes.filter(p=>p.cargo===true).length===1,'模擬貨箱');arr(s.rods,0,66).forEach(e=>num(e.len,0,1000));for(const list of [s.beams,s.rods])arr(list,0,66).forEach(e=>{integer(e.a,0,s.nodes.length-1);integer(e.b,0,s.nodes.length-1);ok(e.a!==e.b,'自連桿');});if(s.sel!==null)integer(s.sel,0,s.nodes.length-1);if(s.drag!=null)integer(s.drag,0,s.design.length-1);break;
 case 'number-garden':{const val=v=>v===0||(Number.isSafeInteger(v)&&v>=2&&Math.log2(v)%1===0);matrix(s.board,4,4,val);arr(s.history,0,50).forEach(h=>{matrix(h.board,4,4,val);integer(h.moves);num(h.score,0);if(h.rng!=null)integer(h.rng,0,0xffffffff);});ok([512,1024,2048].includes(s.target),'目標');break;}
 case 'color-orbit':arr(s.stacks,6,6).forEach(a=>arr(a,0,20).forEach(n=>integer(n,0,5)));integer(s.rotation,0,5);obj(s.drop);integer(s.drop.side,0,5);integer(s.drop.color,0,5);num(s.drop.r);arr(s.colors,6,6);break;
 case 'honeycomb-puzzle':arr(s.cells,7,61);ok(s.valid instanceof Set&&s.valid.size===s.cells.length,'蜂巢');ok(s.occupied instanceof Map,'佔用');for(const k of s.occupied.keys())ok(s.valid.has(k),'棋盤外');arr(s.stock,3,3).forEach(p=>{if(p!==null){obj(p);arr(p.shape,1,6).forEach(a=>arr(a,2,2).forEach(n=>integer(n,-4,4)));}});integer(s.selected,-1,2);break;
 case 'garden-paths':arr(s.cells,7,61);ok(s.valid instanceof Set&&s.valid.size===s.cells.length,'花徑');ok(s.placed instanceof Map&&s.placed.size<=61,'路片');for(const[k,p]of s.placed){ok(s.valid.has(k),'路片位置');pairs(p);}pairs(s.tile);pairs(s.reserve);obj(s.pos);integer(s.pos.entry,0,5);integer(s.rot,0,5);arr(s.path,1,250).forEach(p=>{integer(p.entry,0,5);integer(p.out,0,5)});break;
 case 'block-studio':matrix(s.board,20,10,v=>Number.isInteger(v)&&v>=0&&v<=7);piece(s.p);arr(s.shapes,7,7).forEach(piece);arr(s.queue,3,4).forEach(n=>integer(n,0,6));arr(s.bag,0,7).forEach(n=>integer(n,0,6));integer(s.id,0,6);integer(s.x,-3,9);integer(s.y,-4,19);if(s.hold!==null)integer(s.hold,0,6);break;
 case 'forest-freezer':arr(s.flavors,4,4);arr(s.cols,4,4);arr(s.tops,3,3);arr(s.orders,0,3).forEach(o=>{arr(o.recipe,2,3).forEach(n=>integer(n,0,3));integer(o.top,0,2);num(o.total,1,200);num(o.left,-1,200);});integer(s.selected,0,2);obj(s.cup);arr(s.cup.scoops,0,5).forEach(n=>integer(n,0,3));integer(s.cup.top,0,2);break;
 case 'forest-band':matrix(s.patterns,5,16,v=>typeof v==='boolean');arr(s.active,5,5).forEach(v=>ok(typeof v==='boolean','音軌'));arr(s.names,5,5);integer(s.edit,0,4);num(s.bpm,40,240);integer(s.stepIndex,0,1e9);integer(s.lastStep,-1,15);break;
 case 'star-rhythm':num(s.period,.1,3);integer(s.total,1,1000);integer(s.index,0,s.total);arr(s.points,s.total+3,s.total+5).forEach(xy);num(s.window,.01,1);break;
 default:throw Error('unknown game');
 }return s;
}
return {register,validate,templates};
});

