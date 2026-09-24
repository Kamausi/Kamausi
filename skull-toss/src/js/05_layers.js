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
  function layer() {               // screen-sized (used for the vignette)
    const c = document.createElement("canvas"); c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    const g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, g];
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
    const { x, y, r } = moon;
    if (!r || moonState === "loading") return;   // an empty sky for a frame beats a moon that visibly swaps
    if (moonState === "loaded") {
      const nw = MOON_IMG.naturalWidth, nh = MOON_IMG.naturalHeight, k = r / (MOON_ART.r * nw), w = nw * k, h = nh * k;
      const x0 = x - MOON_ART.cx * w, y0 = y - MOON_ART.cy * h, P = moonPlate(x0, y0, w, h);
      P.g.imageSmoothingEnabled = true; P.g.imageSmoothingQuality = "high"; P.g.drawImage(MOON_IMG, x0, y0, w, h);
      moonLayer = P; return;
    }
    const P = moonPlate(x - r - 3, y - r - 3, 2 * r + 6, 2 * r + 6), b = P.g;   // none supplied, or it would not decode
    b.fillStyle = INK; b.beginPath(); b.arc(x, y, r + 2, 0, TAU); b.fill();
    b.fillStyle = CREAM; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill();
    b.fillStyle = "rgba(196,176,130,.55)";
    for (const [dx, dy, s] of [[-0.3, -0.2, 0.22], [0.28, 0.1, 0.16], [-0.05, 0.38, 0.12], [0.35, -0.35, 0.09]]) { b.beginPath(); b.arc(x + dx * r, y + dy * r, s * r, 0, TAU); b.fill(); }
    moonLayer = P;
  }
  function buildSky() {   // Moonshine Cemetery: a painted night, blue into dusty purple, with a big lamp of a moon
    const B = bleed(), P = plate(-B, -B, W + 2 * B, HY + B + U * 0.14), b = P.g; skyLayer = P;
    const rnd = mulberry32(1931), x0 = -B, x1 = W + B;
    // the drawn moon has a face to read, so it is hung a size up from the old plain disc
    const mr = U * (MOON_ART ? 0.09 : 0.065), mx = W / 2 - Math.min(W * 0.33, U * 0.8), my = Math.max(HY * 0.3, 96 + mr);
    moon = { x: mx, y: my, r: mr };
    if (sceneArt(b, "sky")) { if (!MOON_ART) moon.r = 0; buildMoon(); return; }   // the drawn moon still hangs on a painted sky; the plain disc doesn't
    buildMoon();
    let g = b.createLinearGradient(0, -B, 0, HY);
    g.addColorStop(0, "#131A28"); g.addColorStop(0.5, "#26364A"); g.addColorStop(0.85, "#4A4A63"); g.addColorStop(1, "#66506B");
    b.fillStyle = g; b.fillRect(x0, -B, x1 - x0, HY + B + U * 0.14);
    for (let i = 0; i < 32; i++) {   // watercolour blooms
      const x = x0 + rnd() * (x1 - x0), y = -B + rnd() * (HY + B), r = U * (0.15 + rnd() * 0.3), light = rnd() < 0.5;
      const gg = b.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, light ? "rgba(232,216,180,.05)" : "rgba(10,12,20,.08)"); gg.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = gg; b.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const n = Math.round(((x1 - x0) * (HY + B)) / 4200);
    b.fillStyle = CREAM;
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0), y = -B + rnd() * (HY + B) * 0.88, big = rnd() < 0.08;
      b.globalAlpha = (0.2 + rnd() * 0.55) * (1 - (Math.max(0, y) / HY) * 0.8);
      if (big) { star(b, x, y, 2.4, 4, 0.3, 0); b.fill(); } else b.fillRect(x, y, 1, 1);
    }
    b.globalAlpha = 1;
    const gr = U * 0.39;   // the halo keeps its old reach whatever size the moon is
    g = b.createRadialGradient(mx, my, mr * 0.8, mx, my, gr);
    g.addColorStop(0, "rgba(242,231,201,.22)"); g.addColorStop(0.4, "rgba(242,231,201,.07)"); g.addColorStop(1, "rgba(242,231,201,0)");
    b.fillStyle = g; b.beginPath(); b.arc(mx, my, gr, 0, TAU); b.fill();
    g = b.createLinearGradient(0, HY - U * 0.45, 0, HY + U * 0.14);
    g.addColorStop(0, "rgba(169,67,50,0)"); g.addColorStop(0.76, "rgba(196,154,66,.12)"); g.addColorStop(1, "rgba(196,154,66,.12)");
    b.fillStyle = g; b.fillRect(x0, HY - U * 0.45, x1 - x0, U * 0.59);
  }
  // the far skyline: a ridge of headstones, crosses, bare trees and the old house, softened by distance
  const ridgeY = x => HY - U * (0.014 + 0.009 * Math.sin((x / U) * 3.1 + 1) + 0.005 * Math.sin((x / U) * 7.7));
  function buildFar() {
    const B = bleed(), art = SCENE_IMG.far && SCENE_IMG.far.naturalWidth;
    const P = art ? plate(-B, -B, W + 2 * B, H + 2 * B) : plate(-B, HY - U * 0.34, W + 2 * B, U * 0.4), b = P.g; farLayer = P;
    if (sceneArt(b, "far")) return;
    const rnd = mulberry32(77), x0 = -B, x1 = W + B, base = HY + U * 0.05;
    const SIL = "#121926";
    b.fillStyle = SIL; b.strokeStyle = SIL; b.lineCap = "round";
    b.beginPath(); b.moveTo(x0, base); for (let x = x0; x <= x1 + 6; x += 6) b.lineTo(x, ridgeY(x)); b.lineTo(x1, base); b.closePath(); b.fill();
    const tree = (x, y, len, ang, depth, w) => {
      if (!depth || len < 1.5) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      b.lineWidth = w; b.beginPath(); b.moveTo(x, y); b.lineTo(x2, y2); b.stroke();
      const k = rnd() < 0.3 ? 3 : 2;
      for (let i = 0; i < k; i++) tree(x2, y2, len * (0.6 + rnd() * 0.16), ang + (rnd() - 0.5) * 1.15, depth - 1, w * 0.62);
    };
    for (let x = x0 + rnd() * U * 0.05; x < x1; x += U * (0.028 + rnd() * 0.06)) {
      const y = ridgeY(x) + 1, k = rnd();
      if (k < 0.5) { const w = U * (0.012 + rnd() * 0.01), h = U * (0.016 + rnd() * 0.016); b.beginPath(); rr(b, x - w / 2, y - h, w, h + 2, w / 2); b.fill(); }
      else if (k < 0.76) { const h = U * (0.026 + rnd() * 0.02), t = U * 0.004; b.fillRect(x - t / 2, y - h, t, h); b.fillRect(x - U * 0.008, y - h * 0.74, U * 0.016, t); }
      else if (k < 0.84) tree(x, y, U * (0.03 + rnd() * 0.02), -Math.PI / 2 + (rnd() - 0.5) * 0.2, 6, U * 0.006);
      else { const h = U * (0.04 + rnd() * 0.02), w = U * 0.01; b.beginPath(); b.moveTo(x - w / 2, y); b.lineTo(x - w * 0.3, y - h); b.lineTo(x, y - h - w * 0.8); b.lineTo(x + w * 0.3, y - h); b.lineTo(x + w / 2, y); b.fill(); }
    }
    { // the old house on the hill
      const hx = W / 2 + Math.min(W * 0.36, U * 0.78), hy = ridgeY(hx) + 2, s = U * 0.1;
      b.fillStyle = SIL;
      b.fillRect(hx - s * 0.5, hy - s * 0.62, s, s * 0.62); b.beginPath(); b.moveTo(hx - s * 0.6, hy - s * 0.6); b.lineTo(hx, hy - s * 1.05); b.lineTo(hx + s * 0.6, hy - s * 0.6); b.fill();
      b.fillRect(hx + s * 0.2, hy - s * 1.25, s * 0.22, s * 0.7); b.beginPath(); b.moveTo(hx + s * 0.14, hy - s * 1.22); b.lineTo(hx + s * 0.31, hy - s * 1.62); b.lineTo(hx + s * 0.48, hy - s * 1.22); b.fill();
      b.fillStyle = MUSTARD; for (const [wx, wy] of [[-0.3, -0.45], [0.05, -0.45], [0.27, -0.95]]) b.fillRect(hx + wx * s, hy + wy * s, s * 0.1, s * 0.13);
    }
    // atmospheric haze: the far plane sits behind a thin veil of the sky's colour
    const g = b.createLinearGradient(0, HY - U * 0.2, 0, base);
    g.addColorStop(0, "rgba(74,74,99,0)"); g.addColorStop(1, "rgba(74,74,99,.22)");
    b.globalCompositeOperation = "source-atop"; b.fillStyle = g; b.fillRect(x0, HY - U * 0.34, x1 - x0, U * 0.4); b.globalCompositeOperation = "source-over";
  }
  function buildGround() {
    const B = bleed(), P = plate(-B, HY - U * 0.06, W + 2 * B, H + B - (HY - U * 0.06)), b = P.g; groundLayer = P;
    const rnd = mulberry32(78), x0 = -B, x1 = W + B;
    let g = b.createLinearGradient(0, HY, 0, H + B);
    g.addColorStop(0, "#34464A"); g.addColorStop(0.3, "#22322F"); g.addColorStop(0.7, "#172320"); g.addColorStop(1, "#0E1614");
    b.fillStyle = g; b.fillRect(x0, HY, x1 - x0, H + B - HY);
    // low rolling hills stacked toward the horizon, each with a moonlit rim (cartoon backgrounds are all layers)
    for (const [zc, col, amp, seed] of [[46, "#3A4C50", 0.9, 1], [34, "#304244", 0.7, 2], [26, "#283A38", 0.55, 3]]) {
      b.fillStyle = col; b.strokeStyle = "rgba(232,216,180,.12)"; b.lineWidth = 1.5; b.beginPath();
      const yAt = x => projectBase((x - W / 2) / (F / (zc + CAM_BACK)), amp * (0.55 + 0.45 * Math.sin(x / U * 2.2 + seed * 2)), zc).y;
      b.moveTo(x0, HY + U * 0.2); for (let x = x0; x <= x1 + 8; x += 8) b.lineTo(x, yAt(x)); b.lineTo(x1, HY + U * 0.2); b.closePath(); b.fill();
      b.beginPath(); for (let x = x0; x <= x1 + 8; x += 8) (x === x0 ? b.moveTo(x, yAt(x)) : b.lineTo(x, yAt(x))); b.stroke();
    }
    // a worn dirt path from the slingshot to the ring
    { const pts = [[-0.95, 0.2], [0.95, 0.2], [0.7, RING_Z + 1.5], [-0.7, RING_Z + 1.5]].map(([x, z]) => projectBase(x, 0, z));
      g = b.createLinearGradient(0, pts[2].y, 0, pts[0].y); g.addColorStop(0, "rgba(120,92,62,0)"); g.addColorStop(0.4, "rgba(120,92,62,.22)"); g.addColorStop(1, "rgba(120,92,62,.3)");
      b.fillStyle = g; b.beginPath(); pts.forEach((q, i) => i ? b.lineTo(q.x, q.y) : b.moveTo(q.x, q.y)); b.closePath(); b.fill(); }
    g = b.createLinearGradient(0, HY - U * 0.05, 0, HY + U * 0.1);
    g.addColorStop(0, "rgba(200,210,225,0)"); g.addColorStop(0.45, "rgba(200,210,225,.1)"); g.addColorStop(1, "rgba(200,210,225,0)");
    b.fillStyle = g; b.fillRect(x0, HY - U * 0.05, x1 - x0, U * 0.15);
    // a warm pool of stage light where the ring lives
    const lp = projectBase(0, 0, RING_Z);
    g = b.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, U * 0.7);
    g.addColorStop(0, "rgba(196,154,66,.09)"); g.addColorStop(1, "rgba(196,154,66,0)");
    b.fillStyle = g; b.save(); b.translate(lp.x, lp.y); b.scale(1, 0.32); b.translate(-lp.x, -lp.y); b.beginPath(); b.arc(lp.x, lp.y, U * 0.7, 0, TAU); b.fill(); b.restore();
    const zMin = Math.max(0, (CAMY * F) / (H + B - HY) - CAM_BACK);
    for (let i = 0; i < 700; i++) {   // painted grass: little inked ticks, bigger as they come nearer
      const x = (rnd() * 2 - 1) * 14, z = zMin + Math.pow(rnd(), 1.5) * 40, p = projectBase(x, 0, z);
      if (p.y > H + B || p.y < HY || p.x < x0 || p.x > x1) continue;
      const len = 0.09 * p.s, lean = (rnd() - 0.5) * len * 0.8;
      b.globalAlpha = clamp(0.25 + (p.s / F) * 1.2, 0.25, 0.7); b.strokeStyle = rnd() < 0.5 ? "#4A7A5A" : "#3A6250"; b.lineWidth = Math.max(0.8, 0.012 * p.s); b.lineCap = "round";
      b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(p.x + lean, p.y - len); b.moveTo(p.x + len * 0.25, p.y); b.lineTo(p.x + len * 0.3 + lean * 0.6, p.y - len * 0.7); b.stroke();
    }
    b.globalAlpha = 1;
  }
  function buildMid() {   // only when artwork is supplied: a graveyard plane standing between the skyline and the ring
    midLayer = null; if (!SCENE_IMG.mid || !SCENE_IMG.mid.naturalWidth) return;
    const B = bleed(), P = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(P.g, "mid"); midLayer = P;
  }
  // the foreground frame: branches hanging into the top corners, very near the lens, dark and a touch soft
  let nearLayer = null;   // near-plane artwork, when supplied, is painted once per screen size like the rest
  function buildForeground() {
    const B = bleed();
    nearLayer = null;
    if (SCENE_IMG.near && SCENE_IMG.near.naturalWidth) { nearLayer = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(nearLayer.g, "near"); }
    if (SCENE_IMG.foreground && SCENE_IMG.foreground.naturalWidth) { const P = plate(-B, -B, W + 2 * B, H + 2 * B); sceneArt(P.g, "foreground"); fgLayer = [P]; return; }
    const S = U, TL = plate(-B, -B, B + S * 0.62, B + S * 0.34), TR = plate(W - S * 0.5, -B, S * 0.5 + B, B + S * 0.34);
    fgLayer = [TL, TR];
    for (const P of fgLayer) paintForeground(P.g, B, S);
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
  const NEAR_PROPS = [
    { side: -1, fx: 0.035, z: 0.35, kind: "stone" }, { side: -1, fx: 0.12, z: 1.2, kind: "tuft" },
    { side: 1, fx: 0.03, z: 0.9, kind: "fence" }, { side: 1, fx: 0.14, z: 0.2, kind: "tuft" }, { side: -1, fx: 0.2, z: 2.6, kind: "tuft" }
  ];
  function drawNear() {
    if (nearLayer) { const P = nearLayer; planeXform(ctx, 3.6, "near"); ctx.drawImage(P.c, P.x0, P.y0, P.w, P.h); baseXform(ctx); return; }
    const SIL = "#090B10", RIM = "rgba(232,216,180,.16)";
    for (const n of NEAR_PROPS) {
      const s0 = F / (n.z + CAM_BACK), x = (n.side * (W / 2 - n.fx * W)) / s0, p = project(x, 0, n.z), s = p.s;
      ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = SIL; ctx.strokeStyle = SIL; ctx.lineCap = "round";
      if (n.kind === "stone") {       // a broken, leaning headstone
        ctx.rotate(0.12 * -n.side); const w = 0.42 * s, h = 0.5 * s;
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.7); ctx.quadraticCurveTo(-w / 2, -h, -w * 0.1, -h); ctx.lineTo(w * 0.05, -h * 0.82); ctx.lineTo(w * 0.22, -h * 0.9); ctx.lineTo(w / 2, -h * 0.62); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = RIM; ctx.lineWidth = Math.max(1, s * 0.012); ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.7); ctx.quadraticCurveTo(-w / 2, -h, -w * 0.1, -h); ctx.stroke();
      } else if (n.kind === "fence") { // a scrap of iron railing, spear tops
        const h = 0.9 * s, gap = 0.16 * s; ctx.lineWidth = Math.max(1.5, s * 0.022);
        for (let i = 0; i < 3; i++) { const x0 = -i * gap; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, -h + i * 0.04 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 - 0.03 * s, -h + i * 0.04 * s); ctx.lineTo(x0, -h - 0.07 * s + i * 0.04 * s); ctx.lineTo(x0 + 0.03 * s, -h + i * 0.04 * s); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(0.04 * s, -h * 0.78); ctx.lineTo(-2.3 * gap, -h * 0.74); ctx.moveTo(0.04 * s, -h * 0.2); ctx.lineTo(-2.3 * gap, -h * 0.18); ctx.stroke();
      } else {                         // a tuft of long grass
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.16, l = (0.16 + ((i * 37) % 7) * 0.02) * s, sw = Math.sin(cam.t * 1.3 + i + n.fx * 9) * 0.04; ctx.beginPath(); ctx.moveTo((i - 4) * 0.012 * s, 0); ctx.quadraticCurveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5, Math.cos(a + sw) * l, Math.sin(a + sw) * l); ctx.stroke(); }
      }
      ctx.restore();
    }
  }
