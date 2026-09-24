# Spatial & Environmental Blueprint

> Maps are not illustrations placed behind gameplay. The environment is designed around the throw.

This is the master specification every map is built to, and a **gate**: `src/maps/blueprint.json` holds the numbers, and
`src/build.py` refuses any map whose Map Production Sheet is missing a part or leaves the blueprint. The game reads the
same file (camera, anchors, lighting, shadows, occlusion), and the spec checks the result on every map.

## 1. Coordinates

Metres. **x** across, **y** up, **z** into the screen from the launcher. The camera sits 3 m behind the launcher.
World space is projected through the rostrum camera (`04c_camera.js`: `project`), which applies the multiplane
parallax; `projectBase` is the locked-off camera for layout.

| Thing | Canonical position |
|---|---|
| Launcher / resting skull | (0, 0.9, 0) |
| Ring (first half) | z 6.0 (the Bone Desert: 7.4), centre height 2.3, sliding across ±amp |
| Ring's playable space | x ±2.3, y 1.25–3.7, z 4.4–8.6 |
| Targets | the map's target zone, behind the ring (decoys: in front) |
| Obstacles | the map's hazard zone, between the launcher and the ring |
| Shadows | on the ground under their owner, shifted away from the key light |
| Bosses | mini-bosses in the ring's space; end bosses in the boss space (z 9–16, x ±4.5) |
| Background | z 30 and beyond |

## 2. Gameplay planes

| Plane | Depth | Holds | Rule |
|---|---|---|---|
| Foreground | z 0–9.6 | launcher, skull, ring, targets, obstacles, anchor hangers, power-ups | gameplay-critical: everything the throw can touch |
| Midground | z 9.6–30 | large props, structures, moving scenery, reactive objects, bosses | reacts to the throw, never blocks it |
| Background | z 30–400 | skyline, moon, clouds, distant characters | atmosphere; nothing competes with the ring |

## 3. Throwing corridor

|x| < 2.4 for z < 16. No scenery stands in it; only gameplay objects (the ring and its hanger, targets, obstacles) cross it.
`layOutProps` drops anything placed inside it and the spec checks every map.

## 4. Camera

| Camera | What it does | Limit |
|---|---|---|
| Base | skull at 77% of the screen, ring at 34% | fixed |
| Aim | leans with the pull, dollies back with the tension | 0.2 m across, 0.1 m up, 0.32 m back |
| Flight | pans and pushes in after the skull | 0.22 / 0.045 / 0.5 |
| Impact | jolts the planes against each other | never past the ring-safe box |
| Spectacle | perfects, signature shots, bosses, discoveries only | push-in 0.6 m, hold 0.6 s |

Each map's sheet narrows the camera's bounds. **No camera move may take the ring out of its safe box** (6% from each side,
between 12% and 62% of the height).

## 5. Parallax

Distances are compressed toward the ring's (`compress` 0.6) so far planes still move: physical depth, not decorative
scrolling. Planes: sky 400, far 70, world 30, near 3.6, foreground 2.4 (camera distance). They respond to the camera, the
flight, impacts (jolts), bosses and weather.

## 6. Environmental anchoring

The ring belongs to the environment; the mechanic stays the same (throw Morty through it).

| Anchor | Map | Support | Hanger | Reaction |
|---|---|---|---|---|
| branch | Crow Hollow | the oak's branch overhead | rope | bends |
| arch | Gilded Graveyard | a gilded arch over the lane | chain | shakes |
| sign | Whistling Woods | a signpost's arm | rope | squeaks |
| rope | Drowned Theater | the fly batten | rope | swings |
| post | Black Marsh | a mooring post | the pole (a Vault look) | shakes |
| hand | Bone Desert | a skeleton hand out of the sand | the hand | moves |
| gear | Clockwork Caves | a brass rail and trolley | a rod | the cog turns |
| chain | Black Abyss | the dark | chain | shakes |

In the first half the hanger carries the ring; when the ring grows wings, the hanger is left swinging, snapped.
A knock on the ring swings its anchor; a throw over it bonks the support.

## 7. Environmental interaction

Reusable reactions (`07n_environment.js`): **move, rotate, bend, crack, fall, squeak, shake, react**. Each map's sheet
says which prop does what; a crack or a fall stays for the rest of the map. Reactions are looks only: they never change a throw.

## 8. Ambient animation budget

At most **7** ambient animations a map, at most **2** heavy ones (lightning, weather, boss light). Alive, but mechanically quiet.

## 9. Lighting

Each map's sheet names its **key light** direction, ambient colour, rim colour, ring readability (at least 0.3) and boss
light. The ring gets a dark backing and a rim on the key's side, so it reads on any background. Impacts flash the frame;
a boss fight dims the scenery and a spot finds the ring; maps change on an iris.

## 10. Shadows

The skull's shadow: offset along the key light by 0.22 × height, scale 1 → 0.5 and opacity 0.42 → 0.12 as it climbs;
at landing the skull and its shadow meet. The ring's shadow says how deep it is. **No dotted line or plumb line joins a
floating ring to its shadow.**

## 11. Occlusion

Nothing decorative covers the skull, the ring, the trajectory, targets, obstacles or collision zones. The foreground frame
keeps to the edges (the spec samples it over every map's ring zone: alpha at most 0.12). Anything that crosses the gameplay
plane has a gameplay reason (an anchor, an obstacle).

## 12. The Map Production Sheet

Every `src/maps/NN-<id>.json` has a `sheet`, in this order: **concept → plane → launcher → zones (ring, targets, hazards)
→ corridor → camera → parallax → interactions → ambient → lighting → arenas (mini, end) → transition → reward
(body part, shard, how it's shown)**. Alongside it: its anchor, ring, tiers, mechanic, obstacles (first half, second half,
end boss, each with the hit it comes in at), target types, bosses and music.

## 13. Theme follows mechanic

Every map answers five questions in its `identity`: **visual** (what does it look like?), **spatial** (how is the space
arranged?), **mechanic** (what does the player think about?), **throw** (what makes throwing here different?) and **boss**
(how does the end boss transform the map's mechanic?). See the [stage bible](STAGE_BIBLE.md).

## Building a map

Blockout → playtest → adjust spatial relationships → art pass:

1. Write the sheet: zones, anchor, obstacles and their beats, target types. The build checks it.
2. Greybox with existing skyline, lane and prop sets; run the spec's per-map checks.
3. Play it on a phone (390×844) and a desktop (1280×720): the camera and occlusion checks.
4. Choose its two tiers and its bosses; set the end boss's obstacles.
5. Art pass: skyline (`05b`/`05d`), lane, frame and near props (`05c`/`05d`), props (`06d`/`06f`), weather (`06e`).
6. Lighting, ambient animation within budget, sound; then `python3 tools/stage_bible.py` and the full pipeline (docs/QA.md).
