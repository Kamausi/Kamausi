# The Skull Toss Asset Bible (v54)

How a piece of Skull Toss scenery, a prop, a target or a boss is built. The rule underneath all of it: **construct the
asset, don't assemble it.** Every object should look as if someone made it, out of parts that fit together for a reason,
and then drew it as a 1930s cartoon.

Random geometry: primitive → primitive → primitive → decoration.
Skull Toss: design → primary mass → structural assembly → connections → functional parts → controlled imperfection →
surface.

## 1. Build things that could exist

Before drawing, answer: *how would this physically be made?* A wooden platform is planks on a frame on posts, with the
frame braced. It isn't a brown box on two sticks. Its silhouette, its joints, its shadows and where the material
changes should all tell the same story.

## 2. Three levels of form

| Level | What it does | Examples |
|---|---|---|
| **Primary** | The silhouette. Readable as a black shape. | trunk, roof, building mass, giant pumpkin, arch, platform, cannon, target stand |
| **Secondary** | How it's put together. This is what stops an object looking like primitives. | beams, planks, brackets, frame members, roof sections, stone blocks, joints, handles, rims, panels |
| **Tertiary** | Made and aged. Use sparingly. | bolts, nails, seams, cracks, chips, rope wraps, hinges, carving, grain relief |

Never go straight from primary to tertiary (a blob with decorations). Secondary construction is the part that's usually
missing.

## 3. No perfect primitives

A post isn't a cylinder. It tapers, it's a little irregular round, it flattens where it meets something, it's bigger
at the base and chipped at the top, and its grain runs one way. The goal is intentional departure from perfect geometry,
not more geometry.

## 4. Bevels

Almost nothing real has a mathematically sharp edge. Even a small bevel gives the light somewhere to catch. Stylised
doesn't mean crude: the proportions can be exaggerated while the edges stay considered.

## 5. Every joint has a reason

Where two parts meet, something holds them: nails, rivets, rope, chain, hinges, brackets, pegs, mortise and tenon, metal
bands, mortar or straps. Pick the right one for the object. v54's target arms are an example: a rod, a bracket bolted to
the ring's rim, and a collar round the target.

## 6. The kit

Build from a shared vocabulary so the whole game reads as one world:

- **Wood:** rough plank, rounded beam, tapered post, crossbeam, fence segment, brace, peg, plank end.
- **Metal:** rivet, bolt, hinge, bracket, ring, chain, plate, curved band.
- **Stone:** block, capstone, irregular brick, arch segment, column, cracked slab.
- **Rope:** segment, knot, loop, wrap, hanging rope.

## 7. Describe the assembly, not the look

Not "a spooky wooden target", but: "a freestanding target gallery: four timber posts, two crossbeams, spaced target
boards, iron brackets, visible nails, rope bracing, a slightly warped base." The second one has relationships in it.

## 8. The silhouette test

Fill the asset solid black. If you can't tell what it is, the geometry needs work. Silhouettes can be exaggerated
(crooked poles, oversized rings, lopsided roofs, bent branches, heavy supports) and still read as real.

## 9. Controlled asymmetry

Uniform randomness is as unconvincing as perfect symmetry. Keep the object fundamentally regular, then break it on
purpose: one warped board, one missing nail, one chipped corner, one crooked support, more wear where hands and feet
touch it.

## 10. Shape follows function

Anything Morty can hit should look hittable. A target has thickness, a rim, a mount, a support and fasteners, so that
when it's struck there's something to react.

## 11. Geometry first, surface second

Don't make a texture stand in for missing geometry. Draw real boards, seams, bevels and joints, and let the paint and
grain enhance them.

## 12. Spend detail where the eye goes

| Asset | Geometry |
|---|---|
| Background rock, distant tree | Low |
| Background building | Medium |
| Gameplay obstacle, target, collectible | High |
| Launcher, boss, portal | Very high |

Player-facing objects deserve far more than the backdrop. The travel scenery's size bands (sprites at five scales,
vectors up close) already put detail where it's seen.

## 13. The 1930s look

Physically constructed and deliberately stylised: real construction principles, exaggerated cartoon proportions,
hand-made irregularity, soft beveled silhouettes and painted surfaces. Not photoreal: a lost reel of 1930s animation
restored as a modern game.

## Checklist (before an asset goes in)

**Silhouette**
- [ ] Recognisable at a distance.
- [ ] Interesting outer contour.
- [ ] No needless primitive shapes.

**Structure**
- [ ] Primary form established.
- [ ] Secondary construction present.
- [ ] Believable relationships between parts.
- [ ] Every connection explained.

**Geometry**
- [ ] Important edges beveled.
- [ ] No excess perfect primitives.
- [ ] Controlled asymmetry.
- [ ] Sensible thicknesses.
- [ ] Contact points that make sense.

**Detail**
- [ ] Functional details.
- [ ] Construction details.
- [ ] Wear, with tertiary detail used sparingly.

**Gameplay**
- [ ] The collision matches what's drawn.
- [ ] Hit areas are readable.
- [ ] Interactive surfaces aren't cluttered.
- [ ] Travel scenery never collides; the build refuses it if it does.

**Style**
- [ ] Exaggerated proportions and a cartoon silhouette.
- [ ] Hand-made, and consistent with the rest of the world.

## Characters that work

The same standard applies to anything that moves. A character must visibly act on its environment. The gravedigger
(v54, `06c_graveyard.js`) is the reference: planted feet, a dig in phases with its own timing curves, a shovel on a
spring that lags and overshoots, events at contact and throw, and earth that flies and lands. The order of priorities:

1. contact and grounding;
2. body mechanics;
3. tool interaction;
4. secondary motion;
5. the physical response (particles, debris);
6. sound on the events;
7. variation (not a loop);
8. only then, more detailed geometry.
