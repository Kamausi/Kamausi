  // ───────────────────────── cartoon replays, and sharing them ─────────────────────────
  // The simulation is fixed-step and seeded (v14), so a run is its seed plus what the player did and when: each
  // throw (where it was aimed), each skipped card, each continue taken or turned down, and ending the run, stamped
  // with the sim step it happened on (counted in game time, so a freeze frame never shifts it). Playing that back
  // through the same simulation gives the same run, throw for throw. The few settings that change the simulation
  // travel with it (title cards, mischief, the hang a miss takes under reduced motion, Practice's options, Boss
  // Rush's list, the Director's note). A replay plays on a copy of the profile, so watching one changes nothing of yours, never posts to
  // the board and never touches a run you could resume. Share one as a link (#replay=…) and whoever opens it
  // watches the same run.
  // v47 made the maps 80 hits, so a recording from before plays out differently: those are version 1, and no longer open
  const REPLAY_V = 2;
  const Replay = {
    rec: null, last: null, play: null, speed: 1,
    begin(opts) {
      if (this.play) return;
      this.rec = { v: REPLAY_V, mode: game.mode, map: game.map, seed: game.seed, plus: game.plus ? 1 : 0, rm: reduceMotion ? 1 : 0, set: { cards: cardsMode(), mischief: mischiefOn() ? 1 : 0 },
        practice: game.mode === "practice" ? { ...practice } : null, leader: reelSt.introLeader ? 1 : 0, rush: game.mode === "rush" ? modeSt.rush.map(b => b.id) : null, dir: game.mode === "director" && game.director ? JSON.parse(JSON.stringify(game.director)) : null, feat: game.mode === "feature" && game.feature ? JSON.parse(JSON.stringify(game.feature)) : null, ev: [], at: Date.now() };
    },
    step: () => Math.round((game.time - (game.run.t0 || 0)) / SIM_STEP),
    note(kind, a, b) { if (this.rec && !this.play) this.rec.ev.push(a == null ? [this.step(), kind] : [this.step(), kind, +a.toFixed(5), +b.toFixed(5)]); },
    finish() {
      if (this.play) return;
      if (this.rec) { this.rec.score = game.score; this.rec.hits = game.hits; this.rec.throws = game.throws; this.last = this.rec; this.rec = null; }
    },
    encode(R) { return btoa(unescape(encodeURIComponent(JSON.stringify(R)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
    decode(s) {
      try { const R = JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, "+").replace(/_/g, "/"))))); return R && R.v === REPLAY_V && Array.isArray(R.ev) && MODES[R.mode] ? R : null; } catch (e) { return null; }
    },
    // watch a recording: the same run, on a copy of the profile, with the recorder's settings
    watch(R) {
      if (!R) return false;
      this.stop(false);
      const keep = { cards: settings.cards, mischief: settings.mischief };
      modeSt.real = realProfile(); profile = JSON.parse(JSON.stringify(modeSt.real));
      this.play = { R, i: 0, keep };
      settings.cards = R.set.cards; settings.mischief = !!R.set.mischief;
      if (R.practice) Object.assign(practice, R.practice);
      startGame({ mode: R.mode, map: R.map, seed: R.seed, replay: true, plus: !!R.plus });
      $("replayBadge").hidden = false; renderReplayBadge();
      Telemetry.emit("replay_watch", { mode: R.mode, score: R.score || 0 });
      return true;
    },
    // each sim step: anything the recording did now, done now
    tick() {
      const P = this.play; if (!P) return;
      const now = this.step();
      while (P.i < P.R.ev.length && P.R.ev[P.i][0] <= now) {
        const [, k, a, b] = P.R.ev[P.i];
        if (k === "t" && game.state !== "ready") break;   // (a throw waits for the skull, as the player did)
        P.i++;
        if (k === "t") launch(a, b); else if (k === "s") skipReelCard(); else if (k === "c") takeContinue(a === 1 ? "ad" : "bones");
        else if (k === "n") declineContinue("no"); else if (k === "e") endRun(); else if (k === "b") takeBonus(a === 1);
      }
    },
    // a continue is offered exactly when the recording decided one
    contRule() { const P = this.play, next = P && P.R.ev.slice(P.i).find(e => e[1] === "c" || e[1] === "n"); return next ? { ok: true, cost: CONTINUE.costs[Math.min(game.run.continues || 0, 2)], pay: true, ad: false } : { ok: false }; },
    stop(toMenu = true) {
      const P = this.play; if (!P) return;
      this.play = null; this.speed = 1; $("replayBadge").hidden = true;
      settings.cards = P.keep.cards; settings.mischief = P.keep.mischief;
      profile = modeSt.real || profile; modeSt.real = null; updateHud();
      if (toMenu) toTitle();
    },
    link(R) { return `${location.href.split("#")[0]}#replay=${this.encode(R)}`; }
  };
  const simReduced = () => (Replay.play ? !!Replay.play.R.rm : reduceMotion);   // the one device setting the simulation reads
  function renderReplayBadge() { $("replaySpeed").textContent = `${Replay.speed}×`; }
  $("replaySpeed").addEventListener("click", () => { Replay.speed = Replay.speed >= 4 ? 1 : Replay.speed * 2; renderReplayBadge(); Sound.ui("tick"); });
  $("replayExit").addEventListener("click", () => Replay.stop(true));
  $("watchBtn").addEventListener("click", () => { if (Replay.last) Replay.watch(Replay.last); });
  // share the run just played: the system's share sheet where there is one, the clipboard where not
  async function shareReplay(R = Replay.last) {
    if (!R) return false;
    const url = Replay.link(R), text = t("replay.shareText", { score: fmtN(R.score || 0), mode: t(`mode.${R.mode}.name`) });
    try { if (navigator.share) { await navigator.share({ title: "Skull Toss", text, url }); return true; } } catch (e) { if (e && e.name === "AbortError") return false; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast(t("replay.copied")); return true; } catch (e) { toast(t("replay.noShare")); return false; }
  }
  $("shareBtn").addEventListener("click", () => shareReplay());
  // a replay link opened: offer it on the title screen
  let sharedReplay = (() => { const m = location.hash.match(/replay=([\w-]+)/); return m ? Replay.decode(m[1]) : null; })();
  function renderSharedOffer() { const b = $("sharedReplayBtn"); if (b) b.hidden = !sharedReplay || !!Replay.play; }
  $("sharedReplayBtn").addEventListener("click", () => { if (sharedReplay) Replay.watch(sharedReplay); });
