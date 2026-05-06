import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerAccountHandlers } from './ipc/accountHandlers'
import { registerMonitorHandlers } from './ipc/monitorHandlers'
import { registerConfigHandlers } from './ipc/configHandlers'
import { shell } from 'electron'

const isDev = process.env.NODE_ENV === 'development'
const DEV_PORT = process.env.DEV_PORT || '5174'

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 720,
    minHeight: 500,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL(`http://localhost:${DEV_PORT}`)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.on('did-finish-load', () => {
    console.log('[Electron] Loaded:', win.webContents.getURL())
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[Electron] Failed to load ${url} — ${code} ${desc}`)
  })
}

app.whenReady().then(() => {
  // Daftarkan semua IPC handlers sebelum window dibuat
  registerAccountHandlers(ipcMain)
  registerMonitorHandlers(ipcMain)
  registerConfigHandlers(ipcMain)

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})