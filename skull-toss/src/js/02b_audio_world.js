  // ── ambience bed: wind + whistle + low drone, with crickets, owl, distant bell and gusts on a timer
  function ambStart() {
    if (!ac || amb) return;
    const t = ac.currentTime;
    const o = ac.createGain(); o.gain.setValueAtTime(0.0001, t); o.gain.exponentialRampToValueAtTime(1, t + 3); o.connect(ambBus);
    const w = ac.createBufferSource(); w.buffer = brownBuf; w.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = "lowpass"; wf.frequency.value = 420; wf.Q.value = 0.8;
    const wg = ac.createGain(); wg.gain.value = 0.45;
    const l1 = ac.createOscillator(); l1.frequency.value = 0.071; const l1g = ac.createGain(); l1g.gain.value = 240; l1.connect(l1g); l1g.connect(wf.frequency);
    const l2 = ac.createOscillator(); l2.frequency.value = 0.113; const l2g = ac.createGain(); l2g.gain.value = 0.2; l2.connect(l2g); l2g.connect(wg.gain);
    w.connect(wf); wf.connect(wg); wg.connect(o);
    const h = ac.createBufferSource(); h.buffer = noiseBuf; h.loop = true;           // thin whistle through the headstones
    const hf = ac.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 950; hf.Q.value = 10;
    const hg = ac.createGain(); hg.gain.value = 0.03;
    const l3 = ac.createOscillator(); l3.frequency.value = 0.047; const l3g = ac.createGain(); l3g.gain.value = 480; l3.connect(l3g); l3g.connect(hf.frequency);
    h.connect(hf); hf.connect(hg); hg.connect(o);
    const dg = ac.createGain(); dg.gain.value = 0.022; const dl = ac.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 260;
    const d1 = ac.createOscillator(); d1.frequency.value = 55; const d2 = ac.createOscillator(); d2.type = "triangle"; d2.frequency.value = 82.4; d2.detune.value = 7;
    const l4 = ac.createOscillator(); l4.frequency.value = 0.09; const l4g = ac.createGain(); l4g.gain.value = 0.011; l4.connect(l4g); l4g.connect(dg.gain);
    d1.connect(dl); d2.connect(dl); dl.connect(dg); dg.connect(o);
    const nodes = [w, h, l1, l2, l3, l4, d1, d2];
    nodes.forEach(n => n.start(t));
    amb = { o, nodes, wg, wf, until: 0, cp: 0, cf: 4300, next: { cricket: t + 2, owl: t + 12 + Math.random() * 10, bell: t + 35 + Math.random() * 25, gust: t + 6 + Math.random() * 8 } };
    amb.timer = setInterval(ambTick, 200);
  }
  function ambStop() {
    if (!amb || !ac) { amb = null; return; }
    const a = amb, t = ac.currentTime; amb = null; clearInterval(a.timer);
    a.o.gain.cancelScheduledValues(t); a.o.gain.setValueAtTime(Math.max(0.0001, a.o.gain.value), t); a.o.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    stopAt(a.nodes, t + 0.8); setTimeout(() => { try { a.o.disconnect(); } catch (e) {} }, 1200);
  }
  function ambTick() {
    if (!amb || !ambOn()) return;
    const t = ac.currentTime, n = amb.next, A = { bus: ambBus, low: true };
    if (t >= n.cricket) {
      if (t > amb.until) {
        if (Math.random() < 0.6) { amb.until = t + 4 + Math.random() * 8; amb.cp = (Math.random() * 2 - 1) * 0.85; amb.cf = 3900 + Math.random() * 900; n.cricket = t + 0.2; }
        else n.cricket = t + 4 + Math.random() * 7;
      } else {
        for (let i = 0; i < 3; i++) tone(amb.cf, "sine", 0.02, 0.014, 0.02 + i * 0.048, null, { ...A, pan: amb.cp, att: 0.004 });
        n.cricket = t + 0.4 + Math.random() * 0.3;
      }
    }
    if (t >= n.owl) {
      const p = (Math.random() * 2 - 1) * 0.7, H = { ...A, pan: p, att: 0.07, vib: [5, 3], lp: 900 };
      tone(420, "sine", 0.26, 0.045, 0.05, 404, H); tone(410, "sine", 0.16, 0.035, 0.46, 400, H); tone(404, "sine", 0.5, 0.045, 0.74, 372, H);
      n.owl = t + 25 + Math.random() * 30;
    }
    if (t >= n.bell) { bell(0.05, (Math.random() * 2 - 1) * 0.4, 0.03, 164, ambBus, true); n.bell = t + 60 + Math.random() * 50; }
    if (t >= n.gust) {
      const g = amb.wg.gain, f = amb.wf.frequency;
      g.cancelScheduledValues(t); g.setValueAtTime(0.45, t); g.linearRampToValueAtTime(0.8, t + 1.7); g.linearRampToValueAtTime(0.45, t + 4.8);
      f.cancelScheduledValues(t); f.setValueAtTime(420, t); f.linearRampToValueAtTime(900, t + 1.7); f.linearRampToValueAtTime(420, t + 4.8);
      n.gust = t + 9 + Math.random() * 12;
    }
  }

  // ── creature voices (routed through the ambience bus, so the Ambience slider controls them)
  function formantVoice(t, dur, f0s, formants, peak, pan, o = {}) {
    // a buzzy source through parallel band-pass "mouth" formants — enough for groans, howls, cackles
    if (!room(true)) return;
    t = Math.max(t, ac.currentTime + SAFE);
    const src = track(ac.createOscillator()); src.type = o.type || "sawtooth";
    src.frequency.setValueAtTime(f0s[0][1], t);
    for (const [at, f] of f0s.slice(1)) src.frequency.exponentialRampToValueAtTime(f, t + at);
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + 0.2); }
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.att || 0.2)); g.gain.setValueAtTime(peak, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dest = out(pan, ambBus);
    for (const [ff, q, a] of formants) { const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = ff; bp.Q.value = q; const fg = ac.createGain(); fg.gain.value = a; src.connect(bp); bp.connect(fg); fg.connect(g); }
    g.connect(dest); src.start(t); src.stop(t + dur + 0.05);
  }
  const VOICE = {
    groan(pan, v) { // zombie: "uuuuhhh"
      if (!ambOn()) return; const t = ac.currentTime + 0.02, f = 68 + Math.random() * 26, d = 1.3 + Math.random() * 0.7;
      formantVoice(t, d, [[0, f], [d * 0.4, f * 1.28], [d, f * 0.8]], [[480, 5, 1.6], [880, 6, 1], [2400, 8, 0.25]], 0.22 * v, pan, { vib: [6.5, 3], att: 0.3 });
      noise(d * 0.8, 0.02 * v, "bandpass", 700, 400, 0.05, 1, { bus: ambBus, pan, att: 0.3, low: true });
    },
    rattle(pan, v) { // skeleton: dry clacks
      if (!ambOn()) return; let t = 0;
      const n = 5 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) { t += 0.03 + Math.random() * 0.05; noise(0.014, 0.16 * v, "bandpass", 2400 + Math.random() * 1800, null, t, 7, { bus: ambBus, pan, low: true }); tone(1500 + Math.random() * 600, "square", 0.008, 0.03 * v, t, null, { bus: ambBus, pan, lp: 3500, low: true }); }
    },
    howl(pan, v) { // werewolf, head to the moon
      if (!ambOn()) return; const t = ac.currentTime + 0.02, d = 2.6;
      formantVoice(t, d, [[0, 290], [0.8, 640], [1.6, 600], [d, 400]], [[800, 2.5, 1.2], [1400, 4, 0.5]], 0.14 * v, pan, { type: "triangle", vib: [5.5, 12], att: 0.35 });
      noise(d * 0.9, 0.025 * v, "bandpass", 1500, 900, 0.1, 1, { bus: ambBus, pan, att: 0.4, low: true });
    },
    wail(pan, v) { // ghost: "oooOOOooo"
      if (!ambOn()) return; const t = ac.currentTime + 0.02, d = 2.4;
      formantVoice(t, d, [[0, 520], [0.9, 720], [d, 460]], [[600, 3, 1.4], [1100, 5, 0.4]], 0.08 * v, pan, { type: "sine", vib: [4.5, 10], att: 0.5 });
      formantVoice(t + 0.15, d, [[0, 780], [0.9, 1080], [d, 690]], [[900, 4, 0.8]], 0.03 * v, pan, { type: "sine", vib: [4, 9], att: 0.6 });
    },
    cackle(pan, v = 1) { // witch: "heh-heh-heh-heh"
      if (!ambOn()) return; const t0 = ac.currentTime + 0.02;
      for (let i = 0; i < 5; i++) { const t = t0 + i * 0.13, f = 980 - i * 55; formantVoice(t, 0.1, [[0, f * 1.1], [0.1, f * 0.85]], [[1600, 2.5, 1.3]], (0.14 - i * 0.015) * v, pan, { att: 0.012 }); }
    },
    squeak(pan) { // bats
      if (!ambOn()) return; const k = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < k; i++) tone(6500 + Math.random() * 2500, "sine", 0.025, 0.028, i * (0.07 + Math.random() * 0.08), 9500, { bus: ambBus, pan, att: 0.003, low: true });
    },
    // v45: the crack comes with the flash (crack), the rumble a moment later (thunder). The rumble loops its noise so a
    // long one never runs off the end of the buffer (that was the click at the end), and swells and fades smoothly.
    crack(v = 1) {
      if (!ambOn()) return; const t = ac.currentTime + SAFE;
      noise(0.07, 0.14 * v, "highpass", 2200, null, 0, 1, { bus: ambBus, at: t, low: true });
      noise(0.16, 0.1 * v, "bandpass", 900, null, 0, 1.2, { bus: ambBus, at: t + 0.02, low: true });
    },
    thunder(delay, v = 1) {
      if (!ambOn() || !room(true)) return; const t = ac.currentTime + SAFE + delay;
      const s = track(ac.createBufferSource()); s.buffer = brownBuf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(320, t); f.frequency.linearRampToValueAtTime(140, t + 3.5);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
      let k = t; for (let i = 0; i < 3; i++) { const peak = (0.55 - i * 0.14) * v; g.gain.setTargetAtTime(peak, k, 0.08); k += 0.35 + Math.random() * 0.35; g.gain.setTargetAtTime(peak * 0.45, k - 0.12, 0.18); }
      g.gain.setTargetAtTime(0.0001, k, 0.6);
      s.connect(f); f.connect(g); g.connect(ambBus); s.start(t, Math.random() * 3); s.stop(k + 3.5);
    }
  };
