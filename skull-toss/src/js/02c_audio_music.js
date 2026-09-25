  // ── music: the recorded score only (02d_audio_reel.js). v49: the synthesised music-box waltz that used to fill in
  // while a track loaded (and wherever one couldn't) is gone, so the game never plays anything but the uploaded music.
  // Where a track can't load, the reel is simply quiet.
  function setAct(name) { reelAct = name; reelWant(reelPick()); }
  function musicStart() { if (ac) reelStart(); }
  function musicStop() { reelHush(); }

  // ── public face of the audio engine
  // v51: the browser voice nearest Morty's brief: an American English man's voice by name if there is one, else any
  // American English voice, else the default (the list fills in after page load on some browsers)
  const MORTY_VOICES = [/guy/i, /david/i, /alex/i, /fred/i, /aaron/i, /tom\b/i, /male/i, /google us english/i];
  let mortyVoiceCache = null;
  function mortyVoice() {
    if (mortyVoiceCache) return mortyVoiceCache;
    const all = (window.speechSynthesis && speechSynthesis.getVoices()) || []; if (!all.length) return null;
    const us = all.filter(v => /^en[-_]US/i.test(v.lang));
    for (const re of MORTY_VOICES) { const v = us.find(x => re.test(x.name)); if (v) return (mortyVoiceCache = v); }
    return (mortyVoiceCache = us[0] || all.find(v => /^en/i.test(v.lang)) || null);
  }
  const Sound = {
    init: audioInit, apply: audioApply,
    pullStart, pull, pullEnd, release: snapRelease, slack,
    flightStart, flightUpdate, flightStop,
    ...SFX, voice: VOICE,
    setTension(on) { tension = !!on; }, setAct, musicScene, sample: samplePlay, motif: playMotif, sting: playSting,
    // "Spoken" voice setting: the browser's own speech. v51: cast to the brief (docs/VOICE.md) as near as a browser
    // voice allows: an American man, medium-low, quick and crisp, a showman rather than a chipmunk
    speak(text) {
      try { if (!window.speechSynthesis || sandbox || !settings.sound) return; const u = new SpeechSynthesisUtterance(text); const v = mortyVoice(); if (v) u.voice = v;
        u.pitch = 0.82; u.rate = 1.08; u.volume = clamp(settings.sfx / 100, 0, 1); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { Debug.warn("AUDIO", e, "speech"); }
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
