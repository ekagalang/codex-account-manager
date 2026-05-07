import { autoUpdater, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater as updater } from 'electron-updater'

// Konfigurasi updater
updater.autoDownload = false      // Jangan auto download — tanya user dulu
updater.autoInstallOnAppQuit = true

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {

  // Cek update saat startup — delay 10 detik supaya app siap dulu
  setTimeout(() => {
    updater.checkForUpdates().catch(err => {
      console.log('[Updater] Check failed:', err.message)
    })
  }, 10_000)

  // Cek update setiap 1 jam
  setInterval(() => {
    updater.checkForUpdates().catch(err => {
      console.log('[Updater] Periodic check failed:', err.message)
    })
  }, 60 * 60 * 1000)

  // --- Events ---

  updater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...')
    getWindow()?.webContents.send('updater:checking')
  })

  updater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    getWindow()?.webContents.send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  updater.on('update-not-available', () => {
    console.log('[Updater] Already up to date')
    getWindow()?.webContents.send('updater:not-available')
  })

  updater.on('download-progress', (progress) => {
    getWindow()?.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  updater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    getWindow()?.webContents.send('updater:downloaded', {
      version: info.version,
    })
  })

  updater.on('error', (err) => {
    console.error('[Updater] Error:', err.message)
    getWindow()?.webContents.send('updater:error', err.message)
  })

  // --- IPC Handlers ---

  // User klik "Download update"
  ipcMain.handle('updater:download', async () => {
    try {
      await updater.downloadUpdate()
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // User klik "Install & Restart"
  ipcMain.handle('updater:install', () => {
    updater.quitAndInstall()
  })

  // Manual check dari settings
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await updater.checkForUpdates()
      return { success: true, version: result?.updateInfo?.version }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}