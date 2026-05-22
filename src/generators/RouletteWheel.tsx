import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Play } from 'lucide-react';

interface RouletteWheelProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
  spinDuration?: number;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ choices, onWinner, isFullscreen, isLightMode, spinDuration = 8 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Animation state values stored in refs to prevent unnecessary re-renders in raf
  const stateRef = useRef({
    angle: 0,
    velocity: 0,
    isSpinning: false,
    lastTickIndex: -1,
  });

  // Draw the wheel onto the canvas
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    const isLight = !!isLightMode;

    if (choices.length === 0) {
      // Empty wheel state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isLight ? '#f1f5f9' : '#1e293b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = isLight ? '#a855f7' : '#38bdf8';
      ctx.stroke();

      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
      ctx.font = 'bold 18px Outfit';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Please add some choices!', centerX, centerY);
      return;
    }

    const totalWeight = choices.reduce((sum, item) => sum + item.weight, 0);
    let currentAngle = angle;

    // Draw Wheel Segments
    choices.forEach((choice) => {
      const segmentAngle = (choice.weight / totalWeight) * 2 * Math.PI;

      // Draw Slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();

      ctx.fillStyle = choice.color;
      ctx.fill();

      // Stroke segment edge
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.5)' : 'rgba(11, 12, 20, 0.4)';
      ctx.stroke();

      // Draw text label on segment
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngle + segmentAngle / 2);

      // Label styling
      ctx.fillStyle = '#ffffff';
      
      // Calculate a highly-visible dynamic font size based on radius & number of choices
      let fontSize = Math.max(28, Math.floor(radius * 0.12));
      if (choices.length > 8) {
        fontSize = Math.max(18, Math.floor(radius * 0.09));
      } else if (choices.length > 5) {
        fontSize = Math.max(22, Math.floor(radius * 0.11));
      }
      
      ctx.font = `bold ${fontSize}px Outfit`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Trim text if too long
      let text = choice.text;
      const maxTextLen = choices.length > 8 ? 12 : 18;
      if (text.length > maxTextLen) text = text.substring(0, maxTextLen - 2) + '...';

      // Draw text facing along the radius, positioned safely from outer edge
      ctx.fillText(text, radius - Math.max(20, fontSize * 0.8), 0);
      ctx.restore();

      currentAngle += segmentAngle;
    });

    // Draw Outer glowing Rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = isLight ? '#cbd5e1' : '#0f172a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isLight ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.4)'; // Purple neon glow ring
    ctx.stroke();

    // Draw Outer pegs for satisfying mechanical ticks
    let pegAngle = currentAngle;
    choices.forEach((choice) => {
      const segmentAngle = (choice.weight / totalWeight) * 2 * Math.PI;

      const px = centerX + Math.cos(pegAngle) * radius;
      const py = centerY + Math.sin(pegAngle) * radius;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isLight ? '#cbd5e1' : '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      pegAngle += segmentAngle;
    });

    // Draw Wheel Center Cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 30);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glowing dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }, [choices, isLightMode]);

  const getPointerChoice = (angle: number): Choice => {
    const totalWeight = choices.reduce((sum, item) => sum + item.weight, 0);

    // Pointer is positioned at the top (-90 degrees / -Math.PI / 2).
    // Normalize target angle back to 0 to 2PI range
    let relativeAngle = (-Math.PI / 2 - angle) % (2 * Math.PI);
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

    let accumAngle = 0;
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const segmentAngle = (choice.weight / totalWeight) * 2 * Math.PI;

      if (relativeAngle >= accumAngle && relativeAngle < accumAngle + segmentAngle) {
        return choice;
      }
      accumAngle += segmentAngle;
    }
    return choices[0];
  };

  const spin = () => {
    if (isSpinning || choices.length < 2) return;

    setIsSpinning(true);
    stateRef.current.isSpinning = true;

    // Spin start sounds
    soundManager.playLeverPull();

    const startTime = Date.now();
    const durationMs = (spinDuration || 8) * 1000;
    const decelerationMs = 1500; // decelerate over exactly 1.5 seconds
    const constantDurationMs = durationMs - decelerationMs;
    const peakVelocity = 0.22 + Math.random() * 0.04; // organic fast rotation speed

    let frameId: number;
    let lastTime = Date.now();

    const animate = () => {
      const state = stateRef.current;
      const now = Date.now();
      const elapsed = now - startTime;
      const dt = Math.min(3, (now - lastTime) / 16.666); // clamp dt to avoid huge jumps on tab change
      lastTime = now;

      let velocity = peakVelocity;
      if (elapsed < constantDurationMs) {
        velocity = peakVelocity;
      } else {
        const decelProgress = Math.min(1, (elapsed - constantDurationMs) / decelerationMs);
        // Smooth quadratic ease-out deceleration
        velocity = peakVelocity * Math.pow(1 - decelProgress, 2);
      }

      state.angle += velocity * dt;
      state.velocity = velocity;

      // Sound Tick triggering logic
      const pointerChoice = getPointerChoice(state.angle);
      const pointerIndex = choices.findIndex(c => c.id === pointerChoice.id);

      if (pointerIndex !== state.lastTickIndex) {
        // Synthesize ticks based on slot count
        soundManager.playTick(500 + pointerIndex * 20, 0.03);
        state.lastTickIndex = pointerIndex;
      }

      drawWheel(state.angle);

      if (elapsed >= durationMs) {
        // Wheel Stopped
        state.velocity = 0;
        state.isSpinning = false;
        setIsSpinning(false);
        onWinner(pointerChoice);
        cancelAnimationFrame(frameId);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
  };

  // Redraw wheel whenever choices change or mounts
  useEffect(() => {
    drawWheel(stateRef.current.angle);
    
    // Resize observer to maintain canvas aspect ratios
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        drawWheel(stateRef.current.angle);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [choices, drawWheel]);

  return (
    <div className={`flex flex-col items-center justify-center select-none w-full h-full ${isFullscreen ? 'p-8' : 'p-2 pt-10 pb-4'}`}>
      {/* Wheel Core Wrapper */}
      <div className={`relative w-full aspect-square flex items-center justify-center transition-all duration-300 ${
        isFullscreen ? 'max-w-[580px] lg:max-w-[640px]' : 'max-w-[415px]'
      }`}>
        {/* Glowing visual backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-full filter blur-xl -z-10" />

        {/* Top Marker Arrow */}
        <div className="absolute top-[-5px] left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
          {/* Arrow body */}
          <div className="w-5 h-6 bg-gradient-to-b from-rose-500 to-pink-600 rounded-t-full" />
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-pink-600" />
          {/* Glowing dot in arrow */}
          <div className="absolute top-1.5 w-2 h-2 bg-white rounded-full animate-ping" />
        </div>

        {/* Canvas wheel */}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer rounded-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-slate-900 transition-all duration-300"
          onClick={spin}
        />
      </div>

      {/* Spin Button */}
      <div className="mt-5 flex flex-col items-center gap-1.5">
        <button
          onClick={spin}
          disabled={isSpinning || choices.length < 2}
          className="flex items-center gap-2.5 px-10 py-3.5 bg-white text-black hover:bg-slate-100 font-extrabold rounded-full shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all text-xs tracking-widest uppercase mac-btn cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          Spin Wheel
        </button>
        {choices.length < 2 && (
          <span className="text-[10px] text-slate-500 font-medium animate-pulse">
            Requires at least 2 choices to spin!
          </span>
        )}
      </div>
    </div>
  );
};
