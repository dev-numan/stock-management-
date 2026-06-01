# Android APK (private / single customer)

Use **EAS Build** to get an installable `.apk` without Android Studio.

## Smallest APK (recommended)

Profile **`release-apk`** enables:

- **Release minify** (ProGuard / R8) — smaller Java/Kotlin code
- **Resource shrinking** — removes unused resources
- **Single CPU arch** (`arm64-v8a` only) — ~40–50% smaller than “universal” APK; works on almost all phones from ~2017 onward

```bash
cd narang-mobile
npx eas-cli login
npm run build:android:apk
```

(`npm run build:android:apk` uses `npx eas-cli` — you do **not** need `eas` installed globally.)

Same as:

```bash
npx eas-cli build --platform android --profile release-apk --non-interactive
```

When the build finishes, download the **APK** from the terminal link or [expo.dev](https://expo.dev) → **hafeez-zarai-markaz** → Builds.

### Install on the shop phone

1. Send the APK (WhatsApp, USB, or open the expo.dev link on the phone).
2. Settings → allow **Install unknown apps** for Files / Chrome.
3. Open the APK and install.

Only install builds you trust (your own Expo account).

### Sunmi POS printer (P3 / built-in thermal)

The invoice screen has **Print English** and **Print Urdu** for the Sunmi built-in printer.

- Uses native `sunmi-printer-expo` — **not** available in Expo Go.
- After printer changes, run a **new EAS APK build** (`npm run build:android:apk`) and install on the Sunmi POS.
- Both print buttons capture a thermal receipt image (~58mm) and send it to the printer, then **cut paper**.
- On non-Sunmi devices, print shows an error (use **Share image** for WhatsApp instead).
- **Share image** shares the same receipt layout as print (Urdu or English by app language).

---

## Profiles

| Profile | Use |
|--------|-----|
| **`release-apk`** | Private shop phone — **smallest APK** (default `npm run build:android:apk`) |
| **`preview`** | Same as before if you need a build without size opts |
| **`production`** | Same APK type; uses same env; optional alias |

---

## API URL

`EXPO_PUBLIC_API_URL` is set in `eas.json` for cloud builds (Railway). Change it under `build.release-apk.env` and rebuild.

---

## Expected size

React Native + Expo apps are rarely under ~25 MB as APK. With these settings you often get roughly **35–55 MB** (device dependent), vs **60–90 MB** for a fat universal debug-style build.

You cannot shrink much further without removing features (charts, PDF, contacts, etc.).

---

## Very old phones (32-bit only)

If a phone does **not** install the APK, rebuild with both ABIs in `app.json` → `expo-build-properties` → `abiFilters`:

```json
"abiFilters": ["arm64-v8a", "armeabi-v7a"]
```

APK will be larger but supports older devices.

---

## Bump version for updates

In `app.json`:

- `"version": "1.0.1"` — shown to user
- `"android.versionCode": 2` — must increase for each new install over the old APK

Then run `npm run build:android:apk` again.

---

## Do not use for this private app

- **Expo Go** — for development only, not for the shop.
- **`expo start --tunnel`** — not needed on the installed APK.
- **AAB** — for Play Store; you only need **APK** for sideloading.
