#!/usr/bin/env python
# Reenquadra hero para proporcao 16:9 (melhor para hero), otimizado WebP
from PIL import Image
import os

im = Image.open("public/hero.png").convert("RGB")
w, h = im.size  # 4190 x 1024

# ratio 16:9 => altura mantida, largura = h*16/9
target_w = int(h * 16 / 9)  # ~1820
# corta no centro horizontal para pegar o conteudo (a faixa central tem mais conteudo)
left = (w - target_w) // 2
right = left + target_w
crop = im.crop((left, 0, right, h))
print(f"crop central 16:9 -> {crop.size} (ratio {round(crop.size[0]/crop.size[1],2)})")

# redimensiona para 1920x1080
hero = crop.resize((1920, 1080), Image.LANCZOS)
os.makedirs("public/opt", exist_ok=True)
hero.save("public/opt/hero.webp", "WEBP", quality=82, method=6)
print("hero.webp 1920x1080 (16:9)", round(os.path.getsize("public/opt/hero.webp")/1024, 1), "KB")