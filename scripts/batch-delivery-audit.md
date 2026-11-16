# Explicit batch delivery audit

Captain GO M4 F4.1–F4.4 authorized the audit and two-guide pilot; F4a1 subsequently
authorized audit accuracy repair only. F4a2–F4a4 corrections remain outside scope.
This command reads existing files. It never rebuilds, synchronizes, repairs, publishes,
submits to Forms, changes a spreadsheet, or releases student work.

```sh
python scripts/check-batch-delivery.py \
  --evidence scripts/fixtures/m4-delivery/evidence.json \
  --drive-root /absolute/path/to/authenticated-drive-downloads \
  Tech/3050202 Tech/3050203
```

Use Python 3.12, BeautifulSoup 4.15.0 (the existing production QA dependency), and Node 22.
DayIDs are mandatory positional arguments; bare seven-digit IDs also work. There is
no default batch, changed-file inference, or silent skipping. Invalid, duplicate,
missing or unsupported selections each produce a FAIL result. Any required check
failure makes the batch command exit nonzero, while other selected guides continue.
The report goes to stdout; save it explicitly as verification evidence when authorized.

Before a later live audit, refresh evidence through authenticated connector reads:

1. Read the current canonical GitHub commit and each selected blob. Preserve exact
   UTF-8 bytes and final-newline state; the audit verifies the Git blob SHA.
2. Read current native outline tabs, the recorded approved identity summary, current
   Control Station headers/selected rows, and selected Collector Question Bank rows.
   These are read snapshots with provenance, never a replacement curriculum registry.
3. Read the course File Links mapping and student-library download/visibility formulas.
   The M4 pilot's live Tech columns are C Show, D DayID, F title, G preview, H section.
   Do not use obsolete fixed column positions from older SOP text. This first mapping
   adapter explicitly checks the observed Tech formula; other layouts require a
   separately verified adapter and fail until supported.
4. Read metadata for the existing mapped Drive IDs, then download the complete raw
   HTML through the authenticated Drive connector. Materialize each as DayID.html
   under `--drive-root`. Never substitute readable-text exports or expected hashes.
5. Read metadata, mappings, Show and relevant formulas again; populate `after` from
   the new read, not by copying `before`. Record observed size, modification time,
   parents, MIME, title, existing IDs, preview URLs, visibility and download mapping.
   The audit compares before/after and actual downloaded bytes. It cannot authenticate
   a hand-written manifest; connector provenance and truthful capture remain required.
6. Run the explicit selected batch. Record per-guide results in the existing Dispatch
   checkpoint. No blanket readiness or release follows from a delivery PASS.

## Check ownership and limits

The audit invokes existing `.github/guide-identity-qa.cjs`, F1
`scripts/wayfinder-identity.cjs`, and `scripts/check-offline-html.cjs` unchanged.
The native Tech daily adapter applies the same source target/TEKS, exact pinned
prompt/rubric/key, shared engine/CSS, duplicate-ID, Form and scaffold checks used
by existing production QA. It currently supports the native single-daily source format
of this two-guide pilot; unsupported formats fail explicitly. This is not certification
of untested courses, modes, sources, or arbitrary future batches.

F1/M1/M2 production build gates remain unchanged. Existing unstructured native outlines
do not gain typed M1 acceptance or an M2 curriculum review from this delivery audit.
Current source migration and Recovery corrections are outside M4. Real school-browser
permissions, actual Collector receipts, rendered acceptance and student-account access
are separate from byte/mapping verification; do not infer those passes.

`scripts/test-batch-delivery.py` exercises isolated missing/mismatched files, including
same-size corruption, missing evidence, duplicate/invalid selections, wrong blob,
question/mapping/Show mismatches, old engine, external resources and size failures.
Its positive controls alter only temporary HTML/source snapshots to model coherent
Learn/Perform sections and use mock Drive copies. Historical CSS/engine stay intact;
a separate case checks exact current-master recognition. It never repairs production.
CI runs these detection tests;
CI success is not a fresh authenticated JISD parity audit.

## F4a1: classification and section accuracy

Every available guide now receives ten independent checks. Missing files or evidence
still fail; any actual failed check returns FAIL. If no check fails but a source/mode
decision remains unresolved, the guide returns UNTESTED and the CLI exits nonzero.
Neither outcome is production readiness. Other selected guides continue to be checked.

`masterVersion` distinguishes exact CURRENT_MASTER, VERIFIED_HISTORICAL_TEMPLATE,
and UNRECOGNIZED_TEMPLATE_CHANGE. The current-master comparison remains an explicit
boolean; a historical match does not pretend to match current CSS/engine. Historical
recognition requires exact primary-CSS/normalized-engine hashes, a matching single
WF-HANDOFF DayID/master hash, and a repository-controlled, DayID-scoped entry in
`scripts/fixtures/m4-delivery/template-baselines.json`. No arbitrary hash or claimed
historical approval in the caller's evidence can bypass this check. The inspected
Prototype baseline is the master at 8f7f7a3ce5ba97b41b1b045d3c0fe403fe16fa33,
SHA-256 85d89c64a1359b065e769ac032a7cf30a50030d84c35962643ec02bf5338b172.
Its old font weights and Studio gate are template-age differences, not new defects.
This recognition does not waive any other check or retroactively authorize a rebuild.

`packaging` inventories every style/script block, external script source, inline style
and event handler. The profile records only the exact M4a-inspected mobile comic rule,
bounded dropdown styling, offline media hydrator and art helper for these two guides,
with source-history references. Known additions are classified as documented lesson
packaging, not part of the universal master or permission for new customization.
Unknown, modified, missing or duplicate packaging fails. The media-map script hash
is deliberately strict: a later legitimate media change requires fresh inspection,
not a broad exemption for any script mentioning media. Syntax, media and offline
checks still run independently. No historical match hides a changed script/style.

`sections` checks required common panels and literal native Learn/Practice/Perform
instructions in visible applicable sections, including omitted/hidden Practice.
It detects full Group Learn on Perform, full project Perform on Learn, and source
pacing/mode conflicts. Learn no longer needs four Perform steps: a coherent Learn
source without Perform can pass. Applicable tool/project steps use the SOP's 3–5
novice-step range. Missing instruction is an actual FAIL; uncertain source/contract
representation is UNTESTED. Exact-text comparison is conservative and does not
certify semantic equivalence, instructional quality or unseen Captain approvals.

For the unchanged real pilot, both historical templates and inspected packaging
are recognized. 3050202 remains UNTESTED because native Learn project/tool-practice
and current-contract representation need F4a2 review. 3050203 FAILS because its native
Group Practice is absent; its planned Group Learn/pacing also needs review. These
findings are not repaired by changing the audit. F1/M1/M2 build gates are untouched.

The original M4 result is retained in `scripts/m4-batch-delivery-results.json`; its
`f4a1` section records the new classification/results separately. Unrelated oversized
assets remain separate. Frozen production HTML, IDs, sources, evidence and visibility
must remain unchanged. No student release.
