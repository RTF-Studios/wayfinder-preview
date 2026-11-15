"""Mandatory bridge to the single JS identity validator; never constructs HTML.

WF_IDENTITY_SOURCES names a build-time JSON snapshot read from the current
approved summary, Personal Master Outline and JISD Control Station. It is NOT a
new registry. Missing source input deliberately blocks old callers. Shape:
{summary: {approved: true, reference: URL, revision: revision-or-observed-time,
 locator: tab/range/heading, identities: [{course,dayid,unit,part,day,title}]},
 masterOutline: {reference,revision,locator,identities},
 controlStation: {reference,revision,locator,identities}}.
Course is Tech/CS/AAVTC; DayID is a seven-digit string. Each source supplies one
explicit selected-day identity. Never populate all three from the candidate or
from old HTML. Fetch each independently; no automatic source repairs or release.
JS callers pass the same object as m.identitySources and explicit m.unit.
"""
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def preflight(candidate, raw):
    source_path = os.environ.get('WF_IDENTITY_SOURCES')
    if not source_path:
        raise RuntimeError('Identity pre-HTML FAIL: WF_IDENTITY_SOURCES is required; no HTML constructed')
    sources = json.loads(Path(source_path).read_text())
    result = subprocess.run(
        ['node', str(ROOT / 'scripts/wayfinder-identity.cjs')],
        input=json.dumps({'candidate': candidate, 'sources': sources, 'raw': raw}),
        text=True, capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Identity pre-HTML validator failed')
    return candidate
