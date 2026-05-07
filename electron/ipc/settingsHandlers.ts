import { IpcMain, app, nativeTheme } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const CONFIG_FILE = path.join(CODEX_HOME, 'config.toml')

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  notifySessionExpiry: boolean
  notifyQuotaThreshold: number | null
  launchAtStartup: boolean
  codexHome: string
  globalShortcut: string
}

const DEFAULTS: Settings = {
  theme: 'dark',
  notifySessionExpiry: true,
  notifyQuotaThreshold: 80,
  launchAtStartup: false,
  codexHome: path.join(os.homedir(), '.codex'),
  globalShortcut: 'CommandOrControl+Shift+A',
}

function readSettings(): Settings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeSettings(s: Settings): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf-8')
}

export function registerSettingsHandlers(ipcMain: IpcMain) {

  ipcMain.handle('settings:get', () => readSettings())

  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const current = readSettings()
    const updated = { ...current, ...patch }
    writeSettings(updated)
    if (patch.theme) {
      nativeTheme.themeSource = patch.theme
    }
    return updated
  })

  ipcMain.handle('settings:getCodexConfig', () => {
    if (!fs.existsSync(CONFIG_FILE)) return { exists: false, isFileMode: false, raw: '' }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return {
      exists: true,
      isFileMode: raw.includes('cli_auth_credentials_store = "file"'),
      raw,
    }
  })

  ipcMain.handle('settings:ensureFileMode', () => {
    let content = fs.existsSync(CONFIG_FILE)
      ? fs.readFileSync(CONFIG_FILE, 'utf-8')
      : ''
    if (content.includes('cli_auth_credentials_store')) {
      content = content.replace(
        /cli_auth_credentials_store\s*=\s*"[^"]*"/,
        'cli_auth_credentials_store = "file"'
      )
    } else {
      content = `cli_auth_credentials_store = "file"\n\n` + content
    }
    fs.mkdirSync(CODEX_HOME, { recursive: true })
    fs.writeFileSync(CONFIG_FILE, content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('settings:openFolder', (_e, folderPath: string) => {
    const { shell } = require('electron')
    shell.openPath(folderPath)
  })
}