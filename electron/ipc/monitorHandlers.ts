import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'

const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
const AUTH_FILE = path.join(CODEX_HOME, 'auth.json')
const SESSION_TTL_DAYS = 8

// Decode JWT payload tanpa verify
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

// Helper fetch pakai Node https (tidak ada axios/fetch di main process)
function httpsGet(url: string, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

export function registerMonitorHandlers(ipcMain: IpcMain) {

  ipcMain.handle('monitor:sessionInfo', () => {
    if (!fs.existsSync(AUTH_FILE)) return { loggedIn: false }

    try {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8')
      const auth = JSON.parse(raw)

      const lastRefresh = auth.last_refresh ? new Date(auth.last_refresh) : null
      const now = new Date()
      const ageMs = lastRefresh ? now.getTime() - lastRefresh.getTime() : null
      const ageDays = ageMs !== null ? Math.floor(ageMs / (1000 * 60 * 60 * 24)) : null
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
        accountId: auth.tokens?.account_id ?? null,
        planType,
        subscriptionUntil,
        accessToken: auth.tokens?.access_token ?? null,
      }
    } catch {
      return { loggedIn: false, error: 'Gagal membaca auth.json' }
    }
  })

  // Fetch usage & rate limit dari OpenAI API
  ipcMain.handle('monitor:usage', async () => {
    if (!fs.existsSync(AUTH_FILE)) {
      return { error: 'Tidak ada sesi aktif' }
    }

    try {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8')
      const auth = JSON.parse(raw)
      const accessToken = auth?.tokens?.access_token

      if (!accessToken) {
        return { error: 'Access token tidak ditemukan' }
      }

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }

      // Fetch usage bulan ini
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      // Fetch subscription/limits info
      const [usageRes, subRes] = await Promise.allSettled([
        httpsGet(
          `https://api.openai.com/v1/usage?date=${today}`,
          headers
        ),
        httpsGet(
          'https://api.openai.com/v1/dashboard/billing/subscription',
          headers
        ),
      ])

      // Parse subscription data
      let hardLimit: number | null = null
      let softLimit: number | null = null
      let planName: string | null = null

      if (subRes.status === 'fulfilled' && subRes.value.status === 200) {
        const sub = subRes.value.body
        hardLimit = sub.hard_limit_usd ?? null
        softLimit = sub.soft_limit_usd ?? null
        planName = sub.plan?.title ?? null
      }

      // Fetch monthly usage (billing endpoint)
      const billingRes = await httpsGet(
        `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startOfMonth}&end_date=${today}`,
        headers
      ).catch(() => null)

      let usedUsd: number | null = null
      let remainingUsd: number | null = null
      let usagePercent: number | null = null

      if (billingRes?.status === 200) {
        usedUsd = (billingRes.body.total_usage ?? 0) / 100 // cents → USD
        if (hardLimit !== null) {
          remainingUsd = hardLimit - usedUsd
          usagePercent = Math.round((usedUsd / hardLimit) * 100)
        }
      }

      // Rate limit info — coba dari headers atau usage endpoint
      let resetTime: string | null = null
      let requestsUsed: number | null = null
      let requestsLimit: number | null = null

      if (usageRes.status === 'fulfilled' && usageRes.value.status === 200) {
        const usage = usageRes.value.body
        requestsUsed = usage?.data?.[0]?.n_requests ?? null
        // Next reset = besok jam 00:00 UTC
        const tomorrow = new Date(now)
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        tomorrow.setUTCHours(0, 0, 0, 0)
        resetTime = tomorrow.toISOString()
      }

      return {
        success: true,
        usedUsd: usedUsd !== null ? Math.round(usedUsd * 100) / 100 : null,
        remainingUsd: remainingUsd !== null ? Math.round(remainingUsd * 100) / 100 : null,
        hardLimit,
        softLimit,
        usagePercent,
        planName,
        requestsUsed,
        requestsLimit,
        resetTime,
        periodStart: startOfMonth,
        periodEnd: today,
      }
    } catch (e: any) {
      return { error: e.message }
    }
  })
}