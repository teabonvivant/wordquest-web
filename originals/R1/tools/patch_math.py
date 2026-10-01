"""Small, documented R1 corrections to the recovered Maths 0.1.2 source."""
def patch_math(s):
 def once(old,new):
  nonlocal s
  if s.count(old)!=1:raise ValueError(f'Math patch anchor not unique: {old[:90]}')
  s=s.replace(old,new,1)
 # A missing question queue must be rejected, not resumed as an empty lesson.
 once("if(ss.example)templateRef(ss.example,ss.skill,ss.track);if(ss.queues[ss.stage])", """const requiresQuestion=ss.mode==='lesson'?(ss.track==='normal'?[3,4].includes(ss.stage):[0,3].includes(ss.stage)):ss.stage===4;
      if(!ss.completed&&requiresQuestion)assert(Array.isArray(ss.queues[ss.stage])&&ss.queues[ss.stage].length>0,'這個課堂步驟缺少題目；已停止恢復，沒有覆蓋原資料');
      if(ss.example)templateRef(ss.example,ss.skill,ss.track);if(ss.queues[ss.stage])""")
 # In standalone recovery only, permit ephemeral guest practice without changing
 # the damaged registry. All add/switch/remove operations still validate it.
 once("mode:'standalone',profile(){const r=registry();const c=r.children.find(c=>c.id===r.active);", """mode:'standalone',profile(){let r;try{r=registry();}catch(e){return {id:'guest',account:'guest',name:'資料恢復試玩',grade:3,persistent:false,recoveryError:'原有孩子名單未能讀取，沒有重設或覆蓋。暫以訪客試玩，不儲存新進度。'+e.message};}const c=r.children.find(c=>c.id===r.active);""")
 once("children(){return registry().children;}","children(){try{return registry().children;}catch(_){return [];}}")
 once("function initStore(){store=new S.Store(bridge,L);", """function initStore(){const p=bridge.profile();
  if(!(root.WQM_INTEGRATED&&!p.persistent&&store&&!store.profile.persistent&&store.scope===p.account+':'+p.id))store=new S.Store(bridge,L);""")
 once("ui.error=store.error||'';", "ui.error=store.error||store.profile.recoveryError||'';")
 once("${content}<footer", "${content}<footer") if False else None
 # Give recovery users a raw registry export, not an invented replacement family.
 once("${store.state.upgradeNotice?", "${store.profile.recoveryError?btn('匯出原有孩子名單（不修改）','export-registry','quiet'):''}${store.state.upgradeNotice?")
 once("case 'export':if(store.readOnly)", "case 'export-registry':download('WordQuest_registry_recovery.txt',localStorage.getItem('wqm-profiles-v1')||'沒有可讀的原始名單','text/plain');break;\n    case 'export':if(store.readOnly)")
 # A failed save must not trap the parent forever inside the modal. The explicit
 # confirmation warns that the current draft cannot be promised as persisted.
 once("function close(){tickUsage();try{preserveWork(true);}catch(e){fail(e);return;}", "function close(){tickUsage();try{preserveWork(true);}catch(e){fail(e);if(!confirm('草稿未能儲存。取消會保留目前畫面；確定則返回英文，未保存的草稿可能遺失。'))return false;}")
 once("bridge.afterClose?.();launch?.focus();}activeSince=Date.now();}", "bridge.afterClose?.();launch?.focus();}activeSince=Date.now();return true;}")
 once("preserveWork(true);close();bridge.openParentGate?.();return;", "if(close()!==false)bridge.openParentGate?.();return;")
 # Keep a keyboard user on the new feedback instead of dropping focus to body.
 once("sound(result.correct);render();if(fastPause)","sound(result.correct);render();const feedbackNode=app.querySelector('.feedback');if(feedbackNode){feedbackNode.tabIndex=-1;feedbackNode.focus({preventScroll:true});}if(fastPause)")
 return s
