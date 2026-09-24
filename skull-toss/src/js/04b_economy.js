  // ───────────────────────── unlocks ─────────────────────────
  // Every cosmetic can be bought with bones, or earned free by reaching its goal.
  function statNow(k) {
    const run = game.state !== "title";
    switch (k) {
      case "best": return Math.max(profile.best, run ? game.hits : 0);
      case "bestScore": return Math.max(profile.bestScore, run ? game.score : 0);
      case "bestStreak": return Math.max(profile.bestStreak, run ? game.streak : 0);
      case "perfStreak": return Math.max(profile.bestPerfStreak, run ? game.perfStreak : 0);
      case "peakLives": return Math.max(profile.peakLives, run ? game.peakLives : 0);
      case "careerLevel": return levelFor(profile.xp);   // (04h_career.js)
      case "goldShots": return goldShots();              // (09n_mastery.js)
      case "shards": return profile.fragments.length;   // (the Black Ring's shards)
      default: return k.startsWith("beat:") ? profile.bossLog[k.slice(5)] || 0 : k.startsWith("cans:") ? (profile.canAlley || {})[k.slice(5)] || 0 : profile[k] || 0;   // (beat:<boss>: how often that boss has fallen; cans:<map>: Can Alley cleared after it)
    }
  }
  const findItem = (kind, id) => CATALOG[kind] && CATALOG[kind].find(i => i.id === id);
  function canUse(kind, it) {   // (buy() below never sells a Soul item for bones: it has no bones price)
    if (it.souls) return Souls.owns(kind + ":" + it.id);           // a Soul Shop item: the server's wallet says (09m_souls.js)
    if (it.season) return profile.unlocked.includes(kind + ":" + it.id);   // a season look: earned on its Ticket, or not at all (07l_season.js)
    if (!it.price && !it.req) return true;                       // stock: yours from the start
    if (profile.unlocked.includes(kind + ":" + it.id)) return true; // bought, or earned earlier
    return !!it.req && statNow(it.req[0]) >= it.req[1];
  }
  function checkUnlocks() {
    if (inPractice()) return;   // (Practice plays on a copy: 07i_modes.js)
    const fresh = [];
    for (const kind of KINDS) for (const it of CATALOG[kind]) {
      const key = kind + ":" + it.id;
      if (it.req && !profile.unlocked.includes(key) && statNow(it.req[0]) >= it.req[1]) { profile.unlocked.push(key); fresh.push({ kind, it }); }
    }
    if (fresh.length) {
      if (!sandbox) { toast(`<b>${fresh[0].kind === "title" ? "New title" : "Unlocked free"}</b> · ${fresh[0].it.name}${fresh[0].kind === "title" ? "" : " " + KIND_LABEL[fresh[0].kind]}${fresh.length > 1 ? ` +${fresh.length - 1} more` : ""}`); Sound.unlock(); }
      updatePips();
    }
    checkAchievements();
    return fresh;
  }
  // the locked item you're closest to, by bones or by its free goal
  function nextUnlock() {
    let best = null;
    for (const kind of KINDS) for (const it of CATALOG[kind]) {
      if (canUse(kind, it) || kind === "title" || it.souls || it.season) continue;   // (Soul items are the Soul Shop's, season looks the Ticket's: not goals)
      const have = it.req ? statNow(it.req[0]) : 0, kGoal = it.req ? have / it.req[1] : 0, kBones = it.price ? profile.bones / it.price : 0, k = Math.max(kGoal, kBones);
      if (!best || k > best.k) best = { kind, it, have, k, kGoal, kBones };
    }
    return best;
  }
  function unseen() { return profile.unlocked.filter(k => !profile.seen.includes(k)); }
  function markSeen() { const u = unseen(); if (u.length) { profile.seen.push(...u); persist(); updatePips(); } }

  // ───────────────────────── bones ─────────────────────────
  const BONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bone"/></svg>';
  function renderBones() { for (const el of document.querySelectorAll(".bones > span")) el.textContent = profile.bones.toLocaleString("en-US"); }
  function addBones(n) {
    n = Math.max(0, Math.round(n)); if (!n) return;
    profile.bones += n; profile.bonesTotal += n; renderBones();
    for (const el of document.querySelectorAll(".bones")) bump(el);
  }
  function runBones(r, hits, newBest, score = 0) { return 10 + hits * 8 + r.perfects * 5 + r.bestCombo * 4 + Math.floor(score / 2500) * 5 + (r.powerups || 0) * 6 + (newBest && hits > 0 ? 25 : 0); }
  function buy(kind, id) {
    const it = findItem(kind, id);
    if (!it || !it.price || it.shop || canUse(kind, it) || profile.bones < it.price) return false;   // exclusives are only sold at the Curio Cart
    const key = kind + ":" + id;
    profile.bones -= it.price; profile.bonesSpent += it.price; profile.unlocked.push(key); profile.seen.push(key);
    persist(800); renderBones(); updatePips(); checkAchievements(); Telemetry.emit("shop_buy", { kind, id, price: it.price, cur: "bones" });
    return true;
  }
  // ── the economy audit (v39): the catalog's rules, checked. The spec requires no problems; SkullToss.economy() in
  // the console prints the same report, with the pacing numbers docs/ECONOMY.md quotes.
  function economyAudit() {
    const problems = [], byStars = {}, soulKeys = new Set();
    let vault = 0, count = 0;
    for (const kind of KINDS) {
      const ids = new Set();
      for (const it of CATALOG[kind]) {
        const key = `${kind}:${it.id}`;
        if (ids.has(it.id)) problems.push(`${key}: the id is used twice`); ids.add(it.id);
        if (it.souls) {
          soulKeys.add(key);
          if (!Economy.ITEMS[key] || Economy.ITEMS[key].souls !== it.souls) problems.push(`${key}: its Soul price isn't the server's`);
          if (it.price) problems.push(`${key}: sold for bones and Souls both`);
          continue;
        }
        if (it.price != null && !(it.price > 0 && it.price % 50 === 0)) problems.push(`${key}: a price of ${it.price}`);
        if (it.req && (typeof statNow(it.req[0]) !== "number" || isNaN(statNow(it.req[0])) || !(it.req[1] > 0))) problems.push(`${key}: a goal of ${it.req.join(" ")}`);
        if (it.price) { vault += it.price; count++; (byStars[it.s] = byStars[it.s] || []).push(it.price); if (!(it.s >= 1 && it.s <= 4)) problems.push(`${key}: a rarity of ${it.s}`); }
      }
    }
    for (const key of Object.keys(Economy.ITEMS)) if (KINDS.includes(key.split(":")[0]) && !soulKeys.has(key)) problems.push(`${key}: the server sells it but the Vault doesn't have it`);
    for (const kind of KINDS) for (const it of CATALOG[kind]) if (it.season && (!SEASONS[it.season] || seasonLookOf(`${kind}:${it.id}`) !== it.season)) problems.push(`${kind}:${it.id}: a season look no season's Ticket gives`);
    for (const [id, S] of Object.entries(SEASONS)) { for (const [f, p] of S.track) for (const w of [f, p]) if (w && w.look && !findItem(...w.look.split(":"))) problems.push(`season ${id}: its Ticket gives ${w.look}, which doesn't exist`); if (!Economy.ITEMS[S.pass]) problems.push(`season ${id}: no Premium Ticket on the server`); }
    const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const tiers = Object.keys(byStars).sort().map(s => ({ stars: +s, items: byStars[s].length, median: median(byStars[s]) }));
    for (let i = 1; i < tiers.length; i++) if (tiers[i].median <= tiers[i - 1].median) problems.push(`${tiers[i].stars}-star looks are no dearer than ${tiers[i - 1].stars}-star ones`);
    const packs = Object.values(Economy.PACKS); if (packs.some((n, i) => i && n <= packs[i - 1])) problems.push("the Soul packs don't grow");
    const typicalRun = runBones({ perfects: 4, bestCombo: 6, powerups: 2 }, 20, false, 15000);   // a middling Story run: 20 hits, 15,000 points
    const runsForAll = Math.round(vault / typicalRun), soulDays = Math.ceil(Math.min(...Object.values(Economy.ITEMS).map(i => i.souls)) / Economy.DAILY);
    if (runsForAll < 150 || runsForAll > 3000) problems.push(`everything in the Vault takes ${runsForAll} middling runs (aim: 150 to 3,000)`);
    if (soulDays < 7 || soulDays > 60) problems.push(`the cheapest Soul look takes ${soulDays} days of free Souls (aim: 7 to 60)`);
    return { problems, items: count, vault, tiers, typicalRun, runsForAll, soulDays, packs: { ...Economy.PACKS }, daily: Economy.DAILY };
  }
  function welcomeGift() { // one-off starter purse so the shop is open on day one
    if (profile.gift) return;
    profile.gift = 1; profile.bones += 300; profile.bonesTotal += 300; persist(1500);
  }

  // ───────────────────────── challenges: daily, weekly and monthly ─────────────────────────
  // Three of each, picked from a pool and seeded by the day, the week (Monday to Sunday) or the month, so
  // everyone gets the same set. Progress counts into all three at once; each pays its bones when claimed.
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function weekStart(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }   // its Monday
  const PERIODS = {
    daily:   { label: "Daily",   pool: CHALLENGES,         seed: "skull-toss:",       key: (d = new Date()) => dayKey(d),
               next: n => new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), again: "back tomorrow" },
    weekly:  { label: "Weekly",  pool: CHALLENGES_WEEKLY,  seed: "skull-toss:week:",  key: (d = new Date()) => "w" + dayKey(weekStart(d)),
               next: n => { const m = weekStart(n); m.setDate(m.getDate() + 7); return m; }, again: "back on Monday" },
    monthly: { label: "Monthly", pool: CHALLENGES_MONTHLY, seed: "skull-toss:month:", key: (d = new Date()) => `m${d.getFullYear()}-${d.getMonth() + 1}`,
               next: n => new Date(n.getFullYear(), n.getMonth() + 1, 1), again: "back next month" }
  };
  const PERIOD_IDS = Object.keys(PERIODS);
  function ensurePeriod(per) {
    const P = PERIODS[per], key = P.key(), cur = profile[per];
    if (cur && cur.day === key && cur.items.length >= 1) return cur;
    // the rotation (v37): kinds the live config has switched off stay out, and an event can raise the pay (03d_flags.js)
    const off = Flags.get("challenges.off"), bonus = Math.max(0.5, Math.min(5, Number(Flags.get("challenges.bonus")) || 1));
    const rnd = mulberry32(hashStr(P.seed + key)), pool = P.pool.filter(c => !off.includes(c.id)), items = [];
    while (items.length < 3 && pool.length) {
      const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      let k = c.range[0] + Math.floor(rnd() * (c.range[1] - c.range[0] + 1));
      if (c.step) k = Math.max(c.step, Math.round(k / c.step) * c.step);
      items.push({ id: c.id, n: k * (c.scale || 1), reward: Math.round((c.reward(k) * bonus) / 5) * 5, have: 0, claimed: false });
    }
    profile[per] = { day: key, items };
    return profile[per];
  }
  const ensureDaily = () => ensurePeriod("daily");
  const chalDef = id => CHALLENGES.find(c => c.id === id);   // (the weekly and monthly goals share the daily ones' wording)
  const chalDone = it => it.have >= it.n;
  function challenge(id, value) { // progress hook: "add" counts up, "max" keeps the best
    if (inPractice()) return;
    for (const per of PERIOD_IDS) {
      for (const it of ensurePeriod(per).items) {
        if (it.id !== id || it.claimed) continue;
        const was = chalDone(it), def = chalDef(id);
        it.have = def.mode === "max" ? Math.max(it.have, value) : it.have + value;
        if (!was && chalDone(it) && !sandbox) { toast(`<b>${PERIODS[per].label} challenge done</b> · claim ${it.reward.toLocaleString("en-US")} bones`); Sound.ui("claim"); }
      }
    }
    updatePips();
  }
  function claimChallenge(i, per = "daily") {
    const d = ensurePeriod(per), it = d.items[i];
    if (!it || it.claimed || !chalDone(it)) return false;
    it.claimed = true; addBones(it.reward); profile.chalClaims++; persist(600); updatePips(); checkAchievements();
    Telemetry.emit("chal_claim", { period: per, kind: it.id });
    return true;
  }
  const claimable = per => { const d = profile[per]; return !!d && d.day === PERIODS[per].key() && d.items.some(it => chalDone(it) && !it.claimed); };
  function msToReset(per = "daily") { const n = new Date(); return PERIODS[per].next(n) - n; }
  function fmtCountdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
  }

  // ───────────────────────── attention pips ─────────────────────────
  function updatePips() {
    const chal = PERIOD_IDS.some(claimable);
    const cosm = unseen().length > 0, deals = profile.dealSeen !== dayKey();
    $("challengePip").hidden = !chal; $("customizePip").hidden = !cosm; $("storePip").hidden = !deals; $("menuBadge").hidden = !(chal || cosm);
    $("achPip").hidden = !(profile.achievements.length > (profile.achSeen || 0));
    renderSeasonChip();   // (07l_season.js)
    $("masteryPip").hidden = !masteryClaimable();
  }
