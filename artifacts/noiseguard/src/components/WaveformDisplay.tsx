import React, { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  inAnalyser: AnalyserNode | null;
  outAnalyser: AnalyserNode | null;
}

export function WaveformDisplay({ inAnalyser, outAnalyser }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!inAnalyser || !outAnalyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set internal resolution higher for crispness
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    
    const bufferLength = inAnalyser.fftSize;
    const inDataArray = new Float32Array(bufferLength);
    const outDataArray = new Float32Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      inAnalyser.getFloatTimeDomainData(inDataArray);
      outAnalyser.getFloatTimeDomainData(outDataArray);

      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;

      // Draw input (dim)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < bufferLength; i++) {
        const x = (i / bufferLength) * canvas.width;
        const y = (inDataArray[i] * 0.5 + 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw output (cyan)
      ctx.beginPath();
      ctx.strokeStyle = '#00d4d8';
      for (let i = 0; i < bufferLength; i++) {
        const x = (i / bufferLength) * canvas.width;
        const y = (outDataArray[i] * 0.5 + 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [inAnalyser, outAnalyser]);

  return (
    <div className="w-full h-full relative rounded-md overflow-hidden border border-border bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-3 flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-white/40">
          <div className="w-2 h-2 rounded-full bg-white/30" /> RAW
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <div className="w-2 h-2 rounded-full bg-primary" /> CLEAN
        </div>
      </div>
    </div>
  );
}