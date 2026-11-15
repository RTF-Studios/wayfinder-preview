# M1c isolated production fidelity fixture

Audit input only; never a new curriculum source or student guide. The Personal
Master Outline remains authoritative and is unchanged. `source-copy.json` keeps
its original native Day text unchanged, followed by the isolated typed mapping.
The native source revision and all independent F1 inputs were read again during
M1c. The F1 identity inputs remain the existing M1b fixture, not a new registry.

The question 305020130059, single response, accepted evidence, holistic rubric,
TEKS, learning target, project goal, evidence states and identities are unchanged.
Core source fields map to `m1a-3050201/original-day.txt`; supplementary presentation
maps verbatim to `m1a-3050201/original.html.txt`: Prototype descriptor, mission,
roadmap/sequence/success, Learning Leader/discussion, resources, disclosure
summaries/help, criteria, response placeholder, feedback, checklist, Studio intro,
footer, comic reading hint and Official Dress Code skit. No curriculum text was
invented to fit the schema. The full native hand-in and next-day bridge remain in
the validated record; they are not appended as duplicate student workloads.
Vocabulary appears in the approved Learn prose rather than a new panel.

The optional strict `presentation.layout` supports this explicit STARTER roadmap
composition. It requires complete mappings, validates media and question-field
references and preserves all disclosure step text. It is not raw HTML, CSS or
JavaScript and cannot override questions, rubrics, destinations or the engine.
Unsupported mode/layout combinations fail. Other production modes/lessons have
not been certified for full fidelity by this one pilot.

Only packaging changes: omit the online-discovery artwork helper, invoking the
unchanged master's existing embedded-pool `placeArt` fallback; embed the existing
compass favicon; render the approved static SVG inline with canonical `viewBox`
case. SVGs with executable or external resource constructs reject. Random pool
selection, image-error fallback, skit and all answer controls remain master-owned.
The original scoped comic-image minimum-width rule is copied as strictly bounded
source-declared packaging; the canonical master CSS block stays byte-identical.
No master source/JS, canonical lesson, Drive ID, Show setting or evidence is modified.

Tests: `node scripts/test-m1c-3050201.cjs` builds through the real native F1+M1 entry
and runs failed-build preservation cases against both an original copy and a
previous successful isolated build. `M1C_PILOT_DIR` retains isolated output for
`node scripts/check-m1c-browser.cjs`. The GitHub job records exact complete visible
text, section order/geometry, three viewports, expanded scaffolds, zero network
calls, blank/edited responses, simulated copy failure, keyed Form interception,
Xtra controls, checklist relock/draft retention and screenshots. Clipboard is
stubbed; actual clipboard and Collector receipt remain UNTESTED.
