"""R3.5 p95 - cross-module consistency fixes found while integrating p10..p50 (runs after the wording pass p90, so anchors are the final wording).

Each entry is a text that stayed true only before another module changed behaviour.
"""

EDITS = [
    # p40 raised the parent-confirmation lease from 5 to 15 minutes (renewed on activity); the two notes must say so.
    ('<p class="small muted">確認只有效 5 分鐘。換了孩子，就要重新確認。',
     '<p class="small muted">確認後 15 分鐘內不用再輸入，有操作時會自動延長。換了孩子，就要重新確認。'),
    # The settings card said '20 款' while the arcade has 26 games; parents get the runtime rewrite below, everybody else saw the stale number.
    ('<section class="card pad" style="margin-top:18px"><h2>20 款非暴力小遊戲</h2><p>金幣、解鎖、每日上限，以及每款遊戲的開放設定。</p>',
     '<section class="card pad" style="margin-top:18px"><h2>遊戲街機</h2><p>金幣、解鎖、每日上限，以及每款遊戲的開放設定。</p>'),
    ("s.textContent.includes('20 款非暴力小遊戲')", "s.textContent.includes('每款遊戲的開放設定')"),
    # Rows the whole-literal pass cannot reach (text sits inside a longer literal or next to markup): same wording as the audit CSV.
    ('<span> / 5 幣</span>', '<span> / 5 枚金幣</span>'),
    ('<label>街機音效 <input', '<label>遊戲音效 <input'),
    ('還原成功後，未完成標記會一併清除並解除暫停寫入；若還原失敗，目前資料和標記會保留。',
     '還原成功後，未完成的標記會一起清除，儲存也會恢復正常。如果還原失敗，目前的資料和標記會保留。'),
    ('動感效果（震動、閃光、彩帶、手機震動）', '動感效果：畫面震動、閃光和彩帶'),
    ('關閉後不保留進度，也不派金幣。${root.WQM_INTEGRATED', '關閉後不保留進度，也不會給金幣。${root.WQM_INTEGRATED'),
    ('<p class="small" style="margin:0">家長確認只維持 5 分鐘。驗證後會回到這個視窗',
     '<p class="small" style="margin:0">家長確認可維持 15 分鐘。確認後會回到這個視窗'),
]


# One name for the five newer games everywhere (filter chip, default filter state, its comparison, labels, aria text). It is a
# lone identifier as well as a label, so it is renamed globally rather than by the per-literal pass (p90 skips it as 'partial').
RENAME_ALL = [('新街機', '新遊戲'), ('已保存，稍休一下', '已儲存，休息一下')]

# Simplified-character leftovers inside maths data that no module owns (S3-01): replace every occurrence, at least once.
SIMPLIFIED = [('比较', '比較')]


def apply(s, ctx):
    for old, new in EDITS:
        s = ctx.once(s, old, new)
    for old, new in RENAME_ALL:
        if old not in s:
            raise ValueError('expected rename target not found: ' + old)
        s = s.replace(old, new)
    for old, new in SIMPLIFIED:
        if old not in s:
            raise ValueError('expected simplified leftover not found: ' + old)
        s = s.replace(old, new)
    return s
