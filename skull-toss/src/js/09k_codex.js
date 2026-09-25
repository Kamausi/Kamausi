  // ───────────────────────── the Codex and the Production Archive ─────────────────────────
  // The Codex is everything you've met, written up: the eight maps, sixteen bosses, Morty's eight pieces, the seven
  // power-ups, each map's hazard and target, and the twelve signature shots. An entry stays "???" (with a word on
  // how to find it) until you've met the thing in play. Maps, pieces and shots come straight from progress; bosses,
  // power-ups, hazards and targets are noted the first time they turn up (profile.met). Seeing things counts even in
  // Practice: the Codex is what you know, not what you've scored.
  // The Production Archive is the studio's paperwork from 1933, from the first memo to the restoration report,
  // unsealed one document at a time as the story goes on.
  const MINI_IDS_ = () => MAP_DATA.map(m => m.bosses && m.bosses.mini).filter(Boolean), END_IDS_ = () => MAP_DATA.map(m => m.bosses && m.bosses.end).filter(Boolean);
  const CODEX = {
    // v50: the areas, each map's four acts, noted as you reach them (and all of a map's once you've got past it)
    area:   { ids: () => MAP_DATA.flatMap(m => (m.acts || []).map((a, i) => `${m.n}-${i}`)), seen: id => { const [n, a] = id.split("-").map(Number); return n < profile.bestStage || (a === 0 && n <= profile.bestStage) || profile.met.includes("area:" + id); },
              name: id => { const [n, a] = id.split("-").map(Number); return mapData(n).acts[a]; },
              body: id => { const [n, a] = id.split("-").map(Number), B = mapData(n).bosses || {}; return t("codex.area.body", { act: ["I", "II", "III", "IV"][a] || a + 1, map: mapData(n).name, boss: BOSS_INFO[a < 3 ? B.mini : B.end] ? BOSS_INFO[a < 3 ? B.mini : B.end].name : "" }); },
              stat: id => t("codex.stat.map", { n: id.split("-")[0] }) },
    map:    { ids: () => MAP_DATA.map(m => String(m.n)), seen: id => Number(id) <= profile.bestStage,
              name: id => mapData(+id).name, body: id => `${mapData(+id).premise} ${t(`codex.map.${id}`)}`, stat: id => t("codex.stat.reel", { reel: mapData(+id).reel, mechanic: mapData(+id).identity.mechanic.split(":")[0] }) },
    boss:   { ids: () => BOSS_IDS.filter(id => END_IDS_().includes(id)), seen: id => !!profile.bossLog[id] || profile.met.includes("boss:" + id),
              name: id => BOSS_INFO[id].name, body: id => `${t(`codex.boss.${id}`)} ${BOSS_INFO[id].tell}.`, stat: id => (profile.bossLog[id] ? t("codex.stat.beaten", { n: profile.bossLog[id] }) : "") },
    miniboss: { ids: () => BOSS_IDS.filter(id => MINI_IDS_().includes(id)), seen: id => !!profile.bossLog[id] || profile.met.includes("boss:" + id),
              name: id => BOSS_INFO[id].name, body: id => `${t(`codex.boss.${id}`)} ${BOSS_INFO[id].tell}.`, stat: id => (profile.bossLog[id] ? t("codex.stat.beaten", { n: profile.bossLog[id] }) : "") },
    piece:  { ids: () => Object.keys(FRAGMENTS), seen: id => profile.fragments.includes(id), name: id => FRAGMENTS[id].name, body: id => FRAGMENTS[id].line, stat: id => BOSS_INFO[FRAGMENTS[id].from].name },
    power:  { ids: () => POWER_IDS.slice(), seen: id => profile.met.includes("power:" + id), name: id => POWERS[id].name, body: id => `${t(`codex.power.${id}`)} ${POWERS[id].tip}.`, stat: () => "" },
    hazard: { ids: () => ["bats", "wind", "bonefall", "fog", "balloons", "pendulum", "jumpcut"], seen: id => profile.met.includes("hazard:" + id),
              name: id => t(`codex.hazard.${id}.name`), body: id => t(`codex.hazard.${id}.body`), stat: () => "" },
    target: { ids: () => MAP_REGISTRY.targetType.slice(), seen: id => profile.met.includes("target:" + id), name: id => t(`codex.target.${id}.name`), body: id => t(`codex.target.${id}.body`), stat: () => "" },
    obstacle: { ids: () => MAP_REGISTRY.obstacle.slice(), seen: id => profile.met.includes("obstacle:" + id), name: id => t(`codex.obstacle.${id}.name`), body: id => t(`codex.obstacle.${id}.body`), stat: () => "" },
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
  // an area reached (07b_stage.js): noted quietly, no toast (a title card has just said where you are)
  function sawArea(n, a) { const P = realProfile(), key = `area:${n}-${a}`; if (P.met.includes(key)) return; P.met.push(key); if (profile !== P && !profile.met.includes(key)) profile.met.push(key); updatePips(); }
  // the first time something turns up in play: note it (on the real profile, even in Practice) and say so
  function sawIt(cat, id) {
    const P = realProfile(), key = `${cat}:${id}`;
    if (P.met.includes(key)) return false;
    P.met.push(key); if (profile !== P && !profile.met.includes(key)) profile.met.push(key);
    if (!sandbox) toast(`<b>${t("codex.new")}</b> · ${CODEX[cat] ? CODEX[cat].name(id) : id}`);
    Telemetry.emit("codex", { key }); updatePips();
    return true;
  }
  // the sheet: a tab for each part of the Codex, and the Archive
  const codexUI = { cat: "map" };
  function renderCodex() {
    const tabs = $("codexTabs");
    // v53: the parts of the Codex in a menu; the entries one row of book pages that scrolls sideways
    if (!tabs.children.length) for (const c of [...CODEX_CATS, "secret", "archive"]) tabs.append(h("button", { type: "button", role: "menuitem", data: { cat: c }, "aria-checked": "false" }, t(`codex.cat.${c}`)));
    for (const b of tabs.children) b.setAttribute("aria-checked", String(b.dataset.cat === codexUI.cat));
    $("codexCatLbl").textContent = t(`codex.cat.${codexUI.cat}`);
    const list = $("codexList"); list.textContent = ""; list.scrollLeft = 0;
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
      list.append(h("div", { class: `entry${on ? "" : " unseen"}`, data: { entry: `${codexUI.cat}:${id}`, page: String(ids.indexOf(id) + 1) } },
        h("b", {}, on ? C.name(id) : t("codex.unknown")),
        h("p", {}, on ? C.body(id) : t(`codex.how.${codexUI.cat}`)),
        on && C.stat(id) ? h("span", { class: "cx-stat" }, C.stat(id)) : null));
    }
  }
  const codexMenu = open => { $("codexTabs").hidden = !open; $("codexCatBtn").setAttribute("aria-expanded", String(open)); };
  $("codexCatBtn").addEventListener("click", () => { codexMenu($("codexTabs").hidden); Sound.ui("tick"); });
  $("codexTabs").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; codexMenu(false); codexUI.cat = b.dataset.cat; renderCodex(); Sound.ui("tick"); });
  document.addEventListener("click", e => { if (!e.target.closest(".codex-drop")) codexMenu(false); });
