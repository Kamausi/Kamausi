  // ───────────────────────── the Shot Book, and mastery ─────────────────────────
  // What there is to get good at, and what getting good pays. Each claim pays its bones once, by hand.
  //   Shots   each signature shot in four tiers, Bronze (made once), Silver (10), Gold (25) and Diamond (60); gold on all twelve
  //           earns the Shot Doctor title
  //   Maps    three stars a map: put its end boss down, put it down without a miss, and make 100 tosses there
  //   Bosses  each boss in three tiers: beaten once, 5 times and 20 times
  // v50: a fourth tier, Diamond, on everything; and two more parts: the mini-games (runs played) and the power-ups
  // (times grabbed). Maps get a fourth star: 300 tosses made there
  // v55: eight tiers on everything (the first four where they always were, so a claim already made stays made), and the
  // pay rebalanced: the early tiers pay less and come quickly, the late ones pay far more and take real doing
  const MAP_MAKES = [100, 300, 600, 1000, 1500, 2500];
  const MASTERY = {
    shot:  { tiers: [1, 10, 25, 60, 100, 150, 250, 400], pay: [60, 150, 300, 500, 750, 1000, 1500, 2500], ids: () => SHOT_IDS.slice(), have: id => profile.shots[id] || 0, name: id => t(`shot.${id}.name`), sub: id => t(`shot.${id}.desc`) },
    map:   { tiers: [1, 2, 3, 4, 5, 6, 7, 8], pay: [100, 150, 200, 300, 450, 650, 900, 1300], ids: () => MAP_DATA.map(m => String(m.n)), name: id => mapData(+id).name, sub: () => t("mastery.mapSub"),
             have: id => { const B = mapData(+id).bosses.end, mk = profile.mapMakes[id] || 0; return (profile.bossLog[B] ? 1 : 0) + (profile.flawless[B] ? 1 : 0) + MAP_MAKES.filter(n => mk >= n).length; } },
    boss:  { tiers: [1, 5, 20, 50, 100, 200, 350, 500], pay: [60, 150, 300, 500, 750, 1000, 1500, 2200], ids: () => BOSS_IDS.slice(), have: id => profile.bossLog[id] || 0, name: id => BOSS_INFO[id].name, sub: id => BOSS_INFO[id].tell },
    minis: { tiers: [1, 10, 25, 50, 100, 200, 350, 500], pay: [60, 150, 300, 500, 750, 1000, 1500, 2200], ids: () => MINI_IDS.slice(), have: id => (profile.modes[id] || {}).runs || 0, name: id => t(`mode.${id}.name`), sub: id => t(`mode.${id}.rule`) },
    power: { tiers: [1, 10, 30, 75, 150, 300, 500, 800], pay: [50, 120, 250, 450, 700, 1000, 1400, 2000], ids: () => POWER_IDS.slice(), have: id => (profile.powerLog || {})[id] || 0, name: id => POWERS[id].name, sub: id => POWERS[id].tip }
  };
  const TIER_NAMES = ["bronze", "silver", "gold", "platinum", "emerald", "ruby", "obsidian", "diamond"];
  const masteryKey = (cat, id, i) => `${cat}:${id}:${i}`;
  const tierReached = (cat, id, i) => MASTERY[cat].have(id) >= MASTERY[cat].tiers[i];
  const tierClaimed = (cat, id, i) => profile.mastery.includes(masteryKey(cat, id, i));
  function masteryClaimable() { for (const cat in MASTERY) for (const id of MASTERY[cat].ids()) for (let i = 0; i < MASTERY[cat].tiers.length; i++) if (tierReached(cat, id, i) && !tierClaimed(cat, id, i)) return true; return false; }
  function claimMastery(cat, id, i) {
    if (!tierReached(cat, id, i) || tierClaimed(cat, id, i) || inPractice()) return 0;
    const pay = MASTERY[cat].pay[i]; profile.mastery.push(masteryKey(cat, id, i)); addBones(pay);
    Telemetry.emit("mastery", { cat, id, tier: i }); checkUnlocks(); persist(600); updatePips();
    return pay;
  }
  // the Shot Doctor: gold on every signature shot (a title, via statNow)
  const goldShots = () => SHOT_IDS.filter(id => (profile.shots[id] || 0) >= MASTERY.shot.tiers[2]).length;
  const mUI = { cat: "shot" };
  // v55: each thing to master is a page of its own in a row that scrolls sideways; on the page, its eight tiers sit on a
  // milestone line (a track that scrolls sideways too), each a stop you tap to claim when you've reached it
  function renderMastery() {
    const tabs = $("masteryTabs");
    if (!tabs.children.length) for (const c of Object.keys(MASTERY)) tabs.append(h("button", { type: "button", role: "tab", data: { cat: c }, "aria-selected": "false" }, t(`mastery.cat.${c}`)));
    for (const b of tabs.children) b.setAttribute("aria-selected", String(b.dataset.cat === mUI.cat));
    const M = MASTERY[mUI.cat], list = $("masteryList"), isMap = mUI.cat === "map"; list.textContent = "";
    let done = 0, all = 0;
    for (const id of M.ids()) {
      const have = M.have(id), reached = M.tiers.filter(n => have >= n).length;
      const row = h("div", { class: "m-row m-page", data: { m: `${mUI.cat}:${id}` } },
        h("div", { class: "m-head" }, h("b", {}, M.name(id)), h("span", { class: "m-have" }, isMap ? `${reached}/8 ★` : `${fmtN(have)}×`)), h("p", {}, M.sub(id)));
      const line = h("div", { class: "m-line" }), track = h("div", { class: "m-track" }, h("i", { class: "m-fill", style: `width:${(Math.max(0, reached - 0.5) / (M.tiers.length - 1)) * 100}%` }));
      for (let i = 0; i < M.tiers.length; i++) {
        const got = tierReached(mUI.cat, id, i), claimed = tierClaimed(mUI.cat, id, i); all++; if (claimed) done++;
        track.append(h("button", { type: "button", class: `m-tier ${TIER_NAMES[i]}${got ? " got" : ""}${claimed ? " claimed" : ""}`, data: { claim: `${mUI.cat}|${id}|${i}` }, disabled: !got || claimed ? true : null, "aria-label": `${t(`mastery.tierName.${TIER_NAMES[i]}`)}: ${isMap ? mapStar(i) : t("mastery.tier", { n: fmtN(M.tiers[i]) })}` },
          h("span", { class: "m-dot" }, claimed ? "✓" : String(i + 1)), h("span", { class: "m-t" }, isMap ? mapStar(i) : t("mastery.tier", { n: fmtN(M.tiers[i]) })), h("span", { class: "m-p" }, claimed ? t("mastery.claimed") : got ? t("mastery.claim", { n: fmtN(M.pay[i]) }) : `+${fmtN(M.pay[i])}`)));
      }
      line.append(track); row.append(line); list.append(row);
      const next = [...track.querySelectorAll(".m-tier")].findIndex(b => !b.classList.contains("claimed"));
      if (next > 2) requestAnimationFrame(() => { line.scrollLeft = Math.max(0, track.children[next].offsetLeft - line.clientWidth / 2); });   // (the line opens at where you're up to)
    }
    $("masteryCount").textContent = t("mastery.count", { n: done, total: all });
  }
  const mapStar = i => (i < 2 ? (i ? t("mastery.star.1") : t("mastery.star.0")) : t("mastery.makes", { n: fmtN(MAP_MAKES[i - 2]) }));
  $("masteryTabs").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; mUI.cat = b.dataset.cat; renderMastery(); Sound.ui("tick"); });
  $("masteryList").addEventListener("click", e => {
    const b = e.target.closest("[data-claim]"); if (!b || b.disabled) return;
    const [cat, id, i] = b.dataset.claim.split("|"), pay = claimMastery(cat, id, +i);
    if (pay) { Sound.ui("claim"); toast(`<b>${t("mastery.paid")}</b> · +${fmtN(pay)}`); renderMastery(); renderBones(); }
  });
