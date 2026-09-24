  // ───────────────────────── the leaderboard sheet ─────────────────────────
  // Rows are built with DOM calls and textContent only: names come from other players, so they are data, never markup.
  const validLook = l => {
    const out = { ...DEFAULT_COS };
    if (l && typeof l === "object") for (const k of ["skull", "eyes", "teeth", "paint", "hat"]) if (typeof l[k] === "string" && findItem(k, l[k])) out[k] = l[k];
    return out;
  };
  const BOARD_LABEL = m => t(m === "story" ? "mode.story.name" : `mode.${m}.name`);
  function boardRow(r, rank, me) {
    const li = document.createElement("li"); if (me) li.className = "me";
    li.tabIndex = 0; li.setAttribute("role", "button"); li.setAttribute("aria-label", `${cleanName(r.name) || "Nameless soul"}, ${fmtN(Math.max(0, +r.score || 0))}. Open their card`);
    const rk = document.createElement("span"); rk.className = "rank"; rk.textContent = rank; if (rank <= 3) rk.classList.add("r" + rank); li.appendChild(rk);
    const cv = document.createElement("canvas"); cv.width = cv.height = 72; li.appendChild(cv);
    const who = document.createElement("span"); who.className = "who";
    const nm = document.createElement("b"); nm.textContent = cleanName(r.name) || "Nameless soul"; who.appendChild(nm);
    const meta = document.createElement("span"); meta.textContent = `${Board.mode === "story" || Board.mode === "rush" ? `Map ${Math.max(1, Math.floor(+r.stage || 1))} · ` : ""}${Math.max(0, Math.floor(+r.hits || 0))} hits${me ? " · you" : ""}`; who.appendChild(meta);
    li.appendChild(who);
    const sc = document.createElement("b"); sc.className = "sc"; sc.textContent = fmtN(Math.max(0, +r.score || 0)); li.appendChild(sc);
    const c = cv.getContext("2d"), look = validLook(r.look);
    c.setTransform(1, 0, 0, 1, 0, 0); drawSkull(c, 36, 40, 19, { t: 0.4, look, face: faceFor(rank === 1 ? "happy" : "idle", 0.4) }); drawHat(c, 36, 40, 19, 0, 0.4, null, 1, hatOf(look));
    li._row = { ...r, place: rank };
    return li;
  }
  // v45: a tapped headstone opens its player's card, read-only (everything on it is data from another player: text only)
  function openPlayerCard(r) {
    const el = $("playerCard"), look = validLook(r.look);
    $("pcName").textContent = cleanName(r.name) || "Nameless soul";
    const title = typeof r.title === "string" && findItem("title", r.title) ? findItem("title", r.title).name : "";
    $("pcTitle").textContent = [title, typeof r.rank === "string" ? r.rank.slice(0, 32) : ""].filter(Boolean).join(" · ");
    $("pcBio").textContent = typeof r.bio === "string" ? r.bio.replace(/[<>]/g, "").slice(0, 120) : "";
    const rows = [[t("pc.board"), BOARD_LABEL(Board.mode)], [t("pc.place"), `#${r.place}`], [t("pc.score"), fmtN(Math.max(0, +r.score || 0))], [t("pc.hits"), fmtN(Math.max(0, Math.floor(+r.hits || 0)))]];
    if (Board.mode === "story" || Board.mode === "rush") rows.push([t("pc.map"), String(Math.max(1, Math.min(9, Math.floor(+r.stage || 1))))]);
    if (+r.level > 0) rows.push([t("career.level"), String(Math.min(99, Math.floor(+r.level)))]);
    if (+r.ach > 0) rows.push([t("pc.ach"), String(Math.min(999, Math.floor(+r.ach)))]);
    const dl = $("pcStats"); dl.textContent = "";
    for (const [k, v] of rows) { const d = document.createElement("div"); d.className = "stat"; const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; d.append(dt, dd); dl.appendChild(d); }
    const cv = $("pcPic"), pic = r.pic && typeof r.pic === "object" && PIC_FACES.includes(r.pic.face) && PIC_FRAMES.some(f => f[0] === r.pic.frame) ? { face: r.pic.face, frame: r.pic.frame } : null;
    if (pic) drawProfilePic(cv, pic, look);
    else { const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 96, 96); drawSkull(c, 48, 52, 26, { t: 0.4, look, face: faceFor("happy", 0.4) }); drawHat(c, 48, 52, 26, 0, 0.4, null, 1, hatOf(look)); }
    el.hidden = false; Sound.ui("open"); if (ui.kbd) $("pcClose").focus({ preventScroll: true });
  }
  function closePlayerCard() { $("playerCard").hidden = true; }
  $("pcClose").addEventListener("click", () => { closePlayerCard(); Sound.ui("close"); });
  $("playerCard").addEventListener("click", e => { if (e.target === $("playerCard")) closePlayerCard(); });
  for (const ev of ["click", "keydown"]) $("boardList").addEventListener(ev, e => {
    if (ev === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    const li = e.target.closest("li"); if (!li || !li._row) return; if (ev === "keydown") e.preventDefault(); openPlayerCard(li._row);
  });
  function renderBoard() {
    const week = Board.tab === "week", live = Board.tab === "live" || week, list = $("boardList"), empty = $("boardEmpty"), tip = $("boardTip"), mode = Board.mode;
    const modes = $("boardModes"); if (!modes.children.length) for (const m of BOARD_MODES) { const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.mode = m; b.textContent = BOARD_LABEL(m); modes.appendChild(b); }
    for (const b of modes.children) b.setAttribute("aria-selected", String(b.dataset.mode === mode));
    const weekTab = $("boardTabs").querySelector('[data-tab="week"]'); weekTab.disabled = mode !== "story"; if (week && mode !== "story") { Board.tab = "live"; return renderBoard(); }
    if (live && Board.db) { if (week) Board.watchWeek(); else if (mode === "story") Board.watch(); else Board.watchMode(mode); }
    for (const b of $("boardTabs").querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.tab === Board.tab));
    const online = !!Board.db;
    Presence.refresh(); $("boardOnline").hidden = Presence.count == null; if (Presence.count != null) $("boardOnlineN").textContent = Presence.count <= 1 ? t("board.online1") : t("board.online", { n: fmtN(Presence.count) });
    $("boardOpt").hidden = !live || !online;
    $("set-board").setAttribute("aria-checked", String(!!profile.board));
    $("set-board").disabled = Board.state === "readonly";
    $("boardNote").textContent = Board.state === "readonly" ? "You can see the board, but this page doesn't let you post to it" : "Shows the name on your headstone, your best score, your skull and your card";
    list.textContent = "";
    const wk = Runs.weekOf(Date.now()), meId = Board.me && Board.me.id;
    const rows = live && online ? (week ? Board.weekRows : mode === "story" ? Board.rows : Board.modeRows[mode] || []) : week ? Board.local(mode).filter(r => Runs.weekOf(r.at || 0) === wk) : Board.local(mode);
    rows.slice(0, 50).forEach((r, i) => list.appendChild(boardRow(r, i + 1, live && online && r.id === meId)));
    // your rival: the headstone just above yours
    const mine = rows.findIndex(r => live && online && r.id === meId);
    $("boardRival").innerHTML = mine > 0 ? t("board.rival", { name: cleanName(rows[mine - 1].name), score: fmtN(rows[mine - 1].score) }) : mine === 0 ? t("board.top") : "";
    $("boardRival").hidden = mine < 0;
    empty.hidden = rows.length > 0 && !(live && !online);
    empty.textContent = live && !online ? "The shared board lives on the published page. Until then, here are your best runs on this device." :
      live && Board.state === "loading" ? "Digging up the scores…" : live && Board.state === "error" ? "Couldn't reach the board just now." :
      live ? `Nobody's on the ${BOARD_LABEL(mode)} board yet. Post a score and be the first headstone.` : "No runs of this kind on this device yet. Go toss a skull.";
    tip.innerHTML = live && online ? `Everyone this game is shared with sees these boards, one for each way to play. Tap a headstone to see its card. Your name, bio and picture are the ones on your headstone (<b>Profile</b>); turn posting off to take your scores down.`
      : `Your ten best runs of each kind on this device. Tap one to see its card.`;
  }
  $("boardModes").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (!b || b.dataset.mode === Board.mode) return; Board.mode = b.dataset.mode; Sound.ui("tick"); renderBoard(); });
  $("boardTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.dataset.tab === Board.tab) return; Board.tab = b.dataset.tab; Sound.ui("tick"); renderBoard(); });
  $("set-board").addEventListener("click", () => {
    if (Board.state === "readonly") return;
    profile.board = !profile.board; persist(600); Sound.ui("toggle");
    if (profile.board) { if (!profile.boardBest) toast("Posting on. Your next scored run goes up on the board"); else Board.push(true).then(ok => { if (ok) toast("<b>Posted</b> · your best is on the board"); }); }
    else Board.remove().then(() => toast("Taken down from the board"));
    renderBoard();
  });
