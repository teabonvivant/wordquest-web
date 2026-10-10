"""Merge raw_*.json into audit.json and a compact table used by AUDIT.md. Read-only on the product."""
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys_path = str(HERE)
import importlib.util
spec = importlib.util.spec_from_file_location('run_audit', HERE / 'run_audit.py')
VPS = ['phone', 'tabP', 'tabL', 'desk']
VPNAME = {'phone': '手機 390×844', 'tabP': '平板直 820×1180', 'tabL': '平板橫 1180×820', 'desk': '桌面 1440×900'}

# page registry is parsed from run_audit.py text to avoid importing playwright
import re
src = (HERE / 'run_audit.py').read_text()
PAGES = []
for m in re.finditer(r"^add\('([^']+)','([^']+)','([^']+)',(\d+),", src, re.M):
    PAGES.append(dict(id=m.group(1), name=m.group(2), grp=m.group(3), rank=int(m.group(4))))
GUEST = [
    ('g-kid', '訪客·星系主頁', '帳戶'), ('g-parent', '訪客·家長星（請先登入卡）', '帳戶'),
    ('g-dictation', '訪客·默書星', '帳戶'), ('g-login', '登入頁（未登入）', '帳戶'),
    ('g-register', '建立帳戶頁', '帳戶'), ('g-ranges', '訪客·默書範圍', '帳戶'), ('g-range-new', '訪客·加入範圍', '帳戶'),
    ('f-after-register', '註冊後落地頁', '帳戶'), ('f-kid', '家庭帳戶·星系主頁', '帳戶'),
    ('f-parent-gate', '家長星·家長密碼閘', '帳戶'), ('f-parent-open', '家長星·解鎖後', '帳戶'),
    ('f-dictation-empty', '默書星（未有範圍）', '默書'), ('f-ranges-empty', '默書範圍（空）', '默書'),
    ('f-report-empty', '默書報告（空）', '默書'), ('f-settings', '設定／備份（家庭帳戶）', '家長'), ('f-login-loggedin', '登入頁（已登入）', '帳戶'),
]
RANK_G = {'g-kid': 1, 'g-parent': 6, 'g-dictation': 3, 'g-login': 2, 'g-register': 2, 'g-ranges': 5, 'g-range-new': 5,
          'f-after-register': 2, 'f-kid': 1, 'f-parent-gate': 6, 'f-parent-open': 6, 'f-dictation-empty': 2, 'f-ranges-empty': 4,
          'f-report-empty': 5, 'f-settings': 7, 'f-login-loggedin': 9}
for gid, name, grp in GUEST:
    PAGES.append(dict(id=gid, name=name, grp=grp, rank=RANK_G.get(gid, 8), guest=True))

RAW = {}
for v in VPS:
    p = HERE / f'raw_{v}.json'
    RAW[v] = json.loads(p.read_text()) if p.exists() else {}
    g = HERE / f'raw_guest_{v}.json'
    if g.exists():
        RAW[v].update(json.loads(g.read_text()))

KEEP = ['vw', 'vh', 'final_hash', 'need_px', 'need_content', 'scroll_range_doc', 'scroll_range_cont', 'clipped', 'head_px', 'bar_px', 'nav_px',
        'avail_bottom', 'content_bottom', 'content_bottom_el', 'h1_y', 'legacy_header_ctrls', 'scrollers', 'text', 'desc_count', 'desc_top',
        'repeats', 'icons', 'back_controls', 'tiny_count', 'tiny_inline', 'tiny_sample', 'ctrl_total', 'ctrl_below_fold', 'ctrl_below_sample',
        'ctrl_covered', 'ctrl_covered_sample', 'h_overflow_doc', 'h_overflow_elems', 'h_overflow_sample', 'truncated', 'truncated_sample',
        'small_font_blocks', 'min_font', 'small_font_sample', 'open_dialogs', 'primary', 'error']
out = {'meta': {'app': 'eval_app.html (frozen copy of R3.12 candidate)', 'viewports': VPNAME,
                'method': 'Playwright Chromium, Admin test account (?mode=admin-test) for the main pass; guest/family account for g-*/f-* pages. '
                          'need_px = scroll distance (px) needed to bring all content above the bottom nav; text.desc = visible explanatory units '
                          '(CJK chars + latin words, excluding question/word content, short labels, nav).'},
       'pages': []}
for pg in PAGES:
    e = dict(pg)
    e['vp'] = {}
    for v in VPS:
        d = RAW[v].get(pg['id'])
        if d is None:
            continue
        e['vp'][v] = {k: d[k] for k in KEEP if k in d}
    out['pages'].append(e)
(HERE / 'audit.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print('pages', len(out['pages']), 'with data', sum(1 for p in out['pages'] if p['vp']))
