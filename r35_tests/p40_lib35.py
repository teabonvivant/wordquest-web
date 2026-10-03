"""Shared helpers for the p40 (school dictation) browser tests of R3.5.

* WQ33_APP (see r33_tests/wq33.py) picks the index.html under test; the file on disk is never modified.
* The page is served through Playwright route(): the SAME html plus a read-only test bridge `window.__ev(code)`
  (an eval inside the host closure) spliced in just before the injection anchor. It is NOT part of the app.
* Speech: a fake speechSynthesis (modes 'gb' = one en-GB voice that plays, 'none' = no voices at all,
  'fail' = an en-GB voice whose utterances error out).
* OCR: window.Tesseract is replaced by a stub that forwards the (processed) image to the NATIVE tesseract
  binary through pytesseract (same approach as the earlier audit), or answers with a canned result.
"""
import base64
import os
import io
import json
import re
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r33_tests'))
sys.path.insert(0, str(R / 'r34_tests'))
import wq33  # noqa: E402
from wq33 import APP, URL, PW, new_page, register, unlock_parent, sync_playwright  # noqa: E402,F401
from p40_lib import Checker  # noqa: E402,F401

ANCHOR = '\ninstallMediaEvents();\nrender();'
BRIDGE = "\nwindow.__ev=(s)=>eval(s);\n"
IMG = Path('/home/claude/audit_r35/dictation/images')
SHOTS = Path('/home/claude/audit_r35/r35/p40')
SHOTS.mkdir(parents=True, exist_ok=True)

SPEECH = r"""
(()=>{
 const mode=window.__speechMode||'gb';
 window.__speak=[];
 const voices=mode==='none'?[]:[{name:'Test English (UK)',lang:'en-GB',default:true,localService:true,voiceURI:'test-gb'}];
 window.SpeechSynthesisUtterance=class{constructor(t){this.text=t||'';this.voice=null;this.lang='';this.rate=1;this.pitch=1;this.volume=1;this.onstart=null;this.onend=null;this.onerror=null;}};
 const fake={speaking:false,pending:false,paused:false,onvoiceschanged:null,
  getVoices(){return voices;},
  speak(u){try{window.__speak.push({t:u.text,lang:u.lang,rate:u.rate});}catch(_){}
   if((window.__speechMode||'gb')==='fail'){setTimeout(()=>{try{u.onerror&&u.onerror({});}catch(_){}},30);return;}
   this.speaking=true;setTimeout(()=>{try{u.onstart&&u.onstart({});}catch(_){}},30);
   setTimeout(()=>{this.speaking=false;try{u.onend&&u.onend({});}catch(_){}},(window.__speakMs||300));},
  cancel(){this.speaking=false;},pause(){},resume(){},addEventListener(){},removeEventListener(){}};
 try{Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true});}catch(e){window.speechSynthesis=fake;}
})();
"""

STUB = r"""
(function(){
 if(window.Tesseract) return;
 window.__stubCalls={createWorker:0,recognize:0};
 window.Tesseract={
  async createWorker(lang,oem,opts){
   window.__stubCalls.createWorker++;
   const logger=(opts&&opts.logger)||function(){};
   let params={};
   logger({status:'loading language traineddata',progress:0.3});
   await new Promise(r=>setTimeout(r,120));
   return {
    async setParameters(p){params=Object.assign(params,p);},
    async recognize(image){
     window.__stubCalls.recognize++;
     if(window.__ocrFail) throw new Error(window.__ocrFail);
     if(window.__ocrCanned) return {data:window.__ocrCanned};
     const url=image.toDataURL?image.toDataURL('image/png'):null;
     logger({status:'recognizing text',progress:0.5});
     const res=await window.__ocr(url,String(params.tessedit_pageseg_mode||'3'));
     logger({status:'recognizing text',progress:1});
     return res;
    },
    async terminate(){}
   };
  }
 };
})();
"""


