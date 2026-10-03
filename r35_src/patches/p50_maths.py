"""R3.5 p50: maths app (primary-school maths 數學群島 + olympiad 思維之塔; inline scripts 34-39, shadow-DOM UI).

What this module changes (see r35_tests/p50_*.py for the proofs):
  M-003/M-004  corrected answer shown in the format the question asks for (core: displayAnswer, explanation text)
  M-011        unit text / 又 accepted when it matches the question, targeted error text (core: mark wrapper)
  M-029/M-030  template wording: 選出最準確的名稱, no answer-leaking brackets, '= ？', '3 條', solid-shape names
  M-036        English small headings in the Chinese maths UI -> plain Chinese
  M-033        parent page text links look like buttons; 44 px targets
  S2-16        question screens show only 「← 返回」 + progress; partner row collapsed elsewhere;
               「家長與進度」 goes through the shell's parent gate and comes back to the maths progress page
  S2-03/S3-17  48 px +/- and tool buttons; same font stack as the main app
  S1-07        disclaimer footers removed; one short 「關於數學內容」 note on the parent progress page

Everything is anchored on code structure; Chinese fragments that the later copy pass rewrites by exact match are
left untouched except where this module removes them on purpose (listed in OBSOLETE_COPY_ROWS).
"""
import json
import re
from pathlib import Path

# rewrite.csv rows (audit_r35/copy) whose anchor text this module removes on purpose
OBSOLETE_COPY_ROWS = {
    'T4114': 'maths footer line 1 (removed)',
    'T4115': 'maths footer line 2 (removed)',
    'T4116': 'maths footer line 3 (removed)',
    'T3837': 'maths catalog coverage note (moved to the parent page note)',
    'T3242': 'toast of WQMathHost.openParentGate (replaced: gate now returns to the maths progress page)',
}


def _once_n(s, a, b, n):
    got = s.count(a)
    if got != n:
        raise ValueError(f'p50: expected {n} occurrence(s), got {got}: {a[:100]!r}')
    return s.replace(a, b)


def _regex_once(s, pattern, repl, flags=0, n=1):
    out, got = re.subn(pattern, repl, s, flags=flags)
    if got != n:
        raise ValueError(f'p50: regex expected {n} match(es), got {got}: {pattern[:100]!r}')
    return out


def _core(s, ctx):
    snippet = (ctx.src / 'p50_core.js').read_text(encoding='utf-8')
    # 1) helpers + new mark() just before library(); the original mark() is kept as mark0()
    s = ctx.once(s, '  function mark(q,input){\n', '  function mark0(q,input){\n')
    s = ctx.once(s, '  function library(data){\n', snippet + '  function library(data){\n')
    # 2) displayAnswer / displayUnit / unitHint on every generated question; explanation shows the displayed answer
    s = ctx.once(s, "    return {id:templateId+':'+seed,templateId,skill:t.skill,",
                 "    const r35d=r35Display(t,p,answer);\n    return {id:templateId+':'+seed,templateId,skill:t.skill,")
    s = ctx.once(s, 'explanation:fill(t.explanation,p),', 'explanation:fill(t.explanation,r35FillParams(p,answer,r35d)),')
    s = ctx.once(s, "strategy:lib.skills.get(t.skill).strategy||null};",
                 "strategy:lib.skills.get(t.skill).strategy||null,displayAnswer:r35d.text,displayUnit:r35d.unit,unitHint:r35d.unitHint};")
    # 3) speech: both '= ?' forms are read as a question (the stems now use the full-width mark)
    s = ctx.once(s, ".replace(/=\\s*\\?/g,", ".replace(/=\\s*[?？]/g,")
    return s


# ---------------------------------------------------------------------------------------------------------------------
# s39: maths UI (shadow DOM)
# ---------------------------------------------------------------------------------------------------------------------
# Small headings of the maths UI, English -> plain Chinese (M-036). Each source string occurs exactly once in script 39.
EYEBROWS = [
    ('A little discovery, every day', '每天一個小發現'),
    ('The mathematics islands', '從一個島開始'),
    ('Your collection of methods', '用過的方法，都收在這裏'),
    ('Learn by doing', '邊做邊學'),
    ('One lesson, one discovery', '一課，一個發現'),
    ('Find your starting point', '找出從哪裏開始'),
    ('Practice a little, remember more', '每次練一點，記得更牢'),
    ('A starting point, not a label', '這是起點，不是評級'),
    ('You kept thinking', '你一直有動腦筋'),
    ('A clear picture, not a comparison', '看清楚進度，不和別人比'),
    ('Local family profiles', '在這部裝置上'),
    ('Welcome back', '歡迎回來'),
    ('A moment away from the screen', '離開螢幕一下'),
]

# The one short note that replaces the three-paragraph footer; it sits at the end of the maths parent page only.
ABOUT_NOTE = ('<div class="note about-math"><strong>關於數學內容</strong>'
              '<p>題目依小學課程範圍編寫，還沒有經教師逐題審核。發現題目有問題，請在題目頁按「這題可能有問題」。</p></div>')


