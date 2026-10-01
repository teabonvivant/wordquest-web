
/* Local-only credentials. Not server authentication and not encryption of learning data. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.WQAuth=f();})(globalThis,function(){
'use strict';
const rounds=600000;
function cryptoAPI(){const c=globalThis.crypto;if(!c?.subtle||!c.getRandomValues)throw Error('請使用 HTTPS 或本機啟動器；此環境沒有安全密碼運算，不能建立或升級帳戶。');return c;}
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
function salt(){return hex(cryptoAPI().getRandomValues(new Uint8Array(16)));}
async function hash(password,s){if(typeof password!=='string'||password.length>128||typeof s!=='string'||s.length>100)throw Error('invalid credential input');const c=cryptoAPI(),k=await c.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const b=await c.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(s),iterations:rounds,hash:'SHA-256'},k,256);return 'pbkdf2-sha256$'+rounds+'$'+hex(b);}
async function legacyHash(password,s){return hex(await cryptoAPI().subtle.digest('SHA-256',new TextEncoder().encode(s+'|'+password)));}
function legacyPreview(password,s){const raw=s+'|'+password;let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return 'preview-'+(h>>>0).toString(16);}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
async function verify(password,account){if(typeof password!=='string'||password.length>128||!account)return false;const stored=account.pinHash;if(typeof stored!=='string')return false;if(/^pbkdf2-sha256\$600000\$[a-f0-9]{64}$/.test(stored))return equal(await hash(password,account.salt),stored);if(/^[a-f0-9]{64}$/.test(stored))return equal(await legacyHash(password,account.salt),stored);if(/^preview-[a-f0-9]{1,8}$/.test(stored))return equal(legacyPreview(password,account.salt),stored);return false;}
return Object.freeze({rounds,salt,hash,verify,legacyHash,isModern:a=>/^pbkdf2-sha256\$600000\$[a-f0-9]{64}$/.test(a?.pinHash||'')});
});

