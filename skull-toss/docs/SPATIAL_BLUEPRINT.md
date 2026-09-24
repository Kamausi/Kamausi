# Spatial & Environmental Blueprint

One set of world numbers, in `src/maps/blueprint.json`, is read by the build (to check every map), by the game (to lay out props) and by the spec (to check the layouts). Units are metres. x runs across, y up, and z into the screen from the launcher.

| Space | Numbers | Rule |
|---|---|---|
| Launcher | (0, 0.9, 0) | Morty rests here. The camera sits 3 m behind it. |
| Ring plane | z 6.0 (4.4–8.6), x ±2.3, y 1.25–3.7, centre height 2.3 | Every corner of every map's ring triangle, bob included, stays inside this box. The build refuses a map that leaves it. |
| Throw corridor | \|x\| < 2.4 for z < 16 | The throw lane, the ring's space and the boss's patch. No scenery stands here. `layOutProps` drops anything placed inside it, and the spec checks every map. |
| Boss space | z 9–16, x ±4.5 | Where end bosses stand and throw from. |
| Parallax planes | sky 400, far 70, world 30, near 3.6, foreground 2.4 (camera distance) | Nearer planes slide further when the camera moves. |
| HUD safe area | top 12%, bottom 10% of the screen | Nothing that matters to a throw rests there. The picture-house screen hangs below it. |
| Shadows | the ring's and the skull's, on the ground under them | They're how depth is read. Nothing joins a floating ring to its shadow: no dotted line, no plumb line. |

## How a map is built

Maps are data, one file each: `src/maps/NN-<id>.json`. Each file names:

- its identity: mechanic, throw, targets, hazards, camera, ambient, music, sound, transition and reward (the [stage bible](STAGE_BIBLE.md))
- its look: palette, moon, skyline, lane, props, foreground frame, weather and ambient life
- its ring: speed, triangle, sequences, modifiers and path
- its two tiers, its mechanic, its two bosses and the fragment its end boss holds

`src/maps/registry.json` lists everything the code can draw or run. The build refuses any map that names something missing from it, and the spec checks the code has every id the registry lists.

The pipeline for a new map:

1. **Spatial blueprint.** The ring triangle and props must fit the numbers above; the build checks them.
2. **Greybox.** Pick existing skyline, lane and prop sets and play it.
3. **Throw-path and collision check.** The spec's per-map scene check runs on it.
4. **Camera check.** Look at it on a phone (390×844) and on a desktop (1280×720).
5. **Tier and difficulty.** Choose its two tiers.
6. **Boss space.** Choose its mini-boss and end boss.
7. **Environmental interaction.** Set its mechanic.
8. **Final art.** Add painters for the skyline (`05b_scene_sky.js`), the lane, frame and near props (`05c_scene_ground.js`), the props (`06d_props.js`) and the weather (`06e_weather.js`).
9. **Animation, lighting, FX and audio.** Add lit props (`PROP_LIFE`), moving far parts (`drawFarFX`) and the music rate.
10. **Optimisation and QA.** Keep everything painted once per screen size, stay inside the budget, and run the spec.
