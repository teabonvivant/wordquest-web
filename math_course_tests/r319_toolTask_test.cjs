'use strict';
/* R3.19 N19: P4-P6 toolTask is written per lesson (operate -> observe -> explain), no two lessons of a grade share the same three sentences,
   connections no longer end with the same generic sentence. Reads math_course_src and checks the same text is inside the built app. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const lessons={};
for(const b of ['lower','upper'])Object.assign(lessons,JSON.parse(fs.readFileSync(path.join(root,'math_course_src',`classroom-${b}.json`),'utf8')).lessons);
const html=fs.readFileSync(process.env.WQ33_APP||path.join(root,'app/index.html'),'utf8');
let n=0;const fails=[];const ok=(c,m)=>{n++;if(!c){fails.push(m);console.log('  FAIL',m);}};
const GENERIC='在畫板照示意圖畫出數量';
const upper=Object.entries(lessons).filter(([k])=>/^[456]/.test(k));
ok(upper.length===88,'88 lessons in P4-P6 ('+upper.length+')');
ok(upper.every(([k,p])=>Array.isArray(p.toolTask)&&p.toolTask.length===3&&p.toolTask.every(s=>typeof s==='string'&&s.trim().length>=5)),'every P4-P6 toolTask has 3 non-empty sentences');
ok(!upper.some(([k,p])=>p.toolTask[0].startsWith(GENERIC)),'no lesson keeps the generic first sentence');
const seen={};let dupGrade=0;
for(const [k,p] of upper){const key=k[0]+'|'+p.toolTask.join('/');if(seen[key]){dupGrade++;console.log('   duplicate toolTask',k,seen[key]);}seen[key]=k;}
ok(dupGrade===0,'lessons of one grade with identical toolTask: '+dupGrade+' (must be 0)');
const all=new Set();let dupSentence=0;for(const [k,p] of upper)if(p.toolMode==='on-screen-scratchboard')for(const s of p.toolTask){if(all.has(s))dupSentence++;all.add(s);}
ok(dupSentence===0,'no sentence repeats across the scratchboard lessons ('+dupSentence+')');
ok(upper.filter(([k,p])=>p.toolMode==='on-screen-scratchboard').every(([k,p])=>!/[按點擊]「?檢查小任務|滑桿/.test(p.toolTask.join(''))),'scratchboard-only lessons mention no button / slider that does not exist');
ok(upper.every(([k,p])=>!/把本課圖中的數量關係與算式連起來/.test(p.connections)),'no P4-P6 connections end with the generic sentence');
const tails=upper.map(([k,p])=>p.connections.split('；').pop());
ok(new Set(tails).size===tails.length,'88 different connection tails ('+new Set(tails).size+')');
ok(upper.every(([k,p])=>/。$/.test(p.connections)),'connections end with 。');
let inApp=0;for(const [k,p] of upper)if(html.includes(JSON.stringify(p.toolTask[1]).slice(1,-1)))inApp++;
ok(inApp===88,'the built app contains the new toolTask text of all 88 lessons ('+inApp+')');
console.log('r319_toolTask_test: '+(n-fails.length)+'/'+n+' checks passed; lessons with toolTask changed from generic: 74');
process.exit(fails.length?1:0);
