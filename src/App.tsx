import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import AccountsPage from '@/pages/AccountsPage'
import MonitorPage from '@/pages/MonitorPage'
import SettingsPage from '@/pages/SettingsPage'

export type Page = 'accounts' | 'monitor' | 'settings'

interface UpdateInfo {
  version: string
  releaseDate?: string
}

export default function App() {
  const [page, setPage] = useState<Page>('accounts')
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  useEffect(() => {
    // Apply saved theme
    window.electronAPI.getSettings().then(s => {
      document.documentElement.classList.toggle('dark', s.theme === 'dark')
    })

    // Refresh backup token setiap 5 menit
    const timer = setInterval(() => {
      window.electronAPI.refreshBackup?.()
    }, 5 * 60 * 1000)
    window.electronAPI.refreshBackup?.()

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

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <Sidebar activePage={page} onNavigate={setPage} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Update banner */}
        {updateAvailable && !updateDownloaded && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 shrink-0">
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
              Update tersedia — <span className="font-medium">v{updateAvailable.version}</span>
            </p>
            {downloadProgress !== null ? (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-blue-500">{downloadProgress}%</span>
              </div>
            ) : (
              <button
                onClick={() => window.electronAPI.downloadUpdate?.()}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
            )}
            <button
              onClick={() => setUpdateAvailable(null)}
              className="text-blue-400 hover:text-blue-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Update downloaded — minta restart */}
        {updateDownloaded && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 shrink-0">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs text-green-700 dark:text-green-300 flex-1">
              Update siap diinstall — restart app untuk menerapkan perubahan
            </p>
            <button
              onClick={() => window.electronAPI.installUpdate?.()}
              className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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