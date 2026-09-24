  // ── music: a slow music-box waltz in D minor (3/4) over a dark pad, with the odd theremin swoop.
  // On your last skull a heartbeat joins in.
  // Acts change the arrangement at the next barline: A is the plain waltz, B (the 3D half) adds a walking bass and
  // echoes, and a boss fight speeds up into an oom-pah-pah with a drum.
  const ACTS = { A: { bpm: 92 }, B: { bpm: 100, walk: true, echo: true }, boss: { bpm: 112, walk: true, drums: true } };
  let act = ACTS.A, actNext = ACTS.A, BEAT = 60 / 92, BAR = BEAT * 3, EIGHTH = BEAT / 2;
  const SONG = {
    // [bass note, triad] per bar
    chords: [
      [38, [62, 65, 69]], [36, [62, 65, 69]], [34, [62, 65, 70]], [33, [61, 64, 69]], [38, [62, 65, 69]], [31, [62, 67, 70]], [33, [61, 64, 67]], [38, [62, 65, 69]],
      [31, [62, 67, 70]], [38, [62, 65, 69]], [34, [62, 65, 70]], [33, [61, 64, 69]], [38, [62, 65, 69]], [34, [62, 65, 70]], [33, [61, 64, 67]], [38, [62, 65, 69]]
    ],
    // melody per bar: [start in eighths, note, length in eighths]
    melody: [
      [[0, 81, 2], [2, 77, 2], [4, 74, 2]], [[0, 76, 1], [1, 77, 1], [2, 79, 2], [4, 81, 2]], [[0, 82, 4], [4, 81, 2]], [[0, 79, 2], [2, 77, 2], [4, 76, 2]],
      [[0, 81, 2], [2, 86, 2], [4, 85, 2]], [[0, 82, 2], [2, 81, 1], [3, 79, 1], [4, 77, 2]], [[0, 76, 2], [2, 73, 2], [4, 76, 2]], [[0, 74, 6]],
      [[0, 86, 2], [2, 82, 2], [4, 79, 2]], [[0, 77, 2], [2, 81, 2], [4, 86, 2]], [[0, 86, 1], [1, 85, 1], [2, 82, 2], [4, 79, 2]], [[0, 85, 4], [4, 81, 2]],
      [[0, 77, 2], [2, 76, 2], [4, 74, 2]], [[0, 74, 2], [2, 77, 2], [4, 82, 2]], [[0, 81, 2], [2, 79, 2], [4, 76, 2]], [[0, 74, 6]]
    ]
  };
  // Voices are kept lean (≈16 oscillators per two-second bar) and every one is counted against the cap.
  function musicBox(f, t, len, v) {
    if (!room(true)) return;
    const dur = Math.max(1.2, len + 0.6), g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(musicBus);
    for (const [m, a] of [[1, 1], [2, 0.26]]) {
      const o = track(ac.createOscillator()), pg = ac.createGain(); o.type = "sine"; o.frequency.value = f * m; pg.gain.value = a;
      o.connect(pg); pg.connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function pad(triad, t, dur) { // one shared filter for the whole chord
    if (!room(true)) return;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.6); g.gain.setValueAtTime(0.022, t + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    lp.connect(g); g.connect(musicBus);
    for (const n of triad) { const o = track(ac.createOscillator()); o.type = "sawtooth"; o.frequency.value = mtof(n - 12); o.detune.value = (Math.random() - 0.5) * 12; o.connect(lp); o.start(t); o.stop(t + dur + 0.5); }
  }
  function pluck(f, t, dur, v) {
    if (!room(true)) return;
    const o = track(ac.createOscillator()), g = ac.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function theremin(t) {
    if (!room(true)) return;
    const notes = [69, 74, 73, 70, 69], step = 0.9, end = t + notes.length * step;
    const o = track(ac.createOscillator()), l = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(mtof(notes[0]), t);
    notes.forEach((n, i) => o.frequency.setTargetAtTime(mtof(n), t + i * step, 0.14));
    l.frequency.value = 5.6; lg.gain.value = 6; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.6); g.gain.setValueAtTime(0.045, end - 0.8); g.gain.linearRampToValueAtTime(0.0001, end);
    o.connect(g); g.connect(musicBus); o.start(t); l.start(t); o.stop(end + 0.1); l.stop(end + 0.1);
  }
  function thump(t, v) {
    if (!room(true)) return;
    const o = track(ac.createOscillator()), g = ac.createGain();
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.25);
  }
  function scheduleBar(i, t0, loop) {
    const now = ac.currentTime + SAFE, at = t => t >= now; // never start a note in the past (that bunches up and clicks)
    const [bass, triad] = SONG.chords[i];
    if (at(t0)) { pad(triad, t0, BAR + 0.2); pluck(mtof(bass + 12), t0, 1.1, 0.2); }
    for (const b of [1, 2]) if (at(t0 + b * BEAT)) for (const n of [triad[0], triad[2]]) pluck(mtof(n), t0 + b * BEAT, 0.26, 0.04);
    for (const [off, m, len] of SONG.melody[i]) if (at(t0 + off * EIGHTH)) musicBox(mtof(m), t0 + off * EIGHTH, len * EIGHTH, off === 0 ? 0.13 : 0.11);
    if (loop % 2 === 1 && i % 4 === 0 && at(t0)) musicBox(mtof(SONG.melody[i][0][1] + 12), t0 + 0.01, EIGHTH * 2, 0.05); // high echo on repeats
    if ((i === 0 || i === 8) && Math.random() < 0.45 && at(t0)) theremin(t0 + BEAT * 0.5);
    if (tension) for (const [dt, v] of [[0, 0.32], [0.22, 0.2], [BEAT * 1.5, 0.3], [BEAT * 1.5 + 0.22, 0.18]]) if (at(t0 + dt)) thump(t0 + dt, v);
    if (act.walk) for (const [b, st] of [[1, 7], [2, 12]]) if (at(t0 + b * BEAT)) pluck(mtof(bass + st + 12), t0 + b * BEAT, 0.3, 0.1);
    if (act.echo && at(t0 + EIGHTH * 5)) musicBox(mtof(triad[2] + 12), t0 + EIGHTH * 5, EIGHTH, 0.04);
    if (act.drums) {
      if (at(t0)) thump(t0, 0.3);
      for (const b of [1, 2]) if (at(t0 + b * BEAT)) noise(0.07, 0.035, "bandpass", 2600, null, 0, 1.2, { bus: musicBus, at: t0 + b * BEAT, low: true });
    }
  }
  function setAct(name) { actNext = ACTS[name] || ACTS.A; reelAct = name; reelWant(reelPick()); }
  // the recorded reel gets first refusal; the synth plays whenever the reel can't
  function musicStart() { if (!ac) return; if (reelStart()) synthStop(); else synthStart(); }
  function musicStop() { synthStop(); reelHush(); }
  function synthStart() {
    if (!ac || mus || reel.on) return;
    mus = { bar: 0, loop: 0, next: ac.currentTime + 0.4 };
    mus.timer = setInterval(musicTick, 100);
  }
  function synthStop() { if (!mus) return; clearInterval(mus.timer); mus = null; }
  function musicTick() {
    if (!mus || !ac || ac.state !== "running" || document.hidden) return;
    const now = ac.currentTime;
    if (mus.next < now - BAR) mus.next = now + 0.2; // fell well behind (tab slept): rejoin on a fresh bar
    while (mus.next < now + 1.0) {              // one second of look-ahead rides out main-thread hiccups
      if (act !== actNext) { act = actNext; BEAT = 60 / act.bpm; BAR = BEAT * 3; EIGHTH = BEAT / 2; }
      scheduleBar(mus.bar, mus.next, mus.loop);
      mus.bar++; if (mus.bar >= SONG.chords.length) { mus.bar = 0; mus.loop++; }
      mus.next += BAR;
    }
  }

  // ── public face of the audio engine
  const Sound = {
    init: audioInit, apply: audioApply,
    pullStart, pull, pullEnd, release: snapRelease, slack,
    flightStart, flightUpdate, flightStop,
    ...SFX, voice: VOICE,
    setTension(on) { tension = !!on; }, setAct, musicScene, sample: samplePlay,
    speak(text) {   // "Spoken" voice setting: the browser's own speech, pitched up into a cartoon
      try { if (!window.speechSynthesis || sandbox || !settings.sound) return; const u = new SpeechSynthesisUtterance(text); u.pitch = 1.7; u.rate = 1.12; u.volume = clamp(settings.sfx / 100, 0, 1); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
    },
    setPaused(p) {
      audioPaused = p; musicScene("pause", p);   // the reel plays its pause track
      if (!ac) return; const t = ac.currentTime;
      if (flight) flight.vol.gain.setTargetAtTime(0, t, 0.03);
      if (musicBus && settings.sound && !sandbox) musicBus.gain.setTargetAtTime((settings.music / 100) * 1.1 * (p && !reel.on ? 0.5 : 1), t, 0.2); // the synth ducks under the menu
    },
    suspend(hidden) { reelSuspend(hidden); if (!ac) return; if (hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {}); },
    level() { if (!analyser) return 0; analyser.getFloatTimeDomainData(meter); let s = 0; for (const v of meter) s += v * v; return Math.sqrt(s / meter.length); },
    debug() { return { context: ac ? ac.state : "none", ambience: !!amb, music: !!mus, stretch: !!stretch, flight: !!flight, tension, voices, limiterDb: comp ? comp.reduction : 0,
      samples: Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, typeof v === "string" ? v : "ready"])) }; }
  };
