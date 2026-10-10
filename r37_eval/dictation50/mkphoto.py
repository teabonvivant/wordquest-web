"""SYNTHETIC phone-photo generator for the dictation evaluation (PIL only).

These images are NOT real phone photos.  A typeset sheet is drawn with PIL, then degraded to imitate a parent's phone shot:
rotation (+-3 deg), perspective (one edge pulled in), uneven light (+ a shadow band for 'poor'), blur, resolution loss, paper
grain / sensor noise and JPEG compression.  Everything is seeded from the set id, so the same id always gives the same image.
Fonts available on this machine: serif (Liberation Serif, C059 = Century Schoolbook look-alike, URW Bookman), sans (Liberation Sans,
DejaVu Sans, Nimbus Sans, Carlito), and Z003 (chancery script) as the only 'handwriting-like' face (no Comic / hand-drawn font installed).
"""
import hashlib
import io
import math
import random
import re

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

FONTS = {
    'liberation-sans': '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    'liberation-serif': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'c059-schoolbook': '/usr/share/fonts/opentype/urw-base35/C059-Roman.otf',
    'dejavu-sans': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'nimbus-sans': '/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf',
    'carlito': '/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf',
    'urw-bookman': '/usr/share/fonts/opentype/urw-base35/URWBookman-Light.otf',
    'z003-script': '/usr/share/fonts/opentype/urw-base35/Z003-MediumItalic.otf',
    'dejavu-serif': '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
}
CJK = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
CJK_RE = re.compile(r'([　-〿一-鿿＀-￯]+)')

# font cycle; the script face is only used on a few sets so a single hard font does not dominate
FONT_CYCLE = ['liberation-sans', 'c059-schoolbook', 'dejavu-sans', 'liberation-serif', 'nimbus-sans', 'urw-bookman', 'carlito',
              'dejavu-serif', 'liberation-sans', 'z003-script']
CONDITIONS = {  # font px, blur, downscale, jpeg q, rotate deg, perspective %, shadow, noise sigma
    'good': dict(px=42, blur=0.6, scale=1.0, q=88, rot=1.5, persp=0.02, shadow=0.0, noise=6),
    'fair': dict(px=38, blur=1.0, scale=0.85, q=72, rot=2.5, persp=0.04, shadow=0.15, noise=10),
    'poor': dict(px=38, blur=1.2, scale=0.78, q=55, rot=3.0, persp=0.06, shadow=0.35, noise=12),
}


def seed_of(sid):
    return int(hashlib.sha1(sid.encode()).hexdigest()[:8], 16)


def condition_for(n):
    """n = 1..50 set number: every 4th set is 'poor' (12 sets), every 4th+2 is 'fair', the rest 'good'."""
    if n % 4 == 0:
        return 'poor'
    if n % 4 == 2:
        return 'fair'
    return 'good'


def font_for(n):
    return FONT_CYCLE[(n - 1) % len(FONT_CYCLE)]


def _wrap(draw, text, font, cjk_font, maxw):
    out = []
    for raw in text.split('\n'):
        words = raw.split(' ')
        cur = ''
        for w in words:
            t = (cur + ' ' + w) if cur else w
            if width_of(draw, t, font, cjk_font) <= maxw or not cur:
                cur = t
            else:
                out.append(cur)
                cur = w
        out.append(cur)
    return out


def width_of(draw, text, font, cjk_font):
    x = 0
    for run in CJK_RE.split(text):
        if not run:
            continue
        f = cjk_font if CJK_RE.fullmatch(run) else font
        x += draw.textlength(run, font=f)
    return x


def draw_line(draw, x, y, text, font, cjk_font, fill):
    for run in CJK_RE.split(text):
        if not run:
            continue
        f = cjk_font if CJK_RE.fullmatch(run) else font
        draw.text((x, y), run, font=f, fill=fill)
        x += draw.textlength(run, font=f)


def render_sheet(text, font_key, px, page_w=1240, margin=90):
    font = ImageFont.truetype(FONTS[font_key], px)
    cjk = ImageFont.truetype(CJK, int(px * 0.92))
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    lines = _wrap(probe, text, font, cjk, page_w - 2 * margin)
    lh = int(px * 1.55)
    h = max(1754, margin * 2 + lh * len(lines))  # at least an A4 page at 150 dpi
    im = Image.new('RGB', (page_w, h), (250, 249, 244))
    d = ImageDraw.Draw(im)
    y = margin
    for ln in lines:
        draw_line(d, margin, y, ln, font, cjk, (28, 28, 30))
        y += lh
    return im


