# World systems (v54, v56, v57)

This covers these systems:

- the musical clock the world moves to;
- how the travel scenery is laid out;
- how a boss's lair reveals itself;
- the portals between places;
- the carnival's attractions (the mini-games);
- the land (hills, dips and a bending road);
- the band (layers over the music).

Each section says where the code lives and what the tests check.

## The musical clock (`02f_music_clock.js`, `src/audio/beats.json`)

**What it does.** One clock gives the beat, the position within the beat, the bar and the phrase. It reads the
recorded track's playback position, smoothed between the browser's updates, through that track's beat map. A beat map
lists the time of every beat in the loop.

**Beat maps.** `node tools/beatmap.mjs` makes them. It decodes each loop in headless Chromium and builds an onset
envelope. It then finds the tempo by autocorrelation and tracks the beats one by one, letting the period drift slowly.
A loop whose tempo wanders therefore stays in step.

| Loop | Tempo (BPM) |
|---|---|
| menu | 108.6 |
| a | 106.2 |
| b | 104.6 |
| boss | 109.9 |
| pause | 98.6 |
| shop | 104.3 |

**No music playing.** When the sound is muted, a track is loading, or the game is under test, the clock runs free at
104 BPM on the world's time. The scenery moves the same way every time.

**Roles, not a metronome.** Each kind of scenery has its own relation to the music, a phase of its own, and a strength
of its own (`Groove`):

| Kind | Movement |
|---|---|
| Grass and corn | Sway all the time |
| Trees | Sway over two beats |
| Pumpkins, jack-o'-lanterns, hay, scarecrows | Hop on alternate beats (half the pieces on the ones and threes, half on the twos and fours) |
| Some gravestones | Settle once a bar |
| Lanterns | Swing every two beats |

**Phrases.** The phrase (four bars) changes who's busiest: bars 9–12 the trees, 13–16 the gravedigger.

**Hand-overs.**
- One act hands over to the next on the next bar, crossing over two beats.
- A boss comes in on the next beat.
- The pause menu and the Cart come in at once.
- The next act is fetched while the current one plays (`reelSoon`).

**The boss's music.** The recording can't change, so the fight adds to it:
- under half the boss's health, a drum on every beat, scheduled from the clock on the music bus;
- under a quarter, a hat between beats as well;
- on the knockout, the music drops away on the next beat, holds, and comes back (`musicHold`).

**The loops' keys** (v57). `tools/beatmap.mjs` also finds each loop's key: a pitch-class profile from FFT frames every
quarter second, matched to the Krumhansl–Schmuckler major and minor profiles. It's stored with the beat map.

| Loop | Key |
|---|---|
| menu | A minor |
| a | C major |
| b | C major |
| boss | G minor |
| pause | E minor |
| shop | C major |

**Not done.** True stems (separate recordings of the drums, bass and melody) would let the recorded score itself change.
The loops are single mixes, so the band plays over them instead (below).

## The travel scenery (`06g_travel.js`)

The land is a field, not a strip. Scenery is laid out in these passes:

1. The lane-side rows.
2. The tree lines.
3. **Clusters** (v54): a few pieces of the zone's own mix arranged round a centre, then turned, scaled and nudged. The
   shapes are a copse, a knot of stones, a patch, and a stand of trees. They sit anywhere from just off the lane to well
   out in the field.
4. **Far masses** (v54): the zone's backdrop, larger, 30–60 m out.
5. **Low ground dressing** beside the lane (v54).
6. **The arena frame** (v54): big trees either side of each boss's ground.
7. The landmarks.
8. The near-edge silhouettes.

**Density.** A slow swell along the track decides where the clusters go. There are open stretches on purpose.

**Flat ground detail** (v54). Dead grass, pebbles, twigs, leaf litter and scuffs lie across the lane too. They're
painted on the ground, so they never stand in a throw's way.

**The lair's clear zone.** Nothing but the lair itself stands within 32 m in front of the boss's lair and across its
width.

