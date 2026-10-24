"""Builds privacy.html, terms.html, terms-seller.html from docs/legal/*.md (run: python3 scripts/legal_pages.py)."""
import pathlib, markdown
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {'privacy': 'privacy.md', 'terms': 'terms-buyer.md', 'terms-seller': 'terms-seller.md'}
TPL = """<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>
<style>
body{{margin:0;background:#fff;color:#141414;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:760px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left)) 72px}}
h1{{font-size:30px;line-height:1.2;letter-spacing:-.02em}} h2{{font-size:20px;margin-top:32px}}
a{{color:#2B6AEB}} table{{border-collapse:collapse;width:100%;font-size:14.5px;display:block;overflow-x:auto}}
th,td{{border-bottom:1px solid #EBECEF;padding:8px 10px;text-align:left;vertical-align:top}}
.brand{{font-weight:800;font-size:22px;letter-spacing:-.05em;text-decoration:none;color:#141414}} .brand b{{color:#DB3727}}
nav{{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;margin:6px 0 18px}}
</style></head><body><main><a class="brand" href="/">осмотрено<b>.</b></a>
<nav><a href="/terms">Покупателям</a><a href="/terms-seller">Продавцам</a><a href="/privacy">Персональные данные</a></nav>
{body}</main></body></html>"""
for slug, src in PAGES.items():
    md = (ROOT / 'docs' / 'legal' / src).read_text()
    html = markdown.markdown(md, extensions=['tables'])
    title = md.splitlines()[0].lstrip('# ').strip()
    (ROOT / f'{slug}.html').write_text(TPL.format(title=title, body=html))
    print('wrote', slug + '.html')
