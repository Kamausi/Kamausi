  // ───────────────────────── the GPU effects layer (v47) ─────────────────────────
  // The picture is still painted on the 2D canvas, a flat, inked cartoon. On top of it a WebGL canvas adds what a GPU
  // does best, and nothing but looks:
  //   particles  sparks off every contact, embers off a burning ring, a K.O.'s fireworks, a power-up's sparkle, and each
  //              map's own air (fireflies in the Hollow, gold dust in the Graveyard, wisps, motes): thousands at once,
  //              each one's whole flight worked out on the GPU from where and when it was born
  //   light      soft pools of light that breathe: lanterns, lit windows, jack-o'-lanterns, the burning ring, the
  //              Pumpkin King's eyes, a power-up, the moon; and a flash of light at every big contact
  //   glow       (Full only) the bright parts of the picture bloom: the frame, shrunk to a quarter, is blurred on the
  //              GPU and laid back over it
  // The layer is an opaque black canvas screen-blended over the game, so black leaves the picture as it was and light
  // only ever adds. Settings → GPU effects: Full, Lite (no bloom) or Off. Without WebGL (or blending), or if the GPU
  // drops the context, the layer switches itself off and the game looks just as it did. It never touches the
  // simulation: its randomness is its own, and nothing it does can change a throw.
  const GPU_MAX = 4096, GPU_STRIDE = 12, GPU_LIGHTS = 96;   // particles: x, y, vx, vy · t0, life, size, gravity · r, g, b, a
  const GPU_FLAMES = 3072;
  const Gpu = { supported: false, on: false, gl: null, cv: null, inst: null, t: 0, data: new Float32Array(GPU_MAX * GPU_STRIDE), head: 0, dirty: [GPU_MAX, -1],
    fdata: new Float32Array(GPU_FLAMES * GPU_STRIDE), fhead: 0, fdirty: [GPU_FLAMES, -1], dt: 1 / 60, acc: {},
    lights: [], flashes: [], p: {}, b: {}, small: null, sctx: null, tex: null, fbo: [], bw: 0, bh: 0, air: 0, css: "", filt: "", lost: false,
    stats: { emitted: 0, frames: 0, lights: 0, bloom: 0, draws: 0 }, dpr: 1 };
  const gpuMode = () => (Gpu.supported && !Gpu.lost ? settings.gpu || "off" : "off");
  const hexRgb = h => { const s = h.replace("#", ""); return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255]; };
  const GV_PART = `attribute vec2 aC; attribute vec4 a0; attribute vec4 a1; attribute vec4 a2; uniform vec2 uRes; uniform float uT; varying vec2 vUV; varying vec4 vCol;
    void main() { float age = uT - a1.x, life = a1.y; if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vUV = aC; vCol = vec4(0.0); return; }
      float k = age / life, dr = 1.7; vec2 p = a0.xy + a0.zw * (1.0 - exp(-dr * age)) / dr + vec2(0.0, 0.5 * a1.w * age * age);
      float blink = a1.z < 0.0 ? 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * 5.0 + a0.x * 0.37 + a0.y * 0.11), 3.0) : 1.0;
      float sz = abs(a1.z) * (1.0 - 0.55 * k); float fade = smoothstep(0.0, 0.07, k) * (1.0 - smoothstep(0.5, 1.0, k));
      vec2 q = p + aC * sz; vec2 c = q / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); vUV = aC; vCol = vec4(a2.rgb, a2.a * fade * blink); }`;
  const GF_PART = `precision mediump float; varying vec2 vUV; varying vec4 vCol;
    void main() { float d = length(vUV); if (d > 1.0) discard; float a = vCol.a * pow(1.0 - d, 1.6); float core = vCol.a * smoothstep(0.45, 0.0, d);
      gl_FragColor = vec4(vCol.rgb * a + vec3(core * 0.55), 1.0); }`;
  const GV_LIGHT = `attribute vec2 aC; attribute vec4 a0; attribute vec4 a1; uniform vec2 uRes; varying vec2 vUV; varying vec4 vCol;
    void main() { vec2 q = a0.xy + aC * a0.z; vec2 c = q / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); vUV = aC; vCol = vec4(a1.rgb, a0.w); }`;
  const GF_LIGHT = `precision mediump float; varying vec2 vUV; varying vec4 vCol;
    void main() { float d = dot(vUV, vUV); if (d > 1.0) discard; float a = vCol.a * exp(-d * 3.2) * (1.0 - d); gl_FragColor = vec4(vCol.rgb * a, 1.0); }`;
  // v49: fire. Each flame is a soft sprite born white-hot at its root that cools through orange to red as it rises,
  // swelling then shrinking, flickering side to side; hundreds make a fire. a2: (seed, sway, tint, alpha): tint 0 is
  // fire, 1 is the Cursed skull's green fire, 2 is smoke (a pale grey that billows and thins, for the dynamite).
  const GV_FLAME = `attribute vec2 aC; attribute vec4 a0; attribute vec4 a1; attribute vec4 a2; uniform vec2 uRes; uniform float uT; varying vec2 vUV; varying vec4 vCol;
    void main() { float age = uT - a1.x, life = a1.y; if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vUV = aC; vCol = vec4(0.0); return; }
      float k = age / life; bool smoke = a2.z > 1.5;
      vec2 p = a0.xy + a0.zw * (smoke ? (1.0 - exp(-2.2 * age)) / 2.2 : age) + vec2(sin(uT * 7.0 + a2.x) * a2.y * k, -0.5 * a1.w * age * age);
      float sz = smoke ? a1.z * (0.45 + 1.6 * sqrt(k)) : a1.z * (0.7 + 0.9 * k) * (1.0 - 0.75 * k * k);
      vec3 hot = vec3(1.0, 0.95, 0.74), mid = vec3(1.0, 0.52, 0.12), cool = vec3(0.78, 0.14, 0.04);
      vec3 col = k < 0.28 ? mix(hot, mid, k / 0.28) : mix(mid, cool, (k - 0.28) / 0.72);
      if (a2.z > 0.5 && !smoke) col = k < 0.3 ? mix(vec3(0.9, 1.0, 0.7), vec3(0.45, 0.95, 0.25), k / 0.3) : mix(vec3(0.45, 0.95, 0.25), vec3(0.12, 0.4, 0.08), (k - 0.3) / 0.7);
      if (smoke) col = vec3(0.62, 0.6, 0.58) * (1.0 - 0.35 * k);
      float fade = smoothstep(0.0, smoke ? 0.12 : 0.06, k) * (1.0 - smoothstep(smoke ? 0.35 : 0.5, 1.0, k));
      vec2 q = p + aC * sz; vec2 c = q / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); vUV = aC; vCol = vec4(col, a2.w * fade); }`;
  const GF_FLAME = `precision mediump float; varying vec2 vUV; varying vec4 vCol;
    void main() { float d = length(vUV); if (d > 1.0) discard; float a = vCol.a * exp(-d * d * 2.6) * (1.0 - d); gl_FragColor = vec4(vCol.rgb * a, 1.0); }`;
  const GV_QUAD = `attribute vec2 aC; varying vec2 vUV; void main() { vUV = aC * 0.5 + 0.5; gl_Position = vec4(aC, 0.0, 1.0); }`;
  const GF_BRIGHT = `precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform float uTh;
    void main() { vec3 c = texture2D(uTex, vec2(vUV.x, 1.0 - vUV.y)).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114)); gl_FragColor = vec4(c * smoothstep(uTh, 1.0, l), 1.0); }`;
  const GF_BLUR = `precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform vec2 uStep;
    void main() { vec3 s = texture2D(uTex, vUV).rgb * 0.227; s += (texture2D(uTex, vUV + uStep).rgb + texture2D(uTex, vUV - uStep).rgb) * 0.1945;
      s += (texture2D(uTex, vUV + uStep * 2.0).rgb + texture2D(uTex, vUV - uStep * 2.0).rgb) * 0.1216; s += (texture2D(uTex, vUV + uStep * 3.0).rgb + texture2D(uTex, vUV - uStep * 3.0).rgb) * 0.054;
      s += (texture2D(uTex, vUV + uStep * 4.0).rgb + texture2D(uTex, vUV - uStep * 4.0).rgb) * 0.0162; gl_FragColor = vec4(s, 1.0); }`;
  const GF_ADD = `precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform float uAmt; void main() { gl_FragColor = vec4(texture2D(uTex, vUV).rgb * uAmt, 1.0); }`;
  function gpuProgram(gl, vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = {}; for (const n of ["aC", "a0", "a1", "a2"]) loc[n] = gl.getAttribLocation(p, n);
    for (const n of ["uRes", "uT", "uTex", "uTh", "uStep", "uAmt"]) loc[n] = gl.getUniformLocation(p, n);
    return { p, loc };
  }
  // set up (once, and again if the context comes back): the canvas, the programs, the buffers
  function gpuInit() {
    const cv = $("gpuFx"); if (!cv) return false;
    Gpu.cv = cv;
    const blend = !!(window.CSS && CSS.supports && CSS.supports("mix-blend-mode", "screen"));
    let gl = null;
    try { gl = blend ? cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" }) : null; } catch (e) {}
    if (!gl) try { gl = blend ? cv.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" }) : null; } catch (e) {}
    if (!gl) { Gpu.supported = false; cv.hidden = true; return false; }
    const two = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    const ext = two ? null : gl.getExtension("ANGLE_instanced_arrays");
    if (!two && !ext) { Gpu.supported = false; cv.hidden = true; return false; }
    Gpu.inst = two ? { div: (i, d) => gl.vertexAttribDivisor(i, d), draw: (m, f, c, n) => gl.drawArraysInstanced(m, f, c, n) } : { div: (i, d) => ext.vertexAttribDivisorANGLE(i, d), draw: (m, f, c, n) => ext.drawArraysInstancedANGLE(m, f, c, n) };
    try {
      Gpu.p = { flame: gpuProgram(gl, GV_FLAME, GF_FLAME), part: gpuProgram(gl, GV_PART, GF_PART), light: gpuProgram(gl, GV_LIGHT, GF_LIGHT), bright: gpuProgram(gl, GV_QUAD, GF_BRIGHT), blur: gpuProgram(gl, GV_QUAD, GF_BLUR), add: gpuProgram(gl, GV_QUAD, GF_ADD) };
    } catch (e) { Gpu.supported = false; cv.hidden = true; Telemetry.emit("gpu_fail", { why: String(e.message || e).slice(0, 80) }); return false; }
    const buf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
    Gpu.b = { corner: buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW), parts: buf(Gpu.data, gl.DYNAMIC_DRAW), flames: buf(Gpu.fdata, gl.DYNAMIC_DRAW), lights: buf(new Float32Array(GPU_LIGHTS * 8), gl.DYNAMIC_DRAW) };
    gpuClear();   // (every slot starts dead)
    gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.parts); gl.bufferData(gl.ARRAY_BUFFER, Gpu.data, gl.DYNAMIC_DRAW); Gpu.dirty = [GPU_MAX, -1];
    gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.flames); gl.bufferData(gl.ARRAY_BUFFER, Gpu.fdata, gl.DYNAMIC_DRAW); Gpu.fdirty = [GPU_FLAMES, -1];
    Gpu.gl = gl; Gpu.supported = true; Gpu.lost = false; Gpu.tex = null; Gpu.fbo = []; Gpu.bw = Gpu.bh = 0;
    return true;
  }
  $("gpuFx") && $("gpuFx").addEventListener("webglcontextlost", e => { e.preventDefault(); Gpu.lost = true; Gpu.on = false; });
  $("gpuFx") && $("gpuFx").addEventListener("webglcontextrestored", () => { gpuInit(); gpuResize(); });
  function gpuResize() {
    const cv = Gpu.cv; if (!cv || !Gpu.supported) return;
    Gpu.dpr = Math.min(DPR, 1.5); cv.width = Math.max(1, Math.round(W * Gpu.dpr)); cv.height = Math.max(1, Math.round(H * Gpu.dpr));
    Gpu.bw = Gpu.bh = 0;   // (the bloom's targets are remade at the new size)
  }
  // ── particles: born on the CPU (where, when, how fast, what colour), flown on the GPU
  function gpuEmit(x, y, vx, vy, life, size, grav, rgb, a, blink = false) {
    if (!Gpu.on) return;
    const i = Gpu.head, o = i * GPU_STRIDE, D = Gpu.data;
    D[o] = x; D[o + 1] = y; D[o + 2] = vx; D[o + 3] = vy; D[o + 4] = Gpu.t; D[o + 5] = life; D[o + 6] = blink ? -size : size; D[o + 7] = grav; D[o + 8] = rgb[0]; D[o + 9] = rgb[1]; D[o + 10] = rgb[2]; D[o + 11] = a;
    Gpu.dirty[0] = Math.min(Gpu.dirty[0], i); Gpu.dirty[1] = Math.max(Gpu.dirty[1], i);
    Gpu.head = (i + 1) % GPU_MAX; Gpu.stats.emitted++;
  }
  // ── v49: fire and smoke, flown on the GPU (their own buffer, so a big fire never crowds the sparks out)
  function gpuFlameEmit(x, y, vx, vy, life, size, rise, sway, tint, a) {
    const i = Gpu.fhead, o = i * GPU_STRIDE, D = Gpu.fdata;
    D[o] = x; D[o + 1] = y; D[o + 2] = vx; D[o + 3] = vy; D[o + 4] = Gpu.t; D[o + 5] = life; D[o + 6] = size; D[o + 7] = rise; D[o + 8] = Math.random() * 100; D[o + 9] = sway; D[o + 10] = tint; D[o + 11] = a;
    Gpu.fdirty[0] = Math.min(Gpu.fdirty[0], i); Gpu.fdirty[1] = Math.max(Gpu.fdirty[1], i);
    Gpu.fhead = (i + 1) % GPU_FLAMES; Gpu.stats.flames = (Gpu.stats.flames || 0) + 1;
  }
  // how many to make this frame, for a fire that makes rate a second (key: which fire, so each keeps its own count)
  function gpuDue(key, rate) { const n = (Gpu.acc[key] || 0) + rate * Math.min(Gpu.dt, 0.05) * QUALITY.particles * (reduceMotion ? 0.5 : 1); const m = Math.floor(n); Gpu.acc[key] = n - m; return m; }
  // a fire at a point in the canvas's own space (c's current transform: a prop's or a skull's local units): w wide at
  // its root, flames h tall. Returns false when the GPU isn't drawing, so the caller paints its 2D fire instead.
  function gpuFireAt(c, key, lx, ly, w, h, heat = 1, tint = 0) {
    if (!Gpu.on || c !== ctx || !inRun() && game.state !== "over") return false;
    const m = c.getTransform(), sc = Math.hypot(m.a, m.b) / DPR, x = (m.a * lx + m.c * ly + m.e) / DPR, y = (m.b * lx + m.d * ly + m.f) / DPR, W2 = w * sc, H2 = h * sc;
    if (x < -H2 * 2 || x > W + H2 * 2 || y < -H2 * 2 || y > H + H2 * 2) return true;
    const n = gpuDue(key, (40 + W2 * 2.2) * heat);
    for (let i = 0; i < n; i++) { const u = rand(-0.5, 0.5), life = rand(0.24, 0.45) * (0.7 + 0.3 * heat); gpuFlameEmit(x + u * W2, y + rand(-0.08, 0.08) * H2, -u * W2 * 0.6, -H2 * rand(0.35, 0.8) / life, life, W2 * rand(0.45, 0.7) * (1 - Math.abs(u) * 0.7) + 2, H2 * 1.2, W2 * 0.1, tint, 0.7); }
    gpuLight(x, y - H2 * 0.4, Math.max(W2, H2) * 2.2, tint ? "140,255,110" : "255,150,60", 0.22 * heat * (0.85 + 0.15 * Math.sin(Gpu.t * 17 + x)));
    return true;
  }
  // the burning ring (08c_scene.js): tongues all round the top of its band, outward and up, hotter as the streak climbs
  function gpuRingFire(x, y, E, lw, heat) {
    if (!Gpu.on) return false;
    const n = gpuDue("ring", (260 + E * 3) * heat), k = heat;
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 0.8, Math.PI * 2.2), ca = Math.cos(a), sa = Math.sin(a); if (sa > 0.5) continue;
      const out = E * rand(0.9, 1.04), life = rand(0.22, 0.42) * (0.8 + 0.3 * k), up = E * (0.28 + 0.4 * k) * (0.6 + 0.6 * Math.max(0, -sa));   // (tongues that lick up off the band, hugging it)
      gpuFlameEmit(x + ca * out, y + sa * out, ca * up * 0.35 / life, (sa * 0.35 - 0.75) * up / life, life, Math.max(lw * 2.1, E * 0.26) * rand(0.75, 1.15), E * 0.9, E * 0.04, 0, 0.62);
    }
    gpuLight(x, y, E * (2.2 + 0.4 * k), "255,140,50", 0.36 * k * (0.85 + 0.15 * Math.sin(Gpu.t * 17)));
    return true;
  }
  // smoke: a billow of pale puffs that swell, drift up and thin away (the Dynamite's KABOOM: 07c_power.js)
  function gpuSmoke(x, y, r, n = 26) {
    if (!Gpu.on) return false;
    const k = U / 420; n = Math.round(n * QUALITY.particles * (reduceMotion ? 0.6 : 1));
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(40, 160) * k * (r / (U * 0.3)); gpuFlameEmit(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - rand(20, 60) * k, rand(1.2, 2.2), r * rand(0.35, 0.6), -rand(20, 50) * k, r * 0.06, 2, rand(0.55, 0.8)); }
    for (let i = 0; i < Math.round(n * 0.6); i++) { const a = rand(0, TAU), sp = rand(60, 220) * k; gpuFlameEmit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.25, 0.5), r * rand(0.25, 0.4), 120 * k, 0, 0, 0.9); }   // (the fireball at its heart)
    return true;
  }
  // a burst of sparks: n of them out of (x, y), fast and falling, in the recipe's colours
  function gpuBurst(x, y, R, scale = 1) {
    if (!Gpu.on) return;
    const k = U / 420, n = Math.round(R.n * scale * QUALITY.particles * (reduceMotion ? 0.5 : 1)), cols = R.colors.map(hexRgb);
    for (let i = 0; i < n; i++) {
      const a = R.ring ? (i / n) * TAU : rand(0, TAU), sp = rand(R.speed[0], R.speed[1]) * k * (R.ring ? rand(0.85, 1.1) : 1), up = R.up || 0;
      gpuEmit(x + rand(-3, 3), y + rand(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp - up * k, rand(R.life[0], R.life[1]), rand(R.size[0], R.size[1]) * k, (R.grav || 0) * k, cols[i % cols.length], R.a || 1);
    }
    if (R.flash) gpuFlash(x, y, R.flash[0] * k * scale, R.flash[1], R.flash[2] * flashK(), R.flash[3]);
  }
  const GPU_FX = {
    perfect: { n: 48, speed: [150, 430], life: [0.5, 1.1], size: [2.4, 5], grav: 460, colors: ["#FFE08A", "#E3B64B", "#FFF6D0"], flash: [120, "255,214,120", 0.9, 0.45] },
    swish:   { n: 24, speed: [110, 300], life: [0.4, 0.8], size: [2, 4], grav: 420, colors: ["#F2E7C9", "#FFE08A"], flash: [80, "255,236,190", 0.5, 0.3] },
    rim:     { n: 14, speed: [80, 220], life: [0.35, 0.7], size: [2, 3.4], grav: 420, colors: ["#F2E7C9", "#E0B85C"], flash: [60, "255,226,170", 0.35, 0.25] },
    clank:   { n: 20, speed: [120, 340], life: [0.25, 0.55], size: [1.6, 3], grav: 620, colors: ["#FFB050", "#FFE08A", "#FF7A3A"], flash: [50, "255,170,90", 0.45, 0.2] },
    post:    { n: 16, speed: [110, 300], life: [0.25, 0.5], size: [1.6, 3], grav: 620, colors: ["#FFB050", "#FFE08A"], flash: [44, "255,170,90", 0.35, 0.2] },
    boss:    { n: 40, speed: [140, 380], life: [0.5, 1.0], size: [2.6, 5.2], grav: 380, colors: ["#FF8A3A", "#FFD04A", "#E8503A"], flash: [140, "255,150,70", 0.8, 0.5] },
    ko:      { n: 150, ring: true, speed: [260, 520], life: [0.8, 1.6], size: [2.8, 6], grav: 240, colors: ["#FFE08A", "#E8503A", "#F2E7C9", "#E3B64B"], flash: [260, "255,220,150", 1.0, 0.9] },
    seed:    { n: 10, speed: [80, 200], life: [0.3, 0.6], size: [1.8, 3], grav: 500, colors: ["#F4E6BE", "#C8A04A"] },
    pickup:  { n: 34, ring: true, speed: [90, 220], life: [0.6, 1.1], size: [2.4, 4.4], grav: -40, colors: ["#F2E7C9"], flash: [100, "242,231,201", 0.7, 0.5] }
  };
  function gpuImpact(kind, at, hit) {   // (from the director, on the contact: 04e_director.js)
    if (!Gpu.on) return; const R = GPU_FX[kind], p = kind === "clank" || kind === "post" ? hit || at : at || hit; if (!R || !p) return;
    gpuBurst(p.x, p.y, R);
  }
  function gpuPickup(x, y, color) { if (!Gpu.on) return; const c = color || "#F2E7C9"; gpuBurst(x, y, { ...GPU_FX.pickup, colors: [c, "#F2E7C9"], flash: [100, hexRgb(c).map(v => Math.round(v * 255)).join(","), 0.7, 0.5] }); }
  // embers off a burning ring (heat 0–1), rising
  function gpuEmbers(x, y, r, heat, dt) {
    if (!Gpu.on || heat <= 0) return;
    Gpu.ember = (Gpu.ember || 0) + dt * heat * 55 * QUALITY.particles * (reduceMotion ? 0.4 : 1);
    const k = U / 420, cols = [[1, 0.62, 0.22], [1, 0.84, 0.35], [0.95, 0.35, 0.15]];
    while (Gpu.ember >= 1) { Gpu.ember -= 1; const a = rand(Math.PI * 1.05, Math.PI * 1.95); gpuEmit(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, rand(-30, 30) * k, rand(-90, -40) * k, rand(0.7, 1.4), rand(1.6, 3.4) * k, -60 * k, cols[(Math.random() * 3) | 0], 0.9); }
    gpuLight(x, y, r * 2.6, "255,140,60", 0.32 * heat * (0.85 + 0.15 * Math.sin(Gpu.t * 17)));
  }
  // each map's own air, drifting across the lower half of the screen
  const GPU_AIR = { hollow: [2.6, ["#D8F07A", "#FFE08A"], true], gilded: [3.5, ["#FFE08A", "#E3B64B"], false], woods: [2.4, ["#8FF0D8", "#C8FFF0"], true], drowned: [1.6, ["#F2E7C9"], false],
    marsh: [3.2, ["#B8F070", "#E0FF9A"], true], desert: [4, ["#F0B070", "#E8C890"], false], caves: [2.4, ["#FFB050", "#FFD890"], true], abyss: [3.2, ["#C8A0FF", "#8FE8FF"], true] };
  function gpuAir(dt) {
    const A = GPU_AIR[mapData(sceneMap + 1).id]; if (!A || screen !== "play" && game.state !== "title") return;
    Gpu.air += dt * A[0] * QUALITY.particles * (reduceMotion ? 0.5 : 1);
    const k = U / 420, cols = A[1].map(hexRgb);
    while (Gpu.air >= 1) { Gpu.air -= 1; gpuEmit(rand(0, W), rand(HY - U * 0.05, H * 0.86), rand(-14, 14) * k, rand(-10, 4) * k, rand(3, 6.5), rand(1.8, 3.2) * k, -2 * k, cols[(Math.random() * cols.length) | 0], 0.8, A[2] && !reduceMotion); }
  }
  // ── light: soft pools, gathered while the frame is drawn (gpuLight), and flashes that fade (gpuFlash)
  function gpuLight(x, y, r, rgb, a) {
    if (!Gpu.on || Gpu.lights.length >= GPU_LIGHTS || a <= 0.004 || r < 2) return;
    if (x + r < 0 || x - r > W || y + r < 0 || y - r > H) return;
    Gpu.lights.push([x, y, r, a, rgb]);
  }
  function gpuFlash(x, y, r, rgb, a, dur) { if (Gpu.on && a > 0) Gpu.flashes.push({ x, y, r, rgb, a, dur, t: 0 }); }
  const rgbCache = {};
  const rgbN = s => rgbCache[s] || (rgbCache[s] = s.split(",").map(v => +v / 255));
  // ── the frame: the bloom (Full), then the light pools, then the particles, all added onto black
  function gpuFrame(dt) {
    const mode = gpuMode(), want = mode !== "off" && screen === "play" || (mode !== "off" && game.state === "title");
    if (!want) { if (Gpu.on) { Gpu.on = false; Gpu.cv.hidden = true; } Gpu.lights.length = 0; return; }
    if (!Gpu.on) { Gpu.on = true; Gpu.cv.hidden = false; gpuResize(); }
    const gl = Gpu.gl, cv = Gpu.cv; if (!gl) return;
    if (cv.width !== Math.round(W * Gpu.dpr) || cv.height !== Math.round(H * Gpu.dpr)) gpuResize();
    Gpu.t += dt; Gpu.dt = dt || 1 / 60; Gpu.stats.frames++;
    // the picture's own camera moves (a crash zoom, a whip, a dutch tilt) and its film grade go on this layer too
    if (cvs.style.transform !== Gpu.css) { Gpu.css = cvs.style.transform; cv.style.transform = Gpu.css; }
    if (cvs.style.filter !== Gpu.filt) { Gpu.filt = cvs.style.filter; cv.style.filter = Gpu.filt; }
    if (!paused) gpuAir(dt);
    if (Gpu.fire && !paused) gpuEmbers(Gpu.fire.x, Gpu.fire.y, Gpu.fire.r, Gpu.fire.heat, dt); Gpu.fire = null;   // (the burning ring, as drawn this frame: 08c_scene.js)
    for (const f of Gpu.flashes) { f.t += dt; const u = f.t / f.dur; if (u < 1) gpuLight(f.x, f.y, f.r * (1 + u * 0.4), f.rgb, f.a * (1 - u) * (1 - u)); }
    Gpu.flashes = Gpu.flashes.filter(f => f.t < f.dur);
    gl.viewport(0, 0, cv.width, cv.height); gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (mode === "full" && QUALITY.level >= 0.99) gpuBloom(gl); else Gpu.stats.bloom = 0;
    gl.viewport(0, 0, cv.width, cv.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gpuDrawLights(gl); gpuDrawFlames(gl); gpuDrawParticles(gl);
    Gpu.stats.lights = Gpu.lights.length; Gpu.lights.length = 0;
  }
  function gpuCorner(gl, P) { gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.corner); gl.enableVertexAttribArray(P.loc.aC); gl.vertexAttribPointer(P.loc.aC, 2, gl.FLOAT, false, 0, 0); Gpu.inst.div(P.loc.aC, 0); }
  function gpuAttr(gl, loc, size, stride, off) { if (loc < 0) return; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); Gpu.inst.div(loc, 1); }
  function gpuDone(gl, P) { for (const n of ["a0", "a1", "a2"]) if (P.loc[n] >= 0) { Gpu.inst.div(P.loc[n], 0); gl.disableVertexAttribArray(P.loc[n]); } }
  function gpuDrawParticles(gl) {
    const P = Gpu.p.part; gl.useProgram(P.p); gl.uniform2f(P.loc.uRes, W, H); gl.uniform1f(P.loc.uT, Gpu.t);
    gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.parts);
    if (Gpu.dirty[1] >= Gpu.dirty[0]) { const a = Gpu.dirty[0], b = Gpu.dirty[1] + 1; gl.bufferSubData(gl.ARRAY_BUFFER, a * GPU_STRIDE * 4, Gpu.data.subarray(a * GPU_STRIDE, b * GPU_STRIDE)); Gpu.dirty = [GPU_MAX, -1]; }
    gpuCorner(gl, P); gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.parts);
    gpuAttr(gl, P.loc.a0, 4, GPU_STRIDE * 4, 0); gpuAttr(gl, P.loc.a1, 4, GPU_STRIDE * 4, 16); gpuAttr(gl, P.loc.a2, 4, GPU_STRIDE * 4, 32);
    Gpu.inst.draw(gl.TRIANGLE_STRIP, 0, 4, GPU_MAX); Gpu.stats.draws++;
    gpuDone(gl, P);
  }
  function gpuDrawFlames(gl) {
    const P = Gpu.p.flame; gl.useProgram(P.p); gl.uniform2f(P.loc.uRes, W, H); gl.uniform1f(P.loc.uT, Gpu.t);
    gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.flames);
    if (Gpu.fdirty[1] >= Gpu.fdirty[0]) { const a = Gpu.fdirty[0], b = Gpu.fdirty[1] + 1; gl.bufferSubData(gl.ARRAY_BUFFER, a * GPU_STRIDE * 4, Gpu.fdata.subarray(a * GPU_STRIDE, b * GPU_STRIDE)); Gpu.fdirty = [GPU_FLAMES, -1]; }
    gpuCorner(gl, P); gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.flames);
    gpuAttr(gl, P.loc.a0, 4, GPU_STRIDE * 4, 0); gpuAttr(gl, P.loc.a1, 4, GPU_STRIDE * 4, 16); gpuAttr(gl, P.loc.a2, 4, GPU_STRIDE * 4, 32);
    Gpu.inst.draw(gl.TRIANGLE_STRIP, 0, 4, GPU_FLAMES); Gpu.stats.draws++;
    gpuDone(gl, P);
  }
  function gpuDrawLights(gl) {
    const L = Gpu.lights; if (!L.length) return;
    const P = Gpu.p.light, d = new Float32Array(L.length * 8);
    L.forEach(([x, y, r, a, rgb], i) => { const c = rgbN(rgb); d.set([x, y, r, a, c[0], c[1], c[2], 0], i * 8); });
    gl.useProgram(P.p); gl.uniform2f(P.loc.uRes, W, H);
    gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.lights); gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
    gpuCorner(gl, P); gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.b.lights);
    gpuAttr(gl, P.loc.a0, 4, 32, 0); gpuAttr(gl, P.loc.a1, 4, 32, 16);
    Gpu.inst.draw(gl.TRIANGLE_STRIP, 0, 4, L.length); Gpu.stats.draws++;
    gpuDone(gl, P);
  }
  // the bloom: the frame at a quarter size → only its bright parts → blurred across, then down → added over the picture
  function gpuTarget(gl, w, h) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }
  function gpuBloom(gl) {
    const w = Math.max(8, Math.round(W / 4)), h = Math.max(8, Math.round(H / 4));
    if (Gpu.bw !== w || Gpu.bh !== h) {
      for (const T of Gpu.fbo) { gl.deleteTexture(T.tex); gl.deleteFramebuffer(T.fb); }
      if (Gpu.tex) gl.deleteTexture(Gpu.tex);
      Gpu.fbo = [gpuTarget(gl, w, h), gpuTarget(gl, w, h)]; Gpu.tex = gl.createTexture(); Gpu.bw = w; Gpu.bh = h;
      gl.bindTexture(gl.TEXTURE_2D, Gpu.tex); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (!Gpu.small) { Gpu.small = document.createElement("canvas"); Gpu.sctx = Gpu.small.getContext("2d"); }
      Gpu.small.width = w; Gpu.small.height = h;
    }
    const [A, B] = Gpu.fbo;
    if ((Gpu.stats.frames & 1) === 0 || !Gpu.stats.bloom) {   // (the picture is sampled every other frame; the glow keeps up)
      Gpu.sctx.drawImage(cvs, 0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, Gpu.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, Gpu.small);
      gl.disable(gl.BLEND); gl.viewport(0, 0, w, h);
      const quad = P => { gl.useProgram(P.p); gpuCorner(gl, P); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); Gpu.stats.draws++; };
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.useProgram(Gpu.p.bright.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, Gpu.tex); gl.uniform1i(Gpu.p.bright.loc.uTex, 0); gl.uniform1f(Gpu.p.bright.loc.uTh, 0.74); quad(Gpu.p.bright);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb); gl.useProgram(Gpu.p.blur.p); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform1i(Gpu.p.blur.loc.uTex, 0); gl.uniform2f(Gpu.p.blur.loc.uStep, 1.6 / w, 0); quad(Gpu.p.blur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.bindTexture(gl.TEXTURE_2D, B.tex); gl.uniform2f(Gpu.p.blur.loc.uStep, 0, 1.6 / h); quad(Gpu.p.blur);
      Gpu.stats.bloom = (Gpu.stats.bloom || 0) + 1;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, Gpu.cv.width, Gpu.cv.height); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const P = Gpu.p.add; gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform1i(P.loc.uTex, 0); gl.uniform1f(P.loc.uAmt, 0.34 * (boss ? 1.15 : 1));
    gpuCorner(gl, P); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); Gpu.stats.draws++;
  }
  function gpuClear() { Gpu.data.fill(0); for (let i = 0; i < GPU_MAX; i++) Gpu.data[i * GPU_STRIDE + 5] = -1; Gpu.dirty = [0, GPU_MAX - 1];
    Gpu.fdata.fill(0); for (let i = 0; i < GPU_FLAMES; i++) Gpu.fdata[i * GPU_STRIDE + 5] = -1; Gpu.fdirty = [0, GPU_FLAMES - 1]; Gpu.flashes.length = 0; Gpu.lights.length = 0; }
