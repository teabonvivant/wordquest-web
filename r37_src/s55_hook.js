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
function s55Lemma(word){
 if(typeof word!=='string'||!word||!window.WQMorph)return null;
 if(v20Dictionary.size!==s55CacheSize){s55Cache.clear();s55Synth.clear();s55CacheSize=v20Dictionary.size;}
 const key=V20.fold(word);
 if(s55Cache.has(key))return s55Cache.get(key);
 let r=null;
 try{r=window.WQMorph.analyse(key,s55HasRaw,s55PosOf);}catch(_){r=null;}
 s55Cache.set(key,r);
 return r;
}
function s55Entry(key){
 const L=s55Lemma(key);
 if(!L||L.derived)return undefined;
 const hit=s55Synth.get(key);
 if(hit)return hit;
 const base=s55RawGet.call(v20Dictionary,L.base);
 if(!base||!Array.isArray(base.senses))return undefined;
 const e={key,en:key,_base:L.base,_form:L.form,_label:L.label,senses:base.senses.map(s=>Object.assign({},s,{headword:key})),examples:[]};
 s55Synth.set(key,e);
 return e;
}
v20Dictionary.has=function(k){return s55RawHas.call(this,k)||(typeof k==='string'&&!!s55Entry(k));};
v20Dictionary.get=function(k){const e=s55RawGet.call(this,k);return e!==undefined||typeof k!=='string'?e:s55Entry(k);};
window.s55Lemma=word=>{const r=s55Lemma(word);return r?Object.assign({},r):null;};
window.s55Info=word=>{const r=s55Lemma(word);return r?Object.assign({word:V20.fold(word)},r):null;};
window.s55SameWord=(a,b)=>window.WQMorph?window.WQMorph.sameWord(a,b,s55HasRaw,s55PosOf):V20.fold(a)===V20.fold(b);

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
 if(!w.emoji){
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
