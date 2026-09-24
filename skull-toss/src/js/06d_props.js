  // ───────────────────────── the maps' props ─────────────────────────
  // Each map lays out its own set of props either side of the throw lane (never inside the blueprint's corridor), and
  // each new kind of prop has a painter: an inked, flat-coloured sprite painted once per screen size, drawn in the
  // world with the camera and bouncing to the beat like the graveyard's. Kinds with light (torches, jack-o'-lanterns,
  // lamps) glow and flicker; some sway, bob or turn. Units are metres, the origin at the prop's foot.
  const STONE_PALS = {
    grave: [["#7C8798", "#98A3B4"], ["#8E849C", "#A89EB6"], ["#6F8A86", "#8AA6A2"], ["#8A8274", "#A69E8E"]],
    crypt: [["#6A5E80", "#84789A"], ["#5A5070", "#746A8A"], ["#766A86", "#9084A0"], ["#62586E", "#7C7288"]],
    bone:  [["#A8AE92", "#C2C8AC"], ["#8E967C", "#A8B096"], ["#9AA088", "#B4BAA2"], ["#848A72", "#9EA48C"]]
  };
  // lay a map's props out: place(kind, x, z, extra). Banks either side of the lane, sparser into the distance.
  const clearOfLane = (x, z) => Math.abs(x) >= BLUEPRINT.corridor.halfWidth || z >= BLUEPRINT.corridor.zMax;
  function banks(rnd, zFrom, zTo, fn) { for (let z = zFrom; z < zTo; z += 1.3 + z * 0.06) for (const side of [-1, 1]) { if (rnd() < 0.2) continue; fn(side * (3.1 + rnd() * (2 + z * 0.18)), z + rnd() * 0.6, side); } }
  const PROPSETS = {
    graveyard(place, rnd) {
      banks(rnd, 4.5, 36, (x, z) => { const k = rnd(); place(k < 0.5 ? "stone" : k < 0.68 ? "cross" : k < 0.82 ? "slab" : "obelisk", x, z, { col: (rnd() * 4) | 0, pal: "grave", tilt: (rnd() - 0.5) * 0.16, h: 0.75 + rnd() * 0.45 }); });
      for (const [x, z] of [[-1.4, 18], [1.8, 21], [-2.2, 26], [0.4, 30], [2.6, 34]]) place("stone", x, z, { col: (rnd() * 4) | 0, pal: "grave", tilt: (rnd() - 0.5) * 0.2, h: 0.8 + rnd() * 0.3 });
      for (const [x, z, s] of [[-7.2, 15, 1.1], [6.8, 19, 1.2], [-10, 27, 1.3], [10.5, 31, 1.4], [-4.8, 33, 1.2]]) place("tree", x, z, { size: s });
      place("crypt", 7.4, 26);
      for (const [x, z] of [[-4.2, 7.5], [4.4, 12], [-5.8, 20]]) place("lantern", x, z);
      for (const [x, z] of [[-6.5, 17.5], [5.8, 16.5]]) place("fence", x, z);
      for (let i = 0; i < 26; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 24, x = side * (2.4 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.7 + rnd() * 0.5 }); }
      place("digger", -2.9, 12.5);
    },
    crypts(place, rnd) {
      banks(rnd, 4.5, 34, (x, z) => { const k = rnd(); place(k < 0.35 ? "sarcophagus" : k < 0.6 ? "stone" : k < 0.8 ? "cross" : "column", x, z, { col: (rnd() * 4) | 0, pal: "crypt", tilt: (rnd() - 0.5) * 0.3, h: 0.8 + rnd() * 0.5, size: 0.9 + rnd() * 0.3 }); });
      for (const [x, z] of [[-6.8, 18], [7.2, 24], [-9, 29]]) place("mausoleum", x, z);
      for (const [x, z] of [[-3.6, 6], [3.8, 9], [-4.4, 14], [4.6, 18]]) place("torch", x, z);
      for (let i = 0; i < 16; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 22, x = side * (2.5 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.6 + rnd() * 0.4 }); }
    },
    patch(place, rnd) {
      banks(rnd, 3.8, 34, (x, z) => { const k = rnd(); place(k < 0.55 ? "pumpkin" : k < 0.72 ? "jack" : k < 0.86 ? "hay" : "corn", x, z, { size: 0.7 + rnd() * 0.6 }); });
      for (const [x, z] of [[-5.2, 11], [6.4, 17], [-7.4, 25]]) place("scarecrow", x, z);
      for (const [x, z] of [[-6.2, 20], [6.6, 27], [-3.6, 29]]) place("rail", x, z);
      for (const [x, z, s] of [[-9, 22, 1.2], [9.6, 30, 1.3]]) place("tree", x, z, { size: s });
      place("digger", -2.9, 12.5);   // (Crow Hollow: the gravedigger who buried the reel is still at it)
    },
    orchard(place, rnd) {
      for (let z = 6; z < 38; z += 3.6) for (const side of [-1, 1]) place("bonetree", side * (3.6 + (rnd() - 0.5) * 0.8 + z * 0.05), z + rnd(), { size: 0.9 + rnd() * 0.3 });
      for (let z = 8; z < 38; z += 5) for (const side of [-1, 1]) place("bonetree", side * (7.5 + rnd() * 2), z + rnd() * 2, { size: 1 + rnd() * 0.3 });
      for (const [x, z] of [[-5, 10], [5.6, 15], [-6.4, 26]]) place("ribcage", x, z);
      for (let i = 0; i < 8; i++) { const side = rnd() < 0.5 ? -1 : 1; place(rnd() < 0.5 ? "skullpile" : "stone", side * (2.7 + rnd() * 3), 4 + rnd() * 24, { col: (rnd() * 4) | 0, pal: "bone", tilt: (rnd() - 0.5) * 0.2, h: 0.7 + rnd() * 0.3 }); }
      for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 22, x = side * (2.5 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.6 + rnd() * 0.4 }); }
    },
    bayou(place, rnd) {
      for (const [x, z, s] of [[-4.2, 9, 1.0], [5, 13, 1.1], [-6.8, 18, 1.2], [7.4, 22, 1.2], [-3.4, 27, 1.1], [4.2, 31, 1.3], [-9, 30, 1.4]]) place("cypress", x, z, { size: s });
      for (let i = 0; i < 14; i++) { const side = rnd() < 0.5 ? -1 : 1; place("lily", side * (1.3 + rnd() * 4), 3 + rnd() * 26, { size: 0.6 + rnd() * 0.6 }); }
      for (const [x, z] of [[-3, 5], [3.2, 7.5], [-3.6, 12]]) place("lantern", x, z);
      place("rowboat", 4.2, 10); place("stump", -2.8, 16); place("stump", 3.4, 19);
      for (let i = 0; i < 12; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.5 + rnd() * 20; place("reeds", side * (2.6 + rnd() * 3), z, { size: 0.7 + rnd() * 0.5 }); }
    },
    carnival(place, rnd) {
      for (const [x, z, c] of [[-6, 14, 0], [7, 18, 1], [-8.5, 24, 1], [6.5, 29, 0]]) place("tent", x, z, { col: c });
      for (const [x, z] of [[-3.6, 7], [4, 10]]) place("booth", x, z, { col: rnd() < 0.5 ? 0 : 1 });
      for (let z = 5; z < 30; z += 4.5) for (const side of [-1, 1]) place("pennant", side * (2.8 + rnd() * 0.6), z);
      for (const [x, z] of [[-4.6, 12], [5, 15], [-3.2, 20]]) place("horse", x, z);
      for (const [x, z] of [[-2.9, 4.5], [3.1, 13]]) place("balloons", x, z);
    },
    belfry(place, rnd) {
      for (let z = 5; z < 34; z += 5) for (const side of [-1, 1]) place("lamppost", side * (3.1 + rnd() * 0.4), z + side * 1.2);
      for (const [x, z] of [[-5.6, 10], [6.2, 16], [-7, 23]]) place("gear", x, z, { size: 0.9 + rnd() * 0.5 });
      for (const [x, z] of [[5.4, 8], [-5, 18], [6.8, 26]]) place("gargoyle", x, z);
      place("bell", -8.4, 28); place("bell", 9, 20);
      for (let i = 0; i < 10; i++) { const side = rnd() < 0.5 ? -1 : 1; place(rnd() < 0.5 ? "crate" : "barrel", side * (2.7 + rnd() * 3), 4 + rnd() * 20); }
    },
    theatre(place, rnd) {
      for (let z = 1.8; z < 34; z += 1.2) for (const side of [-1, 1]) place("seats", side * 2.9, z, { n: 5, side });
      for (const [x, z] of [[-2.55, 5], [2.55, 9], [-2.55, 13]]) place("rope", x, z);
      for (const [x, z] of [[-9.5, 12], [9.5, 12], [-9.5, 24], [9.5, 24]]) place("pillar", x, z);
      place("filmcans", 2.7, 4.2); place("popcorn", -2.8, 16.5);
    }
  };

  // ── painters for the new kinds
  const PROP_SPRITES = {   // kind: [width, height, anchor x, anchor y] in metres (scaled by k.size where it has one)
    sarcophagus: [1.6, 1.0, 0.8, 0.95], column: [0.8, 2.2, 0.4, 2.1], mausoleum: [3.2, 2.7, 1.6, 2.6], torch: [0.6, 1.7, 0.3, 1.65],
    pumpkin: [1.0, 0.8, 0.5, 0.75], jack: [1.1, 0.9, 0.55, 0.85], hay: [1.4, 0.8, 0.7, 0.75], corn: [1.2, 2.2, 0.6, 2.1], scarecrow: [1.8, 2.6, 0.9, 2.5], rail: [3.6, 1.2, 1.8, 1.1],
    bonetree: [3.0, 3.4, 1.5, 3.3], ribcage: [2.4, 1.8, 1.2, 1.7], skullpile: [1.2, 0.8, 0.6, 0.75],
    cypress: [2.6, 4.4, 1.3, 4.3], lily: [1.4, 0.3, 0.7, 0.2], rowboat: [2.2, 0.8, 1.1, 0.6], stump: [1.2, 0.9, 0.6, 0.85], reeds: [0.9, 1.4, 0.45, 1.35],
    tent: [3.6, 3.4, 1.8, 3.3], booth: [2.4, 2.4, 1.2, 2.35], pennant: [0.8, 2.4, 0.2, 2.35], horse: [1.2, 2.6, 0.6, 2.55], balloons: [1.2, 3.0, 0.6, 2.95],
    lamppost: [0.9, 3.0, 0.45, 2.95], gear: [2.2, 1.4, 1.1, 1.35], gargoyle: [1.3, 1.6, 0.65, 1.55], bell: [1.8, 2.4, 0.9, 2.35], crate: [0.9, 0.8, 0.45, 0.75], barrel: [0.8, 1.0, 0.4, 0.95],
    seats: [2.2, 1.0, 1.1, 0.95], rope: [1.2, 1.1, 0.6, 1.05], pillar: [1.2, 5.0, 0.6, 4.95], filmcans: [1.0, 0.9, 0.5, 0.85], popcorn: [1.2, 1.9, 0.6, 1.85]
  };
  const inkP = g => { g.fill(); g.stroke(); };
  const PROP_PAINT = {
    sarcophagus(g, k) { const [b, l] = STONE_PALS.crypt[k.col || 0];
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 0.8, 0.1, 0, 0, TAU); g.fill();
      g.fillStyle = b; g.beginPath(); g.moveTo(-0.7, 0); g.lineTo(-0.62, -0.62); g.lineTo(0.62, -0.62); g.lineTo(0.7, 0); g.closePath(); inkP(g);
      g.fillStyle = l; g.beginPath(); g.moveTo(-0.72, -0.62); g.lineTo(-0.55, -0.85); g.lineTo(0.55, -0.85); g.lineTo(0.72, -0.62); g.closePath(); inkP(g);
      g.lineWidth = 0.05; g.beginPath(); g.moveTo(0, -0.8); g.lineTo(0, -0.66); g.moveTo(-0.08, -0.75); g.lineTo(0.08, -0.75); g.stroke(); },
    column(g, k) { const [b, l] = STONE_PALS.crypt[k.col || 1];
      g.fillStyle = b; g.beginPath(); g.rect(-0.35, -0.16, 0.7, 0.16); inkP(g);
      g.beginPath(); g.moveTo(-0.24, -0.16); g.lineTo(-0.24, -1.9); g.lineTo(-0.05, -1.75); g.lineTo(0.08, -2.0); g.lineTo(0.24, -1.8); g.lineTo(0.24, -0.16); g.closePath(); inkP(g);
      g.strokeStyle = l; g.lineWidth = 0.04; for (const x of [-0.12, 0, 0.12]) { g.beginPath(); g.moveTo(x, -0.2); g.lineTo(x, -1.7); g.stroke(); } g.strokeStyle = INK; },
    mausoleum(g) { paintCrypt(g); g.fillStyle = "rgba(90,62,110,.35)"; g.fillRect(-1.3, -2.5, 2.6, 2.5); },
    torch(g) { g.fillStyle = "#2A2430"; g.beginPath(); g.rect(-0.05, -1.35, 0.1, 1.35); inkP(g);
      g.fillStyle = "#4A3A30"; g.beginPath(); g.moveTo(-0.14, -1.35); g.lineTo(0.14, -1.35); g.lineTo(0.09, -1.5); g.lineTo(-0.09, -1.5); g.closePath(); inkP(g); },
    pumpkin(g, k) { const s = k.size || 1;
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 0.45 * s, 0.07 * s, 0, 0, TAU); g.fill();
      for (const [dx, c] of [[-0.18, "#D9692A"], [0.18, "#D9692A"], [0, "#EE8A3E"]]) { g.fillStyle = c; g.beginPath(); g.ellipse(dx * s, -0.3 * s, 0.24 * s, 0.3 * s, 0, 0, TAU); inkP(g); }
      g.fillStyle = "#5A6B2A"; g.beginPath(); g.moveTo(-0.03 * s, -0.58 * s); g.quadraticCurveTo(0, -0.72 * s, 0.1 * s, -0.74 * s); g.lineTo(0.05 * s, -0.58 * s); g.closePath(); inkP(g); },
    jack(g, k) { PROP_PAINT.pumpkin(g, k); const s = k.size || 1; g.fillStyle = "#2A1206";
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.16 * s, -0.42 * s); g.lineTo(sd * 0.05 * s, -0.36 * s); g.lineTo(sd * 0.17 * s, -0.32 * s); g.closePath(); g.fill(); }
      g.beginPath(); g.moveTo(-0.2 * s, -0.22 * s); for (let i = 0; i <= 6; i++) g.lineTo((-0.2 + i * 0.067) * s, (-0.22 + (i % 2 ? 0.06 : 0) + Math.sin(i / 6 * Math.PI) * 0.06) * s); g.lineTo(0.2 * s, -0.22 * s); g.quadraticCurveTo(0, -0.02 * s, -0.2 * s, -0.22 * s); g.fill(); },
    hay(g, k) { const s = k.size || 1; g.fillStyle = "#C8A04A"; g.beginPath(); rr(g, -0.6 * s, -0.6 * s, 1.2 * s, 0.6 * s, 0.12 * s); inkP(g);
      g.strokeStyle = "rgba(90,60,20,.6)"; g.lineWidth = 0.03; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-0.5 * s + i * 0.16 * s, -0.55 * s); g.lineTo(-0.48 * s + i * 0.16 * s, -0.05 * s); g.stroke(); }
      g.strokeStyle = "#6A4A20"; g.lineWidth = 0.05; for (const x of [-0.3, 0.3]) { g.beginPath(); g.moveTo(x * s, -0.6 * s); g.lineTo(x * s, 0); g.stroke(); } g.strokeStyle = INK; },
    corn(g, k) { const s = k.size || 1; g.fillStyle = "#8A7A3A";
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 0.06 * s, 0); g.lineTo(i * 0.05 * s - 0.03, -1.9 * s); g.lineTo(i * 0.05 * s + 0.03, -1.9 * s); g.closePath(); inkP(g); }
      g.fillStyle = "#6A5A2A"; g.beginPath(); rr(g, -0.24 * s, -1.0 * s, 0.48 * s, 0.1 * s, 0.03); inkP(g); },
    scarecrow(g) { g.fillStyle = "#6A4A2E"; g.beginPath(); g.rect(-0.05, -2.2, 0.1, 2.2); inkP(g); g.beginPath(); g.rect(-0.8, -1.72, 1.6, 0.09); inkP(g);
      g.fillStyle = "#6A5A7A"; g.beginPath(); g.moveTo(-0.3, -1.8); g.lineTo(0.3, -1.8); g.lineTo(0.36, -1.0); g.lineTo(-0.36, -1.0); g.closePath(); inkP(g);
      g.fillStyle = "#E3B64B"; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.8, -1.7); g.lineTo(sd * 0.95, -1.62); g.lineTo(sd * 0.92, -1.72); g.lineTo(sd * 0.98, -1.78); g.lineTo(sd * 0.8, -1.74); g.fill(); }
      g.fillStyle = "#D8B87A"; g.beginPath(); g.arc(0, -2.05, 0.22, 0, TAU); inkP(g);
      g.fillStyle = INK; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.1 - 0.04, -2.12); g.lineTo(sd * 0.1 + 0.04, -2.04); g.moveTo(sd * 0.1 + 0.04, -2.12); g.lineTo(sd * 0.1 - 0.04, -2.04); g.lineWidth = 0.03; g.stroke(); }
      g.beginPath(); g.moveTo(-0.1, -1.94); for (let i = 0; i <= 4; i++) g.lineTo(-0.1 + i * 0.05, -1.94 + (i % 2) * 0.03); g.stroke();
      g.fillStyle = "#3A2A1E"; g.beginPath(); g.ellipse(0, -2.22, 0.34, 0.06, -0.1, 0, TAU); inkP(g); g.beginPath(); g.moveTo(-0.16, -2.24); g.lineTo(-0.1, -2.46); g.lineTo(0.12, -2.46); g.lineTo(0.16, -2.24); g.closePath(); inkP(g); },
    rail(g) { g.fillStyle = "#6A4A2E"; for (let i = 0; i < 5; i++) { g.beginPath(); g.rect(-1.6 + i * 0.8 - 0.05, -1.0, 0.1, 1.0); inkP(g); }
      for (const y of [-0.8, -0.4]) { g.beginPath(); g.rect(-1.7, y, 3.4, 0.08); inkP(g); } },
    bonetree(g, k) { const s = k.size || 1; paintTree(g, { size: s * 0.95 });
      g.strokeStyle = "rgba(20,20,10,.8)"; g.lineWidth = 0.015;
      for (const [x, y] of [[-0.75, -1.95], [-0.45, -2.35], [0.62, -2.4], [0.3, -2.05], [-0.2, -2.6]]) {
        const bx = x * s, by = y * s; g.beginPath(); g.moveTo(bx, by - 0.12 * s); g.lineTo(bx, by); g.stroke();
        g.fillStyle = "#E4DAC4"; g.save(); g.translate(bx, by + 0.07 * s); g.rotate(0.3); g.beginPath(); rr(g, -0.02 * s, -0.08 * s, 0.04 * s, 0.16 * s, 0.02 * s); g.fill(); g.stroke();
        for (const e of [-1, 1]) { g.beginPath(); g.arc(-0.02 * s, e * 0.08 * s, 0.025 * s, 0, TAU); g.arc(0.02 * s, e * 0.08 * s, 0.025 * s, 0, TAU); g.fill(); } g.restore(); }
      g.strokeStyle = INK; },
    ribcage(g) { g.strokeStyle = INK; g.lineCap = "round";
      for (let i = 0; i < 5; i++) { const x = -0.8 + i * 0.4, h = 1.5 - Math.abs(i - 2) * 0.15; g.lineWidth = 0.13; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x - 0.3, -h * 0.7, x + 0.15, -h); g.stroke(); g.lineWidth = 0.08; g.strokeStyle = "#E4DAC4"; g.stroke(); g.strokeStyle = INK; }
      g.lineWidth = 0.12; g.beginPath(); g.moveTo(-0.9, -1.35); g.quadraticCurveTo(0, -1.6, 0.9, -1.35); g.stroke(); g.lineWidth = 0.07; g.strokeStyle = "#E4DAC4"; g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; },
    skullpile(g) { for (const [x, y, r] of [[-0.3, -0.16, 0.17], [0.05, -0.15, 0.18], [0.36, -0.14, 0.16], [-0.12, -0.42, 0.16], [0.2, -0.4, 0.16], [0.04, -0.63, 0.15]]) {
      g.fillStyle = "#E4DAC4"; g.beginPath(); g.arc(x, y, r, 0, TAU); inkP(g); g.fillStyle = INK; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x + sd * r * 0.38, y - r * 0.05, r * 0.2, r * 0.26, 0, 0, TAU); g.fill(); } g.beginPath(); g.moveTo(x, y + r * 0.15); g.lineTo(x - r * 0.08, y + r * 0.32); g.lineTo(x + r * 0.08, y + r * 0.32); g.fill(); } },
    cypress(g, k) { const s = k.size || 1;
      g.fillStyle = "#3A3024"; g.beginPath(); g.moveTo(-0.7 * s, 0); g.quadraticCurveTo(-0.25 * s, -0.3 * s, -0.16 * s, -1.2 * s); g.lineTo(-0.1 * s, -3.6 * s); g.lineTo(0.12 * s, -3.6 * s); g.lineTo(0.16 * s, -1.2 * s); g.quadraticCurveTo(0.25 * s, -0.3 * s, 0.7 * s, 0); g.closePath(); inkP(g);
      g.fillStyle = "#26402E"; for (const [x, y, w] of [[0, -3.7, 1.1], [-0.55, -3.2, 0.7], [0.6, -3.3, 0.7], [-0.2, -4.0, 0.7]]) { g.beginPath(); g.ellipse(x * s, y * s, w * s, 0.26 * s, 0, 0, TAU); inkP(g); }
      g.strokeStyle = "#6A7A60"; g.lineWidth = 0.02; for (let i = 0; i < 12; i++) { const x = (-0.9 + i * 0.16) * s; g.beginPath(); g.moveTo(x, -3.6 * s); for (let j = 1; j < 5; j++) g.lineTo(x + Math.sin(i + j) * 0.03, (-3.6 + j * (0.14 + (i % 3) * 0.05)) * s); g.stroke(); } g.strokeStyle = INK;
      g.fillStyle = "#3A3024"; for (const x of [-1.0, 0.9]) { g.beginPath(); g.moveTo(x * s - 0.08, 0); g.lineTo(x * s, -0.3 * s); g.lineTo(x * s + 0.08, 0); g.closePath(); inkP(g); } },
    lily(g, k) { const s = k.size || 1; g.fillStyle = "#3E6A42";
      for (const [x, r] of [[-0.35, 0.22], [0.15, 0.28], [0.45, 0.16]]) { g.beginPath(); g.ellipse(x * s, 0, r * s, r * 0.32 * s, 0, 0.3, TAU - 0.1); g.lineTo(x * s, 0); g.closePath(); inkP(g); }
      g.fillStyle = "#F2C8D8"; g.beginPath(); g.arc(0.15 * s, -0.06 * s, 0.06 * s, 0, TAU); inkP(g); },
    rowboat(g) { g.fillStyle = "#5A4232"; g.beginPath(); g.moveTo(-1.0, -0.4); g.quadraticCurveTo(-0.9, 0, -0.4, 0.02); g.lineTo(0.6, 0.02); g.quadraticCurveTo(1.0, -0.1, 1.05, -0.45); g.closePath(); inkP(g);
      g.strokeStyle = "rgba(20,14,8,.6)"; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.9, -0.22); g.lineTo(0.98, -0.25); g.stroke(); g.strokeStyle = INK;
      g.fillStyle = "#3A2C1E"; g.beginPath(); g.rect(-0.2, -0.45, 0.08, 0.3); inkP(g); },
    stump(g) { g.fillStyle = "#4A3A2A"; g.beginPath(); g.moveTo(-0.55, 0); g.quadraticCurveTo(-0.3, -0.15, -0.3, -0.7); g.lineTo(0.3, -0.75); g.quadraticCurveTo(0.3, -0.15, 0.55, 0); g.closePath(); inkP(g);
      g.fillStyle = "#8A7050"; g.beginPath(); g.ellipse(0, -0.72, 0.3, 0.08, 0, 0, TAU); inkP(g); g.lineWidth = 0.015; g.beginPath(); g.ellipse(0, -0.72, 0.15, 0.04, 0, 0, TAU); g.stroke(); },
    reeds(g, k) { const s = k.size || 1; g.lineCap = "round";
      for (let i = 0; i < 7; i++) { const x = (i - 3) * 0.08 * s, h = (0.9 + (i % 3) * 0.2) * s; g.strokeStyle = INK; g.lineWidth = 0.05; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.05, -h * 0.5, x + (i - 3) * 0.03, -h); g.stroke(); g.strokeStyle = "#5A7A4A"; g.lineWidth = 0.025; g.stroke();
        if (i % 2) { g.fillStyle = "#5A3A22"; g.beginPath(); g.ellipse(x + (i - 3) * 0.03, -h + 0.1 * s, 0.035 * s, 0.1 * s, 0, 0, TAU); inkP(g); } } g.strokeStyle = INK; },
    tent(g, k) { const c = k.col ? ["#356B68", "#F2E7C9"] : ["#A94332", "#F2E7C9"];
      for (let i = 0; i < 6; i++) { const a = -1.6 + i * 0.533, b2 = a + 0.533; g.fillStyle = c[i % 2]; g.beginPath(); g.moveTo(a, 0); g.quadraticCurveTo(a * 0.5, -1.4, 0, -2.6); g.quadraticCurveTo(b2 * 0.5, -1.4, b2, 0); g.closePath(); inkP(g); }
      g.fillStyle = "#1A0A0A"; g.beginPath(); g.moveTo(-0.35, 0); g.quadraticCurveTo(0, -1.2, 0.35, 0); g.closePath(); inkP(g);
      g.fillStyle = "#6A4A2E"; g.beginPath(); g.rect(-0.03, -3.2, 0.06, 0.62); inkP(g); g.fillStyle = "#C49A42"; g.beginPath(); g.moveTo(0.03, -3.2); g.lineTo(0.5, -3.08); g.lineTo(0.03, -2.96); g.closePath(); inkP(g); },
    booth(g, k) { g.fillStyle = "#6A4A2E"; g.beginPath(); g.rect(-1.0, -1.1, 2.0, 1.1); inkP(g);
      for (const x of [-1.0, 0.92]) { g.beginPath(); g.rect(x, -2.0, 0.08, 0.9); inkP(g); }
      const c = k.col ? ["#356B68", "#F2E7C9"] : ["#A94332", "#F2E7C9"]; for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 2]; g.beginPath(); g.moveTo(-1.1 + i * 0.275, -2.0); g.lineTo(-1.1 + (i + 1) * 0.275, -2.0); g.lineTo(-1.1 + (i + 1) * 0.275, -1.75); g.quadraticCurveTo(-1.1 + (i + 0.5) * 0.275, -1.6, -1.1 + i * 0.275, -1.75); g.closePath(); inkP(g); }
      g.fillStyle = "#F2E7C9"; g.beginPath(); g.rect(-0.6, -1.02, 1.2, 0.32); inkP(g); g.fillStyle = "#A94332"; g.font = "bold 0.2px Georgia, serif"; g.textAlign = "center"; g.fillText("3 TRIES", 0, -0.8); },
    pennant(g) { g.fillStyle = "#8C6239"; g.beginPath(); g.rect(-0.03, -2.3, 0.06, 2.3); inkP(g); g.fillStyle = "#A94332"; g.beginPath(); g.moveTo(0.03, -2.3); g.lineTo(0.55, -2.16); g.lineTo(0.03, -2.02); g.closePath(); inkP(g); },
    horse(g) { g.fillStyle = "#C49A42"; g.beginPath(); g.rect(-0.03, -2.5, 0.06, 2.5); inkP(g);
      g.fillStyle = "#F2E7C9"; g.beginPath(); g.ellipse(0, -1.3, 0.42, 0.2, 0, 0, TAU); inkP(g); g.beginPath(); g.moveTo(0.3, -1.4); g.lineTo(0.45, -1.8); g.quadraticCurveTo(0.6, -1.9, 0.62, -1.72); g.lineTo(0.42, -1.3); g.closePath(); inkP(g);
      g.fillStyle = "#A94332"; g.beginPath(); g.moveTo(0.36, -1.62); g.lineTo(0.2, -1.5); g.lineTo(0.38, -1.5); g.closePath(); inkP(g);
      g.lineWidth = 0.06; for (const [x, a] of [[-0.3, 0.4], [-0.15, -0.3], [0.2, 0.3], [0.32, -0.2]]) { g.beginPath(); g.moveTo(x, -1.2); g.lineTo(x + Math.sin(a) * 0.3, -0.9); g.stroke(); } g.lineWidth = 0.028; },
    balloons(g) { g.lineWidth = 0.015; for (const [x, y, c] of [[-0.3, -2.4, "#A94332"], [0.2, -2.6, "#C49A42"], [0, -2.2, "#356B68"], [0.35, -2.2, "#F2E7C9"], [-0.15, -2.75, "#66506B"]]) {
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * 0.3, y * 0.5, x, y + 0.24); g.stroke(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 0.2, 0.25, 0, 0, TAU); inkP(g); } g.lineWidth = 0.028;
      g.fillStyle = "#4A3A30"; g.beginPath(); g.rect(-0.08, -0.2, 0.16, 0.2); inkP(g); },
    lamppost(g) { g.fillStyle = "#1E2228"; g.beginPath(); g.rect(-0.05, -2.6, 0.1, 2.6); inkP(g); g.beginPath(); g.rect(-0.14, -0.2, 0.28, 0.2); inkP(g);
      g.beginPath(); g.moveTo(-0.2, -2.6); g.lineTo(0.2, -2.6); g.lineTo(0.14, -2.9); g.lineTo(-0.14, -2.9); g.closePath(); inkP(g); g.fillStyle = "#FFE0A0"; g.fillRect(-0.1, -2.85, 0.2, 0.22); },
    gear(g, k) { const s = k.size || 1; g.fillStyle = "#6A5A48";
      g.beginPath(); for (let i = 0; i < 24; i++) { const a = Math.PI + (i / 23) * Math.PI, r = (i % 2 ? 1.0 : 1.12) * s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); inkP(g);
      g.fillStyle = "#3A3028"; g.beginPath(); g.arc(0, 0, 0.3 * s, Math.PI, 0); inkP(g); },
    gargoyle(g) { g.fillStyle = "#56606A"; g.beginPath(); g.rect(-0.35, -0.6, 0.7, 0.6); inkP(g);
      g.beginPath(); g.moveTo(-0.3, -0.6); g.quadraticCurveTo(-0.4, -1.2, 0, -1.3); g.quadraticCurveTo(0.4, -1.2, 0.3, -0.6); g.closePath(); inkP(g);
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.25, -1.1); g.lineTo(sd * 0.6, -1.5); g.lineTo(sd * 0.4, -1.0); g.closePath(); inkP(g); g.beginPath(); g.moveTo(sd * 0.12, -1.25); g.lineTo(sd * 0.2, -1.45); g.lineTo(sd * 0.02, -1.28); g.fill(); }
      g.fillStyle = "#E8D84A"; for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 0.1, -1.12, 0.04, 0, TAU); g.fill(); } },
    bell(g) { g.fillStyle = "#5A4232"; for (const x of [-0.8, 0.72]) { g.beginPath(); g.rect(x, -2.3, 0.08, 2.3); inkP(g); } g.beginPath(); g.rect(-0.85, -2.34, 1.7, 0.1); inkP(g);
      g.fillStyle = "#C49A42"; g.beginPath(); g.moveTo(-0.1, -2.24); g.quadraticCurveTo(-0.35, -2.1, -0.4, -1.5); g.lineTo(0.4, -1.5); g.quadraticCurveTo(0.35, -2.1, 0.1, -2.24); g.closePath(); inkP(g); g.fillStyle = INK; g.beginPath(); g.arc(0, -1.45, 0.07, 0, TAU); g.fill(); },
    crate(g) { g.fillStyle = "#7A5A38"; g.beginPath(); g.rect(-0.4, -0.7, 0.8, 0.7); inkP(g); g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.36, -0.66); g.lineTo(0.36, -0.04); g.moveTo(0.36, -0.66); g.lineTo(-0.36, -0.04); g.stroke(); g.lineWidth = 0.028; },
    barrel(g) { g.fillStyle = "#6A4A2E"; g.beginPath(); g.moveTo(-0.3, 0); g.quadraticCurveTo(-0.4, -0.45, -0.3, -0.9); g.lineTo(0.3, -0.9); g.quadraticCurveTo(0.4, -0.45, 0.3, 0); g.closePath(); inkP(g);
      g.strokeStyle = "#2A2A2A"; g.lineWidth = 0.05; for (const y of [-0.2, -0.7]) { g.beginPath(); g.moveTo(-0.34, y); g.lineTo(0.34, y); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 0.028; },
    seats(g, k) { const n = k.n || 5, sd = k.side || 1;
      for (let i = 0; i < n; i++) { const x = sd * (-0.8 + i * 0.4) * -1; g.fillStyle = "#7A1E1E"; g.beginPath(); rr(g, x - 0.17, -0.85, 0.34, 0.55, 0.08); inkP(g); g.fillStyle = "#5A1414"; g.beginPath(); g.rect(x - 0.15, -0.32, 0.3, 0.32); inkP(g); }
      g.strokeStyle = GOLD; g.lineWidth = 0.02; g.beginPath(); g.moveTo(-0.97, -0.8); g.lineTo(0.97, -0.8); g.stroke(); g.strokeStyle = INK; },
    rope(g) { g.fillStyle = "#C49A42"; for (const x of [-0.5, 0.5]) { g.beginPath(); g.rect(x - 0.04, -0.95, 0.08, 0.95); inkP(g); g.beginPath(); g.arc(x, -0.98, 0.07, 0, TAU); inkP(g); }
      g.strokeStyle = INK; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-0.5, -0.85); g.quadraticCurveTo(0, -0.5, 0.5, -0.85); g.stroke(); g.strokeStyle = "#7A1E1E"; g.lineWidth = 0.06; g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; },
    pillar(g) { g.fillStyle = "#5A4A2A"; g.beginPath(); g.rect(-0.45, -4.8, 0.9, 4.8); inkP(g); g.fillStyle = "#C49A42"; for (const y of [-4.9, -0.2]) { g.beginPath(); g.rect(-0.55, y, 1.1, 0.2); inkP(g); }
      g.strokeStyle = "rgba(227,182,75,.4)"; g.lineWidth = 0.04; for (const x of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(x, -4.7); g.lineTo(x, -0.2); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 0.028; },
    filmcans(g) { for (const [y, x] of [[-0.12, 0], [-0.3, 0.05], [-0.48, -0.03], [-0.66, 0.02]]) { g.fillStyle = "#8A8E96"; g.beginPath(); g.ellipse(x, y, 0.4, 0.1, 0, 0, TAU); inkP(g); g.fillStyle = "#5A5E66"; g.beginPath(); g.ellipse(x, y, 0.12, 0.03, 0, 0, TAU); g.fill(); }
      g.strokeStyle = "#2A2A2A"; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0.4, -0.15); g.bezierCurveTo(0.6, 0, 0.3, 0.05, 0.5, 0.0); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; },
    popcorn(g) { g.fillStyle = "#A94332"; g.beginPath(); g.rect(-0.5, -1.1, 1.0, 1.1); inkP(g); g.fillStyle = "#F2E7C9"; for (let i = 0; i < 4; i++) g.fillRect(-0.44 + i * 0.26, -1.05, 0.12, 1.0);
      g.fillStyle = "rgba(230,240,255,.35)"; g.beginPath(); g.rect(-0.45, -1.75, 0.9, 0.65); inkP(g); g.fillStyle = "#F2E0A0"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(-0.35 + (i % 6) * 0.14, -1.2 - Math.floor(i / 6) * 0.12, 0.06, 0, TAU); g.fill(); }
      g.fillStyle = "#C49A42"; g.beginPath(); g.moveTo(-0.55, -1.75); g.lineTo(0, -1.9); g.lineTo(0.55, -1.75); g.closePath(); inkP(g); }
  };
  // light and life: what each glowing or moving kind does every frame (drawn in the prop's own scaled space, S px a metre)
  function propGlow(x, y, r, fl, rgb) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${0.34 * fl})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  function torchFlame(x, y, s, t, ph) {
    const f = 0.85 + 0.15 * Math.sin(t * 17 + ph * 9);
    ctx.fillStyle = "#E8893A"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.moveTo(x - 0.09 * s, y); ctx.quadraticCurveTo(x - 0.1 * s, y - 0.18 * s * f, x + Math.sin(t * 9 + ph) * 0.03 * s, y - 0.3 * s * f); ctx.quadraticCurveTo(x + 0.1 * s, y - 0.16 * s * f, x + 0.09 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFE08A"; ctx.beginPath(); ctx.ellipse(x, y - 0.08 * s, 0.035 * s, 0.07 * s * f, 0, 0, TAU); ctx.fill();
  }
  const PROP_LIFE = {
    torch(k, S, t) { const fl = 0.75 + 0.25 * Math.sin(t * 13 + k.ph * 9) * Math.sin(t * 4.1); propGlow(0, -1.55 * S, 1.5 * S, fl, "255,160,80"); torchFlame(0, -1.5 * S, S, t, k.ph); },
    jack(k, S, t) { const s = k.size || 1, fl = 0.7 + 0.3 * Math.sin(t * 11 + k.ph * 7) * Math.sin(t * 3.3); propGlow(0, -0.32 * S * s, 0.9 * S * s, fl, "255,190,80"); },
    lamppost(k, S, t) { const fl = 0.85 + 0.15 * Math.sin(t * 7 + k.ph * 5); propGlow(0, -2.75 * S, 1.8 * S, fl, "255,214,150"); },
    lantern(k, S, t) { const fl = 0.75 + 0.25 * Math.sin(t * 13 + k.ph * 9) * Math.sin(t * 4.1); propGlow(0.32 * S, -1.25 * S, 1.4 * S, fl, "255,200,110"); }
  };
