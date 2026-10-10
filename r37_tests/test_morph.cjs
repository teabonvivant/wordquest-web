'use strict';
/* WQMorph (r37_src/s55_morph.js) against the real built-in dictionary.
 *   node r37_tests/test_morph.cjs            (reads app/index.html, or $WQ33_APP, for window.WQ_SHARED_REFERENCE)
 * Prints "test_morph: x/y" and exits 1 on any failure. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const M = require(path.join(ROOT, 'r37_src', 's55_morph.js'));

/* ---- dictionary: same shape as v20Dictionary (fold(key) -> entry) ------------------------------------------------- */
const fold = s => String(s ?? '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/[‐‑]/g, '-').trim().replace(/\s+/g, ' ').toLowerCase();
const appPath = process.env.WQ33_APP || path.join(ROOT, 'app', 'index.html');
const html = fs.readFileSync(appPath, 'utf8');
const at = html.indexOf('window.WQ_SHARED_REFERENCE=');
if (at < 0) { console.error('WQ_SHARED_REFERENCE not found in ' + appPath); process.exit(1); }
const from = at + 'window.WQ_SHARED_REFERENCE='.length;
const entries = JSON.parse(html.slice(from, html.indexOf('</script>', from)).trim().replace(/;$/, ''));
const dict = new Map();
for (const e of entries) if (e && e.key) dict.set(fold(e.key), e);
const has = k => dict.has(k);
const pos = k => { const e = dict.get(k); return e ? [...new Set((e.senses || []).map(s => s.pos))] : null; };

let n = 0, bad = 0;
const fail = m => { bad++; console.log('  FAIL ' + m); };
const check = (cond, m) => { n++; if (!cond) fail(m); };
const show = r => r ? `${r.base}|${r.form}|${r.derived ? 'derived' : 'same'}` : 'null';

/* ---- positives: [word, base, form] (form code, see header of s55_morph.js; derived words end with '*') ---------------- */
const CASES = {
  'plural -s': [['books', 'book'], ['pencils', 'pencil'], ['cats', 'cat'], ['dogs', 'dog'], ['apples', 'apple'], ['schools', 'school'],
    ['friends', 'friend'], ['bags', 'bag'], ['hands', 'hand'], ['flowers', 'flower'], ['elephants', 'elephant'], ['monkeys', 'monkey']],
  'plural -es': [['boxes', 'box'], ['buses', 'bus'], ['dishes', 'dish'], ['classes', 'class'], ['foxes', 'fox'], ['potatoes', 'potato'],
    ['tomatoes', 'tomato'], ['heroes', 'hero'], ['watches', 'watch'], ['washes', 'wash']],
  'plural -ies/-ves': [['babies', 'baby'], ['cities', 'city'], ['stories', 'story'], ['flies', 'fly'], ['families', 'family'],
    ['countries', 'country'], ['knives', 'knife'], ['wolves', 'wolf'], ['wives', 'wife'], ['shelves', 'shelf'], ['halves', 'half']],
  'third person': [['goes', 'go', 'third'], ['does', 'do', 'third'], ['has', 'have', 'third'], ['plays', 'play', 'third'], ['runs', 'run', 'third'],
    ['studies', 'study', 'third'], ['carries', 'carry', 'third'], ['tries', 'try', 'third'], ['teaches', 'teach', 'third'], ['is', 'be', 'third']],
  'past / pp regular': [['played', 'play'], ['liked', 'like'], ['stopped', 'stop'], ['cried', 'cry'], ['walked', 'walk'], ['helped', 'help'],
    ['planned', 'plan'], ['opened', 'open'], ['danced', 'dance'], ['tried', 'try'], ['carried', 'carry'], ['waited', 'wait'], ['wanted', 'want'],
    ['studied', 'study'], ['hated', 'hate'], ['cooked', 'cook'], ['labeled', 'label'], ['cancelled', 'cancel']],
  'irregular verbs': [['went', 'go', 'past'], ['gone', 'go', 'pp'], ['ate', 'eat', 'past'], ['eaten', 'eat', 'pp'], ['ran', 'run', 'past'],
    ['knew', 'know', 'past'], ['seen', 'see', 'pp'], ['took', 'take', 'past'], ['taken', 'take', 'pp'], ['was', 'be', 'past'], ['were', 'be', 'past'],
    ['been', 'be', 'pp'], ['had', 'have'], ['did', 'do', 'past'], ['done', 'do', 'pp'], ['made', 'make'], ['came', 'come', 'past'],
    ['got', 'get'], ['gotten', 'get', 'pp'], ['gave', 'give', 'past'], ['given', 'give', 'pp'], ['bought', 'buy'], ['brought', 'bring'],
    ['thought', 'think'], ['caught', 'catch'], ['taught', 'teach'], ['swam', 'swim', 'past'], ['swum', 'swim', 'pp'], ['drank', 'drink', 'past'],
    ['drunk', 'drink', 'pp'], ['wrote', 'write', 'past'], ['written', 'write', 'pp'], ['understood', 'understand']],
  '-ing': [['making', 'make', 'ing'], ['jumping', 'jump', 'ing'], ['shopping', 'shop', 'ing'], ['sitting', 'sit', 'ing'], ['playing', 'play', 'ing'],
    ['studying', 'study', 'ing'], ['dancing', 'dance', 'ing'], ['hoping', 'hope', 'ing'], ['hopping', 'hop', 'ing'], ['having', 'have', 'ing'],
    ['doing', 'do', 'ing'], ['eating', 'eat', 'ing'], ['flying', 'fly', 'ing'], ['being', 'be', 'ing'], ['going', 'go', 'ing'],
    ['cooking', 'cook', 'ing'], ['teaching', 'teach', 'ing'], ['travelling', 'travel', 'ing']],
  'comparative / superlative': [['bigger', 'big', 'comp'], ['biggest', 'big', 'sup'], ['happier', 'happy', 'comp'], ['happiest', 'happy', 'sup'],
    ['taller', 'tall', 'comp'], ['tallest', 'tall', 'sup'], ['faster', 'fast', 'comp'], ['fastest', 'fast', 'sup'], ['older', 'old', 'comp'],
    ['oldest', 'old', 'sup'], ['hotter', 'hot', 'comp'], ['hottest', 'hot', 'sup'], ['easier', 'easy', 'comp'], ['easiest', 'easy', 'sup'],
    ['busier', 'busy', 'comp'], ['furthest', 'far', 'sup'], ['least', 'little', 'sup'], ['cheaper', 'cheap', 'comp']],
  'irregular plural': [['men', 'man', 'plural'], ['women', 'woman', 'plural'], ['snowmen', 'snowman', 'plural'], ['postmen', 'postman', 'plural'],
    ['mice', 'mouse', 'plural'], ['geese', 'goose', 'plural'], ['bacteria', 'bacterium', 'plural'], ['hooves', 'hoof', 'plural']],
  'possessive': [["teacher's", 'teacher', 'poss'], ["dog's", 'dog', 'poss'], ["teachers'", 'teacher', 'poss'], ["mother's", 'mother', 'poss'],
    ["friend's", 'friend', 'poss'], ["students'", 'student', 'poss'], ["colour's", 'colour', 'poss'], ["museum's", 'museum', 'poss']],
  'British / American spelling': [['color', 'colour', 'spelling'], ['colors', 'colour'], ['favorite', 'favourite', 'spelling'], ['center', 'centre', 'spelling'],
    ['centers', 'centre'], ['gray', 'grey', 'spelling'], ['mom', 'mum', 'spelling'], ['theater', 'theatre', 'spelling'], ['organize', 'organise', 'spelling'],
    ['realize', 'realise', 'spelling'], ['neighbor', 'neighbour', 'spelling'], ['behavior', 'behaviour', 'spelling'], ['traveled', 'travel'],
    ['coloured', 'colour'], ['organizing', 'organise', 'ing'], ['colorful', 'colour', 'adj*']],
  'spacing / hyphen / join': [['ice-cream', 'ice cream', 'variant'], ['icecream', 'ice cream', 'variant'], ['Ice-Cream', 'ice cream', 'variant'],
    ['ebook', 'e-book', 'variant'], ['e-mail', 'email', 'variant'], ['tshirt', 't-shirt', 'variant'], ['hotdog', 'hot dog', 'variant'],
    ['hotdogs', 'hot dog', 'plural']],
  'contractions': [["don't", 'do', 'contraction'], ["can't", 'can', 'contraction'], ["isn't", 'be', 'contraction'], ["I'm", 'be', 'contraction'],
    ["it's", 'it', 'contraction'], ["that's", 'that', 'contraction'], ["let's", 'let', 'contraction'], ["won't", 'will', 'contraction'],
    ["they're", 'they', 'contraction'], ["I've", 'have', 'contraction'], ["I'll", 'will', 'contraction'], ["couldn't", 'could', 'contraction'],
    ['cannot', 'can', 'contraction'], ['dont', 'do', 'contraction']],
  'case / apostrophe / spaces': [['BOOKS', 'book'], [' books ', 'book'], ['Books', 'book'], ['don’t', 'do', 'contraction'], ['Teacher’s', 'teacher', 'poss'],
    ['  school   bags ', 'school bag']],
  'punctuation / numbering / articles': [['books,', 'book', 'plural'], ['1. books', 'book', 'plural'], ['"books"', 'book', 'plural'], ['book.', 'book', 'variant'],
    ['(ran)', 'run', 'past'], ['a book', 'book', 'variant'], ['an apple', 'apple', 'variant'], ['the books', 'book', 'plural'], ['to run', 'run', 'variant'],
    ['a pencils', 'pencil', 'plural'], ["•  school bags", 'school bag', 'plural']],
  'phrases': [['took off', 'take off'], ['school bags', 'school bag'], ['looked after', 'look after'], ['got up', 'get up'], ['woke up', 'wake up']],
  'derived (hint only)': [['gently', 'gentle', 'adv*'], ['carelessly', 'careless', 'adv*'], ['helpfully', 'helpful', 'adv*'], ['darkness', 'dark', 'noun*'],
    ['unhappy', 'happy', 'antonym*'], ['unhappily', 'happily', 'antonym*'], ['replay', 'play', 'redo*'], ['rewrite', 'write', 'redo*'],
    ['retry', 'try', 'redo*'], ['redo', 'do', 'redo*'], ['beautifully', 'beautiful', 'adv*'], ['homeless', 'home', 'adj*'],
    ['carefulness', 'careful', 'noun*'], ['kindly', 'kind', 'adv*'], ['untidy', 'tidy', 'antonym*'], ['hopeless', 'hope', 'adj*'], ['badly', 'bad', 'adv*']],
};
let positives = 0;
for (const [cat, rows] of Object.entries(CASES)) {
  let ok = 0;
  for (const [w, base, f] of rows) {
    positives++;
    const r = M.analyse(w, has, pos);
    let good = !!r && r.base === base;
    if (good && f) {
      const star = f.endsWith('*'), code = star ? f.slice(0, -1) : f;
      good = r.form === code && r.derived === star;
    }
    if (good && !has(base)) good = false;
    if (good && !(r.label && /[一-鿿]/.test(r.label))) good = false;
    if (good && !f) good = r.derived === false || /\*/.test(f || '');
    n++;
    if (good) ok++; else fail(`${cat}: ${JSON.stringify(w)} -> ${show(r)}, expected ${base}${f ? ' ' + f : ''}`);
  }
  CASES[cat].ok = ok;
}
check(positives >= 150, `at least 150 positive cases (have ${positives})`);
for (const [cat, rows] of Object.entries(CASES)) check(rows.length >= 5, `category "${cat}" has enough cases`);
for (const cat of ['plural -s', 'plural -es', 'plural -ies/-ves', 'third person', 'past / pp regular', 'irregular verbs', '-ing', 'comparative / superlative',
  'irregular plural', 'possessive', 'British / American spelling', 'spacing / hyphen / join', 'contractions', 'derived (hint only)', 'punctuation / numbering / articles'])
  check(CASES[cat].length >= 8, `category "${cat}" has >= 8 cases`);

/* ---- labels ----------------------------------------------------------------------------------------------------- */
const LABELS = [['went', '過去式'], ['gone', '過去分詞'], ['played', '過去式／過去分詞'], ['making', '進行式'], ['bigger', '比較級'], ['biggest', '最高級'],
  ["teacher's", '所有格'], ['color', '英式／美式串法'], ['icecream', '另一寫法'], ["don't", '縮寫'], ['goes', '第三人稱'], ['mice', '複數'],
  ['books', '複數'], ['gently', '副詞'], ['darkness', '名詞'], ['hopeless', '形容詞'], ['unhappy', '反義'], ['replay', '重做']];
for (const [w, l] of LABELS) { const r = M.analyse(w, has, pos); check(!!r && r.label.includes(l), `label of ${w}: ${r && r.label} should contain ${l}`); }
// without a pos callback the -s label stays honest about the ambiguity but still names both readings
{ const r = M.analyse('books', has); check(r && r.base === 'book' && /複數/.test(r.label), 'books without posOf'); }

/* ---- negatives: never split a real word wrongly -------------------------------------------------------------------- */
const NEG = ['bus', 'news', 'this', 'his', 'thing', 'during', 'morning', 'evening', 'ceiling', 'king', 'ring', 'sing', 'bring', 'red', 'bed', 'need',
  'feed', 'seed', 'sheep', 'fish', 'always', 'series', 'maths', 'physics', 'glasses', 'wednesday', 'bless', 'less', 'dress', 'class', 'boss',
  'business', 'witness', 'princess', 'across', 'glass', 'grass', 'pass', 'gas', 'yes', 'lens', 'christmas', 'species', 'means', 'sunday', 'hundred',
  'sacred', 'naked', 'number', 'water', 'paper', 'letter', 'dinner', 'summer', 'winter', 'hammer', 'sister', 'finger', 'river', 'silver', 'under',
  'after', 'offer', 'never', 'forest', 'honest', 'interest', 'test', 'west', 'guest', 'only', 'family', 'apply', 'reply', 'early', 'awful',
  'unless', 'unit', 'union', 'uncle', 'until', 'university', 'return', 'remember', 'report', 'repeat', 'receive', 'record', 'reason', 'read', 'real',
  'ready', 'rest', 'result', 'reach', 'repair', 'its', 'hers', 'ours', 'yours', 'theirs', 'sibling', 'pudding', 'wedding', 'shoulder', 'blorp', 'xyzzy',
  'qwerty', 'a', 'i', '__', '123', '', '   ', "'", 'ing', 'ed', 'es'];
let negOk = 0;
for (const w of NEG) {
  const r = M.analyse(w, has, pos);
  // allowed: null, or (for words that are *really* an inflection of a dictionary word) a derived hint - never a "same word" hit
  const good = r === null || (r.derived === true && !has(fold(w)));
  n++;
  if (good) negOk++; else fail(`negative: ${JSON.stringify(w)} -> ${show(r)} (expected null)`);
}
check(NEG.length >= 40, 'at least 40 negatives');
// unlike the loop above: these must be strictly null (not even a hint)
for (const w of ['thing', 'king', 'ring', 'evening', 'morning', 'ceiling', 'business', 'witness', 'bus', 'news', 'this', 'his', 'always', 'series',
  'united_x', 'unit', 'union', 'uncle', 'until', 'under', 'return', 'remember', 'report', 'dress', 'class', 'boss', 'bless', 'less', 'wednesday']) {
  const r = M.analyse(w, has, pos); check(r === null, `strict null: ${w} -> ${show(r)}`);
}
// documented correct decompositions of function words that are not in the dictionary
for (const [w, b] of [['is', 'be'], ['was', 'be'], ['has', 'have'], ['are', 'be'], ['am', 'be'], ['were', 'be']]) {
  const r = M.analyse(w, has, pos); check(r && r.base === b && !r.derived, `${w} -> ${b}`);
}
// questionable ones are reported, not asserted
const REPORT = ['united', 'unlike', 'everyday', 'turnover', 'maybe', 'alot', 'cleaner', 'teacher', 'shorts', 'goods', 'sweets', 'bowling', 'building',
  'meeting', 'painting', 'tired', 'bored', 'boring', 'friendly', 'lovely', 'hardly', 'nearly', 'thanks', 'ones', 'others', 'unlock', 'recycle'];
console.log('questionable (info): ' + REPORT.map(w => `${w}->${show(M.analyse(w, has, pos))}`).join('  '));

/* ---- the dictionary itself: every key is a direct hit, so analyse must return null ----------------------------------- */
{
  let bad2 = 0, keys = 0;
  for (const k of dict.keys()) { keys++; if (M.analyse(k, has, pos) !== null) { bad2++; if (bad2 < 6) fail('dictionary key analysed: ' + k); } }
  n++; if (bad2) fail(`${bad2} dictionary keys were not null`);
  check(keys >= 6000, `dictionary has ${keys} keys`);
}
// leave-one-out: remove one headword at a time. A word that is only ever *listed* in the dictionary (not an inflection) must not be
// decomposed into an unrelated one. Allowed hits are real inflections / derivations; the unacceptable ones are listed here.
{
  const forbidden = new Set(['seed', 'shoulder', 'bored', 'thing', 'king', 'ring', 'sing', 'bring', 'evening', 'morning', 'ceiling', 'during', 'business',
    'witness', 'class', 'dress', 'bless', 'boss', 'bus', 'news', 'this', 'his', 'always', 'sheep', 'fish', 'series', 'glasses', 'wednesday', 'dinner',
    'summer', 'winter', 'paper', 'water', 'number', 'letter', 'under', 'return', 'remember', 'report', 'repeat', 'record', 'result', 'forest',
    'honest', 'interest', 'family', 'apply', 'reply', 'early', 'unit', 'union', 'uncle', 'until', 'university', 'recall', 'goods', 'shorts']);
  const hits = [];
  for (const k of dict.keys()) {
    if (/[ \-.?]/.test(k)) continue;
    const r = M.analyse(k, x => x !== k && has(x), pos);
    if (r) hits.push([k, r]);
  }
  for (const w of forbidden) {
    if (!dict.has(w)) continue;
    const r = M.analyse(w, x => x !== w && has(x), pos);
    check(r === null, `leave-one-out: ${w} -> ${show(r)}`);
  }
  check(hits.length < 400, `leave-one-out hit count sane (${hits.length})`);
  console.log(`leave-one-out: ${hits.length} of ${dict.size} headwords would be read as a form of another headword (inflections / derivations)`);
}

/* ---- tables & robustness --------------------------------------------------------------------------------------- */
check(M.IRREGULAR_VERB_ROWS >= 120, `irregular verb table has ${M.IRREGULAR_VERB_ROWS} rows (>= 120)`);
check(M.analyse(null, has) === null && M.analyse(undefined, has) === null && M.analyse(42, has) === null, 'non-string input');
check(M.analyse('x'.repeat(500), has) === null, 'very long input');
check(M.analyse('books') === null, 'no dictionary callback -> null');
check(M.analyse('books', new Set(['book'])).base === 'book', 'Set accepted as dictionary');
check(M.analyse('books', k => k === 'book').base === 'book', 'plain has() accepted');
check(M.analyse('Tom\'s', k => k !== 'tom' && has(k)) === null, "Tom's with tom absent is null");
check(M.analyse('Tom\'s', k => k === 'tom').base === 'tom', "Tom's with tom present");
check(M.analyse('wolves', k => k === 'wolf').base === 'wolf', 'wolves');
check(M.analyse('lying', k => k === 'lie').base === 'lie', 'lying -> lie');
check(M.analyse('dying', k => k === 'die').base === 'die', 'dying -> die');
check(M.analyse('hoping', k => k === 'hop') === null, 'hoping never becomes hop');
check(M.analyse('hopping', k => k === 'hope') === null, 'hopping never becomes hope');
check(M.analyse('teacher', k => k === 'teach') === null || M.analyse('teacher', k => k === 'teach').derived, 'teacher is not a comparative of teach');
check(M.analyse('teachers', k => k === 'teacher').base === 'teacher', 'teachers');

/* ---- sameWord ----------------------------------------------------------------------------------------------------- */
const SAME = [['book', 'books'], ['books', 'book'], ['run', 'ran'], ['ran', 'running'], ['go', 'went'], ['gone', 'went'], ['color', 'colour'],
  ['colours', 'color'], ['ice cream', 'ice-cream'], ['icecream', 'ice cream'], ['child', 'child'], ['big', 'bigger'], ['biggest', 'bigger'],
  ['Book', 'BOOKS'], ['blorp', 'blorps'], ['blorp', 'blorped'], ['happy', 'happier'], ['teacher', "teacher's"], ['do', "don't"], ['is', 'was']];
for (const [a, b] of SAME) check(M.sameWord(a, b, has, pos) === true, `sameWord(${a}, ${b})`);
const DIFF = [['quick', 'quickly'], ['book', 'boot'], ['bus', 'busy'], ['sing', 'song'], ['thing', 'this'], ['care', 'careless'], ['happy', 'unhappy'],
  ['read', 'ready'], ['man', 'many'], ['', 'book'], ['cat', 'cats_dog'], ['teach', 'teacher'], ['light', 'night'], ['in', 'on'], ['glass', 'glasses'], ['child', 'children'], ['people', 'person']];
for (const [a, b] of DIFF) check(M.sameWord(a, b, has, pos) === false, `not sameWord(${a}, ${b})`);

console.log(`${bad ? 'FAILED ' : ''}test_morph: ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
