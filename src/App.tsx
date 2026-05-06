import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import AccountsPage from '@/pages/AccountsPage'
import MonitorPage from '@/pages/MonitorPage'
import SettingsPage from '@/pages/SettingsPage'

export type Page = 'accounts' | 'monitor' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('accounts')

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <Sidebar activePage={page} onNavigate={setPage} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {page === 'accounts' && <AccountsPage />}
        {page === 'monitor'  && <MonitorPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}