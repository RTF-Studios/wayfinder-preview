# RTF Studios — Wayfinder Library Repository

## Canonical course directories
- `Tech/`: `Tech_Library.html` plus numbered `3040301.html` etc.
- `CS/`: `CS_Library.html` plus future numbered CS lessons. Existing six CS source files could not be located at the expected root paths.
- `AAVTC/`: `AAVTC_Library.html` plus numbered `1020101.html` etc.

## Assets
- `assets/RTF/`: designated approved character-art directory; binary migration not yet completed.
- `assets/shared/`: designated shared scripts/styles directory; course libraries now use `assets/shared/wayfinder-library-feed.js`; legacy root script retained for old references.

## Visibility and URLs
JISD Wayfinder Control Station owns Show/Hide. Its Public Feed tab is formula-owned and must never be manually populated.
The shared feed supports URLs like `./Tech/3040305.html` and `./AAVTC/1020101.html`.
Legacy root lesson duplicates were deleted after course folder copies were verified; old root library URLs redirect to named course libraries. Existing direct root lesson URLs may be broken and require an audit.

## Cleanup status
Course folders created, Tech/AAVTC lesson copies and libraries installed. CS lesson source retrieval, RTF binary image relocation, removal of legacy root duplicates, and rendered end-to-end link QA remain outstanding. Do not assume these tasks passed.

## Latest organizational pass
Named course libraries use the shared feed at `assets/shared/`. Tech and AAVTC root library filenames redirect to canonical libraries. CS lesson files 2090101–2090106 remain unrecovered; do not fabricate student pages or change Show checkboxes without Captain approval. Shared RTF image binaries remain unmigrated pending binary-safe Git tree work.
