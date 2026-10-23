/* ===== R3.10 s55: word forms (WQMorph) wired into the import core, the save and the picture lookup =====
 * Runs inside the host closure after s50. The dictionary stays the single source of meaning: a plural / past tense / spelling
 * variant is answered with a copy of the base word's entry (senses keep the Chinese, headword becomes the typed form). Related
 * words (quick -> quickly) are NOT treated as the same word; window.s55Info() reports them for a "from quick" hint.
 * db.words keeps its original shape on purpose: validateDb() rebuilds every word from a fixed field list, so a new field such as
 * base/form would be dropped on the next load. The base is cheap to recompute with s55Lemma(word.en). */
const s55RawHas=Map.prototype.has,s55RawGet=Map.prototype.get;
const s55HasRaw=k=>s55RawHas.call(v20Dictionary,k);
const s55PosOf=k=>{const e=s55RawGet.call(v20Dictionary,k);return e&&Array.isArray(e.senses)?[...new Set(e.senses.map(s=>s&&s.pos).filter(Boolean))]:null;};
const s55Cache=new Map(),s55Synth=new Map();let s55CacheSize=-1;
/* R3.13: an -ly adverb that is not itself a dictionary entry (softly, rudely, simply, comfortably) is the same lesson word as its
 * adjective: the lemma is reported as a form (label "soft 的副詞") instead of a "related word". Only the plain spelling changes are
 * accepted (soft+ly, noisy->noisily, simple->simply, comfortable->comfortably, accident+ally); chilly / silly / jolly (-ll + y) are
 * adjectives and stay un-linked. */
function s55AdvOk(key,base){
 if(!/ly$/.test(key)||!base)return false;
 return key===base+'ly'||key===base.slice(0,-1)+'ily'&&/y$/.test(base)||key===base+'ally'||key===base.slice(0,-1)+'y'&&/le$/.test(base)||key===base.slice(0,-1)+'ly'&&/ue$/.test(base);
}
function s55Lemma(word){
 if(typeof word!=='string'||!word||!window.WQMorph)return null;
 if(v20Dictionary.size!==s55CacheSize){s55Cache.clear();s55Synth.clear();s55CacheSize=v20Dictionary.size;}
 const key=V20.fold(word);
 if(s55Cache.has(key))return s55Cache.get(key);
 let r=null;
 /* R3.26: the irregular-form table (went -> go, mice -> mouse, bacteria -> bacterium) answers first; a dictionary entry still wins */
 const tf=window.WQ_FORMS&&!s55HasRaw(key)&&Object.prototype.hasOwnProperty.call(window.WQ_FORMS,key)?window.WQ_FORMS[key]:null;
 if(tf&&s55HasRaw(tf[0]))r={base:tf[0],form:tf[1],label:window.WQMorph.LABEL[tf[1]]||'',derived:false};
 else try{r=window.WQMorph.analyse(key,s55HasRaw,s55PosOf);}catch(_){r=null;}
 if(r&&r.derived&&r.form==='adv'&&!s55HasRaw(key)&&s55AdvOk(key,r.base)){
  const sn=s55RawGet.call(v20Dictionary,r.base);
  if(sn&&Array.isArray(sn.senses)&&sn.senses.length)r=Object.assign({},r,{derived:false,adverb:true});   // soft -> 柔軟地 (several meanings: the parent picks)
 }
 s55Cache.set(key,r);
 return r;
}
/* meaning of the derived / contracted form, written from the base word's Chinese (never invented when the base has none) */
const S55_NT={do:'不',does:'不',did:'沒有',is:'不是',are:'不是',was:'不是',were:'不是',has:'沒有',have:'沒有',had:'沒有',can:'不能',cannot:'不能',
 could:'不能',will:'不會',would:'不會',should:'不應該',must:'不可以',need:'不需要',shall:'不會',might:'可能不'};
