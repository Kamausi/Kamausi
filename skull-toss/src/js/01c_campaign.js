  // ───────────────────────── the campaign: eight maps, their bosses, and Morty's missing pieces ─────────────────────────
  // The maps themselves are data (src/maps/*.json, checked by the build and embedded as MAP_DATA). Each map has a
  // mini-boss at 25 hits and an end boss at 50. Every end boss is holding one of the pieces of Morty that were cut
  // from the 1933 reel; beat all eight and the story ends with Morty whole again.
  const BOSS_INFO = {
    crow:          { name: "The Crow King",         short: "Crow King",      tell: "He crouches and caws before he swoops", hint: "He swoops near and far: lead the ring" },
    batbaron:      { name: "The Bat Baron",         short: "Bat Baron",      tell: "He screeches, then dives", hint: "He dives high and low: the screech comes first" },
    scarecrow:     { name: "Old Tattersack",        short: "Tattersack",     tell: "He sways with the wind, then lurches", hint: "The ring swings from his arm: time the sway" },
    owl:           { name: "The Bone Owl",          short: "Bone Owl",       tell: "Two hoots, then a hop", hint: "Two hoots, then a hop: throw after it lands" },
    gator:         { name: "Ferryman Gator",        short: "Gator",          tell: "Bubbles, then he surfaces somewhere else", hint: "Bubbles show where he'll surface next" },
    jester:        { name: "Jack-in-the-Box",       short: "Jack",           tell: "The crank winds, then POP", hint: "After the POP it hangs at the top: throw then" },
    cuckoo:        { name: "The Cuckoo",            short: "Cuckoo",         tell: "The clock whirrs, then the bird springs out", hint: "The clock ticks it round: lead it by a tick" },
    projectionist: { name: "The Projectionist",     short: "Projectionist",  tell: "The reel clatters, then the picture jumps", hint: "The flicker warns of the cut" },
    undertaker:    { name: "The Undertaker",        short: "Undertaker",     tell: "He spits on his hands, then shovels", hint: "Throw between his clods of dirt" },
    count:         { name: "Count Crookula",        short: "Count",          tell: "His cape flares before the bats fly", hint: "Throw between his bat volleys" },
    pumpkin:       { name: "The Pumpkin King",      short: "Pumpkin King",   tell: "He puffs his cheeks before the seeds", hint: "Throw between his seed volleys" },
    marrowroot:    { name: "Old Marrowroot",        short: "Marrowroot",     tell: "His branches creak before the bones drop", hint: "Bones fall from his branches: throw between them" },
    madame:        { name: "Madame Muck",           short: "Madame Muck",    tell: "She gargles before she spits", hint: "Throw between her mud spits" },
    ringmaster:    { name: "The Ringmaster",        short: "Ringmaster",     tell: "He twirls his cane before the pins fly", hint: "Throw between the juggling pins" },
    clockking:     { name: "The Clockwork King",    short: "Clockwork King", tell: "His gears grind before they fly", hint: "Throw between the flying gears" },
    reaper:        { name: "The Reel Reaper",       short: "Reaper",         tell: "The scythe glints before the film cuts", hint: "Throw between the frames. Hurt him and he circles" }
  };
  const FRAGMENTS = {
    tophat:  { name: "Top Hat",      from: "undertaker", line: "He buried it with a note: 'Too dapper for the dead.'" },
    bowtie:  { name: "Bow Tie",      from: "count",      line: "The Count wore it to every funeral. Nobody asked." },
    gloves:  { name: "White Gloves", from: "pumpkin",    line: "Four fingers each, as the studio's style sheet required." },
    cane:    { name: "Cane",         from: "marrowroot", line: "Grafted onto a branch. It had started to bud." },
    spats:   { name: "Spats",        from: "madame",     line: "Soaked through, but they still tap." },
    whistle: { name: "Whistle",      from: "ringmaster", line: "Morty's voice, kept in a tin whistle for the midway." },
    watch:   { name: "Pocket Watch", from: "clockking",  line: "Still set to the minute the reel was cut." },
    shadow:  { name: "Shadow",       from: "reaper",     line: "The last piece. Without it, nothing else could stand up." }
  };
  const MAP_COUNT = MAP_DATA.length;
  const mapData = n => MAP_DATA[clamp((n | 0) - 1, 0, MAP_COUNT - 1)];            // by stage number, 1-based
  const tierData = id => TIER_DATA.find(t => t.id === id) || TIER_DATA[0];
  // Arcade: map 1 is always open; every other map opens once Story has reached it
  const mapUnlocked = i => i === 0 || (profile.bestStage || 1) >= i + 1;
