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
   (`apiKey`, `authDomain`, `projectId`, `appId`, and `measurementId` if Google Analytics is on) into
   `src/firebase.config.json`. Only the release builds carry it: the dev build (the spec, the matrix, the soak bot)
   stays off the real project unless built with `--live`.

   **Bringing it up in stages.** `services` in the same file says which parts exist yet: `{ "firestore": false,
   "functions": false }` means hosting, anonymous sign-in and Google Analytics only (all on the free Spark plan). The
   game then treats the rest as absent, as it does with no server at all. Saves stay on the device, the board is
   local, and the Soul Shop says it opens later. Set `firestore` to `true` once the database exists (step 3), and
   `functions` to `true` once the functions are deployed (step 6, which needs Blaze). Rebuild and deploy each time.
2. **Authentication:** enable **Anonymous** sign-in. You can add Google, Apple and others later; an anonymous
   account can be linked to one without losing anything.
3. **Firestore:** create a database in production mode.
4. **Install and log in:** `npm install -g firebase-tools`, then `firebase login`.
5. **Point this folder at your project:** copy `.firebaserc.example` to `.firebaserc` and put your project id in it.
6. **Deploy the rules and functions:** `cd functions && npm install && cd .. && firebase deploy --only firestore,functions`.
   Cloud Functions needs the project on the Blaze (pay-as-you-go) plan.
7. **Let analytics expire (v39):** turn on Firestore's time-to-live for the `events` collection, so each batch is
   deleted 30 days after it arrives:
   `gcloud firestore fields ttls update expireAt --collection-group=events --enable-ttl --project=<your-project>`.
8. **Package and host the game (v40):** `python3 ../tools/package.py web`, then `firebase deploy --only hosting`.
   That hosts `dist/web`: the page, its music, the app icons, a manifest, and a service worker so the installed web
   app plays offline. Hosting serves it over HTTPS on Google's CDN, with the page and service worker never cached
   and the music cached for a week. Or host `index.html` anywhere; the config inside it points at your project.

To try everything locally: `firebase emulators:start`, then open the hosted page from the emulator. In the
emulator, a purchase receipt of the form `TEST:<anything>` is accepted, so the Soul-pack flow can be tried end to
end.

## What lives where

| Path | Who writes it | What it is |
|---|---|---|
| `data/users/{uid}/save` | the player | profile and looks, merged with the device's copy. The rules refuse any `souls` or `wallet` field. |
| `wallets/{uid}` | functions only | the Souls balance, what they bought, and the last daily claim |
| `ledger/{id}` | functions only | every change to a balance: buys, daily claims, purchases, refunds, grants, reversals |
| `receipts/{id}` | functions only | each store receipt, so none is ever credited twice |
| `leaderboard/{uid}` | functions only (v34) | each player's best checked Story run |
| `weekly/{week}_{uid}` | functions only (v34) | each player's best checked run this week |
| `runs/{id}` | functions only (v34) | the runs submitted, for audit |
| `meta/{uid}` | functions only | when the player last sent a run (the rate limit) |
| `config/live` | you, from the console (v39) | remote config and feature flags |
| `events/{day}_{uid}_{time}_{n}` | functions only (v39) | a batch of analytics, sent with the player's consent, deleted after 30 days (step 7) |
| `metrics/{day}_{shard}` | functions only (v39) | the day's analytics counts, split over ten documents; no player ids |
| `ameta/{uid}` | functions only (v39) | the analytics rate limit |

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
| `event.from`, `event.until` | `""` | an event's window, as ISO times (e.g. `"2026-10-30T00:00:00Z"`). `event.banner`, `event.bones` and `challenges.bonus` apply only inside it, so an event can be set up ahead and ends on its own. Leave both empty for "now, until changed". |
| `maintenance` | `""` | a line under the title, in place of the event banner, e.g. `"The leaderboard is resting until 6pm UTC"` |
| `modes.off` | `[]` | modes taken off the Play sheet, e.g. `["director"]` if something's wrong with this week's challenge. Story can't be. |
| `build.min` | `0` | the oldest build allowed to write. Anything older is asked to reload, and the server refuses its Soul and leaderboard writes. The build number is in `src/version.json`. |
| `kill.analytics` | `false` | stops analytics, on the device and the server |
| `season.id` | `""` | the season (v42): `""` runs seasons on their own dates, a season's id (`"s1"`) turns it on now, `"off"` stops seasons and claiming. See docs/SEASONS.md. |
| `analytics.sample` | `1` | the share of consenting players whose events are sent, 0 to 1 (v39). The same install is always in or always out. |