const S55_ADJ_ZH={close:'近的',near:'近的'};
const s55AdvZh=zh=>!zh||/[，,；;、]/.test(zh)||/地$/.test(zh)?zh:(/的$/.test(zh)?zh.slice(0,-1):zh)+'地';
function s55ContrZh(key,baseZh){
 let ex=null;
 try{ex=window.WQMorph.expansions(key);}catch(_){}
 const e=ex&&ex[0];
 if(!e)return '';
 const tag='（縮寫：'+e+'）';
 const words=e.split(' ');
 if(/n't$|^cannot$/.test(key))return (S55_NT[words[0]]||(baseZh?'不'+baseZh.replace(/了$/,''):'不'))+tag;
 const suf=(/'(ll|re|ve|d|m|s)$/.exec(key)||[])[1];
 if(key==="let's")return '讓我們'+tag;
 const add={ll:'將會',re:'是',ve:'有',d:'會',m:'是',s:'是／有'}[suf];
 return add?(baseZh||'')+add+tag:'';
}
function s55Entry(key){
 const L=s55Lemma(key);
 if(!L||L.derived)return undefined;
 const hit=s55Synth.get(key);
 if(hit)return hit;
 const base=s55RawGet.call(v20Dictionary,L.base);
 if(!base||!Array.isArray(base.senses))return undefined;
 let senses=base.senses.map(s=>Object.assign({},s,{headword:key}));
 if(L.adverb){
  const adj=senses.filter(s=>s&&s.pos==='adj');
  senses=(adj.length?adj:senses).map(s=>Object.assign(s,{zhHK:s55AdvZh(s.zhHK),pos:'adv'}));
 }
 else if(L.form==='contraction'&&senses[0]){
  const zh=s55ContrZh(key,String(senses[0].zhHK||''));
  if(zh)senses=[Object.assign(senses[0],{zhHK:zh})];
 }
 else if((L.form==='comp'||L.form==='sup')&&S55_ADJ_ZH[L.base]&&!base.senses.some(s=>s&&s.pos==='adj'))senses=senses.map(s=>Object.assign(s,{zhHK:S55_ADJ_ZH[L.base],pos:'adj'}));
 const e={key,en:key,_base:L.base,_form:L.adverb?'adv':L.form,_label:L.label,senses,examples:[]};
 s55Synth.set(key,e);
 return e;
}
v20Dictionary.has=function(k){return s55RawHas.call(this,k)||(typeof k==='string'&&!!s55Entry(k));};
v20Dictionary.get=function(k){const e=s55RawGet.call(this,k);return e!==undefined||typeof k!=='string'?e:s55Entry(k);};
window.s55Lemma=word=>{const r=s55Lemma(word);return r?Object.assign({},r):null;};
window.s55Info=word=>{const r=s55Lemma(word);return r?Object.assign({word:V20.fold(word)},r):null;};
/* R3.26: two dictionary entries that are the same word in two forms (play / playing / played, go / went, child / children) are one
 * word family. Verb and adjective forms always count; a plural / -s form counts only when both entries share a Chinese meaning, so
 * glass (玻璃) and glasses (眼鏡) stay apart. */
const S55_FAMILY_FORMS=new Set(['past','pp','past-pp','ing','comp','sup']),S55_PLURAL_FORMS=new Set(['plural','third','plural-third']);
const s55ZhTokens=k=>{const e=s55RawGet.call(v20Dictionary,k);return e&&Array.isArray(e.senses)?e.senses.flatMap(x=>String(x&&x.zhHK||'').replace(/[（(][^）)]*[）)]/g,'').split(/[；;，,、\s]+/)).filter(Boolean):[];};
const s55ZhShare=(a,b)=>{const ta=s55ZhTokens(a),tb=s55ZhTokens(b);return ta.some(x=>tb.some(y=>x===y||x.length>=2&&y.length>=2&&(x.includes(y)||y.includes(x))));};
function s55FormOf(x,other){
 let r=null;
 try{r=window.WQMorph.analyse(x,k=>k!==x&&(k===other||s55HasRaw(k)),s55PosOf);}catch(_){}
 return r&&!r.derived?r:null;
}
window.s55SameWord=(a,b)=>{
 if(!window.WQMorph)return V20.fold(a)===V20.fold(b);
 if(window.WQMorph.sameWord(a,b,s55HasRaw,s55PosOf))return true;
 const fa=V20.fold(a),fb=V20.fold(b);
 if(!fa||!fb)return false;
 const ra=s55FormOf(fa,fb),rb=s55FormOf(fb,fa);
 const ba=ra?ra.base:fa,bb=rb?rb.base:fb;
 if(ba!==bb&&ba!==fb&&bb!==fa)return false;
 const bothEntries=s55HasRaw(fa)&&s55HasRaw(fb);
 if(!bothEntries)return true;
 const forms=[ra,rb].filter(Boolean).map(r=>r.form);
 return forms.some(f=>S55_FAMILY_FORMS.has(f))||forms.some(f=>S55_PLURAL_FORMS.has(f))&&s55ZhShare(fa,fb);
};

/* fill what the base word knows into a freshly imported word; never overwrite what the parent typed */
function s55FillWord(w){
 const L=s55Lemma(w&&w.en);
 if(!L||L.derived)return false;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)?o[k]:null;
 const d=own(dictionary,norm(L.base))||{},cat=(typeof MEDIA_CATALOG!=='undefined'&&own(MEDIA_CATALOG,norm(L.base)))||{};
 let changed=false;
 if(!w.zh){
  let zh=d.zh||'';
  if(!zh){try{zh=V20.gloss(w.en,v20Dictionary).zh||'';}catch(_){zh='';}}
  if(zh&&zh.length<=300){w.zh=zh;changed=true;}
 }
 if(!w.emoji&&!L.adverb){
  const e=d.emoji||cat.emoji||'';
  if(e&&e.length<=40&&!/[<>&]/.test(e)){w.emoji=e;changed=true;}
 }
 if(!w.example&&w.kind!=='sentence'){
  const shared=sharedByKey.get(norm(L.base)),pool=[d.ex,...((shared&&shared.examples)||[]).map(x=>x&&x.en)].filter(Boolean);
  const re=new RegExp('(^|[^A-Za-z])'+String(w.en).trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+'([^A-Za-z]|$)','i');
  const ex=pool.find(x=>re.test(x));
  if(ex&&ex.length<=400){w.example=ex;changed=true;}
 }
 return changed;
}
const s55SaveRangeOrig=saveRange;
saveRange=function(){
 const words0=db.words.length,ranges0=db.ranges.length,saveOrig=save;
 save=function(){
  try{
   if(db.ranges.length>ranges0&&db.words.length>words0){
    const rid=db.ranges[db.ranges.length-1].id;
    for(let i=words0;i<db.words.length;i++)if(db.words[i].rangeId===rid)s55FillWord(db.words[i]);
   }
  }catch(_){}
  return saveOrig.apply(this,arguments);
 };
 try{return s55SaveRangeOrig.apply(this,arguments);}
 finally{save=saveOrig;}
};
if(typeof imageFor==='function'){
 const s55ImageForOrig=imageFor;
 imageFor=function(w){
  const r=s55ImageForOrig(w);
  if(r||!w||!w.en)return r;
  try{
   const L=s55Lemma(w.en);
   if(L&&!L.derived&&L.base!==norm(w.en)&&!mediaEntry(noteKey(w))?.textOnly)return s55ImageForOrig(Object.assign({},w,{en:L.base}));
  }catch(_){}
  return r;
 };
}
