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

## The sky over the road (`06g_travel.js: skyUpdate`, v58)

How far along the map's track the camera stands (`TRAVEL.D` over the track's end) is the night's progress `p`. From it:

- **The moon.** It moves outward and down on its own side of the sky: `dx` toward its edge (at most 0.55 U), `dy` down
  to just above the horizon. The path is eased (smoothstep) and scaled by the map's `travel.sky.arc`. It never crosses
  the ring's band. The moon's plate, its halo (now drawn live, `drawSkyGrade`), its GPU light, the vignette's clearing
  and its road down the water (`moonPath`, its own plate on the water maps) all take the same offset.
- **The night.** A wash over the sky plate, from `late[0]` at the zenith to `late[1]` at the horizon, at `p × k`.

`travel.sky` is `{ arc 0–1, late [zenith, horizon], k 0–0.6 }`, checked by the build. The screen (the Drowned Theater)
and a moonless map don't move.

## The ring's reflection (`08l_water.js: RING_REFL`, v58)

The ring has exactly one reflection, and only over water: `drawRingReflection`. It draws the ring, a boss and the skull
in flight, mirrored at the ring's own water line with a cartoon squash (`REFLECT.ring`, 0.26), darkened, and laid in
wavering strips like the scenery's reflections. It is drawn every frame whatever the phone's quality; the scenery's
reflections still drop out first. The ring's post gets slow rings in the water round it. `drawTrackAndShadow` gives the
ring no shadow over water. The boardwalk ends at `WALK_END` (3.3 m, `01_data.js`) so the ring stands in open water.

## The MapTravelController (`06g_travel.js`, v58)

`travelDistAt(h)` returns how far on the camera stands after `h` makes, from two things:

- the **map's profile**: its `travel` block (step, arrival, land, sky);
- the **mode's movement profile**, `MAP_TRAVEL`:

| Profile | Modes | Movement |
|---|---|---|
| `legs` | Adventure, Adventure+ | The travel table: steps through acts I–III and the approach, still through the bosses. |
| `road` | Arcade, Practice, the Director's Challenge, the Feature | 0.8 × step a make, linear, then easing toward the track's end (the slopes meet: no lurch). |
| `arena` | Boss Rush | The arena of the boss being fought. |
| `still` | the attractions, the title | Stays at 0. |

`travelGoal` is the only caller, and the camera anticipation (`08k_feel.js`) reads the same function. A new mode names
its profile in the table; nothing is special-cased by map or mode.

## The flow (`06i_flow.js`, v58)

