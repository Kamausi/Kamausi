  // ───────────────────────── the skull talks back ─────────────────────────
  // His name is Mortimer "Morty" Bones, and now and then he says so.
  // Grab the skull and, now and then, it complains: a speech bubble plus a cartoon mumble (or the browser's own
  // voice, pitched up, if you pick "Spoken" in Settings). Never twice in a row, never every throw.
  const VOICE_LINES = {
    grab: ["Hey! What do you think you're doing?!", "Put me down!", "Not the face!", "Careful, I bruise easy!", "Oh no, not again…", "I just got my jaw back on!",
      "Watch the teeth!", "Is this a union job?", "My agent will hear about this!", "Wheee— wait, no!", "Aim for the hoop, not the tree!", "I'm too old for this. I'm like 300.",
      "Can we talk about this?!", "At least buy me dinner first!", "Mind the cranium!", "I get airsick!", "Again?! I'm still dizzy!", "Ooh! Ooh! Do a flip!",
      "Hands off the merchandise!", "Easy on the elastic!", "Somebody call my mummy!", "I had plans tonight!", "Do you even have a licence for this?", "Tell my bones I love them.",
      "It's MISTER Bones to you!", "Do you know who I am?! I'm Morty Bones!", "Mortimer Bones, professional projectile. Charmed.", "Call me Morty. Everybody does, right before they throw me."],
    last: ["Last skull! Don't blow it!", "No pressure, pal. None at all.", "This is fine. This is FINE."],
    crow: ["That bird's got my hoop!", "Beak off, featherbrain!", "Uh oh. Big bird."],
    pumpkin: ["Is that a PUMPKIN?!", "Somebody's getting carved.", "That's a lot of pie."],
    cursed: ["I feel… cursed-ish.", "Why is everything purple?!"],
    missing: ["Maybe aim this time?", "Are your eyes on backwards?", "I'm getting motion sick here."],
    hot: ["Now we're rolling!", "Did you see that?!", "Nothing but ring, baby!"]
  };
  const voice = { text: "", t: -9, last: -99, lastLine: "", said: 0, pool: "" };
  function sayLine(poolName) {
    const pool = VOICE_LINES[poolName].filter(l => l !== voice.lastLine);
    const text = pool[Math.floor(Math.random() * pool.length)];
    Object.assign(voice, { text, t: game.time, last: game.time, lastLine: text, pool: poolName }); voice.said++;
    if (settings.voice === "spoken") Sound.speak(text); else Sound.babble(text);
    return text;
  }
  // called when you grab the skull: the first grab of a run always gets a line, then about one in three
  function skullGrabbed() {
    profile.grabs++;
    if (settings.voice === "off" || sandbox && !voice.test) return null;
    const since = game.time - voice.last;
    if (voice.said > 0 && (since < 6 || Math.random() > 0.38)) return null;
    let pool = "grab";
    if (boss && boss.kind === "crow" && Math.random() < 0.5) pool = "crow";
    else if (boss && boss.kind === "pumpkin" && Math.random() < 0.5) pool = "pumpkin";
    else if (powerOn("cursed") && Math.random() < 0.6) pool = "cursed";
    else if (game.lives === 1 && Math.random() < 0.6) pool = "last";
    else if (game.run.misses >= 2 && game.streak === 0 && Math.random() < 0.4) pool = "missing";
    else if (game.streak >= 5 && Math.random() < 0.4) pool = "hot";
    return sayLine(pool);
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
