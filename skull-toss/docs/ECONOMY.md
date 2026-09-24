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
- **What Souls buy.** Looks only (two four-piece sets), like bones.

**Still to do before real money.**

- Fill in the store receipt checks in `functions/receipts.js`.
- Turn on App Check for the callable functions (`enforceAppCheck: true` in `functions/index.js`).
- Set per-user rate limits in the console if abuse shows up. The handlers are idempotent, so repeated calls are safe.
