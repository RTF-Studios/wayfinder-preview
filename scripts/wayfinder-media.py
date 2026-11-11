#!/usr/bin/env python3
"""Wayfinder image optimizer and offline packager. Requires Pillow.
Usage: python scripts/wayfinder-media.py CS/2090104.html --root . --out /tmp/2090104-offline.html
Never overwrites a lesson unless --out explicitly points there; preserves original assets.
"""
import argparse
import base64
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageOps

IMAGE_PATTERN = re.compile(r'data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)', re.I)
URL_PATTERN = re.compile(r'(?P<q>["\'])(?P<url>(?:https://rtf-studios\.github\.io/wayfinder-preview/|/?assets/)[^"\']+\.(?:png|jpe?g|webp))(?P=q)', re.I)
DEFAULT_PER_IMAGE = 250 * 1024
DEFAULT_HTML = 2 * 1024 * 1024

def convert(raw, width, quality):
    with Image.open(io.BytesIO(raw)) as src:
        src = ImageOps.exif_transpose(src)
        if src.mode not in ('RGB', 'RGBA'):
            src = src.convert('RGBA' if 'A' in src.getbands() else 'RGB')
        original = src.size
        if src.width > width:
            src = src.resize((width, max(1, round(src.height * width / src.width))), Image.Resampling.LANCZOS)
        result = io.BytesIO()
        src.save(result, 'WEBP', quality=quality, method=6)
        return result.getvalue(), original, src.size

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lesson', type=Path)
    ap.add_argument('--root', type=Path, default=Path('.'))
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--width', type=int, default=960)
    ap.add_argument('--wide-width', type=int, default=1400)
    ap.add_argument('--quality', type=int, default=78)
    ap.add_argument('--image-budget-kib', type=int, default=250)
    ap.add_argument('--html-budget-kib', type=int, default=2048)
    ap.add_argument('--exception-note', default='', help='Explicit approval reason for budget exception; still flags overages')
    args = ap.parse_args()
    if not 1 <= args.quality <= 100 or args.width < 100 or args.wide_width < 100:
        ap.error('Invalid image optimization settings')
    html = args.lesson.read_text(encoding='utf-8')
    root = args.root.resolve()
    assets = {}
    audit = []
    errors = []
    def embed(raw, name):
        digest = hashlib.sha256(raw).hexdigest()
        if digest in assets: return assets[digest]
        try:
            with Image.open(io.BytesIO(raw)) as image:
                wide = image.width / max(1, image.height) > 2
            webp, old_size, new_size = convert(raw, args.wide_width if wide else args.width, args.quality)
        except Exception as e:
            errors.append(f'{name}: invalid image: {e}')
            return None
        n = len(assets) + 1
        value = 'data:image/webp;base64,' + base64.b64encode(webp).decode('ascii')
        assets[digest] = value
        audit.append({'name': name, 'sha256': digest, 'old_dimensions': old_size,
                      'new_dimensions': new_size, 'original_bytes': len(raw), 'webp_bytes': len(webp)})
        if len(webp) > args.image_budget_kib * 1024:
            errors.append(f'{name}: optimized image {len(webp):,} B exceeds per-image budget')
        return value
    def replace_data(match):
        raw = base64.b64decode(match.group(2))
        return embed(raw, 'embedded-' + hashlib.sha256(raw).hexdigest()[:12]) or match.group(0)
    html = IMAGE_PATTERN.sub(replace_data, html)
    def replace_path(match):
        url = match.group('url')
        path = urlparse(url).path if url.startswith('http') else url
        path = path.lstrip('/')
        if path.startswith('wayfinder-preview/'):
            path = path[len('wayfinder-preview/'):]
        local = (root / path).resolve()
        if not local.is_relative_to(root) or not local.is_file():
            errors.append('Missing local media resource: ' + path)
            return match.group(0)
        value = embed(local.read_bytes(), path)
        return match.group('q') + (value or url) + match.group('q')
    html = URL_PATTERN.sub(replace_path, html)
    # For JS object image pools, move the payload to one declaration, referenced by multiple slots.
    js_pattern = re.compile(r'(["\']src["\']\s*:\s*)(["\'])(data:image/webp;base64,[A-Za-z0-9+/=]+)\2')
    unique = list(dict.fromkeys(m.group(3) for m in js_pattern.finditer(html)))
    if unique and '<script>' in html:
        variables = {data: '__WF_MEDIA_' + str(i) for i, data in enumerate(unique, 1)}
        html = js_pattern.sub(lambda m: m.group(1) + variables[m.group(3)], html)
        declarations = '\n'.join('const ' + name + ' = ' + json.dumps(data) + ';' for data, name in variables.items())
        html = html.replace('<script>', '<script>\n' + declarations + '\n', 1)
    # Deduplicate literal HTML image src attributes without a second payload copy.
    attr = re.compile(r'src="(data:image/webp;base64,[A-Za-z0-9+/=]+)"')
    seen_html = {}
    def share_html(m):
        value = m.group(1)
        if value in seen_html:
            return 'src="" data-wf-copy-from="' + seen_html[value] + '"'
        key = 'wf-media-' + str(len(seen_html) + 1)
        seen_html[value] = key
        return m.group(0) + ' data-wf-asset="' + key + '"'
    html = attr.sub(share_html, html)
    if 'data-wf-copy-from=' in html:
        loader = """<script>document.addEventListener('DOMContentLoaded',function(){
          document.querySelectorAll('[data-wf-copy-from]').forEach(function(img){
            var key=img.getAttribute('data-wf-copy-from');
            var original=document.querySelector('[data-wf-asset="'+key+'"]');
            if(original){img.src=original.src;}
            else{console.error('Missing local artwork source',key);}
          });
        });</script>"""
        html = html.replace('</body>', loader + '</body>', 1)
    leftovers = IMAGE_PATTERN.findall(html)
    if leftovers:
        errors.append('Original unoptimized PNG/JPEG still embedded after packaging')
    encoded = re.findall(r'data:image/webp;base64,([A-Za-z0-9+/=]+)', html)
    if len(encoded) != len(set(encoded)):
        errors.append('Duplicate embedded WebP image data remains')
    output = args.out
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    if output.stat().st_size > args.html_budget_kib * 1024:
        errors.append('HTML exceeds total size budget')
    # Form submission may use the network; other external art/resources must work offline.
    external = re.findall(r'(?:src|href)=["\'](https?://[^"\']+)["\']', html)
    for url in external:
        if any(ext in url.lower().split('?')[0] for ext in ('.png','.jpg','.jpeg','.webp')):
            errors.append('External image remains (offline risk): ' + url)
    report = {'lesson': str(args.lesson), 'output': str(output), 'source_bytes': args.lesson.stat().st_size,
              'offline_bytes': output.stat().st_size, 'images': audit, 'exceptions': args.exception_note,
              'warnings': errors}
    report_path = output.with_suffix('.media-audit.json')
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    if errors and not args.exception_note:
        raise SystemExit(2)
    if errors: print('EXCEPTION RECORDED; manual visual and offline QA still mandatory')

if __name__ == '__main__':
    main()
