# Perceptual travel (v47 pilot; all eight maps from v48)

Morty never walks. He is thrown. So the game doesn't swap backgrounds between sections: **the scenery comes to him**.
Crow Hollow is a continuous place assembled from reusable SVG scenery at different depths. Every make before a boss
carries the camera a step further along it, and the world advances.

> Successful gameplay advances perceptual travel. Environmental movement stops when Morty reaches a boss destination.

The rhythm is **aim → throw → hit → the world advances → the next throw**. Nothing moves while you aim.

## The shape of a travelling map

The map's 80 hits (see `src/maps/blueprint.json`: `structure`) decide when the world moves:

| Hits | What the world does | Crow Hollow |
|---|---|---|
| 1–30 | travels: one step a make, the last five shorter (the world slows as Morty arrives) | The Hollow → the Haunted Farm → the Harvest Grove |
| 31–40 | stands still: the mini-boss's arena | crow territory, the Crow King |
| 41–50 | travels again, slowing as it arrives | the Pumpkin Field, the Pumpkin King asleep ahead |
| 51–80 | stands still: the end boss's arena | the Pumpkin King wakes |

In Crow Hollow a step is 6 m, and the last five before a boss are 85%, 70%, 55%, 40% and 25% of that. The camera
travels about 166 m to the Crow King and another 46 m to the Pumpkin King.

**Where the world stands comes from the hits alone** (`travelTable`, `06g_travel.js`). There's no travel state to
save: a continue, a reload, a resumed run and a replay all put the world exactly where the run was. On screen, the
camera eases to that point after a make, about two-thirds of a second, so the step lands while the skull is still
settling. With *reduced motion* it goes straight there.

Only the Adventure travels. Arcade, Practice, the mini-games and the title show the map from its start.

## The track

A map that travels has a `travel` block in its JSON (`src/maps/01-hollow.json`):

- **`step`** and **`arrive`**: metres a make, and the shorter steps before each boss.
- **`gap`**: metres between the rows of scenery either side of the lane.
- **`far`**: how far ahead scenery shows. It fades in over the last fifth of that.
- **`zones`**, in order along the way. Each starts where the camera stands at a hit, plus a lead in metres (`from: [hit, metres]`). Each zone has:
  - a **mix**: what it's made of, weighted;
  - a **density**;
  - a **tone**: a colour washed over the land;
  - a **fog**: how thick the far haze is.
  Crow Hollow runs the Hollow, the farm, the harvest, the crows and the field.
- **`landmarks`**, placed by hand, each at a hit plus metres ahead:
  - the opening set, the gravedigger, two signposts, the farmhouse and the barn;
  - `king-lair`, the Pumpkin King asleep in his field. He's the destination, tiny on the horizon at first, then nearer and nearer. He fades away as the real one rises for the fight (`wakes: "end"`).
- **`clear`**: clearings round each arena, where nothing small stands near the lane. The arena opens up.

The game lays the track out once per map from a seeded random stream. The two sides of the lane get the zone's mix,
small things close in and big things further out. Tree lines stand further back so the land has depth, and a near
edge of dark silhouettes sweeps past the frame.

## The scenery library

`src/art/travel/` holds the SVG library: one SVG per asset, each with a `<g id="body">`, drawn at 100 canvas units
a metre. `library.json` gives each asset:

- its **canvas**;
- its **foot** (the point that stands on the ground);
- its **layer**: `distant`, `midground`, `gameplay` or `foreground`;
- its **family**: which of the map's interactions it answers to (a pumpkin squeaks, corn bends, a fence shakes);
- how much it **sways**;
- the **lights** it has (lit windows).

The build imports the SVGs with `svgart.py`, the same importer as the skull and the launcher, and refuses:

- an asset with no body;
- a foot that isn't at the bottom;
- an unknown layer;
- any **collision**. Travel scenery is looks only, and none of it can ever touch a throw.

The Crow Hollow library has 15 assets. The other maps add a lair each (v48) and six scenery pieces each (v49): 64 in all. Crow Hollow's are:

