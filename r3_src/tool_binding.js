function bindTool(t,q){if(!q?.verification)return t;const p=q.params,k=q.verification.kind,within=(x,a,b)=>Number.isInteger(Number(x))&&Number(x)>=a&&Number(x)<=b;
 t.r3Note='這是探索教具，不是額外的作答題。可更改數值比較；本題的準確圖像及條件以題幹為準。';
 if(t.kind==='fraction'){
  if(['sameFraction','unlikeAdd','fractionMultiply','fractionDivide','fractionDecimal'].includes(k)&&within(p.b,1,12)&&within(p.a,0,p.b)&&within(p.e??p.b,1,12)&&within(p.c??0,0,p.e??p.b)){t.den=Number(p.b);t.num=Number(p.a);t.den2=Number(p.e??p.b);t.num2=Number(p.c??0);}else{t.den=4;t.num=1;t.den2=6;t.num2=1;}
 }
 if(t.kind==='array'){if(['division','remainder'].includes(k)&&within(p.b,1,10)&&within(p.a,0,100)){t.mode='division';t.dividend=Number(p.a);t.divisor=Number(p.b);t.shared=0;t.rows=Number(p.b);t.cols=1;}else if(k==='multiply'&&within(p.a,1,10)&&within(p.b,1,10)){t.mode='array';t.rows=Number(p.b);t.cols=Number(p.a);}else{t.mode='array';t.rows=3;t.cols=4;t.extra=0;}}
 if(t.kind==='solid'){for(const [dst,src]of [['sx','a'],['sy','b'],['sz','c']])if(within(p[src],1,5))t[dst]=Number(p[src]);}
 if(t.kind==='ruler'&&within(p.start,0,19)&&within(p.end,1,20)){t.rulerStart=Number(p.start);t.rulerEnd=Number(p.end);}
 if(t.kind==='clock'&&k==='hour24')t.hour=Number(p.a)+12;
 if(t.kind==='chart')for(const[dst,src]of[['chartA','a'],['chartB','b'],['chartC','c']])if(within(p[src],0,20))t[dst]=Number(p[src]);
 if(t.kind==='segments'&&!within(t.points,2,8))t.points=4;
 return t;
}
function unitBlocks(a,b,h){const cells=[];for(let z=0;z<h;z++)for(let y=0;y<b;y++)for(let x=0;x<a;x++)cells.push({x,y,z});cells.sort((a,b)=>(a.x+a.y+a.z)-(b.x+b.y+b.z));let body='';const step=Math.min(29,170/(a+b),145/h),startY=35+(h-1)*step;for(const c of cells){const x=300+(c.x-c.y)*step,y=startY+(c.x+c.y)*step*.5-c.z*step;body+=`<g stroke="#527c79" stroke-width="1.1"><polygon points="${x},${y-step} ${x+step},${y-step*.5} ${x},${y} ${x-step},${y-step*.5}" fill="#e7f1e3"/><polygon points="${x-step},${y-step*.5} ${x},${y} ${x},${y+step} ${x-step},${y+step*.5}" fill="#b8d6ce"/><polygon points="${x},${y} ${x+step},${y-step*.5} ${x+step},${y+step*.5} ${x},${y+step}" fill="#81b1aa"/></g>`;}return svg('每小塊是1立方單位；長'+a+'、闊'+b+'、高'+h+'，包括被擋住的方塊',body+text(300,273,'長 '+a+' · 闊 '+b+' · 高 '+h,17),283);}
