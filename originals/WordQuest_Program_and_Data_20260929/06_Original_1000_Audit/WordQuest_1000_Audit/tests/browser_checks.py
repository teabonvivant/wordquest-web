"""Real Chromium DOM/input tests with an explicitly in-memory localStorage adapter.
Environment blocks navigation to file:// and localhost. This is NOT native storage,
HTTP deployment, iOS/Android device or V33 integration certification.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time,sys,argparse,os
ROOT=Path(__file__).resolve().parents[1];HTML=(ROOT/'source/WordQuest_Maths_Try.html').read_text();D=json.loads((ROOT/'source/curriculum.json').read_text())
KEY='wqm-state-v1:local-family:audit-child';REG='wqm-profiles-v1';NOW=int(time.time()*1000)
RESULTS=[]
def require(ok,msg):
    if not ok:raise AssertionError(msg)
def blank():return {'schema':1,'revision':0,'serial':0,'attempts':[],'mastery':{'normal':{},'olympiad':{}},'mistakes':{},'cards':[],'lessons':{},'sessions':[],'outbox':[],'wallet':{'balance':0,'days':{}},'settings':{'language':'zh','voice':'yue-HK','sound':False,'slow':True,'olympiad':True,'limit':90,'schoolUnit':'','showScore':False},'usage':{},'reports':[],'created':NOW}
def make_current(t='1N2.2-T2',seed=42,mode='practice',stage=4,count=1):
    sk=t.rsplit('-T',1)[0];track='olympiad' if sk.startswith('O-') else 'normal';r={'template':t,'seed':seed}
    return {'id':'audit-session','skill':sk,'track':track,'mode':mode,'game':None,'stage':stage,'index':0,'queues':{str(stage):[dict(r,seed=seed+i) for i in range(count)]},'example':r,'startedAt':NOW-30000,'questionAt':NOW-4000,'activeMs':0,'hint':0,'feedback':None,'results':[],'replacements':[],'completed':False,'rewardDone':False,'fast':0,'draft':'','picked':'','reflection':None}
def with_question(t='1N2.2-T2',**kw):
    st=blank();st['current']=make_current(t,**kw);return st
class Screen:
    def __init__(self,browser):self.browser=browser;self.page=None;self.context=None;self.errors=[];self.actions=[]
    def boot(self,state=None,guest=False,raw=None,width=390,height=844,setup=''):
        if self.context:self.context.close()
        self.context=self.browser.new_context(viewport={'width':width,'height':height},accept_downloads=True)
        self.page=self.context.new_page();self.page.set_default_timeout(1400);self.errors=[];self.actions=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('dialog',lambda d:d.accept())
        if raw is None:
            raw={} if guest else {REG:json.dumps({'v':1,'active':'audit-child','children':[{'id':'audit-child','name':'測試學員','grade':3}]},ensure_ascii=False),KEY:json.dumps(state or blank(),ensure_ascii=False)}
        self.page.evaluate('''raw=>{const m=new Map(Object.entries(raw));window.__auditStorage=m;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i],get length(){return m.size}}});}''',raw)
        if setup:self.page.evaluate(setup)
        self.page.set_content(HTML,wait_until='load');return self
    def click(self,a):self.actions.append('click '+a);self.page.locator('[data-action="'+a+'"]').first.click()
    def fill(self,k,v):self.actions.append('fill '+k+'='+str(v));self.page.locator('#'+k).fill(str(v))
    def choose(self,k,v):self.actions.append('select '+k+'='+str(v));self.page.locator('#'+k).select_option(str(v))
    def state(self):return self.page.evaluate('WQMathApp.getState()')
    def raw(self):return self.page.evaluate('Object.fromEntries(__auditStorage)')
    def view(self):return self.page.evaluate('WQMathApp.getView()')
    def text(self):return self.page.locator('#wqm-app-host').evaluate('(e)=>e.shadowRoot.textContent')
    def q(self):return self.page.evaluate('''()=>{let s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return WQMathCore.generate(WQMathCore.library(WQMathData),r.template,r.seed);}''')
    def resume(self):self.click('resume');return self
    def answer(self,value=None):
        q=self.q();a=q['answer'] if value is None else str(value)
        if q['type']=='choice':
            idx=next(i for i,c in enumerate(q['choices']) if c['value']==a);self.click('choice:'+str(idx))
        else:
            self.fill('answer',a)
            if q['type']=='word':
                p=q['params'];expr=f"{p['paid']}-{p['price']}" if q['skill']=='2N5.3' else f"{p['paid']}-{p['price']}*{p['qty']}"
                self.fill('expression',expr);self.choose('unit','元')
            if q['type']=='remainder':self.fill('remainder',q['remainder'])
        self.click('submit');return q
    def screenshot(self,name):
        p=ROOT/'evidence'/name;self.page.screenshot(path=str(p),full_page=True);return 'evidence/'+name
    def tools(self,kind):self.boot();self.click('nav:tools');self.click('selecttool:'+kind)
    def native_status(self):return {'engine':'Chromium '+self.browser.version,'storage':'in-memory adapter','input':'Playwright real DOM click/fill/keyboard'}

def run_case(s,id,name,expect,fn,issue=''):
    status='PASS';actual=None;shot=''
    try:actual=fn(s)
    except Exception as e:
        status='FAIL';actual=str(e)[:2200]
        try:shot=s.screenshot(id+'_failure.png')
        except Exception:pass
    r={'id':id,'category':'UI','name':name,'expected':expect,'status':status,'actual':actual or ('符合預期' if status=='PASS' else '失敗'),'issue':issue if status=='FAIL' else '', 'evidence':shot,'actions':s.actions.copy(),'pageErrors':s.errors.copy(),'method':'實際 Chromium DOM／模擬 localStorage'}
    RESULTS.append(r);print(id,status,name,flush=True)
    return r

def template_case(t):
    def f(s):
        s.boot(with_question(t['id'])).resume();q=s.q();require(s.page.locator('#stem').inner_text().strip()==q['stem_zh'],'顯示題幹與題目不一致')
        if t['id'] in ['1N1.1-T1','2N5.3-T2','2N6.2-T2','3N5.1-T2','O-GEO-segments-T3']:s.screenshot('template_'+t['id'].replace('.','_')+'.png')
        s.answer();st=s.state();require(st['current']['feedback']['correct'],'正確答案未在 UI 判為正確');require(len(st['attempts'])==1,'提交後作答筆數不是 1');require(st['attempts'][0]['template']==t['id'],'提交了另一條題目');require(not s.errors,'未處理 JS 例外 '+str(s.errors));return {'template':t['id'],'type':q['type'],'answer':q['answer'],'feedback':st['current']['feedback']['message']}
    return f
FEATURES=[]
def feature(name,expect,issue=''):
    def deco(f):FEATURES.append((name,expect,f,issue));return f
    return deco
@feature('訪客首頁啟動','可見主頁與主要學習入口')
def f01(s):s.boot(guest=True);require(s.page.locator('[data-action="daily:normal"]').count()==1,'沒有今日練習入口');require(not s.errors,str(s.errors))
@feature('家長建立學員','由實際表單建立持久化學員')
def f02(s):
    s.boot(guest=True);s.click('nav:profiles');s.fill('nickname','樂樂');s.choose('new-grade','2');s.page.locator('#consent').check();s.click('create-profile');require('樂樂' in s.text(),'暱稱未顯示');require(json.loads(s.raw()[REG])['children'][0]['grade']==2,'年級不一致')
@feature('未同意保存不能建立學員','沒有建立學員')
def f03(s):
    s.boot(guest=True);s.click('nav:profiles');s.fill('nickname','樂樂');s.click('create-profile');require(REG not in s.raw(),'未同意仍建立學員');require('請由家長確認' in s.text(),'沒有提示')
@feature('暱稱 HTML 文字安全','不插入可執行 HTML')
def f04(s):
    s.boot(guest=True);s.click('nav:profiles');s.fill('nickname','<img src=x onerror=1>');s.page.locator('#consent').check();s.click('create-profile');require(s.page.locator('img[src="x"]').count()==0,'暱稱變成 HTML 圖片');require('<img src=x onerror=1>' in s.text(),'暱稱被不明更改')
@feature('UI 切換孩子後顯示各自資料','切換後读取 B 的 serial')
def f05(s):
    r={REG:json.dumps({'v':1,'active':'audit-child','children':[{'id':'audit-child','name':'A','grade':3},{'id':'child-b','name':'B','grade':2}]}),KEY:json.dumps(blank())};b=blank();b['serial']=27;r['wqm-state-v1:local-family:child-b']=json.dumps(b);s.boot(raw=r);s.click('nav:profiles');s.click('switch:child-b');require(s.state()['serial']==27,'未切換到 B')
@feature('UI 刪除目前學員','主資料及名單移除')
def f06(s):s.boot();s.click('nav:profiles');s.click('delete-profile');require(KEY not in s.raw(),'主資料仍存在');require(json.loads(s.raw()[REG])['children']==[],'名單仍保留學員')
@feature('損壞孩子名單仍可恢復','顯示可操作的恢复／訪客入口，不白畫面','F-REGISTRY-BOOT')
def f07(s):
    s.boot(raw={REG:'{broken'});require(s.page.locator('button').count()>0,'啟動後沒有任何按鈕；'+str(s.errors))
@feature('儲存 API 被拒絕時仍有安全畫面','顯示錯誤說明或訪客模式，不白畫面','F-REGISTRY-BOOT')
def f08(s):
    s.boot(guest=True,setup="()=>{Object.defineProperty(window,'localStorage',{value:{getItem(){throw new DOMException('Denied','SecurityError')},setItem(){throw new DOMException('Denied','SecurityError')}}});}");require(s.page.locator('button').count()>0,'儲存 API 拒絕後白畫面；'+str(s.errors))
@feature('損壞數學狀態保留原始資料','可見只讀提示且原文未被覆蓋')
def f09(s):
    r={REG:json.dumps({'v':1,'active':'audit-child','children':[{'id':'audit-child','name':'A','grade':3}]}),KEY:'{bad state'};s.boot(raw=r);require(s.raw()[KEY]=='{bad state','原始資料被覆蓋');require('停止儲存' in s.text(),'沒有只讀提示')
@feature('匯出按鈕產生完整 JSON','建立目前孩子的備份 Blob（不聲稱原生下載驗收）')
def f10(s):
    s.boot(setup="()=>{const orig=URL.createObjectURL.bind(URL);window.__exportBlobs=[];URL.createObjectURL=b=>{__exportBlobs.push(b);return orig(b)}}");s.click('nav:parent');s.click('export');v=s.page.evaluate('async()=>JSON.parse(await __exportBlobs.at(-1).text())');require(v['owner']=='local-family:audit-child','匯出 owner 錯誤');require(v['format']=='wordquest-maths','備份格式錯誤');return {'owner':v['owner'],'schema':v['state']['schema']}
@feature('UI 匯入另一孩子備份拒絕','不覆蓋目前進度')
def f11(s):
    s.boot();s.click('nav:parent');s.click('import');v={'format':'wordquest-maths','version':1,'owner':'local-family:other','state':blank()};s.page.locator('#import-file').set_input_files({'name':'foreign.json','mimeType':'application/json','buffer':json.dumps(v).encode()});s.page.wait_for_timeout(50);require('不是目前孩子' in s.text(),'未顯示 owner 錯誤');require(s.state()['serial']==0,'原資料改動')
@feature('UI 匯入同一孩子備份成功','serial 還原且有保護快照')
def f12(s):
    s.boot();s.click('nav:parent');s.click('import');st=blank();st['serial']=77;v={'format':'wordquest-maths','version':1,'owner':'local-family:audit-child','state':st};s.page.locator('#import-file').set_input_files({'name':'same.json','mimeType':'application/json','buffer':json.dumps(v).encode()});s.page.wait_for_timeout(50);require(s.state()['serial']==77,'未還原 serial');require(KEY+':before-restore' in s.raw(),'没有保護快照')
@feature('鍵盤 Enter 可啟動首頁入口','不需滑鼠可打開今日練習')
def f13(s):s.boot();s.page.locator('[data-action="daily:normal"]').focus();s.page.keyboard.press('Enter');require(s.view()=='lesson','鍵盤未啟動練習')
@feature('暫停後保留數值草稿','返回後仍有未提交答案','F-DRAFT-LOSS')
def f14(s):s.boot(with_question()).resume();s.fill('answer','123');s.click('pause');s.click('resume');require(s.page.locator('#answer').input_value()=='123','暫停／繼續後未提交的 123 消失')
@feature('暫停後保留應用題算式及單位','算式／答案／單位全部保留','F-DRAFT-LOSS')
def f15(s):
    s.boot(with_question('2N5.3-T2')).resume();s.fill('expression','100-20');s.fill('answer','80');s.choose('unit','元');s.click('pause');s.click('resume');require(s.page.locator('#expression').input_value()=='100-20' and s.page.locator('#answer').input_value()=='80' and s.page.locator('#unit').input_value()=='元','未提交的算式／答案／單位消失')
@feature('導航攔截後保留草稿','返回課堂後仍有答案','F-DRAFT-LOSS')
def f16(s):s.boot(with_question()).resume();s.fill('answer','15');s.click('nav:home');s.click('resume');require(s.page.locator('#answer').input_value()=='15','導航／繼續後草稿消失')
@feature('報錯題目不清空輸入','紀錄模板、種子並保留作答')
def f17(s):s.boot(with_question()).resume();s.fill('answer','12');s.click('report-item');require(s.page.locator('#answer').input_value()=='12','報錯清空草稿');require(len(s.state()['reports'])==1,'沒有報錯紀錄')
@feature('打開提示保留草稿','答案仍在、提示數增加')
def f18(s):s.boot(with_question()).resume();s.fill('answer','12');s.click('hint');require(s.page.locator('#answer').input_value()=='12','提示清空草稿');require(s.state()['current']['hint']==1,'提示次數錯誤')
@feature('分數鍵盤輸入及刪除','1/2 然後刪去 2')
def f19(s):
    s.boot(with_question('3N5.1-T2')).resume()
    for k in ['1','/','2']:s.click('key:'+k)
    require(s.page.locator('#answer').input_value()=='1/2','分數鍵盤失效');s.click('key:⌫');require(s.page.locator('#answer').input_value()=='1/','刪除鍵失效')
@feature('連續 Enter 不重複記分','同一題只記一次')
def f20(s):
    s.boot(with_question()).resume();s.fill('answer',s.q()['answer']);s.page.locator('#answer').focus();s.page.keyboard.press('Enter');s.page.keyboard.press('Enter');require(len(s.state()['attempts'])==1,'重複記分')
@feature('空白答案顯示錯誤且不記分','作答數為 0')
def f21(s):s.boot(with_question()).resume();s.click('submit');require(len(s.state()['attempts'])==0,'空白作答被記分');require('請輸入有效數字' in s.text(),'沒有格式提示')
@feature('選擇题未選答案不記分','提示先選答案')
def f22(s):s.boot(with_question('2N1.3-T2')).resume();s.click('submit');require(len(s.state()['attempts'])==0,'未選仍記分');require('先選一個答案' in s.text(),'沒有選項提示')
@feature('看完整解答後插入新題','下一題換數字且不能只抄答案通關')
def f23(s):
    s.boot(with_question()).resume();first=s.q()
    for _ in range(5):s.click('hint')
    s.answer();s.click('nextq');st=s.state();require(len(st['current']['queues']['4'])==2,'沒有追加新題');q=s.q();require((q['stem_zh'],q['answer'])!=(first['stem_zh'],first['answer']),'新題沒有換數字')
@feature('數線不能超過 0–20','兩邊邊界有上限')
def f24(s):
    s.tools('numberline')
    for _ in range(6):s.click('tool:jump:5')
    require('現在位於 20' in s.page.locator('#tool-region svg').get_attribute('aria-label'),'超出上界')
    for _ in range(6):s.click('tool:jump:-5')
    require('現在位於 0' in s.page.locator('#tool-region svg').get_attribute('aria-label'),'超出下界')
@feature('十格框填滿及清空','最多 20 粒並可清空')
def f25(s):
    s.tools('tenframe')
    for _ in range(22):s.click('tool:more')
    require(s.page.locator('#tool-region .filled').count()==20,'數粒上限錯誤');s.click('tool:clear');require(s.page.locator('#tool-region .filled').count()==0,'未清空')
@feature('十進位教具拆合總量不變','拆十／合十維持同一總量')
def f26(s):
    s.tools('blocks');before=s.page.locator('.tool-value').inner_text();s.click('tool:split');require(s.page.locator('.tool-value').inner_text()==before,'拆十改變總量');s.click('tool:merge');require(s.page.locator('.tool-value').inner_text()==before,'合十改變總量')
@feature('港幣教具加入及移除','50+20-50=20')
def f27(s):s.tools('money');s.click('tool:coin:50');s.click('tool:coin:20');s.click('tool:remove-coin:0');require('$20' in s.page.locator('.tool-value').inner_text(),'金額錯誤')
@feature('分數條減少等份不越界','分子不得超過分母')
def f28(s):s.tools('fraction');s.click('tool:part:3');s.choose('tool-den','2');require(s.page.locator('.strips').first.locator('button.filled').count()==2,'分子超過新的分母')
@feature('數位表不出現負位數','最小 0，最大 9')
def f29(s):
    s.tools('place');s.click('tool:digit:4:-1');require(s.page.locator('.tool-value').inner_text()=='0','數位變成負數')
    for _ in range(11):s.click('tool:digit:4:1')
    require(s.page.locator('.tool-value').inner_text()=='9','數位超過 9')
@feature('數陣零乘法','0 行無數粒，結果為 0')
def f30(s):s.tools('array');s.choose('tool-rows','0');require(s.page.locator('.dot').count()==0,'0 行仍有數粒');require('= 0' in s.page.locator('.tool-value').inner_text(),'零乘法顯示錯誤')
@feature('線段 AB 與 BA 不重複','只計一條線段')
def f31(s):
    s.tools('segments')
    for a in ['tool:point:0','tool:point:1','tool:point:1','tool:point:0']:s.click(a)
    require('1 條' in s.page.locator('.tool-value').inner_text(),'AB 和 BA 重複計數')
@feature('兩位數列表不重複加入','相同數字僅一列')
def f32(s):s.tools('table');s.click('tool:entry');s.click('tool:entry');require(s.page.locator('tbody tr').count()==1,'數字重複')
@feature('到達每日時限不能繼續提交','不計分並提示時限')
def f33(s):
    st=with_question();st['settings']['limit']=5;day=time.strftime('%Y-%m-%d',time.gmtime((NOW+8*3600000)/1000));st['usage'][day]=300000;s.boot(st).resume();s.fill('answer','9');s.click('submit');require(len(s.state()['attempts'])==0,'超時仍作答');require('時間已用完' in s.text(),'沒有時限提示')
@feature('關閉奧數後入口受限制','不提供奧數課堂')
def f34(s):s.boot();s.click('nav:parent');s.page.locator('#setting-olympiad').uncheck();s.click('save-settings');s.click('nav:olympiad');require('思維之塔暫未開啟' in s.text(),'奧數沒有關閉');require(s.page.locator('[data-action^="lesson:O-"]').count()==0,'仍有奧數課堂入口')
@feature('每日練習 UI 建立十題','10 題且模式 daily')
def f35(s):s.boot();s.click('daily:normal');st=s.state()['current'];require(st['mode']=='daily' and len(st['queues']['4'])==10,'每日練習數量錯誤')
@feature('起步診斷 UI 建立十五題','15 題且模式 diagnostic')
def f36(s):s.boot();s.click('diagnostic:normal');st=s.state()['current'];require(st['mode']=='diagnostic' and len(st['queues']['4'])==15,'診斷題量錯誤')
@feature('港式小店遊戲只評金額','正確找贖不虛構算式分')
def f37(s):
    s.boot();s.click('nav:tools');s.click('game:money');q=s.q();amount=int(q['answer'])
    for coin in [50,20,10,5,2,1]:
        while amount>=coin:s.click('tool:coin:'+str(coin));amount-=coin
    s.click('submit');f=s.state()['current']['feedback'];require(f['correct'],'正確金額被判錯');require(f['parts'] is None,'虛構了算式分數')
@feature('普通數學六階段課堂完成','三題一起做、五題自己做並可小結')
def f38(s):
    s.boot();s.click('nav:normal');s.click('grade:1');s.click('lesson:1N2.2');s.click('nextstage');s.click('nextstage');s.click('nextstage')
    for _ in range(8):s.answer();s.click('nextq')
    require(s.state()['current']['stage']==5,'未到小結');s.click('self:good');st=s.state();require(st['current']['completed'],'不能完成課堂');require(len(st['attempts'])==8,'作答總數錯誤');require(st['wallet']['balance']>=1,'未結算獎勵');s.screenshot('normal_lesson_summary.png')
@feature('奧數六階段及策略卡','三題變式、反思後取得策略卡')
def f39(s):
    s.boot();s.click('nav:olympiad');s.click('lesson:O-APP-queue');s.answer();s.click('nextq');s.click('nextstage');s.click('nextstage')
    for _ in range(3):s.answer();s.click('nextq')
    s.click('nextstage');s.click('reflect:0');s.click('finish');st=s.state();require(st['current']['completed'],'奧數不能完成');require(len(st['cards'])==1,'未取得策略卡');require(st['mastery']['normal']=={},'影響普通數學掌握度');s.screenshot('olympiad_summary.png')
@feature('錯題 UI 兩條新題可清除','錯題 cleared=true')
def f40(s):
    st=blank();day=time.strftime('%Y-%m-%d',time.gmtime((NOW+8*3600000)/1000));st['mistakes']['normal:1N2.2']={'skill':'1N2.2','track':'normal','code':'RECHECK','first':day,'due':[day],'successes':0,'lastSeed':42,'cleared':False};s.boot(st);s.click('nav:parent');s.click('mistake:1N2.2')
    require(len(s.state()['current']['queues']['4'])==2,'錯題數不是兩條')
    for _ in range(2):s.answer();s.click('nextq')
    require(s.state()['mistakes']['normal:1N2.2']['cleared'],'兩條新題後未清除錯題')
@feature('重建瀏覽器畫面後保留已提交答案','從隔離儲存快照重建，回饋及紀錄不重複')
def f41(s):
    s.boot(with_question()).resume();s.answer();raw=s.raw();s.boot(raw=raw).resume();require(s.state()['current']['feedback']['correct'],'回饋遺失');require(len(s.state()['attempts'])==1,'作答紀錄錯誤')
@feature('不存在模板的舊紀錄不能卡死新練習','讀取時安全拒絕，或仍可產生新題','F-ATTEMPT-VALIDATION')
def f42(s):
    st=blank();st['attempts']=[{'id':'bad','skill':'1N2.2','track':'normal','template':'missing','seed':42,'answer':{'value':'2'},'correct':True,'credit':1,'hint':0,'time_ms':1000,'at':NOW,'mode':'practice','difficulty':2,'independent':True}];s.boot(st)
    if '停止儲存' in s.text():return '已安全拒絕'
    s.click('nav:normal');s.click('grade:1');s.click('practice:1N2.2');require(s.view()=='lesson','沒有拒絕損壞資料，但新練習失敗：'+s.text()[-800:])
@feature('異常時間戳不能令家長頁失效','讀取時安全拒絕，或家長頁可顯示','F-ATTEMPT-VALIDATION')
def f43(s):
    st=blank();st['attempts']=[{'id':'bad','skill':'1N2.2','track':'normal','template':'1N2.2-T2','seed':42,'correct':True,'credit':1,'hint':0,'time_ms':1000,'at':1e20,'mode':'practice','difficulty':2,'independent':True}];s.boot(st)
    if '停止儲存' in s.text():return '已安全拒絕'
    s.click('nav:parent');require(s.page.locator('#school').count()==1,'異常時間戳令家長設定畫面無法顯示')
@feature('兩百筆已結算獎勵後仍能完成課堂','新課堂完成、不困在小結','F-OUTBOX-CAPACITY')
def f44(s):
    st=blank();cur=make_current(mode='lesson',stage=5);cur['results']=[{'skill':'1N2.2','correct':True,'credit':1,'hint':0,'mode':'lesson','time_ms':3000,'at':NOW} for _ in range(5)];cur['queues']={};st['current']=cur;day=time.strftime('%Y-%m-%d',time.gmtime((NOW+8*3600000)/1000));st['outbox']=[{'id':'reward'+str(i),'key':'t'+str(i),'day':day,'startedAt':NOW-4000,'completedAt':NOW,'valid':True,'settled':True,'award':1} for i in range(200)];s.boot(st).resume();s.click('self:good');require(s.state()['current']['completed'],'按完成後仍未完成；已結算收據達上限')
@feature('刪除學員連復原備份也刪除','before-restore 不應殘留','F-DELETE-BACKUP')
def f45(s):
    s.boot();r=s.raw();r[KEY+':before-restore']=r[KEY];s.boot(raw=r);s.click('nav:profiles');s.click('delete-profile');require(KEY+':before-restore' not in s.raw(),'刪除學員後完整復原備份仍保留')
@feature('沒有粵語聲線有明確提示','不假裝已播音')
def f46(s):
    s.boot(with_question(),setup="()=>{Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(){throw Error('should not speak')}}})}").resume();s.click('speak');require('沒有可用的粵語聲線' in s.text(),'未解釋沒有聲線')
@feature('答對啟用音效時產生 WebAudio 音符','建立兩個 oscillator（非真人聽感驗收）')
def f47(s):
    st=with_question();st['settings']['sound']=True;s.boot(st,setup="()=>{window.__oscCount=0;const C=AudioContext;const orig=C.prototype.createOscillator;C.prototype.createOscillator=function(){__oscCount++;return orig.call(this)}}").resume();s.answer();require(s.page.evaluate('__oscCount')==2,'沒有產生兩個音符')
@feature('關閉音效不產生音符','oscillator 數為 0')
def f48(s):
    s.boot(with_question(),setup="()=>{window.__oscCount=0;const C=AudioContext;const orig=C.prototype.createOscillator;C.prototype.createOscillator=function(){__oscCount++;return orig.call(this)}}").resume();s.answer();require(s.page.evaluate('__oscCount')==0,'關閉音效仍出音')
@feature('離線 DOM 模式可完成答題','不依賴外部網絡请求')
def f49(s):
    s.boot(with_question());s.context.set_offline(True);s.resume();s.answer();require(s.state()['current']['feedback']['correct'],'離線不能作答');return {'resourceRequests':s.page.evaluate('performance.getEntriesByType("resource").map(x=>x.name)')}
def check_width(s,width,view='home',question=False,tool=None):
    s.boot(with_question('2N5.3-T2') if question else None,width=width,height=844)
    if question:s.resume()
    elif view!='home':s.click('nav:'+view)
    if tool:s.click('selecttool:'+tool)
    overflow=s.page.evaluate('''()=>{let r=document.getElementById('wqm-app-host').shadowRoot;let main=r.querySelector('main');return {viewport:innerWidth,body:document.documentElement.scrollWidth,main:main.scrollWidth};}''')
    s.screenshot('layout_'+str(width)+'_'+view+'.png');require(overflow['body']<=width+1 and overflow['main']<=width+1,'水平溢出 '+str(overflow));return overflow
@feature('320px 手機首頁排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f50(s):return check_width(s,320)
@feature('390px 手機應用題排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f51(s):return check_width(s,390,question=True)
@feature('768px 平板課程頁排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f52(s):return check_width(s,768,view='normal')
@feature('1440px 桌面題目排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f53(s):return check_width(s,1440,question=True)
@feature('844px 寬畫面教具排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f54(s):return check_width(s,844,view='tools',tool='segments')
@feature('640px 家長頁排版','沒有整頁水平溢出','F-MOBILE-OVERFLOW')
def f55(s):return check_width(s,640,view='parent')
@feature('鍵盤提交後焦點不應掉回頁首','焦點移至回饋或下一步，保留操作連續性','F-FOCUS-LOSS')
def f56(s):
    s.boot(with_question()).resume();s.fill('answer',s.q()['answer']);s.page.locator('#answer').focus();s.page.keyboard.press('Enter');a=s.page.evaluate('''()=>{let r=document.getElementById('wqm-app-host').shadowRoot;return {inner:r.activeElement?.outerHTML||null,outer:document.activeElement?.tagName}}''');require(a['inner'] is not None,'提交重繪後焦點回到 '+str(a));return a

def main():
    ap=argparse.ArgumentParser();ap.add_argument('kind',choices=['templates','features']);ap.add_argument('start',type=int);ap.add_argument('end',type=int);args=ap.parse_args()
    assert len(D['templates'])==84 and len(FEATURES)==56,(len(D['templates']),len(FEATURES))
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);s=Screen(b)
        for i in range(args.start,args.end):
            if args.kind=='templates':
                t=D['templates'][i];run_case(s,f'UI-{i+1:03d}',t['id']+'：畫面→填答→提交→存入紀錄','題目正確呈現、正答判對、只記錄一次',template_case(t),'F-UI-GRADE')
            else:
                n,e,f,issue=FEATURES[i];run_case(s,f'UI-{85+i:03d}',n,e,f,issue)
            out=ROOT/'results'/f'browser_{args.kind}_{args.start}_{args.end}.json';out.write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))
        (ROOT/'results/browser_environment.json').write_text(json.dumps(s.native_status(),ensure_ascii=False,indent=2));b.close()
    print('TOTAL',len(RESULTS),'PASS',sum(r['status']=='PASS' for r in RESULTS),'FAIL',sum(r['status']=='FAIL' for r in RESULTS))
if __name__=='__main__':main()
