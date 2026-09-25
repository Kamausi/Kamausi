# Mobile performance audit (v52)

The measurements come from `node tools/perf.mjs`; the latest numbers are in [perf/latest.md](perf/latest.md). The tool plays the real frame loop on a 390×844, 3× DPR touch screen with the GPU layer on Lite. It covers the title, all eight maps, an end boss fight and its knockout, a burning ring, Adventure+, four phone rotations, reduced motion and a long arcade session. It records frame pacing, long tasks, input latency, adaptive quality, particles, memory, and a CPU profile.

**Read this first.** The test container draws canvas in software, at about 5 fps whatever the scene. So its frame times say nothing about a phone. What it can measure reliably is:
- where the time goes;
- how scenes compare with each other;
- whether memory grows over a session;
- whether anything breaks.

Absolute frame rates need a real device (see *Next* below).

## Findings

1. **The game's own code is under 1% of the main thread.** Over a 60-second session:
   - JavaScript (the sim, directors, drawing commands and UI): 0.9%;
   - rasterising (`(program)`): about 70%;
   - compositing the cached painted layers (`drawImage`): about 29%.

   On a phone, frame cost therefore scales with pixels drawn and layers composited, not with game logic. Game logic has plenty of headroom.
2. **No scene is a hotspot.** With quality pinned to full at the start of each scene, every scene costs 0.92–1.17× what map 1 does:
   - all eight maps;
   - an end boss fight and the three seconds after a knockout;
   - a burning ring on a streak of 10;
   - Adventure+ on map 8;
   - reduced motion.
3. **Water reflections cost about 7%.** Map 4 measured 4.2 fps with reflections and 4.5 fps without. The time is in compositing the clipped reflection strips. Redrawing the reflected picture on twos made no difference, and neither did 4-px strips instead of 3-px, so neither was kept. The existing protection is the right one: reflections are the first thing the adaptive quality drops (below 0.75).
4. **Turning the phone is the one hitch.** Four rotations measured 1.5× map 1's cost, with a worst frame about 3× a normal one. Each rotation repaints the cached layers at the new size (props, backdrop, water). It's a one-off per rotation, not a steady cost.
5. **Memory is flat.** Over 60 s and 120 s sessions:
   - JS heap 7.4 → 6.7 MB and 7.0 → 6.1 MB after garbage collection;
   - DOM nodes about 2,400, unchanged;
   - event listeners fell slightly (175–204 → 171).

   There's no leak from runs, bosses, particles or cards.
6. **Input latency is one frame.** A tap on the canvas reaches the next frame in one frame's time, with no queueing behind a busy frame. On a 60 Hz phone that means about 16 ms plus the display.
7. **Adaptive quality works as designed.** Under sustained load it steps effects down (1 → 0.75 → 0.5: particles, dust, grain; reflections off below 0.75). Only then does it lower resolution: the pixel ratio is capped at 2 and can drop to 1. Input, physics, timing and the character drawings are never touched.
8. **No page errors** in any scene, including rotations and reduced motion.

## Optimization tasks
In priority order; none is urgent, since game logic isn't the cost.
1. **Measure on real devices.** On a mid-range Android (Chrome remote debugging) and an iPhone (Safari Web Inspector):
   - turn on `SkullToss.debug.visuals.showFPS = true` for the on-screen fps, frame ms, DPR and particles;
   - play maps 1, 4 (water) and 8, a knockout, and a rotation.

   The pass mark: p95 frame under 16.7 ms at quality 1, or under 25 ms before the adaptive loop steps in.
2. **Rotation hitch.** Repaint the cached layers over two or three frames, or behind the pause card, instead of in one.
3. **If a device drops below quality 1 on the water maps,** cache the reflection strips as one pre-distorted layer on twos (a single `drawImage` instead of about 100).
4. **Layer count.** Count the full-screen `drawImage` calls per frame and merge the static far layers into one when the camera is still (the menus, the ready pose).

## How to re-run
```
python3 src/build.py --dev
node tools/perf.mjs            # [cpu slowdown, default 1] [long-session seconds, default 60]
```
