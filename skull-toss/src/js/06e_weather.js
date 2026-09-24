  // ───────────────────────── weather ─────────────────────────
  // Each map's air: falling leaves over the pumpkin patch, spores drifting up in the orchard, fireflies over the bayou,
  // confetti on the midway, rain on the belfry, and the projector's beam with dust turning in it at the picture house.
  // (The crypts' mist and the bayou's fog are the world's fog banks, thickened.) Pure background: it never touches
  // a throw. Screen-space bits are capped; reduced motion halves them.
  const WX = { kind: "none", bits: [], t: 0 };
  const WX_COUNT = { leaves: 26, spores: 40, fireflies: 24, confetti: 42, rain: 110, dust: 46, bubbles: 28, embers: 36 };
  function weatherReset() {
    WX.kind = look().weather; WX.bits = []; WX.t = 0;
    const n = Math.round((WX_COUNT[WX.kind] || 0) * (reduceMotion ? 0.5 : 1));
    for (let i = 0; i < n; i++) WX.bits.push(weatherBit(true));
  }
  const WX_CONFETTI = ["#A94332", "#F2E7C9", "#C49A42", "#356B68", "#66506B"], LEAVES = ["#C8642A", "#A94332", "#D8A040", "#8A5A2A"];
  function weatherBit(anywhere) {
    const k = WX.kind, x = Math.random() * W, y = anywhere ? Math.random() * H : -20;
    if (k === "leaves") return { x, y, vx: U * rand(0.05, 0.16), vy: U * rand(0.08, 0.16), rot: rand(0, TAU), vr: rand(-3, 3), s: U * rand(0.01, 0.018), col: LEAVES[(Math.random() * 4) | 0], ph: rand(0, TAU) };
    if (k === "spores") return { x, y: anywhere ? rand(HY * 0.5, H) : H + 10, vy: -U * rand(0.01, 0.04), s: rand(1, 2.4), ph: rand(0, TAU), a: rand(0.3, 0.8) };
    if (k === "fireflies") return { wx: rand(-7, 7), wz: rand(2, 22), wy: rand(0.3, 2.2), ph: rand(0, TAU), sp: rand(0.4, 1.1), dx: rand(-0.3, 0.3), dz: rand(-0.3, 0.3) };
    if (k === "confetti") return { x, y, vx: U * rand(-0.03, 0.03), vy: U * rand(0.06, 0.12), rot: rand(0, TAU), vr: rand(-6, 6), s: U * rand(0.006, 0.011), col: WX_CONFETTI[(Math.random() * 5) | 0] };
    if (k === "rain") return { x: rand(-W * 0.2, W), y: anywhere ? Math.random() * H : rand(-H * 0.3, 0), v: U * rand(2.2, 3), len: U * rand(0.03, 0.06) };
    if (k === "dust") return { u: Math.random(), v: Math.random(), du: rand(-0.02, 0.02), dv: rand(-0.015, 0.015), s: rand(0.8, 2), ph: rand(0, TAU) };
    if (k === "bubbles") return { x, y: anywhere ? rand(HY, H) : H + 10, vy: -U * rand(0.05, 0.12), s: rand(2, 6), ph: rand(0, TAU) };   // (the drowned theatre)
    if (k === "embers") return { x, y: anywhere ? Math.random() * H : H + 10, vx: U * rand(-0.02, 0.02), vy: -U * rand(0.03, 0.08), s: rand(1, 2.6), ph: rand(0, TAU) };   // (the abyss: the reel burning at its edges)
    return null;
  }
  // the projector's beam: from the booth behind you, over your head, narrowing to the screen
  function beamQuad() {
    const Sc = sceneFX.screen; if (!Sc) return null;
    return { tl: { x: W * 0.15, y: -H * 0.05 }, tr: { x: W * 0.85, y: -H * 0.05 }, br: { x: Sc.x + Sc.w * 0.46, y: Sc.y + Sc.h * 0.46 }, bl: { x: Sc.x - Sc.w * 0.46, y: Sc.y + Sc.h * 0.46 } };
  }
  function updateWeather(dt) {
    if (WX.kind === "none" || WX.kind === "mist") return;
    WX.t += dt; const wind = windNow();
    for (let i = 0; i < WX.bits.length; i++) {
      const b = WX.bits[i], k = WX.kind;
      if (k === "leaves") { b.x += (b.vx + wind * U * 0.25) * dt + Math.sin(WX.t * 2 + b.ph) * U * 0.03 * dt; b.y += b.vy * dt; b.rot += b.vr * dt; if (b.y > H + 20 || b.x > W + 30 || b.x < -30) WX.bits[i] = weatherBit(false); }
      else if (k === "spores") { b.y += b.vy * dt; b.x += Math.sin(WX.t * 0.7 + b.ph) * U * 0.01 * dt; if (b.y < HY * 0.35) WX.bits[i] = weatherBit(false); }
      else if (k === "fireflies") { b.wx += (b.dx + Math.sin(WX.t * b.sp + b.ph) * 0.2) * dt; b.wz += b.dz * dt; b.wy = clamp(b.wy + Math.cos(WX.t * b.sp * 1.3 + b.ph) * 0.15 * dt, 0.2, 2.6); if (Math.abs(b.wx) > 9 || b.wz < 1.5 || b.wz > 26) WX.bits[i] = weatherBit(true); }
      else if (k === "confetti") { b.x += b.vx * dt + Math.sin(WX.t * 3 + b.rot) * U * 0.02 * dt; b.y += b.vy * dt; b.rot += b.vr * dt; if (b.y > H + 10) WX.bits[i] = weatherBit(false); }
      else if (k === "rain") { b.y += b.v * dt; b.x += b.v * 0.18 * dt; if (b.y > H) WX.bits[i] = weatherBit(false); }
      else if (k === "dust") { b.u = (b.u + b.du * dt + 1) % 1; b.v = (b.v + b.dv * dt + 1) % 1; }
      else if (k === "bubbles") { b.y += b.vy * dt; b.x += Math.sin(WX.t * 2 + b.ph) * U * 0.015 * dt; if (b.y < HY * 0.6) WX.bits[i] = weatherBit(false); }
      else if (k === "embers") { b.y += b.vy * dt; b.x += b.vx * dt + Math.sin(WX.t * 1.3 + b.ph) * U * 0.01 * dt; if (b.y < -10) WX.bits[i] = weatherBit(false); }
    }
  }
  function drawWeather() {
    const k = WX.kind; if (k === "none" || k === "mist") return;
    ctx.save(); baseXform(ctx);
    if (k === "leaves") for (const b of WX.bits) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(b.rot * 1.3))); ctx.fillStyle = b.col; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-b.s, 0); ctx.quadraticCurveTo(0, -b.s * 0.7, b.s, 0); ctx.quadraticCurveTo(0, b.s * 0.7, -b.s, 0); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if (k === "spores") { for (const b of WX.bits) { ctx.globalAlpha = b.a * (0.6 + 0.4 * Math.sin(WX.t * 2 + b.ph)); ctx.fillStyle = "#DDF0A0"; ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, TAU); ctx.fill(); } }
    else if (k === "fireflies") { ctx.globalCompositeOperation = "lighter";
      for (const b of WX.bits) { const on = Math.max(0, Math.sin(WX.t * b.sp * 3 + b.ph)); if (on < 0.05) continue; const p = project(b.wx, b.wy, b.wz), r = Math.max(1.2, 0.03 * p.s);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5); g.addColorStop(0, `rgba(220,255,140,${0.6 * on})`); g.addColorStop(1, "rgba(220,255,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 5, 0, TAU); ctx.fill(); } }
    else if (k === "confetti") for (const b of WX.bits) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(1, Math.abs(Math.cos(b.rot * 2)) + 0.15); ctx.fillStyle = b.col; ctx.fillRect(-b.s, -b.s * 0.5, b.s * 2, b.s); ctx.restore(); }
    else if (k === "rain") { ctx.strokeStyle = "rgba(200,215,230,.45)"; ctx.lineWidth = 1.2; ctx.beginPath(); for (const b of WX.bits) { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.len * 0.18, b.y - b.len); } ctx.stroke(); }
    else if (k === "bubbles") { ctx.strokeStyle = "rgba(200,240,250,.55)"; ctx.lineWidth = 1.2; for (const b of WX.bits) { ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(b.x - b.s * 0.4, b.y - b.s * 0.5, Math.max(1, b.s * 0.3), Math.max(1, b.s * 0.3)); } }
    else if (k === "embers") { ctx.globalCompositeOperation = "lighter"; for (const b of WX.bits) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(WX.t * 4 + b.ph); ctx.fillStyle = b.ph > 3 ? "#C8A0FF" : "#FFB070"; ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, TAU); ctx.fill(); } }
    else if (k === "dust") {
      const Q = beamQuad();
      if (Q) {
        const g = ctx.createLinearGradient(0, 0, 0, Q.bl.y); g.addColorStop(0, `rgba(255,244,214,${0.07 * (0.8 + 0.2 * flashK())})`); g.addColorStop(1, "rgba(255,244,214,.02)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(Q.tl.x, Q.tl.y); ctx.lineTo(Q.tr.x, Q.tr.y); ctx.lineTo(Q.br.x, Q.br.y); ctx.lineTo(Q.bl.x, Q.bl.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,244,214,.7)";
        for (const b of WX.bits) { const top = { x: Q.tl.x + (Q.tr.x - Q.tl.x) * b.u, y: Q.tl.y }, bot = { x: Q.bl.x + (Q.br.x - Q.bl.x) * b.u, y: Q.bl.y };
          const x = top.x + (bot.x - top.x) * b.v, y = top.y + (bot.y - top.y) * b.v; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(WX.t * 1.5 + b.ph)); ctx.beginPath(); ctx.arc(x, y, b.s, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
