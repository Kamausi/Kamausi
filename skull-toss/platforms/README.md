# Skull Toss on every platform

One build of the game runs everywhere. `src/js/03e_platform.js` works out where it's running, and everything that
differs goes through it:

| | Web (browser, installed web app) | iOS and Android (Capacitor) | Desktop and Steam (Electron) |
|---|---|---|---|
| Package | `python3 tools/package.py web` → `dist/web` | `… capacitor` → `platforms/capacitor/www` | `… electron` → `platforms/electron/app` |
| Haptics | `navigator.vibrate` (Android browsers) | native haptic engine (`@capacitor/haptics`) | none |
| Full screen | Settings → Full screen | always | F11, or Settings → Full screen |
| Background | the tab hides → pause, keep the run | the app goes to the background → the same | minimised → the same |
| Back button | — | Android: closes a sheet, pauses, resumes, steps back to the title, then leaves | — |
| Quit | — | — | on the title |
| Soul packs | none (Souls come from the daily handful) | App Store / Google Play in-app purchases | none at launch (see Steam below) |
| Rewarded reels | none | AdMob, opt-in, non-personalised | none |
| Achievements | the game's own | the game's own | the game's own, and Steam's |
| Offline | the service worker keeps the page and music | the page is in the app | the page is in the app |
| Quality tier | a first guess from the device (memory, cores, software rendering), then the frame-time watcher | the same | the same |

The store and ad ids live in `src/platform.config.json` (embedded at build as `PLATFORM_CONFIG`):

```json
{
  "products": { "souls.100": "souls.100", "souls.550": "souls.550", "souls.1200": "souls.1200" },
  "admob": { "test": true, "rewarded": { "ios": "ca-app-pub-…/…", "android": "ca-app-pub-…/…" } }
}
```

`products` maps each Soul pack (`firebase/functions/shared/economy.js`: `PACKS`) to the product id you create in App
Store Connect and the Play Console. The AdMob ids shipped here are **Google's public test ids**: they show test ads
only. Put your own in before release, and set `"test": false`.

## The web

```
python3 tools/package.py web
cd firebase && firebase deploy --only hosting
```

`dist/web` (copied to `firebase/public` for Hosting) has the page with a manifest, icons and theme colour; `sw.js`, a service worker that fetches the page fresh
when online (a new build arrives at once) and serves it from the cache offline; and the music. Firebase Hosting
serves it over HTTPS from a CDN (headers in `firebase/firebase.json`). The service worker registers only over HTTPS
(or localhost), never in a frame or a claude.ai page, and each build has its own cache.

To make a release reach everyone, bump `src/version.json` and, if an old build must stop writing (a changed save or
server rule), set `build.min` in `config/live` to the new number.

## iOS and Android (`platforms/capacitor`)

You need: Node 20, Xcode (iOS, on a Mac), Android Studio (Android), an Apple Developer account and a Google Play
developer account.

```
cd platforms/capacitor
npm install
npx cap add ios && npx cap add android     # once: creates the native projects
npm run assets                             # icons and splash screens from ./assets (made by tools/store-assets.mjs)
npm run ios                                # or: npm run android. Packages the page, syncs, and opens the IDE
```

Then, once per project:

1. **App id and name.** Change `appId` in `capacitor.config.json` (and `appId` in `platforms/electron/package.json`)
   to your own reverse-domain id before the first `cap add`.
2. **Signing.** iOS: set your team in Xcode (Signing & Capabilities) and add the In-App Purchase capability.
   Android: create an upload key (`keytool -genkey -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048
   -validity 10000`), and set it in `android/app/build.gradle`'s `signingConfigs`. Use Play App Signing.
3. **In-app purchases.** Create three **consumable** products whose ids match `products` above, priced as you
   like. Fill in the receipt checks in `firebase/functions/receipts.js` (Google Play Developer API with a service
   account, App Store Server API with an App Store Connect key), and wire up refunds (firebase/README.md, "Refunds").
   A purchase is only finished once the server has credited it. One the app never saw through is credited at the next
   launch.
