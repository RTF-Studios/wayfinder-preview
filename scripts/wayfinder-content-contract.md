# M1 source-to-build contract

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

Legacy `parse`, `outline` and historical assembly bodies remain in the repo for
separately authorized migration/cleanup. They are not reachable through the new
production build entry. Old free-form snapshots lacking explicit M1 fields are
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
