  // ───────────────────────── the campaign: eight maps, their bosses, and Morty's missing pieces ─────────────────────────
  // The maps themselves are data (src/maps/*.json, checked by the build and embedded as MAP_DATA). Each map is 80 hits
  // (v47): a mini-boss at 30, an end boss at 50, and the end at 80. Every end boss is holding one of the pieces of Morty
  // that were cut from the 1933 reel; beat all eight and the story ends with Morty whole again.
  // their names, tells and hints are strings (boss.<id>.name/short/tell/hint in src/strings/en.json)
  const BOSS_IDS = ["crow", "batbaron", "scarecrow", "owl", "gator", "jester", "cuckoo", "projectionist", "undertaker", "count", "pumpkin", "marrowroot", "madame", "ringmaster", "clockking", "reaper"];
  const BOSS_INFO = Object.fromEntries(BOSS_IDS.map(id => [id, { get name() { return t(`boss.${id}.name`); }, get short() { return t(`boss.${id}.short`); },
    get tell() { return t(`boss.${id}.tell`); }, get hint() { return t(`boss.${id}.hint`); } }]));
  // v44: each end boss holds a shard of the Black Ring (the corrected roadmap's progression: end boss → body-part
  // reward → Black Ring shard → mini-game → next map). Eight shards; with the last one the Black Ring is whole, the
  // Adventure ends, and Morty is Wizard Mort. The shard ids are the registry's, in map order (src/maps/registry.json).
  const FRAGMENTS = Object.fromEntries(MAP_DATA.map(M => [M.fragment, { from: M.bosses.end, map: M.n,
    get name() { return t(`fragment.${M.fragment}.name`); }, get line() { return t(`fragment.${M.fragment}.line`); } }]));
  // each end boss's body-part reward: a look in one of Morty's new slots (hair, beard, wings), his to wear from then on
  const BODY_PART = Object.fromEntries(MAP_DATA.map(M => { const [kind, id] = M.sheet.reward.bodyPart.split(":"); return [M.bosses.end, { kind, id }]; }));
  const MAP_COUNT = MAP_DATA.length;
  const mapData = n => MAP_DATA[clamp((n | 0) - 1, 0, MAP_COUNT - 1)];            // by stage number, 1-based
  const tierData = id => TIER_DATA.find(t => t.id === id) || TIER_DATA[0];
  // Arcade: map 1 is always open; every other map opens once Story has reached it
  const mapUnlocked = i => i === 0 || (profile.bestStage || 1) >= i + 1;
  // (the body parts' goals: 01b_catalog.js)
  for (const id of BOSS_IDS) REQ_TEXT["beat:" + id] = n => (n > 1 ? `Beat ${BOSS_INFO[id].name} ${n} times` : `Beat ${BOSS_INFO[id].name}`);
