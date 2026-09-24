# Debug and development tools

Everything a developer needs to look inside the game or put it in any state. It's in three places:

- **Every build** carries the visual debug overlay and a read-only console handle (`SkullToss.*`). Nothing there can
  change a score, a balance or a save.
- **The dev build** (`python3 src/build.py --dev` → `index-dev.html`) adds the test hooks, `SkullToss.debug.*`, which
  can do anything. Turn on the sandbox first (`SkullToss.debug.sandbox(true)`) so nothing you do touches your real save.
  The release build leaves the hooks out; CI checks they're gone.
- **The tools** in `tools/` run the checks from the command line.

## The roadmap's list, and where each one is

In the dev build, `T` below is `SkullToss.debug`. Call `T.sandbox(true); T.pause(true)` first: the clock stops, and
`T.step(seconds)` moves it on.

| Tool | How |
|---|---|
| Force map | `T.start(); T.setStage(n)` (Story), or `T.startMode("arcade", mapIndex)` |
| Force tier | a map's first half runs its first tier and the second half its second: `T.setHits(25); T.stageCheck()` moves on to the second. `T.tier()` shows the tier in play |
| Force boss | `T.startBoss("mini")` or `T.startBoss("end")`; `T.hurtBoss(n)` to knock it down |
| Spawn ring / target / hazard / power-up | `T.freezeRing(x, y, z)`, `T.setRingPhase(p)`; `T.plantTarget(…)`, `T.refillTargets()`; `T.plantHazard(…)`, `T.setWind(v)`, `T.fogIn()`; `T.spawnPickup(id)`, `T.givePower(id)` |
| Set score / hits | `T.setScore(n)`, `T.setHits(n)`, `T.setLives(n)` |
| Trigger a perfect | `T.throwThrough()`, or `T.throwAt(x, y)` with `T.aimFor(…)` / `T.predictCrossing(x, y)` |
| Trigger death | `T.setLives(1)` and a wild `T.throwAt(2.6, 0.4)`; `T.endRun()` ends the run |
| Trigger a secret / mischief | `T.secretName("Morty")`, `T.upwardPull()`, `T.titleIdle(61)`; `T.secrets()` lists those found; `T.misbehave("jam")` for any of the six misbehaviours |
| Unlock a look | `T.setStats({ unlocked: ["skull:gold"] })`, `T.cartBuy(kind, id)` |
| Add bones / Souls | `T.setBones(n)`; Souls through the stand-in server: `await T.fakeServer(); T.setWallet({ souls: 500 })` |
| Reset the save | `T.setStats({})` in the sandbox; in a real save, Settings → Reset progress |
| Inspect state | `T.state()`, `T.profile()`, `T.runStats()`, `T.hz()`, `T.powers()`, `T.modeState()`, `T.director()`, `SkullToss.telemetry()` |
| Collision and hitboxes | the overlay (press **`**): the ring's tube, clean and perfect windows, the skull's collision circle, the post |
| Trajectory | the aim guide (Settings → Aim guide), `T.previewInfo(x, y)`, `T.predictCrossing(x, y)` |
| Camera bounds | the overlay's camera readout; `T.camera()`, `T.parallax()`, `T.setCamera(…)` |
| Seasons | `T.seasonAt("2026-10-15T12:00:00Z")` moves the season's calendar (`T.seasonAt(null)` puts it back), `T.setSeasonRec({…})`, `T.claimSeason(i, prem)`, `T.startMode("feature")` |
| FPS and performance | the overlay's panel (frame rate and cost); `SkullToss.debug.visualAnimation.quality()`; `T.perf()` |

## The console, in every build

| Call | What it gives |
|---|---|
| `SkullToss.telemetry()` | this session's play log |
| `SkullToss.errors()` | uncaught errors this session (v39) |
| `SkullToss.economy()` | the economy audit and its pacing numbers (v39) |
| `SkullToss.version()` | build number, save schema, where the live flags came from |
| `SkullToss.platform()` | where the game thinks it's running, and what it can do there (v40) |
| `SkullToss.debug.visuals` | the overlay's switches |
| `SkullToss.debug.visualAnimation` | poses, FX recipes, cues, quality |

## Audits, in the dev build

- `T.contentAudit()`: every map's bosses exist and appear once, each end boss has one piece, and every boss, power-up, hazard, target, shot, mode, secret, document, twist and note has its words. Achievements count stats the game keeps, and challenges have wording and pay (v41).
- `T.economyAudit()`: the catalog's rules and pacing (v39).
- `T.missingStrings()`: any string ID asked for at run time that doesn't exist.

The spec requires all three to come back empty.

## From the command line

| Command | What it does |
|---|---|
| `python3 src/build.py [--dev] [--with-music] [--pwa]` | builds, and refuses a missing string, a bad map, a duplicate name or an oversize page |
| `node tools/run-spec.mjs` | the spec: every check, in a real browser |
| `node --test firebase/functions/test/*.test.js` | the server's handlers |
| `node tools/lint.mjs [--warnings]` | static checks on the assembled game (undefined names, duplicate keys, unreachable code) |
| `node tools/matrix.mjs` | eleven screen sizes, every sheet: layout, clipping, touch targets, names (writes docs/QA-MATRIX.md) |
| `node tools/soak.mjs [runs] [seed]` | a bot plays every mode; checks state, saves and replays after every run |
| `node tools/store-assets.mjs` | icons, screenshots and Steam capsules |
| `python3 tools/package.py web\|capacitor\|electron\|all` | the platform packages |
