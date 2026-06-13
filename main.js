const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let win;
let isOverlay = false;
let server;
let port;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function startServer() {
  return new Promise((resolve) => {
    const rendererDir = path.join(__dirname, 'renderer');

    server = http.createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = path.join(rendererDir, filePath);

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'text/plain';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 520,
    height: 380,
    x: Math.round((width - 520) / 2),
    y: Math.round((height - 380) / 2),
    resizable: true,
    transparent: false,
    titleBarStyle: 'hidden',
    hasShadow: true,
    alwaysOnTop: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}/`);

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.meta && !input.shift && input.key === 'o') {
      event.preventDefault();
      win.webContents.send('trigger-overlay');
    }
  });
}

function resizeForPreview() {
  if (!win) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const w = 800;
  const h = 500;
  win.setSize(w, h);
  win.setPosition(Math.round((width - w) / 2), Math.round((height - h) / 2));
}

function enterOverlay(opacity) {
  if (!win) return;
  isOverlay = true;

  win.setOpacity(opacity);
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setHasShadow(false);
  win.setIgnoreMouseEvents(true, { forward: true });

  win.setWindowButtonVisibility(false);

  globalShortcut.register('CommandOrControl+Shift+O', () => exitOverlay());
  globalShortcut.register('Escape', () => { if (isOverlay) exitOverlay(); });
  globalShortcut.register('Alt+Left', () => { if (win) win.webContents.send('seek-video', -5); });
  globalShortcut.register('Alt+Right', () => { if (win) win.webContents.send('seek-video', 5); });

  win.webContents.send('mode-changed', 'overlay');
}

function exitOverlay() {
  if (!win) return;
  isOverlay = false;

  win.setWindowButtonVisibility(true);

  globalShortcut.unregister('CommandOrControl+Shift+O');
  globalShortcut.unregister('Escape');
  globalShortcut.unregister('Alt+Left');
  globalShortcut.unregister('Alt+Right');

  win.setIgnoreMouseEvents(false);
  win.setAlwaysOnTop(false);
  win.setVisibleOnAllWorkspaces(false);
  win.setOpacity(1);
  win.setHasShadow(true);
  win.setSize(520, 380);

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(Math.round((width - 520) / 2), Math.round((height - 380) / 2));

  win.webContents.send('mode-changed', 'config');
}

ipcMain.on('start-overlay', (_event, opacity) => {
  enterOverlay(opacity);
});

ipcMain.on('stop-overlay', () => {
  exitOverlay();
});

ipcMain.on('resize-for-preview', () => {
  resizeForPreview();
});

ipcMain.on('set-opacity', (_event, value) => {
  if (win) win.setOpacity(value);
});

ipcMain.on('set-ignore-mouse', (_event, ignore) => {
  if (!win) return;
  if (ignore) {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (server) server.close();
  app.quit();
});
