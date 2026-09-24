# Stage Identity Bible

Generated from `src/maps/*.json` by `tools/stage_bible.py`. Edit the map files, not this page.

Every map has a mechanical identity, not just an art theme: the **mechanic** row is what changes about the throw.

| # | Map | Mechanic | End boss holds |
|---|---|---|---|
| 1 | Moonshine Cemetery | None | Morty's Top Hat. |
| 2 | The Crooked Crypts | Bob | Morty's Bow Tie. |
| 3 | Pumpkin Patch Hollow | Wind | Morty's White Gloves. |
| 4 | The Bone Orchard | Falling fruit | Morty's Cane. |
| 5 | The Drowned Bayou | Fog banks | Morty's Spats. |
| 6 | The Carnival of Lost Souls | The carousel | Morty's Whistle (his voice). |
| 7 | The Clockwork Belfry | The pendulum | Morty's Pocket Watch. |
| 8 | The Final Reel | Jump cuts | Morty's Shadow, and Morty whole again. |

## 1. Moonshine Cemetery (Reel One)

*The graveyard where Morty was buried with the reel in 1933. Everything here learned to dance while he was gone.*

| | |
|---|---|
| Mechanic | None: the ring slides, then flies its triangle. The map that teaches the throw. |
| The throw | Plain arcs under a still sky. |
| Targets | Stone faces that wake to watch you. |
| Hazards | None; the bosses bring their own. |
| Ring | speed ×1.0, path: triangle, modifiers: none |
| Tiers | I before the mini-boss, II after |
| Mini-boss | `crow` |
| End boss | `undertaker`, holding `tophat` |
| Camera | The rostrum camera at rest: lean, follow, settle. |
| Ambient | The gravedigger, the black cat, zombies, skeletons, a werewolf, the witch. |
| Look | moon: art, skyline: graveyard, lane: dirt, props: graveyard, frame: branches, weather: none |
| Palette | sky #131A28 → #26364A → #4A4A63 → #66506B; ground #34464A → #22322F → #172320 → #0E1614 |
| Music | The original waltz at 92 bpm. (playback ×1.0) |
| Sound | Shovels, meows, groans, thunder. |
| Transition | An iris on the moon. |
| Reward | Morty's Top Hat. |

## 2. The Crooked Crypts (Reel Two)

*A courtyard of leaning mausoleums where the dead keep their good silver and their bad tempers.*

| | |
|---|---|
| Mechanic | Bob: the ring rises and dips as it slides. |
| The throw | Read the bob, not just the slide. |
| Targets | Torches that flare when you swish past them. |
| Hazards | Bats that dive across the lane. |
| Ring | speed ×1.08, path: triangle, modifiers: bob |
| Tiers | II before the mini-boss, II after |
| Mini-boss | `batbaron` |
| End boss | `count`, holding `bowtie` |
| Camera | Tighter, lower, torchlit. |
| Ambient | Skeleton pallbearers, ghosts, bats in their hundreds. |
| Look | moon: crescent, skyline: crypts, lane: flagstone, props: crypts, frame: chains, weather: mist |
| Palette | sky #120E1E → #241A3A → #3E2C58 → #5A3E6E; ground #3A3448 → #26202F → #18141F → #0E0B12 |
| Music | The waltz in a minor key. (playback ×0.97) |
| Sound | Rattles, drips, chains. |
| Transition | A crypt door grinding shut. |
| Reward | Morty's Bow Tie. |

## 3. Pumpkin Patch Hollow (Reel Three)

*A harvest-moon farm where the pumpkins grin back and the scarecrow has opinions about crows.*

