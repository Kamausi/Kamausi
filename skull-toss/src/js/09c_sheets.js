  // ───────────────────────── sheets (full-screen on phones, a panel on desktop) ─────────────────────────
  let sheetOpener = null;
  function openSheet(name) {
    if (!$("sheet-" + name) || sheet === name) return;
    if (sheet) closeSheet(false, true);
    sheet = name; cancelAim();
    if (!sheetOpener || !sheetOpener.isConnected) sheetOpener = document.activeElement;
    $("sheet-" + name).hidden = false; $("sheetScrim").hidden = false;
    renderSheet(name); Sound.ui("open");
    if (name === "store") Sound.musicScene("shop", true);   // the Curio Cart has its own tune
    $("sheet-" + name).querySelector("[data-back]").focus({ preventScroll: true });
  }
  function closeSheet(sound = true, swap = false) {
    if (!sheet) return;
    const was = sheet;
    $("sheet-" + was).hidden = true; sheet = null;
    if (!swap) $("sheetScrim").hidden = true;
    disarm(); $("codeBox").hidden = true;
    const n = $("prof-name"); if (document.activeElement === n) n.blur();
    if (was === "customize") { markSeen(); shop.sel = null; }
    if (was === "board") Board.unwatch();
    if (was === "store") { cart.sel = null; Sound.musicScene("shop", false); }
    if (sound) Sound.ui("close");
    if (!swap) { const o = sheetOpener; sheetOpener = null; if (o && o.isConnected && o.focus) o.focus({ preventScroll: true }); }
  }
  function renderSheet(name) {
    if (name === "settings") renderSettings();
    else if (name === "profile") { renderProfile(); renderSave(); }
    else if (name === "customize") renderShop();
    else if (name === "challenges") renderChallenges();
    else if (name === "play") renderPlay();
    else if (name === "achievements") renderAchievements();
    else if (name === "board") renderBoard();
    else if (name === "store") renderStore();
    else if (name === "codex") renderCodex();
    else if (name === "souls") renderSoulsUI();
    else if (name === "mastery") renderMastery();
    else if (name === "season") renderSeason();
  }
  document.addEventListener("click", e => {
    const open = e.target.closest("[data-sheet]"); if (open) { sheetOpener = open; openSheet(open.dataset.sheet); return; }
    if (e.target.closest("[data-back]")) closeSheet();
  });
  $("sheetScrim").addEventListener("click", () => closeSheet());

  // ───────────────────────── settings ─────────────────────────
  const SLIDERS = ["music", "sfx", "amb"];
  function renderSettings() {
    const set = (id, v) => $(id).setAttribute("aria-checked", String(!!v));
    set("set-sound", settings.sound); set("set-shake", settings.shake); set("set-mischief", settings.mischief);
    const canVibe = Platform.caps.haptics != null ? Platform.caps.haptics : typeof navigator.vibrate === "function";   // (a shell's haptics count: 03e_platform.js)
    $("set-vibe").disabled = !canVibe; set("set-vibe", canVibe && settings.vibe);
    $("vibeNote").textContent = canVibe ? t("settings.vibe.on") : t("settings.vibe.none");
    for (const k of SLIDERS) {
      $("set-" + k).value = settings[k]; $("out-" + k).textContent = settings[k];
      $("row-" + k).classList.toggle("off", !settings.sound); $("set-" + k).disabled = !settings.sound;
    }
    for (const b of $("set-guide").querySelectorAll("button")) b.setAttribute("aria-checked", String(b.dataset.v === settings.guide));
    $("guideNote").textContent = t(`settings.guide.${settings.guide}`);
    for (const b of $("set-film").querySelectorAll("button")) b.setAttribute("aria-checked", String(b.dataset.v === settings.film));
    $("filmNote").textContent = t(`settings.film.${settings.film}`);
    for (const b of $("set-camera").querySelectorAll("button")) b.setAttribute("aria-checked", String(b.dataset.v === settings.camera));
    $("cameraNote").textContent = t(`settings.camera.${settings.camera}`);
    $("set-shake").disabled = settings.camera === "still";   // a locked-off camera doesn't jolt either
    for (const b of $("set-voice").querySelectorAll("button")) b.setAttribute("aria-checked", String(b.dataset.v === settings.voice));
    $("voiceNote").textContent = t(`settings.voice.${settings.voice}`);
    segValue($("set-flashes"), settings.flashes); $("flashNote").textContent = t(`settings.flash.${settings.flashes}`);
    set("set-contrast", settings.contrast); segValue($("set-text"), settings.text);
    const langs = LOCALE_IDS().filter(l => l !== "pseudo"); $("row-lang").hidden = langs.length < 2;   // (a picker once there's a translation)
    if (langs.length > 1 && !$("set-lang").children.length) for (const l of langs) $("set-lang").append(h("button", { type: "button", role: "radio", data: { v: l } }, (STRINGS[l] && STRINGS[l]["lang.name"]) || l));
    segValue($("set-lang"), LANG); $("langNote").textContent = t("lang.name");
    segValue($("set-soundset"), settings.soundSet); $("soundSetNote").textContent = t(`settings.soundset.${settings.soundSet}`);
    segValue($("set-cards"), settings.cards); $("cardsNote").textContent = t(`settings.cards.${settings.cards}`);
    $("row-fullscreen").hidden = !Platform.caps.fullscreen; set("set-fullscreen", Platform.isFullscreen());   // (03e_platform.js)
    const c = PlayData.consent(), srv = canShare();   // play data (04g_telemetry.js)
    set("set-analytics", c === "yes"); $("set-analytics").disabled = !srv && c !== "yes";
    $("analyticsNote").textContent = !srv && c !== "yes" ? t("settings.analytics.none") : settings.analytics === "ask" && PlayData.privacySignal() ? t("settings.analytics.gpc") : t(`settings.analytics.${c}`);
    const pts = restorePoints(), list = $("restoreList"); list.textContent = "";   // restore points (01_data.js)
    if (!pts.length) list.append(h("span", { class: "sub" }, t("restore.none")));
    for (const r of pts.slice().reverse()) list.append(h("button", { class: "ghost-btn", type: "button", data: { day: r.day } }, t("restore.btn", { day: r.day, stage: Math.min(MAP_COUNT, (r.p && r.p.bestStage) || 1) })));
  }
  $("set-fullscreen").addEventListener("click", () => { Platform.setFullscreen(!Platform.isFullscreen()); Sound.ui("toggle"); setTimeout(renderSettings, 300); });
  document.addEventListener("fullscreenchange", () => { if (sheet === "settings") renderSettings(); });
  $("set-analytics").addEventListener("click", () => { PlayData.set(PlayData.consent() === "yes" ? "no" : "yes"); Sound.ui("toggle"); });
  $("restoreList").addEventListener("click", e => { const b = e.target.closest("[data-day]"); if (b && restoreFrom(b.dataset.day)) { toast(t("restore.done", { day: b.dataset.day })); Sound.ui("claim"); renderSettings(); } });
  $("set-voice").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    settings.voice = b.dataset.v; persist(); renderSettings(); Sound.ui("tick");
    if (settings.voice !== "off") { const was = voice.said; voice.said = 0; voice.last = -99; const test = voice.test; voice.test = true; sayLine("grab"); voice.test = test; voice.said = was; }
  });
  $("set-camera").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    settings.camera = b.dataset.v; persist(); renderSettings(); Sound.ui("tick");
  });
  $("set-film").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    settings.film = b.dataset.v; persist(); renderSettings(); Sound.ui("tick");
  });
  function toggleSetting(key) { settings[key] = !settings[key]; persist(); Sound.apply(); renderSettings(); Sound.ui("toggle"); if (key === "vibe" && settings.vibe) buzz(20); }
  $("set-sound").addEventListener("click", () => toggleSetting("sound"));
  $("set-vibe").addEventListener("click", () => toggleSetting("vibe"));
  $("set-shake").addEventListener("click", () => toggleSetting("shake"));
  $("set-mischief").addEventListener("click", () => toggleSetting("mischief"));
  $("set-contrast").addEventListener("click", () => { toggleSetting("contrast"); applyAccess(); });
  bindSeg("set-flashes", v => { settings.flashes = v; persist(); applyAccess(); renderSettings(); Sound.ui("tick"); });
  bindSeg("set-lang", v => { settings.lang = setLang(v); persist(); renderSettings(); Sound.ui("tick"); });
  bindSeg("set-soundset", v => { settings.soundSet = v; persist(); Sound.apply(); renderSettings(); Sound.toon("boing"); });   // (a sample in the new set)
  bindSeg("set-cards", v => { settings.cards = v; persist(); renderSettings(); Sound.ui("tick"); });
  bindSeg("set-text", v => { settings.text = v; persist(); applyAccess(); renderSettings(); Sound.ui("tick"); });
  for (const key of SLIDERS) {
    const el = $("set-" + key);
    el.addEventListener("input", () => { settings[key] = Number(el.value); $("out-" + key).textContent = el.value; Sound.apply(); if (paused) Sound.setPaused(true); });
    el.addEventListener("change", () => { persist(); if (key === "sfx") Sound.ui("equip"); });
  }
  $("set-guide").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    settings.guide = b.dataset.v; persist(); renderSettings(); Sound.ui("tick");
  });
  $("resetBtn").addEventListener("click", e => arm(e.currentTarget, "Tap to confirm", () => {
    profile = cleanProfile({ name: profile.name, gift: 1 }); cos = cleanCos({ updatedAt: Date.now() });
    ensureDaily(); persist(300); if (!sandbox) store.set(KEYS.profile + ".bak", JSON.stringify(profile));   // (the backup mustn't bring the old progress back)
    applyCosmetics(); updateHud(); renderSettings(); toast("Progress reset"); Sound.ui("deny");
  }));

  // ───────────────────────── profile ─────────────────────────
  function renderProfile() {
    const n = $("prof-name"); if (document.activeElement !== n) n.value = profile.name;
    const r = rankFor(profile.makes);
    $("rankName").textContent = r.name;
    $("profTitle").textContent = titleName();
    $("rankBar").style.width = r.next ? `${Math.round(((profile.makes - r.from) / (r.next[0] - r.from)) * 100)}%` : "100%";
    $("rankNext").textContent = r.next ? `${r.next[0] - profile.makes} more makes to ${r.next[1]}` : "Highest rank. The graveyard is yours.";
    const P = profile, N = fmtN, pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
    const mins = s => s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")}m`;
    const groups = [
      ["Career", "", [["Best score", N(P.bestScore)], ["Most hits in a run", P.best], ["Furthest map", P.bestStage > MAP_COUNT ? "The End" : P.bestStage || 1], ["Runs", N(P.games)], ["Points, all time", N(P.scoreTotal)], ["Time played", mins(P.playTime)]]],
      ["Tossing", "", [["Throws", N(P.throws)], ["Hits", N(P.makes)], ["Accuracy", pct(P.makes, P.throws)], ["Perfects", N(P.perfects)], ["Perfect rate", pct(P.perfects, P.makes)], ["Rim-ins", N(P.rims)],
        ["Best combo", `×${P.bestStreak}`], ["Perfects in a row", P.bestPerfStreak], ["Most skulls held", P.peakLives], ["Last-skull hits", N(P.clutch)], ["Times you grabbed Morty", N(P.grabs)]]],
      ["Bosses", "", [["Mini-bosses beaten", P.miniKills], ["…without a miss", P.miniFlawless], ["End bosses beaten", P.bossKills], ["…without a miss", P.bossFlawless], ["Morty's pieces back", `${P.fragments.length}/${MAP_COUNT}`], ["Story finished", N(P.storyClears)]]],
      ["Power-ups", "", [["Grabbed", N(P.powerups)], ["Cursed skulls taken", P.cursed], ["Second chances used", P.saves]]],
      ["Hall of Shame", "shame", [["Misses", N(P.misses)], ["Bonks", N(P.bonks)], ["Wide", N(P.wides)], ["Too high", N(P.overs)], ["Too low", N(P.lows)], ["Fell short", N(P.shorts)],
        ["Hit the post", N(P.posts)], ["Clanked off the rim", N(P.clanks)], ["Seeds to the face", N(P.seeds)], ["Runs without a hit", N(P.zeroRuns)], ["Out in 5 throws", N(P.quickDeaths)]]],
      ["Bones & the Vault", "", [["Bones earned", N(P.bonesTotal)], ["Bones spent", N(P.bonesSpent)], ["Curio Cart buys", N(P.shopBuys)], ["Coffins opened", N(P.coffins)], ["Vault", `${countUnlocked()}/${countAll()}`], ["Prizes for failing", `${countWon("shame")}/${countKind("shame")}`], ["Boss prizes", `${countWon("boss")}/${countKind("boss")}`]]]
    ];
    // the signature shots (07h_shots.js): each one's name and what it takes, and how often you've made it
    const shotRows = SHOT_IDS.map(id => `<div class="stat shot${P.shots[id] ? "" : " unseen"}"><dt>${t(`shot.${id}.name`)}<small>${t(`shot.${id}.desc`)}</small></dt><dd>${P.shots[id] ? N(P.shots[id]) : "—"}</dd></div>`).join("");
    // the career card (04h_career.js): level, experience to the next, and the highlights of everything so far
    const L = levelFor(P.xp), a = xpForLevel(L), b = xpForLevel(L + 1), top = L >= CAREER.maxLevel;
    const chip = (k, v) => `<span class="chip"><i>${k}</i>${v}</span>`;
    $("careerCard").innerHTML = `<div class="lvl"><b>${L}</b><span>${t("career.level")}</span></div><div class="cx"><div class="k">${t("career.title", { title: titleName() })}</div>`
      + `<div class="bar"><i style="width:${top ? 100 : Math.round((100 * (P.xp - a)) / Math.max(1, b - a))}%"></i></div><div class="sub">${top ? t("career.max") : t("career.next", { xp: fmtN(b - P.xp), n: L + 1 })} · ${fmtN(P.xp)} XP</div>`
      + `<div class="chips">${chip(t("career.chip.best"), fmtN(P.bestScore))}${chip(t("career.chip.story"), P.storyClears)}${chip(t("career.chip.pieces"), `${P.fragments.length}/${MAP_COUNT}`)}`
      + `${chip(t("codex.cat.shot"), `${SHOT_IDS.filter(id => P.shots[id]).length}/${SHOT_IDS.length}`)}${chip(t("career.chip.codex"), `${codexCount()}/${codexTotal()}`)}${chip(t("codex.cat.secret"), `${P.secrets.length}/${SECRETS.length}`)}</div></div>`;
    // the last ten runs
    const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? t("career.now") : m < 60 ? t("career.mins", { n: m }) : m < 1440 ? t("career.hours", { n: Math.round(m / 60) }) : t("career.days", { n: Math.round(m / 1440) }); };
    $("history").innerHTML = (P.history || []).length ? `<h3 class="stat-h">${t("career.recent")}</h3><ol class="runs">${P.history.map(h => `<li class="${h.won ? "won" : ""}"><b>${fmtN(h.score)}</b><span>${t(`mode.${h.mode}.name`)} · ${STAGES[h.mode === "story" ? Math.min(h.stage, MAP_COUNT) - 1 : h.map] ? STAGES[h.mode === "story" ? Math.min(h.stage, MAP_COUNT) - 1 : h.map].name : ""}</span><span>${t("career.hits", { n: h.hits })} · +${h.xp} XP</span><i>${ago(h.at)}</i></li>`).join("")}</ol>` : "";
    $("stats").innerHTML = groups.map(([h, cls, rows]) => `<h3 class="stat-h ${cls}">${h}</h3><dl class="stats">${rows.map(([k, v]) => `<div class="stat"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`).join("")
      + `<h3 class="stat-h">${t("shot.heading")} <span class="n">${SHOT_IDS.filter(id => P.shots[id]).length}/${SHOT_IDS.length}</span></h3><dl class="stats shots">${shotRows}</dl>`;
  }
  const countKind = flag => KINDS.reduce((s, k) => s + CATALOG[k].filter(it => it[flag]).length, 0);
  const countWon = flag => KINDS.reduce((s, k) => s + CATALOG[k].filter(it => it[flag] && canUse(k, it)).length, 0);
  const countAll = () => KINDS.reduce((s, k) => s + CATALOG[k].length, 0);
  const countUnlocked = () => KINDS.reduce((s, k) => s + CATALOG[k].filter(it => canUse(k, it)).length, 0);
  function ago(ms) { const s = Math.round((Date.now() - ms) / 1000); return s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`; }
  function renderSave() {
    const title = $("saveTitle"), status = $("saveStatus"), av = $("saveAvatar"), icon = $("saveIcon");
    const me = Cloud.me;
    if (me && Cloud.ref) {
      title.textContent = me.name ? `Signed in as ${me.name}` : "Signed in";
      av.hidden = !me.avatarUrl; icon.hidden = !!me.avatarUrl; if (me.avatarUrl) av.src = me.avatarUrl;
      const s = { ok: ["ok", `Synced to your account ${ago(Cloud.lastSync)}`], busy: ["busy", "Syncing…"], error: ["err", "Can't reach your account. Saved on this device"], connecting: ["busy", "Connecting…"] }[Cloud.state] || ["ok", "Synced"];
      status.className = "status " + s[0]; status.textContent = s[1];
    } else {
      av.hidden = true; icon.hidden = false;
      title.textContent = Cloud.state === "connecting" ? "Checking your account…" : "Saved on this device";
      status.className = "status"; status.textContent = "Use a save code to move progress to another device";
    }
  }
  $("copyCodeBtn").addEventListener("click", () => {
    const code = exportCode(), box = $("codeBox"), ta = $("codeText");
    const showManual = () => { box.hidden = false; ta.value = code; ta.readOnly = true; $("codeApply").hidden = true; ta.focus(); ta.select(); toast("Save code ready. Copy it"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => { box.hidden = true; toast("<b>Save code copied</b> · paste it on your other device"); Sound.ui("equip"); }, showManual);
    else showManual();
  });
  $("loadCodeBtn").addEventListener("click", () => {
    const box = $("codeBox"), ta = $("codeText");
    box.hidden = false; ta.readOnly = false; ta.value = ""; ta.placeholder = "Paste a save code (starts with SKULL1.)"; $("codeApply").hidden = false; ta.focus();
  });
  $("codeCancel").addEventListener("click", () => { $("codeBox").hidden = true; });
  $("codeApply").addEventListener("click", () => {
    if (importCode($("codeText").value)) {
      $("codeBox").hidden = true; persist(300); applyCosmetics(); updateHud(); renderProfile(); toast("<b>Progress loaded</b> · merged with this device"); Sound.unlock();
    } else { toast("That code didn't work. Check it was copied in full"); Sound.ui("deny"); }
  });
  $("prof-name").addEventListener("input", e => { profile.name = e.target.value.replace(/\s+/g, " ").trimStart().slice(0, 16); persist(2500); });
  $("prof-name").addEventListener("change", e => secretName(e.target.value));   // (a secret: 09l_mischief.js)
  $("prof-name").addEventListener("change", e => { profile.name = profile.name.trim(); e.target.value = profile.name; persist(800); });
