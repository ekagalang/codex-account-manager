import { useEffect, useMemo, useState } from 'react'
import type { AppSettings } from '@/types'
import type { Page } from '@/App'

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
  isOpen: boolean
  onToggle: () => void
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'accounts', label: 'Accounts', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
  { id: 'monitor', label: 'Monitor', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
  { id: 'settings', label: 'Settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
]

export default function Sidebar({ activePage, onNavigate, isOpen, onToggle }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [appVersion, setAppVersion] = useState('...')

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings).catch(() => null)
    window.electronAPI.getAppMeta().then(meta => setAppVersion(meta.version)).catch(() => null)
  }, [])

  const managerPath = useMemo(() => {
    const codexHome = settings?.codexHome ?? '~/.codex'
    return codexHome
      .replace(/\\/g, '/')
      .replace(/\.codex$/, '.codex-manager')
      .replace(/\.codex\/$/, '.codex-manager/')
  }, [settings?.codexHome])

  return (
    <aside
      className={[
        'shrink-0 border-r border-zinc-200/80 bg-white/90 backdrop-blur transition-all duration-300 ease-out dark:border-zinc-800/80 dark:bg-zinc-950/95',
        isOpen ? 'w-[200px] opacity-100' : 'w-0 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200/80 px-4 py-3.5 dark:border-zinc-800/80">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-medium tracking-wide text-zinc-800 dark:text-zinc-100">
              Codex Account Manager
            </p>
            <button
              onClick={onToggle}
              className="rounded-md border border-zinc-200 p-1 text-zinc-500 transition hover:border-zinc-300 hover:text-cyan-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-cyan-300"
              title="Hide sidebar"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-2.5">
          {navItems.map(item => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={[
                  'group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] transition-all',
                  isActive
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200',
                ].join(' ')}
              >
                <svg
                  className={['h-4 w-4 shrink-0 transition-colors', isActive ? 'text-cyan-500 dark:text-cyan-300' : 'text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-300'].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-800/80">
          <p className="mb-1 truncate text-[10px] text-zinc-500 dark:text-zinc-400">{managerPath}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-600">v{appVersion}</p>
        </div>
      </div>
    </aside>
  )
}
