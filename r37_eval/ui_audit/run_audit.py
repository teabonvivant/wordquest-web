import sys, json, time, traceback
from common import *
SHOT = Path('/home/workspace/wordquest-web-dev/r37_eval/ui_audit/shots')
MEASURE = open('/home/workspace/wordquest-web-dev/r37_eval/ui_audit/measure.js').read()
VPS = [('phone', 390, 844, True), ('tabP', 820, 1180, True), ('tabL', 1180, 820, True), ('desk', 1440, 900, False)]

def click_if(pg, sel, wait=400):
    ok = pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return false;e.click();return true}", sel)
    if ok: pg.wait_for_timeout(wait)
    return ok
def click_text(pg, scope, text, wait=450):
    ok = pg.evaluate("""([scope,text])=>{const r=document.querySelector(scope)||document;const e=[...r.querySelectorAll('button,a,[data-act]')].find(e=>e.offsetParent!==null&&(e.innerText||'').includes(text));if(!e)return false;e.click();return true}""", [scope, text])
    if ok: pg.wait_for_timeout(wait)
    return ok
def H(h): return lambda pg: go(pg, h, 550)

def ptab(k): 
    def f(pg):
        go(pg, '#p/parent', 450); click_if(pg, f'[data-r37="ptab"][data-k="{k}"]', 350)
    return f
def play_level(track='english', w=0, s=0):
    def f(pg): ev(pg, f"r37StartLevel('{track}',{w},{s})"); pg.wait_for_timeout(600)
    return f
def quiz(track, mode):
    def f(pg): go(pg,'#p/'+track,300); ev(pg, f"r37StartQuiz('{track}','{mode}')"); pg.wait_for_timeout(600)
    return f
def level_then(track, w, s, steps):
    def f(pg):
        ev(pg, f"r37StartLevel('{track}',{w},{s})"); pg.wait_for_timeout(500)
        for st in steps:
            if st == 'go': click_if(pg, '[data-r37="learn-go"]', 500)
            elif st == 'wrong': 
                ev(pg, "(()=>{const q=r37P.qs[r37P.i];r37Answer(q.mode==='mcq'?(q.options.find(o=>o!==q.answer)):'zzzz')})()"); pg.wait_for_timeout(400)
            elif st == 'right':
                ev(pg, "(()=>{const q=r37P.qs[r37P.i];r37Answer(q.answer)})()"); pg.wait_for_timeout(300)
            elif st == 'finish':
                ev(pg, "(()=>{r37P.phase='quiz';r37P.correct=r37P.qs.length;r37P.res=r37P.qs.map(()=>true);r37P.i=r37P.qs.length;r37P.hearts=r37P.maxHearts||3;r37Finish()})()"); pg.wait_for_timeout(600)
    return f
def fill_quiz(track='english'):
    def f(pg): go(pg,'#p/'+track,300); ev(pg, f"r37StartQuiz('{track}','fill')"); pg.wait_for_timeout(600)
    return f
def wqm(open_key, then=None):
    def f(pg):
        pg.evaluate("document.querySelector('#wqm-dialog')?.close?.()")
        go(pg, '#p/' + {'home':'math','tools':'math','olympiad':'olympiad','cards':'olympiad'}[open_key], 450)
        click_if(pg, f'[data-wqm-open="{open_key}"]', 1100)
        if then:
            pg.evaluate("""(a)=>{const r=document.querySelector('#wqm-app-host').shadowRoot;const b=r.querySelector(a);if(b)b.click();}""", then); pg.wait_for_timeout(900)
    return f
def dict_daily(steps):
    def f(pg):
        go(pg, '#p/dictation', 400); click_if(pg, '[data-act="start-daily"]', 700)
        for st in steps:
            if st=='next': click_if(pg, '#app .primary', 500)
            elif st=='pick': click_if(pg, '#app .option', 300)
            elif st=='check': click_if(pg, '[data-act="submit"], #app button.primary', 500)
    return f
def arcade_intro(pg):
    go(pg, '#game', 600); click_if(pg, '[data-a28="intro"]', 900)
def fps_in(pg):
    go(pg, '#fps', 700); click_text(pg, '#app', '開始', 900)
def fp_level(pg):
    go(pg, '#lv/fps', 500); click_if(pg, '.r37-node', 800)
def runner_play(pg):
    go(pg, '#lv/runner', 500); click_if(pg, '.r37-node', 900)
def rn_in(pg):
    runner_play(pg); click_text(pg,'#app','開始',900)
def unit_id(pg): go(pg, '#unit?id=U01', 700)
def unit_start(pg):
    go(pg, '#unit?id=U01', 700)
    for t in ['再學一次', '開始這一課', '開始']:
        if click_text(pg, '#app', t, 900): break
def add_child(pg):
    go(pg, '#children', 500); click_if(pg, '[data-act="show-add-child"]', 500)
