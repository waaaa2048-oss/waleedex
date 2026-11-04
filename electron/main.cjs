const { app, BrowserWindow, shell, session } = require("electron");
const path = require("node:path");

const packagedUrl = (() => {
  try { return require("./app-url.json").url; } catch { return ""; }
})();
const APP_URL = (process.env.AHLALKARAM_APP_URL || packagedUrl || "https://3000-iw0bspj0g58sd77kzfdeu.e2b.app").replace(/\/$/, "");
let mainWindow;

function allowedHost(hostname) {
  return hostname === "ahlalkaram.sa" || hostname.endsWith(".ahlalkaram.sa") || hostname.endsWith(".e2b.app");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#fbf7ef",
    title: "أهل الكرم | عشاك جاهز",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && (allowedHost(parsed.hostname) || parsed.hostname === "wa.me" || parsed.hostname.endsWith("google.com"))) {
        shell.openExternal(url);
      }
    } catch {
      // Ignore invalid external links.
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !allowedHost(parsed.hostname)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(APP_URL);
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.ahlalkaram.store");
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["geolocation", "notifications"].includes(permission));
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
