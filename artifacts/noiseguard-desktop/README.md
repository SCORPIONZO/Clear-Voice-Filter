# NoiseGuard Desktop (Electron)

Десктопное приложение для macOS. При первом запуске автоматически
скачивает и устанавливает BlackHole 2ch — точно как Krisp.

---

## Требования

- macOS 12+ (Intel или Apple Silicon)
- Node.js 18+ и pnpm

---

## Разработка (запуск на Mac)

```bash
# 1. Установить зависимости из корня монорепозитория
pnpm install

# 2. Запустить React-рендерер (noiseguard Vite dev server)
PORT=5173 pnpm --filter @workspace/noiseguard run dev &

# 3. Запустить Electron (в отдельном терминале)
cd artifacts/noiseguard-desktop
pnpm install       # только первый раз
pnpm dev           # запускает electron в dev-режиме
```

Electron загрузит рендерер с `http://localhost:5173`.

---

## Сборка .dmg

```bash
# Из корня монорепозитория:
cd artifacts/noiseguard-desktop

# Установить зависимости
pnpm install

# Собрать (сначала React, потом Electron, потом dmg)
pnpm dist:mac
```

Готовый файл будет в `artifacts/noiseguard-desktop/release/`.

**Примечание:** для публикации в Mac App Store нужен Apple Developer Account
и подпись кода. Для личного использования можно запускать без подписи
(при необходимости снять карантин: `xattr -d com.apple.quarantine NoiseGuard.app`).

---

## Как работает

1. При запуске main-процесс проверяет наличие
   `/Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver`
2. Если не установлен — открывается **setup-окно** с прогрессом загрузки
3. Загрузка использует `HTTP Range` (возобновление при обрыве) + 10 повторов
4. После загрузки — открывается стандартный macOS-установщик (`.pkg`)
5. После перезагрузки Mac — следующий запуск открывает основной интерфейс

---

## Структура

```
electron/
  main.ts        — главный процесс: окна, IPC, lifecycle
  blackhole.ts   — загрузка BlackHole с resume+retry, проверка установки
  preload.ts     — безопасный мост renderer ↔ main (contextBridge)
setup/
  index.html     — UI установки BlackHole (standalone HTML, без бандлера)
assets/
  entitlements.mac.plist — права macOS (микрофон, сеть)
electron-builder.yml     — конфигурация сборки .dmg
tsconfig.electron.json   — TypeScript для main process (CommonJS target)
```
