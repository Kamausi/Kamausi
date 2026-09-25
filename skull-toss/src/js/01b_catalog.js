  // ───────────────────────── the Vault, tripled ─────────────────────────
  // Three new shelves (hats, auras, and poles for the ring) and a lot more on the old ones. Some things can
  // only be won: failing in style (the Hall of Shame), beating the bosses, or bought from the Curio Cart
  // (shop: true — never sold in the Vault). Still looks only: nothing here changes how the skull flies.
  const MORE = {
    skull: [
      { id: "cookie", name: "Choc-Chip Cookie", s: 1, price: 550 },           { id: "cow", name: "Moo Skull", s: 1, price: 600 },
      { id: "marble", name: "Marble Bust", s: 2, price: 1100 },                { id: "chocolate", name: "Chocolate", s: 2, price: 1200 },
      { id: "jawbreaker", name: "Jawbreaker", s: 2, price: 1300 },             { id: "watermelon", name: "Watermelon", s: 2, price: 1300 },
      { id: "tiger", name: "Tiger", s: 2, price: 1500 },                       { id: "zombie", name: "Zombie", s: 2, price: 1500, req: ["games", 60] },
      { id: "snowman", name: "Snowman", s: 2, price: 1600 },                   { id: "moon", name: "Moon Rock", s: 3, price: 2600 },
      { id: "glow", name: "Glow-in-the-Dark", s: 3, price: 2900 },             { id: "robot", name: "Robo-Skull", s: 3, price: 3200 },
      { id: "mummy", name: "Mummy", s: 3, price: 3300 },                        { id: "blueprint", name: "Blueprint", s: 3, price: 3400 },
      { id: "neon", name: "Neon Sign", s: 3, price: 3600, req: ["bestScore", 40000] }, { id: "ghostly", name: "See-Through", s: 3, price: 3800 },
      { id: "onyx", name: "Onyx", s: 4, price: 6000 },                          { id: "lava", name: "Molten", s: 4, price: 7500 },
      { id: "cracked", name: "Cracked & Taped", s: 2, req: ["bonks", 200], shame: true },
      { id: "harvest", name: "Harvest Gold", s: 4, req: ["bossKills", 3], boss: true },
      { id: "disco", name: "Disco Ball", s: 4, price: 9000, shop: true },      { id: "bubblegum", name: "Bubblegum", s: 3, price: 4200, shop: true },
      { id: "stained", name: "Stained Glass", s: 4, price: 9500, shop: true }
    ],
    eyes: [
      { id: "googly", name: "Googly Eyes", s: 1, price: 450 },     { id: "cat", name: "Cat's Eyes", s: 2, price: 900 },
      { id: "shifty", name: "Shifty", s: 1, price: 500 },          { id: "moons", name: "Crescent Moons", s: 2, price: 1100 },
      { id: "clover", name: "Lucky Clovers", s: 2, price: 1300 },  { id: "led", name: "Red LEDs", s: 3, price: 2600 },
      { id: "bloodshot", name: "Bloodshot", s: 2, price: 1000 },   { id: "fire", name: "Eye Fires", s: 3, price: 3100 },
      { id: "sparkle", name: "Sparkly", s: 3, price: 2900 },
      { id: "tears", name: "Waterworks", s: 2, req: ["misses", 250], shame: true },
      { id: "question", name: "Question Marks", s: 2, req: ["wides", 60], shame: true },
      { id: "target", name: "Crosshairs", s: 3, req: ["miniFlawless", 1], boss: true },
      { id: "diamond", name: "Diamonds", s: 4, price: 8000, shop: true }
    ],
    teeth: [
      { id: "braces", name: "Braces", s: 1, price: 500 },         { id: "bucktooth", name: "Buck Teeth", s: 1, price: 550 },
      { id: "gap", name: "Gap Tooth", s: 1, price: 400 },         { id: "piano", name: "Piano Keys", s: 2, price: 1400 },
      { id: "shark", name: "Shark", s: 3, price: 2700 },          { id: "candycorn", name: "Candy Corn", s: 2, price: 1200 },
      { id: "grill", name: "Gold Grill", s: 3, price: 3500, req: ["bestScore", 60000] },
      { id: "rotten", name: "Rotten", s: 2, req: ["quickDeaths", 10], shame: true },
      { id: "diamond", name: "Diamond Grill", s: 4, price: 9000, shop: true }
    ],
    paint: [
      { id: "racing", name: "Racing Stripe", s: 1, price: 350 },  { id: "zebra", name: "Zebra", s: 1, price: 450 },
      { id: "tartan", name: "Tartan", s: 2, price: 900 },         { id: "leopard", name: "Leopard", s: 2, price: 950 },
      { id: "camo", name: "Camouflage", s: 2, price: 950 },       { id: "argyle", name: "Argyle", s: 2, price: 1000 },
      { id: "barber", name: "Barber Pole", s: 2, price: 1100 },   { id: "harlequin", name: "Harlequin", s: 2, price: 1200 },
      { id: "sprinkles", name: "Sprinkles", s: 2, price: 1250 },  { id: "bolt", name: "Lightning Bolt", s: 2, price: 1300 },
      { id: "flames", name: "Hot-Rod Flames", s: 3, price: 2600 }, { id: "rainbow", name: "Rainbow", s: 3, price: 2800 },
      { id: "circuit", name: "Circuit Board", s: 3, price: 3000 }, { id: "marigold", name: "Marigolds", s: 3, price: 3200 },
      { id: "galaxy", name: "Galaxy", s: 4, price: 6500 },
      { id: "tiretracks", name: "Tire Tracks", s: 2, req: ["shorts", 40], shame: true },
      { id: "eightball", name: "Eight Ball", s: 3, price: 4400, shop: true }
    ],
    trail: [
      { id: "hearts", name: "Hearts", s: 1, price: 500 },         { id: "leaves", name: "Autumn Leaves", s: 1, price: 500 },
      { id: "snow", name: "Snowfall", s: 2, price: 900 },         { id: "eyeballs", name: "Eyeballs", s: 2, price: 1300 },
      { id: "teeth", name: "Loose Teeth", s: 2, price: 1100 },    { id: "candy", name: "Wrapped Candy", s: 2, price: 1200 },
      { id: "rainbow", name: "Rainbow", s: 3, price: 3200 },       { id: "slime", name: "Slime", s: 3, price: 2800 },
      { id: "pixels", name: "Pixel Dust", s: 3, price: 2600 },     { id: "rings", name: "Smoke Rings", s: 2, price: 1400 },
      { id: "zzz", name: "Snore Trail", s: 2, req: ["zeroRuns", 5], shame: true },
      { id: "tp", name: "Toilet Paper", s: 2, req: ["clanks", 50], shame: true },
      { id: "feathers", name: "Crow Feathers", s: 3, req: ["miniKills", 3], boss: true },
      { id: "seeds", name: "Pumpkin Seeds", s: 3, req: ["bossKills", 1], boss: true },
      { id: "coins", name: "Gold Coins", s: 4, price: 7000, shop: true }, { id: "cards", name: "Playing Cards", s: 3, price: 4000, shop: true }
    ],
    impact: [
      { id: "pow", name: "POW!", s: 1, price: 450 },             { id: "zonk", name: "ZONK!", s: 1, price: 450 },
      { id: "boing", name: "BOING!", s: 2, price: 900 },         { id: "thwack", name: "THWACK!", s: 2, price: 1000 },
      { id: "sploosh", name: "SPLOOSH!", s: 2, price: 1300 },    { id: "zap", name: "ZAP!", s: 3, price: 2600 },
      { id: "blammo", name: "BLAMMO!", s: 3, price: 3000 },
      { id: "whoops", name: "WHOOPS!", s: 2, req: ["misses", 200], shame: true },
      { id: "caw", name: "CAW!", s: 3, req: ["miniKills", 1], boss: true },
      { id: "squash", name: "SQUASH!", s: 3, req: ["bossKills", 2], boss: true },
      { id: "kapow", name: "KA-POW!", s: 4, price: 7000, shop: true }
    ],
    ring: [
      { id: "rope", name: "Braided Rope", s: 1, price: 600 },    { id: "tire", name: "Old Tire", s: 1, price: 650 },
      { id: "donut", name: "Frosted Donut", s: 2, price: 1300 }, { id: "wreath", name: "Holly Wreath", s: 2, price: 1400 },
      { id: "hula", name: "Hula Hoop", s: 2, price: 1500 },      { id: "snake", name: "Ouroboros", s: 3, price: 3000 },
      { id: "neon", name: "Neon Tube", s: 3, price: 3200 },      { id: "rainbow", name: "Rainbow", s: 3, price: 3500 },
      { id: "halo", name: "Halo", s: 4, price: 7000, req: ["bossFlawless", 1] },
      { id: "toilet", name: "Toilet Seat", s: 2, req: ["posts", 30], shame: true },
      { id: "vine", name: "Pumpkin Vine", s: 3, req: ["bossKills", 1], boss: true },
      { id: "nest", name: "Crow's Nest", s: 3, req: ["miniKills", 2], boss: true },
      { id: "lifebuoy", name: "Lifebuoy", s: 3, price: 4500, shop: true }, { id: "saturn", name: "Saturn", s: 4, price: 9000, shop: true }
    ],
    aim: [
      { id: "pink", name: "Bubblegum Pink", s: 1, price: 350 },  { id: "mint", name: "Mint", s: 1, price: 350 },
      { id: "ocean", name: "Deep Ocean", s: 2, price: 800 },     { id: "sunset", name: "Sunset", s: 2, price: 1200 },
      { id: "candy", name: "Candy Stripe", s: 2, price: 1300 },  { id: "ghost", name: "Ghostly", s: 3, price: 2400 },
      { id: "bones", name: "Tiny Bones", s: 3, req: ["miniKills", 1], boss: true },
      { id: "starry", name: "Starry", s: 4, price: 6000, shop: true }
    ],
    reel: [
      { id: "noir", name: "Film Noir", s: 2, price: 1100 },     { id: "cyan", name: "Cyanotype", s: 3, price: 2400 },
      { id: "infra", name: "Infrared", s: 3, price: 2800 },    { id: "twostrip", name: "Two-Strip Color", s: 3, price: 3200 },
      { id: "bootleg", name: "Bootleg Copy", s: 4, price: 6000, shop: true }
    ],
    title: [
      { id: "understudy", name: "Understudy", s: 1, req: ["careerLevel", 5] },          { id: "topbill", name: "Top of the Bill", s: 2, req: ["careerLevel", 10] },   // (career levels, v31)
      { id: "matinee", name: "Matinee Idol", s: 2, req: ["careerLevel", 20] },          { id: "boxoffice", name: "Box Office Draw", s: 3, req: ["careerLevel", 30] },
      { id: "legend", name: "Picture-Palace Legend", s: 4, req: ["careerLevel", 40] },  { id: "equal", name: "Mortimer's Equal", s: 4, req: ["careerLevel", 50] },
      { id: "shotdoctor", name: "Shot Doctor", s: 4, req: ["goldShots", 12] },   // (gold on every signature shot, v32)
      { id: "airball", name: "Airball Artist", s: 1, req: ["wides", 100], shame: true },       { id: "sky", name: "Sky Botherer", s: 1, req: ["overs", 60], shame: true },
      { id: "worm", name: "Worm Food", s: 1, req: ["lows", 60], shame: true },                { id: "postoffice", name: "Post Office", s: 2, req: ["posts", 25], shame: true },
      { id: "regret", name: "Rim Shot Regret", s: 2, req: ["clanks", 60], shame: true },       { id: "pro", name: "Professional Misser", s: 3, req: ["misses", 500], shame: true },
      { id: "gravity", name: "Gravity's Favourite", s: 2, req: ["shorts", 60], shame: true },  { id: "nap", name: "Nap Champion", s: 2, req: ["zeroRuns", 10], shame: true },
      { id: "speedrun", name: "Speedrun to Nowhere", s: 2, req: ["quickDeaths", 15], shame: true }, { id: "seedmagnet", name: "Seed Magnet", s: 2, req: ["seeds", 20], shame: true },
      { id: "crowcrusher", name: "Crow Crusher", s: 2, req: ["miniKills", 1], boss: true },     { id: "birdbrain", name: "Birdbrain Breaker", s: 3, req: ["miniKills", 10], boss: true },
      { id: "featherweight", name: "Featherweight Champ", s: 3, req: ["miniFlawless", 1], boss: true },
      { id: "smasher", name: "Pumpkin Smasher", s: 3, req: ["bossKills", 1], boss: true },     { id: "gourdlord", name: "Gourd Lord", s: 4, req: ["bossKills", 5], boss: true },
      { id: "harvest", name: "Flawless Harvest", s: 4, req: ["bossFlawless", 1], boss: true }, { id: "tripper", name: "Stage Tripper", s: 3, req: ["bestStage", 3], boss: true },
      { id: "phantom", name: "Five-Stage Phantom", s: 4, req: ["bestStage", 5], boss: true },
      { id: "roller", name: "High Roller", s: 3, req: ["bestScore", 50000] },               { id: "sixfig", name: "Six-Figure Skull", s: 4, req: ["bestScore", 100000] },
      { id: "hungry", name: "Power Hungry", s: 2, req: ["powerups", 50] },                    { id: "cursedproud", name: "Cursed & Proud", s: 2, req: ["cursed", 10] },
      { id: "spender", name: "Big Spender", s: 3, req: ["bonesSpent", 20000] },               { id: "raider", name: "Coffin Raider", s: 2, req: ["coffins", 10] },
      { id: "nightowl", name: "Night Owl", s: 2, req: ["playTime", 3600] },                   { id: "grabby", name: "Skull Grabber", s: 1, req: ["grabs", 500] },           { id: "customer", name: "Esteemed Customer", s: 3, req: ["shopBuys", 10] }
    ],
    hat: [
      { id: "none", name: "Bare Head" },
      { id: "bowler", name: "Bowler", s: 1, price: 400 },            { id: "fez", name: "Fez", s: 1, price: 450 },
      { id: "party", name: "Party Hat", s: 1, price: 350 },          { id: "paper", name: "Paper Crown", s: 1, price: 300 },
      { id: "chef", name: "Chef's Toque", s: 1, price: 500 },        { id: "boater", name: "Straw Boater", s: 1, price: 500 },
      { id: "beret", name: "Beret", s: 1, price: 450 },              { id: "bellhop", name: "Bellhop Cap", s: 1, price: 550 },
      { id: "cone", name: "Traffic Cone", s: 1, price: 400 },        { id: "tophat", name: "Top Hat", s: 2, price: 1200 },
      { id: "propeller", name: "Propeller Beanie", s: 2, price: 1100 }, { id: "witch", name: "Witch Hat", s: 2, price: 1300 },
      { id: "tricorn", name: "Pirate Tricorn", s: 2, price: 1400 },  { id: "viking", name: "Viking Helmet", s: 2, price: 1500 },
      { id: "cowboy", name: "Ten-Gallon", s: 2, price: 1300 },       { id: "grad", name: "Mortarboard", s: 2, price: 1200, req: ["makes", 500] },
      { id: "devil", name: "Devil Horns", s: 2, price: 1200 },       { id: "bunny", name: "Bunny Ears", s: 2, price: 1100 },
      { id: "antlers", name: "Antlers", s: 2, price: 1300 },         { id: "candle", name: "Candle", s: 2, price: 1000 },
      { id: "arrow", name: "Arrow Through", s: 2, price: 1000 },     { id: "lampshade", name: "Lampshade", s: 2, price: 900 },
      { id: "mushroom", name: "Toadstool", s: 2, price: 1200 },      { id: "cheese", name: "Cheese Wedge", s: 2, price: 1100 },
      { id: "foil", name: "Tin Foil Hat", s: 2, price: 1000 },       { id: "snail", name: "Snail Friend", s: 2, price: 1300 },
      { id: "headphones", name: "Headphones", s: 2, price: 1400 },   { id: "jester", name: "Jester Cap", s: 3, price: 2800 },
      { id: "halo", name: "Halo", s: 3, price: 3000, req: ["perfects", 150] }, { id: "nest", name: "Bird's Nest", s: 3, price: 3200 },
      { id: "fishbowl", name: "Fishbowl", s: 3, price: 3400 },       { id: "pancakes", name: "Pancake Stack", s: 3, price: 3000 },
      { id: "teapot", name: "Teapot", s: 3, price: 2900 },           { id: "plume", name: "Plumed Helmet", s: 3, price: 3600 },
      { id: "ufo", name: "Tiny UFO", s: 4, price: 7500 },            { id: "brain", name: "Big Brain Jar", s: 4, price: 8000 },
      { id: "dunce", name: "Dunce Cap", s: 2, req: ["misses", 300], shame: true },
      { id: "plunger", name: "Plunger", s: 2, req: ["posts", 20], shame: true },
      { id: "bandage", name: "Bandaged Noggin", s: 2, req: ["bonks", 150], shame: true },
      { id: "bag", name: "Paper Bag of Shame", s: 3, req: ["zeroRuns", 8], shame: true },
      { id: "crowcrown", name: "The Crow King's Crown", s: 3, req: ["miniKills", 1], boss: true },
      { id: "crowkid", name: "Crow Chick", s: 4, req: ["miniFlawless", 1], boss: true },
      { id: "pumpkinhelm", name: "Pumpkin Helm", s: 3, req: ["bossKills", 1], boss: true },
      { id: "goldcrown", name: "Golden Gourd Crown", s: 4, req: ["bossFlawless", 1], boss: true },
      { id: "laurel", name: "Stage Five Laurels", s: 4, req: ["bestStage", 5], boss: true },
      { id: "cake", name: "Birthday Cake", s: 3, price: 4500, shop: true }, { id: "chicken", name: "Rubber Chicken", s: 3, price: 4000, shop: true },
      { id: "icecream", name: "Dropped Ice Cream", s: 3, price: 4200, shop: true }, { id: "windup", name: "Wind-Up Key", s: 3, price: 4800, shop: true },
      { id: "lighthouse", name: "Lighthouse", s: 4, price: 9500, shop: true }, { id: "chandelier", name: "Chandelier", s: 4, price: 12000, shop: true }
    ],
    aura: [
      { id: "none", name: "No Aura" },
      { id: "smoke", name: "Smoke Signals", s: 1, price: 500 },      { id: "bubbles", name: "Bubble Bath", s: 1, price: 500 },
      { id: "leaves", name: "Autumn Swirl", s: 1, price: 550 },      { id: "moths", name: "Moth Magnet", s: 1, price: 600 },
      { id: "stars", name: "Starstruck", s: 2, price: 1200 },        { id: "hearts", name: "Lovestruck", s: 2, price: 1200 },
      { id: "notes", name: "Jukebox", s: 2, price: 1300 },           { id: "glitter", name: "Glitter", s: 2, price: 1400 },
      { id: "snow", name: "Blizzard", s: 2, price: 1400 },           { id: "toxic", name: "Toxic Fumes", s: 2, price: 1500 },
      { id: "candy", name: "Sweet Tooth", s: 2, price: 1500 },       { id: "fireflies", name: "Fireflies", s: 2, price: 1600 },
      { id: "steam", name: "Hot Head", s: 2, price: 1300 },          { id: "fire", name: "Hellfire", s: 3, price: 3000 },
      { id: "bats", name: "Bat Swarm", s: 3, price: 3200 },          { id: "ghosts", name: "Poltergeists", s: 3, price: 3400 },
      { id: "eyes", name: "The Watchers", s: 3, price: 3500 },       { id: "static", name: "Static Shock", s: 3, price: 3300 },
      { id: "holy", name: "Holy Glow", s: 3, price: 3600, req: ["perfStreak", 5] }, { id: "rainbow", name: "Rainbow Arc", s: 4, price: 7000 },
      { id: "flies", name: "Stinker", s: 1, req: ["zeroRuns", 3], shame: true },
      { id: "raincloud", name: "Personal Raincloud", s: 2, req: ["misses", 150], shame: true },
      { id: "zzz", name: "Snoozefest", s: 2, req: ["quickDeaths", 5], shame: true },
      { id: "question", name: "Befuddled", s: 2, req: ["wides", 40], shame: true },
      { id: "feathers", name: "Crow's Court", s: 3, req: ["miniKills", 2], boss: true },
      { id: "seeds", name: "Seed Storm", s: 3, req: ["bossKills", 2], boss: true },
      { id: "royal", name: "Royal Aura", s: 4, req: ["bossFlawless", 1], boss: true },
      { id: "coins", name: "Money Bags", s: 4, price: 8000, shop: true }, { id: "cards", name: "House of Cards", s: 3, price: 4500, shop: true },
      { id: "void", name: "Black Hole", s: 4, price: 10000, shop: true }
    ],
    pole: [
      { id: "wood", name: "Wooden Post" },
      { id: "birch", name: "Birch Branch", s: 1, price: 400 },       { id: "bamboo", name: "Bamboo", s: 1, price: 400 },
      { id: "candy", name: "Candy Cane", s: 1, price: 500 },         { id: "rake", name: "Garden Rake", s: 1, price: 450 },
      { id: "barber", name: "Barber Pole", s: 2, price: 1100 },      { id: "bones", name: "Bone Stack", s: 2, price: 1300 },
      { id: "lamp", name: "Gas Lamp", s: 2, price: 1400 },           { id: "pitchfork", name: "Pitchfork", s: 2, price: 1200 },
      { id: "broom", name: "Witch's Broom", s: 2, price: 1300 },     { id: "neon", name: "Neon Tube", s: 3, price: 2800 },
      { id: "column", name: "Marble Column", s: 3, price: 3000 },    { id: "skulls", name: "Skull Totem", s: 3, price: 3400 },
      { id: "chain", name: "Hanging Chain", s: 3, price: 3200 },     { id: "balloons", name: "Balloons", s: 3, price: 3600 },
      { id: "tentacle", name: "Tentacle", s: 4, price: 7000 },
      { id: "plunger", name: "Giant Plunger", s: 2, req: ["posts", 40], shame: true },
      { id: "vine", name: "Beanstalk", s: 3, req: ["bossKills", 1], boss: true },
      { id: "perch", name: "Crow's Perch", s: 3, req: ["miniKills", 3], boss: true },
      { id: "gold", name: "Solid Gold Post", s: 4, price: 8500, shop: true }, { id: "rocket", name: "Rocket", s: 4, price: 11000, shop: true }
    ]
  };
  for (const [k, list] of Object.entries(MORE)) (CATALOG[k] = CATALOG[k] || []).push(...list);
  // v29: the slingshot's band (its look in BANDS, 08c_scene.js)
  CATALOG.band = [
    { id: "classic", name: "Rubber Band" },
    { id: "licorice", name: "Licorice Whip", s: 1, price: 600 },    { id: "bone", name: "Bone Twine", s: 1, price: 700 },
    { id: "candy", name: "Candy Cane", s: 2, price: 1400 },          { id: "jester", name: "Jester's Ribbon", s: 2, price: 1800 },
    { id: "gilded", name: "Gilded Cord", s: 3, price: 3200 },        { id: "ghostly", name: "Ectoplasm", s: 3, req: ["storyClears", 1], boss: true },
    { id: "barbed", name: "Barbed Wire", s: 2, req: ["misses", 300], shame: true }
  ];
  // v30: the Soul Shop's items, priced in Souls by the shared economy (firebase/functions/shared/economy.js); owning one is
  // the server's word (Souls.owns), never the profile's
  // v45: the Curio Cart's exclusives are in the shared economy too, now it takes Souls: they keep their place on the
  // shelf, lose their bones price, and carry the server's Souls price
  for (const [key, it] of Object.entries(Economy.ITEMS)) { const [kind, id] = key.split(":"); if (!CATALOG[kind]) continue;
    const had = CATALOG[kind].find(x => x.id === id);
    if (had) { delete had.price; had.souls = it.souls; } else CATALOG[kind].push({ id, name: it.name, s: it.s, souls: it.souls }); }   // (a season's Premium Ticket isn't a look)
  // v42: the season looks, earned on a season's Ticket and only that season (07l_season.js)
  CATALOG.skull.push({ id: "harvestmoon", name: "Harvest Moon", s: 4, season: "s1" });
  CATALOG.ring.push({ id: "candycorn", name: "Candy Corn", s: 3, season: "s1" });
  CATALOG.trail.push({ id: "harvest", name: "Harvest Ribbon", s: 4, season: "s1" });
  CATALOG.band.push({ id: "matinee", name: "Matinee Stripe", s: 3, season: "s1" });
  CATALOG.aim.push({ id: "lantern", name: "Lantern Glow", s: 2, season: "s1" });
  CATALOG.title.push({ id: "midnight", name: "Midnight Matinee Regular", s: 3, season: "s1" }, { id: "marquee", name: "Name in Lights", s: 4, season: "s1" });
  KINDS.push("hat", "aura", "pole", "band");
  Object.assign(KIND_LABEL, { hat: "hat", aura: "aura", pole: "ring pole", band: "band" });
  Object.assign(DEFAULT_COS, { hat: "none", aura: "none", pole: "wood", band: "classic" });
  Object.assign(REQ_TEXT, {
    bestScore: n => `Score ${fmtN(n)} in one run`, scoreTotal: n => `${fmtN(n)} points in all`, bestStage: n => `Reach map ${Math.min(n, MAP_DATA.length)}`,
    miniKills: n => n > 1 ? `Beat ${n} mini-bosses` : "Beat a mini-boss", miniFlawless: n => "Beat a mini-boss without a miss",
    bossKills: n => n > 1 ? `Beat ${n} end bosses` : "Beat an end boss", bossFlawless: n => "Beat an end boss without a miss", storyClears: n => "Finish the Adventure", careerLevel: n => `Reach career level ${n}`, goldShots: n => `Gold on all ${n} signature shots`,
    wides: n => `Miss wide ${n} times`, overs: n => `Throw too high ${n} times`, lows: n => `Throw too low ${n} times`, posts: n => `Hit the post ${n} times`,
    shorts: n => `Fall short ${n} times`, clanks: n => `Clank off the rim ${n} times`, seeds: n => `Eat ${n} pumpkin seeds`,
    zeroRuns: n => `End ${n} runs without a hit`, quickDeaths: n => `Lose a run in 5 throws, ${n} times`, powerups: n => `Grab ${n} power-ups`,
    cursed: n => `Take ${n} Cursed Skulls`, bonesSpent: n => `Spend ${fmtN(n)} bones`, coffins: n => `Open ${n} mystery coffins`,
    playTime: n => `Play for ${Math.round(n / 60)} minutes`, grabs: n => `Grab Morty ${n} times`, saves: n => `Get saved ${n} times`,
    shopBuys: n => `Buy ${n} things at the Curio Cart`
  });
  // v44 (the corrected roadmap's V29): the new slots. Hair, facial hair and wings are Morty's body parts: each end boss
  // gives one back (its map sheet's reward), and the Vault sells more. The launcher is the slingshot's frame; Wizard Mort
  // is the Adventure's own reward, half-earned with four shards of the Black Ring and whole when it is.
  CATALOG.hair = [
    { id: "none", name: "Bare Skull" },
    { id: "bun", name: "Top Knot", s: 1, price: 500 },              { id: "flattop", name: "Flat Top", s: 1, price: 600 },
    { id: "pompadour", name: "Pompadour", s: 2, price: 1200 },     { id: "pigtails", name: "Pigtails", s: 2, price: 1100 },
    { id: "mohawk", name: "Mohawk", s: 2, price: 1300 },           { id: "mullet", name: "Mullet", s: 2, price: 1000 },
    { id: "afro", name: "Afro", s: 3, price: 2800 },               { id: "flame", name: "Flaming Locks", s: 4, price: 6500 },
    { id: "vines", name: "Pumpkin-Vine Curls", s: 3, req: ["beat:pumpkin", 1], boss: true },
    { id: "quiff", name: "Showman's Quiff", s: 3, req: ["beat:ringmaster", 1], boss: true },
    { id: "moss", name: "Swamp-Moss Locks", s: 3, req: ["beat:madame", 1], boss: true }
  ];
  CATALOG.beard = [
    { id: "none", name: "Clean Jaw" },
    { id: "pencil", name: "Pencil Moustache", s: 1, price: 400 },  { id: "goatee", name: "Goatee", s: 1, price: 500 },
    { id: "chops", name: "Mutton Chops", s: 2, price: 1000 },      { id: "lumberjack", name: "Lumberjack", s: 2, price: 1200 },
    { id: "braids", name: "Viking Braids", s: 3, price: 2600 },    { id: "cobweb", name: "Cobweb Beard", s: 3, price: 2800 },
    { id: "handlebar", name: "The Count's Gilded Handlebar", s: 3, req: ["beat:count", 1], boss: true },
    { id: "roots", name: "Root Beard", s: 3, req: ["beat:marrowroot", 1], boss: true }
  ];
  CATALOG.wings = [
    { id: "none", name: "No Wings" },
    { id: "butterfly", name: "Butterfly", s: 2, price: 1400 },     { id: "bat", name: "Bat Wings", s: 2, price: 1500 },
    { id: "angel", name: "Angel Wings", s: 3, price: 3200 },       { id: "dragon", name: "Dragon Wings", s: 4, price: 8000 },
    { id: "crow", name: "Crow Wings", s: 3, req: ["beat:crow", 3], boss: true },
    { id: "vulture", name: "Vulture Wings", s: 3, req: ["beat:undertaker", 1], boss: true },
    { id: "clockwork", name: "Clockwork Wings", s: 4, req: ["beat:clockking", 1], boss: true },
    { id: "shadow", name: "Shadow Wings", s: 4, req: ["beat:reaper", 1], boss: true }
  ];
  CATALOG.launcher = [
    { id: "classic", name: "The Old Slingshot" },
    { id: "branch", name: "Forked Branch", s: 1, price: 600 },     { id: "bone", name: "Bone Fork", s: 1, price: 700 },
    { id: "iron", name: "Cast Iron", s: 2, price: 1100 },          { id: "candy", name: "Candy Fork", s: 2, price: 1300 },
    { id: "gold", name: "Gold Plate", s: 3, price: 3000 },         { id: "neon", name: "Neon Fork", s: 4, price: 7000 }
  ];
  // (v49: the Wizard Mort shelf is gone)
  KINDS.push("hair", "beard", "wings", "launcher");
  Object.assign(KIND_LABEL, { hair: "hair", beard: "facial hair", wings: "wings", launcher: "launcher" });
  Object.assign(DEFAULT_COS, { hair: "none", beard: "none", wings: "none", launcher: "classic" });
  REQ_TEXT.shards = n => `Win ${n} shards of the Black Ring`;
  // v45: two new shelves. Glasses sit over Morty's sockets; ring wings are the wings the ring sprouts after the mini-boss
  // (the classic bat membrane, or any of Morty's own wing styles), and the mini-bosses give some of them back.
  CATALOG.glasses = [
    { id: "none", name: "No Glasses" },
    { id: "round", name: "Round Specs", s: 1, price: 400 },          { id: "shades", name: "Shades", s: 1, price: 500 },
    { id: "nerd", name: "Taped-Up Frames", s: 1, price: 450 },       { id: "threed", name: "3-D Glasses", s: 2, price: 900 },
    { id: "heart", name: "Heart Specs", s: 2, price: 1000 },          { id: "aviator", name: "Aviators", s: 2, price: 1100 },
    { id: "monocle", name: "Monocle", s: 2, price: 1200 },            { id: "star", name: "Rock-Star Specs", s: 3, price: 2600 },
    { id: "goggles", name: "Flying Goggles", s: 3, price: 2900 },     { id: "visor", name: "Neon Visor", s: 4, price: 7000 },
    { id: "bandit", name: "Bandit's Mask", s: 2, req: ["posts", 15], shame: true }
  ];
  CATALOG.ringwings = [
    { id: "classic", name: "Bat Membrane" },
    { id: "butterfly", name: "Monarch", s: 2, price: 1200 },          { id: "bat", name: "Vampire Bat", s: 2, price: 1300 },
    { id: "angel", name: "Cherub", s: 3, price: 2800 },               { id: "dragon", name: "Dragon", s: 4, price: 7500 },
    { id: "crow", name: "Crow's Pinions", s: 3, req: ["miniKills", 1], boss: true },
    { id: "vulture", name: "Vulture's Pinions", s: 3, req: ["miniKills", 4], boss: true },
    { id: "clockwork", name: "Clockwork Flaps", s: 4, req: ["miniKills", 8], boss: true },
    { id: "shadow", name: "Shadow Flaps", s: 4, req: ["miniFlawless", 3], boss: true }
  ];
  KINDS.push("glasses", "ringwings");
  Object.assign(KIND_LABEL, { glasses: "glasses", ringwings: "ring wings" });
  Object.assign(DEFAULT_COS, { glasses: "none", ringwings: "classic" });
  // v45: Can Alley's prizes (07o_bonus.js). The first time you clear the cans after a map's end boss, that map's prize
  // is yours; they're never sold. (The last map has no Can Alley: the Adventure ends there.)
  const CAN_PRIZES = [["aim", "tickets", "Prize Tickets", 2], ["trail", "midway", "Midway Confetti", 3], ["impact", "ringer", "RINGER!", 3], ["aura", "bulbs", "Marquee Bulbs", 3],
    ["title", "canchamp", "Can Alley Champ", 3], ["ring", "bigtop", "Big Top", 4], ["hat", "tincan", "Tin-Can Topper", 4]];
  CAN_PRIZES.forEach(([kind, id, name, s], i) => CATALOG[kind].push({ id, name, s, req: ["cans:" + (i + 1), 1], prize: true }));
  for (let n = 1; n <= CAN_PRIZES.length; n++) REQ_TEXT["cans:" + n] = () => `Clear Can Alley after map ${n}'s end boss`;
