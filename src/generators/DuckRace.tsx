import React, { useRef, useEffect, useState } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Play } from 'lucide-react';

interface DuckRaceProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
}

interface DuckState {
  choice: Choice;
  x: number;
  y: number;
  speed: number;
  baseY: number;
  bobTime: number;
  finished: boolean;
  boostActive: boolean;
  boostTime: number;
  laneIndex: number;
}

const initDucks = (choices: Choice[], canvasHeight: number) => {
  if (choices.length === 0) return [];

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const startX = 90 * dpr;
  const paddingY = 100 * dpr;
  const usableHeight = canvasHeight - paddingY * 2;
  const laneHeight = choices.length > 1 ? usableHeight / (choices.length - 1) : usableHeight;

  return choices.map((choice, index) => ({
    choice,
    x: startX,
    y: paddingY + index * laneHeight,
    baseY: paddingY + index * laneHeight,
    speed: 0,
    bobTime: Math.random() * 100,
    finished: false,
    boostActive: false,
    boostTime: 0,
    laneIndex: index,
  }));
};

export const DuckRace: React.FC<DuckRaceProps> = ({ choices, onWinner, isFullscreen, isLightMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [raceActive, setRaceActive] = useState(false);

  // Store isLightMode in a ref so active physics loops can read the latest theme without stale closures
  const isLightModeRef = useRef(isLightMode);
  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);

  const ducksRef = useRef<DuckState[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const waveOffsetRef = useRef(0);



  const startRace = () => {
    if (raceActive || choices.length < 2) return;

    setRaceActive(true);
    soundManager.playLeverPull();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset ducks to starting line
    ducksRef.current = initDucks(choices, canvas.height);

    const finishLine = canvas.width - 100;
    let winnerReported = false;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const runFrame = () => {
      waveOffsetRef.current += 1.5 * dpr;

      // Update Duck positions
      ducksRef.current.forEach((duck) => {
        if (duck.finished) return;

        // Base swimming movement scaled with dpr!
        let targetSpeed = (1.2 + Math.random() * 2.5) * dpr;

        // Incorporate Weight subtly (higher weight increases boost probability)
        const weightBonus = (duck.choice.weight - 1) * 0.2 * dpr;
        targetSpeed += weightBonus;

        // Random speed boosts
        if (!duck.boostActive && Math.random() < 0.008) {
          duck.boostActive = true;
          duck.boostTime = 30 + Math.random() * 40; // frames active
          soundManager.playTick(600 + Math.random() * 200, 0.04);
        }

        if (duck.boostActive) {
          targetSpeed += 3.0 * dpr;
          duck.boostTime--;
          if (duck.boostTime <= 0) {
            duck.boostActive = false;
          }
        }

        // Smooth speed interpolation (organic swimming feel)
        duck.speed = duck.speed * 0.7 + targetSpeed * 0.1;
        duck.x += duck.speed;

        // Check if crossed finish line
        if (duck.x >= finishLine) {
          duck.x = finishLine;
          duck.finished = true;
          
          if (!winnerReported) {
            winnerReported = true;
            setRaceActive(false);
            onWinner(duck.choice);
          }
        }

        duck.bobTime += 0.08;
      });

      draw();

      if (!winnerReported) {
        animationFrameRef.current = requestAnimationFrame(runFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(runFrame);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const finishLine = width - 100;

    const isLight = !!isLightModeRef.current;

    // 1. Draw River backdrop (Water Gradients)
    const riverGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isLight) {
      riverGrad.addColorStop(0, '#e0f2fe'); // sky-100/sky-50 premium light water gradient
      riverGrad.addColorStop(1, '#f0f9ff');
    } else {
      riverGrad.addColorStop(0, '#0a192f'); // Deep ocean teal
      riverGrad.addColorStop(1, '#020c1b');
    }
    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw animated waves
    ctx.strokeStyle = isLight ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 165, 233, 0.08)'; // cyan waves
    ctx.lineWidth = 2;
    for (let l = 0; l < height; l += 40) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 10) {
        const y = l + Math.sin((x + waveOffsetRef.current) * 0.015) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Draw Checkered Finish Line
    const boxSize = 10;
    for (let y = 0; y < height; y += boxSize * 2) {
      // Draw checkered columns
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(finishLine, y, boxSize, boxSize);
      ctx.fillRect(finishLine + boxSize, y + boxSize, boxSize, boxSize);

      ctx.fillStyle = '#000000';
      ctx.fillRect(finishLine + boxSize, y, boxSize, boxSize);
      ctx.fillRect(finishLine, y + boxSize, boxSize, boxSize);
    }
    // Neon finish border glow
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(finishLine, 0);
    ctx.lineTo(finishLine, height);
    ctx.stroke();

    // 4. Draw lane separators
    if (ducksRef.current.length > 1) {
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ducksRef.current.forEach((duck, idx) => {
        if (idx === 0) return;
        const separatorY = duck.baseY - (duck.baseY - ducksRef.current[idx - 1].baseY) / 2;
        ctx.beginPath();
        ctx.moveTo(0, separatorY);
        ctx.lineTo(width, separatorY);
        ctx.stroke();
      });
    }

    // 5. Draw Ducks – chunky cartoon style with DPR-correct scaling
    const totalDucks = ducksRef.current.length;
    const dpr = window.devicePixelRatio || 1;
    let scale = 2.0;                                     // base: 2× the duck coordinate unit
    if (totalDucks > 3) {
      scale = Math.max(0.85, 2.0 * 3.0 / totalDucks);   // shrink gracefully, but not below 0.85
    }

    ducksRef.current.forEach((duck) => {
      const bobbing = Math.sin(duck.bobTime) * 5;
      const tilt = Math.cos(duck.bobTime) * 0.05;

      ctx.save();
      ctx.translate(duck.x, duck.y + bobbing);
      ctx.scale(scale * dpr, scale * dpr);  // dpr baked in → same CSS size regardless of screen density
      ctx.rotate(tilt);

      // Boost engine particles
      if (duck.boostActive) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
        for (let i = 0; i < 5; i++) {
          const px = -40 - Math.random() * 30;
          const py = -5 + Math.random() * 12;
          const pSize = (3 + Math.random() * 6) / scale;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // ── Chunky cartoon rubber duck ──
      ctx.fillStyle = duck.choice.color;

      // Body (big fat oval)
      ctx.beginPath();
      ctx.ellipse(-10, 10, 36, 24, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Tail bump
      ctx.beginPath();
      ctx.moveTo(-36, 4);
      ctx.quadraticCurveTo(-54, -8, -42, -20);
      ctx.quadraticCurveTo(-28, -8, -24, 2);
      ctx.closePath();
      ctx.fill();

      // Neck + big round head
      ctx.beginPath();
      ctx.arc(16, -24, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Beak (large orange)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(32, -30);
      ctx.lineTo(52, -24);
      ctx.lineTo(32, -18);
      ctx.closePath();
      ctx.fill();

      // Beak line
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(32, -24);
      ctx.lineTo(52, -24);
      ctx.stroke();

      // Eye white (large)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(22, -31, 7, 0, 2 * Math.PI);
      ctx.fill();

      // Eye pupil
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(24, -31, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(26, -33, 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // Wing highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-12, 8, 18, 12, -0.2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();

      // ── White pill name badge (drawn in screen/world space so it stays sharp) ──
      const dpr2 = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const labelFontSize = Math.max(14 * dpr2, Math.floor(18 * scale * dpr2));
      ctx.font = `bold ${labelFontSize}px Outfit`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let lbl = duck.choice.text;
      if (lbl.length > 14) lbl = lbl.substring(0, 12) + '…';

      const metrics = ctx.measureText(lbl);
      const padX = 14;
      const padY2 = 7;
      const badgeW = metrics.width + padX * 2;
      const badgeH = labelFontSize + padY2 * 2;
      const badgeCX = duck.x;
      // Place badge below the duck body (body bottom = 34 duck-units × scale × dpr)
      const badgeTop = duck.y + Math.sin(duck.bobTime) * 5 + 38 * scale * dpr;

      // White rounded pill background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      ctx.roundRect(badgeCX - badgeW / 2, badgeTop, badgeW, badgeH, badgeH / 2);
      ctx.fill();

      // Colored border ring
      ctx.strokeStyle = duck.choice.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dark label text
      ctx.fillStyle = '#0f172a';
      ctx.fillText(lbl, badgeCX, badgeTop + badgeH / 2);
    });
  };

  // Render initialization
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = (rect.width || 460) * dpr;
        const fallbackHeight = isFullscreen ? 500 : 280;
        canvas.height = (rect.height || fallbackHeight) * dpr; // Strictly fit canvas to layout rect height!
        ducksRef.current = initDucks(choices, canvas.height);
        draw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [choices, isFullscreen, isLightMode]);

  // Handle unmount animations cancel
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Game bar */}
      <div className={`w-full flex justify-between items-center mb-4 transition-all duration-300 ${
        isFullscreen ? 'max-w-7xl px-2' : 'max-w-5xl'
      }`}>
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Waterway Derby
          </span>
          <h3 className="text-lg font-bold text-white leading-none mt-0.5">Rubber Duck Race</h3>
        </div>
      </div>

      {/* Track Box */}
      <div
        className={`w-full bg-[#000000]/60 rounded-2xl overflow-hidden border border-white/5 mac-shadow relative transition-all duration-300 ${
          isFullscreen ? 'max-w-7xl h-[calc(100vh-260px)]' : ''
        }`}
        style={isFullscreen ? undefined : {
          height: `${Math.min(900, Math.max(380, choices.length * 120))}px`
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-transparent"
        />

        {/* Empty warning overlay */}
        {choices.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-6">
            <span className="text-sm font-semibold mb-1 text-white">No swimmers lined up!</span>
            <span className="text-xs text-slate-500">Add 2 or more options in the sidebar.</span>
          </div>
        )}
      </div>

      {/* Action triggers */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={startRace}
          disabled={raceActive || choices.length < 2}
          className="flex items-center gap-2.5 px-8 py-3.5 bg-white text-black hover:bg-slate-100 font-bold rounded-2xl shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all text-sm tracking-widest uppercase mac-btn cursor-pointer"
        >
          {raceActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
              RACING...
            </span>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Launch Ducks
            </>
          )}
        </button>
        {choices.length < 2 && (
          <span className="text-xs text-slate-500 font-medium">
            Requires at least 2 ducks to launch a race!
          </span>
        )}
      </div>
    </div>
  );
};
