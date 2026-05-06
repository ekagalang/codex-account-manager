export interface Account {
  name: string
  email: string
  addedAt: string
  lastUsed?: string
}

export interface SessionInfo {
  loggedIn:           boolean
  authMode?:          string
  hasRefreshToken?:   boolean
  lastRefresh?:       string | null
  ageDays?:           number | null
  expiresInDays?:     number | null
  accountId?:         string | null
  planType?:          string | null
  subscriptionUntil?: string | null
  error?:             string
}

export interface CodexConfig {
  exists: boolean
  isFileMode?: boolean
  raw?: string
}

export interface UsageInfo {
  success?: boolean
  error?: string
  usedUsd?: number | null
  remainingUsd?: number | null
  hardLimit?: number | null
  softLimit?: number | null
  usagePercent?: number | null
  planName?: string | null
  requestsUsed?: number | null
  requestsLimit?: number | null
  resetTime?: string | null
  periodStart?: string | null
  periodEnd?: string | null
}

declare global {
  interface Window {
    electronAPI: {
      // Accounts
      listAccounts:     () => Promise<Account[]>
      getActiveEmail:   () => Promise<string | null>
      addAccount:       (name: string, email: string) => Promise<{ success: boolean }>
      switchAccount:    (email: string) => Promise<{ success: boolean }>
      deleteAccount:    (email: string) => Promise<{ success: boolean }>
      // Login
      loginCodex:       () => Promise<{ success: boolean; output: string }>
      checkCli:         () => Promise<{ installed: boolean; version?: string }>
      readCurrentEmail: () => Promise<{ email: string | null; raw?: any }>
      // Monitor
      getSessionInfo:   () => Promise<SessionInfo>
      getUsage:         () => Promise<UsageInfo>
      // Config
      getConfig:        () => Promise<CodexConfig>
      ensureFileMode:   () => Promise<{ success: boolean }>
    }
  }
}