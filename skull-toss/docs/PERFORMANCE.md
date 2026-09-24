# Performance budget

The budget lives in code as `PERF` (`src/js/01_data.js`), so the game, the build and the spec all read the same numbers.

| Budget | Value | Enforced by |
|---|---|---|
| Frame | 16.7 ms (60 Hz) | The adaptive quality in `10_boot.js` cuts particles, dust and grain first (down to half), then resolution. A spec canary fails if a busy frame costs over 60 ms in headless software rendering. |
| Game step | 0.5 ms average per 1/240 s step | Spec: 4 s of play (960 steps) with a throw in flight |
| Particles | 360 live | `04d_visual.js` drops the oldest past the cap. Spec: 2,000 sprayed in, at most 360 left |
| Comic bursts | 18 live | Same place and spec |
| Contact stars | 24 live | `04e_director.js` |
| Page elements | 2,500 | Spec counts `document.getElementsByTagName("*")` |
| Light build | 2,600 KB | `build.py` refuses a bigger `index.html` |

Rules that keep the numbers down:

- **Paint once, photograph every frame.** The scenery planes are painted into plates per screen size. Graveyard props and wanderers are sprites and cels, and new scenery must follow the same rule.
- **Effects before pixels.** Under load the game drops effects before it drops resolution, and it never touches input, physics, timing or the characters' drawings.
- **The film is 12 fps.** The grain and dust overlay redraws at film speed on its own canvas.
- **Nothing allocates per frame in the hot path** beyond short-lived particles, which are capped.

The low-end profile is a phone that can't hold 40 fps for two seconds. It settles at particles ×0.5, then DPR 1.5, then DPR 1.

Battery: the loop idles at the title (no physics), the film overlay stays at 12 fps, and audio suspends when the page is hidden.
