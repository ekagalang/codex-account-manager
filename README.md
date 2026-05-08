# Codex Account Manager

> Switch antara beberapa akun Codex CLI dengan satu klik — tanpa perlu login ulang via browser setiap kali ganti akun.

![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-34-47848F?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Latar Belakang

[Codex CLI](https://github.com/openai/codex) dari OpenAI menyimpan kredensial sesi di `~/.codex/auth.json`. Kalau kamu punya lebih dari satu akun ChatGPT (misalnya akun kerja, personal, dan klien), setiap kali ganti akun kamu harus login ulang via browser — buang waktu dan mengganggu workflow.

**Codex Account Manager** menyimpan snapshot `auth.json` masing-masing akun secara aman di lokal, lalu menukarnya secara atomik saat kamu switch — tanpa menyentuh browser sama sekali.

---

## Fitur

### Account Management
- **Simpan beberapa akun** — login via Codex CLI, lalu simpan sesi ke manager
- **Switch 1 klik** — tukar `auth.json` secara atomik tanpa restart app
- **Login langsung dari app** — spawn `codex login`, browser terbuka otomatis
- **Auto-detect email** — decode JWT dari `auth.json` untuk auto-fill email

### Token Monitor
- **Info sesi aktif** — umur sesi, waktu expires, auth mode, plan type
- **Quota usage** — monitoring quota 5 jam dan mingguan via endpoint `wham/usage`
- **Warning expired** — banner peringatan kalau sesi hampir atau sudah expired
- **Auto-refresh** — data diperbarui otomatis setiap 60 detik

### Quick Switch
- **System tray icon** — akun aktif selalu terlihat di taskbar
- **Global shortcut** — tekan `Ctrl+Shift+A` dari mana saja untuk popup switch
- **Popup quick switch** — pilih akun langsung tanpa buka app

### Notifikasi OS
- **Session expiry alert** — notifikasi saat sesi akan expired dalam 2 hari
- **Quota alert** — notifikasi saat usage mencapai threshold yang ditentukan
- **Rate limit alert** — notifikasi urgent saat rate limit tercapai
- **Anti-spam** — setiap notifikasi hanya muncul sekali per 12 jam

### Settings
- **Theme** — Dark / Light / System
- **Notifikasi** — toggle dan atur threshold quota alert
- **Credential mode** — auto-detect dan fix `cli_auth_credentials_store`
- **Custom shortcut** — rekam kombinasi keyboard sendiri

### Auto Update
- **Check otomatis** — cek GitHub Releases setiap jam
- **Download in-app** — download update langsung dari app dengan progress bar
- **Install & restart** — satu klik untuk install dan restart

---

## Screenshot

```
┌─────────────────────────────────────────────────────────────┐
│  Codex Account Manager          // ACCOUNTS                 │
│  ─────────────────────  ┌──────────────────────────────┐    │
│  [U] ACCOUNTS        ●  │ ● eka.work@gmail.com  Active │    │
│  [M] MONITOR            └──────────────────────────────┘    │
│  [S] SETTINGS           WORK          eka.work@gmail.com    │
│                          ⚡ 0%  📅 5%          [ACTIVE]      │
│  ~/.codex-mgr           PERSONAL      eka.personal@gmail    │
│                          ⚡ 72% 📅 31%         [SWITCH >]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Cara Kerja

```
~/.codex/auth.json          ← file aktif yang dibaca Codex CLI
~/.codex-manager/
  └── accounts/
      ├── work_gmail_com/
      │   └── auth.json     ← snapshot akun work
      ├── personal_gmail_com/
      │   └── auth.json     ← snapshot akun personal
      └── client_gmail_com/
          └── auth.json     ← snapshot akun klien
```

Saat switch:
1. Salin `auth.json` target ke `~/.codex/auth.json` secara atomik (write tmp → rename)
2. Update metadata di `accounts.json` (electron userData)
3. Tampilkan banner instruksi restart Codex CLI

> **Mengapa perlu restart Codex CLI?**
> Codex CLI yang sedang berjalan cache token di memory. Setelah `auth.json` diganti, jalankan ulang `codex` agar sesi baru terbaca.

---

## Instalasi

### Download Installer

Download `Codex Account Manager-Setup-x.x.x.exe` dari [Releases](https://github.com/ekagalang/codex-account-manager/releases/latest) dan jalankan installer.

> Windows SmartScreen mungkin muncul warning "Unknown publisher" karena app belum code-signed. Klik **More info** → **Run anyway**.

### Build dari Source

**Prerequisites:**
- Node.js >= 20
- npm >= 10
- Git

```bash
# Clone repository
git clone https://github.com/ekagalang/codex-account-manager.git
cd codex-account-manager

# Install dependencies
npm install

# Jalankan dev mode
npm run start

# Build installer .exe
npm run dist:win
```

### Uninstall Bersih (Windows)

Uninstall lewat **Settings → Apps → Codex Account Manager** akan menghapus:
- File instalasi aplikasi + shortcut
- Data lokal app (`%APPDATA%`)
- Cache updater (`%LOCALAPPDATA%`)
- Backup akun Codex Manager (`%USERPROFILE%\.codex-manager`)

---

## Development

### Struktur Project

```
codex-account-manager/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions — auto build & release
├── assets/
│   ├── tray-icon.svg            # Source icon
│   ├── tray-icon.png            # Icon untuk system tray
│   └── icon.ico                 # Icon untuk installer Windows
├── electron/
│   ├── ipc/
│   │   ├── accountHandlers.ts   # Add, switch, delete akun
│   │   ├── monitorHandlers.ts   # Session info & quota usage
│   │   ├── configHandlers.ts    # Baca/tulis config.toml
│   │   └── settingsHandlers.ts  # App settings
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # IPC bridge (contextBridge)
│   ├── tray.ts                  # System tray
│   ├── shortcutHandlers.ts      # Global shortcut & quick switch popup
│   ├── notifications.ts         # OS notification scheduler
│   └── updater.ts               # Auto-updater
├── src/
│   ├── components/
│   │   └── Sidebar.tsx
│   ├── pages/
│   │   ├── AccountsPage.tsx
│   │   ├── MonitorPage.tsx
│   │   └── SettingsPage.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css                # Tailwind v4
│   └── main.tsx
├── electron-builder.config.js
├── vite.config.ts
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

### Scripts

```bash
npm run start        # Dev mode (Vite + Electron)
npm run build        # Build TypeScript + Vite
npm run dist:win     # Build + package .exe Windows
npm run dist:mac     # Build + package .dmg macOS
npm run dist:linux   # Build + package .AppImage Linux
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 34 |
| UI Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 6 |
| IPC | contextBridge (secure) |
| Storage | JSON files (userData) |
| Packaging | electron-builder |
| Auto-update | electron-updater |

---

## Release

Release baru dibuat otomatis via GitHub Actions setiap kali tag `v*` di-push:

```bash
# Update versi di package.json, lalu:
git add .
git commit -m "chore: bump version to 1.1.0"
git tag v1.1.0
git push origin main --tags
```

GitHub Actions akan:
1. Build `.exe` di Windows runner
2. Upload ke GitHub Releases
3. App yang sudah terinstall akan detect update otomatis

> Untuk auto-update `electron-updater`, pastikan asset ini ada di setiap GitHub Release:
> - `latest.yml`
> - `Codex Account Manager-Setup-<version>.exe`
> - `Codex Account Manager-Setup-<version>.exe.blockmap`

---

## Keamanan

- **contextIsolation: true** — renderer tidak punya akses Node.js langsung
- **nodeIntegration: false** — semua operasi file lewat IPC handler
- **Atomic file write** — tulis ke `.tmp` dulu, baru rename — mencegah partial write
- **File permission** — `~/.codex-manager/` hanya readable oleh user saat ini
- **Tidak ada network call** selain ke `chatgpt.com/backend-api/wham/usage` untuk quota dan GitHub untuk update check

---

## Kontribusi

Pull request dan issue sangat welcome!

```bash
# Fork repo, lalu:
git checkout -b feat/nama-fitur
git commit -m "feat: deskripsi fitur"
git push origin feat/nama-fitur
# Buka Pull Request di GitHub
```

---

## Lisensi

MIT © [ekagalang](https://ekagalang.my.id)

---

## Kredit

- [OpenAI Codex CLI](https://github.com/openai/codex) — tool yang di-manage oleh app ini
- [Electron](https://www.electronjs.org/) — desktop shell
- [electron-builder](https://www.electron.build/) — packaging & auto-update
