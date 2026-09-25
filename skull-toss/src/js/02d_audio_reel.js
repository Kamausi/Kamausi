  // ───────────────────────── the reel: the recorded score ─────────────────────────
  // Four loops sit beside the page — music/menu.mp3, a.mp3, b.mp3, boss.mp3 — one per act, plus two for
  // places: pause.mp3 under the pause menu and shop.mp3 at the Curio Cart. Where they are reachable they
  // play, and the game crossfades between them. Where they are not (a downloaded single file, a dead line, a
  // blocked fetch) the music is silent (v49: there is no synthesised stand-in any more).
  // A place plays over the act and hands back to it where it left off; the Cart outranks the pause menu.
  const REEL_SRC = { menu: "music/menu.mp3", A: "music/a.mp3", B: "music/b.mp3", boss: "music/boss.mp3", pause: "music/pause.mp3", shop: "music/shop.mp3" };
  const REEL_PLACES = { pause: 1, shop: 1 };
  const reelScene = { pause: false, shop: false };
  let reelAct = "menu";
  const reelPick = () => (reelScene.shop ? "shop" : reelScene.pause ? "pause" : reelAct);
  function musicScene(kind, on) { if (reelScene[kind] === !!on) return; reelScene[kind] = !!on; reelWant(reelPick()); }
  const REEL_FADE = 0.7;                        // seconds to cross from one act into the next
  const reel = { want: "menu", cur: null, tracks: {}, on: false };

  // a copy built with the music inside it carries the loops as base64; everything else loads the files
  const reelBlobs = {};
  function reelURL(name) {
    if (!MUSIC_EMBED || !MUSIC_EMBED[name]) return REEL_SRC[name];
    if (reelBlobs[name]) return reelBlobs[name];
    const raw = atob(MUSIC_EMBED[name]), n = raw.length, bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) bytes[i] = raw.charCodeAt(i);
    return (reelBlobs[name] = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })));
  }
  function reelTrack(name) {                    // made on first ask; the fetch starts with the element
    if (!ac || sandbox || !REEL_SRC[name]) return null;
    let t = reel.tracks[name];
    if (t) return t;
    t = reel.tracks[name] = { el: null, gain: null, live: null, off: 0 };   // live: null until it settles
    try {
      const el = new Audio(); el.src = reelURL(name); el.loop = true; el.preload = "auto";
      el.addEventListener("canplay", () => { t.live = true; if (reel.want === name) musicStart(); }, { once: true });
      el.addEventListener("error", () => { t.live = false; }, { once: true });
      const node = ac.createMediaElementSource(el), g = ac.createGain();
      g.gain.value = 0; node.connect(g); g.connect(musicBus);
      t.el = el; t.gain = g;
    } catch (e) { t.live = false; }
    return t;
  }
  // keep: an act fading out under a place keeps its spot, so it picks up again where it stopped
  function reelFade(t, to, keep = false) {
    if (!t || !t.gain || !ac) return;
    const now = ac.currentTime, g = t.gain.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + REEL_FADE);
    clearTimeout(t.off);
    if (!to) t.off = setTimeout(() => { try { t.el.pause(); if (!keep) t.el.currentTime = 0; } catch (e) {} }, REEL_FADE * 1000 + 80);
  }
  // returns true when the recorded act is playing, false when nothing can play yet
  function reelStart() {
    if (!ac || sandbox || !settings.sound || !settings.music) return false;
    const t = reelTrack(reel.want);
    if (!t || t.live !== true) return false;    // still loading (it starts on canplay), or missing
    const toPlace = !!REEL_PLACES[reel.want];
    for (const [k, o] of Object.entries(reel.tracks)) if (k !== reel.want && o !== t) reelFade(o, 0, toPlace && !REEL_PLACES[k]);
    reel.cur = t; reel.on = true; reelFade(t, 1);
    if (t.el.paused) { const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
    reelSoon();
    return true;
  }
  function reelHush() {
    reel.on = false; reel.cur = null;
    for (const t of Object.values(reel.tracks)) reelFade(t, 0);
  }
  function reelWant(name) {                     // the acts, and "menu" for the title and the results
    if (!REEL_SRC[name]) name = "menu";
    if (reel.want === name) return;
    reel.want = name;
    if (!ac || sandbox) return;
    reelStart();
  }
  // the next act is fetched while the current one plays, so a change of act never waits on the line
  function reelSoon() {
    if (reel.soon) return;
    reel.soon = setTimeout(() => {
      reel.soon = 0;
      const next = reel.want === "menu" ? ["A", "shop"] : reel.want === "A" ? ["B", "boss", "pause"] : reel.want === "B" ? ["boss"] : [];
      for (const n of next) reelTrack(n);
    }, 4000);
  }
  function reelSuspend(hidden) {                // a hidden tab: stop the stream, not just the sound
    for (const t of Object.values(reel.tracks)) {
      if (!t.el) continue;
      if (hidden) { try { t.el.pause(); } catch (e) {} }
      else if (reel.on && t === reel.cur) { const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
    }
  }
