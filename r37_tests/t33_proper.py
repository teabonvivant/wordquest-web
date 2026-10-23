"""R3.27 t33 - proper nouns in the dictation import (names, HK surnames, places, countries, festivals, characters).

    WQ33_APP=<app/index.html> python3 r37_tests/t33_proper.py

Business checks, all through the real page:
  - a name / place / festival from r37_src/wordbank_proper.json is known with the right Chinese (Peter 彼得（人名）, Kowloon 九龍);
    Mr Chan / Miss Wong / Dr Ho read as 陳先生 / 黃小姐 / 何醫生; an existing word keeps its meaning (hung = hang, bill = 帳單) and a
    capitalised Bill offers both 帳單 and 比爾; a name is never the base of a word form (maxed is not Max, bills is not 比爾);
  - proper nouns stay out of sharedEntries, so no game or quiz asks them;
  - a pasted list keeps Amy / Alice / Adam whole (the OCR "acap -> a cap" repair must not split them), labels 人名 / 地名 and pre-selects them;
  - in a passage, names (Peter, Amy, Rose mid-sentence) are left un-selected with 像人名, while Mark at the start of a sentence stays a word.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
import t14_helpers as H  # noqa: E402

C = L.Checker('t33 proper nouns')
EXPECT = {'Peter': '彼得（人名）', 'Amy': '艾美（人名）', 'Oliver': '奧利弗（人名）', 'Kowloon': '九龍', 'Mong Kok': '旺角', 'Ocean Park': '海洋公園',
          'China': '中國', 'Chinese New Year': '農曆新年', "Valentine's Day": '情人節', 'Mr Chan': '陳先生', 'Mrs. Lee': '李太太', 'Dr Ho': '何醫生',
          'Miss Wong': '黃小姐／王小姐', 'Chan': '陳（姓氏）', 'Doraemon': '多啦A夢', 'Christmas': '聖誕節', 'hung': '掛起', 'bill': '帳單', 'olive': None}

with L.sync_playwright() as p:
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    H.boot(pg)
    g = L.ev(pg, "(ws=>{const o={};for(const w of ws){const x=V20.gloss(w,v20Dictionary);o[w]=[x.known,x.choices]}return o})(%r)"
             % (list(EXPECT) + ['Bill', 'bills', 'maxed', 'Max']))
    for w, zh in EXPECT.items():
        if zh is None:
            C.ok(g[w][0] and not any('人名' in c for c in g[w][1]), f'{w} keeps its own meaning {g[w]}')
        else:
            C.ok(g[w][0] and g[w][1] == [zh], f'{w} -> {zh} ({g[w]})')
    C.ok(set(g['Bill'][1]) == {'帳單', '比爾（人名）'}, f'capital Bill offers the word and the name {g["Bill"]}')
    C.ok(not any('比爾' in c for c in g['bills'][1]), f'bills is the plural of bill, not 比爾 {g["bills"]}')
    C.ok(not any('麥克斯' in c for c in g['maxed'][1]), f'maxed is not a form of the name Max {g["maxed"]}')
    C.ok(g['Max'][1] == ['麥克斯（人名）'], f'Max is a name {g["Max"]}')
    leak = L.ev(pg, "sharedEntries.filter(e=>e.senses.some(s=>s.category==='proper_noun'||s.category==='proper_name')).length")
    C.ok(leak == 0, f'no proper noun in sharedEntries (games / quizzes) ({leak})')

    # ---- a pasted list ----
    H.go_new(pg)
    C.ok(H.paste_parse(pg, '1. Peter\n2. Amy\n3. Alice\n4. Adam\n5. Kowloon\n6. Mr Chan\n7. Christmas\n8. apple'), 'list paste opens step 2')
    m = H.cards(pg)
    for w in ['Peter', 'Amy', 'Alice', 'Adam', 'Kowloon', 'Mr Chan', 'Christmas', 'apple']:
        C.ok(w in m and m[w]['sel'], f'{w} is one card and pre-selected ({m.get(w)})')
    C.ok(not any(k.lower() in ('a my', 'a lice', 'a dam', 'my', 'lice', 'dam') for k in m), f'no split names {sorted(m)}')
    for w, tag in [('Peter', '人名'), ('Amy', '人名'), ('Kowloon', '地名'), ('Mr Chan', '人名')]:
        C.ok(w in m and m[w]['tag'] == tag, f'{w} labelled {tag} ({m.get(w, {}).get("tag")!r})')
    C.ok(m.get('Christmas', {}).get('tag', '') == '', 'a curated word (Christmas) gets no extra label')
    zh = L.ev(pg, "Object.fromEntries(v20.items.map(c=>[c.en,c.zh]))")
    C.ok(zh.get('Peter') == '彼得（人名）' and zh.get('Mr Chan') == '陳先生', f'Chinese filled in {zh}')

    # ---- a passage (fresh page: step 2 of the list is still open) ----
    b.close()
    b, ctx, pg, errs2 = L.open_page(p, 390, 844, True)
    errs += errs2
    H.boot(pg)
    H.go_new(pg)
    C.ok(H.paste_parse(pg, 'Peter and Amy go to Ocean Park with their teacher. Mark the answer in your book. They give the flowers to Rose.'),
         'passage paste opens step 2')
    m = H.cards(pg)
    for w in ['Peter', 'Amy', 'Rose']:
        C.ok(w in m and not m[w]['sel'] and '人名' in m[w]['tag'], f'{w} in a passage is a name, not pre-selected ({m.get(w)})')
    C.ok('Mark' in m and m['Mark']['sel'], f'Mark at the start of a sentence stays a word ({m.get("Mark")})')
    C.ok('teacher' in m and m['teacher']['sel'], 'ordinary words stay pre-selected')
    pg.screenshot(path=str(HERE / 'shots_t33_passage.png'))
    low = pg.evaluate("""()=>{const out=[];const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return [.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]),m[3]===undefined?1:m[3]]};
      const bg=el=>{for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(c&&c!=='transparent'&&lum(c)[1]>.5)return c}return 'rgb(11,16,48)'};
      for(const el of document.querySelectorAll('#import-v20 *, #v20-import-dock *')){if(el.classList.contains('p40-num'))continue;
       const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');if(!t)continue;const r=el.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>844)continue;
       const a=lum(getComputedStyle(el).color)[0],b=lum(bg(el))[0],cr=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(cr<3)out.push(t.slice(0,16)+' '+cr.toFixed(2));}return out;}""")
    C.ok(not low, f'step-2 text is readable (contrast >= 3:1 against its face) {low}')
    C.ok(not errs, f'no console error {errs[:2]}')
    b.close()
C.done()
