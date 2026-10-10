"""R3.10 t13 - word forms in the dictation import data layer (no new-interface elements are used).

Checks, through the host-closure bridge (window.__r37): V20.candidates() on an OCR-like document, the patched v20Dictionary
(books / ran / happier / color / ice cream / boxes are known, have Chinese, are not flagged "not in the built-in bank", ran is
pre-selected), a word that does not exist (blorp) is still flagged, derived words stay hints, saveRange() fills Chinese / picture
for forms of a known word without touching what the parent typed, the saved record survives validateDb(), and no console error.
    WQ33_APP=app/index.html python3 r37_tests/t13_morph_import.py
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t13')
NOT_IN_BANK = '內置題庫沒有這個字'
WORDS = ['books', 'ran', 'happier', 'color', 'ice cream', 'boxes', 'quickly', 'blorp']
EXTRA = ['ice-cream', 'icecream', 'went', 'children', "don't", 'played', 'making', 'Books']

BUILD = """((words)=>{
 const lines=words.map((t,i)=>({text:t,words:t.split(' ').map((x,j)=>({text:x,confidence:92,bbox:{x0:20+j*140,y0:20+i*60,x1:140+j*140,y1:70+i*60}}))}));
 const doc=V20.fromOCR({blocks:[{paragraphs:[{lines}]}]},'t13');
 const mk=(dict)=>V20.candidates(doc,{mode:'list',dictionary:dict,common:v20.common}).map(c=>({en:c.en,known:c.known,zh:c.zh,sel:c.selected,
   why:c.excludedReason||'',reasons:c.reviewReasons,choices:c.choices,kind:c.kind}));
 return {patched:mk(v20Dictionary),raw:mk(V20.dictIndex(sharedEntries)),size:v20Dictionary.size,keys:[...v20Dictionary.keys()].length};
})"""

with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37morph', '小明')
    go(pg, '#range-new', 600)

    res = pg.evaluate("(a)=>window.__r37(a[0])(a[1])", [BUILD, WORDS + EXTRA])
    by = {r['en']: r for r in res['patched']}
    raw = {r['en']: r for r in res['raw']}
    C.ok(res['size'] == res['keys'], 'dictionary iteration still matches its size (only get/has are overridden)')

    for w in ['books', 'ran', 'happier', 'color', 'ice cream', 'boxes']:
        r = by.get(w)
        C.ok(r is not None, f'{w} became a candidate')
        if not r:
            continue
        C.ok(r['known'] is True, f'{w}: known')
        C.ok(bool(r['zh']) or len(r['choices']) > 1, f'{w}: has a Chinese meaning ({r["zh"]!r} / {r["choices"]})')
        C.ok(not any(NOT_IN_BANK in x for x in r['reasons']), f'{w}: not flagged as missing from the bank ({r["reasons"]})')
        C.ok(r['sel'] is True and not r['why'], f'{w}: pre-selected ({r["why"]!r})')
    # the same OCR result with the untouched dictionary shows the old behaviour (test is sensitive)
    for w in ['books', 'ran', 'color', 'boxes']:
        C.ok(raw[w]['known'] is False, f'control: {w} is unknown to the raw dictionary')
    C.ok(raw['ran']['sel'] is False and '太短' in raw['ran']['why'], 'control: ran was rejected as too short by the raw dictionary')
    C.ok(by['books']['zh'] == '書', f'books -> 書 (got {by["books"]["zh"]!r})')
    C.ok(by['ran']['zh'] == '跑', f'ran -> 跑 (got {by["ran"]["zh"]!r})')
    for w in ['ice-cream', 'icecream', 'went', 'played', 'making', "don't", 'Books']:
        r = by.get(w)
        C.ok(r is not None and r['known'] is True and not any(NOT_IN_BANK in x for x in r['reasons']), f'{w}: known ({r and r["reasons"]})')
    C.ok(by['children']['known'] is True and by['quickly']['known'] is True, 'words already in the bank are untouched')
    C.ok(by['blorp']['known'] is False and any(NOT_IN_BANK in x for x in by['blorp']['reasons']), 'a word that does not exist is still flagged')
    C.ok(res['raw'][WORDS.index('quickly')]['known'] is True, 'control: quickly was already a headword')

    # entry shape, lemma helpers, derived words stay hints
    info = ev(pg, """(()=>{const g=(w)=>v20Dictionary.get(w);return {
      books:g('books'),ran:g('ran'),has:v20Dictionary.has('books'),blorp:v20Dictionary.has('blorp'),
      careless:v20Dictionary.has('painful'),carelessInfo:s55Info('painful'),adv:v20Dictionary.has('carelessly'),advInfo:s55Info('carelessly'),lemma:s55Lemma(['Pencils','Cats','Dogs','Apples'].find(w=>!s55HasRaw(w.toLowerCase()))),lemmaIn:['Pencils','Cats','Dogs','Apples'].find(w=>!s55HasRaw(w.toLowerCase())),
      same:[s55SameWord('book','books'),s55SameWord('ran','running'),s55SameWord('color','colour'),s55SameWord('quick','quickly'),s55SameWord('bus','busy'),s55SameWord('glass','glasses')],
      sizeAfter:v20Dictionary.size}})()""")
    C.ok(info['has'] is True and info['books']['_base'] == 'book' and info['books']['key'] == 'books', 'books entry points at book')
    C.ok(info['books']['senses'] and all(s['headword'] == 'books' for s in info['books']['senses']), 'senses carry the typed form as headword')
    C.ok(info['books']['senses'][0]['zhHK'] == '書' and info['books']['examples'] == [], 'zhHK kept from the base; no borrowed examples')
    C.ok(info['ran']['_base'] == 'run' and info['ran']['_label'] == '過去式', 'ran -> run, 過去式')
    C.ok(info['blorp'] is False, 'blorp is not a headword')
    C.ok(info['careless'] is False and info['carelessInfo'] and info['carelessInfo']['derived'] is True and info['carelessInfo']['base'] == 'pain',
         'derived words (painful) are a hint (s55Info) but not a dictionary hit')
    # R3.13: an -ly adverb that is not a headword is the adverb of its adjective: linked, labelled 副詞, not "not in the bank"
    C.ok(info['adv'] is True and info['advInfo'] and info['advInfo']['derived'] is False and info['advInfo']['base'] == 'careless' and info['advInfo']['label'] == '副詞',
         'carelessly is the adverb of careless (a form, label 副詞)')
    C.ok(info['lemma'] and info['lemma']['base'] == info['lemmaIn'].lower()[:-1], f's55Lemma folds case ({info["lemmaIn"]} -> {info["lemma"]})')
    C.ok(info['same'] == [True, True, True, False, False, False], f's55SameWord: {info["same"]}')
    C.ok(info['sizeAfter'] == res['size'], 'looking words up never grows the dictionary')

    # ---- save: Chinese / picture for forms of a known word; the parent's own text wins ----
    SETUP = """((items)=>{
      const lines=items.map((t,i)=>({text:t,words:[{text:t,confidence:95,bbox:{x0:20,y0:20+i*60,x1:200,y1:70+i*60}}]}));
      const doc=V20.fromOCR({blocks:[{paragraphs:[{lines}]}]},'t13s');
      v20.documents=[doc];v20.rawDirty=false;
      v20.items=V20.candidates(doc,{mode:'list',dictionary:v20Dictionary,common:v20.common});
      v20.items.forEach(c=>{c.selected=true;c.reviewed=true;c.excludedReason='';});
      const mine=v20.items.find(c=>c.en==='boxes');if(mine){mine.zh='盒子（家長寫的）';}
      v20Origin=v20Owner();importDraft.title='t13 forms';
      return v20.items.map(c=>[c.en,c.zh]);})"""
    SAVE_ITEMS = ['books', 'ran', 'color', 'boxes', 'carelessly', 'blorp']
    pre = pg.evaluate("(a)=>window.__r37(a[0])(a[1])", [SETUP, SAVE_ITEMS])
    C.ok(len(pre) == len(SAVE_ITEMS), f'six items prepared ({pre})')
    n0 = ev(pg, 'db.words.length')
    pg.evaluate("()=>window.__r37('saveRange()')")
    pg.wait_for_timeout(700)
    C.ok(ev(pg, 'db.words.length') == n0 + len(SAVE_ITEMS), 'saveRange stored the six words (R3.12: no confirm tick is needed any more)')
    rows = ev(pg, """(()=>{const r=db.ranges[db.ranges.length-1];return db.words.filter(w=>w.rangeId===r.id).map(w=>({en:w.en,zh:w.zh,emoji:w.emoji,example:w.example,keys:Object.keys(w).sort(),
      pic:(()=>{try{const i=imageFor(w);return i?{src:String(i.src).slice(0,30),custom:!!i.custom}:null;}catch(e){return 'ERR '+e.message;}})(),
      html:(()=>{try{return picture(w).slice(0,60);}catch(e){return 'ERR '+e.message;}})()}));})()""")
    W = {r['en']: r for r in rows}
    C.ok(W['books']['zh'] == '書', f'saved books has Chinese ({W["books"]["zh"]!r})')
    C.ok(W['books']['emoji'] != '', f'saved books has a picture emoji ({W["books"]["emoji"]!r})')
    C.ok(W['ran']['zh'] == '跑', f'saved ran has Chinese ({W["ran"]["zh"]!r})')
    # colour has several senses in the bank: the parent picks one (reviewReasons), so an empty zh here is the honest answer
    C.ok(W['color']['zh'] != '' or len(by['color']['choices']) > 1, f'saved color has Chinese or is a many-sense word ({W["color"]["zh"]!r}, {by["color"]["choices"]})')
    C.ok(len(by['color']['choices']) <= 1 or any('意思' in x for x in by['color']['reasons']), 'many-sense color asks the parent to choose')
    C.ok(W['boxes']['zh'] == '盒子（家長寫的）', "the parent's own Chinese is not overwritten")
    C.ok(W['carelessly']['zh'] == '' or W['carelessly']['zh'] == pre[SAVE_ITEMS.index('carelessly')][1], 'derived word is not given the base meaning on save')
    C.ok(W['blorp']['zh'] == '' and W['blorp']['emoji'] == '', 'unknown word stays empty')
    C.ok(all('base' not in r['keys'] and 'form' not in r['keys'] for r in rows), 'db.words keeps its schema (no base/form field)')
    C.ok(W['books']['pic'] and not isinstance(W['books']['pic'], str), f'picture lookup finds the picture of book for books ({W["books"]["pic"]})')
    C.ok('<img' in W['books']['html'] or 'emoji' in W['books']['html'] or W['books']['pic'], 'books renders a picture')
    C.ok(W['blorp']['pic'] is None, 'blorp has no picture')

    # the saved copy survives a reload through validateDb (the strict, field-whitelisting reader)
    again = ev(pg, """(()=>{const x=validateDb(JSON.parse(localStorage.getItem(dbKey())));const r=x.ranges[x.ranges.length-1];
      return x.words.filter(w=>w.rangeId===r.id).map(w=>[w.en,w.zh,w.emoji]);})()""")
    A = {a[0]: a for a in again}
    C.ok(A['books'][1] == '書' and A['books'][2] != '', 'books keeps Chinese and picture after validateDb')
    C.ok(A['ran'][1] == '跑', 'ran keeps Chinese after validateDb')

    C.ok(not errs, f'no console/page errors: {errs[:3]}')
    b.close()

C.done()
