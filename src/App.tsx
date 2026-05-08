import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import AccountsPage from '@/pages/AccountsPage'
import MonitorPage from '@/pages/MonitorPage'
import SettingsPage from '@/pages/SettingsPage'
import { applyTheme, onSystemThemeChanged, type ThemeMode } from '@/utils/theme'

export type Page = 'accounts' | 'monitor' | 'settings'

interface UpdateInfo {
  version: string
  releaseDate?: string
}

export default function App() {
  const [page, setPage] = useState<Page>('accounts')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  useEffect(() => {
    window.electronAPI.getSettings().then(s => setThemeMode(s.theme))

    // Refresh backup token setiap 5 menit
    const timer = setInterval(() => {
      window.electronAPI.refreshBackup?.()
    }, 5 * 60 * 1000)
    window.electronAPI.refreshBackup?.()

    const handleThemeChanged = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemeMode>).detail
      if (nextTheme) setThemeMode(nextTheme)
    }
    window.addEventListener('codex-theme-changed', handleThemeChanged as EventListener)

    // Listen updater events
    window.electronAPI.onUpdaterEvent?.((event, data) => {
      if (event === 'available') {
        setUpdateAvailable(data)
      } else if (event === 'progress') {
        setDownloadProgress(data.percent)
      } else if (event === 'downloaded') {
        setDownloadProgress(null)
        setUpdateDownloaded(true)
      }
    })

    return () => {
      clearInterval(timer)
      window.removeEventListener('codex-theme-changed', handleThemeChanged as EventListener)
    }
  }, [])

  useEffect(() => {
    applyTheme(themeMode)
    if (themeMode !== 'system') return
    return onSystemThemeChanged(() => applyTheme('system'))
  }, [themeMode])

  return (
    <div className="app-shell relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_300px_at_5%_-10%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(600px_250px_at_85%_0%,rgba(34,211,238,0.12),transparent_60%)]" />
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      <main
        className={[
          'relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-200',
          !sidebarOpen ? 'pl-12' : '',
        ].join(' ')}
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-20 rounded-lg border border-zinc-200 bg-white/90 p-1.5 text-zinc-600 transition hover:border-zinc-300 hover:text-cyan-600 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-cyan-300"
            title="Show sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Update banner */}
        {updateAvailable && !updateDownloaded && (
          <div className="shrink-0 border-b border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5">
            <div className="flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <p className="flex-1 text-xs text-cyan-100">
              Update available — <span className="font-medium">v{updateAvailable.version}</span>
            </p>
            {downloadProgress !== null ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-cyan-200">{downloadProgress}%</span>
              </div>
            ) : (
              <button
                onClick={() => window.electronAPI.downloadUpdate?.()}
                className="rounded-lg border border-cyan-300/40 bg-cyan-400 px-3 py-1 text-xs font-medium text-zinc-900 transition-colors hover:bg-cyan-300"
              >
                Download
              </button>
            )}
            <button
              onClick={() => setUpdateAvailable(null)}
              className="text-cyan-300 transition hover:text-cyan-100"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>
        )}

        {/* Update downloaded — minta restart */}
        {updateDownloaded && (
          <div className="flex shrink-0 items-center gap-3 border-b border-green-400/30 bg-green-500/10 px-4 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-green-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="flex-1 text-xs text-green-100">
              Update is ready to install — restart the app to apply changes
            </p>
            <button
              onClick={() => window.electronAPI.installUpdate?.()}
              className="rounded-lg border border-green-300/40 bg-green-400 px-3 py-1 text-xs font-medium text-zinc-900 transition-colors hover:bg-green-300"
            >
              Restart & Install
            </button>
          </div>
        )}

        {page === 'accounts' && <AccountsPage />}
        {page === 'monitor'  && <MonitorPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
