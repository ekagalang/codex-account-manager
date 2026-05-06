import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const CONFIG_FILE = path.join(CODEX_HOME, 'config.toml')

export function registerConfigHandlers(ipcMain: IpcMain) {

  ipcMain.handle('config:get', () => {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { exists: false, isFileMode: false }
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const isFileMode = raw.includes('cli_auth_credentials_store = "file"')
    return { exists: true, isFileMode, raw }
  })

  // Pastikan config.toml sudah pakai file mode
  // Wajib untuk account switching bisa bekerja
  ipcMain.handle('config:ensureFileMode', () => {
    let content = ''

    if (fs.existsSync(CONFIG_FILE)) {
      content = fs.readFileSync(CONFIG_FILE, 'utf-8')
    }

    if (content.includes('cli_auth_credentials_store')) {
      // Sudah ada — replace nilainya ke "file"
      content = content.replace(
        /cli_auth_credentials_store\s*=\s*"[^"]*"/,
        'cli_auth_credentials_store = "file"'
      )
    } else {
      // Belum ada — tambah di atas
      content = `cli_auth_credentials_store = "file"\n\n` + content
    }

    fs.mkdirSync(CODEX_HOME, { recursive: true })
    fs.writeFileSync(CONFIG_FILE, content, 'utf-8')
    return { success: true }
  })
}