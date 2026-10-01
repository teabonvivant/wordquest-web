/* V32 + Maths 0.1.2 integration R1. Insert INSIDE the English application closure.
 * No account registry, password hashes or mutable English database is exported.
 * Browser-local coordination is not server authentication or anti-cheat.
 */
(function installMathHost(){
  const root=window, clone=x=>JSON.parse(JSON.stringify(x));
  const C=()=>root.WQMathCore;
  const scope=()=>accountId()+':'+activeChild()?.id;
  function profile(){
    const ch=activeChild();
    if(!ch||!C()?.safeId(ch.id))throw Error('目前的孩子資料無法讀取。');
    return {id:ch.id,name:ch.name,grade:ch.grade,account:accountId()||'guest',persistent:isLoggedIn(),balance:ch.stars||0};
  }
  function assertWritable(){
    if(!isLoggedIn())return;
    if(loadBlocked)throw Error('英文原有資料未能讀取；數學亦已停止寫入，沒有覆蓋原檔。');
    if(!v23HasLease())throw Error('這個分頁沒有編輯權。請返回英文取得編輯權，再繼續數學。');
    arReadLatest();
  }
  function beforeOpen(){
    const route=(location.hash||'#kid').slice(1).split('?')[0];
    if(['learn','learning','assembly-learn','family-lesson','phonics-lesson','range-new'].includes(route))
      throw Error('請先暫停英文練習或保存匯入內容，返回首頁後再開啟數學。');
    if(a28Active()||pgPlaying||(pgGame&&!pgGame.done)||miniGame&&!miniGame.ended||arEngine&&!arEngine.paused)
      throw Error('請先結束目前的街機或小遊戲，再開啟數學；沒有扣除新的金幣。');
    if(isLoggedIn())assertWritable();
    stopSpeech();fgResetAudio();pcStop();
  }
  function award(request,expected){
    const p=profile();if(!p.persistent)return 0;
    if(p.account+':'+p.id!==expected)throw Error('孩子或帳戶已切換；沒有發放獎勵。');
    assertWritable();
    // Only settle an event already committed to the active child's sidecar.
    const raw=localStorage.getItem('wqm-state-v1:'+expected);
    if(!raw)throw Error('沒有已保存的數學獎勵紀錄。');
    const state=C().validateState(JSON.parse(raw),C().library(root.WQMathData));
    const e=state.outbox.find(x=>x.id===request?.id);
    if(!e)throw Error('找不到這項已保存的數學任務。');
    for(const k of ['key','day','startedAt','completedAt','valid'])if(e[k]!==request[k])throw Error('獎勵資料與已保存任務不一致。');
    if(e.settled)return 0;
    if(C().hkDay(e.completedAt)!==e.day||e.completedAt>Date.now()+5000||Date.now()-e.completedAt>7*86400000)
      throw Error('獎勵日期不在可自動同步的範圍；請保留數學備份。');
    const before=clone(db);
    try{
      a28Root();const child=db.children.find(c=>c.id===p.id);
      const result=COIN28.task(db.arcadeV28.children[p.id],child.stars,
        {key:'math:'+e.key,day:e.day,startedAt:e.startedAt,completedAt:e.completedAt,valid:e.valid===true});
      child.stars=result.balance;
      if(save()!==true)throw Error('英文錢包未能儲存；沒有完成這次結算。');
      return result.award;
    }catch(err){db=before;throw err;}
  }
  // Remove the math sidecar AND its pre-restore copy when the corresponding
  // English child is deleted. Cancel the English write if cleanup fails.
  const priorSave=save;
  save=function(){
    let copies=[];
    try{
      if(isLoggedIn()){
        const raw=localStorage.getItem(dbKey()),old=raw?JSON.parse(raw):null;
        const removed=(old?.children||[]).filter(c=>!db.children.some(n=>n.id===c.id));
        for(const ch of removed){
          const key='wqm-state-v1:'+accountId()+':'+ch.id;
          for(const k of [key,key+':before-restore'])copies.push([k,localStorage.getItem(k)]);
        }
        if(copies.length)assertWritable();
        for(const[k]of copies)localStorage.removeItem(k);
      }
      if(priorSave()===true)return true;
    }catch(err){persistenceIssue='沒有完成儲存或刪除：'+err.message;showSaveIssue();}
    for(const[k,v]of copies)try{if(v!==null)localStorage.setItem(k,v);}catch(err){persistenceIssue='刪除復原未完成，請保留本頁並匯出備份。'+err.message;showSaveIssue();}
    return false;
  };
  root.WQMathHost=Object.freeze({apiVersion:1,version:'V32-M0.1.2-R1',mode:'wordquest',profile,award,beforeOpen,assertWritable,
    parentAllowed:()=>!isLoggedIn()||v23ParentAllowed(),
    openParentGate(){go('parent');render();toast('先完成英文家長驗證，再按「數學進度及設定」。');},
    afterClose(){render();}
  });
  function summary(){
    const p=profile();if(!p.persistent)return '試玩不儲存進度或金幣。';
    const raw=localStorage.getItem('wqm-state-v1:'+p.account+':'+p.id);
    if(!raw)return '數學尚未有作答紀錄。';
    const s=C().validateState(JSON.parse(raw),C().library(root.WQMathData));
    const n=s.attempts.filter(a=>a.track==='normal').length,o=s.attempts.filter(a=>a.track==='olympiad').length;
    return '普通數學 '+n+' 次作答 · 奧數 '+o+' 次作答。兩條路線分開記錄。';
  }
  function decorate(){
    const rt=(location.hash||'#kid').slice(1).split('?')[0],app=$('#app');if(!app)return;
    const badge=$('#v25-build-badge');if(badge)badge.textContent='V32＋數學 0.1.2 · 整合 R1';
    if(rt==='kid'&&!$('#wq-subjects')){
      const box=document.createElement('section');box.id='wq-subjects';box.className='card pad wq-subjects';box.setAttribute('aria-label','選擇學科');
      box.innerHTML='<div><p class="eyebrow">選擇今天的學習</p><h2>英文與數學，同一個學習帳戶</h2><p class="muted">英文練習在下方。數學與奧數共用孩子及金幣，學習進度分開保存。</p></div><div class="row"><button class="btn primary" type="button" data-wqm-open="normal">普通數學</button><button class="btn secondary" type="button" data-wqm-open="olympiad">奧數思維</button><button class="btn soft" type="button" data-wqm-open="home">數學學習主頁</button></div>';
      app.prepend(box);
    }
    if(['parent','report'].includes(rt)&&(!isLoggedIn()||v23ParentAllowed())&&!$('#wq-maths-parent')){
      const box=document.createElement('section');box.className='card pad';box.id='wq-maths-parent';
      const h=document.createElement('h2');h.textContent='數學與奧數進度';const p=document.createElement('p');
      try{p.textContent=summary();}catch(e){p.textContent='數學資料未能讀取；沒有覆蓋原檔。'+e.message;}
      const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.wqmOpen='parent';b.textContent='數學進度及設定';box.append(h,p,b);app.append(box);
    }
  }
  const priorRender=render;render=function(){const result=priorRender.apply(this,arguments);decorate();return result;};
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-wqm-open]');if(!b)return;e.preventDefault();
    if(!root.WQMathApp?.open){toast('數學尚未完成載入，請重新開啟完整檔案。','bad');return;}
    try{root.WQMathApp.open(b.dataset.wqmOpen);}catch(err){toast(err.message,'bad');}
  });
  const priorDiagnostics=v25Diagnostics;v25Diagnostics=function(){return {...priorDiagnostics(),integrationVersion:'V32-M0.1.2-R1',mathBaseVersion:'0.1.2',mathHostBridge:1};};
})();
