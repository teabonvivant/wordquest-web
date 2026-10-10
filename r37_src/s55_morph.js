/* ===== R3.10 s55 - WQMorph: deterministic English word-form analysis (no DOM, no network, no AI) =====
 * window.WQMorph.analyse(word, has, posOf?) -> null | {base, form, label, derived}
 *   has(key)   : true when the (lower-case) key is an entry of the built-in dictionary. Required.
 *   posOf(key) : optional, array of part-of-speech tags of that entry ('n','v','adj','adv','mixed',...); used only to gate
 *                -er/-est (adjectives only) and to word the -s label. Without it a small built-in adjective list is used.
 * Contract
 *   - a word that is itself in the dictionary returns null (direct hit wins);
 *   - a candidate base is only accepted when has(base) is true and base.length >= 2;
 *   - derived:false  = same word in another form (plural, tense, comparative, British/American spelling, other spelling,
 *                      contraction, possessive). The base's meaning applies as it is.
 *   - derived:true   = related word (quick -> quickly, care -> careless ...). Only a hint, never "the same word".
 *   - form is a machine code: plural | third | plural-third | past | pp | past-pp | ing | comp | sup | poss | present |
 *                             spelling | variant | contraction | adv | adj | noun | antonym | redo
 *   - label is the Chinese label for the UI (複數、第三人稱、過去式、過去分詞、過去式／過去分詞、進行式、比較級、最高級、所有格、
 *                             英式／美式串法、另一寫法、縮寫、副詞、形容詞、名詞、反義、重做).
 * WQMorph.sameWord(a, b, has, posOf?) -> true when a and b are the same word in different forms (never for derived).
 */
