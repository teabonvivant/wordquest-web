/* R3.6 q10 - brand, footer, bottom navigation, admin entry. Runs inside the app closure (host code). */
const Q36_TITLE='學霸星球 SmartQuest Planet';
const Q36_FOOT=Q36_TITLE+(WQ_TEST_MODE?' · 測試專用。請不要放入真實孩子的資料。':' · 學習紀錄只存在這部裝置。');
window.WQ36Home=function(){try{if(lastRoute!=='kid'){go('kid');render();}}catch(_){}};
function q36Chrome(){
 const f=$('.footer');if(f&&f.textContent!==Q36_FOOT)f.textContent=Q36_FOOT;
 if(document.title!==Q36_TITLE)document.title=Q36_TITLE;
 // bottom navigation: an 奧數 item beside 數學; both open the maths dialog in their own scope
 const nav=$('#wq29-nav');
 if(nav){
  const m=nav.querySelector('[data-wqm-open]');
  if(m&&!nav.querySelector('.q36-nav-oly')){const o=m.cloneNode(false);o.classList.add('q36-nav-oly');o.dataset.wqmOpen='olympiad';o.textContent='奧數';m.after(o);}
 }
 // admin entry: one visible link on the normal log-in page (file:// and localhost only); the test area has its own login card
 if(lastRoute==='login'&&!isLoggedIn()&&WQ_LOCAL_TEST_ALLOWED&&!WQ_TEST_MODE&&!$('#q36-admin-entry')&&$('#app')){
  const box=document.createElement('section');box.id='q36-admin-entry';box.className='card pad';
  box.innerHTML='<h2>測試入口 · Admin</h2><p>用 Admin 帳戶試玩全部功能：所有遊戲免費，所有課堂都開放。只在這部電腦或手機的檔案上使用。</p><a class="btn secondary full" data-q36="admin-link" href="'+esc(wq29ModeURL(true))+'">進入 Admin 測試</a>';
  $('#app').append(box);
 }
}
const q36PriorRender=render;
render=function(){const out=q36PriorRender.apply(this,arguments);try{q36Chrome();}catch(err){console.error('R3.6 chrome:',err);}return out;};