4. **AdMob.** Create an AdMob app for each platform and one **rewarded** ad unit each. Put the ad unit ids in
   `src/platform.config.json`. The app ids go in the native projects: `GADApplicationIdentifier` in
   `ios/App/App/Info.plist`, and a `com.google.android.gms.ads.APPLICATION_ID` meta-data entry in
   `android/app/src/main/AndroidManifest.xml`. Ads are only ever a player's choice (a reel for a continue), and are
   requested non-personalised. Google's consent form (UMP) is shown where the law asks for it. `kill.ads` in
   `config/live` turns them off.
5. **Privacy.** iOS needs a privacy manifest (`PrivacyInfo.xcprivacy`): declare the data in
   [docs/ANALYTICS.md](../docs/ANALYTICS.md), "For store listings", and the required-reason APIs your plugins list.
   The Play Console's Data safety form takes the same answers. Both stores need a privacy policy URL:
   [store/privacy-policy.md](../store/privacy-policy.md) is a draft.
6. **Orientation.** Phones play upright (locked at launch); tablets turn freely. Also set portrait in Xcode
   (Deployment Info) and `android:screenOrientation` if you want the launch screen locked too.
7. **Firebase.** Add the app's origin to Firebase Auth's authorised domains if you add sign-in providers
   (`capacitor://localhost` on iOS, `https://localhost` on Android). Anonymous sign-in needs nothing.

## Desktop and Steam (`platforms/electron`)

```
cd platforms/electron
npm install
echo 480 > steam_appid.txt     # Spacewar, Valve's test app, until you have your own id (never ship this file)
npm start                      # packages the page and opens the window
npm run dist                   # an unpacked build in release/, ready for SteamPipe
```

- **Window.** 1280 × 800 to start (the Steam Deck's screen), resizable, full screen on F11 or from Settings, Quit on
  the title. The page gets a small fixed bridge (`preload.js`) and nothing else: context isolation and the sandbox
  are on, Node is off, and it can't navigate away.
- **Steam.** With the Steam client running and an app id (`STEAM_APP_ID`, or `steam_appid.txt` in development),
  steamworks.js starts the Steam API and the overlay. Achievements: create each one in Steamworks with the API name
  in `steam-achievements.csv` (the game's ids, upper-cased: `first-toss` → `FIRST_TOSS`). The game sets them as
  they're reached. Without Steam, everything else works as normal.
- **Steam Cloud.** Use Auto-Cloud with the root `WinAppDataRoaming` / `MacHome` / `LinuxHome` and the subdirectory
  Electron keeps the page's storage in (`Skull Toss/Local Storage` under the app-data folder). The cloud save
  (Firebase) works on the desktop too.
- **Input.** Mouse, keyboard (arrows aim, Space throws, Esc pauses) and gamepads through the browser's Gamepad API,
  which Steam Input feeds. For Steam Deck Verified, check: the default controller layout plays the whole game, text is
  legible at 1280 × 800, and the on-screen keyboard appears for the headstone name (Steam's text input).
- **Soul packs on Steam** need Steam's microtransaction flow (the server calls `ISteamMicroTxn/InitTxn` with your
  publisher key, the player approves in the overlay, the server calls `FinalizeTxn`). That's left out of the first
  desktop release. The desktop plays with the daily Souls, and `Payments.available()` stays false.
- **Signing.** Sign the Windows installer (a code-signing certificate) and notarise the macOS build
  (`electron-builder` reads `CSC_LINK` and `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD`) if you distribute outside
  Steam.

## Store art

`node tools/store-assets.mjs` (after `python3 src/build.py --dev`) draws everything from the game itself:

- **App icons:** 1024, 512, 192, maskable, Apple touch, favicon (`store/icons`), plus
  `platforms/capacitor/assets` for `@capacitor/assets`.
- **Screenshots:** App Store 6.9", 6.5" and 13", Google Play phone, and Steam 1920 × 1080 (`store/screenshots`).
- **Steam capsules:** header, small, main, vertical, library capsule, library hero and logo (`store/steam`).

They're starting points. Swap in better ones whenever you have them. The listing copy is in `store/listing.md`, and
the release checklist in `store/CHECKLIST.md`.
