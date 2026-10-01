"""Real Chromium DOM. Memory storage, Web Locks and WebCrypto adapters are
explicit test substitutes because this environment blocks file/HTTP navigation.
No browser navigation or native persistence is certified by these tests.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'app/index.html').read_text()
SHIMS=r'''(initial)=>{
 const make=(data)=>{const m=new Map(Object.entries(data||{}));return {getItem(k){if(window.__failGet===k||window.__failGet==='*')throw Error('SecurityError(test)');return m.has(String(k))?m.get(String(k)):null},setItem(k,v){if(window.__failSet===k||window.__failSet==='*')throw Error('QuotaExceededError(test)');m.set(String(k),String(v))},removeItem(k){if(window.__failRemove===k)throw Error('SecurityError(test)');m.delete(String(k))},clear(){m.clear()},key(i){return [...m.keys()][i]??null},get length(){return m.size},dump(){return Object.fromEntries(m)}}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:make(initial.local)});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:make(initial.session)});
 const held=new Map();window.__lockDenied=false;
 Object.defineProperty(navigator,'locks',{configurable:true,value:{
  request:async function(name,opt,cb){if(typeof opt==='function'){cb=opt;opt={}};
   if(window.__lockDenied)return cb(null);
   if(held.has(name)){if(opt.ifAvailable)return cb(null);await held.get(name)}
   let release;const p=new Promise(r=>release=r);held.set(name,p);
   try{return await cb({name,mode:'exclusive'})}finally{held.delete(name);release()}
  },query:async()=>({held:[...held.keys()].map(name=>({name,mode:'exclusive'})),pending:[]})
 }});
 Object.defineProperty(crypto,'subtle',{configurable:true,value:{
  importKey:async (format,raw,algorithm,extractable,usage)=>({raw:Array.from(new Uint8Array(raw))}),
  deriveBits:async (alg,key,length)=>new Uint8Array(await window.__pbkdf(key.raw,Array.from(alg.salt),alg.iterations,length)).buffer,
  digest:async (alg,raw)=>new Uint8Array(await window.__digest(Array.from(new Uint8Array(raw)))).buffer
 }});
}'''
def boot(browser,width=1280,initial=None):
 ctx=browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
 page=ctx.new_page();page.set_default_timeout(5000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.expose_function('__pbkdf',lambda password,salt,iterations,length:list(hashlib.pbkdf2_hmac('sha256',bytes(password),bytes(salt),iterations,dklen=length//8)))
 page.expose_function('__digest',lambda raw:list(hashlib.sha256(bytes(raw)).digest()))
 page.evaluate(SHIMS,initial or {})
 # Disable external resource requests; all content under test is the local HTML.
 page.route('**/*',lambda route:route.abort())
 page.set_content(HTML,wait_until='load');page.wait_for_timeout(150)
 return ctx,page,errors,dialogs

def register(page,name='r1-test',child='整合測試學員'):
 page.evaluate("location.hash='#login'");page.wait_for_selector('#register-name')
 page.locator('#register-name').fill(name);page.locator('#register-child').fill(child);page.locator('#register-pin').fill('R1testPass99')
 page.locator('[data-act="register-submit"]').click()
 page.wait_for_function("!!sessionStorage.getItem('wordquest-v10-current-account')")
 page.wait_for_timeout(150)
 return page.evaluate('WQMathHost.profile()')

def state_snapshot(page):
 return page.evaluate('({local:localStorage.dump(),session:sessionStorage.dump()})')
