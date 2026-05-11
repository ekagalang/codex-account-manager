import { IpcMain, app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn, exec } from 'child_process'

// --- PATHS ---
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const AUTH_FILE = path.join(CODEX_HOME, 'auth.json')
const MANAGER_DIR = path.join(os.homedir(), '.codex-manager', 'accounts')
const STORE_FILE = path.join(app.getPath('userData'), 'accounts.json')

// --- TYPES ---
interface Account {
  name: string
  email: string
  addedAt: string
  lastUsed?: string
}

interface Store {
  accounts: Account[]
  activeEmail: string | null
}

// --- STORE HELPERS ---
function readStore(): Store {
  try {
    if (!fs.existsSync(STORE_FILE)) return { accounts: [], activeEmail: null }
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
  } catch {
    return { accounts: [], activeEmail: null }
  }
}

function writeStore(data: Store): void {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true })
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function copyFileAtomic(src: string, dest: string): void {
  const tmp = dest + '.tmp'
  fs.copyFileSync(src, tmp)
  fs.renameSync(tmp, dest)
}

// --- JWT DECODER ---
// Decode payload JWT tanpa verify signature (kita trust file lokal sendiri)
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

// --- EMAIL EXTRACTOR ---
// Baca email dari auth.json dengan beberapa fallback
function extractEmailFromAuth(auth: any): string | null {
  try {
    // Cara 1: decode access_token JWT — paling reliable
    if (auth?.tokens?.access_token) {
      const payload = decodeJwtPayload(auth.tokens.access_token)
      const email = payload?.['https://api.openai.com/profile']?.email
      if (email) return email
    }

    // Cara 2: decode id_token JWT
    if (auth?.tokens?.id_token) {
      const payload = decodeJwtPayload(auth.tokens.id_token)
      if (payload?.email) return payload.email
    }

    // Cara 3: field langsung (fallback untuk format auth lain)
    return auth?.email ?? auth?.user?.email ?? null
  } catch {
    return null
  }
}

