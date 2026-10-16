/* R3.18 English content check (node): every word of the 80 units has an example sentence that contains it,
   meanings fixed (bank = 銀行 ...), no note in brackets like 英式, blend groups. Reads the built app (WQ33_APP or app/index.html). */
const fs = require('fs');
const path = require('path');
const app = process.env.WQ33_APP || path.join(__dirname, '..', 'app', 'index.html');
const html = fs.readFileSync(app, 'utf8');
function jsonAfter(marker) {
  const i = html.indexOf(marker); if (i < 0) throw new Error('marker ' + marker);
  const j = html.indexOf('\n', i);
  return JSON.parse(html.slice(i + marker.length, j).replace(/;\s*$/, ''));
}
const d30 = jsonAfter('globalThis.WQ30Data=');
const fix = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'r37_src', 'en_content_r318.json'), 'utf8'));
let n = 0; const fails = [];
const ok = (c, m) => { n++; if (!c) { fails.push(m); console.log('  FAIL', m); } };
const words = new Map();
for (const w of d30.words) words.set(w.id, Object.assign({}, w));
for (const [id, s] of Object.entries(fix.ex)) { const w = words.get(id); if (w && !w.example) w.example = s; }
for (const [id, f] of Object.entries(fix.fix)) { const w = words.get(id); if (!w) continue; if (f.zh) w.meaning = f.zh; if ('image' in f) w.image = f.image; }
const originalMissing = d30.words.filter(w => !w.example).length;
ok(originalMissing === 297, 'base data has 297 words without an example (' + originalMissing + ')');
ok(Object.keys(fix.ex).length >= 297, 'fix file has an example for each of them');
const tok = s => s.toLowerCase().replace(/[^a-z' -]/g, ' ').split(/\s+/).filter(Boolean);
let noEx = 0, noTarget = 0, badLen = 0;
for (const u of d30.units) for (const id of u.words) {
  const w = words.get(id);
  if (!w.example) { noEx++; continue; }
  const f = w.form.toLowerCase(), t = tok(w.example), has = f.includes(' ') ? tok(w.example).join(' ').includes(f) : t.includes(f);
  if (!has) { noTarget++; console.log('   no target in sentence:', w.form, '|', w.example); }
}
ok(noEx === 0, 'every unit word has an example sentence (' + noEx + ' missing)');
ok(noTarget === 0, 'every example contains its target word (' + noTarget + ')');
for (const [id, s] of Object.entries(fix.ex)) {
  const n = s.replace(/[.?!]+$/, '').split(/\s+/).length;
  if (n < 5 || n > 8) { badLen++; console.log('   length', n, s); }
  if (!/^[A-Z]/.test(s) || !/[.?!]$/.test(s)) ok(false, 'sentence form: ' + s);
}
ok(badLen === 0, 'new sentences are 5-8 words (' + badLen + ' outside)');
const byForm = f => [...words.values()].filter(w => w.form === f);
const bank = byForm('bank'); ok(bank.length === 2 && bank.every(w => w.meaning === '銀行'), 'bank = 銀行 in both units');
ok(byForm('chest')[0].meaning === '胸膛', 'chest = 胸膛');
ok(byForm('die')[0].meaning === '死', 'die = 死');
ok(byForm('lot')[0].meaning.startsWith('很多'), 'lot = 很多 (a lot)');
ok(byForm('yam')[0].meaning === '番薯', 'yam = 番薯');
ok(byForm('chip')[0].meaning === '薯片', 'chip = 薯片');
const unit = new Set(d30.units.flatMap(u => u.words));
ok([...unit].every(id => !/（英式/.test(words.get(id).meaning)), 'no （英式…） note in a meaning');
const core = fix.blend.core, ext = fix.blend.ext;
const d31 = jsonAfter('globalThis.WQ31Data=');
const rec = new Map(d31.recipes.map(r => [r.id, r])); for (const r of fix.blend.extra) rec.set(r.id, r);
ok(core.every(id => rec.has(id)) && ext.every(id => rec.has(id)), 'blend recipes exist');
const hard = ['glamping', 'webinar', 'staycation', 'spork', 'emoticon', 'vlog'];
ok(!core.some(id => hard.includes(rec.get(id).form)), 'core blend group has no glamping / webinar / staycation ...');
ok(['brunch', 'smog', 'motel'].every(f => core.some(id => rec.get(id).form === f)), 'brunch / smog / motel stay in the core group');
for (const id of [...core, ...ext]) { const r = rec.get(id); ok(r.parts.join('') === r.form && r.sources.every((s, i) => s.word.slice(s.start, s.end) === r.parts[i]), 'recipe consistent: ' + r.form); }
console.log('test_en_content: ' + (n - fails.length) + '/' + n + ' checks passed');
process.exit(fails.length ? 1 : 0);
