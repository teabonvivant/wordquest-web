import json, re
d = json.load(open('audit.json'))
VP = ['phone', 'tabP', 'tabL', 'desk']
DROP = {'g-register'}
FLAGS = {  # manual visual findings (from screenshots): id -> (points, text)
 'f-parent-gate': (3, '標題與說明文字近乎看不見（白字落米白卡）'),
 'report': (3, '頁面標題與前言深藍字落深色底，幾乎看不到'),
 'f-report-empty': (3, '頁面標題與前言深藍字落深色底，幾乎看不到'),
 'family-lesson': (4, '內容 1,523px 但頁面鎖死不能捲動，下半部拿不到'),
 'unit-start': (2, '浮動「我已看過，下一步」蓋住中文意思及聽讀音按鈕'),
 'g-login': (2, '底部導覽蓋住表單欄位，沒有預留位置'),
 'f-login-loggedin': (1, '底部導覽蓋住內容'),
 'game-settings': (2, '37 個控件低於 44px；整頁用舊樣式'),
 'dict-daily-study': (1, '進度「2/10 暫停」深灰字落深色底'),
 'dict-daily-mcq': (1, '進度「2/10 暫停」深灰字落深色底'),
 'dict-daily-mcq-picked': (1, '進度「2/10 暫停」深灰字落深色底'),
 'offline': (1, '底部導覽蓋住統計卡'),
}
def worst(p, key, f=max):
    vals = [p['vp'][v].get(key, 0) for v in VP if v in p['vp'] and 'error' not in p['vp'][v]]
    return f(vals) if vals else 0
rows = []
for p in d['pages']:
    if p['id'] in DROP: continue
    ph = p['vp'].get('phone')
    vh = {v: p['vp'][v]['vh'] for v in p['vp']}
    scr = max((p['vp'][v]['need_px'] / vh[v]) for v in p['vp'])
    desc = worst(p, 'text', None) if False else max(p['vp'][v]['text']['desc'] for v in p['vp'])
    tiny = max(p['vp'][v]['tiny_count'] for v in p['vp'])
    nav = ph['nav_px'] > 0
    decor = ph['icons']['decor'] - (6 if nav else 0)
    tot = ph['icons']['total'] - (6 if nav else 0)
    s = 0
    s += 4 if scr >= 3 else 3 if scr >= 1 else 2 if scr >= .3 else 1 if scr > .03 else 0
    s += 3 if desc >= 150 else 2 if desc >= 60 else 1 if desc >= 25 else 0
    s += 1 if tiny >= 8 else 0
    s += 1 if decor >= 10 else 0
    fl = FLAGS.get(p['id'])
    s += fl[0] if fl else 0
    leg = ph.get('legacy_header_ctrls', 0) > 0 and ph.get('bar_px', 0) > 0
    sev = '嚴重' if s >= 7 else '偏高' if s >= 4 else '中' if s >= 2 else '輕'
    prio = s * (13 - p['rank']) 
    rows.append(dict(id=p['id'], name=p['name'], grp=p['grp'], rank=p['rank'], score=s, sev=sev, prio=prio, scr=round(scr, 1), desc=desc, tiny=tiny, decor=max(decor, 0), tot=max(tot, 0)))
rows.sort(key=lambda r: (-r['prio'], r['rank']))
json.dump(rows, open('ranked.json', 'w'), ensure_ascii=False, indent=1)
for r in rows: print(f"{r['prio']:4} s={r['score']:2} {r['sev']} r{r['rank']:2} scr={r['scr']:5} desc={r['desc']:3} tiny={r['tiny']:2} decor={r['decor']:2} {r['id']:22} {r['name']}")
