#!/usr/bin/env python3
"""Build the 50 real dictation sets -> sets/NN_slug.json.

Everything below is transcribed from public documents that were fetched on 2026-10-10 (URLs in each set).  Nothing is invented:
each `raw_text` is the text as extracted from the source (PDF text layer / Project Gutenberg text), with only layout glue removed
(page numbers, illustration markers, blank cells).  `photo_text` is the same content in the printed layout (columns / table rows)
when that differs from the copy-paste order.

targets rule (fixed, reproducible)
  * list items    : every item on the list, exactly as the teacher would read it (phrases whole).
  * sentence/text : every token  [A-Za-z]+(?:['’-][A-Za-z]+)*  with >=3 letters, not in V20.COMMON (the app's own basic-word list,
                    read from the frozen build), not a person / place name (set.proper_nouns), de-duplicated (case-insensitive).
  * verb tables   : every cell of the table (base, 3rd person, -ing, past ...).
  * instructions / headings / marks / numbering are never targets.

    WQ33_APP=/path/eval_app.html python3 r37_eval/dictation50/build_sets.py
"""
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'sets'
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(HERE.parents[1] / 'r37_tests'))

PY = 'https://www.poyan.edu.hk/CustomPage/'
LTY = 'https://www.ltyschool.edu.hk/dev_module/upload_files/document/'
TKS = 'https://www.tks.edu.hk/'
WYN = 'https://www.wynps.edu.hk/it-school/php/webcms/files/upload/tinymce//english/202324_english_p5_1st_term_dictation_revision_booklets_final_1696555278.pdf'
VB = 'https://www.tkokt.edu.hk/CustomPage/85/VocabularyBank/'
SCHOOL_LIC = ('Public school web document (c) the school; used only as a read-only evaluation fixture, short excerpt, not for '
              'redistribution.')
GUT_LIC = 'Project Gutenberg, public domain (US).'
OGL = 'DfE National Curriculum English Appendix 1 (c) Crown copyright 2013, Open Government Licence v3.0; school-hosted copy.'
DOLCH = 'Dolch sight-word list (E. W. Dolch, 1936/1948); word list as published by mrsperkins.com (facts, no creative text).'

SETS = []


def add(slug, type_, level, title, url, licence, raw, targets=None, photo=None, zh=None, proper=None, rule_text=None,
        list_items=None, notes='', header=None):
    SETS.append(dict(slug=slug, type=type_, level=level, title=title, source_url=url, licence=licence, raw_text=raw.strip('\n'),
                     photo_text=(photo.strip('\n') if photo else None), targets=targets, list_items=list_items or [],
                     rule_text=rule_text or '', zh=zh or {}, proper_nouns=proper or [], notes=notes, header=header))


def pairs(txt):
    """'english zh' per line -> (list of english, {english: zh})"""
    en, z = [], {}
    for ln in txt.strip().split('\n'):
        m = re.match(r'^(.*?)\s+([一-鿿].*)$', ln.strip())
        if m:
            en.append(m.group(1).strip())
            z[m.group(1).strip()] = m.group(2).strip()
    return en, z


# ============================================================ LISTS (25)
# ---- L01 Po Yan P1
add('poyan_p1_vocab', 'list', 'P1', 'Po Yan Oblate PS, P.1 dictation syllabus 2021-22 (2nd sem) - B. Vocabulary',
    PY + '125/%E4%B8%8BP.1_Dictation_Exam.pdf', SCHOOL_LIC,
    "B. Vocabulary 20%\n\neat\ndrink\nlaugh\ndraw\nsing\n\na skirt\ntrousers\na dress\na cap\nsocks",
    list_items=['eat', 'drink', 'laugh', 'draw', 'sing', 'a skirt', 'trousers', 'a dress', 'a cap', 'socks'])
# ---- L02/L03 LTY P1
add('lty_p1_d1_vocab_hfw', 'list', 'P1', 'Lau Tak Yung PS, P.1 English Dictation (1) 2023-24 - Vocabulary + High Frequency Words',
    LTY + '23-24_2nd_Term_P.1_Dict_HB.pdf', SCHOOL_LIC,
    "B. Vocabulary (10%@2%)\n1. a bear\n2. a lion\n3. a panda\n4. a rabbit\n5. a tiger\nC. High Frequency Words (10%@2%)\n1. that\n2. yes\n3. no\n4. eight\n5. four",
    list_items=['a bear', 'a lion', 'a panda', 'a rabbit', 'a tiger', 'that', 'yes', 'no', 'eight', 'four'])
add('lty_p1_d5_vocab_hfw', 'list', 'P1', 'Lau Tak Yung PS, P.1 English Dictation (5) 2023-24 - Vocabulary + High Frequency Words',
    LTY + '23-24_2nd_Term_P.1_Dict_HB.pdf', SCHOOL_LIC,
    "B. Vocabulary (10%@2%)\n1. a cap\n2. a shirt\n3. socks\n4. shoes\n5. colour\nC. High Frequency Words (10%@2%)\n1. when\n2. little\n3. jump\n4. very\n5. not",
    list_items=['a cap', 'a shirt', 'socks', 'shoes', 'colour', 'when', 'little', 'jump', 'very', 'not'])
# ---- L04/L05 Dolch
DPRE = 'a and away big blue can come down find for funny go help here I in is it jump little look make me my not one play red run said see the three to two up we where yellow you'.split()
DPRI = 'all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes'.split()
D2 = "always around because been before best both buy call cold does don't fast first five found gave goes green its made many off or pull read right sing sit sleep tell their these those upon us use very wash which why wish work would write your".split()


def grid(words, cols):
    return '\n'.join('   '.join(words[i:i + cols]) for i in range(0, len(words), cols))


add('dolch_preprimer', 'list', 'P1', 'Dolch Pre-Primer sight words (40)', 'https://www.mrsperkins.com/files/dolchpre.pdf', DOLCH,
    'Dolch Pre-Primer Sight Vocabulary\n' + grid(DPRE, 5), list_items=DPRE,
    notes='Source PDF is a word grid; reconstructed as a 5-column grid. All 40 words are targets, including a/I/in/is/it/me/my/the.')
add('dolch_primer', 'list', 'P2', 'Dolch Primer sight words (52)', 'https://www.mrsperkins.com/files/dolchpri.pdf', DOLCH,
    'Dolch Primer Sight Vocabulary\n' + grid(DPRI, 6), list_items=DPRI,
    notes='5-6 column grid reconstruction; includes 2-letter words (am, at, be, do, he, no, on, so) and basic words.')
# ---- L06..L10 TKOKT vocabulary banks (English + Chinese, "1.towel 毛巾")


def tkokt(slug, level, pdf, theme, rows, extra=''):
    en = [r[0] for r in rows]
    z = {r[0]: r[1] for r in rows}
    raw = 'Theme: %s\n' % theme + '\n'.join('%d.%s %s' % (i + 1, r[0], r[1]) for i, r in enumerate(rows))
    add(slug, 'list', level, 'tkokt.edu.hk (school name not verified) %s vocabulary bank - %s' % (level, theme), VB + pdf, SCHOOL_LIC, raw,
        list_items=en, zh=z, notes='English + Chinese per row, numbering glued to the word ("1.towel") as printed. ' + extra)


tkokt('tkokt_p2_jobs', 'P2', 'P2%20Vocabulary%20Bank(new).pdf', 'Jobs',
      [('dancer', '舞蹈演員'), ('actor', '男演員'), ('waiter', '男侍應'), ('cook', '廚師'), ('designer', '設計師'), ('lawyer', '律師'),
       ('librarian', '圖書管理員'), ('model', '模特兒'), ('pilot', '飛行員'), ('singer', '歌手')])
tkokt('tkokt_p2_seasons', 'P2', 'P2%20Vocabulary%20Bank(new).pdf', 'Activities in different seasons',
      [('barbecue', '燒烤'), ('camping', '宿營'), ('cycling', '踏單車'), ('fishing', '釣魚'), ('hiking', '遠足'), ('hotpot', '火鍋'),
       ('ice-skating', '溜冰'), ('kites', '風箏'), ('plant', '種植'), ('windsurfing', '風帆')])
tkokt('tkokt_p3_beach', 'P3', 'P3%20Vocabulary%20Bank(new).pdf', 'At the beach',
      [('towel', '毛巾'), ('sandcastle', '沙堡壘'), ('goggles', '護目鏡'), ('bucket', '水桶'), ('spade', '鏟子'), ('lifeguard', '救生員'),
       ('surf', '滑浪'), ('swimming suit', '泳衣'), ('swimming trunks', '泳褲'), ('sunbathe', '曬日光浴')])
