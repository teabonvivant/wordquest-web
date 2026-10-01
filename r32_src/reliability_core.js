/* R3.2 journal boundaries. Pure validation; never trusts keys from a recovery record. */
(function(root,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;root.WQR32Safety=a;})(globalThis,function(){'use strict';
 const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&[Object.prototype,null].includes(Object.getPrototypeOf(o));
 const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,100}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
 function allowedKey(k,owner,main){if(!validId(owner)||typeof k!=='string'||typeof main!=='string'||!main.endsWith(owner))return false;
  return k===main||k===main+'-before-restore'||k===main+'-v24-protection'||k==='wq-r3-family:'+owner||k.startsWith('wqm-state-v1:'+owner+':')||k.startsWith('wordquest-v32-characters:normal:'+owner+':')||k.startsWith('wordquest-v32-characters:sandbox:'+owner+':');
 }
 function validateKV(values,owner,main){if(!plain(values)||Object.keys(values).length>1000)throw Error('復原資料欄位無效或過多');
  for(const [k,v] of Object.entries(values)){if(!allowedKey(k,owner,main)||['__proto__','constructor','prototype'].includes(k))throw Error('復原資料包含其他家庭或不允許的儲存位置');if(v!==null&&typeof v!=='string')throw Error('復原資料必須是原始文字或空值');}
  return values;
 }
 function validateJournal(j,owner,main){if(!plain(j)||j.owner!==owner||!Number.isFinite(j.at)||typeof j.label!=='string'||j.label.length>100)throw Error('復原日誌身份或格式無效');validateKV(j.before,owner,main);
  if(!Object.hasOwn(j.before,main)||typeof j.before[main]!=='string')throw Error('復原日誌缺少原家庭主資料');
  if(!Array.isArray(j.beforeMedia)||j.beforeMedia.length>5000)throw Error('復原媒體清單無效');const keys=new Set();
  for(const r of j.beforeMedia){if(!plain(r)||r.owner!==owner||typeof r.key!=='string'||!r.key||r.key.length>=500||keys.has(r.key)||!['note','image','audio'].includes(r.kind))throw Error('復原媒體身份、類別或識別碼無效');keys.add(r.key);}
  return j;
 }
 const canExport=bytes=>Number.isSafeInteger(bytes)&&bytes>=0&&bytes<=140000000;
 return Object.freeze({allowedKey,validateKV,validateJournal,canExport});
});
