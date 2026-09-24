# Skull Toss: the V14+ roadmap audit, checked against the v12 source

**Checked on:** 2026-09-24
**Inputs:** `skull-toss-src.zip` (the v12 source: 39 JS parts, CSS, markup, art and the build), `skull-toss-with-music.html` (the v12 build) and a standalone `TEST_SPEC.js`.
**Not available to check:** any V13 build, the Spatial & Environmental Blueprint, the design bible and the map and boss discussions. Claims that rest only on those are marked *unverified*.

This takes the 27-item roadmap audit and checks every item against what the code does today. The audit's main idea holds up: versions are production gates, not feature lists, and cross-cutting systems run under every version. It has three kinds of problem:

1. It misses live problems in the shipped build that are more urgent than anything on its list (section 2).
2. It treats about a third of its versions as new work, but v12 already ships a version of them (section 3).
3. Its own order puts several safeguards after the thing they protect (section 4).

Section 5 is the pipeline with those fixed. Section 6 lists the decisions that only you can make.

## 1. Baseline

| Check | Result |
|---|---|
| `python3 src/build.py` | Builds `index.html`: 1,178,596 bytes from 39 JS parts |
| The v12 spec (the `TEST_SPEC.js` inside the zip) against that build, headless Chromium at 390×844, DPR 2 | **103/103 pass** |
| The standalone `TEST_SPEC.js` against the same build | 92/95 pass |

The standalone `TEST_SPEC.js` is the spec from before v12. Its three failures are all things v12 changed on purpose:

- **HUD.** It expects the hits beside the score, in Fredoka. v12 puts them under the score, in Bebas Neue.
- **Shot timeline.** It expects the transient cue once across the whole throw. v12 counts cues only up to the sting, because the skull's landing now has its own thud.
- **Boss states.** It steps 1/60 s after the knockout. v12 holds the knockout, so the `down` state comes later.

**Use the spec inside the zip, and retire the standalone file.** This is also why the audit's rule "every version must pass the previous version's tests" needs a qualifier: *except tests changed on purpose, with each change noted in the changelog.* Without it, the rule blocks every deliberate design change.

## 2. Fix now: problems in the code that the audit doesn't list

### 2.1 The debug API ships in the release build

`window.SkullToss.debug` is created every time the page loads (`src/js/10_boot.js:24`), not only under `?test` or `?debug`. It includes `setBones` (line 112), `setStats` (line 106) and `boardPush` (line 139). From the browser console, any player can give themselves bones, set their best score and post it to the shared leaderboard (if they opted in to posting).

The audit's item 20 says to formalize the debug tools. First they need to **stay out of the release build**. `build.py` should write a release build without the hooks and a dev build with them, and the spec should run against the dev build.

### 2.2 Save codes can be forged

A save code is `SKULL1.` followed by plain JSON in base64 (`exportCode`, `src/js/01_data.js:304`). Nothing signs or checks it. I tested this on the v12 build: I decoded a code, set `bones: 999999` and `bestScore: 88888888`, re-encoded it and loaded it. `importCode` accepted it, and the profile then had 999,999 bones and a best score of 88,888,888.

The merge takes bones from the newer save (line 262) and the higher value of every stat. `Board.entry()` builds the leaderboard entry from `profile.bestScore` (`src/js/03b_board.js:18`), so a forged code reaches the shared board.

Signing the code in the page won't fix this, because the key would ship in the page. What fixes it:

- Leaderboard entries come from a submitted run, never from profile stats. Imported stats never count toward the board.
- Once Souls (the premium currency) exist, balances live on a server, and save codes can't carry them.

### 2.3 The leaderboard trusts the client

Each player writes their own `leaderboard/<id>` document with whatever score their browser sends (`Board.push`). Nothing in the code checks that the score was possible. The audit puts leaderboards at V34 and score validation at V39, but the leaderboard is already live in v12.

### 2.4 Canon drift in shipped text (the audit's item 11: confirmed, and bigger than it says)

