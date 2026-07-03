import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Copy, Check, Terminal, ExternalLink,
  Apple, Monitor, ChevronDown, Info, AlertTriangle,
  RefreshCw, Puzzle, Chrome, Zap, CheckCircle2,
} from 'lucide-react';

type OS = 'mac' | 'win' | 'linux' | 'unknown';
type Tab = 'extension' | 'mac' | 'win';

function detectOS(): OS {
  const ua = navigator.userAgent.toLowerCase();
  const p = (navigator.platform || '').toLowerCase();
  if (p.includes('mac') || ua.includes('macintosh')) return 'mac';
  if (p.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

// ── Copy helpers ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
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
      {copied ? 'Скопировано!' : 'Копировать'}
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

// ── Extension guide ───────────────────────────────────────────────────────────
function ExtensionGuide({ extActive }: { extActive: boolean }) {
  return (
    <div className="space-y-5">
      {extActive ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-green-300">Расширение активно на этой вкладке</div>
            <div className="text-xs text-green-400/70 mt-0.5">
              Ваш микрофон автоматически очищается во всех звонках в этом браузере
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 p-3 bg-primary/5 border border-primary/15 rounded-lg">
          <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-primary/80 leading-relaxed space-y-1">
            <p className="font-semibold text-primary">Работает без виртуальных кабелей</p>
            <p>
              Расширение перехватывает микрофон прямо в браузере.
              Zoom, Google Meet, Битрикс24 — всё автоматически.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Как это работает</div>
        <div className="flex items-center gap-2 flex-wrap">
          {['Реальный микрофон', '→', 'NoiseGuard DSP', '→', 'Чистый голос в Zoom / Meet / Битрикс24'].map((s, i) => (
            s === '→'
              ? <span key={i} className="text-white/30 text-sm">→</span>
              : (
                <span key={i} className="bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs text-primary/80 font-mono">
                  {s}
                </span>
              )
          ))}
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Браузерная API позволяет перехватить поток микрофона до того, как его получит
          Zoom или другой сервис. Расширение встраивается прозрачно — никаких
          дополнительных настроек не нужно.
        </p>
      </div>

      {/* Install steps */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="text-sm font-bold text-white/90">Установка в 2 шага</div>
        <div className="space-y-3">
          {[
            {
              n: 1,
              title: 'Установите расширение',
              body: (
                <div className="flex flex-wrap gap-2 mt-2">
                  <a
                    href="https://chrome.google.com/webstore/detail/noiseguard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-colors"
                  >
                    <Chrome className="w-3.5 h-3.5" />
                    Chrome Web Store
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                  <span className="text-xs text-white/30 self-center">или Edge Add-ons</span>
                </div>
              ),
            },
            {
              n: 2,
              title: 'Откройте звонок',
              body: (
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Зайдите в Zoom Web, Google Meet или Битрикс24 как обычно.
                  В значке расширения нажмите кнопку «Включить» — ваш микрофон
                  мгновенно начнёт очищаться.
                </p>
              ),
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                {n}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white/80 font-medium">{title}</div>
                {body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dev mode note */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2">
        <div className="text-xs font-semibold text-white/50">Для разработчиков / тестирование</div>
        <p className="text-xs text-white/35 leading-relaxed">
          Пока расширение не опубликовано в Chrome Web Store, его можно загрузить
          вручную: скачайте папку <code className="bg-white/10 px-1 rounded">dist/</code> из репозитория,
          откройте <code className="bg-white/10 px-1 rounded">chrome://extensions</code>,
          включите «Режим разработчика», нажмите «Загрузить распакованное» и выберите папку.
        </p>
      </div>
    </div>
  );
}

// ── macOS guide ───────────────────────────────────────────────────────────────
const CURL_CMD =
  'curl -L -C - --retry 10 --retry-delay 3 --progress-bar \\\n  "https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg" \\\n  -o ~/Downloads/BlackHole2ch.pkg && open ~/Downloads/BlackHole2ch.pkg';

function MacOSGuide() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/80 leading-relaxed space-y-1">
          <p>Для десктопных приложений (нативный Zoom, Skype) нужен виртуальный кабель уровня ОС.</p>
          <p>
            <strong>BlackHole 2ch</strong> — бесплатный аудиокабель для macOS. Весит <strong>103 КБ</strong>.
          </p>
        </div>
      </div>
      <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-red-300/80 leading-relaxed space-y-1">
          <p>
            <strong>Не используйте</strong>{' '}
            <code className="bg-white/10 px-1 rounded">brew install blackhole-2ch</code> —
            скачивает без возобновления, при медленном соединении будет таймаут.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white/90">Терминал с возобновлением</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-mono tracking-wider">РЕКОМЕНДУЕТСЯ</span>
        </div>
        <CodeBlock code={CURL_CMD} multiline />
        <div className="flex items-center gap-2 pt-1">
          <RefreshCw className="w-3 h-3 text-green-400 shrink-0" />
          <span className="text-[11px] text-green-400/80">При обрыве — запустите снова: докачает с места остановки</span>
        </div>
      </div>
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
    </div>
  );
}

// ── Windows guide ─────────────────────────────────────────────────────────────
function WindowsGuide() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Для десктопных приложений (нативный Zoom, Skype) нужен <strong>VB-Audio CABLE</strong> — бесплатный виртуальный кабель.
        </p>
      </div>
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
        <span className="text-sm font-bold text-white/90">VB-Audio CABLE</span>
        <ol className="space-y-2.5">
          {[
            <>Скачайте и запустите <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">VBCABLE_Setup_x64.exe</code> <strong className="text-white/70">от имени администратора</strong></>,
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

// ── Main ──────────────────────────────────────────────────────────────────────
interface SetupGuideProps {
  open: boolean;
  onToggle: () => void;
  extActive: boolean;
}

export function SetupGuide({ open, onToggle, extActive }: SetupGuideProps) {
  const [os, setOs] = useState<OS>('unknown');
  const [tab, setTab] = useState<Tab>('extension');

  useEffect(() => {
    const detected = detectOS();
    setOs(detected);
    // Default tab: extension first; but if extension already active no need to push it
  }, []);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold tracking-widest text-white/90">ИНТЕГРАЦИЯ С ЗВОНКАМИ</span>
          {extActive && (
            <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-0.5">
              ✓ РАСШИРЕНИЕ АКТИВНО
            </span>
          )}
          {!extActive && os !== 'unknown' && (
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

              {/* Tab bar */}
              <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5 w-fit">
                {([
                  { id: 'extension', label: 'Расширение', icon: <Puzzle className="w-3.5 h-3.5" />, badge: 'РЕКОМЕНДУЕТСЯ' },
                  { id: 'mac', label: 'macOS', icon: <Apple className="w-3.5 h-3.5" />, badge: null },
                  { id: 'win', label: 'Windows', icon: <Monitor className="w-3.5 h-3.5" />, badge: null },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${
                      tab === t.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                    {t.badge && (
                      <span className="ml-1 text-[8px] bg-primary/30 text-primary rounded px-1 py-0.5 tracking-widest leading-none">
                        ★
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === 'extension' && <ExtensionGuide extActive={extActive} />}
              {tab === 'mac' && <MacOSGuide />}
              {tab === 'win' && <WindowsGuide />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
