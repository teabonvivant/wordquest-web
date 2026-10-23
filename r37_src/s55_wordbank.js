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
