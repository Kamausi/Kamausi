  // ───────────────────────── helpers ─────────────────────────
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const fmtN = n => Math.round(n).toLocaleString("en-US");
  const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* storage blocked: keep in memory */ } }
  };

  // ───────────────────────── world (metres · seconds) ─────────────────────────
  const G = 9.8;
  const SKULL_R = 0.14;           // collision radius of the skull
  const START_Y = 0.9;            // hand height
  const CAM_BACK = 3.0;           // camera distance behind the launch point
  const RING_Z = 6.0;             // depth of the ring plane
  const RING_Y = 2.3;             // ring centre height
  const RING_TUBE = 0.065;        // half-thickness of the ring's tube
  const RC_START = 0.68, RC_MIN = 0.44;  // ring centre-line radius (shrinks with score)
  const POST_HALF = 0.05;         // half-width of the post under the ring
  const FLIGHT_T = 0.82;          // every throw reaches the ring plane in the same time
  const VZ = RING_Z / FLIGHT_T;
  const AIM_X_MAX = 2.8, AIM_Y_MIN = 0.35, AIM_Y_MAX = 5.0; // aim range, measured in the ring plane
  const START_LIVES = 3, MAX_LIVES = 5;   // bonus skulls stack up to five
  // the lost-reel palette (matches the CSS tokens)
  const INK = "#17130F", PAPER = "#E8D8B4", BONE = "#D9C9A5", CREAM = "#F2E7C9", RED = "#A94332", TEAL = "#356B68",
    MUSTARD = "#C49A42", MIDNIGHT = "#26364A", PURPLE = "#66506B";
  const GOLD = "#E3B64B", EMBER = "#E8893A", MIST = "#8E8A7E", GHOST = CREAM, ORANGE = RED, TOXIC = "#9BC53D", BLOOD = RED;
  const DISPLAY = '"Luckiest Guy","Arial Black",Impact,sans-serif';
  const COMIC = '"Bangers","Luckiest Guy",Impact,sans-serif';
  const NUMFONT = '"Bebas Neue","Arial Narrow",Impact,sans-serif';
  const UIFONT = '"Nunito Sans",ui-sans-serif,system-ui,sans-serif';
  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ── the performance budget (docs/PERFORMANCE.md). The effects are capped to it and the spec checks it.
  // frameMs: a whole frame at 60 Hz; stepMs: one 1/240 s step of the game, on average; the rest are live counts.
  const PERF = { frameMs: 16.7, stepMs: 0.5, particles: 360, inkStars: 24, bursts: 18, domNodes: 2500, lightKB: 2600 };
  function level(score) {
    return {
      amp: Math.min(0.55 + score * 0.11, 1.5),
      omega: Math.min(0.6 + score * 0.1, 2.2),
      rc: Math.max(RC_START - score * 0.012, RC_MIN),
      bob: score >= 12 ? Math.min(0.12 + (score - 12) * 0.025, 0.38) : 0
    };
  }

  // ───────────────────────── the Skull Vault ─────────────────────────
  // One skull, dressed ten ways. Nothing changes the physics: every item is looks or sound only.
  // s = stars (1 Stock · 2 Featured · 3 Special · 4 Lost). price = bones. req = a free-unlock goal.
  // Items with neither price nor req are yours from the start. Titles are earned, never bought.
  const RINGS = {
    hoop:     { style: "hoop",   color: "#A94332", rgb: "169,67,50",   shade: "rgba(60,16,10,.6)",  hi: "rgba(255,240,220,.8)" },
    toxic:    { style: "tube",   color: "#9BC53D", rgb: "155,197,61",  shade: "rgba(28,48,0,.6)",   hi: "rgba(240,255,214,.8)" },
    blood:    { style: "tube",   color: "#A94332", rgb: "169,67,50",   shade: "rgba(60,10,8,.6)",   hi: "rgba(255,226,214,.7)" },
    iron:     { style: "chain",  color: "#8E949F", rgb: "160,168,180", shade: "rgba(10,12,16,.8)",  hi: "rgba(235,240,248,.7)" },
    bone:     { style: "bones",  color: "#E4DAC4", rgb: "237,230,214", shade: "rgba(70,60,45,.55)", hi: "rgba(255,255,255,.85)" },
    thorn:    { style: "thorn",  color: "#5E7A36", rgb: "120,160,70",  shade: "rgba(10,16,6,.8)",   hi: "rgba(190,220,140,.5)" },
    spectral: { style: "tube",   color: "#7FC8B8", rgb: "127,200,184", shade: "rgba(6,70,52,.6)",   hi: "rgba(225,255,246,.85)", flicker: true },
    gold:     { style: "tube",   color: "#E3B64B", rgb: "227,182,75",  shade: "rgba(90,55,5,.6)",   hi: "rgba(255,246,214,.9)" },
    inferno:  { style: "fire",   color: "#E8893A", rgb: "232,137,58",  shade: "rgba(90,20,0,.6)",   hi: "rgba(255,230,170,.9)" },
    void:     { style: "portal", color: "#8E74A8", rgb: "142,116,168", shade: "rgba(20,5,40,.7)",   hi: "rgba(220,200,255,.8)" },
    soul:     { style: "portal", color: "#B48CFF", rgb: "180,140,255", shade: "rgba(30,10,70,.7)",  hi: "rgba(240,230,255,.9)", flicker: true },   // (the Soul Shop's, v30)
    aurora:   { style: "tube",   color: "#78F0BE", rgb: "120,240,190", shade: "rgba(0,50,40,.6)",   hi: "rgba(230,255,246,.9)", flicker: true },
    candycorn: { style: "hoop",  color: "#E8893A", rgb: "232,137,58",  shade: "rgba(90,30,0,.6)",   hi: "rgba(255,240,200,.85)" }   // (Season One, v42)
  };
  const AIMS = {
    bone: { color: CREAM }, toxic: { color: TOXIC }, blood: { color: "#D0604A" }, frost: { color: "#A9D6E0" },
    violet: { color: "#A58CC0" }, ember: { color: EMBER }, gold: { color: GOLD }, rainbow: { color: "#FFFFFF", rainbow: true }, lantern: { color: "#F2A34A" }
  };
  const CATALOG = {
    skull: [
      { id: "bone", name: "Classic" },
      { id: "wood", name: "Wooden", s: 1, price: 450, req: ["makes", 25] },     { id: "tin", name: "Tin", s: 1, price: 500, req: ["makes", 50] },
      { id: "stone", name: "Stone", s: 1, price: 600, req: ["games", 20] },     { id: "silver", name: "Silver Screen", s: 2, price: 900, req: ["rims", 30] },
      { id: "wax", name: "Wax", s: 2, price: 1000, req: ["perfects", 20] },     { id: "china", name: "Bone China", s: 2, price: 1200, req: ["bestStreak", 12] },
      { id: "candy", name: "Candy", s: 2, price: 1400, req: ["best", 12] },     { id: "pirate", name: "Pirate", s: 2, price: 1500, req: ["games", 30] },
      { id: "pumpkin", name: "Pumpkin", s: 2, price: 1800, req: ["best", 25] }, { id: "ice", name: "Ice", s: 3, price: 2800, req: ["perfects", 30] },
      { id: "gold", name: "Gold", s: 3, price: 3000, req: ["points", 600] },    { id: "crystal", name: "Crystal", s: 3, price: 3500, req: ["perfStreak", 4] },
      { id: "clock", name: "Clockwork", s: 3, price: 4000, req: ["points", 1500] }, { id: "radio", name: "Radio", s: 3, price: 4500, req: ["rims", 45] },
      { id: "space", name: "Space", s: 4, price: 6500, req: ["makes", 1000] },  { id: "flaming", name: "Flaming", s: 4, price: 8000, req: ["best", 35] }
    ],
    eyes: [
      { id: "pie", name: "Pie Eyes" },
      { id: "tiny", name: "Pinpricks", s: 1, price: 300 },  { id: "giant", name: "Saucers", s: 1, price: 350 },   { id: "sleepy", name: "Sleepy", s: 1, price: 400 },
      { id: "crossed", name: "Crossed", s: 2, price: 800 }, { id: "x", name: "X Eyes", s: 2, price: 900, req: ["misses", 100] },
      { id: "star", name: "Star Eyes", s: 2, price: 1200, req: ["perfects", 40] }, { id: "spiral", name: "Spirals", s: 3, price: 2500 },
      { id: "heart", name: "Hearts", s: 3, price: 2800 },   { id: "dollar", name: "Dollar Signs", s: 3, price: 3200, req: ["bonesTotal", 10000] },
      { id: "hypno", name: "Hypnotized", s: 4, price: 6000 }
    ],
    teeth: [
      { id: "grin", name: "Classic Grin" },
      { id: "toothless", name: "Toothless", s: 1, price: 300 }, { id: "tiny", name: "Tiny Jaw", s: 1, price: 350 }, { id: "crooked", name: "Crooked", s: 1, price: 450 },
      { id: "big", name: "Huge Grin", s: 2, price: 900 },       { id: "one", name: "One Tooth", s: 2, price: 1000, req: ["bonks", 50] },
      { id: "gold", name: "Gold Tooth", s: 2, price: 1500, req: ["points", 1000] }, { id: "fangs", name: "Fangs", s: 3, price: 2600 },
      { id: "jumbo", name: "Oversized Jaw", s: 3, price: 3000 }
    ],
    paint: [
      { id: "none", name: "Bare Bone" },
      { id: "creamred", name: "Cream & Red", s: 1, price: 300 }, { id: "teal", name: "Teal & Cream", s: 1, price: 300 }, { id: "mustard", name: "Mustard & Black", s: 1, price: 350 },
      { id: "midnight", name: "Midnight Blue", s: 1, price: 400 }, { id: "purple", name: "Dusty Purple", s: 1, price: 400 }, { id: "red", name: "Vintage Red", s: 1, price: 450 },
      { id: "stripes", name: "Circus Stripes", s: 2, price: 900 }, { id: "dots", name: "Polka Dots", s: 2, price: 900 },   { id: "checks", name: "Checkerboard", s: 2, price: 1000 },
      { id: "pin", name: "Pinstripes", s: 2, price: 1100 },        { id: "stars", name: "Star Pattern", s: 2, price: 1500 },
      { id: "news", name: "Newspaper Print", s: 3, price: 2400 },  { id: "floral", name: "Hand-Painted Floral", s: 3, price: 2800 }, { id: "spiral", name: "Spiral", s: 3, price: 3000 }
    ],
    trail: [
      { id: "dust", name: "Dust" },
      { id: "smoke", name: "Smoke", s: 1, price: 400, req: ["games", 8] }, { id: "lines", name: "Speed Lines", s: 1, price: 450 },
      { id: "sparks", name: "Sparks", s: 2, price: 800 },   { id: "bubbles", name: "Bubbles", s: 2, price: 800 },   { id: "fire", name: "Fire", s: 2, price: 900, req: ["bestStreak", 8] },
      { id: "confetti", name: "Confetti", s: 2, price: 1000 }, { id: "notes", name: "Musical Notes", s: 2, price: 1200 }, { id: "news", name: "Newspaper Scraps", s: 2, price: 1200 },
      { id: "splatter", name: "Ink Splatter", s: 2, price: 1200, req: ["perfects", 20] }, { id: "wisps", name: "Ghost Wisps", s: 2, price: 1800, req: ["makes", 250] },
      { id: "stars", name: "Stars", s: 3, price: 3000, req: ["best", 22] }, { id: "lightning", name: "Lightning", s: 3, price: 3500 },
      { id: "bats", name: "Bats", s: 3, price: 4500, req: ["rims", 60] }, { id: "film", name: "Film Reel", s: 4, price: 6000 },
      { id: "ink", name: "Ink Trail", s: 4, price: 6500 }, { id: "ghost", name: "Ghost Trail", s: 4, price: 7000, req: ["points", 4000] },
      { id: "comet", name: "Comet", s: 4, price: 8000 }
    ],
    impact: [
      { id: "classic", name: "Classic BONK!" },
      { id: "cartoon", name: "Cartoon WHAM!", s: 1, price: 400 }, { id: "vintage", name: "Vintage Ink Stars", s: 1, price: 500 },
      { id: "confetti", name: "Confetti Pop", s: 2, price: 900 }, { id: "ink", name: "Ink Splash", s: 2, price: 1200 }, { id: "bones", name: "Bone Burst", s: 2, price: 1400, req: ["bonks", 100] },
      { id: "news", name: "Newspaper Halftone", s: 3, price: 2500 }, { id: "ghost", name: "Little Ghost", s: 3, price: 3000 },
      { id: "kaboom", name: "Explosive KABOOM!", s: 4, price: 6000 }
    ],
    ring: [
      { id: "hoop", name: "Circus Hoop" }, { id: "blood", name: "Dusty Red" }, { id: "toxic", name: "Toxic" },
      { id: "iron", name: "Iron Chain", s: 1, price: 500, req: ["makes", 100] },  { id: "thorn", name: "Thorn", s: 2, price: 1200, req: ["games", 40] },
      { id: "bone", name: "Bone", s: 2, price: 1500, req: ["best", 18] },          { id: "spectral", name: "Spectral", s: 3, price: 2500, req: ["perfects", 60] },
      { id: "gold", name: "Gold", s: 3, price: 4000, req: ["points", 2000] },      { id: "inferno", name: "Inferno", s: 4, price: 6000, req: ["bestStreak", 18] },
      { id: "void", name: "Void Portal", s: 4, price: 9000, req: ["peakLives", 5] }
    ],
    aim: [
      { id: "bone", name: "Cream" }, { id: "toxic", name: "Toxic" },
      { id: "blood", name: "Dusty Red", s: 1, price: 300, req: ["makes", 20] },  { id: "frost", name: "Frost", s: 1, price: 600, req: ["perfects", 12] },
      { id: "violet", name: "Violet", s: 2, price: 900, req: ["bestStreak", 10] }, { id: "ember", name: "Ember", s: 2, price: 1200, req: ["best", 15] },
      { id: "gold", name: "Gold", s: 3, price: 2500, req: ["points", 1200] },     { id: "rainbow", name: "Technicolor", s: 4, price: 5000, req: ["peakLives", 4] }
    ],
    reel: [
      { id: "standard", name: "Standard Print" },
      { id: "lost", name: "Lost Reel", s: 2, price: 900 }, { id: "silent", name: "Silent Era", s: 2, price: 1200 },
      { id: "techni", name: "Technicolor Test", s: 3, price: 2500 }, { id: "damaged", name: "Damaged Print", s: 3, price: 3000 }
    ],
    title: [
      { id: "rookie", name: "Grave Rookie" },
      { id: "bonehead", name: "Bonehead", s: 1, req: ["games", 1] },            { id: "flinger", name: "Skull Flinger", s: 1, req: ["makes", 50] },
      { id: "ricochet", name: "Ricochet Artist", s: 2, req: ["rims", 30] },     { id: "deadeye", name: "Deadeye", s: 2, req: ["perfects", 30] },
      { id: "bandit", name: "Bullseye Bandit", s: 2, req: ["perfStreak", 3] },  { id: "menace", name: "Cemetery Menace", s: 2, req: ["games", 50] },
      { id: "bonker", name: "Certified Bonker", s: 2, req: ["bonks", 100] },   { id: "collector", name: "Bone Collector", s: 3, req: ["bonesTotal", 5000] },
      { id: "ace", name: "Skull Ace", s: 3, req: ["best", 25] },               { id: "last", name: "The Last Skull", s: 3, req: ["clutch", 25] },
      { id: "misfortune", name: "Master of Misfortune", s: 3, req: ["misses", 300] }, { id: "headliner", name: "Headliner", s: 4, req: ["best", 40] },
      { id: "destroyer", name: "Reel Destroyer", s: 4, req: ["makes", 1000] }, { id: "holy", name: "HOLY SMOKES", s: 4, req: ["bestStreak", 20] }
    ]
  };
  const KINDS = ["skull", "eyes", "teeth", "paint", "trail", "impact", "ring", "aim", "reel", "title"];
  const KIND_LABEL = { skull: "skull", eyes: "eyes", teeth: "teeth", paint: "paint job", trail: "trail", impact: "impact", ring: "ring", aim: "aim line", reel: "film reel", title: "title" };
  const STAR_NAME = ["Stock", "Stock", "Featured", "Special", "Lost"];
  const starsOf = it => it.s || 1;
  const rarityOf = it => ["stock", "stock", "featured", "special", "lost"][starsOf(it)];
  // saves from v5/v6 used other names for some of the same things
  const MIGRATE = {
    skull: { gilded: "gold", frost: "ice", hellfire: "flaming", painted: "candy", void: "space", moss: "stone", obsidian: "tin", jade: "china", neon: "silver" },
    trail: { embers: "fire", blood: "splatter", wisp: "wisps", stardust: "stars", souls: "ghost" }
  };
  // combo names climb as the streak grows
  const COMBO_WORDS = [[20, "Bonkers"], [12, "Absolute bones"], [8, "Unhinged"], [5, "Skullful"], [3, "Bones!"], [2, "Nice"]];
  const comboWord = n => (COMBO_WORDS.find(([k]) => n >= k) || [0, ""])[1];
  // daily challenges: three a day, picked from these, seeded by the date
  const CHALLENGES = [
    { id: "perfects", text: n => `Land ${n} perfects`,          range: [3, 8],   mode: "add", reward: n => 60 + n * 25 },
    { id: "makes",    text: n => `Make ${n} tosses`,             range: [20, 45], mode: "add", reward: n => 40 + n * 5 },
    { id: "throws",   text: n => `Toss ${n} skulls`,             range: [30, 60], mode: "add", reward: n => n * 3 },
    { id: "best",     text: n => `Hit the ring ${n} times in one run`, range: [8, 16], mode: "max", reward: n => n * 18 },
    { id: "score",    text: n => `Score ${fmtN(n)} in one run`,  range: [8, 30],  mode: "max", reward: n => 60 + n * 9, scale: 1000 },
    { id: "bosses",   text: n => n > 1 ? `Beat ${n} bosses` : "Beat a boss", range: [1, 2], mode: "add", reward: n => n * 220 },
    { id: "powerups", text: n => `Grab ${n} power-ups`,          range: [2, 4],   mode: "add", reward: n => n * 50 },
    { id: "combo",    text: n => `Hit a ×${n} combo`,            range: [5, 10],  mode: "max", reward: n => n * 25 },
    { id: "rims",     text: n => `Rattle in ${n} rim-ins`,       range: [2, 5],   mode: "add", reward: n => n * 45 },
    { id: "runs",     text: n => `Play ${n} runs`,               range: [3, 6],   mode: "add", reward: n => n * 30 },
    { id: "lives",    text: n => `Hold ${n} skulls at once`,     range: [4, 5],   mode: "max", reward: n => (n === 5 ? 300 : 160) },
    { id: "arcadeSecs", text: n => `Survive ${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")} in one Arcade run`, range: [45, 90], mode: "max", reward: n => 40 + n * 2, step: 15 },
    // v37: the newer things to do
    { id: "shots",    text: n => n > 1 ? `Make ${n} signature shots` : "Make a signature shot", range: [1, 3], mode: "add", reward: n => 80 + n * 60 },
    { id: "targets",  text: n => `Hit ${n} bonus targets`,       range: [2, 5],   mode: "add", reward: n => n * 45 },
    { id: "modeRuns", text: n => `Play ${n} runs of Boss Rush or a mini-game`, range: [2, 4], mode: "add", reward: n => n * 55 }
  ];
  // weekly and monthly challenges: the same kinds of goal, bigger, and they pay far more. A week runs Monday to
  // Sunday, a month from the 1st. Each set is three, picked from its pool, seeded by the week or the month.
  // (every weekly goal pays more than any daily one of its kind, and every monthly more than any weekly)
  const CHALLENGES_WEEKLY = [
    { id: "perfects", range: [15, 30],   reward: n => 250 + n * 25 },
    { id: "makes",    range: [100, 200], reward: n => 200 + n * 4, step: 10 },
    { id: "throws",   range: [150, 300], reward: n => 150 + n * 2.5, step: 10 },
    { id: "best",     range: [16, 28],   reward: n => n * 30 },
    { id: "score",    range: [20, 60],   reward: n => 200 + n * 14, scale: 1000 },
    { id: "bosses",   range: [3, 6],     reward: n => n * 220 },
    { id: "powerups", range: [6, 12],    reward: n => n * 70 },
    { id: "combo",    range: [8, 14],    reward: n => n * 50 },
    { id: "rims",     range: [8, 16],    reward: n => n * 55 },
    { id: "runs",     range: [12, 25],   reward: n => n * 35 },
    { id: "arcadeSecs", range: [90, 180], reward: n => 200 + n * 3, step: 15 },
    { id: "shots", range: [5, 12], reward: n => 250 + n * 60 }, { id: "targets", range: [10, 25], reward: n => 150 + n * 40 }, { id: "modeRuns", range: [6, 12], reward: n => 150 + n * 50 }
  ];
  const CHALLENGES_MONTHLY = [
    { id: "perfects", range: [60, 120],  reward: n => 600 + n * 14, step: 5 },
    { id: "makes",    range: [400, 800], reward: n => 500 + n * 3, step: 25 },
    { id: "throws",   range: [600, 1200], reward: n => 300 + n * 2, step: 50 },
    { id: "best",     range: [25, 45],   reward: n => 300 + n * 30 },
    { id: "score",    range: [50, 150],  reward: n => 500 + n * 14, scale: 1000, step: 5 },
    { id: "bosses",   range: [8, 16],    reward: n => n * 180 },
    { id: "powerups", range: [25, 50],   reward: n => n * 45, step: 5 },
    { id: "combo",    range: [12, 20],   reward: n => 500 + n * 50 },
    { id: "rims",     range: [30, 60],   reward: n => n * 40, step: 5 },
    { id: "runs",     range: [40, 80],   reward: n => n * 25, step: 5 },
    { id: "arcadeSecs", range: [180, 360], reward: n => 400 + n * 4, step: 30 },
    { id: "shots", range: [20, 45], reward: n => 500 + n * 50, step: 5 }, { id: "targets", range: [40, 90], reward: n => 400 + n * 30, step: 5 }, { id: "modeRuns", range: [20, 40], reward: n => 400 + n * 40, step: 5 }
  ];
  const REQ_TEXT = {
    makes: n => `Make ${n}`, best: n => `${n} hits in one run`, perfects: n => `${n} perfects`, bestStreak: n => `${n} in a row`,
    games: n => `Play ${n} runs`, points: n => `${n} points`, rims: n => `${n} rim-ins`, perfStreak: n => `${n} perfects in a row`, peakLives: n => `Hold ${n} skulls`,
    bonks: n => `${n} bonks`, misses: n => `Miss ${n} times`, clutch: n => `${n} makes on your last skull`, bonesTotal: n => `Earn ${n.toLocaleString("en-US")} bones`
  };
  // the rank, by makes (v45: twenty-one of them, and the last a long way off: 50,000 makes, where it was 1,200)
  const RANKS = [[0, "Gravedigger"], [10, "Bone Tosser"], [30, "Crypt Keeper"], [75, "Night Warden"], [150, "Grave Warden"], [300, "Lantern Bearer"], [600, "Tomb Tender"],
    [1000, "Barrow Knight"], [1500, "Reaper's Hand"], [2250, "Marrow Marshal"], [3250, "Sexton Supreme"], [4500, "Ghoul Baron"], [6000, "Bone Count"], [8000, "Lord of Bones"],
    [10500, "Crypt Duke"], [13500, "Phantom Prince"], [17500, "Graveyard King"], [22500, "Skull Emperor"], [30000, "The Reaper"], [40000, "The Reaper's Boss"], [50000, "Legend of the Lost Reel"]];

  // ───────────────────────── saved data ─────────────────────────
  const KEYS = { best: "skullToss.best", mute: "skullToss.muted", settings: "skullToss.settings.v1", profile: "skullToss.profile.v1", cos: "skullToss.cosmetics.v1" };
  // The profile's schema. Whenever what a saved field means changes, bump SAVE_SCHEMA and add the step that gets an
  // older profile there. Every profile that comes in (this device, the cloud, a save code) runs the steps it hasn't
  // had, in order, so an old save reaches today's shape the same way wherever it comes from. A profile written by a
  // newer build keeps its number and its fields.
  const SAVE_SCHEMA = 4;
  const MIGRATIONS = {
    // v14: the leaderboard stops posting bestScore (a save code can carry any number) and posts boardBest instead,
    // the best Story run actually played to its end. Nothing carries over: the board takes runs finished from now on.
    2: p => { p.boardBest = null; },
    // v18: eight maps, and Story ends after the eighth. v12's "stage 5" onwards was map 1 again, faster; a stage number
    // now names a map, and a v12 player who got past stage 4 had cleared the four old maps, which reaches map 5.
    // The Whole Reel used to mean those four maps: anyone who has it keeps it as Half the Reel, and The Whole Reel
    // now means all eight, so it can still be earned (and paid) the new way.
    3: p => {
      if (Number(p.bestStage) > 5) p.bestStage = 5;
      if (Array.isArray(p.achievements)) p.achievements = p.achievements.map(a => a === "whole-reel" ? "half-reel" : a);
      p.fragments = []; p.bossLog = {};
    },
    // v44: the eight maps were rebuilt (Crow Hollow to the Black Abyss) and Morty's pieces became the Black Ring's
    // shards. Progress carries over map for map: the piece an old map's end boss held becomes the shard of the map in its
    // place, and how far you'd got stays how far you've got. Bosses keep their names, so their tallies stand.
    4: p => {
      const OLD = ["tophat", "bowtie", "gloves", "cane", "spats", "whistle", "watch", "shadow"], NEW = ["hollow", "gilded", "whistle", "drowned", "marsh", "desert", "clockwork", "abyss"];
      if (Array.isArray(p.fragments)) p.fragments = [...new Set(p.fragments.map(f => (OLD.includes(f) ? NEW[OLD.indexOf(f)] : f)))];
      p.bio = ""; p.pic = null;
    }
  };
  function migrateProfile(p) {
    const from = Math.max(1, Math.floor(Number(p.schema) || 1));
    for (let v = from + 1; v <= SAVE_SCHEMA; v++) MIGRATIONS[v](p);
    p.schema = Math.max(from, SAVE_SCHEMA);
    return p;
  }
  const DEFAULT_SETTINGS = { sound: true, music: 45, sfx: 80, amb: 50, vibe: true, shake: true, guide: "full", film: reduceMotion ? "light" : "full", camera: reduceMotion ? "still" : "full", voice: "babble",
    flashes: reduceMotion ? "reduced" : "full", contrast: false, text: "normal", cards: "full", lang: "en", mischief: true, soundSet: "classic", analytics: "ask" };   // analytics: ask | yes | no (04g_telemetry.js)   // soundSet: 02e_audio_sets.js   // cards: the reel's title cards (09i_reel.js)   // accessibility: flash strength, high contrast, text size
  // "best" is the most hits in one run (what older saves called their best score); "bestScore" is the arcade score
  const STAT_KEYS = ["games", "throws", "makes", "perfects", "rims", "bestStreak", "bestPerfStreak", "peakLives", "points", "best", "bonesTotal", "bonks", "misses", "clutch",
    "bestScore", "scoreTotal", "bestStage", "miniKills", "miniFlawless", "bossKills", "bossFlawless",
    "wides", "overs", "lows", "posts", "shorts", "clanks", "seeds", "zeroRuns", "quickDeaths",
    "powerups", "cursed", "saves", "bonesSpent", "shopBuys", "coffins", "playTime", "grabs", "arcadeRuns", "chalClaims", "achSeen", "storyClears", "targetHits", "hazardHits", "continues", "xp", "bonusRounds", "cansDown", "canClears", "fireRings", "fireMakes", "longestRun", "bestDayStreak", "chalSets"];   // xp: career experience (04h_career.js)
  // arcade: the best on each map, keyed by map number ({ score, secs, hits, runs }); achievements: the ones unlocked
  const DEFAULT_PROFILE = { name: "", bones: 0, daily: null, weekly: null, monthly: null, unlocked: [], seen: [], achievements: [], arcade: {}, updatedAt: 0, board: false, bestStage: 1, boardBest: null,
    fragments: [], bossLog: {}, bio: "", pic: null, shots: {}, modes: {}, met: [], secrets: [], history: [], mastery: [], flawless: {}, mapMakes: {}, canAlley: {}, powerLog: {}, arcadeTables: {}, lastIni: "", streakDays: 0, streakLast: "", director: null, firsts: [], season: null };   // season: this season's Ticket (07l_season.js)   // firsts: the funnel, the first time of each thing (04g_telemetry.js)   // director: this week's Director's Challenge stars and best (07k_director.js)   // streak: days played in a row (v37)   // arcadeTables: each cabinet's top five (09o_arcade.js)   // mastery: claimed tiers; flawless: end bosses beaten without a miss; mapMakes: makes per map (09n_mastery.js)   // history: the last ten runs (04h_career.js)   // met: what the Codex has noted ("boss:crow", "power:rush"…); secrets: the ones found (09l_mischief.js)   // modes: Boss Rush's and each mini-game's record (07i_modes.js)   // shots: each signature shot, how many times (07h_shots.js)   // fragments: Morty's pieces recovered (ids); bossLog: each boss beaten, how many times
  for (const k of STAT_KEYS) if (!(k in DEFAULT_PROFILE)) DEFAULT_PROFILE[k] = 0;
  const DEFAULT_COS = { skull: "bone", eyes: "pie", teeth: "grin", paint: "none", trail: "dust", impact: "classic", ring: "hoop", aim: "bone", reel: "standard", title: "rookie", updatedAt: 0 };
  let sandbox = null;   // while the spec runs, nothing is written to the player's storage or cloud
  let settings, profile, cos;
  function readJSON(k, d) {
    let v = null; try { v = JSON.parse(store.get(k, "null")); } catch (e) {}
    return v && typeof v === "object" ? { ...d, ...v } : { ...d };
  }
  // The profile and the cosmetics keep a copy of the last version that loaded cleanly (<key>.bak). If the main copy
  // won't read (a write cut off by a crash, a storage fault), the game loads that copy instead of starting over, and
  // keeps the broken text in <key>.corrupt so it can still be recovered by hand.
  function readSaved(k, st = store) {
    const raw = st.get(k, null);
    if (raw !== null) {
      try { const v = JSON.parse(raw); if (v && typeof v === "object") { st.set(k + ".bak", raw); return v; } } catch (e) {}
      st.set(k + ".corrupt", raw);
    }
    try { const v = JSON.parse(st.get(k + ".bak", "null")); if (v && typeof v === "object") return v; } catch (e) {}
    return null;
  }
  const migrateKey = key => { const [k, id] = String(key).split(":"); const m = MIGRATE[k] && MIGRATE[k][id]; return m ? k + ":" + m : key; };
  // a run the leaderboard can post: { score, hits, stage, at }, or null
  // the best Story run for the board: its score and everything the server checks it against (v34: firebase/functions/shared/runs.js)
  const RUN_FIELDS = ["hits", "throws", "secs", "perfects", "bosses", "targets", "shots", "fragments", "continues"];
  const cleanRun = r => r && typeof r === "object" && Math.floor(Number(r.score)) > 0
    ? { score: Math.floor(Number(r.score)), stage: Math.max(1, Math.floor(Number(r.stage) || 1)), at: Number(r.at) || 0, ...Object.fromEntries(RUN_FIELDS.map(k => [k, Math.max(0, Math.floor(Number(r[k]) || 0))])) } : null;
  function cleanProfile(p) {
    const out = { ...DEFAULT_PROFILE, ...migrateProfile(p && typeof p === "object" ? { ...p } : {}) };
    for (const k of STAT_KEYS) out[k] = Math.max(0, Math.floor(Number(out[k]) || 0));
    out.name = String(out.name || "").slice(0, 16);
    out.bio = String(out.bio || "").replace(/[<>]/g, "").slice(0, 120);   // (v44: the profile's bio and picture)
    out.pic = out.pic && typeof out.pic === "object" && typeof out.pic.face === "string" && typeof out.pic.frame === "string" ? { face: out.pic.face.slice(0, 12), frame: out.pic.frame.slice(0, 12) } : null;
    const keys = a => Array.isArray(a) ? [...new Set(a.filter(s => typeof s === "string").map(migrateKey))].slice(0, 800) : [];
    out.unlocked = keys(out.unlocked); out.seen = keys(out.seen);
    out.updatedAt = Number(out.updatedAt) || 0;
    out.bones = Math.max(0, Math.floor(Number(out.bones) || 0));
    for (const k of ["daily", "weekly", "monthly"]) out[k] = out[k] && typeof out[k] === "object" && Array.isArray(out[k].items) ? out[k] : null;
    out.board = !!out.board; out.bestStage = Math.max(1, out.bestStage);
    out.achievements = Array.isArray(out.achievements) ? [...new Set(out.achievements.filter(s => typeof s === "string"))].slice(0, 200) : [];
    out.arcade = cleanArcade(out.arcade);
    out.boardBest = cleanRun(out.boardBest);
    out.bestStage = clamp(Math.floor(out.bestStage), 1, MAP_DATA.length + 1);   // (MAP_COUNT + 1: the story has been finished)
    out.fragments = Array.isArray(out.fragments) ? [...new Set(out.fragments.filter(f => typeof f === "string"))].slice(0, 16) : [];
    const log = {}; if (out.bossLog && typeof out.bossLog === "object") for (const [k, v] of Object.entries(out.bossLog)) if (/^[a-z]{2,16}$/.test(k)) log[k] = Math.max(0, Math.floor(Number(v) || 0));
    out.bossLog = log;
    const sh = {}; if (out.shots && typeof out.shots === "object") for (const [k, v] of Object.entries(out.shots)) if (/^[a-z]{2,16}$/.test(k)) sh[k] = Math.max(0, Math.floor(Number(v) || 0));
    out.shots = sh;
    const md = {}; if (out.modes && typeof out.modes === "object") for (const [k, v] of Object.entries(out.modes)) if (/^[a-z]{2,16}$/.test(k) && v && typeof v === "object") { md[k] = {}; for (const [f, n] of Object.entries(v)) if (/^[a-z]{2,12}$/i.test(f)) md[k][f] = Math.max(0, Math.floor(Number(n) || 0)); }
    out.modes = md;
    out.mastery = Array.isArray(out.mastery) ? [...new Set(out.mastery.filter(k => typeof k === "string" && /^[a-z]{2,6}:[a-z0-9]{1,16}:[0-2]$/.test(k)))].slice(0, 300) : [];
    for (const f of ["flawless", "mapMakes"]) { const o = {}; if (out[f] && typeof out[f] === "object") for (const [k, v] of Object.entries(out[f])) if (/^[a-z0-9]{1,16}$/.test(k)) o[k] = Math.max(0, Math.floor(Number(v) || 0)); out[f] = o; }
    const tabs = {}; if (out.arcadeTables && typeof out.arcadeTables === "object") for (const [k, list] of Object.entries(out.arcadeTables)) if (/^\d{1,2}$/.test(k) && Array.isArray(list))
      tabs[k] = list.filter(e => e && /^[A-Z]{3}$/.test(e.ini) && Number(e.score) > 0).map(e => ({ ini: e.ini, score: Math.floor(Number(e.score)), secs: Math.max(0, Math.floor(Number(e.secs) || 0)), at: Number(e.at) || 0 })).sort((a, b) => b.score - a.score).slice(0, 5);
    out.director = out.director && typeof out.director === "object" && typeof out.director.week === "string" ? { week: out.director.week.slice(0, 10), best: Math.max(0, Math.floor(Number(out.director.best) || 0)),
      stars: [0, 1, 2].map(i => !!(Array.isArray(out.director.stars) && out.director.stars[i])), runs: Math.max(0, Math.floor(Number(out.director.runs) || 0)) } : null;
    out.streakDays = Math.max(0, Math.floor(Number(out.streakDays) || 0)); out.streakLast = typeof out.streakLast === "string" ? out.streakLast.slice(0, 12) : "";
    out.arcadeTables = tabs; out.lastIni = /^[A-Z]{3}$/.test(out.lastIni || "") ? out.lastIni : "";
    out.history = Array.isArray(out.history) ? out.history.filter(h => h && typeof h === "object").slice(0, 10).map(h => ({ mode: String(h.mode || "story").slice(0, 12), map: Math.max(0, Math.floor(Number(h.map) || 0)), stage: Math.max(1, Math.floor(Number(h.stage) || 1)),
      score: Math.max(0, Math.floor(Number(h.score) || 0)), hits: Math.max(0, Math.floor(Number(h.hits) || 0)), won: !!h.won, xp: Math.max(0, Math.floor(Number(h.xp) || 0)), at: Number(h.at) || 0 })) : [];
    out.secrets = Array.isArray(out.secrets) ? [...new Set(out.secrets.filter(k => typeof k === "string" && /^[a-z]{2,16}$/.test(k)))].slice(0, 40) : [];
    out.met = Array.isArray(out.met) ? [...new Set(out.met.filter(k => typeof k === "string" && /^[a-z]{2,8}:[a-z0-9]{1,16}$/.test(k)))].slice(0, 400) : [];
    const S = out.season, ints = a => (Array.isArray(a) ? [...new Set(a.filter(n => Number.isInteger(n) && n >= 0 && n < 100))] : []);
    out.season = S && typeof S === "object" && /^[a-z0-9]{1,12}$/.test(S.id || "") ? { id: S.id, xp: Math.max(0, Math.floor(Number(S.xp) || 0)), free: ints(S.free), prem: ints(S.prem),
      notes: Object.fromEntries(Object.entries(S.notes && typeof S.notes === "object" ? S.notes : {}).filter(([k]) => /^[a-z0-9]{1,16}$/.test(k)).map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))])),
      done: Array.isArray(S.done) ? [...new Set(S.done.filter(k => typeof k === "string" && /^[a-z0-9]{1,16}$/.test(k)))] : [] } : null;
    out.firsts = Array.isArray(out.firsts) ? [...new Set(out.firsts.filter(k => typeof k === "string" && /^[a-z0-9]{2,12}$/.test(k)))].slice(0, 40) : [];
    return out;
  }
  function cleanArcade(a) {
    const out = {};
    if (a && typeof a === "object") for (const [k, v] of Object.entries(a)) {
      if (!/^\d{1,2}$/.test(k) || !v || typeof v !== "object") continue;
      out[k] = {}; for (const f of ["score", "secs", "hits", "runs"]) out[k][f] = Math.max(0, Math.floor(Number(v[f]) || 0));
    }
    return out;
  }
  // Two saves of the same player (two devices, or a save code): counters never go backwards.
  // two devices' season records: the same season's are added together (the best of each), a newer season's wins
  function mergeSeason(a, b) {
    if (!a || !b) return a || b || null;
    if (a.id !== b.id) return (SEASONS[a.id] ? SEASONS[a.id].n : 0) >= (SEASONS[b.id] ? SEASONS[b.id].n : 0) ? a : b;
    const notes = { ...a.notes }; for (const [k, v] of Object.entries(b.notes)) notes[k] = Math.max(notes[k] || 0, v);
    return { id: a.id, xp: Math.max(a.xp, b.xp), free: [...new Set([...a.free, ...b.free])], prem: [...new Set([...a.prem, ...b.prem])], notes, done: [...new Set([...a.done, ...b.done])] };
  }
  function mergeProfiles(a, b) {
    a = cleanProfile(a); b = cleanProfile(b);
    const out = { ...a };
    for (const k of STAT_KEYS) out[k] = Math.max(a[k], b[k]);
    out.unlocked = [...new Set([...a.unlocked, ...b.unlocked])];
    out.history = (a.updatedAt >= b.updatedAt ? a : b).history.slice(0, 10);   // (the newer device's log)
    out.mastery = [...new Set([...a.mastery, ...b.mastery])];
    out.arcadeTables = {}; for (const k of new Set([...Object.keys(a.arcadeTables), ...Object.keys(b.arcadeTables)])) {   // (both devices' entries, the best five)
      const seen = new Set(), all = [...(a.arcadeTables[k] || []), ...(b.arcadeTables[k] || [])].filter(e => !seen.has(e.at + e.ini) && seen.add(e.at + e.ini));
      out.arcadeTables[k] = all.sort((x, y) => y.score - x.score).slice(0, 5); }
    for (const f of ["flawless", "mapMakes"]) { out[f] = { ...a[f] }; for (const [k, v] of Object.entries(b[f])) out[f][k] = Math.max(out[f][k] || 0, v); }
    out.met = [...new Set([...a.met, ...b.met])]; out.secrets = [...new Set([...a.secrets, ...b.secrets])]; out.firsts = [...new Set([...a.firsts, ...b.firsts])];
    out.season = mergeSeason(a.season, b.season);
    out.bio = a.bio || b.bio; out.pic = a.pic || b.pic;
    const newer = b.updatedAt > a.updatedAt ? b : a, older = newer === a ? b : a;
    out.name = newer.name || older.name;
    out.bones = newer.bones;   // a spendable balance: the most recent save wins (max() would refund purchases)
    out.daily = newer.daily || older.daily; out.weekly = newer.weekly || older.weekly; out.monthly = newer.monthly || older.monthly;
    out.achievements = [...new Set([...a.achievements, ...b.achievements])];
    out.arcade = {};
    for (const k of new Set([...Object.keys(a.arcade), ...Object.keys(b.arcade)])) {
      const x = a.arcade[k] || {}, y = b.arcade[k] || {}; out.arcade[k] = {};
      for (const f of ["score", "secs", "hits", "runs"]) out.arcade[k][f] = Math.max(x[f] || 0, y[f] || 0);
    }
    out.board = newer.board;
    out.boardBest = b.boardBest && (!a.boardBest || b.boardBest.score > a.boardBest.score) ? b.boardBest : a.boardBest;
    out.fragments = [...new Set([...a.fragments, ...b.fragments])];
    out.bossLog = { ...a.bossLog }; for (const [k, v] of Object.entries(b.bossLog)) out.bossLog[k] = Math.max(out.bossLog[k] || 0, v);
    out.shots = { ...a.shots }; for (const [k, v] of Object.entries(b.shots)) out.shots[k] = Math.max(out.shots[k] || 0, v);
    out.seen = [...new Set([...a.seen, ...b.seen])];
    out.modes = JSON.parse(JSON.stringify(a.modes)); for (const [k, v] of Object.entries(b.modes)) { const o = out.modes[k] || (out.modes[k] = {}); for (const [f, n] of Object.entries(v)) o[f] = Math.max(o[f] || 0, n); }
    out.schema = Math.max(a.schema, b.schema);
    out.gift = a.gift || b.gift ? 1 : 0;
    out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    return out;
  }
  function cleanCos(c) {
    const out = { ...DEFAULT_COS, ...(c && typeof c === "object" ? c : {}) };
    for (const kind of KINDS) {
      const m = MIGRATE[kind] && MIGRATE[kind][out[kind]]; if (m) out[kind] = m;
      const it = CATALOG[kind].find(i => i.id === out[kind]);
      if (!it || (profile && !canUse(kind, it) && !(it.souls && !Souls.known()))) out[kind] = DEFAULT_COS[kind];   // (a Soul item waits for the wallet before it's judged)
    }
    // three saved looks (the Vault's Outfits, v29): only the slots' ids are kept here; wearing one checks each is still yours
    out.outfits = [0, 1, 2].map(i => { const o = Array.isArray(out.outfits) ? out.outfits[i] : null; if (!o || typeof o !== "object") return null;
      const L = {}; for (const k of KINDS) if (typeof o[k] === "string" && o[k].length < 24) L[k] = o[k]; return Object.keys(L).length ? L : null; });
    out.updatedAt = Number(out.updatedAt) || 0;
    return out;
  }
  function loadAll() {
    settings = readJSON(KEYS.settings, DEFAULT_SETTINGS);
    if (store.get(KEYS.settings, null) === null && store.get(KEYS.mute, "0") === "1") settings.sound = false;
    if (!["full", "light", "off"].includes(settings.film)) settings.film = DEFAULT_SETTINGS.film;
    if (!["full", "gentle", "still"].includes(settings.camera)) settings.camera = DEFAULT_SETTINGS.camera;
    if (!["babble", "spoken", "off"].includes(settings.voice)) settings.voice = DEFAULT_SETTINGS.voice;
    if (!["full", "reduced", "off"].includes(settings.flashes)) settings.flashes = DEFAULT_SETTINGS.flashes;
    if (!["normal", "large"].includes(settings.text)) settings.text = "normal";
    if (!["full", "short", "off"].includes(settings.cards)) settings.cards = "full";
    if (typeof settings.lang !== "string") settings.lang = "en";
    settings.mischief = settings.mischief !== false;
    if (!["classic", "vintage", "spooky", "chiptune", "kazoo"].includes(settings.soundSet)) settings.soundSet = "classic";
    settings.contrast = !!settings.contrast;
    if (!["ask", "yes", "no"].includes(settings.analytics)) settings.analytics = "ask";
    profile = cleanProfile(readSaved(KEYS.profile));
    profile.best = Math.max(profile.best, Number(store.get(KEYS.best, 0)) || 0);
    cos = cleanCos(readSaved(KEYS.cos));
  }
  function persist(cloudDelay = 4000) {
    if (sandbox) return;
    const P = realProfile(); P.updatedAt = Date.now();   // (in Practice the run plays on a copy; the real one is what's kept)
    store.set(KEYS.settings, JSON.stringify(settings)); store.set(KEYS.profile, JSON.stringify(P));
    store.set(KEYS.cos, JSON.stringify(cos)); store.set(KEYS.best, P.best);
    if (P.games > 0) { firstTime("save"); restorePoint(P); }
    Cloud.schedule(cloudDelay);
  }
  // Restore points (v39): once a day, a copy of the profile is put by (the last three days kept). Settings →
  // Recover progress merges one back in, which can only add: the best of both is kept, as with the cloud save.
  const RESTORE_KEY = "skullToss.restore.v1";
  const restorePoints = () => { if (sandbox) return sandbox.restore || []; try { const v = JSON.parse(store.get(RESTORE_KEY, "[]")); return Array.isArray(v) ? v.filter(r => r && r.day && r.p) : []; } catch (e) { return []; } };
  function restorePoint(P, day = new Date().toISOString().slice(0, 10)) {
    const list = restorePoints();
    if (list.length && list[list.length - 1].day === day) return;
    const next = list.concat({ day, p: JSON.parse(JSON.stringify(P)) }).slice(-3);
    if (sandbox) sandbox.restore = next; else store.set(RESTORE_KEY, JSON.stringify(next));
  }
  function restoreFrom(day) {
    const R = restorePoints().find(r => r.day === day); if (!R) return false;
    profile = mergeProfiles(realProfile(), { ...R.p, boardBest: null }); persist(300); updateHud(); updatePips();
    return true;
  }

  // Save codes: a portable copy of progress + cosmetics (works anywhere, offline).
  function exportCode() {
    const json = JSON.stringify({ v: SAVE_SCHEMA, p: realProfile(), c: cos });   // v: the profile schema it was written in
    const bytes = new TextEncoder().encode(json); let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return "SKULL1." + btoa(bin).replace(/=+$/, "");
  }
  function importCode(code) {
    const m = String(code || "").trim().match(/^SKULL1\.([A-Za-z0-9+/]+)$/);
    if (!m) return false;
    try {
      const bin = atob(m[1]), bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || !Number.isInteger(data.v) || data.v < 1 || data.v > SAVE_SCHEMA || !data.p || typeof data.p !== "object") return false;   // (a newer build's code can't be read here)
      profile = mergeProfiles(profile, { ...data.p, boardBest: null });   // a code never brings a leaderboard run with it
      cos = cleanCos({ ...cos, ...(data.c || {}) });
      return true;
    } catch (e) { return false; }
  }
