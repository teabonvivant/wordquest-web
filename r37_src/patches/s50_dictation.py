"""R3.10 s50 - dictation upload (#range-new): word-length filter (default 3+), basic-word switch, auto recognise after the photo is
chosen, one-row name/date, compact cards and a fixed action bar. CSS/JS are injected the same way as s10 (host closure, before the
render anchor); the R3.5 p40 layer stays untouched and is only wrapped from the outside."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    once, src = ctx.once, ctx.src
    css = (src / 's50_dictation.css').read_text()
    js = (src / 's50_dictation.js').read_text()
    s = once(s, '</head>', '<style id="wq37-s50-css">\n' + css + '</style>\n</head>')
    s = once(s, ANCHOR, '\n' + js + ANCHOR)
    # R3.35 photo: English + Traditional Chinese. The Chinese beside a word was read as Latin garbage ("拍照" -> "Biche") that stuck to
    # the phrase and broke it; read as Chinese it separates the items again (and gives the teacher's meaning for unknown phrases).
    s = once(s, "Tesseract.createWorker('eng',1,{...(await window.WQR3OCR.options()),logger,errorHandler:()=>{}})",
             "Tesseract.createWorker('eng+chi_tra',1,{...(await window.WQR3OCR.options()),logger,errorHandler:()=>{}})")
    s = once(s, "'正在載入英文辨認資料…'", "'正在載入辨認資料…'")
    s = once(s, " ['eng.traineddata.gz','https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz']\n];",
             " ['eng.traineddata.gz','https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'],\n"
             " ['chi_tra.traineddata.gz','https://cdn.jsdelivr.net/npm/@tesseract.js-data/chi_tra/4.0.0_best_int/chi_tra.traineddata.gz']\n];")
    # R3.36 accuracy before speed (Oliver: up to 30 s is fine): "自動分欄" also reads the photo as one block of text (psm 6) and keeps
    # the reading with more confident dictionary words. 50 synthetic photos: target words read 89.6% -> 93.5%.
    s = once(s, "await worker.setParameters({tessedit_pageseg_mode:psm,preserve_interword_spaces:'1',user_defined_dpi:'300'});return await worker.recognize(image,{}, {text:true,blocks:true,tsv:true,hocr:false,pdf:false});",
             "return await window.s50Recognize(worker,image,psm,valid);")
    s = once(s, "updateOCR(m.status==='recognizing text'?`正在辨認 ${percent}%`", "updateOCR(m.status==='recognizing text'?`${window.s50PassLabel||'正在辨認'} ${percent}%`")
    return s
