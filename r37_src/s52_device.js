/* ===== R3.15 s52: 記住這部裝置 =====================================================================================
 * The sign-in lives in sessionStorage (one tab). With the tick on, the account id is also kept in localStorage; a new tab, a phone
 * that was closed or a home-screen shortcut starts signed in again when that account still exists (WQ52_DEV is read before the
 * first db load, see s52_device.py). The parent unlock is never restored. 登出 clears both. The test Admin is never written. */
let s52Pref=true;
function s52Inject(){
 if(WQ_TEST_MODE||isLoggedIn())return;
 for(const [act,id] of [['login-submit','s52-rem-login'],['register-submit','s52-rem-reg']]){
  const b=document.querySelector(`#app [data-act="${act}"]`);
  if(!b||document.getElementById(id))continue;
  const row=document.createElement('label');
  row.className='s52-rem';row.htmlFor=id;
  row.innerHTML=`<input type="checkbox" id="${id}"${s52Pref?' checked':''}><span>記住這部裝置</span><small>共用裝置請取消</small>`;
  (b.closest('.p10-submit')||b).before(row);
 }
}
document.addEventListener('change',e=>{if(e.target&&/^s52-rem-/.test(e.target.id||''))s52Pref=e.target.checked;});
const s52PriorRender=render;
render=function(){
 const r=s52PriorRender.apply(this,arguments);
 try{s52Inject();}catch(e){try{console.warn('s52',e);}catch(_){}}
 return r;
};
async function s52Auth(fn,self,args,id){
 const cb=document.getElementById(id),keep=cb?cb.checked:null,was=accountId();    // the form is gone once the host re-renders
 const r=await fn.apply(self,args);
 try{
  const now=accountId();
  if(keep!==null&&now&&now!==was&&!isTestAdmin()){
   if(keep)localStorage.setItem(WQ52_DEV,now);else localStorage.removeItem(WQ52_DEV);
  }
 }catch(_){}
 return r;
}
const s52PriorLogin=loginAccount;
loginAccount=async function(){return s52Auth(s52PriorLogin,this,arguments,'s52-rem-login');};
const s52PriorRegister=registerAccount;
registerAccount=async function(){return s52Auth(s52PriorRegister,this,arguments,'s52-rem-reg');};
const s52PriorLogout=logout;
logout=function(){
 const id=accountId();
 const r=s52PriorLogout.apply(this,arguments);
 try{if(id&&!accountId()){s52Pref=true;if(localStorage.getItem(WQ52_DEV)===id)localStorage.removeItem(WQ52_DEV);}}catch(_){}
 return r;
};
