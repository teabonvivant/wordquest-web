"""R3.26 word bank builder: extends the built-in English word list with open dictionary data and picture emoji.

    python3 tools/build_wordbank.py --ecdict <stardict.db> --cldr <annotations.json> --emoji-test <emoji-test.txt>

Sources (all open): ECDICT (MIT, github.com/skywind3000/ECDICT) for headwords, glosses, word frequency and irregular forms;
Unicode CLDR English annotations + emoji-test.txt (Unicode licence) for picture emoji. Simplified Chinese glosses are converted
to Hong Kong Traditional with OpenCC (s2hk). Outputs, read by r37_src/patches/s54_wordbank.py:
    r37_src/wordbank_ext.json    [[key, "pos:zh|pos:zh"], ...]   headwords that are not in the curated list
    r37_src/wordbank_forms.json  {form: [base, code]}            irregular forms the rule engine (s55_morph.js) cannot derive
    r37_src/wordbank_pics.json   {word: emoji}                   concrete words with one unambiguous picture
Curated entries (r3_src/base/04.js) always win over generated ones.
"""
from pathlib import Path
import argparse, json, re, sqlite3
from opencc import OpenCC

R = Path(__file__).resolve().parents[1]
CC = OpenCC('s2hk')
POS = {'n': 'n', 'v': 'v', 'vt': 'v', 'vi': 'v', 'a': 'adj', 'adj': 'adj', 'ad': 'adv', 'adv': 'adv', 'prep': 'prep', 'conj': 'conj'}
BAD_ZH = re.compile(r'男子名|女子名|人名|地名|姓氏|缩写|縮寫|的缩写|abbr|[A-Za-z]{3,}')
FORM_ZH = re.compile(r'的(过去式|过去分词|复数|现在分词|比较级|最高级|第三人称单数|名词复数形式|复数形式)|^pl\.')


# a children's product: no profanity, slurs, sexual or drug slang
BLOCK_WORDS = set("""fuck fucking fucked fucker shit shitty bitch bastard cunt dick cock pussy slut whore asshole ass arse bugger bollocks piss crap damn
retard retarded nigger nigga faggot fag dyke porn porno rape rapist sex sexy sexual orgasm erotic nude naked penis vagina breast boob boobs condom
semen sperm anus anal masturbate prostitute brothel cocaine heroin marijuana cannabis meth opium kill murder suicide hanging terrorist""".split())
BLOCK_ZH = re.compile(r'粗俗|猥亵|色情|性交|妓|淫|手淫|强奸|吸毒|毒品|俚语|骂人|脏话|生殖器|阴茎|阴道')


# mainland -> Hong Kong wording (OpenCC s2hk converts characters, not vocabulary)
HK_TERMS = [('乳酪', '芝士'), ('酸奶', '乳酪'), ('土豆', '薯仔'), ('馬鈴薯', '薯仔'), ('西紅柿', '番茄'), ('番茄醬', '茄汁'), ('自行車', '單車'),
            ('公共汽車', '巴士'), ('出租車', '的士'), ('計程車', '的士'), ('冰箱', '雪櫃'), ('滑鼠', '滑鼠'), ('鼠標', '滑鼠'), ('軟盤', '軟碟'), ('硬盤', '硬碟'),
            ('網絡', '網絡'), ('菠蘿', '菠蘿'), ('獼猴桃', '奇異果'), ('奇異果', '奇異果'), ('洗衣機', '洗衣機'), ('塑料', '塑膠'), ('膠袋', '膠袋'),
            ('摩托車', '電單車'), ('卡車', '貨車'), ('拖拉機', '拖拉機'), ('地鐵', '地鐵'), ('襯衫', '恤衫'), ('褲衩', '內褲'), ('毛衣', '冷衫'), ('牛仔褲', '牛仔褲'),
            ('蘑菇', '蘑菇'), ('花椰菜', '椰菜花'), ('捲心菜', '椰菜'), ('卷心菜', '椰菜'), ('南瓜', '南瓜'), ('胡蘿蔔', '紅蘿蔔'), ('蕃茄', '番茄'),
            ('餅乾', '餅乾'), ('果醬', '果醬'), ('開水', '滾水'), ('幼兒園', '幼稚園'), ('小夥子', '小伙子'), ('鬧鐘', '鬧鐘'), ('電話亭', '電話亭'),
            ('快遞', '速遞'), ('郵遞員', '郵差'), ('筆記本', '筆記簿'), ('日記本', '日記簿'), ('橡皮', '擦膠'), ('圓珠筆', '原子筆'), ('文具', '文具')]