The server enforces `kill.souls` (no buying, no daily Souls: a store purchase still goes through, since it's been
paid for), `kill.board`, `kill.analytics` and `build.min` itself, so a kill switch holds even for a client that
doesn't know about it.

## The functions

- `wallet`: the caller's balance and owned Soul items.
- `buyWithSouls {item}`: buys a Soul Shop item at the server's price.
- `claimDailySouls`: the free daily Souls, once per UTC day.
- `redeemPurchase {platform, receipt, product}`: credits a Soul pack after the store confirms the receipt.
- `submitRun {run, log}` (v34): checks a finished Story run, keeps it for audit, and posts it to the all-time and weekly boards if it's the player's best. One every 15 seconds.
- `logEvents {session, build, events}` (v39): files a batch of analytics events, sent only by players who agreed. Only the events and fields listed in `functions/shared/analytics.js` are kept (the game filters with the same list before sending). Fifty events a batch, six batches a minute.
- `support {op, …}` (v39): support's tools (below), for accounts with the `admin` claim only.
- `playRefunds` (v39): Google Play's refund notices (Pub/Sub). `appleNotices` (v39): the App Store's (HTTPS). See [Refunds](#refunds).

Each one refuses with a code the game understands: `unauthenticated`, `not-found`, `already-exists`,
`failed-precondition`, `permission-denied`, `resource-exhausted` or `unavailable` (switched off in `config/live`).

## Soul packs

`functions/receipts.js` is where each store's receipt check goes. This repo can't hold your store credentials, so
until you fill it in every real receipt is refused. The Google Play, App Store and Steam calls are named in the
file. The prices players pay are set in each store's console. What a pack credits is `PACKS` in
`functions/shared/economy.js`.

## Refunds

When a store refunds a Soul pack, the Souls come back off the wallet it credited. What's been spent stays spent. Any
shortfall is **owed**: new Souls (daily or bought) pay it off first, nothing can be bought meanwhile, and the Soul
Shop says so. It's all on the ledger (`kind: "refund"`).

- **Google Play:** in the Play Console, turn on Real-time developer notifications to a Pub/Sub topic called
  `play-rtdn` (or set `PLAY_RTDN_TOPIC`). `playRefunds` handles `voidedPurchaseNotification`. File each receipt under
  the order id (`verifyReceipt` returns it as `id`).
- **App Store:** set the App Store Server Notifications (v2) URL to the deployed `appleNotices` function. Put Apple's
  root certificate in `functions/certs/AppleRootCA-G3.cer` (from apple.com/certificateauthority), and set
  `APPLE_BUNDLE_ID`, `APPLE_APP_ID`, and `APPLE_ENV=sandbox` while testing. Until the certificate is there, the
  function answers 503 and does nothing.
- **Steam:** poll `ISteamMicroTxn/GetReport` for refunds and run `revoke-receipt` (below) for each.
- **Restoring purchases.** Soul packs are consumable, so there's nothing for a store to restore. What Souls bought
  belongs to the account. An anonymous account is one device: link it to Google or Apple sign-in (step 2) to carry
  it to another.

## Support's tools

`functions/tools/admin.js` runs the same handlers from your machine, with a service account
(`export GOOGLE_APPLICATION_CREDENTIALS=…`, then from `functions/`):

```
node tools/admin.js wallet <uid>                    # Souls, what they own, anything owed
node tools/admin.js ledger <uid> [n]                # the last n changes to their balance
node tools/admin.js grant <uid> 200 "ticket 1234"   # a make-good (a minus takes Souls back)
node tools/admin.js revoke-receipt <order id>       # a refund, by hand
node tools/admin.js reverse <ledger id>             # undo one entry: a purchase, a daily claim or a grant
node tools/admin.js report 2026-10-01               # the day's analytics, with the new-player funnel
node tools/admin.js set-admin <uid>                 # let that account call `support` from a signed-in page
```

Every one writes to the ledger, so nothing support does is invisible. That's the economy's rollback: a bad
purchase, grant or claim is reversed entry by entry, and a bad event is ended by editing `config/live`.

## Tests

- `cd functions && npm test` runs the handlers against an in-memory database: Souls, receipts, the run check, analytics, refunds, support's tools and the live switches. CI runs them too, with no install.
- The game's spec (`node tools/run-spec.mjs`) drives the same handlers inside the page.
