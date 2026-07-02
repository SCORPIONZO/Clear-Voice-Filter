import React, { useEffect, useRef, useState } from 'react';
import { NoiseProcessor } from '@/audio/NoiseProcessor';

interface LevelMeterProps {
  analyser: AnalyserNode | null;
  label: string;
}

export function LevelMeter({ analyser, label }: LevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peakDb, setPeakDb] = useState(-100);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const dataArray = new Float32Array(analyser.fftSize);
    
    let animationId: number;
    let peakHold = -100;
    let peakHoldTimer = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      analyser.getFloatTimeDomainData(dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;

      if (db > peakHold) {
        peakHold = db;
        peakHoldTimer = 60; // hold for 60 frames (~1s)
      } else {
        if (peakHoldTimer > 0) {
          peakHoldTimer--;
        } else {
          peakHold -= 0.5; // decay
        }
      }

      setPeakDb(Math.max(-100, Math.round(peakHold)));

      // Draw
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      // Map db to height (-60dB to 0dB)
      const minDb = -60;
      const mapDbToY = (val: number) => {
        const normalized = Math.max(0, Math.min(1, (val - minDb) / (0 - minDb)));
        return height * (1 - normalized);
      };

      const y = mapDbToY(db);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#22c55e'); // green
      gradient.addColorStop(0.7, '#f59e0b'); // amber
      gradient.addColorStop(0.9, '#ef4444'); // red

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, height - y);

      // Draw peak line
      const peakY = mapDbToY(peakHold);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, peakY, width, 2);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-muted-foreground font-semibold tracking-widest">{label}</div>
      <div className="relative w-8 h-48 bg-black border border-border rounded-sm overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={32} 
          height={192} 
          className="w-full h-full"
        />
        {/* Graticules */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-[10%]">
          {[0, -10, -20, -30, -40, -50].map((db) => (
            <div key={db} className="w-full border-t border-white/10 relative">
              <span className="absolute left-1 -top-3 text-[9px] text-white/30 font-mono">{db}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="font-mono text-xs text-primary w-12 text-center bg-black py-1 rounded border border-border">
        {peakDb === -100 ? '-∞' : peakDb}
      </div>
    </div>
  );
}