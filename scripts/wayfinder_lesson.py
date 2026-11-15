"""M1 native-entry adapter. The Personal Master Outline stays authoritative.

WF_MASTER_OUTLINE_SOURCE must name a freshly read native outline snapshot:
{documentId, revision, account: 'Personal', summaryApprovalReference,
 tabs: [{id: actual_native_tab_id, text: original_native_tab_text}]}.
The text contains explicit :::lesson / typed section blocks documented by the
schema and synthetic fixtures. Missing legacy fields fail; this adapter neither
migrates content nor accepts an independently authored build-record JSON.
WF_IDENTITY_SOURCES remains the independent, unchanged F1 input.
"""
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def build_from_outline(candidate, mode, master, output):
    source_path = os.environ.get('WF_MASTER_OUTLINE_SOURCE')
    if not source_path:
        raise RuntimeError('M1 current Personal Master Outline snapshot required: WF_MASTER_OUTLINE_SOURCE; no HTML constructed')
    source = json.loads(Path(source_path).read_text())
    identities_path = os.environ.get('WF_IDENTITY_SOURCES')
    if not identities_path:
        raise RuntimeError('F1 identity sources are required before M1 construction')
    identities = json.loads(Path(identities_path).read_text())
    # The JS boundary checks expected identity/mode, extracts one source record,
    # then builds in memory. Existing output is touched ONLY after full success.
    payload = {'action': 'build', 'dayid': candidate['dayid'], 'source': source,
               'identitySources': identities, 'master': master,
               'expectedIdentity': candidate, 'expectedMode': mode}
    result = subprocess.run(['node', str(ROOT / 'scripts/wayfinder-content-contract.cjs')],
                            input=json.dumps(payload), text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'M1 source validation failed')
    Path(output).write_text(result.stdout)
    return candidate['dayid']
