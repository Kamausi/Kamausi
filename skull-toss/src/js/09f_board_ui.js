  // ───────────────────────── the leaderboard sheet ─────────────────────────
  // Rows are built with DOM calls and textContent only: names come from other players, so they are data, never markup.
  const validLook = l => {
    const out = { ...DEFAULT_COS };
    if (l && typeof l === "object") for (const k of ["skull", "eyes", "teeth", "paint", "hat"]) if (typeof l[k] === "string" && findItem(k, l[k])) out[k] = l[k];
    return out;
  };
  function boardRow(r, rank, me) {
    const li = document.createElement("li"); if (me) li.className = "me";
    const rk = document.createElement("span"); rk.className = "rank"; rk.textContent = rank; if (rank <= 3) rk.classList.add("r" + rank); li.appendChild(rk);
    const cv = document.createElement("canvas"); cv.width = cv.height = 72; li.appendChild(cv);
    const who = document.createElement("span"); who.className = "who";
    const nm = document.createElement("b"); nm.textContent = cleanName(r.name) || "Nameless soul"; who.appendChild(nm);
    const meta = document.createElement("span"); meta.textContent = `Stage ${Math.max(1, Math.floor(+r.stage || 1))} · ${Math.max(0, Math.floor(+r.hits || 0))} hits${me ? " · you" : ""}`; who.appendChild(meta);
    li.appendChild(who);
    const sc = document.createElement("b"); sc.className = "sc"; sc.textContent = fmtN(Math.max(0, +r.score || 0)); li.appendChild(sc);
    const c = cv.getContext("2d"), look = validLook(r.look);
    c.setTransform(1, 0, 0, 1, 0, 0); drawSkull(c, 36, 40, 19, { t: 0.4, look, face: faceFor(rank === 1 ? "happy" : "idle", 0.4) }); drawHat(c, 36, 40, 19, 0, 0.4, null, 1, hatOf(look));
    return li;
  }
  function renderBoard() {
    const week = Board.tab === "week", live = Board.tab === "live" || week, list = $("boardList"), empty = $("boardEmpty"), tip = $("boardTip");
    if (live && Board.db) { if (week) Board.watchWeek(); else Board.watch(); }
    for (const b of $("boardTabs").querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.tab === Board.tab));
    const online = !!Board.db;
    $("boardOpt").hidden = !live || !online;
    $("set-board").setAttribute("aria-checked", String(!!profile.board));
    $("set-board").disabled = Board.state === "readonly";
    $("boardNote").textContent = Board.state === "readonly" ? "You can see the board, but this page doesn't let you post to it" : "Shows the name on your headstone, your best score and your skull";
    list.textContent = "";
    const wk = Runs.weekOf(Date.now()), rows = live && online ? (week ? Board.weekRows : Board.rows) : week ? Board.local().filter(r => Runs.weekOf(r.at || 0) === wk) : Board.local(), meId = Board.me && Board.me.id;
    rows.slice(0, 50).forEach((r, i) => list.appendChild(boardRow(r, i + 1, live && online && r.id === meId)));
    // your rival: the headstone just above yours
    const mine = rows.findIndex(r => live && online && r.id === meId);
    $("boardRival").innerHTML = mine > 0 ? t("board.rival", { name: cleanName(rows[mine - 1].name), score: fmtN(rows[mine - 1].score) }) : mine === 0 ? t("board.top") : "";
    $("boardRival").hidden = mine < 0;
    empty.hidden = rows.length > 0 && !(live && !online);
    empty.textContent = live && !online ? "The shared board lives on the published page. Until then, here are your best runs on this device." :
      live && Board.state === "loading" ? "Digging up the scores…" : live && Board.state === "error" ? "Couldn't reach the board just now." :
      live ? "Nobody's on the board yet. Post a score and be the first headstone." : "No runs on this device yet. Go toss a skull.";
    tip.innerHTML = live && online ? `Everyone this game is shared with sees this board. Your name is the one on your headstone (<b>Profile</b>); turn posting off to take your score down.`
      : `Your ten best runs on this device.`;
  }
  $("boardTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.dataset.tab === Board.tab) return; Board.tab = b.dataset.tab; Sound.ui("tick"); renderBoard(); });
  $("set-board").addEventListener("click", () => {
    if (Board.state === "readonly") return;
    profile.board = !profile.board; persist(600); Sound.ui("toggle");
    if (profile.board) { if (!profile.boardBest) toast("Posting on. Your next scored run goes up on the board"); else Board.push(true).then(ok => { if (ok) toast("<b>Posted</b> · your best is on the board"); }); }
    else Board.remove().then(() => toast("Taken down from the board"));
    renderBoard();
  });
