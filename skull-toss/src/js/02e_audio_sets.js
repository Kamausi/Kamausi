  // ───────────────────────── sound sets, motifs and stings ─────────────────────────
  // A sound set reshapes every synthesised sound effect (never the music or the graveyard's ambience) as it's made:
  //   classic   the cartoon foley as it was
  //   vintage   a worn optical soundtrack: dulled and wavering
  //   spooky    a haunted organ: lower, longer, triangle-voiced, in a bigger room
  //   chiptune  everything a square wave, shorter
  //   kazoo     a kazoo band: buzzing saws through a paper filter, a little higher, with a wobble
  // Motifs are short phrases: one for each boss as it walks on and one for each reel's title card, played in the
  // current set. Stings are the signature shots' flourishes, rising with the shot's rarity.
  const SOUNDSETS = {
    classic:  {},
    vintage:  { pitch: 0.97, lp: 2800, vib: [5.5, 0.005] },
    spooky:   { pitch: 0.8, len: 1.25, wave: { sine: "triangle" }, room: 3 },
    chiptune: { len: 0.8, wave: { sine: "square", triangle: "square", sawtooth: "square" }, peak: 0.55, noLp: true },
    kazoo:    { pitch: 1.1, wave: { sine: "sawtooth", triangle: "sawtooth" }, lp: 1900, vib: [6, 0.015], peak: 0.7 }
  };
  const SOUNDSET_IDS = Object.keys(SOUNDSETS);
  // a tone as the current set would make it (pure: the audio engine and the spec both ask)
  function soundShape(f, type, dur, peak, slide, o = {}) {
    const S = SOUNDSETS[settings.soundSet] || SOUNDSETS.classic, p = S.pitch || 1;
    const lp = S.noLp ? undefined : S.lp ? Math.min(o.lp || Infinity, S.lp) : o.lp;
    const vib = o.vib || (S.vib ? [S.vib[0], f * p * S.vib[1]] : undefined);
    return { f: f * p, type: (S.wave && S.wave[type]) || type, dur: dur * (S.len || 1), peak: peak * (S.peak || 1), slide: slide ? slide * p : slide, o: { ...o, lp, vib } };
  }
  const soundRoom = () => (SOUNDSETS[settings.soundSet] || {}).room || 1;
  // motifs: [MIDI note (0 a rest), beats] pairs, a tempo, and a voice
  const MOTIFS = {
    crow:          { bpm: 200, wave: "square",   n: [[76, 1], [72, 1], [0, 1], [76, 1], [79, 2]] },
    batbaron:      { bpm: 170, wave: "sawtooth", n: [[69, 1], [70, 1], [69, 1], [64, 3]] },
    scarecrow:     { bpm: 170, wave: "triangle", n: [[55, 2], [57, 1], [55, 1], [50, 3]] },
    owl:           { bpm: 210, wave: "sine",     n: [[72, 2], [67, 2], [0, 1], [72, 2], [67, 2]] },
    gator:         { bpm: 190, wave: "triangle", n: [[43, 2], [46, 1], [43, 1], [38, 4]] },
    jester:        { bpm: 220, wave: "square",   n: [[72, 1], [76, 1], [79, 1], [84, 1], [0, 1], [72, 2]] },
    cuckoo:        { bpm: 160, wave: "sine",     n: [[79, 1], [76, 2], [79, 1], [76, 2]] },
    projectionist: { bpm: 180, wave: "sawtooth", n: [[60, 1], [60, 1], [63, 1], [66, 1], [69, 3]] },
    undertaker:    { bpm: 210,  wave: "triangle", n: [[48, 2], [48, 1], [48, 1], [51, 2], [47, 3]] },
    count:         { bpm: 210, wave: "sawtooth", n: [[57, 1], [55, 1], [57, 1], [53, 2], [52, 1], [50, 3]] },
    pumpkin:       { bpm: 190, wave: "square",   n: [[53, 1], [57, 1], [60, 1], [65, 2], [64, 1], [60, 2]] },
    marrowroot:    { bpm: 210,  wave: "triangle", n: [[41, 3], [44, 1], [46, 2], [41, 3]] },
    madame:        { bpm: 190, wave: "sine",     n: [[58, 1], [61, 1], [63, 2], [61, 1], [58, 3]] },
    ringmaster:    { bpm: 190, wave: "square",   n: [[67, 1], [72, 1], [76, 1], [79, 1], [76, 1], [79, 3]] },
    clockking:     { bpm: 190, wave: "square",   n: [[64, 1], [0, 1], [64, 1], [0, 1], [64, 1], [67, 1], [71, 2]] },
    reaper:        { bpm: 260,  wave: "sawtooth", n: [[45, 2], [44, 2], [43, 2], [0, 1], [38, 4]] },
    map1: { bpm: 150, wave: "triangle", n: [[67, 1], [71, 1], [74, 1], [79, 3]] },   map2: { bpm: 140, wave: "triangle", n: [[62, 1], [65, 1], [69, 1], [68, 3]] },
    map3: { bpm: 160, wave: "square",   n: [[65, 1], [69, 1], [72, 1], [77, 3]] },   map4: { bpm: 140, wave: "triangle", n: [[60, 1], [64, 1], [67, 1], [72, 3]] },
    map5: { bpm: 170, wave: "sine",     n: [[58, 2], [62, 1], [65, 1], [70, 3]] },   map6: { bpm: 190, wave: "square",   n: [[72, 1], [74, 1], [76, 1], [79, 1], [84, 2]] },
    map7: { bpm: 170, wave: "square",   n: [[64, 1], [69, 1], [64, 1], [69, 1], [76, 3]] }, map8: { bpm: 240, wave: "sawtooth", n: [[57, 2], [60, 2], [64, 2], [69, 4]] }
  };
  // when each note of a motif starts, and how long it lasts (pure)
  function motifPlan(id) {
    const M = MOTIFS[id]; if (!M) return [];
    const beat = 60 / M.bpm, out = []; let at = 0;
    for (const [m, b] of M.n) { if (m) out.push({ f: mtof(m), at, dur: beat * b * 0.9, wave: M.wave }); at += beat * b; }
    return out;
  }
  function playMotif(id) { for (const N of motifPlan(id)) tone(N.f, N.wave, N.dur, 0.06, N.at, null, { lp: 3600 }); return motifPlan(id).length; }
  // a signature shot's flourish: one more note the rarer the shot (a major arpeggio from C6)
  function playSting(rare) { const up = [0, 4, 7, 12, 16, 19]; for (let i = 0; i <= Math.min(5, rare); i++) tone(mtof(84 + up[i]), "triangle", 0.16, 0.06, i * 0.06, null, { lp: 5200 }); return rare + 1; }
