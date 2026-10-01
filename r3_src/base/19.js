
/* WordQuest Arcade 28 — bounded, deterministic local transaction rules.
 * No random rewards, paid currencies, network calls, or wall-clock play limit.
 * This module is NOT a server authority. The device owner can edit local data.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WQArcade28 = api;
})(globalThis, function () {
  'use strict';
  const VERSION = '28.0.0+arcade-r2';
  const MAX_BALANCE = 1000000;
  const ids = ['sky-rescue','forest-dash','moon-bells','bounce-basket','number-garden','forest-band',
    'drift-path','meadow-cricket','honey-delivery','color-workshop','forest-pong','juice-lines',
    'honeycomb-puzzle','valley-race','rolling-block','block-studio','star-rhythm','color-orbit',
    'garden-paths','little-engineer','sweet-studio','ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley'];
  const words = [0,0,0,0,0,0,5,5,5,5,15,15,15,30,30,30,30,50,50,50,50,0,0,5,5,0];
  const legacy = {'forest-dash':'cloud-run','sweet-studio':'forest-freezer'};
  const catalog = ids.map((id,i)=>Object.freeze({id,words:words[i],legacy:legacy[id]||id}));
  const banned = new Set(['__proto__','prototype','constructor']);
  function assert(test, why) { if (!test) throw new Error(why); }
  function integer(n,lo=0,hi=MAX_BALANCE) { assert(Number.isSafeInteger(n)&&n>=lo&&n<=hi,'金幣資料整數無效');return n; }
  function str(s,n=160) { assert(typeof s==='string'&&s.length<=n&&!/[\u0000-\u001f]/.test(s),'金幣資料文字無效');return s; }
  function id(s) { str(s,100);assert(/^[\w-]{1,100}$/.test(s)&&!banned.has(s),'紀錄識別碼無效');return s; }
  function object(v) { assert(v&&typeof v==='object'&&!Array.isArray(v),'金幣資料物件無效');for(const k of Object.keys(v))assert(!banned.has(k),'金幣資料保留鍵');return v; }
  function date(s) { str(s,10);assert(/^\d{4}-\d{2}-\d{2}$/.test(s),'學習日期無效');const d=new Date(s+'T00:00:00Z');assert(Number.isFinite(+d)&&d.toISOString().slice(0,10)===s,'學習日期不存在');return s; }
  const clone = v=>JSON.parse(JSON.stringify(v));
  function child() { return {batch:{number:1,used:0,lastSpentAt:0},days:{},ledger:[],run:null,
    paused:false,permissions:{},selectedSkin:'classic',bests:{},migration:{original:0,returned:0,due:0,at:0}}; }
  function initial(children=[]) { const c={};for(const x of children)c[x.id]=child();return {v:28,children:c}; }
  function log(c,event) {
    c.ledger.push(event);
    // Retain the live admission receipt even across a long learning history.
    const live=c.run&&!['finished','refunded'].includes(c.run.phase)?c.run.id:null;
    while(c.ledger.length>120){const i=c.ledger.findIndex(e=>e.id!==live);c.ledger.splice(i<0?0:i,1);}
  }
  function game(id) { const g=catalog.find(g=>g.id===id);assert(g,'沒有這部街機');return g; }
  function allowed(c,id,qualified,override={},test=false) {
    const g=game(id),rule=c.permissions?.[id]||override[g.legacy]||override[id];
    return test||(!c.paused&&rule!=='blocked'&&(rule==='open'||qualified>=g.words));
  }
  function migrate(db,now=Date.now()) {
    if (db.arcadeV28) return db.arcadeV28;
    const root=initial(db.children);
    for (const ch of db.children) {
      const c=root.children[ch.id],balance=integer(ch.stars||0),p=db.playgroundV22?.children?.[ch.id];
      let credit=0;
      const t=p?.ticket;
      if(t&&!t.refunded&&t.remainingMs>0&&t.durationMs>0)
        credit+=Math.ceil(t.cost>0?t.cost*t.remainingMs/t.durationMs:t.remainingMs/90000);
      const old=db.arcade?.active?.[ch.id];
      if(old&&!old.testOnly&&old.status==='open'&&old.remainingMs>0&&old.durationMs>0)
        credit+=Math.ceil(old.cost>0?old.cost*old.remainingMs/old.durationMs:old.remainingMs/90000);
      integer(credit,0,10000);
      const converted=Math.min(credit,MAX_BALANCE-balance);
      ch.stars=balance+converted;
      c.migration={original:balance,returned:converted,due:credit-converted,at:integer(now,0,1e15)};
      if(balance||credit)log(c,{id:'migration_once',kind:'migration',amount:converted,at:now,note:'舊星星一比一保留；未用票一次轉換'});
    }
    db.arcadeV28=root;
    return root;
  }
  function settleDue(c,balance) {
    integer(balance);const n=Math.min(c.migration.due,MAX_BALANCE-balance);
    c.migration.due-=n;c.migration.returned+=n;return balance+n;
  }
  function purchase(c,balance,{id:receipt,game:gid,difficulty=1,now=Date.now(),qualified=0,override={},seed=1}) {
    integer(balance);id(receipt);assert(receipt.length<=80,'投幣識別碼過長');game(gid);integer(difficulty,0,2);integer(seed,0,0xffffffff);integer(now,0,1e15);
    assert(allowed(c,gid,qualified,override),'尚未解鎖，或家長已暫停這部街機');
    assert(!c.run||['finished','refunded'].includes(c.run.phase),'請先繼續或結束尚未完成的一局');
    assert(!c.ledger.some(x=>x.id===receipt),'這次投幣已經處理');
    assert(c.batch.used<5,'這一輪已投五幣；完成下一輪有效學習，或請家長開放');
    assert(balance>=1,'金幣不足；尚未扣幣');
    c.batch.used++;c.batch.lastSpentAt=now;
    c.run={id:receipt,game:gid,difficulty,seed,phase:'ready',started:false,lives:3,stage:1,
      snapshot:null,score:0,elapsedMs:0,createdAt:now,error:'',result:'',success:false};
    log(c,{id:receipt,kind:'spend',amount:-1,at:now,note:gid});
    return balance-1;
  }
  function start(c) { const r=c.run;assert(r&&['ready','paused'].includes(r.phase),'這一局不能開始');r.started=true;r.phase='playing';return r; }
  function pause(c) { if(c.run?.phase==='playing')c.run.phase='paused'; }
  function refund(c,balance,receipt,now=Date.now()) {
    integer(balance);const r=c.run;assert(r&&r.id===receipt&&!r.started&&['ready','paused','error'].includes(r.phase),'只有完全未開始的一局可以取消');
    assert(c.ledger.some(e=>e.id===receipt&&e.kind==='spend'),'找不到原投幣紀錄');
    assert(balance<MAX_BALANCE,'錢包已滿，取消尚未完成');
    r.phase='refunded';r.snapshot=null;c.batch.used=Math.max(0,c.batch.used-1);
    log(c,{id:'refund_'+receipt,kind:'refund',amount:1,at:now,note:'取消完全未玩的局'});
    return balance+1;
  }
  function close(c,reason='自行結束') { if(c.run&&!['finished','refunded'].includes(c.run.phase)){c.run.phase='finished';c.run.result=str(reason,240);c.run.snapshot=null;} }
  function day(c,key) {
    date(key);for(const k of Object.keys(c.days).sort().slice(0,-89))delete c.days[k];
    return c.days[key]||(c.days[key]={keys:[],blocks:0,bonus:false,earned:0});
  }
  // One complete distinct activity earns one coin, for the first four per day.
  // The third completed activity gives a fixed +1 daily bonus. Errors do NOT earn extra.
  // A content signature, not a security MAC. Reimported copies must not earn twice.
  function activityKey(prefix,terms) {
    str(prefix,40);assert(Array.isArray(terms)&&terms.length<=2000,'學習項目清單無效');
    const values=[...new Set(terms.map(t=>String(t).normalize('NFKC').replace(/[’‘]/g,"'").trim().replace(/\s+/g,' ').toLowerCase()))].sort();
    const full=prefix+':'+JSON.stringify(values);
    if(full.length<=480)return full;
    let a=2166136261,b=3339675911;
    for(let i=0;i<full.length;i++){const c=full.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=Math.imul(b^c,2246822519)>>>0;}
    return prefix+':content:'+values.length+':'+full.length+':'+a.toString(16)+':'+b.toString(16);
  }
  function task(c,balance,{key,day:dayKey,startedAt,completedAt=Date.now(),valid=false}) {
    integer(balance);str(key,500);integer(startedAt,0,1e15);integer(completedAt,startedAt,1e15);
    if(!valid||!key)return {balance,award:0,duplicate:false,reset:false};
    const d=day(c,dayKey);
    if(d.keys.includes(key))return {balance,award:0,duplicate:true,reset:false};
    assert(d.keys.length<128,'今日有效任務紀錄已滿；未改動金幣');
    d.keys.push(key);
    let award=0;
    if(d.blocks<4){d.blocks++;award=1;if(d.blocks===3&&!d.bonus){award++;d.bonus=true;}}
    award=Math.min(award,MAX_BALANCE-balance);d.earned+=award;
    let reset=false;
    if(c.batch.used>=5&&startedAt>c.batch.lastSpentAt){c.batch={number:c.batch.number+1,used:0,lastSpentAt:0};reset=true;}
    if(award||reset)log(c,{id:'learn_'+completedAt+'_'+d.keys.length,kind:'learn',amount:award,at:completedAt,note:reset?'完成新任務，開放下一輪':'完成學習任務'});
    return {balance:balance+award,award,duplicate:false,reset};
  }
  function parentReset(c,now=Date.now()) {
    assert(!c.run||['finished','refunded'].includes(c.run.phase),'先完成目前的一局，再開下一輪');
    c.batch={number:c.batch.number+1,used:0,lastSpentAt:0};
    log(c,{id:'parent_'+now,kind:'parent',amount:0,at:now,note:'家長開放下一輪'});
  }
  function validate(raw,children,verifySnapshot) {
    if(raw==null)return null;
    object(raw);assert(raw.v===28,'金幣資料版本不支援');object(raw.children);
    assert(Object.keys(raw.children).length<=50,'金幣孩子上限');
    const out=initial(children);
    for(const childProfile of children) {
      const cid=childProfile.id,v=raw.children[cid];if(!v)continue;object(v);const c=child();
      object(v.batch);c.batch={number:integer(v.batch.number,1,1e9),used:integer(v.batch.used,0,5),lastSpentAt:integer(v.batch.lastSpentAt,0,1e15)};
      assert(typeof v.paused==='boolean','街機開放設定無效');c.paused=v.paused;
      object(v.permissions||{});for(const[k,val]of Object.entries(v.permissions||{})){assert(ids.includes(k)&&['open','blocked'].includes(val),'街機權限無效');c.permissions[k]=val;}
      assert(['classic','sunset','moonlight'].includes(v.selectedSkin),'造型無效');c.selectedSkin=v.selectedSkin;
      object(v.migration);c.migration={original:integer(v.migration.original),returned:integer(v.migration.returned,0,10000),due:integer(v.migration.due,0,10000),at:integer(v.migration.at,0,1e15)};
      object(v.days);assert(Object.keys(v.days).length<=90,'任務日期上限');
      for(const [k,d]of Object.entries(v.days)) {
        date(k);object(d);assert(Array.isArray(d.keys)&&d.keys.length<=128,'任務清單過大');
        const keys=d.keys.map(x=>str(x,500));assert(new Set(keys).size===keys.length,'任務重複');
        c.days[k]={keys,blocks:integer(d.blocks,0,4),bonus:d.bonus===true,earned:integer(d.earned,0,5)};
        assert(d.blocks<=keys.length&&(!d.bonus||d.blocks>=3)&&d.earned<=d.blocks+(d.bonus?1:0),'派幣紀錄矛盾');
      }
      assert(Array.isArray(v.ledger)&&v.ledger.length<=120,'投幣紀錄過大');
      const seen=new Set();c.ledger=v.ledger.map(e=>{
        object(e);id(e.id);assert(!seen.has(e.id),'重複交易編號');seen.add(e.id);
        assert(['spend','refund','learn','migration','parent'].includes(e.kind),'未知交易');
        const amount=integer(e.amount,-1,10000);
        assert(e.kind!=='spend'||amount===-1,'入場價格必須一幣');
        assert(e.kind!=='refund'||amount===1,'退款必須一幣');
        assert(e.kind!=='learn'||amount>=0&&amount<=2,'任務獎勵無效');
        assert(e.kind!=='parent'||amount===0,'家長開輪不能派幣');
        return {id:e.id,kind:e.kind,amount,at:integer(e.at,0,1e15),note:str(e.note,240)};
      });
      object(v.bests);assert(Object.keys(v.bests).length<=ids.length*3,'最佳紀錄過大');
      for(const[k,n]of Object.entries(v.bests)){assert(ids.some(g=>[g+'|0',g+'|1',g+'|2'].includes(k)),'最佳紀錄識別碼');c.bests[k]=integer(n,0,1e12);}
      if(v.run) {
        const r=object(v.run);id(r.id);game(r.game);
        assert(['ready','playing','paused','next','retry','finished','refunded','error'].includes(r.phase),'局狀態無效');
        assert(typeof r.started==='boolean'&&typeof r.success==='boolean','局標記無效');
        c.run={id:r.id,game:r.game,difficulty:integer(r.difficulty,0,2),seed:integer(r.seed,0,0xffffffff),phase:r.phase,
          started:r.started,lives:integer(r.lives,0,3),stage:integer(r.stage,1,10000),snapshot:null,
          score:integer(r.score,0,1e12),elapsedMs:integer(r.elapsedMs,0,1e12),createdAt:integer(r.createdAt,0,1e15),
          error:str(r.error,240),result:str(r.result,600),success:r.success};
        if(!['finished','refunded'].includes(r.phase))assert(c.ledger.some(e=>e.id===r.id&&e.kind==='spend'),'遊戲缺少投幣紀錄');
        assert(!['playing','next','retry'].includes(r.phase)||r.started,'未開始局的狀態矛盾');
        assert(r.phase!=='refunded'||!r.started,'已玩局不能退款');
        if(r.phase==='refunded')assert(c.ledger.some(e=>e.id==='refund_'+r.id&&e.kind==='refund'),'已退款局缺少退款紀錄');
        if(['finished','refunded'].includes(r.phase))assert(!r.snapshot||r.phase==='finished','已退款局不能保留可玩局面');
        assert(!['ready','playing','paused','retry','next'].includes(r.phase)||r.lives>0,'已無生命，不能繼續');
        if(r.snapshot) {
          try {
            assert(JSON.stringify(r.snapshot).length<=900000,'存檔超過 900 KB');
            assert(r.snapshot.id===r.game&&r.snapshot.d===r.difficulty,'局面所屬遊戲不一致');
            if(verifySnapshot)verifySnapshot(r.snapshot,r);
            c.run.snapshot=clone(r.snapshot);
          }catch(e){if(!['finished','refunded'].includes(c.run.phase))c.run.phase='error';c.run.error=('局面已隔離：'+e.message).slice(0,240);}
        }
      }
      out.children[cid]=c;
    }
    return out;
  }
  return Object.freeze({VERSION,MAX_BALANCE,ids,catalog,initial,child,game,migrate,settleDue,allowed,purchase,start,pause,refund,close,activityKey,task,parentReset,validate,date});
});

