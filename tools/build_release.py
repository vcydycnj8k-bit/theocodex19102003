"""Prepare only public assets, without deploying anything."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[1]
output = Path('/workspace/secret-santa-release')
output.mkdir(exist_ok=True)
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
draw = (root / 'draw.mjs').read_text().replace('export function ', 'function ')
app = (root / 'app.js').read_text().replace("import { draw } from './draw.mjs';", '')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module" src="app.js"></script>', '<script>' + draw + '\n' + app + '</script>')
contents = {'index.html': html.encode()}
for stale in ['style.css', 'app.js', 'draw.mjs']:
    (output / stale).unlink(missing_ok=True)
contents['robots.txt'] = b'User-agent: *\nDisallow: /\n'
# Supported by Netlify and Cloudflare Pages. These headers do not authenticate users.
contents['_headers'] = b'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow\n'
site = root / 'site'
site.mkdir(exist_ok=True)
for name, data in contents.items():
    (output / name).write_bytes(data)
    (site / name).write_bytes(data)
archive = output.parent / 'secret-santa.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as package:
    for name, data in contents.items():
        package.writestr(name, data)
manifest = {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()}
(output.parent / 'secret-santa-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Paquet prêt : {archive} ({archive.stat().st_size} octets)')
print(f'Dossier public : {output}')
