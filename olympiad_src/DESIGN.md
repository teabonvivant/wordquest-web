# Integrated Olympiad classroom

This surface extends the established SmartQuest R3.19 interface. The visual authority is `r37_src/s10_shell.css` and the live `#p/olympiad` hub. The visitor mode is Operate: children learn and answer questions, and can return to the same subject navigation.

- The synchronizer copies the existing `:root` design tokens into `assets/theme-tokens.css`. The parent shell inherits those same tokens directly. Use `--r37-font`, deep blue/purple surfaces, the existing yellow primary action and gold focus ring.
- One subject header contains the back arrow, existing Olympiad planet and active learner. The six-item bottom navigation is cloned from the actual app hub, including its existing SVG icons and routes. Four compact classroom tabs use the hub's actual SVGs: 教學、小測、錯題、進度. Do not add a second product logo/header.
- Lists and unit navigation use dark cards, the shared spacing/radius language and duotone line icons. Preserve the teacher/assistant characters and their educational identities.
- Questions, diagrams, manipulatives, answer fields and detailed solutions sit on light teaching surfaces with dark ink. These surfaces intentionally differ in luminance from the starfield, while sharing the same font, button geometry, gold primary actions and purple selection/focus states. Never recolour SVG question contents or change numbers, geometry or feedback for decoration.
- Controls are at least 44px high; the main back control is 48px. Keep mobile tab labels concise. At 390px and larger, the classroom itself must not overflow horizontally; diagrams and source tables may use their existing local overflow containers when necessary.
- Keep hover/focus/disabled/selected states readable. AA foreground/background checks live in `olympiad_tests/sync_test.mjs`. Respect reduced motion and do not add continuous decorative animation to the teaching surface.

Editable implementation: `host.js`, `host.css`, `bridge.js`, `classroom-theme.css`. Generated assets are rebuilt with `python tools/build_math_m1.py` or `python tools/sync_olympiad.py`. `upstream/` is the unchanged teaching snapshot, not the place for SmartQuest-specific skin edits.
