"""Independent Python Fraction/formula/enumeration checks; not application answer evaluation.
Deterministic generated fixtures are NOT real pupils' data or measured teaching outcomes.
"""
from pathlib import Path
from fractions import Fraction as F
from itertools import combinations
from math import gcd,comb
import json,ast,operator
R=Path(__file__).resolve().parents[1]
legacy=(R/'tests/legacy_rerun/tests/generation_oracle.py').read_text()
exec(legacy[legacy.index('def number'):legacy.index('for i,f in enumerate')],globals())
old_oracle=oracle
maps={
'solidClass':{'cube':1,'sphere':2,'cylinder':3,'cone':4},
'polygonClass':{'triangle':1,'square':2,'pentagon':3,'hexagon':4},
'positionClass':{'left':1,'right':2,'above':3,'below':4},
'solidFace':{'cube':1,'cylinder':2,'triangularPrism':3,'cuboid':4},
'angleClass':{'acute':1,'rightangle':2,'obtuse':3,'acute2':1},
'oppositeDirection':{'north':1,'south':2,'east':3,'west':4},
'rectangleClass':{'square':1,'rectangle':2,'rectangle2':2,'square2':1},
'parallelClass':{'parallelogram':1,'trapezium':2,'square':3,'rectangle':4},
 'triangleClass':{'equilateral':1,'isosceles':2,'scalene':3,'righttriangle':4},
'rhombusClass':{'rhombus':1,'square':2,'rectangle':3,'trapezium':4},
'eightDirections':{'ne':1,'se':2,'sw':3,'nw':4},
'symmetry':{'square':1,'rectangle':2,'equilateral':3,'isosceles':4},
'chartMisuse':{'brokenAxis':1,'areaIcon':2,'missingUnit':3,'fair':4},
}
def new_oracle(q):
 p=q['params'];k=q['verification']['kind'];N=lambda x:F(str(p[x]));a=lambda:N('a');b=lambda:N('b');c=lambda:N('c');rem=None
 if k in maps:return F(maps[k][p['shape']]),None
 if k=='prev':v=a()-1
 elif k=='subtract':v=a()-b()
 elif k=='place':v=10*a()+b()
 elif k in ('add','lengthUnits'):v=a()+b()
 elif k=='hundreds':v=100*a()+10*b()+c()
 elif k in ('multiply','multiple'):v=sum(a() for _ in range(int(b())))
 elif k=='thousands':v=1000*a()+100*b()+10*c()+N('e')
 elif k=='division':v=F(int(a())//int(b()));assert v*b()==a()
 elif k=='tenThousands':v=10000*a()+1000*b()+c()
 elif k=='remainder':v,rem=map(F,divmod(int(a()),int(b())))
 elif k=='mixed':v=c()+a()*b()
 elif k=='sameFraction':v=a()/b()+c()/b()
 elif k=='lcmConsecutive':v=F(int(a()*b())//gcd(int(a()),int(b())))
 elif k=='brackets':v=(a()+b())*c()
 elif k=='mixedFraction':v=a()+c()/b()
 elif k=='decimalParts':v=a()/10+b()/100
 elif k=='decimalAdd':v=a()+b()
 elif k=='roundThousand':v=F(((int(a())+500)//1000)*1000)
 elif k=='unlikeAdd':v=a()/b()+c()/N('e')
 elif k=='fractionMultiply':v=(a()/b())*(c()/N('e'))
 elif k=='decimalMultiply':v=a()*b()
 elif k=='fractionDivide':v=(a()/b())/(c()/N('e'))
 elif k=='decimalDivide':v=a()/b()
 elif k=='fractionDecimal':v=a()/b()
 elif k=='percentToDecimal':v=a()/100
 elif k=='discount':v=N('price')-N('price')*N('p')/100
 elif k=='coinSum':v=a()+2*b()
 elif k=='rulerLength':v=N('end')-N('start')
 elif k=='clockHour':v=N('hour')%12 or F(12)
 elif k=='metresCm':v=100*a()+b()
 elif k=='clockMinute':v=N('minute')
 elif k=='change':v=N('paid')-N('cost')
 elif k=='cmMm':v=10*a()+b()
 elif k=='elapsed':v=N('end')-N('start')
 elif k=='litresMl':v=1000*a()+b()
 elif k=='hour24':v=a()+12
 elif k=='kgG':v=1000*a()+b()
 elif k=='perimeter':v=a()+b()+a()+b()
 elif k=='areaRectangle':v=F(sum(1 for _ in range(int(a())) for _ in range(int(b()))))
 elif k=='areaTriangle':v=N('base')*N('height')/2
 elif k in ('volume','cm3Ml'):v=a()*b()*c()
 elif k=='straightAngle':v=180-N('angle')
 elif k=='circumference':v=F('3.14')*a()
 elif k=='speed':v=N('distance')/N('time')
 elif k=='circleArea':v=F('3.14')*a()**2
 elif k=='splitRectangle':v=a()*b()+c()*b()
 elif k=='diameter':v=2*a()
 elif k=='prismEdges':v=3*N('n')
 elif k=='pictogram':v=a()*N('scale')
 elif k=='barDifference':v=a()-b()
 elif k=='scaledBars':v=a()
 elif k=='groupBars':v=a()+b()
 elif k=='mean':v=(a()+b()+c())/3
 elif k=='lineChange':v=b()-a()
 elif k=='pieAmount':v=N('total')*N('p')/100
 elif k=='substitution':v=b()*a()+c()
 elif k=='oneEquation':v=b()-a()
 elif k=='twoEquation':v=(c()-b())/a()
 elif k=='inverse':v=N('end')/b()-a()
 elif k=='combinations':v=sum(1 for _ in range(int(a())) for _ in range(int(b())) for _ in range(int(c())))
 elif k=='gridRectangles':v=sum(1 for _ in combinations(range(int(a())+1),2) for _ in combinations(range(int(b())+1),2))
 elif k=='pigeonhole':v=a()*(N('k')-1)+1
 elif k=='wheels':
  candidates=[i for i in range(int(N('total'))+1) if 4*i+2*(N('total')-i)==N('wheels')];assert len(candidates)==1;v=F(candidates[0])
 else:raise ValueError('Missing independent oracle: '+k)
 return F(v),rem
rows=[]
for q in json.loads((R/'r3_evidence/generated_cases.json').read_text()):
 try:
  ref,rem=new_oracle(q) if q.get('verification') else old_oracle(q)
  assert F(q['answer'])==ref,f'answer {q["answer"]} != independently {ref}'
  if rem is not None:assert F(q['remainder'])==rem
  assert all('{' not in q[k] for k in ['stem_zh','stem_en','explanation'])
  if q['type']=='choice':
   choices=[F(c['value']) for c in q['choices']];assert len(choices)==len(set(choices)) and choices.count(ref)==1
   if q.get('answerLabel'):assert all(c.get('label') for c in q['choices'])
  rows.append({'id':q['id'],'status':'pass','reference':str(ref),'kind':q.get('verification') or 'legacy'})
 except Exception as e:rows.append({'id':q['id'],'status':'fail','error':str(e),'stem':q['stem_zh'],'params':q['params']})
(R/'r3_evidence/independent_results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
fails=[r for r in rows if r['status']=='fail'];print('independent:',len(rows),'pass',len(rows)-len(fails),'fail',len(fails));print(json.dumps(fails[:15],ensure_ascii=False,indent=2))
