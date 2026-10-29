/* ===== R3.26 s55: word bank - open-dictionary headwords, picture emoji, irregular-form table (data: tools/build_wordbank.py) =====
 * Runs after the word-form hook above. A generated headword is skipped when it is only another form of a word the bank already has
 * (aging, canned, color / colour, softly): those stay "the same word", as before. Curated entries always win. */
(function(){
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 for(const [key,g] of WQ_BANK.ext){
  if(s55HasRaw(key))continue;
  let r=null;
  try{r=window.WQMorph.analyse(key,k=>k!==key&&s55HasRaw(k),s55PosOf);}catch(_){}
  if(r&&(!r.derived||r.form==='adv'&&s55AdvOk(key,r.base)))continue;
  const senses=g.split('|').map((x,i)=>{const c=x.indexOf(':');return {headword:key,zhHK:x.slice(c+1),pos:x.slice(0,c),category:'open_dictionary',sourceLine:0,id:'wq-x-'+key+'-s'+(i+1)};});
  const e={id:'wq-x-'+key,key,en:key,senses,examples:[],requiresContextReview:senses.length>1};
  sharedEntries.push(e);sharedByKey.set(norm(key),e);v20Dictionary.set(key,e);
  dictionary[key]={zh:senses.length===1?senses[0].zhHK:'',ex:'',emoji:''};
 }
 for(const w in WQ_BANK.pics){
  if(!s55HasRaw(w))continue;
  const d=own(dictionary,w)?dictionary[w]:(dictionary[w]={zh:'',ex:'',emoji:''});
  if(!d.emoji)d.emoji=WQ_BANK.pics[w];
 }
 window.WQ_FORMS=WQ_BANK.forms;
})();

/* ---- R3.27 proper nouns (tools/build_proper.py): names, HK surnames, places, countries, festivals for the dictation import only.
 * They go into v20Dictionary, never into sharedEntries, so no game or quiz asks them. A word the bank already has (Bill, Rose, So, Tom)
 * keeps its own meaning; "Mr Chan" / "Miss Wong" are answered as 陳先生 / 黃小姐. ---- */
const WQ_PROPER=new Map();
(function(){
 const TAG={name:'人名',surname:'姓氏',title:'稱謂',place:'地名',country:'國家／地區',lang:'語言／國籍',festival:'節日',char:'角色'};
 for(const type in WQ_BANK.proper)for(const [en,zh] of WQ_BANK.proper[type]){
  const key=V20.fold(en),p=WQ_PROPER.get(key);
  if(p){if(p.type===type&&!p.zh.split('／').includes(zh))p.zh+='／'+zh;continue;}
  WQ_PROPER.set(key,{type,en,zh,tag:TAG[type],common:false});
 }
 for(const [key,p] of WQ_PROPER){
  let L=null;
  try{L=s55Lemma(key);}catch(_){}
  if(s55HasRaw(key)||L&&!L.derived&&p.type!=='name'){                // Oliver is a name, not "olive 的比較級"
   p.common=true;
   /* a first name that is also a word (Bill, Rose, Oliver): written with a capital it offers both meanings, lower-case only the word.
    * The dictionary gets its own copy of the entry; sharedEntries (games, quizzes) keep the original. */
   const e=s55RawGet.call(v20Dictionary,key);
   if((p.type==='name'||p.type==='country')&&e&&Array.isArray(e.senses)&&!e.senses.some(x=>x&&(x.headword===p.en||String(x.zhHK||'').includes(p.zh)))){
    const cap=e.senses.map(x=>Object.assign({},x,{headword:p.en}));
    v20Dictionary.set(key,Object.assign({},e,{senses:e.senses.concat(cap,[{headword:p.en,zhHK:p.zh+(p.type==='name'?'（人名）':''),pos:'proper',category:'proper_name',sourceLine:0,id:'wq-p-'+key+'-s1'}])}));
   }
   continue;
  }       // hung stays "hang 的過去式", not the surname 洪
  const zh=p.zh+(p.type==='name'?'（人名）':p.type==='surname'?'（姓氏）':'');
  v20Dictionary.set(key,{id:'wq-p-'+key,key,en:p.en,senses:[{headword:p.en,zhHK:zh,pos:'proper',category:'proper_noun',sourceLine:0,id:'wq-p-'+key+'-s1'}],examples:[]});
 }
})();
/* ---- R3.34 common phrases (tools/build_phrase.py): go jogging, take the rubbish out, a diamond ring... dictation import only, like the
 * proper nouns above. A phrase the bank already explains keeps its own meaning. ---- */
