import { app, BrowserWindow, ipcMain, shell, nativeTheme } from 'electron'
import path from 'path'
import { registerAccountHandlers } from './ipc/accountHandlers'
import { registerMonitorHandlers } from './ipc/monitorHandlers'
import { registerConfigHandlers } from './ipc/configHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { createTray, updateTray, destroyTray } from './tray'
import { registerShortcuts, unregisterAllShortcuts, registerGlobalShortcut, getCurrentShortcut } from './shortcutHandlers'
import { startNotificationScheduler, stopNotificationScheduler, triggerCheck } from './notifications'
import { setupAutoUpdater } from './updater'

const isDev = process.env.NODE_ENV === 'development'
const DEV_PORT = process.env.DEV_PORT || '2301'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 720,
    minHeight: 500,
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${DEV_PORT}`)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Loaded:', mainWindow?.webContents.getURL())
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[Electron] Failed: ${url} — ${code} ${desc}`)
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  return mainWindow
}

app.whenReady().then(() => {
  registerAccountHandlers(ipcMain)
  registerMonitorHandlers(ipcMain)
  registerConfigHandlers(ipcMain)
  registerSettingsHandlers(ipcMain)

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })

  // Update tray setelah switch akun
  ipcMain.on('tray:update', () => updateTray())

  createWindow()

  // Register global shortcut
  registerShortcuts(() => mainWindow)

  // IPC untuk update shortcut dari settings
  ipcMain.handle('shortcut:register', (_e, accelerator: string) => {
    const ok = registerGlobalShortcut(accelerator, () => mainWindow)
    return { success: ok }
  })

  ipcMain.handle('shortcut:getCurrent', () => {
    return getCurrentShortcut()
  })

  // Buat tray setelah window ready
  createTray(() => mainWindow)

  // Setup auto updater — hanya di production
  if (!isDev) {
    setupAutoUpdater(() => mainWindow)
  }

  // Start notification scheduler
  startNotificationScheduler()

  // IPC — trigger manual check dari renderer
  ipcMain.handle('notify:check', () => {
    triggerCheck()
    return { success: true }
  })

  // TEST ONLY — hapus setelah konfirmasi notif jalan
  ipcMain.handle('notify:test', () => {
    const { Notification } = require('electron')
    console.log('[Test] Notification supported:', Notification.isSupported())
    if (Notification.isSupported()) {
      new Notification({
        title: 'Test Notifikasi',
        body: 'Notifikasi Codex Account Manager berjalan dengan baik!',
      }).show()
      return { supported: true }
    }
    return { supported: false }
  })
})

app.on('window-all-closed', () => {
  // Di production — tetap jalan di tray
  // Di dev — quit kalau bukan macOS
  if (isDev && process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})

app.on('before-quit', () => {
  (app as any).isQuiting = true
  unregisterAllShortcuts()
  destroyTray()
  stopNotificationScheduler()
})
