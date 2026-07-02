import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Copy, Check, Terminal, ExternalLink,
  Apple, Monitor, ChevronDown, Info, AlertTriangle, RefreshCw,
} from 'lucide-react';

type OS = 'mac' | 'win' | 'linux' | 'unknown';

function detectOS(): OS {
  const ua = navigator.userAgent.toLowerCase();
  const p = (navigator.platform || '').toLowerCase();
  if (p.includes('mac') || ua.includes('macintosh')) return 'mac';
  if (p.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

// ─── Shell scripts ────────────────────────────────────────────────────────────

// Primary macOS script: curl with resume + retry, no Homebrew dependency
const BH_CURL_SCRIPT = `#!/usr/bin/env bash
# ============================================================
#  NoiseGuard — загрузка BlackHole 2ch с возобновлением
#  Работает при медленном / нестабильном соединении
#  Запустить: bash ~/Downloads/noiseguard-blackhole.sh
# ============================================================
set -euo pipefail

URL="https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg"
DEST="$HOME/Downloads/BlackHole2ch-0.7.0.pkg"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  NoiseGuard · Загрузка BlackHole 2ch     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# curl: -C - возобновить, --retry 10 повторить, --retry-delay 3 задержка
echo "► Загружаем BlackHole 2ch (с возобновлением)..."
curl -L -C - --retry 10 --retry-delay 3 --progress-bar \\
     "$URL" -o "$DEST"

echo ""
echo "✓ Загрузка завершена: $DEST"
echo "► Открываем установщик..."
open "$DEST"

echo ""
echo "Установите пакет, перезагрузите Mac, затем:"
echo "  1. Системные настройки → Звук → Вывод → BlackHole 2ch"
echo "  2. В NoiseGuard: включить «Прямой мониторинг»"
echo "  3. В Битрикс24 → Микрофон → BlackHole 2ch"
`;

function downloadScript(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/x-sh' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Копировать' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
        bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors
        text-white/50 hover:text-white/80 shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Скопировано!' : label}
    </button>
  );
}

function CodeBlock({ code, multiline = false }: { code: string; multiline?: boolean }) {
  return (
    <div className={`flex ${multiline ? 'flex-col gap-3' : 'items-center gap-2'} bg-black/60 border border-white/10 rounded-lg px-4 py-3`}>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Terminal className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <code className="flex-1 text-xs font-mono text-primary/90 break-all whitespace-pre-wrap leading-relaxed">{code}</code>
      </div>
      <CopyButton text={code} />
    </div>
  );
}

// ─── macOS guide ─────────────────────────────────────────────────────────────
const CURL_CMD =
  'curl -L -C - --retry 10 --retry-delay 3 --progress-bar \\\n  "https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg" \\\n  -o ~/Downloads/BlackHole2ch.pkg && open ~/Downloads/BlackHole2ch.pkg';

const CURL_CMD_PLAIN =
  'curl -L -C - --retry 10 --retry-delay 3 --progress-bar "https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg" -o ~/Downloads/BlackHole2ch.pkg && open ~/Downloads/BlackHole2ch.pkg';

function MacOSGuide() {
  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/80 leading-relaxed space-y-1">
          <p>Браузер не может создать виртуальный микрофон — это уровень ядра ОС.</p>
          <p>
            Нужен <strong>BlackHole 2ch</strong> — единственный актуальный бесплатный
            виртуальный аудиокабель для macOS. Файл весит <strong>103 КБ</strong>.
          </p>
        </div>
      </div>

      {/* Warning: don't use brew */}
      <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-red-300/80 leading-relaxed space-y-1">
          <p>
            <strong>Не используйте</strong>{' '}
            <code className="bg-white/10 px-1 rounded">brew install blackhole-2ch</code> —
            Homebrew скачивает с existential.audio без возобновления.
            При медленном соединении будет таймаут.
          </p>
          <p>
            <code className="bg-white/10 px-1 rounded">soundflower</code> устарел
            и отключён в Homebrew с ноября 2025.
          </p>
        </div>
      </div>

      {/* Option A: curl with resume — RECOMMENDED */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white/90">Способ A — Терминал с возобновлением</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-mono tracking-wider">
            РЕКОМЕНДУЕТСЯ
          </span>
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          <code className="bg-white/10 px-1 rounded">curl</code> с флагами{' '}
          <code className="bg-white/10 px-1 rounded">-C -</code> (возобновление) и{' '}
          <code className="bg-white/10 px-1 rounded">--retry 10</code> (10 попыток) —
          докачает файл даже при обрывах соединения.
          Вставьте команду в <strong className="text-white/70">Терминал</strong> и нажмите Enter:
        </p>

        <CodeBlock code={CURL_CMD} multiline />

        <div className="flex items-center gap-2 pt-1">
          <RefreshCw className="w-3 h-3 text-green-400 shrink-0" />
          <span className="text-[11px] text-green-400/80">
            Если прервалось — запустите ту же команду снова: докачает с места обрыва
          </span>
        </div>
      </div>

      {/* Option B: download script */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <span className="text-sm font-semibold text-white/70">Способ B — Скрипт-загрузчик</span>
        <p className="text-xs text-white/40 leading-relaxed">
          Скачайте готовый .sh скрипт — он сам запустит curl с нужными параметрами
          и откроет установщик.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => downloadScript(BH_CURL_SCRIPT, 'noiseguard-blackhole.sh')}
            className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            СКАЧАТЬ СКРИПТ
          </button>
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white/40">
            <Terminal className="w-3 h-3" />
            bash ~/Downloads/noiseguard-blackhole.sh
            <CopyButton text="bash ~/Downloads/noiseguard-blackhole.sh" />
          </div>
        </div>
      </div>

      {/* Option C: browser download */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <span className="text-sm font-semibold text-white/70">Способ C — Браузер</span>
        <p className="text-xs text-white/40 leading-relaxed">
          Скачайте .pkg через браузер напрямую с сайта. Браузер сам возобновит загрузку
          при обрыве.
        </p>
        <a
          href="https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg"
          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          BlackHole2ch-0.7.0.pkg (103 КБ)
        </a>
      </div>

      {/* After install */}
      <div className="h-px bg-white/5" />
      <div className="space-y-2.5">
        <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase">После установки</div>
        {[
          'Перезагрузите Mac',
          'Системные настройки → Звук → Вывод → BlackHole 2ch',
          'В NoiseGuard: включить «Прямой мониторинг»',
          'В Битрикс24 → Настройки → Микрофон → BlackHole 2ch',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-white/60">
            <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary/90 text-xs leading-relaxed">
        Держите NoiseGuard открытым в браузере во время звонков.
        Битрикс24 будет слышать уже очищенный голос.
      </div>
    </div>
  );
}

// ─── Windows guide ───────────────────────────────────────────────────────────
function WindowsGuide() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          На Windows используется <strong>VB-Audio CABLE</strong> — бесплатный виртуальный кабель.
          Загружается с официального сайта, установка 2 минуты.
        </p>
      </div>

      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <span className="text-sm font-bold text-white/90">VB-Audio CABLE</span>
        <ol className="space-y-2.5">
          {[
            <>Скачайте архив с официального сайта VB-Audio</>,
            <>Распакуйте и запустите <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">VBCABLE_Setup_x64.exe</code> <strong className="text-white/70">от имени администратора</strong></>,
            <>Перезагрузите компьютер</>,
            <>Панель управления → Звук → Запись → <strong className="text-white/80">CABLE Output</strong> → «По умолчанию»</>,
            <>Битрикс24 → Настройки → Микрофон → <strong className="text-white/80">CABLE Output (VB-Audio)</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/60">
              <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <a
          href="https://vb-audio.com/Cable/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2.5 text-sm font-bold tracking-wider transition-colors"
        >
          <Download className="w-4 h-4" />
          СКАЧАТЬ VB-AUDIO CABLE
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
interface SetupGuideProps {
  open: boolean;
  onToggle: () => void;
}

export function SetupGuide({ open, onToggle }: SetupGuideProps) {
  const [os, setOs] = useState<OS>('unknown');
  const [tab, setTab] = useState<'mac' | 'win'>('mac');

  useEffect(() => {
    const detected = detectOS();
    setOs(detected);
    if (detected === 'win') setTab('win');
  }, []);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold tracking-widest text-white/90">
            ИНТЕГРАЦИЯ С БИТРИКС24
          </span>
          {os !== 'unknown' && (
            <span className="text-[10px] font-mono text-white/30 bg-white/5 border border-white/10 rounded px-2 py-0.5">
              {os === 'mac' ? 'macOS' : os === 'win' ? 'Windows' : 'Linux'}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              <div className="h-px bg-white/5" />

              <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5 w-fit">
                {(['mac', 'win'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${
                      tab === t
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t === 'mac' ? <Apple className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    {t === 'mac' ? 'macOS' : 'Windows'}
                  </button>
                ))}
              </div>

              {tab === 'mac' ? <MacOSGuide /> : <WindowsGuide />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
