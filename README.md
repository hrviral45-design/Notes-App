# Personal Notes – Android

Features: offline note storage (IndexedDB), PIN lock, voice dictation (device/browser speech service required), photo attachments, JSON backup and restore.

## Build an Android APK with GitHub Actions
1. Upload all files and folders in this project to a new GitHub repository (keep the `.github/workflows/build-apk.yml` file).
2. Open the repository's **Actions** tab.
3. Select **Build Android APK** and press **Run workflow** (or push to `main`).
4. When the run finishes, open it and download the **Personal-Notes-APK** artifact.
5. Extract the ZIP and install `app-debug.apk` on your Android phone. Allow installation from that source if Android asks.

## Notes
- Notes and photos are stored locally on the device. Clearing app data or uninstalling may erase them; export backups regularly.
- Voice typing availability depends on Android WebView and the phone's speech recognition service. It may require internet and microphone permission.
- The PIN lock is an in-app privacy screen, not device-level encryption. Keep backups in a safe place.
