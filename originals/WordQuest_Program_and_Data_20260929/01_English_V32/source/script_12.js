
/* WordQuest Playground — original game logic. No third-party runtime. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.WQCore=v;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function rng(seed=1){let s=seed>>>0;const f=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};f.state=()=>s;return f;}
function shuffle(a,r=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function nearest(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);const x=a.x+t*dx,y=a.y+t*dy;return{x,y,t,d:Math.hypot(p.x-x,p.y-y)};}
function segmentCross(a,b,c,d){const cr=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return cr(a,b,c)*cr(a,b,d)<0&&cr(c,d,a)*cr(c,d,b)<0;}
function mergeLine(line){const a=line.filter(Boolean),out=[];let score=0;for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){out.push(a[i]*2);score+=a[i]*2;i++;}else out.push(a[i]);}while(out.length<line.length)out.push(0);return{line:out,score};}
function mergeBoard(board,dir){const n=board.length,b=board.map(r=>r.slice());let score=0;for(let k=0;k<n;k++){const cells=[];for(let t=0;t<n;t++){let x,y;if(dir==='left'){x=t;y=k;}else if(dir==='right'){x=n-1-t;y=k;}else if(dir==='up'){x=k;y=t;}else{x=k;y=n-1-t;}cells.push([x,y]);}const m=mergeLine(cells.map(([x,y])=>board[y][x]));score+=m.score;cells.forEach(([x,y],i)=>b[y][x]=m.line[i]);}return{board:b,score,changed:JSON.stringify(b)!==JSON.stringify(board)};}
function hasMerge(board){return board.some(r=>r.includes(0))||['left','right','up','down'].some(d=>mergeBoard(board,d).changed);}
// A block occupies one upright cell, two horizontal cells, or two vertical cells.
function blockCells(s){return s.o===0?[[s.x,s.y]]:s.o===1?[[s.x,s.y],[s.x+1,s.y]]:[[s.x,s.y],[s.x,s.y+1]];}
function blockMove(s,d){let{x,y,o}=s;if(o===0){if(d==='left'){x-=2;o=1;}if(d==='right'){x+=1;o=1;}if(d==='up'){y-=2;o=2;}if(d==='down'){y+=1;o=2;}}
else if(o===1){if(d==='left'){x-=1;o=0;}if(d==='right'){x+=2;o=0;}if(d==='up')y--;if(d==='down')y++;}
else{if(d==='left')x--;if(d==='right')x++;if(d==='up'){y-=1;o=0;}if(d==='down'){y+=2;o=0;}}return{x,y,o};}
const blockKey=s=>`${s.x},${s.y},${s.o}`;
function blockSolve(tiles,start,goal){const queue=[[start,[]]],seen=new Set([blockKey(start)]);for(let i=0;i<queue.length;i++){const[s,path]=queue[i];if(s.o===0&&s.x===goal.x&&s.y===goal.y)return path;for(const d of ['left','right','up','down']){const v=blockMove(s,d),key=blockKey(v);if(!seen.has(key)&&blockCells(v).every(([x,y])=>tiles.has(`${x},${y}`))){seen.add(key);queue.push([v,path.concat(d)]);}}}return null;}
function blockLevel(seed=1,diff=1){const r=rng(seed);for(let attempt=0;attempt<60;attempt++){const start={x:1,y:1,o:0},tiles=new Set(['1,1']);let p=start,last='';for(let i=0;i<28+diff*12;i++){const cand=shuffle(['left','right','up','down'],r).filter(d=>d!==({left:'right',right:'left',up:'down',down:'up'}[last]));let next;for(const d of cand){const v=blockMove(p,d);if(blockCells(v).every(([x,y])=>x>=0&&x<9&&y>=0&&y<7)){next=v;last=d;break;}}if(!next)continue;p=next;blockCells(p).forEach(([x,y])=>tiles.add(`${x},${y}`));if(p.o===0&&i>8&&Math.abs(p.x-1)+Math.abs(p.y-1)>3){const solution=blockSolve(tiles,start,p);if(solution&&solution.length>=5+diff)return{start,goal:{x:p.x,y:p.y},tiles,solution};}}}
const tiles=new Set();for(let y=0;y<7;y++)for(let x=0;x<9;x++)tiles.add(`${x},${y}`);const start={x:1,y:1,o:0},goal={x:7,y:4};return{start,goal,tiles,solution:blockSolve(tiles,start,goal)};}
const HEX_DIRS=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const hexKey=(q,r)=>`${q},${r}`;
function hexCells(radius){const out=[];for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++)if(Math.abs(q+r)<=radius)out.push({q,r});return out;}
function hexXY(q,r,size=38,cx=400,cy=280){return{x:cx+Math.sqrt(3)*size*(q+r/2),y:cy+1.5*size*r};}
function hexRotate(shape){return shape.map(([q,r])=>[-r,q+r]);}
function hexFit(shape,q,r,valid,occupied){return shape.every(([a,b])=>valid.has(hexKey(q+a,r+b))&&!occupied.has(hexKey(q+a,r+b)));}
function hexLines(cells,occupied){const all=new Set();for(let axis=0;axis<3;axis++){const groups=new Map();for(const c of cells){const k=axis===0?c.q:axis===1?c.r:-c.q-c.r;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(hexKey(c.q,c.r));}for(const line of groups.values())if(line.every(k=>occupied.has(k)))line.forEach(k=>all.add(k));}return all;}
function pairs(r=Math.random){const p=shuffle([0,1,2,3,4,5],r),out=[];for(let i=0;i<6;i+=2)out.push([p[i],p[i+1]]);return out;}
function rotatePairs(p,n){return p.map(([a,b])=>[(a+n)%6,(b+n)%6]);}
function pairExit(p,entry){const a=p.find(a=>a.includes(entry));return a?a[0]===entry?a[1]:a[0]:-1;}
function rotateMatrix(a){return a[0].map((_,x)=>a.map(row=>row[x]).reverse());}
function tetrisFits(board,p,x,y){if(!Array.isArray(board)||board.length!==20||!board.every(r=>Array.isArray(r)&&r.length===10)||!Array.isArray(p)||!p.length||p.length>4||!Array.isArray(p[0])||!p[0].length||p[0].length>4||!p.every(r=>Array.isArray(r)&&r.length===p[0].length&&r.every(v=>v===0||v===1))||!p.some(r=>r.some(Boolean))||!Number.isInteger(x)||!Number.isInteger(y))return false;return p.every((row,dy)=>row.every((v,dx)=>!v||(x+dx>=0&&x+dx<board[0].length&&y+dy<board.length&&(y+dy<0||board[y+dy][x+dx]===0))));}
function clearRows(board){const kept=board.filter(r=>r.some(v=>v===0));const count=board.length-kept.length;return{count,board:Array.from({length:count},()=>Array(board[0].length).fill(0)).concat(kept)};}
function safeSeconds(value,fallback=180,max=900){return Number.isFinite(value)&&value>=5?clamp(Math.floor(value),5,max):fallback;}
function rhythmGrade(error,window=.15){const e=Math.abs(error);return e>window?'miss':e<=Math.min(.055,window*.4)?'perfect':'good';}

function validTrack(points){
 if(!Array.isArray(points)||points.length<5||points.length>18)return false;
 if(!points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=60&&p.x<=740&&p.y>=90&&p.y<=480))return false;
 let area=0,length=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];const d=distance(a,b);if(d<25)return false;length+=d;area+=a.x*b.y-b.x*a.y;
  for(let j=i+1;j<points.length;j++)if(distance(a,points[j])<20)return false;
 }
 return Math.abs(area)/2>=5000&&length>=300;
}
return{validTrack,clamp,distance,rng,shuffle,nearest,segmentCross,mergeLine,mergeBoard,hasMerge,blockCells,blockMove,blockSolve,blockLevel,HEX_DIRS,hexKey,hexCells,hexXY,hexRotate,hexFit,hexLines,pairs,rotatePairs,pairExit,rotateMatrix,tetrisFits,clearRows,safeSeconds,rhythmGrade};
});

