# The GPU effects layer (v47; fire and smoke from v49)

The picture is still painted on the 2D canvas: a flat, inked 1930s cartoon, and the only thing the game needs to
play. On top of it, `08j_gpu.js` runs a WebGL canvas (`#gpuFx`) that adds what a GPU does best, and nothing but looks.

## What it draws

- **Particles.** A ring buffer of 4,096, each written once when it's born (where, when, how fast, how long, what colour, how heavy). Its whole flight is then worked out in the vertex shader from the time alone, with drag and gravity. There's no per-frame CPU work, however many are alive. The recipes (`GPU_FX`):
  - sparks off every make, rim and clank;
  - embers rising off a burning ring;
  - orange embers on a boss hit;
  - a ring of fireworks on a K.O.;
  - a power-up's sparkle;
  - each map's own **air**: fireflies in the Hollow and the marsh, gold dust in the Graveyard, wisps in the Woods, sand in the Desert, amber sparks in the Caves, violet motes in the Abyss.
- **Light.** Soft pools that breathe, gathered while the frame is drawn (`gpuLight`):
  - lanterns, torches, lamp-posts and jack-o'-lanterns;
  - the travel scenery's lit windows;
  - the burning ring;
  - a floating power-up;
  - the Pumpkin King's eyes and the fire in his throat;
  - the moon.

  Every big contact also sets off a **flash of light** that fades (`gpuFlash`), scaled by Settings → Flashes.
- **Fire and smoke** (v49). Every fire in play is drawn here when the layer is on, from its own buffer of 3,072 flames:
  - the burning ring;
  - torches;
  - flaming skulls, fire auras and flaming hair;
  - the Cursed skull's green flames.

  v50: the ring's fire and the torches go to a second WebGL context (`GpuS`), composited into the 2D frame with
  `lighter` just before the ring is drawn, so the flames sit in the scene (in front of what's behind the ring, behind
  the ring itself) instead of on top of everything. The layer also keeps drawing while the game is paused.

  Each flame is born white-hot at its root, cools through orange to red as it rises, swells then shrinks, and sways. A fire at a point in a prop's or a skull's own drawing space goes through `gpuFireAt`, which returns false when the layer is off, so the caller paints its 2D fire instead. The Dynamite's KABOOM puts real smoke (`gpuSmoke`: pale puffs that billow, rise and thin) where the cartoon cloud was.
- **Glow** (Full only). A bloom pass:
  1. The 2D frame is shrunk to a quarter size.
  2. Only its bright parts are kept.
  3. They're blurred across, then down, on the GPU.
  4. They're added back over the picture.

  The frame is sampled every other frame; the glow keeps up.

## How it sits on the game

The layer is an **opaque black canvas, screen-blended** (`mix-blend-mode: screen`) over the game canvas. Black leaves
the picture exactly as it was, and light only ever adds. The layer also:

- copies the game canvas's own camera moves (crash zooms, whips, Dutch tilts) and film grade;
- turns grey with the silent reel;
- sits under the vignette and the HUD.

It works in CSS pixels at up to 1.5× device pixels, since light doesn't need more.

## Settings, fallbacks and budgets

- **Settings → GPU effects: Full, Lite or Off.** Lite drops the bloom pass, the one part that samples the whole frame. A touch screen starts on Lite; a desktop starts on Full.
- **No WebGL, no instancing, or no `mix-blend-mode`:** the layer never switches on, the settings row says why, and the game looks just as it always did.
- **Context lost:** the layer switches off until the browser gives the context back, then sets itself up again.
- **Reduced motion:** fewer particles, and nothing blinks.
- **Adaptive quality:** when the frame rate sags, the game lowers `QUALITY`, which thins the particles. Below full quality the bloom pass stops.
- **The simulation:** the layer never touches it. Its randomness is its own (`Math.random`), and nothing it does can change a throw, a replay or a score.
- **Automation:** under automation (`navigator.webdriver`) it starts Off, so the spec and the QA tools run at full speed. The spec turns it on to test it.

## Testing

`SkullToss.debug`:

- `gpu()`: whether it's supported and on, its mode, how many particles are alive, and the frame's lights, bloom passes and draws;
- `gpuFrame(dt)`: draw one frame of the layer;
- `gpuPixel(x, y)`: read one of its pixels;
- `gpuFake(false)`: act as if there's no WebGL.

The spec checks that:

- a perfect throws sparks and a flash, and there's light at the ring;
- a burning ring throws embers;
- Lite drops the glow;
- Off hides the layer;
- with no WebGL the game plays on.
