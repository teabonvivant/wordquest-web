  // ---- R3.5 p50: answer display and answer-text cleaning --------------------------------------------------------
  // Formatting only. Marking rules (what is correct) are unchanged: q.answer stays the canonical exact fraction string.
  // 1) displayAnswer: the corrected answer is shown in the format the question asks for (decimal question -> decimal).
  // 2) mark(): a unit that matches the question's unit is ignored (7 cm, 7厘米, 7元), 又 joins a mixed number (4又3/10),
  //    and the error text says what to change instead of a generic number message.
  const R35_UNITS={
    '厘米':['厘米','釐米','公分','cm','centimetre','centimetres','centimeter','centimeters'],
    '平方厘米':['平方厘米','平方釐米','平方公分','cm2','sqcm','squarecm'],
    '立方厘米':['立方厘米','立方釐米','立方公分','cm3','cucm'],
    '毫米':['毫米','mm'],'米':['米','m','metre','metres','meter','meters'],'公里':['公里','千米','km'],
    '公里／小時':['公里/小時','公里每小時','千米/小時','千米每小時','km/h','kmh','kph'],
    '公斤':['公斤','千克','kg'],'克':['克','公克','g'],'毫升':['毫升','ml'],
    '升':['升','l','litre','litres','liter','liters'],
    '元':['元','港元','hk$','hkd','$','dollar','dollars'],
    '分鐘':['分鐘','min','mins','minute','minutes'],'小時':['小時','h','hr','hrs','hour','hours'],
    '度':['度','°','deg','degree','degrees']
  };
  const R35_UNIT_RE=/(?:多少|幾)\s*(公里\s*[／/]\s*小時|平方厘米|立方厘米|厘米|毫米|公里|公斤|毫升|升|克|米|元|分鐘|小時|度|個|粒|本|人|條|件|張|輛|隻|枝|對|種)/g;
  // Skills whose answer is a measured amount without a unit in the template: show the unit the stem asks for.
  const R35_DISPLAY_UNIT={'6N4.R3':'元','6M3.R3':'厘米','6M5.R3':'平方厘米'};
  function r35Places(q){let d=q.d,k=0,j=0;while(d%2n===0n){d/=2n;k++;}while(d%5n===0n){d/=5n;j++;}return d===1n?Math.max(k,j):-1;}
  // Exact decimal text of a fraction whose denominator has only the factors 2 and 5; null when it is a recurring decimal.
  function r35Decimal(q){
    const p=r35Places(q);if(p<0)return null;if(p===0)return q.toString();
    const neg=q.n<0n,n=neg?-q.n:q.n,t=(n*10n**BigInt(p)/q.d).toString().padStart(p+1,'0');
    return (neg?'-':'')+t.slice(0,-p)+'.'+t.slice(-p);
  }
  function r35InferUnit(stem){let u='';for(const m of String(stem).matchAll(R35_UNIT_RE))u=m[1].replace(/\s+/g,'').replace('/','／');return u;}
  function r35Display(t,p,answer){
    const out={text:answer,unit:t.answer.unit||'',changed:false,added:'',unitHint:''};
    const stem=fill(t.stem_zh,p);
    try{
      if(t.type==='number'){
        const fm=t.answer.formats||['integer','fraction','decimal'],a=Q.parse(answer);
        // A decimal question: decimal allowed, and either fractions are excluded or the stem itself uses no fraction.
        const decimalAsked=fm.includes('decimal')&&(!fm.includes('fraction')||!/\d\s*\/\s*\d/.test(stem));
        if(decimalAsked&&a.d!==1n){const dt=r35Decimal(a);if(dt!==null){out.text=dt;out.changed=true;}}
        if(!out.unit&&decimalAsked&&R35_DISPLAY_UNIT[t.skill])out.unit=out.added=R35_DISPLAY_UNIT[t.skill];
      }
    }catch(_){out.text=answer;out.changed=false;out.unit=t.answer.unit||'';out.added='';}
    out.unitHint=out.unit||r35InferUnit(stem);
    return out;
  }
  // Explanation text: "答案是 {r3Answer}" must use the displayed form too.
  function r35FillParams(p,answer,d){
    if(!(d.changed||d.added)||!Object.hasOwn(p,'r3Answer')||p.r3Answer!==answer)return p;
    return {...p,r3Answer:d.text+(d.added?' '+d.added:'')};
  }
  function r35UnitOf(q){return q.unit||q.displayUnit||q.unitHint||r35InferUnit(q.stem_zh||'');}
  function r35UnitMatches(unit,token){
    const tok=String(token).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
    const list=R35_UNITS[unit]||[unit];
    return list.some(x=>x.normalize('NFKC').toLowerCase()===tok);
  }
  // Returns {value} (text to grade, original when nothing needed cleaning) or {error:'unit'|'mixed',token}.
  function r35Prepare(q,raw){
    if(typeof raw!=='string')return {value:raw};
    let s=raw.normalize('NFKC').replace(/\s+/g,' ').trim(),touched=false;
    if(!s)return {value:raw};
    if(/\d\s*又\s*\d/.test(s)){s=s.replace(/(\d)\s*又\s*(?=\d)/g,'$1 ');touched=true;}
    const unit=r35UnitOf(q);
    let m=s.match(/^(hk\$|hkd|\$)\s*(.+)$/i);
    if(m){
      if(unit!=='元')return {error:'unit',token:m[1],unit};
      s=m[2];touched=true;
    }
    m=s.match(/^(.*?\d)\s*([A-Za-z㐀-鿿°$%][A-Za-z㐀-鿿°$%\/]*[23]?)$/);
    if(m){
      const token=m[2];
      if(/^又+$/.test(token))return {error:'mixed',token};
      if(!unit||!r35UnitMatches(unit,token))return {error:'unit',token,unit};
      s=m[1];touched=true;
    }
    return touched?{value:s}:{value:raw};
  }
  function r35Format(text){const s=numberText(text);return s.includes('/')?'fraction':s.includes('.')?'decimal':'integer';}
  function r35FormatMessage(formats,got){
    const has=x=>formats.includes(x);
    if(got==='fraction'&&!has('fraction'))return has('decimal')?'這題請用小數作答，例如 0.25。':'這題只填整數，例如 12。';
    if(got==='decimal'&&!has('decimal'))return has('fraction')?'這題請用分數作答，例如 1/2。':'這題只填整數，例如 12。';
    if(got==='integer'&&!has('integer'))return has('fraction')?'這題請用分數作答，例如 1/2。':'這題請用小數作答，例如 0.25。';
    return '請按題目要求的寫法作答。';
  }
  function mark(q,input){
    const a=typeof input==='object'&&input?input:{value:input};
    const pre=r35Prepare(q,a.value);
    if(pre.error==='mixed')return {valid:false,correct:false,credit:0,message:'帶分數請這樣寫：4又3/10。',code:'FORMAT'};
    if(pre.error==='unit')return {valid:false,correct:false,credit:0,message:pre.unit?`單位不對，這題的單位是${pre.unit}。只填數字，單位不用寫。`:'只填數字，單位不用寫。',code:'FORMAT'};
    const res=mark0(q,pre.value===a.value?input:{...a,value:pre.value});
    if(!res.valid&&res.code==='FORMAT'){
      const text=typeof pre.value==='string'?pre.value.trim():pre.value;
      let parsed=true;try{Q.parse(text);}catch(_){parsed=false;}
      if(parsed)res.message=r35FormatMessage(q.formats,r35Format(text));
      else if(text===''||text===undefined||text===null)res.message='請先填答案。';
      else if(String(text).length>60)res.message='答案太長了，只填數字就可以。';
      // zero denominator and a mixed number with an improper part keep their own messages
      else if(!/^[+-]?\d+\s*\/\s*0+$/.test(String(text))&&!/^[+-]?\d+\s+\d+\s*\/\s*\d+$/.test(String(text)))res.message='這裏只填數字，例如 12、0.5 或 1/2。';
    }
    return res;
  }
