"""R3.43 s69 - STATE-03/04: the family backup carries every child's level progress (wq37- keys, r37_src/s28_review.js r43*), and those keys are part of the
family's owned keys, so 取代 (restore, reset) replaces or clears them inside the same journalled transaction instead of leaving the old child's progress behind."""
MODULE_ID = 's69'


def apply(s, ctx):
    o = ctx.once
    s = o(s, "k===main+'-v24-protection'||k==='wq-r3-family:'+owner||",
          "k===main+'-v24-protection'||k==='wq-r3-family:'+owner||k.startsWith('wq37-'+owner+'-')||k.startsWith('wq37-t-'+owner+'-')||")
    s = o(s, "k?.startsWith('wordquest-v32-characters:sandbox:'+a+':'));}",
          "k?.startsWith('wordquest-v32-characters:sandbox:'+a+':')||k?.startsWith('wq37-'+a+'-')||k?.startsWith('wq37-t-'+a+'-'));}")
    s = o(s, "const payload={sourceOwner:owner,english,math,family,media,characterPreferences};",
          "const payload={sourceOwner:owner,english,math,family,media,characterPreferences,r39Progress:r43ProgressOut(english.children)};")
    s = o(s, "return F3.validatePayload(pack.payload,validateDb,window.WQMathCore,window.WQMathCore.library(window.WQMathData));}",
          "const clean=F3.validatePayload(pack.payload,validateDb,window.WQMathCore,window.WQMathCore.library(window.WQMathData));clean.r39Progress=r43ProgressIn(pack.payload.r39Progress,clean.english.children);return clean;}")
    s = o(s, "await r3Transaction(values,media,'restore-family',{rescue:wq20R});",
          "r43ProgressValues(values,{...clean,r39Progress:r43ProgressIn(payload&&payload.r39Progress,clean.english.children)},owner);await r3Transaction(values,media,'restore-family',{rescue:wq20R});")
    return s
