# M1 source-to-build contract

## M2 curriculum review before rendering

After extraction and independent F1 validation, every production `buildRecord`
call now runs `wayfinder-curriculum-quality.cjs` BEFORE the renderer. JS and
native Python entries use this same boundary. Missing, stale, FAIL or UNTESTED
curriculum review blocks construction and leaves previous HTML untouched.

The assistant supplies `currentSource.curriculumReviews[DayID]` on the freshly
read source snapshot. This is derived QA metadata, not a replacement lesson
record, a second question registry, or another Captain signoff. Preserve the
native outline and exact frozen question/rubric. Save the review evidence with
the authorized build checkpoint; never use an old review for changed content.

Each review has version1, reviewer/basis, PASS status, exact source binding
(document, revision, tab, source-text SHA256, summary reference and full payload
SHA256), WHAT/WHY alignment, priority-TEKS coverage, and every graded question's
literal prompt/rubric plus all part prompts, accepted answers and criteria.
Teaching anchors quote the supplied explanation, demonstration, prior learning,
exemplar or assessment reference. Perform alone cannot supply the question's
required prior knowledge. Explicitly distinguish introductory/partial practice
from complete TEKS mastery. For multipart questions, record a wrong-earlier /
fully-creditable-later counterexample for each pair; a source-declared single
response has no invented A/B/C cases.

Pacing review allocates the SAME source minutes among actual reading/task/save
work, transitions and the exact number of planned evidence handoffs. The total
must fit50minutes; numerical M1 acceptance of45–55minutes is not a feasibility
review. Unresolved FAIL/UNTESTED findings hold the build. `inspect` returns named
mismatches; `preflight` throws them before assembly.

These checks verify review freshness, completeness and exact source references.
They cannot judge the truth of a review rationale or certify teaching quality by
keywords. Tank's assistant review makes those instructional judgments under the
existing Captain-approved pillars/GO. No grades, source questions, master code,
clipboard/Form logic, deployment, or student visibility are changed by M2.

`fixtures/m2-review-fixtures.cjs` is TEST/AUDIT ONLY: synthetic fixtures and the
two explicitly inspected immutable3050201 audit-source hashes. It must not be
used to manufacture approval for a future source. The isolated review preserves
the live Evergreen mapping of educational TECH-U05-P01 to legacy3050201–07.
Production authors must read their actual current outline and targets.

Run `node scripts/test-wayfinder-curriculum-quality.cjs` for focused gate tests.
The required CI curriculum job follows F1/M1; unchanged submission-engine browser
checks are reused when the diff affects curriculum/validation only. Runtime,
layout, asset or lesson HTML changes continue to select the browser jobs.


The approved Personal Drive Master Outline remains the only curriculum source.
The schema is `schema/wayfinder-lesson.schema.json`; it describes data, not a new
curriculum registry. `fixtures/m1-source-fixtures.cjs` contains synthetic source
text solely for tests. It contains no real approval, question, TEKS or Form.

## Extraction

Read the current native outline through the Personal account. Supply its exact
`documentId`, current `revision`, `account: "Personal"`,
`summaryApprovalReference`, and native `tabs: [{id, text}]`. Native Google Docs
body elements are also accepted by the tab-text adapter. Do not hand-author or
update a separate production lesson-record JSON.

Explicit typed sections reside inside the source outline itself:

```text
:::lesson <seven-digit DayID>
:::schemaVersion
"1.0"
:::identity
{ ... explicit identity fields ... }
:::mode
"PERFORM"
... one block for every schema property ...
:::endlesson
```

The fixture factory demonstrates the complete source notation. The example
above is syntax documentation, not an executable lesson or curriculum template.
No new source notation or content is automatically written into an existing Doc.

`extractLesson(currentSource, DayID)` emits one immutable, transient record with
the exact source document/revision/tab and SHA-256 of the original native tab
text. Every required block and section must be present. Truly inapplicable
fields use `status: "not_applicable"` plus a nonblank source reason. There are no
inferred lesson content, resource, question, pacing or mode defaults. Duplicate
source blocks, JSON keys, DayIDs and instructional section IDs fail closed.

`buildRecord(master, record, currentSource, identitySources)` re-extracts and
compares the complete record before any assembly. A revision, tab, source-text
or record change invalidates stale extracted data. It separately executes F1,
and binds the source document/revision and summary reference to F1 provenance.
Callers must fetch the actual current source; no offline validator can establish
that a caller's claimed revision is the latest remote revision.

## Production entries

- `WFBuilder.build(master, raw, m, Q)` requires `m.source` to be that current
  native outline snapshot. `raw` must equal the selected native tab text. `Q`
  and legacy fallback parsing are not used for new content.
