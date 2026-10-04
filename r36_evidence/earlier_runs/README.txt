These three files are from an EARLIER run of the older suites (R3, R3.1, R3.2, arcade) on a previous R3.6 build
(SHA-256 93c08fa9...). They include two suites that failed at that time because the tests still expected the old rules
(r3 integration_regression 365 pass / 64 fail, r31 characters_browser 83 checks interrupted); the tests were then
corrected (see legacy_test_updates.md) and re-run, see legacy_rerun_after_test_fix.txt.
The FINAL results are in ../legacy_summary.json and ../legacy_logs/ (all 39 suites, final build c2bc868b...).
