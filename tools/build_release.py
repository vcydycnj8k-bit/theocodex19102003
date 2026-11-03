"""Prepare only public assets, without deploying anything."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[1]
output = Path('/workspace/secret-santa-release')
output.mkdir(exist_ok=True)
assets = ['index.html', 'style.css', 'app.js', 'draw.mjs']
contents = {name: (root / name).read_bytes() for name in assets}
contents['robots.txt'] = b'User-agent: *\nDisallow: /\n'
# Supported by Netlify and Cloudflare Pages. These headers do not authenticate users.
contents['_headers'] = b'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow\n'
for name, data in contents.items():
    (output / name).write_bytes(data)
archive = output.parent / 'secret-santa.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as package:
    for name, data in contents.items():
        package.writestr(name, data)
manifest = {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()}
(output.parent / 'secret-santa-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Paquet prêt : {archive} ({archive.stat().st_size} octets)')
print(f'Dossier public : {output}')
