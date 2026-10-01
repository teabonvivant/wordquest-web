
/* V25 pure data boundaries. Checksums detect damage; they do not authenticate a backup. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.WQReliability=f();})(globalThis,function(){
'use strict';
const VERSION='28.0.0',MAX_BACKUP=10*1024*1024,MAX_REGISTRY=1024*1024;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function parseRegistry(raw){
 if(raw===null)return [];
 if(typeof raw!=='string'||raw.length>MAX_REGISTRY)throw Error('帳戶清單大小不正確');
 let rows;try{rows=JSON.parse(raw);}catch{throw Error('帳戶清單不是完整 JSON');}
 if(!Array.isArray(rows)||rows.length>100)throw Error('帳戶清單格式不正確');
 const ids=new Set(),names=new Set();
 for(const a of rows){
  if(!object(a)||typeof a.id!=='string'||!a.id.length||a.id.length>160||typeof a.name!=='string'||!a.name.trim()||a.name.length>40||typeof a.salt!=='string'||!a.salt.length||a.salt.length>100||typeof a.pinHash!=='string'||!(/^(?:pbkdf2-sha256\$600000\$[a-f0-9]{64}|[a-f0-9]{64}|preview-[a-f0-9]{1,8})$/.test(a.pinHash)))throw Error('帳戶清單包含不完整項目');
  const name=a.name.trim().replace(/\s+/g,' ').toLowerCase();
  if(ids.has(a.id)||names.has(name))throw Error('帳戶清單有重複身份');
  if(a.migrationUsed!=null&&typeof a.migrationUsed!=='boolean')throw Error('帳戶搬移標記不正確');
  ids.add(a.id);names.add(name);
 }
 return rows;
}
function canonical(value,depth=0){
 if(depth>80)throw Error('備份資料層數過深');
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('備份含非有限數值');return JSON.stringify(value);}
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 throw Error('備份含不支援的資料類型');
}
async function digest(value){
 if(!globalThis.crypto?.subtle)throw Error('此環境沒有備份完整性運算；請使用本機啟動器或 HTTPS');
 const data=new TextEncoder().encode(canonical(value));
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}
async function seal(data,createdAt=new Date().toISOString(),unsaved=false){
 if(!object(data))throw Error('備份資料格式錯誤');
 const clean=JSON.parse(JSON.stringify(data));delete clean._backupV25;
 return {...clean,_backupV25:{format:'wordquest-learning-backup',v:1,appVersion:VERSION,createdAt,algorithm:'SHA-256',sha256:await digest(clean),containsMedia:false,unsaved:!!unsaved}};
}
async function inspect(raw,validate){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BACKUP)throw Error('備份最多 10 MB');
 let value;try{value=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw Error('備份不是完整 JSON，沒有更改資料');}
 if(!object(value))throw Error('備份必須是學習資料物件');
 let integrity='legacy',meta=null;
 if(Object.hasOwn(value,'_backupV25')){
  meta=value._backupV25;delete value._backupV25;
  if(!object(meta)||meta.format!=='wordquest-learning-backup'||meta.v!==1||meta.algorithm!=='SHA-256'||!(/^[a-f0-9]{64}$/.test(meta.sha256||''))||typeof meta.createdAt!=='string'||!Number.isFinite(Date.parse(meta.createdAt)))throw Error('備份完整性標記無效');
  if(await digest(value)!==meta.sha256)throw Error('備份校驗不一致；檔案可能損壞或曾被修改，沒有更改資料');
  integrity='verified';
 }
 const data=validate(value);
 const summaries={children:data.children.length,ranges:data.ranges.length,items:data.words.length,attempts:data.attempts.length};
 return {data,integrity,meta,summaries};
}
return Object.freeze({VERSION,MAX_BACKUP,parseRegistry,canonical,digest,seal,inspect});
});

