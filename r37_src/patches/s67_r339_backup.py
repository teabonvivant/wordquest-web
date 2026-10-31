"""R3.39 s67 - the backup carries the per-child progress (r37_src/s28_review.js), and a child who is still empty on this device (a new phone: the first child of every new account has the
same id) takes the coins and course progress of the backup. A child with any study here keeps today's coins and course state, so a restore still cannot rewind or refill the wallet."""

COURSE = "['familyLearning','phonicsLearning','learningV30','workshopV31']"


def apply(s, ctx):
    o = ctx.once
    s = o(s, 'backup=await R25.seal(checked,createdAt,!!persistenceIssue);', 'backup=await R25.seal(r39BackupAdd(checked),createdAt,!!persistenceIssue);')
    s = o(s, " if(x.children.length>50)throw Error('合併後會超過 50 位孩子，所以沒有合併。');\n for(const c of x.children)c.stars=known.get(c.id)?.stars||0;\n const restored=x.playgroundV22;\n",
          " if(x.children.length>50)throw Error('合併後會超過 50 位孩子，所以沒有合併。');\n"
          " const r39Fresh=id=>{const k=known.get(id);return !k||(!k.stars&&!(current.attempts||[]).some(a=>a.childId===id));},r39Course=" + COURSE + ".map(k=>[k,x[k]]);\n"
          " for(const c of x.children)if(!r39Fresh(c.id))c.stars=known.get(c.id).stars||0;\n const restored=x.playgroundV22;\n")
    s = o(s, "'learningV30','workshopV31'])x[k]=structuredClone(current[k]);\n",
          "'learningV30','workshopV31'])x[k]=structuredClone(current[k]);\n"
          " for(const c of x.children)if(r39Fresh(c.id))for(const[k,v]of r39Course){const e=v?.children?.[c.id];if(e){x[k]=x[k]||{...structuredClone(v),children:{}};x[k].children[c.id]=structuredClone(e);}}\n")
    s = o(s, "const inspected=await v25InspectFile(file);let x=inspected.data;\n", "const inspected=await v25InspectFile(file);let x=inspected.data;const r39Raw=JSON.parse((await file.text()).replace(/^\\uFEFF/,''));\n")
    s = o(s, "clearImportDraft();v24StoreProtection();showSaveIssue();\n  toast(blocked?", "clearImportDraft();v24StoreProtection();showSaveIssue();r39BackupApply(r39Raw);\n  toast(blocked?")
    return s
