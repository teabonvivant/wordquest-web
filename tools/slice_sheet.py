"""R3.26 picture cards: cut one generated 4x4 sticker sheet (white background) into 16 transparent 192px webp cards.

    python3 tools/slice_sheet.py <sheet.png> <out_dir> <word1> ... <word16>     # row-major, left to right, top to bottom

Background = near-white pixels connected to the border (white inside an outline, e.g. a candle flame or feathers, is kept).
Every foreground blob is assigned to the grid cell of its centre; a sheet is rejected (exit 2) when a cell is empty or one blob spans
two cells, so a mis-laid sheet is regenerated instead of shipping a wrong picture under a word.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

N, OUT, PAD = 4, 192, 0.05


def cut(sheet, words, outdir):
    im = Image.open(sheet).convert('RGB')
    a = np.asarray(im)
    h, w = a.shape[:2]
    white = a.min(axis=2) >= 240
    lab, n = ndi.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)
    blobs, k = ndi.label(fg)
    cw, ch = w / N, h / N
    cells = {}
    for i in range(1, k + 1):
        ys, xs = np.where(blobs == i)
        if len(ys) < 0.002 * cw * ch:
            continue
        cx, cy = xs.mean(), ys.mean()
        cell = int(cy // ch) * N + int(cx // cw)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        if int(x0 // cw) != int(x1 // cw) and (x1 - x0) > 1.15 * cw or int(y0 // ch) != int(y1 // ch) and (y1 - y0) > 1.15 * ch:
            return f'blob spans two cells (cell {cell})'
        cells.setdefault(cell, []).append(i)
    if sorted(cells) != list(range(N * N)):
        return 'cells without a picture: ' + str([c for c in range(N * N) if c not in cells])
    rgba = np.dstack([a, (fg * 255).astype(np.uint8)])
    outdir.mkdir(parents=True, exist_ok=True)
    for c, ids in cells.items():
        m = np.isin(blobs, ids)
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        piece = Image.fromarray(rgba[y0:y1, x0:x1].copy(), 'RGBA')
        alpha = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
        piece.putalpha(alpha)
        side = max(piece.size)
        inner = int(OUT * (1 - 2 * PAD))
        sc = inner / side
        piece = piece.resize((max(1, round(piece.width * sc)), max(1, round(piece.height * sc))), Image.LANCZOS)
        canvas = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
        canvas.paste(piece, ((OUT - piece.width) // 2, (OUT - piece.height) // 2), piece)
        canvas.save(outdir / f'{words[c]}.webp', 'WEBP', quality=86, method=6)
    return None


if __name__ == '__main__':
    err = cut(sys.argv[1], sys.argv[3:], Path(sys.argv[2]))
    if err:
        print('REJECT', err)
        sys.exit(2)
    print('ok', len(sys.argv) - 3)
