"""R3.6 q40 - item 15: every game has its own price (1 to 4 coins). Admin test mode stays free.

Economy (s19 WQArcade28):
  catalog[i].cost / WQArcade28.cost(id)   price table (one place, see COSTS)
  purchase()   charges the game's price; needs balance >= price; the ledger records -price
  refund()     returns exactly what that round cost
  validate()   spend entries -1..-4, refund entries +1..+4 (old -1 entries stay valid)
A round (5 plays per batch) is still counted per play, not per coin.
Host (s33): every text and button that said "1 枚金幣" now shows the game's real price; lobby cards carry a price tag.
"""

# order of WQArcade28.ids
COSTS = {
    'sky-rescue': 1, 'forest-dash': 1, 'moon-bells': 1, 'bounce-basket': 1, 'number-garden': 1, 'forest-band': 1,
    'drift-path': 2, 'meadow-cricket': 2, 'honey-delivery': 2, 'color-workshop': 2, 'forest-pong': 2, 'juice-lines': 2,
    'honeycomb-puzzle': 3, 'valley-race': 3, 'rolling-block': 3, 'block-studio': 3, 'star-rhythm': 3,
    'color-orbit': 4, 'garden-paths': 4, 'little-engineer': 4, 'sweet-studio': 4,
    'ruins-courier': 3, 'cloud-island': 3, 'star-patrol': 4, 'lighthouse-well': 4, 'harbor-volley': 2,
}
IDS = ['sky-rescue', 'forest-dash', 'moon-bells', 'bounce-basket', 'number-garden', 'forest-band',
       'drift-path', 'meadow-cricket', 'honey-delivery', 'color-workshop', 'forest-pong', 'juice-lines',
       'honeycomb-puzzle', 'valley-race', 'rolling-block', 'block-studio', 'star-rhythm', 'color-orbit',
       'garden-paths', 'little-engineer', 'sweet-studio', 'ruins-courier', 'cloud-island', 'star-patrol',
       'lighthouse-well', 'harbor-volley']
assert sorted(IDS) == sorted(COSTS) and len(IDS) == 26

ECON = [
    ("  const catalog = ids.map((id,i)=>Object.freeze({id,words:words[i],legacy:legacy[id]||id}));",
     "  const COSTS=[" + ','.join(str(COSTS[i]) for i in IDS) + "];\n"
     "  const MAX_COST=4;\n"
     "  const catalog = ids.map((id,i)=>Object.freeze({id,words:words[i],cost:COSTS[i],legacy:legacy[id]||id}));\n"
     "  function cost(id) { const g=catalog.find(g=>g.id===id);return g?g.cost:1; }"),
    ("    assert(c.batch.used<5,'這一輪的 5 枚金幣已經用完。完成下一輪學習，或請家長開放下一輪。');\n"
     "    assert(balance>=1,'金幣不夠，沒有扣金幣。先做練習賺金幣吧。');",
     "    assert(c.batch.used<5,'這一輪的 5 局已經玩完。完成新的學習，或請家長開放下一輪。');\n"
     "    const price=game(gid).cost;\n"
     "    assert(balance>=price,'金幣不夠（這款要 '+price+' 枚），沒有扣金幣。拿滿 5 顆星，就有新金幣。');"),
    ("    log(c,{id:receipt,kind:'spend',amount:-1,at:now,note:gid});\n    return balance-1;",
     "    log(c,{id:receipt,kind:'spend',amount:-price,at:now,note:gid});\n    return balance-price;"),
    ("    assert(c.ledger.some(e=>e.id===receipt&&e.kind==='spend'),'找不到這一局的投幣紀錄，不能取消。');\n"
     "    assert(balance<MAX_BALANCE,'金幣已滿，取消不了這一局。');",
     "    const spent=c.ledger.find(e=>e.id===receipt&&e.kind==='spend');assert(spent,'找不到這一局的投幣紀錄，不能取消。');\n"
     "    const back=-spent.amount;integer(back,1,MAX_COST);\n"
     "    assert(balance+back<=MAX_BALANCE,'金幣已滿，取消不了這一局。');"),
    ("    log(c,{id:'refund_'+receipt,kind:'refund',amount:1,at:now,note:'取消沒開始的一局'});\n    return balance+1;",
     "    log(c,{id:'refund_'+receipt,kind:'refund',amount:back,at:now,note:'取消沒開始的一局'});\n    return balance+back;"),
    ("        const amount=integer(e.amount,-1,10000);\n"
     "        assert(e.kind!=='spend'||amount===-1,'每一局只收 1 枚金幣，這筆紀錄不對。');\n"
     "        assert(e.kind!=='refund'||amount===1,'退回的金幣只可以是 1 個，這筆紀錄不對。');",
     "        const amount=integer(e.amount,-MAX_COST,10000);\n"
     "        assert(e.kind!=='spend'||(amount<=-1&&amount>=-MAX_COST),'每一局只收 1 至 4 枚金幣，這筆紀錄不對。');\n"
     "        assert(e.kind!=='refund'||(amount>=1&&amount<=MAX_COST),'退回的金幣是 1 至 4 個，這筆紀錄不對。');"),
    ("return Object.freeze({VERSION,MAX_BALANCE,ids,catalog,", "return Object.freeze({VERSION,MAX_BALANCE,MAX_COST,ids,catalog,cost,"),
]

