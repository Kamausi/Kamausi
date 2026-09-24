  // ───────────────────────── the painted planes (cached per resize) ─────────────────────────
  // Back to front: sky → [stars, clouds, the moon, lightning] → far skyline → [bats, witch] → ground → [headstones,
  // wanderers, fog] → the play field → near props → foreground frame. The flat planes are painted a little
  // bigger than the screen (the bleed) so a moving camera never shows an edge. Far planes are softer and hazier,
  // the foreground sharp-edged but dark and slightly soft, like a miniature set with depth of field.
  let skyLayer = null, farLayer = null, midLayer = null, groundLayer = null, fgLayer = null, moon = { x: 0, y: 0, r: 0 };
  const bleed = () => Math.round(Math.max(56, U * 0.3));
  function plate(x0, y0, w, h) {   // a canvas you paint in screen coordinates, covering (x0, y0, w, h)
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR));
    const g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, -x0 * DPR, -y0 * DPR);
    return { c, g, x0, y0, w, h };
  }
  function rr(g, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // artwork for a plane (src/art/scene/<plane>.svg, or a painted .webp/.png), if one was supplied: 2:1, horizon 35% down
  const SCENE_IMG = {};
  for (const [k, url] of Object.entries(SCENE_ART)) { const im = new Image(); im.onload = () => { if (W) resize(); }; im.src = url; SCENE_IMG[k] = im; }
  function sceneArt(g, name) {
    const im = SCENE_IMG[name]; if (!im || !im.complete || !im.naturalWidth) return false;
    const S = (H * 1.2) / 1000, q = g.imageSmoothingQuality; g.imageSmoothingQuality = "high";   // a painted plate is usually scaled down
    g.drawImage(im, W / 2 - 1000 * S, HY - 350 * S, 2000 * S, 1000 * S); g.imageSmoothingQuality = q; return true;
  }
  // The moon hangs on its own little plate at the sky's depth, drawn after the drifting clouds so its face always
  // reads (its halo stays in the sky plate, behind them). With artwork supplied (src/art/moon, made by prepare.py),
  // moon.json says where the round disc sits in the picture: the disc lands where the moon belongs and anything past
  // it (the telescope) hangs out over the sky. Without it, the old plain disc is painted instead.
  let moonLayer = null;
  const MOON_IMG = MOON_ART ? new Image() : null;
  let moonState = MOON_ART ? "loading" : "none";
  if (MOON_IMG) {
    MOON_IMG.onload = () => { moonState = "loaded"; if (W) buildMoon(); };
    MOON_IMG.onerror = () => { moonState = "broken"; if (W) buildMoon(); };
    MOON_IMG.src = MOON_ART.src;
  }
  function moonPlate(x0, y0, w, h) {   // edges on whole device pixels, so the sprite blits at 1:1 and stays crisp
    const a = Math.floor(x0 * DPR) - 1, b = Math.floor(y0 * DPR) - 1, c = Math.ceil((x0 + w) * DPR) + 1, d = Math.ceil((y0 + h) * DPR) + 1;
    return plate(a / DPR, b / DPR, (c - a) / DPR, (d - b) / DPR);
  }
  function buildMoon() {
    moonLayer = null;
    if (moonState === "loading" && MOON_IMG.complete) moonState = MOON_IMG.naturalWidth ? "loaded" : "broken";   // decoded before its onload ran
    const { x, y, r } = moon, kind = moon.kind || "art";
    if (!r || kind === "none") return;
    if (kind === "art" && moonState === "loading") return;   // an empty sky for a frame beats a moon that visibly swaps
    if (kind === "art" && moonState === "loaded") {
      const nw = MOON_IMG.naturalWidth, nh = MOON_IMG.naturalHeight, k = r / (MOON_ART.r * nw), w = nw * k, h = nh * k;
      const x0 = x - MOON_ART.cx * w, y0 = y - MOON_ART.cy * h, P = moonPlate(x0, y0, w, h);
      P.g.imageSmoothingEnabled = true; P.g.imageSmoothingQuality = "high"; P.g.drawImage(MOON_IMG, x0, y0, w, h);
      moonLayer = P; return;
    }
    const pad = kind === "screen" ? r * 1.4 : r * 3.3, P = moonPlate(x - pad, y - pad, pad * 2, pad * 2);   // a coded moon (or the picture-house screen)
    paintMoonKind(P.g, kind === "art" ? "full" : kind, x, y, r, look().moonColor);
    moonLayer = P;
  }
  function buildSky() {   // the map's painted night (or dusk, or the dark of a picture house), its moon and its stars
    const L = look(), B = bleed(), P = plate(-B, -B, W + 2 * B, HY + B + U * 0.14), b = P.g; skyLayer = P;
    const rnd = mulberry32(1931 + sceneMap * 7), x0 = -B, x1 = W + B, kind = L.moon === "art" && !MOON_ART ? "full" : L.moon;
    sceneFX.screen = null;
    // the drawn moon has a face to read, so it is hung a size up from the plain disc; a harvest moon sits big and low
    const mr = kind === "harvest" ? U * 0.13 : kind === "screen" ? U * 0.25 : kind === "eclipse" ? U * 0.1 : U * (kind === "art" ? 0.09 : 0.065);
    const mx = kind === "screen" ? W / 2 : W / 2 - Math.min(W * 0.33, U * 0.8);
    const my = kind === "harvest" ? HY - mr * 0.55 : kind === "screen" ? Math.max(HY * 0.45, H * BLUEPRINT.hudSafe.top + mr * 0.65 + 12) : Math.max(HY * 0.3, 96 + mr);   // (the screen hangs clear of the HUD)
    moon = { x: mx, y: my, r: kind === "none" ? 0 : mr, kind };
    if (sceneMap === 0 && sceneArt(b, "sky")) { if (!MOON_ART) moon.r = 0; buildMoon(); return; }   // (the plane artwork is Moonshine's)
    buildMoon();
    let g = b.createLinearGradient(0, -B, 0, HY);
    g.addColorStop(0, L.sky[0]); g.addColorStop(0.5, L.sky[1]); g.addColorStop(0.85, L.sky[2]); g.addColorStop(1, L.sky[3]);
    b.fillStyle = g; b.fillRect(x0, -B, x1 - x0, HY + B + U * 0.14);
    for (let i = 0; i < 32; i++) {   // watercolour blooms
      const x = x0 + rnd() * (x1 - x0), y = -B + rnd() * (HY + B), r = U * (0.15 + rnd() * 0.3), light = rnd() < 0.5;
      const gg = b.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, light ? "rgba(232,216,180,.05)" : "rgba(10,12,20,.08)"); gg.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = gg; b.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const n = Math.round(((x1 - x0) * (HY + B)) / 4200 * L.stars);
    b.fillStyle = CREAM;
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0), y = -B + rnd() * (HY + B) * 0.88, big = rnd() < 0.08;
      b.globalAlpha = (0.2 + rnd() * 0.55) * (1 - (Math.max(0, y) / HY) * 0.8);
      if (big) { star(b, x, y, 2.4, 4, 0.3, 0); b.fill(); } else b.fillRect(x, y, 1, 1);
    }
    b.globalAlpha = 1;
    if (moon.r && kind !== "screen") {   // the halo keeps its old reach whatever size the moon is
      const gr = U * 0.39, rgb = rgbOf(L.moonColor);
      g = b.createRadialGradient(mx, my, mr * 0.8, mx, my, gr);
      g.addColorStop(0, `rgba(${rgb},.22)`); g.addColorStop(0.4, `rgba(${rgb},.07)`); g.addColorStop(1, `rgba(${rgb},0)`);
      b.fillStyle = g; b.beginPath(); b.arc(mx, my, gr, 0, TAU); b.fill();
    }
    g = b.createLinearGradient(0, HY - U * 0.45, 0, HY + U * 0.14);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.76, L.horizon); g.addColorStop(1, L.horizon);
    b.fillStyle = g; b.fillRect(x0, HY - U * 0.45, x1 - x0, U * 0.59);
  }
  // the far skyline: a ridge of headstones, crosses, bare trees and the old house, softened by distance
  const ridgeY = x => HY - U * (0.014 + 0.009 * Math.sin((x / U) * 3.1 + 1) + 0.005 * Math.sin((x / U) * 7.7));
  function buildFar() {
    const L = look(), B = bleed(), art = sceneMap === 0 && SCENE_IMG.far && SCENE_IMG.far.naturalWidth;
    const P = art ? plate(-B, -B, W + 2 * B, H + 2 * B) : plate(-B, HY - U * 0.34, W + 2 * B, U * 0.4), b = P.g; farLayer = P;
    sceneFX.clock = null; sceneFX.wheel = null;
    if (art && sceneArt(b, "far")) return;
    const rnd = mulberry32(77 + sceneMap * 13), x0 = -B, x1 = W + B, base = HY + U * 0.05;
    SKYLINES[L.skyline](b, rnd, x0, x1, base, L.silhouette, L);
    // atmospheric haze: the far plane sits behind a thin veil of the sky's colour
    const g = b.createLinearGradient(0, HY - U * 0.2, 0, base);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, L.haze);
    b.globalCompositeOperation = "source-atop"; b.fillStyle = g; b.fillRect(x0, HY - U * 0.34, x1 - x0, U * 0.4); b.globalCompositeOperation = "source-over";
  }
  function buildGround() {
    const L = look(), B = bleed(), P = plate(-B, HY - U * 0.06, W + 2 * B, H + B - (HY - U * 0.06)), b = P.g; groundLayer = P;
    const rnd = mulberry32(78 + sceneMap), x0 = -B, x1 = W + B;
    let g = b.createLinearGradient(0, HY, 0, H + B);
    g.addColorStop(0, L.ground[0]); g.addColorStop(0.3, L.ground[1]); g.addColorStop(0.7, L.ground[2]); g.addColorStop(1, L.ground[3]);
    b.fillStyle = g; b.fillRect(x0, HY, x1 - x0, H + B - HY);
    if (L.ambient.water) paintWater(b, x0, x1, B);
    else {   // low rolling hills stacked toward the horizon, each with a lit rim (cartoon backgrounds are all layers)
      for (const [zc, col, amp, seed] of [[46, L.hills[0], 0.9, 1], [34, L.hills[1], 0.7, 2], [26, L.hills[2], 0.55, 3]]) {
        b.fillStyle = col; b.strokeStyle = L.hillRim; b.lineWidth = 1.5; b.beginPath();
        const yAt = x => projectBase((x - W / 2) / (F / (zc + CAM_BACK)), amp * (0.55 + 0.45 * Math.sin(x / U * 2.2 + seed * 2)), zc).y;
        b.moveTo(x0, HY + U * 0.2); for (let x = x0; x <= x1 + 8; x += 8) b.lineTo(x, yAt(x)); b.lineTo(x1, HY + U * 0.2); b.closePath(); b.fill();
        b.beginPath(); for (let x = x0; x <= x1 + 8; x += 8) (x === x0 ? b.moveTo(x, yAt(x)) : b.lineTo(x, yAt(x))); b.stroke();
      }
    }
    LANES[L.lane](b, x0, x1);
    g = b.createLinearGradient(0, HY - U * 0.05, 0, HY + U * 0.1);
    g.addColorStop(0, "rgba(200,210,225,0)"); g.addColorStop(0.45, "rgba(200,210,225,.1)"); g.addColorStop(1, "rgba(200,210,225,0)");
    b.fillStyle = g; b.fillRect(x0, HY - U * 0.05, x1 - x0, U * 0.15);
    // a pool of stage light where the ring lives
    const lp = projectBase(0, 0, RING_Z);
    g = b.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, U * 0.7);
    g.addColorStop(0, L.light); g.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = g; b.save(); b.translate(lp.x, lp.y); b.scale(1, 0.32); b.translate(-lp.x, -lp.y); b.beginPath(); b.arc(lp.x, lp.y, U * 0.7, 0, TAU); b.fill(); b.restore();
    if (!L.grass.length) return;
    const zMin = Math.max(0, (CAMY * F) / (H + B - HY) - CAM_BACK);
    for (let i = 0; i < 700; i++) {   // painted grass: little inked ticks, bigger as they come nearer
      const x = (rnd() * 2 - 1) * 14, z = zMin + Math.pow(rnd(), 1.5) * 40, p = projectBase(x, 0, z);
      if (p.y > H + B || p.y < HY || p.x < x0 || p.x > x1) continue;
      if (L.lane === "boardwalk" && Math.abs(x) < 0.9 && z < RING_Z + 1.3) continue;
      const len = 0.09 * p.s, lean = (rnd() - 0.5) * len * 0.8;
      b.globalAlpha = clamp(0.25 + (p.s / F) * 1.2, 0.25, 0.7); b.strokeStyle = rnd() < 0.5 ? L.grass[0] : L.grass[1]; b.lineWidth = Math.max(0.8, 0.012 * p.s); b.lineCap = "round";
      b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(p.x + lean, p.y - len); b.moveTo(p.x + len * 0.25, p.y); b.lineTo(p.x + len * 0.3 + lean * 0.6, p.y - len * 0.7); b.stroke();
    }
    b.globalAlpha = 1;
  }
  function buildMid() {   // only when artwork is supplied (it belongs to Moonshine Cemetery): a plane between the skyline and the ring
    midLayer = null; if (sceneMap !== 0 || !SCENE_IMG.mid || !SCENE_IMG.mid.naturalWidth) return;
    const B = bleed(), P = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(P.g, "mid"); midLayer = P;
  }
  // the foreground frame: branches hanging into the top corners, very near the lens, dark and a touch soft
  let nearLayer = null;   // near-plane artwork, when supplied, is painted once per screen size like the rest
  function buildForeground() {
    const B = bleed();
    nearLayer = null;
    const art = sceneMap === 0;   // (supplied plane artwork is Moonshine's)
    if (art && SCENE_IMG.near && SCENE_IMG.near.naturalWidth) { nearLayer = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(nearLayer.g, "near"); }
    if (art && SCENE_IMG.foreground && SCENE_IMG.foreground.naturalWidth) { const P = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(P.g, "foreground"); fgLayer = [P]; return; }
    fgLayer = FOREGROUNDS[look().foreground](B, U);
  }
  function paintForeground(b, B, S) {
    const rnd = mulberry32(606);
    try { b.filter = "blur(0.6px)"; } catch (e) {}
    const SIL = "#07090D";
    const limb = (pts, w0, w1) => {   // a tapering branch through points
      for (let i = 0; i < pts.length - 1; i++) { const k = i / (pts.length - 1); b.lineWidth = w0 + (w1 - w0) * k; b.beginPath(); b.moveTo(pts[i][0], pts[i][1]); b.lineTo(pts[i + 1][0], pts[i + 1][1]); b.stroke(); }
    };
    const twig = (x, y, ang, len, w, depth) => {
      if (depth <= 0 || len < 3) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      b.lineWidth = w; b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * len * 0.3, (y + y2) / 2 + (rnd() - 0.5) * len * 0.3, x2, y2); b.stroke();
      twig(x2, y2, ang + (rnd() - 0.5) * 0.9, len * 0.66, w * 0.62, depth - 1);
      if (rnd() < 0.6) twig(x2, y2, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5), len * 0.55, w * 0.55, depth - 1);
    };
    const moss = (x, y, len) => { b.lineWidth = Math.max(1, S * 0.004); b.beginPath(); b.moveTo(x, y); for (let i = 1; i <= 8; i++) b.lineTo(x + Math.sin(i * 1.3 + x) * S * 0.008, y + (len * i) / 8); b.stroke(); };
    b.strokeStyle = SIL; b.fillStyle = SIL; b.lineCap = "round"; b.lineJoin = "round";
    // top-left: a gnarled limb reaching in, with twigs and moss
    const L = [[-B, -B * 0.2], [S * 0.02, S * 0.035], [S * 0.12, S * 0.06], [S * 0.22, S * 0.055], [S * 0.32, S * 0.085]];
    limb(L, S * 0.05, S * 0.012);
    for (const [i, a] of [[1, 0.9], [2, -0.4], [2, 1.2], [3, 0.4], [3, -0.9]]) twig(L[i][0], L[i][1], a, S * (0.06 + rnd() * 0.04), S * 0.012, 4);
    for (const [x, y, l] of [[S * 0.07, S * 0.05, S * 0.09], [S * 0.17, S * 0.06, S * 0.06], [S * 0.26, S * 0.07, S * 0.11]]) moss(x, y, l);
    // top-right: a shorter crook of branch
    const R = [[W + B, S * 0.02], [W - S * 0.02, S * 0.06], [W - S * 0.1, S * 0.07], [W - S * 0.17, S * 0.11]];
    limb(R, S * 0.042, S * 0.01);
    for (const [i, a] of [[1, Math.PI + 0.9], [2, Math.PI - 0.6], [2, Math.PI + 1.3]]) twig(R[i][0], R[i][1], a, S * (0.05 + rnd() * 0.04), S * 0.01, 4);
    moss(W - S * 0.08, S * 0.07, S * 0.1);
    // a faint moonlit rim along the top of each limb
    try { b.filter = "none"; } catch (e) {}
    b.globalCompositeOperation = "source-atop"; b.fillStyle = "rgba(232,216,180,.07)"; b.fillRect(-B, -B, W + 2 * B, S * 0.03 + B); b.globalCompositeOperation = "source-over";
  }
  // the vignette is one still gradient, so it sits over the picture as a plain overlay
  // rather than being photographed onto every frame
  function buildVignette() {
    const R = Math.hypot(W, H) * 0.62, inner = Math.min(U * 0.34, R * 0.95);
    vigEl.style.background = `radial-gradient(circle ${Math.round(R)}px at 50% 48%, rgba(10,8,6,0) ${Math.round(inner)}px, rgba(10,8,6,.62) ${Math.round(R)}px)`;
    // the moon is the lamp of the whole scene, so the vignette leaves a soft clearing where it hangs, telescope and all
    const r = moon.r, clear = r ? `radial-gradient(circle ${Math.round(r * 2.7)}px at ${Math.round(moon.x + r * 0.35)}px ${Math.round(moon.y)}px, transparent ${Math.round(r * 1.5)}px, #000 ${Math.round(r * 2.7)}px)` : "none";
    vigEl.style.webkitMaskImage = vigEl.style.maskImage = clear;
  }
  // near props: a broken headstone, a scrap of iron fence and grass tufts at the edges of the frame, on the ground
  // between the slingshot and the ring. They're anchored to the screen edges so they frame every screen shape.
  function drawNear() {
    if (nearLayer) { const P = nearLayer; planeXform(ctx, 3.6, "near"); ctx.drawImage(P.c, P.x0, P.y0, P.w, P.h); baseXform(ctx); return; }
    for (const [kind, side, fx, z] of NEAR_SETS[look().props] || NEAR_SETS.graveyard) {
      const s0 = F / (z + CAM_BACK), x = (side * (W / 2 - fx * W)) / s0, p = project(x, 0, z);
      ctx.save(); ctx.translate(p.x, p.y); drawNearKind(kind, p.s, side, fx); ctx.restore();
    }
  }
  // dress the scenery as map i (0-based): every plate, the props and the living world are rebuilt for it
  function setScene(i) {
    i = clamp(i | 0, 0, MAP_DATA.length - 1);
    if (i === sceneMap) return false;
    sceneMap = i;
    layOutProps(); envReset();
    if (W) { buildSky(); buildFar(); buildGround(); buildMid(); buildForeground(); buildVignette(); graveyardResize(); worldForScene(); }
    Telemetry.emit("scene", { map: i + 1 });
    return true;
  }