| | |
|---|---|
| Mechanic | Wind: gusts push the skull sideways in flight. The weathervane and the leaves show which way. |
| The throw | Aim into the wind; the guide bends with it. |
| Targets | Jack-o'-lanterns that light up when a throw passes near. |
| Hazards | Gusts. |
| Ring | speed ×1.15, path: triangle, modifiers: bob, shrink |
| Tiers | II before the mini-boss, III after |
| Mini-boss | `scarecrow` |
| End boss | `pumpkin`, holding `gloves` |
| Camera | Wide and warm, the harvest moon low. |
| Ambient | Crows on the fence, the black cat, a zombie farmhand, the witch against the moon. |
| Look | moon: harvest, skyline: farm, lane: furrows, props: patch, frame: cornstalks, weather: leaves |
| Palette | sky #2A1420 → #5A2A2E → #A24A2E → #D8843A; ground #5A3A22 → #3E2616 → #2A1A10 → #180E08 |
| Music | The waltz on a fiddle, a touch quicker. (playback ×1.03) |
| Sound | Wind, rustling corn, caws. |
| Transition | A gust of leaves across the lens. |
| Reward | Morty's White Gloves. |

## 4. The Bone Orchard (Reel Four)

*Rows of trees that grow bones instead of apples. Harvest season is noisy.*

| | |
|---|---|
| Mechanic | Falling fruit: bones drop from the branches through the lane. A falling bone knocks the skull away. |
| The throw | Time the throw between drops; the shadow shows where one will land. |
| Targets | Hanging bone-fruit that pay when you clip them. |
| Hazards | Falling bones. |
| Ring | speed ×1.22, path: triangle, modifiers: bob, shrink |
| Tiers | III before the mini-boss, III after |
| Mini-boss | `owl` |
| End boss | `marrowroot`, holding `cane` |
| Camera | Under the canopy, dappled. |
| Ambient | Skeleton pickers, ghosts in the rows, spores drifting. |
| Look | moon: full, skyline: orchard, lane: bones, props: orchard, frame: vines, weather: spores |
| Palette | sky #0E1A14 → #1E3226 → #3A5A3A → #6A8A4A; ground #3E4A36 → #2A3424 → #1C2418 → #10160E |
| Music | The waltz on xylophone. (playback ×1.0) |
| Sound | Clacks, rattles, creaking branches. |
| Transition | Leaves closing like a curtain. |
| Reward | Morty's Cane. |

## 5. The Drowned Bayou (Reel Five)

*A flooded chapel in the cypress swamp. The bell still rings underwater on Sundays.*

| | |
|---|---|
| Mechanic | Fog banks: drifting fog hides the ring for a beat. Its reflection in the water never lies. |
| The throw | Throw on the reflection when the fog rolls in. |
| Targets | Lily pads with frogs that croak a bonus. |
| Hazards | Fog. |
| Ring | speed ×1.28, path: triangle, modifiers: bob |
| Tiers | III before the mini-boss, IV after |
| Mini-boss | `gator` |
| End boss | `madame`, holding `spats` |
| Camera | Low over the water, reflections below the ring. |
| Ambient | Fireflies, ghosts on the water, a heron of bones. |
| Look | moon: crescent, skyline: bayou, lane: boardwalk, props: bayou, frame: moss, weather: fireflies |
| Palette | sky #0A1618 → #15302E → #2A4A40 → #4A6A52; ground #1E3A36 → #142A28 → #0C1C1A → #061010 |
| Music | The waltz slowed on a harmonica. (playback ×0.94) |
| Sound | Croaks, drips, a drowned bell. |
| Transition | A ripple wipe. |
| Reward | Morty's Spats. |

## 6. The Carnival of Lost Souls (Reel Six)

*A midway that never closed. Every game is rigged and every prize is haunted.*

