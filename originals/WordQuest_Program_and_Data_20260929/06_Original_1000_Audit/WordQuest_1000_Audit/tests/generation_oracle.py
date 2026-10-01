"""Independent reference arithmetic; never uses the application's answer evaluator."""
from pathlib import Path
from fractions import Fraction as F
from itertools import combinations
import ast,json,operator
ROOT=Path(__file__).resolve().parents[1]
fixtures=json.loads((ROOT/'results/generated_fixtures.json').read_text())
results=[]
def number(v): return F(str(v))
def expr(src,env):
    def ev(n):
        if isinstance(n,ast.Expression):return ev(n.body)
        if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return number(n.value)
        if isinstance(n,ast.Name):return number(env[n.id])
        if isinstance(n,ast.UnaryOp):return -ev(n.operand) if isinstance(n.op,ast.USub) else ev(n.operand)
        if isinstance(n,ast.BinOp):
            a,b=ev(n.left),ev(n.right)
            return {ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv,ast.Mod:operator.mod}[type(n.op)](a,b)
        if isinstance(n,ast.Compare):
            a,b=ev(n.left),ev(n.comparators[0]);return {ast.Lt:operator.lt,ast.LtE:operator.le,ast.Gt:operator.gt,ast.GtE:operator.ge,ast.Eq:operator.eq,ast.NotEq:operator.ne}[type(n.ops[0])](a,b)
        if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='floor' and len(n.args)==1:
            a=ev(n.args[0]);return F(a.numerator//a.denominator)
        raise ValueError('Unsupported reference AST '+ast.dump(n))
    return ev(ast.parse(src,mode='eval'))
def oracle(q):
    p={k:number(v) for k,v in q['params'].items()};s=q['skill'];r=None
    if s=='1N1.1':ans=p['n']
    elif s=='1N1.5':ans=p['n']-p['a']
    elif s=='1N2.2':ans=p['n']-p['a'] if q['difficulty']==3 else p['a']+p['b']
    elif s=='1N3.2':ans=10*p['t']+p['o']
    elif s in ('1N4.1','2N2.1'):ans=p['a']+p['b']
    elif s in ('1N4.4','2N2.3','2N5.1'):ans=p['a']-p['b']
    elif s=='2N1.2':ans=100*p['h']+10*p['t']+p['o']
    elif s=='2N1.3':ans=max(p['left'],p['right'])
    elif s in ('2N3.3','3N2.1'):ans=p['a']*p['b']
    elif s=='2N4.2':ans=1000*p['k']+100*p['h']+10*p['t']+p['o']
    elif s=='2N5.3':ans=p['paid']-p['price']
    elif s in ('2N6.2','3N3.1'):ans=F(p['a']//p['b']);r=p['a']-ans*p['b']
    elif s=='3N1.2':ans=sum(p[k]*10**i for i,k in enumerate(['o','t','h','k','w']))
    elif s=='3N4.3':ans=p['c']+p['a']*p['b']
    elif s=='3N4.4':ans=p['paid']-p['price']*p['qty']
    elif s=='3N5.1':ans=p['num']/p['den']
    elif s=='3N5.3':ans=max(p['num']/p['left'],p['num']/p['right'])
    elif s=='3N5.4':ans=p['a']/p['den']+p['b']/p['den']
    elif s=='O-CAL-pattern':
        assert p['b']-p['a']==p['c']-p['b'];ans=p['c']+(p['c']-p['b'])
    elif s=='O-NUM-pairs':ans=F(len(list(range(0,int(p['n'])-1,2))))
    elif s=='O-APP-queue':ans=p['front']+p['back']-1
    elif s=='O-GEO-segments':ans=F(len(list(combinations(range(int(p['points'])),2))))
    elif s=='O-LOG-digits':ans=F(sum(n//10+n%10==int(p['sum']) for n in range(10,100)))
    else:raise ValueError('No oracle for '+s)
    return ans,r
for i,f in enumerate(fixtures,1):
    q,t=f['question'],f['template'];status='PASS';actual=None
    try:
        want,rem=oracle(q)
        assert number(q['answer'])==want, f'answer={q["answer"]}; independent={want}'
        if rem is not None:assert number(q['remainder'])==rem and 0<=rem<number(q['params']['b'])
        for k,spec in t['params'].items():
            v=q['params'][k]
            if 'int' in spec:assert isinstance(v,int) and spec['int'][0]<=v<=spec['int'][1]
            elif 'pick' in spec:assert v in spec['pick']
            else:assert number(v)==expr(spec['expr'],q['params']),f'derived parameter {k}'
        for constraint in t.get('constraints',[]):assert expr(constraint,q['params']),constraint
        assert '{' not in q['stem_zh'] and '{' not in q['stem_en']
        assert all('{' not in h for h in q['hints'])
        assert len(q['hints'])>=4 and q['explanation']
        if q['type']=='choice':
            choices=[number(x['value']) for x in q['choices']]
            assert len(choices)==len(set(choices)) and sum(c==want for c in choices)==1
            assert len(choices)==t.get('choiceCount',4)
        actual={'answer':q['answer'],'reference':str(want),'remainder':q['remainder'],'parameters':q['params']}
    except Exception as e:status='FAIL';actual=str(e)
    results.append({'id':f'GEN-{i:03d}','category':'GEN','name':f'{q["templateId"]} / seed {q["seed"]}','expected':'獨立有理數／枚舉答案一致；參數及選項有效；題幹沒有未替換欄位','status':status,'actual':actual,'issue':'F-CONTENT' if status=='FAIL' else ''})
(ROOT/'results/generation_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('Independent generation checks',len(results),'PASS',sum(x['status']=='PASS' for x in results),'FAIL',sum(x['status']=='FAIL' for x in results))
