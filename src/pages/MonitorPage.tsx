  import { useState, useEffect, useCallback } from 'react'
  import type { SessionInfo, UsageInfo, QuotaWindow } from '@/types'

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatUsd(val: number | null | undefined): string {
    if (val === null || val === undefined) return '-'
    return `$${val.toFixed(2)}`
  }

  function getExpiryStatus(expiresInDays: number | null | undefined) {
    if (expiresInDays === null || expiresInDays === undefined) {
      return { label: 'Unknown', color: 'text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', bar: 'bg-zinc-300', percent: 0 }
    }
    if (expiresInDays <= 0) {
      return { label: 'Expired', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500', percent: 100 }
    }
    if (expiresInDays <= 2) {
      return { label: `${expiresInDays} hari lagi`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500', percent: Math.round((1 - expiresInDays / 8) * 100) }
    }
    return { label: `${expiresInDays} hari lagi`, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', bar: 'bg-green-500', percent: Math.round((1 - expiresInDays / 8) * 100) }
  }

  function StatCard({ label, value, sub, percent, barColor }: {
    label: string; value: string; sub?: string; percent?: number; barColor?: string
  }) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
        <p className="text-xl font-medium text-zinc-900 dark:text-zinc-100 truncate">{value}</p>
        {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
        {percent !== undefined && (
          <div className="mt-2.5 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor ?? 'bg-zinc-400'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  function InfoRow({ label, value, mono = false, highlight }: {
    label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber'
  }) {
    const highlightClass = highlight === 'green'
      ? 'text-green-600 dark:text-green-400'
      : highlight === 'red'
      ? 'text-red-600 dark:text-red-400'
      : highlight === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-zinc-700 dark:text-zinc-300'

    return (
      <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className={`text-xs font-medium ${highlightClass} ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    )
  }

  function QuotaCard({ window: w }: { window: QuotaWindow }) {
    const barColor = w.usedPercent >= 90 ? 'bg-red-500'
      : w.usedPercent >= 70 ? 'bg-amber-500'
      : 'bg-green-500'

    const statusColor = w.limitReached ? 'text-red-500'
      : w.usedPercent >= 70 ? 'text-amber-500'
      : 'text-green-500'

    // Format reset time
    const resetAt = w.resetAt ? new Date(w.resetAt) : null
    const mins = Math.round(w.resetAfterSeconds / 60)
    const resetLabel = mins < 60
      ? `${mins} menit lagi`
      : mins < 1440
      ? `${Math.floor(mins / 60)} jam ${mins % 60} mnt lagi`
      : `${Math.floor(mins / 1440)} hari lagi`

    return (
      <div className={[
        'bg-white dark:bg-zinc-900 border rounded-xl p-4',
        w.limitReached
          ? 'border-red-300 dark:border-red-800'
          : 'border-zinc-200 dark:border-zinc-700',
      ].join(' ')}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{w.windowHours <= 5 ? '⚡' : '📅'}</span>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Quota {w.label}
            </p>
          </div>
          {w.limitReached ? (
            <span className="text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
              Limit tercapai
            </span>
          ) : (
            <span className={`text-[11px] font-medium ${statusColor}`}>
              {w.usedPercent}% terpakai
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(w.usedPercent, 100)}%` }}
          />
        </div>

        {/* Percent stats */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <p className={`text-lg font-medium ${statusColor}`}>
              {w.remainingPercent}%
            </p>
            <p className="text-[10px] text-zinc-400">tersisa</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {w.usedPercent}%
            </p>
            <p className="text-[10px] text-zinc-400">dipakai</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {w.windowHours}h
            </p>
            <p className="text-[10px] text-zinc-400">window</p>
          </div>
        </div>

        {/* Reset time */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <svg className="w-3 h-3 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Reset {resetLabel}
            {resetAt && (
              <span className="text-zinc-400 ml-1">
                · {resetAt.toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                  })}
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  function UsageSection({ usage, loading }: { usage: UsageInfo | null; loading: boolean }) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8 gap-2">
          <svg className="w-4 h-4 text-zinc-300 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-xs text-zinc-400">Mengambil data quota...</p>
        </div>
      )
    }

    if (!usage || usage.error) {
      return (
        <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.303-12.622c.866-1.5 3.032-1.5 3.898 0L21.303 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {usage?.error ?? 'Gagal mengambil data'}
              </p>
              <button
                onClick={() => window.electronAPI.openExternal('https://platform.openai.com/usage')}
                className="mt-1.5 text-xs text-blue-500 hover:underline font-mono"
              >
                platform.openai.com/usage ↗
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Global status banner */}
        {usage.limitReached && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Rate limit tercapai — Codex sementara tidak bisa digunakan
            </p>
          </div>
        )}

        {usage.allowed && !usage.limitReached && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs text-green-600 dark:text-green-400">
              Codex aktif dan bisa digunakan
            </p>
          </div>
        )}

        {/* Quota cards */}
        {usage.fiveHour && <QuotaCard window={usage.fiveHour} />}
        {usage.weekly && <QuotaCard window={usage.weekly} />}

        {/* Credits info kalau ada */}
        {usage.credits && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">Credits</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Balance</p>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {usage.credits.unlimited ? 'Unlimited' : `$${usage.credits.balance}`}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  function NotLoggedIn() {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tidak ada sesi aktif</p>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Login dulu via tab Accounts untuk melihat info sesi dan usage.
        </p>
      </div>
    )
  }

  export default function MonitorPage() {
    const [info, setInfo] = useState<SessionInfo | null>(null)
    const [usage, setUsage] = useState<UsageInfo | null>(null)
    const [activeEmail, setActiveEmail] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [usageLoading, setUsageLoading] = useState(false)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    const loadSession = useCallback(async () => {
      const [session, email] = await Promise.all([
        window.electronAPI.getSessionInfo(),
        window.electronAPI.getActiveEmail(),
      ])
      setInfo(session)
      setActiveEmail(email)
      setLastRefreshed(new Date())
      setLoading(false)
    }, [])

    const loadUsage = useCallback(async () => {
      setUsageLoading(true)
      try {
        const data = await window.electronAPI.getUsage()
        setUsage(data)
      } finally {
        setUsageLoading(false)
      }
    }, [])

    const loadAll = useCallback(async () => {
      await loadSession()
      await loadUsage()
    }, [loadSession, loadUsage])

    useEffect(() => { loadAll() }, [loadAll])

    // Auto-refresh session setiap 60 detik
    useEffect(() => {
      const timer = setInterval(loadSession, 60_000)
      return () => clearInterval(timer)
    }, [loadSession])

    // Auto-refresh usage setiap 5 menit
    useEffect(() => {
      const timer = setInterval(loadUsage, 5 * 60_000)
      return () => clearInterval(timer)
    }, [loadUsage])

    const expiryStatus = info?.loggedIn ? getExpiryStatus(info.expiresInDays) : null

    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Token Monitor</p>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <p className="text-[11px] text-zinc-400">
                {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              onClick={() => { setLoading(true); loadAll() }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg className="w-6 h-6 text-zinc-300 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              <p className="text-xs text-zinc-400">Memuat data...</p>
            </div>
          ) : !info?.loggedIn ? (
            <NotLoggedIn />
          ) : (
            <div className="space-y-4">

              {/* Active account banner */}
              {activeEmail && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-400">Monitoring</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{activeEmail}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    live
                  </span>
                </div>
              )}

              {/* Expiry warning */}
              {expiryStatus && (info.expiresInDays ?? 99) <= 2 && (
                <div className={`flex items-start gap-2.5 px-4 py-3 border rounded-xl ${expiryStatus.bg}`}>
                  <svg className={`w-4 h-4 mt-0.5 shrink-0 ${expiryStatus.color}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className={`text-xs font-medium ${expiryStatus.color}`}>
                      {(info.expiresInDays ?? 0) <= 0 ? 'Sesi expired!' : 'Sesi hampir expired!'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Jalankan <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">codex login</code> untuk perbarui sesi.
                    </p>
                  </div>
                </div>
              )}

              {/* Stat cards — session info */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">Sesi</p>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="Umur sesi"
                    value={info.ageDays !== null && info.ageDays !== undefined ? `${info.ageDays} hari` : '-'}
                    sub="sejak login"
                    percent={info.ageDays !== null && info.ageDays !== undefined ? Math.round((info.ageDays / 8) * 100) : 0}
                    barColor={(info.ageDays ?? 0) >= 7 ? 'bg-red-500' : (info.ageDays ?? 0) >= 5 ? 'bg-amber-500' : 'bg-green-500'}
                  />
                  <StatCard
                    label="Sisa waktu"
                    value={expiryStatus?.label ?? '-'}
                    sub="sebelum expired"
                    percent={expiryStatus?.percent ?? 0}
                    barColor={expiryStatus?.bar}
                  />
                  <StatCard
                    label="Plan"
                    value={info.planType ?? '-'}
                    sub={info.subscriptionUntil ? `s/d ${new Date(info.subscriptionUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : undefined}
                  />
                </div>
              </div>

              {/* Usage section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Usage & Limit</p>
                  <button
                    onClick={loadUsage}
                    disabled={usageLoading}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {usageLoading ? 'Memuat...' : 'Refresh ↻'}
                  </button>
                </div>
                <UsageSection usage={usage} loading={usageLoading} />
              </div>

              {/* Session detail */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">Detail sesi</p>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4">
                  <InfoRow label="Last refresh" value={formatDate(info.lastRefresh)} />
                  <InfoRow label="Auth mode" value={info.authMode ?? '-'} mono />
                  <InfoRow label="Refresh token" value={info.hasRefreshToken ? 'Tersedia ✓' : 'Tidak ada'} highlight={info.hasRefreshToken ? 'green' : 'red'} />
                  <InfoRow label="Session file" value="~/.codex/auth.json" mono />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    )
  }