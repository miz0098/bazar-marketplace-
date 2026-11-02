#!/usr/bin/env python3
"""Read-only, standard-library repository inventory. Prints JSON; never calls Shopify."""
import collections
import hashlib
import json
import re
import struct
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REFS = ('origin/main', 'origin/bazar-latest-shopify',
        'origin/design-reference-storefront', 'origin/vps-migration')
THEME = ('assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates')

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()

def source(ref, path):
    return git('show', f'{ref}:{path}')

def inventory(ref):
    files = git('ls-tree', '-r', '--name-only', ref).splitlines()
    counts = collections.Counter(p.split('/')[0] for p in files)
    theme_files = [p for p in files if p.split('/')[0] in THEME]
    missing, failures, templates = set(), [], 0
    for path in theme_files:
        if path.endswith('.liquid'):
            body = source(ref, path)
            body = re.sub(r'{%[-\s]*(doc|comment)\s*[-]?%}.*?{%[-\s]*end\1\s*[-]?%}', '', body, flags=re.S)
            for kind, name in re.findall(r"{%[-\s]*(render|section)\s+['\"]([^'\"]+)['\"]", body):
                target = f"{'snippets' if kind == 'render' else 'sections'}/{name}.liquid"
                if target not in files:
                    missing.add((path, target))
        if path.startswith('templates/') and path.endswith('.json'):
            templates += 1
            try:
                body = re.sub(r'^\s*/\*.*?\*/\s*', '', source(ref, path), flags=re.S)
                parsed = json.loads(body)
                for entry in parsed.get('sections', {}).values():
                    target = f"sections/{entry['type']}.liquid"
                    if target not in files:
                        missing.add((path, target))
            except (ValueError, KeyError, TypeError) as exc:
                failures.append({'file': path, 'error': str(exc)})
    return {'sha': git('rev-parse', ref), 'theme_directory_counts': {p: counts[p] for p in THEME},
            'layout_tree': git('rev-parse', f'{ref}:layout'),
            'bazar_theme_files': [p for p in theme_files if '/bazar-' in p],
            'json_templates_parsed': templates, 'json_template_parse_failures': failures,
            'missing_literal_snippet_or_section_references': sorted(missing)}

images = []
for path in sorted((ROOT / 'design-reference/storefront').glob('*.PNG')):
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', path.name
    width, height = struct.unpack('>II', data[16:24])
    images.append({'file': path.name, 'width': width, 'height': height,
                   'sha256': hashlib.sha256(data).hexdigest()})
manifest = json.loads((ROOT / 'design-reference/storefront/MANIFEST.json').read_text())
actual = {x['file'] for x in images}
listed = {x['file'] for x in manifest}
result = {'scope': 'Static inventory only; not Liquid execution, Theme Check, or runtime verification.',
          'branches': git('for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/remotes/origin').splitlines(),
          'sources': {ref: inventory(ref) for ref in REFS}, 'images': images,
          'manifest_names_not_on_disk': sorted(listed - actual),
          'disk_names_not_in_manifest': sorted(actual - listed),
          'duplicate_image_groups': [sorted(x['file'] for x in images if x['sha256'] == h)
                                     for h, count in collections.Counter(x['sha256'] for x in images).items() if count > 1]}
print(json.dumps(result, ensure_ascii=False, indent=2))
