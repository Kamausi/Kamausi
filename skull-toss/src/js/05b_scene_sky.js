  // ───────────────────────── the maps' skies and skylines ─────────────────────────
  // Each map (src/maps/*.json) names its moon and its skyline; these paint them into the sky and far plates, once per
  // screen size and once per map. Everything stays a flat, inked cut-out, softened by distance, like the graveyard.
  let sceneMap = 0;                                   // the map the scenery is dressed as (0-based)
  const look = () => MAP_DATA[sceneMap].look;
  const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
  const sceneFX = { clock: null, screen: null, wheel: null };   // things in the far plates that move, drawn over them each frame

  // ── the moon, by kind: the drawn moon (art), or a coded crescent, harvest moon, full moon, or a picture-house screen
  function paintMoonKind(b, kind, x, y, r, col) {
    const rgb = rgbOf(col);
    if (kind === "screen") {   // the picture palace: a screen in a gilt frame, with the reel playing on it
      const w = r * 2.2, h = r * 1.3;
      b.fillStyle = "#6A4A1E"; b.strokeStyle = INK; b.lineWidth = 3; b.beginPath(); rr(b, x - w / 2 - 10, y - h / 2 - 10, w + 20, h + 20, 6); b.fill(); b.stroke();
      const g = b.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, `rgba(${rgb},.96)`); g.addColorStop(1, `rgba(${rgb},.78)`);
      b.fillStyle = g; b.fillRect(x - w / 2, y - h / 2, w, h);
      b.fillStyle = "rgba(23,19,15,.13)";   // the faint picture: Morty's silhouette, the way the last print left him
      b.beginPath(); b.arc(x, y - h * 0.06, h * 0.26, 0, TAU); b.fill(); b.beginPath(); rr(b, x - h * 0.16, y + h * 0.12, h * 0.32, h * 0.15, h * 0.05); b.fill();
      b.strokeStyle = "rgba(23,19,15,.1)"; b.lineWidth = 1; for (let i = 0; i < 5; i++) { const sx = x - w / 2 + ((i * 37 + 11) % 100) / 100 * w; b.beginPath(); b.moveTo(sx, y - h / 2); b.lineTo(sx + 3, y + h / 2); b.stroke(); }
      sceneFX.screen = { x, y, w, h };
      return;
    }
    const halo = b.createRadialGradient(x, y, r * 0.8, x, y, r * (kind === "harvest" ? 3.2 : 2.6));
    halo.addColorStop(0, `rgba(${rgb},.28)`); halo.addColorStop(1, `rgba(${rgb},0)`);
    b.fillStyle = halo; b.beginPath(); b.arc(x, y, r * 3.2, 0, TAU); b.fill();
    b.fillStyle = INK; b.beginPath(); b.arc(x, y, r + 2, 0, TAU); b.fill();
    b.fillStyle = col; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill();
    b.fillStyle = `rgba(${rgb.split(",").map(v => Math.round(v * 0.72)).join(",")},.55)`;
    for (const [dx, dy, s] of [[-0.3, -0.2, 0.22], [0.28, 0.1, 0.16], [-0.05, 0.38, 0.12], [0.35, -0.35, 0.09]]) { b.beginPath(); b.arc(x + dx * r, y + dy * r, s * r, 0, TAU); b.fill(); }
    if (kind === "crescent") {   // the shadow bites the disc away, leaving a sickle
      b.save(); b.globalCompositeOperation = "destination-out"; b.beginPath(); b.arc(x + r * 0.55, y - r * 0.18, r * 0.98, 0, TAU); b.fill(); b.restore();
      b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); b.arc(x, y, r + 1, Math.PI * 0.62, Math.PI * 1.72); b.stroke();
    }
    if (kind === "harvest") { b.fillStyle = "rgba(160,60,20,.18)"; b.beginPath(); b.arc(x, y + r * 0.25, r * 0.95, 0, Math.PI); b.fill(); }
  }

  // ── skylines: (b, rnd, x0, x1, base, SIL, L) paint the far plate's silhouettes along the ridge
  function farTree(b, rnd, x, y, len, ang, depth, w) {
    if (!depth || len < 1.5) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    b.lineWidth = w; b.beginPath(); b.moveTo(x, y); b.lineTo(x2, y2); b.stroke();
    const k = rnd() < 0.3 ? 3 : 2;
    for (let i = 0; i < k; i++) farTree(b, rnd, x2, y2, len * (0.6 + rnd() * 0.16), ang + (rnd() - 0.5) * 1.15, depth - 1, w * 0.62);
  }
  const ridge = (b, x0, x1, base, yAt) => { b.beginPath(); b.moveTo(x0, base); for (let x = x0; x <= x1 + 6; x += 6) b.lineTo(x, yAt(x)); b.lineTo(x1, base); b.closePath(); b.fill(); };
  const litWindows = (b, pts, s, col = MUSTARD) => { b.fillStyle = col; for (const [wx, wy] of pts) b.fillRect(wx, wy, s * 0.1, s * 0.13); };
  const SKYLINES = {
    graveyard(b, rnd, x0, x1, base, SIL) {   // headstones, crosses, bare trees and the old house on the hill
      b.fillStyle = SIL; b.strokeStyle = SIL; b.lineCap = "round";
      ridge(b, x0, x1, base, ridgeY);
      for (let x = x0 + rnd() * U * 0.05; x < x1; x += U * (0.028 + rnd() * 0.06)) {
        const y = ridgeY(x) + 1, k = rnd();
        if (k < 0.5) { const w = U * (0.012 + rnd() * 0.01), h = U * (0.016 + rnd() * 0.016); b.beginPath(); rr(b, x - w / 2, y - h, w, h + 2, w / 2); b.fill(); }
        else if (k < 0.76) { const h = U * (0.026 + rnd() * 0.02), t = U * 0.004; b.fillRect(x - t / 2, y - h, t, h); b.fillRect(x - U * 0.008, y - h * 0.74, U * 0.016, t); }
        else if (k < 0.84) farTree(b, rnd, x, y, U * (0.03 + rnd() * 0.02), -Math.PI / 2 + (rnd() - 0.5) * 0.2, 6, U * 0.006);
        else { const h = U * (0.04 + rnd() * 0.02), w = U * 0.01; b.beginPath(); b.moveTo(x - w / 2, y); b.lineTo(x - w * 0.3, y - h); b.lineTo(x, y - h - w * 0.8); b.lineTo(x + w * 0.3, y - h); b.lineTo(x + w / 2, y); b.fill(); }
      }
      const hx = W / 2 + Math.min(W * 0.36, U * 0.78), hy = ridgeY(hx) + 2, s = U * 0.1;
      b.fillStyle = SIL;
      b.fillRect(hx - s * 0.5, hy - s * 0.62, s, s * 0.62); b.beginPath(); b.moveTo(hx - s * 0.6, hy - s * 0.6); b.lineTo(hx, hy - s * 1.05); b.lineTo(hx + s * 0.6, hy - s * 0.6); b.fill();
      b.fillRect(hx + s * 0.2, hy - s * 1.25, s * 0.22, s * 0.7); b.beginPath(); b.moveTo(hx + s * 0.14, hy - s * 1.22); b.lineTo(hx + s * 0.31, hy - s * 1.62); b.lineTo(hx + s * 0.48, hy - s * 1.22); b.fill();
      litWindows(b, [[hx - 0.3 * s, hy - 0.45 * s], [hx + 0.05 * s, hy - 0.45 * s], [hx + 0.27 * s, hy - 0.95 * s]], s);
    },
    crypts(b, rnd, x0, x1, base, SIL) {   // leaning mausoleums, broken arches and crooked spires
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * (0.012 + 0.006 * Math.sin(x / U * 4.3)));
      for (let x = x0 + rnd() * U * 0.04; x < x1; x += U * (0.05 + rnd() * 0.07)) {
        const y = HY - U * 0.01, k = rnd(), s = U * (0.05 + rnd() * 0.04), lean = (rnd() - 0.5) * 0.25;
        b.save(); b.translate(x, y); b.rotate(lean); b.fillStyle = SIL;
        if (k < 0.4) { b.fillRect(-s * 0.4, -s * 0.7, s * 0.8, s * 0.7); b.beginPath(); b.moveTo(-s * 0.5, -s * 0.68); b.lineTo(0, -s); b.lineTo(s * 0.5, -s * 0.68); b.fill(); }
        else if (k < 0.65) { b.beginPath(); b.moveTo(-s * 0.5, 0); b.lineTo(-s * 0.5, -s * 0.8); b.arc(0, -s * 0.8, s * 0.5, Math.PI, 0); b.lineTo(s * 0.5, 0); b.lineTo(s * 0.3, 0); b.lineTo(s * 0.3, -s * 0.7); b.arc(0, -s * 0.7, s * 0.3, 0, Math.PI, true); b.lineTo(-s * 0.3, 0); b.closePath(); b.fill(); }
        else if (k < 0.85) { b.beginPath(); b.moveTo(-s * 0.12, 0); b.lineTo(-s * 0.06, -s * 1.9); b.lineTo(0, -s * 2.3); b.lineTo(s * 0.06, -s * 1.9); b.lineTo(s * 0.12, 0); b.fill(); }
        else { b.beginPath(); b.arc(0, -s * 0.5, s * 0.45, Math.PI, 0); b.fillRect(-s * 0.45, -s * 0.5, s * 0.9, s * 0.5); b.fill(); b.fillRect(-s * 0.03, -s * 1.15, s * 0.06, s * 0.2); }
        if (rnd() < 0.3) { b.fillStyle = "rgba(232,137,58,.8)"; b.fillRect(-s * 0.06, -s * 0.45, s * 0.12, s * 0.16); }
        b.restore();
      }
    },
    farm(b, rnd, x0, x1, base, SIL) {   // rolling hills, a barn, a windmill, a silo and a long fence
      const yAt = x => HY - U * (0.02 + 0.014 * Math.sin((x / U) * 1.7 + 0.6) + 0.006 * Math.sin((x / U) * 5.1));
      b.fillStyle = SIL; ridge(b, x0, x1, base, yAt);
      const bx = W / 2 - Math.min(W * 0.3, U * 0.62), by = yAt(bx) + 2, s = U * 0.11;   // the barn
      b.fillRect(bx - s * 0.6, by - s * 0.6, s * 1.2, s * 0.6);
      b.beginPath(); b.moveTo(bx - s * 0.66, by - s * 0.58); b.lineTo(bx - s * 0.45, by - s * 0.92); b.lineTo(bx, by - s * 1.08); b.lineTo(bx + s * 0.45, by - s * 0.92); b.lineTo(bx + s * 0.66, by - s * 0.58); b.fill();
      b.fillRect(bx + s * 0.7, by - s * 1.3, s * 0.28, s * 1.3); b.beginPath(); b.arc(bx + s * 0.84, by - s * 1.3, s * 0.14, Math.PI, 0); b.fill();   // silo
      litWindows(b, [[bx - s * 0.06, by - s * 0.82]], s, "#F4B04A");
      const mx = W / 2 + Math.min(W * 0.34, U * 0.74), my = yAt(mx) + 2, m = U * 0.12;   // the windmill
      b.beginPath(); b.moveTo(mx - m * 0.16, my); b.lineTo(mx - m * 0.08, my - m); b.lineTo(mx + m * 0.08, my - m); b.lineTo(mx + m * 0.16, my); b.fill();
      sceneFX.wheel = { kind: "mill", x: mx, y: my - m, r: m * 0.62, col: SIL };
      b.strokeStyle = SIL; b.lineWidth = Math.max(1, U * 0.003);
      for (let x = x0; x < x1; x += U * 0.022) { const y = yAt(x) + U * 0.012; b.beginPath(); b.moveTo(x, y); b.lineTo(x, y - U * 0.012); b.stroke(); }
      b.beginPath(); for (let x = x0; x <= x1; x += 8) (x === x0 ? b.moveTo : b.lineTo).call(b, x, yAt(x) + U * 0.004); b.stroke();
      for (let i = 0; i < 6; i++) { const x = x0 + rnd() * (x1 - x0); if (Math.abs(x - bx) < s || Math.abs(x - mx) < m * 0.4) continue; const y = yAt(x); b.fillStyle = SIL; b.beginPath(); b.arc(x, y - U * 0.025, U * (0.018 + rnd() * 0.012), 0, TAU); b.fill(); b.fillRect(x - 1, y - U * 0.02, 2, U * 0.02); }
    },
    orchard(b, rnd, x0, x1, base, SIL) {   // row on row of gnarled trees, with bones hanging pale in the branches
      b.fillStyle = SIL; b.strokeStyle = SIL; b.lineCap = "round";
      ridge(b, x0, x1, base, x => HY - U * (0.01 + 0.004 * Math.sin(x / U * 6)));
      for (let x = x0 + rnd() * U * 0.03; x < x1; x += U * (0.035 + rnd() * 0.03)) {
        const y = HY - U * 0.008; b.strokeStyle = SIL;
        farTree(b, rnd, x, y, U * (0.035 + rnd() * 0.02), -Math.PI / 2 + (rnd() - 0.5) * 0.3, 5, U * 0.008);
        b.fillStyle = "rgba(221,232,184,.35)"; for (let i = 0; i < 3; i++) b.fillRect(x + (rnd() - 0.5) * U * 0.05, y - U * (0.04 + rnd() * 0.05), 1.5, U * 0.008);
      }
    },
    bayou(b, rnd, x0, x1, base, SIL) {   // cypress knees and moss-hung crowns, and the drowned chapel's steeple
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * 0.004);
      const cx = W / 2 + Math.min(W * 0.3, U * 0.6), s = U * 0.1;
      b.save(); b.translate(cx, HY); b.rotate(0.12); b.fillRect(-s * 0.2, -s * 0.9, s * 0.4, s * 0.9);
      b.beginPath(); b.moveTo(-s * 0.26, -s * 0.88); b.lineTo(0, -s * 1.5); b.lineTo(s * 0.26, -s * 0.88); b.fill();
      b.fillRect(-s * 0.02, -s * 1.78, s * 0.04, s * 0.3); b.fillRect(-s * 0.1, -s * 1.7, s * 0.2, s * 0.04);
      b.fillStyle = "rgba(216,240,208,.55)"; b.fillRect(-s * 0.06, -s * 0.6, s * 0.12, s * 0.18); b.restore();
      for (let x = x0 + rnd() * U * 0.05; x < x1; x += U * (0.045 + rnd() * 0.06)) {
        if (Math.abs(x - cx) < s * 0.5) continue;
        const h = U * (0.07 + rnd() * 0.07), w = U * (0.006 + rnd() * 0.004), y = HY;
        b.fillStyle = SIL; b.beginPath(); b.moveTo(x - w * 2.4, y); b.quadraticCurveTo(x - w, y - h * 0.2, x - w * 0.6, y - h); b.lineTo(x + w * 0.6, y - h); b.quadraticCurveTo(x + w, y - h * 0.2, x + w * 2.4, y); b.fill();
        b.beginPath(); b.ellipse(x, y - h, U * (0.03 + rnd() * 0.02), U * 0.012, 0, 0, TAU); b.fill();
        b.strokeStyle = SIL; b.lineWidth = 1; for (let i = 0; i < 4; i++) { const mx = x + (rnd() - 0.5) * U * 0.05; b.beginPath(); b.moveTo(mx, y - h); b.lineTo(mx + 1, y - h + U * (0.02 + rnd() * 0.03)); b.stroke(); }
      }
    },
    carnival(b, rnd, x0, x1, base, SIL) {   // big tops, a roller coaster, the Ferris wheel and strings of lights
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * 0.006);
      const coaster = x => HY - U * (0.05 + 0.03 * Math.sin(x / U * 5.2) + 0.015 * Math.sin(x / U * 11));
      b.strokeStyle = SIL; b.lineWidth = Math.max(1.5, U * 0.004); b.beginPath(); for (let x = x0; x <= x1; x += 6) (x === x0 ? b.moveTo : b.lineTo).call(b, x, coaster(x)); b.stroke();
      b.lineWidth = 1; for (let x = x0; x < x1; x += U * 0.02) { b.beginPath(); b.moveTo(x, coaster(x)); b.lineTo(x, HY); b.stroke(); }
      for (let x = x0 + U * 0.04; x < x1; x += U * (0.09 + rnd() * 0.08)) {   // tents
        const s = U * (0.05 + rnd() * 0.03); b.fillStyle = SIL;
        b.beginPath(); b.moveTo(x - s, HY); b.quadraticCurveTo(x - s * 0.7, HY - s * 0.5, x, HY - s * 1.1); b.quadraticCurveTo(x + s * 0.7, HY - s * 0.5, x + s, HY); b.fill();
        b.fillRect(x - 1, HY - s * 1.45, 2, s * 0.4); b.beginPath(); b.moveTo(x + 1, HY - s * 1.45); b.lineTo(x + s * 0.3, HY - s * 1.36); b.lineTo(x + 1, HY - s * 1.27); b.fill();
      }
      const wx = W / 2 - Math.min(W * 0.32, U * 0.7), wr = U * 0.1;   // the Ferris wheel turns: its spokes are drawn live over the plate
      b.fillStyle = SIL; b.beginPath(); b.moveTo(wx - wr * 0.6, HY); b.lineTo(wx, HY - wr * 1.25); b.lineTo(wx + wr * 0.6, HY); b.lineTo(wx + wr * 0.45, HY); b.lineTo(wx, HY - wr * 0.95); b.lineTo(wx - wr * 0.45, HY); b.fill();
      sceneFX.wheel = { kind: "ferris", x: wx, y: HY - wr * 1.25, r: wr, col: SIL };
      b.fillStyle = "rgba(255,210,130,.85)";   // strings of lights, sagging between the poles
      for (let x = x0; x < x1; x += U * 0.12) for (let i = 1; i < 10; i++) { const u = i / 10, lx = x + u * U * 0.12, ly = HY - U * 0.06 + Math.sin(u * Math.PI) * U * 0.018; b.beginPath(); b.arc(lx, ly, 1.3, 0, TAU); b.fill(); }
    },
    city(b, rnd, x0, x1, base, SIL) {   // wet rooftops, chimneys, and the clock tower striking thirteen
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY);
      for (let x = x0; x < x1; ) {
        const w = U * (0.04 + rnd() * 0.05), h = U * (0.03 + rnd() * 0.06), y = HY; b.fillStyle = SIL;
        b.fillRect(x, y - h, w, h);
        if (rnd() < 0.6) { b.beginPath(); b.moveTo(x - 2, y - h); b.lineTo(x + w / 2, y - h - w * 0.4); b.lineTo(x + w + 2, y - h); b.fill(); }
        if (rnd() < 0.5) b.fillRect(x + w * 0.7, y - h - U * 0.02, U * 0.008, U * 0.02);
        if (rnd() < 0.5) { b.fillStyle = "rgba(255,210,140,.7)"; b.fillRect(x + w * (0.2 + rnd() * 0.5), y - h * (0.3 + rnd() * 0.4), U * 0.006, U * 0.008); }
        x += w + U * 0.004;
      }
      const tx = W / 2 + Math.min(W * 0.18, U * 0.36), s = U * 0.08;
      b.fillStyle = SIL; b.fillRect(tx - s * 0.5, HY - s * 3.2, s, s * 3.2);
      b.beginPath(); b.moveTo(tx - s * 0.62, HY - s * 3.18); b.lineTo(tx, HY - s * 4.3); b.lineTo(tx + s * 0.62, HY - s * 3.18); b.fill();
      const cy = HY - s * 2.6, r = s * 0.38;
      b.fillStyle = "#F2E2B8"; b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); b.arc(tx, cy, r, 0, TAU); b.fill(); b.stroke();
      b.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.fillRect(tx + Math.cos(a) * r * 0.82 - 1, cy + Math.sin(a) * r * 0.82 - 1, 2, 2); }
      const g = b.createRadialGradient(tx, cy, r, tx, cy, r * 3); g.addColorStop(0, "rgba(255,226,160,.22)"); g.addColorStop(1, "rgba(255,226,160,0)"); b.fillStyle = g; b.beginPath(); b.arc(tx, cy, r * 3, 0, TAU); b.fill();
      sceneFX.clock = { x: tx, y: cy, r };
    },
    theatre(b, rnd, x0, x1, base, SIL) {   // the picture palace: balconies and boxes either side, the back of the stalls ahead
      b.fillStyle = SIL; b.fillRect(x0, HY - U * 0.02, x1 - x0, base - HY + U * 0.02);
      for (const sd of [-1, 1]) {
        const ex = sd < 0 ? x0 : x1, inner = W / 2 + sd * Math.min(W * 0.3, U * 0.55);
        for (let row = 0; row < 3; row++) {
          const y = HY - U * (0.08 + row * 0.1), h = U * 0.05;
          b.fillStyle = SIL; b.beginPath(); b.moveTo(ex, y - h); b.lineTo(inner, y - h * 0.6); b.lineTo(inner, y + h * 0.2); b.lineTo(ex, y + h * 0.4); b.fill();
          b.fillStyle = "rgba(255,200,120,.75)"; for (let i = 0; i < 4; i++) { const u = (i + 0.5) / 4, lx = ex + (inner - ex) * u; b.beginPath(); b.arc(lx, y - h * (0.8 - 0.3 * u) - 2, 1.6, 0, TAU); b.fill(); }
        }
      }
      b.fillStyle = "rgba(90,26,26,.9)"; for (let x = x0; x < x1; x += U * 0.025) { b.beginPath(); b.arc(x, HY + U * 0.004, U * 0.011, Math.PI, 0); b.fill(); }   // the back rows of seats
    }
  };
  // the far plates' moving parts, drawn live over them: the windmill and the Ferris wheel turn, the clock tells time
  function drawFarFX(t) {
    const Wh = sceneFX.wheel, C = sceneFX.clock;
    if (Wh) {
      const a = t * (Wh.kind === "ferris" ? 0.18 : 0.6);
      ctx.save(); ctx.translate(Wh.x, Wh.y); ctx.strokeStyle = Wh.col; ctx.fillStyle = Wh.col; ctx.lineCap = "round";
      if (Wh.kind === "ferris") {
        ctx.lineWidth = Math.max(1.5, Wh.r * 0.05); ctx.beginPath(); ctx.arc(0, 0, Wh.r, 0, TAU); ctx.stroke();
        ctx.lineWidth = Math.max(1, Wh.r * 0.025);
        for (let i = 0; i < 8; i++) { const k = a + (i / 8) * TAU, x = Math.cos(k) * Wh.r, y = Math.sin(k) * Wh.r; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = Wh.col; ctx.fillRect(x - Wh.r * 0.07, y, Wh.r * 0.14, Wh.r * 0.12); ctx.fillStyle = "rgba(255,210,130,.8)"; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
      } else {
        ctx.lineWidth = Math.max(1.5, Wh.r * 0.12);
        for (let i = 0; i < 4; i++) { const k = a + (i / 4) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k) * Wh.r, Math.sin(k) * Wh.r); ctx.stroke(); }
      }
      ctx.restore();
    }
    if (C) {   // thirteen o'clock, near enough: the hands run on the real clock, the hour hand a little too fast
      const d = new Date(), m = (d.getMinutes() + d.getSeconds() / 60) / 60, hr = ((d.getHours() % 12) + m) / 12 * 13 / 12;
      ctx.save(); ctx.translate(C.x, C.y); ctx.strokeStyle = INK; ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.5, C.r * 0.1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hr * TAU) * C.r * 0.5, -Math.cos(hr * TAU) * C.r * 0.5); ctx.stroke();
      ctx.lineWidth = Math.max(1, C.r * 0.06); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m * TAU) * C.r * 0.75, -Math.cos(m * TAU) * C.r * 0.75); ctx.stroke();
      ctx.restore();
    }
  }
