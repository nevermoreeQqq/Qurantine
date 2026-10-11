; Graphite palette shared by all native NSIS pages, including the uninstaller.
!define MUI_BGCOLOR "121418"
!define MUI_TEXTCOLOR "EEF0F4"
!define MUI_INSTFILESPAGE_COLORS "EEF0F4 1D2026"
!include nsDialogs.nsh
!include LogicLib.nsh
Var QuarantineNativeDark
!ifdef BUILD_UNINSTALLER
  !define Q_THEME_PREFIX "un."
  !define MUI_CUSTOMFUNCTION_UNGUIINIT un.QuarantineDarkInit
!else
  !define Q_THEME_PREFIX ""
  !define MUI_CUSTOMFUNCTION_GUIINIT QuarantineDarkInit
!endif

; Extend MUI's page callback without replacing electron-builder's install logic.
; Both standard MUI pages and the install-mode page invoke this SHOW hook
; after their controls exist. No timer survives a destroyed page.
!include MUI2.nsh
!macroundef MUI_PAGE_FUNCTION_CUSTOM
!macro MUI_PAGE_FUNCTION_CUSTOM TYPE
  !ifdef MUI_PAGE_CUSTOMFUNCTION_${TYPE}
    Call "${MUI_PAGE_CUSTOMFUNCTION_${TYPE}}"
    !undef MUI_PAGE_CUSTOMFUNCTION_${TYPE}
  !endif
  !if "${TYPE}" == "SHOW"
    Call ${Q_THEME_PREFIX}QuarantineDarkScan
  !endif
!macroend
!macro customHeader
  Function ${Q_THEME_PREFIX}QuarantineDarkInit
    SetCtlColors $HWNDPARENT EEF0F4 121418
    ; Native dark common controls are available since Windows 10 1903.
    ; Older systems still receive our explicit dialog/text/input palette.
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuildNumber"
    ${If} $0 >= 18362
      System::Call 'kernel32::LoadLibraryW(w "uxtheme.dll") p.r0'
      System::Call 'kernel32::GetProcAddress(p r0, p 135) p.r1'
      ${If} $1 != 0
        System::Call '::$1(i 2) i.r2'
        StrCpy $QuarantineNativeDark "1"
      ${EndIf}
    ${EndIf}
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i 1, i 4)'
    Call ${Q_THEME_PREFIX}QuarantineDarkScan
  FunctionEnd

  Function ${Q_THEME_PREFIX}QuarantineDarkScan
    Push $HWNDPARENT
    Call ${Q_THEME_PREFIX}QuarantineDarkTree
  FunctionEnd

  Function ${Q_THEME_PREFIX}QuarantineDarkTree
    Exch $0
    Push $1
    Push $2
    Push $3
    Push $4
    System::Call 'user32::GetPropW(p r0, w "QuarantineGraphite") p.r2'
    ${If} $2 == 0
      SetCtlColors $0 EEF0F4 121418
      System::Call 'user32::GetClassNameW(p r0, w .r3, i 256)'
      ${If} $3 == "Edit"
        SetCtlColors $0 EEF0F4 1D2026
      ${EndIf}
      ${If} $QuarantineNativeDark == "1"
        System::Call 'uxtheme::#133(p r0, i 1)'
        System::Call 'uxtheme::SetWindowTheme(p r0, w "DarkMode_Explorer", p 0)'
        ; Native radio/check themes may still draw black text under ForceDark.
        ; Use the explicit palette for these controls, including disabled labels.
        ${If} $3 == "Button"
          System::Call 'user32::GetWindowLongW(p r0, i -16) i.r4'
          IntOp $4 $4 & 0xF
          ${If} $4 == 2
          ${OrIf} $4 == 3
          ${OrIf} $4 == 4
          ${OrIf} $4 == 6
          ${OrIf} $4 == 7
          ${OrIf} $4 == 9
            System::Call 'uxtheme::SetWindowTheme(p r0, w "", w "")'
          ${EndIf}
        ${EndIf}
      ${EndIf}
      System::Call 'user32::SetPropW(p r0, w "QuarantineGraphite", p 1)'
      System::Call 'user32::InvalidateRect(p r0, p 0, i 1)'
    ${EndIf}
    ; New controls are created on every page transition. Color each only once.
    System::Call 'user32::GetWindow(p r0, i 5) p.r1'
    ${DoWhile} $1 != 0
      Push $1
      Call ${Q_THEME_PREFIX}QuarantineDarkTree
      System::Call 'user32::GetWindow(p r1, i 2) p.r1'
    ${Loop}
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Pop $0
  FunctionEnd
!macroend
