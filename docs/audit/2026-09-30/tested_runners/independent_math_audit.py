"""Apply the supplied independent Fraction oracle to NEW current-app cases.
This preserves the known oracle provenance and does not execute its historical-case loop.
"""
from pathlib import Path
from fractions import Fraction
import json
R = Path('audit_work').resolve()
oracle_file = R/'program/WordQuest_R3_2/r3_tests/independent_oracle.py'
source = oracle_file.read_text()
namespace = {'__file__': str(oracle_file), '__name__': 'wordquest_audit_oracle'}
exec(compile(source[:source.index('\nrows=[]')], str(oracle_file), 'exec'), namespace)
rows=[]
for q in json.loads((R/'data_evidence/generated_current_cases.json').read_text()):
    try:
        reference, remainder = namespace['new_oracle'](q) if q.get('verification') else namespace['old_oracle'](q)
        assert Fraction(q['answer']) == reference
        if remainder is not None:
            assert Fraction(q['remainder']) == remainder
        assert all('{' not in q[k] for k in ['stem_zh','stem_en','explanation'])
        if q['type']=='choice':
            values=[Fraction(c['value']) for c in q['choices']]
            assert len(values)==len(set(values)) and values.count(reference)==1
        rows.append({'id':q['id'],'status':'pass','reference':str(reference)})
    except Exception as exc:
        rows.append({'id':q['id'],'status':'fail','error':str(exc)})
result={'method':'Supplied independent Python Fraction/formula/enumeration oracle applied to newly generated exact CURRENT app cases; not historical fixtures or student outcomes','total':len(rows),'failed':sum(r['status']=='fail' for r in rows),'results':rows}
(R/'data_evidence/independent_maths_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('Independent current mathematics:',result['total'],'cases;',result['failed'],'failures')
raise SystemExit(bool(result['failed']))