def _coeffs(src, dst):
    """PIL perspective coefficients mapping output points dst -> input points src (4 points each)"""
    import itertools  # noqa: F401
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        B.extend([u, v])
    # solve A * c = B by Gauss elimination (8x8), no numpy
    n = 8
    M = [A[i][:] + [B[i]] for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        piv = M[i][i]
        M[i] = [v / piv for v in M[i]]
        for r in range(n):
            if r != i:
                f = M[r][i]
                M[r] = [a - f * b for a, b in zip(M[r], M[i])]
    return [M[i][n] for i in range(n)]


def photograph(sheet, sid, cond):
    c = CONDITIONS[cond]
    rnd = random.Random(seed_of(sid))
    w, h = sheet.size
    # desk behind the paper
    pad = int(0.09 * w)
    desk = Image.new('RGB', (w + 2 * pad, h + 2 * pad), (118 + rnd.randint(-10, 10), 92, 70))
    dd = ImageDraw.Draw(desk)
    for _ in range(40):  # wood-grain streaks
        y0 = rnd.randint(0, desk.size[1])
        dd.line([(0, y0), (desk.size[0], y0 + rnd.randint(-6, 6))], fill=(110 + rnd.randint(0, 25), 84, 62), width=rnd.randint(1, 4))
    desk.paste(sheet, (pad, pad))
    # rotation
    ang = rnd.uniform(-c['rot'], c['rot'])
    desk = desk.rotate(ang, resample=Image.BICUBIC, expand=True, fillcolor=(110, 85, 64))
    W, H = desk.size
    # perspective: pull one vertical edge in (as if shot from the side)
    p = c['persp'] * rnd.choice([-1, 1])
    dy = int(H * abs(p))
    if p >= 0:
        dst = [(0, dy), (W, 0), (W, H), (0, H - dy)]
    else:
        dst = [(0, 0), (W, dy), (W, H - dy), (0, H)]
    src = [(0, 0), (W, 0), (W, H), (0, H)]
    desk = desk.transform((W, H), Image.PERSPECTIVE, _coeffs(src, dst), resample=Image.BICUBIC, fillcolor=(105, 80, 60))
    # uneven light: left-right gradient, plus a soft diagonal shadow for fair/poor
    grad = Image.linear_gradient('L').resize((W, H)).rotate(rnd.choice([0, 90, 180, 270]), expand=False)
    grad = grad.point(lambda v: int(205 + v * 50 / 255))
    desk = ImageChops.multiply(desk, Image.merge('RGB', (grad, grad, grad)))
    if c['shadow'] > 0:
        sh = Image.new('L', (W, H), 255)
        sd = ImageDraw.Draw(sh)
        x0 = rnd.randint(int(W * 0.1), int(W * 0.5))
        sd.polygon([(x0, 0), (x0 + int(W * 0.35), 0), (x0 + int(W * 0.1), H), (x0 - int(W * 0.25), H)],
                   fill=int(255 * (1 - c['shadow'])))
        sh = sh.filter(ImageFilter.GaussianBlur(W * 0.06))
        desk = ImageChops.multiply(desk, Image.merge('RGB', (sh, sh, sh)))
    # resolution loss + blur
    if c['scale'] != 1.0:
        desk = desk.resize((int(W * c['scale']), int(H * c['scale'])), Image.BILINEAR)
    if c['blur']:
        desk = desk.filter(ImageFilter.GaussianBlur(c['blur']))
    # sensor noise / paper grain
    noise = Image.effect_noise(desk.size, c['noise'])
    desk = ImageChops.add(desk, Image.merge('RGB', (noise, noise, noise)), scale=1.0, offset=-128)
    buf = io.BytesIO()
    desk.save(buf, 'JPEG', quality=c['q'])
    buf.seek(0)
    out = Image.open(buf).convert('RGB')
    return out, buf.getvalue(), dict(angle_deg=round(ang, 2), perspective=round(p, 3), **{k: c[k] for k in ('px', 'blur', 'scale', 'q', 'shadow', 'noise')},
                                     size=list(out.size))


def make(n, sid, photo_text, out_path):
    cond = condition_for(n)
    fk = font_for(n)
    c = CONDITIONS[cond]
    sheet = render_sheet(photo_text, fk, c['px'])
    img, jpg, meta = photograph(sheet, sid, cond)
    open(out_path, 'wb').write(jpg)
    meta.update(condition=cond, font=fk, synthetic=True, file=str(out_path))
    return meta
