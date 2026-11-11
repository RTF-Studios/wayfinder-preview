# Wayfinder build gate — one submission contract

**Canonical reference:** `templates/wayfinder-master.html`; working test example `CS/2090106.html`.

Every submission (mastery, assessment section, Warm-Up, TEKS Temperature, Creative Studio) uses **exactly two buttons and one read-only purple preview**.

1. **Create My Response** assembles the current answer in that preview without copying.
2. **Copy & Submit My Answer** synchronously copies the reviewed answer with `document.execCommand('copy')` **before** opening the correctly keyed school Form.

No browser clipboard permission API, about:blank popup before copy, standalone Copy control, third Submit control, second preview, or manual-copy interface. Editing the answer disables Copy & Submit until Create My Response runs again. Copying is not submission: students paste and submit in the Form.


## Capture-first evidence (Captain GO 2026-11-11)

The canonical shared engine is `templates/wayfinder-master.html`, and all self-contained course HTML copies must embed the exact engine generated from it. Lesson code may vary ONLY by content/configuration (question markup, DayID/key, rubric and verified Form URL); never fork `assemble`, `copyText`, preview/edit/reset or submit logic.

Creating the response must succeed even with no selected radio, no selected checkbox, unchosen dropdown, empty explanation or unfilled blank. Serialize each such gap as a conspicuous `[Not answered: ...]` marker in the same read-only preview, preserving every completed part verbatim. Students may copy/submit any degree of completion. Editing requires Create again to ensure clipboard and preview match; only copy failure or missing/broken verified Form URL blocks navigation, never academic incompleteness. Submitted partial evidence is graded by its actual content and supports targeted recovery.

Regression testing MUST exercise entirely empty, partially completed and complete answer pieces (including blanks, selection + explanation combinations), inspect one preview, detect a stale edit, verify synchronous real clipboard paste and correct Form destination, and verify source/master engine parity in EVERY upcoming course HTML and corresponding JISD offline copy before READY. An unchanged legacy guide is not safe simply because the master was repaired. Preserve all student Show/Hide settings and prior evidence. Source syntax alone does not prove browser, clipboard or Collector behavior.

## Required automated verification

`node .github/submission-contract-qa.cjs --changed` (after installing Playwright/Chromium as the CI workflow does).

The fail-hard GitHub Action at `.github/workflows/wayfinder-qa.yml` runs on relevant changes in **Tech, CS, AAVTC, and the master**. It compares actual copied clipboard text (pasted into a separate field) to the purple preview in all four CS assessment sections and the two Xtra submissions, checks that copy precedes opening the Form, validates buttons and destinations, and checks future changed guides for regressions. The master QA workflow uses the same code. Older script entry points delegate to this one test; they must not be revived independently.

**Any failed/untested gate prevents the lesson being marked READY.** The green GitHub check is necessary but not proof of real school Form/Collector receipt, Chromebook offline compatibility or Skyward integration; those require their separate WF-03/WF-04 release checks. Never release through Show until all requirements pass and Captain authorizes release.

For each actual classroom guide, also check learning target and TEKS, rubric registration, complete answer assembly and keys, real Form/Collector receipts, imagery, responsive layout, and mode-appropriate activities. Do not treat the source-text scan alone as evidence of working submission.
