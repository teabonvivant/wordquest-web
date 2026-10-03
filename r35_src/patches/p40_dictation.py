"""R3.5 p40 - school dictation (默書) as practice: add-range flow, practice with a school range, parent report text.

Issues: D3 D4 D5 D6 D7 D8 D9 D11 D12 D13 D15 D16 D17 D19 D22 D23 D24 D25, S3-09 (see the report for status per item).

Pieces:
  * script 5 (WQImportCore)   + r35_src/p40_import_core.js      D4: after OCR only English-looking candidates stay selected
  * script 8 (WQEducation)    grading default 'practice' (stored 'strict' without an explicit choice migrates), gradingChosen flag
  * validateDb session tail   keeps the small per-session practice state (tries / hints / results) across a reload
  * demo range                no invented date
  * runOCR                    three small hooks that call window.WQP40 (the old strings stay as the fallback)
  * parent gate               lease 5 -> 15 minutes (sliding renewal is done at run time)
  * save-range                lands on the range detail (window.WQP40.landed) instead of the offline maintenance page
  * study 5 words             study list covers more words (window.WQP40.studyList)
  * policy save               remembers that the parent chose a grading mode
  * </head>                   + <style id="wq35-p40-css">  (r35_src/p40_dictation.css)
  * "\\ninstallMediaEvents();\\nrender();"  + r35_src/p40_import.js, p40_practice.js, p40_parent.js, p40_hooks.js
    (one IIFE inside the host closure; the anchor text is kept)
Everything else happens at run time with structural anchors (ids, classes, data attributes), so the later copy pass keeps working.
"""

SESSION_VALIDATOR = (
    "p40:(p=>{try{if(!p||typeof p!=='object')return undefined;"
    "const ks=['ok','hint','shown','copy'],cl=v=>String(v==null?'':v).slice(0,80);"
    "return {res:(Array.isArray(p.res)?p.res:[]).slice(-240).filter(r=>r&&ks.includes(r.k))"
    ".map(r=>({q:cl(r.q),w:cl(r.w),k:r.k,f:r.f===true})),"
    "tries:Math.max(0,Math.min(9,Number(p.tries)||0)),hint:Math.max(0,Math.min(2,Number(p.hint)||0)),"
    "item:cl(p.item),copy:p.copy===true,"
    "wrong:(Array.isArray(p.wrong)?p.wrong:[]).slice(0,4).map(v=>String(v).slice(0,240))};}"
    "catch(_){return undefined;}})(s.p40)"
)


def apply(s, ctx):
    once = ctx.once
    src = ctx.src
    core = (src / 'p40_import_core.js').read_text()
    css = (src / 'p40_dictation.css').read_text()
    parts = [(src / n).read_text() for n in ('p40_import.js', 'p40_practice.js', 'p40_parent.js', 'p40_hooks.js')]

    # D4: candidate heuristic inside WQImportCore (frozen public API is unchanged; only the selected flags differ)
    s = once(s, "\n return out;\n}\nfunction editDistance(",
             "\n if(doc.fromOCR)p40Mark(out,mode,dictionary,doc);\n return out;\n}\n" + core + "function editDistance(")

    # D6: practice by default. A stored 'strict' that the parent never chose on purpose becomes 'practice'.
    s = once(s, "grading:p.grading||'strict',gradePacing:p.gradePacing!==false,rangeLocks};}",
             "grading:(p.grading==='strict'&&p.gradingChosen!==true)?'practice':(p.grading||'practice'),"
             "gradePacing:p.gradePacing!==false,rangeLocks,gradingChosen:p.gradingChosen===true};}")
    s = once(s, "p.grading=$('#v24-grading').value;p.gradePacing=",
             "p.grading=$('#v24-grading').value;p.gradingChosen=true;p.gradePacing=")

    # D5/D6: per-session practice state survives a reload or a pause
    s = once(s, "scored:num(s.scored,0,240,0),played:false,audioStatus:'idle',audioItemId:null};}",
             "scored:num(s.scored,0,240,0),played:false,audioStatus:'idle',audioItemId:null," + SESSION_VALIDATOR + "};}")

    # D8: the demo range carries no invented date
    s = once(s, "dictationDate:dayKey(new Date(Date.now()+4*DAY)),createdAt", "dictationDate:'',createdAt")
    s = once(s, "dictationDate:txt(r.dictationDate,10,true),createdAt:date(r.createdAt),isDemo:",
             "dictationDate:(r.isDemo===true||r.id==='r_demo')?'':txt(r.dictationDate,10,true),createdAt:date(r.createdAt),isDemo:")

    # D7 / D4: OCR result hooks. The old branches stay in place as the fallback when window.WQP40 is missing.
    s = once(s, "if(!items.length){updateOCR('", "if(!items.length){if(window.WQP40){WQP40.ocrEmpty();return;}updateOCR('")
    s = once(s, ",100);v20RenderWords();}\n catch(e){if(valid())updateOCR(",
             ",100);if(window.WQP40)WQP40.ocrDone(doc,items);v20RenderWords();}\n"
             " catch(e){if(valid()&&window.WQP40){WQP40.ocrError(e);return;}if(valid())updateOCR(")

    # D17: parent lease 15 minutes (renewed on activity at run time)
    s = once(s, "v23ParentUntil=performance.now()+300000;render();}", "v23ParentUntil=performance.now()+900000;render();}")

    # D12: the self-chosen study list is not cut at five words
    s = once(s, "const ws=rangeWords(r.id).slice(0,5);if(canResume()){go('learn');return;}",
             "const ws=(window.WQP40?WQP40.studyList(r.id):rangeWords(r.id).slice(0,5));if(canResume()){go('learn');return;}")

    # D9: after saving land on the range detail with a success line (not the offline maintenance page)
    s = once(s, ";go('offline');}\n catch(e){db=before;const el=$('#v20-save-error');",
             ";if(window.WQP40)WQP40.landed(r.id);else go('offline');}\n catch(e){db=before;const el=$('#v20-save-error');")

    s = once(s, '</head>', '<style id="wq35-p40-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    js = "(function(){'use strict';\n" + '\n'.join(parts) + "\n})();\n"
    s = once(s, anchor, '\n' + js + anchor)
    return s
