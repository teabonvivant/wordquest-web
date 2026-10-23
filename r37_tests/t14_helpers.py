"""Shared step-2 helpers copied from t14_morph_ui.py (that file is a script and cannot be imported)."""
import lib37 as L

CARDS = """()=>{const out={};document.querySelectorAll('#word-editor .s50-grid .v20-candidate').forEach(a=>{
  const en=a.querySelector('strong').textContent,t=a.querySelector('.s56-tag'),r=a.getBoundingClientRect(),g=a.parentElement.getBoundingClientRect();
  let tr=null;if(t){const q=t.getBoundingClientRect();tr={l:q.left,r:q.right,t:q.top,b:q.bottom,h:q.height,sw:t.scrollWidth,cw:t.clientWidth};}
  out[en]={sel:a.classList.contains('is-selected'),tag:t?t.textContent:'',kind:a.dataset.s56||'',
    box:{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height},grid:{l:g.left,r:g.right},tagBox:tr,
    aria:a.querySelector('[data-imp=toggle]').getAttribute('aria-label')};});return out;}"""


def boot(pg):
    L.register(pg)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)


def go_new(pg):
    L.go(pg, '#range-new', 900)
    if pg.query_selector('#v20-parent-password') or pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(500)


def step(pg):
    return pg.evaluate("()=>document.querySelector('#import-v20')?.dataset.p40Step||''")


def wait_step(pg, n, ms=8000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


def paste_parse(pg, text):
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary')
        pg.wait_for_timeout(150)
    pg.fill('#raw-words', text)
    pg.click('[data-imp="parse"]')
    ok = wait_step(pg, 2)
    pg.wait_for_timeout(350)
    return ok


def cards(pg):
    return pg.evaluate(CARDS)


def import_once(pg, text):
    go_new(pg)
    ok = paste_parse(pg, text)
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    pg.click('[data-s50="again"]')      # R3.12: the saved card stays on the page until 再上傳
    pg.wait_for_timeout(300)
    return ok
