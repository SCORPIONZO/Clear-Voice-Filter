import React, { useEffect, useState } from 'react';
import { NoiseProcessor } from '@/audio/NoiseProcessor';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LevelMeter } from '@/components/LevelMeter';
import { WaveformDisplay } from '@/components/WaveformDisplay';
import { SpectrumDisplay } from '@/components/SpectrumDisplay';
import { TestRecording } from '@/components/TestRecording';
import { dbToLinear } from '@/lib/utils';
import {
  Mic, Activity, Power, Settings2, ShieldCheck,
  ChevronDown, MonitorSpeaker, Download, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NoiseGuardApp() {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processor, setProcessor] = useState<NoiseProcessor | null>(null);

  // Audio settings
  const [thresholdDb, setThresholdDb] = useState(-40);
  const [attackMs, setAttackMs] = useState(5);
  const [releaseMs, setReleaseMs] = useState(150);
  const [hpCutoff, setHpCutoff] = useState(80);
  const [rnnoiseEnabled, setRnnoiseEnabled] = useState(true);
  const [compressorEnabled, setCompressorEnabled] = useState(true);
  const [outputVol, setOutputVol] = useState(100);
  const [monitorEnabled, setMonitorEnabled] = useState(false);

  // Devices
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const audioIns = devs.filter(d => d.kind === 'audioinput');
      setDevices(audioIns);
      if (audioIns.length > 0 && !selectedDevice) {
        setSelectedDevice(audioIns[0].deviceId);
      }
    }).catch(() => {});
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => { processor?.stop(); };
  }, [processor]);

  const handleToggleActive = async () => {
    if (isActive) {
      processor?.stop();
      setProcessor(null);
      setIsActive(false);
      return;
    }
    try {
      setIsInitializing(true);
      setError(null);
      const p = new NoiseProcessor();
      await p.init();
      await p.start(selectedDevice);
      p.setGateThreshold(dbToLinear(thresholdDb));
      p.setGateAttack(attackMs / 1000);
      p.setGateRelease(releaseMs / 1000);
      p.setHighpassCutoff(hpCutoff);
      p.setRnnoiseEnabled(rnnoiseEnabled);
      p.setCompressorEnabled(compressorEnabled);
      p.setOutputVolume(outputVol / 100);
      p.setMonitorEnabled(monitorEnabled);
      setProcessor(p);
      setIsActive(true);
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
          : 'Ошибка запуска движка: ' + err.message,
      );
    } finally {
      setIsInitializing(false);
    }
  };

  // Sync settings live
  useEffect(() => {
    if (processor && isActive) processor.setGateThreshold(dbToLinear(thresholdDb));
  }, [thresholdDb, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setGateAttack(attackMs / 1000);
  }, [attackMs, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setGateRelease(releaseMs / 1000);
  }, [releaseMs, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setHighpassCutoff(hpCutoff);
  }, [hpCutoff, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setRnnoiseEnabled(rnnoiseEnabled);
  }, [rnnoiseEnabled, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setCompressorEnabled(compressorEnabled);
  }, [compressorEnabled, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setOutputVolume(outputVol / 100);
  }, [outputVol, processor, isActive]);
  useEffect(() => {
    if (processor && isActive) processor.setMonitorEnabled(monitorEnabled);
  }, [monitorEnabled, processor, isActive]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Activity className="w-4 h-4" />
          </div>
          <h1 className="font-bold tracking-widest text-sm text-white/90">NOISEGUARD</h1>
          <span className="text-white/20 px-2">|</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(0,212,216,0.8)]' : 'bg-white/20'}`} />
            <span className="text-xs font-mono font-medium text-white/50">
              {isActive ? 'АКТИВЕН' : 'ОЖИДАНИЕ'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-white/40" />
            <select
              className="bg-transparent text-xs font-mono text-white/70 border-none outline-none appearance-none cursor-pointer max-w-[200px] truncate"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isActive}
            >
              {devices.length === 0 && <option value="">Микрофон по умолчанию</option>}
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Микрофон ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs font-mono text-white/30 hidden md:block">
            48000 Гц / ~25мс Задержка
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-6 py-3 text-sm flex items-center gap-3">
          <ShieldCheck className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 overflow-hidden">

        {/* Left: Controls */}
        <div className="flex flex-col gap-5 overflow-y-auto pr-1 pb-20">

          {/* Power button */}
          <div className="bg-card border border-card-border rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              onClick={handleToggleActive}
              disabled={isInitializing}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500
                ${isActive
                  ? 'bg-primary text-black shadow-[0_0_40px_rgba(0,212,216,0.4)] hover:shadow-[0_0_60px_rgba(0,212,216,0.6)]'
                  : 'bg-secondary text-white/50 hover:bg-secondary/80 border border-white/5'
                }`}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20" />
              )}
              <Power className={`w-8 h-8 ${isInitializing ? 'animate-pulse' : ''}`} />
            </button>
            <div className="mt-6 text-sm font-bold tracking-widest text-white/70 text-center">
              {isInitializing
                ? 'ИНИЦИАЛИЗАЦИЯ...'
                : isActive
                  ? 'ОБРАБОТКА ЗВУКА'
                  : 'ДВИЖОК ВЫКЛЮЧЕН'}
            </div>
            {isActive && (
              <div className="mt-2 text-xs text-white/30 tracking-wider">
                Нажмите для остановки
              </div>
            )}
          </div>

          {/* DSP Pipeline */}
          <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold tracking-widest text-white/90">DSP КОНВЕЙЕР</h2>
            </div>

            {/* RNNoise */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white/90 text-sm">RNNoise ИИ-подавитель</Label>
                <div className="text-xs text-white/40">Нейросетевая фильтрация шума</div>
              </div>
              <Switch checked={rnnoiseEnabled} onCheckedChange={setRnnoiseEnabled} />
            </div>

            {/* Compressor */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white/90 text-sm">Динамический компрессор</Label>
                <div className="text-xs text-white/40">Соотношение 8:1, порог –24 дБ</div>
              </div>
              <Switch checked={compressorEnabled} onCheckedChange={setCompressorEnabled} />
            </div>

            <div className="h-px bg-white/5" />

            {/* Gate Threshold */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">Порог шумовых ворот</Label>
                <span className="text-xs font-mono text-primary">{thresholdDb} дБ</span>
              </div>
              <Slider value={[thresholdDb]} onValueChange={(v) => setThresholdDb(v[0])} min={-60} max={0} step={1} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-white/70 text-xs">Атака</Label>
                  <span className="text-[10px] font-mono text-white/40">{attackMs} мс</span>
                </div>
                <Slider value={[attackMs]} onValueChange={(v) => setAttackMs(v[0])} min={1} max={50} step={1} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-white/70 text-xs">Спад</Label>
                  <span className="text-[10px] font-mono text-white/40">{releaseMs} мс</span>
                </div>
                <Slider value={[releaseMs]} onValueChange={(v) => setReleaseMs(v[0])} min={50} max={500} step={10} />
              </div>
            </div>

            {/* High-pass */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">Фильтр верхних частот</Label>
                <span className="text-xs font-mono text-primary">{hpCutoff} Гц</span>
              </div>
              <Slider value={[hpCutoff]} onValueChange={(v) => setHpCutoff(v[0])} min={60} max={300} step={5} />
            </div>

            <div className="h-px bg-white/5" />

            {/* Output gain */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">Выходное усиление</Label>
                <span className="text-xs font-mono text-primary">{outputVol}%</span>
              </div>
              <Slider value={[outputVol]} onValueChange={(v) => setOutputVol(v[0])} min={0} max={200} step={1} />
            </div>

            {/* Monitor */}
            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <MonitorSpeaker className={`w-4 h-4 ${monitorEnabled ? 'text-amber-400' : 'text-white/30'}`} />
                <div>
                  <Label className="text-white/90 text-sm">Прямой мониторинг</Label>
                  <div className="text-[10px] text-amber-400/70">Осторожно: возможна обратная связь</div>
                </div>
              </div>
              <Switch checked={monitorEnabled} onCheckedChange={setMonitorEnabled} />
            </div>
          </div>

          {/* Test Recording */}
          <TestRecording
            rawStream={processor?.getRawStream() ?? null}
            processedStream={processor?.getProcessedStream() ?? null}
            isActive={isActive}
          />
        </div>

        {/* Right: Visualizers + Guide */}
        <div className="flex flex-col gap-5">

          {/* Visualizer panel */}
          <div className="bg-card border border-card-border rounded-xl p-5 flex-1 flex flex-col gap-4 min-h-[380px]">
            <div className="flex-1 flex gap-4">
              <LevelMeter analyser={processor?.inAnalyser ?? null} label="ВХОД" />
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1">
                  <WaveformDisplay
                    inAnalyser={processor?.inAnalyser ?? null}
                    outAnalyser={processor?.outAnalyser ?? null}
                  />
                </div>
                <div className="flex-1">
                  <SpectrumDisplay analyser={processor?.outAnalyser ?? null} />
                </div>
              </div>
              <LevelMeter analyser={processor?.outAnalyser ?? null} label="ВЫХОД" />
            </div>
          </div>

          {/* Bitrix24 / BlackHole setup guide */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold tracking-widest text-white/90">
                  ИНТЕГРАЦИЯ С БИТРИКС24
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-5">
                    <div className="h-px bg-white/5" />

                    {/* Step 1 — download BlackHole */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold tracking-widest text-white/50">
                        ШАГ 1 — ВИРТУАЛЬНЫЙ АУДИО КАБЕЛЬ
                      </div>
                      <p className="text-sm text-white/60">
                        Для передачи очищенного звука в Битрикс24 нужен бесплатный драйвер
                        виртуального кабеля — <strong className="text-white/80">BlackHole 2ch</strong>.
                        Он перехватывает обработанный NoiseGuard сигнал и подаёт его как микрофон
                        в любое приложение.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <a
                          href="https://github.com/ExistentialAudio/BlackHole/releases/latest/download/BlackHole2ch.pkg"
                          download
                          className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2.5 text-sm font-bold tracking-widest transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          СКАЧАТЬ BLACKHOLE 2CH
                        </a>
                        <a
                          href="https://existential.audio/blackhole/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-lg px-4 py-2.5 text-sm transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Официальный сайт
                        </a>
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Steps 2-5 */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold tracking-widest text-white/50">
                        ШАГ 2–5 — НАСТРОЙКА МАРШРУТА
                      </div>
                      <ol className="space-y-3 text-sm text-white/60">
                        <li className="flex gap-3">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                          Установите скачанный .pkg и перезагрузите Mac
                        </li>
                        <li className="flex gap-3">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                          Включите <strong className="text-white/80">Прямой мониторинг</strong> в NoiseGuard (переключатель выше)
                        </li>
                        <li className="flex gap-3">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span>
                          В системных настройках macOS → Звук → Вывод →
                          выберите <strong className="text-white/80">BlackHole 2ch</strong>
                        </li>
                        <li className="flex gap-3">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">5</span>
                          В Битрикс24 → Настройки звонка → Микрофон →
                          выберите <strong className="text-white/80">BlackHole 2ch</strong>
                        </li>
                      </ol>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary/90 text-xs leading-relaxed">
                      После настройки: Битрикс24 получает уже очищенный звук от NoiseGuard.
                      Держите браузер с NoiseGuard открытым во время звонков.
                      Движок работает в фоне — не надо ничего нажимать во время разговора.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