| | |
|---|---|
| Mechanic | The carousel: after the mini-boss the ring rides a circle instead of a triangle. |
| The throw | Lead a ring that never stops turning. |
| Targets | Shooting-gallery ducks that pop up behind the ring. |
| Hazards | Balloons drifting through the lane. |
| Ring | speed ×1.34, path: circle, modifiers: bob, shrink |
| Tiers | IV before the mini-boss, V after |
| Mini-boss | `jester` |
| End boss | `ringmaster`, holding `whistle` |
| Camera | Bright and busy, bunting overhead. |
| Ambient | Skeleton carnies, confetti, the Ferris wheel turning. |
| Look | moon: crescent, skyline: carnival, lane: sawdust, props: carnival, frame: bunting, weather: confetti |
| Palette | sky #1A0A1E → #3A1230 → #6A1E3A → #9A3A3A; ground #6A5438 → #4E3C28 → #34281A → #1E160E |
| Music | The waltz on a calliope. (playback ×1.06) |
| Sound | Honks, bells, a barker's patter. |
| Transition | A spinning star wipe. |
| Reward | Morty's Whistle (his voice). |

## 7. The Clockwork Belfry (Reel Seven)

*A rain-soaked town square under a clock tower that has been striking thirteen since 1933.*

| | |
|---|---|
| Mechanic | The pendulum: a great pendulum sweeps the lane on the clock's beat. Throw between swings. |
| The throw | Count the ticks. |
| Targets | Bells that ring for a bonus. |
| Hazards | The pendulum. |
| Ring | speed ×1.4, path: triangle, modifiers: shrink |
| Tiers | V before the mini-boss, V after |
| Mini-boss | `cuckoo` |
| End boss | `clockking`, holding `watch` |
| Camera | Looking up at the tower, rain on the lens. |
| Ambient | Rain, gargoyles, zombies with umbrellas, lightning. |
| Look | moon: none, skyline: city, lane: cobbles, props: belfry, frame: gears, weather: rain |
| Palette | sky #101418 → #20282E → #38424A → #56606A; ground #3A3E44 → #2A2E34 → #1C2024 → #101216 |
| Music | The waltz ticking in strict time. (playback ×1.02) |
| Sound | Ticks, gears, a bell. |
| Transition | Clock hands wiping round. |
| Reward | Morty's Pocket Watch. |

## 8. The Final Reel (Reel Eight)

*The picture palace where the last print of Morty's cartoon is kept. Something in the projection booth cut him out.*

| | |
|---|---|
| Mechanic | Jump cuts: the film skips and the ring jumps between frames. A flicker warns you a frame before. |
| The throw | Watch for the flicker; throw where the cut lands. |
| Targets | Film canisters in the aisle. |
| Hazards | Missing frames: the ring vanishes for a beat. |
| Ring | speed ×1.48, path: jumpcut, modifiers: bob, shrink |
| Tiers | V before the mini-boss, VI after |
| Mini-boss | `projectionist` |
| End boss | `reaper`, holding `shadow` |
| Camera | The projector's beam, dust in the light. |
| Ambient | Ghostly audience, ushers, dust. |
| Look | moon: screen, skyline: theatre, lane: carpet, props: theatre, frame: curtains, weather: dust |
| Palette | sky #0A0808 → #1A1210 → #2A1A16 → #3A2218; ground #5A1A1A → #3E1212 → #2A0C0C → #160606 |
| Music | Every map's waltz, cut together. (playback ×1.0) |
| Sound | The projector's clatter, a reel spinning out. |
| Transition | THE END card. |
| Reward | Morty's Shadow, and Morty whole again. |

## Tiers

Map = environment, Tier = mechanical intensity.

| Tier | Ring speed | Ring size | A hazard every | Targets | Power-up rate | Precision |
|---|---|---|---|---|---|---|
| I | ×1.0 | +0.00 m | — throws | 0 | ×1.0 | ×1.0 |
| II | ×1.0 | +0.00 m | 6 throws | 1 | ×1.0 | ×1.0 |
| III | ×1.04 | -0.01 m | 5 throws | 1 | ×0.95 | ×0.97 |
| IV | ×1.08 | -0.02 m | 4 throws | 2 | ×0.9 | ×0.94 |
| V | ×1.12 | -0.03 m | 4 throws | 2 | ×0.85 | ×0.92 |
| VI | ×1.16 | -0.04 m | 3 throws | 3 | ×0.8 | ×0.9 |
