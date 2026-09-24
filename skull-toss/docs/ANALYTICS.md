# Play analytics and privacy

Skull Toss's analytics are for **diagnosis**: where new players stop, which boss is too hard, what goes unused.
They are not for ads, and they're not sold or shared. The rules below are enforced in code. Keep them that way,
and keep this page true.

## Consent

- **Nothing is sent until the player says yes.** The game asks once, on the title after the first finished run, with
  **Share** and **No thanks**. Settings → **Share play data** changes the answer any time, and **What's sent** says,
  in plain words, what goes.
- **A privacy signal counts as a no.** Where the browser sends Global Privacy Control or Do Not Track, the game
  doesn't ask, and sends nothing unless the player turns the switch on themselves.
- **No server, no question.** Without a Firebase project there's nowhere to send anything, so the game doesn't ask.
- **A yes covers the session so far.** On a yes, what has already happened this session (up to the last 150
  events) is sent along with what comes after. A no, or turning the switch off, empties the queue at once.
- Nothing is sent from a replay (it's the recording's play, not the viewer's) or while the spec runs.

## What's sent

Only the events and fields listed in `firebase/functions/shared/analytics.js`. Each field is a number, a true/false,
or a word of at most 60 characters. The game filters with that list before anything leaves the device, and the server
filters again on arrival.

| Event | Fields | Why |
|---|---|---|
| `session_start` | build, language, installed app or not, touch, screen size, reduced motion, quality tier, returning player | which devices and settings to test on |
| `session_end` | seconds, runs, the screen or sheet open, mid-run or not | session length, and where people leave |
| `first` | what (see the funnel), runs so far, minutes since install | the new-player funnel |
| `run_start`, `run_end` | mode, map, stage, half and tier, score, hits, throws, misses, perfects, continues, power-ups, bosses, seconds, quit or not | where runs end, and how hard each map is |
| `boss_start`, `boss_down` | which boss, where, mini or end, without a miss | boss attempts and completion |
| `powerup`, `target` | which, where | power-up and target use |
| `continue_offer`, `continue_take`, `continue_decline` | where, cost, how paid | how continues are used |
| `mode_end`, `director_end`, `story_complete` | the mode's score, the week's twist and stars | mode use |
| `shop_buy`, `equip` | which look, the price, which currency | cosmetic engagement |
| `chal_claim`, `level_up`, `mastery`, `secret`, `signature`, `fragment` | which | progression and challenge completion |
| `replay_watch` | mode, score | whether replays get watched |
| `error` | the message (60 characters), the file and line, the build | crashes and bugs. Five a session at most. |

**Never sent:** the player's name or headstone name, initials, the save or a save code, anything typed, Souls or
bones balances, the device's identifiers, location, or anything to do with ads. Throws are not sent one by one; each
run's totals are.

## The funnel

The first time a player does each of these, a `first` event records it: launch, throw, hit, miss, retry, target,
hazard, power-up, mini-boss, end boss, first boss down, reward, cosmetic, challenge, save, reaching map 2, reaching
map 5, finishing the story. The list of firsts rides on the profile, so it's once per player across devices, not
once per install. (The profile keeps the list whether or not analytics are on. It's what the player has done, like
their stats.)

## On the server

- **Who.** A batch is filed under the player's anonymous sign-in id (Firebase Auth, no email or name) and a random
  session id. That's needed for the rate limit and for deleting a player's data on request.
- **How long.** Each batch carries `expireAt`, 30 days after it arrived, and Firestore's time-to-live deletes it
  then (see firebase/README.md, step 7).
- **The counts.** Each batch also adds to the day's totals in `metrics/{day}_{shard}`: counts only, with no player
  ids, kept for trends. `node tools/admin.js report <day>` (in `firebase/functions`) prints them with the funnel.
- **Limits.** Fifty events a batch, six batches a minute per player. Nobody can read `events` or `metrics` from a
  client: the Firestore rules refuse it.

## Google Analytics (v43)

The Firebase console's **daily active users** and **retention** charts come from Google Analytics. The game feeds
them on the same terms as everything above:

- **Only after a yes.** Google's analytics SDK isn't even loaded until the player agrees, so nobody who hasn't said
  yes gets its cookie. A no, or turning the switch off, stops it at once.
- **The same events, cut down the same way.** Google gets exactly what the list allows, with no throw-by-throw
  data. Google's own names are left to Google: it counts sessions itself, and the game's `error` goes as
  `game_error`.
- **Advertising off.** The game sets consent mode with ad storage, ad user data and ad personalisation denied,
  Google signals off, and ad-personalisation signals off. Keep **Google signals** off in the GA property's settings
  too (Admin → Data collection).
- **What Google keeps:** a random client id in a first-party cookie (`_ga`), the events, and coarse location and
  device info that Google derives. GA4 doesn't log or store IP addresses. Set the property's data retention
  (Admin → Data retention) to 2 months to match the 30-day spirit of the rest.
- **Setting it up:** put the web app's `measurementId` (`G-…`) in `src/firebase.config.json` and rebuild. Without
  one, nothing goes to Google.

## Switches

In `config/live`: `analytics.sample` (0 to 1; the same install is always in or always out) and `kill.analytics` (stops
it on the device and on the server, Google Analytics included).

## Errors

Uncaught errors and rejected promises are kept on the device for the session (`SkullToss.errors()` in the console)
whether or not analytics are on. With consent, the first five each session are sent as `error` events.

## For store listings

When a store asks for a data declaration (App Store privacy "nutrition label", Google Play Data safety, Steam),
this page is the source:

- **Data collected (with consent only):** product interaction and gameplay (the table above), crash and diagnostic
  data (errors), an anonymous user id (Firebase Auth), and a device/app-instance id (Google Analytics' client id).
  Purchase history for Soul packs is kept by the server to credit and refund them.
- **Not collected:** contact info, location, contacts, photos, browsing history, health, financial info beyond the
  store's receipt, advertising identifiers.
- **Use:** app functionality (saves, the leaderboard, Souls) and analytics. Not used for tracking or advertising, and
  not sold. It's processed by Google (Firebase and Google Analytics) on the game's behalf.
- **Deletion:** analytics after 30 days automatically; on request, by the player's id.
