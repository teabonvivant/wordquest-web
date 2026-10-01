"""Final screenshot and document review; not added to the functional test count.
App DOM uses the same declared in-memory I/O adapters as other R3.1 tests.
"""
from pathlib import Path
import sys,json,mimetypes,urllib.parse
R=Path(__file__).resolve().parents[1];E=R/'r31_evidence';sys.path.insert(0,str(R/'tests'))
from harness import boot
from playwright.sync_api import sync_playwright
results=[]
def shot(p,name):
    p.wait_for_timeout(1000)
    p.screenshot(path=str(E/name),full_page=False)
    results.append({'screenshot':name,'overflow':p.evaluate('document.documentElement.scrollWidth>innerWidth+1')})
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx,p,err,d=boot(b)
    shot(p,'final_english_home.png')
    p.evaluate('WQMathApp.open("home")');p.wait_for_timeout(1000)
    shot(p,'final_math_home.png')
    p.locator('#wqm-app-host [data-action="nav:normal"]').first.click()
    p.locator('#wqm-app-host [data-action="grade:1"]').first.click()
    p.locator('#wqm-app-host [data-action="practice:1N1.1"]').first.click()
    q=p.evaluate('()=>{const C=WQMathCore,L=C.library(WQMathData),s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return C.generate(L,r.template,r.seed)}')
    p.locator('#wqm-app-host #answer').fill(str(q['answer']))
    p.locator('#wqm-app-host [data-action="submit"]').click()
    p.wait_for_timeout(1000)
    p.set_viewport_size({'width':1280,'height':1450})
    p.locator('.forest-math-guide').scroll_into_view_if_needed()
    shot(p,'final_math_feedback.png')
    results.append({'feedbackStyle':p.locator('#wqm-app-host .feedback').evaluate('(e)=>({opacity:getComputedStyle(e).opacity,display:getComputedStyle(e).display,bodyOpacity:getComputedStyle(e.getRootNode().host).opacity})'),'errors':err})
    p.set_viewport_size({'width':390,'height':844})
    p.evaluate('WQMathApp.open("home")');p.wait_for_timeout(500)
    p.locator('#wqm-app-host [data-action="nav:home"]').first.click()
    p.locator('.forest-math-guide').scroll_into_view_if_needed()
    shot(p,'final_math_home_390.png')
    ctx.close()
    # Static document rendering with local bytes routed to a test origin; no network.
    for doc in ['START_HERE.html','docs/R3_1_角色接入報告.html','docs/角色素材一覽_R3_1.html']:
        context=b.new_context(viewport={'width':390,'height':844});page=context.new_page()
        def serve(rt):
            u=urllib.parse.urlparse(rt.request.url)
            pp=(R/urllib.parse.unquote(u.path).lstrip('/')).resolve()
            if R not in pp.parents or not pp.is_file():return rt.abort()
            rt.fulfill(body=pp.read_bytes(),content_type=mimetypes.guess_type(str(pp))[0] or 'application/octet-stream')
        page.route('**/*',serve)
        base='https://wordquest-review.invalid/'+doc
        body=(R/doc).read_text();body=body.replace('<meta charset="utf-8">','<meta charset="utf-8"><base href="'+base+'">',1)
        page.set_content(body,wait_until='load');page.wait_for_timeout(400)
        imgs=page.locator('img:not([loading="lazy"])').evaluate_all('(xs)=>xs.map(i=>({src:i.getAttribute("src"),ok:i.complete&&i.naturalWidth>0}))')
        results.append({'document':doc,'width':390,'fits':page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'images':imgs})
        if doc=='START_HERE.html':page.screenshot(path=str(E/'final_start_390.png'),full_page=True)
        context.close()
    b.close()
(E/'visual_review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
