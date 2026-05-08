export interface Account {
  name: string
  email: string
  addedAt: string
  lastUsed?: string
}

export interface SessionInfo {
  loggedIn: boolean
  authMode?: string
  hasRefreshToken?: boolean
  lastRefresh?: string | null
  ageDays?: number | null
  expiresInDays?: number | null
  planType?: string | null
  subscriptionUntil?: string | null
  accessToken?: string | null
  accountId?: string | null
  error?: string
}

export interface QuotaWindow {
  label: string
  usedPercent: number
  remainingPercent: number
  windowHours: number
  resetAt: string | null
  resetAfterSeconds: number
  allowed: boolean
  limitReached: boolean
}

export interface UsageCredits {
  hasCredits: boolean
  unlimited: boolean
  balance: string
  approxLocalMessages: number[] | null
  approxCloudMessages: number[] | null
}

export interface UsageInfo {
  success?: boolean
  error?: string
  allowed?: boolean
  limitReached?: boolean
  planType?: string | null
  email?: string | null
  fiveHour?: QuotaWindow | null
  weekly?: QuotaWindow | null
  credits?: UsageCredits | null
  raw?: any
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  notifySessionExpiry: boolean
  notifyQuotaThreshold: number | null
  launchAtStartup: boolean
  codexHome: string
  globalShortcut: string
}

// Tambah interface
export interface AccountUsage {
  success?: boolean
  error?: string
  allowed?: boolean
  limitReached?: boolean
  fiveHour?: { usedPercent: number; resetAfterSeconds: number } | null
  weekly?: { usedPercent: number; resetAfterSeconds: number } | null
}

declare global {
  interface Window {
    electronAPI: {
      listAccounts:     () => Promise<Account[]>
      getActiveEmail:   () => Promise<string | null>
      addAccount:       (name: string, email: string) => Promise<{ success: boolean }>
      switchAccount:    (email: string) => Promise<{ success: boolean }>
      deleteAccount:    (email: string) => Promise<{ success: boolean }>
      loginCodex:       () => Promise<{ success: boolean; output: string }>
      checkCli:         () => Promise<{ installed: boolean; version?: string }>
      readCurrentEmail: () => Promise<{ email: string | null }>
      getSessionInfo:   () => Promise<SessionInfo>
      getUsage:         () => Promise<UsageInfo>
      getConfig:        () => Promise<{ exists: boolean; isFileMode?: boolean }>
      ensureFileMode:   () => Promise<{ success: boolean }>
      openExternal:     (url: string) => Promise<void>
      getAppMeta:       () => Promise<{ version: string }>
      getSettings:      () => Promise<AppSettings>
      setSettings:      (patch: Partial<AppSettings>) => Promise<AppSettings>
      getCodexConfig:   () => Promise<{ exists: boolean; isFileMode: boolean; raw: string }>
      openFolder:       (path: string) => Promise<void>
      onTraySwitch: (cb: (email: string) => void) => void
      refreshBackup: () => Promise<{ success: boolean; email?: string }>
      registerShortcut:    (accelerator: string) => Promise<{ success: boolean }>
      getCurrentShortcut:  () => Promise<string | null>
      triggerNotifyCheck: () => Promise<{ success: boolean }>
      getUsageByEmail: (email: string) => Promise<AccountUsage>
      downloadUpdate:   () => Promise<{ success: boolean; error?: string }>
      installUpdate:    () => Promise<void>
      checkUpdate:      () => Promise<{ success: boolean; version?: string; error?: string }>
      onUpdaterEvent:   (cb: (event: string, data?: any) => void) => void
    }
  }
}