- `src/markup.html:138`: the Story card says "Four stages, and a Crow King and a Pumpkin King in each."
- `src/js/04f_achievements.js:29–30`: **Grand Tour** ("Reach stage 4") and **The Whole Reel** ("Clear all four stages", unlocked at `bestStage` 5).
- `src/js/07b_stage.js:26`: after stage 4 the list loops and gets faster. An eight-map campaign ends; it doesn't loop.
- The bosses are the Crow King and the Pumpkin King, in every stage. Fragments and missing pieces appear nowhere in the code, so the canon rule "End Bosses give Morty his fragments" isn't implemented yet.
- The v12 README says "Arcade lets you pick any of the four maps."

This is more than a text fix. `bestStage` and unlocked achievements live in players' saves. When "stage 5" stops meaning "cleared the whole game", existing saves need a migration rule. For example, The Whole Reel stays unlocked for anyone who has it, but its wording changes or it's retired. So the canon sync pass is a save-schema task too.

### 2.5 Power-ups: the code and the audit disagree

The code and the README say power-ups come "on a fixed, learnable schedule rather than by chance" (`src/js/07c_power.js:2–4`). The slots are at hits 6, 14, 21, 30, 38 and 45, drawn from a fixed deck. The audit's Power-Up Director is a weighted random pool with a pity accumulator and a per-hit probability. Those are opposite designs. Decide which is canon before V21 (section 6). If power-ups become random, the random numbers must be seeded, because the spec depends on runs being deterministic.

### 2.6 The live loop doesn't run on a fixed step

The audit lists "60-FPS simulation" as already covered. In fact the live loop calls `update(dt)` with the real frame time, capped at 1/30 s (`src/js/10_boot.js:10`). Only the spec steps at a fixed 1/120 s.

Throw outcomes come from an exact crossing solve (`crossTime` in `07b_stage.js`), so results barely depend on frame rate, but the simulation isn't fixed-step. Replays (V35) and server-side shot checks (anti-cheat) both need a seeded, fixed-step simulation that can replay a log of inputs. That's a V14 architecture decision, and it's expensive to add later.

## 3. The audit's 27 items, checked against v12

- **Exists:** a working system is there.
- **Partial:** pieces exist, but not the system the audit describes.
- **Missing:** nothing in the code.

