  // ───────────────────────── seasons: the pictures keep coming ─────────────────────────
  // Story ends at map 8. Seasons are what comes after: a few weeks at a time, each with a name and a colour, and
  //   the Season Ticket   twenty stubs of rewards, torn off with season experience (what a run earns in the career,
  //                       double on the Feature). Each is claimed by hand. A Premium Ticket, bought once a season
  //                       with Souls, pays a second reward on some stubs.
  //   season notes        six goals across the season, each worth season experience the moment it's met
  //   season looks        on the Ticket only, this season only: the ones not earned are gone when it ends
  //   the Feature         a mode for the season alone: one map, dressed for the occasion, with its twists
  // A season runs on its dates, or whenever the live config's season.id names it ("off" for none). When it ends, the
  // Ticket stays open a week to claim what's been earned; after that, anything unclaimed has expired.
  // docs/SEASONS.md says how to write the next one.
  const SEASON_TIER_XP = 250, SEASON_GRACE_DAYS = 7;
  const SEASONS = {
    s1: {   // Season One: the Midnight Matinee
      n: 1, from: "2026-10-01T00:00:00Z", until: "2026-12-01T00:00:00Z", color: "#E8893A", pass: "pass:s1",
      feature: { map: 2, twists: ["fog", "bonanza"] },   // Pumpkin Patch Hollow after dark, twice the bonus targets
      track: [   // each stub: [the free reward, the Premium Ticket's (or none)]
        [{ bones: 100 }, { bones: 150 }], [{ look: "aim:lantern" }, null], [{ bones: 150 }, { bones: 200 }], [{ bones: 150 }, null], [{ look: "band:matinee" }, { bones: 300 }],
        [{ bones: 200 }, null], [{ bones: 200 }, { look: "trail:harvest" }], [{ bones: 250 }, null], [{ bones: 250 }, { bones: 400 }], [{ look: "ring:candycorn" }, null],
        [{ bones: 300 }, { bones: 400 }], [{ bones: 300 }, null], [{ bones: 350 }, { bones: 500 }], [{ bones: 350 }, null], [{ look: "title:midnight" }, { look: "skull:harvestmoon" }],
        [{ bones: 400 }, null], [{ bones: 400 }, { bones: 600 }], [{ bones: 450 }, null], [{ bones: 450 }, { bones: 800 }], [{ bones: 1000 }, { look: "title:marquee" }]
      ],
      notes: [
        { id: "perfects", n: 40, xp: 150, have: r => r.perfects || 0 },
        { id: "targets", n: 25, xp: 150, have: r => r.targets || 0 },
        { id: "bosses", n: 10, xp: 200, have: r => r.bosses || 0 },
        { id: "shots", n: 8, xp: 150, have: r => (r.shots || []).length },
        { id: "feature", n: 5, xp: 200, have: () => (game.mode === "feature" ? 1 : 0) },
        { id: "hits", n: 500, xp: 250, have: () => game.hits }
      ]
    }
  };
  let seasonClock = 0;   // (the spec moves the season's calendar)
  const seasonTime = () => Date.now() + seasonClock;
  // the season on now: the one the live config names ("off": none), else whichever season's dates hold
  function seasonNow(now = seasonTime()) {
    const flag = Flags.get("season.id");
    if (flag === "off") return null;
    if (flag && SEASONS[flag]) return { id: flag, ...SEASONS[flag] };
    for (const [id, S] of Object.entries(SEASONS)) if (now >= Date.parse(S.from) && now < Date.parse(S.until)) return { id, ...S };
    return null;
  }
  // the season whose Ticket can be claimed: on now, or over less than a week ago
  function seasonClaimable(now = seasonTime()) {
    const S = seasonNow(now); if (S) return S;
    const rec = realProfile().season, D = rec && SEASONS[rec.id]; if (!D || Flags.get("season.id") === "off") return null;
    const end = Date.parse(D.until);
    return now >= end && now < end + SEASON_GRACE_DAYS * 864e5 ? { id: rec.id, ...D, over: true } : null;
  }
  const seasonTiers = (xp, S) => Math.min(S.track.length, Math.floor((xp || 0) / SEASON_TIER_XP));   // stubs reached
  const seasonLookOf = key => { for (const [id, S] of Object.entries(SEASONS)) if (S.track.some(([f, p]) => (f && f.look === key) || (p && p.look === key))) return id; return null; };
  // this season's record on a profile (a new season starts a fresh one)
  function seasonRec(S, P = profile) {
    if (!P.season || P.season.id !== S.id) P.season = { id: S.id, xp: 0, free: [], prem: [], notes: {}, done: [] };
    return P.season;
  }
  // at the end of a run: season experience (the run's, double on the Feature), and the notes moved on
  function seasonAfterRun(xp) {
    const S = seasonNow(); if (!S) return null;
    const R = seasonRec(S), met = [];
    let gain = xp * (game.mode === "feature" ? 2 : 1);
    for (const N of S.notes) {
      if (R.done.includes(N.id)) continue;
      R.notes[N.id] = (R.notes[N.id] || 0) + N.have(game.run);
      if (R.notes[N.id] >= N.n) { R.done.push(N.id); gain += N.xp; met.push(N.id); }
    }
    const from = seasonTiers(R.xp, S); R.xp += gain;
    game.run.season = { id: S.id, xp: gain, from, to: seasonTiers(R.xp, S), notes: met };
    if (!sandbox && met.length) toast(`<b>${t("season.noteMet")}</b> · ${met.map(id => t(`season.note.${id}`, { n: fmtN(S.notes.find(N => N.id === id).n) })).join(", ")}`);
    return game.run.season;
  }
  // claim a stub: reached, not claimed yet, and (for the premium reward) with the Premium Ticket in the wallet
  function claimSeasonTier(i, prem = false) {
    const S = seasonClaimable(); if (!S) return false;
    const P = realProfile(), R = P.season; if (!R || R.id !== S.id || i < 0 || i >= seasonTiers(R.xp, S)) return false;
    const list = prem ? R.prem : R.free, reward = S.track[i] && S.track[i][prem ? 1 : 0];
    if (!reward || list.includes(i) || (prem && !Souls.owns(S.pass))) return false;
    list.push(i);
    if (reward.bones) addBones(reward.bones);
    if (reward.look && !P.unlocked.includes(reward.look)) P.unlocked.push(reward.look);
    Telemetry.emit("season_claim", { season: S.id, tier: i + 1, prem });
    persist(600); updatePips(); return true;
  }
  const seasonClaimableCount = () => {
    const S = seasonClaimable(), R = S && realProfile().season; if (!R || R.id !== S.id) return 0;
    let n = 0; for (let i = 0; i < seasonTiers(R.xp, S); i++) { if (!R.free.includes(i) && S.track[i][0]) n++; if (Souls.owns(S.pass) && !R.prem.includes(i) && S.track[i][1]) n++; }
    return n;
  };
  // the Feature: the season's map, with the season's twists on top of Arcade's rules (07k_director.js does the twists)
  function featureBegin() {
    const F = game.feature = Replay.play && Replay.play.R.feat ? { ...Replay.play.R.feat } : (() => { const S = seasonNow(); return S ? { season: S.id, ...S.feature } : { season: "", map: game.map, twists: [] }; })();
    ring.rcShrink = 0;
    for (const id of F.twists) { const T = TWISTS[id]; if (T && T.apply) T.apply(); if (id === "wind") HZ.windMul = 2; }
    snapRing();
    if (F.season) stageCard(t("season.featureK"), t(`season.${F.season}.feature`), t(`season.${F.season}.featureLine`), 2.6, "gold");
  }
  const featureMap = () => (seasonNow() || SEASONS.s1).feature.map;
  // what a reward is, in words
  function rewardText(w) {
    if (!w) return "";
    if (w.bones) return t("season.bones", { n: fmtN(w.bones) });
    const [kind, id] = w.look.split(":"), it = findItem(kind, id);
    return it ? `${it.name} · ${KIND_LABEL[kind]}` : w.look;
  }
  // the Season sheet: the season, its Feature, its notes and the Ticket
  function renderSeason() {
    const S = seasonClaimable(), box = $("seasonBody"); box.textContent = "";
    if (!S) { box.append(h("p", { class: "season-none" }, t("season.none"))); return; }
    const R = realProfile().season && realProfile().season.id === S.id ? realProfile().season : { xp: 0, free: [], prem: [], notes: {}, done: [] };
    const reached = seasonTiers(R.xp, S), into = R.xp - reached * SEASON_TIER_XP, prem = Souls.owns(S.pass);
    const left = S.over ? Date.parse(S.until) + SEASON_GRACE_DAYS * 864e5 - seasonTime() : Date.parse(S.until) - seasonTime();
    box.append(h("div", { class: "season-hero", style: `--season:${S.color}` },
      h("p", { class: "k" }, t("season.k", { n: S.n })), h("h3", {}, t(`season.${S.id}.name`)), h("p", { class: "line" }, t(`season.${S.id}.line`)),
      h("p", { class: "left" }, S.over ? t("season.claimBy", { d: fmtCountdown(left) }) : t("season.left", { d: fmtCountdown(left) })),
      h("div", { class: "meter", role: "img", "aria-label": t("season.meter", { n: reached, total: S.track.length }) }, h("i", { style: `width:${reached >= S.track.length ? 100 : Math.round((100 * into) / SEASON_TIER_XP)}%` })),
      h("p", { class: "stub" }, reached >= S.track.length ? t("season.allStubs") : t("season.nextStub", { n: reached + 1, xp: fmtN(SEASON_TIER_XP - into) })),
      S.over || Flags.modeOff("feature") ? null : h("button", { class: "btn primary sm", type: "button", data: { mode: "feature" } }, t("season.playFeature", { name: t(`season.${S.id}.feature`) }))));
    const notes = h("ul", { class: "season-notes" });
    for (const N of S.notes) { const done = R.done.includes(N.id), have = Math.min(N.n, R.notes[N.id] || 0);
      notes.append(h("li", { class: done ? "done" : "" }, h("i", {}, done ? "★" : "☆"), h("span", {}, t(`season.note.${N.id}`, { n: fmtN(N.n) })), h("em", {}, done ? t("season.xp", { n: N.xp }) : `${fmtN(have)}/${fmtN(N.n)}`))); }
    box.append(h("h3", { class: "sec" }, t("season.notesH")), notes);
    const priceSouls = Economy.ITEMS[S.pass] ? Economy.ITEMS[S.pass].souls : 0;
    box.append(h("h3", { class: "sec" }, t("season.ticketH")),
      h("div", { class: "season-pass" }, h("span", {}, prem ? t("season.premiumOwned") : t("season.premiumPitch")),
        prem || S.over ? null : h("button", { class: "btn sm", type: "button", id: "seasonPassBtn", disabled: !Souls.available() || Souls.busy ? true : null }, t("season.premiumBuy", { n: fmtN(priceSouls) }))));
    const list = h("ol", { class: "season-track" });
    S.track.forEach(([free, pay], i) => {
      const got = i < reached, cell = (w, isPrem) => {
        if (!w) return h("span", { class: "reward none" }, "—");
        const claimed = (isPrem ? R.prem : R.free).includes(i), can = got && !claimed && (!isPrem || prem);
        return h("button", { type: "button", class: `reward${isPrem ? " prem" : ""}${claimed ? " claimed" : can ? " ready" : ""}`, data: { tier: i, prem: isPrem ? 1 : 0 }, disabled: can ? null : true,
          "aria-label": `${rewardText(w)}: ${claimed ? t("season.claimed") : can ? t("season.claim") : isPrem && !prem ? t("season.premiumOnly") : t("season.locked")}` },
          rewardText(w), h("b", {}, claimed ? "✓" : can ? t("season.claim") : ""));
      };
      list.append(h("li", { class: got ? "got" : "" }, h("span", { class: "n" }, String(i + 1)), cell(free, false), cell(pay, true)));
    });
    box.append(list);
  }
  $("seasonBody").addEventListener("click", e => {
    const m = e.target.closest("[data-mode]"); if (m) { closeSheet(false); startGame({ mode: m.dataset.mode }); return; }
    const b = e.target.closest("[data-tier]"); if (b && !b.disabled) { if (claimSeasonTier(+b.dataset.tier, b.dataset.prem === "1")) { Sound.ui("claim"); renderSeason(); renderSeasonChip(); } return; }
    if (e.target.closest("#seasonPassBtn")) { const S = seasonNow(); if (S) Souls.ask("buyWithSouls", { item: S.pass }, () => { toast(t("season.premiumGot")); Sound.ui("buy"); renderSeason(); renderSeasonChip(); }); }
  });
  // the title's Season chip, with a pip while stubs wait to be claimed
  function renderSeasonChip() {
    const S = seasonClaimable(), b = $("seasonChip"); if (!b) return;
    b.hidden = !S; if (!S) return;
    b.style.setProperty("--season", S.color); $("seasonPip").hidden = !seasonClaimableCount();
  }
  // a season look shows in the Vault only once it's yours, or while its season is on (as a reward to earn)
  const seasonLookVisible = (kind, it) => !it.season || profile.unlocked.includes(`${kind}:${it.id}`) || (seasonNow() && seasonNow().id === it.season);
