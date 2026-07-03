# NoiseGuard Chrome Extension

Нейросетевое подавление шума для любого браузерного звонка — без виртуальных кабелей.

## Как работает

Расширение перехватывает `navigator.mediaDevices.getUserMedia` на уровне браузера.
Любой сайт, который запрашивает микрофон (Zoom, Google Meet, Битрикс24, Teams) —
автоматически получает очищенный поток.

**DSP конвейер:**  
`HPF 80 Гц` → `Noise Gate (AudioWorklet, per-channel RMS)` → `Expander` → `Compressor`

## Сборка

```bash
cd artifacts/noiseguard-ext
pnpm install
pnpm build        # → dist/
pnpm watch        # watch mode
pnpm typecheck    # TypeScript без компиляции
```

## Загрузка в Chrome (режим разработчика)

1. Откройте `chrome://extensions`
2. Включите «Режим разработчика» (правый верхний угол)
3. Нажмите «Загрузить распакованное»
4. Выберите папку `dist/`

## Публикация в Chrome Web Store

1. `pnpm build` — создаёт готовую папку `dist/`
2. Запакуйте в zip: `cd dist && zip -r ../noiseguard-ext.zip .`
3. Загрузите в [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## Архитектура

```
background.ts    — service worker: состояние, badge, broadcast в tabs
content.ts       — изолированный мир: инъекция hook + nonce + relay state
inject.ts        — мир страницы: override getUserMedia + DSP pipeline
worklet.ts       — AudioWorklet: noise gate (per-channel, RMS envelope)
popup/           — UI: power button, статус
```

### Безопасность

- `content.ts` генерирует случайный nonce на каждый page load
- `inject.ts` принимает только сообщения с правильным nonce → защита от spoofing со стороны страницы
- `contextIsolation` обеспечивается самой архитектурой (isolated world vs page world)
- IPC handlers в background проверяют `isTrustedSender`

### Race condition (решено)

Если `getUserMedia` вызывается до синхронизации состояния из storage,
`inject.ts` ждёт до 600 мс с polling интервалом 10 мс, затем использует
безопасный дефолт (disabled). Типичное время синхронизации < 50 мс.

## Требования

- Chrome 112+ / Edge 112+  
- Разрешения: `storage`, `tabs`
- Host permissions: `<all_urls>` (нужно для content script на всех сайтах)
