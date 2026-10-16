"""R3.19 s58 - T22: the maths engine (WQMathCore.mark) names why an olympiad answer is wrong instead of one generic 「再看清楚題目」.
Number patterns: the last term (PATTERN_LAST) or the step (PATTERN_STEP); other olympiad questions: a number copied from the question (GIVEN_NUMBER).
RECHECK's remedy no longer promises a tool; the 「再用教具試一次」 line is added only for a skill that has a tool."""

OLD_REMEDY = '"RECHECK": {"name": "再看清楚題目", "remedy": "把已知數和要求的數分開，再用教具試一次。"}'
NEW_REMEDY = ('"RECHECK": {"name": "再看清楚題目", "remedy": "把已知數和要求的數分開寫出來。"}, '
              '"PATTERN_LAST": {"name": "你答了最後一項", "remedy": "要再加一次差，才是下一個數。"}, '
              '"PATTERN_STEP": {"name": "你找到差了", "remedy": "下一步要把差加到最後一項。"}, '
              '"GIVEN_NUMBER": {"name": "你答了題目裏的數", "remedy": "要的是計算的結果，不是題目給的數。"}')

DIAG = """function diagnose(q,value){
    const p=q.params||{},same=v=>{try{return v!==undefined&&v!==null&&Q.parse(String(v)).cmp(value)===0;}catch(_){return false;}};
    if(/^O-CAL-pattern/.test(q.skill)){if(same(p.c))return 'PATTERN_LAST';if(same(p.step))return 'PATTERN_STEP';}
    if(q.track==='olympiad'&&(String(q.stem_zh||'').match(/\\d+(?:\\.\\d+)?/g)||[]).some(same))return 'GIVEN_NUMBER';
    return 'RECHECK';
  }
  function mark(q,input){"""


def apply(s, ctx):
    s = ctx.once(s, OLD_REMEDY, NEW_REMEDY)
    s = ctx.once(s, "function mark(q,input){", DIAG)
    s = ctx.once(s, "?.code||'RECHECK')", "?.code||diagnose(q,value))")
    s = ctx.once(s, ":'再看清楚題目，試試另一個方法。'};",
                 ":code==='PATTERN_LAST'?'你答了最後一項，下一個數還要再加一次差。':code==='PATTERN_STEP'?'你找到每次加的數了，下一步要把它加到最後一項。':code==='GIVEN_NUMBER'?'你答了題目裏的數，要的是計算的結果。':'再看清楚題目，試試另一個方法。'};")
    s = ctx.once(s, "${esc(mis.remedy)}", "${esc(mis.remedy+(f.code==='RECHECK'&&L.skills.get(q.skill)?.tool?'再用教具試一次。':''))}")
    return s
