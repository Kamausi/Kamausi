# Quality: the pipeline, the manual pass, and what makes a launch candidate

## The automated pipeline (CI runs all of it on every push)

| Layer | Command | What it covers |
|---|---|---|
| Build checks | `python3 src/build.py` | strings (none missing, none unused, placeholders match), map data against the blueprint, art, duplicate names across parts, the page-size budget |
| Static checks | `node tools/lint.mjs` | the assembled game: undefined names, duplicate keys, unreachable code, assignments to constants |
| The spec | `node tools/run-spec.mjs` | 231 checks in a real browser, clock paused, save untouched. See the README's test list: throwing and scoring, the ring's paths, tiers, targets, hazards, bosses, power-ups, continues, saves and migrations, every mode, the Codex, secrets, the Vault, Souls, careers, mastery, sound, the board, replays, the arcade, challenges, the Director's Challenge, analytics consent, the live config, the platform shells, seasons, and v44: the blueprint gate, anchors, obstacles, target types, the Pumpkin King, the new slots, the profile picture and occlusion |
| Audits | inside the spec | the content audit (every cross-reference whole), the economy audit (prices, rarity ladder, Soul catalog parity, pacing), no string missing at run time |
| Server | `node --test firebase/functions/test/*.test.js` | Souls, receipts, refunds, the run check, the board, analytics, support's tools, the server-side switches |
| Device matrix | `node tools/matrix.mjs` | eleven sizes from a 320-px phone to an ultrawide: no sideways scroll, nothing clipped, nothing off-screen, touch targets ≥ 40 px, every control named, the HUD and field fit. Results: [QA-MATRIX.md](QA-MATRIX.md) |
| Soak | `node tools/soak.mjs 6` | a bot plays every mode, 48 runs in all, with continues, cards and mischief on. After every throw: no NaN, lives in range. After every run: a save code round trip and a replay of the same run to the same score |
| Packaging | `python3 tools/package.py web` | the installable web build assembles, with its service worker and manifest |

**Regression rule:** every version keeps every earlier version's checks. A bug fixed gets a check that fails without
the fix (v41's balloon-replay check is the pattern).

## Bugs the v41 pass found and fixed

- **Replays on the balloon map could drift** (the soak test). Balloons swayed on the absolute clock, which keeps
  running between runs, so a replay watched later saw them a little elsewhere. They sway on the run's own time now.
- **`progArc` was never declared** (the linter). The arcade clock only worked because browsers make element ids
  global. It's declared now.
- **The Vault overflowed a 320-px phone, and switches, tabs and outfit slots were small for fingers** (the matrix).
  The grid columns now shrink, long names wrap, switches have a finger-sized hit area, and tabs and slots grow to
  44 px on touch screens.
- **Dead code** (the linter): an unused headstone table and four unused drawing helpers are gone.

## The manual pass

Automated checks can't feel the game. Before a launch candidate, one person plays through this list on real
devices, and notes anything off in the tracker with its severity.

**Devices:** a small Android phone (≤ 360 px wide, mid-range or older), a recent iPhone, an iPad, a Windows or Mac
laptop with a mouse, a Steam Deck (or a gamepad on a desktop), and a slow phone with battery saver on.

**Browsers:** Chrome and Firefox (desktop and Android), Safari (Mac and iOS), and Edge. Also the installed web app
(Add to Home Screen), the iOS and Android apps, and the desktop app.

| Area | Check |
|---|---|
| Touch | pull back, aim and release feel right. A tap anywhere on a sheet's switch row works. No double-tap zoom. |
| Mouse and keyboard | drag to throw. Arrows aim, Space throws, Esc pauses, Tab walks every control with a visible focus ring. |
| Gamepad | the stick aims, A throws, Start pauses; menus can be walked. On the Deck, the default layout plays everything. |
| Screen sizes | portrait and landscape phone, tablet, desktop, ultrawide: nothing clipped, the ring always reachable. |
| Lifecycle | lock the phone mid-run, take a call, switch apps: the run pauses and resumes; closing and reopening offers Resume. |
| Audio | music and effects on the first tap. Mute and the sliders work. Sound stops in the background and comes back. |
| Low end | 30+ fps on the slow phone, with quality stepping down on its own. No audio crackle. |
| Accessibility | reduced motion, flashes off, high contrast and large text each hold across the game; VoiceOver/TalkBack read the menus. |
| Progress | play through Story to the end (map 8), check the Codex, the Archive, the pieces, the credits. |
| Economy | earn and spend bones, claim challenges, open a Coffin, buy a Soul look (sandbox store), take a continue, claim the streak. |
| Online | board posts, a weekly best, a replay link opened on another device, a flag changed in `config/live` shows up live. |
| Offline | airplane mode: the installed app and the native apps still play. Souls say they're offline, and nothing breaks. |
| Consent | the play-data question comes once, after the first run. Saying no sends nothing (check the network tab). |

**Severity:**
- **S1:** a crash, lost progress, lost purchases, or anything a store would reject.
- **S2:** a feature broken, or a layout unusable on a supported device.
- **S3:** wrong but workable.
- **S4:** cosmetic.

## A launch candidate

A build is a launch candidate when:

1. CI is green: build, lint (0 errors), spec, audits, server tests, matrix, soak and packaging.
2. The manual pass is done on every device and browser above, with **no open S1 or S2**, and every S3 triaged
   (fixed, or accepted with a reason).
3. The store checklists ([store/CHECKLIST.md](../store/CHECKLIST.md)) are complete for the platforms shipping.
4. `src/version.json` is bumped, and the build number is noted with the candidate.

If any of this changes after it's called, it isn't a candidate any more: fix, re-run, re-call.
