# Stage Identity Bible

Generated from `src/maps/*.json` by `tools/stage_bible.py`. Edit the map files, not this page.

Every map has a mechanical identity, not just an art theme: the **mechanic** row is what changes about the throw.

| # | Map | Mechanic | Anchor | Obstacles | End boss gives |
|---|---|---|---|---|---|
| 1 | Crow Hollow | None | branch | none | hair:vines and the hollow shard |
| 2 | The Gilded Graveyard | Environmental interaction | arch | bumper | beard:handlebar and the gilded shard |
| 3 | The Whistling Woods | Trajectory and deception | sign | fan | beard:roots and the whistle shard |
| 4 | The Drowned Theater | Timing and stage movement | rope | bar, barrier | hair:quiff and the drowned shard |
| 5 | The Black Marsh | Environmental hazards | post | crusher, spikes | hair:moss and the marsh shard |
| 6 | The Bone Desert | Distance and precision | hand | cannon | wings:vulture and the desert shard |
| 7 | The Clockwork Caves | Mechanical timing and complex trajectories | gear | bar, crusher, magnet | wings:clockwork and the clockwork shard |
| 8 | The Black Abyss | Final Ring completion | chain | bar, barrier, bumper, magnet | wings:shadow and the abyss shard |

## 1. Crow Hollow (Reel One)

*The hollow where Morty was buried with the reel in 1933. The crows kept it for the Pumpkin King, and the pumpkins learned to grin.*

**Concept.** Teach the throw. Nothing in the hollow is in the way; everything in it watches.

| | |
|---|---|
| Visual | A harvest hollow at dusk: a crooked barn, a windmill, pumpkin rows, crows on every rail. |
| Spatial | Open and shallow: one clean lane between the pumpkin rows, the ring hung from the old oak's branch right over it. |
| Mechanic | None: the throw itself. The ring swings side to side on its rope, then flies its triangle. |
| The throw | Plain arcs under a still sky. Lead the swing. |
| Targets | Jack-o'-lanterns hung in the oak, still at first. |
| Hazards | None; the bosses bring their own. |
| Ring | speed ×1.0, path: triangle, modifiers: none |
| Tiers | I before the mini-boss, II after |
| Boss | The Pumpkin King's mouth is the ring and his eyes are targets: shut his eyes to stop the seeds, then throw down his throat. |
| Anchor | `branch` |
| Obstacles | first half: none; second half: none; end boss: none |
| Targets | first half: standard; second half: standard, swinging |
| Mini-boss | `crow` |
| End boss | `pumpkin`, gives `hair:vines` and the `hollow` shard |
| Lighting | key [-0.55, 0.83], ring readability 0.34 |
| Camera | The rostrum camera at rest: lean, follow, settle. |
| Ambient | Crows on the rails, the black cat, a zombie farmhand, the witch across the harvest moon. |
| Look | moon: art, skyline: farm, lane: dirt, props: patch, frame: branches, weather: leaves |
| Palette | sky #261826 → #4E2A34 → #944A34 → #D08A48; ground #4E3A24 → #382818 → #261A10 → #150E08 |
| Music | The original waltz at 92 bpm. (playback ×1.0) |
| Sound | Caws, creaking rope, rustling corn. |
| Transition | An iris on the moon. |
| Reward | Pumpkin-Vine Curls and the first shard of the Black Ring. |

## 2. The Gilded Graveyard (Reel Two)

*Where the rich were buried with their money. The gold never stopped shining, and it never stopped moving.*

**Concept.** Introduce the environment talking back: things by the lane move when Morty hits them, and gold bounces.

| | |
|---|---|
| Visual | Gold-domed mausoleums, gilded angels and urns, moonlight on marble. |
| Spatial | The lane runs under a gilded arch; urns and bells stand close by it, near enough to touch. |
| Mechanic | Environmental interaction: gilded urns bounce the skull, and bank shots count. |
| The throw | Play the urns: a bounce off gold can still find the ring. |
| Targets | Braziers swinging on chains between the tombs. |
| Hazards | Bats out of the crypts. |
| Ring | speed ×1.06, path: triangle, modifiers: bob |
| Tiers | II before the mini-boss, III after |
| Boss | The Count drags the urns into his waltz: they circle with him, so the banks change every lap. |
| Anchor | `arch` |
| Obstacles | first half: bumper @6, bumper @14; second half: bumper @0, bumper @0, bumper @10; end boss: bumper, bumper |
| Targets | first half: standard, swinging; second half: swinging, shielded |
| Mini-boss | `batbaron` |
| End boss | `count`, gives `beard:handlebar` and the `gilded` shard |
| Lighting | key [0.45, 0.89], ring readability 0.36 |
| Camera | Formal and still, the arch always framing the ring. |
| Ambient | Skeletons polishing plaques, a ghost, bats in the domes. |
| Look | moon: full, skyline: gilded, lane: flagstone, props: gilded, frame: chains, weather: mist |
| Palette | sky #101426 → #1E2440 → #3A3A5C → #5E5670; ground #3A3C4A → #2A2C38 → #1E2028 → #121318 |
| Music | The waltz on a pipe organ, a semitone down. (playback ×0.97) |
| Sound | Organ drones, bells, the BOING of a gilded urn. |
| Transition | The arch's gates swing shut, then an iris on the full moon. |
| Reward | The Count's Gilded Handlebar and the second shard. |