def range_step2(pg):
    go(pg, '#range-new', 600)
    pg.evaluate("(v)=>{const t=document.querySelector('#raw-words');if(t){t.value=v;t.dispatchEvent(new Event('input',{bubbles:true}));}}", 'shoe | 鞋\nbook | 書\napple | 蘋果\nice cream | 雪糕')
    pg.wait_for_timeout(300)
    click_if(pg, '[data-act="parse"]', 700)
    click_if(pg, '#p40-next1', 900)
def range_step3(pg):
    range_step2(pg)
    click_if(pg, '#v20-confirm-next', 900)
def open_help(pg):
    go(pg, '#classroom', 500); click_text(pg, '#app', '聽廣東話說明', 700)
def arcade_ach(pg):
    go(pg, '#game', 500); click_if(pg, '[data-arx="ach"]', 700)

# (id, name, group, usage_rank(1=most common), setup, opts)
P = []
def add(i, name, grp, rank, setup, **o): P.append(dict(id=i, name=name, grp=grp, rank=rank, setup=setup, o=o))
# --- planet shell
add('kid','星系主頁','星球殼',1,H('#kid'))
add('p-english','英文星區域','星球殼',2,H('#p/english'))
add('p-math','數學星區域','星球殼',3,H('#p/math'))
add('p-olympiad','奧數星區域','星球殼',4,H('#p/olympiad'))
add('p-games','遊戲星區域','星球殼',5,H('#p/games'))
add('p-dictation','默書星區域','星球殼',3,H('#p/dictation'))
add('p-parent-diff','家長星·難度分頁','星球殼',6,ptab('diff'))
add('p-parent-prog','家長星·進度分頁','星球殼',7,ptab('prog'))
add('p-parent-kids','家長星·孩子／範圍分頁','星球殼',8,ptab('kids'))
add('p-parent-data','家長星·設定／備份分頁','星球殼',9,ptab('data'))
add('p-chars','角色圖鑑','星球殼',8,H('#p/chars'))
add('lv-english','英文闖關地圖','闖關',1,H('#lv/english'))
add('lv-math','數學闖關地圖','闖關',2,H('#lv/math'))
add('lv-olympiad','奧數闖關地圖','闖關',3,H('#lv/olympiad'))
add('lv-runner','星際跑酷關卡地圖','闖關',6,H('#lv/runner'))
add('lv-fps','字母獵場關卡地圖','闖關',6,H('#lv/fps'))
add('play-learn','英文闖關·學詞卡','闖關答題',1,level_then('english',0,0,[]))
add('play-mcq','英文闖關·選擇題','闖關答題',1,level_then('english',0,0,['go']))
add('play-fb-wrong','英文闖關·答錯回饋','闖關答題',1,level_then('english',0,0,['go','wrong']))
add('play-fill','快速測驗·填充題','闖關答題',2,fill_quiz('english'))
add('play-math','數學闖關·題目','闖關答題',2,level_then('math',0,0,[]))
add('play-result','闖關結果頁','闖關答題',1,level_then('english',0,0,['go','finish']))
add('fps-intro','字母獵場·開場／選難度','遊戲',6,H('#fps'))
add('fps-play','字母獵場·遊戲中','遊戲',6,fps_in)
add('fp-level','字母獵場·闖關開場','遊戲',6,fp_level)
add('rn-play','星際跑酷·開場／遊戲中','遊戲',6,runner_play)
add('game-lobby','遊戲街機大堂','遊戲',5,H('#game'))
add('game-intro','街機·玩法預覽對話框','遊戲',5,arcade_intro)
add('game-ach','街機·成就對話框','遊戲',9,arcade_ach)
add('game-settings','金幣與遊戲設定（家長）','遊戲',9,H('#game-settings'))
add('arcade-stub','舊遊戲入口轉址頁（#playground）','遊戲',12,H('#playground'))
# --- dictation
add('dict-daily-study','默書·今日默書（學新字）','默書',2,dict_daily([]))
add('dict-daily-mcq','默書·選擇題','默書',2,dict_daily(['next']))
add('dict-daily-mcq-picked','默書·選擇題（已選答案）','默書',2,dict_daily(['next','pick']))
add('ranges','默書範圍列表','默書',4,H('#ranges'))
add('range-new-1','加入範圍·第1步拍照／輸入','默書',4,H('#range-new'))
add('range-new-2','加入範圍·第2步檢查單字','默書',4,range_step2)
add('range-new-3','加入範圍·第3步儲存','默書',4,range_step3)
add('report','默書報告','默書',5,H('#report'))
add('practice','練習選擇（#practice）','英文舊頁',7,H('#practice'))
# --- legacy english
add('classroom','拼字教室（課堂總覽）','英文舊頁',3,H('#classroom'))
add('unit','拼字小課單元頁','英文舊頁',3,unit_id)
add('unit-start','拼字小課·開始後','英文舊頁',3,unit_start)
add('library','詞語與圖片庫','英文舊頁',5,H('#library'))
add('learning','拼音／先選一小課（#learning）','英文舊頁',6,H('#learning'))
add('assembly','詞語組合工房','英文舊頁',5,H('#assembly'))
add('assembly-unit','組合單元頁','英文舊頁',5,H('#assembly-unit?id=air'))
add('assembly-learn','組合工房·跟着學','英文舊頁',5,lambda pg:(go(pg,'#assembly-unit?id=air',500),click_text(pg,'#app','跟着學',700)))
add('companions','學習夥伴介紹','英文舊頁',10,H('#companions'))
add('family-lesson','拼字家族課（舊）','英文舊頁',10,H('#family-lesson'))
add('phonics-lesson','發音教學十二課（舊）','英文舊頁',10,H('#phonics-lesson'))
# --- parent legacy
add('parent','家長工具（舊首頁）','家長',6,H('#parent'))
add('children','孩子管理','家長',7,H('#children'))
add('children-add','孩子管理·新增孩子表單','家長',8,add_child)
add('settings','設定／備份','家長',7,H('#settings'))
add('learning-report','拼字課學習報告','家長',7,H('#learning-report'))
add('learning-plan','安排下一次學習','家長',8,H('#learning-plan'))
add('learning-help','第一次使用說明','家長',9,H('#learning-help'))
add('assembly-report','詞語組合報告','家長',9,H('#assembly-report'))
add('assembly-plan','安排詞語組合練習','家長',9,H('#assembly-plan'))
add('legacy-family','舊版 air 家族紀錄','家長',12,H('#legacy-family'))
add('legacy-phonics','舊版十二課紀錄','家長',12,H('#legacy-phonics'))
add('offline','離線教材準備','家長',8,H('#offline'))
add('credits','圖片與音檔來源','家長',12,H('#credits'))
add('login-admin','登入頁（Admin 已登入狀態）','帳戶',9,H('#login'))
add('admin','測試中心（Admin）','帳戶',12,H('#admin'))
# --- dialogs math/olympiad
add('wqm-home','數學島·首頁（對話框）','數學／奧數對話框',3,wqm('home'))
add('wqm-normal','數學島·數學群島（對話框）','數學／奧數對話框',3,wqm('home','[data-action="nav:normal"]'))
add('wqm-tools','教具工房（對話框）','數學／奧數對話框',5,wqm('home','[data-action="nav:tools"]'))
add('wqm-parent','數學·家長與進度（對話框）','數學／奧數對話框',7,wqm('home','[data-action="nav:parent"]'))
add('wqm-olympiad','思維之塔（對話框）','數學／奧數對話框',4,wqm('olympiad'))
add('wqm-cards','策略卡（對話框）','數學／奧數對話框',6,wqm('olympiad','[data-action="nav:cards"]'))
add('wqm-lesson','奧數·單課學習與挑戰（對話框）','數學／奧數對話框',4,wqm('olympiad','[data-action^="lesson:"]'))

