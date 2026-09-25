  // ── music: the recorded score only (02d_audio_reel.js). v49: the synthesised music-box waltz that used to fill in
  // while a track loaded (and wherever one couldn't) is gone, so the game never plays anything but the uploaded music.
  // Where a track can't load, the reel is simply quiet.
  function setAct(name) { reelAct = name; reelWant(reelPick()); }
  function musicStart() { if (ac) reelStart(); }
  function musicStop() { reelHush(); }

  // ── public face of the audio engine
  const Sound = {
    init: audioInit, apply: audioApply,
    pullStart, pull, pullEnd, release: snapRelease, slack,
    flightStart, flightUpdate, flightStop,
    ...SFX, voice: VOICE,
    setTension(on) { tension = !!on; }, setAct, musicScene, sample: samplePlay, motif: playMotif, sting: playSting,
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
