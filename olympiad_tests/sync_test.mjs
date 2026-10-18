import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScopeStore} from '../olympiad_src/scope-store.mjs';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(R,p),'utf8');
const data=JSON.parse(read('app/olympiad-classroom/assets/content.json'));
const upstream=read('olympiad_src/upstream/content.json');
assert.equal(read('app/olympiad-classroom/assets/content.json'),upstream,'Full curriculum is unchanged');
assert.equal(data.lessons.length,44);assert.equal(data.questions.length,280);assert.equal(data.units.length,8);
assert(data.lessons.every(l=>l.classroom));
const engine=await import('data:text/javascript;base64,'+Buffer.from(read('app/olympiad-classroom/assets/engine.js')).toString('base64'));
for(const q of data.questions)assert(engine.correct(q,q.answer),q.id);
// A real mixed assessment keeps correct/wrong/blank distinct and produces reviewable entries.
const mixed=engine.chooseQuestions(data.questions,'mixed','all');
assert.equal(mixed.length,8);assert(new Set(mixed.map(q=>q.type)).size>=2);
const quiz={id:'test',questionIds:mixed.map(q=>q.id),answers:{[mixed[0].id]:mixed[0].answer},startedAt:100};
const result=engine.gradeTest(quiz,data.questions,1100);
assert.equal(result.score,1);assert.equal(result.entries.filter(e=>e.status==='blank').length,7);
const state=engine.freshState();state.results.push(result);assert.equal(engine.wrongQuestions(state).length,7);

const disk=new Map(),guests=new Map();
const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)};
let p={account:'family-a',id:'child-a',persistent:true},lease=true;
const host={profile:()=>p,assertWritable(){if(!lease)throw Error('lease');}};
const raw=JSON.stringify(engine.freshState()),withResult=JSON.stringify(state);
const a=createScopeStore(host,storage,guests);assert.equal(a.getItem(),null);a.setItem('',withResult);
assert.equal(createScopeStore(host,storage,guests).getItem(),withResult);
p={...p,id:'child-b'};
const b=createScopeStore(host,storage,guests);assert.equal(b.getItem(),null);b.setItem('',raw);
assert.throws(()=>a.setItem('',raw),/已切換/);assert.equal(disk.size,2);
p={...p,id:'child-a'};const a2=createScopeStore(host,storage,guests);a2.getItem();
const other=createScopeStore(host,storage,guests);other.getItem();other.setItem('',raw);
assert.throws(()=>a2.setItem('',withResult),/另一個分頁/);
lease=false;assert.throws(()=>other.setItem('',withResult),/lease/);lease=true;
p={...p,account:'family-b'};const familyB=createScopeStore(host,storage,guests);assert.equal(familyB.getItem(),null);
const before=disk.size;p={account:'guest',id:'trial',persistent:false};
const trial=createScopeStore(host,storage,guests);trial.getItem();trial.setItem('',withResult);
assert.equal(disk.size,before);assert.equal(createScopeStore(host,storage,guests).getItem(),withResult);
assert.equal(createScopeStore(host,storage,new Map()).getItem(),null);
p={account:'broken',id:'child',persistent:true};
const brokenKey='wq-olympiad-classroom-v1:'+encodeURIComponent(JSON.stringify([p.account,p.id]));disk.set(brokenKey,'bad json');
const broken=createScopeStore(host,storage,guests);assert.throws(()=>broken.getItem());assert.throws(()=>broken.setItem('',raw));assert.equal(disk.get(brokenKey),'bad json');

for(const route of ['','learn','unit','lesson','test','quiz','results','review','progress','guide','plan','sources']){
 const html=read('app/olympiad-classroom/'+(route?route+'/':'')+'index.html');
 assert(!/(?:href|src)="\//.test(html),'No domain-root URLs: '+route);
 assert(html.includes('assets/theme-tokens.css?v=')&&html.includes('assets/classroom-theme.css?v='),route+' uses shared theme');
 assert(html.includes('aria-label="課堂功能"')&&html.includes('data-nav="review"'),route+' has the same four classroom destinations');
 assert(!html.includes('class="brand"'),route+' has no second brand header');
 for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
  const target=path.resolve(R,'app/olympiad-classroom',route,m[1].split('?')[0]);
  assert(target.startsWith(path.join(R,'app/olympiad-classroom')),m[1]);assert(fs.existsSync(target),target);
 }
}
const app=read('app/olympiad-classroom/assets/app.js');
assert(!/(?:href|src)="\//.test(app));assert(!/Tracy|SpeechSynthesisUtterance|createRecordedNarration|localStorage/.test(app));
assert(app.includes("page=location.pathname.slice(BASE.length).split('/')"));assert(app.includes('storage.setItem'));
for(const base of ['/app/olympiad-classroom/','/wordquest-web/app/olympiad-classroom/'])for(const route of ['learn','lesson','test','quiz','results','review'])assert.equal((base+route+'/').slice(base.length).split('/').filter(Boolean)[0],route);
assert(app.includes('`<a href="${BASE}sources/">`'));
assert(!fs.existsSync(path.join(R,'app/olympiad-classroom/assets/voice')));
const shell=read('app/index.html');
for(const page of ['learn','test','review','progress'])assert(shell.includes('data-oly-open="'+page+'"'));
assert(shell.includes('data-wqm-open="olympiad"'));assert(shell.includes('#lv/olympiad'));assert(shell.includes('data-olympiad-sync'));
assert(shell.includes("if(subject!=='arcade')return;"),'Retain current arcade-only time policy');
const tokens=read('app/olympiad-classroom/assets/theme-tokens.css');
assert.equal(tokens.trim(),read('r37_src/s10_shell.css').match(/:root\{[^}]+\}/)[0],'Exact incumbent fonts and palette');
const color=name=>tokens.match(new RegExp('--r37-'+name+':([^;}]+)'))[1];
const luminance=hex=>{const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
for(const [fg,bg] of [[color('text'),color('ink')],[color('muted'),color('card')],[color('gold-ink'),color('gold')],['#1c254c','#fbfcff'],['#51439a','#eef1fc'],['#8b302b','#fff0ed']]){
 const [light,dark]=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);assert((light+.05)/(dark+.05)>=4.5,fg+' on '+bg+' must meet AA text contrast');
}
console.log('PASS: 44 lessons / 280 preserved answers; mixed grading; 12 subdirectory routes; child/account/guest/lease/conflict/corruption isolation; existing Olympiad modes retained; no Tracy/audio API.');
console.log('PASS: all routes use shared theme/fonts; one brand header; correct review tab; six foreground/background pairs meet 4.5:1.');
