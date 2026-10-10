/* ===== R3.11 s56: word-form labels, same-family fold and "already learned" on the step-2 cards (#range-new) =====
 * Runs inside the host closure after s50 + s55 (uses s55HasRaw, window.s55Info, window.s55SameWord) and wraps s50Apply, v20Card and
 * s50FixLabels. State lives on item.s50 (in memory / draft only, rebuilt on every render):
 *   learned = spelling of the word already in this child's list   root = id of the card kept for this word family   rootEn = its spelling
 * Hand-made choices (item.s50.manual) are never overruled. A same-family card is not hidden: it stays on the page, un-selected,
 * with the label 同字根, and one tap adds it back. */
const s56Fold=w=>V20.fold(String(w==null?'':w));
const s56KeyCache=new Map(),s56PairCache=new Map();let s56Size=-1;
function s56Sync(){if(v20Dictionary.size!==s56Size){s56KeyCache.clear();s56PairCache.clear();s56Size=v20Dictionary.size;}}
/* the spelling itself plus the base it reduces to when its own dictionary entry is ignored (same reading as WQMorph.sameWord);
 * `a` is that analysis ({base, form, label, derived}) or null */
function s56Look(word){
 s56Sync();
 const k=s56Fold(word);
 let r=s56KeyCache.get(k);
 if(r)return r;
 let a=null;
 try{a=(window.WQMorph&&window.WQMorph.analyse(k,x=>x!==k&&s55HasRaw(x),s55PosOf))||null;}catch(_){}
 r={keys:[k],a};
 if(a&&!a.derived&&a.base&&a.base!==k)r.keys.push(a.base);
 s56KeyCache.set(k,r);
 return r;
}
const s56Keys=word=>s56Look(word).keys;
function s56Same(a,b){
 s56Sync();
 const ka=s56Fold(a),kb=s56Fold(b);
 if(!ka||!kb)return false;
 if(ka===kb)return true;
 const pk=ka<kb?ka+'\u0000'+kb:kb+'\u0000'+ka;
 let r=s56PairCache.get(pk);
 if(r===undefined){try{r=!!window.s55SameWord(ka,kb);}catch(_){r=false;}s56PairCache.set(pk,r);}
 return r;
}
/* candidates for a "same word?" question without comparing every pair: shared key or the same first two letters */
function s56Index(){
 const m=new Map();
 const put=(k,x)=>{let a=m.get(k);if(!a)m.set(k,a=[]);a.push(x);};
 return {
  add(word,x){const f=s56Fold(word);if(!f)return;for(const k of s56Keys(word))put('k:'+k,x);put('p:'+f.slice(0,2),x);},
  find(word){
   const f=s56Fold(word),out=new Set();
   for(const k of s56Keys(word))for(const x of m.get('k:'+k)||[])out.add(x);
   for(const x of m.get('p:'+f.slice(0,2))||[])out.add(x);
   return out;
  }
 };
}
const s56Single=c=>c.kind!=='sentence'&&s56Fold(c.en)&&s56Fold(c.en).split(' ').length<=3;
function s56LearnedIndex(){
 const idx=s56Index();
 let ws=[];
 try{
  /* the sample range every new account starts with (示範默書 Unit 3) is not something the child has learned */
  const demo=new Set(db.ranges.filter(r=>r&&(r.isDemo===true||r.id==='r_demo')).map(r=>r.id));
  ws=(childWords()||[]).filter(w=>w&&!demo.has(w.rangeId));
 }catch(_){}
 for(const w of ws){const en=String(w&&w.en||'').trim();if(en)idx.add(en,en);}
 return idx;
}
function s56FindLearned(idx,en){
 const f=s56Fold(en);let hit='';
 for(const w of idx.find(en)){
  if(s56Fold(w)===f)return w;
  if(!hit&&s56Same(w,en))hit=w;
 }
 return hit;
}
function s56Apply(){
 const learnedIdx=s56LearnedIndex(),seen=s56Index(),groupOf=new Map(),groups=[];
 for(const c of v20.items){
  const m=c.s50;
  if(!m)continue;
  m.learned='';m.root='';m.rootEn='';
  if(m.dup||m.skip||s50HostExcluded(c)||!s56Single(c))continue;
  const hit=s56FindLearned(learnedIdx,c.en);
  if(hit){
   m.learned=hit;
   if(!m.manual&&c.selected){c.selected=false;m.sel=false;}
  }
  let g=null;
  for(const o of seen.find(c.en)){if(s56Same(o.en,c.en)){g=groupOf.get(o);break;}}
  if(!g){g=[];groups.push(g);}
  g.push(c);groupOf.set(c,g);seen.add(c.en,c);
 }
 for(const g of groups){
  if(g.length<2)continue;
  /* kept: the one written first. A card the parent picked by hand stays selected next to it (a tap means "add it back") */
  const rep=g[0];
  for(const c of g){
   if(c===rep)continue;
   const m=c.s50;
   m.root=rep.id;m.rootEn=rep.en;
   if(!m.manual&&c.selected){c.selected=false;m.sel=false;}
  }
 }
}
const s56PriorApply=s50Apply;
s50Apply=function(){
 const r=s56PriorApply.apply(this,arguments);
 try{s56Apply();}catch(e){try{console.warn('s56',e);}catch(_){}}
 return r;
};