tkokt('tkokt_p3_community', 'P3', 'P3%20Vocabulary%20Bank(new).pdf', 'Different places in the community',
      [('airport', '機場'), ('bank', '銀行'), ('church', '教堂'), ('cinema', '電影院'), ('stadium', '體育館'), ('fire station', '消防局'),
       ('hospital', '醫院'), ('shopping mall', '購物商場'), ('supermarket', '超市'), ('museum', '博物館')])
# the printed cell really breaks "hide-and-" / "seek" across two lines in the source
_cs = [('enjoy', '享受'), ('bicycle', '腳踏車，自行車'), ('binoculars', '雙筒望遠鏡'), ('woods', '樹木'), ('fishing', '捕魚'),
       ('hide-and-seek', '捉迷藏'), ('hike', '遠足'), ('bench', '長櫈'), ('mountain', '山'), ('picnic', '野餐')]
tkokt('tkokt_p3_countryside', 'P3', 'P3%20Vocabulary%20Bank(new).pdf', 'In the countryside', _cs)
SETS[-1]['raw_text'] = SETS[-1]['raw_text'].replace('6.hide-and-seek 捉迷藏', '6.hide-and- seek 捉迷藏')
SETS[-1]['notes'] += ' Item 6 is "hide-and- seek" (space after the hyphen) in the source text layer.'
# ---- L11 LTY P3 vocabulary
add('lty_p3_d1_vocab', 'list', 'P3', 'Lau Tak Yung PS, P.3 English Dictation (1) 2019-20 - A. Vocabulary (school subjects)',
    LTY + '19-20_2nd_term_P3_Dict_Handbook.pdf', SCHOOL_LIC,
    "A. Vocabulary (20%)\n1. Chinese\n2. Computer Studies\n3. English\n4. General Studies\n5. Music",
    list_items=['Chinese', 'Computer Studies', 'English', 'General Studies', 'Music'])
# ---- L12 TKS P3 vocabulary quiz (two columns)
add('tks_p3_vocab_quiz', 'list', 'P3', 'Tung Koon School, P.3 3rd term 2024-25 - Vocabulary Quiz 3B Unit 3',
    TKS + 'sites/default/files/sites/default/files/24253rd/Dictation%20Booklet_English_P3_third%20term.pdf', SCHOOL_LIC,
    "Vocabulary Quiz: 3B Unit 3 (p.22-23)  Date: _________________________ (       )\nPlease study the following vocabulary items:\n1.\nbeautiful\n5.\nsafe\n2.\nugly\n6.\ndangerous\n3.\nbrave\n7.\nyoung\n4.\nevil\n8.\nold",
    photo="Vocabulary Quiz: 3B Unit 3 (p.22-23)  Date: _________________________ (       )\nPlease study the following vocabulary items:\n1. beautiful          5. safe\n2. ugly                    6. dangerous\n3. brave                  7. young\n4. evil                    8. old",
    list_items=['beautiful', 'ugly', 'brave', 'evil', 'safe', 'dangerous', 'young', 'old'],
    notes='Paste order is the PDF text-layer order (number and word on separate lines, columns interleaved).')
# ---- L13/L14 TKS P4 target vocabulary
add('tks_p4_u1_target', 'list', 'P4', 'Tung Koon School, P.4 1st term 2025-26 - Dictation 1 Unit 1 - B. Target Vocabulary',
    TKS + 'sites/default/files/sites/default/files/25261st/P4dict.pdf', SCHOOL_LIC,
    "B.\nTarget Vocabulary (15% @3%)\n1. do a jigsaw puzzle\n2. do karate\n3. go cycling\n4. go jogging\n5. go roller skating\n6. go skateboarding\n7. play Frisbee\n8. play the ukulele\n9. watch a concert\n10. watch a magic show",
    list_items=['do a jigsaw puzzle', 'do karate', 'go cycling', 'go jogging', 'go roller skating', 'go skateboarding', 'play Frisbee',
                'play the ukulele', 'watch a concert', 'watch a magic show'])
add('tks_p4_u2_target', 'list', 'P4', 'Tung Koon School, P.4 1st term 2025-26 - Dictation 2 Unit 2 - B. Target Vocabulary',
    TKS + 'sites/default/files/sites/default/files/25261st/P4dict.pdf', SCHOOL_LIC,
    "B.\nTarget Vocabulary (15% @3%)\n1. talk to\n2. listen to\n3. look after\n4. play with\n5. say sorry to\n6. shout at\n7. argue with\n8. fight with\n9. laugh at\n10. make fun of",
    list_items=['talk to', 'listen to', 'look after', 'play with', 'say sorry to', 'shout at', 'argue with', 'fight with', 'laugh at',
                'make fun of'])
# ---- L15/L16 TKOKT P4 (table of English + Chinese)
_hk = """Dim Sum 點心
sashimi 刺身,生魚片
pizza 比薩
steamed ribs 蒸排骨
sushi 壽司
cheese cakes 芝士蛋糕
fried spring rolls 炸春卷
tempura 天婦羅
raw beef noodles 生牛肉河
roast pork 燒腩仔
beef noodles 熟牛肉河
shrimp dumplings 蝦餃
Portuguese tarts 葡撻
barbecue pork buns 叉燒包
wonton 雲吞
Peking duck 北京填鴨"""
en, z = pairs(_hk)
add('tkokt_p4_hkfood', 'list', 'P4', 'tkokt.edu.hk (school name not verified) P4 vocabulary bank - Hong Kong Food (Noun / meaning table)', VB + 'P4%20Vocabulary%20Bank(new1).pdf',
    SCHOOL_LIC, 'Hong Kong Food\nNoun  meaning\n' + _hk, list_items=en, zh=z,
    proper=['Portuguese', 'Peking'], notes='Table of English / Chinese pairs; heading and column labels are on the sheet. Proper names (Portuguese, Peking) are part of the list.')
_sc = """Wan Chai 灣仔
e.g. Golden Bauhinia Square 金紫荊廣場
take photos 拍照
Lantau Island 大嶼山
Ngong Ping Village 昂坪市集
watch the flag raising ceremony 觀看升旗儀式
Hong Kong Disneyland 香港迪士尼樂園
buy Chinese arts and crafts 購買中國的手工藝
watch shows 看表演
take photos with cartoon characters 與卡通人物拍照
watch parades 觀看巡遊
buy souvenirs 購買紀念品"""
en, z = pairs(_sc)
en = [('Golden Bauhinia Square' if e.startswith('e.g. ') else e) for e in en]
z = {('Golden Bauhinia Square' if k.startswith('e.g. ') else k): v for k, v in z.items()}
add('tkokt_p4_scenic', 'list', 'P4', 'tkokt.edu.hk (school name not verified) P4 vocabulary bank - Scenic spots (places + activities)', VB + 'P4%20Vocabulary%20Bank(new1).pdf',
    SCHOOL_LIC, 'Scenic spots\nLocation   Places   Activities\n' + _sc, list_items=en, zh=z,
    proper=['Wan', 'Chai', 'Lantau', 'Ngong', 'Ping', 'Hong', 'Kong', 'Disneyland', 'Bauhinia', 'Golden'],
    notes='Place names (Wan Chai, Lantau Island...) are targets because they are items on the list. "e.g." is a label on the sheet, not part of the word.')
# ---- L17/L18 WYNPS P5 vocabulary (two columns 1-5 | 6-10)
add('wynps_p5_d1_adverbs', 'list', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Fun Dictation (1) A. Vocabulary (adverbs)', WYN, SCHOOL_LIC,
    "A. Vocabulary (40%@4%)\n1. softly\n6. loudly\n2. patiently\n7. impatiently\n3. politely\n8. early\n4. rudely\n9. late\n5. quietly\n10. noisily",
    photo="A. Vocabulary (40%@4%)\n1. softly                      6. loudly\n2. patiently                7. impatiently\n3. politely                  8. early\n4. rudely                    9. late\n5. quietly                  10. noisily",
    list_items=['softly', 'patiently', 'politely', 'rudely', 'quietly', 'loudly', 'impatiently', 'early', 'late', 'noisily'])
add('wynps_p5_d4_clothing', 'list', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Dictation (4) A. Vocabulary (clothes, hair)', WYN, SCHOOL_LIC,
    "A. Vocabulary (40%@4%)\n1. a vest\n6. sunglasses\n2. a suit\n7. curly hair\n3. sandals\n8. straight hair\n4. gloves\n9. a round face\n5. mittens\n10. a long face",
    photo="A. Vocabulary (40%@4%)\n1. a vest                    6. sunglasses\n2. a suit                    7. curly hair\n3. sandals                  8. straight hair\n4. gloves                   9. a round face\n5. mittens                 10. a long face",
    list_items=['a vest', 'a suit', 'sandals', 'gloves', 'mittens', 'sunglasses', 'curly hair', 'straight hair', 'a round face', 'a long face'])
