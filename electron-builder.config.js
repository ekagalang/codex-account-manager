module.exports = {
  appId: 'id.ekagalang.codex-account-manager',
  productName: 'Codex Account Manager',
  copyright: 'Copyright © 2026 ekagalang',
  directories: {
    output: 'dist',
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
    owner: 'ekagalang',              // ← ganti dengan GitHub username kamu
    repo: 'codex-account-manager',   // ← ganti dengan nama repo
    releaseType: 'release',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    signingHashAlgorithms: null,
    sign: null,
    artifactName: '${productName}-Setup-${version}.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Codex Account Manager',
  },
}