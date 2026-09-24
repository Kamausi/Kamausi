# Release checklist

Everything that needs your accounts, keys or judgement before Skull Toss ships. The code side is done; these are the
steps only you can take. Tick them off per platform.

## Every platform

- [ ] Bump `src/version.json` (build number and name).
- [ ] `python3 src/build.py --dev && node tools/run-spec.mjs`: every check passes.
- [ ] `cd firebase/functions && npm test`: every server test passes.
- [ ] `SkullToss.economy()` in the console reports no problems.
- [ ] A Firebase project is set up (firebase/README.md, steps 1–7), with its config in `src/firebase.config.json`.
- [ ] `config/live` exists, with `build.min` set if older builds must stop writing.
- [ ] Store receipt checks are filled in (`firebase/functions/receipts.js`), and refunds are wired (firebase/README.md, "Refunds").
- [ ] App Check is on for the callable functions (`enforceAppCheck: true` in `functions/index.js`, with App Attest / Play Integrity / reCAPTCHA registered).
- [ ] The privacy policy (`store/privacy-policy.md`) is reviewed, completed and hosted, and its URL is in every store.
- [ ] Store art is regenerated (`node tools/store-assets.mjs`) or replaced with better.

## Web

- [ ] `python3 tools/package.py web && cd firebase && firebase deploy --only hosting`
- [ ] Open the hosted page on a phone: it installs (Add to Home Screen), plays offline after one visit, and asks for play data only after the first run.
- [ ] Lighthouse: the PWA checks and a performance score you're happy with.

## iOS (App Store)

- [ ] `appId` changed, team set, In-App Purchase capability added.
- [ ] Three consumable products in App Store Connect, ids matching `src/platform.config.json`.
- [ ] AdMob: real ad unit ids in `src/platform.config.json`, `"test": false`, and `GADApplicationIdentifier` in Info.plist.
- [ ] `PrivacyInfo.xcprivacy` declares the data in docs/ANALYTICS.md and the plugins' required-reason APIs.
- [ ] App Privacy answers in App Store Connect (docs/ANALYTICS.md, "For store listings").
- [ ] Age rating questionnaire (store/listing.md).
- [ ] Screenshots: 6.9", 6.5" and 13" (store/screenshots).
- [ ] Review notes: "Souls are consumable in-app purchases that buy cosmetic looks only. Ads are opt-in rewarded videos. No account is needed; sign-in is anonymous." Guideline 3.1.1: packs are sold only through in-app purchase, and there are no links to buy elsewhere.
- [ ] TestFlight on a real device: purchases (sandbox account), a refund in sandbox, a rewarded ad, the back-and-forth to the background mid-run.

## Android (Google Play)

- [ ] `appId` changed, upload key made, Play App Signing on, an App Bundle built (`./gradlew bundleRelease`).
- [ ] Three consumable in-app products, ids matching `src/platform.config.json`.
- [ ] Real-time developer notifications to the `play-rtdn` Pub/Sub topic (refunds).
- [ ] AdMob app id in AndroidManifest.xml, real ad unit ids, `"test": false`.
- [ ] Data safety form (docs/ANALYTICS.md), content rating (IARC), target audience, ads declaration (yes).
- [ ] Screenshots (store/screenshots/android-phone) and the 512 icon (store/icons/icon-512.png).
- [ ] Internal testing track: purchases with a licence tester, the back button everywhere, rotation on a tablet.

## Steam

- [ ] Steamworks app id; `steam_appid.txt` removed from any build you upload.
- [ ] Achievements created with the API names in `platforms/electron/steam-achievements.csv`, and their icons.
- [ ] Steam Cloud Auto-Cloud set up (platforms/README.md).
- [ ] Store page: capsules from store/steam, screenshots from store/screenshots/steam, and the description in store/listing.md.
- [ ] Builds for Windows, macOS and Linux (`npm run dist` on each, or `dist:all`) uploaded with SteamPipe.
- [ ] Steam Deck: plays with the default controller layout, text legible at 1280 × 800, and it passes Deck Verified review.
- [ ] Content survey (the same answers as the age rating).

## After launch

- [ ] Watch `node tools/admin.js report` (in firebase/functions) each day for the first week: the funnel, run_end by mode, errors.
- [ ] Keep the kill switches in mind (`kill.souls`, `kill.board`, `kill.ads`, `kill.analytics`, `modes.off`) for anything that misbehaves.
