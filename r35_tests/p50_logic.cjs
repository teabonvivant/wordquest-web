/* R3.5 p50 pure-logic tests (node + vm, no browser): maths answer display, answer cleaning, template wording.
 *
 *   WQ33_APP=/path/to/app/index.html node r35_tests/p50_logic.cjs
 *
 * Loads the maths scripts of the built page into a vm (same approach as r3_tests/content_generate.cjs) and drives the
 * real WQMathCore: generate() builds the questions, mark() is the grader the app uses.
 * Output follows the Checker convention of the Python suites: "PASS|FAIL [B] name | detail" then one SUMMARY line.
 * A [B] check must FAIL on the R3.4 base build and PASS on the new build; every other check passes on both.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(process.env.WQ33_APP || path.join(__dirname, '../app/index.html'));
const html = fs.readFileSync(APP, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]);
const ctx = { console, structuredClone }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const code of scripts) {
  if (code.includes('globalThis.WQMathCSS=') || code.includes('const ext=') || code.includes('WordQuest Maths 0.1.2 — deterministic')) vm.runInContext(code, ctx);
}
const C = ctx.WQMathCore, L = C.library(ctx.WQMathData);

// ---- tiny Checker -------------------------------------------------------------------------------------------------
const TITLE = 'p50 maths logic', rows = [], t0 = Date.now();
console.log(`# ${TITLE}  app=${APP}`);
function check(name, ok, detail = '', base = false) {
  ok = !!ok; rows.push([name, ok, base]);
  console.log(`${ok ? 'PASS' : 'FAIL'}${base ? ' [B]' : ''} ${name}${detail !== '' ? ' | ' + detail : ''}`);
}
function finish() {
  const total = rows.length, passed = rows.filter(r => r[1]).length;
  const failB = rows.filter(r => !r[1] && r[2]).length, failOther = rows.filter(r => !r[1] && !r[2]).length;
  console.log(`SUMMARY ${TITLE}: ${passed}/${total} passed; failed [B] (expected on R3.4 base) = ${failB}; failed other = ${failOther}; ${Math.round((Date.now() - t0) / 1000)}s`);
  process.exit(passed === total ? 0 : 1);
}

// ---- helpers ------------------------------------------------------------------------------------------------------
const AUDIT_SEEDS = Array.from({ length: 40 }, (_, k) => (Math.imul(k, 2654435761) + 12345) >>> 0);   // same seeds as the audit sampling
const EDGE_SEEDS = [0, 1, 2, 7, 31, 997, 65535, 1234567, 2147483647, 4294967295];
const SKILLS_24 = ['4N7.R3', '4N8.R3', '5N4.R3', '6M3.R3', '6M5.R3', '6N2.R3', '6N3.R3', '6N4.R3'];
const IDS_24 = SKILLS_24.flatMap(s => ['T1', 'T2', 'T3'].map(t => `${s}-${t}`));
function gen(id, seed) { try { return C.generate(L, id, seed); } catch (_) { return null; } }
function infix(a) { if (a[0] === 'num') return '(' + a[1] + ')'; if (a[0] === 'var') return a[1]; if (a[0] === 'neg') return '-(' + infix(a[1]) + ')'; if (a[0] === 'floor') return 'floor(' + infix(a[1]) + ')'; return '(' + infix(a[1]) + a[0] + infix(a[2]) + ')'; }
// What the app shows as the corrected answer: displayAnswer when the build provides it, otherwise the exact fraction (R3.4 behaviour).
const shown = q => (q.displayAnswer !== undefined ? q.displayAnswer : q.answer);
function gradeInput(q, value) { return C.mark(q, { value, unit: q.unit || '', remainder: q.remainder || '0', expression: q.process ? infix(q.process) : '' }); }
const accepted = (q, value) => { const r = gradeInput(q, value); return r.valid && r.correct; };
function allQuestions(ids, seeds) { const out = []; for (const id of ids) for (const s of seeds) { const q = gen(id, s); if (q) out.push(q); } return out; }
function sample(list, n = 3) { return list.slice(0, n).map(x => JSON.stringify(x)).join(' ; '); }
const ALL_IDS = [...L.templates.keys()];
// Unit the stem asks for, worked out here (independent of the build): the last 「多少X」 / 「幾X」 in the Chinese stem.
const UNIT_RE = /(?:多少|幾)\s*(公里\s*[／/]\s*小時|平方厘米|立方厘米|厘米|毫米|公里|公斤|毫升|升|克|米|元|分鐘|小時|度|個|粒|本|人|條|件|張|輛|隻|枝|對|種)/g;
function stemUnit(q) { let u = ''; for (const m of String(q.stem_zh).matchAll(UNIT_RE)) u = m[1].replace(/\s+/g, '').replace('/', '／'); return u; }
const unitOf = q => q.unit || stemUnit(q);

// ======================================================================================================================
// A. M-003 / M-004: the corrected answer follows the format the question asks for, and the grader accepts it
// ======================================================================================================================
const q24 = allQuestions(IDS_24, AUDIT_SEEDS);
check('A1 the 24 affected templates (8 skills x T1-T3) generate 40 questions each', q24.length === 960 && IDS_24.every(id => L.templates.has(id)), `${q24.length} questions`);
{
  const bad = q24.filter(q => !accepted(q, shown(q)));
  check('A2 every displayed corrected answer is accepted by the grader (960 questions)', bad.length === 0, `${bad.length} rejected; e.g. ${sample(bad.map(q => [q.id, shown(q), gradeInput(q, shown(q)).message]), 2)}`, true);
}
{
  const bad = q24.filter(q => String(shown(q)).includes('/'));
  check('A3 a decimal / money / measure question never shows a fraction as its answer', bad.length === 0, `${bad.length} show a fraction; e.g. ${sample(bad.map(q => [q.id, shown(q)]), 3)}`, true);
}
{
  const dec = q24.filter(q => /^(4N7|4N8|5N4|6M3|6M5|6N2|6N3|6N4)\./.test(q.templateId));
  const okFmt = q => /^-?\d+(\.\d+)?$/.test(String(shown(q)));
  const bad = dec.filter(q => !okFmt(q));
  check('A4 displayed answer is a plain integer or decimal (no trailing zeros are invented)', bad.length === 0 && dec.every(q => !/\.\d*0$/.test(String(shown(q)))), `${bad.length} bad; e.g. ${sample(bad.map(q => [q.id, shown(q)]), 3)}`, true);
}
{
  const units = { '6N4.R3': '元', '6M3.R3': '厘米', '6M5.R3': '平方厘米' };
  const bad = [];
  for (const q of q24) { const u = units[q.skill]; if (u && (q.displayUnit !== u || !q.stem_zh.includes(u))) bad.push([q.id, q.displayUnit]); }
  check('A5 money / circumference / area answers carry the unit the stem asks for (元, 厘米, 平方厘米)', bad.length === 0, `${bad.length} without; e.g. ${sample(bad, 2)}`, true);
}
{
  // a student who copies "答案 單位" from the correction (e.g. 52.5 元) must be accepted
  const bad = q24.filter(q => unitOf(q) && !accepted(q, `${shown(q)} ${unitOf(q)}`));
  check('A6 copying the corrected answer together with its unit (52.5 元) is accepted', bad.length === 0, `${bad.length} rejected; e.g. ${sample(bad.map(q => [q.id, shown(q), q.displayUnit]), 2)}`, true);
}
{
  const bad = q24.filter(q => {
    const m = q.explanation.match(/答案是\s*([^。]+)。/); if (!m) return false;
    const want = shown(q) + (q.displayUnit && !q.unit ? ' ' + q.displayUnit : '');
    return m[1].trim() !== want;
  });
  const lead = q24.filter(q => /答案是\s*[^。]*\d+\/\d+/.test(q.explanation));
  check('A7 the explanation ("答案是 …") uses the displayed form, not the fraction', bad.length === 0 && lead.length === 0, `${bad.length} differ, ${lead.length} with fraction; e.g. ${sample(bad.map(q => [q.id, q.explanation.slice(-24), shown(q)]), 2)}`, true);
}
{
  const rec = allQuestions(['6D1.R3-T1', '6D1.R3-T2', '6D1.R3-T3'], AUDIT_SEEDS).filter(q => q.answer.includes('/'));
  check('A8 recurring decimals (6D1 averages like 23/3) fall back to the exact fraction and are accepted', rec.length > 0 && rec.every(q => shown(q) === q.answer && accepted(q, shown(q))), `${rec.length} recurring questions`);
}
{
  const all = allQuestions(ALL_IDS, [...EDGE_SEEDS, ...AUDIT_SEEDS.slice(0, 10)]);
  // the exact answer, written in a format the question allows (same rule as r3_tests/content_generate.cjs)
  const canon = q => { let v = q.answer; if (!q.formats.includes('fraction') && v.includes('/')) { const [n, d] = v.split('/').map(Number); v = String(n / d); } if (q.formats.length === 1 && q.formats[0] === 'fraction' && !v.includes('/')) v += '/1'; return v; };
  const bad = all.filter(q => !accepted(q, canon(q)));
  check('A9 the exact answer, written in an allowed format, is accepted for all templates (marking unchanged)', bad.length === 0, `${all.length} questions, ${bad.length} rejected; e.g. ${sample(bad.map(q => q.id), 3)}`);
  const bad2 = all.filter(q => !accepted(q, shown(q)));
  check('A10 the displayed corrected answer is accepted for ALL templates', bad2.length === 0, `${all.length} questions, ${bad2.length} rejected; e.g. ${sample(bad2.map(q => [q.id, shown(q)]), 3)}`, true);
  const changed = all.filter(q => shown(q) !== q.answer && !SKILLS_24.includes(q.skill));
  check('A11 templates outside the 8 affected skills keep the exact displayed answer', changed.length === 0, `${changed.length} changed; e.g. ${sample(changed.map(q => [q.id, shown(q), q.answer]), 3)}`);
  // answers, formats and choice keys must be byte-identical to R3.4 (hash taken on the R3.4 base build)
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const sig = fnv(all.map(q => [q.id, q.type, q.answer, JSON.stringify(q.formats), q.remainder, q.choices.map(c => c.value + ':' + c.code).join(',')].join('|')).join('\n'));
  check('A12 answers, formats and option keys of all generated questions are identical to R3.4', sig === '196770cf', `${all.length} questions, signature ${sig}`);
}

// ======================================================================================================================
// B. M-011: unit text, 又 and targeted messages
// ======================================================================================================================
function pick(unit, pred = () => true) {
  for (const id of ALL_IDS) { for (const s of [1, 2, 3, 4, 5]) { const q = gen(id, s); if (q && q.type === 'number' && unitOf(q) === unit && !q.answer.includes('/') && pred(q)) return q; } }
  return null;
}
const qa = { 個: pick('個'), 厘米: pick('厘米'), 元: pick('元'), 平方厘米: pick('平方厘米'), 公斤: pick('克'), 速率: pick('公里／小時') };
check('B0 sample questions with a unit exist', Object.values(qa).every(Boolean), Object.entries(qa).map(([k, q]) => k + '=' + (q && q.id)).join(' '));
if (!Object.values(qa).every(Boolean)) finish();
{
  const q = qa.個, a = q.answer;
  for (const [form, v] of [['7 個', `${a} 個`], ['7個', `${a}個`]]) check(`B1 "${form}" style: unit that matches the question is ignored (個)`, accepted(q, v), `${q.id} answer ${a}; "${v}" -> ${gradeInput(q, v).message || 'ok'}`, true);
}
{
  const q = qa.厘米, a = q.answer;
  for (const u of ['厘米', ' 厘米', 'cm', ' cm', 'CM', '公分']) check(`B2 "${a}${u}" accepted on a 厘米 question`, accepted(q, `${a}${u}`), `${q.id}`, true);
}
{
  const q = qa.元, a = q.answer;
  for (const v of [`${a}元`, `${a} 元`, `$${a}`, `HK$${a}`, `${a} 港元`]) check(`B3 "${v}" accepted on a 元 question`, accepted(q, v), `${q.id}`, true);
}
{
  const q = qa.平方厘米, a = q.answer;
  for (const v of [`${a} 平方厘米`, `${a}cm2`, `${a} cm²`]) check(`B4 "${v}" accepted on a 平方厘米 question`, accepted(q, v), `${q.id}`, true);
  const sp = qa.速率; check('B4b "30 公里／小時" style (compound unit) accepted on a speed question', accepted(sp, `${sp.answer} 公里／小時`) && accepted(sp, `${sp.answer}km/h`), `${sp.id}`, true);
}
{
  // a number with the right unit but the wrong value is graded as wrong (valid), not rejected as a format problem
  const q = qa.個, wrong = String(Number(q.answer) + 1) + ' 個', r = gradeInput(q, wrong);
  check('B5 a wrong number with the right unit is marked wrong, not "invalid format"', r.valid === true && r.correct === false, JSON.stringify({ valid: r.valid, correct: r.correct }), true);
}
{
  // negatives: a wrong unit is never silently accepted and gets a plain hint
  const q = qa.厘米, a = q.answer;
  const cases = [`${a} kg`, `${a}個`, `${a} 元`, `${a}m`, `${a} 平方厘米`, `${a}克`];
  const results = cases.map(v => [v, gradeInput(q, v)]);
  check('B6 wrong units (kg, 個, 元, m, 平方厘米, 克) on a 厘米 question are not accepted', results.every(([, r]) => !(r.valid && r.correct)), results.map(([v, r]) => `${v}:${r.valid ? 'valid' : 'invalid'}/${r.correct}`).join(' '));
  check('B7 a wrong unit gets a plain hint that names the unit and says to write only the number', results.every(([, r]) => r.valid === false && /單位/.test(r.message) && /只填數字/.test(r.message) && r.message.includes('厘米')), results[0][1].message, true);
  const m = gradeInput(q, `${a} kg`).message;
  check('B7b the hint says why and what to do next in plain zh-HK', m === '單位不對，這題的單位是厘米。只填數字，單位不用寫。', m, true);
  const noUnit = C.mark({ ...q, unit: '', unitHint: '', displayUnit: '', stem_zh: '一共有多少？' }, { value: `${a} 個` });
  check('B8 a unit on a question with no unit says "只填數字，單位不用寫。"', noUnit.valid === false && noUnit.message === '只填數字，單位不用寫。', noUnit.message, true);
  const hk = C.mark({ ...q, unit: '', unitHint: '', displayUnit: '', stem_zh: '一共有多少？' }, { value: `HK$${a}` });
  check('B8b "HK$" on a question that is not about money is not accepted', hk.valid === false, hk.message);
  check('B9 a plain number, with or without spaces, is still accepted', accepted(q, a) && accepted(q, ` ${a} `) && accepted(q, `+${a}`), `${q.id}`);
  check('B9b a plain wrong number is marked wrong (valid, not correct)', (() => { const r = gradeInput(q, String(Number(a) + 3)); return r.valid && !r.correct; })());
}
{
  // mixed numbers
  const mix = [];
  for (const id of ALL_IDS) { const q = gen(id, 12345); if (q && q.formats.includes('fraction') && q.answer.includes('/')) { const [n, d] = q.answer.split('/').map(Number); if (n > d) mix.push(q); } }
  const bad = [], bad2 = [];
  for (const q of mix) {
    const [n, d] = q.answer.split('/').map(Number), w = Math.floor(n / d), r = n % d;
    if (r === 0) continue;
    if (!accepted(q, `${w}又${r}/${d}`)) bad.push([q.id, `${w}又${r}/${d}`]);
    if (!accepted(q, `${w} 又 ${r}/${d}`)) bad2.push([q.id, `${w} 又 ${r}/${d}`]);
  }
  check('B10 "4又3/10" is accepted as a mixed number', mix.length > 0 && bad.length === 0 && bad2.length === 0, `${mix.length} improper-fraction answers; ${bad.length}+${bad2.length} rejected ${sample(bad, 2)}`, true);
  const q = mix[0];
  const r = gradeInput(q, '4又');
  check('B11 an incomplete mixed number ("4又") gets a plain hint', r.valid === false && /帶分數請這樣寫/.test(r.message), r.message, true);
  const ok = gradeInput(q, '3又1/0');
  check('B12 a mixed number with a zero denominator is still rejected', ok.valid === false);
}
{
  const q = qa.個;
  const r1 = gradeInput(q, 'abc'), r2 = gradeInput(q, ''), r3 = gradeInput(q, '1/0'), r4 = gradeInput(q, '1.2.3');
  check('B13 empty answer: "請先填答案。"', r2.valid === false && r2.message === '請先填答案。', r2.message, true);
  check('B14 text that is not a number: says to write only numbers, with examples', r1.valid === false && /只填數字/.test(r1.message) && /0\.5/.test(r1.message), r1.message, true);
  check('B15 more than one decimal point also gets the same plain hint', r4.valid === false && /只填數字/.test(r4.message), r4.message, true);
  check('B16 a zero denominator is rejected (existing message kept)', r3.valid === false && r3.message.length > 0, r3.message);
}
{
  // format rules: only the allowed formats; the hint says which one
  const dq = gen('6N3.R3-T1', 7), fq = gen('3N5.1-T1', 3);
  const r = gradeInput(dq, '21/100'), r2 = gradeInput(fq, '0.25'), r3 = gradeInput(fq, '2');
  check('B17 a decimal-only question: a fraction is refused with "請用小數"', r.valid === false && /小數/.test(r.message) && !/請用題目指定/.test(r.message), r.message, true);
  check('B18 a fraction-only question: a decimal is refused with "請用分數"', r2.valid === false && /分數/.test(r2.message), r2.message, true);
  check('B18b a fraction-only question: an integer is refused with "請用分數"', r3.valid === false && /分數/.test(r3.message), r3.message, true);
  check('B19 decimal answer typed in on a decimal question is accepted (0.21 and 0.210)', accepted(dq, shown(dq)) && accepted(dq, shown(dq) + '0'), shown(dq), true);
}

// ======================================================================================================================
// C. M-029 / M-030: wording of the generated questions
// ======================================================================================================================
const SEEDS_W = [1, 2, 3, 4, 5, 6, 7, 8];
const qAll = allQuestions(ALL_IDS, SEEDS_W);
const texts = q => [q.stem_zh, q.speech_yue, ...(q.hints || []), q.explanation, ...(q.choices || []).map(c => (c.label && c.label.zh) || '')];
const withTerm = (re, ids) => qAll.filter(q => (!ids || ids.test(q.templateId)) && texts(q).some(t => re.test(t)));
{
  const n = withTerm(/最具體/).length;
  check('C1 no question text says 「最具體」', n === 0, `${n} questions`, true);
  const qs = qAll.filter(q => /^(2S4|3S1|3S2|4S1)\.R3/.test(q.templateId));
  check('C2 the naming questions (2S4, 3S1, 3S2, 4S1) ask 「選出最準確的名稱」', qs.length > 0 && qs.every(q => q.stem_zh.startsWith('選出最準確的名稱：') && q.speech_yue.startsWith('選出最準確的名稱：')), `${qs.length} questions`, true);
  const hint = qAll.filter(q => /^(2S4|4S1)\.R3/.test(q.templateId)).every(q => /最準確的名稱/.test(q.explanation));
  check('C3 the explanation of 2S4 / 4S1 uses the same term (最準確的名稱)', hint, '', true);
}
{
  const withBracket = qAll.filter(q => q.choices.some(c => c.label && /[（(]非/.test(c.label.zh || '')));
  const withEn = qAll.filter(q => q.choices.some(c => c.label && /, not /.test(c.label.en || '')));
  check('C4 no option label carries an answer-leaking bracket such as 「（非正方形）」', withBracket.length === 0 && withEn.length === 0, `${withBracket.length} zh, ${withEn.length} en`, true);
  const s24 = qAll.filter(q => q.templateId.startsWith('2S4.R3')).map(q => q.choices.map(c => c.label.zh).sort().join('/'));
  check('C5 2S4 offers just 「正方形」 and 「長方形」', s24.length > 0 && s24.every(x => x === '正方形/長方形'), [...new Set(s24)].join(' | '), true);
  const ok = qAll.filter(q => /^(2S4|3S1|3S2|4S1)\.R3/.test(q.templateId)).every(q => {
    const labels = q.choices.map(c => c.label.zh); return new Set(labels).size === labels.length && labels.every(Boolean);
  });
  check('C6 option labels stay distinct and non-empty after the bracket was removed', ok);
  const keyed = qAll.filter(q => /^(2S4|3S1|3S2|4S1)\.R3/.test(q.templateId)).every(q => q.answerLabel && q.choices.some(c => c.value === q.answer && c.label.zh === q.answerLabel.zh));
  check('C7 the correct option still carries the correct key', keyed);
}
{
  const half = qAll.filter(q => /=\s*\?/.test(q.stem_zh) || /=\s*\?/.test(q.speech_yue));
  check('C8 no question or speech text ends with a half-width 「= ?」', half.length === 0, `${half.length} questions; e.g. ${sample(half.map(q => q.templateId), 3)}`, true);
  const full = qAll.filter(q => /= ？/.test(q.stem_zh));
  check('C9 equation questions use the full-width 「= ？」 throughout', full.length > 50 && full.every(q => /= ？$/.test(q.stem_zh)), `${full.length} questions`);
  // the copy pass (p90) turns the written 「等於幾多」 into 「等於多少」 in the spoken text too; both are fine for the voice
  const sp = full.filter(q => !/等於(?:幾多|多少)？/.test(q.speech_yue) || /= ？/.test(q.speech_yue));
  check('C10 the spoken text reads 「= ？」 as 「等於幾多？」 or 「等於多少？」 for both kinds of mark', sp.length === 0, `${sp.length} not converted; e.g. ${sample(sp.map(q => [q.templateId, q.speech_yue]), 2)}`, true);
  const en = qAll.filter(q => /= \?/.test(q.stem_en)).length;
  check('C11 English stems keep their ordinary 「= ?」 (only the Chinese text is unified)', en > 50, `${en} English stems`);
}
{
  const bad = qAll.filter(q => q.templateId.startsWith('1S2.R3') && /\d條/.test(q.stem_zh));
  const good = qAll.filter(q => q.templateId.startsWith('1S2.R3') && /\d 條直邊/.test(q.stem_zh));
  check('C12 「4條直邊」 now has a space: 「4 條直邊」', bad.length === 0 && good.length > 0, `${bad.length} without, ${good.length} with`, true);
  const lab = qAll.filter(q => q.choices.some(c => c.label && /\d條$/.test(c.label.zh || '')));
  check('C13 option labels such as 「4條」 have the space as well', lab.length === 0, `${lab.length} questions`, true);
}
{
  const terms = [/看圖者/, /24小時報時制/, /正倍數/, /最直接的判斷/];
  const hits = terms.map(re => withTerm(re).length);
  check('C14 no question uses 「看圖者」「24小時報時制」「正倍數」「選最直接的判斷」', hits.every(n => n === 0), `hits ${hits.join('/')}`, true);
  const t = (id, re) => qAll.filter(q => q.templateId.startsWith(id)).every(q => re.test(q.stem_zh));
  check('C15 replacements read as plain written Chinese in the stems', t('1S3.R3', /^以你看圖的方向判斷/) && t('3M4.R3', /用 24 小時制是幾時/) && t('4N3.R3', /的第 \d+ 個倍數是多少/) && t('6D4.R3', /^選出最符合的說法：/), '', true);
  const sk = [...L.skills.values()].filter(s => /看圖者|正倍數|最具體|報時制/.test(JSON.stringify(s.lesson || {}) + s.name_zh));
  check('C16 the lesson texts of the same skills use the same words', sk.length === 0, sk.map(s => s.id).join(','), true);
}
{
  const s1 = qAll.filter(q => q.templateId.startsWith('1S1.R3')).flatMap(q => q.choices.map(c => c.label.zh));
  const set = [...new Set(s1)].sort().join('、');
  check('C17 solid names in 1S1 are 正方體、球體、圓柱體、圓錐體', set === ['正方體', '球體', '圓柱體', '圓錐體'].sort().join('、'), set, true);
  const s2 = allQuestions(['2S1.R3-T1', '2S1.R3-T2', '2S1.R3-T3'], AUDIT_SEEDS).map(q => q.stem_zh).join('|');
  check('C18 2S1 says 圓柱體 (not 圓柱) and the other solid names agree with 1S1', /圓柱體/.test(s2) && !/圓柱的/.test(s2) && /正方體/.test(s2) && /長方體/.test(s2), '', true);
  const old = qAll.filter(q => texts(q).some(t => /方塊形|圓柱形|圓錐形|球形/.test(t)));
  check('C19 the old shape words 方塊形 圓柱形 圓錐形 球形 are gone from the questions', old.length === 0, `${old.length}`, true);
}
{
  // no English wording or engineering words leak into any generated question text
  const bad = qAll.filter(q => texts(q).some(t => /[Rr]3\b|校對|驗證|引擎|模組|工程/.test(t)));
  check('C20 no engineering word (引擎, 模組, 驗證, 校對 …) in any generated question text', bad.length === 0, `${bad.length}`);
}
finish();