## 3. The Whistling Woods (Reel Three)

*The trees here whistle when the wind goes through them, and the signposts all point the wrong way.*

**Concept.** Make the path of the throw the puzzle: things push it, and things lie about where it should go.

| | |
|---|---|
| Visual | Tall black trunks, hollow logs, crooked signposts, will-o'-wisps in the ferns. |
| Spatial | A narrow cutting through the trees; hollow logs lie across the lane's edges and blow up it. |
| Mechanic | Trajectory and deception: the wind turns every throw, hollow logs gust the skull, and painted decoys hang in the way. |
| The throw | Read the wind sign and the leaves, aim off, and never trust a target that's in front of the ring. |
| Targets | Will-o'-wisps, and cardboard decoys that only look like them. |
| Hazards | Wind and hollow-log gusts. |
| Ring | speed ×1.12, path: triangle, modifiers: bob |
| Tiers | II before the mini-boss, III after |
| Boss | Marrowroot whistles up a gale and hangs his decoys in the lane: the ring you see sway may not be the one to throw at. |
| Anchor | `sign` |
| Obstacles | first half: fan @8; second half: fan @0, fan @8; end boss: fan |
| Targets | first half: standard, decoy; second half: swinging, decoy, runaway |
| Mini-boss | `owl` |
| End boss | `marrowroot`, gives `beard:roots` and the `whistle` shard |
| Lighting | key [-0.35, 0.94], ring readability 0.38 |
| Camera | Tall and narrow, the trunks framing the lane. |
| Ambient | Owls, fireflies of wisps, leaves always blowing one way. |
| Look | moon: crescent, skyline: woods, lane: dirt, props: woods, frame: vines, weather: leaves |
| Palette | sky #0E1A1C → #1C2E30 → #2E4A48 → #4A6660; ground #2E3A2A → #222C20 → #182018 → #0E140E |
| Music | The waltz on a penny whistle. (playback ×1.03) |
| Sound | Whistling wind, creaks, hoots. |
| Transition | A gust of leaves across the lens. |
| Reward | Marrowroot's Root Beard and the third shard. |

## 4. The Drowned Theater (Reel Four)

*The picture palace flooded in the storm of '33 and kept playing. The stagehands never left.*

**Concept.** Timing, like a stage: the scenery moves on a beat and the throw has to come in on it.

| | |
|---|---|
| Visual | A flooded theatre: red velvet under black water, gilt boxes, the screen still lit above the stage. |
| Spatial | A boardwalk of planks down the drowned aisle; the stage machinery works the space in front of the ring. |
| Mechanic | Timing and stage movement: revolving scenery flats sweep the lane, a ghost scrim fades in and out, bubbles rise. |
| The throw | Wait for your cue: the gap in the flats, the scrim going thin. |
| Targets | Gallery ducks bobbing on the water, and pop-ups that duck under. |
| Hazards | Bubbles rising through the stalls. |
| Ring | speed ×1.18, path: circle, modifiers: bob |
| Tiers | III before the mini-boss, IV after |
| Boss | The Ringmaster runs the show: the flats turn to his whistle and his hoop is the ring. |
| Anchor | `rope` |
| Obstacles | first half: bar @6; second half: bar @0, barrier @8; end boss: bar |
| Targets | first half: standard, popup; second half: popup, swinging, split |
| Mini-boss | `jester` |
| End boss | `ringmaster`, gives `hair:quiff` and the `drowned` shard |
| Lighting | key [0.0, 1.0], ring readability 0.4 |
| Camera | Proscenium framing: the curtains hold the edges still. |
| Ambient | Ghosts in the boxes, the screen flickering, bubbles. |
| Look | moon: screen, skyline: theatre, lane: boardwalk, props: theatre, frame: curtains, weather: bubbles |
| Palette | sky #0A0E16 → #141C28 → #1E2A38 → #2A3A48; ground #1E2A34 → #16202A → #101820 → #0A0E14 |
| Music | The waltz on a theatre organ, a little faster. (playback ×1.05) |
| Sound | Organ swells, creaking flats, bloops. |
| Transition | The curtains close, then open on the next reel. |
| Reward | The Ringmaster's Showman's Quiff and the fourth shard. |

