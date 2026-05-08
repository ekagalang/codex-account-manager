import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Accounts ---
  listAccounts:                          () => ipcRenderer.invoke('accounts:list'),
  getActiveEmail:                        () => ipcRenderer.invoke('accounts:getActive'),
  addAccount: (name: string, email: string) => ipcRenderer.invoke('accounts:add', name, email),
  switchAccount:            (email: string) => ipcRenderer.invoke('accounts:switch', email),
  deleteAccount:            (email: string) => ipcRenderer.invoke('accounts:delete', email),
  loginCodex:                            () => ipcRenderer.invoke('accounts:login'),
  checkCli:                              () => ipcRenderer.invoke('accounts:checkCli'),
  readCurrentEmail:                      () => ipcRenderer.invoke('accounts:readCurrentEmail'),
  refreshBackup: () => ipcRenderer.invoke('accounts:refreshBackup'),

  // --- Monitor ---
  getSessionInfo:                        () => ipcRenderer.invoke('monitor:sessionInfo'),
  getUsage:                              () => ipcRenderer.invoke('monitor:usage'),
  getUsageByEmail:          (email: string) => ipcRenderer.invoke('monitor:usageByEmail', email),

  // --- Settings ---
  getSettings:                           () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Record<string, any>) => ipcRenderer.invoke('settings:set', patch),
  getCodexConfig:                        () => ipcRenderer.invoke('settings:getCodexConfig'),
  ensureFileMode:                        () => ipcRenderer.invoke('settings:ensureFileMode'),
  openFolder:                   (p: string) => ipcRenderer.invoke('settings:openFolder', p),

  // --- Shell ---
  openExternal:               (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getAppMeta:                            () => ipcRenderer.invoke('app:meta'),

  // Tray events → renderer
  onTraySwitch: (cb: (email: string) => void) => ipcRenderer.on('tray:account-switched', (_e, email) => cb(email)),

  // Shortcuts
  registerShortcut:  (accelerator: string) => ipcRenderer.invoke('shortcut:register', accelerator),
  getCurrentShortcut:                   () => ipcRenderer.invoke('shortcut:getCurrent'),

  // Notifications
  triggerNotifyCheck:                   () => ipcRenderer.invoke('notify:check'),
  testNotify:                           () => ipcRenderer.invoke('notify:test'),

  // Updater
  downloadUpdate:  () => ipcRenderer.invoke('updater:download'),
  installUpdate:   () => ipcRenderer.invoke('updater:install'),
  checkUpdate:     () => ipcRenderer.invoke('updater:check'),
  onUpdaterEvent:  (cb: (event: string, data?: any) => void) => {
    const events = [
      'updater:checking',
      'updater:available',
      'updater:not-available',
      'updater:progress',
      'updater:downloaded',
      'updater:error',
    ]
    events.forEach(ev => {
      ipcRenderer.on(ev, (_e, data) => cb(ev.replace('updater:', ''), data))
    })
  },
})
