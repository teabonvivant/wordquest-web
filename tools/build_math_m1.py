"""Rebuild HK-M1 from the delivered editable modules; standard library only.
Run from any working directory. This refreshes an ALREADY integrated R3.9+HK-M1 app.
It will refuse an unrecognised/unpatched base instead of overwriting a newer release.
"""
from pathlib import Path
import re,json,hashlib
R=Path(__file__).resolve().parents[1]; S=R/'math_course_src'; app=R/'app/index.html'
s=app.read_text(encoding='utf-8')
blocks=list(re.finditer(r'<script([^>]*)>([\s\S]*?)</script>',s,re.I));originals=[b[2] for b in blocks if 'data-course-m1=' not in b[1]]
if len(originals)!=43 or 'WordQuest Maths 0.1.2' not in originals[40]:
 raise SystemExit('Unrecognised app base. Keep a backup; reconcile upstream changes manually.')
(S/'style_bundle.js').write_text('globalThis.WQCourseCSS='+json.dumps((S/'course_ui.css').read_text(encoding='utf-8')+'\n'+(S/'course_visual.css').read_text(encoding='utf-8'),ensure_ascii=False)+';\n',encoding='utf-8')
(S/'school_bundle.js').write_text('/* Generated from school_content.json. Additive IDs preserve historical questions. */\n'+
 'globalThis.WQSchoolData='+json.dumps(json.loads((S/'school_content.json').read_text(encoding='utf-8')),ensure_ascii=False)+';\n'+
 'globalThis.WQMathData.templates.push(...globalThis.WQSchoolData.templates);\n',encoding='utf-8')
(S/'tools_bundle.js').write_text('globalThis.WQCourseTools='+json.dumps((S/'tools_iframe.html').read_text(encoding='utf-8'),ensure_ascii=False).replace('</script','<\\/script')+';\n',encoding='utf-8')
names=['course_data.js','school_bundle.js','course_pedagogy.js','course_engine.js','tools_bundle.js','style_bundle.js','course_visuals.js','course_ui.js']
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
texts += [(S/n).read_text(encoding='utf-8') for n in ['tools_bundle.js','style_bundle.js','course_visuals.js','course_ui.js']]
preview.write_text(head+'\n'.join('<script>\n'+t.replace('</script','<\\/script')+'\n</script>' for t in texts)+'\n</body></html>',encoding='utf-8')
manifest={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(S.iterdir()) if p.is_file()}
for p in [app,preview,R/'app/sw.js']:manifest[str(p.relative_to(R))]=hashlib.sha256(p.read_bytes()).hexdigest()
(R/'docs/math-course/BUILD_SHA256.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Rebuilt app/index.html and math_course_preview.html. Run math_course_tests before deployment.')