(function(root){
'use strict';

const LABEL={plural:'複數',third:'第三人稱','plural-third':'複數／第三人稱',past:'過去式',pp:'過去分詞','past-pp':'過去式／過去分詞',ing:'進行式',
  comp:'比較級',sup:'最高級',poss:'所有格',present:'現在式',spelling:'英式／美式串法',variant:'另一寫法',contraction:'縮寫',
  adv:'副詞',adj:'形容詞',noun:'名詞',antonym:'反義',redo:'重做'};

/* ---- irregular verbs: base past pp  (| separates alternatives) ---------------------------------------------------- */
const IRREGULAR_VERBS=`arise arose arisen
awake awoke awoken
be was|were been
bear bore borne|born
beat beat beaten
become became become
begin began begun
bend bent bent
bind bound bound
bite bit bitten
bleed bled bled
blow blew blown
break broke broken
breed bred bred
bring brought brought
build built built
burn burnt burnt
buy bought bought
catch caught caught
choose chose chosen
cling clung clung
come came come
creep crept crept
deal dealt dealt
dig dug dug
do did done
draw drew drawn
dream dreamt dreamt
drink drank drunk
drive drove driven
dwell dwelt dwelt
eat ate eaten
fall fell fallen
feed fed fed
feel felt felt
fight fought fought
find found found
flee fled fled
fling flung flung
fly flew flown
forbid forbade forbidden
forget forgot forgotten
forgive forgave forgiven
freeze froze frozen
get got gotten|got
give gave given
go went gone
grind ground ground
grow grew grown
hang hung hung
have had had
hear heard heard
hide hid hidden
hold held held
keep kept kept
kneel knelt knelt
know knew known
lay laid laid
lead led led
lean leant leant
leap leapt leapt
learn learnt learnt
leave left left
lend lent lent
lie lay lain
light lit lit
lose lost lost
make made made
mean meant meant
meet met met
mistake mistook mistaken
pay paid paid
ride rode ridden
ring rang rung
rise rose risen
run ran run
say said said
see saw seen
seek sought sought
sell sold sold
send sent sent
sew sewed sewn
shake shook shaken
shine shone shone
shoot shot shot
show showed shown
shrink shrank shrunk
sing sang sung
sink sank sunk
sit sat sat
sleep slept slept
slide slid slid
smell smelt smelt
speak spoke spoken
speed sped sped
spell spelt spelt
spend spent spent
spill spilt spilt
spin spun spun
spit spat spat
spoil spoilt spoilt
spring sprang sprung
stand stood stood
steal stole stolen
stick stuck stuck
sting stung stung
stink stank stunk
strike struck struck
swear swore sworn
sweep swept swept
swim swam swum
swing swung swung
take took taken
teach taught taught
tear tore torn
tell told told
think thought thought
throw threw thrown
understand understood understood
undo undid undone
wake woke woken
wear wore worn
weave wove woven
weep wept wept
win won won
wind wound wound
withdraw withdrew withdrawn
write wrote written`;

/* verb prefixes that may sit in front of an irregular verb (overtook -> overtake, understood is listed itself) */
const VERB_PREFIX=['over','under','out','up','be','for','with','mis','fore','re','un','dis','de','pre'];

/* ---- irregular noun plurals, comparatives, be/have/do present forms --------------------------------------------- */
const IRREGULAR_PLURAL={men:'man',women:'woman',children:'child',feet:'foot',teeth:'tooth',mice:'mouse',geese:'goose',lice:'louse',
  people:'person',oxen:'ox',dice:'die',cacti:'cactus',fungi:'fungus',nuclei:'nucleus',stimuli:'stimulus',radii:'radius',syllabi:'syllabus',
  alumni:'alumnus',analyses:'analysis',crises:'crisis',diagnoses:'diagnosis',hypotheses:'hypothesis',theses:'thesis',bases:'basis',
  axes:'axis',phenomena:'phenomenon',criteria:'criterion',bacteria:'bacterium',curricula:'curriculum',data:'datum',media:'medium',
  strata:'stratum',appendices:'appendix',indices:'index',matrices:'matrix',vertices:'vertex',formulae:'formula',antennae:'antenna',
  larvae:'larva',algae:'alga',leaves:'leaf',lives:'life',wives:'wife',knives:'knife',wolves:'wolf',halves:'half',loaves:'loaf',
  shelves:'shelf',thieves:'thief',calves:'calf',scarves:'scarf',elves:'elf',selves:'self',hooves:'hoof',potatoes:'potato',
  tomatoes:'tomato',heroes:'hero',echoes:'echo'};
const IRREGULAR_COMP={better:['good','well'],best:['good','well'],worse:['bad','ill'],worst:['bad','ill'],more:['many','much'],most:['many','much'],
  less:['little'],least:['little'],further:['far'],furthest:['far'],farther:['far'],farthest:['far'],elder:['old'],eldest:['old']};
const BE_HAVE_DO={am:['be','present'],is:['be','third'],are:['be','present'],was:['be','past'],were:['be','past'],been:['be','pp'],being:['be','ing'],
  has:['have','third'],having:['have','ing'],does:['do','third'],doing:['do','ing'],goes:['go','third'],going:['go','ing']};

/* ---- contractions: word -> expansions, the first whose words/phrase is in the dictionary wins --------------------- */
const CONTRACTIONS={"don't":['do not'],"doesn't":['does not'],"didn't":['did not'],"isn't":['is not'],"aren't":['are not'],"wasn't":['was not'],
  "weren't":['were not'],"hasn't":['has not'],"haven't":['have not'],"hadn't":['had not'],"can't":['can not','cannot'],cannot:['can not'],
  "couldn't":['could not'],"won't":['will not'],"wouldn't":['would not'],"shouldn't":['should not'],"mustn't":['must not'],"needn't":['need not'],
  "shan't":['shall not'],"i'm":['i am'],"i've":['i have'],"i'll":['i will'],"i'd":['i would','i had'],"you're":['you are'],"you've":['you have'],
  "you'll":['you will'],"you'd":['you would','you had'],"he's":['he is','he has'],"she's":['she is','she has'],"it's":['it is','it has'],
  "we're":['we are'],"we've":['we have'],"we'll":['we will'],"we'd":['we would','we had'],"they're":['they are'],"they've":['they have'],
  "they'll":['they will'],"they'd":['they would','they had'],"that's":['that is'],"there's":['there is'],"here's":['here is'],"what's":['what is'],
  "who's":['who is'],"where's":['where is'],"how's":['how is'],"when's":['when is'],"let's":['let us'],"o'clock":['of the clock'],
  "ma'am":['madam']};
/* same without apostrophe: only the ones that are not ordinary words (its, ill, wed, well, hell, were ...) */
const NO_APOS={dont:"don't",doesnt:"doesn't",didnt:"didn't",isnt:"isn't",arent:"aren't",wasnt:"wasn't",werent:"weren't",hasnt:"hasn't",
  havent:"haven't",hadnt:"hadn't",cant:"can't",couldnt:"couldn't",wouldnt:"wouldn't",shouldnt:"shouldn't",mustnt:"mustn't",im:"i'm",ive:"i've",
  youre:"you're",theyre:"they're",thats:"that's",whats:"what's"};
const CONTR_S=new Set(['it','he','she','that','there','here','what','who','where','how','when','why','let','this','everyone','someone','nobody','everything','something']);

/* ---- British / American spelling pairs (both ways, any side may be the dictionary one) ---------------------------- */
const SPELLING_PAIRS=`color colour|favorite favourite|honor honour|humor humour|labor labour|neighbor neighbour|behavior behaviour|flavor flavour|harbor harbour|
rumor rumour|vapor vapour|savior saviour|odor odour|armor armour|endeavor endeavour|parlor parlour|tumor tumour|glamor glamour|vigor vigour|
rigor rigour|splendor splendour|candor candour|fervor fervour|ardor ardour|valor valour|clamor clamour|center centre|theater theatre|
meter metre|liter litre|fiber fibre|caliber calibre|somber sombre|saber sabre|specter spectre|luster lustre|maneuver manoeuvre|gray grey|
mom mum|mommy mummy|pajamas pyjamas|aluminum aluminium|jewelry jewellery|donut doughnut|airplane aeroplane|
program programme|cozy cosy|defense defence|offense offence|pretense pretence|license licence|catalog catalogue|dialog dialogue|analog analogue|
ax axe|plow plough|skeptic sceptic|skeptical sceptical|sulfur sulphur|mustache moustache|esthetic aesthetic|fetus foetus|diarrhea diarrhoea|
pediatric paediatric|anemia anaemia|encyclopedia encyclopaedia|aging ageing|artifact artefact|whiskey whisky|sizable sizeable|
judgment judgement|acknowledgment acknowledgement|fulfill fulfil|enroll enrol|installment instalment|skillful skilful|willful wilful|
practice practise|toward towards|afterward afterwards|backward backwards|amongst among|whilst while|okay ok|mold mould|smolder smoulder|
kilometer kilometre|centimeter centimetre|millimeter millimetre`;

/* ---- guards -------------------------------------------------------------------------------------------------------- */
const STOP=new Set(`its his hers ours yours theirs yes this thus us as is was has does always sometimes perhaps towards afterwards besides
upstairs downstairs nowadays outdoors indoors overseas sideways otherwise anyways whereas across plus minus versus news series species means
physics maths mathematics politics economics athletics gymnastics statistics electronics mechanics ethics`.split(/\s+/));
/* plural-looking words whose meaning is not the singular's (goods != good, shorts != short) */
const NOT_PLURAL=new Set(`goods shorts sweets savings customs manners surroundings belongings contents earnings greens pants clothes glasses
scissors trousers thanks_ arms_ minutes_`.split(/\s+/).filter(x=>!x.endsWith('_')));
/* look inflected but are separate words: stem is a real dictionary word with a different meaning */
const NOT_ING=new Set(`morning evening ceiling during nothing something anything everything king ring sing thing wing spring string swing bring sting
cling fling sling wring sibling darling pudding lightning earring herring offspring viking willing bowling bearing reasoning`.split(/\s+/));
const NOUN_ING=new Set(`building meeting painting drawing feeling wedding clothing saving savings beginning opening filling stuffing icing
crossing parking warning greeting heating lighting offering setting settings`.split(/\s+/));
const ADJ_ING=new Set(`boring interesting exciting amazing surprising tiring relaxing frightening confusing disappointing charming shocking
annoying embarrassing fascinating terrifying inspiring entertaining encouraging challenging satisfying worrying pleasing missing
following leading living`.split(/\s+/));
const ADJ_ED=new Set(`tired bored excited interested surprised worried scared married crowded talented limited advanced gifted amazed
annoyed confused disappointed embarrassed frightened pleased relaxed satisfied shocked terrified thrilled determined delighted exhausted
amused concerned experienced educated skilled used united`.split(/\s+/));
const NOT_COMP=new Set(`other either neither rather whether however whatever whoever whenever wherever never ever over under after offer outer upper
inner super proper tender former together another number prayer finger danger stranger letter matter butter batter bitter dinner summer
hammer ladder manner banner corner hunger bother mother father brother sister water weather feather leather order border powder paper
river silver cover monster winter sweater computer teacher player user farmer driver worker writer reader singer dancer painter runner
swimmer builder helper leader speaker manager visitor`.split(/\s+/));
const NOT_EST=new Set(`forest honest interest harvest modest request suggest west test rest nest guest chest quest pest vest invest arrest
contest protest digest manifest conquest unrest`.split(/\s+/));
const NOT_LY=new Set(`only bully belly jelly family supply apply reply rely ally fly july italy holy lily silly early rally tally folly
jolly dolly holly daily hardly assembly`.split(/\s+/));
const LY_ADJ=new Set('friendly lovely lively likely timely elderly deadly costly weekly daily monthly yearly motherly fatherly brotherly sisterly manly womanly cowardly orderly'.split(' '));
const NOT_FUL=new Set('awful handful cupful spoonful armful mouthful bucketful glassful bagful plateful bowlful boxful pocketful grateful'.split(/\s+/));
const NOT_LESS=new Set('unless bless less nevertheless listless reckless ruthless'.split(/\s+/));
const NOT_NESS=new Set('business witness harness wilderness'.split(/\s+/));
const NOT_UN=new Set(`under understand unit united union unique unite universe university uncle until unless unity unicorn uniform unison unify
unusual undo unlike`.split(/\s+/));
const RE_OK=new Set(`do make write read play build paint draw tell start try use set fill heat load name think take order open arrange check
count print pack learn run view wind work wash apply assemble create decorate enter invent submit type live light unite
connect boot cook plan visit send join pay`.split(/\s+/));
const ADJ_BUILTIN=new Set(`big small tall short long high low fast slow quick old young new hot cold warm cool hard soft heavy light strong
weak happy sad angry busy easy early late near far close clean dirty rich poor kind nice cute pretty ugly bright dark safe loud quiet wide narrow
deep shallow thick thin fat sharp smooth rough sweet sour fresh dry wet full empty great good bad cheap simple clever silly funny lucky healthy
wealthy lazy crazy lovely friendly lonely noisy sunny windy cloudy rainy mild tidy messy brave calm proud gentle shy wild neat plain fair
loose tight sick ill able bold keen mean fit flat round straight steep true`.split(/\s+/));

/* ---- helpers ------------------------------------------------------------------------------------------------------- */
const VOWEL=/[aeiou]/;
const FUNCTION_POS=new Set(['adv','prep','conj','modal','ordinal']);
/* pieces that must not be glued back into a phrase: everyday/every day, turnover/turn over, maybe/may be */
const JOIN_LEFT_BLOCK=new Set('a an in on at to of by may every any all some no one each can will'.split(' '));
const JOIN_RIGHT_BLOCK=new Set('up down over out off on in away back through along around about across by one body thing where time more'.split(' '));
const isCons=ch=>/[a-z]/.test(ch)&&!VOWEL.test(ch);
function norm(w){
  return String(w==null?'':w).normalize('NFKC').replace(/[’‘ʼ`´]/g,"'").replace(/[‐‑–—−]/g,'-').trim().replace(/\s+/g,' ').toLowerCase();
}
function buildTables(){
  const form=new Map();           // form -> [{base,form}]
  const add=(f,base,code)=>{const a=form.get(f)||[];if(!a.some(x=>x.base===base&&x.form===code))a.push({base,form:code});form.set(f,a);};
  let rows=0;
  for(const line of IRREGULAR_VERBS.split('\n')){
    const [base,past,pp]=line.trim().split(/\s+/);if(!base)continue;rows++;
    const P=past.split('|'),Q=pp.split('|');
    for(const f of new Set([...P,...Q])){
      if(f===base)continue;
      const inP=P.includes(f),inQ=Q.includes(f);
      add(f,base,inP&&inQ?'past-pp':inP?'past':'pp');
    }
  }
  const spell=new Map();
  for(const pair of SPELLING_PAIRS.replace(/\n/g,'').split('|')){
    const [a,b]=pair.trim().split(/\s+/);if(!a||!b)continue;
    (spell.get(a)||spell.set(a,[]).get(a)).push(b);(spell.get(b)||spell.set(b,[]).get(b)).push(a);
  }
  return {form,spell,rows};
}
const T=buildTables();

function mkHas(has){
  if(typeof has==='function')return has;
  if(has&&typeof has.has==='function')return k=>has.has(k);
  return ()=>false;
}

/* a word's 1-syllable CVC tail ("hop", "us", "mak") -> the -ing form drops a silent e ("hoping" = hope) */
function oneSyllCVC(stem){return /^[^aeiouy]*[aeiou][^aeiouwxy]$/.test(stem);}

/* ---- spelling / spacing variants of one lower-case phrase --------------------------------------------------------- */
function spellTokenVariants(t){
  const out=[];
  const hit=T.spell.get(t);if(hit)out.push(...hit);
  if(t.length>=6){
    const m=/^(.*?)(iz|is)(e|es|ed|ing|ation|ations|er|ers)$/.exec(t);          // organize <-> organise
    if(m)out.push(m[1]+(m[2]==='iz'?'is':'iz')+m[3]);
    const y=/^(.*)y(z|s)(e|es|ed|ing)$/.exec(t);                                  // analyze <-> analyse
    if(y)out.push(y[1]+'y'+(y[2]==='z'?'s':'z')+y[3]);
  }
  let m2;
  if((m2=/^(.*[aeiou])ll(ed|ers?|ing)$/.exec(t)))out.push(m2[1]+'l'+m2[2]);        // travelled -> traveled
  else if((m2=/^(.*[aeiou])l(ed|ers?|ing)$/.exec(t))&&t.length>=6)out.push(m2[1]+'ll'+m2[2]);
  const m3=/^(.*?(?:met|lit|fib|calib|somb|sab|spect|lust|cent|theat))(er|re)(s|d)?$/.exec(t);   // center <-> centre
  if(m3)out.push(m3[1]+(m3[2]==='er'?'re':'er')+(m3[3]||''));
  return out;
}
/* [{v, kind}] alternatives of phrase c (never c itself); kind 'spelling' | 'variant' */
function phraseVariants(c,allowJoinSplit){
  const out=[],seen=new Set([c]);
  const put=(v,kind)=>{if(v&&!seen.has(v)){seen.add(v);out.push({v,kind});}};
  if(/[ \-]/.test(c)){
    put(c.replace(/[ \-]+/g,' '),'variant');put(c.replace(/[ \-]+/g,'-'),'variant');put(c.replace(/[ \-]+/g,''),'variant');
  }
  const parts=c.split(/([ \-])/);               // keep separators
  for(let i=0;i<parts.length;i+=2){
    for(const alt of spellTokenVariants(parts[i])){const p=parts.slice();p[i]=alt;put(p.join(''),'spelling');}
    if(/[ \-]/.test(c)){                         // apostrophe: years <-> year's
      const t=parts[i];
      if(/^[a-z]+s$/.test(t)&&t.length>3){const p=parts.slice();p[i]=t.slice(0,-1)+"'s";put(p.join(''),'variant');}
      else if(/^[a-z]+'s$/.test(t)){const p=parts.slice();p[i]=t.slice(0,-2)+'s';put(p.join(''),'variant');}
    }
  }
  if(allowJoinSplit&&!/[ \-]/.test(c)&&c.length>=5&&c.length<=24){
    for(let i=1;i<c.length;i++){
      const a=c.slice(0,i),b=c.slice(i);
      if(JOIN_LEFT_BLOCK.has(a)||JOIN_RIGHT_BLOCK.has(b))continue;
      if(a.length>=2&&b.length>=2){put(a+' '+b,'variant');put(a+'-'+b,'variant');}
      else if(a.length===1&&b.length>=3&&a!=='a'&&a!=='i')put(a+'-'+b,'variant');
    }
  }
  return out;
}

/* ---- main ---------------------------------------------------------------------------------------------------------- */
function analyse(word,hasIn,posIn){
  const has=mkHas(hasIn);
  const posOf=typeof posIn==='function'?posIn:null;
  const w0=norm(word);
  if(!w0||w0.length>60)return null;
  if(has(w0))return null;
  /* list numbering and loose punctuation around a word: "1. books," -> books ("teachers'" keeps its apostrophe) */
  let w=w0.replace(/^\s*(?:\d{1,3}\s*[.)、:]\s*|[•●▪*\-]\s+)/,'').replace(/^[^a-z]+/,'').replace(/[^a-z']+$/,'');
  const keepAp=/s'$/.test(w);
  w=(w.replace(/'+$/,'')+(keepAp?"'":'')).trim();
  if(w!==w0){
    if(!w)return null;
    if(has(w))return {base:w,form:'variant',label:LABEL.variant,derived:false};
    return analyse(w,hasIn,posIn);
  }
  if(!w||w.length>40||!/^[a-z](?:[a-z'\- ]*[a-z'])?$/.test(w)||/ {2}|--|'{2}/.test(w))return null;
  const posList=k=>{if(!posOf)return null;try{const p=posOf(k);return Array.isArray(p)&&p.length?p:null;}catch(_){return null;}};
  const res=(base,form,derived)=>({base,form,label:LABEL[form]||form,derived:!!derived});

  /* find the dictionary key that spells candidate c (itself, or an other-spelling variant of it) */
  const memo=new Map();
  function find(c,joinSplit){
    if(c.length<2)return null;
    const mk=c+(joinSplit?'\u0001':'');
    if(memo.has(mk))return memo.get(mk);
    let r=null;
    if(has(c))r={key:c,kind:null};
    else for(const x of phraseVariants(c,joinSplit))if(x.v.length>=2&&has(x.v)){r={key:x.v,kind:x.kind};break;}
    memo.set(mk,r);return r;
  }
  const adjLike=k=>{const p=posList(k);return p?p.some(x=>x==='adj'||x==='adv'||(x==='mixed'&&ADJ_BUILTIN.has(k))):ADJ_BUILTIN.has(k);};
  /* entries tagged only as adverb / preposition / conjunction / modal take no -s, -ed or -ing; adjectives may (complete -> completed) */
  const notAdjOnly=k=>{const p=posList(k);return !p||p.some(x=>!FUNCTION_POS.has(x));};
  const verbLike=k=>{const p=posList(k);return !p||p.some(x=>x==='v'||x==='mixed');};
  const sLabel=k=>{
    const p=posList(k);if(!p)return 'plural-third';
    const n=p.some(x=>x==='n'||x==='mixed'||x==='phrase'),v=p.some(x=>x==='v'||x==='mixed');
    return v&&!n?'third':n&&!v?'plural':'plural-third';
  };

  /* 1. contractions and possessives */
  const ct=CONTRACTIONS[w]||(NO_APOS[w]?CONTRACTIONS[NO_APOS[w]]:null);
  if(ct){
    for(const ex of ct){
      const f=find(ex);if(f)return res(f.key,'contraction');
      for(const t of ex.split(' ')){
        if(t==='not')continue;
        const a=find(t);if(a&&t.length>=2)return res(a.key,'contraction');
        const r=analyse(t,hasIn,posIn);if(r&&!r.derived)return res(r.base,'contraction');
      }
    }
    return null;
  }
  let m=/^(.+)'s$/.exec(w)||/^([a-z]+s)'$/.exec(w);
  if(m){
    const stem=m[1];
    if(/'s$/.test(w)&&CONTR_S.has(stem)){
      const a=find(stem);if(a&&stem.length>=2)return res(a.key,'contraction');
      return null;
    }
    const a=find(stem);if(a)return res(a.key,'poss');
    const r=analyse(stem,hasIn,posIn);if(r&&!r.derived)return res(r.base,'poss');
    return null;
  }
  if(/'/.test(w)&&!/ /.test(w)){          // other apostrophes: try without ("o'clock" handled above)
    const a=find(w.replace(/'/g,''));if(a)return res(a.key,'variant');
    return null;
  }

  /* 2. other spelling of the whole word: ice-cream / ice cream / icecream, color / colour */
  const whole=find(w,true);
  if(whole)return res(whole.key,whole.kind==='spelling'?'spelling':'variant');

  /* "a book", "an apple", "the sun", "to run": the word on its own is what is meant */
  {
    const am=/^(a|an|the|to) ([a-z][a-z'\-]+)$/.exec(w);
    if(am){
      const f=find(am[2],false);
      if(f&&f.key.length>=2&&(am[1]!=='to'||verbLike(f.key)))return res(f.key,'variant');
      if(am[1]!=='to'){const r=analyse(am[2],hasIn,posIn);if(r&&!r.derived)return r;}
    }
  }

  /* single-token inflection candidates: [{base, form|dyn, gate?}] in priority order */
  function inflCands(t,forPhrase){
    const out=[];
    const push=(base,form,gate,dyn)=>{if(base&&base.length>=2&&base!==t)out.push({base,form,gate,dyn});};
    if(STOP.has(t)&&!BE_HAVE_DO[t])return out;
    if(BE_HAVE_DO[t])push(BE_HAVE_DO[t][0],BE_HAVE_DO[t][1]);
    const ir=T.form.get(t);if(ir)for(const x of ir)push(x.base,x.form);
    if(IRREGULAR_PLURAL[t])push(IRREGULAR_PLURAL[t],'plural');
    if(!forPhrase&&IRREGULAR_COMP[t])for(const b of IRREGULAR_COMP[t])push(b,/est$|^(best|worst|most|least)$/.test(t)?'sup':'comp');
    if(/men$/.test(t)&&t.length>3)push(t.slice(0,-3)+'man','plural');
    if(/women$/.test(t)&&t.length>5)push(t.slice(0,-5)+'woman','plural');
    if(/children$/.test(t)&&t.length>8)push(t.slice(0,-8)+'child','plural');
    // prefixed irregular verbs: overtook -> overtake, understood, rewrote -> rewrite
    for(const p of VERB_PREFIX){
      if(t.startsWith(p)&&t.length>p.length+2){
        const rest=t.slice(p.length),x=T.form.get(rest);
        if(x)for(const y of x)push(p+y.base,y.form);
      }
    }
    const L=t.length;
    // -s / -es / -ies / -ves
    if(L>=3&&t.endsWith('s')&&!NOT_PLURAL.has(t)&&!/(ss|us|is|'s)$/.test(t)&&!(/ics$/.test(t)&&!/^(comics|topics|critics|classics|lyrics|tactics|epics|antics|basics)$/.test(t))){
      if(/ves$/.test(t)){push(t.slice(0,-3)+'f','plural');push(t.slice(0,-3)+'fe','plural');}
      push(t.slice(0,-1),null,notAdjOnly,sLabel);
      if(/(?:s|x|z|ch|sh|o)es$/.test(t))push(t.slice(0,-2),null,notAdjOnly,sLabel);
      if(/zzes$/.test(t))push(t.slice(0,-3),null,notAdjOnly,sLabel);
      if(/ies$/.test(t)&&L>4)push(t.slice(0,-3)+'y',null,notAdjOnly,sLabel);
    }
    // -ed
    if(L>=4&&t.endsWith('ed')&&!ADJ_ED.has(t)&&!(L===4&&/eed$/.test(t))){
      if(/ied$/.test(t)&&L>4)push(t.slice(0,-3)+'y','past-pp',notAdjOnly);
      push(t.slice(0,-1),'past-pp',notAdjOnly);
      if(L>=5)push(t.slice(0,-2),'past-pp',k=>notAdjOnly(k)&&!(oneSyllCVC(t.slice(0,-2))&&has(t.slice(0,-1))));
      if(L>=6&&t[L-3]===t[L-4]&&isCons(t[L-3]))push(t.slice(0,-3),'past-pp',notAdjOnly);
      if(/cked$/.test(t)&&L>=7)push(t.slice(0,-3),'past-pp',notAdjOnly);
    }
    // -ing
    if(L>=5&&t.endsWith('ing')&&!NOT_ING.has(t)&&!NOUN_ING.has(t)&&!ADJ_ING.has(t)){
      const stem=t.slice(0,-3);
      const cands=[];
      if(/y$/.test(stem)&&!/[aeiou]y$/.test(stem))cands.push(stem.slice(0,-1)+'ie');       // lying, dying, tying
      if(oneSyllCVC(stem)){cands.push(stem+'e');}                                           // hoping -> hope (never "hop")
      else{
        cands.push(stem);
        if(stem.length>=3&&stem[stem.length-1]===stem[stem.length-2]&&isCons(stem[stem.length-1]))cands.push(stem.slice(0,-1)); // running
        cands.push(stem+'e');
        if(/ck$/.test(stem))cands.push(stem.slice(0,-1));                                   // picnicking
      }
      for(const c of cands)push(c,'ing',notAdjOnly);
    }
    // -er / -est (adjectives and adverbs only; not for phrases)
    if(!forPhrase){
      if(L>=4&&t.endsWith('er')&&!NOT_COMP.has(t)){
        push(t.slice(0,-2),'comp',adjLike);push(t.slice(0,-1),'comp',adjLike);
        if(L>=6&&t[L-3]===t[L-4]&&isCons(t[L-3]))push(t.slice(0,-3),'comp',adjLike);
        if(/ier$/.test(t))push(t.slice(0,-3)+'y','comp',adjLike);
      }
      if(L>=5&&t.endsWith('est')&&!NOT_COMP.has(t)&&!NOT_EST.has(t)){
        push(t.slice(0,-3),'sup',adjLike);push(t.slice(0,-2),'sup',adjLike);
        if(L>=7&&t[L-4]===t[L-5]&&isCons(t[L-4]))push(t.slice(0,-4),'sup',adjLike);
        if(/iest$/.test(t))push(t.slice(0,-4)+'y','sup',adjLike);
      }
    }
    return out;
  }
  const accept=(c,f)=>{
    if(c.gate&&!c.gate(f.key))return null;
    return res(f.key,c.dyn?c.dyn(f.key):c.form);
  };

  /* 3.+4. irregular and regular inflection of a single word */
  if(!/[ \-]/.test(w)){
    for(const c of inflCands(w,false)){
      const f=find(c.base,false);
      if(!f)continue;
      const r=accept(c,f);if(r)return r;
    }
  }else{
    /* phrases and hyphenated words: inflect the first or the last part ("took off" -> "take off", "ice-creams" -> "ice cream") */
    const parts=w.split(/([ \-])/),tk=parts.filter((_,i)=>i%2===0);
    if(tk.length>=2&&tk.length<=5){
      for(const idx of [0,tk.length-1]){
        for(const c of inflCands(tk[idx],true)){
          const p=parts.slice();p[idx*2]=c.base;
          const f=find(p.join(''),false);
          if(f){const form=c.dyn?c.dyn(f.key):c.form;return res(f.key,form);}
        }
      }
    }
  }
  /* inflection of an other-spelling base: colors -> colour, travelled via spelling pair, ice creams */
  if(!/[ \-]/.test(w)){
    for(const c of inflCands(w,false)){
      const f=find(c.base,true);
      if(!f)continue;
      const r=accept(c,f);if(r)return r;
    }
  }

  /* 5. derived (hint only) */
  if(/ing$/.test(w)&&(NOUN_ING.has(w)||ADJ_ING.has(w))){
    const stem=w.slice(0,-3);
    for(const b of [stem,stem+'e',stem.slice(0,-1)]){
      const f=find(b,false);
      if(f&&verbLike(f.key)&&f.key.length>=2)return res(f.key,NOUN_ING.has(w)?'noun':'adj',true);
    }
  }
  if(/ed$/.test(w)&&ADJ_ED.has(w)){
    for(const b of [w.slice(0,-1),w.slice(0,-2),w.slice(0,-3),/ied$/.test(w)?w.slice(0,-3)+'y':'']){
      if(!b)continue;
      const f=find(b,false);
      if(f&&f.key.length>=2)return res(f.key,'adj',true);
    }
  }
  if(!/[ \-]/.test(w)){
    const L=w.length;
    const d=(b,form,ok,min=3)=>{const f=find(b,false);return f&&f.key.length>=min&&(!ok||ok(f.key))?res(f.key,form,true):null;};
    let r=null;
    if(L>=5&&w.endsWith('ly')&&!NOT_LY.has(w)){
      const okLy=k=>k.length>=4||adjLike(k);
      const cands=[w.slice(0,-2)];
      if(/ily$/.test(w))cands.push(w.slice(0,-3)+'y');
      if(/ally$/.test(w))cands.push(w.slice(0,-4));
      cands.push(w.slice(0,-1)+'e');
      if(/lly$/.test(w))cands.push(w.slice(0,-1));
      if(/uly$/.test(w))cands.push(w.slice(0,-2)+'e');
      for(const c of cands)if((r=d(c,'adv',okLy))){
        if(LY_ADJ.has(w)){r.form='adj';r.label=LABEL.adj;}     // friendly, lovely: adjectives, not adverbs
        return r;
      }
    }
    if(L>=7&&w.endsWith('ful')&&!NOT_FUL.has(w)){
      for(const c of [w.slice(0,-3),/iful$/.test(w)?w.slice(0,-4)+'y':''])if(c&&(r=d(c,'adj')))return r;
    }
    if(L>=7&&w.endsWith('less')&&!NOT_LESS.has(w)){
      for(const c of [w.slice(0,-4),/iless$/.test(w)?w.slice(0,-5)+'y':''])if(c&&(r=d(c,'adj')))return r;
    }
    if(L>=7&&w.endsWith('ness')&&!NOT_NESS.has(w)){
      for(const c of [w.slice(0,-4),/iness$/.test(w)?w.slice(0,-5)+'y':''])if(c&&(r=d(c,'noun')))return r;
    }
    if(L>=5&&w.startsWith('un')&&!NOT_UN.has(w)&&(r=d(w.slice(2),'antonym')))return r;
    if(L>=4&&w.startsWith('re')){
      const b=w.slice(2);
      if(RE_OK.has(b)&&(r=d(b,'redo',verbLike,2)))return r;
    }
  }
  return null;
}

/* Are a and b the same word in two forms (book/books, ran/running, color/colour, ice cream/ice-cream)?
 *  - derived words are not the same word (quick/quickly, care/careless);
 *  - when both are headwords of the dictionary they stay two entries (glass/glasses, child/children), as the direct-hit rule says;
 *  - otherwise both are reduced to a lemma, ignoring the word's own dictionary entry (so "running" still reduces to "run"). */
function sameWord(a,b,hasIn,posIn){
  const na=norm(a),nb=norm(b);
  if(!na||!nb)return false;
  if(na===nb)return true;
  const has=mkHas(hasIn);
  if(has(na)&&has(nb))return false;
  const lemma=(x,other)=>{
    const r=analyse(x,k=>k!==x&&(k===other||has(k)),posIn);
    return r&&!r.derived?r.base:x;
  };
  const la=lemma(na,nb),lb=lemma(nb,na);
  return la===lb||la===nb||lb===na;
}

const api={analyse,sameWord,norm,LABEL,VERSION:'55.1',IRREGULAR_VERB_ROWS:T.rows,STOP,
  irregularForms:()=>[...T.form.keys()]};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WQMorph=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this);
