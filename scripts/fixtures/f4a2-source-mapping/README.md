# F4a2 approved source mapping — isolated fixtures

Captain GO authorizes source mapping only. These files are inspectable inputs for
the existing F1/M1/M2 validators. They are not production-authoritative sources,
HTML builds, a source migration, a new curriculum registry, or permission to release.
The live native outline, production HTML, master, evidence and visibility are unchanged.

The two `*.source.json` files preserve the complete native Day text and revision,
then append typed fields only in the isolated copy. `derivedFrom.paragraphs` and
`mapping-manifest.json` retain every original paragraph and its checksum. The native
Part Overview is preserved in the manifest, including its already-approved mode
reconciliation: Day 2 controls are isolated guided Learn practice; Perform-day
retrieval/recipes belong beside the project runway. Current Captain GO confirms
the mapping of those passages without changing their wording or identities.

| Guide | Source passage | Mapped location |
|---|---|---|
| 3050202 LEARN | Group Learn, exact event/loop/x explanation and demo | `group_learn.text` |
| 3050202 LEARN | Teacher prediction/paper-flow preparation | `group_practice.text` |
| 3050202 LEARN | Guided Player build/test/save, original Perform passage | One `connected-player-controls` activity in `group_practice` |
| 3050203 PERFORM | Complete loop explanation, recipe and comparison | `group_practice.text` as preparation |
| 3050203 PERFORM | Fixed/random, y-direction and one-parameter teacher demo | One preparation activity in `group_practice` |
| 3050203 PERFORM | Original independent work, five drops, Player check, observation note/save | Original sentences in `perform.steps` |

Day 2 has no separate active Perform section. Day 3 has no separate active Group
Learn section. No source passage was deleted to obtain that result. Every original
Learn/Practice/Perform paragraph occurs exactly once across the applicable mapped
instruction fields. Teacher-reference paragraphs also remain verbatim in the archive;
they do not become invented student tasks. Original questions/rubrics/keys and one
short response are preserved; no A/B/C architecture or model answer was invented.
Accepted evidence is copied from each original rubric's Meets criterion.

The inherited source labels below remain immutable clock labels, not a new mode
classification. In particular, `project build/test` maps to guided Practice for Day 2.

| Original slot | Total | Work | Transitions | Submissions | Day 2 role | Day 3 role |
|---|---:|---:|---:|---:|---|---|
| Warm-Up | 4 | 3 | 0 | 1 | Warm-Up | Warm-Up |
| Group Learn/demo | 13 | 12 | 1 | 0 | Learn | Preparation |
| Practice/prediction | 7 | 6 | 1 | 0 | Same connected guided activity | Teacher preparation |
| Daily evidence | 6 | 5 | 0 | 1 | Independent explanation | Independent explanation |
| Build/test | 15 | 13 | 2 | 0 | Continue the same guided build once | Independent project/test/note/save |
| Save/Temperature/Studio | 5 | 3 | 0 | 2 | Reflection/choice/save | Reflection/choice/save |
| Total | 50 | 42 | 4 | 4 | Four handoffs | Four handoffs |

These are explicit planning estimates inside the approved slots, not measured school
timings or proof of student completion. The final five-minute slot covers a small
student-chosen Studio attempt, reflection and saving, not all three suggested products.

Static M2 reviews are bound to these exact mapped source/payload hashes. They are
assistant reviews with lesson-specific teaching/criterion/pacing reasons. The check
does not generate or refresh PASS reviews. Any later source change must invalidate
the binding and receive an affected review. No synthetic-review helper is used.

Shared artwork declarations, four RTF notes, response-field label and Xtra capture
frames reuse the previously inspected 3050201 source fixture. They do not supply
new lesson content. Native optional specific confusion wording is retained; the
existing required general-feedback frame remains separate. Actual classroom tool,
browser and Collector execution is not asserted by the schema's planning declarations.

Run without building any HTML:

```sh
node scripts/fixtures/f4a2-source-mapping/check-source-mapping.cjs
```

`--write-results` updates only this fixture directory's `results.json`. Checks cover
raw-source preservation, one occurrence per instructional passage, unchanged evidence,
F1/M1/M2, exact six-slot budgets, deliberate content-loss/duplication/mode/review/budget
failures and protected-file checksums. No renderer or production build is called.

Core approved instruction is representable under existing rules. Reusing the older
rich `presentation.layout` for Learn/Perform is still rejected by the unchanged
STARTER-only gate. F4a3 must separately handle live-native typed-source intake and
fresh bindings, template-based presentation/accessibility fidelity, and audit use of
approved mapped roles instead of the archived free-form headings. No such change is
implemented here. Fixture PASS is not production readiness or release.
