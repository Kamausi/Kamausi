# The device matrix

Written by `node tools/matrix.mjs` (v41). Each size opens the title, all twelve sheets and a run in play, and checks for sideways scrolling, clipped text, controls that run off the screen, touch targets under 40 px, unnamed controls, and a HUD or play field that doesn't fit. Screenshots of each size are in `qa/` after a run.

| Size | Viewport | Touch | Result |
|---|---|---|---|
| small phone (iPhone SE 1st gen) | 320 × 568 | yes | pass |
| Android phone | 360 × 640 | yes | pass |
| iPhone 15 | 393 × 852 | yes | pass |
| iPhone 15 Pro Max | 430 × 932 | yes | pass |
| phone, landscape | 852 × 393 | yes | pass |
| foldable, open | 673 × 841 | yes | pass |
| iPad mini | 744 × 1133 | yes | pass |
| iPad Pro 13-inch | 1032 × 1376 | yes | pass |
| Steam Deck | 1280 × 800 | no | pass |
| laptop | 1440 × 900 | no | pass |
| ultrawide | 2560 × 1080 | no | pass |