def reset(pg):
    pg.evaluate("()=>{document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(e){}});}")

def run_vp(vp, only=None):
    name, w, h, touch = vp
    res = {}
    with sync_playwright() as p:
        b, ctx, pg, errs = admin_page(p, w, h, touch)
        pg.set_default_timeout(6000)
        for spec in P:
            if only and spec['id'] not in only: continue
            sid = spec['id']
            try:
                # reset
                reset(pg)
                go(pg, '#kid', 350)
                spec['setup'](pg)
                pg.wait_for_timeout(450)
                pg.evaluate("window.scrollTo(0,0)")
                shadow = spec['id'].startswith('wqm-')
                m = pg.evaluate(MEASURE, dict(shadow=shadow, **{k:v for k,v in spec['o'].items()}))
                m['final_hash'] = pg.evaluate('location.hash')
                pg.screenshot(path=str(SHOT / f"{sid}__{name}.jpg"), type='jpeg', quality=60, scale='css')
                res[sid] = m
            except Exception as ex:
                res[sid] = {'error': str(ex)[:300]}
                try: pg.screenshot(path=str(SHOT / f"{sid}__{name}_ERR.jpg"), type='jpeg', quality=50, scale='css')
                except Exception: pass
        res['_errs'] = errs[:8]
        b.close()
    return res

if __name__ == '__main__':
    only = set(sys.argv[2:]) or None
    vpname = sys.argv[1]
    vp = next(v for v in VPS if v[0] == vpname)
    r = run_vp(vp, only)
    out = Path(f'/home/workspace/wordquest-web-dev/r37_eval/ui_audit/raw_{vpname}.json')
    if only and out.exists():
        old = json.loads(out.read_text()); old.update(r); r = old
    out.write_text(json.dumps(r, ensure_ascii=False, indent=1))
    print(vpname, 'done', len(r))
