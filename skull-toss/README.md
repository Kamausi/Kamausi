# SKULL TOSS v35

Lob the skull through a ring in a haunted graveyard. Play **Story** to climb through the stages and beat the bosses, or **Arcade** to pick any map and see how long you can last. Three misses and you're buried.

Open `index.html` in any browser, on a phone or a desktop. The fonts and all the artwork are embedded in the file, so the game looks the same offline. Most sound effects are generated in code; three are recordings, embedded too. The music is six recorded loops (see [The music](#the-music)), with a synthesised waltz standing in wherever they can't load.

## New in v35: cartoon replays, and sharing them

- **Watch replay** on the headstone plays the run you just had back, throw for throw.
  - **How it works.** The simulation is fixed-step and seeded, so a run is its seed plus what you did and when: each throw (where it was aimed), each skipped card, each continue taken or turned down, and ending the run. Each is stamped with the step it happened on, counted in game time, so a freeze frame never shifts it.
  - **Settings that travel with it.** The few settings that change the simulation go with the replay: title cards, mischief, the countdown leader, the hang a miss takes under reduced motion, Practice's options and Boss Rush's list.
  - **Watching.** A **Replay** badge sits under the score, with 1×, 2× and 4× speed and a way out (✕, or Esc).
  - **Safe to watch.** A replay plays on a copy of your profile, so watching changes nothing of yours, never posts to the board, and never touches a run you could resume.
- **Share** puts the run in a link (`…#replay=…`) using the system's share sheet, or copies it where there isn't one. Opening the link offers **Watch the shared replay** on the title screen, and it's the same run.
- With a server, a Story run's recording now goes to `submitRun` with it, kept for audit beside the run.

## New in v34: a leaderboard the server checks

With a Firebase server, the leaderboard is **written only by the server**.

- **Posting.** A finished Story run goes to the `submitRun` function, which checks it first (`firebase/functions/shared/runs.js`).
- **The checks.** The score has a ceiling set by what the run says it did (every make at the richest combo, stage and power-ups; every boss, target and signature shot at its most). The other numbers must agree with each other: hits against throws, perfects against hits, bosses and pieces against the map reached. The clock has to allow the throws.
- **What's refused.** A run that used a continue never posts. A player can't send a run more than once every 15 seconds.
- **What's kept.** Every run sent is kept for audit. The best goes on the board, and on a new **This week** board (weeks run Monday to Sunday).
- **What the board shows.** A rival line names the headstone just above yours ("Beat it to pass them"). The best-run record now keeps throws, time, perfects, bosses, targets, signature shots and pieces, which is what the server checks.

Without a server (a claude.ai-published page) the board works as before. The Firestore rules now refuse any write to the board from the page. `firebase/functions/test/runs.test.js` covers the checks, the posting and the rate limit.

## New in v33: sound sets, motifs and stings

- **Sound sets** (Settings → Sound set) reshape every synthesised sound effect as it's made. The music and the graveyard's ambience stay as they are.
  - **Classic:** the cartoon foley as it was.
  - **Vintage:** a worn optical soundtrack, dulled and wavering.
  - **Spooky:** a haunted organ, lower and longer, in a bigger room.
  - **Chiptune:** everything a square wave, and quicker.
  - **Kazoo:** a kazoo band, buzzing through paper.
- **Motifs.** Each of the sixteen bosses walks on to its own short phrase, and each reel's title card has one, all played in your sound set.
- **Stings.** A signature shot's flourish rises with its rarity: one more note for each step.

## New in v32: the Shot Book and mastery

A **Mastery** chip on the title screen shows what there is to get good at, and what getting good pays. Each tier pays its bones once, claimed by hand. The chip shows a pip when something is waiting.

| Tab | Tiers | Pays |
|---|---|---|
| **Shots** (the Shot Book) | each signature shot: Bronze (made once), Silver (10) and Gold (25) | 100, 300 and 750 bones |
| **Maps** | three stars a map: its end boss down, its end boss down without a miss, and 100 makes there | 150 bones a star |
| **Bosses** | each of the sixteen: beaten once, 5 times and 20 times | 100, 250 and 500 bones |

Gold on all twelve shots earns the **Shot Doctor** title. The profile now also records makes per map and which end bosses fell without a miss.

## New in v31: career levels, the profile card and a log of runs

- **Experience.** Every real run earns it. Practice earns none, because it plays on a copy of your profile.

  | What you did | XP |
  |---|---|
  | A hit | 1 |
  | A perfect | 2 |
  | A boss | 25 |
  | A piece of Morty | 50 |
  | A signature shot | 10 |
  | A bonus target | 3 |
  | Every 5,000 points | 1 |
  | Finishing the story | 300 |

- **Fifty career levels** on a curve that asks a little more each time. Each level pays 25 bones × the level. Levels 5, 10, 20, 30, 40 and 50 bring a title: Understudy, Headliner, Matinee Idol, Box Office Draw, Picture-Palace Legend, and Mortimer's Equal. The headstone shows the experience a run earned and any level gained. The rank (by makes) stays as it was: the level says how much you've played, the rank how well.
- **The Profile** opens on a career card: your level in a medallion, experience to the next level, your title, and the highlights (best score, story clears, Morty's pieces, signature shots, Codex entries and secrets). Under the stats are your **last ten runs**: mode, map, score, hits, the experience each earned, and when.

## New in v30: Souls, the Soul Shop, and a Firebase server

**Souls** are the premium currency, and they belong to the server:

- **Where they live.** The balance and what it has bought live in Firestore (`wallets/<uid>`) and only Cloud Functions can change them. They're never on the profile, in a save code or in the cloud save.
- **Getting them.** A free daily handful (10, once per UTC day by the server's clock), and Soul packs (100, 550, 1,200) bought in a store. A pack is credited only after the store confirms the receipt, and never twice.
- **Spending them.** The **Soul Shop** (a door in the Curio Cart, or from a Soul item in the Vault) sells two four-piece sets, the Soul set and the Aurora set, each a skull, a ring, a trail and a band. The server charges its own prices, from `firebase/functions/shared/economy.js`, whatever the caller asks.
- **Without a server.** The Soul Shop says so, Soul items stay locked, and nothing else in the game minds. Bones still buy everything else.

**The Firebase server** (`firebase/`, see [firebase/README.md](firebase/README.md)). Put your web app's config in `src/firebase.config.json` and rebuild. The game then loads the Firebase SDK, signs the player in anonymously, keeps the cloud save in Firestore, and calls Cloud Functions for Souls:

- `wallet`, `buyWithSouls`, `claimDailySouls` and `redeemPurchase`;
- Firestore rules under which the client writes only its own save;
- a ledger of every change to a balance;
- a receipt check per store, left for your own store credentials.

The handlers are plain JavaScript shared with the game's build. The dev build stands them up in the page, so the spec drives the real server logic. `cd firebase/functions && npm test` runs them against an in-memory database, and CI runs that too. Without a config the game behaves as before, and a claude.ai-published page still uses its host for saves and the board.

**The spec runner** now queues its tests and runs them in order, and a test may be async (the server's calls are). [docs/ECONOMY.md](docs/ECONOMY.md) reviews both currencies: sources, sinks, and what a save code can and can't do.

## New in v29: bands, outfits and Surprise me

- **Bands.** A new Vault shelf of eight slingshot bands, strung on the launcher in play: Rubber Band (yours from the start), Licorice Whip, Bone Twine, Candy Cane (striped), Jester's Ribbon, Gilded Cord (with a shine), Ectoplasm (glowing; the prize for finishing the story) and Barbed Wire (Hall of Shame: 300 misses). The Vault now holds 372 items.
- **Outfits.** Three saved looks in the Vault. Tap an empty slot (or **Save look**) to keep what Morty's wearing; tap a filled one to put it all back on. An outfit never puts on something you no longer own.
- **Surprise me.** Something of yours from every shelf, picked at random.
- **Renamed items.** A renamed Vault item still belongs to you: owned items migrate by ID, as equipped ones already did.
- **Item goals.** They now say "Beat 3 mini-bosses", "Beat an end boss" and "Reach map 5" where they still named the Crow King, the Pumpkin King and stages.

## New in v28: the cartoon misbehaves, and nine secrets

**The old print acts up.** It has been through a fire, and now and then, between throws in Story and Arcade, it misbehaves:

- **Jam:** the picture shudders and holds while a burn bubbles through the film, then it runs on.
- **Slip:** the frame slips and rolls back down into the gate, the frame line showing.
- **The animator's hand:** a white glove (four fingers, as the style sheet required) reaches in and pats Morty.
- **Wrong reel:** half a second of another reel's title card, stamped WRONG REEL!
- **Fourth wall:** Morty turns to the camera and says something he shouldn't.
- **Ink blot:** a blot lands on the lens and slides off.

It never happens mid-flight, in a boss fight or a cut-scene, or in a run's first five throws. The Mischief Director allows at most one a map (one every forty throws in Arcade). All of it is picture only and never touches a throw. **Settings → Mischief** turns it off. Reduced motion leaves out the slip and the wrong reel, and the Flashes setting dims the burn.

**Nine secrets**, which the game never mentions. Each pays 150 bones once and goes in a new **Secrets** tab in the Codex, which gives a cryptic hint for each one still hidden. None can be found in Practice. (One of them is an old projector's code that brings the Two-Strip Color reel out of the Vault.)

## New in v27: the Codex and the Production Archive

A new **Codex** chip on the title screen opens everything you've met, written up, in 66 entries:

- the eight maps, from their premise and what's odd about each;
- the sixteen bosses, each with a line of history, their tell, and how often you've beaten them;
- Morty's eight pieces and who was holding each;
- the seven power-ups;
- each map's hazard: bats, wind, falling bones, fog, balloons, the pendulum and the Final Reel's jump cuts;
- each map's bonus target;
- the twelve signature shots, with how often you've made each.

An entry is **???** until you meet the thing in play, with a word on how to find it.

- **How entries fill in.** Maps, pieces and shots come from your progress. Bosses, power-ups, hazards and targets are noted the first time they turn up (`profile.met`), with a toast.
- **Practice.** What you see there still goes in the Codex: it records what you know, not what you've scored.

**The Production Archive** is the Codex's last tab: the studio's paperwork from 1933, twelve documents unsealed as the story goes on. It runs from the first production memo and Morty's model sheet, through the censor's letter, the payroll ledger and the newspaper clipping about the fire, to the restoration report you unseal by finishing the story.

## New in v26: more ways to play

**Play** now offers five more ways to play under Story and Arcade:

- **Practice.** Any map you've reached, as long as you like. Misses are free and nothing counts: the run plays on a copy of your profile, so no stat, bone, challenge or medal moves (the Vault is closed from its pause menu for the same reason). Pick the ring (Still, Slow or Full), its path (Flat or the 3D half), and hazards on or off.
- **Boss Rush.** Every boss you've beaten, back to back: three skulls, one more after each end boss. The record is bosses beaten.
- **Curtain Call** (mini-game). Twenty seconds on the clock and a quick ring: as many makes as you can. Misses are free.
- **Longshot** (mini-game). A still ring that backs off 0.4 m (and drifts sideways) after every make. Misses cost skulls. The record is the farthest make.
- **Target Gallery** (mini-game). Ten throws through a still ring at five targets hanging behind it, each on a line you can throw through the hole.

Boss Rush and the mini-games open once you've put an end boss down. Each keeps its own record, shown on its tile and on its headstone. The leaderboard, continues and resuming a run stay Story's and Arcade's. The mini-games have no hazards: no wind, bats or bones.

**Story's encore.** After every end boss but the last, Story plays ten seconds of Curtain Call before the next reel. Misses are free and every make pays 5 bones.

## New in v25: signature shots and the cartoon camera

**Twelve signature shots.** Some makes deserve a name. A make is judged as it goes through the ring:

| Shot | What it takes | Rarity |
|---|---|---|
| Knockout Blow | A perfect that puts a boss down | 5 |
| Buzzer Beater | A perfect on your last skull | 5 |
| Hat Trick | Three perfects running | 4 |
| Two for One | A make that flies on into a bonus target | 4 |
| Thread the Needle | A make that passes within 45 cm of a bat, bone, balloon, pendulum or seed | 4 |
| Dead Centre | A perfect in the middle 30% of the perfect window | 3 |
| Long Bomb | A make through a ring 7.6 m out or more | 3 |
| Wind Rider | A make the wind carried 60 cm or more | 3 |
| Leading Man | A make that led a moving ring 1.4 m or more | 2 |
| Point Blank | A make through a ring 5 m out or less | 2 |
| Top Corner | A make through a ring at the edge of the ring's space | 2 |
| Phantom | A Ghost Toss that phased through the rim | 2 |

Each pays 150 points × its rarity × the stage multiplier. Its name comes up over the lane. A throw can earn several: the rarest takes the card and the rest are counted under it ("and 1 more"). The first of each gets a toast, Morty has a line for them, and the Profile lists all twelve, what each takes and how often you've made it (the Shot Book will build on this).

**The cartoon camera.** Moves the rostrum camera can't make, done on the whole painted frame so the HUD stays level:

- **Crash zoom:** the frame punches in and springs back (Long Bomb, Dead Centre, Two for One…).
- **Whip pan:** a fast slide with the picture smeared (Leading Man, Wind Rider, Thread the Needle, Top Corner).
- **Dutch tilt:** the frame leans for a beat as a boss walks on.
- **Hold:** the reel stops for half a second and an iris spot closes round the ring, then opens (Knockout Blow, Buzzer Beater, Hat Trick).

Camera: Gentle halves them. Still (or reduced motion) leaves them out; the hold still holds, without the iris.

Also: the Profile's boss stats now count all the mini-bosses and end bosses, plus Morty's pieces and story clears.

## New in v24: Morty has a personality, and every word has an ID

**Morty talks more, and to the point.** His 151 lines are dealt from pools like cards: shuffled, and no line comes round again until the whole pool has been said.

- **Mood.** What he says when you grab him depends on his mood: cocky on a streak, nervous on the last skull, grumpy after misses, odd when cursed.
- **Big moments always get a line:** each of the sixteen bosses walking on, a boss going down, each of his eight pieces coming back, a new reel starting, the offer of one more skull (and taking it), a resumed run, and THE END.
- **Small moments wait their turn:** a perfect, a near miss, a knock from a bat or a bone, a streak of five, the last skull, a power-up. They roll the dice and wait out a five-second cooldown.
- **Stalling.** Leave him in the pouch for twelve seconds and he nags you, once per lull.

**Every word has an ID** (groundwork for other languages; see [docs/LOCALIZATION.md](docs/LOCALIZATION.md)).

- **Where the text lives.** The code's text is in `src/strings/en.json`. The markup keeps its English and marks it `data-t="ui.…"`.
- **What the build checks.** It refuses an ID that's used but missing, one that's defined but never used, and a translation whose placeholders don't match.
- **Adding a language.** Drop `src/strings/fr.json` in and **Settings → Language** appears.
- **Testing text length.** `?lang=pseudo` accents and pads every string by a third to show what won't fit. The spec checks the menus, Settings and the continue box for overflow that way; long labels now wrap inside their buttons.
- **Recorded voice.** Morty's line IDs are voice-line IDs: a recording saved as `src/sfx/vo.<id>.mp3` replaces the mumble for that line.

## New in v23: the reel's own cards

Skull Toss is a restored 1933 cartoon, and now it opens like one:

- **The countdown leader.** 3, 2, 1 on grey film, the sweep going round and a tick on each number. It plays once a session, before your first Story run.
- **Main title cards.** Each reel gets one: *A Morty Bones Cartoon*, **Reel Three of Eight**, the map's name, its premise and what's odd about its ring. Morty peeks up from the corner. Arcade runs open on the map's card with no leader.
- **The intermission.** After Reel Four the picture stops: *Stretch your bones!*, with your score, hits and pieces so far.
- **THE END.** After Reel Eight's boss falls, *The End* comes up with Morty whole again, top hat and all. He winks, and the iris closes on him and opens on the headstone.
- **Changeover cues.** Between reels, the round mark that told a projectionist to switch machines flashes twice in the top corner, as on a real print.

A card holds the throw like any cut-scene. A tap, Space, Enter or the pad's A button skips it. **Settings → Title cards** picks Full (leader and cards), Short (a brief card, no leader) or Off (the old small stage card). Resuming a run skips the cards.

Fixed: the film's flicker had stopped drawing in v15. It's back, still scaled by the Flashes setting.

## New in v22: one more skull, and runs that survive a reload

When the last skull goes, the run doesn't have to end. **One more skull?** comes up over the picture with an eight-second clock, and Morty's ghost waits in the empty pouch:

- **Spend bones:** 200 the first time, then 400, then 800.
- **Watch a short reel,** where the build has an ad provider. The web build has none; the native shells plug one in (`Ads` in `07g_continue.js`). The clock stops while the reel plays.
- **No thanks,** Esc, or the clock running out ends the run as before.

A continue gives back one skull and nothing else: the score stays, and the combo was already broken by the miss. You get one continue per map and three per Story run, or one per Arcade run. A run that used a continue still counts for your own best, but never goes on the leaderboard.

**Runs survive a reload.** The run is kept in this browser as each throw settles, when a continue is offered and when the page is hidden. If the phone reclaims the page (during an ad, say), the title screen offers **Resume run** for up to a day. A run caught in a boss fight comes back at the start of that fight. A run that was waiting on a continue comes back to the offer. A finished run leaves nothing to resume.

## New in v21: power-ups turn up at random, fairly

Power-ups no longer come at fixed hits. The **Power-Up Director** rolls after every make:

- The chance is 14% × the tier's power rate.
- Every make without one raises the odds by 4.5%, and one is certain by the eleventh.
- Never more than three in half a map (except in Arcade's endless second half).
- None before the fourth hit of a half.
- Never one of the last two props again.
- A prop you're already carrying is less likely.
- The Cursed Skull only turns up in a second half.
- The same prop again refreshes its throws rather than doubling. Different props stack: Cursed Skull and BONK Blast multiply to ×9.

The dice are the run's seeded stream, so a replay rolls the same props. End bosses still leave their Ghost Toss at two-thirds and one-third health.

## New in v20: sixteen bosses

Every map has its own mini-boss and its own end boss. Each end boss holds one of Morty's pieces, and each boss has its own way of moving the ring, its own tell and its own hint.

| Map | Mini-boss (carries the ring) | End boss (attacks) | Holding |
|---|---|---|---|
| Moonshine Cemetery | The Crow King: swoops between perches, caws first | The Undertaker: swings the ring round on his shovel rope, flings clods of dirt | Top Hat |
| The Crooked Crypts | The Bat Baron: dives high and low, screeches first | Count Crookula: spins the ring round a circle by his spell (and turns it about), sends bats | Bow Tie |
| Pumpkin Patch Hollow | Old Tattersack: the ring swings from his arm, with a big lurch every third sway | The Pumpkin King: the vine and the seeds | White Gloves |
| The Bone Orchard | The Bone Owl: hops between trees, two hoots first | Old Marrowroot: the ring swings from a branch, and bones drop from above | Cane |
| The Drowned Bayou | Ferryman Gator: balances it on his snout, dives and surfaces elsewhere (bubbles first) | Madame Muck: the ring hops the lily pads, mud spat down the lane | Spats |
| The Carnival | Jack-in-the-Box: the box slides, the crank winds, POP | The Ringmaster: the ring leaps round a circle, juggling pins thrown | Whistle |
| The Clockwork Belfry | The Cuckoo: ticks the ring round its clock, now and then backwards | The Clockwork King: a clock hand ticking round, gears flung | Pocket Watch |
| The Final Reel | The Projectionist: cuts the ring between frames, the flicker first | The Reel Reaper: cuts between frames, then circles when he's hurt; throws film frames | Shadow |

The framework (`07f_bosses.js`) builds a boss from a carrier, an optional attack and a drawing. The carriers are perch, loop, sway, circle, surface, orbit, bounce and jump. Every attack is told first, and every end boss gets angrier at half health and leaves a Ghost Toss at two-thirds and one-third health. The Crow King and the Pumpkin King keep their original hand-tuned code.

## New in v19: every map plays differently

- **Map = environment, Tier = intensity.** Six tiers (`src/maps/tiers.json`) set the ring's speed and size, how often a hazard comes, how many bonus targets hang behind the ring, and how generous the perfect window is. Each map runs one tier before its mini-boss and another after. Map 1 runs tiers I and II, so it plays exactly as before. Arcade climbs a tier every 25 hits past 50.
- **The Ring Path Director.** The first half of a map slides. After the mini-boss, the map's own path takes over:
  - most maps: a triangle through depth
  - the Carnival: the carousel, a wide circle through depth
  - the Final Reel: jump cuts. The ring holds on a corner, the film flickers, and it cuts to the next.
  
  Static, vertical, diagonal and figure-8 paths are ready for modes and challenges. The spec keeps every path inside the ring's playable space.
- **Each map's mechanic:**
  - **Pumpkin Patch Hollow: wind.** It changes every throw and pushes the skull sideways in flight. The HUD shows its strength and direction, and the guide bends with it.
  - **The Crooked Crypts: bats.** Every few throws a bat screeches, then crosses the lane.
  - **The Bone Orchard: falling bones.** A shadow grows, then a bone drops.
  - **The Drowned Bayou: fog.** Fog banks roll over the ring, but its reflection on the water still shows where it is.
  - **The Carnival: balloons** drift up through the lane.
  - **The Clockwork Belfry: the pendulum.** It swings across the lane and ticks at each end.
  
  Anything solid knocks the skull out of the air, and Ghost Toss slips through it. Only the wind keeps blowing during a boss fight.
- **Bonus targets.** From tier II on, one to three targets hang behind the ring: a wisp, a brazier, a jack-o'-lantern, a bone-fruit, a frog on a lily pad, a gallery duck, a bell or a film can. A make that flies on through one pays 200 points × the stage, plus 3 bones.
- **One seeded stream** decides everything random in a run's play. The same seed and the same throws make the same run, which replays and score checks will rely on.

## New in v16–v18: eight maps, and a story with an ending

- **Eight maps.** Moonshine Cemetery, The Crooked Crypts, Pumpkin Patch Hollow, The Bone Orchard, The Drowned Bayou, The Carnival of Lost Souls, The Clockwork Belfry and The Final Reel. Each is its own place, not a colour wash over the graveyard:
  - its own sky and moon (crescent, a low harvest moon, a picture-house screen)
  - its own skyline (crooked mausoleums, a barn and a turning windmill, cypress and a drowned steeple, big tops and a turning Ferris wheel, rooftops under a clock tower that keeps its own time, theatre boxes)
  - its own lane (flagstones, furrows, a bone-edged path, a boardwalk over water, sawdust, cobbles, the aisle carpet)
  - its own props (sarcophagi and torches, pumpkins, jack-o'-lanterns and scarecrows, bone trees, cypress and lily pads, tents and carousel horses, lampposts and gargoyles, rows of velvet seats)
  - its own foreground frame, weather (mist, falling leaves, spores, fireflies, confetti, rain, the projector's dusty beam), wanderers and sky life
- **The story ends.** Story runs through the eight maps in order, each with a mini-boss at 25 hits and an end boss at 50. It no longer loops. Every end boss is holding one of Morty's missing pieces: Top Hat, Bow Tie, White Gloves, Cane, Spats, Whistle, Pocket Watch and Shadow. Beat the eighth and the reel ends: THE END, Morty whole again, and the headstone says *The end!* instead of *Here lies…*
- **Arcade opens a map once Story has reached it.** Map 1 is always open. Locked maps are listed with how to open them.
- **Maps are data** (`src/maps/*.json`). The build checks each one against the [spatial blueprint](docs/SPATIAL_BLUEPRINT.md) and the registry of what the code can draw: the ring's triangle has to stay in the playable space, no pattern may loop a corner onto itself, every painter it names must exist, and no two maps may share a boss or a piece. The [stage bible](docs/STAGE_BIBLE.md) is generated from the same files.
- **Canon.** The Story card, the progress bar, the stage cards and the achievements all speak of maps, mini-bosses and end bosses now. New achievements: Half the Reel, The Whole Reel (finish the story), A Piece of Morty, Piece by Piece, Boss Hunter and Boss Slayer.
- **Save schema 3.** A v12 save's "stage 5 and beyond" was map 1 again, faster. It now means map 5, which that player had earned by clearing the four old maps. Anyone who already had The Whole Reel keeps it as Half the Reel, so the new Whole Reel can still be earned.

## New in v15: accessibility and the performance budget

- **Flashes: Full, Reduced or Off** (Settings). Reduced swaps every camera flash for one soft one and dims lightning and the film's flicker. Off removes them. A device that asks for reduced motion starts on Reduced.
- **High contrast.** An inked, pale-yellow halo lifts the ring and Morty off the scenery, and dim text and lines are brightened.
- **Text size: Normal or Large.** Large zooms the menus, sheets and HUD by 15%.
- **Keyboard focus stays inside an open sheet,** and the new radio rows move with the arrow keys.
- **A performance budget** (`PERF` in `01_data.js`, [docs/PERFORMANCE.md](docs/PERFORMANCE.md)). Particles, comic bursts and contact stars are capped. The spec checks the cost of a game step and the page's element count, and the build refuses a light page over 2,600 KB.
- **A small UI kit** (`09_ui_kit.js`) that the new screens are built from.

See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) for everything the game does for access.

## New in v14: the foundation pass

This is the first code pass on the V14 gate from the [roadmap audit](../docs/skull-toss/ROADMAP_V14_AUDIT.md). The game plays and looks the same. All 103 earlier checks still pass, and 6 new ones cover what changed.

- **The release build no longer carries the test hooks.** Until now, anyone could open the browser console and set their bones or stats, or post any score to the leaderboard. `python3 src/build.py` now leaves those hooks out. `python3 src/build.py --dev` puts them back, as `index-dev.html`, for the spec. The published build refuses `--dev`. Every build keeps the visual debug overlay and its console switches, which can't change a score or a save.
- **The leaderboard posts runs, not numbers.** Your board entry is now your best Story run actually played to its end. A save code still carries your stats, best score and unlocks, but never a leaderboard run, so a hand-edited code can't put a score on the board. The board only takes runs finished from v14 on. An entry already on the board stays until a better run replaces it.
- **Saves have a schema number.** The profile is now schema 2. An older save, whether on this device, in the cloud or in a code, steps through the migrations in order when it loads, so it reaches today's shape the same way wherever it comes from. A code from a newer build is refused rather than half-read.
- **A save that won't read no longer starts you over.** The game keeps a copy of the last profile and cosmetics that loaded cleanly. If the main copy is ever cut off or garbled, it loads that copy instead and keeps the broken text aside.
- **A fixed step.** The game now moves in fixed 1/240 s steps however fast the screen refreshes, the same step the spec uses. A throw lands the same way at 60, 90, 120 or 144 Hz. Replays and shot checks will need this later. Gameplay itself uses no randomness; only particles and camera jolts do.
- **Gamepad.** Pull the left stick down to draw the band, then press A (or the right trigger) to let go. The stick works exactly like dragging with a finger: sideways steers, and left throws right. B lets the band go slack, and so does letting the stick spring back. Start pauses and resumes. The menus still need a pointer or the keyboard.
- **A play log on the device.** For playtests, a small log records runs starting and ending, every throw's result, bosses and power-ups. Nothing is sent anywhere, and the log is gone on reload. Read it from the console with `SkullToss.telemetry()`.

Still open, waiting on decisions in the audit:
- The Story card and two achievements still say "four stages". That's still true of this build.
- Where a server would check scores.

A hand-edited save code can still raise your own bones, stats and unlocks. That stays a soft-currency problem until Souls exist and balances live on a server.

## New in v12: Story and Arcade, achievements, longer challenges

- **The skull has a name: Mortimer "Morty" Bones.** The game calls him Morty wherever it talks about him as a character (Settings → Morty's voice, the Vault and Cart notes, the Pumpkin King's card, the Bonk achievements, the grab goals and your profile), and he has four new grab lines that introduce himself. Where "skull" means a life, a look or a name (skulls left, the Skull shelf, Skull Rush, the Skull Vault), it stays.
- **Two modes.** **PLAY** now asks which:
  - **Story** is the game as it was: four stages, a Crow King and a Pumpkin King in each.
  - **Arcade** lets you pick any of the four maps. There are no bosses and no end. At 25 hits the ring shakes loose and flies through depth for good, and after 50 hits it keeps winding up (6% quicker every 10 hits, up to 60%). A few extra power-ups turn up late on. A clock at the foot of the screen races your longest run on that map; once you pass it the bar turns gold and says **new best!** Every map keeps its own best score and longest run, and **Toss again** replays the same map. Arcade runs don't touch your Story best or the leaderboard.
- **The maps look like different places.** Each map has its own colour grade washed over the graveyard: Moonshine Cemetery as it was, a violet Crooked Crypts, an orange Pumpkin Patch Hollow and a green Bone Orchard. Story mode changes with them as you reach each stage.
- **GAME OVER.** When the last skull goes, the words GAME OVER bounce in letter by letter over the picture and hold for a moment before the headstone. Ending a run from the pause menu skips them.
- **Results.** The bones you earned now sit in the top-right corner of the progress panel, above the bar.
- **No more path hints.** The chalked triangle, the line traced in the air, the pulsing next corner and the Crow King's ghost ring at his next perch are all gone. The ring's shadow and its plumb line stay, so you can still judge depth, but where it goes next is yours to read.
- **Power-ups are easier to grab.** The grab zone is now the prop you can see, bob and all: if the skull clips the drawing as it passes through the ring, the power-up is yours.
- **Weekly and monthly challenges.** Challenges now come in three tabs, **Daily**, **Weekly** and **Monthly**, three of each. Weeks run Monday to Sunday and months from the 1st. A weekly goal always pays more than a daily one of the same kind, and a monthly more than a weekly; every throw counts toward all three at once. There's a new kind of goal too: survive a set time in one Arcade run.
- **Achievements.** 39 of them, from First Toss to Night Owl, covering tossing, Story, Arcade, power-ups, mishaps and the collection. Each pays its bones once, the moment you reach it. A gold medal drops in with its own jingle: at the top of the screen on the menus, and just under the score mid-run, so your skulls and score stay in sight. The **Achievements** sheet (on the title screen) lists them all, with a progress bar on every one still locked.
- **New music.** The pause menu and the Curio Cart each have their own loop, and hand the act's music back when you leave.
- **Recorded sound effects.** Grabbing a power-up, buying something (in the Vault or at the Cart) and unlocking an achievement now play your recordings. If one can't be decoded, the old synthesised sound plays instead.
- **The title screen.** The tagline just says *A lost cartoon from 1933*. The skull in the title now has room to spill past its letter, so an aura shows in full: the part behind the skull sits behind the lettering, and the part in front sits in front of it.
- **The HUD.** The score is now in Bebas Neue, like every other number in the game. It sits in the centre with the hits under it and your best under those. The skulls and the combo meter are smaller.

## New: Visual Foundation v2: poses, the shot director and sound on the beat

Every throw now plays as one short scene, timed from a single timeline. The game still decides what happened (no score, hit or flight path changed, and every earlier check still passes); the new **shot director** decides when each part of it is seen and heard.

- **Anticipation at full draw.** Pull all the way back and the skull squints, sets its teeth and shivers, with little strain lines flicking off the cranium, and the band groans once. It still keeps its shape in the pouch: the shiver moves the whole skull, and the slingshot's fork trembles instead.
- **Smear drawings.** For two drawings after you let go, the skull is a streak: a tapered tail of its own colour with dry-brush lines through it, thinning on the second drawing (three with Skull Rush). The whoosh lands on the first smear drawing.
- **Contacts land on the frame.** The release and every contact start a fresh drawing the moment they happen, and the 24s run on from there.
- **A contact drawing.** Rim hits, bonks, ground hits, boss hits and knockouts throw a cartoon impact star: a solid star, then the star bursting into a jagged ring, then its rays flying off. It sits over the ring it hit and behind the skull that hit it. A knockout's is five drawings long and dwarfs a rim's.
- **The rebound.** After a hit the skull holds its contact drawing for two drawings (eyes screwed shut on a bonk), then rebounds into the look the result calls for: star eyes, a grin, a puzzled rim-in, or dizzy spirals.
- **A pose library.** Every drawing the skull can show is one entry: idle, aim, anticipation, launch, smear, flight, impact, rebound, perfect, hit, miss, confused, dizzy, boss hit (a wink and a cackle), boss defeat (eyes shut in glee) and death (X eyes). Slow poses are drawn on twos, action on ones.
- **FX direction.** Every moment has a recipe, and its weight sets how big it looks: launch .42, miss .58, hit .72, perfect 1.00, boss hit 1.05, boss defeat 1.35. The camera jolt, the contact star, the flash and the dust scale with it; the skull's squash still follows only how hard it physically hit. Every recipe runs on the same timeline: the burst on contact, the flash two drawings later, the dust at .14 s, the settle at 70% of the recipe. Boss hits and knockouts get bigger screen flashes than a perfect.
- **Sound on the beat.** The sounds sit on the same timeline as the drawings: the creak at full draw, the snap, the whoosh on the smear, the contact, a short crack sized by the moment, the score sting three drawings after the contact (as the score pops), the boing on the rebound, and a small plop as the next skull drops into the pouch. No sound can play twice for one moment.
- **Boss and power-up states.** The bosses now have visual states too (coming in, holding still, winding up, hurt, down), and the active power-ups are tracked alongside them. The debug overlay shows both.
- **Busy devices lose effects before pixels.** If a phone can't keep up, the game now cuts particles, dust and film grain first (down to half), and only then lowers the resolution. Input, physics, timing and the characters' drawings are never touched.

## New: Visual Foundation v1

The picture is now its own system, separate from the game. Gameplay runs every frame, stays exact and never waits for the art. It tells the **visual system** what happened (a throw, a hit, a miss, a boss, a power-up), and the visual system decides how that looks. The game plays exactly as before: all the old checks still pass untouched.

- **Drawings on 24s.** The characters' drawings change 24 times a second, like shot animation, while their positions stay smooth every frame. That covers the skull's squash, lean, spin and face, its hat, the slingshot's twang and the ring's wobble. The camera exposes on the same beat, so pose and camera move together. The background cast still steps on twos (12 a second).
- **States.** The skull goes idle → aim → launch → flight → impact or miss → recover → idle, and ko when the run ends. The ring, the launcher and the camera have states of their own. The debug overlay shows them all.
- **Squash and stretch from one table.**
  - The launch squashes along the throw and overshoots into a stretch.
  - In flight the skull stretches along its path, more the faster it goes.
  - Each kind of hit has its own squash, and springs do the overshoot and settle.
  - The skull still holds its shape while you pull back, as you asked. The slingshot takes the strain instead: the bands stretch and the fork squeezes in.
- **One impact system.** Every contact goes through one place: perfect, swish, rim, clank, post, seed, ground and bounce, plus boss hits, knockouts and BONK Blast. That place fans it out to the camera jolt, the skull's squash, the ring's own squash along the line of the hit, sparks and dust, and the contact sounds. It's all scaled by how hard the hit was: a Skull Rush throw clanks harder than a lob, and a late bounce lands softer.
- **SVG assets.** The skull, the slingshot and the ring's post each have their own folder, `asset.json`, named layers, anchors and a version. The slingshot and post are new drawings (see [The launcher and target artwork](#the-launcher-and-target-artwork)), and you can replace them with your own art.

## New in v11: stages, bosses, power-ups, a shop and a much bigger Vault

### Score and hits are separate now

- **Score** is the big number at the top centre. It's what goes on the leaderboard (Story runs only).
- **Hits** sit under it in smaller type, above your best. Every make is one hit, and hits are what move you through a stage.
- A small **progress bar** sits at the foot of the picture, centred. It counts down to the Crow King and then the Pumpkin King, and turns into the boss's health bar during a fight.

| Call | Base points |
|---|---|
| PERFECT | 250 |
| SWISH | 100 |
| RIM IN | 75 |

Each make is multiplied by:
- **the combo:** ×1, then +0.5 for every make in a row, up to ×6;
- **the stage:** +25% per stage after the first;
- **power-ups:** Cursed Skull and BONK Blast each triple it.

Boss hits and boss knockouts add big bonuses on top.

### A stage has two halves and two bosses

| Hits | What happens |
|---|---|
| 0–25 | The ring slides left and right, getting faster and smaller. |
| 25 | **Mini-boss: the Crow King.** He grabs the ring and carries it in his talons. He hovers, squawks (that's the warning), then swoops to his next perch: left, right, up, down, **near and far**. His crouch and his caw are the only warning. Toss through his ring 5 times (a perfect hits twice). |
| Crow King down | Everything freezes for a fifth of a second, K.O.! The camera pulls back, the ring sprouts wings, and the band changes key. |
| 25–50 | The ring flies a **triangle through depth**. Nothing marks the route: you learn it by watching. Each pattern plays twice before the next one. |
| 50 | **Main boss: the Pumpkin King.** He rises behind the graves. A vine carries the ring around the triangle, and he puffs his cheeks, then spits volleys of seeds down the throw lane. A seed knocks the skull out of the air, so throw between volleys. He gets faster and angrier at half health. |
| Pumpkin King down | Stage clear: a big bonus, bones, a skull back, and the next stage. |

Stages are data, so new ones are cheap to add. Each stage has a name, a speed, its own triangle, its own patterns and modifiers. After Moonshine Cemetery come the Crooked Crypts (the ring bobs), Pumpkin Patch Hollow (it shrinks too) and the Bone Orchard (a lopsided triangle). After that the list loops, faster.

### Power-ups

Little cartoon props float in the **middle** of the ring. You get one by threading the skull through the prop: if the skull clips the drawing as it passes, it's yours. They appear on a fixed schedule rather than at random, at hits 6, 14 and 21, then 30, 38 and 45. Each lasts a few throws. None appear during the Crow King, and only Ghost Toss appears during the Pumpkin King.

| Prop | Power-up | Effect |
|---|---|---|
| Winged skull | Skull Rush | Quicker flights, so there's less to lead. Lasts 4 throws. |
| Eyeball in a reticle | Deadeye | The perfect window doubles, and the ring shows it. Lasts 5 throws. |
| Dynamite | BONK Blast | Your next make scores ×3 and sends a shockwave through the graveyard. |
| Ghost sheet | Ghost Toss | The skull goes see-through and slips past the rim or a seed. 2 uses. |
| Magnet and bone | Bone Magnet | +20 bones on every make. Lasts 5 throws. |
| Heart with a plaster | Second Chance | Your next miss is free. |
| Horned purple skull | Cursed Skull | The ring moves 1.5× faster, but every make scores ×3. Lasts 5 throws. Take it if you're greedy. |

Collecting one goes POP. The props you're carrying show as badges under the pause button.

### A 364-piece Vault, a shop and a leaderboard

- **Three times the cosmetics**, from 117 to 364. There are three new shelves, **Hats** (52), **Auras** (31) and **Ring poles** (21), and every old shelf is bigger.
- **Hats** sit on their own spring. They pop up when you launch, lag behind in flight, fly off on a bonk and land back with a bounce. Some move on their own:
  - the Propeller Beanie spins;
  - the Fishbowl has a fish in it;
  - the Bird's Nest has a bird that peeks out;
  - the Tiny UFO beams down;
  - the Lighthouse sweeps its beam.
- **Auras** include Hellfire, Starstruck, Smoke Signals, Bat Swarm, Poltergeists, The Watchers, Personal Raincloud, Rainbow Arc, Black Hole and more.
- **Ring poles** replace the wooden post. The Candy Cane, Barber Pole, Gas Lamp, Skull Totem, Tentacle and Rocket stand under the ring, and the Hanging Chain and Balloons hold it from above.
- **Prizes for failing (the Hall of Shame).** 28 things are won by doing badly: the Dunce Cap, the Paper Bag of Shame, a Personal Raincloud, a Toilet Seat ring, the Giant Plunger pole, and titles like Airball Artist and Professional Misser.
- **Boss prizes.** 27 things are won only by beating the bosses, such as the Crow King's Crown, the Pumpkin Helm, the Golden Gourd Crown for a flawless Pumpkin King, and the Crow's Nest ring.
- **The Curio Cart,** run by Mort, a ghoul in a bowler who leans on his glove behind a heavy counter, shelves of junk stacked up behind him and a NO REFUNDS notice nailed to the wall. Whatever you're looking at sits glowing on a dish on the counter in front of him. He sells:
  - **today's deals:** four things marked down 20–30%, new every midnight;
  - **Cart exclusives:** 24 things sold nowhere else, like the Disco Ball skull, Diamond eyes, the Chandelier hat and the Rocket pole;
  - **the Mystery Coffin:** 750 bones for something you don't own yet.
- **The leaderboard.** The shared board shows each player's best score, stage and skull. Posting is opt-in, and it only uses the name on your headstone. Other players' names are shown as plain text. When the file runs on its own, the board shows your best runs on this device instead.
- **Profile** stats are grouped into Career, Tossing, Bosses, Power-ups, the Hall of Shame, and Bones & the Vault. There are 43 in all, from time played and perfect rate to seeds taken to the face.

### Moonshine Cemetery, rubber-hose edition

- **Everything is inked and coloured, and bounces to the waltz on twos.**
  - Headstones come in four stones, with moss. Some are only pretending to sleep and open their eyes to watch the skull fly.
  - Trees have bendy arms and knothole faces.
  - The zombie, skeleton, werewolf and ghost wear white gloves and have pie-cut eyes.
  - There's a family crypt, lanterns with warm pools of light, iron fences, tufts of grass, rolling hills and a worn dirt path to the ring.
- **A gravedigger** works in the middle distance. He digs, tosses dirt onto his mound and sometimes leans on his shovel for a yawn.
- **A black cat** strolls across between you and the ring now and then. It stops, stares, blinks, meows and moves on. A BONK Blast sends it running.
- **The moon has a face.** It grins down at the ring with a telescope screwed into one eye. The clouds drift behind it.
- **Morty talks back.** Grab him and, now and then, he complains: "Hey! What do you think you're doing?!", "Not the face!", "My agent will hear about this!" There are 28 grab lines (four of them are him introducing himself), plus lines for your last skull, the bosses and hot streaks. They come as a speech bubble with a cartoon mumble. **Settings → Morty's voice** switches between Mumble, Spoken (your device reads the lines out) and Off.
- **Feel:**
  - the slingshot stays put after the shot: its bands snap through the rest point, overshoot and twang back, and give a little when the next skull drops into the pouch;
  - a short hit-stop on perfects;
  - the biggest camera jolts saved for boss hits, knockouts and game over;
  - a brass sting when a boss arrives and a fanfare when it falls;
  - a walking bass in the 3D half, and an oom-pah-pah with a drum during fights.

## New in v7: one skull, and a lost cartoon from 1933

### The skull is the whole character

His name is **Mortimer "Morty" Bones**. There's no body, no arms and no gloves. The skull is both the hero and the projectile, and all of its personality comes from how it squashes, stretches, turns and pulls faces. It's drawn on a rubber-hose spring rig, so every impact overshoots and wobbles back into shape.

| Moment | What the skull does |
|---|---|
| Waiting | Rocks side to side, breathes and blinks. Some skins have their own habits (see the Skull Vault below). |
| Aiming | Leans into the shot, gritting its teeth with its brows down |
| Charging | Keeps its shape in the slingshot pouch, and grits its teeth harder the further you pull |
| Launch | Squashes, smears along the flight line, then flies with its jaw dropped in fear |
| Swish | Huge grin, and it stretches upward with joy |
| Perfect | Spins fast with star eyes and an enormous grin |
| Rim-in | Tilts about 30°, squints one socket and looks confused |
| Hitting the rim, the post or the ground | Goes flat, boings back and sees stars |
| Clean miss | Stops dead in mid-air and turns to look at you, with a "..." bubble. Then it drops like a stone and lands with a BONK. |

On the title card Morty is the O in TOSS. He drops into place, hops about and boings when you poke him. When the round ends he turns up beside the headstone with X's for eyes and a wisp where the rest of him was.

### A 1930s cartoon look

- **Palette and paper.**
  - Ink black, aged paper, bone and old cream.
  - Dusty red, vintage teal, mustard, midnight blue and muted purple.
  - Everything is outlined in thick ink.
- **The title card.** A stage with velvet curtains, a scalloped valance and footlights. The logo's letters bob, the skull stands in for the O in TOSS, and the logo grows to fill the space the menu leaves free.
- **Buttons.** Painted wooden signs, nailed on. On hover a skull pops up over the top edge, and on press a crack flashes across the wood. Chips look like paper tags, and the round buttons are wooden knobs.
- **Impacts.** Comic bursts such as BONK!, WHAM! and POP!, with paper captions like "OOF… too high". The caption always sits on the far side of the ring from the skull, so it never hides the skull's face.
- **Combo labels.** A small tag under your skulls: ×2 NICE, ×5 SKULLFUL and so on, up to ×12 ABSOLUTE BONES.
- **Film.** The picture has grain, dust, scratches, flicker and a slightly wobbly gate. Big scene changes iris out and back in like the end of an old cartoon. The iris is skipped under reduced motion, and pausing is always instant.
- **Moonshine Cemetery, repainted.** A watercolour sky, a cream moon, a haunted house with lit windows, and ink-silhouette graveyard creatures.
- **A multiplane scene.** The graveyard is a stack of flat, inked planes at different depths. From back to front:
  1. sky and moon
  2. clouds
  3. the far skyline
  4. bats and the witch
  5. the ground
  6. headstones and wanderers
  7. the play field
  8. near props (a broken headstone, iron railing and grass)
  9. branches right by the lens

  The far planes are hazier and the foreground is dark and slightly soft, like a miniature set.

### The rostrum camera

One camera photographs the planes. When it moves, near planes slide further than far ones. Its springs overshoot and settle, and it only takes a new picture 24 times a second, so it steps like an old rostrum camera instead of gliding.

| Move | When | Strength |
|---|---|---|
| Lean with the aim | While you pull. It leans toward your pull, further the harder you pull. This is the main source of parallax. | Moderate |
| Follow the throw | In flight. It pans after the skull and pushes in as it reaches the ring. | Moderate |
| Anticipation pull | It dollies back as the band stretches, then snaps forward past centre when you let go. | Accent |
| Jolts | On bonks, perfects and lightning, each plane knocks a different way, then settles. This replaces the old screen shake. | Short and sharp |
| Idle drift | Always, very slowly | Almost invisible |
- **Sound.** Cartoon effects: a slide whistle up on launch and down on a drop, plus a boing, a bonk, a xylophone run on a perfect and a ding on a swish. Buttons knock like wood.

### The Skull Vault

The shop is now the **Skull Vault**: 117 items on ten shelves. Every item changes only how the skull, its trail, its hits or the picture look. **Nothing changes the physics or gives an advantage.**

| Shelf | Items | Free to start | For sale |
|---|---|---|---|
| Skulls | 17 | Classic | Wooden 450 → Flaming 8,000 |
| Eyes | 11 | Pie Eyes | Pinpricks 300 → Hypnotized 6,000 |
| Teeth | 9 | Classic Grin | Toothless 300 → Oversized Jaw 3,000 |
| Paint jobs | 15 | Bare Bone | Cream & Red 300 → Spiral 3,000 |
| Trails | 18 | Dust | Smoke 400 → Comet 8,000 |
| Impacts | 9 | Classic BONK! | Cartoon WHAM! 400 → Explosive KABOOM! 6,000 |
| Rings | 10 | Circus Hoop, Dusty Red, Toxic | Iron Chain 500 → Void Portal 9,000 |
| Aim lines | 8 | Cream, Toxic | Dusty Red 300 → Technicolor 5,000 |
| Film reels | 5 | Standard Print | Lost Reel 900 → Damaged Print 3,000 |
| Titles | 15 | Grave Rookie | Earned only, never sold |

- **Rarity is shown in stars:** ★ Stock, ★★ Featured, ★★★ Special and ★★★★ Lost.
- **Skins have personalities.** A few examples:
  - Gold admires itself.
  - Wooden has a woodworm that pokes out.
  - Radio's eyes become tuning dials.
  - Silver Screen flickers into a film negative.
  - Wax drips and carries a lit candle.
  - Ice sheds frost, and Flaming burns.
- **Impacts replace the bonk word and its burst:**
  - Classic BONK!, Cartoon WHAM!, Vintage Ink Stars and Confetti Pop
  - Ink Splash, Bone Burst, Newspaper Halftone and Little Ghost
  - Explosive KABOOM!
- **Film reels re-grade the whole picture:**
  - Standard Print
  - Lost Reel, which is scratchy and sepia
  - Silent Era, in black and white
  - Technicolor Test, which is warm and saturated
  - Damaged Print, with burns and heavy weave
- **Titles appear on the ribbon** across the headstone (unless the round set a record, which the ribbon says instead) and in your profile. They're earned by playing, for example:
  - Skull Flinger: 50 makes
  - Ricochet Artist: 30 rim-ins
  - Certified Bonker: 100 bonks
  - The Last Skull: 25 makes on your final skull
  - HOLY SMOKES: a 20-make streak
- **The preview stage.** Tap any item to try it on. The skull hops onto a pedestal wearing it and pulls faces, and you can drag to spin it. On the Trails shelf it loops the stage, on the Impacts shelf it hops and bursts, and on the Rings and Aim shelves it poses beside a ring.
- **Your items carry over.** Everything you unlocked in v5 or v6 is still yours under its new name. For example, Gilded is now Gold, Frost is Ice and Embers is the Fire trail.

## How to play

Press **PLAY** and choose **Story** or **Arcade** (then a map). Then:

1. **Pull down** anywhere on screen.
2. **Aim.** Pulling further down throws higher. Pulling left throws right, and pulling right throws left.
3. **Let go.** Every throw takes 0.82 s to reach the ring's usual spot, so lead a moving ring by the same amount every time. When the ring flies nearer or further away, the crosshair shows where the skull will cross it.

Every 5 makes in a row earns a skull, and bonus skulls stack up to 5.

With a gamepad, pull the left stick down and press **A** (or the right trigger) to throw; **Start** pauses.

On desktop, use ← → ↑ ↓ to aim and **Space** to throw. **Esc** or **P** pauses the game, and **Esc** also closes any open panel.

## Scoring

| Call | What happened | Result |
|---|---|---|
| PERFECT | Through the middle of the hole | 1 hit, 250 points |
| SWISH | Through the hole without touching the rim | 1 hit, 100 points |
| RIM IN | Clipped the inside of the rim and still went through | 1 hit, 75 points |
| BONK | Hit the outside of the rim, the post, a pumpkin seed or the ground short of the ring | miss |
| WHIFF | Wide of the ring | miss |
| OOF | Too high or too low | miss |

Points are multiplied by your combo, the stage and some power-ups (see above).

A run pays 10 bones, plus:
- 8 per hit, 5 per perfect and 4 per step of your best combo;
- 5 for every 2,500 points, and 6 per power-up;
- 25 more for a new best.

Beating the Pumpkin King pays 150 + 50 × the stage. Everyone starts with a gift of 300 bones. Daily, weekly and monthly challenges (three of each) pay extra bones, each achievement pays once, and most Vault items can also be unlocked free by reaching a goal.

## When the round ends

First, **GAME OVER** bounces in over the picture. Then the round is buried, not scored on a card: **HERE LIES…**, a headstone with a cross on it, and the round carved
into the slate under your name - score, time, hits, perfects out of throws, best combo, bosses and power-ups if
there were any, and a skill level in stars. Under a rule at the foot: **GRADE**, a single letter in a circle.

The grade is mostly how clean the tossing was - a perfect counts three, a swish two, a rim-in one, against every
throw you took - plus credit for how deep into the stage you got and any boss you put down. S is a perfect run;
F is a round best forgotten. A banner across the base of the stone reads **A BRAND NEW RECORD!** when the score
beats your best, and carries your current title the rest of the time. An Arcade stone says **Survived** instead of Time, its banner names the map (**New best on The Bone Orchard!**), and the line under it shows that map's best score and longest run.

## The music

The score is six recorded loops, one per act or place, sitting in `music/` beside `index.html`:

| File | When it plays |
| --- | --- |
| `music/menu.mp3` | the title card and the headstone at the end of a round |
| `music/a.mp3` | the first half of a stage, up to the Crow King |
| `music/b.mp3` | after the mini-boss, once the ring starts moving through depth |
| `music/boss.mp3` | both boss fights |
| `music/pause.mp3` | the pause menu (the act's loop picks up where it was when you resume) |
| `music/shop.mp3` | the Curio Cart |

The game crossfades between them as the acts change and as you open or leave the pause menu or the Cart,
and follows the **Music** slider in Settings like everything else.

**Sound effects** are synthesised, apart from three recordings in `src/sfx/` that the build embeds in every
version: `powerup.mp3` (grabbing a power-up), `purchase.mp3` (buying in the Vault or at the Cart) and
`achievement.mp3` (a medal). They play on the **Effects** slider. To swap one, drop a new file in with the same
name and rebuild; the build refuses any file over 200 KB. A new file in that folder is embedded too, but the
game only plays the three names it knows.

**Two builds, because a lone HTML file can't fetch a folder that isn't there.**

- `skull-toss-with-music.html` - the music is inside the file. Open it from anywhere, online or off, no
  folder, no server; it plays the score. About 17 MB. Build it with `python3 src/build.py --with-music`.
- `index.html` + the `music/` folder beside it - the light build (1.2 MB) that loads the six loops as it
  needs them. This is what gets published, and the loops sit alongside the page there.

Open `index.html` on its own, with no `music/` next to it, and the game falls back to the synthesised
waltz it shipped with - three acts at 92, 100 and 112 bpm, arranged live. Nothing is ever silent: while a
loop is still downloading the synth keeps playing and the recording fades in when it arrives.

**To swap a track**, drop a new file in over the old one, same name. Any length; it loops. Trim the fade
off the end first, or it will dip every time it comes round. Mono or stereo, 96-128 kbps is plenty.

## Settings and profile

- **Settings.**
  - Sound on/off, plus separate volumes for music, effects and ambience.
  - **Film look:** Full, Light or Off. It starts on Light if your device asks for reduced motion.
  - **Camera:** Full, Gentle or Still. It starts on Still if your device asks for reduced motion.
  - **Camera jolts** on or off. They're off whenever the camera is Still.
  - Vibration.
  - Aim guide: Full, Short or Off.
  - Morty's voice: Mumble, Spoken or Off.
  - Reset progress (tap twice to confirm).
- **Profile.**
  - Save status, plus copy and load save codes.
  - Your headstone name and title.
  - Your rank, from Gravedigger to The Reaper.
  - 43 lifetime stats in six groups, including the Hall of Shame.

## Saving your progress

- **Published version.** Progress saves to a private slot on your account, which only you can see, and syncs on any signed-in device. When two devices disagree, every counter keeps its higher value, unlocks and achievements are combined, and each Arcade map keeps its better record. Your bones balance and your challenges come from whichever save is newer, so a purchase can't be refunded by a merge.
- **This file on its own.** Progress is saved in the browser. To move it to another device, use **Copy save code** there and **Load save code** here.
- **Save schema and backup.** Your profile carries a schema number (2 in v14), and older saves step up to it in order as they load. The game also keeps a copy of the last profile and cosmetics that loaded cleanly (`skullToss.profile.v1.bak`, `skullToss.cosmetics.v1.bak`). If the main copy won't read, that copy loads instead, and the broken text is kept as `….corrupt`.
- **Older saves** load normally, and their unlocks move to the new item names. An old best score becomes your best number of hits in a run.
- **The leaderboard** (published version only) is shared by everyone the game is shared with. Your entry is your best Story run played to its end in the game, never a number that arrived in a save code. Each player has one entry, which only they can write, and posting is off until you turn it on. Opting out deletes your entry.

## Scene artwork (optional)

Any plane of the graveyard can be replaced with your own art: an SVG, or a painted plate saved as WebP or PNG. Put the file in `src/art/scene/` and rebuild. A plane without a file keeps its coded placeholder.

| File | Plane | Depth |
|---|---|---|
| `sky` | Sky and stars. The moon artwork still hangs in front of a painted sky; the plain coded disc doesn't. | Farthest; barely moves |
| `far` | The skyline: hills, the house and the ridge | Far |
| `mid` | A graveyard plane between the skyline and the ring | Middle |
| `near` | Props at the edges of the frame, on the ground in front of the ring | Near |
| `foreground` | Branches, drapes or anything right in front of the lens | Nearest; moves most |

Name the file after its plane: `far.svg`, `far.webp` or `far.png`. Every plane must:
- be twice as wide as it is tall, with the horizon 35% of the way down. An SVG uses `viewBox="0 0 2000 1000"` with the horizon at y = 350. A painted plate works well at 3200x1600, with the horizon at y = 560.
- keep what matters within the middle 23% of the width (460 of 2000 units), which is all a portrait phone shows, and fill the full width for wide screens;
- be transparent wherever the planes behind should show through. That's everything except the sky, so painted plates for the other planes need to be WebP or PNG with transparency.

Painted plates give the classic look of an inked cast in front of a watercolour world. Each plate is painted once per screen size into its plane, so it costs no more each frame than the coded plane it replaces.

The build stops with a message if a plane has the wrong proportions, or both an SVG and a painted plate. It warns when a plate is over 1.5 MB, because the page carries it.

## The ring artwork (optional)

The rings are drawn in code, except where you give one a picture. Drop a square image in
`src/art/rings/` named after the ring's id — `hoop.webp` or `hoop.png` — with the hole fully
transparent and the ring centred, then run:

```
python3 src/art/rings/measure.py
```

That writes `hoop.json` next to it with where the hole and the outer edge fall, and the build embeds
both. The game scales the picture so **the hole in the art is the hole you throw through**, whatever
the tube's thickness, so the collision never drifts from what you see. When a skull drops through, the
picture blooms instead of the coded flash.

The default hoop ships as a painted lifebuoy (640x640 WebP, 89 KB). Delete `src/art/rings/hoop.*` and
the coded red-and-cream hoop comes back. The other 23 rings are still code, so they keep animating and
recolouring.

## The moon artwork (optional)

The moon is a picture too: the grinning moon with a telescope in one eye. To use a different drawing,
give `prepare.py` any PNG or WebP of it. The background can be transparent or plain white.

```
python3 src/art/moon/prepare.py path/to/your-moon.png
```

It cleans the picture and writes `moon.webp` and `moon.json` into `src/art/moon/`. The cleaning keys out a white background and fills any pinholes in the cut-out. It also finds the round disc, even with a telescope or a hat sticking out of it, and scales the picture to a 240 px disc radius.

`moon.json` records where the disc sits. The game puts the disc where the moon hangs, and anything beyond the disc hangs out over the sky.

Where the moon sits:
- It hangs a size larger than the old plain disc, so the face reads on a phone.
- It is in front of the drifting clouds; its glow stays behind them.
- The vignette leaves a soft clearing around it, so the cream and the ink stay bright instead of turning grey.

Delete `src/art/moon/moon.*` and the old plain disc comes back.

## The skull artwork

The skull is drawn from seven SVG layers in `src/art/skull/`. They all share one 1000×1000 canvas, so they line up exactly:

| Layer | What it is | What the game does with it |
|---|---|---|
| `cranium.svg` | The head | Skins recolour it, and textures and paint jobs are drawn inside it |
| `jaw.svg` | The jaw, with the dark mouth opening inside it | Drops open, shifts sideways when confused, and is resized by some Teeth items |
| `socket-left.svg`, `socket-right.svg` | The eye sockets | Swell outward on fear and excitement. Pupils, lids and brows are drawn inside them. |
| `nose.svg` | The nose | Drawn as it is |
| `teeth-upper.svg`, `teeth-lower.svg` | The two rows of teeth | The upper row stays with the head and the lower row rides on the jaw. The divider lines mark single teeth for Gold Tooth, One Tooth and Crooked. |

Colours work by role:
- light fills become the skin's bone colour;
- dark fills become the skin's socket colour;
- strokes become the skin's ink colour.

The Classic skin uses the artwork's own colours, with no added shading.

To change the skull, replace any of these files and run `python3 src/build.py`. Each layer must use `viewBox="0 0 1000 1000"`. The importer takes the rest as your drawing tool exports it:
- paths and basic shapes;
- groups with transforms;
- `<use>`;
- the class styles Illustrator writes.

The build stops with a message if a layer is missing, empty, the wrong size, or contains text or an embedded picture.

## The launcher and target artwork

Like the skull, the slingshot and the ring's post are SVG assets now, each with its own folder and an `asset.json`. Replace an SVG with your own drawing (same layer names, same canvas) and rebuild.

**`src/art/launcher/launcher.svg`** is one file with a named group per layer (`<g id="frame">` and so on). It uses a 1000×1000 canvas where 150 units are one skull radius and the skull rests at (500, 400).

| Layer | What it is |
|---|---|
| `frame` | The wooden Y. It jumps after a shot and squeezes in a little under a hard pull. |
| `tips` | Whatever sits over the band ends at the prong tips (the cream cord) |
| `pouch` | The leather pouch, behind the skull. It follows the pull, then twangs. |
| `pouch-front` *(optional)* | A lip drawn in front of the seated skull |
| `shadow` *(optional)* | A shadow under the frame |

The bands are drawn by the game, because they stretch. `asset.json` says where they tie on (`bandL`, `bandR` on the prongs, `pouchL`, `pouchR` on the pouch) and what they look like (`bands`: outline, colour, widths).

**`src/art/target/target.svg`** is the ring's post, on a 400×1000 canvas where 40 units are the post's width. The `post` layer is stretched from y = 100 (just under the ring) to y = 900 (the ground). `post-cap` (the iron collar under the ring) and `post-foot` (the block on the ground) are drawn at their true shape. The ring itself stays as ring art (the lifebuoy) or a coded ring. The other 20 poles in the Vault are still drawn in code.

Colours in any of these SVGs can be the game's palette names (`fill="ink"`, `stroke="var(--red)"`), so they stay in step with the rest of the game. Every asset carries a `version` (1.0.0) and a production `name` (`ST_MOON_CEM_LAUNCHER_BASE`); the debug overlay shows which versions are in.

## Editing the game

`index.html` is assembled from `src/`:

- `page.html` is the page skeleton.
- `css/*.css` holds the design tokens, controls and HUD, screens, sheets and the Skull Vault.
- `markup.html` holds the icon sprite, screens and sheets.
- `art/skull/`, `art/launcher/` and `art/target/` hold the vector assets, each with an `asset.json`. `art/rings/` holds the lifebuoy, `art/moon/` the moon and its `prepare.py`, and `art/scene/` any plane artwork (see above).
- `svgart.py` is the SVG importer the build uses for the vector assets.
- `fonts/` holds the four embedded fonts and their licences:
  - Luckiest Guy for the display lettering (Apache 2.0)
  - Bangers for the comic bursts (OFL)
  - Bebas Neue for every number, the score included (OFL)
  - Nunito Sans for UI text (OFL)
- `sfx/` holds the recorded sound effects (see [The music](#the-music)).
- `js/*.js` holds the script, joined in filename order:
  1. Data and the catalogue (`01`, `01b`), audio, cloud save and the leaderboard (`03b`), state, economy (with the daily, weekly and monthly challenges), the camera (`04c`), the visual system with its states and pose library (`04d`), the shot director (`04e`: FX recipes, the timeline and the sound cues) and achievements (`04f`)
  2. Layers, the world and the rubber-hose graveyard (`06c`: props, the gravedigger and the cat)
  3. The game and its two modes (`07`), stages and the Arcade rules (`07b`), power-ups (`07c`) and bosses (`07d`)
  4. Drawing: the skull and its rig (`08a`), rings, the scene, skins and paint (`08d`), trails and impacts (`08e`), hats and auras (`08f`), the skull's voice (`08g`), and the v11 looks (`08h`)
  5. Input, screens (with the Play sheet and the GAME OVER card), sheets, the Skull Vault, the film overlay, the leaderboard sheet (`09f`), the Curio Cart (`09g`) and the visual debug overlay (`09h`)
  6. Boot, and the console handle every build carries (the overlay's switches, the animation inspectors, `telemetry()`)
  7. `99_dev_hooks.js`: the test hooks the spec drives. Only `--dev` builds include them.

The play log is `04g_telemetry.js`, and the gamepad lives with the rest of the input in `09a_input.js`.

Run `python3 src/build.py` to rebuild the release `index.html`, or `python3 src/build.py --dev` for `index-dev.html` with the test hooks (add `--with-music` to either). The build refuses to run if two script parts define the same top-level name, and it won't put the test hooks in the published build.

## Performance

Measured with the spec's own harness in headless Chromium at 390x844, DPR 2 - software rendering, so the
absolute numbers run far higher than on a real phone or desktop; the useful part is the before-and-after.

- A busy frame (four wanderers on screen) went from **16.5 ms to 14.4 ms** after the pass below.
- Pixels pushed each frame dropped from about **5.9 M to 4.6 M** (the canvas itself is 1.3 M at DPR 2).
- The spec has a canary check that fails if a frame ever costs more than 60 ms.

What changed:

- **Wanderers are drawn as cels.** Each zombie, skeleton, werewolf and ghost pose is painted once into a
  little cel - twelve to a cycle, trimmed to the drawing - and photographed each frame, the way a 1930s
  studio shot one drawing at a time. It replaces a few hundred bezier strokes a frame with one blit.
- **The vignette left the canvas.** It never changed between frames, so it is a still overlay over the
  picture now instead of a full-screen blit on every frame.
- **The graveyard is kept in order.** The props are sorted back to front once, not rebuilt and re-sorted
  sixty times a second, and a prop only takes the shear transform when it actually sways.

What was measured and left alone: the gravedigger (his cost is in fill, not in paths), the parallax plane
blits (they are the multiplane camera), and the cloud field. The device pixel ratio was already capped at
2. On a device that can't keep up, the boot loop first cuts the effects (particles, dust and film grain, down
to half) and only then drops the resolution.

## The visual debug overlay

Press the **`** key (under Esc) to see what the game is really using, drawn over the picture. Press it again to hide it. Opening the file with `?debug` on the end of the address (`index.html?debug`) starts with it on. It shows:

- **The ring's circles.** Cream circles mark the tube: the ring art should fill the band between them. Inside them:
  - green is the clean window for the skull's centre;
  - gold is the perfect window;
  - dashed red is where a throw stops touching the ring at all;
  - dashed magenta is the grab window when a power-up floats in the ring.

  In the post phase, dashed red lines mark the post.
- **The skull.** Its collision circle, its pivot, and the rig's squash-and-stretch axis with its current amount.
- **The moon's disc**, as `moon.json` measured it.
- **A panel:**
  - the frame rate, what each frame costs, and the resolution;
  - the visual system's states (skull, pose, ring, launcher, camera, boss, power-ups), the effects quality, the last impact and how hard it was, and which art versions are in;
  - the shot director: the throw's number, its biggest moment and that moment's weight, and the last few sound cues with when they played;
  - the drawing and camera-exposure counts (24 a second, in step) and each wanderer's cel (twelve to a cycle, on twos);
  - where the camera is;
  - how far each plane has slid and zoomed.

Each part can also be switched from the browser console: `SkullToss.debug.visuals.showCollisionRadius = true`. The switches are `showFPS`, `showStates`, `showCollisionRadius`, `showPivots`, `showParallax`, `showCamera` and `showAnimationFrame`. `forceAnimationFPS = 12` steps the drawings and the camera 12 times a second instead of 24, and 60 makes them smooth; set it back to 0 for the default. On a phone the panel leaves out the parallax table to save room. On a phone, long lines wrap. With every switch off, the overlay costs nothing.

From the console, `SkullToss.debug.visualAnimation` lists the pose library (`poseLibrary()`, `samplePose("death")`), the FX recipes (`fxRecipe("perfect")`, `fxTimeline("perfect")`, `fxIntensity("bossHit")`), what the director is doing (`fxState()`), the sound cues (`cues()`) and the effects quality (`quality()`).

## Tests

Build the dev version (`python3 src/build.py --dev`), put `TEST_SPEC.js` next to `index-dev.html` and open **`index-dev.html?test`**. The release build leaves the test hooks out, so it can't run the spec. The tests run with the clock paused, so results are deterministic, and they never touch your saved data. There are **184 checks**, covering:

- **Layout, scoring and aiming.**
  - Everything is centred and every result is classified correctly.
  - Points follow base × combo × stage, and hits count one each.
  - The preview matches the real throw, and leading a moving ring pays off.
  - Every throw is ready again within 2.5 s.
- **The HUD.** Skulls top left (small), score top centre in Bebas Neue with the hits under it and the best under those, pause and power-ups top right, progress bar along the bottom.
- **Stages and bosses.**
  - 25 hits bring the Crow King, who carries the ring near and far.
  - A ring off its usual plane is still exact, and leading the 3D ring scores.
  - Beating him turns the ring into a repeating triangle through depth.
  - 50 hits bring the Pumpkin King, whose seeds knock the skull down. Ghost Toss slips through them.
  - Beating him clears the stage.
- **Power-ups.** They float in the ring, and a toss that clips the drawn prop grabs one while one that misses the drawing doesn't. Skull Rush, Deadeye, Second Chance, Cursed Skull and BONK Blast all do what they say.
- **The skull.**
  - It is drawn from all seven SVG layers.
  - It squashes and stretches, and every result gets the right mood.
  - A clean miss hangs, then BONKs.
  - Hats pop off at launch and settle back.
  - It talks when grabbed.
- **The Vault and the Curio Cart.**
  - Thirteen shelves and 364 items. Every item renders in play and on its shelf.
  - Prizes for failing and for bosses are won, not sold. Exclusives are sold only at the cart.
  - Deals are marked down, and the coffin gives something new.
- **The leaderboard.** It's opt-in, posts only your headstone name, score and looks, shows other names as plain text, and takes your entry down when you opt out.
- **Film, the camera, screens, combo calls, the economy, daily challenges, results, the profile, saving and the living graveyard.** This includes the gravedigger, the cat and the moon artwork.
- **The visual system.** Its API and states, the three SVG assets with their layers, anchors and versions, drawings stepping on 24s while the flight stays smooth, the state flow of a throw, and impacts scaled by how hard they hit.
- **The shot director.**
  - Full draw is the anticipation, and the skull keeps its shape in the pouch.
  - The poses follow a throw: launch, a smear that thins, flight, then the make's own drawing.
  - A bonk lands on its own drawing (eyes screwed shut, a contact star), then rebounds into the dizzy look.
  - One throw is one timeline: snap, whoosh on the smear, contact, crack, and the sting three drawings on, each once.
  - Every hit is heard once, with the boing on the rebound.
  - The FX recipes rank from launch to boss defeat on one timeline, and the pose library has all fourteen of the plan's poses.
  - The bosses have visual states, and busy devices lose effects before pixels (never below half).
- **v12.**
  - PLAY asks Story or Arcade, and the map list shows every map with its best; a map starts there.
  - Arcade has no bosses, goes 3D at 25 hits and keeps speeding up. Bests are kept map by map, the clock races your best time, times are never rounded up into the next minute, and Toss again replays the same map.
  - GAME OVER shows before the headstone, and ending the run from the pause menu skips it.
  - Daily, weekly and monthly challenges: three of each, weeks and months reset on time, bigger periods always pay more, and a throw counts toward all three.
  - Achievements pay once, the medal drops in (under the score mid-run), and the sheet lists them all.
  - The pause menu and the Cart have their own music and hand back to the act, and the three recorded sounds are embedded.
  - The title skull's canvases spill past its letter so an aura is never cut off, and the tagline is the new one.
- **v14.**
  - The leaderboard posts a Story run played to its end. A hand-edited save code keeps its best on the profile, but it never reaches the board.
  - Saves carry schema 2: a v12 save steps up to it, a newer build's save keeps its number, and a newer build's code is refused.
  - A save that won't read loads the last copy that did, and keeps the broken text.
  - The fixed step: one throw ends in exactly the same state at 60 Hz and at a jittery mix of 30–144 Hz frames.
  - A gamepad aims where the same finger drag would, throws on A, throws nothing when the stick springs back, and pauses on Start.
  - The play log records a run from start to end on the device.
- **v15.**
  - Flashes Full, Reduced and Off each give the right flash, lightning strength and flicker.
  - High contrast and large text reach the page, and both switch off again.
  - Tab wraps inside an open sheet, and the arrows move along a radio row.
  - The budget: effects are capped, a step costs under 0.5 ms, and the page stays under 2,500 elements.
  - The UI kit builds elements with text, attributes, data and handlers.
- **v16–v18.**
  - Eight maps from the checked map data, and the code draws everything they name.
  - Each map dresses the scene as itself: its planes, props clear of the lane, its weather, moon and frame. Map 1 is Moonshine Cemetery as it was.
  - Arcade opens a map once Story has reached it, and a locked map can't be picked.
  - Map 1's end boss gives Morty's Top Hat, and only the first time counts.
  - The story ends after map 8: THE END, the results say *The end*, and The Whole Reel is earned.
  - A v12 save migrates: stages past four mean map 5, and The Whole Reel becomes Half the Reel.
- **v19.**
  - The Tier Director: each map's two tiers, and Arcade climbing past 50 hits.
  - The Ring Path Director: every path stays in the ring's space, the carousel circles, and a jump cut holds, flickers and cuts. The Carnival rides the carousel and the Final Reel cuts.
  - Wind: the guide's crossing drifts by ½·w·t², a throw aimed at the middle is carried into a ring 0.8 m off, the HUD shows the wind, and the wind turns after each throw.
  - Bats, falling bones, balloons and the pendulum each knock the skull down, Ghost Toss slips past each, and a quarter swing later the pendulum's lane is clear.
  - Hazards come round on the tier's schedule, fog rolls in and out, and no pendulum swings during the end boss.
  - A make that flies on into a bonus target pays and counts, map 1 opens with none, and the orchard hangs a bone-fruit.
  - The same seed lays out the same targets and hazards.
- **v20.**
  - Every map's mini-boss takes the ring, keeps it moving in play, gives its tell and falls, and the second half follows.
  - Every map's end boss throws its volleys after a tell, keeps the ring in play and falls holding its piece. All eight pieces finish the story.
  - A new end boss's volley knocks the skull down, and a Ghost Toss appears at two-thirds health.
- **v21.**
  - Across 40 seeds, the Power-Up Director never deals a prop before the fourth hit or more than three a half, pity makes one certain by the fifteenth hit, and no prop comes twice running.
  - A first half never deals the Cursed Skull, the second half deals its own, and the same seed rolls the same props.
  - In play, a run of makes brings a prop, and misses never do.
- **v22.**
  - Out of skulls, a continue for 200 bones gives one skull back and keeps the score; the run and the profile count it.
  - No thanks ends the run, and so does the eight-second clock.
  - One continue a map; no offer without the bones or an ad; with an ad provider the reel buys the skull.
  - A run that used a continue never goes on the leaderboard, but still counts for your own best.
  - A run survives a reload: it picks up where it left off, a boss fight from its start, and a waiting continue is offered again.
- **v23.**
  - A Story run opens on the leader, then Reel One's card. No throw is allowed while a card is up, and a tap skips it. The leader plays once a session.
  - Between reels, two changeover cues, then the next reel's card. After Reel Four comes the intermission, then Reel Five.
  - After Reel Eight, THE END card, then the headstone reading The end.
  - Title cards Short gives a brief card and no leader. Off goes straight into play. Arcade opens on its map's own card.
- **v24.**
  - The markup, the code's text and every one of Morty's pools come from the string table, and nothing goes missing in play.
  - In the pseudo-locale every tagged text is accented and padded, placeholders survive, and no title button, settings label or continue button overflows.
  - Morty deals a pool like cards, with no repeats until it's done.
  - Big moments always get a line (a boss walking on, a boss down, the continue offer and taking it). Small ones wait out the cooldown. Twelve idle seconds get one nudge per lull.
  - His mood follows the run: nervous on the last skull, cocky on a streak, grumpy after misses.
- **v25.**
  - Dead Centre, Long Bomb, Point Blank and Top Corner come from where the ring was. Each pays 150 × rarity and is counted; an ordinary swish earns nothing.
  - Leading Man, Wind Rider, Thread the Needle, Two for One and Phantom come from what the throw did.
  - A Hat Trick, a Buzzer Beater and a Knockout Blow hold the reel, and the rarest shot takes the card.
  - A crash zoom scales the frame, a whip pan slides it, and a boss walks on to a Dutch tilt. Each comes back to rest. Camera Still counts the shot and leaves the frame alone.
  - The Profile lists the twelve shots, what each takes and how often you've made it.
- **v26.**
  - Practice: misses are free and nothing counts on the real profile. The ring stands still or runs at half speed, and the 3D path can be practised.
  - Boss Rush is locked until an end boss falls. It then runs the beaten bosses back to back, gives a skull back after each end boss, and keeps its record.
  - Curtain Call: misses are free and the twenty-second clock ends the run.
  - Longshot: the ring backs off 0.4 m after each make, misses cost skulls, and the record is the farthest make.
  - Target Gallery: five targets hang behind a still ring, a throw through the hole reaches them, and ten throws end the run.
  - Story's encore after an end boss: misses are free, makes pay 5 bones, then the next reel.
  - The Play sheet lists five more modes, locked until an end boss falls. Practice picks a map and its options.
- **v27.**
  - The Codex notes a boss when you meet it, a power-up when you grab it, and each map's hazard and target. What you see in Practice counts too.
  - The Codex sheet has eight tabs, 16 bosses written up or ???, and the found count.
  - The Archive starts with the first memo, unseals eight documents by Reel Five, and the restoration report when the story is finished.
- **v28.**
  - The cartoon misbehaves between throws: nothing in the first five, one a map at most, never mid-flight, and never with Mischief off.
  - The six misbehaviours each do their thing. Tapping the animator's hand is a secret.
  - The secrets are each found their own way, each pays 150 bones once, and the Codex's Secrets tab keeps them.
- **v29.**
  - Eight bands in the Vault, the rubber one yours, and each strung on the launcher its own way. Barbed Wire comes from 300 misses and Ectoplasm from the story.
  - An outfit saves a look and wears it back, never with things you no longer own. Surprise me uses only your things.
  - Renamed items stay yours, and item goals name the right bosses.
- **v30.**
  - With no server the Soul Shop says so and Soul looks stay locked.
  - The daily Souls come once a day, a pack is credited once per receipt, a forged receipt pays nothing, and the server charges its own price whatever the caller says.
  - A Soul look is bought and worn; with too few Souls nothing changes; and the shop shows the wallet.
  - Souls are never on the profile or in a save code, and a wallet that doesn't own a look takes it off.
  - Plus five server tests in `firebase/functions/test`.
- **v31.**
  - A real run earns experience on a rising 50-level curve; Practice earns none.
  - A level up pays 25 bones × the level, once, and level 5 unlocks its title.
  - The career card shows level, experience to the next, pieces and best score, and the log keeps the last ten runs.
- **v32.**
  - Shot tiers come at 1, 10 and 25 and each pays once. Gold on all twelve is the Shot Doctor.
  - Map stars: its end boss down, down without a miss, and 100 makes there.
  - Boss tiers light up in the sheet, the title chip shows a pip, and a tier is claimed from the sheet.
- **v33.**
  - Each sound set reshapes a sound as it's made (pitch, voice, length, filter, room), and Classic leaves it alone.
  - All 16 bosses and 8 reels have a motif, all different and under three seconds, and a sting has one more note per step of rarity.
- **v34.**
  - A finished run is checked by the server and posted all-time and this week. A forged score is refused, and a run straight after another is slowed down.
  - Each kind of forgery is refused by name.
  - The board has a This week tab.
- **v35.**
  - A run played only through a player's inputs (throws, card skips, the end) replays to the same score, hits and throws, and changes nothing on the profile or the resume snapshot.
  - A replay survives a link: encoded, decoded and replayed the same. Junk is refused, and the title offers a shared one.
  - The headstone offers Watch replay and Share, and a replay's own stone says Replay.
