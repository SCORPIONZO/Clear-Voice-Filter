import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron';
import path from 'path';
import { isBlackHoleInstalled, downloadBlackHole, openInstaller, validatePkgPath } from './blackhole';

const isDev = process.env.NODE_ENV === 'development';
const DEV_RENDERER_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;

// ── Download mutex: prevent concurrent downloads ──────────────────────────────
let isDownloadInProgress = false;

// ── Trusted renderer origins ──────────────────────────────────────────────────
function isTrustedSender(webContents: WebContents): boolean {
  const url = webContents.getURL();
  return (
    url.startsWith('file://') ||          // production: loaded from disk
    url.startsWith(DEV_RENDERER_URL) ||   // development renderer
    url.startsWith('http://localhost:')   // setup window (also file://)
  );
}

// ── Microphone permission ─────────────────────────────────────────────────────
function setupPermissions() {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents: WebContents, permission: string, callback: (granted: boolean) => void) => {
      callback(['media', 'audioCapture'].includes(permission));
    },
  );
  session.defaultSession.setPermissionCheckHandler(
    (_webContents: WebContents | null, permission: string) => {
      return ['media', 'audioCapture'].includes(permission);
    },
  );
}

// ── Windows ───────────────────────────────────────────────────────────────────
function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 540,
    height: 480,
    resizable: false,
    center: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Restrict navigation out of setup page
      additionalArguments: ['--no-sandbox'],
    },
  });

  setupWindow.loadFile(path.join(__dirname, '../setup/index.html'));
  setupWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  setupWindow.on('closed', () => { setupWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_RENDERER_URL);
  } else {
    mainWindow.loadFile(
      path.join(process.resourcesPath, 'renderer', 'index.html'),
    );
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  setupPermissions();

  if (isBlackHoleInstalled()) {
    createMainWindow();
  } else {
    createSetupWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // On re-activate, check again — user might have installed BlackHole
      if (isBlackHoleInstalled()) {
        createMainWindow();
      } else {
        createSetupWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('blackhole:check', (event: IpcMainInvokeEvent) => {
  if (!isTrustedSender(event.sender)) return false;
  return isBlackHoleInstalled();
});

ipcMain.handle('blackhole:download', async (event: IpcMainInvokeEvent) => {
  if (!isTrustedSender(event.sender)) {
    return { success: false, error: 'Untrusted sender' };
  }

  // Mutex: reject if already downloading
  if (isDownloadInProgress) {
    return { success: false, error: 'Download already in progress' };
  }
  isDownloadInProgress = true;

  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  try {
    const pkgPath = await downloadBlackHole((downloaded, total) => {
      senderWindow?.webContents.send('blackhole:progress', { downloaded, total });
    });
    return { success: true, path: pkgPath };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    isDownloadInProgress = false;
  }
});

ipcMain.handle('blackhole:install', async (event: IpcMainInvokeEvent, pkgPath: unknown) => {
  if (!isTrustedSender(event.sender)) {
    return { success: false, error: 'Untrusted sender' };
  }
  // Validate pkgPath is a string in the expected temp location
  if (typeof pkgPath !== 'string' || !validatePkgPath(pkgPath)) {
    return { success: false, error: 'Invalid package path' };
  }
  try {
    await openInstaller(pkgPath);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('app:launch', (event: IpcMainInvokeEvent) => {
  if (!isTrustedSender(event.sender)) return;
  setupWindow?.close();
  createMainWindow();
});

ipcMain.handle('app:skip', (event: IpcMainInvokeEvent) => {
  if (!isTrustedSender(event.sender)) return;
  setupWindow?.close();
  createMainWindow();
});