# ---- L19/L20 TKS P5
add('tks_p5_t1_u2_places', 'list', 'P5', 'Tung Koon School, P.5 1st term 2025-26 - Dictation 2 Unit 2 - Target Vocabulary (Hong Kong places)',
    TKS + 'sites/default/files/sites/default/files/25261st/P5dict.pdf', SCHOOL_LIC,
    "B.\nTarget Vocabulary (15% @3%)\n1.\nAvenue of Stars\n6.\nOcean Park\n2.\nGolden Bauhinia Square\n7.\nStanley Market\n3.\nHong Kong Disneyland\n8.\nTai O\n4.\nHong Kong Wetland Park\n9.\nThe Hong Kong Observation Wheel\n5.\nNgong Ping Village\n10. The Peak",
    photo="B.\nTarget Vocabulary (15% @3%)\n1. Avenue of Stars                         6. Ocean Park\n2. Golden Bauhinia Square          7. Stanley Market\n3. Hong Kong Disneyland           8. Tai O\n4. Hong Kong Wetland Park        9. The Hong Kong Observation Wheel\n5. Ngong Ping Village                10. The Peak",
    list_items=['Avenue of Stars', 'Golden Bauhinia Square', 'Hong Kong Disneyland', 'Hong Kong Wetland Park', 'Ngong Ping Village',
                'Ocean Park', 'Stanley Market', 'Tai O', 'The Hong Kong Observation Wheel', 'The Peak'],
    proper=['Bauhinia', 'Disneyland', 'Ngong', 'Ping', 'Tai', 'Stanley', 'Hong', 'Kong', 'Avenue', 'Wetland'],
    notes='Capitalised place names; they are on the dictation list, so they are targets.')
add('tks_p5_t2_u6_chores', 'list', 'P5', 'Tung Koon School, P.5 2nd term 2025-26 - Dictation 2 Unit 6 - Target Vocabulary (chores)',
    TKS + 'pdf/Edict/25262nd/Dictation%20Booklet_%20English_P5_second%20term.pdf', SCHOOL_LIC,
    "B.\nTarget Vocabulary (15% @3%)\n1.\ncook a meal\n6.\nput the toys away\n2.\ndo the grocery shopping\n7.\ntake the rubbish out\n3.\nhang the washing\n8.\ntidy up the bedroom\n4.\niron the clothes\n9.\nvacuum the rug\n5.\norder a takeaway\n10. walk the dog",
    photo="B.\nTarget Vocabulary (15% @3%)\n1. cook a meal                           6. put the toys away\n2. do the grocery shopping          7. take the rubbish out\n3. hang the washing                    8. tidy up the bedroom\n4. iron the clothes                       9. vacuum the rug\n5. order a takeaway                    10. walk the dog",
    list_items=['cook a meal', 'do the grocery shopping', 'hang the washing', 'iron the clothes', 'order a takeaway', 'put the toys away',
                'take the rubbish out', 'tidy up the bedroom', 'vacuum the rug', 'walk the dog'])
# ---- L21 TKOKT P5 weather (4-column table, tab separated when copied)
_wt = [('gloomy', '陰沉的', 'stay indoor', '待在家中'), ('chilly', '寒冷的', 'wear enough clothes', '穿足夠的衣物'),
       ('sultry', '悶熱的', 'wear sunscreen and sunglasses', '塗防曬霜和戴太陽眼鏡'), ('blustery', '狂風怒吼的', 'watch the latest news', '留意最新消息'),
       ('frosty', '嚴寒的', 'turn on the heater', '開暖氣機'), ('foggy', '有雾的', 'close all the windows', '關上所有窗')]
_wg = [('cloudless', '晴朗無雲的', 'fly a kite', '放風筝'), ('breezy', '有微風的', 'have a picnic', '去野餐'),
       ('fine', '晴朗的', 'take a rest under a tree', '在樹下休息'), ('warm', '溫暖的', 'go hiking', '遠足'),
       ('fair', '天晴的', 'go skating', '溜冰'), ('sunny', '陽光明媚的', 'collect shells', '收集貝殼')]
rows = []
for a, b in zip(_wt, _wg):
    rows.append('\t'.join([a[0] + ' ' + a[1], a[2] + ' ' + a[3], b[0] + ' ' + b[1], b[2] + ' ' + b[3]]))
zz = {}
ens = []
for t in _wt + _wg:
    for e, c in ((t[0], t[1]), (t[2], t[3])):
        ens.append(e)
        zz[e] = c
add('tkokt_p5_weather', 'list', 'P5', 'tkokt.edu.hk (school name not verified) P5 vocabulary bank - Under bad / good weather (4-column table)', VB + 'P5%20Vocabulary%20Bank(new).pdf',
    SCHOOL_LIC, 'Under Bad Weather        Under Good Weather\n' + '\n'.join(rows), list_items=ens, zh=zz,
    photo='Under Bad Weather          Under Good Weather\n' + '\n'.join('   '.join(r.split('\t')) for r in rows),
    notes='Four cells per row (adjective, verb phrase, adjective, verb phrase); paste has tab-separated cells like a copied table.')
# ---- L22/L23 TKOKT P6
_ap = """cheek 面頰
rosy 泛紅的
arms 手臂
Muscular 肌肉的
lips 唇
petite 細小的
legs 腿
Slender 苗條的
eyebrows 眉毛
hairy 濃密的
shoulders 肩膊
Broad 寬闊的
hair 頭髮
blonde 金黃色的
back 背部
Lean 瘦的
nose 鼻
sharp 尖的
waist 腰
Tapered 窄的
hip 臀部
Prominent 凸出的"""
en, z = pairs(_ap)
add('tkokt_p6_appearance', 'list', 'P6', 'tkokt.edu.hk (school name not verified) P6 vocabulary bank - Appearance (body parts + description)', VB + 'P6%20Vocabulary%20Bank(new).pdf',
    SCHOOL_LIC, 'Appearance\nFeatures  Description  Body parts  Description\n' + _ap, list_items=en, zh=z,
    notes='Source prints some adjectives with a capital letter (Muscular, Slender...).')
_cl = """vest 背心
cotton 棉
down jacket 羽絨
duck/goose feathers 鴨/鵝毛
swimsuit 泳衣
Lycra 萊卡物料
fur coat 皮草
fur 毛皮
short-sleeved shirt 短袖恤衫
silk 絲
knitted scarf 針織頸巾 wool 羊毛
flip-flops 人字拖
plastic 塑膠
windbreaker 風衣
nylon 尼龍
culottes 裙褲
denim 牛仔布
hoodie 衛衣
polyester 聚酯纖維
rattan hat 草帽
vine 藤
leather jacket 皮褸
leather 皮革"""
en = ['vest', 'cotton', 'down jacket', 'duck/goose feathers', 'swimsuit', 'Lycra', 'fur coat', 'fur', 'short-sleeved shirt', 'silk',
      'knitted scarf', 'wool', 'flip-flops', 'plastic', 'windbreaker', 'nylon', 'culottes', 'denim', 'hoodie', 'polyester', 'rattan hat',
      'vine', 'leather jacket', 'leather']
z = {'vest': '背心', 'cotton': '棉', 'down jacket': '羽絨', 'duck/goose feathers': '鴨/鵝毛', 'swimsuit': '泳衣', 'Lycra': '萊卡物料',
     'fur coat': '皮草', 'fur': '毛皮', 'short-sleeved shirt': '短袖恤衫', 'silk': '絲', 'knitted scarf': '針織頸巾', 'wool': '羊毛',
     'flip-flops': '人字拖', 'plastic': '塑膠', 'windbreaker': '風衣', 'nylon': '尼龍', 'culottes': '裙褲', 'denim': '牛仔布',
     'hoodie': '衛衣', 'polyester': '聚酯纖維', 'rattan hat': '草帽', 'vine': '藤', 'leather jacket': '皮褸', 'leather': '皮革'}
add('tkokt_p6_clothing', 'list', 'P6', 'tkokt.edu.hk (school name not verified) P6 vocabulary bank - Clothes and materials', VB + 'P6%20Vocabulary%20Bank(new).pdf',
    SCHOOL_LIC, 'Clothing\nClothes                Materials/Fabrics\n' + _cl, list_items=en, zh=z,
    notes='One source line really holds two pairs ("knitted scarf 針織頸巾 wool 羊毛"); targets keep them as two items.')
