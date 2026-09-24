  // ───────────────────────── the new maps' scenery (v44) ─────────────────────────
  // The Gilded Graveyard's domes, the Whistling Woods' trunks, the Bone Desert's dunes, the Clockwork Caves' galleries
  // and the Black Abyss's floating frames: skylines, lanes, foreground frames and near props, in the same flat, inked,
  // painted-once style as the rest. The maps (src/maps/*.json) name them; the registry lists them.
  Object.assign(SKYLINES, {
    gilded(b, rnd, x0, x1, base, SIL) {   // domed mausoleums, angels and obelisks, their tops catching gold
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * (0.01 + 0.004 * Math.sin(x / U * 3.7)));
      const glint = (x, y, w) => { b.fillStyle = "rgba(227,182,75,.75)"; b.fillRect(x - w / 2, y, w, Math.max(1, U * 0.003)); b.fillStyle = SIL; };
      for (let x = x0 + rnd() * U * 0.04; x < x1; x += U * (0.06 + rnd() * 0.07)) {
        const y = HY - U * 0.008, k = rnd(), s = U * (0.045 + rnd() * 0.04);
        b.fillStyle = SIL;
        if (k < 0.42) {   // a domed mausoleum with a spire
          b.fillRect(x - s * 0.5, y - s * 0.62, s, s * 0.62); b.beginPath(); b.arc(x, y - s * 0.62, s * 0.4, Math.PI, 0); b.fill();
          b.fillRect(x - s * 0.03, y - s * 1.28, s * 0.06, s * 0.3); glint(x - s * 0.2, y - s * 0.98, s * 0.28); glint(x, y - s * 1.3, s * 0.1);
        } else if (k < 0.66) {   // an angel on a plinth, wings up
          b.fillRect(x - s * 0.18, y - s * 0.5, s * 0.36, s * 0.5); b.beginPath(); b.arc(x, y - s * 0.72, s * 0.08, 0, TAU); b.fill();
          b.beginPath(); b.moveTo(x - s * 0.1, y - s * 0.52); b.lineTo(x - s * 0.08, y - s * 0.66); b.lineTo(x + s * 0.08, y - s * 0.66); b.lineTo(x + s * 0.1, y - s * 0.52); b.fill();
          for (const sd of [-1, 1]) { b.beginPath(); b.moveTo(x + sd * s * 0.06, y - s * 0.62); b.quadraticCurveTo(x + sd * s * 0.34, y - s * 0.94, x + sd * s * 0.3, y - s * 0.5); b.fill(); }
          glint(x, y - s * 0.82, s * 0.12);
        } else if (k < 0.84) {   // an obelisk
          b.beginPath(); b.moveTo(x - s * 0.12, y); b.lineTo(x - s * 0.08, y - s * 1.6); b.lineTo(x, y - s * 1.8); b.lineTo(x + s * 0.08, y - s * 1.6); b.lineTo(x + s * 0.12, y); b.fill(); glint(x, y - s * 1.74, s * 0.08);
        } else { b.beginPath(); rr(b, x - s * 0.18, y - s * 0.5, s * 0.36, s * 0.5, s * 0.16); b.fill(); }   // a headstone
      }
      const gx = W / 2 + Math.min(W * 0.34, U * 0.72), gs = U * 0.13;   // the great gilded dome on the hill
      b.fillStyle = SIL; b.fillRect(gx - gs * 0.6, HY - gs * 0.8, gs * 1.2, gs * 0.8); b.beginPath(); b.arc(gx, HY - gs * 0.8, gs * 0.55, Math.PI, 0); b.fill();
      b.fillRect(gx - gs * 0.04, HY - gs * 1.7, gs * 0.08, gs * 0.4); glint(gx - gs * 0.25, HY - gs * 1.25, gs * 0.36); glint(gx, HY - gs * 1.72, gs * 0.12);
      litWindows(b, [[gx - gs * 0.35, HY - gs * 0.5], [gx + gs * 0.2, HY - gs * 0.5]], gs, "rgba(227,182,75,.8)");
    },
    woods(b, rnd, x0, x1, base, SIL) {   // tall black trunks, one after another, and the whistling tree with its holes
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * 0.006);
      const top = HY - U * 0.34;
      for (let x = x0 + rnd() * U * 0.02; x < x1; x += U * (0.028 + rnd() * 0.04)) {
        const w = U * (0.008 + rnd() * 0.014), h = U * (0.16 + rnd() * 0.2), lean = (rnd() - 0.5) * w * 1.5;
        b.fillStyle = SIL; b.beginPath(); b.moveTo(x - w, HY); b.lineTo(x - w * 0.55 + lean, Math.max(top, HY - h)); b.lineTo(x + w * 0.55 + lean, Math.max(top, HY - h)); b.lineTo(x + w, HY); b.fill();
        b.strokeStyle = SIL; b.lineCap = "round"; b.lineWidth = Math.max(1, w * 0.35);
        for (let i = 0; i < 3; i++) { const y = HY - h * (0.45 + rnd() * 0.45), sd = rnd() < 0.5 ? -1 : 1; b.beginPath(); b.moveTo(x + lean * 0.6, y); b.lineTo(x + lean * 0.6 + sd * U * (0.02 + rnd() * 0.03), y - U * (0.01 + rnd() * 0.02)); b.stroke(); }
      }
      const tx = W / 2 - Math.min(W * 0.3, U * 0.62), tw = U * 0.05;   // the whistling tree: holes the wind sings through
      b.fillStyle = SIL; b.beginPath(); b.moveTo(tx - tw * 1.4, HY); b.quadraticCurveTo(tx - tw, HY - U * 0.1, tx - tw * 0.8, top); b.lineTo(tx + tw * 0.8, top); b.quadraticCurveTo(tx + tw, HY - U * 0.1, tx + tw * 1.4, HY); b.fill();
      b.fillStyle = "rgba(190,240,210,.35)"; for (const [dx, dy, r] of [[-0.2, 0.12, 0.2], [0.25, 0.2, 0.16], [0, 0.28, 0.13]]) { b.beginPath(); b.ellipse(tx + dx * tw, HY - U * dy, tw * r, tw * r * 1.5, 0, 0, TAU); b.fill(); }
    },
    desert(b, rnd, x0, x1, base, SIL) {   // dunes, flat-topped mesas, and a giant's ribcage half under the sand
      const dune = x => HY - U * (0.012 + 0.012 * Math.sin(x / U * 2.1 + 0.7) + 0.006 * Math.sin(x / U * 5.3));
      for (const [mx, w, h] of [[-0.62, 0.34, 0.09], [0.55, 0.28, 0.12], [0.05, 0.2, 0.06]]) {   // mesas
        const cx = W / 2 + mx * Math.min(W * 0.9, U * 1.4), s = U;
        b.fillStyle = SIL; b.globalAlpha = 0.75; b.beginPath(); b.moveTo(cx - w * s * 0.6, HY); b.lineTo(cx - w * s * 0.42, HY - h * s); b.lineTo(cx + w * s * 0.4, HY - h * s); b.lineTo(cx + w * s * 0.6, HY); b.fill(); b.globalAlpha = 1;
      }
      b.fillStyle = SIL; ridge(b, x0, x1, base, dune);
      const rx = W / 2 + Math.min(W * 0.26, U * 0.5), rs = U * 0.1;   // the ribcage
      b.strokeStyle = SIL; b.lineCap = "round"; b.lineWidth = Math.max(2, rs * 0.08);
      b.beginPath(); b.moveTo(rx - rs * 1.2, dune(rx) - rs * 0.9); b.quadraticCurveTo(rx, dune(rx) - rs * 1.25, rx + rs * 1.3, dune(rx) - rs * 0.7); b.stroke();
      for (let i = 0; i < 6; i++) { const x = rx - rs * 1.0 + i * rs * 0.42, yT = dune(rx) - rs * (1.0 + Math.sin(i / 5 * Math.PI) * 0.2); b.beginPath(); b.moveTo(x, yT); b.quadraticCurveTo(x - rs * 0.35, dune(x) - rs * 0.4, x - rs * 0.05, dune(x) + 2); b.stroke(); }
      const sx = W / 2 - Math.min(W * 0.4, U * 0.8), ss = U * 0.06;   // a giant skull, sunk to the eyes
      b.fillStyle = SIL; b.beginPath(); b.arc(sx, dune(sx) + ss * 0.2, ss, Math.PI, 0); b.fill();
      b.fillStyle = "rgba(255,200,120,.25)"; for (const sd of [-1, 1]) { b.beginPath(); b.ellipse(sx + sd * ss * 0.38, dune(sx) - ss * 0.2, ss * 0.2, ss * 0.24, 0, 0, TAU); b.fill(); }
      b.fillStyle = SIL; for (let i = 0; i < 9; i++) { const x = x0 + rnd() * (x1 - x0), y = dune(x); b.fillRect(x - 1, y - U * (0.01 + rnd() * 0.02), 2, U * 0.02); if (rnd() < 0.5) b.fillRect(x - U * 0.006, y - U * 0.018, U * 0.012, 2); }   // cacti
    },
    caves(b, rnd, x0, x1, base, SIL) {   // the gallery's far wall: stalagmites, great gears in the rock, the lamps of the mine
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY - U * (0.03 + 0.02 * Math.sin(x / U * 3.3) + 0.012 * Math.sin(x / U * 8.1)));
      for (let x = x0 + rnd() * U * 0.03; x < x1; x += U * (0.03 + rnd() * 0.05)) {
        const h = U * (0.04 + rnd() * 0.12), w = U * (0.01 + rnd() * 0.015);
        b.beginPath(); b.moveTo(x - w, HY); b.lineTo(x - w * 0.2, HY - h); b.lineTo(x + w * 0.2, HY - h); b.lineTo(x + w, HY); b.fill();
      }
      const gx = W / 2 - Math.min(W * 0.32, U * 0.64), gr = U * 0.13;
      sceneFX.wheel = { kind: "gear", x: gx, y: HY - gr * 0.55, r: gr, col: SIL };
      const lamps = []; for (let i = 0; i < 7; i++) { const x = x0 + (i + 0.5) / 7 * (x1 - x0) + (rnd() - 0.5) * U * 0.1; lamps.push([x, HY - U * (0.05 + rnd() * 0.08)]); }
      for (const [x, y] of lamps) { const g = b.createRadialGradient(x, y, 0, x, y, U * 0.05); g.addColorStop(0, "rgba(255,190,110,.5)"); g.addColorStop(1, "rgba(255,190,110,0)"); b.fillStyle = g; b.beginPath(); b.arc(x, y, U * 0.05, 0, TAU); b.fill(); b.fillStyle = "#FFD890"; b.fillRect(x - 1.5, y - 1.5, 3, 3); }
    },
    abyss(b, rnd, x0, x1, base, SIL) {   // nothing but black, jagged rocks adrift, and broken film frames hanging in it
      b.fillStyle = SIL; ridge(b, x0, x1, base, x => HY + U * 0.004);
      for (let i = 0; i < 9; i++) {
        const x = x0 + rnd() * (x1 - x0), y = HY - U * (0.04 + rnd() * 0.26), s = U * (0.015 + rnd() * 0.03);
        b.fillStyle = SIL; b.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, r = s * (0.6 + rnd() * 0.6); b.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); } b.closePath(); b.fill();
      }
      for (let i = 0; i < 6; i++) {   // film frames, tilted, their pictures long gone
        const x = x0 + (i + 0.5) / 6 * (x1 - x0) + (rnd() - 0.5) * U * 0.1, y = HY - U * (0.08 + rnd() * 0.2), w = U * (0.05 + rnd() * 0.03), h = w * 0.75;
        b.save(); b.translate(x, y); b.rotate((rnd() - 0.5) * 0.9);
        b.fillStyle = "#15121E"; b.fillRect(-w / 2 - w * 0.18, -h / 2, w * 1.36, h);
        b.fillStyle = "rgba(200,180,255,.12)"; b.fillRect(-w / 2, -h / 2 + h * 0.1, w, h * 0.8);
        b.fillStyle = "rgba(200,180,255,.3)"; for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) b.fillRect(sd * (w / 2 + w * 0.09) - w * 0.03, -h / 2 + h * (0.15 + k * 0.3), w * 0.06, h * 0.12);
        b.restore();
      }
    }
  });

  Object.assign(LANES, {
    sand(b) {   // wind-rippled sand, a trodden strip down the middle and bleached bones along it
      const rnd = mulberry32(94); b.strokeStyle = "rgba(90,50,20,.22)"; b.lineWidth = 1.2;
      laneRows(0.4, 38, 0.7, z => { b.beginPath(); for (let x = -12; x <= 12; x += 0.8) { const p = projectBase(x, 0, z + Math.sin(x * 1.3 + z) * 0.12); x === -12 ? b.moveTo(p.x, p.y) : b.lineTo(p.x, p.y); } b.stroke(); });
      const pts = lanePts(0.9, 0.7, RING_Z + 3.5), g = b.createLinearGradient(0, pts[2].y, 0, pts[0].y);
      g.addColorStop(0, "rgba(255,220,160,0)"); g.addColorStop(1, "rgba(255,220,160,.16)"); lanePoly(b, pts, g);
      b.fillStyle = "rgba(240,230,210,.6)"; b.strokeStyle = "rgba(60,30,10,.5)"; b.lineWidth = 1;
      for (let i = 0; i < 16; i++) { const sd = rnd() < 0.5 ? -1 : 1, z = 1 + rnd() * 12, p = projectBase(sd * (1.2 + rnd() * 3), 0, z), s = 0.08 * p.s; b.save(); b.translate(p.x, p.y); b.rotate(rnd() * 3); b.beginPath(); rr(b, -s, -s * 0.15, s * 2, s * 0.3, s * 0.12); b.fill(); b.stroke(); b.restore(); }
    },
    rails(b) {   // the mine's rails, sleepers and all, running into the dark
      const pts = lanePts(0.95, 0.75, 30); lanePoly(b, pts, "rgba(40,30,22,.45)");
      b.strokeStyle = "rgba(20,14,10,.85)"; b.lineWidth = 2;
      laneRows(0.3, 30, 0.35, z => { const a = projectBase(-0.62, 0, z), c = projectBase(0.62, 0, z); b.beginPath(); b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.stroke(); });
      for (const sd of [-1, 1]) for (const [col, w] of [[INK, 4], ["#8A7A68", 2]]) { const p = projectBase(sd * 0.48, 0, 0.2), q = projectBase(sd * 0.48, 0, 30); b.strokeStyle = col; b.lineWidth = w; b.beginPath(); b.moveTo(p.x, p.y); b.lineTo(q.x, q.y); b.stroke(); }
      b.strokeStyle = "rgba(255,210,150,.25)"; b.lineWidth = 1; for (const sd of [-1, 1]) { const p = projectBase(sd * 0.47, 0, 0.2), q = projectBase(sd * 0.47, 0, 30); b.beginPath(); b.moveTo(p.x, p.y - 1); b.lineTo(q.x, q.y - 1); b.stroke(); }
    },
    void(b) {   // a strip of film laid over nothing, sprocket holes and all, glowing faintly
      const pts = lanePts(0.8, 0.62, 34); lanePoly(b, pts, "#0E0C14");
      b.strokeStyle = "rgba(180,140,255,.35)"; b.lineWidth = 1.5; b.beginPath(); b.moveTo(pts[0].x, pts[0].y); b.lineTo(pts[3].x, pts[3].y); b.moveTo(pts[1].x, pts[1].y); b.lineTo(pts[2].x, pts[2].y); b.stroke();
      b.fillStyle = "rgba(180,140,255,.28)";
      laneRows(0.3, 34, 0.3, z => { for (const sd of [-1, 1]) { const p = projectBase(sd * (0.7 - z * 0.005), 0, z), s = 0.05 * p.s; b.fillRect(p.x - s / 2, p.y - s * 0.3, s, s * 0.6); } });
      b.strokeStyle = "rgba(180,140,255,.12)"; laneRows(0.6, 34, 1.4, z => { const a = projectBase(-0.55, 0, z), c = projectBase(0.55, 0, z); b.beginPath(); b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.stroke(); });
    }
  });

  Object.assign(FOREGROUNDS, {
    ribs(B, S) {   // a giant's ribs arching in from both sides of the frame, bleached and cracked
      const side = sd => fgPlate(sd < 0 ? -B : W - S * 0.34, -B, S * 0.34 + B, H + 2 * B, b => {
        const ex = sd < 0 ? -B : W + B;
        for (let i = 0; i < 3; i++) {
          const y0 = H * (0.12 + i * 0.3), y1 = y0 + H * 0.2, reach = S * (0.2 - i * 0.03);
          b.lineWidth = S * (0.04 - i * 0.006); b.beginPath(); b.moveTo(ex, y0); b.quadraticCurveTo(ex - sd * reach * 1.3, (y0 + y1) / 2, ex - sd * reach * 0.4, y1); b.stroke();
        }
      });
      return [side(-1), side(1)];
    },
    stalactites(B, S) {   // the cave's roof: stalactites hanging into the top of the picture, a drip on the longest
      return [fgPlate(-B, -B, W + 2 * B, B + S * 0.3, b => {
        b.fillRect(-B, -B, W + 2 * B, B + S * 0.03);
        for (let x = -B; x < W + B; x += S * (0.035 + ((x * 7) % 5) * 0.01)) {
          if (x > W * 0.3 && x < W * 0.7 && ((x * 13) % 3) > 0.5) continue;   // (the middle, over the ring, stays mostly clear)
          const len = S * (0.04 + ((x * 17) % 11) / 11 * (x > W * 0.3 && x < W * 0.7 ? 0.05 : 0.2)), w = S * (0.012 + ((x * 3) % 5) * 0.004);
          b.beginPath(); b.moveTo(x - w, S * 0.02); b.lineTo(x, S * 0.02 + len); b.lineTo(x + w, S * 0.02); b.fill();
        }
      })];
    }
  });

  Object.assign(NEAR_SETS, {
    gilded: [["column", -1, 0.04, 0.5], ["stone", -1, 0.14, 1.4], ["lamp", 1, 0.05, 0.8], ["column", 1, 0.16, 2.2]],
    woods:  [["stump", -1, 0.05, 0.4], ["tuft", -1, 0.15, 1.3], ["stump", 1, 0.04, 0.9], ["tuft", 1, 0.14, 0.3]],
    desert: [["bone", -1, 0.06, 0.4], ["cactus", -1, 0.15, 1.4], ["stone", 1, 0.04, 0.8], ["cactus", 1, 0.17, 0.3]],
    caves:  [["stalagmite", -1, 0.05, 0.5], ["barrel", -1, 0.15, 1.3], ["lamp", 1, 0.05, 0.9], ["stalagmite", 1, 0.16, 0.3]],
    abyss:  [["seat", -1, 0.04, 0.5], ["bone", -1, 0.15, 1.4], ["column", 1, 0.05, 0.8], ["seat", 1, 0.15, 0.3]]
  });
