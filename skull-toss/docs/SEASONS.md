# Seasons: how to run one, and how to write the next

Story ends at map 8. Seasons are what comes after: a few weeks at a time, each with its own name and colour, a
Season Ticket to climb, notes to meet, looks that exist only that season, and a Feature to play. Season One, **The
Midnight Matinee**, runs 1 October to 1 December 2026.

## What a season is (`src/js/07l_season.js`)

```js
s1: {
  n: 1, from: "2026-10-01T00:00:00Z", until: "2026-12-01T00:00:00Z", color: "#E8893A", pass: "pass:s1",
  feature: { map: 2, twists: ["fog", "bonanza"] },
  track: [ [free, premium], … twenty stubs … ],   // a reward is { bones: n } or { look: "kind:id" }; premium may be null
  notes: [ { id, n, xp, have: run => … }, … ]
}
```

- **Dates** are UTC. The season is on from `from` until `until`. Its Ticket then stays open **seven days** for
  claiming. After that, whatever wasn't claimed has expired.
- **The Season Ticket** has twenty stubs, one every 250 season experience. Season experience is what a run earns in
  the career (hits, perfects, bosses, pieces, shots, targets, score), doubled on the Feature, plus each note's
  experience when it's met. Practice earns none. Every stub has a free reward. Some also have a second reward,
  paid only to holders of the **Premium Ticket**.
- **The Premium Ticket** is a Soul item on the server (`firebase/functions/shared/economy.js`: `"pass:s1"`, 600
  Souls), bought from the Season sheet. It gives looks and bones only: nothing that changes a throw.
- **Season notes** are six goals across the season. Their progress adds up run by run, and each pays its experience
  once.
- **Season looks** are catalog items with `season: "s1"` and no price or goal (`src/js/01b_catalog.js`). They're
  owned only once claimed from the Ticket. In the Vault they show while their season is on (as rewards to earn), and
  afterwards only to those who earned them.
- **The Feature** is a mode for the season alone. It plays on one map, with the Director's twists on top of Arcade's
  rules, under a night grade. Replays of it carry its rules, so they still play after the season is gone.

## Running a season: `config/live`

| `season.id` | Effect |
|---|---|
| `""` (default) | seasons run on their own dates |
| `"s1"` | Season One is on now, whatever the date (to open early, extend, or test) |
| `"off"` | no season, and no claiming either (an emergency stop) |

`modes.off: ["feature"]` takes just the Feature away. `event.banner` with `event.from` / `event.until` can announce
the season on the title, and `event.bones` / `challenges.bonus` can make its first weekend a double.

## Writing the next season

1. **Data.** Add `s2` to `SEASONS` with its dates (after `s1`'s end), `n: 2`, a colour, `pass: "pass:s2"`, a
   Feature (any map, and any of the six twists in `07k_director.js`), twenty stubs and six notes.
2. **The Premium Ticket.** Add `"pass:s2"` to `ITEMS` in `firebase/functions/shared/economy.js`, and deploy the
   functions before the season starts.
3. **Looks.** Add the season's looks to the catalog with `season: "s2"`, and what they're drawn from to the drawing
   tables (`SKINS`, `RINGS`, `TRAILS`, `BANDS`, `AIMS`…). Ids must be new: the economy audit refuses a duplicate. It
   also refuses a look no Ticket gives, and a Ticket giving a look that doesn't exist.
4. **Words.** In `src/strings/en.json`, add `season.s2.name`, `.line`, `.feature` and `.featureLine`, plus any new
   `season.note.*`. The content audit refuses a season with a missing string, a Feature twist that doesn't exist,
   or dates that run backwards.
5. **Check.** `python3 src/build.py --dev && node tools/run-spec.mjs`. The audits run inside the spec. Move the clock
   into the new season with `SkullToss.debug.seasonAt("…")` in the dev build to try it.
6. **Ship.** Bump `src/version.json`, deploy the functions, host the new build, and (if the old build must not see
   the new season's items) set `build.min`.

A season ends by itself on its date. To end one early, set `season.id` to `"off"`, or to the next season's id.