**Under load.** The ground dressing and the clusters' small pieces (`lite`) are the first things to go when adaptive
quality steps down.

Terrain height and the bending road: see The land, below.

## The lair's reveal (`06g_travel.js: LANDMARK`)

Every boss's lair on the horizon is drawn smaller still when it's far away, a perspective pushed further than true. It
comes into view in stages:

| Distance | What you see |
|---|---|
| Beyond 120 m | A small dark shape in the haze |
| 120 → 75 m | Its colour comes up through the silhouette |
| 75 → 55 m | Its `reveal` part appears (the Pumpkin King's crown) |
| Inside 45 m | Full size |

A lair's SVG can have an optional `<g id="reveal">` layer (see `src/art/travel/king-lair.svg`).

## Portals (`07t_portal.js`)

One state handles every hand-over:

`PORTAL_OPEN → throw → RIFT_TRAVEL → RIFT_EXIT → the destination's set-up (behind the rift) → play`

The sequence after an end boss:

1. The end boss goes down, and the ring, its pole and the targets go at once.
2. The reward, the body part and the shard follow.
3. A black portal opens where the ring was.
4. A make through it goes into the rift: the camera follows Morty down a tunnel until the far end opens on the
   destination. A miss costs nothing.

**Routes.** Boss → Can Alley (if you take it) → portal → the next map (or the crossing into it). If you skip Can Alley,
the portal goes straight to the next map.

**In tests.** The spec's older tests run with portals off (`T.portalsOn()` switches them on).

## Power-ups (`07c_power.js`)

| Where | Power-ups |
|---|---|
| From the start | Skull Rush, Deadeye, BONK Blast, Ghost Toss, Bone Magnet, Second Chance, Cursed Skull |
| Map 2, the Gilded Graveyard | **Lucky Skull**: a clank off the rim can drop in (60%, two uses) |
| Map 3, the Whistling Woods | **Ricochet**: a bonk costs nothing (one use) |
| Map 4, the Drowned Theater | **Heavy Skull**: smashes through obstacles and seeds (three uses) |
| Map 5, the Black Marsh | **Time Bone**: the ring, hazards, machinery and targets at half speed |
| Map 6, the Bone Desert | **Combo Bone**: +×0.25 for each make in a row |
| Adventure+ only | **Chaos Skull**: every make rolls ×1–×4 |

**Dealing.** A map's new prop goes into the Director's bag twice on that map.

**Synergies.** A make while both of a pair are on pays ×1.5:

| Pair | Synergy |
|---|---|
| Heavy Skull + Ricochet | Pinball |
| Ghost Toss + Deadeye | Phantom Eye |
| Time Bone + Combo Bone | Slow Burn |
| Lucky Skull + Second Chance | Charmed |
| Skull Rush + Time Bone | Warp Speed |
| Chaos Skull + Cursed Skull | Doom Roll |

**v57: six with physics of their own** (`07v_newpowers.js`), each running in the flight's own steps on the run's time:

| Power-up | From | How it works |
|---|---|---|
| Vine Swing | map 3 | The vine's end sways over the lane at 2.8 m. Within 0.42 m of it the skull grabs: a pendulum round the branch (5.6 m up), steered toward the ring's x, released when its free flight would cross the ring's plane at the ring's height. |
| Diving Skull | the water maps | A first touch on open water before the ring dives (`s.sub.dive`): it settles 0.55 m down, steers under the ring, and within 1.6 m of the ring's plane breaches on a 0.45 s arc to where the ring will be. |
| Clone Skull | map 5 | Two analytic clones fanned ±0.75 m/s. At the ring's plane, if the skull would miss and a clone is through, the clone takes its place (`cloneSwap`). |
| Rewind Bone | map 6 | A miss while it's on isn't counted (no life, no streak lost). When the miss has played, the skull runs back along its recorded path over 0.9 s, the ring's phase returns to the launch, and the throw is taken off the count. |
| Homing Bone | map 7 | Proportional steering: in the last 0.75 s before the ring's plane, if the predicted crossing is within 1.5 m of where the ring will be, the skull accelerates toward it (up to 14 m/s²). |
| Gravity Flip | map 8 | The throw's gravity is −G (`skull.g`). The aim mapping, the guide and the ground test all use the throw's own gravity, so the aim still marks the ring-plane crossing. A miss goes up and away. |

## The attractions (`07u_attractions.js`, v56)

The eight mini-games are attractions, not ring challenges. While one is on:

- the ring is hidden, and nothing crosses it (`attrOn()` switches the ring test off in the flight);
- the ring is parked on the attraction's plane, so the aim guide's reticle, the camera's safe box and the camera's
  follow all read that depth;
- the flight is judged where it crosses that plane (`attrCheck`), or, for Can Alley's cans and Sudden Death's
  blades, by a swept test against each thing;
- a hit resolves as `tgt` or `bull` and a miss as `board`, `curtain`, `pocket`, `fake`, `blade`, or the usual `wide`,
  `over`, `low` or `short` (07_game.js: `RESULT`). The attraction's word replaces the ring's, and it never lights the
  ring, pays a skull for a streak, or counts as a signature shot.

**Longshot's throw.** The aim point is on the board's plane and the flight time grows with the square root of the
distance, so a throw carries 150 m without leaving the screen. The skull is kept visible to 24 m past the board.

**Randomness.** The attractions roll the run's dice (`runRand`), so a replay plays the same gallery, rounds, winds and
cans.

**In tests.** `T.attr()` reads the state, `T.attrThrow(x, y)` throws to meet (x, y) on the plane, and
`T.attrProps`, `T.attrCurtain`, `T.attrWindSet`, `T.attrSwing(ahead)` and `T.pitchHoles()` set things up.

## The land (`06h_land.js`, v57)

Each map's `travel.land` sets:

| Key | Meaning | Range |
|---|---|---|
| `hills` | how high the land rises either side of the road | 0–8 m |
| `roll` | how much the road itself rises and falls | 0–4 m |
| `wave` | the length of the road's swells | 40–300 m |
| `curve` | how far the road bends (1 is about 9 m either way) | 0–2 |
| `bend` | the length of the bends | 60–400 m |

- **Looks only.** Within 9 m of the camera the land is flat and the road straight. The height eases in to 48 m out and
  the bend to 22 m, so the play space never changes.
- **Relative to the camera.** A hill ahead flattens into the ground under the next throws as the world advances.
- **The bend moves things sideways, not the camera.** The camera always faces the same way, so the road snakes across
  the view and a lair on the horizon swings into line.
- **Drawing.** 23 slices from 170 m in to 9 m. Each is a curtain from its skyline down to the highest point any nearer
  slice reaches, painted with the ground plate's own gradient (so flat land matches the painted ground exactly). The
  map's hill colour comes up where the land rises, with a rim and a faint ink line only along real crests.
- **In among the scenery.** The props, the wanderers and the ground dressing are drawn between the slices at their own
  depths, so a crest hides the foot of whatever stands beyond it.
- **The road.** A strip over the slices in the lane's own material, fading in beyond the ring.
- **Under load.** The hill colour and the crest lines go when adaptive quality steps down.

## The band (`02f_music_clock.js`, v57)

Parts scheduled on the musical clock a tenth of a second ahead, on the music bus, in the playing loop's key. They play
over the acts and the boss only (no drive or hats over the boss, which has its own drum), and never with the music off.

| Layer | When | What |
|---|---|---|
| drive | three in a row | a soft kick on one and three |
| hats | on fire (six in a row) | eighth-note hats |
| heart | the last skull | lub-dub on every beat |
| walk | the world moving | woodblock on the off-beats (switches by the beat) |
| bass | the last eight hits before a boss (Adventure) | root and fifth, a note to the half bar |
| sting | a perfect or a bullseye | four notes up the scale on the next four eighths |

Layers come and go on the bar line. `T.bandDry()` runs the scheduler without sound for the tests.
