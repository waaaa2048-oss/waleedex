#!/usr/bin/env bash
set -euo pipefail

# Build direct-install Android APK and Windows Electron EXE.
# Requirements: Node 22+, JDK 21, Android SDK API 36, and Wine (for Windows NSIS builds on Linux).
APP_URL="${CAPACITOR_SERVER_URL:-$(node -e 'process.stdout.write(require("./electron/app-url.json").url)')}"
export CAPACITOR_SERVER_URL="$APP_URL"
export AHLALKARAM_APP_URL="$APP_URL"

node -e 'const fs=require("fs"); fs.writeFileSync("electron/app-url.json", JSON.stringify({url:process.env.AHLALKARAM_APP_URL},null,2)+"\n")'

npx cap sync android
(
  cd android
  ./gradlew assembleDebug --no-daemon
)

npx electron-builder --config electron-builder.yml --win --x64

mkdir -p public/downloads
cp android/app/build/outputs/apk/debug/app-debug.apk public/downloads/AhlAlKaram-Android.apk
cp release/windows/AhlAlKaram-1.0.0-x64.exe public/downloads/AhlAlKaram-Windows-Setup.exe
cp release/windows/AhlAlKaram-Portable-1.0.0-x64.exe public/downloads/AhlAlKaram-Windows-Portable.exe

echo "Native apps built for: $APP_URL"
echo "APK: public/downloads/AhlAlKaram-Android.apk"
echo "Windows setup: public/downloads/AhlAlKaram-Windows-Setup.exe"
echo "Windows portable: public/downloads/AhlAlKaram-Windows-Portable.exe"
