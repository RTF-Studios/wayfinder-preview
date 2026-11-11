# RTF Studios — Wayfinder Library Repository

## Canonical files
- Lessons: `Tech/<DayID>.html`, `CS/<DayID>.html`, `AAVTC/<DayID>.html`.
- Universal engine: `templates/wayfinder-master.html`.
- Student downloads are self-contained HTML in established JISD Drive course folders, indexed by each course's `File Links`. The canonical GitHub DayID.html must already be a fully embedded, offline-capable package. Upload identical bytes to the JISD course folder and verify SHA-256 equality. No separate HTML derivative is permitted.
- The Captain alone controls Control Station Show/Hide; never toggle it during media repair.

## Approved artwork storage — Captain GO 2026-11-11
Full-resolution approved originals live in **Personal Drive**, including PNG originals and character canon/reference sheets. They must not be overwritten during optimization.

Optimized GitHub media uses genuine `.webp` assets, with the six existing artwork categories retained:
- `assets/learning-target/` — approved rotating target art
- `assets/teks-check/` — TEKS temperature art
- `assets/rtf-comics/` — approved comics
- `assets/rtf-characters/` — character/canon derivatives
- `assets/learning-guide-assets/` — reusable decorations
- `assets/lesson-content-assets/<Course>/<DayID>/` — lesson-specific artwork

Technical scripts, styles and favicon remain in `assets/shared/`. Do not invent a new character, alter canon, or mix lesson-specific assets into random rotation pools.

## Mandatory image build pipeline
1. Inspect every source image, including visually checking source identity, dimensions, alpha, and externally sourced images' permissions/attribution.
2. Select display-appropriate dimensions; make moderate-quality WebP derivative (starting at quality 78, maximum width 960px for standard art and 1400px for unusually wide comics).
3. Store the derivative once in the matching GitHub artwork folder. Keep the original in Personal Drive.
4. Run `python scripts/wayfinder-media.py <course/DayID.html> --root . --in-place` using Pillow, committing the optimized, fully embedded result as the canonical GitHub DayID.html. It replaces local/embedded images with compressed WebP and deduplicates repeated payloads. Resolve all missing assets before commit.
5. Default budgets: **250 KiB per optimized image** and **2 MiB total downloadable HTML**. Exceeding these budgets blocks readiness unless a specific documented exception is approved and visually validated. Audit JSON is emitted beside the offline file.
6. Copy the exact canonical GitHub HTML bytes to JISD Drive and compare SHA-256 hashes of both downloaded files. Render the actual downloaded file with internet disabled, at desktop and mobile widths. Test copy-before-Form and Form/Collector path separately. Keep original JISD Drive file IDs, library links and visibility unchanged.
7. No browser QA, student download, image check or Form receipt may be marked PASS based solely on script output.

## Media-specific release condition
An optimized source asset being published to GitHub does not itself release a lesson. A GitHub DayID.html that relies on network-fetched images, styles, scripts, or other learning resources is NOT acceptable, even if GitHub Pages displays it correctly. Updating an already-shown JISD offline file is an authorized repair only when original lesson behavior and evidence identity remain unchanged. Never replace a working file with smaller content if visual, submission or offline validation fails.

## Historical notes
Older README text about missing CS files and retired previews was superseded by subsequent builds. Verify the live repository and JISD library before drawing conclusions from older history.
