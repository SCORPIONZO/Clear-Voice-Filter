import React, { useEffect, useRef } from 'react';

interface SpectrumDisplayProps {
  analyser: AnalyserNode | null;
}

export function SpectrumDisplay({ analyser }: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(1, '#00d4d8');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="w-full h-full relative rounded-md overflow-hidden border border-border bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-3 text-xs font-mono text-primary/70">
        FREQUENCY SPECTRUM
      </div>
    </div>
  );
}