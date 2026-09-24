  // ───────────────────────── the campaign: eight maps, their bosses, and Morty's missing pieces ─────────────────────────
  // The maps themselves are data (src/maps/*.json, checked by the build and embedded as MAP_DATA). Each map has a
  // mini-boss at 25 hits and an end boss at 50. Every end boss is holding one of the pieces of Morty that were cut
  // from the 1933 reel; beat all eight and the story ends with Morty whole again.
  // their names, tells and hints are strings (boss.<id>.name/short/tell/hint in src/strings/en.json)
  const BOSS_IDS = ["crow", "batbaron", "scarecrow", "owl", "gator", "jester", "cuckoo", "projectionist", "undertaker", "count", "pumpkin", "marrowroot", "madame", "ringmaster", "clockking", "reaper"];
  const BOSS_INFO = Object.fromEntries(BOSS_IDS.map(id => [id, { get name() { return t(`boss.${id}.name`); }, get short() { return t(`boss.${id}.short`); },
    get tell() { return t(`boss.${id}.tell`); }, get hint() { return t(`boss.${id}.hint`); } }]));
  const FRAGMENTS = Object.fromEntries([["tophat", "undertaker"], ["bowtie", "count"], ["gloves", "pumpkin"], ["cane", "marrowroot"], ["spats", "madame"], ["whistle", "ringmaster"], ["watch", "clockking"], ["shadow", "reaper"]].map(([id, from]) => [id, { from,
    get name() { return t(`fragment.${id}.name`); }, get line() { return t(`fragment.${id}.line`); } }]));
  const MAP_COUNT = MAP_DATA.length;
  const mapData = n => MAP_DATA[clamp((n | 0) - 1, 0, MAP_COUNT - 1)];            // by stage number, 1-based
  const tierData = id => TIER_DATA.find(t => t.id === id) || TIER_DATA[0];
  // Arcade: map 1 is always open; every other map opens once Story has reached it
  const mapUnlocked = i => i === 0 || (profile.bestStage || 1) >= i + 1;