def _ui(s, ctx):
    css = json.dumps((ctx.src / 'p50_ui.css').read_text(encoding='utf-8'), ensure_ascii=False)
    helpers = (ctx.src / 'p50_ui.js').read_text(encoding='utf-8').replace('__R35_CSS__', css)
    if not helpers.endswith('\n'):
        helpers += '\n'
    # helpers after the tower stage names
    s = _regex_once(s, r"( const towerNames=\[[^\]]*\];\n)", lambda m: m.group(1) + helpers)

    # small English headings -> Chinese
    for old, new in EYEBROWS:
        s = _once_n(s, old, new, 1)

    # corrected answer / full solution / worked example: displayed in the format the question asks for
    s = _once_n(s, ":fraction(q.answer))}${q.remainder!==null?' 餘 '+esc(q.remainder):''}</strong><p>",
                ":ansNum(q))}${q.remainder!==null?' 餘 '+esc(q.remainder):''}</strong><p>", 1)
    s = _once_n(s, ":fraction(q.answer))}${q.remainder!==null?' 餘 '+esc(q.remainder):''} ${esc(q.unit)}</p>",
                ":ansNum(q))}${q.remainder!==null?' 餘 '+esc(q.remainder):''} ${esc(ansUnit(q))}</p>", 1)
    s = _once_n(s, ":fraction(ex.answer))}${ex.remainder!==null?' 餘 '+ex.remainder:''}</p>",
                ":ansNum(ex))}${ex.remainder!==null?' 餘 '+ex.remainder:''}${ansUnit(ex)?' '+esc(ansUnit(ex)):''}</p>", 1)

    # lesson screens: focus mode drops the stage row / title block on question screens and the duplicate pause button
    s = _once_n(s, 'const head=`<div class="lesson-panel"><div class="lesson-title"><div><div class="eyebrow">',
                'const r35q=r35Focus()&&!!currentQ();const head=`<div class="lesson-panel">${r35q?\'\':`<div class="lesson-title"><div><div class="eyebrow">', 1)
    s = _once_n(s, "<h1>${esc(title)}</h1></div>${btn('稍後繼續','pause','quiet')}</div>${s.mode==='lesson'?`<div class=\"steps\">",
                "<h1>${esc(title)}</h1></div>${r35Focus()?'':btn('稍後繼續','pause','quiet')}</div>`}${s.mode==='lesson'&&!r35q?`<div class=\"steps\">", 1)

    # shell: own header on question screens, focus class, no partner row there, no disclaimer footer
    s = _once_n(s, "app.innerHTML=`<div class=\"wqm ${store.profile.grade>=5?'older':''}\"><div class=\"shell\">${header()}",
                "app.innerHTML=`<div class=\"wqm ${store.profile.grade>=5?'older':''}${r35Focus()?' focus':''}\"><div class=\"shell\">${r35Header()}", 1)
    s = _regex_once(s, r'<footer class="foot">.*?</footer>', '', flags=re.S)
    s = _once_n(s, "function companion(){\n  if(!root.WQM_INTEGRATED||!root.WQ32?.mathHTML)return '';",
                "function companion(){\n  if(!root.WQM_INTEGRATED||!root.WQ32?.mathHTML||r35Focus())return '';", 1)

    # catalog: the coverage disclaimer moves to the parent page note
    s = _regex_once(s, r'\n <div class="note">現在提供小一至小六五個範疇的 .*?</div>(?=\n)', '', flags=re.S)

    # parent page: wrapper for button styling + the one short note at the end
    s = _once_n(s, '${btn(\'聽英文\',\'term:\'+g.en,\'quiet\')}</div>`).join(\'\')}</div>`;}',
                '${btn(\'聽英文\',\'term:\'+g.en,\'quiet\')}</div>`).join(\'\')}</div>' + ABOUT_NOTE + '</div>`;}', 1)
    s = _once_n(s, 'return `<div class="section-head"><div><div class="eyebrow">看清楚進度，不和別人比</div>',
                'return `<div class="parentview"><div class="section-head"><div><div class="eyebrow">看清楚進度，不和別人比</div>', 1)

    # styles inside the shadow root
    s = _once_n(s, "style.textContent+='\\n'+(root.WQForestMathCSS||'');",
                "style.textContent+='\\n'+(root.WQForestMathCSS||'');style.textContent+='\\n'+R35CSS;", 1)
    return s


