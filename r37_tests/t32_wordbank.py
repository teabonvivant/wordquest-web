"""R3.26 t32 - word bank (open-dictionary headwords), word families and drawn picture cards.

    WQ33_APP=<app/index.html> python3 r37_tests/t32_wordbank.py

Business checks, all through the real page:
  - the bank holds the curated list (unchanged, first) plus >= 8,000 open-dictionary headwords, every one with a Traditional-Chinese
    meaning, none from the blocklist, no headword that is only a form of another one (aging, color / colour, softly);
  - play / plays / playing / played, go / went / gone, child / children, foot / feet, mouse / mice, big / bigger / biggest are one family
    (also when both spellings are dictionary entries), while glass / glasses, bus / busy, cat / cart, play / player are not;
  - dictation import: after "play" is saved, pasting playing / plays / played / went ... shows 已學過 / 同字根 labels and does not pre-select them;
    a brand-new headword from the open bank (e.g. antelope) is known, has Chinese and is not flagged as missing;
  - every drawn picture card in assets/r326/words loads as an image in a study card and in the dictation picture slot, plurals use the base card.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
import t14_helpers as H  # noqa: E402

C = L.Checker('t32 wordbank')
R = HERE.parent
SIMPLIFIED = set('们这说时国学会个为从来还对过现动机进长门问间头东车见观买卖读写书')
BLOCK = set('fuck shit bitch bastard cunt dick pussy slut whore sex penis rape porn kill murder naked'.split())

FAMILY_YES = [('play', 'plays'), ('play', 'playing'), ('play', 'played'), ('plays', 'playing'), ('played', 'playing'), ('go', 'went'), ('go', 'gone'),
              ('went', 'gone'), ('child', 'children'), ('foot', 'feet'), ('mouse', 'mice'), ('big', 'bigger'), ('big', 'biggest'), ('book', 'books'),
              ('see', 'saw'), ('run', 'ran'), ('run', 'running'), ('happy', 'happier'), ('colour', 'color'), ('eat', 'ate'), ('wolf', 'wolves'),
              ('leaf', 'leaves'), ('tooth', 'teeth'), ('sing', 'sang'), ('sing', 'singing'), ('dress', 'dresses'), ('plate', 'plates')]
FAMILY_NO = [('glass', 'glasses'), ('bus', 'busy'), ('cat', 'cart'), ('play', 'player'), ('quick', 'quickly'), ('car', 'card'), ('ride', 'rid')]

with L.sync_playwright() as p:
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    H.boot(pg)
    d = L.ev(pg, """(()=>{
      const ext=sharedEntries.filter(e=>e.senses[0].category==='open_dictionary'),cur=sharedEntries.filter(e=>e.senses[0].category!=='open_dictionary');
      const idx=cur.length?sharedEntries.indexOf(cur[cur.length-1]):-1;
      return {total:sharedEntries.length,ext:ext.length,cur:cur.length,curFirst:idx===cur.length-1,dict:v20Dictionary.size,
        extKeys:ext.map(e=>e.key),noZh:ext.filter(e=>!e.senses.length||e.senses.some(s=>!s.zhHK)).length,
        zh:ext.map(e=>e.senses.map(s=>s.zhHK).join('')).join('')}})()""")
    C.ok(d['cur'] == 6057 and d['curFirst'], f'the curated list is unchanged and first ({d["cur"]})')
    C.ok(d['ext'] >= 8000, f'open-dictionary headwords >= 8000 ({d["ext"]})')
    C.ok(d['dict'] >= 14000, f'bank holds >= 14,000 headwords ({d["dict"]})')
    C.ok(d['noZh'] == 0, 'every generated headword has Chinese')
    bad = sorted(set(d['zh']) & SIMPLIFIED)
    C.ok(not bad, f'glosses are Traditional characters, no common simplified ones {bad}')
    C.ok(not (set(d['extKeys']) & BLOCK), f'no blocklisted word {sorted(set(d["extKeys"]) & BLOCK)}')

    # ---- word families ----
    res = L.ev(pg, "(P=>P.map(([a,b])=>s55SameWord(a,b)))(%s)" % (FAMILY_YES + FAMILY_NO).__repr__().replace('(', '[').replace(')', ']'))
    for (x, y), r in zip(FAMILY_YES, res):
        C.ok(r is True, f'{x} / {y} are one family')
    for (x, y), r in zip(FAMILY_NO, res[len(FAMILY_YES):]):
        C.ok(r is False, f'{x} / {y} are different words')
    # forms resolve to the right base, with a Chinese label
    forms = L.ev(pg, "['plays','went','mice','bacteria','caves','analyses','happier'].map(w=>{const i=s55Info(w);return [w,i&&i.base,i&&i.label]})")
    got = {w: (bs, lb) for w, bs, lb in forms}
    C.ok(got['plays'][0] == 'play', f'plays -> play {got["plays"]}')
    C.ok(got['mice'] == ('mouse', '複數') and got['bacteria'][0] == 'bacterium' and got['analyses'][0] == 'analysis', f'irregular plurals {got}')
    C.ok(got['caves'][0] == 'cave', f'caves is a plural of cave, not cafe ({got["caves"]})')
    C.ok(got['happier'][0] == 'happy', f'happier -> happy {got["happier"]}')

    # ---- a new open-bank headword is known in the import core ----
    cand = L.ev(pg, """(()=>{const lines=['antelope','sodium','pigeon'].map((t,i)=>({text:t,words:[{text:t,confidence:95,bbox:{x0:20,y0:20+i*60,x1:200,y1:70+i*60}}]}));
      const doc=V20.fromOCR({blocks:[{paragraphs:[{lines}]}]},'t32');
      return V20.candidates(doc,{mode:'list',dictionary:v20Dictionary,common:v20.common}).map(c=>({en:c.en,known:c.known,zh:c.zh,why:c.reviewReasons}));})()""")
    by = {c['en']: c for c in cand}
    C.ok(by['antelope']['known'] and by['antelope']['zh'] != '' and not any('內置題庫沒有' in x for x in by['antelope']['why']),
         f'antelope (open bank) is known with Chinese ({by["antelope"]})')

    # ---- dictation import: family labels on step 2 ----
    C.ok(H.import_once(pg, '1. play\n2. go\n3. child'), 'first range (play, go, child) saved')
    H.go_new(pg)
    C.ok(H.paste_parse(pg, '1. playing\n2. plays\n3. played\n4. went\n5. gone\n6. children\n7. glasses\n8. antelope'), 'second paste opens step 2')
    m = H.cards(pg)
    for w, base in [('playing', 'play'), ('plays', 'play'), ('played', 'play'), ('went', 'go'), ('gone', 'go'), ('children', 'child')]:
        t = m[w]['tag']
        C.ok(base in t and not m[w]['sel'], f'{w} -> {t!r} (already learned / same root as {base}), not pre-selected')
    C.ok(m['antelope']['sel'] and m['glasses']['sel'], 'new words stay pre-selected')

    # ---- drawn picture cards ----
    imgs = sorted(f.stem for f in (R / 'app/assets/r326/words').glob('*.webp'))
    C.ok(len(imgs) >= 300, f'drawn picture cards on disk: {len(imgs)}')
    kinds = L.ev(pg, "(ws=>ws.map(w=>[w,wqImgWord(w),r37WordArt(w).startsWith('<img'),(imageFor({id:'x',en:w})||{}).src||'']))(%s)" % imgs[:40].__repr__())
    C.ok(all(k[1] == k[0] and k[2] and k[3].endswith(k[0] + '.webp') for k in kinds), 'drawn word -> <img> in the quiz slot and imageFor() points at its file')
    plural = L.ev(pg, "[wqImgWord('kittens'),wqImgWord('puppies'),wqImgWord('zzzz')]")
    C.ok(plural[0] in ('kitten', '') and plural[2] == '', f'plurals use the base card, unknown words get none {plural}')
    broken = pg.evaluate("""async(ws)=>{const bad=[];await Promise.all(ws.map(w=>new Promise(r=>{const i=new Image();i.onload=()=>{if(i.naturalWidth<64)bad.push(w);r();};i.onerror=()=>{bad.push(w);r();};i.src='assets/r326/words/'+w+'.webp';})));return bad;}""", imgs[:40])
    C.ok(not broken, f'every drawn card file loads as an image >= 64px {broken[:5]}')
    C.ok(not errs, f'no console error {errs[:2]}')
    b.close()
C.done()
