module.exports = {
  appId: 'id.ekagalang.codex-account-manager',
  productName: 'Codex Account Manager',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: ['dist', 'dist-electron'],
  // macOS
  mac: {
    target: 'dmg',
    category: 'public.app-category.developer-tools',
  },
  // Windows
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
  },
  // Linux (bonus)
  linux: {
    target: 'AppImage',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}