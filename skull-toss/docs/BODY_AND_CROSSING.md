# Morty's body and the Challenge Stage (v48)

## His body, section by section (`07p_body.js`)

Morty arrived in this world as a skull and nothing else. Each of the first seven end bosses holds one section of his
body, named in the map's JSON as `sheet.reward.section`:

| Map | End boss | Section |
|---|---|---|
| 1 Crow Hollow | The Pumpkin King | `leftArm` |
| 2 The Gilded Graveyard | Count Crookula | `rightArm` |
| 3 The Whistling Woods | Old Marrowroot | `ribs` |
| 4 The Drowned Theater | The Ringmaster | `spine` |
| 5 The Black Marsh | Madame Muck | `pelvis` |
| 6 The Bone Desert | The Undertaker | `leftLeg` |
| 7 The Clockwork Caves | The Clockwork King | `rightLeg` |
| 8 The Black Abyss | The Reel Reaper | none: his shard closes the Black Ring |

The build refuses:

- a section that isn't one of the seven;
- a section given twice.

**When an end boss goes down** (`mainBossDown`, `07b_stage.js`), `bodyReward`:

1. adds the section to `profile.body`, a list only ever of the seven ids, in order;
2. puts up the card, *Morty gets a piece of himself back*;
3. runs the `body` cutscene. His whole figure is drawn over a dimmed frame, with what's missing pencilled in, and the new section flies in from the side, spinning. It snaps on with a clang and a ring of light (and the GPU layer's sparkle).

The end boss's look (a hat, the vines…) is still his to wear too.

- **In the save.** A save code or a cloud save carries `body`. A merge keeps what either side has.
- **In the Profile.** The Profile card draws him as he stands: *Morty's bones, n of 7*.

Drawing is `drawBody(c, x, y, r, have, options)`. It works in the skull's own radius: rubber-hose bones in cream and ink, white gloves and cartoon shoes, with the skull drawn last by `drawSkull`.

## The Challenge Stage: the crossing (`07q_crossing.js`)

After an end boss (except the last), the order is:

> body section → Black Ring shard → Can Alley (optional) → **the crossing** → the next map

The crossing is ten throws long (`CROSS.throws`).

- **The road.** The scene is dressed as the next map, and every throw, make or miss, carries the camera a 6.6 m step along the road into it (`crossingAt()`). The tenth ends at 0, exactly where the map's own travel begins, so the map starts without a jump.
- **The rings.** Each throw's ring waits somewhere new in the ring's space, frozen, on wings, gliding to its next place. They get smaller as the road goes on (`rc0` to `rc1` around `RC_START`). The positions come from the run's dice (`rrIn`), so a replay sees the same ones.
- **The pay.**
  - Each ring through pays 5 bones (`per`).
  - The fifth and tenth are gold, drawn with a gilt band and a light, and pay 20 (`gold`).
  - All ten is a clean crossing, worth `100 + 50 × map` more.
- **Misses are free** (`freeMiss`). There are no continues, hazards, targets or power-ups here.
- **A reload mid-crossing** picks up at the next map's start (`saveRunSnapshot`).
- **The profile** counts `crossings`, `cleanCrossings` and `crossThrows`.
- **The HUD** shows the next map's name and the throws so far.

## Testing

`SkullToss.debug`:

- `crossings(on)` and `bodyShow(on)` turn them on in the spec's sandbox. The older tests expect the next reel straight after a boss, as with `encore(on)`.
- `crossing()` gives the crossing's state.
- `body()` gives his sections, this run's, and the one being shown.
- `cleanBody` and `mergeBody` exercise the save.
- `drawBodyTo(have)` draws him off-screen.

The spec (the v48 tests) covers:

- all eight maps travelling, clear of the throw corridor;
- the Left Arm coming home after the Pumpkin King;
- the save rules;
- the Profile card;
- a whole crossing: its start, a ring, a free miss, the gold rings, the arrival and map 2.