# ---- L24/L25 UK National Curriculum statutory word lists
nc = json.load(open(HERE / 'nc_lists.json')) if (HERE / 'nc_lists.json').exists() else None
if nc is None:
    nc_y34 = ['accident(ally)', 'actual(ly)', 'address', 'answer', 'appear', 'arrive', 'believe', 'bicycle', 'breath', 'breathe', 'build',
              'busy/business', 'calendar', 'caught', 'centre', 'century', 'certain', 'circle', 'complete', 'consider', 'continue', 'decide',
              'describe', 'different', 'difficult', 'disappear', 'early', 'earth', 'eight/eighth', 'enough', 'exercise', 'experience',
              'experiment', 'extreme', 'famous', 'favourite', 'February', 'forward(s)', 'fruit', 'grammar', 'group', 'guard', 'guide', 'heard',
              'heart', 'height', 'history', 'imagine', 'increase', 'important', 'interest', 'island', 'knowledge', 'learn', 'length',
              'library', 'material', 'medicine', 'mention', 'minute', 'natural', 'naughty', 'notice', 'occasion(ally)', 'often', 'opposite',
              'ordinary', 'particular', 'peculiar', 'perhaps', 'popular', 'position', 'possess(ion)', 'possible', 'potatoes', 'pressure',
              'probably', 'promise', 'purpose', 'quarter', 'question', 'recent', 'regular', 'reign', 'remember', 'sentence', 'separate',
              'special', 'straight', 'strange', 'strength', 'suppose', 'surprise', 'therefore', 'though/although', 'thought', 'through',
              'various', 'weight', 'woman/women']
    nc_y56 = ['accommodate', 'accompany', 'according', 'achieve', 'aggressive', 'amateur', 'ancient', 'apparent', 'appreciate', 'attached',
              'available', 'average', 'awkward', 'bargain', 'bruise', 'category', 'cemetery', 'committee', 'communicate', 'community',
              'competition', 'conscience*', 'conscious*', 'controversy', 'convenience', 'correspond', 'criticise (critic + ise)', 'curiosity',
              'definite', 'desperate', 'determined', 'develop', 'dictionary', 'disastrous', 'embarrass', 'environment', 'equip (–ped, –ment)',
              'especially', 'exaggerate', 'excellent', 'existence', 'explanation', 'familiar', 'foreign', 'forty', 'frequently', 'government',
              'guarantee', 'harass', 'hindrance', 'identity', 'immediate(ly)', 'individual', 'interfere', 'interrupt', 'language', 'leisure',
              'lightning', 'marvellous', 'mischievous', 'muscle', 'necessary', 'neighbour', 'nuisance', 'occupy', 'occur', 'opportunity',
              'parliament', 'persuade', 'physical', 'prejudice', 'privilege', 'profession', 'programme', 'pronunciation', 'queue', 'recognise',
              'recommend', 'relevant', 'restaurant', 'rhyme', 'rhythm', 'sacrifice', 'secretary', 'shoulder', 'signature', 'sincere(ly)',
              'soldier', 'stomach', 'sufficient', 'suggest', 'symbol', 'system', 'temperature', 'thorough', 'twelfth', 'variety', 'vegetable',
              'vehicle', 'yacht']
else:
    nc_y34 = nc['y34'][:nc['y34'].index('Notes and guidance (non-statutory)')]
    nc_y56 = nc['y56'][:nc['y56'].index('Notes and guidance (non-statutory)')]


def nc_expand(w):
    """what the teacher reads aloud for one printed entry"""
    special = {'accident(ally)': ['accident', 'accidentally'], 'actual(ly)': ['actual', 'actually'], 'busy/business': ['busy', 'business'],
               'eight/eighth': ['eight', 'eighth'], 'forward(s)': ['forward', 'forwards'], 'occasion(ally)': ['occasion', 'occasionally'],
               'possess(ion)': ['possess', 'possession'], 'though/although': ['though', 'although'], 'woman/women': ['woman', 'women'],
               'conscience*': ['conscience'], 'conscious*': ['conscious'], 'criticise (critic + ise)': ['criticise'],
               'equip (–ped, –ment)': ['equip', 'equipped', 'equipment'], 'immediate(ly)': ['immediate', 'immediately'],
               'sincere(ly)': ['sincere', 'sincerely']}
    return special.get(w, [w])


for slug, lst, lvl, ttl in (('nc_year34_words', nc_y34, 'P4', 'England National Curriculum, Appendix 1 spelling - Years 3 and 4 statutory word list (100)'),
                            ('nc_year56_words', nc_y56, 'P6', 'England National Curriculum, Appendix 1 spelling - Years 5 and 6 statutory word list (100)')):
    t = [x for w in lst for x in nc_expand(w)]
    add(slug, 'list', lvl, ttl, 'https://www.st-marysfields.leicester.sch.uk/content/uploads/sites/28/2024/06/national-curriculum-spelling-lists.pdf',
        OGL, 'Word list - years %s\n' % ('3 and 4' if '34' in slug else '5 and 6') + '\n'.join(lst), list_items=t,
        notes='Printed entries carry morphology marks: (ally), /, (s), *, (–ped, –ment). Targets are the words a teacher would read aloud. '
              'Level assigned by us (UK year 4 ~ HK P4-5; year 6 ~ P6); the list is not from a HK school.')

# ============================================================ TEXTS (15)
add('poyan_p1_sentences', 'text', 'P1', 'Po Yan Oblate PS, P.1 dictation syllabus 2021-22 (2nd sem) - A. Sentences',
    PY + '125/%E4%B8%8BP.1_Dictation_Exam.pdf', SCHOOL_LIC,
    """A. Sentences 80%

1. How many mangoes are there?

2. There are seventeen mangoes.

3. He is reading under the tree.

4. She is sleeping.

5. What colour is the T-shirt?

6. It is brown.

7. I can smell some flowers.

8. I can hear a dog.

9. I can touch a cat.

10. Their shoes are white.

11. Can a parrot fly?

12. No, they cannot.

13. My pet has pink eyes.""",
    rule_text="How many mangoes are there? There are seventeen mangoes. He is reading under the tree. She is sleeping. What colour is the T-shirt? It is brown. I can smell some flowers. I can hear a dog. I can touch a cat. Their shoes are white. Can a parrot fly? No, they cannot. My pet has pink eyes.",
    notes='13 numbered sentences, ~55 words (shorter than the 60-200 word brief; a real P1 sheet).')
# McGuffey lesson XXXI (child reader, with syllable marks in the printed word list)
_mc = """LESSON XXXI.

bound     Rose       called     got       drown      found       brave

came      Pon'to     jumped     mouth     a round'    brought    wa'ter

"Here, Ponto! Here, Ponto!" Kate called to her dog. "Come, and get the
dolls out of the pond."

Rose went under, but she did not drown. Bess was still on the top of the
water.

Ponto came with a bound, and jumped into the pond. He swam around, and got
Bess in his mouth, and brought her to the shore.

Ponto then found Rose, and brought her out, too.

Kate said, "Good, old Ponto! Brave old dog!"

What do you think of Ponto?"""
add('mcguffey_lesson31', 'text', 'P2', "McGuffey's First Eclectic Reader (rev. ed.), Lesson XXXI - word list + story",
    'https://www.gutenberg.org/ebooks/14640', GUT_LIC, _mc,
    rule_text=_mc.split('\n\n', 3)[3] + ' bound drown found brave came jumped mouth around brought water',
    proper=['Ponto', 'Kate', 'Rose', 'Bess', 'Pon', 'to'],
    notes='Level assigned by us (early reader). Printed word list has syllable apostrophes (Pon\'to, a round\', wa\'ter) -> ordinary OCR/parse trap. '
          'Targets: story content words + the printed lesson words (as spelled without syllable marks).')
_pr = """Once upon a time there were four little Rabbits, and their names were--

          Flopsy,
       Mopsy,
   Cotton-tail,
and Peter.

They lived with their Mother in a sand-bank, underneath the root of a
very big fir-tree.

'Now my dears,' said old Mrs. Rabbit one morning, 'you may go into
the fields or down the lane, but don't go into Mr. McGregor's garden:
your Father had an accident there; he was put in a pie by Mrs.
McGregor.'

'Now run along, and don't get into mischief. I am going out.'

Then old Mrs. Rabbit took a basket and her umbrella, and went through
the wood to the baker's. She bought a loaf of brown bread and five
currant buns."""
add('potter_peter_rabbit', 'text', 'P3', 'Beatrix Potter, The Tale of Peter Rabbit (1902) - opening', 'https://www.gutenberg.org/ebooks/14838', GUT_LIC, _pr,
    rule_text=_pr, proper=['Flopsy', 'Mopsy', 'Cotton-tail', 'Peter', 'Rabbit', 'Rabbits', 'Mrs', 'Mr', 'McGregor', "McGregor's"],
    notes='Level assigned by us (P3). Straight-quote dialogue, possessives (Mr. McGregor\'s, baker\'s), contraction (don\'t), hyphenated words, '
          'centred names on separate lines.')
