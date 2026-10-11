; Keep the application identity and user-data folder on every upgrade.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "КАРАНТИН — подготовка к операции"
  !define MUI_WELCOMEPAGE_TEXT "Установите игру и постоянный лаунчер.$\r$\n$\r$\n• Одиночная игра и кооператив до 4 бойцов.$\r$\n• Новые версии игры — прямо в лаунчере.$\r$\n• Кнопки, громкость и режим экрана сохраняются при обновлении.$\r$\n$\r$\nДалее вы сможете выбрать папку установки и ярлыки."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!ifndef BUILD_UNINSTALLER
  Var desktopShortcutCheckbox
  Var startShortcutCheckbox
  Var desktopShortcutChoice
  Var startShortcutChoice
  !include nsDialogs.nsh
  !include LogicLib.nsh
  !macro customPageAfterChangeDir
    Page custom QuarantineShortcuts QuarantineShortcutsLeave
  !macroend
  Function QuarantineShortcuts
    ${If} ${isUpdated}
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Всё готово к установке" "Выберите, откуда удобно запускать Карантин."
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateLabel} 0 0 100% 36u "Папка установки:$\r$\n$INSTDIR"
    Pop $0
    ${NSD_CreateCheckbox} 0 48u 100% 16u "Создать ярлык на рабочем столе"
    Pop $desktopShortcutCheckbox
    ${NSD_SetState} $desktopShortcutCheckbox ${BST_CHECKED}
    ${NSD_CreateCheckbox} 0 72u 100% 16u "Добавить игру в меню «Пуск»"
    Pop $startShortcutCheckbox
    ${NSD_SetState} $startShortcutCheckbox ${BST_CHECKED}
    ${NSD_CreateLabel} 0 108u 100% 40u "Ваши настройки и загруженные версии игры сохранятся. Для обновления самой игры используйте лаунчер."
    Pop $0
    nsDialogs::Show
  FunctionEnd
  Function QuarantineShortcutsLeave
    ${NSD_GetState} $desktopShortcutCheckbox $desktopShortcutChoice
    ${NSD_GetState} $startShortcutCheckbox $startShortcutChoice
  FunctionEnd
  !macro customInstall
    ${If} $desktopShortcutChoice != ""
      ${If} $desktopShortcutChoice == ${BST_UNCHECKED}
        Delete "$newDesktopLink"
      ${EndIf}
      ${If} $startShortcutChoice == ${BST_UNCHECKED}
        Delete "$newStartMenuLink"
      ${EndIf}
      StrCpy $launchLink "$appExe"
    ${EndIf}
  !macroend
!endif
