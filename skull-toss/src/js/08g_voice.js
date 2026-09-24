  // ───────────────────────── Morty talks back ─────────────────────────
  // His name is Mortimer "Morty" Bones, and he has opinions. Every line is a string with an ID
  // (morty.<pool>.<nn> in src/strings/en.json), and the ID is also the voice-line ID: drop a recording in as
  // src/sfx/vo.<id>.mp3 and it plays instead of the mumble, one line at a time. A pool is dealt like a deck of
  // cards: shuffled, and no line comes round again until the whole pool has been said. Most lines wait out a
  // cooldown and a roll of the dice. The ones that matter always get said: a boss walking on, a piece of him coming
  // back, the offer of one more skull, a new reel. What he reaches for when you grab him depends on his mood: cocky
  // on a streak, nervous on the last skull, grumpy after misses, odd when he's cursed.
  const MORTY = { cooldown: 5, firstGrab: 1, grabChance: 0.38, perfect: 0.35, nearMiss: 0.3, bonk: 0.35, power: 0.6, hot: 0.6, last: 0.5, idleAfter: 12 };
  const voice = { text: "", id: "", t: -9, last: -99, said: 0, pool: "", bags: {}, quiet: 0, idleSaid: false, test: false };
  const mortyMuted = () => settings.voice === "off" || (sandbox && !voice.test);
  function mortyMood() {
    if (powerOn("cursed")) return "cursed";
    if (game.lives === 1) return "nervous";
    if (game.streak >= 5) return "cocky";
    if ((game.run.misses || 0) >= 2 && game.streak === 0) return "grumpy";
    return "chipper";
  }
  function dealLine(pool) {   // the next card off the pool's shuffled deck (never the line he just said)
    const ids = lineIds(`morty.${pool}.`); if (!ids.length) return null;
    let bag = voice.bags[pool];
    if (!bag || !bag.length) {
      bag = voice.bags[pool] = ids.slice();
      for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === voice.id) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    return bag.pop();
  }
  function sayLine(pool) {
    const id = dealLine(pool); if (!id) return null;
    const text = t(id);
    Object.assign(voice, { text, id, t: game.time, last: game.time, pool }); voice.said++;
    const read = () => { if (settings.voice === "spoken") Sound.speak(text); else Sound.babble(text); };
    if (SFX_EMBED && SFX_EMBED["vo." + id]) Sound.sample("vo." + id, read); else read();   // a recorded read, where there is one
    Telemetry.emit("morty_line", { id });
    return text;
  }
  // an event wants a line: priority ones always get said; the rest wait out the cooldown and roll the dice
  function mortySays(pool, { chance = 1, priority = false } = {}) {
    if (mortyMuted()) return null;
    if (!priority && (game.time - voice.last < MORTY.cooldown || Math.random() > chance)) return null;
    return sayLine(pool);
  }
  // called when you grab the skull: the first grab of a run always gets a line, then about one in three
  function skullGrabbed() {
    profile.grabs++; voice.quiet = game.time; voice.idleSaid = false;
    if (mortyMuted()) return null;
    const since = game.time - voice.last;
    if (voice.said > 0 && (since < 6 || Math.random() > MORTY.grabChance)) return null;
    const mood = mortyMood(), r = Math.random();
    let pool = "grab";
    if (boss && r < 0.5) pool = "boss." + boss.kind;
    else if (mood === "cursed" && r < 0.6) pool = "cursed";
    else if (mood === "nervous" && r < 0.6) pool = "last";
    else if (mood === "grumpy" && r < 0.4) pool = "missing";
    else if (mood === "cocky" && r < 0.4) pool = "hot";
    return sayLine(pool);
  }
  // how a throw went: a perfect, a near miss, a knock from something in the air, a streak, the last skull
  function mortyAfterThrow(kind, make) {
    if (make) {
      if (game.streak === 5 || game.streak === 10) return mortySays("hot", { chance: MORTY.hot });
      if (kind === "perfect") return mortySays("perfect", { chance: MORTY.perfect });
      return null;
    }
    if (game.lives === 1) return mortySays("last", { chance: MORTY.last });
    if (kind === "clank" || kind === "post") return mortySays("nearmiss", { chance: MORTY.nearMiss });
    if (["seed", "bat", "bone", "balloon", "pendulum"].includes(kind)) return mortySays("bonk", { chance: MORTY.bonk });
    return null;
  }
  // left waiting: once per lull, after twelve seconds without a throw
  function mortyIdle() {
    if (game.state !== "ready" || aim.active || paused || screen !== "play" || voice.idleSaid) return;
    if (game.time - Math.max(voice.quiet, voice.last) < MORTY.idleAfter) return;
    voice.idleSaid = true; mortySays("idle", { priority: true });
  }
  function drawSpeech(x, y, r) {
    if (!voice.text) return;
    const age = game.time - voice.t, life = 2.3;
    if (age < 0 || age > life) return;
    const pop = age < 0.18 ? easeOutBack(age / 0.18) : age > life - 0.2 ? (life - age) / 0.2 : 1;
    const fs = clamp(U * 0.036, 12, 16), maxW = Math.min(W * 0.6, fs * 13);
    ctx.save(); ctx.font = `800 ${fs}px ${UIFONT}`;
    const words = voice.text.split(" "), lines = []; let cur = "";
    for (const w of words) { const tryL = cur ? cur + " " + w : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; }
    lines.push(cur);
    const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), bw = tw + fs * 1.3, bh = lines.length * fs * 1.2 + fs * 0.8;
    let bx = x + r * 0.9, by = y - r * 1.6 - bh;
    bx = clamp(bx, 10, W - bw - 10); by = Math.max(H * 0.12, by);
    const cx = bx + bw / 2, cy = by + bh / 2, wob = Math.sin(twos(game.time) * 9) * 0.015;
    ctx.translate(cx, cy + bh / 2); ctx.rotate(wob); ctx.scale(pop, pop); ctx.translate(-cx, -(cy + bh / 2));
    ctx.fillStyle = "#FBF6E6"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath(); rr(ctx, bx, by, bw, bh, fs * 0.8);
    const tx = clamp(x + r * 0.2, bx + fs, bx + bw - fs);   // the tail points back at the skull
    ctx.moveTo(tx - fs * 0.35, by + bh - 1); ctx.lineTo(x + r * 0.15, y - r * 0.95); ctx.lineTo(tx + fs * 0.35, by + bh - 1);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FBF6E6"; ctx.fillRect(tx - fs * 0.33, by + bh - 3, fs * 0.66, 4);
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, cx, by + fs * 0.4 + fs * 0.6 + i * fs * 1.2));
    ctx.restore();
  }
