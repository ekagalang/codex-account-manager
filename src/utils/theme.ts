export type ThemeMode = 'dark' | 'light' | 'system'

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function shouldUseDark(theme: ThemeMode): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return prefersDark()
}

export function applyTheme(theme: ThemeMode) {
  const dark = shouldUseDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function onSystemThemeChanged(listener: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => listener()

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }

  media.addListener(handler)
  return () => media.removeListener(handler)
}
