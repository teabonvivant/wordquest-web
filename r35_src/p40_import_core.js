/* R3.5 p40 - D4: after photo recognition, preselect only candidates that look like English words.
 * Injected into script 5 (WQImportCore) right after candidates(); helpers below are hoisted function declarations.
 * Rejected items are not deleted: they move to the "not added" list where the parent can add them back. */
const P40_HEAD=new Set('dictation dictate date name class revision spelling homework worksheet english chinese page unit grade list words word'.split(' '));
function p40Near(en,dictionary){
 const key=fold(en);
 if(dictionary.has(key))return true;
 const parts=key.split(/[\s\-]+/).filter(Boolean);
 if(parts.length>1&&parts.every(p=>dictionary.has(p)))return true;
 return parts.length===1&&suggestions(en,dictionary).length>0;
}
/* Returns a short reason when the candidate should not be preselected, otherwise ''. */
function p40Reject(c,dictionary,lineIdx){
 const en=c.en,conf=c.confidenceRaw,known=!!c.known;
 if(!/^[A-Za-z][A-Za-z'’\-]*(?: [A-Za-z][A-Za-z'’\-]*)*$/.test(en))return '不像英文單字';
 const letters=en.replace(/[^A-Za-z]/g,'');
 if(letters.length<2)return '太短，可能不是單字';
 if(en.length>(/\s/.test(en)?30:20))return '太長，可能不是單字';
 if(en.split(' ').some(w=>w.replace(/[^A-Za-z]/g,'').length>1&&!/[aeiouyAEIOUY]/.test(w)))return '不像英文單字';
 if(/[a-z][A-Z]/.test(en))return '不像英文單字';
 if(letters===letters.toUpperCase()&&letters.length<=5&&!(known&&(conf===null||conf>=85)))return '不像英文單字';
 if(lineIdx>=0&&lineIdx<4&&P40_HEAD.has(fold(en)))return '可能是標題或日期';
 if(conf===null||conf===undefined)return '';
 if(known){
  if(c.common&&conf<60)return '辨認不太清楚';
  if(conf<40&&letters.length<5)return '辨認不太清楚';
  return '';
 }
 if(p40Near(en,dictionary))return conf<30?'辨認不太清楚':'';
 if(letters.length<=3)return '太短，可能不是單字';
 if(conf<50)return '辨認不太清楚';
 return '';
}
function p40Mark(out,mode,dictionary,doc){
 const lines=doc.lines||[],stats={raw:out.length,pre:0,known:0,conf:[]};
 /* a unit title or a header line ("Unit 4 Fruit and Food", "Name: ...") near the top is not a word list */
 const head=new Set(lines.filter((l,i)=>i<5&&/^\W*(?:unit|lesson|week|term|name|class|date|dictation|revision|english)\b/i.test(l.text||'')).map(l=>l.id));
 for(const c of out){
  if(c.excludedReason)continue;
  let why='';
  if(head.has(c.lineId)&&mode!=='sentences')why='可能是標題或日期';
  else if(mode==='sentences'||c.kind==='sentence'){
   const letters=(c.en.match(/[A-Za-z]/g)||[]).length;
   if(c.confidenceRaw!==null&&c.confidenceRaw<40)why='辨認不太清楚';
   else if(letters<c.en.length*.55)why='不像英文句子';
  }else why=p40Reject(c,dictionary,lines.findIndex(l=>l.id===c.lineId));
  if(why){c.selected=false;c.excludedReason=why;}
  else{stats.pre++;if(c.known)stats.known++;if(c.confidenceRaw!==null)stats.conf.push(c.confidenceRaw);}
 }
 stats.medConf=median(stats.conf);
 /* Unclear page: almost nothing usable, mostly noise, mostly unknown words or low confidence. Nothing is preselected then. */
 stats.unclear=stats.raw>0&&(stats.pre<3||(stats.raw>40&&stats.pre/stats.raw<.3)||(mode!=='sentences'&&stats.known/Math.max(1,stats.pre)<.35)||(stats.conf.length>0&&stats.medConf<60));
 if(stats.unclear)for(const c of out)if(!c.excludedReason)c.selected=false;
 doc.p40=stats;
}
