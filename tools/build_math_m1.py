"""Rebuild HK-M1 from the delivered editable modules; standard library only.
Run from any working directory. This refreshes an ALREADY integrated R3.9+HK-M1 app.
It will refuse an unrecognised/unpatched base instead of overwriting a newer release.
"""
from pathlib import Path
import re,json,hashlib,subprocess,sys
R=Path(__file__).resolve().parents[1]; S=R/'math_course_src'; app=R/'app/index.html'
s=app.read_text(encoding='utf-8')
blocks=list(re.finditer(r'<script([^>]*)>([\s\S]*?)</script>',s,re.I));originals=[b[2] for b in blocks if 'data-course-m1=' not in b[1] and 'data-olympiad-sync' not in b[1]]
if len(originals)!=43 or 'WordQuest Maths 0.1.2' not in originals[40]:
 raise SystemExit('Unrecognised app base. Keep a backup; reconcile upstream changes manually.')
(S/'style_bundle.js').write_text('globalThis.WQCourseCSS='+json.dumps('\n'.join((S/n).read_text(encoding='utf-8') for n in ['course_ui.css','course_visual.css','classroom.css']),ensure_ascii=False)+';\n',encoding='utf-8')
classroom={}
for band in ['lower','upper']:
 incoming=json.loads((S/f'classroom-{band}.json').read_text(encoding='utf-8'))['lessons']
 if classroom.keys()&incoming.keys():raise SystemExit('Duplicate classroom chapter')
 classroom.update(incoming)
course=(S/'course_data.js').read_text(encoding='utf-8');start=course.index('WQCourseData=')+len('WQCourseData=')
course_data,_=json.JSONDecoder().raw_decode(course[start:])
expected={u['code']+'-'+str(p) for u in course_data['units'] for p in [1,2]}
if set(classroom)!=expected:raise SystemExit('Classroom coverage mismatch: '+str(expected-set(classroom)))
for key,p in classroom.items():
 if not p.get('modelSteps'):p['modelSteps']=p['explain'].get('modelSteps') or [x for x in re.findall(r'[^。！？]+[。！？]?',p['explain']['model']) if x.strip()]
 if ''.join(p['modelSteps'])!=p['explain']['model'] or p['explain']['model'][-1] in '；，、：（':raise SystemExit('Model must be the complete joined steps: '+key)
 r=p['readiness'];choices=[x['id'] for x in r['choices']];texts=[x['text'] for x in r['choices']]
 if r['answer'] not in choices or len(set(choices))!=len(choices):raise SystemExit('Invalid readiness: '+key)
 if not 3<=len(choices)<=4 or len(set(texts))!=len(texts):raise SystemExit('Readiness needs 3-4 distinct choices: '+key)
 if not p.get('diagram',{}).get('svg') or not p.get('toolTask') or not p.get('explain',{}).get('model'):raise SystemExit('Incomplete classroom: '+key)
(S/'classroom_bundle.js').write_text('globalThis.WQClassroomData='+json.dumps({'version':'HK-M4','lessons':classroom},ensure_ascii=False)+';\n'+'globalThis.WQClassroomCopy='+json.dumps(json.loads((S/'classroom-copy.json').read_text(encoding='utf-8')),ensure_ascii=False)+';\n',encoding='utf-8')
(S/'school_bundle.js').write_text('/* Generated from school_content.json. Additive IDs preserve historical questions. */\n'+
 'globalThis.WQSchoolData='+json.dumps(json.loads((S/'school_content.json').read_text(encoding='utf-8')),ensure_ascii=False)+';\n'+
 'globalThis.WQMathData.templates.push(...globalThis.WQSchoolData.templates);\n',encoding='utf-8')
(S/'tools_bundle.js').write_text('globalThis.WQCourseTools='+json.dumps((S/'tools_iframe.html').read_text(encoding='utf-8'),ensure_ascii=False).replace('</script','<\\/script')+';\n',encoding='utf-8')
names=['course_data.js','school_bundle.js','course_pedagogy.js','course_engine.js','tools_bundle.js','style_bundle.js','course_visuals.js','classroom_bundle.js','classroom_ui.js','course_ui.js']
for name in ['classroom_bundle.js','classroom_ui.js']:
 if '<script data-course-m1="'+name+'">' not in s:
  marker='<script data-course-m1="course_ui.js">'
  if s.count(marker)!=1:raise SystemExit('Cannot locate classroom integration marker.')
  s=s.replace(marker,'<script data-course-m1="'+name+'"></script>\n'+marker,1)
for name in ['school_bundle.js','course_pedagogy.js']:
 if '<script data-course-m1="'+name+'">' not in s:
  marker='<script data-course-m1="course_engine.js">'
  if s.count(marker)!=1:raise SystemExit('Cannot locate M1 engine marker.')
  s=s.replace(marker,'<script data-course-m1="'+name+'"></script>\n'+marker,1)
# Upgrade an integrated M1 shell exactly once, preserving all other modules.
if '<script data-course-m1="course_visuals.js">' not in s:
 marker='<script data-course-m1="course_ui.js">'
 if s.count(marker)!=1:raise SystemExit('Cannot locate the existing M1 UI marker.')
 s=s.replace(marker,'<script data-course-m1="course_visuals.js"></script>\n'+marker,1)
for name in names:
 matches=list(re.finditer(r'<script data-course-m1="'+re.escape(name)+r'">[\s\S]*?</script>',s))
 if len(matches)!=1:raise SystemExit('Integration marker mismatch: '+name)
 m=matches[0];text=(S/name).read_text(encoding='utf-8').replace('</script','<\\/script')
 s=s[:m.start()]+'<script data-course-m1="'+name+'">\n'+text+'\n</script>'+s[m.end():]
app.write_text(s,encoding='utf-8')
preview=R/'math_course_preview.html';old=preview.read_text(encoding='utf-8')
head=old[:old.index('<script>')]
texts=[originals[37].replace('globalThis.WQM_INTEGRATED=true;','globalThis.WQM_INTEGRATED=false;'),originals[38],(S/'course_data.js').read_text(encoding='utf-8'),originals[39],originals[40]]
texts += [(S/n).read_text(encoding='utf-8') for n in ['school_bundle.js','course_pedagogy.js','course_engine.js']]
texts += [originals[41]]
texts += [(S/n).read_text(encoding='utf-8') for n in ['tools_bundle.js','style_bundle.js','course_visuals.js','classroom_bundle.js','classroom_ui.js','course_ui.js']]
preview.write_text(head+'\n'.join('<script>\n'+t.replace('</script','<\\/script')+'\n</script>' for t in texts)+'\n</body></html>',encoding='utf-8')
subprocess.run([sys.executable,str(R/'tools/sync_olympiad.py')],check=True)
manifest={p.relative_to(R).as_posix():hashlib.sha256(p.read_text(encoding='utf-8').encode()).hexdigest() for p in sorted(S.iterdir()) if p.is_file()}
for p in [app,preview,R/'app/sw.js']:manifest[p.relative_to(R).as_posix()]=hashlib.sha256(p.read_text(encoding='utf-8').encode()).hexdigest()
(R/'docs/math-course/BUILD_SHA256.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Rebuilt app/index.html and math_course_preview.html. Run math_course_tests before deployment.')
