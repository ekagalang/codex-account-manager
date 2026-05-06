import { useState, useEffect, useCallback } from 'react'
import type { Account } from '@/types'

// --- SUB COMPONENTS ---

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Warna avatar berdasarkan huruf pertama nama
  const colors: Record<string, string> = {
    A: 'bg-blue-100 text-blue-700',
    B: 'bg-purple-100 text-purple-700',
    C: 'bg-pink-100 text-pink-700',
    D: 'bg-amber-100 text-amber-700',
    E: 'bg-teal-100 text-teal-700',
    F: 'bg-rose-100 text-rose-700',
  }
  const key = name[0]?.toUpperCase() ?? 'A'
  const colorClass = colors[key] ?? 'bg-zinc-100 text-zinc-600'

  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${colorClass}`}>
      {initials}
    </div>
  )
}

function ActiveBanner({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 mb-5">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-zinc-400">Active account</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{email}</p>
      </div>
      <span className="text-[11px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full shrink-0">
        Active
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Belum ada akun tersimpan</p>
      <p className="text-xs text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
        Login dulu via terminal dengan perintah{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">codex login</code>
        , lalu klik "Save current account"
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
      setError('Nama dan email wajib diisi.')
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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 w-[360px] shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {step === 'choose' && 'Tambah akun'}
              {step === 'login'  && 'Login Codex'}
              {step === 'save'   && 'Simpan akun'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {step === 'choose' && 'Pilih cara menambah akun'}
              {step === 'login'  && 'Login via browser akan terbuka'}
              {step === 'save'   && 'Beri nama untuk akun ini'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : (['choose', 'login', 'save'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
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
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Login akun baru</p>
                <p className="text-xs text-zinc-400 mt-0.5">Buka browser untuk login Google via Codex CLI</p>
              </div>
            </button>

            {/* Opsi 2: Sudah login manual */}
            <button
              onClick={async () => {
                await detectEmail()
                setStep('save')
              }}
              className="w-full flex items-start gap-3 p-3.5 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sudah login di terminal</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sudah jalankan{' '}
                  <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">codex login</code>
                  {' '}di terminal — simpan sesi ini
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
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Login via browser</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Klik tombol di bawah — browser akan terbuka otomatis untuk login Google
                  </p>
                </div>
              </div>
            ) : loading && !loginDone ? (
              // Sedang menunggu
              <div className="flex flex-col items-center py-6 text-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Menunggu login...</p>
                  <p className="text-xs text-zinc-400 mt-1">Selesaikan login di browser yang terbuka</p>
                </div>
                <div className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-left">
                  <p className="text-[10px] text-zinc-400 mb-1">Langkah:</p>
                  <ol className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Browser sudah terbuka otomatis</li>
                    <li>Login dengan akun Google kamu</li>
                    <li>App akan otomatis detect setelah selesai</li>
                  </ol>
                </div>
              </div>
            ) : (
              // Login selesai
              <div className="flex flex-col items-center py-6 text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Login berhasil!</p>
                  <p className="text-xs text-zinc-400 mt-1">Lanjut untuk memberi nama akun ini</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Save */}
        {step === 'save' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Nama / label akun</label>
              <input
                type="text"
                placeholder="cth: Work, Personal, Client A"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition"
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
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
              {email && (
                <p className="text-[10px] text-green-500 mt-1">✓ Auto-detected dari sesi aktif</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (step === 'choose') onClose()
              else setStep(step === 'save' && !loginDone ? 'choose' : 'choose')
            }}
            className="flex-1 px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
          >
            {step === 'choose' ? 'Batal' : 'Kembali'}
          </button>

          {step === 'login' && !loginDone && (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
            >
              {loading ? 'Menunggu...' : 'Buka browser →'}
            </button>
          )}

          {step === 'save' && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
            >
              {loading ? 'Menyimpan...' : 'Simpan akun'}
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
  onSwitch: () => void
  onDelete: () => void
}

function AccountCard({ account, isActive, isSwitching, onSwitch, onDelete }: AccountCardProps) {
  const lastUsed = account.lastUsed
    ? new Date(account.lastUsed).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className={[
      'flex items-center gap-3 bg-white dark:bg-zinc-900 border rounded-xl px-4 py-3 transition-colors',
      isActive
        ? 'border-zinc-900 dark:border-zinc-100'
        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
    ].join(' ')}>

      <Avatar name={account.name} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {account.name}
        </p>
        <p className="text-xs text-zinc-400 truncate">{account.email}</p>
        {lastUsed && (
          <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5">
            Last used {lastUsed}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isActive ? (
          <span className="text-xs px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium">
            Active
          </span>
        ) : (
          <button
            onClick={onSwitch}
            disabled={isSwitching}
            className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-600 dark:text-zinc-300"
          >
            {isSwitching ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Switching...
              </span>
            ) : 'Switch →'}
          </button>
        )}

        {/* Tombol delete — tidak muncul kalau akun sedang aktif */}
        {!isActive && (
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
            title="Hapus akun"
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

// --- MAIN PAGE ---
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [accs, active] = await Promise.all([
      window.electronAPI.listAccounts(),
      window.electronAPI.getActiveEmail(),
    ])
    setAccounts(accs)
    setActiveEmail(active)
  }, [])

  useEffect(() => { load() }, [load])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleSwitch = async (email: string) => {
    setSwitching(email)
    setError(null)
    try {
      await window.electronAPI.switchAccount(email)
      await load()
      showSuccess(`Switched ke ${email}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSwitching(null)
    }
  }

  const handleAdd = async (name: string, email: string) => {
    await window.electronAPI.addAccount(name, email)
    await load()
    showSuccess(`Akun "${name}" berhasil disimpan`)
  }

  const handleDelete = async (email: string) => {
    const account = accounts.find(a => a.email === email)
    if (!confirm(`Hapus akun "${account?.name ?? email}"?`)) return
    setError(null)
    try {
      await window.electronAPI.deleteAccount(email)
      await load()
      showSuccess('Akun berhasil dihapus')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Accounts</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Save current account
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Active banner */}
        {activeEmail && <ActiveBanner email={activeEmail} />}

        {/* Error alert */}
        {error && (
          <div className="flex items-start gap-2.5 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-red-600 dark:text-red-400 whitespace-pre-line flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Success toast */}
        {successMsg && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs text-green-600 dark:text-green-400">{successMsg}</p>
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
          <div className="space-y-2">
            {accounts.map(acc => (
              <AccountCard
                key={acc.email}
                account={acc}
                isActive={acc.email === activeEmail}
                isSwitching={switching === acc.email}
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