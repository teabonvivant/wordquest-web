# SmartQuest Olympiad classroom sync (OLY-1.0)

The checked-in `upstream/` snapshot is the teaching application from Math Explorer commit `dc186cb5b620f4927b64337c5a6e1d3cc3c287d9` (44 lessons, 8 units, 280 original questions). It contains no source PDFs, credentials, user records or audio recordings. Question/lesson/source-map JSON is copied byte-for-byte. Source mappings indicate method provenance, not verification of every original paper answer.

Run `python tools/sync_olympiad.py`, then `node olympiad_tests/sync_test.mjs`. The normal `build_math_m1.py` and full `build_r37.py` also run the synchronizer, preventing the entry from disappearing on future rebuilds. To refresh from Math Explorer, review and replace the allowlisted snapshot files, update the pinned source commit, and rerun checks.

The four new entry tiles live on `app/index.html#p/olympiad`. A same-origin iframe hosts the entire curriculum, diagrams, classroom tools, testing, results, review and source boundary pages. Existing level challenges, MC/fill quizzes, thinking tower and strategy cards are retained.

`host.js` connects only the currently open iframe to the current child's host profile. `scope-store.mjs` uses an account-and-child-specific local sidecar, retains guests only in parent-page memory, respects the host edit lease, refuses conflicting writes and preserves corrupt records. It respects the host's study permissions and retains R3.19's arcade-only time policy. It does not mint coins or mark existing levels complete. The classroom's export/import requires the existing parent gate. Classroom progress is not yet in the host's family-wide backup; its own Progress page explicitly instructs separate export. No history is silently copied from a different website origin or child.

OpenAI voice setup is incomplete. This build intentionally ships no Tracy recordings, browser TTS fallback or API calls; the reading controls are omitted until the requested voice is configured.

Build output: `app/olympiad-classroom/`, with `sync-manifest.json` for hashes. The synchronizer only patches explicit app-shell anchors, preserving R3.19 and later independent changes; changed anchors fail rather than overwrite unknown upstream code.