def hk(zh):
    for a, b in HK_TERMS:
        if a != b:
            zh = zh.replace(a, b)
    return zh


FORM_DENY = {'arcking', 'cloathing', 'shamen', 'graven'}      # rejected by the R3.26 accuracy audit (misspelling / archaic)


def curated():
    t = (R / 'r3_src/base/04.js').read_text(encoding='utf8').split('=', 1)[1].rstrip().rstrip(';')
    return json.loads(t)


def gloss(translation):
    """ECDICT translation -> [(pos, [meanings])] for the first two parts of speech, <=3 short meanings each."""
    out = {}
    for line in translation.split('\n'):
        m = re.match(r'^(vt\.,vi|vi\.,vt|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|pl|ad|n|v|a)\.[,.\s]*(?:[vit]{1,2}\.\s*)?(.*)$', line.strip())
        if not m:
            continue
        pos = POS.get(m.group(1).split('.')[0], 'mixed') if m.group(1) != 'pl' else 'n'
        body = re.sub(r'[（(][^）)]*[）)]', '', m.group(2))
        body = re.sub(r'\[[^\]]*\]', '', body)
        parts = [x.strip() for x in re.split(r'[,，;；、]', body)]
        keep = []
        for x in parts:
            x = x.strip(' ：:')
            if not x or len(x) > 9 or BAD_ZH.search(x) or x in keep:
                continue
            keep.append(x)
            if len(keep) == 3:
                break
        if keep and pos not in out:
            out[pos] = keep
    return [(p, [hk(CC.convert(x)) for x in v]) for p, v in list(out.items())[:2]]


