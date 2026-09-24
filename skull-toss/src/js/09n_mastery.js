  // ───────────────────────── the Shot Book, and mastery ─────────────────────────
  // What there is to get good at, and what getting good pays. Each claim pays its bones once, by hand.
  //   Shots   each signature shot in three tiers, Bronze (made once), Silver (10) and Gold (25); gold on all twelve
  //           earns the Shot Doctor title
  //   Maps    three stars a map: put its end boss down, put it down without a miss, and make 100 tosses there
  //   Bosses  each boss in three tiers: beaten once, 5 times and 20 times
  const MASTERY = {
    shot: { tiers: [1, 10, 25], pay: [100, 300, 750], ids: () => SHOT_IDS.slice(), have: id => profile.shots[id] || 0, name: id => t(`shot.${id}.name`), sub: id => t(`shot.${id}.desc`) },
    map:  { tiers: [1, 2, 3], pay: [150, 150, 150], ids: () => MAP_DATA.map(m => String(m.n)), name: id => mapData(+id).name, sub: () => t("mastery.mapSub"),
            have: id => { const B = mapData(+id).bosses.end; return (profile.bossLog[B] ? 1 : 0) + (profile.flawless[B] ? 1 : 0) + ((profile.mapMakes[id] || 0) >= 100 ? 1 : 0); } },
    boss: { tiers: [1, 5, 20], pay: [100, 250, 500], ids: () => BOSS_IDS.slice(), have: id => profile.bossLog[id] || 0, name: id => BOSS_INFO[id].name, sub: id => BOSS_INFO[id].tell }
  };
  const TIER_NAMES = ["bronze", "silver", "gold"];
  const masteryKey = (cat, id, i) => `${cat}:${id}:${i}`;
  const tierReached = (cat, id, i) => MASTERY[cat].have(id) >= MASTERY[cat].tiers[i];
  const tierClaimed = (cat, id, i) => profile.mastery.includes(masteryKey(cat, id, i));
  function masteryClaimable() { for (const cat in MASTERY) for (const id of MASTERY[cat].ids()) for (let i = 0; i < 3; i++) if (tierReached(cat, id, i) && !tierClaimed(cat, id, i)) return true; return false; }
  function claimMastery(cat, id, i) {
    if (!tierReached(cat, id, i) || tierClaimed(cat, id, i) || inPractice()) return 0;
    const pay = MASTERY[cat].pay[i]; profile.mastery.push(masteryKey(cat, id, i)); addBones(pay);
    Telemetry.emit("mastery", { cat, id, tier: i }); checkUnlocks(); persist(600); updatePips();
    return pay;
  }
  // the Shot Doctor: gold on every signature shot (a title, via statNow)
  const goldShots = () => SHOT_IDS.filter(id => (profile.shots[id] || 0) >= MASTERY.shot.tiers[2]).length;
  const mUI = { cat: "shot" };
  function renderMastery() {
    const tabs = $("masteryTabs");
    if (!tabs.children.length) for (const c of Object.keys(MASTERY)) tabs.append(h("button", { type: "button", role: "tab", data: { cat: c }, "aria-selected": "false" }, t(`mastery.cat.${c}`)));
    for (const b of tabs.children) b.setAttribute("aria-selected", String(b.dataset.cat === mUI.cat));
    const M = MASTERY[mUI.cat], list = $("masteryList"); list.textContent = "";
    let done = 0, all = 0;
    for (const id of M.ids()) {
      const row = h("div", { class: "m-row", data: { m: `${mUI.cat}:${id}` } }, h("div", { class: "m-head" }, h("b", {}, M.name(id)), h("span", { class: "m-have" }, mUI.cat === "map" ? "★".repeat(M.have(id)) + "☆".repeat(3 - M.have(id)) : `${fmtN(M.have(id))}×`)), h("p", {}, M.sub(id)));
      const tiers = h("div", { class: "m-tiers" });
      for (let i = 0; i < 3; i++) {
        const got = tierReached(mUI.cat, id, i), claimed = tierClaimed(mUI.cat, id, i); all++; if (claimed) done++;
        tiers.append(h("button", { type: "button", class: `m-tier ${TIER_NAMES[i]}${got ? " got" : ""}${claimed ? " claimed" : ""}`, data: { claim: `${mUI.cat}|${id}|${i}` }, disabled: !got || claimed ? true : null },
          h("span", { class: "m-t" }, mUI.cat === "map" ? t(`mastery.star.${i}`) : t("mastery.tier", { n: fmtN(M.tiers[i]) })), h("span", { class: "m-p" }, claimed ? t("mastery.claimed") : got ? t("mastery.claim", { n: fmtN(M.pay[i]) }) : `+${fmtN(M.pay[i])}`)));
      }
      row.append(tiers); list.append(row);
    }
    $("masteryCount").textContent = t("mastery.count", { n: done, total: all });
  }
  $("masteryTabs").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; mUI.cat = b.dataset.cat; renderMastery(); Sound.ui("tick"); });
  $("masteryList").addEventListener("click", e => {
    const b = e.target.closest("[data-claim]"); if (!b || b.disabled) return;
    const [cat, id, i] = b.dataset.claim.split("|"), pay = claimMastery(cat, id, +i);
    if (pay) { Sound.ui("claim"); toast(`<b>${t("mastery.paid")}</b> · +${fmtN(pay)}`); renderMastery(); renderBones(); }
  });
