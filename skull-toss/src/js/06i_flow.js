  // ───────────────────────── the flow (v58): curl noise for the air and the water, never for the game ─────────────────────────
  // A smooth potential ψ(x, y, t) made of value noise, and its curl (∂ψ/∂y, −∂ψ/∂x): a velocity field with no sources
  // and no sinks, so whatever drifts in it swirls, folds and eddies like water or smoke instead of bunching up or
  // draining away. It is felt, not seen: motes, bubbles, mist, the sway of weed, the wander of a fish or a firefly, a
  // rift's sparks. The rule is absolute: curl noise moves atmosphere and secondary motion; game logic moves the game.
  // Nothing here is ever read by the skull's flight, the aim, the ring, a target or an obstacle.
  //   The underwater current is three layers: a slow macro current (the biome's drift plus a broad, lazy swirl), micro
  // turbulence (small, quicker eddies, weaker), and each creature's own wander (the field sampled at its own seed),
  // to which the creature adds its own avoidance.
  const FLOW_P = (() => { const r = mulberry32(5813), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const q = p[i]; p[i] = p[j]; p[j] = q; } const P = new Uint8Array(512); for (let i = 0; i < 512; i++) P[i] = p[i & 255]; return P; })();
  function vnoise(x, y) {   // value noise, smoothstepped, 0–1
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), X = xi & 255, Y = yi & 255;
    const a = FLOW_P[FLOW_P[X] + Y], b = FLOW_P[FLOW_P[X + 1] + Y], c = FLOW_P[FLOW_P[X] + Y + 1], d = FLOW_P[FLOW_P[X + 1] + Y + 1];
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) / 255;
  }
  function flowPsi(x, y, t, oct) {   // the potential: octaves of noise, each drifting through time on its own heading
    let s = 0, amp = 1, f = 1;
    for (let o = 0; o < oct; o++) { s += amp * vnoise(x * f + t * (0.13 + o * 0.07) + o * 17.3, y * f - t * (0.09 + o * 0.05) + o * 31.1); amp *= 0.5; f *= 2.03; }
    return s;
  }
  const FLOW_OUT = { x: 0, y: 0 };
  // the curl at (x, y): scale is the size of the eddies (in whatever units the caller works in), and it returns a
  // velocity of about unit strength. One shared result object: read it before the next call.
  function curl(x, y, t, scale = 1, oct = 2) {
    const e = 0.07, X = x / scale, Y = y / scale;
    FLOW_OUT.x = (flowPsi(X, Y + e, t, oct) - flowPsi(X, Y - e, t, oct)) / (2 * e);
    FLOW_OUT.y = -(flowPsi(X + e, Y, t, oct) - flowPsi(X - e, Y, t, oct)) / (2 * e);
    return FLOW_OUT;
  }
  // the underwater current at a point in the world (x across, y up, z away): macro + micro, in metres a second
  const CURRENT = { x: 0, y: 0, z: 0 };
  function current(x, y, z, t, drift = [0, 0], k = 1) {
    const M = curl(x * 0.9 + z * 0.35, y + z * 0.2, t * 0.25, 6, 2), mx = M.x, my = M.y;
    const m = curl(x * 1.7 - z * 0.5, y * 1.3 + z * 0.6, t * 0.9, 1.4, 1);
    CURRENT.x = (drift[0] + mx * 0.22 + m.x * 0.07) * k; CURRENT.y = (drift[1] + my * 0.12 + m.y * 0.06) * k; CURRENT.z = (mx - my) * 0.05 * k;
    return CURRENT;
  }
  // a creature's own wander: the field sampled at its own seed, slow, so each one meanders its own way
  function wander(seed, t, rate = 0.3) { const W = curl(seed * 13.7, seed * 7.1, t * rate, 1.6, 2); return W; }