HOST = [
    ("!pay?'這一輪的 5 次玩完了。做練習，就能玩下一輪。'", "!pay?'這一輪的 5 局玩完了。做練習，就能玩下一輪。'"),
    ("<p>先看目標，再學一小段。<br>一枚金幣，換一局新遊戲。</p>", "<p>先看目標，再學一小段。<br>用金幣，換一局新遊戲。</p>"),
    ("<div><small>這輪投幣</small><strong>${c.batch.used}<span> / 5</span></strong></div>",
     "<div><small>這輪已玩</small><strong>${c.batch.used}<span> / 5 局</span></strong></div>"),
    ("a28Btn('取消未玩的一局 · 退回 1 枚金幣','refund'", "a28Btn('取消未玩的一局 · 退回 '+COIN28.cost(r.game)+' 枚金幣','refund'"),
    ("<strong>這一輪已完成五次投幣。</strong>", "<strong>這一輪的 5 局玩完了。</strong>"),
    ("${a28Btn(yes?`${a28Coin()} 投 1 枚金幣 · 看玩法`:", "${a28Btn(yes?`${a28Coin()} 投 ${COIN28.cost(g.id)} 枚金幣 · 看玩法`:"),
    ("完成一組不同的練習、小測或混合複習，得 1 枚金幣。每日首四組有金幣。完成第三組，再多得 1 枚。每日最多 5 枚。同一組一天只得一次。答錯不會扣金幣。故意答錯也不會多得。",
     "每次練習或測驗拿滿 5 顆星，得 1 枚金幣。每日首四組有金幣。完成第三組，再多得 1 枚。每日最多 5 枚。同一組一天只得一次。每款遊戲要的金幣不同，由 1 枚到 4 枚。答錯不會扣金幣。"),
    ("`${a28Coin()} 確認投 1 枚金幣，開始`,'buy',`data-id=\"${id}\" ${!adminUnlocks()&&(c.batch.used>=5||activeChild().stars<1)?'disabled':''}`",
     "`${a28Coin()} 確認投 ${COIN28.cost(id)} 枚金幣，開始`,'buy',`data-id=\"${id}\" ${!adminUnlocks()&&(c.batch.used>=5||activeChild().stars<COIN28.cost(id))?'disabled':''}`"),
    ("這輪已投 ${c.batch.used}/5 · 金幣只扣一次，再按「開始」才進入遊戲。", "這輪已玩 ${c.batch.used}/5 局 · 金幣只扣一次，再按「開始」才進入遊戲。"),
    ("'生命用完了。可以回到遊戲街機，或再投 1 枚金幣挑戰。'", "'生命用完了。可以回到遊戲街機，或再投幣挑戰。'"),
    ("'遊戲街機 · 已投 1 枚金幣'}</p><h1>${pgMeta.name}</h1>", "`遊戲街機 · 已投 ${COIN28.cost(pgMeta.id)} 枚金幣`}</p><h1>${pgMeta.name}</h1>"),
    ("(!pgFree&&a28Child().batch.used<5&&activeChild().stars>=1)?a28Btn('再投 1 枚金幣','buy'",
     "(!pgFree&&a28Child().batch.used<5&&activeChild().stars>=COIN28.cost(pgMeta.id))?a28Btn('再投 '+COIN28.cost(pgMeta.id)+' 枚金幣','buy'"),
    ("`這輪已投 ${a28Child().batch.used}/5 枚金幣，不會自動再投。`", "`這輪已玩 ${a28Child().batch.used}/5 局，不會自動再投幣。`"),
    ("confirm('要取消還沒開始的這一局，並退回 1 枚金幣嗎？')", "confirm('要取消還沒開始的這一局，並退回 '+COIN28.cost(r.game)+' 枚金幣嗎？')"),
    ("<p>每局 1 枚金幣，沒有倒數計時。每輪最多投幣五次。要再完成新的學習，才能開下一輪，或由你確認開放。</p>",
     "<p>每局要 1 至 4 枚金幣，按遊戲不同。每輪最多玩五局，沒有倒數計時。要再完成新的學習，才能開下一輪，或由你確認開放。</p>"),
    ("${a28Btn('家長開放下一輪五次投幣','parent-reset'", "${a28Btn('家長開放下一輪（五局）','parent-reset'"),
    ("<p>完整完成一組不同的練習、小測或混合複習，得 1 枚金幣。每日首四組有金幣。完成第三組，再多得 1 枚。每日最多 5 枚。同一組一天只計一次。只看字卡沒有金幣。一組要完成至少三個作答項目；教材不足三個，就按實際題數。因技術問題跳過的題目，不算完整作答。拼讀五題小測也計入同一個上限。</p><p>訂正不會多給金幣，免得孩子故意答錯。金幣只看有沒有完成，不看分數。「自己掌握」的判斷，仍用原來較嚴格的標準。單次拼字家族少於三個字，沒有金幣。完整的混合複習才有。</p>",
     "<p>每次練習或測驗，全部自己答對（拿滿 5 顆星），得 1 枚金幣。用了提示、答錯，都不夠 5 顆星。每日首四組有金幣。完成第三組，再多得 1 枚。每日最多 5 枚。同一組一天只計一次。只看字卡沒有金幣。因技術問題跳過的題目，不算完整作答。</p><p>訂正不會多給金幣。每款遊戲要的金幣不同，由 1 枚到 4 枚。單次拼字家族少於三個字，沒有金幣。</p>"),
    ("可用 ${activeChild().stars} 金幣 · 本輪 ${c.batch.used}/5 · 今日", "可用 ${activeChild().stars} 金幣 · 本輪已玩 ${c.batch.used}/5 局 · 今日"),
    ("<p>26 款遊戲、全彩預覽、每局 1 枚金幣，和家長設定。</p>", "<p>26 款遊戲、全彩預覽、每局 1 至 4 枚金幣，和家長設定。</p>"),
    ("'每局 1 枚金幣，仍要先達到學習門檻。可以在遊戲設定提前開放，或重設下一輪。'", "'每局 1 至 4 枚金幣（按遊戲不同），仍要先達到學習門檻。可以在遊戲設定提前開放，或重設下一輪。'"),
    ("點遊戲看玩法，再按「${free?'免費開始測試':'確認投 1 枚金幣，開始'}」。", "點遊戲看玩法，再按「${free?'免費開始測試':'投金幣開始'}」。"),
    ("26 款非暴力遊戲 · 每局 1 枚金幣。沒解鎖的，也可以看預覽。", "26 款遊戲 · 每局 1 至 4 枚金幣。沒解鎖的，也可以看預覽。"),
    ("完成不同的學習任務，可以得到金幣。所有遊戲都可以先看預覽。每局 1 枚金幣，不會自動再扣。",
     "學習時全部答對，拿滿 5 顆星，就有金幣。所有遊戲都可以先看預覽。每局 1 至 4 枚金幣，不會自動再扣。"),
    ("msg=used>=5?'這輪的 5 枚金幣已用完。休息一下，或去學習。':'金幣用完了。完成一段學習，就有新金幣！';",
     "msg=used>=5?'這輪的 5 局已玩完。休息一下，或去學習。':'金幣不夠了。拿滿 5 顆星，就有新金幣！';"),
    # p30 lobby / intro layer
    ("const EARN='去賺金幣：做一個小練習';", "const EARN='去賺金幣：做一個小練習';"),
    ("const EARN_NOTE='做完 1 組練習得 1 枚金幣';", "const EARN_NOTE='拿滿 5 顆星，得 1 枚金幣';"),
    ("const canPay=()=>admin()||(coinsNow()>=1&&roundUsed()<5);",
     "const canPay=()=>admin()||(coinsNow()>=1&&roundUsed()<5);\n const canPayFor=id=>admin()||(coinsNow()>=COIN28.cost(id)&&roundUsed()<5);"),
    ("if(open)note='玩一次 1 枚金幣';", "if(open)note='玩一次 '+COIN28.cost(id)+' 枚金幣';"),
    ("<span class=\"p30-badge${open?'':' shut'}\">${badge}</span></div>`+",
     "<span class=\"p30-badge${open?'':' shut'}\">${badge}</span><span class=\"q36-cost${open?'':' dim'}\" aria-label=\"玩一次要 ${COIN28.cost(id)} 枚金幣\"><i aria-hidden=\"true\">●</i>${COIN28.cost(id)} 枚</span></div>`+"),
    ("free=admin(),pay=logged&&yes&&canPay();", "free=admin(),cost=COIN28.cost(id),pay=logged&&yes&&canPayFor(id);"),
    ("if(yes)prog.textContent=pay?`已解鎖。玩一次要 1 枚金幣，你現在有 ${stars} 枚。`:stars<1?`已解鎖。玩一次要 1 枚金幣，你現在有 ${stars} 枚。`:'已解鎖。這一輪的 5 次玩完了。';",
     "if(yes)prog.textContent=pay?'這款已開放。':stars<cost?`這款要 ${cost} 枚金幣，你現在有 ${stars} 枚。`:'這一輪的 5 局玩完了。';"),
    ("`${a28Coin()} 用 1 枚金幣開始`;", "`${a28Coin()} 用 ${cost} 枚金幣開始`;"),
    ("txt('p','p30-before','按下去才會扣 1 枚金幣')", "txt('p','p30-before',`按下去才會扣 ${cost} 枚金幣`)"),
    ("`你有 ${stars} 枚金幣・這一輪已玩 ${used}/5 次`", "`你有 ${stars} 枚金幣・這一輪已玩 ${used}/5 局`"),
    ("`這一輪已玩 ${used}/5 次。不會自動再扣金幣。`:`已投 1 枚金幣・這一輪 ${used}/5`;",
     "`這一輪已玩 ${used}/5 局。不會自動再扣金幣。`:`已投 ${COIN28.cost(id)} 枚金幣・這一輪 ${used}/5 局`;"),
    ("earn.textContent=roundUsed()>=5?'這一輪的 5 枚金幣用完了。休息一下，或去做練習。':'金幣用完了。做完 1 組練習，就得 1 枚金幣。';",
     "earn.textContent=roundUsed()>=5?'這一輪的 5 局玩完了。休息一下，或去做練習。':'金幣不夠再玩這款了。拿滿 5 顆星，就得 1 枚金幣。';"),
    ("eb.textContent='遊戲街機・已投 1 枚金幣';", "eb.textContent='遊戲街機・已投 '+COIN28.cost(pgMeta.id)+' 枚金幣';"),
]


def apply(s, ctx):
    once = ctx.once
    for old, new in ECON + HOST:
        if old == new:
            continue
        s = once(s, old, new)
    css = (ctx.src / 'q40_games.css').read_text()
    s = once(s, '</head>', '<style id="wq36-q40-css">\n' + css + '</style>\n</head>')
    ctx.evidence['gameCosts'] = COSTS
    return s
