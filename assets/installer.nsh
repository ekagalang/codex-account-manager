!macro customInstall
  DetailPrint "Setting up Codex Account Manager..."

  ; Buat folder data
  CreateDirectory "$PROFILE\.codex-manager"
  CreateDirectory "$PROFILE\.codex-manager\accounts"

  ; Simpan info ke registry
  WriteRegStr HKCU "Software\CodexAccountManager" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\CodexAccountManager" "DataPath" "$PROFILE\.codex-manager"
  WriteRegStr HKCU "Software\CodexAccountManager" "Version" "${VERSION}"

  DetailPrint "Installation complete!"
!macroend

!macro customUnInstall
  DetailPrint "Removing Codex Account Manager..."

  ; Hapus data aplikasi secara bersih
  RMDir /r "$PROFILE\.codex-manager"
  RMDir /r "$APPDATA\codex-account-manager"
  RMDir /r "$APPDATA\Codex Account Manager"
  RMDir /r "$LOCALAPPDATA\codex-account-manager-updater"
  RMDir /r "$LOCALAPPDATA\Codex Account Manager-updater"

  ; Bersihkan registry
  DeleteRegKey HKCU "Software\CodexAccountManager"
  DeleteRegKey HKLM "Software\CodexAccountManager"
  DeleteRegValue HKCU \
    "Software\Microsoft\Windows\CurrentVersion\Run" \
    "CodexAccountManager"
  DeleteRegValue HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Run" \
    "CodexAccountManager"

  ; Bersihkan shortcut sisa (current user + all users)
  SetShellVarContext current
  Delete "$DESKTOP\Codex Account Manager.lnk"
  Delete "$SMPROGRAMS\Codex Account Manager\*.lnk"
  RMDir "$SMPROGRAMS\Codex Account Manager"

  SetShellVarContext all
  Delete "$DESKTOP\Codex Account Manager.lnk"
  Delete "$SMPROGRAMS\Codex Account Manager\*.lnk"
  RMDir "$SMPROGRAMS\Codex Account Manager"

  SetShellVarContext current

  DetailPrint "Uninstall complete. All app data removed."
!macroend
