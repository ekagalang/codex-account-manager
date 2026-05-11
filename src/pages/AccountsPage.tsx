import { useState, useEffect, useCallback } from 'react'
import type { Account, AccountUsage } from '@/types'

// --- SUB COMPONENTS ---

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const colors: Record<string, string> = {
    A: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    B: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    C: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30',
    D: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    E: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
    F: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  }
  const key = name[0]?.toUpperCase() ?? 'A'
  const colorClass = colors[key] ?? 'bg-zinc-800 text-zinc-200 border-zinc-700'

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${colorClass}`}>
      {initials}
    </div>
  )
}

function ActiveBanner({ email }: { email: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-zinc-500">Active account</p>
        <p className="truncate text-sm font-medium text-zinc-100">{email}</p>
      </div>
      <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] text-emerald-300">
        Active
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
        <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-200">No saved accounts yet</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
        First, add account by click button {' '}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono">Add Account</code>
      </p>
    </div>
  )
}

type Step = 'choose' | 'login' | 'save'

interface AddModalProps {
  onClose: () => void
  onSave: (name: string, email: string) => Promise<void>
}

function AddModal({ onClose, onSave }: AddModalProps) {
  const [step, setStep] = useState<Step>('choose')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginDone, setLoginDone] = useState(false)

  // Auto-detect email dari auth.json setelah login
  const detectEmail = async () => {
    const result = await window.electronAPI.readCurrentEmail()
    if (result.email) setEmail(result.email)
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await window.electronAPI.loginCodex()
      setLoginDone(true)
      await detectEmail()
      setStep('save')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSave(name.trim(), email.trim())
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[380px] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-cyan-950/20">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {step === 'choose' && 'Add account'}
              {step === 'login'  && 'Login'}
              {step === 'save'   && 'Save account'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {step === 'choose' && 'Choose how to add an account'}
              {step === 'login'  && 'Start Codex browser login'}
              {step === 'save'   && 'Give this account a name'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {(['choose', 'login', 'save'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={[
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors',
                step === s
                  ? 'bg-cyan-400 text-zinc-900'
                  : (['choose', 'login', 'save'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-900 text-zinc-500',
              ].join(' ')}>
                {(['choose', 'login', 'save'].indexOf(step) > i) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-700" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Choose */}
        {step === 'choose' && (
          <div className="space-y-2 mb-5">
            {/* Opsi 1: Login baru */}
            <button
              onClick={() => setStep('login')}
              className="w-full flex items-start gap-3 p-3.5 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15">
                <svg className="h-4 w-4 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sign in with a new account</p>
                <p className="text-xs text-zinc-400 mt-0.5">Open browser to sign in with Google via Codex CLI</p>
              </div>
            </button>

            {/* Opsi 2: Sudah login manual */}
            <button
              onClick={async () => {
                await detectEmail()
                setStep('save')
              }}
              className="w-full rounded-xl border border-zinc-800 p-3.5 text-left transition-colors hover:border-cyan-400/40 hover:bg-zinc-900"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <svg className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Already signed in from terminal</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You already ran{' '}
                  <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">codex login</code>
                  {' '}in terminal — save this session
                </p>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: Login */}
        {step === 'login' && (
          <div className="mb-5">
            {!loading && !loginDone ? (
              // Belum mulai
              <div className="flex flex-col items-center py-6 text-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15">
                  <svg className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sign in via browser</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Click the button below — browser will open automatically for Google sign-in
                  </p>
                </div>
              </div>
            ) : loading && !loginDone ? (
              // Sedang menunggu
              <div className="flex flex-col items-center py-6 text-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15">
                    <svg className="h-5 w-5 animate-spin text-cyan-300" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  </div>
                  <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Waiting for sign-in...</p>
                  <p className="text-xs text-zinc-400 mt-1">Complete sign-in in the opened browser</p>
                </div>
                <div className="w-full rounded-lg bg-zinc-900 px-3 py-2.5 text-left">
                  <p className="text-[10px] text-zinc-400 mb-1">Steps:</p>
                  <ol className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Browser has opened automatically</li>
                    <li>Sign in with your Google account</li>
                    <li>The app will detect completion automatically</li>
                  </ol>
                </div>
              </div>
            ) : (
              // Login selesai
              <div className="flex flex-col items-center py-6 text-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg className="h-5 w-5 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sign-in successful!</p>
                  <p className="text-xs text-zinc-400 mt-1">Continue to name this account</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Save */}
        {step === 'save' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Account name / label</label>
              <input
                type="text"
                placeholder="e.g. Work, Personal, Client A"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="nama@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
              {email && (
                <p className="text-[10px] text-green-500 mt-1">✓ Auto-detected from active session</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <p className="whitespace-pre-line text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (step === 'choose') onClose()
              else setStep(step === 'save' && !loginDone ? 'choose' : 'choose')
            }}
            className="flex-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            {step === 'choose' ? 'Cancel' : 'Back'}
          </button>

          {step === 'login' && !loginDone && (
            <button
              onClick={handleLogin}
              disabled={loading}
               className="flex-1 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? 'Waiting...' : 'Open browser →'}
            </button>
          )}

          {step === 'save' && (
            <button
              onClick={handleSave}
              disabled={loading}
               className="flex-1 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save account'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface AccountCardProps {
  account: Account
  isActive: boolean
  isSwitching: boolean
  usage?: AccountUsage
  usageLoading: boolean
  onSwitch: () => void
  onDelete: () => void
}

function AccountCard({
  account,
  isActive,
  isSwitching,
  usage,
  usageLoading,
  onSwitch,
  onDelete,
}: AccountCardProps) {
  const lastUsed = account.lastUsed
    ? new Date(account.lastUsed).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className={[
      'flex items-start gap-3 rounded-xl border bg-zinc-900/80 px-4 py-3 transition-colors',
      isActive
        ? 'border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
        : 'border-zinc-800 hover:border-zinc-700',
    ].join(' ')}>

      <Avatar name={account.name} />

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {account.name}
        </p>
        <p className="truncate text-xs text-zinc-500">{account.email}</p>
        {lastUsed && (
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Last used {lastUsed}
          </p>
        )}
        {/* Usage badges */}
        <UsageBadges usage={usage} loading={usageLoading} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {isActive ? (
          <span className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-200">
            Active
          </span>
        ) : (
          <button
            onClick={onSwitch}
            disabled={isSwitching}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-cyan-400/40 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSwitching ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                </svg>
                Switching...
              </span>
            ) : 'Switch →'}
          </button>
        )}

        {!isActive && (
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-red-500/15 hover:text-red-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

function UsageBadges({
  usage,
  loading,
}: {
  usage: AccountUsage | undefined
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex gap-1.5 mt-2">
        <div className="h-4 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
        <div className="h-4 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
      </div>
    )
  }

  if (!usage || usage.error || (!usage.fiveHour && !usage.weekly)) {
    return null
  }

  const getBadgeStyle = (percent: number) => {
    if (percent >= 90) return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
    if (percent >= 70) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
  }

  const formatReset = (seconds: number) => {
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
    return `${Math.round(seconds / 86400)}d`
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      {/* Limit reached badge */}
      {usage.limitReached && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 font-medium">
          LIMIT
        </span>
      )}

      {/* 5 jam window */}
      {usage.fiveHour && (
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getBadgeStyle(usage.fiveHour.usedPercent)}`}>
          5H: {usage.fiveHour.usedPercent}%
          {usage.fiveHour.usedPercent > 0 && <span className="opacity-60"> · {formatReset(usage.fiveHour.resetAfterSeconds)}</span>}
        </span>
      )}

      {/* Weekly window */}
      {usage.weekly && (
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getBadgeStyle(usage.weekly.usedPercent)}`}>
          WK: {usage.weekly.usedPercent}%
          {usage.weekly.usedPercent > 0 && <span className="opacity-60"> · {formatReset(usage.weekly.resetAfterSeconds)}</span>}
        </span>
      )}
    </div>
  )
}

// --- MAIN PAGE ---
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [switchedEmail, setSwitchedEmail] = useState<string | null>(null)
  const [usageMap, setUsageMap] = useState<Record<string, AccountUsage>>({})
  const [usageLoading, setUsageLoading] = useState(false)

    const loadUsage = useCallback(async (accs: Account[]) => {
    if (accs.length === 0) return
    setUsageLoading(true)
    try {
      // Fetch semua akun paralel
      const results = await Promise.allSettled(
        accs.map(acc => window.electronAPI.getUsageByEmail(acc.email))
      )
      const map: Record<string, AccountUsage> = {}
      accs.forEach((acc, i) => {
        const r = results[i]
        map[acc.email] = r.status === 'fulfilled' ? r.value : { error: 'Failed' }
      })
      setUsageMap(map)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    const [accs, active] = await Promise.all([
      window.electronAPI.listAccounts(),
      window.electronAPI.getActiveEmail(),
    ])
    setAccounts(accs)
    setActiveEmail(active)
    // Fetch usage setelah dapat list akun
    loadUsage(accs)
  }, [loadUsage])

  useEffect(() => {
    load()
    // Listen switch dari system tray
    window.electronAPI.onTraySwitch((email) => {
      load()
      showSwitchSuccess(email)
    })
  }, [load])

  const showSwitchSuccess = (email: string) => {
    setSwitchedEmail(email)
    // Auto-dismiss setelah 10 detik
    setTimeout(() => setSwitchedEmail(null), 10_000)
  }

  const handleSwitch = async (email: string) => {
    setSwitching(email)
    setError(null)
    try {
      await window.electronAPI.switchAccount(email)
      await load()
      showSwitchSuccess(email)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSwitching(null)
    }
  }

  const handleAdd = async (name: string, email: string) => {
    await window.electronAPI.addAccount(name, email)
    await load()
  }

  const handleDelete = async (email: string) => {
    const account = accounts.find(a => a.email === email)
    if (!confirm(`Delete account "${account?.name ?? email}"?`)) return
    setError(null)
    try {
      await window.electronAPI.deleteAccount(email)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-100">Accounts</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadUsage(accounts)}
            disabled={usageLoading}
            className="text-zinc-500 transition-colors hover:text-cyan-300 disabled:opacity-30"
            title="Refresh usage"
          >
            <svg className={`w-3.5 h-3.5 ${usageLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Account
          </button>
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* Active banner */}
        {activeEmail && <ActiveBanner email={activeEmail} />}

        {/* Error alert */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="flex-1 whitespace-pre-line text-xs text-red-200">{error}</p>
            <button onClick={() => setError(null)} className="text-red-300 transition-colors hover:text-red-100">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Success toast */}
        {switchedEmail && (
          <div className="mb-4 overflow-hidden rounded-xl border border-emerald-400/25">
            {/* Header */}
            <div className="flex items-center gap-2.5 bg-emerald-500/10 px-4 py-3">
              <svg className="h-4 w-4 shrink-0 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="flex-1 text-xs font-medium text-emerald-200">
                Switched to <span className="font-mono">{switchedEmail}</span>
              </p>
              <button
                onClick={() => setSwitchedEmail(null)}
                className="text-emerald-300 transition-colors hover:text-emerald-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Restart info */}
            <div className="border-t border-emerald-500/20 bg-zinc-950 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                To apply the account change in Codex CLI:
              </p>
              <ol className="space-y-1.5">
                {[
                  { step: '1', text: 'Close all running Codex CLI sessions', kbd: 'Ctrl+C' },
                  { step: '2', text: 'Relaunch Codex CLI', kbd: 'codex' },
                ].map(item => (
                  <li key={item.step} className="flex items-center gap-2.5">
                     <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-medium text-zinc-500">
                      {item.step}
                    </span>
                    <span className="flex-1 text-xs text-zinc-500">{item.text}</span>
                    <code className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                      {item.kbd}
                    </code>
                  </li>
                ))}
              </ol>

              {/* Quick copy command */}
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
                <code className="flex-1 text-xs font-mono text-zinc-300">
                  codex
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText('codex')}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-cyan-300"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.277c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section label */}
        {accounts.length > 0 && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-3">
            Saved accounts ({accounts.length})
          </p>
        )}

        {/* Account list */}
        {accounts.length === 0 ? (
          <EmptyState />
        ) : (
            <div className="space-y-2.5">
            {accounts.map(acc => (
              <AccountCard
                key={acc.email}
                account={acc}
                isActive={acc.email === activeEmail}
                isSwitching={switching === acc.email}
                usage={usageMap[acc.email]}
                usageLoading={usageLoading}
                onSwitch={() => handleSwitch(acc.email)}
                onDelete={() => handleDelete(acc.email)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  )
}
