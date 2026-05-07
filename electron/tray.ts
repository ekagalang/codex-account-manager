import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

const STORE_FILE = path.join(app.getPath('userData'), 'accounts.json')
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const AUTH_FILE = path.join(CODEX_HOME, 'auth.json')
const MANAGER_DIR = path.join(os.homedir(), '.codex-manager', 'accounts')

function sanitize(email: string) {
  return email.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function readStore(): { accounts: any[]; activeEmail: string | null } {
  try {
    if (!fs.existsSync(STORE_FILE)) return { accounts: [], activeEmail: null }
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
  } catch { return { accounts: [], activeEmail: null } }
}

function switchAccount(email: string): boolean {
  try {
    const store = readStore()

    // Tidak backup auth.json aktif — token bisa sudah stale
    // karena Codex CLI auto-refresh di background

    const targetAuth = path.join(MANAGER_DIR, sanitize(email), 'auth.json')
    if (!fs.existsSync(targetAuth)) return false

    // Switch langsung ke target
    fs.mkdirSync(CODEX_HOME, { recursive: true })
    const tmp = AUTH_FILE + '.tmp'
    fs.copyFileSync(targetAuth, tmp)
    fs.renameSync(tmp, AUTH_FILE)

    // Update store
    store.activeEmail = email
    const acc = store.accounts?.find((a: any) => a.email === email)
    if (acc) acc.lastUsed = new Date().toISOString()
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2))

    return true
  } catch (e) {
    console.error('[Tray] Switch failed:', e)
    return false
  }
}

// Buat icon 16x16 via buffer pixel RGBA
function makeTrayIcon(): Electron.NativeImage {
  // Coba load dari file dulu
  const candidates = [
    path.join(__dirname, '../assets/tray-icon.png'),
    path.join(__dirname, '../assets/icon.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return nativeImage.createFromPath(p).resize({ width: 16, height: 16 })
    }
  }

  // Fallback: buat 16x16 solid icon dari raw RGBA buffer
  // Warna #1a1a1a (gelap) — keliatan di light & dark taskbar
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const x = i % size
    const y = Math.floor(i / size)
    const offset = i * 4

    // Buat huruf "C" sederhana di tengah
    const cx = 8; const cy = 8; const r = 6
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    const isRing = dist >= r - 1.5 && dist <= r + 0.5
    const isLeft = x < cx

    if (isRing && isLeft) {
      // Huruf C — arc kiri
      buf[offset]     = 0x00  // R
      buf[offset + 1] = 0xff  // G — cyan
      buf[offset + 2] = 0xff  // B
      buf[offset + 3] = 0xff  // A
    } else if (isRing && !isLeft) {
      // Background untuk bagian kanan C (transparan)
      buf[offset + 3] = 0x00
    } else {
      // Transparan
      buf[offset + 3] = 0x00
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

let tray: Tray | null = null

export function createTray(getWindow: () => BrowserWindow | null) {
  try {
    const icon = makeTrayIcon()
    tray = new Tray(icon)
  } catch (e) {
    console.error('[Tray] Failed to create tray:', e)
    return null
  }

  const buildMenuTemplate = () => {
    const store = readStore()
    const activeEmail = store.activeEmail
    const accounts: any[] = store.accounts ?? []

    const accountItems = accounts.map(acc => ({
      label: acc.email === activeEmail
        ? `✓  ${acc.name}`
        : `    ${acc.name}`,
      sublabel: acc.email,
      type: 'normal' as const,
      enabled: acc.email !== activeEmail,
      click: () => {
        const ok = switchAccount(acc.email)
        if (ok) {
          updateTray()

          // Kirim notifikasi OS — ingatkan user untuk restart Codex
          const { Notification } = require('electron')
          if (Notification.isSupported()) {
            new Notification({
              title: 'Codex Account Switched',
              body: `Active: ${acc.email}\n\nRestart Codex CLI agar perubahan berlaku:\n1. Ctrl+C di terminal\n2. Jalankan: codex`,
              silent: false,
            }).show()
          }

          // Notify renderer kalau window terbuka
          const win = getWindow()
          if (win && !win.isDestroyed()) {
            win.webContents.send('tray:account-switched', acc.email)
          }
        } else {
          // Gagal switch — notify juga
          const { Notification } = require('electron')
          if (Notification.isSupported()) {
            new Notification({
              title: 'Switch Failed',
              body: `Gagal switch ke ${acc.email}.\nCredentials tidak ditemukan.`,
              silent: true,
            }).show()
          }
        }
      },
    }))

    return [
      {
        label: activeEmail ? `● ${activeEmail}` : '○ No active account',
        enabled: false,
      },
      { type: 'separator' as const },
      ...(accountItems.length > 0
        ? accountItems
        : [{ label: 'No accounts saved', enabled: false }]
      ),
      { type: 'separator' as const },
      {
        label: 'Open Codex Manager',
        click: () => {
          const win = getWindow()
          if (win) {
            if (win.isMinimized()) win.restore()
            win.show()
            win.focus()
          }
        },
      },
      { type: 'separator' as const },
      {
        label: 'Quit',
        click: () => {
          (app as any).isQuiting = true
          app.quit()
        },
      },
    ]
  }

  // Set tooltip awal
  const activeEmail = readStore().activeEmail
  tray.setToolTip(activeEmail ? `Codex: ${activeEmail}` : 'Codex Account Manager')

  // Set context menu
  tray.setContextMenu(Menu.buildFromTemplate(buildMenuTemplate()))

  // Klik kiri → show window
  tray.on('click', () => {
    const win = getWindow()
    if (!win) return
    if (win.isVisible() && win.isFocused()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  // Klik kanan → rebuild menu (supaya selalu fresh)
  tray.on('right-click', () => {
    if (!tray || tray.isDestroyed()) return
    tray.setContextMenu(Menu.buildFromTemplate(buildMenuTemplate()))
    tray.popUpContextMenu()
  })

  console.log('[Tray] System tray created')
  return tray
}

export function updateTray() {
  if (!tray || tray.isDestroyed()) return
  const activeEmail = readStore().activeEmail
  tray.setToolTip(activeEmail ? `Codex: ${activeEmail}` : 'Codex Account Manager')
  console.log('[Tray] Updated:', activeEmail)
}

export function destroyTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
}