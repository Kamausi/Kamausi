  // ───────────────────────── the new maps' props (v44) ─────────────────────────
  // Laid out either side of the lane like the rest (never inside the blueprint's corridor), painted once per screen
  // size, bouncing on the beat. Each kind that a throw can hit has a reaction (the map sheet's interactions; the
  // reactions themselves are in 07n_environment.js).
  Object.assign(PROPSETS, {
    gilded(place, rnd) {
      banks(rnd, 4.5, 34, (x, z) => { const k = rnd(); place(k < 0.4 ? "stone" : k < 0.58 ? "cross" : k < 0.74 ? "urn" : k < 0.88 ? "obelisk" : "angel", x, z, { col: (rnd() * 4) | 0, pal: "gilded", tilt: (rnd() - 0.5) * 0.12, h: 0.8 + rnd() * 0.4, size: 0.9 + rnd() * 0.3 }); });
      for (const [x, z] of [[-6.8, 17], [7.4, 23], [-8.6, 29]]) place("mausoleum", x, z, { gold: true });
      for (const [x, z] of [[-3.3, 6.5], [3.4, 8.6], [-4.0, 13], [4.3, 16.5]]) place("angel", x, z, { size: 1.0 });
      for (const [x, z] of [[-4.2, 7.5], [4.4, 12], [-5.8, 20]]) place("lantern", x, z);
      for (let i = 0; i < 14; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 22, x = side * (2.5 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.6 + rnd() * 0.4 }); }
    },
    woods(place, rnd) {
      for (let z = 4.5; z < 38; z += 2.6) for (const side of [-1, 1]) place("tree", side * (3.2 + rnd() * 1.6 + z * 0.04), z + rnd(), { size: 1.1 + rnd() * 0.35 });
      for (let z = 7; z < 38; z += 4) for (const side of [-1, 1]) place("tree", side * (7 + rnd() * 3), z + rnd() * 2, { size: 1.2 + rnd() * 0.3 });
      for (const [x, z, sd] of [[-2.9, 5.5, 1], [3.1, 9.5, -1], [-3.4, 15, 1]]) place("signpost", x, z, { side: sd });
      for (const [x, z] of [[-3.8, 8], [4.0, 12.5], [-4.6, 19], [5.2, 24]]) place("log", x, z, { size: 0.9 + rnd() * 0.3 });
      for (let i = 0; i < 12; i++) { const side = rnd() < 0.5 ? -1 : 1; place("mushroom", side * (2.6 + rnd() * 3), 3.4 + rnd() * 20, { size: 0.6 + rnd() * 0.6 }); }
      for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 22, x = side * (2.5 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.7 + rnd() * 0.4 }); }
    },
    desert(place, rnd) {
      for (let i = 0; i < 16; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 4 + rnd() * 30; place("cactus", side * (3 + rnd() * (3 + z * 0.2)), z, { size: 0.8 + rnd() * 0.6 }); }
      for (const [x, z] of [[-5, 10], [6.2, 16], [-7.6, 26]]) place("ribcage", x, z);
      for (let i = 0; i < 10; i++) { const side = rnd() < 0.5 ? -1 : 1; place(rnd() < 0.5 ? "skullpile" : "rock", side * (2.7 + rnd() * 3.5), 4 + rnd() * 24, { size: 0.7 + rnd() * 0.6 }); }
      place("digger", -2.9, 12.5);
    },
    caves(place, rnd) {
      for (let z = 4.5; z < 34; z += 2.2) for (const side of [-1, 1]) if (rnd() < 0.7) place("stalagmite", side * (2.9 + rnd() * 2.4 + z * 0.05), z + rnd(), { size: 0.8 + rnd() * 0.8 });
      for (let z = 5; z < 34; z += 6) for (const side of [-1, 1]) place("lamppost", side * (3.1 + rnd() * 0.4), z + side * 1.2);
      for (const [x, z] of [[-5.6, 10], [6.2, 16], [-7, 23]]) place("gear", x, z, { size: 0.9 + rnd() * 0.5 });
      for (const [x, z] of [[3.2, 7], [-3.4, 18]]) place("minecart", x, z);
      place("bell", 9, 20);
      for (let i = 0; i < 8; i++) { const side = rnd() < 0.5 ? -1 : 1; place(rnd() < 0.5 ? "crate" : "barrel", side * (2.7 + rnd() * 3), 4 + rnd() * 20); }
    },
    abyss(place, rnd) {
      for (let i = 0; i < 14; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 4 + rnd() * 30; place("frame", side * (3 + rnd() * (3 + z * 0.2)), z, { size: 0.8 + rnd() * 0.6, lift: 0.8 + rnd() * 2.4 }); }
      for (let z = 2.4; z < 16; z += 2.2) for (const side of [-1, 1]) if (rnd() < 0.6) place("seatwreck", side * (2.9 + rnd() * 0.8), z, { side });
      for (const [x, z] of [[-9.5, 12], [9.5, 18], [-9.5, 26]]) place("pillar", x, z, { broken: true });
      place("filmcans", 2.7, 4.2); place("filmcans", -3.2, 9);
    }
  });
  STONE_PALS.gilded = [["#8E8672", "#C4B48A"], ["#7C7890", "#B0A07A"], ["#A09070", "#D8C08A"], ["#86806E", "#BCA878"]];
  Object.assign(PROP_SPRITES, {
    angel: [1.4, 2.4, 0.7, 2.35], urn: [0.8, 1.2, 0.4, 1.15], signpost: [1.8, 2.4, 0.9, 2.35], log: [2.2, 0.9, 1.1, 0.85], mushroom: [0.8, 0.8, 0.4, 0.75],
    cactus: [1.4, 2.4, 0.7, 2.35], rock: [1.2, 0.8, 0.6, 0.75], stalagmite: [1.0, 2.0, 0.5, 1.95], minecart: [1.6, 1.2, 0.8, 1.15], frame: [1.4, 1.2, 0.7, 1.1], seatwreck: [1.6, 1.0, 0.8, 0.95]
  });
  Object.assign(PROP_PAINT, {
    angel(g, k) { const s = k.size || 1, [b, l] = STONE_PALS.gilded[k.col || 0];   // a gilded angel on a plinth, hands clasped
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 0.5 * s, 0.08 * s, 0, 0, TAU); g.fill();
      g.fillStyle = b; g.beginPath(); g.rect(-0.32 * s, -0.5 * s, 0.64 * s, 0.5 * s); inkP(g);
      for (const sd of [-1, 1]) { g.fillStyle = l; g.beginPath(); g.moveTo(sd * 0.08 * s, -1.5 * s); g.quadraticCurveTo(sd * 0.62 * s, -2.1 * s, sd * 0.5 * s, -1.0 * s); g.quadraticCurveTo(sd * 0.3 * s, -1.2 * s, sd * 0.1 * s, -1.1 * s); g.closePath(); inkP(g); }
      g.fillStyle = b; g.beginPath(); g.moveTo(-0.22 * s, -0.5 * s); g.lineTo(-0.14 * s, -1.55 * s); g.lineTo(0.14 * s, -1.55 * s); g.lineTo(0.22 * s, -0.5 * s); g.closePath(); inkP(g);
      g.beginPath(); g.arc(0, -1.72 * s, 0.15 * s, 0, TAU); inkP(g);
      g.strokeStyle = "#E3B64B"; g.lineWidth = 0.04 * s; g.beginPath(); g.ellipse(0, -1.95 * s, 0.14 * s, 0.04 * s, 0, 0, TAU); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; },
    urn(g, k) { const s = k.size || 1;
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 0.35 * s, 0.06 * s, 0, 0, TAU); g.fill();
      g.fillStyle = "#C49A42"; g.beginPath(); g.moveTo(-0.14 * s, 0); g.lineTo(-0.1 * s, -0.12 * s); g.quadraticCurveTo(-0.38 * s, -0.5 * s, -0.16 * s, -0.84 * s); g.lineTo(-0.2 * s, -0.98 * s); g.lineTo(0.2 * s, -0.98 * s); g.lineTo(0.16 * s, -0.84 * s); g.quadraticCurveTo(0.38 * s, -0.5 * s, 0.1 * s, -0.12 * s); g.lineTo(0.14 * s, 0); g.closePath(); inkP(g);
      g.fillStyle = "rgba(255,240,190,.45)"; g.beginPath(); g.ellipse(-0.1 * s, -0.5 * s, 0.05 * s, 0.16 * s, 0, 0, TAU); g.fill(); },
    signpost(g, k) { const sd = k.side || 1;   // three arms, every one pointing somewhere you shouldn't go
      g.fillStyle = "#5A4232"; g.beginPath(); g.rect(-0.06, -2.2, 0.12, 2.2); inkP(g);
      for (const [y, dir, w] of [[-2.0, sd, 0.8], [-1.6, -sd, 0.7], [-1.25, sd, 0.6]]) { g.fillStyle = "#7A5A3A"; g.beginPath(); g.moveTo(0, y); g.lineTo(dir * w, y); g.lineTo(dir * (w + 0.14), y + 0.1); g.lineTo(dir * w, y + 0.2); g.lineTo(0, y + 0.2); g.closePath(); inkP(g);
        g.strokeStyle = "rgba(30,20,10,.6)"; g.lineWidth = 0.025; g.beginPath(); g.moveTo(dir * 0.12, y + 0.1); g.lineTo(dir * (w - 0.08), y + 0.1); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; } },
    log(g, k) { const s = k.size || 1;   // a hollow log: the wind goes in one end and comes out whistling
      g.fillStyle = "#4A3A28"; g.beginPath(); g.moveTo(-0.9 * s, -0.7 * s); g.lineTo(0.8 * s, -0.66 * s); g.lineTo(0.8 * s, 0); g.lineTo(-0.9 * s, 0); g.closePath(); inkP(g);
      g.fillStyle = "#6A5238"; g.beginPath(); g.ellipse(0.8 * s, -0.33 * s, 0.14 * s, 0.34 * s, 0, 0, TAU); inkP(g);
      g.fillStyle = "#140E08"; g.beginPath(); g.ellipse(0.8 * s, -0.33 * s, 0.08 * s, 0.24 * s, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(20,14,8,.5)"; g.lineWidth = 0.03; for (const y of [-0.5, -0.25]) { g.beginPath(); g.moveTo(-0.8 * s, y * s); g.lineTo(0.6 * s, (y + 0.02) * s); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 0.028; },
    mushroom(g, k) { const s = k.size || 1;
      g.fillStyle = "#E8DCC0"; g.beginPath(); g.rect(-0.06 * s, -0.4 * s, 0.12 * s, 0.4 * s); inkP(g);
      g.fillStyle = "#A94332"; g.beginPath(); g.ellipse(0, -0.42 * s, 0.3 * s, 0.18 * s, 0, Math.PI, 0); g.closePath(); inkP(g);
      g.fillStyle = CREAM; for (const [x, y] of [[-0.14, -0.5], [0.08, -0.54], [0.18, -0.46]]) { g.beginPath(); g.arc(x * s, y * s, 0.035 * s, 0, TAU); g.fill(); } },
    cactus(g, k) { const s = k.size || 1;
      g.fillStyle = "#4E7A42"; g.beginPath(); rr(g, -0.12 * s, -1.9 * s, 0.24 * s, 1.9 * s, 0.12 * s); inkP(g);
      for (const [sd, y, up] of [[-1, 0.8, 0.5], [1, 1.1, 0.4]]) { g.beginPath(); rr(g, sd < 0 ? -0.46 * s : 0.08 * s, -y * s, 0.38 * s, 0.16 * s, 0.08 * s); inkP(g); g.beginPath(); rr(g, sd < 0 ? -0.46 * s : 0.3 * s, -(y + up) * s, 0.16 * s, up * s + 0.1 * s, 0.08 * s); inkP(g); }
      g.strokeStyle = "rgba(20,40,20,.5)"; g.lineWidth = 0.02; g.beginPath(); g.moveTo(-0.04 * s, -1.8 * s); g.lineTo(-0.04 * s, -0.1 * s); g.moveTo(0.05 * s, -1.8 * s); g.lineTo(0.05 * s, -0.1 * s); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028;
      g.fillStyle = "#E86A8A"; g.beginPath(); g.arc(0, -1.92 * s, 0.07 * s, 0, TAU); inkP(g); },
    rock(g, k) { const s = k.size || 1; g.fillStyle = "#8A5A3A"; g.beginPath(); g.moveTo(-0.5 * s, 0); g.lineTo(-0.42 * s, -0.36 * s); g.lineTo(-0.1 * s, -0.55 * s); g.lineTo(0.3 * s, -0.46 * s); g.lineTo(0.52 * s, 0); g.closePath(); inkP(g);
      g.fillStyle = "rgba(255,210,160,.3)"; g.beginPath(); g.moveTo(-0.4 * s, -0.36 * s); g.lineTo(-0.1 * s, -0.53 * s); g.lineTo(0, -0.4 * s); g.closePath(); g.fill(); },
    stalagmite(g, k) { const s = k.size || 1; g.fillStyle = "#5A4A3E"; g.beginPath(); g.moveTo(-0.34 * s, 0); g.quadraticCurveTo(-0.14 * s, -0.8 * s, -0.03 * s, -1.8 * s); g.lineTo(0.05 * s, -1.75 * s); g.quadraticCurveTo(0.16 * s, -0.8 * s, 0.36 * s, 0); g.closePath(); inkP(g);
      g.strokeStyle = "rgba(255,210,150,.25)"; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.24 * s, -0.1 * s); g.quadraticCurveTo(-0.1 * s, -0.8 * s, -0.02 * s, -1.6 * s); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.028; },
    minecart(g) { g.fillStyle = "#5A4A3A"; g.beginPath(); g.moveTo(-0.65, -1.0); g.lineTo(0.65, -1.0); g.lineTo(0.5, -0.28); g.lineTo(-0.5, -0.28); g.closePath(); inkP(g);
      g.fillStyle = "#2A2420"; for (const x of [-0.34, 0.34]) { g.beginPath(); g.arc(x, -0.2, 0.18, 0, TAU); inkP(g); }
      g.fillStyle = "#3A342E"; for (const [x, y, r] of [[-0.3, -1.05, 0.14], [0.05, -1.12, 0.18], [0.35, -1.04, 0.13]]) { g.beginPath(); g.arc(x, y, r, Math.PI, 0); inkP(g); } },
    frame(g, k) { const s = k.size || 1;   // a film frame adrift in the dark, its picture long gone
      g.fillStyle = "#15121E"; g.beginPath(); g.rect(-0.6 * s, -1.05 * s, 1.2 * s, 0.9 * s); inkP(g);
      g.fillStyle = "rgba(210,190,255,.18)"; g.fillRect(-0.44 * s, -0.98 * s, 0.88 * s, 0.76 * s);
      g.fillStyle = "rgba(210,190,255,.4)"; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) g.fillRect(sd * 0.52 * s - 0.04 * s, (-0.98 + i * 0.2) * s, 0.08 * s, 0.1 * s); },
    seatwreck(g, k) { const sd = k.side || 1;   // a broken row of cinema seats, one tipped over
      for (let i = 0; i < 3; i++) { const x = sd * (-0.5 + i * 0.4) * -1; g.save(); g.translate(x, 0); if (i === 1) g.rotate(sd * 0.5); g.fillStyle = "#3A1A2A"; g.beginPath(); rr(g, -0.16, -0.8, 0.32, 0.52, 0.07); inkP(g); g.fillStyle = "#2A1420"; g.beginPath(); g.rect(-0.14, -0.3, 0.28, 0.3); inkP(g); g.restore(); } }
  });
  // the gilded mausoleum is the crypt, gold-leafed; the woods' trees stand taller; the abyss's frames float
  PROP_LIFE.frame = (k, S, t) => { ctx.translate(0, -(k.lift || 1) * S + Math.sin(t * 0.8 + k.ph * 6) * 0.08 * S); ctx.rotate(Math.sin(t * 0.5 + k.ph * 4) * 0.12); };
  PROP_LIFE.urn = (k, S, t) => { const fl = 0.6 + 0.4 * Math.sin(t * 2 + k.ph * 6); propGlow(-0.1 * S, -0.5 * S, 0.35 * S * (k.size || 1), fl * 0.6, "255,220,140"); };
