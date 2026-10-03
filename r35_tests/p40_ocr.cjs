// p40 D4: which OCR candidates are preselected. Runs WQImportCore (script 5) of the built page on saved Tesseract results.
// Usage: WQ33_APP=<built index.html> node r35_tests/p40_ocr.cjs     ([B] = must fail on the R3.4 base, pass on the new build)
const fs=require('fs'),vm=require('vm'),path=require('path');
const app=process.env.WQ33_APP||path.join(__dirname,'..','app','index.html');
const html=fs.readFileSync(app,'utf8');
const scripts=[...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const sb={console,Math,JSON,Date,Set,Map,TextEncoder,TextDecoder};sb.window=sb;sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(scripts[4],sb);vm.runInContext(scripts[5],sb);
const V=sb.WQImportCore,dict=V.dictIndex(sb.WQ_SHARED_REFERENCE||[]);
const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'p40_ocr_fixtures.json'),'utf8'));
let n=0,ok=0,fb=0;
function check(name,pass,detail,base){n++;if(pass)ok++;else if(base)fb++;console.log((pass?'PASS':'FAIL')+(base?' [B]':'')+' '+name+(detail?' | '+detail:''));}
function run(key,mode){const doc=V.fromOCR(fx[key],'ocr1');const items=V.candidates(doc,{mode:mode||'list',dictionary:dict,common:V.COMMON});return {doc,items,sel:items.filter(c=>c.selected)};}
console.log('# p40 OCR preselection (D4)  app='+app);
{const r=run('p1_clean_print.png|3'),en=r.sel.map(c=>c.en.toLowerCase());
 for(const w of ['pencil','ruler','eraser','grandmother','wednesday'])check('clean print: "'+w+'" is preselected',en.includes(w),en.join(','));
 check('clean print: at least 12 words preselected',r.sel.length>=12,String(r.sel.length));
 check('clean print: the unit title is not preselected',!r.sel.some(c=>/^unit|dictation|class|name/i.test(c.en)),r.sel.map(c=>c.en).join('|'),true);
 check('clean print: result is not flagged unclear',!(r.doc.p40&&r.doc.p40.unclear)&&!!r.doc.p40,JSON.stringify(r.doc.p40||null).slice(0,120),true);}
for(const [key,label] of [['p2_phone_skew_shadow.jpg|6','skewed photo with shadow'],['p7_bilingual_table.jpg|3','bilingual table'],['p6_handwritten.jpg|6','handwriting'],['p5_blank_paper.jpg|6','blank paper'],['p4_blurry.jpg|6','blurry photo'],['p3_dark.jpg|6','dark photo']]){
 const r=run(key);
 check(label+': nothing is preselected',r.sel.length===0,r.sel.map(c=>c.en).slice(0,8).join('|'),true);
 check(label+': flagged unclear',!!(r.doc.p40&&r.doc.p40.unclear)||r.items.length===0,'',true);
}
{const r=run('p10_300_words.jpg|3');
 check('300-word page: a long clean list is not flagged unclear',!(r.doc.p40&&r.doc.p40.unclear),String(r.sel.length)+' of '+r.items.length);
 check('300-word page: most words stay preselected',r.sel.length>=100,String(r.sel.length));}
{const r=run('p8_sentences.jpg|6','sentences');
 check('noisy sentence photo: nothing is preselected',r.sel.length===0,String(r.sel.length),true);
 check('noisy sentence photo: flagged unclear',!!(r.doc.p40&&r.doc.p40.unclear),'',true);}
{const doc=V.fromOCR({text:'A big tree.\nThe cat is under the table.\nI like apples very much.\nShe goes to school by bus.\n'},'ocr9'),items=V.candidates(doc,{mode:'sentences',dictionary:dict,common:V.COMMON}),sel=items.filter(c=>c.selected);
 check('clean sentence list in sentence mode keeps the sentences',sel.length>=3&&!(doc.p40&&doc.p40.unclear),sel.length+' of '+items.length);}
{const doc=V.fromText('apple | 蘋果\nbanana | 香蕉','t1'),items=V.candidates(doc,{mode:'list',dictionary:dict,common:V.COMMON});
 check('typed text is untouched (still all selected)',items.length===2&&items.every(c=>c.selected),String(items.length));}
console.log(`SUMMARY p40 OCR preselection: ${ok}/${n} passed; failed [B] (expected on R3.4 base) = ${fb}; failed other = ${n-ok-fb}`);
process.exit(ok===n?0:1);
