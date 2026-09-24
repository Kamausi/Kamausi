  // ───────────────────────── audio engine (all synthesised) ─────────────────────────
  // Buses: sfx / ambience (wind + creatures) / music → each also feeds a light "room" (three damped
  // feedback delays — far cheaper than a convolution reverb on phones) → safety limiter → out.
  // Glitch guards: a voice cap with priorities, every sound scheduled a hair ahead of "now" (starting
  // in the past clicks), and plenty of headroom so the limiter almost never has to squash anything.
  let ac = null, master, comp, analyser, meter, sfxBus, ambBus, musicBus, verbIn, noiseBuf, brownBuf;
  let stretch = null, flight = null, amb = null, mus = null, audioPaused = false, tension = false;
  let voices = 0;
  const SAFE = 0.015;              // schedule this far ahead of currentTime
  const VOICE_CAP = 56, LOW_CAP = 34; // background sounds give way first
  const sfxOn = () => ac && !sandbox && settings.sound && settings.sfx > 0;
  const ambOn = () => ac && !sandbox && settings.sound && settings.amb > 0 && ac.state === "running" && !document.hidden;
  const panOK = () => ac && typeof ac.createStereoPanner === "function";
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const room = (low) => voices < (low ? LOW_CAP : VOICE_CAP);
  function track(src) { voices++; src.onended = () => { voices = Math.max(0, voices - 1); }; return src; }

  // ── recorded sound effects (src/sfx/*.mp3, carried inside the page): the power-up grab, a purchase, an
  // achievement. Decoded once the audio starts; until then, or if one fails to decode, a synthesised stand-in plays.
  const SAMPLE_GAIN = { powerup: 2.5, purchase: 0.5, achievement: 2.2 };   // evens out how loud the three recordings are
  const samples = {};
  function samplesDecode() {
    if (!ac || typeof SFX_EMBED === "undefined" || !SFX_EMBED) return;
    for (const [name, b64] of Object.entries(SFX_EMBED)) {
      if (samples[name]) continue;
      samples[name] = "loading";
      try {
        const raw = atob(b64), bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const done = buf => { samples[name] = buf; }, fail = () => { samples[name] = "failed"; };
        const p = ac.decodeAudioData(bytes.buffer, done, fail); if (p && p.catch) p.catch(fail);
      } catch (e) { samples[name] = "failed"; }
    }
  }
  // play a recording (true), or the stand-in when it isn't ready (false)
  function samplePlay(name, fallback) {
    const buf = samples[name];
    if (!ac || !buf || typeof buf === "string") { if (fallback) fallback(); return false; }
    if (!sfxOn() || !room(false)) return true;
    const src = track(ac.createBufferSource()), g = ac.createGain();
    src.buffer = buf; g.gain.value = SAMPLE_GAIN[name] || 1; src.connect(g); g.connect(sfxBus);
    src.start(ac.currentTime + SAFE);
    return true;
  }

  function audioInit() {
    if (ac) { if (ac.state !== "running" && ac.state !== "closed" && !document.hidden) ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      try { ac = new AC({ latencyHint: "balanced" }); } catch (e) { ac = new AC(); }
      master = ac.createGain(); master.gain.value = 0.55;
      comp = ac.createDynamicsCompressor(); // safety limiter only: gentle, and rarely engaged
      comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ac.destination);
      analyser = ac.createAnalyser(); analyser.fftSize = 1024; meter = new Float32Array(analyser.fftSize);
      comp.connect(analyser); // side tap for level checks; not in the signal path
      verbIn = ac.createGain(); verbIn.gain.value = 0.5;
      const verbOut = ac.createGain(); verbOut.gain.value = 0.55; verbOut.connect(master);
      for (const [time, fb] of [[0.113, 0.42], [0.171, 0.37], [0.241, 0.32]]) {
        const d = ac.createDelay(1), f = ac.createBiquadFilter(), g = ac.createGain();
        d.delayTime.value = time; f.type = "lowpass"; f.frequency.value = 2400; g.gain.value = fb;
        verbIn.connect(d); d.connect(f); f.connect(g); g.connect(d); f.connect(verbOut);
      }
      const bus = send => { const b = ac.createGain(); b.gain.value = 0; b.connect(master); const s = ac.createGain(); s.gain.value = send; b.connect(s); s.connect(verbIn); b.send = s; return b; };
      sfxBus = bus(0.1); ambBus = bus(0.25); musicBus = bus(0.35);
      const sr = ac.sampleRate;
      noiseBuf = ac.createBuffer(1, sr * 2, sr);
      let d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      brownBuf = ac.createBuffer(1, sr * 6, sr);
      d = brownBuf.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const drift = d[d.length - 1] - d[0]; for (let i = 0; i < d.length; i++) d[i] -= drift * (i / d.length); // seamless loop
      audioApply();
      samplesDecode();
    } catch (e) { ac = null; }
  }
  function audioApply() { // settings → bus levels; loops only run while audible
    if (!ac) return;
    const t = ac.currentTime, on = settings.sound && !sandbox;
    sfxBus.gain.setTargetAtTime(on ? settings.sfx / 100 : 0, t, 0.04); sfxBus.send.gain.setTargetAtTime(0.1 * soundRoom(), t, 0.1);   // (a sound set can want a bigger room)
    ambBus.gain.setTargetAtTime(on ? (settings.amb / 100) * 0.6 : 0, t, 0.25);
    musicBus.gain.setTargetAtTime(on ? (settings.music / 100) * 1.1 * (audioPaused && !reel.on ? 0.5 : 1) : 0, t, 0.3);   // the synth ducks under the pause menu; the reel has a pause track of its own
    if (on && settings.amb > 0) ambStart(); else ambStop();
    if (on && settings.music > 0) musicStart(); else musicStop();
  }
  function out(pan, bus) {
    const b = bus || sfxBus;
    if (!pan || !panOK()) return b;
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(b); return p;
  }
  function env(g, t, peak, dur, att = 0.006) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dur);
  }
  // one-shot oscillator. o: {pan, bus, att, vib:[hz,depth], lp, at (absolute start time), low (background priority)}
  function tone(f, type, dur, peak, when = 0, slide, o = {}) {
    if (!ac || (!o.bus && !sfxOn()) || !room(o.low)) return;
    if (!o.bus || o.bus === sfxBus) ({ f, type, dur, peak, slide, o } = soundShape(f, type, dur, peak, slide, o));   // the sound set (02e_audio_sets.js)
    const t = Math.max(o.at != null ? o.at : 0, ac.currentTime + SAFE + when), osc = track(ac.createOscillator()), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + (o.att || 0.006) + dur);
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.3); }
    let node = osc;
    if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
    env(g, t, peak, dur, o.att); node.connect(g); g.connect(out(o.pan, o.bus));
    osc.start(t); osc.stop(t + (o.att || 0.006) + dur + 0.05);
  }
  function noise(dur, peak, type, f0, f1, when = 0, q = 1, o = {}) {
    if (!ac || (!o.bus && !sfxOn()) || !room(o.low)) return;
    if (!o.bus || o.bus === sfxBus) { const S = soundShape(f0, "sine", dur, peak, f1, o); f0 = S.f; f1 = S.slide; dur = S.dur; peak = S.peak; if (S.o.lp && type === "lowpass") f0 = Math.min(f0, S.o.lp); }
    const t = Math.max(o.at != null ? o.at : 0, ac.currentTime + SAFE + when), s = track(ac.createBufferSource()), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = o.brown ? brownBuf : noiseBuf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, dur, o.att); s.connect(f); f.connect(g); g.connect(out(o.pan, o.bus));
    s.start(t, Math.random() * 1.5); s.stop(t + (o.att || 0.006) + dur + 0.05);
  }
  const stopAt = (nodes, t) => nodes.forEach(n => { try { n.stop(t); } catch (e) {} });

  // ── slingshot: leather grab, then short rubber creaks that fire ONLY while the band is moving
  // (no sustained tone, so nothing hums or oscillates while you hold still), ratchet clicks each
  // tenth of the draw, and a snap + twang on release.
  function pullStart() {
    if (!sfxOn()) return;
    stretch = { last: 0, acc: 0, step: 0, lastGrain: 0 };
    noise(0.05, 0.3, "bandpass", 1500, 900, 0, 3);
    tone(420, "triangle", 0.05, 0.12, 0, 640);
  }
  function pull(tn) {
    if (!stretch || !ac || audioPaused) return;
    const s = stretch, d = tn - s.last, now = ac.currentTime;
    s.last = tn; s.acc += Math.abs(d);
    if (s.acc > 0.028 && now - s.lastGrain > 0.04) {
      const k = clamp(s.acc / 0.07, 0.45, 1), up = d >= 0, f = 520 + tn * 1500 + rand(-50, 50), lo = 90 + tn * 150;
      s.acc = 0; s.lastGrain = now;
      noise(0.045, 0.5 * k, "bandpass", f, f * (up ? 1.3 : 0.78), 0, 6);           // rubber squeak
      tone(lo, "triangle", 0.055, 0.24 * k, 0, lo * (up ? 1.18 : 0.85), { lp: 1400 }); // body of the band
    }
    const step = Math.floor(tn * 10);
    if (step !== s.step) { // ratchet click each tenth of the draw
      const up = step > s.step; s.step = step;
      tone(up ? 1250 + step * 110 : 900 + step * 70, "square", 0.016, up ? 0.14 : 0.08, 0, null, { lp: 3600 });
      noise(0.014, up ? 0.24 : 0.12, "bandpass", 3200, null, 0, 4);
      if (step >= 10 && up) tone(2500, "sine", 0.08, 0.1);
    }
  }
  function pullEnd() { stretch = null; }
  function snapRelease(power) {
    pullEnd();
    noise(0.08, 0.5 + power * 0.15, "lowpass", 2800, 450, 0, 1);            // rubber slap
    tone(150 + power * 70, "sine", 0.14, 0.42, 0, 55);                      // thump
    tone(190 + power * 60, "triangle", 0.3, 0.22 + power * 0.08, 0.005, 88, { vib: [15, 6] }); // twang
  }
  function slack() { pullEnd(); tone(240, "triangle", 0.16, 0.12, 0, 150); }

  // ── flight: a tumbling whoosh that follows the skull (pan, distance, spin); updated ~20×/s, not every frame
  function flightStart() {
    flightStop(true);
    if (!sfxOn()) return;
    const t = ac.currentTime + SAFE;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.value = 1400;
    const am = ac.createGain(); am.gain.value = 0.75;
    const lfo = ac.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 6;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.22;
    const vol = ac.createGain(); vol.gain.setValueAtTime(0.0001, t); vol.gain.exponentialRampToValueAtTime(0.7, t + 0.04);
    lfo.connect(lfoG); lfoG.connect(am.gain);
    src.connect(bp); bp.connect(am); am.connect(vol);
    let pan = null;
    if (panOK()) { pan = ac.createStereoPanner(); vol.connect(pan); pan.connect(sfxBus); } else vol.connect(sfxBus);
    src.start(t, Math.random()); lfo.start(t);
    flight = { src, bp, lfo, vol, pan, upd: 0 };
  }
  function flightUpdate(speed, dist, x, spin, lvl) {
    if (!flight || !ac) return;
    const f = flight, t = ac.currentTime;
    if (t - f.upd < 0.05 && lvl > 0) return; f.upd = t;
    const near = 1 / (1 + Math.max(0, dist - 3) * 0.3);
    f.vol.gain.setTargetAtTime(audioPaused ? 0 : 0.85 * clamp(speed / 9, 0.15, 1.2) * near * lvl, t, 0.06);
    f.bp.frequency.setTargetAtTime(300 + speed * 70 * near + 700 * near, t, 0.08);     // pitch falls away as it recedes
    f.lfo.frequency.setTargetAtTime(clamp((Math.abs(spin) / TAU) * 2, 2, 14), t, 0.1);  // gentle wub per half-turn
    if (f.pan) f.pan.pan.setTargetAtTime(clamp(x / 2.4, -1, 1), t, 0.08);
  }
  function flightStop(now) {
    if (!flight || !ac) { flight = null; return; }
    const f = flight, t = ac.currentTime; flight = null;
    f.vol.gain.cancelScheduledValues(t); f.vol.gain.setTargetAtTime(0, t, now ? 0.015 : 0.08); stopAt([f.src, f.lfo], t + 0.6);
  }

  function bell(when, pan, peak, f, bus, low) {
    const parts = [[0.5, 1, 4.5], [1, 0.7, 3.5], [1.19, 0.35, 2.8], [1.56, 0.3, 2.3], [2, 0.25, 2], [2.51, 0.14, 1.6]];
    for (const [m, a, d] of parts) tone(f * m, "sine", d, peak * a, when, null, { pan, bus, att: 0.004, lp: 2200, low });
  }
  const SFX = {
    swish(perfect, pan) { const o = { pan }; noise(0.16, 0.2, "highpass", 3200, 7000, 0, 1, o); tone(784, "sine", 0.4, 0.16, 0.02, null, o); tone(1175, "sine", 0.5, 0.13, 0.08, null, o); if (perfect) tone(1568, "sine", 0.7, 0.12, 0.15, null, o); },
    clank(v = 1, pan) { [523, 811, 1247, 1901].forEach((f, i) => tone(f, "triangle", 0.22 + i * 0.06, 0.1 * v, 0, null, { pan })); noise(0.05, 0.25 * v, "highpass", 2500, null, 0, 1, { pan }); },
    thud(v = 1, pan) { tone(130, "sine", 0.2, 0.3 * v, 0, 50, { pan }); noise(0.12, 0.18 * v, "lowpass", 700, 180, 0, 1, { pan }); },
    miss() { tone(233, "sine", 0.28, 0.1, 0.05, 150); },
    life() { tone(988, "sine", 0.22, 0.1); tone(1319, "sine", 0.34, 0.1, 0.09); tone(1760, "sine", 0.4, 0.07, 0.18); },
    unlock() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, "sine", 0.35, 0.07, i * 0.07)); },
    over() { tone(392, "triangle", 0.3, 0.12); tone(311, "triangle", 0.3, 0.12, 0.2); tone(233, "triangle", 0.7, 0.12, 0.4, 170); if (sfxOn()) bell(0.55, 0, 0.09, 131, sfxBus); },
    // cartoon foley: slide whistles, springs, wood blocks and a xylophone
    toon(kind, pan = 0) {
      const o = { pan };
      if (kind === "whistleUp") tone(430, "sine", 0.26, 0.07, 0.03, 1500, { ...o, vib: [9, 16], att: 0.03 });
      else if (kind === "whistleDown") tone(1350, "sine", 0.75, 0.055, 0.12, 250, { ...o, vib: [7, 20], att: 0.05 });
      else if (kind === "boing") { tone(140, "triangle", 0.45, 0.17, 0, 320, { ...o, vib: [13, 38], lp: 1800 }); tone(280, "sine", 0.3, 0.05, 0.01, 520, { ...o, vib: [13, 60] }); }
      else if (kind === "bonk") { noise(0.05, 0.32, "bandpass", 950, null, 0, 7, o); tone(640, "sine", 0.09, 0.2, 0, 380, o); tone(96, "sine", 0.2, 0.22, 0, 58, o); }
      else if (kind === "xylo") [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, "triangle", 0.18, 0.07, i * 0.055, null, { lp: 5200 }));
      else if (kind === "ding") tone(1568, "sine", 0.35, 0.05, 0.03);
      else if (kind === "knock") { noise(0.03, 0.12, "bandpass", 700, null, 0, 6); tone(520, "sine", 0.05, 0.07, 0, 380); }
      else if (kind === "iris") noise(0.16, 0.05, "bandpass", 2400, 700, 0, 1.2);
      else if (kind === "ignite") { noise(0.55, 0.16, "bandpass", 350, 2400, 0, 0.8, { ...o, brown: true }); noise(0.4, 0.05, "highpass", 3200, null, 0.06, 1, o); tone(90, "sine", 0.35, 0.12, 0, 60, o); }   // the ring catches fire: a whoomph
      // the bosses' band: a brass stab when one arrives, a fanfare when it falls
      else if (kind === "brass") { for (const [f, d] of [[73.4, 0], [87.3, 0], [103.8, 0], [146.8, 0.02]]) tone(f, "sawtooth", 0.9, 0.06, d, f * 0.97, { lp: 900, att: 0.02 }); tone(55, "sine", 0.7, 0.3, 0, 40); noise(0.5, 0.12, "lowpass", 300, 90, 0, 1, { brown: true }); }
      else if (kind === "fanfare") [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, d], i) => { tone(f, "sawtooth", i === 3 ? 0.7 : 0.14, 0.05, d, null, { lp: 2600, vib: i === 3 ? [6, 8] : null }); tone(f * 0.5, "triangle", 0.2, 0.05, d); });
      else if (kind === "pop") { tone(420, "sine", 0.08, 0.16, 0, 1400, o); noise(0.04, 0.12, "bandpass", 1800, null, 0, 3, o); tone(1760, "sine", 0.18, 0.05, 0.06); }
      else if (kind === "poof") noise(0.3, 0.09, "bandpass", 2600, 500, 0, 1.4, o);
      else if (kind === "kaboom") { noise(1.1, 0.4, "lowpass", 900, 80, 0, 0.7, { ...o, brown: true }); tone(80, "sine", 0.8, 0.35, 0, 30, o); noise(0.08, 0.2, "highpass", 2000, null, 0, 1, o); }
      else if (kind === "caw") { for (const d of [0, 0.2]) { tone(880, "sawtooth", 0.16, 0.045, d, 560, { ...o, lp: 2400, vib: [34, 60] }); noise(0.14, 0.05, "bandpass", 1500, 900, d, 3, o); } }
      else if (kind === "ptoo") { noise(0.06, 0.18, "bandpass", 700, null, 0, 4, o); tone(300, "sine", 0.1, 0.12, 0, 900, o); noise(0.35, 0.05, "bandpass", 1800, 400, 0.05, 1.5, o); }
      else if (kind === "rumble") noise(1.4, 0.3, "lowpass", 220, 70, 0, 0.7, { ...o, brown: true, att: 0.2 });
      else if (kind === "doonk") { tone(160, "sine", 0.45, 0.32, 0, 60, o); noise(0.07, 0.3, "bandpass", 700, null, 0, 5, o); tone(340, "triangle", 0.25, 0.1, 0, 200, { ...o, vib: [11, 20] }); }
      else if (kind === "ko") { tone(98, "sine", 0.9, 0.35, 0, 45); noise(0.9, 0.25, "lowpass", 600, 60, 0, 0.8, { brown: true }); if (sfxOn()) bell(0.05, 0, 0.12, 392, sfxBus); }
      else if (kind === "meow") { tone(620, "sine", 0.34, 0.05, 0, 820, { ...o, vib: [7, 30], att: 0.06 }); tone(1240, "sine", 0.3, 0.012, 0.05, 1600, o); }
      else if (kind === "hiss") noise(0.45, 0.08, "highpass", 3500, 5000, 0, 1, o);
      else if (kind === "screech") { tone(2300, "sawtooth", 0.28, 0.025, 0, 3400, { ...o, vib: [31, 140], lp: 5000 }); noise(0.2, 0.04, "highpass", 4200, null, 0, 1, o); }
      else if (kind === "tick") { tone(2600, "square", 0.02, 0.02, 0, null, { ...o, lp: 4000 }); noise(0.015, 0.05, "bandpass", 3000, null, 0, 6, o); }
      else if (kind === "gust") noise(0.9, 0.05, "bandpass", 420, 1300, 0, 0.8, { att: 0.3 });
      else if (kind === "clang") [330, 495, 742].forEach((f, i) => tone(f, "triangle", 0.7 - i * 0.15, 0.08, 0, null, o));
      else if (kind === "ribbit") { tone(190, "square", 0.07, 0.05, 0, 150, { ...o, lp: 900 }); tone(210, "square", 0.08, 0.05, 0.1, 160, { ...o, lp: 900 }); }
      else if (kind === "encore") { tone(300, "sine", 0.4, 0.06, 0, 1200, { ...o, vib: [9, 14], att: 0.03 }); [523, 659, 784, 1047].forEach((f, i) => tone(f, "triangle", 0.3, 0.05, 0.3 + i * 0.07, null, { lp: 3000 })); }
      else if (kind === "quack") { tone(520, "sawtooth", 0.12, 0.05, 0, 380, { ...o, lp: 1500, vib: [25, 40] }); }
      else if (kind === "shovel") { if (!ambOn()) return; noise(0.09, 0.07, "bandpass", 1300, 500, 0, 2, { ...o, bus: ambBus, low: true }); tone(210, "triangle", 0.05, 0.02, 0, 150, { ...o, bus: ambBus, low: true }); }
    },
    // the shot director's own foley (04e_director.js): short sounds that land on the animation's beats
    cue(kind, o = {}) {
      const op = { pan: o.pan || 0 }, v = clamp(o.v == null ? 1 : o.v, 0.2, 1.5);
      if (kind === "creak") {          // full draw: the band and the leather groan once under the strain (never a drone)
        noise(0.36, 0.13, "bandpass", 640, 360, 0, 9, op);
        tone(98, "sawtooth", 0.32, 0.045, 0, 86, { ...op, lp: 480, vib: [21, 4] });
        tone(1380, "sine", 0.05, 0.014, 0.24, 1050, op);                 // and a last little squeak of rubber
      } else if (kind === "whoosh") {  // the smear: air torn past the skull
        noise(0.15, 0.2 * v, "bandpass", 650, 2700, 0, 1.3, op);
        noise(0.09, 0.07 * v, "highpass", 3200, 6400, 0.025, 1, op);
      } else if (kind === "transient") {  // the crack of a contact, sized by the moment
        noise(0.018, 0.2 * v, "highpass", 2600, null, 0, 1, op);
        tone(180, "sine", 0.07, 0.16 * v, 0, 58, op);
      } else if (kind === "plop") {    // the next skull drops into the pouch: a small rubber boing
        tone(165, "triangle", 0.17, 0.07, 0, 300, { ...op, vib: [12, 22], lp: 1500 });
        noise(0.03, 0.05, "bandpass", 900, null, 0, 4, op);
      }
    },
    // the skull talks: little cartoon mumbles, one blip a syllable, rising on a question
    babble(text, pan = 0) {
      if (!sfxOn()) return;
      const n = clamp(Math.round(text.replace(/[^a-z]/gi, "").length / 2.4), 3, 16), ask = /\?/.test(text), shout = /!/.test(text);
      let t = 0;
      for (let i = 0; i < n; i++) {
        const last = i === n - 1, f = (shout ? 300 : 250) + Math.random() * 130 + (last && ask ? 120 : 0), d = 0.05 + Math.random() * 0.035;
        tone(f, "square", d, 0.028, t, f * (last && ask ? 1.35 : 0.88 + Math.random() * 0.2), { pan, lp: 1200 + Math.random() * 1000, att: 0.008 });
        tone(f * 2, "sine", d, 0.012, t, null, { pan });
        t += d + 0.02 + (Math.random() < 0.18 ? 0.06 : 0);
      }
    },
    ui(kind, n = 0) {
      if (kind === "combo") { const f = 523 * Math.pow(2, Math.min(n - 2, 12) / 12); tone(f, "triangle", 0.12, 0.05, 0.05, null, { lp: 3000 }); tone(f * 1.5, "sine", 0.18, 0.035, 0.1); }
      else if (kind === "buy") { [0, 0.05, 0.1].forEach((d, i) => { noise(0.03, 0.07, "bandpass", 1800 + i * 500, null, d, 6); tone(700 + i * 180, "triangle", 0.06, 0.05, d, null, { lp: 2400 }); }); tone(1319, "sine", 0.3, 0.06, 0.16); tone(1976, "sine", 0.4, 0.04, 0.22); }
      else if (kind === "claim") { [659, 880, 1109, 1319].forEach((f, i) => tone(f, "triangle", 0.18, 0.05, i * 0.06, null, { lp: 3500 })); }
      else if (kind === "flick") noise(0.09, 0.035, "bandpass", 3200, 900, 0, 1.5);
      else if (kind === "open") { tone(210, "sine", 0.09, 0.08, 0, 150); noise(0.04, 0.05, "bandpass", 2200, 1200, 0, 2); }
      else if (kind === "close") tone(170, "sine", 0.08, 0.06, 0, 120);
      else if (kind === "tick") tone(1500, "sine", 0.03, 0.035);
      else if (kind === "toggle") tone(880, "triangle", 0.06, 0.05, 0, 1180);
      else if (kind === "equip") { tone(660, "sine", 0.12, 0.07); tone(990, "sine", 0.2, 0.06, 0.06); }
      else if (kind === "deny") tone(190, "square", 0.09, 0.03, 0, 150, { lp: 700 });
    }
  };
