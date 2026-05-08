import { Notification, app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const AUTH_FILE = path.join(CODEX_HOME, 'auth.json')

const SESSION_TTL_DAYS = 8

// --- HELPERS ---
function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return null
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
  } catch { return null }
}

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch { return null }
}

function readAuthInfo() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
  } catch { return null }
}

function notify(title: string, body: string, urgent = false) {
  if (!Notification.isSupported()) return
  const n = new Notification({
    title,
    body,
    silent: !urgent,
    // Icon dari assets kalau ada
    icon: fs.existsSync(path.join(__dirname, '../assets/tray-icon.png'))
      ? path.join(__dirname, '../assets/tray-icon.png')
      : undefined,
  })
  n.show()
}

// Track notifikasi yang sudah dikirim supaya tidak spam
const notifiedToday = new Set<string>()

function notifyOnce(key: string, title: string, body: string, urgent = false) {
  if (notifiedToday.has(key)) return
  notifiedToday.add(key)
  notify(title, body, urgent)

  // Reset key setelah 12 jam supaya bisa notif lagi besok
  setTimeout(() => notifiedToday.delete(key), 12 * 60 * 60 * 1000)
}

// --- CHECK FUNCTIONS ---

function checkSessionExpiry() {
  const settings = readSettings()
  if (!settings?.notifySessionExpiry) return

  const auth = readAuthInfo()
  if (!auth?.last_refresh) return

  const lastRefresh = new Date(auth.last_refresh)
  const ageDays = Math.floor(
    (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24)
  )
  const expiresInDays = SESSION_TTL_DAYS - ageDays

  if (expiresInDays <= 0) {
    notifyOnce(
      'session-expired',
      '⚠️ Codex Session Expired',
      'Your Codex CLI session has expired.\nRun: codex login',
      true
    )
  } else if (expiresInDays === 1) {
    notifyOnce(
      'session-expiry-1d',
      '⏰ Codex Session Expiring Soon',
      'Session will expire tomorrow.\nRun: codex login soon.',
      true
    )
  } else if (expiresInDays === 2) {
    notifyOnce(
      'session-expiry-2d',
      '⏰ Codex Session Expiring Soon',
      `Session will expire in ${expiresInDays} days.\nRun: codex login`,
      false
    )
  }
}

async function checkQuotaUsage() {
  const settings = readSettings()
  const threshold = settings?.notifyQuotaThreshold
  if (threshold === null || threshold === undefined) return

  const auth = readAuthInfo()
  const accessToken = auth?.tokens?.access_token
  const accountId = auth?.tokens?.account_id
  if (!accessToken) return

  try {
    const https = require('https')
    const result = await new Promise<any>((resolve, reject) => {
      const req = https.get(
        'https://chatgpt.com/backend-api/wham/usage',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'ChatGPT-Account-Id': accountId ?? '',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
        },
        (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => { data += chunk })
          res.on('end', () => {
            try { resolve(JSON.parse(data)) }
            catch { resolve(null) }
          })
        }
      )
      req.on('error', reject)
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')) })
    })

    if (!result?.rate_limit) return

    const primary = result.rate_limit.primary_window
    const secondary = result.rate_limit.secondary_window

    // Cek 5 jam window
    if (primary?.used_percent >= threshold) {
      notifyOnce(
        `quota-5h-${Math.floor(primary.used_percent / 10) * 10}`,
        '⚡ 5-Hour Quota Running Low',
        `5-hour usage: ${Math.round(primary.used_percent)}%\nResets in ${Math.round(primary.reset_after_seconds / 60)} minutes`,
        primary.used_percent >= 90
      )
    }

    // Cek weekly window
    if (secondary?.used_percent >= threshold) {
      notifyOnce(
        `quota-weekly-${Math.floor(secondary.used_percent / 10) * 10}`,
        '📅 Weekly Quota Running Low',
        `Weekly usage: ${Math.round(secondary.used_percent)}%\nResets in ${Math.round(secondary.reset_after_seconds / 3600)} hours`,
        secondary.used_percent >= 90
      )
    }

    // Rate limit tercapai
    if (result.rate_limit.limit_reached) {
      notifyOnce(
        'quota-limit-reached',
        '🚫 Rate Limit Reached',
        'Codex CLI is temporarily unavailable.\nWait for quota reset.',
        true
      )
    }
  } catch (e) {
    console.log('[Notify] Quota check failed:', e)
  }
}

// --- SCHEDULER ---
let checkInterval: NodeJS.Timeout | null = null

export function startNotificationScheduler() {
  // Cek pertama setelah 30 detik app launch
  setTimeout(() => {
    checkSessionExpiry()
    checkQuotaUsage()
  }, 30_000)

  // Cek rutin setiap 30 menit
  checkInterval = setInterval(() => {
    checkSessionExpiry()
    checkQuotaUsage()
  }, 30 * 60 * 1000)

  console.log('[Notify] Scheduler started — check every 30 minutes')
}

export function stopNotificationScheduler() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

// Manual trigger dari IPC
export function triggerCheck() {
  checkSessionExpiry()
  checkQuotaUsage()
}