- two trees (an autumn one, and a dead one full of crows);
- the farmhouse and the barn;
- corn, a fence, a scarecrow, a pumpkin patch and a giant pumpkin;
- a hay bale, a cart, a signpost and a bramble;
- a crow's lookout post;
- the Pumpkin King's lair.

The props the game already paints (pumpkins, jack-o'-lanterns, tufts…) can go on the track too.

Variety comes from mirroring, scale, placement and the distance haze, not from more drawings. *Tree × 6 can become six
different trees.*

## Drawing it

- **Sprites by size band.** Each asset is painted once per size band (80, 40, 20, 10 and 5 pixels a metre), so nothing is ever shrunk by more than half. Nearer than the top band, it's drawn as vectors, crisp however close it comes. Sprites are made when first needed and dropped on resize.
- **Depth.** Everything is drawn back to front with the map's props and wanderers. A haze band is laid over the horizon once everything further than 45 m is down, so distance softens the far scenery and fog thickens it.
- **The zone's tone** is washed over the land, under the ring and the skull, blended over ten metres as one zone gives way to the next.
- **The near edge.** Dark silhouettes are anchored to the screen's edges, whatever its width. They sweep outward and away as Morty goes on. They never cover the middle.
- **Screen width.** A phone sees the lane-side scenery only in the middle distance; a wide screen sees more of it closer to. The play is the same on both.
- **Living scenery.** Lit windows and jack-o'-lanterns glow, and give the GPU layer its light pools. In the harvest and the crows' country, crows come up out of the trees as Morty travels. The map's wanderers are left behind.
- **The corridor.** Scenery never stands in the throw corridor (`|x| < 2.4 m` and nearer than z 16). The build checks every landmark, and the game drops anything generated there. The spec checks the whole track.

## Every map (v48)

Each map from the Gilded Graveyard on has a `travel` block of the same shape:

- **Five zones**, starting at the map's start, then 6 m past hit 10, 8 m past hit 20, 6 m short of the mini-boss, and 30 m on from him. Each zone sets:
  - its **mix**;
  - its **near** edge (the silhouettes at the frame's sides);
  - its **flock**: the chance a make flushes birds, crows or `bats`;
  - its **backdrop** (what stands in the far rows);
  - its **tone** and **fog**.
- **Its lair**, `<boss>-lair`, a landmark 44 m past hit 50 that `wakes: "end"`.
- **Clearings** at hits 30 and 50.
- **A palette** (`pal`) for the painted props it borrows.

The painted props the game already draws (`06d_props.js`, `06f_props_sets.js`) can stand anywhere in a mix, a backdrop, a near edge or as a landmark. The build knows them as `CANVAS_KINDS`.

| Map | Zones | Lair |
|---|---|---|
| The Gilded Graveyard | gates, mausoleums, angels, bats, crypt | `count-lair` |
| The Whistling Woods | wisps, logs, signposts, owls, root | `marrow-lair` |
| The Drowned Theater | aisle, boxes, screen, jester, big top | `bigtop-lair` |
| The Black Marsh | boardwalk, knees, marshlight, gator, parlour | `parlour-lair` |
| The Bone Desert | dunes, mesas, ribcage, scarecrow, yard | `undertaker-lair` |
| The Clockwork Caves | mine mouth, gears, pendulum, cuckoo, works | `clock-lair` |
| The Black Abyss | bridge, frames, reel, projectionist, ring | `reaper-lair` |

**The crossing.** The track starts 72 m before the map does (`CROSS.lead`), so the Challenge Stage's road can run into it. During the crossing, `travelGoal` reads `crossingAt()`, ten 6.6 m steps that end at 0: the map's own start. See [BODY_AND_CROSSING.md](BODY_AND_CROSSING.md).

## Adding travel to another map

1. Draw its library in `src/art/travel/` (or reuse the Hollow's where it fits), and list it in `library.json`.
2. Give the map a `travel` block: its step, zones, landmarks and clearings. The build checks it against the blueprint (`travel_problems` in `build.py`).
3. Play it through; `SkullToss.debug.travel()` and `travelSpans()` show where the world stands and what's on the track.
