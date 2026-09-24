# Skull Toss on Firebase

The game runs without a server. It saves in the browser, keeps the leaderboard on the device, and has no Souls.
Give it a Firebase project and it gains:

- a cloud save for every player (signed in anonymously, so there's no sign-up);
- a shared leaderboard that only the server writes, after checking each run (v34);
- **Souls**, the premium currency, whose balance and purchases only the server can change (v30);
- remote config and feature flags you change from the console (v39);
- analytics, sent only when the player agrees to it (v39).

Everything worth something is decided by **Cloud Functions**, never by the game. The rules for Souls live in
`functions/shared/economy.js`, and the handlers in `functions/handlers.js`. The game's build embeds those same
files, so the Soul Shop and the server always agree on prices. The dev build can also stand the handlers up in the
page, so the spec drives the real server logic.

## Set it up

1. **Create a project** at https://console.firebase.google.com. Add a **Web app** to it, and copy the app's config
   (`apiKey`, `authDomain`, `projectId`, `appId`) into `src/firebase.config.json`.
2. **Authentication:** enable **Anonymous** sign-in. You can add Google, Apple and others later; an anonymous
   account can be linked to one without losing anything.
3. **Firestore:** create a database in production mode.
4. **Install and log in:** `npm install -g firebase-tools`, then `firebase login`.
5. **Point this folder at your project:** copy `.firebaserc.example` to `.firebaserc` and put your project id in it.
6. **Deploy the rules and functions:** `cd functions && npm install && cd .. && firebase deploy --only firestore,functions`.
   Cloud Functions needs the project on the Blaze (pay-as-you-go) plan.
7. **Rebuild and host the game:** `python3 ../src/build.py`, then copy `../index.html` into `public/` and run
   `firebase deploy --only hosting`. Or host `index.html` anywhere; the config inside it points at your project.

To try everything locally: `firebase emulators:start`, then open the hosted page from the emulator. In the
emulator, a purchase receipt of the form `TEST:<anything>` is accepted, so the Soul-pack flow can be tried end to
end.

## What lives where

| Path | Who writes it | What it is |
|---|---|---|
| `data/users/{uid}/save` | the player | profile and looks, merged with the device's copy. The rules refuse any `souls` or `wallet` field. |
| `wallets/{uid}` | functions only | the Souls balance, what they bought, and the last daily claim |
| `ledger/{id}` | functions only | every change to a balance: buys, daily claims, purchases |
| `receipts/{id}` | functions only | each store receipt, so none is ever credited twice |
| `leaderboard/{uid}` | functions only (v34) | each player's best checked Story run |
| `weekly/{week}_{uid}` | functions only (v34) | each player's best checked run this week |
| `runs/{id}` | functions only (v34) | the runs submitted, for audit |
| `meta/{uid}` | functions only | when the player last sent a run (the rate limit) |
| `config/live` | you, from the console (v39) | remote config and feature flags |
| `events/{id}` | functions only (v39) | analytics, with consent |

## Remote config and feature flags (`config/live`)

Create a document `config/live` in Firestore and set any of these fields. Every player picks them up live, and
they're cached in the browser for offline play. Anything left out keeps its default.

| Field | Default | What it does |
|---|---|---|
| `challenges.off` | `[]` | challenge kinds kept out of the rotation, e.g. `["arcadeSecs", "lives"]` |
| `challenges.bonus` | `1` | multiplies every challenge's pay (0.5 to 5), e.g. `2` for a double-bones weekend |
| `event.banner` | `""` | a line under the title, e.g. `"Double bones weekend!"` |
| `event.bones` | `1` | multiplies the daily streak's pay |
| `mischief.chance` | `0.07` | how often, per throw, the print can misbehave |
| `kill.souls` | `false` | closes the Soul Shop |
| `kill.board` | `false` | stops posting to the leaderboard |
| `kill.replays` | `false` | hides Share on the headstone |
| `season.id` | `""` | which season is running (v42) |
| `analytics.sample` | `1` | the share of consenting players whose events are sent (v39) |

## The functions

- `wallet`: the caller's balance and owned Soul items.
- `buyWithSouls {item}`: buys a Soul Shop item at the server's price.
- `claimDailySouls`: the free daily Souls, once per UTC day.
- `redeemPurchase {platform, receipt, product}`: credits a Soul pack after the store confirms the receipt.
- `submitRun {run, log}` (v34): checks a finished Story run, keeps it for audit, and posts it to the all-time and weekly boards if it's the player's best. One every 15 seconds.
- `logEvents {events}` (v39): stores a batch of analytics events, only from players who agreed.

Each one refuses with a code the game understands: `unauthenticated`, `not-found`, `already-exists`,
`failed-precondition`, `permission-denied` or `resource-exhausted`.

## Soul packs

`functions/receipts.js` is where each store's receipt check goes. This repo can't hold your store credentials, so
until you fill it in every real receipt is refused. The Google Play, App Store and Steam calls are named in the
file. The prices players pay are set in each store's console. What a pack credits is `PACKS` in
`functions/shared/economy.js`.

## Tests

- `cd functions && npm test` runs the handlers against an in-memory database. CI runs them too, with no install.
- The game's spec (`node tools/run-spec.mjs`) drives the same handlers inside the page.
