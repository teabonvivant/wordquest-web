/* R3.2 read-only device diagnostics. Never exposes names, passwords, raw answers,
 * storage keys, or backup contents in the diagnostic export. */
function r32Health(){
 let origin='unavailable';try{origin=location.origin;}catch(_){}
 const math=[];for(const child of db.children){try{const raw=localStorage.getItem(r3MathKey(child.id));if(raw){const st=JSON.parse(raw);math.push({attempts:st.attempts?.length||0,revision:st.revision??null});}}catch(_){math.push({unreadable:true});}}
 return {format:'wordquest-device-report',version:'3.2.0',createdAt:new Date().toISOString(),origin,secureContext:globalThis.isSecureContext===true,
  features:{webLocks:!!navigator.locks,webCrypto:!!crypto.subtle,indexedDB:!!window.indexedDB,serviceWorker:!!navigator.serviceWorker},
  current:{loggedIn:isLoggedIn(),writer:v23HasLease(),readOnly:!v24CanWrite(),blocked:loadBlocked,transactionBusy:r3Busy,recoveryPending:isLoggedIn()?!!localStorage.getItem(r3Marker()):false,lastSaveAt:v25LastSaveAt||null},
  counts:{children:db.children.length,englishAttempts:db.attempts.length,maths:math,mediaItems:mediaCache.size},
  artwork:{cloudIsland:'A-Feng procedural articulated rig; physics and snapshots unchanged'},
  limitations:['This is a point-in-time health report, not proof of successful browser restart or backup restoration.','No physical device, human pronunciation, OCR accuracy, or classroom assessment is certified.']};
}
function r32OpenHealth(){r3Parent();const h=r32Health();r3Dialog('裝置與保存檢查',`<p>此頁只讀取目前狀態，不會更改學員資料。</p><div class="r3-table"><table><tr><th>項目</th><th>目前狀態</th></tr><tr><td>安全網址環境</td><td>${h.secureContext?'是':'否，請用本機啟動器或 HTTPS'}</td></tr><tr><td>本分頁編輯權</td><td>${h.current.writer?'已取得':'唯讀，請關閉其他編輯分頁再取得編輯權'}</td></tr><tr><td>中斷交易</td><td>${h.current.recoveryPending?'待恢復；先不要清除資料':'沒有待恢復標記'}</td></tr><tr><td>最近一次成功保存</td><td>${h.current.lastSaveAt?new Date(h.current.lastSaveAt).toLocaleString('zh-HK'):'這次開啟尚未成功寫入'}</td></tr></table></div><p class="notice">下面的本機驗收頁只使用獨立測試資料。API測試通過，不等於所有學員資料已成功備份或還原。</p><p><a class="btn secondary" href="device-check.html" target="_blank" rel="noopener">開啟本機驗收頁</a> <a class="btn secondary" href="afeng-animation.html" target="_blank" rel="noopener">查看阿峰動作</a></p><button class="btn secondary" data-r32="report">匯出無姓名的裝置報告</button>`);}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-r32]');if(!b)return;e.preventDefault();try{if(b.dataset.r32==='health')r32OpenHealth();if(b.dataset.r32==='report'){r3Parent();r3Download('WordQuest_Device_R32.json',r32Health());}}catch(err){toast(err.message,'bad');}});
window.WQR32=Object.freeze({version:'3.2.0',inspect:r32Health});