_ht = """A HARE one day ridiculed the short feet and slow pace of the Tortoise,
who replied, laughing: “Though you be swift as the wind, I will beat
you in a race.” The Hare, believing her assertion to be simply
impossible, assented to the proposal; and they agreed that the Fox
should choose the course and fix the goal. On the day appointed for the
race the two started together. The Tortoise never for a moment stopped,
but went on with a slow but steady pace straight to the end of the
course. The Hare, lying down by the wayside, fell fast asleep. At last
waking up, and moving as fast as he could, he saw the Tortoise had
reached the goal, and was comfortably dozing after her fatigue.

Slow but steady wins the race."""
add('aesop_hare_tortoise', 'text', 'P4', 'Aesop (trans. Townsend), The Hare and the Tortoise', 'https://www.gutenberg.org/ebooks/21', GUT_LIC, _ht,
    rule_text=_ht, proper=['Hare', 'Tortoise', 'Fox'], notes='Level assigned by us (P4).')
_lm = """A LION was awakened from sleep by a Mouse running over his face. Rising
up angrily, he caught him and was about to kill him, when the Mouse
piteously entreated, saying: “If you would only spare my life, I would
be sure to repay your kindness.” The Lion laughed and let him go. It
happened shortly after this that the Lion was caught by some hunters,
who bound him by strong ropes to the ground. The Mouse, recognizing his
roar, came and gnawed the rope with his teeth, and set him free,
exclaiming:

“You ridiculed the idea of my ever being able to help you, not
expecting to receive from me any repayment of your favour; now you know
that it is possible for even a Mouse to confer benefits on a Lion.”"""
add('aesop_lion_mouse', 'text', 'P5', 'Aesop (trans. Townsend), The Lion and the Mouse', 'https://www.gutenberg.org/ebooks/21', GUT_LIC, _lm,
    rule_text=_lm, proper=['Lion', 'Mouse'], notes='Level assigned by us (P5). Opening word in capitals (A LION), curly quotes, long words (piteously, entreated).')
_nw = """THE NORTH WIND and the Sun disputed as to which was the most powerful,
and agreed that he should be declared the victor who could first strip
a wayfaring man of his clothes. The North Wind first tried his power
and blew with all his might, but the keener his blasts, the closer the
Traveler wrapped his cloak around him, until at last, resigning all
hope of victory, the Wind called upon the Sun to see what he could do.
The Sun suddenly shone out with all his warmth. The Traveler no sooner
felt his genial rays than he took off one garment after another, and at
last, fairly overcome with heat, undressed and bathed in a stream that
lay in his path.

Persuasion is better than Force."""
add('aesop_north_wind_sun', 'text', 'P6', 'Aesop (trans. Townsend), The North Wind and the Sun', 'https://www.gutenberg.org/ebooks/21', GUT_LIC, _nw,
    rule_text=_nw, proper=['North', 'Wind', 'Sun', 'Traveler'], notes='Level assigned by us (P6); American spelling (Traveler).')
_oak = """A VERY LARGE OAK was uprooted by the wind and thrown across a stream.
It fell among some Reeds, which it thus addressed: “I wonder how you,
who are so light and weak, are not entirely crushed by these strong
winds.” They replied, “You fight and contend with the wind, and
consequently you are destroyed; while we on the contrary bend before
the least breath of air, and therefore remain unbroken, and escape.”

Stoop to conquer."""
add('aesop_oak_reeds', 'text', 'P6', 'Aesop (trans. Townsend), The Oak and the Reeds', 'https://www.gutenberg.org/ebooks/21', GUT_LIC, _oak,
    rule_text=_oak, proper=['Reeds', 'Oak', 'OAK'], notes='Level assigned by us (P6). Three capitalised words in a row (A VERY LARGE OAK).')
_mw = """A FARMER’S daughter was carrying her Pail of milk from the field to the
farmhouse, when she fell a-musing. “The money for which this milk will
be sold, will buy at least three hundred eggs. The eggs, allowing for
all mishaps, will produce two hundred and fifty chickens. The chickens
will become ready for the market when poultry will fetch the highest
price, so that by the end of the year I shall have money enough from my
share to buy a new gown. In this dress I will go to the Christmas
parties, where all the young fellows will propose to me, but I will
toss my head and refuse them every one.” At this moment she tossed her
head in unison with her thoughts, when down fell the milk pail to the
ground, and all her imaginary schemes perished in a moment."""
add('aesop_milkwoman_pail', 'text', 'P6', 'Aesop (trans. Townsend), The Milk-Woman and Her Pail', 'https://www.gutenberg.org/ebooks/21', GUT_LIC, _mw,
    rule_text=_mw, proper=['Christmas', 'Pail', "FARMER’S"], notes='Level assigned by us (P6). Possessive FARMER’S, hyphen a-musing, long sentence with quote.')
_rp = """There was once a Prince who wished to marry a Princess; but then she
must be a real Princess. He travelled all over the world in hopes of
finding such a lady; but there was always something wrong. Princesses he
found in plenty; but whether they were real Princesses it was impossible
for him to decide, for now one thing, now another, seemed to him not
quite right about the ladies. At last he returned to his palace quite
cast down, because he wished so much to have a real Princess for his
wife.

One evening a fearful tempest arose, it thundered and lightened, and the
rain poured down from the sky in torrents: besides, it was as dark as
pitch. All at once there was heard a violent knocking at the door, and
the old King, the Prince's father, went out himself to open it."""
add('andersen_real_princess', 'text', 'P6', 'H. C. Andersen, The Real Princess (Andersen\'s Fairy Tales) - first two paragraphs',
    'https://www.gutenberg.org/ebooks/1597', GUT_LIC, _rp, rule_text=_rp, proper=['Prince', 'Princess', 'Princesses', 'King', "Prince's"],
    notes='Level assigned by us (P6). British spellings (travelled), possessive (Prince\'s), 150 words.')
# Po Yan P4 sentence sheets
_p423 = """A. Sentences 50%

1. Once there was a princess with very white skin.

2. She was kind and polite.

3. She wanted to teach her a lesson.

4. You’re the apple of my eye!

5. Milky ate enough fruit and vegetables.

6. Look! There’s a directory.

7. I like dinosaurs very much.

8. Can we touch the displays?

9. It makes me feel funny.

10. We did not do face painting either.

11. First, study the map.

12. Finally, get the treasure."""
add('poyan_p4_2324_sentences', 'text', 'P4', 'Po Yan Oblate PS, P.4 exam dictation syllabus 2023-24 (2nd sem) - A. Sentences',
    PY + '175/ENG/2_P4_4.exam.pdf', SCHOOL_LIC, _p423, rule_text=' '.join(_p423.split('\n')[2:]), proper=['Milky'],
    notes='Contractions with curly apostrophe (You’re, There’s), name Milky, imperative with "!".')
_p425 = """A.  Sentences 50%

1. She ate snacks all the time.

2. She went dancing with the prince.

3. She wanted to teach her a lesson.

4. You’re the apple of my eye!

5. They help keep her healthy.

6. Shall we go to the Children Zone?

7. I like dinosaurs very much.

8. You must behave in the museum.

9. We did not do face painting either.

10. I do not want to twist balloons or take photos.

11. After that, find the yellow cards.

12. We went hiking happily in the morning."""
add('poyan_p4_2526_sentences', 'text', 'P4', 'Po Yan Oblate PS, P.4 exam dictation syllabus 2025-26 (2nd sem) - A. Sentences',
    PY + '200/2526_T4_P4_Dictation.pdf', SCHOOL_LIC, _p425, rule_text=' '.join(_p425.split('\n')[2:]), proper=[],
    notes='Past tense, -ing forms (dancing, hiking), capitalised "Children Zone".')
# WYNPS P5 read-dictation passages
_w2 = """B. Read Dictation (60%@3%)
We shouldn’t jump the queue. Instead, we should wait patiently for
our turn to get on the train, bus, ferry, etc. We should also offer our
seats to the elderly and others in need. We shouldn’t eat on public
transport because humans don’t like mess.
We shouldn’t talk loudly during the film. Also, we shouldn’t use our
phones because the light will disturb the humans. After the film, we
should put all our rubbish in the bins on our way out of the cinema.
(84 words)"""
add('wynps_p5_d2_passage', 'text', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Dictation (2) B. Read Dictation', WYN, SCHOOL_LIC, _w2,
    rule_text=' '.join(_w2.split('\n')[1:-1]), notes='Repeated "shouldn’t", "don’t", abbreviation "etc.", word count "(84 words)" printed on the sheet.')
