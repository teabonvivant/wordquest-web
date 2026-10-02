"""R3.3 p20 - family data safety stop-gap (WQ32-01, WQ32-02, N11).

Every anchor below is unique in the frozen R3.2 index.html (ctx.once refuses anything else).

WQ32-01  A leftover wq-r3-recovery:<acct> marker whose IndexedDB journal is missing / invalid used to block even the family
         panel (r3Parent -> v24RequireParent(true) -> v24CanWrite()). Now:
           * r3Parent(rescue) only checks login / parent gate / write lease / !r3Busy (no v24CanWrite).
           * r3PauseWork({rescue}) skips the final save() (it can never succeed while the marker exists).
           * r3Transaction(..., {rescue:true}) first writes the CURRENT state as a new journal (label 'rescue-before'),
             then replaces as usual; the marker is removed only on success; on failure the live state, marker and
             original journal are put back (loadBlocked + journal kept when even that fails).
           * Ordinary writes stay blocked: v24CanWrite, save() and v24GuardEvent are NOT relaxed.
           * A usable journal (prepared+valid, committed, rolled-back) refuses restore/reset and points to "恢復中斷交易".
WQ32-02  deleteChild (outermost layer, host code) records the deleted word ids in a tombstone, deletes, then removes
         image:/note: rows of those words in ONE IndexedDB transaction; retried on load / every 4 s; export and restore
         filter orphan image:/note: rows.
N11      Host code intercepts (window capture) parent-gated clicks inside an open dialog while the parent confirmation has
         expired and shows the password box inside that dialog.

Test anchor "\\ninstallMediaEvents();\\nrender();" is kept byte-for-byte; host code is inserted in front of it.
"""

ANCHOR = '\ninstallMediaEvents();\nrender();'

RESET_CONFIRM_OLD = "清除目前家庭的英文、數學、奧數、街機、跨科使用紀錄、自訂圖片／音訊及所有本機復原副本？其他家庭不受影響。請先匯出家庭完整備份。"
RESET_CONFIRM_RESCUE = ("上次家庭交易未完成，標記仍在。清除目前帳戶資料後，所有孩子、教材、進度及自訂媒體都會消失，未完成標記會一併清除，之後只能靠家庭備份還原。\\n\\n"
                        "如果你有家庭備份，請按「取消」，改用「還原家庭備份」。\\n\\n仍要清除目前帳戶資料？")

RESCUE_EXPORT_DONE = "已產生備份，但上次家庭交易未完成，內容可能不完整。請核對孩子與紀錄數後，才用它還原。"


