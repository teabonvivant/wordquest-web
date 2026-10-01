/* Separate subject storage + existing WordQuest wallet bridge.
   The math sidecar avoids data loss in the old whitelist-based validateDb(). */
(function(root){'use strict';
 const C=root.WQMathCore, REG='wqm-profiles-v1';
 function uid(){return 'm'+(root.crypto?.randomUUID?.().replace(/-/g,'')||Date.now().toString(36)+Math.random().toString(36).slice(2));}
 function createHostBridge(){
  if(root.WQMathHost?.apiVersion===1)return root.WQMathHost;
  try {
   if(typeof activeChild!=='function'||typeof accountId!=='function'||typeof isLoggedIn!=='function'||typeof save!=='function'||typeof db==='undefined'||typeof root.WQArcade28?.task!=='function')return null;
   return {
    mode:'wordquest',
    profile(){const c=activeChild();if(!c||!C.safeId(c.id))throw Error('英文程式的孩子資料未能讀取');return {id:c.id,name:c.name,grade:c.grade,account:accountId()||'guest',persistent:isLoggedIn(),balance:c.stars||0};},
    award(e,expected){
      const p=this.profile();if(!p.persistent)return 0;
      if(p.account+':'+p.id!==expected)throw Error('孩子或帳戶已切換；沒有發放獎勵');
      if(C.hkDay(e.completedAt)!==e.day || Date.now()-e.completedAt>7*86400000)throw Error('獎勵超過自動同步時限；請家長檢查');
      if(typeof loadBlocked!=='undefined'&&loadBlocked)throw Error('英文儲存已暫停；沒有更改錢包');
      const before=C.clone(db);
      try {
       root.WQArcade28.migrate(db);
       const wallet=db.arcadeV28.children[p.id];if(!wallet)throw Error('找不到英文錢包');
       const ch=db.children.find(c=>c.id===p.id);
       const result=root.WQArcade28.task(wallet,ch.stars,{key:'math:'+e.key,day:e.day,startedAt:e.startedAt,completedAt:e.completedAt,valid:e.valid===true});
       ch.stars=result.balance;
       if(save()!==true)throw Error('英文錢包未儲存，已取消這次結算');
       return result.award;
      }catch(err){db=before;throw err;}
    },
    beforeOpen(){const r=db.arcadeV28?.children?.[activeChild()?.id]?.run;if(r&&!['finished','refunded'].includes(r.phase))throw Error('請先完成或結束正在進行的英文街機，再開啟數學。');if(typeof miniGame!=='undefined'&&miniGame&&!miniGame.ended)throw Error('請先結束目前的小遊戲，再開啟數學。');if(typeof stopSpeech==='function')stopSpeech();},
    afterClose(){try{if(typeof render==='function')render();}catch(_){}},
   };
  }catch(_){return null;}
 }
 function registry(){const raw=localStorage.getItem(REG);if(!raw)return {v:1,active:'',children:[]};const r=JSON.parse(raw);if(!r||r.v!==1||!Array.isArray(r.children)||r.children.length>20||typeof r.active!=='string')throw Error('本機孩子名單損壞；請保留備份');const seen=new Set();for(const c of r.children){if(!c||!C.safeId(c.id)||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>24||![1,2,3,4,5,6].includes(c.grade))throw Error('孩子名單格式無效或有重複 ID');seen.add(c.id);}if(r.active!==''&&!seen.has(r.active))throw Error('目前學員 ID 不在名單內；請保留備份');return r;}

 function standalone(){let memoryRegistry=null;return {
  mode:'standalone',profile(){let r;try{r=registry();}catch(e){return {id:'guest',account:'guest',name:'資料恢復試玩',grade:3,persistent:false,recoveryError:'原有孩子名單未能讀取，沒有重設或覆蓋。暫以訪客試玩，不儲存新進度。'+e.message};}const c=r.children.find(c=>c.id===r.active);return c?{...c,account:'local-family',persistent:true}: {id:'guest',account:'guest',name:'試玩學員',grade:3,persistent:false};},
  children(){try{return registry().children;}catch(_){return [];}},
  add(name,grade,consent){name=String(name).trim();if(!consent||!name||name.length>24||![1,2,3,4,5,6].includes(grade))throw Error('請由家長確認，填寫暱稱及年級');const r=registry();if(r.children.length>=20)throw Error('本機最多 20 個學習檔案');const c={id:uid(),name,grade};r.children.push(c);r.active=c.id;localStorage.setItem(REG,JSON.stringify(r));return c;},
  switch(id){const r=registry();if(!r.children.some(c=>c.id===id))throw Error('孩子不存在');r.active=id;localStorage.setItem(REG,JSON.stringify(r));},
  guest(){const r=registry();r.active='';localStorage.setItem(REG,JSON.stringify(r));},
  remove(){const p=this.profile();if(!p.persistent)throw Error('沒有可刪除的學員');const r=registry(),before=localStorage.getItem(REG),key='wqm-state-v1:'+p.account+':'+p.id;const keys=[key,key+':before-restore'],copies=keys.map(k=>localStorage.getItem(k));r.children=r.children.filter(c=>c.id!==p.id);r.active=r.children[0]?.id||'';
   // Persist the registry first: a quota failure must not erase the child's progress.
   localStorage.setItem(REG,JSON.stringify(r));try{keys.forEach(k=>localStorage.removeItem(k));}catch(e){try{keys.forEach((k,i)=>{if(copies[i]!==null)localStorage.setItem(k,copies[i]);});if(before!==null)localStorage.setItem(REG,before);}catch(_){}throw Error('刪除未完成，請保留備份並檢查瀏覽器儲存。'+e.message);}},
 };
 }
 class Store{
  constructor(bridge,lib){this.bridge=bridge;this.lib=lib;this.profile=bridge.profile();this.scope=this.profile.account+':'+this.profile.id;this.key='wqm-state-v1:'+this.scope;this.readOnly=false;this.lastRaw=null;
   try {this.lastRaw=this.profile.persistent?localStorage.getItem(this.key):null;this.state=this.lastRaw?C.validateState(JSON.parse(this.lastRaw),lib):C.blank();}
   catch(e){this.readOnly=true;this.state=C.blank();this.error='原有資料未能讀取；已停止儲存，沒有覆蓋原檔。'+e.message;}
  }
  check(){this.bridge.assertWritable?.();const p=this.bridge.profile();if(p.account+':'+p.id!==this.scope)throw Error('帳戶或孩子已切換，請重新開啟數學');if(this.readOnly)throw Error(this.error);}
  assertFresh(){this.check();if(this.profile.persistent&&localStorage.getItem(this.key)!==this.lastRaw)throw Error('另一個分頁更新了進度。為免覆蓋，請重新開啟本頁。');}
  commit(next){this.assertFresh();next.revision=this.state.revision+1;next=C.validateState(next,this.lib);if(!this.profile.persistent){this.state=next;return;}
   const text=JSON.stringify(next);localStorage.setItem(this.key,text);this.lastRaw=text;this.state=next;
  }
  change(fn){const n=C.clone(this.state);const result=fn(n);this.commit(n);return result;}
  flush(){if(!this.profile.persistent)return 0;let total=0;
   // A persisted outbox first, then idempotent wallet task, then receipt acknowledgement.
   for(const e of this.state.outbox.filter(e=>!e.settled)){
    this.assertFresh();let award=0;
    if(this.bridge.mode==='wordquest')award=this.bridge.award(e,this.scope);
    this.change(n=>{const found=n.outbox.find(x=>x.id===e.id);if(this.bridge.mode==='standalone')award=C.standaloneAward(n,e);found.settled=true;found.award=award;});total+=award;
   }return total;
  }
  export(){return {format:'wordquest-maths',version:1,owner:this.scope,profile:{id:this.profile.id,name:this.profile.name,grade:this.profile.grade},exportedAt:new Date().toISOString(),state:C.clone(this.state)};}
  import(v){this.check();if(!v||v.format!=='wordquest-maths'||v.version!==1||v.owner!==this.scope)throw Error('不是目前孩子的數學備份；沒有更改原資料');const n=C.validateState(v.state,this.lib);n.outbox.forEach(e=>e.settled=true);n.current=null;
   if(this.lastRaw)localStorage.setItem(this.key+':before-restore',this.lastRaw);this.commit(n);}
  balance(){return this.bridge.mode==='wordquest'?this.bridge.profile().balance:this.state.wallet.balance;}
 }
 root.WQMathStorage=Object.freeze({Store,createHostBridge,standalone,uid});
})(globalThis);
