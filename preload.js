const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startOverlay: (opacity) => ipcRenderer.send('start-overlay', opacity),
  stopOverlay: () => ipcRenderer.send('stop-overlay'),
  resizeForPreview: () => ipcRenderer.send('resize-for-preview'),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  setContentProtection: (enabled) => ipcRenderer.send('set-content-protection', enabled),
  quitApp: () => ipcRenderer.send('quit-app'),
  onModeChanged: (callback) => ipcRenderer.on('mode-changed', (_e, mode) => callback(mode)),
  onTriggerOverlay: (callback) => ipcRenderer.on('trigger-overlay', () => callback()),
  onTriggerExit: (callback) => ipcRenderer.on('trigger-exit', () => callback()),
  onSeekVideo: (callback) => ipcRenderer.on('seek-video', (_e, delta) => callback(delta)),
});