(function(){
 for(const [en,zh] of WQ_BANK.phrase){
  const key=V20.fold(en),e=s55RawGet.call(v20Dictionary,key);
  if(e&&Array.isArray(e.senses)&&e.senses.some(x=>x&&x.zhHK))continue;
  v20Dictionary.set(key,{id:'wq-ph-'+key,key,en,senses:[{headword:en,zhHK:zh,pos:'phrase',category:'phrase',sourceLine:0,id:'wq-ph-'+key+'-s1'}],examples:[]});
 }
})();
const WQ_TITLE={mr:'先生','mr.':'先生',mrs:'太太','mrs.':'太太',ms:'女士','ms.':'女士',miss:'小姐',dr:'醫生','dr.':'醫生',madam:'女士'};
const wqTitled=new Map();
function wqTitledEntry(k){
 if(wqTitled.has(k))return wqTitled.get(k);
 const m=/^(\S+) (\S+)$/.exec(k),t=m&&WQ_TITLE[m[1]],p=t&&WQ_PROPER.get(m[2]);
 let e;
 if(p&&(p.type==='surname'||p.type==='name')){
  const zh=p.zh.split('／').map(z=>z+t).join('／'),hw=m[1][0].toUpperCase()+m[1].slice(1)+' '+p.en;
  e={id:'wq-p-'+k,key:k,en:hw,senses:[{headword:hw,zhHK:zh,pos:'proper',category:'proper_noun',sourceLine:0,id:'wq-p-'+k+'-s1'}],examples:[]};
 }
 wqTitled.set(k,e);
 return e;
}
{
 const has0=v20Dictionary.has,get0=v20Dictionary.get;
 const art=k=>{const m=typeof k==='string'&&/^(?:a|an|the) (\S.*\s.*|\S+ \S+)$/.exec(k);return m?m[1]:null;};   // "a round face" -> "round face"
 v20Dictionary.has=function(k){return has0.call(this,k)||(typeof k==='string'&&!!wqTitledEntry(k))||!!(art(k)&&has0.call(this,art(k)));};
 v20Dictionary.get=function(k){const e=get0.call(this,k);if(e!==undefined||typeof k!=='string')return e;const t=wqTitledEntry(k);if(t)return t;const a=art(k);return a?get0.call(this,a):undefined;};
}
/* what kind of proper noun a spelling is: {type, tag, common} (common = also an ordinary word in the bank), or null */
window.wqProper=en=>{
 const k=V20.fold(String(en==null?'':en));
 const p=WQ_PROPER.get(k);
 if(p)return {type:p.type,tag:p.tag,common:p.common};
 return wqTitledEntry(k)?{type:'name',tag:'人名',common:false}:null;
};

/* ---- drawn picture cards (assets/r326/words/<word>.webp): words that have no emoji; plurals / tenses use the base word's card ---- */
const WQ_IMG=new Set(WQ_BANK.img);
const wqImgWord=en=>{
 const k=V20.fold(String(en==null?'':en));
 if(!k)return '';
 if(WQ_IMG.has(k))return k;
 const L=s55Lemma(k);
 return L&&!L.derived&&WQ_IMG.has(L.base)?L.base:'';
};
const wqImgSrc=k=>'assets/r326/words/'+k+'.webp';
window.wqImgWord=wqImgWord;
if(typeof r37WordArt==='function'){
 const wqArt0=r37WordArt;
 r37WordArt=function(word){
  const k=!R37_WORD_ART[word]&&!r37Emoji(word)?wqImgWord(word):'';
  return k?`<img class="r37-svg wq-pic" src="${wqImgSrc(k)}" alt="" draggable="false" decoding="async">`:wqArt0(word);
 };
}
if(typeof imageFor==='function'){
 const wqImage0=imageFor;
 imageFor=function(w){
  const r=wqImage0(w);
  if(r||!w||!w.en)return r;
  try{
   const k=wqImgWord(w.en);
   if(k&&!mediaEntry(noteKey(w))?.textOnly)return {src:wqImgSrc(k),custom:false,meta:{source:'WordQuest 原創插圖',credit:'WordQuest',license:'Project artwork',image:k}};
  }catch(_){}
  return r;
 };
}
