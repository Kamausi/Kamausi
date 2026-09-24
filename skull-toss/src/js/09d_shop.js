  // ───────────────────────── the Skull Vault ─────────────────────────
  // An old cartoon prop room: pick a shelf, tap an item, and the skull hops onto the pedestal wearing it.
  const shop = { cat: "skull", sel: null, slot: 0 };
  const CAT_LABEL = { skull: "Skulls", eyes: "Eyes", teeth: "Teeth", paint: "Paint jobs", hat: "Hats", aura: "Auras", trail: "Trails", impact: "Impacts", ring: "Rings", pole: "Ring poles", band: "Bands", aim: "Aim lines", reel: "Film reels", title: "Titles" };
  const fmt = n => n.toLocaleString("en-US");
  const starsText = it => "★".repeat(starsOf(it)) + "☆".repeat(4 - starsOf(it));
  const vault = { R: makeRig(), y: -140, vy: 0, ang: 0, spin: 0, parts: [], bursts: [], trail: [], loop: 0, nextHop: 0, nextReact: 0, react: null, reactUntil: 0, dragX: null };
  const previewLook = () => { const look = { ...cos }; if (shop.sel) look[shop.sel.kind] = shop.sel.id; return look; };

  // ── icons for the shelves
  function drawAimArc(c, x0, y0, x1, y1, sc, id, t) {
    const A = AIMS[id], n = 9;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 26 * sc;
      c.globalAlpha = A.ghost ? 0.4 + 0.4 * Math.sin(t * 6 - i * 0.6) : 1;
      aimDot(c, A, x, y, (2.8 - k) * sc, aimColorOf(A, i * 1.7, t), i);
    }
    c.globalAlpha = 1;
    c.strokeStyle = A.rainbow ? "#FFFFFF" : A.color; c.lineWidth = 1.4 * sc; c.beginPath(); c.arc(x1, y1, 5 * sc, 0, TAU); c.stroke();
  }
  function reelFrame(c, x, y, w, h, id, t) {
    c.fillStyle = INK; c.fillRect(x - w / 2, y - h / 2, w, h);
    const g = c.createLinearGradient(0, y - h * 0.4, 0, y + h * 0.4);
    const cols = { standard: ["#3A4A63", "#C7B488"], lost: ["#5A4630", "#D7C29A"], silent: ["#3B3B3B", "#CFCFCF"], techni: ["#2F5FA0", "#F0B040"], damaged: ["#4A3A2A", "#E6C79A"], ...REEL_FRAME }[id] || ["#333", "#ccc"];
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); c.fillStyle = g; c.fillRect(x - w * 0.36, y - h * 0.38, w * 0.72, h * 0.76);
    c.fillStyle = PAPER; for (let j = 0; j < 4; j++) { c.fillRect(x - w * 0.47, y - h * 0.42 + j * h * 0.24, w * 0.07, h * 0.12); c.fillRect(x + w * 0.4, y - h * 0.42 + j * h * 0.24, w * 0.07, h * 0.12); }
    drawSkull(c, x, y + h * 0.06, h * 0.2, { t, look: { ...cos, skull: id === "silent" ? "silver" : cos.skull }, face: faceFor("idle", t) });
    if (id === "lost" || id === "damaged") { c.fillStyle = "rgba(242,231,201,.6)"; c.fillRect(x - w * 0.12, y - h * 0.38, 1, h * 0.76); c.fillRect(x + w * 0.2, y - h * 0.38, 1, h * 0.76); }
    if (id === "damaged") { const gr = c.createRadialGradient(x + w * 0.2, y - h * 0.2, 0, x + w * 0.2, y - h * 0.2, h * 0.3); gr.addColorStop(0, "rgba(255,240,200,.9)"); gr.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = gr; c.fillRect(x - w / 2, y - h / 2, w, h); }
  }
  function drawItemIcon(canvas, kind, id) {
    const css = 60, d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = css * d; canvas.height = css * d;
    const c = canvas.getContext("2d"), k = (css / 52) * d; c.setTransform(k, 0, 0, k, 0, 0);
    drawItemArt(c, kind, id, 1.3);
  }
  // any Vault item drawn in a 52 × 52 box
  function drawItemArt(c, kind, id, t) {
    const look = { ...cos, [kind]: id };
    if (kind === "title") { const it = findItem("title", id) || { name: "" }; c.fillStyle = INK; c.fillRect(2, 18, 50, 18); c.fillStyle = MUSTARD; c.fillRect(0, 16, 50, 18); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(0, 16, 50, 18); c.fillStyle = INK; c.textAlign = "center"; c.textBaseline = "middle"; let fs = 9; c.font = `${fs}px ${DISPLAY}`; while (c.measureText(it.name).width > 46 && fs > 4) c.font = `${--fs}px ${DISPLAY}`; c.fillText(it.name, 25, 25.5); return; }
    if (kind === "skull" || kind === "paint") { const fl = kind === "skull" && (id === "flaming" || id === "space"); drawSkull(c, 26, 28 + (fl ? 5 : 0), fl ? 13.5 : 16.5, { t, look, face: faceFor("idle", t, { ly: -0.2 }) }); return; }
    if (kind === "eyes") { drawSkull(c, 26, 30, 20, { t, look: { ...look, skull: "bone", paint: "none" }, face: faceFor("idle", t, { lx: 0.3, ly: -0.2 }) }); return; }
    if (kind === "teeth") { drawSkull(c, 26, 25, 16, { t, look: { ...look, skull: "bone", paint: "none" }, face: faceFor("excited", t), jaw: 0.5 }); return; }
    if (kind === "ring") { drawRingShape(c, 26, 26, 15, 5, id, t); return; }
    if (kind === "band") {   // a little slingshot, strung with the band
      c.strokeStyle = "#6B4526"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(26, 49); c.lineTo(26, 31); c.lineTo(12, 11); c.moveTo(26, 31); c.lineTo(40, 11); c.stroke(); c.lineCap = "butt";
      drawBands(c, [[{ x: 12, y: 12 }, { x: 24, y: 36 }], [{ x: 40, y: 12 }, { x: 28, y: 36 }]], 5, 3, { color: "#A94332", outline: INK }, id, t);
      c.fillStyle = "#4A2F19"; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.ellipse(26, 37, 6, 3.5, 0, 0, TAU); c.fill(); c.stroke(); return;
    }
    if (kind === "aim") { drawAimArc(c, 8, 44, 42, 30, 1, id, 0); return; }
    if (kind === "reel") { reelFrame(c, 26, 26, 44, 34, id, t); return; }
    if (kind === "impact") { const I = IMPACTS[id], b = makeBurst(I.word, 26, 27, I, { scale: 0.78 }, 300); b.t = b.dur * 0.3; b.rot = -0.08; b.seed = 7; drawBurstList(c, [b], 120); return; }
    if (kind === "hat") { drawSkull(c, 26, 36, 14, { t, look: { ...cos, hat: id }, face: faceFor("idle", t, { ly: -0.2 }) }); drawHat(c, 26, 36, 14, 0, t, null, 1, id); return; }
    if (kind === "aura") { drawAura(c, 26, 29, 12, t, false, id); drawSkull(c, 26, 29, 12, { t, look: cos, face: faceFor("happy", t) }); drawAura(c, 26, 29, 12, t, true, id); return; }
    if (kind === "pole") { if (POLES[id] && POLES[id].hang) { drawRingShape(c, 26, 40, 9, 3.2, cos.ring, t); drawPole(26, 50, 52, 1.2, 14, id, c, t, 30.5); return; } drawRingShape(c, 26, 14, 9, 3.2, cos.ring, t); drawPole(26, 25, 50, 3.2, 14, id, c, t, 4.5); return; }
    if (kind === "trail") {
      const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push({ x: 6 + 34 * q, y: 44 - 30 * q - Math.sin(q * Math.PI) * 7, r: 3 + q * 4 }); }
      drawTrailPts(c, pts, id, 1, 0.3, t);
      const T = TRAILS[id]; if (T.emit) { const bits = []; for (let i = 0; i < 5; i++) spawnBit(T.emit, 12 + i * 6, 28 + ((i * 37) % 11), 6, bits); for (const p of bits) { p.x += (p.vx || 0) * 0.02; p.y += (p.vy || 0) * 0.02; c.globalAlpha = 0.9; drawBit(c, p); } c.globalAlpha = 1; }
      drawSkull(c, 42, 13, 7, { ang: 0.3, t, look: cos, face: faceFor("fear", t), jaw: 0.5 });
    }
  }

  // ── the pedestal preview
  $("previewCv").addEventListener("pointerdown", e => { vault.dragX = e.clientX; });
  window.addEventListener("pointermove", e => { if (vault.dragX == null) return; vault.spin += (e.clientX - vault.dragX) * 0.12; vault.dragX = e.clientX; });
  window.addEventListener("pointerup", () => { vault.dragX = null; });
  function vaultHop(v = -420) { vault.vy = v; kick(vault.R, 1.2, 0, Math.PI / 2, 300, 10); }
  function vaultStars(x, y, S) { for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; vault.parts.push({ kind: "star", x, y, vx: Math.cos(a) * S * 0.9, vy: Math.sin(a) * S * 0.9 - S * 0.3, rot: a, vr: 6, g: 0.6, a: 1, life: 0.7, max: 0.7, size: 4, color: i % 2 ? MUSTARD : CREAM }); } }
  function drawShopPreview(T, dt) {
    const cv = $("previewCv"), [c, r] = fitCanvas(cv); if (!r.width) return;
    const w = r.width, h = r.height, S = h * 1.6, look = previewLook(), kind = shop.cat, V = vault, R = V.R;
    cv.parentElement.dataset.reel = look.reel;
    const onStand = kind === "ring" || kind === "aim" || kind === "pole", flying = kind === "trail";
    const sr = h * (onStand ? 0.16 : 0.23), px = onStand ? w * 0.26 : w / 2, floor = h - h * 0.2 - sr * (SKULL_BOTTOM + 0.04);
    // pedestal
    if (!flying) {
      const pw = sr * 1.7, ph = h * 0.2, py = h - ph;
      c.fillStyle = INK; c.fillRect(px - pw / 2 - 2, py - 2, pw + 4, ph + 4);
      c.fillStyle = PAPER; c.fillRect(px - pw / 2, py, pw, ph); c.fillStyle = "rgba(23,19,15,.15)"; c.fillRect(px + pw * 0.2, py, pw * 0.3, ph);
      c.fillStyle = RED; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); rr(c, px - pw * 0.58, py - h * 0.05, pw * 1.16, h * 0.06, 4); c.fill(); c.stroke();
    }
    if (flying) {   // the skull loops the stage, trailing whatever is equipped or being tried on
      V.loop += dt; const q = V.loop * 1.9, x = w / 2 + Math.cos(q) * w * 0.33, y = h * 0.48 + Math.sin(q * 2) * h * 0.2, rr2 = sr * 0.75;
      V.trail.push({ x, y, r: rr2 }); while (V.trail.length > (TRAILS[look.trail].len || 14) * 1.4) V.trail.shift();
      drawTrailPts(c, V.trail, look.trail, 1, V.loop * 2, T);
      const TT = TRAILS[look.trail]; if (TT.emit && Math.random() < TT.rate * dt * 60) spawnBit(TT.emit, x, y, rr2, V.parts);
      const dir = Math.atan2(Math.cos(q * 2) * 2 * h * 0.2, -Math.sin(q) * w * 0.33);
      drawAura(c, x, y, rr2, T, false, look.aura); drawSkull(c, x, y, rr2, { ang: V.loop * 2.2, a: 1.12, dir, t: T, look, face: faceFor("fear", T), jaw: 0.55 }); drawAura(c, x, y, rr2, T, true, look.aura); drawHat(c, x, y, rr2, V.loop * 2.2, T, null, 1, look.hat, 1.12, dir);
    } else {
      V.trail.length = 0;
      V.vy += 2400 * dt; V.y += V.vy * dt;
      if (V.y >= 0) { if (V.vy > 160) { kick(R, clamp(1 - V.vy / 1300, 0.45, 0.85), 0, Math.PI / 2, 280, 7); if (kind === "impact") { const I = IMPACTS[look.impact]; V.side = -(V.side || 1); const bx = px + V.side * sr * 1.75; V.bursts.push(makeBurst(I.word, bx, floor - sr * 0.55, I, { scale: 0.8 }, S)); flourish(I.bits, px, floor + sr * 0.6, 0.7, V.parts, S * 0.6); } } V.y = 0; V.vy = V.vy > 160 ? -V.vy * 0.25 : 0; }
      if (V.y === 0 && V.vy === 0 && T > V.nextHop) { vaultHop(kind === "impact" ? -500 : -300); V.nextHop = T + (kind === "impact" ? 1.7 : 3 + Math.random() * 2); }
      if (T > V.nextReact && !V.react) { V.react = ["excited", "fear", "confused", "perfect", "deadpan", "happy"][(Math.random() * 6) | 0]; V.reactUntil = T + 0.9; V.nextReact = T + 2.4 + Math.random() * 1.6; }
      if (V.react && T > V.reactUntil) V.react = null;
      const quirk = SKINS[look.skull] && SKINS[look.skull].idle ? SKINS[look.skull].idle(T) : null;
      setMood(R, V.react || quirk || "idle", T);
      V.spin *= Math.max(0, 1 - dt * 4); V.ang += V.spin * dt; if (Math.abs(V.spin) < 0.3) V.ang *= Math.max(0, 1 - dt * 5);
      R.tiltT = 0.1 * Math.sin(T * 1.5); R.aT = 1 + 0.02 * Math.sin(T * 2.4);
      const f = faceFor(R.mood, T, { lx: 0.3 * Math.sin(T * 0.7), ly: -0.2, seed: 0.4 }); R.jawT = f.jawT; stepRig(R, dt);
      const sink = R.a < 1 ? sr * (1 - R.a) * 0.9 : 0;
      const sa = V.ang + R.tilt + (R.mood === "confused" ? 0.5 : 0), sy = floor + V.y + sink;
      drawAura(c, px, sy, sr, T, false, look.aura);
      drawSkull(c, px, sy, sr, { ang: sa, a: R.a, dir: R.dir, t: T, look, face: f, jaw: R.jaw });
      drawAura(c, px, sy, sr, T, true, look.aura); drawHat(c, px, sy, sr, sa, T, { lift: Math.max(0, -V.vy) * 0.0006, tilt: 0, spin: T * 6 }, 1, look.hat, R.a, R.dir);
      if (onStand) { const rx = w * 0.72, ry = h * 0.36, rr3 = h * 0.2; if (kind === "pole") drawPole(rx, ry + rr3 + h * 0.03, h * 0.92, h * 0.035, h * 0.4, look.pole, c, T, ry - rr3 - h * 0.02); drawRingShape(c, rx, ry, rr3, h * 0.06, look.ring, T); drawAimArc(c, px + sr * 0.9, floor - sr * 0.9, rx, ry, h / 90, look.aim, T); }
      if (kind === "title") {
        const txt = `${(profile.name || "Nameless soul").toUpperCase()} · ${(findItem("title", look.title) || {}).name || ""}`;
        let fs = Math.round(h * 0.085); c.font = `${fs}px ${DISPLAY}`; const raw = c.measureText(txt).width;
        if (raw > w * 0.86) { fs = Math.floor(fs * w * 0.86 / raw); c.font = `${fs}px ${DISPLAY}`; }
        const tw = c.measureText(txt).width + h * 0.2, by = h * 0.2;
        c.fillStyle = INK; c.fillRect(w / 2 - tw / 2 + 3, by + 3, tw, h * 0.14); c.fillStyle = MUSTARD; c.fillRect(w / 2 - tw / 2, by, tw, h * 0.14); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(w / 2 - tw / 2, by, tw, h * 0.14);
        c.fillStyle = INK; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, w / 2, by + h * 0.075);
      }
    }
    // this stage's own particles and bursts
    for (const p of V.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += h * 3 * dt * (p.g || 0); if (p.grow) p.size += p.grow * dt; if (p.vr) p.rot += p.vr * dt; }
    V.parts = V.parts.filter(p => p.life > 0);
    for (const p of V.parts) { c.globalAlpha = clamp(p.life / p.max, 0, 1) * (p.a == null ? 0.6 : p.a); drawBit(c, p); }
    c.globalAlpha = 1;
    for (const b of V.bursts) b.t += dt; V.bursts = V.bursts.filter(b => b.t < b.dur);
    drawBurstList(c, V.bursts, S);
  }

  // ── shelves
  function renderShop() {
    const kind = shop.cat, fresh = unseen(), grid = $("shopGrid"), list = CATALOG[kind].filter(it => seasonLookVisible(kind, it));   // (a past season's look shows only if it's yours: 07l_season.js)
    for (const b of $("catTabs").querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.cat === kind));
    $("catLabel").textContent = CAT_LABEL[kind];
    $("catCount").textContent = `${list.filter(it => canUse(kind, it)).length}/${list.length} ${kind === "title" ? "earned" : "owned"}`;
    grid.className = "grid" + (kind === "title" ? " rows" : "");
    grid.innerHTML = "";
    for (const it of list) {
      const usable = canUse(kind, it), on = cos[kind] === it.id, selected = shop.sel && shop.sel.kind === kind && shop.sel.id === it.id, rar = rarityOf(it);
      const b = document.createElement("button");
      b.type = "button"; b.dataset.kind = kind; b.dataset.id = it.id;
      b.className = "item " + (on ? "equipped" : usable ? "owned" : "locked") + (selected ? " selected" : "");
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", `${it.name} ${KIND_LABEL[kind]}, ${starsOf(it)} star ${STAR_NAME[starsOf(it)]}${on ? ", equipped" : usable ? ", owned" : it.souls ? `, ${fmt(it.souls)} Souls at the Soul Shop` : it.season ? `, ${t("season.vaultState", { n: SEASONS[it.season].n })}` : it.price ? `, ${fmt(it.price)} bones` : `, locked: ${REQ_TEXT[it.req[0]](it.req[1])}`}`);
      const state = on ? "Equipped" : usable ? (kind === "title" ? "Earned" : "Owned") : it.souls ? `<span class="price soul">◆ ${fmt(it.souls)}</span>` : it.season ? t("season.vaultState", { n: SEASONS[it.season].n }) : it.shop ? "Curio Cart" : it.price ? `<span class="price">${BONE_SVG}${fmt(it.price)}</span>` : `${fmt(Math.min(statNow(it.req[0]), it.req[1]))}/${fmt(it.req[1])}`;
      b.innerHTML = `<span class="stars r-${rar}" aria-hidden="true">${starsText(it)}</span>`;
      if (kind === "title") b.innerHTML += `<span class="t-name">${it.name}</span><span class="sub">${it.req ? REQ_TEXT[it.req[0]](it.req[1]) : it.season ? t("season.vaultState", { n: SEASONS[it.season].n }) : "Where everyone starts"}</span><span class="state">${state}</span>`;
      else { const cv = document.createElement("canvas"); b.appendChild(cv); b.insertAdjacentHTML("beforeend", `<span>${it.name}</span><span class="state">${state}</span>`); drawItemIcon(cv, kind, it.id); }
      if (!usable) b.insertAdjacentHTML("beforeend", '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-lock"/></svg>');
      if (it.shame || it.boss || it.shop || it.souls || it.season) b.insertAdjacentHTML("beforeend", `<span class="ribbon ${it.shame ? "shame" : it.boss ? "boss" : it.souls ? "soul" : it.season ? "season" : "shop"}">${it.shame ? "Shame" : it.boss ? "Boss" : it.souls ? "Souls" : it.season ? t("season.ribbon") : "Cart"}</span>`);
      if (fresh.includes(kind + ":" + it.id)) b.insertAdjacentHTML("beforeend", '<span class="new" aria-hidden="true"></span>');
      grid.appendChild(b);
    }
    renderBuybar(); renderOutfits();
  }
  // ── outfits: three saved looks (tap a slot to wear it, or to fill it when it's empty; Save look fills the chosen one)
  function renderOutfits() {
    const box = $("outfitSlots"); box.textContent = "";
    cos.outfits.forEach((o, i) => box.append(h("button", { type: "button", class: `slot${o ? " filled" : ""}${shop.slot === i ? " on" : ""}`, data: { outfit: i }, "aria-label": `Outfit ${i + 1}${o ? "" : ", empty"}` }, String(i + 1))));
  }
  const lookNow = () => Object.fromEntries(KINDS.map(k => [k, cos[k]]));
  function saveOutfit(i = shop.slot) { cos.outfits[i] = lookNow(); cos.updatedAt = Date.now(); persist(); renderOutfits(); Sound.ui("equip"); toast(`<b>Outfit ${i + 1}</b> saved`); }
  function wearOutfit(i) {
    const o = cos.outfits[i]; if (!o) return false;
    let n = 0; for (const [k, id] of Object.entries(o)) { const it = findItem(k, id); if (it && canUse(k, it) && cos[k] !== id) { cos[k] = id; n++; } }
    cos.updatedAt = Date.now(); applyCosmetics(); persist(); renderShop(); Sound.ui("equip"); vault.react = "excited";
    return n;
  }
  // Surprise me: something of yours from every shelf, picked at random
  function surpriseLook() {
    let n = 0;
    for (const k of KINDS) { const mine = CATALOG[k].filter(it => canUse(k, it)); if (mine.length < 2) continue; const it = mine[Math.floor(Math.random() * mine.length)]; if (it.id !== cos[k]) { cos[k] = it.id; n++; } }
    cos.updatedAt = Date.now(); applyCosmetics(); persist(); renderShop(); Sound.ui("equip");
    return n;
  }
  $("outfitSlots").addEventListener("click", e => { const b = e.target.closest("[data-outfit]"); if (!b) return; const i = +b.dataset.outfit; shop.slot = i; if (cos.outfits[i]) wearOutfit(i); else saveOutfit(i); renderOutfits(); });
  $("outfitSave").addEventListener("click", () => saveOutfit());
  $("surpriseBtn").addEventListener("click", () => surpriseLook());
  function renderBuybar() {
    const bar = $("buybar"), s = shop.sel, it = s && findItem(s.kind, s.id);
    if (!it || canUse(s.kind, it)) { bar.hidden = true; shop.sel = null; return; }
    bar.hidden = false;
    const need = (it.price || 0) - profile.bones, btn = $("buyBtn");
    $("buyName").textContent = s.kind === "title" ? it.name : `${it.name} ${KIND_LABEL[s.kind]}`;
    $("buyRar").textContent = `${starsText(it)} ${STAR_NAME[starsOf(it)]}`; $("buyRar").className = "rar-name t-" + rarityOf(it);
    $("buySub").textContent = it.shop ? "Only sold at Mort's Curio Cart" : it.req ? `${it.price ? "Or free: " : it.shame ? "Hall of Shame: " : it.boss ? "Boss prize: " : "Earn it: "}${REQ_TEXT[it.req[0]](it.req[1]).toLowerCase()} · ${fmt(Math.min(statNow(it.req[0]), it.req[1]))}/${fmt(it.req[1])}` : "Bones only · trying it on above";
    if (it.souls) { $("buySub").textContent = t("souls.vaultSub"); btn.disabled = false; btn.textContent = t("souls.visit"); return; }
    if (it.shop) { btn.disabled = false; btn.textContent = "Visit the Curio Cart"; return; }
    if (!it.price) { btn.disabled = true; btn.textContent = "Earned, not sold"; return; }
    btn.disabled = need > 0;
    btn.innerHTML = need > 0 ? `Need ${fmt(need)} more` : `Buy · ${fmt(it.price)}<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bone"/></svg>`;
  }
  function equip(kind, id) {
    const it = findItem(kind, id);
    if (!it || !canUse(kind, it)) return false;
    cos[kind] = id; cos.updatedAt = Date.now(); persist(1500); applyCosmetics(); Telemetry.emit("equip", { kind, id }); return true;
  }
  function celebrate() { const r = $("previewCv").getBoundingClientRect(); vaultHop(-520); vaultStars(r.width / 2, r.height * 0.45, r.height * 1.4); Sound.toon("boing"); }
  $("catTabs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.cat === shop.cat) return;
    shop.cat = b.dataset.cat; shop.sel = null; vault.y = -140; vault.vy = 0; vault.bursts = []; vault.parts = [];
    renderShop(); Sound.ui("tick"); b.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  $("shopGrid").addEventListener("click", e => {
    const b = e.target.closest(".item"); if (!b) return;
    const { kind, id } = b.dataset, it = findItem(kind, id);
    if (canUse(kind, it)) {
      shop.sel = null;
      if (cos[kind] !== id) { equip(kind, id); Sound.ui("equip"); celebrate(); }
      renderShop(); return;
    }
    shop.sel = shop.sel && shop.sel.id === id && shop.sel.kind === kind ? null : { kind, id };
    vault.y = -140; vault.vy = 0;   // BOING: it hops onto the pedestal wearing the item
    Sound.ui("tick"); renderShop();
  });
  $("buyBtn").addEventListener("click", () => {
    const s = shop.sel; if (!s) return;
    const it = findItem(s.kind, s.id);
    if (it.shop) { cart.sel = { kind: s.kind, id: s.id }; openSheet("store"); return; }
    if (it.souls) { openSheet("souls"); return; }   // (Soul items are the Soul Shop's: 09m_souls.js)
    if (buy(s.kind, s.id)) {
      equip(s.kind, s.id); shop.sel = null; Sound.sample("purchase", () => Sound.ui("buy")); buzz([8, 30, 8]); celebrate();
      toast(`<b>Bought</b> · ${it.name} ${KIND_LABEL[s.kind]}`); renderShop();
      for (const el of document.querySelectorAll(".bones")) bump(el);
    } else { Sound.ui("deny"); const btn = $("buyBtn"); btn.classList.remove("deny"); void btn.offsetWidth; btn.classList.add("deny"); }
  });

  // ───────────────────────── challenges: daily, weekly, monthly ─────────────────────────
  let chalTab = "daily";
  function renderChallenges() {
    const per = chalTab, d = ensurePeriod(per), P = PERIODS[per];
    for (const b of $("chalTabs").querySelectorAll("button")) { b.setAttribute("aria-selected", b.dataset.per === per); b.querySelector(".dot").hidden = !claimable(b.dataset.per); }
    $("chalWhat").textContent = P.label.toLowerCase();
    $("streakLine").hidden = profile.streakDays < 1; $("streakLine").textContent = t("streak.line", { n: profile.streakDays, next: 20 * Math.min(7, profile.streakDays + 1) });   // (v37)
    $("chalList").innerHTML = d.items.map((it, i) => {
      const def = chalDef(it.id), done = chalDone(it), have = Math.min(it.have, it.n), pct = Math.round((have / it.n) * 100);
      const show = v => it.id === "arcadeSecs" ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}` : fmt(v);
      const foot = it.claimed ? `<p class="k" style="margin:14px 0 0">Claimed · ${P.again}</p>`
        : done ? `<button class="btn primary sm" type="button" data-claim="${i}">Claim ${fmt(it.reward)} bones</button>` : "";
      return `<div class="chal ${per}${it.claimed ? " claimed" : done ? " done" : ""}"><div class="chal-top"><div class="chal-title">${def.text(it.n)}</div>`
        + `<div class="chal-reward">+${fmt(it.reward)}${BONE_SVG}</div></div>`
        + `<div class="chal-prog"><div class="bar"><i style="width:${pct}%"></i></div><span>${show(have)}/${show(it.n)}</span></div>${foot}</div>`;
    }).join("");
    tickChallenges();
  }
  function tickChallenges() {
    $("chalTimer").textContent = fmtCountdown(msToReset(chalTab));
    if (PERIOD_IDS.some(per => profile[per] && profile[per].day !== PERIODS[per].key())) { PERIOD_IDS.forEach(ensurePeriod); renderChallenges(); updatePips(); }
  }
  $("chalTabs").addEventListener("click", e => { const b = e.target.closest("[data-per]"); if (!b || b.dataset.per === chalTab) return; chalTab = b.dataset.per; Sound.ui("flick"); renderChallenges(); });
  $("chalList").addEventListener("click", e => {
    const b = e.target.closest("[data-claim]"); if (!b) return;
    const it = ensurePeriod(chalTab).items[+b.dataset.claim];
    if (claimChallenge(+b.dataset.claim, chalTab)) { Sound.ui("buy"); toast(`<b>+${fmt(it.reward)} bones</b> · ${PERIODS[chalTab].label.toLowerCase()} challenge claimed`); renderChallenges(); }
  });