| # | Audit item | What v12 has | Status |
|---|---|---|---|
| 1 | Continue after lives | 3 skulls, up to 5; +1 for every 5 in a row; the Second Chance power-up; game over at 0 (`07_game.js:217`). No continue, ads or revive. | Missing |
| 2 | Stage identity | 4 stage records, each with a name, speed, triangle, sequences, `bob`/`shrink` modifiers, colour tint and blurb. What sets a map apart is its colour grade and ring modifiers; the scene is the same graveyard. | Partial |
| 3 | Blockout → art pipeline | A process, so the code can't show it. There's a starting point: scene planes are optional files that the build validates (proportions, one format per plane, a size warning). | Unverified |
| 4 | Map authoring data | `STAGES` is data, and the README says new stages are "cheap to add". But each record mixes environment with difficulty, and the launcher, camera bounds and parallax planes are global. | Partial |
| 5 | Ring path system | Three modes: `line` (a sine slide, plus bob and shrink), `tri` (a triangle through depth, with learnable sequences and skew) and `boss` (the Crow King or the vine carries it). Arcade adds a speed ramp. No vertical-only, diagonal, free multi-axis or secret paths, and it isn't a separate director. | Partial |
| 6 | Tier Director | No tiers. Difficulty is the `level()` curve × stage speed, +0.3 for each loop, × the Arcade ramp. | Missing (the curve exists) |
| 7 | Boss content pipeline | The Crow King and the Pumpkin King, with visual states (enter, vulnerable, attack, hit, down) and a debug `hurtBoss`. No fragments. | Partial |
| 8 | Boss arena spatial design | Bosses fight in the stage's own scene. | Missing |
| 9 | Power-Up Director | 7 power-ups on a fixed schedule. The grab zone is the drawn prop. Each expires after a set number of throws, some have uses, badges show what you hold, and grabs play a recorded sound. | Partial, and in conflict (2.5) |
| 10 | Save-data architecture | Keys are versioned `.v1`. `cleanProfile` sanitizes every field. `MIGRATE` renames old item IDs. `mergeProfiles` settles conflicts: counters keep the higher value, unlocks are combined, and bones come from the newer save so a merge can't refund. The cloud document is `{v:1}`, save codes exist, and tests never touch real saves. Missing: one schema version with ordered migrations, backups, corruption recovery beyond "fall back to defaults", checked imports and a mid-run snapshot. | Partial (more than the audit implies) |
| 11 | Canon/implementation sync | Confirmed, and bigger (2.4). | Missing |
| 12 | UI architecture | Screens, sheets that close on Esc, medal toasts, the Vault, the Cart and pause. No shared component layer and no focus navigation for controllers. | Partial |
| 13 | Onboarding | Coaching hints on the first 8 throws (`COACH`, `07_game.js:139`), plus "Pull down, not up". | Partial |
| 14 | Accessibility | Reduced motion sets Film to Light and Camera to Still. Camera jolts can be turned off. Music, effects and ambience have separate volumes, and vibration has a toggle. An `aria-live` region announces each throw's result, the score and the skulls left (`07_game.js:211`). Aiming works from the keyboard. Missing: high contrast, a separate flash limit, UI scaling and a check that nothing relies on colour alone. | Partial (more than the audit implies) |
| 15 | Audio architecture | A mixer with buses (`02a`), ambience (`02b`), 6 recorded loops with crossfades and a synth fallback (`02c`), and the reel (`02d`). Cues sit on the shot timeline and play at most once per moment. Audio suspends when the page is hidden. | Exists |
| 16 | Haptics | `buzz(ms)` calls `navigator.vibrate`, with a Settings toggle (`04_state.js:28`). Events differ only in buzz length. iOS Safari has no Vibration API, so iPhone players get no haptics until there's a native shell (V40). | Partial |
| 17 | Platform abstraction | Pointer events (touch and mouse), keyboard, pausing and audio suspend when the page is hidden, safe-area insets, a pixel-ratio cap of 2 and adaptive quality. No gamepad. | Partial |
| 18 | Performance budget | A spec check fails if a frame costs over 60 ms. Adaptive quality cuts effects before resolution. The README has before/after measurements. No written budget. | Partial |
| 19 | QA pipeline | 103 deterministic checks, with the clock paused and storage sandboxed. They only run when someone opens `?test` by hand, and there's no CI. A short Playwright script runs them headless (appendix). | Partial |
| 20 | Debug tools | A full set: `setStage`, `setHits`, `givePower`, `hurtBoss`, `forceSpawn`, `setBones`, a visual overlay (the <code>`</code> key or `?debug`) and pose and FX inspection. **They also ship in production** (2.1). | Exists, over-exposed |
| 21 | Content validation | The build refuses bad skull layers, wrong plane proportions, sounds over 200 KB, and two script parts that define the same top-level name. The spec checks that every Vault item renders. There's no map data to validate yet. | Partial |
| 22 | Localization | English is hard-coded in the JS and markup, the page is `lang="en"`, and 10 places format numbers as `en-US`. | Missing |
| 23 | Analytics | None. | Missing |
| 24 | Economy validation | Bones come from runs, challenges, achievements and a 300-bone welcome gift. They're spent in the Vault, on Cart deals and on the Mystery Coffin (750). The merge can't refund purchases, but forged save codes create bones (2.2). No Souls and no in-app purchases. | Partial |
| 25 | Security / anti-cheat | None, and the leaderboard is already live (2.1–2.3). | Missing, urgent |
| 26 | Store / release | The web build is published on a host that provides sign-in and a database (`window.claude`, `03_cloud.js`). There's a light build and a with-music build. No native shells. | Partial (web only) |
| 27 | Live-ops safety | Daily, weekly and monthly challenges and the midnight Cart deals already rotate on the clock, with no feature flags or kill switch. | Partial |

## 4. Problems in the audit's own order

1. **Version numbers disagree within the audit.** Item 1 adds Continue to "V21 — Cartoon Physics & Failure", but the master table has Cartoon Physics at V22 and Power-Ups at V21. Item 4 puts map authoring data at "V16/V17", and the table puts it at V18. Section 5 follows the table.

2. **Some versions describe shipped features as new.** v12 already ships:
   - Modes: Story and Arcade (V26)
   - Morty's voice: Mumble and Spoken (V24)
   - the film and reel look (V23)
   - a 364-item Vault (V29)
   - ranks (V31)
   - a leaderboard (V34)
   - daily, weekly and monthly challenges (V37)

   Each of those versions rebuilds an existing feature on the new architecture. Each feature owns saved data, so each version needs a migration step and a test that old saves still load.

3. **Safeguards come after what they protect.**
   - Leaderboards are at V34 and score validation at V39, but the leaderboard is already live.
   - Souls and the shop are at V30, server-checked transactions and economy validation at V39, and in-app purchases at V40. A premium currency would exist for nine versions with no server checking it.
   - Save-data architecture has no version at all. It has to come before three things: the 8-map change redefining `bestStage` (V17–V18), Continue, which must "not corrupt the run" (V22), and Souls (V30).

4. **Continue (V22) depends on later versions.** Watching an ad needs an ad SDK (V40), and "continue-specific analytics" needs analytics (V39). Spending Bones works today. So V22 should ship the Bones continue and an ad-provider interface that reports "no ads" until V40 plugs in a real provider for each platform.

   The run also pauses whenever the page is hidden, and a phone can reclaim a backgrounded page while an ad plays. If that happens, the run is lost. Continue needs a snapshot of the run that survives a reload.

5. **Cross-cutting systems with no gate never land.** Section 5 gives each one the version by which it must exist.

## 5. The reconciled pipeline

The table keeps the audit's order and names. It adds what each gate starts from in v12, and the cross-cutting work that must be in place by that gate.

| Version | Gate | Starts from (v12) | Must land by this gate |
|---|---|---|---|
| **V14** | Core Gameplay Foundation | The whole v12 game and its 103 checks | Source in git (today it's only in a zip). CI runs the spec headless on every push. **A release build without the debug hooks.** **The leaderboard stops trusting profile stats** and takes per-run submissions. A seeded, fixed-step simulation. One save-schema version with ordered migrations. A local telemetry event bus (no backend yet). Input abstraction: pointer, keys and gamepad feed one aim model. A canon sync inventory (2.4). |
| **V15** | Visual + Animation Foundation | Visual system v1–v2, the shot director, FX recipes, adaptive quality | Accessibility limits built into the FX director (flash, shake, reduced motion). A written performance budget. A shared UI component layer. |
| **V16** | Spatial & Environmental Blueprint | The multiplane scene and the plane art pipeline | A draft map-data schema |
| **V17** | Stage Identity + Map Progression | 4 stage records with tints | Map schema v1, with environment and tier as separate records. The canon sync fixes (Story copy, achievements, the loop rule) land with a save migration. |
| **V18** | Map Authoring + 8-map blockout | `STAGES` data | The build validates map data. Map 1 goes through the full pipeline. Playtests produce telemetry. |
| **V19** | Targets, Obstacles, Ring Path + Tier Directors | Ring modes and the `level()` curve | The Ring Path Director and Tier Director as systems |
| **V20** | Mini-Boss + End-Boss Framework | The Crow King, the Pumpkin King and boss states | Boss arena spec, the boss production pipeline, fragments from End Bosses |
| **V21** | Power-Up System | 7 power-ups on a fixed schedule | The canon decision (section 6), seeded if random |
| **V22** | Cartoon Physics + Failure + Lives/Continue | Lives, Second Chance, the GAME OVER card | The Bones continue. An ad-provider interface with no ads yet. A run snapshot that survives a reload. A continue can't corrupt the score or combo. |
| **V23** | Lost Cartoon Reel Presentation | The film overlay, reels and iris | — |
| **V24** | Morty Personality + Voice | 28 grab lines, Mumble and Spoken | **String IDs for all text** (groundwork for localization) before the text-heavy versions |
| **V25** | Perfect Throws + Signature Shots + Cartoon Camera | The rostrum camera and jolts | — |
| **V26** | Modes + Mini-Games + Post-Boss Challenges | Story and Arcade | — |
| **V27** | Codex + Production Archive | — | Codex text uses string IDs |
| **V28** | Secrets + Misbehaving Cartoon | — | — |
| **V29** | Cosmetics + Customization | The 364-item Vault and the Cart | ID migration for any renamed items |
| **V30** | Bones + Souls + Shop | The Bones economy | **Before Souls ship:** a server checks balances and purchases, save codes can't carry Souls, and the economy gets an exploit review |
| **V31** | Profile + Rank + Career Progression | 8 ranks and 43 stats | — |
| **V32** | Shot Book + Mastery | — | — |
| **V33** | Audio Expansion + Sound Sets | The audio engine | Content only |
| **V34** | Leaderboards + Social | The live leaderboard | **Before this ships:** server-side score validation and rate limits |
| **V35** | Cartoon Replays + Sharing | — | Replays reuse the V14 input log, which also serves shot validation |
| **V36** | Diegetic Arcade | Arcade mode | — |
| **V37** | Daily/Weekly/Monthly Challenges | All three exist | Rotation moves behind feature flags |
| **V38** | Director's Challenge | — | — |
| **V39** | Analytics + Economy + Live-Service Infrastructure | — | An analytics backend for the V14 event bus. Feature flags, a kill switch and event scheduling. |
| **V40** | Platform/Store Release Preparation | The web build | Native shells, in-app purchases, ads, iOS haptics, gamepad, Steam |
| **V41** | Full QA + Certification/Launch Candidate | 103+ checks in CI | A device matrix |
| **V42+** | New Reels / Seasons / Events | — | — |

After V18, every map still goes through the audit's per-map pipeline: design → spatial blueprint → blockout → mechanical test → art → animation → audio → FX → boss → QA → optimization → ship.

## 6. Decisions only you can make

1. **Power-ups: a fixed schedule or random?** v12's written design is a fixed, learnable schedule. The audit's Power-Up Director is a weighted random pool with pity. Pick one before V21.
2. **After map 8, does the campaign end or loop faster?** Today it loops. The answer decides how `bestStage` is migrated and what The Whole Reel means.
3. **Does Arcade offer all eight maps, or only the ones you've cleared?**
4. **Where will the live game's backend run?** Checking scores and Souls on a server needs somewhere to run those checks. The current host gives each player a document that only they can write. That's fine for saves, but nothing checks what goes into it. This decides V30 and V34.
5. **Where should the source live?** This document is on `Kamausi/Kamausi`, the GitHub profile repo whose README shows on your profile. The game source is still only in a zip. A dedicated repo (for example `skull-toss`) would give it history and CI.

## Appendix: how the baseline was measured

Build the light version from the zip with `python3 src/build.py`. Put `index.html`, `TEST_SPEC.js` and `music/` in one folder, then run this with Node and Playwright:

```js
// run-spec.mjs: node run-spec.mjs <folder with index.html and TEST_SPEC.js>
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const dir = process.argv[2], port = 8811;
const srv = http.createServer((q, r) => {
  const f = path.join(dir, q.url.split("?")[0] === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200); r.end(d); } });
}).listen(port);
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pg.goto(`http://localhost:${port}/index.html?test`, { waitUntil: "domcontentloaded", timeout: 120000 });
await pg.waitForFunction(() => window.__skullTossResults, null, { timeout: 300000 });
const res = await pg.evaluate(() => window.__skullTossResults), fail = res.filter(r => !r.pass);
console.log(`${res.length - fail.length}/${res.length} passed`);
for (const f of fail) console.log("FAIL:", f.name, "\n   ", f.error);
await b.close(); srv.close(); process.exit(fail.length ? 1 : 0);
```

The script exits non-zero on any failure, so it can serve as the CI step for V14. Use `waitUntil: "domcontentloaded"`: in headless testing, the 17 MB with-music build didn't reach the `load` event within Playwright's default 30 s timeout.