/* ---- the label under the Chinese ---- */
/* British / American side of a spelling pair: colour -> 英式, color -> 美式; '' when the rule is not obvious */
function s56Side(t,b){
 t=s56Fold(t);b=s56Fold(b);
 const one=(x,y)=>{
  if(x.replace(/ou/g,'o')===y&&/our/.test(x))return true;
  if(/re(s|d)?$/.test(x)&&x.replace(/re(s|d)?$/,'er$1')===y)return true;
  if(/is(e|es|ed|ing|ation|ations|er|ers)$/.test(x)&&x.replace(/is(e|es|ed|ing|ation|ations|er|ers)$/,'iz$1')===y)return true;
  if(/ys(e|es|ed|ing)$/.test(x)&&x.replace(/ys(e|es|ed|ing)$/,'yz$1')===y)return true;
  if(/ll(ed|er|ers|ing)$/.test(x)&&x.replace(/ll(ed|er|ers|ing)$/,'l$1')===y)return true;
  if(/ence$/.test(x)&&x.replace(/ence$/,'ense')===y)return true;
  if(/ogue$/.test(x)&&x.replace(/ogue$/,'og')===y)return true;
  if(/mme$/.test(x)&&x.replace(/mme$/,'m')===y)return true;
  if(/(ae|oe)/.test(x)&&x.replace(/ae|oe/g,'e')===y)return true;
  return false;
 };
 if(one(t,b))return '英式';
 if(one(b,t))return '美式';
 return '';
}
/* a card is ~91px of text wide on a 390px phone (3 per row): at 11px that is about 8 CJK characters. Choose the first wording that
 * fits; a longer one is cut by CSS and its full text stays in title / aria-label. */
const s56Units=t=>[...String(t)].reduce((n,ch)=>n+(/[\u2e80-\u9fff\uff00-\uffef]/.test(ch)?1:ch===' '?.3:.55),0);
const s56Fit=list=>list.find(t=>s56Units(t)<=8.3)||list[list.length-1];
const S56_OF={plural:'的複數',third:'的第三人稱','plural-third':'的複數',past:'的過去式',pp:'的過去分詞','past-pp':'的過去式',ing:'的進行式',
 comp:'的比較級',sup:'的最高級',poss:'的所有格',present:'的現在式',contraction:'的縮寫'};
function s56Tag(c){
 if(!c||c.kind==='sentence')return null;
 const m=c.s50||{},en=String(c.en||'');
 if(m.learned)return {kind:'learned',text:'已學過 '+m.learned,title:'孩子的詞庫已有 '+m.learned};
 if(m.root)return {kind:'root',text:'同字根 '+m.rootEn,title:en+' 與 '+m.rootEn+' 同字根（同一個字），只預選了先寫的一個；按一下可加回'};
 let L=null;
 try{L=window.s55Info&&window.s55Info(en);}catch(_){}
 /* a word that is itself a dictionary entry (quickly, children) is never "a form of" another card; only the plain
  * relation "from quick" is told for it */
 if(!L){const a=s56Look(en).a;if(a&&a.derived&&s55HasRaw(s56Fold(en)))L=a;}
 if(!L||!L.base)return null;
 if(L.derived)return {kind:'derived',text:'來自 '+L.base,title:en+' 由 '+L.base+' 變來，不是同一個字'};
 if(L.form==='spelling'){
  const side=s56Side(en,L.base);
  return {kind:'form',text:side?s56Fit([side+'串法 '+L.base,side+' '+L.base]):s56Fit(['英美串法 '+L.base,'英美 '+L.base]),title:en+' 是 '+L.base+' 的'+(side||'另一種')+'串法'};
 }
 if(L.form==='variant')return {kind:'form',text:s56Fit(['另一寫法 '+L.base,'寫法 '+L.base]),title:en+' 是 '+L.base+' 的另一種寫法'};
 const of=S56_OF[L.form]||('的'+(L.label||'變化'));
 return {kind:'form',text:s56Fit([L.base+' '+of,L.base+' '+of.replace(/^的/,'')]),title:en+' 是 '+L.base+' '+of};
}
const s56PriorCard=v20Card;
v20Card=function(c){
 const h=s56PriorCard.apply(this,arguments);
 let t=null;
 try{t=s56Tag(c);}catch(_){}
 if(!t||typeof h!=='string')return h;
 const tail='</span></button><div class="v20-candidate-foot">',i=h.indexOf(tail);
 if(i<0)return h;
 let out=h.slice(0,i)+`<small class="s56-tag s56-${t.kind}" title="${esc(t.title)}">${esc(t.text)}</small>`+h.slice(i);
 out=out.replace('<article class="',`<article data-s56="${t.kind}" class="`);
 out=out.replace(/(data-imp="toggle"[^>]*aria-label=")([^"]*)"/,(x,a,b)=>a+b+'（'+esc(t.title)+'）"');
 return out;
};

/* ---- the line under the title: say what was left un-selected and why ---- */
const s56PriorLabels=s50FixLabels;
s50FixLabels=function(){
 const r=s56PriorLabels.apply(this,arguments);
 try{
  const msg=$('#v20-message');
  if(msg&&v20.items.length&&!v20.rawDirty){
   const live=v20.items.filter(c=>s50Shown(c)&&c.s50&&!c.selected);
   const nL=live.filter(c=>c.s50.learned).length,nR=live.filter(c=>!c.s50.learned&&c.s50.root).length;
   const bits=[nR?`同字根 ${nR} 個`:'',nL?`已學過 ${nL} 個`:''].filter(Boolean);
   const cur=msg.textContent;
   if(bits.length&&cur&&!/未選。$/.test(cur))msg.textContent=cur.replace(/。$/,'')+`，${bits.join('、')}未選。`;
  }
 }catch(_){}
 return r;
};
