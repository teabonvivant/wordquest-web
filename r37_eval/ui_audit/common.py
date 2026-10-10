import os, sys, json, re
os.environ.setdefault('WQ33_APP', '/home/.z/workspaces/con_EfO3MUQLdW6o7xbL/r312/eval_app.html')
sys.path.insert(0, '/home/workspace/wordquest-web-dev/r37_tests')
from lib37 import *

def admin_page(p, w, h, touch, learn=True):
    b, ctx, pg, errs = open_page(p, w, h, touch, learn=learn)
    html = patched_html()
    pg.route(URL + '?mode=admin-test', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(URL + '?mode=admin-test'); pg.wait_for_timeout(1200)
    go(pg, '#login', 300)
    pg.fill('#login-name', 'Admin'); pg.fill('#login-pin', '1234')
    pg.click('[data-act="login-submit"]'); pg.wait_for_timeout(1200)
    assert ev(pg, 'isTestAdmin()')
    go(pg, '#kid', 400)
    return b, ctx, pg, errs
