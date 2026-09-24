  // ───────────────────────── the maps' ground, lanes, frames and near props ─────────────────────────
  // The lane runs from the slingshot to the ring and says where you are: a dirt path, flagstones, furrows, a path
  // edged with bones, a boardwalk over water, sawdust, cobbles or the aisle carpet. The foreground frame hangs at
  // the lens (branches, chains, corn, vines, moss, bunting, gears or the curtains), and the near props stand at the
  // edges of the frame. All of it is painted once per screen size and per map, like the rest of the scenery.
  const lanePts = (hw0, hw1, z1) => [[-hw0, 0.2], [hw0, 0.2], [hw1, z1], [-hw1, z1]].map(([x, z]) => projectBase(x, 0, z));
  function lanePoly(b, pts, fill) { b.fillStyle = fill; b.beginPath(); pts.forEach((q, i) => i ? b.lineTo(q.x, q.y) : b.moveTo(q.x, q.y)); b.closePath(); b.fill(); }
  // rows across the lane in perspective (flagstones, planks, cobbles): cb(zNear, zFar, row)
  function laneRows(z0, z1, step, cb) { let row = 0; for (let z = z0; z < z1; z += step * (1 + z * 0.08), row++) cb(z, Math.min(z1, z + step * (1 + z * 0.08)), row); }
  const LANES = {
    dirt(b) {
      const pts = lanePts(0.95, 0.7, RING_Z + 1.5), g = b.createLinearGradient(0, pts[2].y, 0, pts[0].y);
      g.addColorStop(0, "rgba(120,92,62,0)"); g.addColorStop(0.4, "rgba(120,92,62,.22)"); g.addColorStop(1, "rgba(120,92,62,.3)"); lanePoly(b, pts, g);
    },
    flagstone(b) {
      lanePoly(b, lanePts(1.0, 0.8, RING_Z + 2), "rgba(70,60,86,.55)");
      b.strokeStyle = "rgba(14,11,18,.55)"; b.lineWidth = 1.2;
      laneRows(0.3, RING_Z + 2, 0.55, (z, z2, row) => {
        const a = projectBase(-1.0 + z * 0.03, 0, z), c = projectBase(1.0 - z * 0.03, 0, z); b.beginPath(); b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.stroke();
        for (let k = row % 2 ? -0.5 : -0.75; k < 1; k += 0.5) { const p = projectBase(k, 0, z), q = projectBase(k, 0, z2); b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(q.x, q.y); b.stroke(); }
      });
    },
    furrows(b, x0, x1) {   // the whole field is ploughed, rows running away to the hills; the lane is a trodden strip
      b.strokeStyle = "rgba(20,10,4,.35)"; b.lineWidth = 1.5;
      for (let x = -12; x <= 12; x += 0.7) { const p = projectBase(x, 0, 0.3), q = projectBase(x * 0.6, 0, 40); b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(q.x, q.y); b.stroke(); }
      b.strokeStyle = "rgba(255,190,110,.08)"; b.lineWidth = 1;
      for (let x = -12.3; x <= 12; x += 0.7) { const p = projectBase(x, 0, 0.3), q = projectBase(x * 0.6, 0, 40); b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(q.x, q.y); b.stroke(); }
      lanePoly(b, lanePts(0.8, 0.6, RING_Z + 1.5), "rgba(150,110,70,.25)");
    },
    bones(b) {
      LANES.dirt(b);
      b.fillStyle = "rgba(221,232,200,.55)"; b.strokeStyle = "rgba(20,24,16,.6)"; b.lineWidth = 1;
      for (let z = 0.6; z < RING_Z + 1.5; z += 0.45 + z * 0.05) for (const sd of [-1, 1]) {
        const p = projectBase(sd * (0.95 - z * 0.035), 0, z), s = 0.09 * p.s;
        b.save(); b.translate(p.x, p.y); b.rotate(sd * 0.3 + z); b.beginPath(); rr(b, -s, -s * 0.18, s * 2, s * 0.36, s * 0.15); b.fill(); b.stroke();
        for (const e of [-1, 1]) { b.beginPath(); b.arc(e * s, -s * 0.16, s * 0.2, 0, TAU); b.arc(e * s, s * 0.16, s * 0.2, 0, TAU); b.fill(); }
        b.restore();
      }
    },
    boardwalk(b) {   // planks on posts over the water, out to where the ring hangs
      const pts = lanePts(0.75, 0.6, RING_Z + 1.2); lanePoly(b, pts, "#5A4632");
      b.strokeStyle = "rgba(20,14,8,.7)"; b.lineWidth = 1.2;
      laneRows(0.2, RING_Z + 1.2, 0.22, z => { const a = projectBase(-0.75 + z * 0.02, 0, z), c = projectBase(0.75 - z * 0.02, 0, z); b.beginPath(); b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.stroke(); });
      b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); pts.forEach((q, i) => i ? b.lineTo(q.x, q.y) : b.moveTo(q.x, q.y)); b.closePath(); b.stroke();
      b.fillStyle = "#3A2C1E"; for (let z = 0.6; z < RING_Z + 1.2; z += 1.4) for (const sd of [-1, 1]) { const p = projectBase(sd * (0.78 - z * 0.02), 0, z), w = 0.07 * p.s; b.fillRect(p.x - w / 2, p.y - w * 1.6, w, w * 2.2); }
    },
    sawdust(b) {
      lanePoly(b, lanePts(1.1, 0.8, RING_Z + 2), "rgba(210,170,110,.28)");
      const rnd = mulberry32(91); b.fillStyle = "rgba(240,210,150,.35)";
      for (let i = 0; i < 500; i++) { const x = (rnd() * 2 - 1) * 1.1, z = 0.3 + rnd() * (RING_Z + 1.7), p = projectBase(x * (1 - z * 0.03), 0, z); b.fillRect(p.x, p.y, Math.max(1, p.s * 0.012), Math.max(1, p.s * 0.006)); }
    },
    cobbles(b) {   // the whole square is cobbled; the lane is the wet shine down the middle
      const rnd = mulberry32(92); b.strokeStyle = "rgba(10,12,14,.5)"; b.lineWidth = 1;
      laneRows(0.3, 34, 0.32, (z, z2, row) => {
        const p0 = projectBase(0, 0, z), s = p0.s, w = 0.3 * s, h = Math.max(2, (projectBase(0, 0, z).y - projectBase(0, 0, z2).y) * 0.8);
        for (let x = -10 + (row % 2) * 0.15; x < 10; x += 0.3) { const p = projectBase(x, 0, z); if (p.x < -40 || p.x > W + 40) continue; b.fillStyle = rnd() < 0.5 ? "rgba(90,96,106,.25)" : "rgba(60,66,76,.25)"; b.beginPath(); b.ellipse(p.x, p.y, w * 0.45, h * 0.45, 0, 0, TAU); b.fill(); b.stroke(); }
      });
      const pts = lanePts(0.9, 0.7, RING_Z + 2), g = b.createLinearGradient(0, pts[2].y, 0, pts[0].y);
      g.addColorStop(0, "rgba(255,210,140,0)"); g.addColorStop(1, "rgba(255,210,140,.1)"); lanePoly(b, pts, g);
    },
    carpet(b) {   // the aisle runner: red, gold-edged, with a diamond pattern
      const pts = lanePts(0.85, 0.7, 30); lanePoly(b, pts, "#7A1E1E");
      b.strokeStyle = GOLD; b.lineWidth = 2; b.beginPath(); b.moveTo(pts[0].x, pts[0].y); b.lineTo(pts[3].x, pts[3].y); b.moveTo(pts[1].x, pts[1].y); b.lineTo(pts[2].x, pts[2].y); b.stroke();
      b.fillStyle = "rgba(227,182,75,.3)";
      laneRows(0.5, 30, 0.9, z => { const p = projectBase(0, 0, z), s = 0.18 * p.s; b.beginPath(); b.moveTo(p.x, p.y - s * 0.4); b.lineTo(p.x + s, p.y); b.lineTo(p.x, p.y + s * 0.4); b.lineTo(p.x - s, p.y); b.closePath(); b.fill(); });
    }
  };
  // water (the bayou): the ground is a still black pond with the moon's reflection laid down it in broken strokes
  function paintWater(b, x0, x1, B) {
    const rnd = mulberry32(93);
    b.strokeStyle = "rgba(200,240,220,.08)"; b.lineWidth = 1;
    for (let i = 0; i < 90; i++) { const z = 2 + Math.pow(rnd(), 1.4) * 40, x = (rnd() * 2 - 1) * 14, p = projectBase(x, 0, z), w = p.s * (0.3 + rnd() * 0.6); b.beginPath(); b.moveTo(p.x - w, p.y); b.lineTo(p.x + w, p.y); b.stroke(); }
    if (moon.r) {
      b.fillStyle = `rgba(${rgbOf(look().moonColor)},.22)`;
      for (let y = HY + 2, i = 0; y < H + B; y += 4 + i * 0.6, i++) { const w = moon.r * (0.6 + rnd() * 0.9) * (1 + i * 0.03); b.fillRect(moon.x - w / 2 + (rnd() - 0.5) * 6, y, w, 1.6); }
    }
  }

  // ── the foreground frame: (B, S) → the plates it paints (each in screen coordinates, drawn at the lens)
  const FG_SIL = "#07090D";
  function fgPlate(x0, y0, w, h, paint) { const P = plate(x0, y0, w, h), b = P.g; b.strokeStyle = FG_SIL; b.fillStyle = FG_SIL; b.lineCap = "round"; b.lineJoin = "round"; try { b.filter = "blur(0.6px)"; } catch (e) {} paint(b); try { b.filter = "none"; } catch (e) {} return P; }
  const FOREGROUNDS = {
    branches(B, S) {
      const TL = plate(-B, -B, B + S * 0.62, B + S * 0.34), TR = plate(W - S * 0.5, -B, S * 0.5 + B, B + S * 0.34);
      for (const P of [TL, TR]) paintForeground(P.g, B, S);
      return [TL, TR];
    },
    chains(B, S) {   // chains hanging from the arch, and a cobweb in the corner
      return [fgPlate(-B, -B, W + 2 * B, B + S * 0.3, b => {
        for (const [x, len] of [[S * 0.06, 0.22], [S * 0.16, 0.14], [W - S * 0.1, 0.25], [W - S * 0.22, 0.12]]) {
          b.lineWidth = Math.max(2, S * 0.006);
          for (let y = 0; y < S * len; y += S * 0.022) { b.beginPath(); b.ellipse(x, y, S * 0.006, S * 0.012, (y / (S * 0.022)) % 2 ? 0 : Math.PI / 2, 0, TAU); b.stroke(); }
        }
        b.lineWidth = 1; b.strokeStyle = "rgba(220,210,235,.25)";
        for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; b.beginPath(); b.moveTo(W, 0); b.lineTo(W - Math.cos(a) * S * 0.2, Math.sin(a) * S * 0.2); b.stroke(); }
        for (let r = S * 0.04; r < S * 0.2; r += S * 0.035) { b.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; (i ? b.lineTo : b.moveTo).call(b, W - Math.cos(a) * r, Math.sin(a) * r); } b.stroke(); }
      })];
    },
    cornstalks(B, S) {   // tall corn at the bottom corners, leaves curling in
      const side = sd => fgPlate(sd < 0 ? -B : W - S * 0.3, H - S * 0.55, S * 0.3 + B, S * 0.55 + B, b => {
        const bx = sd < 0 ? -B * 0.4 : W + B * 0.4;
        for (let i = 0; i < 4; i++) {
          const x = bx - sd * i * S * 0.05, top = H - S * (0.3 + i * 0.05);
          b.lineWidth = S * 0.018; b.beginPath(); b.moveTo(x, H + B); b.quadraticCurveTo(x - sd * S * 0.02, (H + top) / 2, x - sd * S * 0.04, top); b.stroke();
          for (let k = 0; k < 4; k++) { const ly = H - S * (0.08 + k * 0.08) - i * S * 0.02, lx = x - sd * S * 0.01 * k; b.beginPath(); b.moveTo(lx, ly); b.quadraticCurveTo(lx - sd * S * 0.12, ly - S * 0.08, lx - sd * S * (0.18 + k * 0.02), ly + S * 0.02); b.quadraticCurveTo(lx - sd * S * 0.1, ly - S * 0.03, lx, ly + S * 0.02); b.fill(); }
        }
      });
      return [side(-1), side(1)];
    },
    vines(B, S) {   // vines hanging from the canopy, a few leaves, a dangling bone
      return [fgPlate(-B, -B, W + 2 * B, B + S * 0.32, b => {
        b.fillRect(-B, -B, W + 2 * B, B + S * 0.02);
        for (let x = S * 0.03; x < W; x += S * (0.07 + ((x * 7) % 5) * 0.012)) {
          if (x > W * 0.28 && x < W * 0.72) continue;
          const len = S * (0.08 + ((x * 13) % 7) * 0.025); b.lineWidth = Math.max(1.5, S * 0.005);
          b.beginPath(); b.moveTo(x, 0); b.bezierCurveTo(x + S * 0.02, len * 0.3, x - S * 0.02, len * 0.7, x, len); b.stroke();
          for (let k = 1; k < 4; k++) { const y = len * k / 4; b.beginPath(); b.ellipse(x + (k % 2 ? 1 : -1) * S * 0.012, y, S * 0.014, S * 0.007, k % 2 ? 0.6 : -0.6, 0, TAU); b.fill(); }
        }
      })];
    },
    moss(B, S) {   // Spanish moss dripping from a limb across the top
      return [fgPlate(-B, -B, W + 2 * B, B + S * 0.34, b => {
        b.lineWidth = S * 0.035; b.beginPath(); b.moveTo(-B, S * 0.02); b.quadraticCurveTo(W * 0.3, S * 0.07, W * 0.45, S * 0.02); b.stroke();
        b.beginPath(); b.moveTo(W + B, S * 0.03); b.quadraticCurveTo(W * 0.75, S * 0.08, W * 0.6, S * 0.03); b.stroke();
        b.lineWidth = 1;
        for (let x = 0; x < W; x += 4) { if (x > W * 0.44 && x < W * 0.6) continue; const y0 = S * 0.03 + Math.sin(x / W * Math.PI) * S * 0.04, len = S * (0.05 + ((x * 31) % 11) / 11 * 0.18); b.beginPath(); b.moveTo(x, y0); for (let k = 1; k <= 6; k++) b.lineTo(x + Math.sin(k * 1.9 + x) * 3, y0 + len * k / 6); b.stroke(); }
      })];
    },
    bunting(B, S) {   // pennant flags on a string across the top of the picture
      return [fgPlate(-B, -B, W + 2 * B, B + S * 0.18, b => {
        const cols = ["#A94332", "#F2E7C9", "#C49A42", "#356B68"], sag = S * 0.07;
        for (const [a, c, y0] of [[-B, W + B, S * 0.02], [-B, W * 0.55, S * 0.05]]) {
          b.strokeStyle = FG_SIL; b.lineWidth = 1.5; b.beginPath(); b.moveTo(a, y0); b.quadraticCurveTo((a + c) / 2, y0 + sag * 2, c, y0); b.stroke();
          for (let i = 1, n = Math.round((c - a) / (S * 0.06)); i < n; i++) { const u = i / n, x = a + (c - a) * u, y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (y0 + sag * 2) + u * u * y0;
            b.fillStyle = cols[i % 4]; b.beginPath(); b.moveTo(x - S * 0.018, y); b.lineTo(x + S * 0.018, y); b.lineTo(x, y + S * 0.045); b.closePath(); b.fill(); b.strokeStyle = INK; b.lineWidth = 1; b.stroke(); }
        }
      })];
    },
    gears(B, S) {   // great cogs at the corners of the belfry's clockwork
      const cog = (b, x, y, r, n) => { b.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rr2 = i % 2 ? r : r * 1.16; b.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } b.closePath(); b.fill(); b.save(); b.globalCompositeOperation = "destination-out"; b.beginPath(); b.arc(x, y, r * 0.35, 0, TAU); b.fill(); b.restore(); };
      return [fgPlate(-B, -B, B + S * 0.4, B + S * 0.4, b => { cog(b, S * 0.02, S * 0.02, S * 0.2, 12); cog(b, S * 0.26, -S * 0.04, S * 0.1, 8); }),
              fgPlate(W - S * 0.35, -B, S * 0.35 + B, B + S * 0.35, b => cog(b, W - S * 0.02, S * 0.06, S * 0.16, 10))];
    },
    curtains(B, S) {   // the theatre's velvet curtains, drawn back, and the valance across the top
      const drape = sd => fgPlate(sd < 0 ? -B : W - S * 0.22, -B, S * 0.22 + B, H + 2 * B, b => {
        const edge = sd < 0 ? S * 0.12 : W - S * 0.12;
        b.fillStyle = "#4A0E10"; b.beginPath(); b.moveTo(sd < 0 ? -B : W + B, -B); b.lineTo(edge, -B); b.quadraticCurveTo(edge + sd * S * 0.05, H * 0.5, edge - sd * S * 0.04, H + B); b.lineTo(sd < 0 ? -B : W + B, H + B); b.closePath(); b.fill();
        b.strokeStyle = "rgba(0,0,0,.45)"; b.lineWidth = S * 0.012; for (let k = 1; k < 4; k++) { const x = (sd < 0 ? -B : W + B) + (edge - (sd < 0 ? -B : W + B)) * k / 4; b.beginPath(); b.moveTo(x, -B); b.quadraticCurveTo(x + sd * S * 0.02, H * 0.5, x - sd * S * 0.01, H + B); b.stroke(); }
        b.fillStyle = GOLD; b.beginPath(); b.ellipse(edge - sd * S * 0.02, H * 0.55, S * 0.03, S * 0.012, 0, 0, TAU); b.fill();
      });
      return [drape(-1), drape(1), fgPlate(-B, -B, W + 2 * B, B + S * 0.08, b => {
        b.fillStyle = "#5A1214"; b.fillRect(-B, -B, W + 2 * B, B + S * 0.04);
        for (let x = -B; x < W + B; x += S * 0.08) { b.beginPath(); b.arc(x + S * 0.04, S * 0.04, S * 0.04, 0, Math.PI); b.fill(); }
        b.fillStyle = GOLD; for (let x = -B; x < W + B; x += S * 0.08) { b.beginPath(); b.arc(x + S * 0.04, S * 0.075, S * 0.006, 0, TAU); b.fill(); }
      })];
    }
  };

  // ── near props: silhouettes on the ground at the frame's edges, set by set
  const NEAR_SETS = {
    graveyard: [["stone", -1, 0.035, 0.35], ["tuft", -1, 0.12, 1.2], ["fence", 1, 0.03, 0.9], ["tuft", 1, 0.14, 0.2], ["tuft", -1, 0.2, 2.6]],
    crypts:    [["column", -1, 0.04, 0.5], ["tuft", -1, 0.14, 1.4], ["stone", 1, 0.05, 0.7], ["column", 1, 0.16, 2.2]],
    patch:     [["pumpkin", -1, 0.05, 0.4], ["tuft", -1, 0.15, 1.6], ["fence", 1, 0.03, 0.9], ["pumpkin", 1, 0.15, 0.3]],
    orchard:   [["bone", -1, 0.06, 0.4], ["tuft", -1, 0.14, 1.3], ["stone", 1, 0.04, 0.8], ["bone", 1, 0.16, 0.25]],
    bayou:     [["reeds", -1, 0.04, 0.4], ["stump", -1, 0.16, 1.5], ["reeds", 1, 0.05, 0.6], ["reeds", 1, 0.17, 2.1]],
    carnival:  [["crate", -1, 0.05, 0.5], ["pennant", -1, 0.16, 1.6], ["crate", 1, 0.04, 0.8], ["pennant", 1, 0.17, 2.0]],
    belfry:    [["lamp", -1, 0.05, 0.9], ["barrel", -1, 0.15, 0.4], ["barrel", 1, 0.06, 0.5], ["crate", 1, 0.17, 1.8]],
    theatre:   [["seat", -1, 0.04, 0.4], ["seat", -1, 0.13, 1.1], ["seat", 1, 0.04, 0.45], ["rope", 1, 0.16, 1.6]]
  };
  function drawNearKind(kind, s, side, fx) {   // (at the prop's foot, scaled to s pixels a metre)
    const SIL = "#090B10", RIM = "rgba(232,216,180,.16)";
    ctx.fillStyle = SIL; ctx.strokeStyle = SIL; ctx.lineCap = "round";
    if (kind === "stone") {
      ctx.rotate(0.12 * -side); const w = 0.42 * s, h = 0.5 * s;
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.7); ctx.quadraticCurveTo(-w / 2, -h, -w * 0.1, -h); ctx.lineTo(w * 0.05, -h * 0.82); ctx.lineTo(w * 0.22, -h * 0.9); ctx.lineTo(w / 2, -h * 0.62); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = RIM; ctx.lineWidth = Math.max(1, s * 0.012); ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.7); ctx.quadraticCurveTo(-w / 2, -h, -w * 0.1, -h); ctx.stroke();
    } else if (kind === "fence") {
      const h = 0.9 * s, gap = 0.16 * s; ctx.lineWidth = Math.max(1.5, s * 0.022);
      for (let i = 0; i < 3; i++) { const x0 = -i * gap; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, -h + i * 0.04 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 - 0.03 * s, -h + i * 0.04 * s); ctx.lineTo(x0, -h - 0.07 * s + i * 0.04 * s); ctx.lineTo(x0 + 0.03 * s, -h + i * 0.04 * s); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(0.04 * s, -h * 0.78); ctx.lineTo(-2.3 * gap, -h * 0.74); ctx.moveTo(0.04 * s, -h * 0.2); ctx.lineTo(-2.3 * gap, -h * 0.18); ctx.stroke();
    } else if (kind === "tuft" || kind === "reeds") {
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.16, l = (0.16 + ((i * 37) % 7) * 0.02) * s * (kind === "reeds" ? 2.4 : 1), sw = Math.sin(cam.t * 1.3 + i + fx * 9) * 0.04;
        ctx.beginPath(); ctx.moveTo((i - 4) * 0.012 * s, 0); ctx.quadraticCurveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5, Math.cos(a + sw) * l, Math.sin(a + sw) * l); ctx.stroke();
        if (kind === "reeds" && i % 3 === 1) { ctx.beginPath(); ctx.ellipse(Math.cos(a + sw) * l, Math.sin(a + sw) * l, s * 0.012, s * 0.045, a + Math.PI / 2, 0, TAU); ctx.fill(); } }
    } else if (kind === "column") {
      const w = 0.22 * s, h = 0.8 * s; ctx.fillRect(-w / 2 - 0.03 * s, -0.08 * s, w + 0.06 * s, 0.08 * s);
      ctx.beginPath(); ctx.moveTo(-w / 2, -0.08 * s); ctx.lineTo(-w / 2, -h); ctx.lineTo(-w * 0.1, -h * 0.9); ctx.lineTo(w * 0.15, -h * 1.05); ctx.lineTo(w / 2, -h * 0.85); ctx.lineTo(w / 2, -0.08 * s); ctx.fill();
      ctx.strokeStyle = RIM; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w / 2, -0.1 * s); ctx.lineTo(-w / 2, -h); ctx.stroke();
    } else if (kind === "pumpkin") {
      const r = 0.2 * s; for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(k * r, -r * 0.8, r * 0.55, r * 0.8, 0, 0, TAU); ctx.fill(); }
      ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.quadraticCurveTo(r * 0.1, -r * 1.9, r * 0.3, -r * 1.95); ctx.stroke();
    } else if (kind === "bone") {
      ctx.rotate(side * 0.2); const L = 0.5 * s, t = 0.05 * s;
      ctx.fillRect(-L / 2, -t * 1.5, L, t); for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(e * L / 2, -t * 1.9, t * 0.9, 0, TAU); ctx.arc(e * L / 2, -t * 0.6, t * 0.9, 0, TAU); ctx.fill(); }
    } else if (kind === "stump") {
      const w = 0.35 * s; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w * 0.6, -w * 0.3, -w * 0.5, -w * 1.1); ctx.lineTo(w * 0.5, -w * 1.2); ctx.quadraticCurveTo(w * 0.6, -w * 0.3, w, 0); ctx.fill();
    } else if (kind === "crate" || kind === "barrel") {
      const w = 0.4 * s, h = 0.4 * s;
      if (kind === "crate") { ctx.fillRect(-w / 2, -h, w, h); ctx.strokeStyle = RIM; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 2, -h + 2, w - 4, h - 4); ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h + 2); ctx.lineTo(w / 2 - 2, -2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(0, -h / 2, w * 0.4, h / 2, 0, 0, TAU); ctx.fill(); ctx.fillRect(-w * 0.36, -h, w * 0.72, h); ctx.strokeStyle = RIM; ctx.lineWidth = 1; for (const y of [-0.25, -0.75]) { ctx.beginPath(); ctx.moveTo(-w * 0.36, y * h); ctx.lineTo(w * 0.36, y * h); ctx.stroke(); } }
    } else if (kind === "pennant") {
      ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -1.1 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -1.1 * s); ctx.lineTo(-side * 0.3 * s, -1.02 * s + Math.sin(cam.t * 3) * 0.02 * s); ctx.lineTo(0, -0.94 * s); ctx.fill();
    } else if (kind === "lamp") {
      ctx.lineWidth = Math.max(2, s * 0.03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -1.4 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.1 * s, -1.4 * s); ctx.lineTo(0.1 * s, -1.4 * s); ctx.lineTo(0.06 * s, -1.6 * s); ctx.lineTo(-0.06 * s, -1.6 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,210,140,.5)"; ctx.fillRect(-0.05 * s, -1.56 * s, 0.1 * s, 0.12 * s);
    } else if (kind === "seat") {   // a row of theatre seat-backs
      for (let i = 0; i < 3; i++) { const x = -side * i * 0.3 * s; ctx.beginPath(); rr(ctx, x - 0.13 * s, -0.55 * s, 0.26 * s, 0.4 * s, 0.07 * s); ctx.fill(); ctx.fillRect(x - 0.1 * s, -0.16 * s, 0.2 * s, 0.16 * s); }
      ctx.strokeStyle = "rgba(227,182,75,.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0.13 * s, -0.5 * s); ctx.lineTo(-side * 0.6 * s - 0.13 * s, -0.5 * s); ctx.stroke();
    } else if (kind === "cactus") {   // a saguaro, arms up
      const w = 0.08 * s, h = 0.75 * s; ctx.beginPath(); rr(ctx, -w / 2, -h, w, h, w / 2); ctx.fill();
      for (const [sd, y, up] of [[-1, 0.55, 0.35], [1, 0.72, 0.28]]) { ctx.beginPath(); rr(ctx, sd < 0 ? -w * 2.2 : w * 0.5, -y * h, w * 1.7, w * 0.8, w * 0.4); ctx.fill(); ctx.beginPath(); rr(ctx, sd < 0 ? -w * 2.2 : w * 1.4, -(y + up) * h, w * 0.8, up * h + w * 0.4, w * 0.4); ctx.fill(); }
      ctx.strokeStyle = RIM; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.95); ctx.lineTo(-w * 0.3, -h * 0.05); ctx.stroke();
    } else if (kind === "stalagmite") {
      const w = 0.24 * s, h = 0.9 * s; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w * 0.4, -h * 0.4, -w * 0.08, -h); ctx.lineTo(w * 0.1, -h * 0.96); ctx.quadraticCurveTo(w * 0.4, -h * 0.4, w, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = RIM; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * 0.6, -h * 0.1); ctx.quadraticCurveTo(-w * 0.35, -h * 0.5, -w * 0.08, -h * 0.95); ctx.stroke();
    } else if (kind === "rope") {
      for (const x of [0, -side * 0.7]) { ctx.fillRect(x * s - 0.025 * s, -0.7 * s, 0.05 * s, 0.7 * s); ctx.beginPath(); ctx.arc(x * s, -0.72 * s, 0.05 * s, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = "rgba(122,30,30,.9)"; ctx.lineWidth = Math.max(2, s * 0.03); ctx.beginPath(); ctx.moveTo(0, -0.62 * s); ctx.quadraticCurveTo(-side * 0.35 * s, -0.4 * s, -side * 0.7 * s, -0.62 * s); ctx.stroke();
    }
  }