def tsv_to_data(tsv_text):
    rows = tsv_text.strip().split('\n')
    names = rows[0].split('\t')
    blocks = {}
    for r in rows[1:]:
        c = r.split('\t')
        if len(c) < len(names):
            continue
        o = dict(zip(names, c))
        if o['level'] != '5' or not o['text'].strip():
            continue
        b = blocks.setdefault(o['block_num'], {})
        p = b.setdefault(o['par_num'], {})
        ln = p.setdefault(o['line_num'], [])
        ln.append({'text': o['text'], 'confidence': float(o['conf']),
                   'bbox': {'x0': int(o['left']), 'y0': int(o['top']), 'x1': int(o['left']) + int(o['width']), 'y1': int(o['top']) + int(o['height'])}})
    out_blocks, text_lines = [], []
    for bk in sorted(blocks, key=int):
        paras = []
        for pk in sorted(blocks[bk], key=int):
            lines = []
            for lk in sorted(blocks[bk][pk], key=int):
                ws = blocks[bk][pk][lk]
                lines.append({'text': ' '.join(w['text'] for w in ws), 'words': ws})
                text_lines.append(' '.join(w['text'] for w in ws))
            paras.append({'lines': lines})
        out_blocks.append({'paragraphs': paras})
    return {'text': '\n'.join(text_lines) + '\n', 'blocks': out_blocks, 'tsv': tsv_text}


def native_ocr(dataurl, psm):
    import pytesseract
    from PIL import Image
    if not dataurl:
        return {'data': {'text': '', 'blocks': []}}
    raw = base64.b64decode(dataurl.split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    tsv = pytesseract.image_to_data(im, lang='eng', config=f'--psm {psm} -c preserve_interword_spaces=1 --dpi 300')
    return {'data': tsv_to_data(tsv)}


def patched_html():
    s = APP.read_text()
    assert s.count(ANCHOR) == 1, 'test-injection anchor must exist exactly once'
    return s.replace(ANCHOR, BRIDGE + ANCHOR, 1)


_HTML = None


def _tolerant(pg):
    """A/B runs on the R3.4 base: an action on an element that does not exist there is skipped (and the check that needed it
    simply fails) instead of aborting the whole section after a long timeout."""
    for name in ('click', 'fill', 'check', 'is_disabled', 'input_value', 'inner_text', 'select_option', 'is_checked'):
        orig = getattr(pg, name)

        def wrapped(*a, _o=orig, **k):
            k.setdefault('timeout', 2500)
            try:
                return _o(*a, **k)
            except Exception as e:  # noqa: BLE001
                print('  (skipped: %s)' % str(e).splitlines()[0][:90], flush=True)
                return None
        setattr(pg, name, wrapped)


def open_page(p, w=390, h=844, touch=True, speech='gb', ocr=True):
    """Browser + context + page. Returns (browser, ctx, page, errors)."""
    global _HTML
    if _HTML is None:
        _HTML = patched_html()
    b, ctx, pg, errs = new_page(p, w, h, touch=touch)
    pg.add_init_script(f'window.__speechMode={json.dumps(speech)};')
    pg.add_init_script(SPEECH)
    if ocr:
        pg.add_init_script(STUB)
        pg.expose_function('__ocr', native_ocr)
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=_HTML))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
    pg.on('dialog', lambda d: d.accept())
    pg.set_default_timeout(8000)
    if os.environ.get('P40_TOLERANT'):
        _tolerant(pg)
    return b, ctx, pg, errs


def boot(pg, grade='3'):
    register(pg, grade=grade)
    pg.wait_for_function('typeof window.__ev==="function"', timeout=15000)


def ev(pg, code):
    return pg.evaluate('(c)=>window.__ev(c)', code)


def goto(pg, hash_, wait=500):
    pg.evaluate("(h)=>{location.hash=h}", hash_)
    pg.wait_for_timeout(wait)


def parent_unlock(pg):
    if pg.query_selector('#v23-parent-password'):
        unlock_parent(pg)


def text_of(pg, sel='#app'):
    return pg.evaluate("(s)=>{const e=document.querySelector(s);return e?e.innerText:''}", sel)


def shot(pg, name, full=False):
    f = SHOTS / (name + '.png')
    pg.screenshot(path=str(f), full_page=full)
    return str(f)


PASTE = """pencil | 鉛筆
ruler | 間尺
eraser | 擦膠
school bag | 書包
ice-cream | 雪糕
T-shirt | T恤
grandmother | 外婆
favourite | 最喜愛的
Wednesday | 星期三
colour | 顏色
light | 光線
pillow | 枕頭"""


def go_range_new(pg):
    goto(pg, '#range-new', 900)
    parent_unlock(pg)
    pg.wait_for_timeout(500)


def wait_js(pg, expr, timeout=6000):
    try:
        pg.wait_for_function(expr, timeout=timeout)
        return True
    except Exception:
        return False
