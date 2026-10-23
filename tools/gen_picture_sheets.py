"""R3.26 picture cards: have Codex draw 4x4 sticker sheets for the words in items.json, then cut them with slice_sheet.py.

    python3 tools/gen_picture_sheets.py <items.json> <work_dir> <out_dir> [--workers 4] [--only 3,4]

items.json = [[word, "what to draw", category], ...]. One codex call per sheet (16 words, same category first), image taken from
/root/.codex/generated_images/<session id>/ ; a sheet that slice_sheet.py rejects is drawn again (up to 3 tries). Progress: <work_dir>/progress.json.
"""
import argparse, json, re, shutil, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import slice_sheet  # noqa: E402

STYLE = ("Generate ONE image (use your built-in image generation): a clean sticker sheet for a children's English picture-card app, on a plain pure "
         "white background, 4 columns x 4 rows = 16 separate illustrations, each centered in its own cell with wide white gutters (at least 15% of the "
         "cell size) so no two illustrations touch or overlap and nothing is cut off. Style for ALL 16: flat vector cartoon, friendly and cute, bold smooth "
         "outline in dark navy, bright saturated flat colors with subtle soft shading, no text, no letters, no numbers, no labels, no cast shadows, one "
         "single subject per cell, whole subject visible, similar visual size in every cell, no background scenery unless named. Row-major order, left to "
         "right, top to bottom: ")
lock = threading.Lock()


def run_sheet(idx, chunk, work, out):
    prompt = STYLE + '; '.join(f'{i + 1} {d}' for i, (_, d, _) in enumerate(chunk)) + '. Square image.'
    words = [w for w, _, _ in chunk]
    sheet = work / f'sheet{idx:02d}.png'
    for attempt in range(1, 4):
        t0 = time.time()
        log = work / f'sheet{idx:02d}.log'
        subprocess.run(['codex', 'exec', '--skip-git-repo-check', '-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=medium', prompt],
                       stdin=subprocess.DEVNULL, stdout=log.open('w'), stderr=subprocess.STDOUT, timeout=900, cwd=work)
        m = re.search(r'session id: (\S+)', log.read_text(errors='ignore'))
        pngs = sorted(Path('/root/.codex/generated_images', m.group(1)).glob('*.png')) if m else []
        if not pngs:
            status = 'no image'
        else:
            shutil.copy(pngs[-1], sheet)
            err = slice_sheet.cut(sheet, words, out)
            status = err or 'ok'
        with lock:
            prog = json.loads((work / 'progress.json').read_text()) if (work / 'progress.json').exists() else {}
            prog[str(idx)] = {'status': status, 'attempt': attempt, 'secs': round(time.time() - t0), 'words': words}
            (work / 'progress.json').write_text(json.dumps(prog, ensure_ascii=False, indent=1))
        if status == 'ok':
            return
    return


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('items')
    ap.add_argument('work')
    ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--only')
    a = ap.parse_args()
    items = json.loads(Path(a.items).read_text())
    while len(items) % 16:
        items.append(items[len(items) % 16])      # pad the last sheet with repeats (same file name, harmless)
    chunks = [items[i:i + 16] for i in range(0, len(items), 16)]
    work, out = Path(a.work), Path(a.out)
    work.mkdir(parents=True, exist_ok=True)
    only = {int(x) for x in a.only.split(',')} if a.only else None
    with ThreadPoolExecutor(a.workers) as ex:
        for i, c in enumerate(chunks):
            if only is None or i in only:
                ex.submit(run_sheet, i, c, work, out)
    print('done', len(chunks), 'sheets')


if __name__ == '__main__':
    main()
