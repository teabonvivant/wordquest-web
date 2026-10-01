/* Real pure contracts; invented valid/invalid fixtures only. No native storage or real pupils. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=path.resolve(__dirname,'..'),F=require('../r31_src/family_core_compatible.js'),copy=F.clone,tests=[];
function test(name,fn){try{fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}
function bad(name,edit,validate=F.validateSettings,base=F.defaults()){test(name,()=>{const x=copy(base);edit(x);assert.throws(()=>validate(x));});}
test('Default settings accepted',()=>assert.equal(F.validateSettings(F.defaults()).limitMinutes,45));
for(const d of ['2024-02-29','2000-02-29','2026-09-29','2026-12-31'])test('Valid calendar '+d,()=>assert.equal(F.validDay(d),true));
for(const d of ['2026-02-29','2026-02-30','1900-02-29','2026-00-01','2026-13-01','2026-04-31','2026-9-1','x'])test('Reject calendar '+d,()=>assert.equal(F.validDay(d),false));
test('Hong Kong day boundary deterministic',()=>assert.equal(F.day(Date.parse('2026-09-28T16:00:00Z')),'2026-09-29'));
for(const v of [-1,4,181,Infinity,NaN,5.5,'45'])bad('Invalid total time '+String(v),x=>x.limitMinutes=v);
bad('Planned subject quotas cannot exceed total',x=>{x.englishMinutes=30;x.mathMinutes=30;});
bad('External speech endpoint rejected',x=>x.voice.endpoint='https://example.org/api/speech');
bad('Protocol-relative speech endpoint rejected',x=>x.voice.endpoint='//example.org/api');
bad('Consent cannot be inferred from a string',x=>x.voice.consent='true');
bad('Voice injection rejected',x=>x.voice.voice='x"><speak>');
bad('Unknown usage fields rejected',x=>x.usage={child:{'2026-09-29':{english:0,math:0,olympiad:0,arcade:0,extra:'bad'}}});
bad('Missing usage fields rejected',x=>x.usage={child:{'2026-09-29':{english:0,math:0,olympiad:0}}});
bad('Daily aggregate above 24h rejected',x=>x.usage={child:{'2026-09-29':{english:50000000,math:50000000,olympiad:0,arcade:0}}});
bad('Fractional millisecond counter rejected',x=>x.usage={child:{'2026-09-29':{english:1.5,math:0,olympiad:0,arcade:0}}});
test('Prototype pollution key rejected',()=>assert.throws(()=>F.scan(JSON.parse('{"__proto__":{"polluted":1}}'))));
test('Constructor key rejected',()=>assert.throws(()=>F.scan(JSON.parse('{"constructor":{}}'))));
test('Depth limit',()=>{let x={};for(let i=0;i<40;i++)x={item:x};assert.throws(()=>F.scan(x));});
test('Long scheduling gap clamps to 5 seconds',()=>{const x=F.defaults();F.addUsage(x,'child','english',1e8,0);assert.equal(F.usageTotal(x,'child',F.day(0)),5000);});
test('Negative elapsed time rejected',()=>assert.throws(()=>F.addUsage(F.defaults(),'child','math',-1)));
test('Unknown subject rejected',()=>assert.throws(()=>F.addUsage(F.defaults(),'child','unknown',10)));
const html=fs.readFileSync(path.join(R,'app/index.html'),'utf8'),ctx={console,structuredClone};ctx.globalThis=ctx;vm.createContext(ctx);
for(const s of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){const c=s[1];if(c.includes('globalThis.WQMathCSS=')||c.includes('const ext=')||c.includes('WordQuest Maths 0.1.2 — deterministic'))vm.runInContext(c,ctx);}
const C=ctx.WQMathCore,L=C.library(ctx.WQMathData),payload={sourceOwner:'family-1',english:{children:[{id:'child'}]},math:[{childId:'child',state:null,recovery:null}],family:F.defaults(),media:[],characterPreferences:[]};
const validate=x=>F.validatePayload(x,v=>copy(v),C,L);
test('Complete family contract accepted',()=>assert.equal(validate(payload).math.length,1));
bad('Missing child maths row refused',x=>x.math=[],validate,payload);
bad('Duplicate child maths row refused',x=>x.math.push(copy(x.math[0])),validate,payload);
bad('Other child maths refused',x=>x.math[0].childId='other',validate,payload);
bad('Other child time refused',x=>x.family.usage.other={},validate,payload);
bad('Unknown character owner refused',x=>x.characterPreferences=[{childId:'other',mode:'normal',preferences:{show:true,motion:true,compact:false,gameBuddy:'rabbit'}}],validate,payload);
bad('Invalid character boolean refused',x=>x.characterPreferences=[{childId:'child',mode:'normal',preferences:{show:'false',motion:true,compact:false,gameBuddy:'rabbit'}}],validate,payload);
const image={key:'image',kind:'image',meta:{},mime:'image/png',data:'data:image/png;base64,iVBORw=='};
test('Image contract accepted (synthetic bytes, not image decoding)',()=>{const p=copy(payload);p.media=[image];assert.equal(validate(p).media.length,1);});
bad('Repeated media key refused',x=>x.media=[image,image],validate,payload);
bad('Kind and MIME mismatch refused',x=>x.media=[{...image,kind:'audio'}],validate,payload);
bad('Invalid Base64 length refused',x=>x.media=[{...image,data:'data:image/png;base64,aaa'}],validate,payload);
bad('SVG active media refused',x=>x.media=[{...image,mime:'image/svg+xml',data:'data:image/svg+xml;base64,aaaa'}],validate,payload);
bad('Data URI MIME mismatch refused',x=>x.media=[{...image,data:'data:audio/wav;base64,aaaa'}],validate,payload);
bad('Unrecognized source owner refused',x=>x.sourceOwner='../etc',validate,payload);
const pack={format:'wordquest-family',version:1,createdAt:'2026-09-29T12:00:00Z',payload,integrity:{algorithm:'SHA-256',digest:'a'.repeat(64)}};
test('Valid backup envelope accepted',()=>assert.equal(F.envelope(pack).version,1));
bad('Impossible backup creation date refused',x=>x.createdAt='2026-02-30T12:00:00Z',F.envelope,pack);
bad('Missing digest refused',x=>x.integrity.digest='',F.envelope,pack);
bad('Unknown version refused',x=>x.version=999,F.envelope,pack);
test('Correct choice labels and lesson placeholders can resolve across 122 skills',()=>{for(const sk of L.skills.values()){const t=[...L.templates.values()].find(t=>t.skill===sk.id),q=C.generate(L,t.id,7);assert.equal(/\{[\w]+\}/.test(C.fill(sk.lesson.alternative,q.params)),false);if(t.choiceLabels)assert.ok(q.answerLabel);}});
fs.writeFileSync(path.join(R,'r32_evidence/family_contracts.json'),JSON.stringify({scope:'pure contracts, synthetic fixtures, no native I/O',tests},null,2));console.log('TOTAL',tests.length,'PASS',tests.filter(t=>t.pass).length);if(tests.some(t=>!t.pass)){console.log(tests.filter(t=>!t.pass));process.exitCode=1;}
