"""Genera el avatar de Athena (bot). Ejecutar: python assets/make_athena.py"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 2048            # lienzo de trabajo (se reduce al final para suavizar bordes)
C = S // 2
OUT = os.path.dirname(os.path.abspath(__file__))

NAVY_EDGE = np.array([5, 8, 18], dtype=np.float32)
NAVY_MID = np.array([15, 24, 46], dtype=np.float32)
AMBER = (249, 158, 26)
AMBER_SOFT = (249, 158, 26)
WARM_WHITE = (255, 238, 205)
NAVY = (8, 12, 24)


def background():
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.sqrt((x - C) ** 2 + (y - C) ** 2) / (S * 0.62)
    t = np.clip(r, 0, 1) ** 1.35
    img = NAVY_MID[None, None, :] * (1 - t[..., None]) + NAVY_EDGE[None, None, :] * t[..., None]
    rng = np.random.default_rng(7)
    img += rng.normal(0, 1.1, (S, S, 1))  # grano muy sutil para evitar bandas
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def polar(r, ang):
    return C + r * math.cos(ang), C + r * math.sin(ang)


def rings(layer):
    d = ImageDraw.Draw(layer)

    # círculos finos de referencia
    for r, a, w in [(940, 70, 3), (880, 150, 4), (700, 90, 3), (560, 60, 3)]:
        d.ellipse([C - r, C - r, C + r, C + r], outline=AMBER + (a,), width=w)

    # dial de marcas: 180 marcas, cada 5.ª más larga, cada 15.ª la más larga
    n = 180
    for i in range(n):
        ang = math.radians(i * 360 / n - 90)
        if i % 15 == 0:
            r0, r1, w, a = 880, 940, 7, 235
        elif i % 5 == 0:
            r0, r1, w, a = 900, 940, 5, 170
        else:
            r0, r1, w, a = 920, 940, 3, 95
        d.line([polar(r0, ang), polar(r1, ang)], fill=AMBER + (a,), width=w)

    # segundo dial interior, más sutil
    n2 = 72
    for i in range(n2):
        ang = math.radians(i * 360 / n2 - 90)
        long_ = i % 6 == 0
        r0, r1 = (690, 735) if long_ else (708, 735)
        d.line([polar(r0, ang), polar(r1, ang)], fill=AMBER + (140 if long_ else 70,), width=4 if long_ else 3)

    # anillo interior segmentado (tres arcos con pausas)
    r = 610
    box = [C - r, C - r, C + r, C + r]
    for start, end in [(-70, 40), (50, 160), (170, 280)]:
        d.arc(box, start, end, fill=AMBER + (210,), width=16)
    # remates de los arcos
    for ang_deg in (-70, 40, 50, 160, 170, 280):
        a = math.radians(ang_deg)
        x, y = polar(r - 8, a)
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=AMBER + (255,))


def glow(size, radius, color, alpha, blur):
    g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.ellipse([C - radius, size - radius, C + radius, size + radius], fill=color + (alpha,))
    return g.filter(ImageFilter.GaussianBlur(blur))


def draw_a(img):
    """La 'A' de Athena: dos trazos finos que se encuentran en el vértice. El travesaño es el ojo."""
    apex = (C, 350)
    base_y = 1420
    half = 430
    left = (C - half, base_y)
    right = (C + half, base_y)

    # halo oscuro: corta los anillos detrás de la letra para que respire
    halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for p in (left, right):
        hd.line([apex, p], fill=NAVY + (255,), width=118)
    hd.ellipse([apex[0] - 59, apex[1] - 59, apex[0] + 59, apex[1] + 59], fill=NAVY + (255,))
    for p in (left, right):
        hd.ellipse([p[0] - 59, p[1] - 59, p[0] + 59, p[1] + 59], fill=NAVY + (255,))
    img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(3)))

    # trazos ámbar
    stroke = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stroke)
    w = 60
    for p in (left, right):
        sd.line([apex, p], fill=AMBER + (255,), width=w)
        sd.ellipse([p[0] - w // 2, p[1] - w // 2, p[0] + w // 2, p[1] + w // 2], fill=AMBER + (255,))
    sd.ellipse([apex[0] - w // 2, apex[1] - w // 2, apex[0] + w // 2, apex[1] + w // 2], fill=AMBER + (255,))
    # filo de luz interior en cada pierna (da volumen sin añadir elementos)
    for p in (left, right):
        sd.line([apex, p], fill=(255, 205, 120, 255), width=10)
    img.alpha_composite(stroke)

    return apex, left, right, base_y


def draw_eye(img, cy):
    """El ojo: travesaño de la A. Núcleo luminoso rodeado de dos anillos."""
    # resplandor amplio
    img.alpha_composite(glow(cy, 330, AMBER, 120, 90))
    img.alpha_composite(glow(cy, 190, (255, 190, 90), 170, 45))

    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # travesaño: hilo fino a ambos lados del ojo, sobre las piernas
    t = (cy - 350) / (1420 - 350)
    half_w = 430 * t
    d.line([(C - half_w + 20, cy), (C - 215, cy)], fill=AMBER + (255,), width=10)
    d.line([(C + 215, cy), (C + half_w - 20, cy)], fill=AMBER + (255,), width=10)

    # anillo exterior del ojo
    R = 205
    d.ellipse([C - R, cy - R, C + R, cy + R], fill=NAVY + (255,))
    d.ellipse([C - R, cy - R, C + R, cy + R], outline=AMBER + (255,), width=14)
    # marcas de precisión alrededor del ojo (cuatro cardinales + diagonales sutiles)
    for k in range(24):
        ang = math.radians(k * 15)
        big = k % 6 == 0
        r0, r1 = (R + 18, R + 52) if big else (R + 18, R + 34)
        d.line([(C + r0 * math.cos(ang), cy + r0 * math.sin(ang)),
                (C + r1 * math.cos(ang), cy + r1 * math.sin(ang))],
               fill=AMBER + (255 if big else 150,), width=7 if big else 4)

    # iris
    R2 = 150
    d.ellipse([C - R2, cy - R2, C + R2, cy + R2], outline=AMBER + (170,), width=5)
    R3 = 112
    d.ellipse([C - R3, cy - R3, C + R3, cy + R3], fill=(20, 30, 58, 255), outline=AMBER + (255,), width=8)

    img.alpha_composite(layer)

    # núcleo incandescente
    img.alpha_composite(glow(cy, 80, (255, 200, 110), 255, 22))
    core = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    cd.ellipse([C - 56, cy - 56, C + 56, cy + 56], fill=(255, 214, 140, 255))
    cd.ellipse([C - 34, cy - 34, C + 34, cy + 34], fill=WARM_WHITE + (255,))
    # destello pequeño, arriba a la izquierda
    cd.ellipse([C - 30, cy - 36, C - 12, cy - 18], fill=(255, 255, 255, 255))
    img.alpha_composite(core)


def main():
    img = background()

    ring_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rings(ring_layer)
    img.alpha_composite(ring_layer)

    apex, left, right, base_y = draw_a(img)
    draw_eye(img, 1010)

    # viñeta final suave
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.sqrt((x - C) ** 2 + (y - C) ** 2) / (S * 0.5)
    v = 1 - 0.28 * np.clip((r - 0.75) / 0.25, 0, 1) ** 2
    arr = np.array(img.convert("RGB"), dtype=np.float32) * v[..., None]
    final = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")

    big = final.resize((1024, 1024), Image.LANCZOS)
    big.save(os.path.join(OUT, "athena-avatar-1024.png"), optimize=True)
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "athena-avatar-512.png"), optimize=True)

    # vista previa recortada en círculo, como la mostrará Discord
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, 1023, 1023], fill=255)
    prev = Image.new("RGB", (1024, 1024), (49, 51, 56))
    prev.paste(big, (0, 0), mask)
    prev.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, "athena-preview-circulo.png"))
    print("ok")


if __name__ == "__main__":
    main()