_w4 = """B. Read Dictation (60%@3%)
Yoyo and her mum are looking at photos of Sports Day.
Principal Lam is the man who is giving a speech. And he’s the man in
the cap. Tim is the boy who is hugging his teammate. Pam is the girl who is
waving at the audience.
Mike is the boy who is raising the trophy. Kelly is the girl who is
crossing the finishing line. Jane is my best friend. She is the girl in the
hat. And she looks very much like her mother.
(86 words)"""
add('wynps_p5_d4_passage', 'text', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Dictation (4) B. Read Dictation', WYN, SCHOOL_LIC, _w4,
    rule_text=' '.join(_w4.split('\n')[1:-1]), proper=['Yoyo', 'Principal', 'Lam', 'Tim', 'Pam', 'Mike', 'Kelly', 'Jane', 'Sports', 'Day'],
    notes='Many person names; "Sports Day" capitalised; "he’s".')
_w6 = """B. Read Dictation (60%@3%)
Hello from Paris! This is such a wonderful city! Today is our second
day in Paris. We have already visited some interesting places. This
morning, we climbed to the top of the Eiffel Tower.
We visited the famous art museum in the afternoon. We saw some
great paintings such as the Mona Lisa. Tomorrow we will go hiking in a
small town. I can’t wait to see the countryside.
I bought you a scarf with a cat on it yesterday. It is a perfect gift
for a cat lover like you.
(91 words)"""
add('wynps_p5_d6_passage', 'text', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Dictation (6) B. Read Dictation', WYN, SCHOOL_LIC, _w6,
    rule_text=' '.join(_w6.split('\n')[1:-1]), proper=['Paris', 'Eiffel', 'Tower', 'Mona', 'Lisa'],
    notes='Place/person names (Paris, Eiffel Tower, Mona Lisa), past tense, "can’t".')
_t52 = """C.
Text (55% @2%)
Fantasy Farm is a big farm. You can ride horses there. I have never ridden a
horse, but I think it will be exciting! Have you ever picked fruit or fed animals? You
can try them at Fantasy Farm.
I have picked strawberries there. They are delicious! I have also fed rabbits and
cows. They are lovely!
(57 words)"""
add('tks_p5_t2_u5_text', 'text', 'P5', 'Tung Koon School, P.5 2nd term 2025-26 - Dictation 1 (5A Unit 5) C. Text',
    TKS + 'pdf/Edict/25262nd/Dictation%20Booklet_%20English_P5_second%20term.pdf', SCHOOL_LIC, _t52,
    rule_text=' '.join(_t52.split('\n')[2:-1]), proper=['Fantasy', 'Farm'],
    notes='Present perfect (ridden, picked, fed), place name Fantasy Farm.')

# ============================================================ MIXED (10)
_lty1 = """Primary 1
Dictation (1)
29th Feb, 2024
Ready: 1AU5
Space Town: Grandma and the Birthday Cake
A. Phonics (20%@4%)
Say the word and count the syllables.
1
-
2   -
3
B. Vocabulary (10%@2%)
1. a bear
2. a lion
3. a panda
4. a rabbit
5. a tiger
C. High Frequency Words (10%@2%)
1. that
2. yes
3. no
4. eight
5. four
D. Sentences (10%)
1. This is a fat cat.
2. That monkey is thin."""
add('lty_p1_d1_full', 'mixed', 'P1', 'Lau Tak Yung PS, P.1 English Dictation (1) 2023-24 - whole sheet', LTY + '23-24_2nd_Term_P.1_Dict_HB.pdf', SCHOOL_LIC,
    _lty1, list_items=['a bear', 'a lion', 'a panda', 'a rabbit', 'a tiger', 'that', 'yes', 'no', 'eight', 'four'],
    rule_text='This is a fat cat. That monkey is thin.',
    notes='Header lines (date, unit title "Space Town"), phonics instruction, section labels with marks.')
_lty4 = """Primary 1
Dictation (4)
16th May, 2024
Ready: 1BU4 & U6
Space Town: Fun Times at the Zoo
A. Phonics (20%@4%)
Read the following words beginning with ‘w’ and ‘v’.
B. Vocabulary (10%@2%)
1. drink
2. eat
3. play
4. read
5. sleep
C. High Frequency Words (10%@2%)
1. many
2. here
3. small
4. why
5. how
D. Sentences (10%@2%)
1. The goldfish can swim.
2. The dog can walk and run."""
add('lty_p1_d4_full', 'mixed', 'P1', 'Lau Tak Yung PS, P.1 English Dictation (4) 2023-24 - whole sheet', LTY + '23-24_2nd_Term_P.1_Dict_HB.pdf', SCHOOL_LIC,
    _lty4, list_items=['drink', 'eat', 'play', 'read', 'sleep', 'many', 'here', 'small', 'why', 'how'],
    rule_text='The goldfish can swim. The dog can walk and run.', notes='Quote marks around single letters in the instruction line.')
_py1 = """2021-22 SECOND SEMESTER, EXAMINATION
Dictation Syllabus
P.1 ____                     Name: ____________________  No.: _____
A. Sentences 80%
1. How many mangoes are there?
2. There are seventeen mangoes.
3. He is reading under the tree.
4. She is sleeping.
5. What colour is the T-shirt?
6. It is brown.
7. I can smell some flowers.
8. I can hear a dog.
9. I can touch a cat.
10. Their shoes are white.
11. Can a parrot fly?
12. No, they cannot.
13. My pet has pink eyes.
B. Vocabulary 20%
eat
drink
laugh
draw
sing
a skirt
trousers
a dress
a cap
socks"""
add('poyan_p1_full', 'mixed', 'P1', 'Po Yan Oblate PS, P.1 dictation syllabus 2021-22 (2nd sem) - whole sheet', PY + '125/%E4%B8%8BP.1_Dictation_Exam.pdf',
    SCHOOL_LIC, _py1, list_items=['eat', 'drink', 'laugh', 'draw', 'sing', 'a skirt', 'trousers', 'a dress', 'a cap', 'socks'],
    rule_text="How many mangoes are there? There are seventeen mangoes. He is reading under the tree. She is sleeping. What colour is the T-shirt? It is brown. I can smell some flowers. I can hear a dog. I can touch a cat. Their shoes are white. Can a parrot fly? No, they cannot. My pet has pink eyes.",
    notes='Header with Name/No. blanks, 13 sentences then a vocabulary block.')
_l31 = """Primary 3
Dictation (1)
26th February, 2020
A. Vocabulary (20%)
1. Chinese
2. Computer Studies
3. English
4. General Studies
5. Music
B. Sentences (30%)
1. Ken like singing. He wins the singing contest.
2. Mandy gets first prize in the sums competition.
3. Alan plays very well.
C. Paragraph (40%)
My best friend is Paul. We are in the same class. He sits
in front of me. His favourite subjects are Maths and Visual
Arts. He is good at painting pictures.
D. Recitation (10%)
She is good at playing basketball but she is not good at playing
badminton."""
add('lty_p3_d1_full', 'mixed', 'P3', 'Lau Tak Yung PS, P.3 English Dictation (1) 2019-20 - whole sheet', LTY + '19-20_2nd_term_P3_Dict_Handbook.pdf',
    SCHOOL_LIC, _l31, list_items=['Chinese', 'Computer Studies', 'English', 'General Studies', 'Music'],
    rule_text="Ken like singing. He wins the singing contest. Mandy gets first prize in the sums competition. Alan plays very well. My best friend is Paul. We are in the same class. He sits in front of me. His favourite subjects are Maths and Visual Arts. He is good at painting pictures. She is good at playing basketball but she is not good at playing badminton.",
    proper=['Ken', 'Mandy', 'Alan', 'Paul', 'Maths', 'Visual', 'Arts'],
    notes='Subject names and names in sentences; "Ken like singing" is in the source (kept verbatim).')
_l34 = """Primary 3
Dictation (4)
6th May, 2020
A. Vocabulary (20%)
1. a belt
2. a watch
3. a towel
4. a purse
5. a wallet
B. Sentence (30%)
1. I sang birthday songs with my parents.
2. Mum bought me a new key ring.
3. My best friend gave me a special gift.
C. Paragraph (40%)
It was my birthday today. My parents took me to the
country park and we rode bicycles. In the evening I had a
birthday party. Mum and Dad gave me a new handbag.
D. Recitation (10%)
My parents took me to a restaurant and we had a buffet
dinner."""
add('lty_p3_d4_full', 'mixed', 'P3', 'Lau Tak Yung PS, P.3 English Dictation (4) 2019-20 - whole sheet', LTY + '19-20_2nd_term_P3_Dict_Handbook.pdf',
    SCHOOL_LIC, _l34, list_items=['a belt', 'a watch', 'a towel', 'a purse', 'a wallet'],
    rule_text="I sang birthday songs with my parents. Mum bought me a new key ring. My best friend gave me a special gift. It was my birthday today. My parents took me to the country park and we rode bicycles. In the evening I had a birthday party. Mum and Dad gave me a new handbag. My parents took me to a restaurant and we had a buffet dinner.",
    proper=['Mum', 'Dad'], notes='Irregular past tense (sang, bought, gave, took, rode); line breaks inside sentences.')
