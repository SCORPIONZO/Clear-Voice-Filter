import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Copy, Check, Terminal, ExternalLink,
  Apple, Monitor, ChevronDown, Info, AlertTriangle,
} from 'lucide-react';

// ─── OS detection ────────────────────────────────────────────────────────────
type OS = 'mac' | 'win' | 'linux' | 'unknown';

function detectOS(): OS {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (platform.includes('mac') || ua.includes('macintosh')) return 'mac';
  if (platform.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

// ─── Scripts ─────────────────────────────────────────────────────────────────
const SOUNDFLOWER_SCRIPT = `#!/usr/bin/env bash
# ============================================================
#  NoiseGuard — автоустановка Soundflower (macOS)
#  Soundflower — бесплатный виртуальный аудиокабель
#  Скачивается с GitHub, работает быстро
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  NoiseGuard · Установка Soundflower  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Homebrew -------------------------------------------------------
if ! command -v brew &>/dev/null; then
  echo "► Homebrew не найден — устанавливаем..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
else
  echo "✓ Homebrew уже установлен"
fi

# 2. Soundflower ----------------------------------------------------
if brew list --cask soundflower &>/dev/null 2>&1; then
  echo "✓ Soundflower уже установлен"
else
  echo "► Устанавливаем Soundflower..."
  brew install --cask soundflower
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Установка завершена!                ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Следующие шаги:"
echo "  1. Системные настройки → Звук → Вывод → Soundflower (2ch)"
echo "  2. В NoiseGuard включите «Прямой мониторинг»"
echo "  3. В Битрикс24 → Настройки → Микрофон → Soundflower (2ch)"
echo ""
echo "Готово. Держите NoiseGuard открытым во время звонков."
`;

const BLACKHOLE_SCRIPT = `#!/usr/bin/env bash
# ============================================================
#  NoiseGuard — скачать и установить BlackHole напрямую с GitHub
#  (обход медленного сервера existential.audio)
# ============================================================
set -e

VERSION="v0.6.0"
PKG="BlackHole2ch.pkg"
URL="https://github.com/ExistentialAudio/BlackHole/releases/download/\${VERSION}/\${PKG}"
DEST="\$HOME/Downloads/\${PKG}"

echo "► Скачиваем BlackHole \${VERSION} с GitHub CDN..."
curl -L --progress-bar "\$URL" -o "\$DEST"

echo "► Открываем установщик..."
open "\$DEST"

echo ""
echo "Установите пакет, перезагрузите Mac, затем:"
echo "  Системные настройки → Звук → Вывод → BlackHole 2ch"
`;

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

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-lg px-4 py-3">
      <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
      <code className="flex-1 text-xs font-mono text-primary/90 break-all">{code}</code>
      <CopyButton text={code} />
    </div>
  );
}

function downloadScript(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/x-sh' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── macOS tab ───────────────────────────────────────────────────────────────
function MacOSGuide() {
  return (
    <div className="space-y-5">
      {/* Why needed */}
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Браузер не может создать виртуальный микрофон — это уровень ядра ОС.
          Нужен один системный драйвер. Ниже — два варианта на выбор;
          самый простой занимает <strong>30 секунд</strong>.
        </p>
      </div>

      {/* ── Option 1: Soundflower (recommended) ── */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white/90">Soundflower</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-mono tracking-wider">
            РЕКОМЕНДУЕТСЯ · БЫСТРО
          </span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          Бесплатный виртуальный кабель. Скачивается с <strong className="text-white/70">GitHub CDN</strong> — быстро и надёжно.
          Одна команда в Терминале — и готово.
        </p>

        {/* Homebrew one-liner */}
        <CodeBlock code="brew install --cask soundflower" />

        {/* Script download */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => downloadScript(SOUNDFLOWER_SCRIPT, 'noiseguard-soundflower.sh')}
            className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            СКАЧАТЬ СКРИПТ
          </button>
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white/40">
            <Terminal className="w-3 h-3" />
            bash ~/Downloads/noiseguard-soundflower.sh
            <CopyButton text="bash ~/Downloads/noiseguard-soundflower.sh" />
          </div>
        </div>

        {/* After install */}
        <div className="pt-1 space-y-1.5 text-xs text-white/40">
          <div className="font-semibold text-white/50 uppercase tracking-widest text-[10px]">После установки:</div>
          {[
            'Системные настройки → Звук → Вывод → Soundflower (2ch)',
            'В NoiseGuard: включить «Прямой мониторинг»',
            'В Битрикс24 → Микрофон → Soundflower (2ch)',
          ].map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-primary font-bold">{i + 1}.</span> {s}
            </div>
          ))}
        </div>
      </div>

      {/* ── Option 2: BlackHole direct from GitHub ── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white/70">BlackHole 2ch</span>
          <span className="text-[10px] bg-white/10 text-white/40 border border-white/10 rounded px-2 py-0.5 font-mono tracking-wider">
            АЛЬТЕРНАТИВА
          </span>
        </div>

        <div className="flex gap-2 items-start p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-300/80 leading-relaxed">
            <code className="bg-white/10 px-1 rounded">brew install blackhole-2ch</code> скачивает
            с медленного <strong>existential.audio</strong> — часто таймаут.
            Вместо этого скачайте .pkg напрямую с GitHub:
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="https://github.com/ExistentialAudio/BlackHole/releases/download/v0.6.0/BlackHole2ch.pkg"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            BlackHole2ch v0.6.0 (GitHub CDN)
          </a>
          <button
            onClick={() => downloadScript(BLACKHOLE_SCRIPT, 'noiseguard-blackhole.sh')}
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-lg px-4 py-2 text-xs transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            Скрипт-загрузчик .sh
          </button>
          <a
            href="https://github.com/ExistentialAudio/BlackHole/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors px-2"
          >
            <ExternalLink className="w-3 h-3" />
            Все релизы
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Windows tab ─────────────────────────────────────────────────────────────
function WindowsGuide() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          На Windows аналог — <strong>VB-Audio Virtual Cable</strong> (бесплатно).
          Скачивается быстро, установка 2 минуты.
        </p>
      </div>

      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <span className="text-sm font-bold text-white/90">VB-Cable</span>
        <ol className="space-y-2.5">
          {[
            <>Скачайте архив с официального сайта VB-Audio</>,
            <>Распакуйте и запустите <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">VBCABLE_Setup_x64.exe</code> <strong className="text-white/70">от администратора</strong></>,
            <>Перезагрузите компьютер</>,
            <>Настройки звука Windows → Запись → <strong className="text-white/80">CABLE Output</strong> → установить по умолчанию</>,
            <>Битрикс24 → Настройки → Микрофон → <strong className="text-white/80">CABLE Output (VB-Audio)</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/60">
              <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
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
          СКАЧАТЬ VB-CABLE
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary/90 text-xs leading-relaxed">
        После установки держите NoiseGuard открытым в браузере во время звонков.
        Включите «Прямой мониторинг» — Битрикс24 будет слышать только чистый голос.
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

              {/* OS tabs */}
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
