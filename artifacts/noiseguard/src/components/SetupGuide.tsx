import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Copy, Check, Terminal, ExternalLink,
  Apple, Monitor, ChevronDown, Info,
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

// ─── Shell-script content ─────────────────────────────────────────────────────
const INSTALL_SCRIPT = `#!/usr/bin/env bash
# ============================================================
#  NoiseGuard — автоустановка виртуального аудио кабеля
#  macOS (BlackHole 2ch)
#  Запустить: bash ~/Downloads/noiseguard-setup.sh
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║    NoiseGuard · Установка BlackHole  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Homebrew -------------------------------------------------------
if ! command -v brew &>/dev/null; then
  echo "► Homebrew не найден — устанавливаем..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon path fix
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
else
  echo "✓ Homebrew уже установлен"
fi

# 2. BlackHole 2ch --------------------------------------------------
if brew list --cask blackhole-2ch &>/dev/null 2>&1; then
  echo "✓ BlackHole 2ch уже установлен"
elif brew list blackhole-2ch &>/dev/null 2>&1; then
  echo "✓ BlackHole 2ch уже установлен"
else
  echo "► Устанавливаем BlackHole 2ch..."
  brew install blackhole-2ch || brew install --cask blackhole-2ch
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Установка завершена!                ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Следующие шаги:"
echo "  1. Системные настройки → Звук → Вывод → BlackHole 2ch"
echo "  2. В NoiseGuard включите «Прямой мониторинг»"
echo "  3. В Битрикс24 → Настройки → Микрофон → BlackHole 2ch"
echo ""
echo "Готово. Держите NoiseGuard открытым во время звонков."
`;

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label: string }) {
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
        bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors text-white/50 hover:text-white/80 shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Скопировано' : label}
    </button>
  );
}

// ─── Code block ──────────────────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-lg px-4 py-3">
      <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
      <code className="flex-1 text-xs font-mono text-primary/90 break-all">{code}</code>
      <CopyButton text={code} label="Копировать" />
    </div>
  );
}

// ─── Download script ─────────────────────────────────────────────────────────
function downloadScript() {
  const blob = new Blob([INSTALL_SCRIPT], { type: 'text/x-sh' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'noiseguard-setup.sh';
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
          Нужен один небольшой системный драйвер. Ниже — три способа его установить:
          самый простой занимает <strong>30 секунд</strong>.
        </p>
      </div>

      {/* Option A — Homebrew (recommended) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
          <span className="text-sm font-semibold text-white/80">Одна команда в Терминале</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-mono">РЕКОМЕНДУЕТСЯ</span>
        </div>
        <p className="text-xs text-white/40 pl-7">Через Homebrew — установит всё автоматически, включая Homebrew если его нет.</p>
        <div className="pl-7">
          <CodeBlock code="brew install blackhole-2ch" />
        </div>
        <div className="pl-7 text-xs text-white/30">
          Нет Homebrew? Сначала:&nbsp;
          <code className="text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
          </code>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Option B — auto script */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
          <span className="text-sm font-semibold text-white/70">Скрипт-автоустановщик (.sh)</span>
        </div>
        <p className="text-xs text-white/40 pl-7">
          Скачайте скрипт и запустите в Терминале — он сам проверит Homebrew и установит BlackHole.
        </p>
        <div className="pl-7 flex flex-wrap gap-2">
          <button
            onClick={downloadScript}
            className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            СКАЧАТЬ СКРИПТ
          </button>
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white/40">
            <Terminal className="w-3 h-3" />
            bash ~/Downloads/noiseguard-setup.sh
            <CopyButton text="bash ~/Downloads/noiseguard-setup.sh" label="Копировать" />
          </div>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Option C — direct pkg */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold flex items-center justify-center shrink-0">C</span>
          <span className="text-sm font-semibold text-white/70">Прямая загрузка .pkg (v0.7.0)</span>
        </div>
        <p className="text-xs text-white/40 pl-7">Скачайте установщик и дважды кликните по нему — обычная macOS установка.</p>
        <div className="pl-7 flex flex-wrap gap-2">
          <a
            href="https://github.com/ExistentialAudio/BlackHole/releases/download/v0.7.0/BlackHole2ch.pkg"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            BlackHole2ch.pkg (v0.7.0)
          </a>
          <a
            href="https://github.com/ExistentialAudio/BlackHole/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors px-2"
          >
            <ExternalLink className="w-3 h-3" />
            GitHub Releases
          </a>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Steps after install */}
      <div className="space-y-3">
        <div className="text-xs font-bold tracking-widest text-white/40">ПОСЛЕ УСТАНОВКИ</div>
        <ol className="space-y-2.5">
          {[
            'Системные настройки macOS → Звук → Вывод → выбрать BlackHole 2ch',
            'В NoiseGuard включить переключатель «Прямой мониторинг»',
            'В Битрикс24 → Настройки → Микрофон → BlackHole 2ch',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/60">
              <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
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
          На Windows аналог BlackHole называется <strong>VB-Cable</strong> — бесплатный виртуальный аудиокабель.
          Установка занимает 2 минуты.
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold tracking-widest text-white/40">УСТАНОВКА VB-CABLE</div>
        <ol className="space-y-3">
          {[
            <>Скачайте VB-Cable с официального сайта</>,
            <>Распакуйте архив и запустите <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">VBCABLE_Setup_x64.exe</code> от администратора</>,
            <>Перезагрузите компьютер</>,
            <>В Системных настройках звука → Запись → выберите <strong className="text-white/80">CABLE Output</strong></>,
            <>В Битрикс24 → Настройки → Микрофон → <strong className="text-white/80">CABLE Output (VB-Audio)</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/60">
              <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

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

      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary/90 text-xs leading-relaxed">
        После установки NoiseGuard нужно держать открытым в браузере во время звонков.
        Включите «Прямой мониторинг» — и Битрикс24 будет слышать только чистый голос.
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
      {/* Header toggle */}
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
            <div className="px-6 pb-6 space-y-5">
              <div className="h-px bg-white/5" />

              {/* OS tabs */}
              <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5 w-fit">
                <button
                  onClick={() => setTab('mac')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${
                    tab === 'mac'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  macOS
                </button>
                <button
                  onClick={() => setTab('win')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${
                    tab === 'win'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Windows
                </button>
              </div>

              {tab === 'mac' ? <MacOSGuide /> : <WindowsGuide />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
