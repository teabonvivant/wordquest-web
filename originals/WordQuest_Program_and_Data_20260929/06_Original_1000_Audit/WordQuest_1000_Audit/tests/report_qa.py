"""Checks the delivered audit report itself, not counted as application checks."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1280,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'report/WordQuest_1000_Checks_Report.html').read_text(),wait_until='load')
    assert page.locator('#cases > details').count()==40
    assert '符合條件 40 項' in page.locator('#shown').inner_text()
    page.locator('#status').select_option('')
    assert '符合條件 1000 項' in page.locator('#shown').inner_text()
    page.locator('#cat').select_option('GEN')
    assert '符合條件 504 項' in page.locator('#shown').inner_text()
    page.locator('#cat').select_option('')
    page.locator('#search').fill('GRADE-061')
    assert page.locator('#cases > details').count()==1
    page.locator('#cases > details > summary').click()
    assert '3⁄4' in page.locator('#cases').inner_text()
    page.locator('#search').fill('');page.locator('#status').select_option('FAIL')
    page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(ROOT/'report/report_desktop_preview.png'))
    page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo(0,0)')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(ROOT/'report/report_mobile_preview.png'))
    assert not errors,errors
    r={'report_check_only_not_in_1000':True,'default_failed_count':40,'all_cases_filter':1000,'generation_filter':504,'single_case_search':'GRADE-061','mobile_width':390,'mobile_horizontal_overflow':False,'console_page_errors':errors,'embedded_evidence':True}
    (ROOT/'report/report_qa.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
    print(r);b.close()
