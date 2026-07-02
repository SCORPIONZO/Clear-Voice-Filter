import React, { useEffect, useRef, useState } from 'react';
import { NoiseProcessor } from '@/audio/NoiseProcessor';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LevelMeter } from '@/components/LevelMeter';
import { WaveformDisplay } from '@/components/WaveformDisplay';
import { SpectrumDisplay } from '@/components/SpectrumDisplay';
import { dbToLinear } from '@/lib/utils';
import { Mic, Activity, Power, Settings2, ShieldCheck, ChevronDown, MonitorSpeaker } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NoiseGuardApp() {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processor, setProcessor] = useState<NoiseProcessor | null>(null);
  
  // Audio settings state
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
    }).catch(err => {
      console.warn("Could not enumerate devices:", err);
    });
  }, []);

  // Guaranteed teardown on component unmount — stops mic and audio context
  useEffect(() => {
    return () => { processor?.stop(); };
  }, [processor]);

  const handleToggleActive = async () => {
    if (isActive) {
      processor?.stop();
      setProcessor(null); // null out so analyser props become null → RAF loops terminate
      setIsActive(false);
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      
      const p = new NoiseProcessor();
      await p.init();
      await p.start(selectedDevice);
      
      // Apply current settings
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
      console.error(err);
      setError(err.name === 'NotAllowedError' 
        ? "Microphone permission denied. Please allow access." 
        : "Failed to start audio engine: " + err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  // Sync settings when they change while active
  useEffect(() => {
    if (processor && isActive) {
      processor.setGateThreshold(dbToLinear(thresholdDb));
    }
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
      {/* Header / Status Bar */}
      <header className="h-14 border-b border-white/5 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Activity className="w-4 h-4" />
          </div>
          <h1 className="font-bold tracking-widest text-sm text-white/90">NOISEGUARD</h1>
          <span className="text-white/20 px-2">|</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(0,212,216,0.8)]' : 'bg-white/20'}`} />
            <span className="text-xs font-mono font-medium text-white/50">
              {isActive ? 'ACTIVE' : 'STANDBY'}
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
              {devices.length === 0 && <option value="">Default Microphone</option>}
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}`}</option>
              ))}
            </select>
          </div>
          <div className="text-xs font-mono text-white/30 hidden md:block">
            48000 Hz / ~25ms Latency
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-6 py-3 text-sm flex items-center gap-3">
          <ShieldCheck className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 overflow-hidden">
        
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-20 custom-scrollbar">
          
          {/* Main Power */}
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
            <div className="mt-6 text-sm font-bold tracking-widest text-white/70">
              {isInitializing ? 'INITIALIZING ENGINE...' : (isActive ? 'PROCESSING AUDIO' : 'ENGINE OFFLINE')}
            </div>
          </div>

          {/* Engine Settings */}
          <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold tracking-widest text-white/90">DSP PIPELINE</h2>
            </div>

            {/* Neural Net */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-white/90 text-sm">RNNoise Suppressor</Label>
                <div className="text-xs text-white/40">AI neural network filtering</div>
              </div>
              <Switch checked={rnnoiseEnabled} onCheckedChange={setRnnoiseEnabled} />
            </div>

            {/* Compressor */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-white/90 text-sm">Dynamic Compressor</Label>
                <div className="text-xs text-white/40">8:1 Ratio, -24dB Threshold</div>
              </div>
              <Switch checked={compressorEnabled} onCheckedChange={setCompressorEnabled} />
            </div>

            <div className="h-px bg-white/5 my-2" />

            {/* Gate Controls */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">Gate Threshold</Label>
                <span className="text-xs font-mono text-primary">{thresholdDb} dB</span>
              </div>
              <Slider 
                value={[thresholdDb]} 
                onValueChange={(v) => setThresholdDb(v[0])} 
                min={-60} max={0} step={1} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-white/70 text-xs">Attack</Label>
                  <span className="text-[10px] font-mono text-white/40">{attackMs} ms</span>
                </div>
                <Slider value={[attackMs]} onValueChange={(v) => setAttackMs(v[0])} min={1} max={50} step={1} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-white/70 text-xs">Release</Label>
                  <span className="text-[10px] font-mono text-white/40">{releaseMs} ms</span>
                </div>
                <Slider value={[releaseMs]} onValueChange={(v) => setReleaseMs(v[0])} min={50} max={500} step={10} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">High-Pass Filter</Label>
                <span className="text-xs font-mono text-primary">{hpCutoff} Hz</span>
              </div>
              <Slider value={[hpCutoff]} onValueChange={(v) => setHpCutoff(v[0])} min={60} max={300} step={5} />
            </div>

            <div className="h-px bg-white/5 my-2" />

            {/* Output */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-white/90 text-sm">Output Gain</Label>
                <span className="text-xs font-mono text-primary">{outputVol}%</span>
              </div>
              <Slider value={[outputVol]} onValueChange={(v) => setOutputVol(v[0])} min={0} max={200} step={1} />
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
              <div className="space-y-1 flex items-center gap-3">
                <MonitorSpeaker className={`w-4 h-4 ${monitorEnabled ? 'text-warning' : 'text-white/30'}`} />
                <div>
                  <Label className="text-white/90 text-sm">Direct Monitor</Label>
                  <div className="text-[10px] text-warning/70">Warning: Can cause feedback loop</div>
                </div>
              </div>
              <Switch checked={monitorEnabled} onCheckedChange={setMonitorEnabled} />
            </div>

          </div>
        </div>

        {/* Right Column: Visualizers */}
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-card-border rounded-xl p-6 flex-1 flex flex-col gap-6 min-h-[400px]">
            {/* Visualizer Top Half */}
            <div className="flex-1 flex gap-6">
              <LevelMeter analyser={processor?.inAnalyser || null} label="IN" />
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1">
                  <WaveformDisplay 
                    inAnalyser={processor?.inAnalyser || null}
                    outAnalyser={processor?.outAnalyser || null}
                  />
                </div>
                <div className="flex-1">
                  <SpectrumDisplay analyser={processor?.outAnalyser || null} />
                </div>
              </div>
              <LevelMeter analyser={processor?.outAnalyser || null} label="OUT" />
            </div>
          </div>

          {/* Integration Guide */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold tracking-widest text-white/90">VIRTUAL AUDIO SETUP</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 text-sm text-white/60 space-y-4"
                >
                  <div className="h-px bg-white/5 mb-4" />
                  <p>To use NoiseGuard with Zoom, Discord, or OBS, you need a virtual audio cable like BlackHole (macOS) or VB-Cable (Windows).</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Install <strong>BlackHole 2ch</strong> (macOS) or <strong>VB-Cable</strong> (Windows).</li>
                    <li>In your OS Sound Settings, set your System Output to the Virtual Cable.</li>
                    <li>Enable <strong>Direct Monitor</strong> above in NoiseGuard.</li>
                    <li>In Zoom/Discord, set your Microphone to the Virtual Cable.</li>
                  </ol>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-primary/90 text-xs">
                    Note: Ensure your browser is allowed to run audio processing in the background if you switch tabs.
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