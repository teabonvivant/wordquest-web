#!/usr/bin/env python3
"""summary.json + sets -> markdown tables (printed, and written to tables.md) for REPORT.md."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
S = json.loads((HERE / 'summary.json').read_text())
sets = {f.stem: json.loads(f.read_text()) for f in sorted((HERE / 'sets').glob('*.json'))}
runs = S['runs']
out = []


def f1(x, d=1):
    return '-' if x is None else f'{x:.{d}f}'


def pct(x):
    return '-' if x is None else f'{100 * x:.0f}%'


def row(cells):
    return '| ' + ' | '.join(str(c) for c in cells) + ' |'


def agg_row(name, a):
    if not a:
        return row([name, '-', '-', '-', '-', '-', '-'])
    return row([name, a['n'], f1(a['ocr']), f1(a['dict']), f1(a['pre']), f1(a['ux']), f1(a['total'])])


hdr = ['', '份數', '字詞辨識 /25', '詞典詞形 /25', '預選準確 /25', '易用流暢 /25', '總分 /100']
sep = '|' + '|'.join(['---'] * len(hdr)) + '|'
out.append('### 總分\n')
out += [row(hdr), sep, agg_row('貼文字', S['by_input']['paste']), agg_row('拍照（合成相片）', S['by_input']['photo']), agg_row('兩者平均', S['overall'])]
out.append('\n### 按類型\n')
out += [row(['類型'] + hdr[1:]), sep]
names = {'list': '詞語表（25）', 'text': '短文（15）', 'mixed': '混合（10）'}
for t in ('list', 'text', 'mixed'):
    for i, lab in (('paste', '貼文字'), ('photo', '拍照')):
        out.append(agg_row(f'{names[t]} · {lab}', S['by_type'][t][i]))
    out.append(agg_row(f'{names[t]} · 兩者平均', S['by_type_all'][t]))
out.append('\n### 按年級\n')
out += [row(['年級'] + hdr[1:]), sep]
for lv in ('P1', 'P2', 'P3', 'P4', 'P5', 'P6'):
    for i, lab in (('paste', '貼文字'), ('photo', '拍照')):
        out.append(agg_row(f'{lv} · {lab}', S['by_level'][lv][i]))
    out.append(agg_row(f'{lv} · 兩者平均', S['by_level_all'][lv]))

out.append('\n### 逐份成績（貼文字 / 拍照 總分；括號為 字詞/詞典/預選/易用）\n')
out += [row(['#', 'id', '類型', '年級', '目標字數', '貼文字', '拍照']), '|---|---|---|---|---|---|---|']
for sid, d in sets.items():
    cells = []
    for inp in ('paste', 'photo'):
        r = runs.get(sid + '|' + inp)
        if not r:
            cells.append('-')
            continue
        sc = r['score']
        cells.append(f"{sc['total']:.0f} ({sc['ocr']:.0f}/{sc['dict']:.0f}/{sc['pre']:.0f}/{sc['ux']:.0f})")
    out.append(row([sid[:2], sid[3:], d['type'], d['level'], len(d['targets'])] + cells))

out.append('\n### 原始指標（各份平均）\n')
raw = S['raw']
keys = [('found_strict', '目標字詞（整詞／整詞組）出現在候選中'), ('found_word', '　其中單字'), ('found_phrase', '　其中詞組'), ('found_relaxed', '寬鬆（逐字、不計 a/an/the）'),
        ('ocr_token_recall', 'OCR 原文逐字命中（只拍照）'), ('zh_cov_targets', '找到的目標有中文意思'), ('form_ok', '詞形變化目標：已認出且有中文'),
        ('precision', '預選 precision'), ('recall', '預選 recall'), ('f1', '預選 F1'), ('r_precision', '預選 precision（寬鬆）'), ('r_recall', '預選 recall（寬鬆）')]
out += [row(['指標', '貼文字', '拍照']), '|---|---|---|']
for k, lab in keys:
    out.append(row([lab, pct(raw['paste'].get(k)), pct(raw['photo'].get(k))]))
for k, lab in (('fix_taps_default', '預選改成目標所需點擊（平均）'), ('accept_taps_from_start', '接受預選、核對擋住項目到可儲存的點擊（平均）'),
               ('repair_taps_total', '改成目標並儲存的總點擊（平均）'), ('t_step2', '到第 2 步秒數（平均；拍照含 OCR）'),
               ('n_noise_selected', '預選了的雜訊卡（平均／份）'), ('n_unknown_selected', '預選且標「內置題庫沒有這個字」（平均／份）')):
    out.append(row([lab, f1(raw['paste'].get(k)), f1(raw['photo'].get(k))]))

(HERE / 'tables.md').write_text('\n'.join(out))
print('\n'.join(out))
