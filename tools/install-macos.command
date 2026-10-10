#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
SOURCE="$PWD/Quarantine.app"
TEST_MODE=false
if [[ "${1:-}" == "--test" ]]; then TEST_MODE=true; fi
fail() { echo "Ошибка: $*" >&2; exit 1; }
[[ "$(uname -s)" == Darwin ]] || fail "Этот установщик предназначен для macOS."
[[ -d "$SOURCE" && ! -L "$SOURCE" ]] || fail "Откройте этот установщик внутри DMG рядом с Quarantine.app."
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$SOURCE/Contents/Info.plist")" == com.quarantine.cordon ]] || fail "Неверное приложение."
/usr/bin/codesign --verify --deep --strict "$SOURCE" || fail "Файлы повреждены. Скачайте DMG заново из Releases."
/usr/bin/lipo "$SOURCE/Contents/MacOS/Quarantine" -verify_arch "$(uname -m)" || fail "Скачайте DMG для архитектуры вашего Mac."
if ! $TEST_MODE && /usr/bin/pgrep -x Quarantine >/dev/null; then fail "Полностью закройте Quarantine и повторите установку."; fi
echo "Установка Quarantine. Проверена целостность приложения."
echo "Разрешение первого запуска применяется только к Quarantine; настройки защиты macOS не меняются."
ROOT=/Applications
if $TEST_MODE; then ROOT="$(mktemp -d "${TMPDIR:-/tmp}/quarantine-install-test.XXXXXX")";
elif [[ ! -w "$ROOT" ]]; then ROOT="$HOME/Applications"; mkdir -p "$ROOT"; fi
STAGE="$(mktemp -d "$ROOT/.quarantine-install.XXXXXX")"
cleanup() { rm -rf "$STAGE"; if $TEST_MODE; then rm -rf "$ROOT"; fi; }
trap cleanup EXIT
/usr/bin/ditto "$SOURCE" "$STAGE/Quarantine.app"
# This is the specific, verified game selected by the user, not a system-wide exception.
/usr/bin/xattr -dr com.apple.quarantine "$STAGE/Quarantine.app"
/usr/bin/codesign --verify --deep --strict "$STAGE/Quarantine.app"
if ! "$STAGE/Quarantine.app/Contents/MacOS/Quarantine" --smoke-test >"$STAGE/startup.log" 2>&1; then
  cat "$STAGE/startup.log" >&2
  fail "Проверка запуска не прошла. Предыдущая установка сохранена."
fi
/usr/bin/grep -q DESKTOP_SMOKE "$STAGE/startup.log" || fail "Не получен результат проверки лаунчера и игры."
if $TEST_MODE; then echo MACOS_INSTALL_OK; exit 0; fi
TARGET="$ROOT/Quarantine.app"
if [[ -e "$TARGET" ]]; then
  BACKUP="$ROOT/Quarantine-backup-$(date +%Y%m%d-%H%M%S).app"
  mv "$TARGET" "$BACKUP"
  echo "Предыдущая версия сохранена: $BACKUP"
fi
mv "$STAGE/Quarantine.app" "$TARGET"
echo "Готово: $TARGET"
/usr/bin/open "$TARGET"
