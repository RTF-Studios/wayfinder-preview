# Explicit batch delivery audit

Captain GO M4 F4.1–F4.4 authorizes the audit implementation and two-guide pilot only.
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
by existing production QA. It checks current master equivalence without normalizing
away old code or styling. It currently supports the native single-daily source format
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
Its positive control updates only temporary HTML copies to the current engine/CSS
and uses mock Drive copies. It never repairs production. CI runs these detection tests;
CI success is not a fresh authenticated JISD parity audit.

The saved M4 pilot report records both guides' actual results and lists unrelated
oversized asset failures separately. Frozen production HTML, IDs, sources, evidence
and visibility must remain unchanged. No student release.
