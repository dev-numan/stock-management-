# Android APK build

The app uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce an installable `.apk` (no Android Studio required on your Mac).

## One-time setup

1. Create a free [Expo](https://expo.dev) account.
2. Log in locally:
   ```bash
   cd narang-mobile
   npx eas-cli login
   ```
3. Link the project (first time only):
   ```bash
   npx eas-cli init
   ```

## Build APK

```bash
cd narang-mobile
npm run build:android:apk
```

Or with production profile:

```bash
npx eas-cli build --platform android --profile production --non-interactive
```

When the build finishes, open the URL printed in the terminal (or [expo.dev](https://expo.dev) → your project → Builds) and download the **APK**.

Install on a device: enable “Install unknown apps”, then open the downloaded APK.

## API URL

`EXPO_PUBLIC_API_URL` is set in `eas.json` for cloud builds (Railway production). To point at another backend, change it under `build.preview.env` / `build.production.env` and rebuild.

## Local build (optional)

Requires Java 17+, Android SDK, and `npx expo prebuild`. Prefer EAS unless you already use Android Studio.