# ---------------------------------------------------------------------------------------------------------------------
# s33: 「家長與進度」 goes through the shell's own parent gate and comes back to the maths progress page
# ---------------------------------------------------------------------------------------------------------------------
def _gate(s, ctx):
    # flag: the gate was opened from the maths app; it expires after 10 minutes and when the child leaves the parent route
    s = _once_n(s, "  root.WQMathHost=Object.freeze({apiVersion:1,",
                "  let wqmGateReturn=0;\n  root.WQMathHost=Object.freeze({apiVersion:1,", 1)
    s = _once_n(s, "    openParentGate(){go('parent');render();toast('先完成英文家長驗證，再按「數學進度及設定」。');},",
                "    openParentGate(){wqmGateReturn=Date.now();go('parent');render();toast('請輸入家長密碼，完成後會回到數學進度。');},", 1)
    s = _once_n(s, "  function decorate(){\n    const rt=(location.hash||'#kid').slice(1).split('?')[0],app=$('#app');if(!app)return;\n",
                "  function decorate(){\n    const rt=(location.hash||'#kid').slice(1).split('?')[0],app=$('#app');if(!app)return;\n"
                "    if(wqmGateReturn){\n"
                "      if(!['parent','report'].includes(rt)||Date.now()-wqmGateReturn>600000)wqmGateReturn=0;\n"
                "      else if(!isLoggedIn()||v23ParentAllowed()){wqmGateReturn=0;setTimeout(()=>{try{root.WQMathApp?.open?.('parent');}catch(err){toast(err.message,'bad');}},0);}\n"
                "    }\n", 1)
    return s


# ---------------------------------------------------------------------------------------------------------------------
# s34 / s35: font stack, '= ？', and template wording (display text only; answers, hints logic and params are untouched)
# ---------------------------------------------------------------------------------------------------------------------
DATA_REPLACEMENTS = [
    # (old, new, expected count inside script 35)
    ('選最具體的名稱', '選出最準確的名稱', 24),
    ('本題選較具體的名稱', '本題選最準確的名稱', 12),
    ('本題按全部特徵選最具體名稱', '本題按全部特徵選最準確的名稱', 12),
    ('選最直接的判斷', '選出最符合的說法', 6),
    ('以看圖者方向判斷', '以你看圖的方向判斷', 6),
    ('以看圖者的方向作參考', '以你看圖的方向作參考', 12),
    ('用24小時報時制', '用 24 小時制', 6),
    ('正倍數', '倍數', 23),
    # answer-leaking brackets in option labels (labels are display text; answer keys are the option values)
    ('長方形（非正方形）', '長方形', 21),
    ('平行四邊形（非長方形）', '平行四邊形', 6),
    ('菱形（非正方形）', '菱形', 6),
    ('等腰三角形（非等邊）', '等腰三角形', 6),
    ('"Rectangle, not square"', '"Rectangle"', 9),
    ('"Rhombus, not square"', '"Rhombus"', 3),
    ('"Parallelogram, not rectangle"', '"Parallelogram"', 3),
    ('"Isosceles, not equilateral"', '"Isosceles"', 3),
    # solid-shape names: one set (正方體、長方體、圓柱體、圓錐體、球體) in 1S1 and 2S1
    ('方塊形', '正方體', 6),
    ('圓柱形', '圓柱體', 6),
    ('圓錐形', '圓錐體', 6),
    ('球形', '球體', 6),
    ('圓柱的上下兩個平面', '圓柱體的上下兩個平面', 3),
]
# number and unit are separated by a space everywhere else in the question text
SPACING_REGEX = [
    (r'(\d)條直邊', r'\1 條直邊', 12),
    (r'"(\d)條"', r'"\1 條"', 24),
]


def _data(s, ctx):
    # font stack of the main app (S3-17), both copies in the maths CSS
    s = _once_n(s, 'system-ui,-apple-system,\\"Noto Sans CJK TC\\",\\"Microsoft JhengHei\\",sans-serif',
                '\\"PingFang HK\\",\\"Noto Sans CJK HK\\",\\"Microsoft JhengHei\\",system-ui,sans-serif', 2)
    # '= ?' -> '= ？' in the Chinese stem and speech text of the base templates (script 34)
    s = _regex_once(s, r'("(?:stem_zh|speech_yue)": "(?:[^"\\]|\\.)*= )\?"', lambda m: m.group(1) + '？"', n=90)
    # wording inside script 35 only (the R3 template data)
    a = s.index('(function(){const ext={"skills":[')
    b = s.index(';const d=globalThis.WQMathData;d.skills.push(...ext.skills);')
    if not 0 < a < b:
        raise ValueError('p50: script 35 boundaries not found')
    seg = s[a:b]
    for old, new, n in DATA_REPLACEMENTS:
        seg = _once_n(seg, old, new, n)
    for pat, repl, n in SPACING_REGEX:
        seg = _regex_once(seg, pat, repl, n=n)
    return s[:a] + seg + s[b:]


def apply(s, ctx):
    s = _core(s, ctx)
    s = _ui(s, ctx)
    s = _gate(s, ctx)
    s = _data(s, ctx)
    ctx.evidence['p50'] = {'obsolete_copy_rows': OBSOLETE_COPY_ROWS}
    return s
