import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = (process.env.CAPACITOR_SERVER_URL ?? "https://3000-ionngtkh71mbzq28oh420.e2b.app").replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.ahlalkaram.store",
  appName: "أهل الكرم",
  webDir: "native/www",
  backgroundColor: "#fbf7ef",
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: [
      "3000-ionngtkh71mbzq28oh420.e2b.app",
      "3000-iw0bspj0g58sd77kzfdeu.e2b.app",
      "ahlalkaram.sa",
      "www.ahlalkaram.sa",
      "wa.me",
      "maps.google.com",
      "business.whatsapp.com",
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#0b3b2e",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      launchAutoHide: true,
    },
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#fbf7ef",
  },
};

export default config;
