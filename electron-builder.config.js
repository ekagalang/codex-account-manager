module.exports = {
  appId: 'id.ekagalang.codex-account-manager',
  productName: 'Codex Account Manager',
  copyright: 'Copyright © 2026 ekagalang',
  asar: true,
  compression: 'maximum',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
  ],
  extraResources: [
    {
      from: 'assets/',
      to: 'assets/',
      filter: ['**/*'],
    },
  ],
  // Publish ke GitHub Releases
  publish: {
    provider: 'github',
    owner: 'ekagalang',
    repo: 'codex-account-manager',
    releaseType: 'release',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.ico',
    signingHashAlgorithms: null,
    sign: null,
    artifactName: '${productName}-Setup-${version}.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    perMachine: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Codex Account Manager',
    uninstallDisplayName: 'Codex Account Manager',
    deleteAppDataOnUninstall: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    // Custom NSIS script
    include: 'assets/installer.nsh',
  },
}
