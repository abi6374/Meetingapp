'use client';

import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

export default function WaveformVisualizer({ analyser, isRecording }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isRecording) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
           ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Gradient for trend look
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#4f46e5'); // indigo-600
        gradient.addColorStop(1, '#818cf8'); // indigo-400

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full h-24 bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-800/50 mb-8 relative">
       {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-medium uppercase tracking-widest">
            Audio Input Standby
          </div>
       )}
       <canvas 
         ref={canvasRef} 
         width={600} 
         height={100} 
         className="w-full h-full"
       />
    </div>
  );
}