// --- IPC HANDLERS ---
export function registerAccountHandlers(ipcMain: IpcMain) {

  ipcMain.handle('accounts:list', () => {
    return readStore().accounts
  })

  ipcMain.handle('accounts:getActive', () => {
    return readStore().activeEmail
  })

  ipcMain.handle('accounts:add', async (_event, name: string, email: string) => {
    if (!fs.existsSync(AUTH_FILE)) {
      throw new Error('No active session.\n\nPlease sign in first with: codex login')
    }

    const store = readStore()
    const activeEmailBeforeAdd = store.activeEmail

    if (store.accounts.find(a => a.email === email)) {
      throw new Error(`Account "${email}" is already saved.`)
    }

    let activeBackupPath: string | null = null
    if (activeEmailBeforeAdd) {
      activeBackupPath = path.join(
        MANAGER_DIR,
        sanitizeEmail(activeEmailBeforeAdd),
        'auth.json'
      )

      if (!fs.existsSync(activeBackupPath)) {
        throw new Error(
          `Cannot save account without switching session.\n` +
          `Backup for active account "${activeEmailBeforeAdd}" was not found.\n\n` +
          `Please switch to another saved account first, then try again.`
        )
      }
    }

    const accountDir = path.join(MANAGER_DIR, sanitizeEmail(email))
    fs.mkdirSync(accountDir, { recursive: true })
    copyFileAtomic(AUTH_FILE, path.join(accountDir, 'auth.json'))

    store.accounts.push({
      name,
      email,
      addedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    })

    // Menambah akun tidak boleh mengubah akun aktif.
    if (activeBackupPath) {
      fs.mkdirSync(CODEX_HOME, { recursive: true })
      copyFileAtomic(activeBackupPath, AUTH_FILE)
    }

    writeStore(store)
    return { success: true }
  })

  ipcMain.handle('accounts:switch', async (_event, email: string) => {
    const store = readStore()

    if (store.activeEmail === email) {
      return { success: true, alreadyActive: true }
    }

    const targetAuthPath = path.join(
      MANAGER_DIR,
      sanitizeEmail(email),
      'auth.json'
    )

    if (!fs.existsSync(targetAuthPath)) {
      throw new Error(
        `Credentials for "${email}" were not found.\nTry deleting and re-adding this account.`
      )
    }

    // ✅ JANGAN backup auth.json aktif sekarang
    // Alasan: Codex CLI mungkin sudah refresh token → file kita backup bisa stale
    // Token lama yang di-restore akan langsung invalid (refresh_token_reused)
    //
    // Backup HANYA dilakukan saat user menambah akun (accounts:add)
    // sehingga snapshot yang tersimpan adalah token fresh hasil login

    // Tempel credentials akun target ke ~/.codex/auth.json
    fs.mkdirSync(CODEX_HOME, { recursive: true })
    copyFileAtomic(targetAuthPath, AUTH_FILE)

    // Update store
    store.activeEmail = email
    const account = store.accounts.find(a => a.email === email)
    if (account) account.lastUsed = new Date().toISOString()
    writeStore(store)

    return { success: true, switched: email }
  })

  // Panggil ini setelah Codex selesai refresh token
  // supaya backup selalu punya token terbaru
  ipcMain.handle('accounts:refreshBackup', async () => {
    try {
      if (!fs.existsSync(AUTH_FILE)) return { success: false }

      const store = readStore()
      const activeEmail = store.activeEmail
      if (!activeEmail) return { success: false }

      // Overwrite backup dengan auth.json terkini
      const backupDir = path.join(MANAGER_DIR, sanitizeEmail(activeEmail))
      fs.mkdirSync(backupDir, { recursive: true })
      copyFileAtomic(AUTH_FILE, path.join(backupDir, 'auth.json'))

      return { success: true, email: activeEmail }
    } catch {
      return { success: false }
    }
  })

  ipcMain.handle('accounts:delete', async (_event, email: string) => {
    const store = readStore()

    if (store.activeEmail === email) {
      throw new Error('Cannot delete the currently active account.\nSwitch to another account first.')
    }

    const accountDir = path.join(MANAGER_DIR, sanitizeEmail(email))
    if (fs.existsSync(accountDir)) {
      fs.rmSync(accountDir, { recursive: true, force: true })
    }

    store.accounts = store.accounts.filter(a => a.email !== email)
    writeStore(store)
    return { success: true }
  })

  // Baca email dari auth.json aktif — pakai JWT decoder
  ipcMain.handle('accounts:readCurrentEmail', async () => {
    try {
      if (!fs.existsSync(AUTH_FILE)) return { email: null }
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8')
      const auth = JSON.parse(raw)
      const email = extractEmailFromAuth(auth)
      return { email }
    } catch {
      return { email: null }
    }
  })

  // Jalankan codex login + watch auth.json untuk detect selesai
  ipcMain.handle('accounts:login', async () => {
    return new Promise((resolve, reject) => {

      // Pastikan folder ~/.codex ada
      fs.mkdirSync(CODEX_HOME, { recursive: true })

      // Catat waktu sebelum login — untuk detect file baru
      const beforeLogin = Date.now()

      // Cari npm global bin path di Windows
      const npmGlobalBin = path.join(
        process.env.APPDATA ?? os.homedir(),
        'npm'
      )

      const env = {
        ...process.env,
        PATH: `${npmGlobalBin};${process.env.PATH ?? ''}`,
      }

      // Spawn codex login
      const child = spawn('codex', ['login'], {
        stdio: 'pipe',
        shell: true,
        env,
      })

      let output = ''
      let urlOpened = false

      const handleOutput = (text: string) => {
      output += text
      if (!urlOpened) {
        // Hanya match URL yang benar-benar HTTP/HTTPS web URL
        // Exclude path file lokal (C:\, /home/, dll)
        const urlMatch = text.match(/https?:\/\/[a-zA-Z0-9][^\s\n\r"']+/)
        if (urlMatch) {
          const url = urlMatch[0]
          // Double check: harus domain valid, bukan path lokal
          if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url)
            urlOpened = true
          }
        }
      }
    }

      child.stdout?.on('data', (data: Buffer) => handleOutput(data.toString()))
      child.stderr?.on('data', (data: Buffer) => handleOutput(data.toString()))

      // Watch auth.json — kalau berubah setelah login dimulai = sukses
      let watcher: fs.FSWatcher | null = null
      let settled = false

      const settle = (success: boolean, msg?: string) => {
        if (settled) return
        settled = true
        watcher?.close()
        child.kill()
        if (success) {
          resolve({ success: true })
        } else {
          reject(new Error(msg ?? 'Login failed'))
        }
      }

      try {
        watcher = fs.watch(CODEX_HOME, (_event, filename) => {
          if (filename === 'auth.json') {
            // Pastikan file memang baru dimodifikasi setelah login dimulai
            try {
              const stat = fs.statSync(AUTH_FILE)
              if (stat.mtimeMs > beforeLogin) {
                // Tunggu sebentar supaya file selesai ditulis
                setTimeout(() => settle(true), 500)
              }
            } catch { /* file belum ada */ }
          }
        })
      } catch {
        // Folder belum ada — tidak bisa watch, fallback ke process exit
      }

      child.on('close', (code: number | null) => {
        if (code === 0) {
          settle(true)
        } else if (!settled) {
          settle(false, `codex login failed (exit code ${code})\n\n${output}`)
        }
      })

      child.on('error', (err: Error) => {
        settle(false,
          `Codex CLI was not found in PATH.\n\n` +
          `Make sure it is installed:\nnpm install -g @openai/codex\n\n` +
          `Then try manual login first:\ncodex login\n\n` +
          `Detail: ${err.message}`
        )
      })

      // Timeout 5 menit — kalau user keburu lama
      setTimeout(() => {
        if (!settled) settle(false, 'Login timeout (5 minutes). Please try again.')
      }, 5 * 60 * 1000)
    })
  })

  // Cek apakah codex CLI terinstall
  ipcMain.handle('accounts:checkCli', async () => {
    return new Promise((resolve) => {
      exec('codex --version', (error, stdout) => {
        if (error) {
          resolve({ installed: false })
        } else {
          // stdout adalah Buffer atau string — cast eksplisit
          const version = String(stdout).trim()
          resolve({ installed: true, version })
        }
      })
    })
  })
}
