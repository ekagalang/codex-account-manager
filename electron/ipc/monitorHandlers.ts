import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'

const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const AUTH_FILE = path.join(CODEX_HOME, 'auth.json')
const SESSION_TTL_DAYS = 8

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch { return null }
}

function httpsGet(url: string, headers: Record<string, string>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode ?? 0, body: data }) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

export function registerMonitorHandlers(ipcMain: IpcMain) {

  ipcMain.handle('monitor:sessionInfo', () => {
    if (!fs.existsSync(AUTH_FILE)) return { loggedIn: false }
    try {
      const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
      const lastRefresh = auth.last_refresh ? new Date(auth.last_refresh) : null
      const now = new Date()
      const ageDays = lastRefresh
        ? Math.floor((now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const expiresInDays = ageDays !== null ? SESSION_TTL_DAYS - ageDays : null

      let planType: string | null = null
      let subscriptionUntil: string | null = null
      if (auth?.tokens?.access_token) {
        const payload = decodeJwt(auth.tokens.access_token)
        const openaiAuth = payload?.['https://api.openai.com/auth']
        planType = openaiAuth?.chatgpt_plan_type ?? null
        subscriptionUntil = openaiAuth?.chatgpt_subscription_active_until ?? null
      }

      return {
        loggedIn: true,
        authMode: auth.auth_mode ?? 'unknown',
        hasRefreshToken: !!auth.tokens?.refresh_token,
        lastRefresh: lastRefresh?.toISOString() ?? null,
        ageDays,
        expiresInDays,
        planType,
        subscriptionUntil,
        accessToken: auth.tokens?.access_token ?? null,
        accountId: auth.tokens?.account_id ?? null,
      }
    } catch { return { loggedIn: false, error: 'Gagal membaca auth.json' } }
  })

  // Fetch quota dari endpoint yang sama yang dipakai Codex CLI
  ipcMain.handle('monitor:usage', async () => {
    if (!fs.existsSync(AUTH_FILE)) return { error: 'Tidak ada sesi aktif' }

    try {
      const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
      const accessToken = auth?.tokens?.access_token
      const accountId = auth?.tokens?.account_id

      if (!accessToken) return { error: 'Access token tidak ditemukan' }

      const res = await httpsGet(
        'https://chatgpt.com/backend-api/wham/usage',
        {
          'Authorization': `Bearer ${accessToken}`,
          'ChatGPT-Account-Id': accountId ?? '',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        }
      )

      if (res.status === 403) {
        return { error: 'Akses ditolak (403). Coba login ulang via Accounts.' }
      }
      if (res.status === 401) {
        return { error: 'Token expired (401). Silakan login ulang.' }
      }
      if (res.status !== 200) {
        return { error: `Server error (${res.status})` }
      }

      // DEBUG — hapus setelah ketemu struktur response
      console.log('[wham/usage] status:', res.status)
      console.log('[wham/usage] raw response:', JSON.stringify(res.body, null, 2))

      const data = res.body
      const rateLimit = data.rate_limit

      // Parse window berdasarkan struktur asli response
      const parseWindow = (w: any, label: string) => {
        if (!w) return null

        const usedPercent: number = w.used_percent ?? 0
        const windowSeconds: number = w.limit_window_seconds ?? 0
        const resetAfterSeconds: number = w.reset_after_seconds ?? 0
        const resetAt: number = w.reset_at ?? null

        // Hitung used & remaining dari used_percent dan window duration
        // Codex pakai "messages" sebagai unit, bukan request
        // Estimasi dari used_percent saja karena limit absolut tidak diberikan
        const usedPercentRounded = Math.round(usedPercent)
        const remainingPercent = Math.max(0, 100 - usedPercentRounded)

        // Reset time dari unix timestamp
        const resetAtISO = resetAt
          ? new Date(resetAt * 1000).toISOString()
          : null

        // Window duration label
        const windowHours = Math.round(windowSeconds / 3600)

        return {
          label,
          usedPercent: usedPercentRounded,
          remainingPercent,
          windowHours,
          resetAt: resetAtISO,
          resetAfterSeconds,
          allowed: rateLimit?.allowed ?? true,
          limitReached: rateLimit?.limit_reached ?? false,
        }
      }

      // Credits info
      const credits = data.credits ?? null

      return {
        success: true,
        raw: data,
        allowed: rateLimit?.allowed ?? true,
        limitReached: rateLimit?.limit_reached ?? false,
        planType: data.plan_type ?? null,
        email: data.email ?? null,
        fiveHour: parseWindow(rateLimit?.primary_window, '5 jam'),
        weekly: parseWindow(rateLimit?.secondary_window, 'Mingguan'),
        credits: credits ? {
          hasCredits: credits.has_credits,
          unlimited: credits.unlimited,
          balance: credits.balance,
          approxLocalMessages: credits.approx_local_messages ?? null,
          approxCloudMessages: credits.approx_cloud_messages ?? null,
        } : null,
      }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  // Fetch usage untuk akun spesifik berdasarkan auth.json di backup folder
  ipcMain.handle('monitor:usageByEmail', async (_e, email: string) => {
    try {
      const sanitize = (e: string) => e.replace(/[^a-zA-Z0-9._-]/g, '_')
      const MANAGER_DIR = path.join(os.homedir(), '.codex-manager', 'accounts')
      const authPath = path.join(MANAGER_DIR, sanitize(email), 'auth.json')

      // Akun aktif — pakai auth.json langsung
      const filePath = fs.existsSync(authPath) ? authPath : AUTH_FILE
      if (!fs.existsSync(filePath)) return { error: 'No auth file' }

      const auth = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const accessToken = auth?.tokens?.access_token
      const accountId = auth?.tokens?.account_id

      if (!accessToken) return { error: 'No access token' }

      const res = await httpsGet(
        'https://chatgpt.com/backend-api/wham/usage',
        {
          'Authorization': `Bearer ${accessToken}`,
          'ChatGPT-Account-Id': accountId ?? '',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        }
      )

      if (res.status !== 200) return { error: `HTTP ${res.status}` }

      const rateLimit = res.body?.rate_limit
      if (!rateLimit) return { error: 'No rate limit data' }

      const primary = rateLimit.primary_window
      const secondary = rateLimit.secondary_window

      return {
        success: true,
        allowed: rateLimit.allowed ?? true,
        limitReached: rateLimit.limit_reached ?? false,
        fiveHour: primary ? {
          usedPercent: Math.round(primary.used_percent ?? 0),
          resetAfterSeconds: primary.reset_after_seconds ?? 0,
        } : null,
        weekly: secondary ? {
          usedPercent: Math.round(secondary.used_percent ?? 0),
          resetAfterSeconds: secondary.reset_after_seconds ?? 0,
        } : null,
      }
    } catch (e: any) {
      return { error: e.message }
    }
  })
}