- The existing four native Tech builder scripts delegate to
  `wayfinder_lesson.build_from_outline` before BeautifulSoup/legacy assembly.
  `WF_MASTER_OUTLINE_SOURCE` names the fresh native source snapshot and
  `WF_IDENTITY_SOURCES` remains the independent F1 input. The native candidate
  identity and mode must agree with the extracted source. The Node build occurs
  in memory; output is written only after every validation step succeeds.
- `wayfinder-record-renderer.cjs` fills the unchanged universal master using
  source content/configuration. It preserves its CSS and submission JS; uses
  existing native answer controls; keeps rubrics/accepted answers out of student
  output; and embeds the existing artwork helper verbatim.

All eight enumerated answer formats are supported. Regular graded questions
carry the actual approved response fields: one single response or any explicitly
declared multipart structure, with unique part IDs and unchanged prompts. Never
infer or manufacture A/B/C. Each field requires a supported format, nonblank
accepted answers and scoring criteria; choice answers reference explicit option
values. Rubrics retain exact source text and complete nonoverlapping integer
bands covering 0–100. Assessment mode carries four Major
section definitions. Xtra fields and their reserved identities remain separate.
The unchanged regular master has two graded-question shells; a source requiring
more than two regular questions is a blocking renderer compatibility issue,
never a reason to discard evidence or invent a custom engine.

## Compatibility and scope

M3 removed the private, uncalled JavaScript `legacyBuild` function and only the
unreachable native assembly statements after unconditional `build_from_outline`
returns or module exits. Exported `parse`, `outline`, `offline`, `E`, `steps` and
`build` remain unchanged. Active source loading, command-line dispatch, imports
and shared helpers/constants are preserved: the native builders import the
Prototype module for its master, and the production checker reads `B.P.FORM`.
No supposedly unused shared helper was removed. F1/M1/M2 still run through the
same production boundary before the renderer and output write.

Old free-form snapshots lacking explicit M1 fields are
rejected. Missing provenance and old `RECOVERY`/`ASSESS` modes are also rejected;
M1 does not silently migrate them, change their source content, or rebuild HTML.

The live 3050201 source read during M1 has no typed lesson block. Its extraction
is an expected compatibility HOLD, not a successful production lesson build.
Populating/migrating actual source fields requires a separately authorized
follow-up. No existing Personal outline, course HTML, question/rubric/evidence,
master template, Drive file or Show/Hide setting is changed by this implementation.

M1 checks structure, explicit applicability and a numeric 45–55 minute total.
Pedagogical alignment, realistic pacing judgment and source/media accuracy are
not M1 quality scores (M2). Legacy cleanup (M3), release/parity work (M4), real
Form receipts and student release are not executed here.

## Tests

```sh
node scripts/test-wayfinder-content-contract.cjs
node scripts/test-wayfinder-identity.cjs
```

The first suite covers every course/mode and answer type, negative structure and
provenance cases, unchanged master JS/CSS, source-bound production consumption,
one isolated native build, and byte preservation of existing HTML on failure.
The existing mandatory workflow runs both suites before downstream QA. Tests
never submit Forms, write canonical lesson HTML, or change student visibility.

## M1b compatibility pilot

The production boundary now accepts a source-declared single response or
multipart question without an A/B/C requirement. Run
`node scripts/test-m1b-3050201.cjs` for an isolated native-entry build of the
frozen single-response question 305020130059 and failed-write checks. The
fixture is an explicitly authorized source COPY, not a migrated native outline.
See `m1b-question-format-results.json` for actual comparison results and remaining
adapter fidelity/offline issues. A successful question-format check does not
certify that generated pilot HTML can replace the existing lesson.

## M1c source-declared presentation and offline packaging

`presentation.layout` is an optional strict STARTER-roadmap composition for
faithfully mapping an existing approved guide. Every layout field is required
when present: course descriptor/mission, roadmap, Learn leader/discussion,
Perform resources and summary/help disclosures, criteria, checklist, feedback,
answer placeholders, Studio skits, comic hint/minimum image width and footer. It supplements core
source fields; it never supplies executable HTML/CSS/JS or replaces evidence.
Diagram references must resolve to static embedded SVGs. Disclosure summary +
help must equal the complete approved step; placeholders must match all actual
full-key/part identities. Vocabulary must remain in the inline Learn text.
Unsupported mode/layout combinations, incomplete mappings and executable or
external-resource SVG constructs fail before output. Other modes retain the
previous contract and require their own production fidelity proof.

The renderer omits the network-discovery helper and uses the unchanged master's
existing `placeArt` fallback over declared embedded pools. It embeds the approved
compass favicon, preserves the original bounded comic-image rule in a tagged
packaging style, and normalizes inline SVG `viewBox`, without modifying master
source, CSS or engine. Actual questions/rubrics and F1 checks remain blocking.
Run `test-m1c-3050201.cjs` and hosted `check-m1c-browser.cjs`; the fixture remains an
isolated audit mapping, never a replacement authoritative outline or deployed LG.