## 5. The Black Marsh (Reel Five)

*Nothing grows in the Black Marsh but thorns, and nothing moves in it but the things that want you gone.*

**Concept.** The ground fights back: hazards that come out of the environment itself, each told before it strikes.

| | |
|---|---|
| Visual | Black water, cypress knees, moss dripping, marsh-light in the fog. |
| Spatial | A boardwalk over the water; thorns come up out of the marsh in front of the ring and a log slams down across the lane. |
| Mechanic | Environmental hazards: the marsh itself attacks. Thorn hedges rise, a sunken log crushes down, fog rolls over the ring. |
| The throw | Lob high over the thorns, or wait for them to sink; never throw into the log's shadow. |
| Targets | Frogs on lily pads, some wearing shells. |
| Hazards | Thorns, the crusher log, fog. |
| Ring | speed ×1.22, path: triangle, modifiers: bob |
| Tiers | III before the mini-boss, IV after |
| Boss | Madame Marsh raises the whole bog: thorns and the log come up with her, and the fog follows her mud. |
| Anchor | `post` |
| Obstacles | first half: spikes @6; second half: spikes @0, crusher @8; end boss: spikes |
| Targets | first half: standard, shielded; second half: shielded, popup |
| Mini-boss | `gator` |
| End boss | `madame`, gives `hair:moss` and the `marsh` shard |
| Lighting | key [0.3, 0.95], ring readability 0.42 |
| Camera | Low and close to the water. |
| Ambient | Fireflies, a drifting ghost, the water's moon. |
| Look | moon: crescent, skyline: bayou, lane: boardwalk, props: bayou, frame: moss, weather: fireflies |
| Palette | sky #0A120E → #14201A → #223428 → #344A38; ground #16241C → #101A14 → #0A120E → #060A08 |
| Music | The waltz on a bottleneck guitar, slow. (playback ×0.94) |
| Sound | Croaks, glugs, the log's THOOM. |
| Transition | The marsh fog swallows the frame. |
| Reward | Madame's Swamp-Moss Locks and the fifth shard. |

## 6. The Bone Desert (Reel Six)

*Everything that ever fell in the desert is still there, bleached white. The bones are patient; the cannons aren't.*

**Concept.** Distance: everything is further, smaller and exposed, so power and precision matter more than tricks.

| | |
|---|---|
| Visual | Rust-red dunes, mesas, a giant ribcage on the skyline, a skeleton hand holding up the ring. |
| Spatial | Long and open: the ring stands far back, small against the dunes; bone cannons dug in either side of the lane. |
| Mechanic | Distance and precision: a smaller, further ring, cannonballs across the lane, vultures dropping bones. |
| The throw | Long, flat and exact: more power, less margin. |
| Targets | Hanging bones and scuttling runaways. |
| Hazards | Cannonballs and falling bones. |
| Ring | speed ×1.2, path: triangle, modifiers: shrink |
| Tiers | IV before the mini-boss, V after |
| Boss | The Undertaker digs the ring in deep and far, fires the cannons himself, and makes you throw the length of the desert. |
| Anchor | `hand` |
| Obstacles | first half: cannon @6; second half: cannon @0, cannon @8; end boss: cannon, cannon |
| Targets | first half: standard, runaway; second half: runaway, split, golden |
| Mini-boss | `scarecrow` |
| End boss | `undertaker`, gives `wings:vulture` and the `desert` shard |
| Lighting | key [-0.7, 0.71], ring readability 0.3 |
| Camera | Wide and hot, the horizon low. |
| Ambient | Vultures circling, dust devils, skeletons digging. |
| Look | moon: full, skyline: desert, lane: sand, props: desert, frame: ribs, weather: dust |
| Palette | sky #2A1418 → #5A2A22 → #A8502E → #E8A058; ground #A8703E → #8A5A30 → #6A4424 → #3E2614 |
| Music | The waltz on a jaw harp and guitar. (playback ×1.0) |
| Sound | Wind over sand, cannon BOOMs, rattling bones. |
| Transition | A sandstorm wipes the frame. |
| Reward | The Undertaker's Vulture Wings and the sixth shard. |

## 7. The Clockwork Caves (Reel Seven)

*Under the mountain someone built a clock the size of a cathedral, and it's still keeping time, badly.*

**Concept.** Machinery: everything moves on a timetable and bends the throw, so the shot is a sum of curves and ticks.