def apply(s, ctx):
    once = ctx.once
    pure = (ctx.src / 'p20_family_pure.js').read_text(encoding='utf-8')
    host = (ctx.src / 'p20_family_data.js').read_text(encoding='utf-8')
    assert '</script' not in pure.lower() and '</script' not in host.lower()

    # --- messages: do not blame "another tab" when this tab holds the lease and a marker is the cause (v23/v24) -------
    s = once(s, "function v23CapabilityError(){return !navigator.locks?",
             "function v23CapabilityError(){if(wq20MarkerLeased())return wq20MarkerMsg();return !navigator.locks?")
    s = once(s, "toast(loadBlocked?'原有資料需要恢復；目前不會改動。':v23CapabilityError(),'bad');return false;}return true;}",
             "toast(wq20BlockedText(),'bad');return false;}return true;}")
    # The restore file input must not be swallowed by the read-only input guard while a marker exists.
    s = once(s, "#register-child,#restore-file,#v23-migrate-file,#v25-check-file')",
             "#register-child,#restore-file,#v23-migrate-file,#v25-check-file,#r3-family-file')")

    # --- r3Parent / r3PauseWork -------------------------------------------------------------------------------------
    old_parent = ("function r3Parent(){if(!isLoggedIn()){go('login');render();throw Error('先登入家庭帳戶');}"
                  "if(!v24RequireParent(true)||!v23HasLease())throw Error('請先完成家長驗證並取得編輯權');"
                  "if(r3Busy)throw Error('資料處理尚未完成，暫停其他寫入');}")
    new_parent = ("function r3Parent(rescue){if(!isLoggedIn()){go('login');render();throw Error('先登入家庭帳戶');}"
                  "if(rescue===true){if(!v24RequireParent(false))throw Error('請先完成家長驗證並取得編輯權');"
                  "if(!v23HasLease())throw Error('請先取得這個分頁的編輯權（關閉其他編輯分頁後按「取得編輯權」）');"
                  "if(r3Busy)throw Error('資料處理尚未完成，暫停其他寫入');return;}"
                  "if(!v24RequireParent(true)||!v23HasLease())throw Error('請先完成家長驗證並取得編輯權');"
                  "if(r3Busy)throw Error('資料處理尚未完成，暫停其他寫入');}")
    s = once(s, old_parent, new_parent)
    s = once(s, "function r3PauseWork(){if(mediaBusy)throw Error(",
             "function r3PauseWork(wq20o){const wq20R=!!(wq20o&&wq20o.rescue);if(mediaBusy)throw Error(")
    s = once(s, "if(window.WQMathApp?.close()===false)throw Error('數學草稿未能儲存，未開始資料操作');if(!pgPause())throw Error('街機未能暫停');",
             "if(window.WQMathApp?.close()===false&&!wq20R)throw Error('數學草稿未能儲存，未開始資料操作');if(!pgPause()&&!wq20R)throw Error('街機未能暫停');")
    s = once(s, "if(!save())throw Error('現有資料未儲存，未開始資料操作');}",
             "if(!wq20R&&!save())throw Error('現有資料未儲存，未開始資料操作');}")

    # --- r3Transaction ----------------------------------------------------------------------------------------------
    s = once(s, "async function r3Transaction(values,media,label){\n r3Parent();r3PauseWork();const owner=accountId()",
             "async function r3Transaction(values,media,label,wq20Opts){\n const wq20R=!!(wq20Opts&&wq20Opts.rescue);r3Parent(wq20R);r3PauseWork({rescue:wq20R});let wq20Orig=null,wq20Media=null;const owner=accountId()")
    s = once(s, "await r3Journal('put',{owner,before,beforeMedia,at:Date.now(),label});journalWritten=true;localStorage.setItem(r3Marker(owner),'prepared');prepared=true;unchanged();",
             "if(wq20R){wq20Orig=await wq20RescueBegin(owner,before,beforeMedia);wq20Media=beforeMedia;}"
             "await r3Journal('put',{owner,before,beforeMedia,at:Date.now(),label:wq20R?'rescue-before':label});journalWritten=true;"
             "if(!wq20R)localStorage.setItem(r3Marker(owner),'prepared');prepared=true;unchanged();")
    s = once(s, "\n  if(prepared){try{const j=await r3Journal('get',owner);",
             "\n  if(prepared&&wq20R){try{await wq20RescueRollback(owner,before,wq20Media,wq20Orig);db=owner===accountId()?beforeDb:load();r3SettingsOwner='';}"
             "catch(rollback){loadBlocked=true;persistenceIssue='資料交易中斷，復原日誌已保留。請勿清除瀏覽器資料：'+rollback.message;showSaveIssue();throw Error(persistenceIssue);}}"
             "\n  else if(prepared){try{const j=await r3Journal('get',owner);")

    # --- r3Export ---------------------------------------------------------------------------------------------------
    s = once(s, "async function r3Export(){r3Parent();r3PauseWork();const exportInert=",
             "async function r3Export(){const wq20R=wq20Marked();r3Parent(wq20R);r3PauseWork({rescue:wq20R});if(wq20R)wq20RescueExportCheck();const exportInert=")
    s = once(s, "const rows=await readMediaOwner(owner),media=[];for(const row of rows){",
             "const rows=await wq20ExportMediaRows(owner),media=[];for(const row of rows){")

    # --- r3Restore --------------------------------------------------------------------------------------------------
    s = once(s, "async function r3Restore(payload){r3Parent();const MC=",
             "async function r3Restore(payload){const wq20R=wq20Marked();r3Parent(wq20R);const MC=")
    s = once(s, "const current=r3Settings();for(const cid of english.children.map(c=>c.id))",
             "const current=wq20SafeSettings();for(const cid of english.children.map(c=>c.id))")
    s = once(s, "const media=clean.media.map(row=>({...row.meta,",
             "const media=wq20LiveMediaRows(clean.media,english.words).map(row=>({...row.meta,")
    s = once(s, "await r3Transaction(values,media,'restore-family');toast(",
             "await r3Transaction(values,media,'restore-family',{rescue:wq20R});toast(")

    # --- resetAll ---------------------------------------------------------------------------------------------------
    s = once(s, "resetAll=async function(){try{r3Parent();if(!confirm('" + RESET_CONFIRM_OLD + "'))return;",
             "resetAll=async function(){try{const wq20R=wq20Marked();r3Parent(wq20R);if(wq20R)await wq20RescueCheck();"
             "if(!confirm(wq20R?'" + RESET_CONFIRM_RESCUE + "':'" + RESET_CONFIRM_OLD + "'))return;")
    s = once(s, "[],'reset-family');", "[],'reset-family',{rescue:wq20R});")

    # --- panel, banner, handlers ------------------------------------------------------------------------------------
    s = once(s, "function r3Panel(){r3Parent();", "function r3Panel(){r3Parent(wq20Marked());")
    s = once(s, r'''data-r3=\"recover\">恢復中斷交易</button>';document.getElementById('app')?.prepend(b);''',
             r'''data-r3=\"recover\">恢復中斷交易</button> <button class=\"btn soft\" data-r3=\"family\">家庭管理／還原備份</button>';document.getElementById('app')?.prepend(b);''')
    s = once(s, "try{r3Parent();r3PauseWork();const targetOwner=accountId();",
             "try{const wq20R=wq20Marked();r3Parent(wq20R);r3PauseWork({rescue:wq20R});if(wq20R)await wq20RescueCheck();const targetOwner=accountId();")
    s = once(s, '<div class="dangerbox">會取代目前家庭的孩子、教材、進度及媒體，不是合併。',
             '<div class="dangerbox">${wq20RestoreNote()}會取代目前家庭的孩子、教材、進度及媒體，不是合併。')
    s = once(s, "r3Parent();b.disabled=true;if(act==='export-family'){await r3Export();r3Status('完整家庭備份已產生，請保留下載檔。');}",
             "const wq20R=wq20Marked();r3Parent(wq20R);b.disabled=true;"
             "if(wq20R&&['save-plan','save-voice','legacy-math'].includes(act))throw Error('上次家庭交易未完成，這個功能暫停。請先恢復或還原備份。');"
             "if(wq20R&&(act==='choose-family'||act==='confirm-restore'))await wq20RescueCheck();"
             "if(act==='export-family'){await r3Export();r3Status(wq20R?'" + RESCUE_EXPORT_DONE + "':'完整家庭備份已產生，請保留下載檔。');}")

    # --- startup message, health dialog, device report ---------------------------------------------------------------
    s = once(s, "persistenceIssue='上次家庭交易中斷，請先恢復中斷交易。';",
             "persistenceIssue='上次家庭交易未完成，已暫停寫入。請到「家長 → 家庭管理」按「恢復中斷交易」；若日誌遺失，請用家庭備份還原。';")
    s = once(s, "function r32OpenHealth(){r3Parent();", "function r32OpenHealth(){r3Parent(wq20Marked());")
    s = once(s, "if(b.dataset.r32==='report'){r3Parent();r3Download(", "if(b.dataset.r32==='report'){r3Parent(wq20Marked());r3Download(")

    # --- host code (the shared test anchor stays intact) --------------------------------------------------------------
    s = once(s, ANCHOR, '\n/* R3.3 p20 pure helpers */\n' + pure + '\n' + host + ANCHOR)
    return s
