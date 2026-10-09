"""R3.7 s40 - the Admin test account also works on the public https site (?mode=admin-test).
Local (file:/localhost) keeps Admin / 1234 for the test suites; the public site needs a private password whose
salted SHA-256 is below (the password itself is not in the repo). Test data stays in the separate test storage keys."""

LIVE = "const R37_ADMIN=Object.freeze({salt:'wordquest-live-admin-r37-388a01aaa87b55e6',hash:'6b3ef1bcd806e023476c9b2b42e16dbc83b087f1eabb6f97818746738fdebb87'});"
HINT = "'帳戶 Admin ／ 密碼 1234'"

EDITS = [
    ("const WQ_TEST_MODE=WQ_LOCAL_TEST_ALLOWED&&new URLSearchParams(location.search).get('mode')==='admin-test';",
     "const WQ_TEST_MODE=new URLSearchParams(location.search).get('mode')==='admin-test';\n" + LIVE),
    ("if(!/^\\d{4}$/.test(pin)){toast('帳戶名稱或 PIN 不對，請再試一次。','bad');return;}",
     "if(!(WQ_LOCAL_TEST_ALLOWED?/^\\d{4}$/:/^.{10,128}$/).test(pin)){toast('帳戶名稱或密碼不對，請再試一次。','bad');return;}"),
    ("const hash=await pinHash(pin,TEST_ADMIN.salt),expected=globalThis.crypto?.subtle?TEST_ADMIN.hash:TEST_ADMIN.legacyHash;",
     "const hash=await pinHash(pin,WQ_LOCAL_TEST_ALLOWED?TEST_ADMIN.salt:R37_ADMIN.salt),expected=!globalThis.crypto?.subtle?(WQ_LOCAL_TEST_ALLOWED?TEST_ADMIN.legacyHash:''):WQ_LOCAL_TEST_ALLOWED?TEST_ADMIN.hash:R37_ADMIN.hash;"),
    ("'這是測試版。Admin / 1234 只供測試假資料。'", "(WQ_LOCAL_TEST_ALLOWED?'這是測試版。Admin / 1234 只供測試假資料。':'這是測試版，只供測試假資料。')"),
    ("<div><span>測試密碼</span><strong>1234</strong></div>", "${WQ_LOCAL_TEST_ALLOWED?'<div><span>測試密碼</span><strong>1234</strong></div>':''}"),
    ('autocomplete="current-password" value="1234">', 'autocomplete="current-password" value="${WQ_LOCAL_TEST_ALLOWED?\'1234\':\'\'}">'),
    ("請先進入本機測試環境，再用 Admin／1234 登入。", "請用 Admin 帳戶登入。"),
]


def apply(s, ctx):
    for a, b in EDITS:
        s = ctx.once(s, a, b)
    if s.count(HINT) != 2:
        raise ValueError('expected two admin hints')
    return s.replace(HINT, "(WQ_LOCAL_TEST_ALLOWED?" + HINT + ":'請用 Admin 帳戶登入')")
