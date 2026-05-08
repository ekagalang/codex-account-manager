import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater as updater } from 'electron-updater'
import { request } from 'node:https'

const UPDATE_OWNER = 'ekagalang'
const UPDATE_REPO = 'codex-account-manager'

type CheckResult = { ok: true; version: string } | { ok: false; error: string }

updater.autoDownload = false
updater.autoInstallOnAppQuit = true

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? 'Unknown updater error')
}

function isMissingLatestYmlError(message: string): boolean {
  return /latest\.yml/i.test(message) && /(cannot find|404|not found)/i.test(message)
}

function compactMessage(message: string): string {
  const firstLine = message.split('\n')[0]?.trim()
  return firstLine && firstLine.length > 0 ? firstLine : 'Unknown updater error'
}

function formatUpdaterError(message: string): string {
  if (isMissingLatestYmlError(message)) {
    return 'Update metadata (latest.yml) was not found in the GitHub release assets. Re-publish the release with latest.yml, installer .exe, and .blockmap.'
  }
  return compactMessage(message)
}

function normalizeVersion(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map(part => {
      const value = Number.parseInt(part, 10)
      return Number.isFinite(value) ? value : 0
    })
}

function compareVersions(left: string, right: string): number {
  const a = normalizeVersion(left)
  const b = normalizeVersion(right)
  const maxLength = Math.max(a.length, b.length)
  for (let i = 0; i < maxLength; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

function fetchLatestReleaseVersion(): Promise<string | null> {
  return new Promise(resolve => {
    const req = request(
      {
        protocol: 'https:',
        hostname: 'api.github.com',
        path: `/repos/${UPDATE_OWNER}/${UPDATE_REPO}/releases/latest`,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'codex-account-manager-updater',
        },
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        res.on('end', () => {
          if (!res.statusCode || res.statusCode >= 400) {
            resolve(null)
            return
          }
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { tag_name?: unknown }
            if (typeof payload.tag_name !== 'string' || payload.tag_name.trim() === '') {
              resolve(null)
              return
            }
            resolve(payload.tag_name.replace(/^v/i, ''))
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.end()
  })
}

async function recoverFromMissingMetadata(getWindow: () => BrowserWindow | null): Promise<CheckResult> {
  const latestVersion = await fetchLatestReleaseVersion()
  if (!latestVersion) {
    return {
      ok: false,
      error: 'Update metadata (latest.yml) is missing from the latest GitHub release assets. Publish latest.yml, installer .exe, and .blockmap.',
    }
  }

  const currentVersion = app.getVersion()
  if (compareVersions(latestVersion, currentVersion) <= 0) {
    getWindow()?.webContents.send('updater:not-available')
    return { ok: true, version: currentVersion }
  }

  return {
    ok: false,
    error: `A newer release (v${latestVersion}) exists, but updater metadata is incomplete. Re-publish that release with latest.yml, installer .exe, and .blockmap.`,
  }
}

async function checkForUpdatesWithRecovery(getWindow: () => BrowserWindow | null): Promise<CheckResult> {
  try {
    const result = await updater.checkForUpdates()
    return { ok: true, version: result?.updateInfo?.version ?? app.getVersion() }
  } catch (error) {
    const message = getErrorMessage(error)
    if (isMissingLatestYmlError(message)) {
      return recoverFromMissingMetadata(getWindow)
    }
    return { ok: false, error: formatUpdaterError(message) }
  }
}

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {

  setTimeout(() => {
    checkForUpdatesWithRecovery(getWindow).then(result => {
      if (!result.ok) console.log('[Updater] Check failed:', result.error)
    })
  }, 10_000)

  setInterval(() => {
    checkForUpdatesWithRecovery(getWindow).then(result => {
      if (!result.ok) console.log('[Updater] Periodic check failed:', result.error)
    })
  }, 60 * 60 * 1000)

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
    const message = formatUpdaterError(getErrorMessage(err))
    console.error('[Updater] Error:', message)
    getWindow()?.webContents.send('updater:error', message)
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await updater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: formatUpdaterError(getErrorMessage(error)) }
    }
  })

  ipcMain.handle('updater:install', () => {
    updater.quitAndInstall()
  })

  ipcMain.handle('updater:check', async () => {
    const result = await checkForUpdatesWithRecovery(getWindow)
    if (!result.ok) return { success: false, error: result.error }
    return { success: true, version: result.version }
  })
}