# Po Yan P4 2022-23: sentences + verb table + bonus
_vt = [('break', 'breaks', 'breaking', 'broke'), ('bring', 'brings', 'bringing', 'brought'), ('buy', 'buys', 'buying', 'bought'),
       ('celebrate', 'celebrates', 'celebrating', 'celebrated'), ('decorate', 'decorates', 'decorating', 'decorated'),
       ('find', 'finds', 'finding', 'found'), ('fly', 'flies', 'flying', 'flew'), ('hide', 'hides', 'hiding', 'hid'),
       ('keep', 'keeps', 'keeping', 'kept'), ('leave', 'leaves', 'leaving', 'left')]
_vt_paste = '\n'.join('%s (%s)\n%s\n%s\n' % r for r in _vt)
_vt_photo = '\n'.join('%-22s %-14s %s' % ('%s (%s)' % (r[0], r[1]), r[2], r[3]) for r in _vt)
_p22_sent = """1. Once there was a princess with long dark hair, large brown eyes and very white skin.
2. You’re the apple of my eyes!
3. Milky was kind and polite.
4. She liked eating snacks.
5. The cooks in the kitchen were always busy.
6. We’ll also make a few ham and mushroom pizzas!
7. It’s not my cup of tea!
8. She wanted to teach her a lesson.
9. Will you make onion rings for the party tomorrow?
10. She ate plenty of chicken nuggets.
11. She had a little mango pudding."""
_p22_raw = ("Po Yan Oblate Primary School\n2022-23 SECOND SEMESTER\nDictation Syllabus (1)\nP.4____     Name: ____________________________(    )     Date: ______________\n"
            "Unit 1\nA. Sentences  70%\n" + _p22_sent + "\n\nB. Verb Table  30%\n\nPresent\nPresent continuous\nPast\n\n" + _vt_paste +
            "\nC. Bonus Dictation  20%\njumping castle\nmerry-go-round\ncarefully\nquickly\npolitely")
_p22_photo = ("Po Yan Oblate Primary School\n2022-23 SECOND SEMESTER\nDictation Syllabus (1)\nP.4____     Name: ____________________________(    )     Date: ______________\n"
              "Unit 1\nA. Sentences  70%\n" + _p22_sent + "\n\nB. Verb Table  30%\n" + '%-22s %-14s %s' % ('Present', 'Present continuous', 'Past') + '\n' + _vt_photo +
              "\n\nC. Bonus Dictation  20%\njumping castle\nmerry-go-round\ncarefully\nquickly\npolitely")
vt_targets = [x for r in _vt for x in r]
add('poyan_p4_2223_full', 'mixed', 'P4', 'Po Yan Oblate PS, P.4 dictation syllabus 2022-23 (2nd sem) - sentences + verb table + bonus',
    PY + '162/eng/2022-23__2nd_Semester_P4_Dictation_1.pdf', SCHOOL_LIC, _p22_raw, photo=_p22_photo,
    list_items=vt_targets + ['jumping castle', 'merry-go-round', 'carefully', 'quickly', 'politely'],
    rule_text=' '.join(s.split('. ', 1)[1] for s in _p22_sent.split('\n')),
    proper=['Milky'],
    notes='Verb table "break (breaks) / breaking / broke" - third-person forms in brackets; hyphenated merry-go-round; ’ll, It’s, You’re.')
_p25_vt = [('buy', 'buys', 'buying', 'bought'), ('find', 'finds', 'finding', 'found'), ('hide', 'hides', 'hiding', 'hid'),
           ('make', 'makes', 'making', 'made'), ('pay', 'pays', 'paying', 'paid'), ('ride', 'rides', 'riding', 'rode'),
           ('think', 'thinks', 'thinking', 'thought'), ('teach', 'teaches', 'teaching', 'taught'), ('wear', 'wears', 'wearing', 'wore')]
_p25_paste = '\n'.join('%s (%s)\n%s\n%s\n' % r for r in _p25_vt)
_p25_photo = '\n'.join('%-22s %-14s %s' % ('%s (%s)' % (r[0], r[1]), r[2], r[3]) for r in _p25_vt)
_p25_sent = '\n'.join(_p425.split('\n')[2:]).replace('\n\n', '\n')
add('poyan_p4_2526_full', 'mixed', 'P4', 'Po Yan Oblate PS, P.4 exam dictation syllabus 2025-26 (2nd sem) - sentences + verb table',
    PY + '200/2526_T4_P4_Dictation.pdf', SCHOOL_LIC,
    "Po Yan Oblate Primary School\n2025-26 SECOND SEMESTER, EXAMINATION\nDictation Syllabus\nP.4 ____        Name: ____________________  No.: _____\nA.  Sentences 50%\n"
    + _p25_sent + "\nB. Verb Table 30%\nPresent\nPresent continuous\nPast\n\n" + _p25_paste,
    photo="Po Yan Oblate Primary School\n2025-26 SECOND SEMESTER, EXAMINATION\nDictation Syllabus\nP.4 ____        Name: ____________________  No.: _____\nA.  Sentences 50%\n"
          + _p25_sent + "\nB. Verb Table 30%\n" + '%-22s %-14s %s' % ('Present', 'Present continuous', 'Past') + '\n' + _p25_photo,
    list_items=[x for r in _p25_vt for x in r], rule_text=' '.join(s.split('. ', 1)[1] for s in _p25_sent.split('\n')),
    notes='Verb table with 3rd-person forms in brackets and irregular pasts.')
_w5 = """Dictation (5)
Date: 5th December, 2023 (Tuesday)
Chapter 4: Lost and found
Module: People and things around me
A. Vocabulary (40%@4%)
1. a backpack
6. a diamond ring
2. a hairbrush
7. a cotton top
3. a hair clip
8. googles
4. a mirror
9. headphones
5. a gold necklace
10. silver earrings
B. Read Dictation (60%@3%)
1. Is this crystal bracelet yours?
2. No, it isn’t mine.
3. Are these diamond rings yours?
4. Yes, they’re ours.
5. We are looking for a pair of rackets.
6. I can’t find my leather coin purse.
7. Emma lost her hair clip.
8. Please help!
(39 words)
C. Bonus (Gain 1% for each word)
1. Whose comb is this?
2. Tim has a green comb.
I think it’s his."""
add('wynps_p5_d5_full', 'mixed', 'P5', 'Wong Yiu Nam PS, P.5 1st term 2023-24 - Fun Dictation (5) whole sheet', WYN, SCHOOL_LIC, _w5,
    photo=_w5.replace("1. a backpack\n6. a diamond ring\n2. a hairbrush\n7. a cotton top\n3. a hair clip\n8. googles\n4. a mirror\n9. headphones\n5. a gold necklace\n10. silver earrings",
                      "1. a backpack                   6. a diamond ring\n2. a hairbrush                  7. a cotton top\n3. a hair clip                    8. googles\n4. a mirror                       9. headphones\n5. a gold necklace           10. silver earrings"),
    list_items=['a backpack', 'a hairbrush', 'a hair clip', 'a mirror', 'a gold necklace', 'a diamond ring', 'a cotton top', 'googles',
                'headphones', 'silver earrings'],
    rule_text="Is this crystal bracelet yours? No, it isn’t mine. Are these diamond rings yours? Yes, they’re ours. We are looking for a pair of rackets. I can’t find my leather coin purse. Emma lost her hair clip. Please help! Whose comb is this? Tim has a green comb. I think it’s his.",
    proper=['Emma', 'Tim'],
    notes='"googles" is the (mis)spelling printed in the source (goggles); kept verbatim. Possessive pronouns, isn’t/they’re/can’t/it’s, a pair of.')
