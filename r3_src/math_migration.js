  migrate(v,digest){
   this.assertFresh();C.assert(this.profile.persistent,'請先登入及選取目標孩子');C.assert(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),'備份指紋無效');
   const old=this.state,source=root.WQFamilyCore.portableMath(v,C,this.lib).state;
   C.assert(!(old.r3MigrationDigests||[]).includes(digest),'這份舊紀錄已搬入，沒有重複加入');
   C.assert(!old.current||old.current.completed,'請先完成或結束目前數學課堂，再搬入舊紀錄');
   const n=C.clone(old),prefix='m'+digest.slice(0,16)+':';
   const idSet=new Set(n.attempts.map(a=>a.id));
   // Preserve historical grading; never recompute old attempts using a new answer key.
   const same=new Set(n.attempts.map(a=>[a.template,a.seed,a.at,JSON.stringify(a.answer)].join('|')));
   for(const a of source.attempts){const sig=[a.template,a.seed,a.at,JSON.stringify(a.answer)].join('|');if(same.has(sig))continue;const x=C.clone(a);x.id=prefix+a.id.slice(-70);C.assert(!idSet.has(x.id),'搬移作答ID衝突');idSet.add(x.id);same.add(sig);n.attempts.push(x);}
   C.assert(n.attempts.length<=5000,'合併後超過5000筆；請保留兩份備份，沒有截斷或覆蓋');n.attempts.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
   for(const tr of ['normal','olympiad'])for(const [id,m]of Object.entries(source.mastery[tr]))if(!n.mastery[tr][id]||m.last>n.mastery[tr][id].last)n.mastery[tr][id]=C.clone(m);
   for(const[id,l]of Object.entries(source.lessons))if(!n.lessons[id]||l.at>n.lessons[id].at)n.lessons[id]=C.clone(l);
   for(const[id,m]of Object.entries(source.mistakes))if(!n.mistakes[id])n.mistakes[id]=C.clone(m);
   n.cards=[...new Set([...n.cards,...source.cards])];
   const sessions=new Set(n.sessions.map(x=>[x.at,x.skill,x.track,x.attempts,x.correct].join('|')));for(const x of source.sessions){const sig=[x.at,x.skill,x.track,x.attempts,x.correct].join('|');if(!sessions.has(sig)){n.sessions.push({...C.clone(x),id:prefix+x.id.slice(-70)});sessions.add(sig);}}
   C.assert(n.sessions.length<=300,'合併後超過300節課，沒有丟棄舊紀錄；請先整理備份');n.sessions.sort((a,b)=>a.at-b.at);
   // Use the larger same-day figure because the two backups may cover overlapping time.
   for(const[d,ms]of Object.entries(source.usage))n.usage[d]=Math.max(ms,n.usage[d]||0);
   n.r3MigrationDigests=[...(n.r3MigrationDigests||[]),digest];C.assert(n.r3MigrationDigests.length<=300,'搬移收據已滿');n.current=null;
   // Current target wallet and outbox are untouched: imported rewards cannot be replayed.
   C.validateState(n,this.lib);if(this.lastRaw)localStorage.setItem(this.key+':before-restore',this.lastRaw);this.commit(n);
   return {addedAttempts:n.attempts.length-old.attempts.length,totalAttempts:n.attempts.length};
  }
