#!/usr/bin/env python
# Otimiza hero.png e logo-studio.png -> WebP de alta performance
import math
import os

from PIL import Image

os.makedirs("public/opt", exist_ok=True)

# ---- HERO: 4190x1024 ultra-wide -> webp otimizado (fundo escuro) ----
hero = Image.open("public/hero.png").convert("RGB")
w, h = hero.size
tw = 1920
th = int(h * tw / w)
hero = hero.resize((tw, th), Image.LANCZOS)
hero.save("public/opt/hero.webp", "WEBP", quality=82, method=6)
print(f"hero.webp {tw}x{th} criado")

# ---- LOGO 2048x2048 -> normal + circular (soft mask radial) ----
logo = Image.open("public/logo-studio.png").convert("RGBA")
size = 512
logo_sm = logo.resize((size, size), Image.LANCZOS)
logo_sm.save("public/opt/logo-studio.webp", "WEBP", quality=85, method=6)
print("logo-studio.webp 512x512 criado")

# versao "soft radial": centro opaco -> bordas transparentes
alpha = Image.new("L", (size, size), 0)
grad = alpha.load()
cx = cy = size / 2.0
max_r = math.hypot(cx, cy)  # distancia do centro ao canto
for y in range(size):
    for x in range(size):
        d = math.hypot(x - cx, y - cy) / max_r
        # alpha forte no centro, some nas bordas
        base = max(0.0, 1.0 - (d / 0.85))
        grad[x, y] = int(255 * (base ** 1.6))

logo_faded = logo_sm.copy()
logo_faded.putalpha(alpha)
logo_faded.save("public/opt/logo-hero.webp", "WEBP", quality=85, method=6)
print("logo-hero.webp (radial-alpha) criado")

# ---- logo pequena para o ticker ----
logo_tick = logo.convert("RGB").resize((160, 160), Image.LANCZOS)
logo_tick.save("public/opt/logo-tick.png", "PNG", optimize=True)
print("logo-tick.png 160x160 criado")

for f in ["public/opt/hero.webp", "public/opt/logo-studio.webp", "public/opt/logo-hero.webp", "public/opt/logo-tick.png"]:
    print(f, round(os.path.getsize(f) / 1024 / 1024, 2), "MB")