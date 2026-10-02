Older suites run against the R3.4 build (sandbox, Chromium emulation).
first_pass_summary.txt : first pass. r3_release and r31_all failed on one case: cloud-island "controlled jumps complete three islands d0 seed456".
                         Cause: the scripted bot in arcade_tests/bots.cjs landed on an enemy; R3.4 raised the island heights, so the bot's fixed timing changed.
                         Fix: the bot now aims the landing away from an enemy on the next island (a player would). The game was not changed.
second_pass_summary.txt: r3_release rc=0, r31_all rc=0 and a sample of the R3.3 suites, after the fix and on the final build.
arcade_r1_regression and tests_integration: the same 10 of 429 math-template cases fail as on R3.2 (retained bank 28 skills / 84 templates; 4N7, 6N2, 6N3 R3 templates). Not arcade, not touched by R3.4.
