Unicode true
RequestExecutionLevel user
SetShellVarContext current
SetCompressor /SOLID lzma

!include "MUI2.nsh"

!ifndef BUNDLE_ROOT
  !error "BUNDLE_ROOT define is required."
!endif
!ifndef OUTPUT_FILE
  !error "OUTPUT_FILE define is required."
!endif
!ifndef PRODUCT_VERSION
  !error "PRODUCT_VERSION define is required."
!endif
!ifndef FILE_VERSION
  !error "FILE_VERSION define is required."
!endif
!ifndef SOURCE_SHA
  !error "SOURCE_SHA define is required."
!endif

Name "HiVenues Studio"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\HiVenues Studio"
InstallDirRegKey HKCU "Software\HiVenues\Studio" "InstallLocation"
BrandingText "HiVenues Studio"

VIProductVersion "${FILE_VERSION}"
VIAddVersionKey /LANG=1033 "ProductName" "HiVenues Studio"
VIAddVersionKey /LANG=1033 "CompanyName" "HiVenues"
VIAddVersionKey /LANG=1033 "FileDescription" "HiVenues Studio Installer"
VIAddVersionKey /LANG=1033 "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=1033 "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=1033 "Comments" "Source ${SOURCE_SHA}"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\HiVenues Studio.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open HiVenues Studio"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "HiVenues Studio" SEC_MAIN
  SetShellVarContext current
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\runtime"
  Delete "$INSTDIR\HiVenues Studio.exe"
  Delete "$INSTDIR\build-provenance.json"

  SetOutPath "$INSTDIR"
  File /r "${BUNDLE_ROOT}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\HiVenues Studio"
  CreateShortCut "$SMPROGRAMS\HiVenues Studio\HiVenues Studio.lnk" "$INSTDIR\HiVenues Studio.exe"

  WriteRegStr HKCU "Software\HiVenues\Studio" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\HiVenues\Studio" "Version" "${PRODUCT_VERSION}"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "DisplayName" "HiVenues Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "Publisher" "HiVenues"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "DisplayIcon" "$INSTDIR\HiVenues Studio.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$SMPROGRAMS\HiVenues Studio\HiVenues Studio.lnk"
  RMDir "$SMPROGRAMS\HiVenues Studio"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio"
  DeleteRegKey HKCU "Software\HiVenues\Studio"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\runtime"
  Delete "$INSTDIR\HiVenues Studio.exe"
  Delete "$INSTDIR\build-provenance.json"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
