"""Evidence re-captures and one triage reproduction, excluded from the 1,000 case total."""
from browser_checks import Screen,blank,make_current,with_question,ROOT,sync_playwright
import json,os

def settle(s):
    s.page.wait_for_timeout(450)
    return s

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    s=Screen(browser)
    settle(s.boot(guest=True)).screenshot('review_mobile_home_settled.png')
    settle(s.boot(with_question('2N5.3-T2')).resume()).screenshot('review_mobile_word_settled.png')
    settle(s.boot(with_question('3N5.1-T2')).resume()).screenshot('review_mobile_fraction_settled.png')
    s.fill('answer','2⁄3');s.click('submit');settle(s).screenshot('review_fraction_unicode_rejected.png')
    s.boot(with_question('1N2.2-T2')).resume();s.fill('answer','123');settle(s).screenshot('review_draft_before.png')
    s.click('pause');s.click('resume');settle(s).screenshot('review_draft_after.png')
    st=blank();st['current']=make_current();st['current']['queues']={}
    s.boot(st);accepted='停止儲存' not in s.text();s.resume();settle(s).screenshot('review_missing_queue.png')
    r={'counted_in_1000':False,'purpose':'確認 STATE-085 的畫面影響及補拍已完成進場動畫的截圖',
       'invalid_queue_accepted':accepted,'view':s.view(),
       'answer_inputs':s.page.locator('#answer').count(),
       'submit_buttons':s.page.locator('[data-action="submit"]').count(),
       'page_errors':s.errors,'screen_excerpt':s.text()[-1000:],
       'result':'缺題目佇列可被讀取；續課顯示空白題目區，沒有填答或提交入口。',
       'method':'Chromium DOM + isolated in-memory localStorage; not native storage'}
    (ROOT/'results/supplemental_evidence.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
    print(json.dumps(r,ensure_ascii=False));browser.close()
