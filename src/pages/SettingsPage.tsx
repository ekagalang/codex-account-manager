import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '@/types'
import { applyTheme, type ThemeMode } from '@/utils/theme'

// --- SUB COMPONENTS ---

function ShortcutInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [preview, setPreview] = useState(value)

  // Format accelerator ke display label
  const toDisplay = (acc: string) =>
  acc
    .replace('CommandOrControl', 'Ctrl')
    .replace('Control', 'Ctrl')
    .replace('Command', 'Ctrl')
    .replace(/\+/g, ' + ')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')

    const key = e.key.toUpperCase()
    // Hanya accept kombinasi dengan modifier + huruf/angka
    if (
      parts.length > 0 &&
      key.length === 1 &&
      /[A-Z0-9]/.test(key)
    ) {
      const accelerator = [...parts, key].join('+')
      setPreview(accelerator)
      setRecording(false)
      onChange(accelerator)
    }

    // Escape = batal
    if (e.key === 'Escape') {
      setPreview(value)
      setRecording(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onKeyDown={handleKeyDown}
        onClick={() => setRecording(r => !r)}
        className={[
          'text-xs px-3 py-1.5 rounded-lg border font-mono transition-all min-w-[140px] text-center',
          recording
            ? 'animate-pulse border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
            : 'border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800',
        ].join(' ')}
        style={{ userSelect: 'none' }}
      >
        {recording ? '● Press shortcut...' : toDisplay(preview)}
      </button>
      {recording && (
        <button
          onClick={() => { setPreview(value); setRecording(false) }}
          className="text-xs text-zinc-500 hover:text-zinc-200"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
  last = false,
}: {
  label: string
  description?: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 ${!last ? 'border-b border-zinc-800' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      role="switch"
      aria-checked={value}
      className={[
        'relative inline-flex items-center w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 shrink-0',
        value
          ? 'bg-cyan-400'
          : 'bg-zinc-700',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-1.5',
        ].join(' ')}
        style={{
          background: value ? 'white' : 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function ThemeButton({
  value,
  current,
  label,
  icon,
  onClick,
}: {
  value: AppSettings['theme']
  current: AppSettings['theme']
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  const isActive = value === current
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border transition-all text-xs font-medium',
        isActive
          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
          : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

// --- MAIN PAGE ---
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [codexConfig, setCodexConfig] = useState<{ exists: boolean; isFileMode: boolean } | null>(null)
  const [appVersion, setAppVersion] = useState('...')
  const [fixingFileMode, setFixingFileMode] = useState(false)
  const [fileModeFixed, setFileModeFixed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [s, c, meta] = await Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.getCodexConfig(),
      window.electronAPI.getAppMeta(),
    ])
    setSettings(s)
    setCodexConfig(c)
    setAppVersion(meta.version)
    applyTheme(s.theme)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const update = async (patch: Partial<AppSettings>) => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await window.electronAPI.setSettings(patch)
      setSettings(updated)
      applyTheme(updated.theme as ThemeMode)
      window.dispatchEvent(new CustomEvent<ThemeMode>('codex-theme-changed', { detail: updated.theme as ThemeMode }))
    } finally {
      setSaving(false)
    }
  }

  const handleFixFileMode = async () => {
    setFixingFileMode(true)
    try {
      await window.electronAPI.ensureFileMode()
      setFileModeFixed(true)
      setCodexConfig(prev => prev ? { ...prev, isFileMode: true } : prev)
      setTimeout(() => setFileModeFixed(false), 3000)
    } finally {
      setFixingFileMode(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg className="w-5 h-5 text-zinc-300 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Topbar */}
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-100">Settings</p>
        {saving && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
            </svg>
            Saving...
          </p>
        )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* APPEARANCE */}
        <Section title="Appearance">
          <SettingRow label="Theme" description="Choose the app color theme">
            <div className="flex gap-2">
              <ThemeButton
                value="dark" current={settings.theme} label="Dark" onClick={() => update({ theme: 'dark' })}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                  </svg>
                }
              />
              <ThemeButton
                value="light" current={settings.theme} label="Light" onClick={() => update({ theme: 'light' })}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  </svg>
                }
              />
              <ThemeButton
                value="system" current={settings.theme} label="System" onClick={() => update({ theme: 'system' })}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                  </svg>
                }
              />
            </div>
          </SettingRow>
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications">
          <SettingRow
            label="Session expiring soon"
            description="Notify when the Codex session will expire within 2 days"
          >
            <Toggle
              value={settings.notifySessionExpiry}
              onChange={v => update({ notifySessionExpiry: v })}
            />
          </SettingRow>
          <SettingRow
            label="Quota running low"
            description={`Notify when usage reaches ${settings.notifyQuotaThreshold ?? 80}%`}
            last
          >
            <div className="flex items-center gap-3">
              {settings.notifyQuotaThreshold !== null && (
                <select
                  value={settings.notifyQuotaThreshold}
                  onChange={e => update({ notifyQuotaThreshold: Number(e.target.value) })}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300 outline-none"
                  style={{ userSelect: 'text' }}
                >
                  {[60, 70, 80, 90].map(v => (
                    <option key={v} value={v}>{v}%</option>
                  ))}
                </select>
              )}
              <Toggle
                value={settings.notifyQuotaThreshold !== null}
                onChange={v => update({ notifyQuotaThreshold: v ? 80 : null })}
              />
            </div>
          </SettingRow>

          {/* Test button */}
          <div className="border-t border-zinc-800 px-4 py-3">
            <button
              onClick={async () => {
                await window.electronAPI.triggerNotifyCheck()
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:bg-zinc-800"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              Test notifications now
            </button>
          </div>
        </Section>

        {/* SHORTCUTS */}
        <Section title="Global Shortcut">
          <SettingRow
            label="Quick switch shortcut"
            description="Press this shortcut anywhere to open the quick account switch popup"
            last
          >
            <ShortcutInput
              value={settings.globalShortcut ?? 'CommandOrControl+Shift+A'}
              onChange={async (v) => {
                const res = await window.electronAPI.registerShortcut(v)
                if (res.success) {
                  update({ globalShortcut: v })
                } else {
                  alert(`Shortcut "${v}" could not be registered — it may already be used by another app.`)
                }
              }}
            />
          </SettingRow>
        </Section>

        {/* CODEX CLI */}
        <Section title="Codex CLI">

          {/* File mode status */}
          <SettingRow
            label="Credential storage mode"
            description='Must be "file" for account switching to work'
          >
            {codexConfig?.isFileMode ? (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                file ✓
              </span>
            ) : (
              <button
                onClick={handleFixFileMode}
                disabled={fixingFileMode}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {fixingFileMode ? 'Fixing...' : fileModeFixed ? 'Fixed ✓' : 'Fix now'}
              </button>
            )}
          </SettingRow>

          {/* CODEX_HOME path */}
          <SettingRow
            label="CODEX_HOME"
            description="Codex CLI configuration directory"
            last
          >
            <div className="flex items-center gap-2">
              <code className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-400">
                {settings.codexHome.replace(/\\/g, '/')}
              </code>
              <button
                onClick={() => window.electronAPI.openFolder(settings.codexHome)}
                className="text-zinc-500 transition-colors hover:text-cyan-300"
                title="Open in File Explorer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </button>
            </div>
          </SettingRow>
        </Section>

        {/* DATA */}
        <Section title="Data">
          <SettingRow
            label="Manager data folder"
            description="Location where all account credential backups are stored"
          >
            <button
              onClick={() => {
                const managerDir = settings.codexHome
                  .replace(/\.codex$/, '.codex-manager')
                  .replace(/\.codex\/$/, '.codex-manager/')
                window.electronAPI.openFolder(managerDir)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:bg-zinc-800"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v2.25A2.25 2.25 0 0 1 19.5 18.75h-15A2.25 2.25 0 0 1 2.25 18.75v-2.25" />
              </svg>
              Open folder
            </button>
          </SettingRow>

          <SettingRow label="App version" description="Check latest updates from GitHub" last>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">v{appVersion}</span>
              <button
                onClick={async () => {
                  const res = await window.electronAPI.checkUpdate?.()
                  if (res?.success === false) {
                    alert('Failed to check updates: ' + res.error)
                  }
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:bg-zinc-800"
              >
                Check updates
              </button>
            </div>
          </SettingRow>
        </Section>

        {/* APP INFO */}
        <div className="mt-2 px-1">
          <p className="text-[11px] text-zinc-600">
            Codex Account Manager v{appVersion} · Electron
          </p>
        </div>

      </div>
    </div>
  )
}