Curl noise: `curl(x, y, t, scale, octaves)` is the curl of a value-noise potential, so the field has no sources or sinks
(its discrete divergence is zero at the curl's own step, and the spec checks that). Built on it:

- `current(x, y, z, t, drift)` is the underwater current. It has two layers, a macro swirl plus the biome's drift and
  micro turbulence, in m/s.
- `wander(seed, t)` is a creature's own meander.

**Uses:**

- the aquatic motes, bubbles, the weed's sway (`FLOW_SWAY`) and the swimmers' wander;
- fireflies, spores, embers and the weather's bubbles;
- the mist banks;
- the portal's motes.

**The rule:** nothing in the skull's flight, the aim, the ring, the targets or the obstacles reads it. The spec throws
the same throw twice with the water churning between and checks the two flights match.

## The aquatic environment (`08m_aquatic.js`, `06j_aqua_props.js`, v58)

A map with water has an `aquatic` biome in its JSON. It has two kinds.

**`submerged`** (the Drowned Theater): the camera is under water. `look.ambient.water` must be false: no surface, no
reflections, no dive.

| Layer | What |
|---|---|
| far | `far`: whales, mantas and schools crossing where the sky would be (`drawAquaFar`). |
| floor | Caustics: a tileable folded-light tile made once, laid in perspective bands, two layers drifting against each other (`drawCaustics`). |
| world | The creatures, merged into the scenery by depth (`aquaWorldList`, drawn in `drawGroundWorld`). |
| column | Attenuation (thickest at the horizon), light shafts, marine snow, bubbles, and the caustics again, fainter, over everything standing (`drawAquaColumn`). |
| front | Now and then a big dark fish passes close, low in the frame and to one side, never while aiming or in flight (`drawAquaFront`). |

**`surface`** (the Black Marsh): the camera is above murky water. The life under the water is drawn on the water plane
as dark shapes with a sheen along their backs. What sits on the water is drawn in the world. Ripples come from
swimmers, frogs, bubbles and insects.

**Fauna and behaviour:**

| Creature | Biome | Behaviour |
|---|---|---|
| school | submerged | Members follow their place in the group, a beat behind; they burst apart when threatened and regroup. |
| fish | submerged | Wander on the flow and scatter. |
| crab | submerged | Crawls sideways in fits and starts; digs in when threatened. |
| eel | submerged | Comes out of its hole and sways, then goes back; goes back at once if threatened. |
| jelly | submerged | Drifts on the current with a slow pulse. |
| turtle | submerged | Glides across every so often. |
| octopus | submerged | Sits and shifts colour; jets away. |
| shrimp | submerged | Little flicks along the floor. |
| minnows, bigfish, swamp-eel, tadpoles | surface | Shapes under the surface; big fish make a boil now and then. |
| frog | surface | Sits on its own pad; jumps in when startled and climbs back later. |
| snapper | surface | Its head comes up and goes down, with a ring each way. |
| gator | surface | Eyes and snout far off, gliding, with a V wake. |
| strider | surface | Skates the surface in darts, dimpling it. |
| dragonfly | surface | Darts on the flow and touches down. |

A threat is the skull within 2.6 m, or the world travelling past (near the lane). Swimmers steer out of the ring's
cone (`|x| < 2.1 + 0.1 z` at throw heights) and are clamped out of it (`aqKeepOut`). None of it is ever hit.

**Depth:** each creature's colour is blended toward the water's `deep` colour with distance, and its ink fades. Near
ones read darker-lined and larger; far ones are muted.

**The sea bed's scenery (`06j_aqua_props.js`):** coral (fan, brain, branch), barnacled rock, seaweed, shells, anemones,
a broken stage flat, a ruined column, a wall with a playbill and a sand drift. These are ordinary travel scenery,
placed through the zones' mixes.

**Seat rows:** a travel zone can carry `rows` with these fields:

- `asset`, `every` (metres between rows), `deep` (seats per row) and `from`;
- `stagger`;
- `gone`, `over` (knocked over: `tilt`) and `buried` (sunk into the floor and clipped at it: `sink`).

The build checks the `aquatic` block: its kind, the fauna that belong to that kind, 0–12 of each, and the water's
colours, ranges and current.

## MAP → ECOSYSTEM → CAST (`blueprint.json: ecosystem`, `08n_wildlife.js`, v58)

Characters are not global. `blueprint.json: ecosystem` holds three things:

- `cast`: every character and creature, with the maps it may appear on;
- `variants`: the character's look per map:

| Character | Variants |
|---|---|
| skeleton | plain · drowned · bleached · echo |
| gravedigger | sexton · prospector |
| zombie | intro · plain |

- `identityTest`: the ten questions.

Each map's `ecosystem` holds:

- `teaches`: the order's word for its place;
- `cast`;
- `wildlife` counts for the land and air creatures;
- `vegetation`, `props` and `hazards`;
- `heat` (the desert).

The build (`ecosystem_problems`) derives who a map actually shows from what the code reads, and refuses a map that
shows anyone who isn't in its cast, or whose cast has anyone the rules don't allow there. What it reads:

- the walkers, the ghost flag, the gravedigger, the witch and the cat;
- the sky life (crows, or bats, or both with `batsToo`);
- the fireflies;
- the water's fauna;
- the wildlife.

In the code:

- `castVariant(who)` picks the look: the skeleton's cel is washed and dressed per variant (`skeletonVariant`), the echo
  flickers and trails a double, and the gravedigger wears a prospector's hat in the desert.
- `flockKind()` decides who flies over. Travel zones' flocks use it too, so the Woods and the desert get none.

**The Map Identity Test**, per map:

| # | Question | Check |
|---|---|---|
| 1 | Without the background, is it still identifiable? | ≥ 4 scenery kinds no other map has. |
| 2 | Does the cast belong? | Every member allowed; at least one not on either neighbour. |
| 3 | Does something live here? | ≥ 2 kinds of wildlife. |
| 4 | Does it grow its own? | ≥ 2 vegetation kinds, all on its track. |
| 5 | What's lying about? | ≥ 3 prop kinds, all on its track. |
| 6 | Its own ground? | Lane unlike both neighbours'. |
| 7 | Its own air? | Weather unlike both neighbours'. |
| 8 | Does it teach its lesson? | `teaches` = the order's word; hazards named. |
| 9 | Its own palette? | Sky + ground mid-tones ≥ 20 (RGB) from every other map. |
| 10 | Is its end its own? | A lair landmark no other map has. |

**The wildlife (`08n_wildlife.js`)** is the land and air counterpart of the aquatic module. It shares:

- the travel shift (creatures keep their place in the world as the camera moves);
- threats (the skull near, or Morty going by);
- the flow (wander) and the depth tone;
- the merge into the scenery's depth order.

Creatures and behaviour:

| Creature | Behaviour |
|---|---|
| owl | Perched; turns its head after the skull; blinks; flies off when threatened. |
| deer | Grazes, alerts, bounds away. |
| fox | Trots across, sits, trots on. |
| spirit | A glowing wisp wandering on the flow, with a GPU glow. |
| vulture | Circles high. |
| scorpion | Crawls; digs in when threatened. |
| tumbleweed | Rolls with the wind, bouncing; never closer than 6.5 m. |
| clockbug | Runs while wound, then rewinds its key. |
| fungi | Pulse; flare when threatened; GPU glow. |
| voidling | Fades in far off, watches, fades out. |
| fragment | A piece of an earlier world, turning and drifting. |

`drawHeatHaze` wavers the band over the horizon with strip copies of the frame. It is drawn before the ring, so the ring
never wavers. Spirits and fragments are clamped out of the ring's cone.
