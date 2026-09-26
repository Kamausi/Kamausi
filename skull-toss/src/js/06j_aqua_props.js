  // ───────────────────────── the sea bed's scenery (v58): what grows, settles and lies about under water ─────────────────────────
  // Painted like the rest of the props (06d_props.js): ink-lined, flat colour, a lit edge, in metres with the foot at 0.
  // They stand on the track like any travel scenery (06g_travel.js), in the Drowned Theater and the Black Marsh. The
  // weed and the soft corals sway in the flow (06i_flow.js), a little, each on its own; nothing here collides.
  Object.assign(PROP_SPRITES, {
    "coral-fan": [1.4, 1.5, 0.7, 1.45], "coral-brain": [1.0, 0.7, 0.5, 0.65], "coral-branch": [1.3, 1.4, 0.65, 1.35], "rock-barnacle": [1.6, 1.0, 0.8, 0.95],
    seaweed: [0.9, 2.4, 0.45, 2.35], shells: [0.9, 0.35, 0.45, 0.3], "debris-flat": [2.0, 1.6, 1.0, 1.55], "column-ruin": [1.2, 3.4, 0.6, 3.35],
    "poster-wall": [1.8, 2.6, 0.9, 2.55], anemone: [0.7, 0.6, 0.35, 0.55], "sand-drift": [2.2, 0.4, 1.1, 0.35],
    "glow-fungus": [1.0, 0.9, 0.5, 0.85], "void-bloom": [0.9, 1.8, 0.45, 1.75], "void-thorn": [1.4, 1.3, 0.7, 1.25]   // (v58: the caves' and the Abyss's own growth)
  });
  const barnacles = (g, pts, r) => { g.fillStyle = "#C8C0A8"; for (const [x, y, s] of pts) { g.beginPath(); g.ellipse(x, y, r * s, r * s * 0.8, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#3A3428"; g.beginPath(); g.arc(x, y - r * s * 0.1, r * s * 0.35, 0, TAU); g.fill(); g.fillStyle = "#C8C0A8"; } };
  Object.assign(PROP_PAINT, {
    "coral-fan"(g) {   // a sea fan: a lattice spread like a hand, coral red, softened by the water
      g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(0, 0, 0.4, 0.06, 0, 0, TAU); g.fill();
      g.fillStyle = "#B8474A"; g.beginPath(); g.moveTo(-0.06, 0); g.bezierCurveTo(-0.7, -0.5, -0.66, -1.3, -0.1, -1.42); g.bezierCurveTo(0.4, -1.46, 0.72, -1.0, 0.6, -0.55); g.bezierCurveTo(0.5, -0.25, 0.2, -0.1, 0.06, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "rgba(60,14,20,.55)"; g.lineWidth = 0.022;
      for (let i = 0; i < 7; i++) { const a = -2.5 + i * 0.32; g.beginPath(); g.moveTo(0, -0.05); g.quadraticCurveTo(Math.cos(a) * 0.4, -0.5 + Math.sin(a) * 0.3, Math.cos(a) * 0.62, -0.75 + Math.sin(a) * 0.62); g.stroke(); }
      for (let r = 0.35; r < 1.3; r += 0.24) { g.beginPath(); g.ellipse(0, -0.05, r * 0.55, r, 0, Math.PI * 1.15, Math.PI * 1.9); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 0.03; g.fillStyle = "rgba(255,190,170,.3)"; g.beginPath(); g.ellipse(-0.18, -1.05, 0.12, 0.2, -0.4, 0, TAU); g.fill();
    },
    "coral-brain"(g) {   // a brain coral: a mound with its maze of grooves
      g.fillStyle = "#C89A4A"; g.beginPath(); g.moveTo(-0.46, 0); g.bezierCurveTo(-0.5, -0.6, 0.5, -0.64, 0.46, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "rgba(90,56,20,.6)"; g.lineWidth = 0.022;
      for (let i = 0; i < 5; i++) { g.beginPath(); const y = -0.08 - i * 0.085; for (let x = -0.38 + i * 0.05; x < 0.38 - i * 0.05; x += 0.06) g.lineTo(x, y + Math.sin(x * 40 + i) * 0.02); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 0.03; g.fillStyle = "rgba(255,230,170,.35)"; g.beginPath(); g.ellipse(-0.14, -0.34, 0.12, 0.06, -0.3, 0, TAU); g.fill();
    },
    "coral-branch"(g) {   // staghorn: stubby branches, forking, pale at the tips
      g.lineCap = "round";
      const br = (x, y, a, l, w, d) => { const x1 = x + Math.cos(a) * l, y1 = y + Math.sin(a) * l; g.strokeStyle = INK; g.lineWidth = w + 0.05; g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = d > 1 ? "#D07A5A" : "#EAB08A"; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke(); if (d > 0) { br(x1, y1, a - 0.45, l * 0.72, w * 0.72, d - 1); br(x1, y1, a + 0.4, l * 0.68, w * 0.72, d - 1); } };
      br(0, 0, -Math.PI / 2 - 0.15, 0.5, 0.13, 2); br(0.1, 0, -Math.PI / 2 + 0.5, 0.36, 0.1, 2); br(-0.1, 0, -Math.PI / 2 - 0.7, 0.32, 0.1, 1);
      g.strokeStyle = INK; g.lineWidth = 0.03;
    },
    "rock-barnacle"(g) {   // a rock grown over: barnacles, a weed beard, an anemone on top
      g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(0, 0, 0.78, 0.09, 0, 0, TAU); g.fill();
      g.fillStyle = "#4E5A5C"; g.beginPath(); g.moveTo(-0.76, 0); g.bezierCurveTo(-0.8, -0.5, -0.3, -0.86, 0.1, -0.8); g.bezierCurveTo(0.6, -0.74, 0.82, -0.36, 0.74, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(160,200,200,.22)"; g.beginPath(); g.ellipse(-0.18, -0.6, 0.34, 0.12, -0.2, 0, TAU); g.fill();
      g.lineWidth = 0.02; barnacles(g, [[-0.45, -0.3, 1], [-0.3, -0.5, 0.8], [0.35, -0.4, 1.1], [0.52, -0.2, 0.8], [0.1, -0.22, 0.7]], 0.07); g.lineWidth = 0.03;
      g.strokeStyle = "#3E6A3A"; g.lineWidth = 0.04; for (const x of [-0.6, -0.5, 0.6, 0.66]) { g.beginPath(); g.moveTo(x, -0.1); g.quadraticCurveTo(x + 0.08, 0.05, x - 0.02, 0.0); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 0.03; g.fillStyle = "#D86A8A"; for (let i = 0; i < 6; i++) { const a = -Math.PI + (i / 5) * Math.PI; g.beginPath(); g.ellipse(0.12 + Math.cos(a) * 0.1, -0.84 + Math.sin(a) * 0.08, 0.035, 0.08, a + Math.PI / 2, 0, TAU); g.fill(); g.stroke(); }
    },
    seaweed(g) {   // three fronds, ribbon-flat and ruffled at the edge
      for (const [x, h, c, lean] of [[-0.18, 2.2, "#3E6A3A", -0.25], [0.05, 2.35, "#557A3A", 0.2], [0.22, 1.7, "#2E5A36", 0.35]]) {
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 0.05, 0);
        for (let i = 1; i <= 8; i++) { const u = i / 8; g.lineTo(x + Math.sin(u * 5 + x * 9) * 0.12 + lean * u * u - 0.06 * (1 - u), -h * u); }
        for (let i = 8; i >= 0; i--) { const u = i / 8; g.lineTo(x + Math.sin(u * 5 + x * 9) * 0.12 + lean * u * u + 0.07 * (1 - u) + 0.02, -h * u); }
        g.closePath(); g.fill(); g.stroke();
      }
    },
    shells(g) {   // a scallop, a whelk, a starfish, a few pebbles: the floor's small change
      g.fillStyle = "#E8D2B0"; g.beginPath(); g.moveTo(-0.3, -0.02); g.arc(-0.3, -0.02, 0.12, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "rgba(90,60,30,.5)"; g.lineWidth = 0.015; for (let i = 1; i < 5; i++) { const a = Math.PI + (i / 5) * Math.PI; g.beginPath(); g.moveTo(-0.3, -0.02); g.lineTo(-0.3 + Math.cos(a) * 0.12, -0.02 + Math.sin(a) * 0.12); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 0.03;
      g.fillStyle = "#D98A3A"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.05 : 0.13; g.lineTo(0.12 + Math.cos(a) * r, -0.08 + Math.sin(a) * r * 0.6); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#B8A488"; g.beginPath(); g.ellipse(0.34, -0.05, 0.08, 0.05, 0.4, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#7A7468"; for (const [x, r] of [[-0.05, 0.035], [0.26, 0.03], [-0.42, 0.028]]) { g.beginPath(); g.ellipse(x, -0.02, r * 1.3, r, 0, 0, TAU); g.fill(); }
    },
    "debris-flat"(g) {   // a painted stage flat, broken and leaning, its sky scene gone green, half in the sand
      g.save(); g.rotate(-0.22);
      g.fillStyle = "#5A6A7A"; g.beginPath(); g.moveTo(-0.8, 0); g.lineTo(-0.8, -1.3); g.lineTo(-0.1, -1.42); g.lineTo(0.1, -1.1); g.lineTo(0.4, -1.3); g.lineTo(0.8, -0.9); g.lineTo(0.8, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#E8D8A8"; g.beginPath(); g.arc(-0.35, -0.92, 0.16, 0, TAU); g.fill();
      g.fillStyle = "rgba(60,110,70,.4)"; g.fillRect(-0.8, -0.35, 1.6, 0.35);
      g.strokeStyle = "#3A2A1C"; g.lineWidth = 0.06; g.beginPath(); g.moveTo(-0.75, -0.05); g.lineTo(0.75, -1.1); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.03;
      g.restore();
      g.fillStyle = "#C8B48A"; g.beginPath(); g.moveTo(-1.0, 0); g.quadraticCurveTo(0, -0.3, 1.0, 0); g.closePath(); g.fill();
    },
    "column-ruin"(g) {   // a fluted column snapped off, barnacled, a weed streaming from the break
      g.fillStyle = "#9A9486"; g.beginPath(); g.rect(-0.46, -0.26, 0.92, 0.26); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-0.32, -0.26); g.lineTo(-0.3, -3.0); g.lineTo(-0.1, -3.2); g.lineTo(0.06, -2.95); g.lineTo(0.2, -3.28); g.lineTo(0.32, -3.05); g.lineTo(0.32, -0.26); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "rgba(60,56,48,.5)"; g.lineWidth = 0.03; for (const x of [-0.18, -0.06, 0.06, 0.18]) { g.beginPath(); g.moveTo(x, -0.3); g.lineTo(x, -2.9); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 0.02; barnacles(g, [[-0.2, -0.6, 1], [0.15, -0.9, 0.9], [-0.1, -1.4, 0.8], [0.2, -2.1, 1], [-0.22, -2.5, 0.7], [0.05, -0.4, 0.8]], 0.07); g.lineWidth = 0.03;
      g.fillStyle = "#3E6A3A"; g.beginPath(); g.moveTo(-0.1, -3.1); g.quadraticCurveTo(0.5, -3.3, 0.6, -2.6); g.quadraticCurveTo(0.3, -2.9, 0.0, -2.95); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(210,220,210,.18)"; g.fillRect(-0.3, -3.0, 0.14, 2.74);
    },
    "poster-wall"(g) {   // a stretch of the auditorium wall with a playbill still on it, peeling, a crack full of weed
      g.fillStyle = "#6A4A44"; g.beginPath(); g.moveTo(-0.9, 0); g.lineTo(-0.9, -2.3); g.lineTo(-0.3, -2.5); g.lineTo(0.2, -2.35); g.lineTo(0.9, -2.55); g.lineTo(0.9, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#E3C27A"; g.beginPath(); g.rect(-0.5, -2.0, 0.9, 1.2); g.fill(); g.stroke();
      g.fillStyle = "#8A2A2A"; g.beginPath(); g.rect(-0.42, -1.92, 0.74, 0.22); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(-0.05, -1.35, 0.2, 0, TAU); g.fill(); g.fillStyle = "#E3C27A"; g.beginPath(); g.arc(-0.12, -1.4, 0.05, 0, TAU); g.arc(0.03, -1.4, 0.05, 0, TAU); g.fill();
      g.fillStyle = "#C8A868"; g.beginPath(); g.moveTo(0.4, -0.8); g.lineTo(0.2, -0.8); g.lineTo(0.38, -1.05); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "#2A1A18"; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0.6, -2.5); g.lineTo(0.5, -1.8); g.lineTo(0.66, -1.3); g.lineTo(0.55, -0.6); g.stroke();
      g.strokeStyle = "#3E6A3A"; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.52, -1.6); g.quadraticCurveTo(0.8, -1.7, 0.75, -1.4); g.moveTo(0.6, -1.0); g.quadraticCurveTo(0.85, -1.1, 0.82, -0.8); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 0.02; barnacles(g, [[-0.75, -0.3, 1], [-0.6, -0.5, 0.8], [0.7, -0.2, 0.9]], 0.06); g.lineWidth = 0.03;
    },
    anemone(g) {   // a clump of anemones, arms up
      g.fillStyle = "#6A3A5A"; g.beginPath(); g.ellipse(0, -0.12, 0.28, 0.12, 0, 0, TAU); g.fill(); g.stroke();
      for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; g.fillStyle = i % 2 ? "#E27A9A" : "#F2A0B8"; g.beginPath(); g.ellipse(Math.cos(a) * 0.2, -0.2 + Math.sin(a) * 0.22, 0.04, 0.16, a + Math.PI / 2, 0, TAU); g.fill(); g.stroke(); }
    },
    "sand-drift"(g) {   // a drift of sand heaped against something, rippled
      g.fillStyle = "#B8A47E"; g.beginPath(); g.moveTo(-1.1, 0); g.bezierCurveTo(-0.6, -0.4, 0.4, -0.38, 1.1, 0); g.closePath(); g.fill();
      g.strokeStyle = "rgba(90,74,50,.35)"; g.lineWidth = 0.02; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-0.7 + i * 0.1, -0.06 - i * 0.06); g.quadraticCurveTo(0, -0.12 - i * 0.07, 0.7 - i * 0.1, -0.06 - i * 0.06); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 0.03;
    },
      "glow-fungus"(g) {   // the caves' bioluminescent fungi: a cluster of caps on thin stems, lit from inside
      g.fillStyle = "rgba(120,255,220,.14)"; g.beginPath(); g.ellipse(0, -0.35, 0.55, 0.45, 0, 0, TAU); g.fill();
      for (const [x, h, r, c] of [[-0.25, 0.45, 0.16, "#5AE0C0"], [0.05, 0.7, 0.22, "#7AF0D0"], [0.28, 0.35, 0.13, "#48C8B0"], [-0.05, 0.25, 0.1, "#8AF8E0"]]) {
        g.strokeStyle = INK; g.lineWidth = 0.03; g.fillStyle = "#D8E8D0"; g.beginPath(); g.moveTo(x - 0.025, 0); g.quadraticCurveTo(x + 0.03, -h * 0.5, x, -h); g.lineTo(x + 0.03, -h); g.quadraticCurveTo(x + 0.06, -h * 0.5, x + 0.025, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = c; g.beginPath(); g.ellipse(x + 0.015, -h, r, r * 0.55, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + (i - 1) * r * 0.45, -h - r * 0.28, r * 0.08, 0, TAU); g.fill(); }
      }
    },
    "void-bloom"(g) {   // the Abyss's flowers: tall violet stalks with bulbs of cold light
      g.strokeStyle = INK; g.lineWidth = 0.035;
      for (const [x, h, lean] of [[-0.15, 1.5, -0.2], [0.08, 1.7, 0.1], [0.22, 1.1, 0.25]]) {
        g.strokeStyle = "#3A1E5A"; g.lineWidth = 0.06; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + lean * 0.3, -h * 0.5, x + lean, -h); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 0.03; g.fillStyle = "rgba(190,150,255,.25)"; g.beginPath(); g.arc(x + lean, -h, 0.16, 0, TAU); g.fill();
        g.fillStyle = "#B890FF"; g.beginPath(); g.ellipse(x + lean, -h, 0.08, 0.11, lean, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = "#F0E8FF"; g.beginPath(); g.arc(x + lean - 0.02, -h - 0.03, 0.025, 0, TAU); g.fill();
      }
    },
    "void-thorn"(g) {   // a thicket of black thorns coming up out of nothing
      g.fillStyle = "#140A20"; g.strokeStyle = "#6A48A8"; g.lineWidth = 0.025;
      for (const [x, h, a] of [[-0.4, 0.9, -0.35], [-0.1, 1.25, -0.08], [0.2, 1.05, 0.2], [0.45, 0.7, 0.45]]) {
        g.beginPath(); g.moveTo(x - 0.08, 0); g.quadraticCurveTo(x + a * 0.2, -h * 0.6, x + a * 0.5, -h); g.quadraticCurveTo(x + a * 0.2 + 0.04, -h * 0.55, x + 0.08, 0); g.closePath(); g.fill(); g.stroke();
        for (let k = 0.3; k < 0.9; k += 0.2) { const px = x + a * 0.5 * k * k, py = -h * k; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 0.12 * (k > 0.5 ? 1 : -1), py - 0.06); g.lineTo(px + 0.02, py - 0.05); g.closePath(); g.fill(); g.stroke(); }
      }
    }
  });
