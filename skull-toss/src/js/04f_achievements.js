  // ───────────────────────── achievements ─────────────────────────
  // Milestones that stay done. Each one reads your lifetime record (a stat, or a small getter) and pays its bones
  // the moment it's reached: a medal drops in (at the top, or just under the score mid-run) with its own jingle. The Achievements sheet
  // lists them all, with how close you are to the ones still locked.
  const arcadeBest = f => Math.max(0, ...Object.values(profile.arcade || {}).map(a => a[f] || 0));
  const ACHIEVEMENTS = [
    // tossing
    { id: "first-toss",      name: "First Toss",        text: "Make your first toss",                    stat: "makes", n: 1, bones: 25, icon: "skull" },
    { id: "bullseye",        name: "Bullseye",          text: "Land a perfect",                          stat: "perfects", n: 1, bones: 40, icon: "star" },
    { id: "rattled-in",      name: "Rattled In",        text: "Rattle a toss in off the rim",            stat: "rims", n: 1, bones: 40, icon: "star" },
    { id: "century",         name: "Century",           text: "Make 100 tosses",                         stat: "makes", n: 100, bones: 150, icon: "skull" },
    { id: "thousand",        name: "A Thousand Tosses", text: "Toss 1,000 skulls",                       stat: "throws", n: 1000, bones: 300, icon: "skull" },
    { id: "sharpshooter",    name: "Sharpshooter",      text: "Land 50 perfects",                        stat: "perfects", n: 50, bones: 250, icon: "star" },
    { id: "hat-trick",       name: "Hat Trick",         text: "Land 3 perfects in a row",                stat: "bestPerfStreak", n: 3, bones: 120, icon: "hat" },
    { id: "perfect-storm",   name: "Perfect Storm",     text: "Land 6 perfects in a row",                stat: "bestPerfStreak", n: 6, bones: 400, icon: "flame" },
    { id: "on-fire",         name: "On Fire",           text: "Hit a ×10 combo",                         stat: "bestStreak", n: 10, bones: 200, icon: "flame" },
    { id: "bonkers",         name: "Bonkers",           text: "Hit a ×20 combo",                         stat: "bestStreak", n: 20, bones: 500, icon: "flame" },
    { id: "clutch",          name: "Clutch",            text: "Make a toss on your last skull",          stat: "clutch", n: 1, bones: 60, icon: "skull" },
    { id: "full-house",      name: "Full House",        text: "Hold five skulls at once",                stat: "peakLives", n: 5, bones: 250, icon: "skull" },
    // story
    { id: "five-figures",    name: "Five Figures",      text: "Score 10,000 in one Story run",           stat: "bestScore", n: 10000, bones: 100, icon: "crown" },
    { id: "big-top",         name: "Big Top",           text: "Score 50,000 in one Story run",           stat: "bestScore", n: 50000, bones: 300, icon: "crown" },
    { id: "six-figures",     name: "Six Figures",       text: "Score 100,000 in one Story run",          stat: "bestScore", n: 100000, bones: 600, icon: "crown" },
    { id: "crow-catcher",    name: "Crow Catcher",      text: "Beat the Crow King",                      get: () => profile.bossLog.crow || 0, n: 1, bones: 150, icon: "crow" },
    { id: "pumpkin-smasher", name: "Pumpkin Smasher",   text: "Beat the Pumpkin King",                   get: () => profile.bossLog.pumpkin || 0, n: 1, bones: 300, icon: "pumpkin" },
    { id: "not-a-feather",   name: "Not a Feather Out of Place", text: "Beat a mini-boss without a miss",   stat: "miniFlawless", n: 1, bones: 250, icon: "crow" },
    { id: "clean-harvest",   name: "Clean Harvest",     text: "Beat an end boss without a miss",         stat: "bossFlawless", n: 1, bones: 400, icon: "pumpkin" },
    { id: "moving-on",       name: "Moving On",         text: "Reach map 2",                             stat: "bestStage", n: 2, bones: 200, icon: "tomb" },
    { id: "grand-tour",      name: "Grand Tour",        text: "Reach map 4",                             stat: "bestStage", n: 4, bones: 500, icon: "tomb" },
    { id: "half-reel",       name: "Half the Reel",     text: "Clear four maps",                         stat: "bestStage", n: 5, bones: 1000, icon: "crown" },
    { id: "whole-reel",      name: "The Whole Reel",    text: "Finish the story: all eight maps",        stat: "storyClears", n: 1, bones: 3000, icon: "crown" },
    { id: "first-piece",     name: "A Piece of Morty",  text: "Win back one of Morty's missing pieces",  get: () => profile.fragments.length, n: 1, bones: 250, icon: "hat" },
    { id: "piece-by-piece",  name: "Piece by Piece",    text: "Win back four of Morty's pieces",         get: () => profile.fragments.length, n: 4, bones: 800, icon: "hat" },
    { id: "boss-hunter",     name: "Boss Hunter",       text: "Beat all eight mini-bosses",              get: () => MAP_REGISTRY.mini.filter(id => profile.bossLog[id]).length, n: 8, bones: 1200, icon: "crow" },
    { id: "boss-slayer",     name: "Boss Slayer",       text: "Beat all eight end bosses",               get: () => MAP_REGISTRY.end.filter(id => profile.bossLog[id]).length, n: 8, bones: 2000, icon: "pumpkin" },
    // arcade
    { id: "arcade-debut",    name: "Arcade Debut",      text: "Play an Arcade run",                      stat: "arcadeRuns", n: 1, bones: 50, icon: "play" },
    { id: "survivor",        name: "Survivor",          text: "Survive 2 minutes in one Arcade run",     get: () => arcadeBest("secs"), n: 120, bones: 150, icon: "retry", time: true },
    { id: "iron-skull",      name: "Iron Skull",        text: "Survive 5 minutes in one Arcade run",     get: () => arcadeBest("secs"), n: 300, bones: 400, icon: "retry", time: true },
    { id: "map-hopper",      name: "Map Hopper",        text: "Play every Arcade map",                   get: () => Object.values(profile.arcade || {}).filter(a => a.runs > 0).length, get n() { return STAGES.length; }, bones: 200, icon: "home" },   // (STAGES is defined later in the build)
    { id: "arcade-ace",      name: "Arcade Ace",        text: "Score 25,000 in one Arcade run",          get: () => arcadeBest("score"), n: 25000, bones: 300, icon: "crown" },
    // power-ups
    { id: "power-hungry",    name: "Power Hungry",      text: "Grab 10 power-ups",                       stat: "powerups", n: 10, bones: 120, icon: "star" },
    { id: "cursed",          name: "Cursed!",           text: "Grab a Cursed Skull",                     stat: "cursed", n: 1, bones: 60, icon: "skull" },
    { id: "second-wind",     name: "Second Wind",       text: "Get saved by Second Chance",              stat: "saves", n: 1, bones: 60, icon: "retry" },
    // mishaps
    { id: "bonk",            name: "BONK!",             text: "Bonk Morty off something",                stat: "bonks", n: 1, bones: 25, icon: "flame" },
    { id: "concussed",       name: "Concussed",         text: "Bonk Morty 50 times",                     stat: "bonks", n: 50, bones: 150, icon: "flame" },
    { id: "early-grave",     name: "Early Grave",       text: "End a run without a single hit",          stat: "zeroRuns", n: 1, bones: 30, icon: "tomb" },
    // the collection
    { id: "shopaholic",      name: "Shopaholic",        text: "Buy 5 things from the Curio Cart",        stat: "shopBuys", n: 5, bones: 200, icon: "cart" },
    { id: "collector",       name: "Collector",         text: "Own 50 things from the Skull Vault",      get: () => profile.unlocked.length, n: 50, bones: 300, icon: "vault" },
    { id: "bone-baron",      name: "Bone Baron",        text: "Earn 10,000 bones in all",                stat: "bonesTotal", n: 10000, bones: 400, icon: "bone" },
    { id: "challenger",      name: "Challenger",        text: "Claim 10 challenges",                     stat: "chalClaims", n: 10, bones: 200, icon: "tomb" },
    { id: "regular",         name: "Regular",           text: "Play 50 runs",                            stat: "games", n: 50, bones: 250, icon: "profile" },
    { id: "night-owl",       name: "Night Owl",         text: "Play for an hour in all",                 stat: "playTime", n: 3600, bones: 300, icon: "profile", time: true }
  ];
  const achValue = A => Math.max(0, A.get ? A.get() : profile[A.stat] || 0);
  const achHas = id => profile.achievements.includes(id);
  // unlock whatever has been reached (twice round, in case the bones just paid out reach Bone Baron)
  function checkAchievements() {
    if (inPractice()) return [];
    const fresh = [];
    for (let pass = 0; pass < 2; pass++) {
      const now = ACHIEVEMENTS.filter(A => !achHas(A.id) && achValue(A) >= A.n);
      if (!now.length) break;
      for (const A of now) { profile.achievements.push(A.id); fresh.push(A); Platform.achievement(A.id); }   // (and the storefront's: 03e_platform.js)
      addBones(now.reduce((s, A) => s + A.bones, 0));
    }
    if (!fresh.length) return [];
    persist(1200); updatePips();
    for (const A of fresh) achQueue.push(A);
    achNext();
    return fresh;
  }
  // the medal: drops in at the top, holds, and makes way for the next one
  const achQueue = [], achTimers = {};
  let achBusy = false;
  function achNext() {
    if (achBusy || !achQueue.length) return;
    if (sandbox) achQueue.splice(0, achQueue.length - 1);   // tests don't wait on timers: the newest medal shows at once
    const A = achQueue.shift(), el = $("achPop");
    achBusy = !sandbox;
    el.innerHTML = `<span class="medal"><svg><use href="#i-${A.icon}"/></svg></span><span class="t"><span class="k">Achievement unlocked</span><b>${A.name}</b><span class="s">${A.text}</span></span><span class="r">+${A.bones.toLocaleString("en-US")}<svg><use href="#i-bone"/></svg></span>`;
    const inPlay = !hud.hidden;   // mid-run it sits just under the score, not over it
    el.classList.toggle("play", inPlay); el.style.top = inPlay ? `${Math.round(bestEl.getBoundingClientRect().bottom + 10)}px` : "";
    el.hidden = false; el.classList.remove("in", "out"); void el.offsetWidth; el.classList.add("in");
    Sound.sample("achievement", () => Sound.unlock()); buzz([10, 40, 10]);
    srEl.textContent = `Achievement unlocked: ${A.name}. ${A.text}. ${A.bones} bones.`;
    clearTimeout(achTimers.out); clearTimeout(achTimers.end);
    achTimers.out = setTimeout(() => { el.classList.remove("in"); el.classList.add("out"); }, sandbox ? 60 : 2600);
    achTimers.end = setTimeout(() => { el.hidden = true; el.classList.remove("out"); achBusy = false; achNext(); }, sandbox ? 120 : 3000);
  }
  // the sheet
  function renderAchievements() {
    const got = ACHIEVEMENTS.filter(A => achHas(A.id)).length, fmtV = (A, v) => A.time ? (A.n >= 3600 ? `${Math.floor(v / 60)}m` : `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, "0")}`) : Math.floor(v).toLocaleString("en-US");
    $("achCount").innerHTML = `<b>${got}</b> of ${ACHIEVEMENTS.length} unlocked`;
    $("achBar").firstElementChild.style.width = `${Math.round((got / ACHIEVEMENTS.length) * 100)}%`;
    $("achList").innerHTML = ACHIEVEMENTS.map(A => {
      const has = achHas(A.id), v = Math.min(achValue(A), A.n), pct = Math.round((v / A.n) * 100);
      return `<div class="ach${has ? " got" : ""}"><span class="medal"><svg><use href="#i-${has ? A.icon : "lock"}"/></svg></span>`
        + `<div class="ach-t"><b>${A.name}</b><span>${A.text}</span>`
        + (has ? "" : `<div class="ach-prog"><div class="bar"><i style="width:${pct}%"></i></div><em>${fmtV(A, v)}/${fmtV(A, A.n)}</em></div>`)
        + `</div><span class="ach-r">${has ? "Done" : `+${A.bones.toLocaleString("en-US")}`}</span></div>`;
    }).join("");
    if (profile.achSeen !== profile.achievements.length) { profile.achSeen = profile.achievements.length; persist(2000); updatePips(); }
  }
