  // ───────────────────────── the Diegetic Arcade ─────────────────────────
  // Arcade mode as a place: a haunted penny arcade where every map you've reached is a cabinet, its name in lights
  // on the marquee, its own top five on the screen, and a coin slot that takes a bone. A cabinet you haven't reached
  // is Out of Order. Finish a run with a score good enough for that cabinet's top five and it asks for your
  // initials, three letters, the old way: ▲ and ▼ on each, or type them. The tables are yours (profile.arcadeTables);
  // the best score and longest run per map still sit beside them as before.
  const TABLE_SIZE = 5, LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const arcadeTable = map => realProfile().arcadeTables[String(map)] || [];
  const defaultIni = () => { const P = realProfile(); if (/^[A-Z]{3}$/.test(P.lastIni || "")) return P.lastIni;
    const n = (P.name || "").toUpperCase().replace(/[^A-Z ]/g, "").trim().split(/\s+/).filter(Boolean);   // "Ada Lovelace" → ALO, "Morty" → MOR, none → MRT
    const s = n.length > 2 ? n.slice(0, 3).map(w => w[0]).join("") : n.length === 2 ? n[0][0] + n[1].slice(0, 2) : n[0] || "MRT"; return (s + "XXX").slice(0, 3); };
  // after an Arcade run: onto the cabinet's table if it's good enough (under your usual initials, which you can change)
  function arcadeTableAfterRun() {
    if (game.mode !== "arcade" || !game.score) { game.run.table = null; return null; }
    const P = profile, k = String(game.map), list = (P.arcadeTables[k] || []).slice(), ini = defaultIni();
    const entry = { ini, score: game.score, secs: Math.floor(game.run.secs || 0), at: Date.now() };
    list.push(entry); list.sort((a, b) => b.score - a.score || a.at - b.at);
    const rank = list.indexOf(entry);
    if (rank >= TABLE_SIZE) { game.run.table = null; return null; }
    P.arcadeTables[k] = list.slice(0, TABLE_SIZE); game.run.table = { map: game.map, rank, at: entry.at };
    return rank;
  }
  // the initials panel on the headstone
  const iniState = { letters: ["A", "A", "A"] };
  function renderInitials() {
    const box = $("iniBox"), T = game.run && game.run.table; box.hidden = !T || !!Replay.play; if (box.hidden) return;
    const e = arcadeTable(T.map).find(x => x.at === T.at); if (!e) { box.hidden = true; return; }
    iniState.letters = e.ini.split("");
    $("iniRank").textContent = t("arcade.rank", { n: T.rank + 1, map: STAGES[T.map].name.replace(/^The /, "") });   // ("on the Crooked Crypts cabinet")
    const row = $("iniLetters"); row.textContent = "";
    iniState.letters.forEach((L, i) => row.append(h("span", { class: "ini" }, h("button", { type: "button", class: "up", data: { i, d: 1 }, "aria-label": `Letter ${i + 1} up` }, "▲"), h("b", {}, L), h("button", { type: "button", class: "down", data: { i, d: -1 }, "aria-label": `Letter ${i + 1} down` }, "▼"))));
  }
  function setInitials(ini) {
    const T = game.run && game.run.table; if (!T || !/^[A-Z]{3}$/.test(ini)) return false;
    const P = realProfile(), e = (P.arcadeTables[String(T.map)] || []).find(x => x.at === T.at); if (!e) return false;
    e.ini = ini; P.lastIni = ini; persist(600); renderInitials(); return true;
  }
  $("iniLetters").addEventListener("click", e => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i, L = iniState.letters.slice(); L[i] = LETTERS[(LETTERS.indexOf(L[i]) + +b.dataset.d + 26) % 26];
    setInitials(L.join("")); Sound.ui("tick");
  });
  window.addEventListener("keydown", e => {   // (or just type them)
    if ($("iniBox").hidden || screen !== "over" || sheet || !/^[a-z]$/i.test(e.key)) return;
    const L = iniState.letters.slice(); iniState.cur = ((iniState.cur || 0) % 3); L[iniState.cur] = e.key.toUpperCase(); iniState.cur++;
    setInitials(L.join(""));
  });
  // a cabinet, for the Arcade's map list
  function cabinetHTML(S, i) {
    const open = mapUnlocked(i), A = arcadeRec(i), table = arcadeTable(i);
    const screen = table.length ? table.slice(0, 3).map((e, n) => `<span class="hs"><i>${n + 1}.</i> ${e.ini} <b>${fmtN(e.score)}</b></span>`).join("") : `<span class="hs none">${t("arcade.noScores")}</span>`;
    return `<button class="cabinet${open ? "" : " locked"}" type="button" data-map="${i}"${open ? "" : ' aria-disabled="true"'} style="--tint:${S.map.look.sky[1]}">`
      + `<span class="marq">${S.name}</span><span class="scr">${open ? screen : `<span class="ooo">${t("arcade.outOfOrder")}</span>`}</span>`
      + `<span class="slot">${open ? t("arcade.insert") : t("arcade.reachIt")}${open && A.runs ? ` · ${t("arcade.longest", { t: clockStr(A.secs) })}` : ""}</span></button>`;
  }
