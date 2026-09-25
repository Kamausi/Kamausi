  // ───────────────────────── achievements ─────────────────────────
  // Milestones that stay done. Each one reads your lifetime record (a stat, or a small getter) and pays its bones
  // the moment it's reached: a medal drops in (at the top, or just under the score mid-run) with its own jingle. The Achievements sheet
  // lists them all, with how close you are to the ones still locked.
  const arcadeBest = f => Math.max(0, ...Object.values(profile.arcade || {}).map(a => a[f] || 0));
  const ACH_LIST = [
    { section: "Tossing" },
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
    { section: "The Adventure" },
    { id: "five-figures",    name: "Five Figures",      text: "Score 10,000 in one Adventure run",           stat: "bestScore", n: 10000, bones: 100, icon: "crown" },
    { id: "big-top",         name: "Big Top",           text: "Score 50,000 in one Adventure run",           stat: "bestScore", n: 50000, bones: 300, icon: "crown" },
    { id: "six-figures",     name: "Six Figures",       text: "Score 100,000 in one Adventure run",          stat: "bestScore", n: 100000, bones: 600, icon: "crown" },
    { id: "crow-catcher",    name: "Crow Catcher",      text: "Beat the Crow King",                      get: () => profile.bossLog.crow || 0, n: 1, bones: 150, icon: "crow" },
    { id: "pumpkin-smasher", name: "Pumpkin Smasher",   text: "Beat the Pumpkin King",                   get: () => profile.bossLog.pumpkin || 0, n: 1, bones: 300, icon: "pumpkin" },
    { id: "not-a-feather",   name: "Not a Feather Out of Place", text: "Beat a mini-boss without a miss",   stat: "miniFlawless", n: 1, bones: 250, icon: "crow" },
    { id: "clean-harvest",   name: "Clean Harvest",     text: "Beat an end boss without a miss",         stat: "bossFlawless", n: 1, bones: 400, icon: "pumpkin" },
    { id: "moving-on",       name: "Moving On",         text: "Reach map 2",                             stat: "bestStage", n: 2, bones: 200, icon: "tomb" },
    { id: "grand-tour",      name: "Grand Tour",        text: "Reach map 4",                             stat: "bestStage", n: 4, bones: 500, icon: "tomb" },
    { id: "half-reel",       name: "Half the Reel",     text: "Clear four maps",                         stat: "bestStage", n: 5, bones: 1000, icon: "crown" },
    { id: "whole-reel",      name: "The Whole Reel",    text: "Finish the Adventure: all eight maps",        stat: "storyClears", n: 1, bones: 3000, icon: "crown" },
    { id: "first-piece",     name: "A Piece of Morty",  text: "Win back one of Morty's missing pieces",  get: () => profile.fragments.length, n: 1, bones: 250, icon: "hat" },
    { id: "piece-by-piece",  name: "Piece by Piece",    text: "Win back four of Morty's pieces",         get: () => profile.fragments.length, n: 4, bones: 800, icon: "hat" },
    { id: "boss-hunter",     name: "Boss Hunter",       text: "Beat all eight mini-bosses",              get: () => MAP_REGISTRY.mini.filter(id => profile.bossLog[id]).length, n: 8, bones: 1200, icon: "crow" },
    { id: "boss-slayer",     name: "Boss Slayer",       text: "Beat all eight end bosses",               get: () => MAP_REGISTRY.end.filter(id => profile.bossLog[id]).length, n: 8, bones: 2000, icon: "pumpkin" },
    { section: "Arcade & modes" },
    { id: "arcade-debut",    name: "Arcade Debut",      text: "Play an Arcade run",                      stat: "arcadeRuns", n: 1, bones: 50, icon: "play" },
    { id: "survivor",        name: "Survivor",          text: "Survive 2 minutes in one Arcade run",     get: () => arcadeBest("secs"), n: 120, bones: 150, icon: "retry", time: true },
    { id: "iron-skull",      name: "Iron Skull",        text: "Survive 5 minutes in one Arcade run",     get: () => arcadeBest("secs"), n: 300, bones: 400, icon: "retry", time: true },
    { id: "map-hopper",      name: "Map Hopper",        text: "Play every Arcade map",                   get: () => Object.values(profile.arcade || {}).filter(a => a.runs > 0).length, get n() { return STAGES.length; }, bones: 200, icon: "home" },   // (STAGES is defined later in the build)
    { id: "arcade-ace",      name: "Arcade Ace",        text: "Score 25,000 in one Arcade run",          get: () => arcadeBest("score"), n: 25000, bones: 300, icon: "crown" },
    { section: "Power-ups" },
    { id: "power-hungry",    name: "Power Hungry",      text: "Grab 10 power-ups",                       stat: "powerups", n: 10, bones: 120, icon: "star" },
    { id: "cursed",          name: "Cursed!",           text: "Grab a Cursed Skull",                     stat: "cursed", n: 1, bones: 60, icon: "skull" },
    { id: "second-wind",     name: "Second Wind",       text: "Get saved by Second Chance",              stat: "saves", n: 1, bones: 60, icon: "retry" },
    { section: "Mishaps" },
    { id: "bonk",            name: "BONK!",             text: "Bonk Morty off something",                stat: "bonks", n: 1, bones: 25, icon: "flame" },
    { id: "concussed",       name: "Concussed",         text: "Bonk Morty 50 times",                     stat: "bonks", n: 50, bones: 150, icon: "flame" },
    { id: "early-grave",     name: "Early Grave",       text: "End a run without a single hit",          stat: "zeroRuns", n: 1, bones: 30, icon: "tomb" },
    { section: "The collection" },
    { id: "shopaholic",      name: "Shopaholic",        text: "Buy 5 things from the Curio Cart",        stat: "shopBuys", n: 5, bones: 200, icon: "cart" },
    { id: "collector",       name: "Collector",         text: "Own 50 things from the Skull Vault",      get: () => profile.unlocked.length, n: 50, bones: 300, icon: "vault" },
    { id: "bone-baron",      name: "Bone Baron",        text: "Earn 10,000 bones in all",                stat: "bonesTotal", n: 10000, bones: 400, icon: "bone" },
    { id: "challenger",      name: "Challenger",        text: "Claim 10 challenges",                     stat: "chalClaims", n: 10, bones: 200, icon: "tomb" },
    { id: "regular",         name: "Regular",           text: "Play 50 runs",                            stat: "games", n: 50, bones: 250, icon: "profile" },
    { id: "night-owl",       name: "Night Owl",         text: "Play for an hour in all",                 stat: "playTime", n: 3600, bones: 300, icon: "profile", time: true },
    // ── v45: three times as many ──
    { section: "Tossing" },
    { id: "warming-up",      name: "Warming Up",        text: "Hit a ×5 combo",                          stat: "bestStreak", n: 5, bones: 60, icon: "flame" },
    { id: "unstoppable",     name: "Unstoppable",       text: "Hit a ×30 combo",                         stat: "bestStreak", n: 30, bones: 900, icon: "flame" },
    { id: "legendary",       name: "Legendary Streak",  text: "Hit a ×50 combo",                         stat: "bestStreak", n: 50, bones: 2000, icon: "flame" },
    { id: "five-hundred",    name: "Five Hundred",      text: "Make 500 tosses",                         stat: "makes", n: 500, bones: 300, icon: "skull" },
    { id: "bone-machine",    name: "Bone Machine",      text: "Make 2,500 tosses",                       stat: "makes", n: 2500, bones: 800, icon: "skull" },
    { id: "ten-thousand",    name: "Ten Thousand",      text: "Make 10,000 tosses",                      stat: "makes", n: 10000, bones: 2500, icon: "crown" },
    { id: "iron-arm",        name: "Iron Arm",          text: "Toss 5,000 skulls",                       stat: "throws", n: 5000, bones: 700, icon: "skull" },
    { id: "legend-arm",      name: "Arm of Legend",     text: "Toss 25,000 skulls",                      stat: "throws", n: 25000, bones: 2500, icon: "crown" },
    { id: "dead-centre",     name: "Dead Centre",       text: "Land 10 perfects",                        stat: "perfects", n: 10, bones: 100, icon: "star" },
    { id: "marksman",        name: "Marksman",          text: "Land 250 perfects",                       stat: "perfects", n: 250, bones: 600, icon: "star" },
    { id: "crypt-sniper",    name: "Sniper of the Crypt", text: "Land 1,000 perfects",                   stat: "perfects", n: 1000, bones: 1800, icon: "star" },
    { id: "perfect-ten",     name: "Perfect Ten",       text: "Land 10 perfects in a row",               stat: "bestPerfStreak", n: 10, bones: 1200, icon: "star" },
    { id: "rim-rattler",     name: "Rim Rattler",       text: "Rattle 25 tosses in off the rim",         stat: "rims", n: 25, bones: 150, icon: "star" },
    { id: "rim-wizard",      name: "Rim Wizard",        text: "Rattle 250 tosses in off the rim",        stat: "rims", n: 250, bones: 600, icon: "star" },
    { id: "nerves-of-bone",  name: "Nerves of Bone",    text: "Make 10 tosses on your last skull",       stat: "clutch", n: 10, bones: 200, icon: "skull" },
    { id: "ice-sockets",     name: "Ice in the Sockets", text: "Make 100 tosses on your last skull",     stat: "clutch", n: 100, bones: 800, icon: "skull" },
    { id: "ring-of-fire",    name: "Ring of Fire",      text: "Set the ring alight with six in a row",   stat: "fireRings", n: 1, bones: 80, icon: "flame" },
    { id: "arsonist",        name: "Arsonist",          text: "Set the ring alight 25 times",            stat: "fireRings", n: 25, bones: 400, icon: "flame" },
    { id: "playing-fire",    name: "Playing with Fire", text: "Make 100 tosses through a burning ring",  stat: "fireMakes", n: 100, bones: 500, icon: "flame" },
    { id: "firestarter",     name: "Firestarter",       text: "Make 1,000 tosses through a burning ring", stat: "fireMakes", n: 1000, bones: 1500, icon: "flame" },
    { id: "hands-on",        name: "Hands On",          text: "Grab Morty 100 times",                    stat: "grabs", n: 100, bones: 100, icon: "skull" },
    { id: "clingy",          name: "Clingy",            text: "Grab Morty 1,000 times",                  stat: "grabs", n: 1000, bones: 400, icon: "skull" },
    { section: "The Adventure" },
    { id: "top-billing",     name: "Top Billing",       text: "Score 25,000 in one Adventure run",       stat: "bestScore", n: 25000, bones: 200, icon: "crown" },
    { id: "quarter-mil",     name: "Quarter Million",   text: "Score 250,000 in one Adventure run",      stat: "bestScore", n: 250000, bones: 1200, icon: "crown" },
    { id: "half-mil",        name: "Half a Million",    text: "Score 500,000 in one Adventure run",      stat: "bestScore", n: 500000, bones: 2500, icon: "crown" },
    { id: "millionaire",     name: "Millionaire Skull", text: "Score 1,000,000 in one Adventure run",    stat: "bestScore", n: 1000000, bones: 5000, icon: "crown" },
    { id: "million-all",     name: "A Million in All",  text: "Score 1,000,000 points in all",           stat: "scoreTotal", n: 1000000, bones: 800, icon: "crown" },
    { id: "ten-million",     name: "Ten Million",       text: "Score 10,000,000 points in all",          stat: "scoreTotal", n: 10000000, bones: 3000, icon: "crown" },
    { id: "fifty-in-one",    name: "Fifty in One",      text: "Hit 50 times in one run",                 stat: "best", n: 50, bones: 300, icon: "skull" },
    { id: "hundred-club",    name: "Hundred Club",      text: "Hit 100 times in one run",                stat: "best", n: 100, bones: 800, icon: "skull" },
    { id: "marathon",        name: "Marathon Tosser",   text: "Hit 250 times in one run",                stat: "best", n: 250, bones: 2500, icon: "crown" },
    { id: "third-reel",      name: "The Third Reel",    text: "Reach map 3",                             stat: "bestStage", n: 3, bones: 300, icon: "tomb" },
    { id: "deep-cuts",       name: "Deep Cuts",         text: "Reach map 6",                             stat: "bestStage", n: 6, bones: 900, icon: "tomb" },
    { id: "last-map",        name: "The Last Map",      text: "Reach the Black Abyss, map 8",            stat: "bestStage", n: 8, bones: 1500, icon: "tomb" },
    { id: "ring-whole",      name: "The Black Ring, Whole", text: "Win all eight shards of the Black Ring", get: () => profile.fragments.length, n: 8, bones: 2000, icon: "crown" },
    { id: "encore-perf",     name: "Encore Performance", text: "Finish the Adventure 3 times",           stat: "storyClears", n: 3, bones: 3000, icon: "crown" },
    { id: "box-office",      name: "Box Office Smash",  text: "Finish the Adventure 10 times",           stat: "storyClears", n: 10, bones: 8000, icon: "crown" },
    { id: "one-more",        name: "One More Skull",    text: "Take a continue",                         stat: "continues", n: 1, bones: 50, icon: "retry" },
    { id: "long-haul",       name: "The Long Haul",     text: "Play one run for 15 minutes",             stat: "longestRun", n: 900, bones: 600, icon: "retry", time: true },
    { section: "Bosses" },
    { id: "boss-grinder",    name: "Boss Grinder",      text: "Beat 10 end bosses",                      stat: "bossKills", n: 10, bones: 1200, icon: "pumpkin" },
    { id: "boss-machine",    name: "Boss Machine",      text: "Beat 50 end bosses",                      stat: "bossKills", n: 50, bones: 4000, icon: "pumpkin" },
    { id: "mini-mauler",     name: "Mini Mauler",       text: "Beat 25 mini-bosses",                     stat: "miniKills", n: 25, bones: 1000, icon: "crow" },
    { id: "untouchable",     name: "Untouchable",       text: "Beat 5 end bosses without a miss",        stat: "bossFlawless", n: 5, bones: 1500, icon: "pumpkin" },
    { id: "feather-duster",  name: "Feather Duster",    text: "Beat 10 mini-bosses without a miss",      stat: "miniFlawless", n: 10, bones: 1000, icon: "crow" },
    { section: "Arcade & modes" },
    { id: "arcade-regular",  name: "Arcade Regular",    text: "Play 10 Arcade runs",                     stat: "arcadeRuns", n: 10, bones: 150, icon: "play" },
    { id: "arcade-rat",      name: "Arcade Rat",        text: "Play 50 Arcade runs",                     stat: "arcadeRuns", n: 50, bones: 600, icon: "play" },
    { id: "ten-minutes",     name: "Ten-Minute Tosser", text: "Survive 10 minutes in one Arcade run",    get: () => arcadeBest("secs"), n: 600, bones: 1200, icon: "retry", time: true },
    { id: "arcade-legend",   name: "Arcade Legend",     text: "Score 100,000 in one Arcade run",         get: () => arcadeBest("score"), n: 100000, bones: 1500, icon: "crown" },
    { id: "curtain-caller",  name: "Curtain Caller",    text: "Make 15 in one Curtain Call",             get: () => modeBest("curtain"), n: 15, bones: 300, icon: "star" },
    { id: "full-gallery",    name: "Full Gallery",      text: "Hit 8 targets in one Target Gallery",     get: () => modeBest("gallery"), n: 8, bones: 300, icon: "star" },
    { id: "practice-perfect", name: "Practice Makes Perfect", text: "Finish 5 Practice sessions",       get: () => (profile.modes.practice || {}).runs || 0, n: 5, bones: 100, icon: "book" },
    { id: "mode-tourist",    name: "Mode Tourist",      text: "Play six different ways",                 get: () => Object.values(profile.modes || {}).filter(m => m && m.runs > 0).length + (profile.arcadeRuns > 0 ? 1 : 0) + (profile.games > 0 ? 1 : 0), n: 6, bones: 400, icon: "play" },
    { section: "Can Alley" },
    { id: "step-right-up",   name: "Step Right Up",     text: "Play a Can Alley bonus round",            stat: "bonusRounds", n: 1, bones: 60, icon: "star" },
    { id: "all-fall-down",   name: "All Fall Down",     text: "Clear Can Alley",                         stat: "canClears", n: 1, bones: 200, icon: "star" },
    { id: "carnival-king",   name: "Carnival King",     text: "Clear Can Alley 7 times",                 stat: "canClears", n: 7, bones: 800, icon: "crown" },
    { id: "tin-can-alley",   name: "Tin Can Alley",     text: "Knock down 100 cans",                     stat: "cansDown", n: 100, bones: 300, icon: "star" },
    { id: "scrap-merchant",  name: "Scrap Merchant",    text: "Knock down 500 cans",                     stat: "cansDown", n: 500, bones: 900, icon: "star" },
    { id: "prize-hoarder",   name: "Prize Hoarder",     text: "Win all seven Can Alley prizes",          get: () => CAN_PRIZES.filter(([k, id]) => profile.unlocked.includes(k + ":" + id)).length, n: 7, bones: 2500, icon: "crown" },
    { section: "Power-ups" },
    { id: "power-glutton",   name: "Power Glutton",     text: "Grab 50 power-ups",                       stat: "powerups", n: 50, bones: 400, icon: "star" },
    { id: "power-mad",       name: "Power Mad",         text: "Grab 200 power-ups",                      stat: "powerups", n: 200, bones: 1200, icon: "star" },
    { id: "full-kit",        name: "The Full Kit",      text: "Grab every kind of power-up",             get: () => POWER_KINDS.filter(id => (profile.powerLog || {})[id]).length, n: 7, bones: 500, icon: "star" },
    { id: "hexed",           name: "Hexed",             text: "Grab 10 Cursed Skulls",                   stat: "cursed", n: 10, bones: 400, icon: "skull" },
    { id: "cheating-death",  name: "Cheating Death",    text: "Get saved by Second Chance 10 times",     stat: "saves", n: 10, bones: 400, icon: "retry" },
    { section: "Targets, shots & secrets" },
    { id: "two-birds",       name: "Two Birds",         text: "Hit a bonus target",                      stat: "targetHits", n: 1, bones: 50, icon: "star" },
    { id: "target-practice", name: "Target Practice",   text: "Hit 50 bonus targets",                    stat: "targetHits", n: 50, bones: 300, icon: "star" },
    { id: "trick-artist",    name: "Trick-Shot Artist", text: "Hit 250 bonus targets",                   stat: "targetHits", n: 250, bones: 900, icon: "star" },
    { id: "found-one",       name: "Found One",         text: "Hit a secret target",                     get: () => profile.secretTargets || 0, n: 1, bones: 150, icon: "book" },
    { id: "secret-keeper",   name: "Secret Keeper",     text: "Hit 5 secret targets",                    get: () => profile.secretTargets || 0, n: 5, bones: 600, icon: "book" },
    { id: "signature",       name: "Signature Move",    text: "Land a signature shot",                   get: () => Object.keys(profile.shots || {}).length, n: 1, bones: 100, icon: "star" },
    { id: "shot-book",       name: "Shot Book",         text: "Land five different signature shots",     get: () => Object.keys(profile.shots || {}).length, n: 5, bones: 500, icon: "book" },
    { id: "shot-caller",     name: "Shot Caller",       text: "Land every signature shot",               get: () => Object.keys(profile.shots || {}).filter(id => SHOT_IDS.includes(id)).length, get n() { return SHOT_IDS.length; }, bones: 2000, icon: "crown" },
    { id: "snoop",           name: "Snoop",             text: "Find a secret",                           get: () => (profile.secrets || []).length, n: 1, bones: 100, icon: "book" },
    { id: "sleuth",          name: "Sleuth",            text: "Find five secrets",                       get: () => (profile.secrets || []).length, n: 5, bones: 500, icon: "book" },
    { id: "no-secrets",      name: "No More Secrets",   text: "Find every secret",                       get: () => (profile.secrets || []).length, get n() { return SECRETS.length; }, bones: 2000, icon: "crown" },
    { id: "archivist",       name: "Archivist",         text: "Fill in 25 Codex entries",                get: () => codexCount(), n: 25, bones: 300, icon: "book" },
    { id: "historian",       name: "Historian",         text: "Fill in the whole Codex",                 get: () => codexCount(), get n() { return codexTotal(); }, bones: 2500, icon: "book" },
    { section: "Mishaps" },
    { id: "misser",          name: "Nobody's Perfect",  text: "Miss 100 times",                          stat: "misses", n: 100, bones: 60, icon: "tomb" },
    { id: "pro-misser",      name: "Professional Misser", text: "Miss 1,000 times",                      stat: "misses", n: 1000, bones: 300, icon: "tomb" },
    { id: "wide-load",       name: "Wide Load",         text: "Miss wide 50 times",                      stat: "wides", n: 50, bones: 100, icon: "tomb" },
    { id: "sky-high",        name: "Sky High",          text: "Throw too high 50 times",                 stat: "overs", n: 50, bones: 100, icon: "tomb" },
    { id: "worms-eye",       name: "Worm's-Eye View",   text: "Throw too low 50 times",                  stat: "lows", n: 50, bones: 100, icon: "tomb" },
    { id: "short-changed",   name: "Short-Changed",     text: "Fall short 50 times",                     stat: "shorts", n: 50, bones: 100, icon: "tomb" },
    { id: "postman",         name: "The Postman",       text: "Hit the post 25 times",                   stat: "posts", n: 25, bones: 100, icon: "tomb" },
    { id: "clank-tank",      name: "Clank Tank",        text: "Clank off the rim 50 times",              stat: "clanks", n: 50, bones: 100, icon: "tomb" },
    { id: "seed-face",       name: "Seed Face",         text: "Take 10 pumpkin seeds to the face",       stat: "seeds", n: 10, bones: 100, icon: "pumpkin" },
    { id: "brain-rattled",   name: "Brain Rattled",     text: "Bonk Morty 250 times",                    stat: "bonks", n: 250, bones: 400, icon: "flame" },
    { id: "walking-disaster", name: "Walking Disaster", text: "Get knocked out of the air 25 times",     stat: "hazardHits", n: 25, bones: 150, icon: "flame" },
    { id: "nap-time",        name: "Nap Time",          text: "End 10 runs without a hit",               stat: "zeroRuns", n: 10, bones: 100, icon: "tomb" },
    { section: "The collection" },
    { id: "bone-tycoon",     name: "Bone Tycoon",       text: "Earn 50,000 bones in all",                stat: "bonesTotal", n: 50000, bones: 1000, icon: "bone" },
    { id: "bone-mogul",      name: "Bone Mogul",        text: "Earn 250,000 bones in all",               stat: "bonesTotal", n: 250000, bones: 3000, icon: "bone" },
    { id: "big-spender",     name: "Big Spender",       text: "Spend 10,000 bones",                      stat: "bonesSpent", n: 10000, bones: 400, icon: "vault" },
    { id: "whale-bones",     name: "Whale Bones",       text: "Spend 100,000 bones",                     stat: "bonesSpent", n: 100000, bones: 2000, icon: "vault" },
    { id: "grave-robber",    name: "Grave Robber",      text: "Open a Mystery Coffin",                   stat: "coffins", n: 1, bones: 50, icon: "cart" },
    { id: "coffin-collector", name: "Coffin Collector", text: "Open 25 Mystery Coffins",                 stat: "coffins", n: 25, bones: 500, icon: "cart" },
    { id: "mort-customer",   name: "Mort's Customer",   text: "Buy something at the Curio Cart",         stat: "shopBuys", n: 1, bones: 60, icon: "cart" },
    { id: "hoarder",         name: "Hoarder",           text: "Own 150 things from the Skull Vault",     get: () => profile.unlocked.length, n: 150, bones: 800, icon: "vault" },
    { id: "museum-piece",    name: "Museum Piece",      text: "Own 300 things from the Skull Vault",     get: () => profile.unlocked.length, n: 300, bones: 2500, icon: "vault" },
    { section: "Dedication" },
    { id: "getting-started", name: "Getting Started",   text: "Play 10 runs",                            stat: "games", n: 10, bones: 80, icon: "profile" },
    { id: "devoted",         name: "Devoted",           text: "Play 250 runs",                           stat: "games", n: 250, bones: 800, icon: "profile" },
    { id: "lifer",           name: "Lifer",             text: "Play 1,000 runs",                         stat: "games", n: 1000, bones: 2500, icon: "crown" },
    { id: "five-hours",      name: "Matinee to Midnight", text: "Play for five hours in all",            stat: "playTime", n: 18000, bones: 800, icon: "profile", time: true },
    { id: "round-clock",     name: "Round the Clock",   text: "Play for 24 hours in all",                stat: "playTime", n: 86400, bones: 3000, icon: "crown", time: true },
    { id: "level-ten",       name: "Top of the Bill",   text: "Reach career level 10",                   get: () => levelFor(profile.xp), n: 10, bones: 300, icon: "crown" },
    { id: "level-25",        name: "Headliner",         text: "Reach career level 25",                   get: () => levelFor(profile.xp), n: 25, bones: 1200, icon: "crown" },
    { id: "level-50",        name: "Mortimer's Equal",  text: "Reach career level 50",                   get: () => levelFor(profile.xp), n: 50, bones: 5000, icon: "crown" },
    { id: "three-days",      name: "Three in a Row",    text: "Play three days in a row",                stat: "bestDayStreak", n: 3, bones: 100, icon: "tomb" },
    { id: "week-graveyard",  name: "A Week in the Graveyard", text: "Play seven days in a row",           stat: "bestDayStreak", n: 7, bones: 400, icon: "tomb" },
    { id: "month-morty",     name: "A Month of Morty",  text: "Play thirty days in a row",               stat: "bestDayStreak", n: 30, bones: 2000, icon: "crown" },
    { id: "challenge-champ", name: "Challenge Champ",   text: "Claim 50 challenges",                     stat: "chalClaims", n: 50, bones: 600, icon: "tomb" },
    { id: "challenge-legend", name: "Challenge Legend", text: "Claim 250 challenges",                    stat: "chalClaims", n: 250, bones: 2000, icon: "crown" },
    { id: "full-set",        name: "The Full Set",      text: "Claim all three of a set of challenges",  stat: "chalSets", n: 1, bones: 150, icon: "tomb" },
    { id: "set-collector",   name: "Set Collector",     text: "Claim 10 full sets of challenges",        stat: "chalSets", n: 10, bones: 800, icon: "crown" },
    { id: "overachiever",    name: "Overachiever",      text: "Unlock 75 achievements",                  get: () => profile.achievements.length, n: 75, bones: 1500, icon: "crown" },
    { id: "completionist",   name: "Completionist",     text: "Unlock 125 achievements",                 get: () => profile.achievements.length, n: 125, bones: 5000, icon: "crown" }
  ];
  const POWER_KINDS = ["rush", "deadeye", "blast", "ghost", "magnet", "second", "cursed"];   // (07c_power.js: POWER_IDS, which loads later)
  const modeBest = m => ((profile.modes || {})[m] || {}).best || 0;
  // v45: every boss has its own (the Crow King and the Pumpkin King had theirs already), and every power-up its ten
  ACH_LIST.push({ section: "Bosses" });
  for (const id of BOSS_IDS) if (id !== "crow" && id !== "pumpkin") {
    const end = MAP_REGISTRY.end.includes(id);
    ACH_LIST.push({ id: "beat-" + id, get name() { return t("ach.beat.name", { boss: BOSS_INFO[id].name }); }, get text() { return t("ach.beat.text", { boss: BOSS_INFO[id].name }); }, get: () => profile.bossLog[id] || 0, n: 1, bones: end ? 400 : 150, icon: end ? "pumpkin" : "crow" });
  }
  ACH_LIST.push({ section: "Power-ups" });
  for (const id of POWER_KINDS) ACH_LIST.push({ id: "fan-" + id, get name() { return t("ach.fan.name", { power: POWERS[id].name }); }, get text() { return t("ach.fan.text", { power: POWERS[id].name }); }, get: () => (profile.powerLog || {})[id] || 0, n: 10, bones: 200, icon: "star" });
  // the list, each under its section (the sheet shows them in groups)
  const ACHIEVEMENTS = [], ACH_SECTIONS = [];
  { let cat = ""; for (const A of ACH_LIST) { if (A.section) { cat = A.section; if (!ACH_SECTIONS.includes(cat)) ACH_SECTIONS.push(cat); continue; } A.cat = cat; ACHIEVEMENTS.push(A); } }
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
  // a challenge done (04b_economy.js): its card, queued with the medals
  function chalPop(per, it) {
    const def = chalDef(it.id);
    achQueue.push({ chal: true, icon: "tomb", kicker: t("chal.popK", { what: PERIODS[per].label }), name: def ? def.text(it.n) : "", text: t("chal.popS"), bones: it.reward });
    achNext();
  }
  // the medal: drops in at the top, holds, and makes way for the next one
  const achQueue = [], achTimers = {};
  let achBusy = false;
  function achNext() {
    if (achBusy || !achQueue.length) return;
    if (sandbox) achQueue.splice(0, achQueue.length - 1);   // tests don't wait on timers: the newest medal shows at once
    const A = achQueue.shift(), el = $("achPop");
    achBusy = !sandbox;
    // (v51: a finished challenge drops in here too, in the same spot, so everything you've earned turns up in one place)
    el.classList.toggle("chal", !!A.chal);
    el.innerHTML = `<span class="medal"><svg><use href="#i-${A.icon}"/></svg></span><span class="t"><span class="k">${A.chal ? A.kicker : "Achievement unlocked"}</span><b>${A.name}</b><span class="s">${A.text}</span></span><span class="r">+${A.bones.toLocaleString("en-US")}<svg><use href="#i-bone"/></svg></span>`;
    const inPlay = !hud.hidden;   // mid-run it sits just under the score, not over it
    el.classList.toggle("play", inPlay); el.style.top = inPlay ? `${Math.round(bestEl.getBoundingClientRect().bottom + 10)}px` : "";
    el.hidden = false; el.classList.remove("in", "out"); void el.offsetWidth; el.classList.add("in");
    if (A.chal) { Sound.ui("claim"); buzz(12); } else { Sound.sample("achievement", () => Sound.unlock()); buzz([10, 40, 10]); }
    srEl.textContent = `${A.chal ? A.kicker : "Achievement unlocked"}: ${A.name}. ${A.text}. ${A.bones} bones.`;
    clearTimeout(achTimers.out); clearTimeout(achTimers.end);
    achTimers.out = setTimeout(() => { el.classList.remove("in"); el.classList.add("out"); }, sandbox ? 60 : 2600);
    achTimers.end = setTimeout(() => { el.hidden = true; el.classList.remove("out"); achBusy = false; achNext(); }, sandbox ? 120 : 3000);
  }
  // the sheet
  function renderAchievements() {
    const got = ACHIEVEMENTS.filter(A => achHas(A.id)).length, fmtV = (A, v) => A.time ? (A.n >= 3600 ? `${Math.floor(v / 60)}m` : `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, "0")}`) : Math.floor(v).toLocaleString("en-US");
    $("achCount").innerHTML = `<b>${got}</b> of ${ACHIEVEMENTS.length} unlocked`;
    $("achBar").firstElementChild.style.width = `${Math.round((got / ACHIEVEMENTS.length) * 100)}%`;
    $("achList").innerHTML = ACH_SECTIONS.map(sec => { const L = ACHIEVEMENTS.filter(A => A.cat === sec); return `<h3 class="stat-h ach-h">${sec} <span class="n">${L.filter(A => achHas(A.id)).length}/${L.length}</span></h3><div class="ach-grid">` + L.map(A => {
      const has = achHas(A.id), v = Math.min(achValue(A), A.n), pct = Math.round((v / A.n) * 100);
      return `<div class="ach${has ? " got" : ""}"><span class="medal"><svg><use href="#i-${has ? A.icon : "lock"}"/></svg></span>`
        + `<div class="ach-t"><b>${A.name}</b><span>${A.text}</span>`
        + (has ? "" : `<div class="ach-prog"><div class="bar"><i style="width:${pct}%"></i></div><em>${fmtV(A, v)}/${fmtV(A, A.n)}</em></div>`)
        + `</div><span class="ach-r">${has ? "Done" : `+${A.bones.toLocaleString("en-US")}`}</span></div>`;
    }).join("") + "</div>"; }).join("");   // (v50: cards, two across)
    if (profile.achSeen !== profile.achievements.length) { profile.achSeen = profile.achievements.length; persist(2000); updatePips(); }
  }
