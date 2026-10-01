'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const R=path.resolve(__dirname,'..'),C=require(path.join(R,'r31_src/characters_core.js')),rows=[];
function t(name,fn){try{fn();rows.push({id:'FOREST-CORE-'+String(rows.length+1).padStart(3,'0'),name,status:'pass'});}catch(e){rows.push({id:'FOREST-CORE-'+String(rows.length+1).padStart(3,'0'),name,status:'fail',error:e.message});}}
t('Legacy slot identifiers remain stable',()=>assert.deepEqual(new Set(C.ids),new Set(['owl','fox','star','bee','rabbit','panda'])));
t('New canonical character identity is explicit',()=>assert.deepEqual(C.ids.map(k=>C.roles[k].id),['lie-lie','you-you','tang-li','bo-bo','ci-ci','a-feng']));
t('New account animation defaults off',()=>assert.equal(C.preferences().motion,false));
t('Old record resolves to automatic guide without mutation',()=>{const x={show:false,motion:true,compact:true,gameBuddy:'panda'},before=JSON.stringify(x);const p=C.preferences(x);assert.equal(p.guide,'auto');assert.equal(p.show,false);assert.equal(JSON.stringify(x),before);});
for(const raw of [null,42,'fox',[],{guide:'hacker'},{show:'false',compact:1},{guide:'__proto__'},JSON.parse('{"__proto__":{"show":false}}')])t('Malformed preference safe normalization: '+JSON.stringify(raw),()=>{const p=C.preferences(raw);assert(C.validPreferences(p));assert.equal(p.constructor,Object);});
for(const id of C.ids){
 t('Fixed guide '+id+' supported in math',()=>{const p={...C.defaults,guide:id};assert.equal(C.mathGuide({view:'home'},p).role,id);});
 t('Fixed guide '+id+' supported in English',()=>assert.equal(C.guide({study:true},{...C.defaults,guide:id}).role,id));
 for(const state of ['thinking','retry','correct','complete','rest','hint','teach'])t('Valid expression mapping '+id+' '+state,()=>assert(C.poses.includes(C.poseFor(state,id))));
 t('Character '+id+' metadata immutable',()=>assert(Object.isFrozen(C.roles[id])&&Object.isFrozen(C.roles[id].faces)));
}
const contexts=[
 [{view:'home'},'bee','ready'],[{view:'tools'},'panda','teach'],[{view:'cards'},'rabbit','thinking'],[{view:'olympiad'},'rabbit','thinking'],
 [{view:'lesson',track:'olympiad'},'rabbit','thinking'],[{view:'lesson',earlyNumber:true},'bee','teach'],[{view:'lesson',visual:true},'fox','teach'],[{view:'lesson'},'owl','ready'],
 [{view:'lesson',feedback:'retry'},'star','retry'],[{view:'lesson',visual:true,hinted:true},'star','hint'],[{view:'lesson',exploring:true},'panda','teach'],[{view:'resume'},'star','rest'],[{view:'home',rest:true},'star','rest'],[{view:'lesson',completed:true},'bee','complete']
];
for(const [ctx,role,state]of contexts)t('Automatic state dispatch '+JSON.stringify(ctx),()=>{const g=C.mathGuide(ctx);assert.equal(g.role,role);assert.equal(g.state,state);});
for(const mode of ['mock','diagnostic','exam','assessment','dictation'])t('Assessment mode '+mode+' has quiet guide regardless of fixed selection',()=>{const g=C.mathGuide({view:'lesson',mode,feedback:'correct'},{...C.defaults,guide:'panda'});assert.equal(g.quiet,true);assert.equal(g.pose,'front');});
t('Hidden guide returns no portrait data',()=>assert.equal(C.mathGuide({view:'home'},{...C.defaults,show:false}),null));
t('Upper-primary automatically compact',()=>assert.equal(C.mathGuide({view:'home',grade:4}).compact,true));
t('Typing stage automatically compact',()=>assert.equal(C.mathGuide({view:'lesson',busy:true}).compact,true));
t('Invalid backup role is refused, not silently accepted',()=>assert.equal(C.validPreferences({...C.defaults,guide:'unknown'}),false));
t('Existing backup without guide field stays valid',()=>{const p={...C.defaults};delete p.guide;assert(C.validPreferences(p));});
t('Guide ignores answer, HTML and student input fields',()=>{const ctx={view:'lesson',feedback:'retry'};assert.deepEqual(C.mathGuide({...ctx,answer:'SECRET_8472',studentInput:'<script>alert(1)</script>'}),C.mathGuide(ctx));});
t('Guide never alters supplied context or preferences',()=>{const a={view:'lesson',hinted:true},p={...C.defaults},before=JSON.stringify([a,p]);C.mathGuide(a,p);assert.equal(JSON.stringify([a,p]),before);});
t('Neither normal guide nor fixed preference influences award value',()=>{for(const id of C.ids)assert.equal('coins' in C.mathGuide({view:'lesson',completed:true},{...C.defaults,guide:id}),false);});
fs.writeFileSync(path.join(R,'r31_evidence/characters_core.json'),JSON.stringify(rows,null,2));console.log('TOTAL',rows.length,'PASS',rows.filter(x=>x.status==='pass').length);if(rows.some(x=>x.status==='fail'))process.exit(1);