_tk1 = """Dictation 1: Unit 1 (p.2-8)
Date:_______________________________ (          )
A.
Recitation (30% @2%)
1.
Who is your favourite teacher?
2.
My favourite teacher is Mr. Lewis.
3.
How long does it take to go from the car park to the beach?
4.
It takes only a few minutes.
(31 words)
B.
Target Vocabulary (15% @3%)
1. a bus terminal
5. a pedestrian crossing
9. a train station
2. a car park
6. a subway
10. a tunnel
3. a footbridge
7. a taxi rank
4. a pavement
8. traffic lights
C.
Text (55% @2%)
Some children joined a city race. The first checkpoint was a hotel. It was more

difficult than they thought!

‘How far is it from the train station to the hotel?’ asked Ben. Chris checked the

map and said, ‘It’s about three kilometres. We can go over that footbridge and walk

to the hotel.’

(53 words)
D.
Tenses (30% @ 2%)
Topic: Simple present tense and simple past tense
*Please study no.1-15 from the irregular verb table. Here are some examples.
Simple present
Simple past
1. become
2. break
3. begin
4.
bought
5. catch
You need to fill in the blanks."""
_tk1_photo = (_tk1.replace("1. a bus terminal\n5. a pedestrian crossing\n9. a train station\n2. a car park\n6. a subway\n10. a tunnel\n3. a footbridge\n7. a taxi rank\n4. a pavement\n8. traffic lights",
                           "1. a bus terminal                    5. a pedestrian crossing         9. a train station\n2. a car park                           6. a subway                              10. a tunnel\n3. a footbridge                      7. a taxi rank\n4. a pavement                       8. traffic lights")
              .replace('Date:_______________________________ (          )\nA.\nRecitation (30% @2%)\n1.\nWho', 'Date:____________________ (    )\nA. Recitation (30% @2%)\n1. Who')
              .replace('\n2.\nMy', '\n2. My').replace('\n3.\nHow', '\n3. How').replace('\n4.\nIt takes', '\n4. It takes')
              .replace('B.\nTarget', 'B. Target').replace('C.\nText', 'C. Text').replace('D.\nTenses', 'D. Tenses').replace('4.\nbought', '4. bought')
              .replace('more \n\ndifficult', 'more difficult').replace('the \n\nmap', 'the map').replace('walk \n\nto', 'walk to').replace('\n\n', '\n'))
add('tks_p5_t1_u1_full', 'mixed', 'P5', 'Tung Koon School, P.5 1st term 2025-26 - Dictation 1 Unit 1 - whole sheet',
    TKS + 'sites/default/files/sites/default/files/25261st/P5dict.pdf', SCHOOL_LIC, _tk1, photo=_tk1_photo,
    list_items=['a bus terminal', 'a pedestrian crossing', 'a train station', 'a car park', 'a subway', 'a tunnel', 'a footbridge', 'a taxi rank',
                'a pavement', 'traffic lights', 'become', 'break', 'begin', 'bought', 'catch'],
    rule_text="Who is your favourite teacher? My favourite teacher is Mr. Lewis. How long does it take to go from the car park to the beach? It takes only a few minutes. Some children joined a city race. The first checkpoint was a hotel. It was more difficult than they thought! ‘How far is it from the train station to the hotel?’ asked Ben. Chris checked the map and said, ‘It’s about three kilometres. We can go over that footbridge and walk to the hotel.’",
    proper=['Lewis', 'Mr', 'Ben', 'Chris'],
    notes='Four sections (Recitation, Target Vocabulary, Text, Tenses); single curly quotes; "Mr. Lewis"; two-column vocabulary; word counts in brackets. '
          'Paste text keeps the PDF text-layer order (number and sentence on separate lines, blank lines inside the text).')
_tk4 = """Dictation 2: Unit 2 (p.10-17)
Date:_______________________________ (          )
A.
Recitation (30% @ 2%)
1.
Tom and I like the same kind of food.
2.
We sleep in different rooms.
3.
Did Jamie and you fight with each other?
4.
No, we didn’t fight with each other.
(29 words)
B.
Target Vocabulary (15% @3%)
1. talk to
2. listen to
3. look after
4. play with
5. say sorry to
6. shout at
7. argue with
8. fight with
9. laugh at
10. make fun of
C.
Text (55% @ 2%)
Last weekend, my parents went on a trip. My little sister Grace and I stayed
with Jamie for a few days. Jamie asked me to play with him, so we played badminton
together. I played very badly and Grace laughed at me.
(42 words)
D.
Thematic Vocabulary (30% @ 2%)
Topic: Simple present tense and simple past tense
*Please study no.16-30 from the irregular verb table.
Here are some examples.
Simple present
Simple past
1. be
,
2. begin
3. bite
4. break
5. bring
You need to fill in the blanks."""
add('tks_p4_u2_full', 'mixed', 'P4', 'Tung Koon School, P.4 1st term 2025-26 - Dictation 2 Unit 2 - whole sheet',
    TKS + 'sites/default/files/sites/default/files/25261st/P4dict.pdf', SCHOOL_LIC, _tk4,
    photo=_tk4.replace('A.\nRecitation', 'A. Recitation').replace('1.\nTom', '1. Tom').replace('2.\nWe sleep', '2. We sleep')
              .replace('3.\nDid', '3. Did').replace('4.\nNo,', '4. No,').replace('B.\nTarget', 'B. Target').replace('C.\nText', 'C. Text')
              .replace('D.\nThematic', 'D. Thematic').replace('1. be\n,\n', '1. be, was/were\n'),
    list_items=['talk to', 'listen to', 'look after', 'play with', 'say sorry to', 'shout at', 'argue with', 'fight with', 'laugh at',
                'make fun of', 'be', 'begin', 'bite', 'break', 'bring'],
    rule_text="Tom and I like the same kind of food. We sleep in different rooms. Did Jamie and you fight with each other? No, we didn’t fight with each other. Last weekend, my parents went on a trip. My little sister Grace and I stayed with Jamie for a few days. Jamie asked me to play with him, so we played badminton together. I played very badly and Grace laughed at me.",
    proper=['Tom', 'Jamie', 'Grace'],
    notes='Paste text has a lone "," line copied from the table; photo prints "be, was/were". Names; didn’t; phrasal verbs.')

# ---------------------------------------------------------------- levels / sanity
assert len(SETS) == 50, len(SETS)
TYPE_N = {}
for s in SETS:
    TYPE_N[s['type']] = TYPE_N.get(s['type'], 0) + 1
assert TYPE_N == {'list': 25, 'text': 15, 'mixed': 10}, TYPE_N


# ---------------------------------------------------------------- targets via the app's own basic-word list
def is_common_fn():
    """returns f(list_of_tokens)->list_of_bool, reading V20.COMMON / V20.fold from the frozen build"""
    import os
    app = os.environ.get('WQ33_APP')
    assert app, 'WQ33_APP (frozen build) is required to read V20.COMMON'
    from playwright.sync_api import sync_playwright
    cache = HERE / 'common_words.json'
    with sync_playwright() as p:
        import lib37 as L
        b, ctx, pg, errs = L.open_page(p, 390, 844, True)
        L.register(pg, 'buildsets', '小明')
        words = L.ev(pg, "JSON.stringify([...V20.COMMON])")
        folds = L.ev(pg, "JSON.stringify(['Didn’t','don\\'t','Mr.','T-shirt','ICE-CREAM'].map(w=>V20.fold(w)))")
        b.close()
    data = {'common': json.loads(words), 'fold_probe': json.loads(folds)}
    cache.write_text(json.dumps(data, ensure_ascii=False))
    return data


TOK = re.compile(r"[A-Za-z]+(?:['’\-][A-Za-z]+)*")


def fold(w):
    return re.sub(r"[’‘`]", "'", w).lower()


def content_words(text, proper, common):
    pn = {fold(x) for x in proper}
    seen, out = set(), []
    for m in TOK.finditer(text):
        t = m.group(0)
        k = fold(t)
        letters = len(re.findall(r'[A-Za-z]', t))
        if letters < 3 or k in common or k in pn or k.split("'")[0] in pn and k.endswith("'s"):
            continue
        if k in seen:
            continue
        seen.add(k)
        out.append(t)
    return out


def main():
    cd = is_common_fn()
    common = {fold(w) for w in cd['common']}
    index = []
    for n, s in enumerate(SETS, 1):
        sid = '%02d_%s' % (n, s['slug'])
        tg = list(s['list_items'])
        if s['rule_text']:
            have = {fold(x) for x in tg}
            for w in content_words(s['rule_text'], s['proper_nouns'], common):
                if fold(w) not in have:
                    tg.append(w)
                    have.add(fold(w))
        d = dict(id=sid, type=s['type'], title=s['title'], source_url=s['source_url'], licence=s['licence'], level=s['level'],
                 raw_text=s['raw_text'], photo_text=s['photo_text'] or s['raw_text'], targets=tg, target_zh=s['zh'],
                 proper_nouns=s['proper_nouns'], notes=s['notes'],
                 target_rule=('all list items' if s['type'] == 'list' else 'list items + content words (>=3 letters, not V20.COMMON, not a name)'))
        (OUT / (sid + '.json')).write_text(json.dumps(d, ensure_ascii=False, indent=1))
        index.append((sid, s['type'], s['level'], len(tg)))
    print(len(index), 'sets written')
    for r in index:
        print(*r)


if __name__ == '__main__':
    main()