def regular_forms(b):
    c = {b + 's', b + 'es', b + 'ed', b + 'd', b + 'ing', b + 'er', b + 'r', b + 'est', b + 'st', b + b[-1] + 'ed', b + b[-1] + 'ing',
         b + b[-1] + 'er', b + b[-1] + 'est', b + b[-1] + 's'}
    if b.endswith('y'):
        c |= {b[:-1] + 'ies', b[:-1] + 'ied', b[:-1] + 'ier', b[:-1] + 'iest', b[:-1] + 'ily'}
    if b.endswith('e'):
        c |= {b[:-1] + 'ing'}
    if b.endswith(('f', 'fe')):
        c |= {b.rstrip('e')[:-1] + 'ves'}
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ecdict', required=True)
    ap.add_argument('--cldr', required=True)
    ap.add_argument('--emoji-test', required=True)
    ap.add_argument('--rank', type=int, default=16000)
    a = ap.parse_args()
    cur = curated()
    curkeys = {e['key'] for e in cur}
    db = sqlite3.connect(a.ecdict)
    rows = [r for r in db.execute("select word,translation,exchange,frq,bnc,collins,oxford,tag from stardict "
                                  "where translation!='' and word glob '[a-z]*'") if re.fullmatch(r'[a-z]{2,}', r[0])]

    def lemma(r):
        return not (r[2] and re.search(r'(^|/)0:', r[2]))

    def wanted(r):
        f, b = r[3] or 0, r[4] or 0
        return lemma(r) and ((0 < f <= a.rank) or r[6] == 1 or (r[5] or 0) >= 2
                             or any(t in (r[7] or '') for t in ('zk', 'gk', 'cet4', 'ielts', 'cet6')))

    ext = []
    for r in rows:
        if r[0] in curkeys or r[0] in BLOCK_WORDS or BLOCK_ZH.search(r[1]) or not wanted(r) or re.search(r'男子名|女子名|人名|地名|姓氏', r[1]) or re.match(r'^\s*(abbr|\[网络\])', r[1]):
            continue
        g = gloss(r[1])
        if g:
            ext.append([r[0], '|'.join(p + ':' + '；'.join(v) for p, v in g)])
    ext.sort()
    # R3.26: every generated gloss was re-read by a reviewer (common sense first, Hong Kong wording, proper nouns dropped);
    # wordbank_gloss_fix.json = {word: gloss} or {word: ""} for a dropped word
    fixf = R / 'r37_src/wordbank_gloss_fix.json'
    if fixf.exists():
        fix = json.loads(fixf.read_text(encoding='utf8'))
        man = json.loads((R / 'r37_src/wordbank_gloss_manual.json').read_text(encoding='utf8'))     # audit corrections, win over the shards
        fix.update(man)
        ext = [[k, fix.get(k, g)] for k, g in ext if fix.get(k, g)]
    (R / 'r37_src/wordbank_ext.json').write_text(json.dumps(ext, ensure_ascii=False, separators=(',', ':')))

    heads = curkeys | {k for k, _ in ext}
    by_word = {r[0]: r for r in rows}
    forms = {}
    code = {'p': 'past', 'd': 'pp', 'i': 'ing', '3': 'third', 's': 'plural', 'r': 'comp', 't': 'sup'}
    for b in sorted(h for h in heads if ' ' not in h):
        r = by_word.get(b)
        if not r or not r[2]:
            continue
        for part in r[2].split('/'):
            if ':' not in part:
                continue
            t, f = part.split(':', 1)
            if t not in code or f == b or f in heads or f in FORM_DENY or not re.fullmatch(r'[a-z]{2,}', f) or f in regular_forms(b):
                continue
            fr = by_word.get(f)
            if not fr or not (FORM_ZH.search(fr[1]) or (fr[2] and re.search(r'(^|/)0:' + re.escape(b) + r'(/|$)', fr[2]) and (fr[3] or fr[4]))):
                continue
            if not re.search(r'(^|/)0:' + re.escape(b) + r'(/|$)', fr[2] or ''):
                continue
            forms.setdefault(f, [b, code[t]])
    (R / 'r37_src/wordbank_forms.json').write_text(json.dumps(forms, ensure_ascii=False, sort_keys=True, separators=(',', ':')))

    pics = build_pics(a, heads)
    (R / 'r37_src/wordbank_pics.json').write_text(json.dumps(pics, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
    print('extra headwords', len(ext), '| irregular forms', len(forms), '| picture words', len(pics))


GROUPS = ('Animals & Nature', 'Food & Drink', 'Travel & Places', 'Objects', 'Activities')
SKIP_SUB = re.compile(r'flag|clock|face|person|people|hand|body-part|family|emotion|skin|zodiac|geometric|keycap|alphanum|sky & weather|moon|place-religious|event')
# keyword (not name) matches checked by hand: a wrong picture is a wrong anchor, so no other keyword is trusted
KEYWORD_OK = set("""aubergine automobile hamburger lorry ladybird puppy rooster hippopotamus rhinoceros tortoise maize doughnut headphone sunflower
chopsticks glasses gloves socks scarf necktie handbag postbox loudspeaker minibus tangerine grapes peanut""".split())
DENY = set("""ball bar bottle bowl cream mug nose leg pot tea green food fruit drink mate wedge pepper foggy construction arrival departure link rock
wood ice engine beverage bomb cigarette syringe sake sign stop seat memo cracker rail bank metro placard hook scroll seal coin
saucer ledger lacrosse bookmark bug cricket tortoise custard purse pump""".split())
MAX_EMOJI_VERSION = 13.1       # newer emoji show as an empty box on older phones


def build_pics(a, heads):
    ann = json.loads(Path(a.cldr).read_text(encoding='utf8'))['annotations']['annotations']
    group = sub = None
    emo = {}
    for line in Path(a.emoji_test).read_text(encoding='utf8').splitlines():
        if line.startswith('# group:'):
            group = line.split(':', 1)[1].strip()
        elif line.startswith('# subgroup:'):
            sub = line.split(':', 1)[1].strip()
        elif line and not line.startswith('#') and 'fully-qualified' in line.split(';')[1].split('#')[0] and group in GROUPS and not SKIP_SUB.search(sub or ''):
            toks = line.split('#')[1].split()
            ch, ver = toks[0], float(toks[1][1:])
            if ch in ann and ver <= MAX_EMOJI_VERSION:
                emo[ch] = (group, sub)
    cand = {}

    def add(w, ch, tier):
        cand.setdefault(w, []).append((tier, ch))

    for ch, (g, sg) in emo.items():
        info = ann[ch]
        tts = (info.get('tts') or [''])[0].lower()
        if re.fullmatch(r'[a-z]+', tts):
            add(tts, ch, 1)
        elif re.fullmatch(r'[a-z]+ [a-z]+', tts) and re.match(r'animal|plant|food|drink|transport', sg or ''):
            add(tts.split()[1], ch, 2)
        for k in info.get('default', []):
            k = k.lower()
            if k in KEYWORD_OK and k != tts:
                add(k, ch, 3)
    pics = {}
    for w, lst in cand.items():
        if w not in heads or len(w) < 3 or w in DENY:
            continue
        best = min(t for t, _ in lst)
        top = {c for t, c in lst if t == best}
        if len(top) == 1 and (best != 2 or not any(t == 1 for t, _ in lst)):
            pics[w] = next(iter(top))
    return pics


if __name__ == '__main__':
    main()
