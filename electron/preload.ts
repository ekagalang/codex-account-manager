import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Accounts ---
  listAccounts:       () => ipcRenderer.invoke('accounts:list'),
  getActiveEmail:     () => ipcRenderer.invoke('accounts:getActive'),
  addAccount:         (name: string, email: string) => ipcRenderer.invoke('accounts:add', name, email),
  switchAccount:      (email: string) => ipcRenderer.invoke('accounts:switch', email),
  deleteAccount:      (email: string) => ipcRenderer.invoke('accounts:delete', email),

  // --- Login flow ---
  loginCodex:         () => ipcRenderer.invoke('accounts:login'),
  checkCli:           () => ipcRenderer.invoke('accounts:checkCli'),
  readCurrentEmail:   () => ipcRenderer.invoke('accounts:readCurrentEmail'),

  // --- Monitor ---
  getSessionInfo:     () => ipcRenderer.invoke('monitor:sessionInfo'),
  getUsage: () => ipcRenderer.invoke('monitor:usage'),

  // --- Config ---
  getConfig:          () => ipcRenderer.invoke('config:get'),
  ensureFileMode:     () => ipcRenderer.invoke('config:ensureFileMode'),

  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
})