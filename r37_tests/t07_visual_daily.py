import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *

C = Checker('t07')
with sync_playwright() as playwright:
    browser, context, page, errors = open_page(playwright)
    page.goto(URL)
    page.wait_for_timeout(1200)
    go(page, '#kid')
    rollover = ev(page, "(()=>{const state=r37Get();state.diff=4;state.day.d='2000-01-01';state.day.correct=99;state.day.claimed=['ok'];const fresh=r37Get();return {day:fresh.day.d,expected:r37Day(),correct:fresh.day.correct,claimed:fresh.day.claimed,diff:fresh.diff};})()")
    C.ok(rollover['day'] == rollover['expected'] and rollover['correct'] == 0 and rollover['claimed'] == [], 'midnight resets daily counters and claims')
    C.ok(rollover['diff'] == 4, 'midnight retains difficulty')
    C.ok(ev(page, "R37_MISSIONS.find(m=>m.id==='en').name.includes(String(R37_MISSIONS.find(m=>m.id==='en').goal))"), 'English mission label states the actual target')
    browser.close()
    for width, height, name, touch in VIEWPORTS + [(360, 640, 'small-phone', True)]:
        browser, context, page, errors = open_page(playwright, width, height, touch)
        page.goto(URL)
        page.wait_for_timeout(1200)
        go(page, '#kid')
        C.ok(page.locator('.r37-planet svg').count() == 6, name + ': six vector planet icons')
        C.ok(fits(page, '.r37-planet,.r37-nav'), name + ': home controls fit')
        for route in ['#p/english', '#p/math', '#p/olympiad', '#p/games', '#p/dictation']:
            go(page, route)
            C.ok(fits(page, '.r37-tile,.r37-nav'), name + ': controls fit ' + route)
        go(page, '#lv/english')
        page.click('.r37-node.cur')
        page.wait_for_timeout(300)
        C.ok(fits(page, '.r37-wc,.r37-go'), name + ': three learning cards and start fit')
        C.ok(page.locator('.r37-wem svg').count() == 3, name + ': first stage has three vector pictures')
        page.screenshot(path=str(SHOTS / ('art_learn_' + name + '.png')))
        go(page, '#kid')
        page.screenshot(path=str(SHOTS / ('art_home_' + name + '.png')))
        C.ok(not errors, name + ': no runtime errors ' + str(errors[:2]))
        browser.close()
C.done()
