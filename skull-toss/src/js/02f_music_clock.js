  // ───────────────────────── the musical clock (v54) ─────────────────────────
  // The world moves to the music, not to a timer beside it. One clock, read from where the recorded track actually is
  // (its element's playback position, smoothed between the browser's updates) through the track's beat map (every beat's
  // time, src/audio/beats.json), gives the beat, the place in the beat, the bar and the phrase. Anything that moves to
  // the music asks it every frame: the pumpkins, the trees, the gravestones, the lanterns, the gravedigger. So a new song
  // needs only its beat map, and the scenery never drifts off the beat, even where a recording's tempo wanders.
  //   Nothing moves on every beat, and nothing in step with its neighbours: each kind has its own relation to the music
  //   (grass sways all the time, trees every two beats, a pumpkin hops on alternate beats, a gravestone settles once a
  //   bar, a lantern swings every two beats), each piece has its own phase and strength, and the phrase (four bars)
  //   changes who's busiest: bars 1–4 plain, 5–8 the birds, 9–12 the trees sway harder, 13–16 the gravedigger digs big.
  //   Where no track is playing (muted, still loading, a test) the clock runs free at the score's usual tempo on the
  //   world's own time, so the scenery still moves, and does it the same way every time.
  const FREE_BPM = 104;
  const MusicClock = { live: false, track: null, bpm: FREE_BPM, beat: 0, inBeat: 0, bar: 0, inBar: 0, phrase: 0, last: null, el: { t: -1, at: 0 } };
  const frac = v => v - Math.floor(v);
  function beatOf(map, t) {   // a time in a track → its beat (fractional), through the beat map
    const B = map.beats, p = 60 / map.bpm;
    if (t <= B[0]) return (t - B[0]) / p;
    let lo = 0, hi = B.length - 1;
    if (t >= B[hi]) return hi + (t - B[hi]) / p;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (B[m] <= t) lo = m; else hi = m; }
    return lo + (t - B[lo]) / (B[lo + 1] - B[lo]);
  }
  // the element's position between its updates (some browsers only move currentTime every few frames)
  function trackTime(el) {
    const now = performance.now() / 1000, E = MusicClock.el, t = el.currentTime;
    if (t !== E.t) { E.t = t; E.at = now; return t; }
    return t + Math.min(0.25, now - E.at) * (el.playbackRate || 1);
  }
  function musicClockUpdate(worldT) {
    const C = MusicClock, cur = reel.on && reel.cur, map = cur && MUSIC_BEATS[cur.name];
    let beat;
    if (map && cur.el && !cur.el.paused) { beat = beatOf(map, trackTime(cur.el)) - map.down; C.live = true; C.bpm = map.bpm; C.track = cur.name; }
    else { beat = worldT * FREE_BPM / 60; C.live = false; C.bpm = FREE_BPM; C.track = null; }
    C.beat = beat; C.inBeat = frac(beat); C.bar = Math.floor(beat / 4); C.inBar = frac(beat / 4); C.phrase = ((Math.floor(C.bar / 4) % 4) + 4) % 4;
    C.last = Math.floor(beat);
  }
  // how long until the next beat or bar, in seconds of the track (for handing one track over to the next on a boundary)
  function musicWaitTo(what) {
    const C = MusicClock, per = 60 / (C.bpm || FREE_BPM);
    return what === "bar" ? (1 - C.inBar) * 4 * per : (1 - C.inBeat) * per;
  }
  // a beat, on twos: the animation steps twelve times a second like the rest of the drawings, but lands on the music
  const beatTwos = () => { const C = MusicClock, step = (C.bpm / 60) / 12; return Math.floor(C.beat / step) * step; };
  const musicPulse = (sharp = 6) => Math.exp(-MusicClock.inBeat * sharp);   // 1 on the beat, falling away
  // the scenery's parts (06c_graveyard.js, 06g_travel.js): each asks for its own movement
  const Groove = {
    // a hop on alternate beats, half the pieces on the ones and threes and half on the twos and fours
    hop(ph) { const g = ph < 0.5 ? 0 : 1, b = ((beatTwos() - g) % 2 + 2) % 2, k = 0.7 + 0.3 * frac(ph * 7.3); return b < 0.36 ? -Math.sin((b / 0.36) * Math.PI) * k : 0; },
    // a sway over two beats (harder in the phrase where the trees have it)
    sway(ph) { return Math.sin(beatTwos() * Math.PI + ph * TAU) * (MusicClock.phrase === 2 ? 1.6 : 1); },
    // once a bar, on the downbeat: a small settle (only some pieces: the rest keep still)
    settle(ph) { if (ph < 0.6) return 0; const b = frac(beatTwos() / 4) * 4; return b < 0.3 ? Math.sin((b / 0.3) * Math.PI) : 0; },
    // a swing over two beats, lagging a little behind the sway
    swing(ph) { return Math.sin((beatTwos() - 0.25) * Math.PI + ph * 3); },
    busy: part => ({ birds: 1, trees: 2, digger: 3 })[part] === MusicClock.phrase
  };

  // ── the boss's music (v54): the boss track itself can't change, so the fight adds to it. Under half his strength a
  // low drum on every beat; under a quarter a quicker hat between the beats too. Scheduled from the clock, a little
  // ahead, on the music bus, so it sits in the song. When he goes down the music holds: on the next beat it drops
  // away under the knockout for a moment, then comes back.
  const bossBand = { next: null };
  function bossBandUpdate() {
    const C = MusicClock, cur = reel.cur;
    if (!ac || !C.live || C.track !== "boss" || !cur || !cur.el || !boss || boss.dead || !boss.max || !settings.music) { bossBand.next = null; return; }
    const k = boss.hp / boss.max; if (k > 0.5) { bossBand.next = null; return; }
    const per = 60 / C.bpm, ahead = 0.12, nextBeat = Math.floor(C.beat) + 1, dueIn = (nextBeat - C.beat) * per;
    if (dueIn > ahead || bossBand.next === nextBeat) return;
    bossBand.next = nextBeat; const at = ac.currentTime + dueIn, vol = (settings.music / 100) * 0.9;
    tone(95, "sine", 0.16, 0.34 * vol, 0, 42, { bus: musicBus, at });   // the drum
    if (nextBeat % 2 === 0) noise(0.05, 0.08 * vol, "bandpass", 180, 120, 0, 2, { bus: musicBus, at });
    if (k <= 0.25) noise(0.03, 0.05 * vol, "highpass", 7000, 9000, 0, 1, { bus: musicBus, at: at + per / 2 });   // the hat between
  }
  function musicHold() {   // the knockout's hold: on the next beat the music drops away, then comes back
    if (!ac || !musicBus || sandbox || !settings.sound) return;
    const wait = Math.min(0.6, musicWaitTo("beat")), g = musicBus.gain, t0 = ac.currentTime + wait, lvl = (settings.music / 100) * 1.1;
    g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(g.value, ac.currentTime); g.setValueAtTime(g.value, t0);
    g.linearRampToValueAtTime(lvl * 0.18, t0 + 0.08); g.setValueAtTime(lvl * 0.18, t0 + 1.3); g.linearRampToValueAtTime(lvl, t0 + 2.1);
  }

  // ───────────────────────── v57: the band: layers over the recording that come and go with the play ─────────────────────────
  // Short parts on the music clock, in the loop's own key (tools/beatmap.mjs), each coming in or dropping out on a bar
  // line: drive (three in a row), hats (on fire), heart (last skull), walk (the world moving, by the beat), bass (the
  // last eight hits before a boss), sting (a perfect). Only over the acts and the boss. docs/WORLD-SYSTEMS.md (The band).
  const BAND_SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const Band = { on: {}, n16: null, sting: [], dry: false, log: [] };
  const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
  function bandWant() {
    const W = {}; if (game.state === "title" || !inRun() || paused) return W;
    const M = typeof modeOf === "function" ? modeOf() : {}, track = MusicClock.track, boss = track === "boss";
    if (!boss && game.streak >= 3) W.drive = true;
    if (!boss && game.streak >= 6) W.hats = true;
    if (M.lives && !M.free && game.lives === 1) W.heart = true;
    if (TRAVEL.on && Math.abs(TRAVEL.v) > 0.4) W.walk = true;
    const h = game.stageHits || 0, near = (game.phase === "A" && h >= STAGE_MINI - 8 && h < STAGE_MINI) || (game.phase === "B" && h >= STAGE_BOSS - 8 && h < STAGE_BOSS);
    if (!boss && near && game.mode === "story") W.bass = true;
    return W;
  }
  function bandSting() { Band.sting = [0, 2, 4, 7]; }   // (called on a perfect: 07_game.js)
  function bandNote(deg, key, oct) { const sc = BAND_SCALE[key.mode] || BAND_SCALE.major; return oct + key.tonic + sc[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7); }
  function bandUpdate() {
    const C = MusicClock, dry = Band.dry, map = C.track && MUSIC_BEATS[C.track];
    const audible = !!(ac && C.live && settings.sound && settings.music && !sandbox && (C.track === "A" || C.track === "B" || C.track === "boss"));
    if (!audible && !dry) { Band.n16 = null; Band.on = {}; return; }
    const per = 60 / (C.bpm || FREE_BPM), ahead = 0.1, horizon = (C.beat + ahead / per) * 4, key = (map && map.key) || { tonic: 0, mode: "major" };
    if (Band.n16 == null || horizon - Band.n16 > 8 || horizon < Band.n16 - 1) Band.n16 = Math.floor(C.beat * 4);   // (a jump in the clock: pick up from here)
    while (Band.n16 + 1 <= horizon) {
      const i = ++Band.n16, due = (i / 4 - C.beat) * per; if (due < -0.03) continue;
      const pos = ((i % 16) + 16) % 16, at = (ac ? ac.currentTime : 0) + Math.max(0, due);
      if (pos === 0) { const W = bandWant(); Band.on = { ...W, walk: Band.on.walk }; }   // the bar line: layers come and go
      if (pos % 4 === 0) Band.on.walk = !!bandWant().walk;                               // (the walk follows the world, a beat at a time)
      const play = [];
      if (Band.on.drive && (pos === 0 || pos === 8)) play.push("drive");
      if (Band.on.hats && pos % 2 === 0) play.push("hats");
      if (Band.on.heart && (pos % 4 === 0 || pos % 4 === 1)) play.push("heart");
      if (Band.on.walk && pos % 4 === 2) play.push("walk");
      if (Band.on.bass && (pos === 0 || pos === 8)) play.push("bass");
      if (Band.sting.length && pos % 2 === 0) play.push("sting");
      if (!play.length) continue;
      if (dry) { Band.log.push({ i, pos, play }); if (Band.log.length > 200) Band.log.shift(); if (play.includes("sting")) Band.sting.shift(); continue; }
      const vol = (settings.music / 100) * 0.9, o = { bus: musicBus, at };
      for (const L of play) {
        if (L === "drive") { tone(62, "sine", 0.2, 0.26 * vol, 0, 40, o); noise(0.02, 0.05 * vol, "bandpass", 1800, null, 0, 3, o); }
        else if (L === "hats") noise(0.03, (pos % 4 === 2 ? 0.05 : 0.028) * vol, "highpass", 7600, null, 0, 1, o);
        else if (L === "heart") tone(pos % 4 === 0 ? 58 : 50, "sine", 0.13, (pos % 4 === 0 ? 0.3 : 0.18) * vol, 0, 36, o);
        else if (L === "walk") { tone(pos % 8 === 2 ? 900 : 700, "triangle", 0.045, 0.045 * vol, 0, null, { ...o, lp: 3000 }); noise(0.015, 0.03 * vol, "bandpass", 2500, null, 0, 6, o); }
        else if (L === "bass") tone(midiHz(bandNote(pos === 0 ? 0 : 4, key, 36)), "triangle", per * 1.7, 0.2 * vol, 0, null, { ...o, lp: 700, att: 0.01 });
        else if (L === "sting") { const d = Band.sting.shift(); tone(midiHz(bandNote(d, key, 72)), "triangle", per * 0.45, 0.06 * vol, 0, null, { ...o, lp: 4200 }); }
      }
    }
  }
