"""Prepare only public assets, without deploying anything."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import re
import base64

root = Path(__file__).resolve().parents[1]
output = Path('/workspace/secret-santa-release')
output.mkdir(exist_ok=True)
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
config = (root / 'config.js').read_text()
match = re.search(r"publishableKey\s*:\s*(['\"])(.*?)\1", config)
if not match:
    raise ValueError('Configuration publique non reconnue.')
key = match.group(2)
if key and not key.startswith('sb_publishable_'):
    try:
        payload = key.split('.')[1]
        role = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))['role']
    except Exception:
        role = None
    if role != 'anon':
        raise ValueError('Utilisez uniquement une clé publishable ou anon, jamais secret/service_role.')
app = (root / 'app.js').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = html.replace('<script src="config.js"></script>', '<script>' + config + '</script>')
html = html.replace('<script type="module" src="app.js"></script>', '<script>' + app + '</script>')
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
