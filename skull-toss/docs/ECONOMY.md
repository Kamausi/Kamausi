# The economy: bones and Souls

## Bones (the soft currency)

Bones are earned by playing and live on the profile, in this browser and in the cloud save.

**Sources**

- **The end of a run:** `runBones`, scaled by hits and score, plus a bonus for a new best.
- **Bosses and pieces:** an end boss down pays 150 + 50 × map; Boss Rush pays points, not bones.
- **Challenges:** daily, weekly and monthly (claimed by hand), and achievements (paid when reached).
- **In play:** bonus targets (3 each), the Bone Magnet power-up (+20 a make), Story's encore (5 a make) and secrets (150 each, once).

**Sinks**

- the Skull Vault's prices (300 to about 11,000);
- the Curio Cart's deals, exclusives and the Mystery Coffin.

**Practice pays nothing.** A Practice run plays on a copy of the profile, so no bone, stat, challenge or medal
moves.

**Exploit review.** A save code (or editing local storage) can change a player's own bones, stats and
unlocks. That's accepted for a soft currency that buys looks and nothing else. Nothing bones can buy changes how
Morty flies, and **the leaderboard never reads the profile's bests**. It posts only runs played to their end in
the game (`boardBest`), and from v34 the server re-checks each run before it goes up.

## Souls (the premium currency)

Souls are the server's alone.

- **Where they live.** The balance and what it has bought live in `wallets/{uid}`, written only by Cloud Functions. They are never on the profile, never in a save code, and never in the cloud save: the Firestore rules refuse a save carrying a `souls` or `wallet` field.
- **What they cost.** Prices come from `firebase/functions/shared/economy.js`. The server charges its own price, whatever the caller sends; the spec checks this.
- **Getting them.** A free daily handful (10, once per UTC day, by the server's clock), and Soul packs bought in a store. A pack is credited only after the store confirms the receipt, and a receipt is recorded, so it can never be credited twice.
- **The ledger.** Every change to a balance is written to `ledger/`.
- **Offline.** The game shows the Soul Shop as unavailable. A Soul item is judged only once the wallet has arrived, and never on the device's word.
- **What Souls buy.** Looks only (two four-piece sets), like bones, and each season's Premium Ticket (v42), which pays extra looks and bones on the Season Ticket.

- **Refunds (v39).** A refunded pack's Souls come back off the wallet. What's already spent stays spent, and the shortfall is **owed**: new Souls pay it off first, and nothing can be bought until they have. The Soul Shop shows what's owed. See firebase/README.md, "Refunds".
- **Support and rollback (v39).** `firebase/functions/tools/admin.js` can grant Souls (with a reason), refund a receipt by hand, and reverse any single ledger entry (a purchase, a daily claim or a grant). Every action is itself a ledger entry.
- **Kill switches (v39).** `kill.souls` in `config/live` closes the shop on the server as well as in the game. Paid packs are still credited.

## The audit (v39)

`economyAudit()` (04b_economy.js) checks the catalog's rules, and the spec requires it to find nothing. Run it on a
page with `SkullToss.economy()` in the console. It checks:

- no id is used twice within a kind (it caught the career title Headliner colliding with the 40-hit one, now Top of the Bill);
- every bones price is a positive multiple of 50, with a rarity of 1 to 4 stars;
- every goal names a stat the game keeps;
- the middle price rises with each star;
- no look is sold for both bones and Souls, and the Vault's Soul looks are exactly the server's, at the server's prices;
- the Soul packs grow;
- **pacing:** everything in the Vault costs between 150 and 3,000 middling Story runs (20 hits, 15,000 points), and
  the cheapest Soul look takes 7 to 60 days of free daily Souls.

**The numbers today:** 275 looks sold for bones, 666,500 bones in all. A middling run pays 256 bones, so everything
takes about 2,600 such runs. Challenges, bosses, secrets, the streak and a better score all shorten that. The middle
prices by rarity are 450, 1,200, 3,100 and 7,500. The cheapest Soul look (150) is 15 days of free Souls.

**Still to do before real money.**

- Fill in the store receipt checks in `functions/receipts.js`.
- Turn on App Check for the callable functions (`enforceAppCheck: true` in `functions/index.js`).
- Set per-user rate limits in the console if abuse shows up. The handlers are idempotent, so repeated calls are safe.
