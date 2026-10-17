"""Build the checked-in Math Explorer snapshot inside SmartQuest (no external login/voice).
Run after build_r37.py; does not fetch or overwrite any other learning module.
"""
from pathlib import Path
import re, json, hashlib, shutil

R = Path(__file__).resolve().parents[1]
S = R / 'olympiad_src'
U = S / 'upstream'
O = R / 'app/olympiad-classroom'
A = O / 'assets'
ROUTES = ['', 'learn', 'unit', 'lesson', 'test', 'quiz', 'results', 'review', 'progress', 'guide', 'plan', 'sources']

def canonical_bytes(p):
    return p.read_text(encoding='utf-8').encode() if p.suffix in {'.js','.mjs','.css','.html','.json','.svg','.md'} else p.read_bytes()

def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError('Sync anchor changed: ' + old[:100])
    return text.replace(old, new, 1)

def build():
    data = json.loads((U/'content.json').read_text(encoding='utf-8'))
    assert len(data['lessons']) == 44 and len(data['questions']) == 280 and len(data['units']) == 8
    assert all(l.get('classroom') for l in data['lessons'])
    A.mkdir(parents=True, exist_ok=True)
    for name in ['content.json','source-map.json','engine.js','classroom.js','classroom.css','style.css','voice-text.js','favicon.svg','owl.png','fox.png','rabbit.png','bird.png']:
        shutil.copyfile(U/name, A/name)
    # All source data, question identifiers, answers, SVGs and feedback stay byte-identical.
    for name in ['host.js','host.css','scope-store.mjs']:
        shutil.copyfile(S/name, O/name)
    shutil.copyfile(S/'bridge.js', A/'bridge.js')
    with (A/'classroom.css').open('a', encoding='utf-8') as f:
        f.write('\n.learner-context{max-width:1160px;margin:12px auto 0;padding:0 24px;font-size:13px;color:#59685e}.read-button,#audio-toggle{display:none!important}\n')

    js = (U/'app.js').read_text(encoding='utf-8')
    js = re.sub(r"import \{createRecordedNarration\} from '[^']+';", "import {storage} from './bridge.js';\nconst BASE=new URL('../',import.meta.url).pathname;", js, count=1)
    js = once(js, "page=location.pathname.split('/').filter(Boolean)[0]||'home'", "page=location.pathname.slice(BASE.length).split('/').filter(Boolean)[0]||'home'")
    js = once(js, 'const recordedVoice=createRecordedNarration(),recordedReady=recordedVoice.init();', 'const recordedVoice={stop(){}};')
    start, end = js.index('async function speak('), js.index('function showNotice(')
    js = js[:start] + 'async function speak(){}\n' + js[end:]
    js = re.sub(r'^const readButton=.*$', "const readButton=()=>'';", js, flags=re.M)
    js = once(js, '<button class="button" data-action="listen-start">${speakerIcon}${esc(t(\'listenStart\'))}</button>', '')
    js = js.replace('${esc(t(\'silentStart\'))}', '開始看圖學習')
    js = once(js, 'const url=(p,id)=>`/${p}/', 'const url=(p,id)=>`${BASE}${p}/')
    js = js.replace('href="/', 'href="${BASE}').replace('src="/assets/', 'src="${BASE}assets/')
    for route in ROUTES[1:]:
        js = js.replace("'/" + (route+'/' if route else '') + "'", "BASE+" + repr(route+'/' if route else ''))
    for literal in ['<a class="button" href="${BASE}learn/">再學一個方法</a>', '<a href="${BASE}sources/">']:
        js = once(js, "'"+literal+"'", '`'+literal+'`')
    js = re.sub(r"fetch\('/assets/([^']+)'", r"fetch(BASE+'assets/\1'", js)
    js = js.replace('localStorage.getItem', 'storage.getItem').replace('localStorage.setItem', 'storage.setItem')
    js = js.replace('數學探險所', '學霸星球奧數課堂')
    js = js.replace('沒有登入及自動同步。換裝置前，可以匯出檔案，再在另一個瀏覽器匯入。', '此區紀錄跟隨目前小朋友，保存在這個瀏覽器，尚未納入家庭整體備份。換裝置前，請家長在這裏另行匯出，再匯入。')
    assert 'Tracy' not in js and 'SpeechSynthesisUtterance' not in js and 'createRecordedNarration' not in js
    # The bundle uses relative imports and content hashes under either localhost or GitHub's project prefix.
    revision = hashlib.sha256(js.encode() + b''.join(canonical_bytes(p) for p in sorted(S.rglob('*')) if p.is_file() and p.name!='README.md')).hexdigest()[:12]
    js = re.sub(r"from '(\./[^'?]+)(?:\?[^']+)?'", lambda m: "from '"+m[1]+'?v='+revision+"'", js)
    js = re.sub(r'content\.json\?v=[a-f0-9]+', 'content.json?v='+revision, js)
    (A/'app.js').write_text(js, encoding='utf-8')
    host = (O/'host.js').read_text(encoding='utf-8').replace("'./scope-store.mjs'", "'./scope-store.mjs?v="+revision+"'")
    (O/'host.js').write_text(host, encoding='utf-8')
    template = (U/'index.html').read_text(encoding='utf-8').replace('數學探險所', '奧數圖解課堂')
    for route in ROUTES:
        prefix = '../' if route else './'
        html = template.replace('href="/', 'href="'+prefix).replace('src="/', 'src="'+prefix)
        html = re.sub(r'(assets/(?:app\.js|style\.css|classroom\.css))"', r'\1?v='+revision+'"', html)
        d = O/route; d.mkdir(parents=True, exist_ok=True); (d/'index.html').write_text(html, encoding='utf-8')

    # Update only explicit integration anchors; retain the latest R3.19 English/maths/game changes.
    app = R/'app/index.html'; text = app.read_text(encoding='utf-8')
    old = "tiles=r37A('🏆','闖關','#lv/olympiad','gold big','olympiad',`${q.done}/${q.total} 關`)+quiz('olympiad')+r37B('🗼','思維之塔','data-wqm-open=\"olympiad\"')+r37B('🃏','策略卡','data-wqm-open=\"cards\"');"
    new = "tiles=r37B('📚','圖解課堂','data-oly-open=\"learn\"','gold big','olympiad','小一、小二 · 8 個單元 · 44 課')+r37B('📝','課堂小測','data-oly-open=\"test\"','blue')+r37B('🔁','課堂錯題','data-oly-open=\"review\"','green')+r37B('📊','課堂進度','data-oly-open=\"progress\"')+r37A('🏆','闖關','#lv/olympiad','gold','',`${q.done}/${q.total} 關`)+quiz('olympiad')+r37B('🗼','思維之塔','data-wqm-open=\"olympiad\"')+r37B('🃏','策略卡','data-wqm-open=\"cards\"');"
    if old in text: text = once(text, old, new)
    elif text.count(new) != 1: raise ValueError('Olympiad hub anchor changed')
    marker = '<!-- OLYMPIAD_CLASSROOM_SYNC -->'
    tags = marker+'\n<link rel="stylesheet" href="olympiad-classroom/host.css?v='+revision+'" data-olympiad-sync>\n<script type="module" src="olympiad-classroom/host.js?v='+revision+'" data-olympiad-sync></script>\n<!-- /OLYMPIAD_CLASSROOM_SYNC -->'
    if marker in text: text = re.sub(re.escape(marker)+r'[\s\S]*?<!-- /OLYMPIAD_CLASSROOM_SYNC -->', lambda _:tags, text)
    else:
        assert text.rstrip().endswith('</html>')
        before, after = text.rsplit('</body>', 1)
        text = before+tags+'\n</body>'+after
    # Retain R3.19's arcade-only time policy; study permission comes from WQR3.assertStudy.
    text = text.replace("if(document.getElementById('wq-olympiad-dialog')?.open)return 'olympiad';",'')
    text = text.replace('window.WQOlympiadApp?.pauseForLimit?.();','')
    app.write_text(text, encoding='utf-8')
    sw = R/'app/sw.js'; sw_text=sw.read_text(encoding='utf-8')
    sw.write_text(re.sub(r"\+'-3\.19(?:-oly-[a-f0-9]+)?'", "+'-3.19-oly-"+revision+"'", sw_text, count=1), encoding='utf-8')
    manifest = {'version':'OLY-1.0','sourceCommit':'dc186cb5b620f4927b64337c5a6e1d3cc3c287d9','lessons':44,'questions':280,'units':8,'revision':revision,'voice':'disabled pending OpenAI setup','hashFormat':'SHA-256; UTF-8 text normalized to LF','files':{str(p.relative_to(O)).replace('\\','/'):hashlib.sha256(canonical_bytes(p)).hexdigest() for p in sorted(O.rglob('*')) if p.is_file() and p.name!='sync-manifest.json'}}
    (O/'sync-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Synced OLY-1.0: 44 lessons, 280 questions, 8 units; revision '+revision)

if __name__ == '__main__': build()