| | |
|---|---|
| Visual | Stalactites, glowing mine lamps, great gears in the rock, a pendulum swinging through the dark. |
| Spatial | A mine gallery on rails; machinery on both walls reaches into the lane: pistons, lodestones, the pendulum. |
| Mechanic | Mechanical timing and complex trajectories: a lodestone bends the flight, a piston stamps, the pendulum swings, gear spokes turn. |
| The throw | Curve it round the lodestone and land it between the ticks. |
| Targets | Bells on gear arms, some that split in two. |
| Hazards | The pendulum. |
| Ring | speed ×1.34, path: triangle, modifiers: shrink |
| Tiers | IV before the mini-boss, V after |
| Boss | The Clock King winds every machine to his own tick: they all move on his beat, faster as he angers. |
| Anchor | `gear` |
| Obstacles | first half: magnet @6, crusher @14; second half: magnet @0, crusher @0, bar @10; end boss: crusher, crusher |
| Targets | first half: standard, split; second half: split, shielded, swinging |
| Mini-boss | `cuckoo` |
| End boss | `clockking`, gives `wings:clockwork` and the `clockwork` shard |
| Lighting | key [0.6, 0.8], ring readability 0.44 |
| Camera | Tight and rhythmic, stepping on the tick. |
| Ambient | Dripping water, mine lamps, turning gears, bats. |
| Look | moon: none, skyline: caves, lane: rails, props: caves, frame: stalactites, weather: rain |
| Palette | sky #0A0806 → #16100C → #241A12 → #32241A; ground #3A2E24 → #2C221A → #1E1812 → #120E0A |
| Music | The waltz on a music box and cowbells. (playback ×1.02) |
| Sound | Ticks, clanks, the piston's hiss. |
| Transition | The gears lock, then an iris. |
| Reward | The Clock King's Clockwork Wings and the seventh shard. |

## 8. The Black Abyss (Reel Eight)

*Past the last frame of the reel there's only black, and the Black Ring waiting to be whole. The Reaper cut it into eight; tonight Morty puts it back.*

**Concept.** The finale: every mechanic the reel has taught, in the dark, around the last shard of the Black Ring.

| | |
|---|---|
| Visual | Black on black: floating broken frames, torn film, a black ring eclipsing the moon. |
| Spatial | A film-strip bridge over nothing; everything the other maps threw at you hangs in the dark around it. |
| Mechanic | Final Ring completion: the ring cuts between frames, ghost barriers flicker, bumpers and a lodestone drift in the void. |
| The throw | Everything you've learned at once: lead the cut, time the barrier, bank the bumper, curve the pull. |
| Targets | Film cans, golden frames and secrets hidden in the dark. |
| Hazards | The jump cuts. |
| Ring | speed ×1.42, path: jumpcut, modifiers: bob, shrink |
| Tiers | V before the mini-boss, VI after |
| Boss | The Reel Reaper cuts the film itself: every obstacle jumps with the cut, and the Black Ring's last shard is in his scythe. |
| Anchor | `chain` |
| Obstacles | first half: barrier @6, bumper @14; second half: barrier @0, magnet @0, bumper @8, bar @14; end boss: barrier, magnet |
| Targets | first half: standard, golden, decoy; second half: golden, secret, split, runaway |
| Mini-boss | `projectionist` |
| End boss | `reaper`, gives `wings:shadow` and the `abyss` shard |
| Lighting | key [0.0, 1.0], ring readability 0.48 |
| Camera | Unsteady, the gate weaving. |
| Ambient | Floating frames, the eclipse, drifting ghosts. |
| Look | moon: eclipse, skyline: abyss, lane: void, props: abyss, frame: chains, weather: embers |
| Palette | sky #040406 → #0A0A10 → #14121C → #1E1A28; ground #16141E → #100E16 → #0A0A10 → #050508 |
| Music | The waltz, scratched and skipping. (playback ×1.0) |
| Sound | Projector clatter, reversed bells, the silence between. |
| Transition | THE END card, burning out. |
| Reward | The Reaper's Shadow Wings, the last shard, the Black Ring whole, and Wizard Mort. |

## Tiers

Map = environment, Tier = mechanical intensity. No player-selectable difficulty.

| Tier | Name | Ring speed | Ring size | A hazard every | Targets | Obstacle speed | Gold | Secrets | Power-up rate |
|---|---|---|---|---|---|---|---|---|---|
| I | The Toss | ×1.0 | +0.00 m | — throws | 0 | ×0.85 | 0% | 0% | ×1.0 |
| II | The Distraction | ×1.0 | +0.00 m | 6 throws | 1 | ×0.9 | 3% | 0% | ×1.0 |
| III | The Hazard | ×1.04 | -0.01 m | 5 throws | 1 | ×1.0 | 4% | 0% | ×0.95 |
| IV | The Puzzle | ×1.08 | -0.02 m | 4 throws | 2 | ×1.08 | 5% | 0% | ×0.9 |
| V | The Chaos | ×1.12 | -0.03 m | 4 throws | 2 | ×1.16 | 6% | 4% | ×0.85 |
| VI | The Secrets | ×1.16 | -0.04 m | 3 throws | 3 | ×1.24 | 8% | 22% | ×0.8 |
