"""Builds the web version of the app into app/ and makes it installable on the iPhone home screen.
Run: python3 scripts/web_app.py   (needs `npm install` in mobile/ once)"""
import json, os, pathlib, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
MOBILE, OUT = ROOT / 'mobile', ROOT / 'app'

subprocess.run(['npx', 'expo', 'export', '--platform', 'web', '--output-dir', 'dist'], cwd=MOBILE, check=True,
               env={**os.environ, 'EXPO_PUBLIC_API_URL': '/api'})
shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(MOBILE / 'dist', OUT)

def icon(size, path):
    img = Image.new('RGB', (size, size), '#0B0B0C')
    d = ImageDraw.Draw(img)
    font = None
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f):
            font = ImageFont.truetype(f, int(size * 0.62)); break
    font = font or ImageFont.load_default()
    box = d.textbbox((0, 0), 'о', font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    x, y = (size - w) / 2 - size * 0.06 - box[0], (size - h) / 2 - box[1]
    d.text((x, y), 'о', fill='#FFFFFF', font=font)
    r = size * 0.07
    cx, cy = x + w + box[0] + size * 0.07, y + box[1] + h - r
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#7BD88F')
    img.save(path)

icon(180, OUT / 'apple-touch-icon.png')
icon(192, OUT / 'icon-192.png')
icon(512, OUT / 'icon-512.png')
(OUT / 'manifest.webmanifest').write_text(json.dumps({
    'name': 'Осмотрено', 'short_name': 'Осмотрено', 'start_url': '/app/', 'scope': '/app/', 'display': 'standalone',
    'background_color': '#0B0B0C', 'theme_color': '#FFFFFF', 'lang': 'ru',
    'icons': [{'src': '/app/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/app/icon-512.png', 'sizes': '512x512', 'type': 'image/png'}],
}, ensure_ascii=False, indent=2))

html = (OUT / 'index.html').read_text()
html = html.replace('<html lang="en">', '<html lang="ru">')
head = ('<link rel="manifest" href="/app/manifest.webmanifest"/>'
        '<link rel="apple-touch-icon" href="/app/apple-touch-icon.png"/>'
        '<meta name="apple-mobile-web-app-capable" content="yes"/>'
        '<meta name="mobile-web-app-capable" content="yes"/>'
        '<meta name="apple-mobile-web-app-title" content="Осмотрено"/>'
        '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>'
        '<meta name="theme-color" content="#FFFFFF"/>'
        '<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>'
        '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>')
html = html.replace('</head>', head + '</head>', 1)
(OUT / 'index.html').write_text(html)
print('web app ready in', OUT)
