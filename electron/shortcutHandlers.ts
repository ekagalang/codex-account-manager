import { globalShortcut, BrowserWindow, Menu, Tray, app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

const STORE_FILE = path.join(app.getPath('userData'), 'accounts.json')
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

function readStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return { accounts: [], activeEmail: null }
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
  } catch { return { accounts: [], activeEmail: null } }
}

function readShortcut(): string {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return 'CommandOrControl+Shift+A'
    const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    return s.globalShortcut ?? 'CommandOrControl+Shift+A'
  } catch { return 'CommandOrControl+Shift+A' }
}

let currentShortcut: string | null = null
let quickSwitchWindow: BrowserWindow | null = null

// Buat floating mini window untuk quick switch
function createQuickSwitchWindow(getMainWindow: () => BrowserWindow | null) {
  if (quickSwitchWindow && !quickSwitchWindow.isDestroyed()) {
    quickSwitchWindow.close()
    quickSwitchWindow = null
    return
  }

  const store = readStore()
  const accounts: any[] = store.accounts ?? []

  if (accounts.length === 0) {
    // Tidak ada akun — buka main window saja
    const win = getMainWindow()
    if (win) { win.show(); win.focus() }
    return
  }

  // Buat popup window kecil di tengah layar
  quickSwitchWindow = new BrowserWindow({
    width: 320,
    height: Math.min(48 + accounts.length * 56 + 16, 400),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Center di layar
  quickSwitchWindow.center()

  // Tutup kalau blur (klik di luar)
  quickSwitchWindow.on('blur', () => {
    if (quickSwitchWindow && !quickSwitchWindow.isDestroyed()) {
      quickSwitchWindow.close()
      quickSwitchWindow = null
    }
  })

  // Build HTML inline untuk quick switch popup
  const activeEmail = store.activeEmail
  const accountsHtml = accounts.map((acc, i) => {
    const isActive = acc.email === activeEmail
    return `
      <div
        class="account-item ${isActive ? 'active' : ''}"
        onclick="window.electronAPI.switchAccount('${acc.email}').then(() => window.close())"
        tabindex="${i}"
      >
        <div class="avatar">${acc.name.slice(0, 2).toUpperCase()}</div>
        <div class="info">
          <div class="name">${acc.name}</div>
          <div class="email">${acc.email}</div>
        </div>
        ${isActive ? '<div class="badge">Active</div>' : '<div class="badge inactive">Switch</div>'}
      </div>
    `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #fff;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          user-select: none;
        }
        .header {
          padding: 10px 14px 8px;
          border-bottom: 1px solid #f4f4f5;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-title {
          font-size: 11px;
          font-weight: 600;
          color: #71717a;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .header-hint {
          font-size: 10px;
          color: #a1a1aa;
        }
        .accounts { padding: 6px; }
        .account-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background .1s;
          margin-bottom: 2px;
        }
        .account-item:hover { background: #f4f4f5; }
        .account-item.active { background: #f4f4f5; }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e4e4e7;
          color: #52525b;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .active .avatar { background: #18181b; color: #fff; }
        .info { flex: 1; min-width: 0; }
        .name {
          font-size: 13px;
          font-weight: 500;
          color: #18181b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .email {
          font-size: 11px;
          color: #71717a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
        .badge {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 20px;
          background: #18181b;
          color: #fff;
          flex-shrink: 0;
        }
        .badge.inactive {
          background: transparent;
          color: #a1a1aa;
          border: 1px solid #e4e4e7;
        }
        .account-item:hover .badge.inactive {
          background: #f4f4f5;
          color: #52525b;
          border-color: #d4d4d8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <span class="header-title">Quick Switch</span>
        <span class="header-hint">ESC to close</span>
      </div>
      <div class="accounts">
        ${accountsHtml}
      </div>
      <script>
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') window.close()
        })
      </script>
    </body>
    </html>
  `

  // Load dari data URL
  quickSwitchWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  )
}

export function registerShortcuts(
  getMainWindow: () => BrowserWindow | null
) {
  const shortcut = readShortcut()
  registerGlobalShortcut(shortcut, getMainWindow)
}

export function registerGlobalShortcut(
  accelerator: string,
  getMainWindow: () => BrowserWindow | null
): boolean {
  // Unregister shortcut lama dulu
  if (currentShortcut) {
    try { globalShortcut.unregister(currentShortcut) } catch {}
    currentShortcut = null
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      createQuickSwitchWindow(getMainWindow)
    })

    if (ok) {
      currentShortcut = accelerator
      console.log('[Shortcut] Registered:', accelerator)
    } else {
      console.warn('[Shortcut] Failed to register:', accelerator, '— mungkin sudah dipakai app lain')
    }

    return ok
  } catch (e) {
    console.error('[Shortcut] Error:', e)
    return false
  }
}

export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
  currentShortcut = null
}

export function getCurrentShortcut(): string | null {
  return currentShortcut
}