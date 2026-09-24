  // ───────────────────────── the Codex and the Production Archive ─────────────────────────
  // The Codex is everything you've met, written up: the eight maps, sixteen bosses, Morty's eight pieces, the seven
  // power-ups, each map's hazard and target, and the twelve signature shots. An entry stays "???" (with a word on
  // how to find it) until you've met the thing in play. Maps, pieces and shots come straight from progress; bosses,
  // power-ups, hazards and targets are noted the first time they turn up (profile.seen). Seeing things counts even in
  // Practice: the Codex is what you know, not what you've scored.
  // The Production Archive is the studio's paperwork from 1933, from the first memo to the restoration report,
  // unsealed one document at a time as the story goes on.
  const CODEX = {
    map:    { ids: () => MAP_DATA.map(m => String(m.n)), seen: id => Number(id) <= profile.bestStage,
              name: id => mapData(+id).name, body: id => `${mapData(+id).premise} ${t(`codex.map.${id}`)}`, stat: id => t("codex.stat.reel", { reel: mapData(+id).reel, mechanic: mapData(+id).identity.mechanic.split(":")[0] }) },
    boss:   { ids: () => BOSS_IDS.slice(), seen: id => !!profile.bossLog[id] || profile.seen.includes("boss:" + id),
              name: id => BOSS_INFO[id].name, body: id => `${t(`codex.boss.${id}`)} ${BOSS_INFO[id].tell}.`, stat: id => (profile.bossLog[id] ? t("codex.stat.beaten", { n: profile.bossLog[id] }) : "") },
    piece:  { ids: () => Object.keys(FRAGMENTS), seen: id => profile.fragments.includes(id), name: id => FRAGMENTS[id].name, body: id => FRAGMENTS[id].line, stat: id => BOSS_INFO[FRAGMENTS[id].from].name },
    power:  { ids: () => POWER_IDS.slice(), seen: id => profile.seen.includes("power:" + id), name: id => POWERS[id].name, body: id => `${t(`codex.power.${id}`)} ${POWERS[id].tip}.`, stat: () => "" },
    hazard: { ids: () => ["bats", "wind", "bonefall", "fog", "balloons", "pendulum", "jumpcut"], seen: id => profile.seen.includes("hazard:" + id),
              name: id => t(`codex.hazard.${id}.name`), body: id => t(`codex.hazard.${id}.body`), stat: () => "" },
    target: { ids: () => MAP_DATA.map(m => m.target), seen: id => profile.seen.includes("target:" + id), name: id => t(`codex.target.${id}.name`), body: id => t(`codex.target.${id}.body`), stat: () => "" },
    shot:   { ids: () => SHOT_IDS.slice(), seen: id => !!profile.shots[id], name: id => t(`shot.${id}.name`), body: id => t(`shot.${id}.desc`), stat: id => (profile.shots[id] ? t("codex.stat.made", { n: profile.shots[id] }) : "") }
  };
  const CODEX_CATS = Object.keys(CODEX);
  // the Archive's documents, in order, and what unseals each
  const ARCHIVE = [
    { id: "memo", open: () => true }, { id: "modelsheet", open: () => profile.makes > 0 }, { id: "censor", open: () => profile.bestStage >= 2 },
    { id: "storyboard", open: () => !!profile.bossLog.crow }, { id: "diary", open: () => profile.bestStage >= 3 }, { id: "ledger", open: () => profile.bonesTotal >= 1000 },
    { id: "clipping", open: () => profile.bestStage >= 5 }, { id: "projnote", open: () => CODEX.boss.seen("projectionist") }, { id: "cuesheet", open: () => profile.perfects >= 25 },
    { id: "deleted", open: () => profile.bestStage >= 7 }, { id: "letter", open: () => profile.fragments.length >= 4 }, { id: "restoration", open: () => profile.storyClears > 0 }
  ];
  const codexCount = () => CODEX_CATS.reduce((s, c) => s + CODEX[c].ids().filter(CODEX[c].seen).length, 0);
  const codexTotal = () => CODEX_CATS.reduce((s, c) => s + CODEX[c].ids().length, 0);
  // the first time something turns up in play: note it (on the real profile, even in Practice) and say so
  function sawIt(cat, id) {
    const P = realProfile(), key = `${cat}:${id}`;
    if (P.seen.includes(key)) return false;
    P.seen.push(key); if (profile !== P && !profile.seen.includes(key)) profile.seen.push(key);
    if (!sandbox) toast(`<b>${t("codex.new")}</b> · ${CODEX[cat] ? CODEX[cat].name(id) : id}`);
    Telemetry.emit("codex", { key }); updatePips();
    return true;
  }
  // the sheet: a tab for each part of the Codex, and the Archive
  const codexUI = { cat: "map" };
  function renderCodex() {
    const tabs = $("codexTabs");
    if (!tabs.children.length) for (const c of [...CODEX_CATS, "secret", "archive"]) tabs.append(h("button", { type: "button", role: "tab", data: { cat: c }, "aria-selected": "false" }, t(`codex.cat.${c}`)));
    for (const b of tabs.children) b.setAttribute("aria-selected", String(b.dataset.cat === codexUI.cat));
    const list = $("codexList"); list.textContent = "";
    if (codexUI.cat === "secret") {   // the secrets (09l_mischief.js): a hint for each still hidden
      const got = realProfile().secrets;
      $("codexCount").textContent = t("codex.secret.count", { n: got.length, total: SECRETS.length });
      for (const id of SECRETS) { const on = got.includes(id);
        list.append(h("div", { class: `entry${on ? "" : " unseen"}`, data: { entry: "secret:" + id } }, h("b", {}, on ? t(`secret.${id}.name`) : t("codex.unknown")), h("p", {}, on ? t(`secret.${id}.body`) : t(`secret.${id}.hint`)))); }
      return;
    }
    if (codexUI.cat === "archive") {
      const open = ARCHIVE.filter(A => A.open());
      $("codexCount").textContent = t("codex.archive.count", { n: open.length, total: ARCHIVE.length });
      for (const A of ARCHIVE) {
        const on = A.open();
        list.append(h("article", { class: `doc${on ? "" : " sealed"}`, data: { doc: A.id } },
          h("p", { class: "doc-date" }, on ? t(`archive.${A.id}.date`) : t("codex.sealed")),
          h("h3", {}, on ? t(`archive.${A.id}.title`) : t("codex.unknown")),
          h("p", { class: "doc-body" }, on ? t(`archive.${A.id}.body`) : t(`archive.${A.id}.how`))));
      }
      return;
    }
    const C = CODEX[codexUI.cat], ids = C.ids();
    $("codexCount").textContent = t("codex.count", { n: codexCount(), total: codexTotal() });
    for (const id of ids) {
      const on = C.seen(id);
      list.append(h("div", { class: `entry${on ? "" : " unseen"}`, data: { entry: `${codexUI.cat}:${id}` } },
        h("b", {}, on ? C.name(id) : t("codex.unknown")),
        h("p", {}, on ? C.body(id) : t(`codex.how.${codexUI.cat}`)),
        on && C.stat(id) ? h("span", { class: "cx-stat" }, C.stat(id)) : null));
    }
  }
  $("codexTabs").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; codexUI.cat = b.dataset.cat; renderCodex(); Sound.ui("tick"); });
