import React, { useRef, useEffect, useState } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Play } from 'lucide-react';

interface PlinkoProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
  spinDuration?: number;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  active: boolean;
}

interface BinBoundary {
  choice: Choice;
  xStart: number;
  xEnd: number;
  color: string;
}

const getRandomDropProps = (boardWidth: number) => {
  const dropX = boardWidth / 2 + (Math.random() - 0.5) * 30;
  const vx = (Math.random() - 0.5) * 1.5;
  return { dropX, vx };
};

export const Plinko: React.FC<PlinkoProps> = ({ choices, onWinner, isFullscreen, isLightMode, spinDuration = 8 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ballActive, setBallActive] = useState(false);
  
  const isLightModeRef = useRef(isLightMode);
  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);
  
  const ballRef = useRef<Ball>({ x: 0, y: 0, vx: 0, vy: 0, radius: 8, color: '#f59e0b', active: false });
  const pegsRef = useRef<Peg[]>([]);
  const binsRef = useRef<BinBoundary[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const boardWidth = 460;
  const boardHeight = 520;



  const dropBall = () => {
    if (ballActive || choices.length < 2) return;

    setBallActive(true);
    soundManager.playLeverPull();

    const { dropX, vx } = getRandomDropProps(boardWidth);
    ballRef.current = {
      x: dropX,
      y: 30,
      vx,
      vy: 1.0,
      radius: 8,
      color: '#f43f5e', // Vibrant rose red ball
      active: true,
    };

    let reported = false;

    const startTime = Date.now();
    const totalMs = (spinDuration || 8) * 1000;

    const updatePhysics = () => {
      const ball = ballRef.current;
      if (!ball.active) return;

      const gravity = 0.18;
      const friction = 0.992;
      const bounce = 0.48;

      const now = Date.now();
      const elapsed = now - startTime;
      const elapsedFraction = Math.min(1.0, elapsed / totalMs);

      // Target Y position for this fraction of the race
      const desiredY = 30 + elapsedFraction * (boardHeight - 20 - 30);

      // Calculate dynamic timeScale multiplier
      const baseTimeScale = 4.5 / (spinDuration || 8);
      let dynamicMultiplier = 1.0;
      if (ball.y < desiredY) {
        dynamicMultiplier = 1.0 + (desiredY - ball.y) / 30; // speed up
      } else {
        dynamicMultiplier = Math.max(0.05, 1.0 - (ball.y - desiredY) / 20); // slow down to a crawl
      }

      const currentTimeScale = baseTimeScale * dynamicMultiplier;

      // Apply forces using currentTimeScale
      ball.vy += gravity * currentTimeScale;
      ball.vx *= Math.pow(friction, currentTimeScale);
      ball.vy *= Math.pow(friction, currentTimeScale);

      // Update positions
      ball.x += ball.vx * currentTimeScale;
      ball.y += ball.vy * currentTimeScale;

      // 1. Sidewall boundary collisions
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * bounce;
        soundManager.playPlinkoBounce();
      } else if (ball.x + ball.radius > boardWidth) {
        ball.x = boardWidth - ball.radius;
        ball.vx = -ball.vx * bounce;
        soundManager.playPlinkoBounce();
      }

      // 2. Peg Collisions
      pegsRef.current.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + peg.radius;

        if (dist < minDist) {
          // Push ball out of peg to prevent clipping
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = peg.x + nx * minDist;
          ball.y = peg.y + ny * minDist;

          // Reflect velocity + inject small lateral scatter
          const dotProduct = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dotProduct * nx) * bounce + (Math.random() - 0.5) * 0.45;
          ball.vy = (ball.vy - 2 * dotProduct * ny) * bounce;

          // Cap vertical bounce
          if (ball.vy < -3) ball.vy = -3;

          soundManager.playPlinkoBounce();
        }
      });

      // 3. Bin Divider Collisions
      const binTopY = boardHeight - 80;
      if (ball.y + ball.radius >= binTopY) {
        // Find which bin divider the ball could strike
        binsRef.current.forEach((bin, idx) => {
          if (idx === 0) return;
          // Check collision with the vertical line at bin.xStart
          const dividerX = bin.xStart;
          if (Math.abs(ball.x - dividerX) < ball.radius && ball.y > binTopY) {
            // Bounce ball off vertical divider
            if (ball.x < dividerX) {
              ball.x = dividerX - ball.radius;
              ball.vx = -Math.abs(ball.vx) * bounce;
            } else {
              ball.x = dividerX + ball.radius;
              ball.vx = Math.abs(ball.vx) * bounce;
            }
            soundManager.playPlinkoBounce();
          }
        });
      }

      // 4. Landing check
      if (ball.y + ball.radius >= boardHeight - 20) {
        if (elapsedFraction < 0.96) {
          // If it reached the bottom too early, apply a soft bounce up so it stays active
          ball.y = boardHeight - 20 - ball.radius - 2;
          ball.vy = -Math.abs(ball.vy) * 0.15 - 0.2;
          ball.vx = (Math.random() - 0.5) * 1.0;
          soundManager.playPlinkoBounce();
        } else {
          ball.y = boardHeight - 20 - ball.radius;
          ball.active = false;
          setBallActive(false);

          // Find which bin the ball landed inside
          let landingChoice = choices[0];
          for (const bin of binsRef.current) {
            if (ball.x >= bin.xStart && ball.x <= bin.xEnd) {
              landingChoice = bin.choice;
              break;
            }
          }

          if (!reported) {
            reported = true;
            onWinner(landingChoice);
          }
          return;
        }
      }

      draw();
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, boardWidth, boardHeight);

    const isLight = !!isLightModeRef.current;

    // 1. Board Background Glass panel style
    const bgGrad = ctx.createLinearGradient(0, 0, 0, boardHeight);
    if (isLight) {
      bgGrad.addColorStop(0, '#f8fafc'); // Sky-50/slate-50 off-white
      bgGrad.addColorStop(1, '#f1f5f9');
    } else {
      bgGrad.addColorStop(0, '#0a0d17');
      bgGrad.addColorStop(1, '#02040a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    // Draw board borders
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, boardWidth, boardHeight);

    // 2. Draw Bins dividers at the bottom
    const binTopY = boardHeight - 80;
    
    // Draw Bins text and colors
    binsRef.current.forEach((bin) => {
      // Draw slot color footer background
      ctx.fillStyle = bin.color + '15'; // 10% opacity
      ctx.fillRect(bin.xStart, binTopY, bin.xEnd - bin.xStart, 80);

      // Bottom colored glow stripe
      ctx.fillStyle = bin.color;
      ctx.fillRect(bin.xStart, boardHeight - 10, bin.xEnd - bin.xStart, 10);

      // Divider vertical walls
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bin.xStart, binTopY);
      ctx.lineTo(bin.xStart, boardHeight);
      ctx.stroke();

      // Draw choice text
      const binWidth = bin.xEnd - bin.xStart;
      
      // Calculate dynamic font size based on slot width (wider bins get much larger names!)
      const fontSize = Math.max(18, Math.min(28, Math.floor(binWidth * 0.22)));
      
      ctx.fillStyle = isLight ? '#1e293b' : '#ffffff';
      ctx.font = `bold ${fontSize}px Outfit`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let txt = bin.choice.text;
      // Width limit calculations (roughly 55% of fontSize per character)
      const charWidth = fontSize * 0.55;
      const maxChars = Math.floor(binWidth / charWidth);
      if (txt.length > maxChars) {
        txt = maxChars > 3 ? txt.substring(0, maxChars - 2) + '..' : txt.substring(0, Math.max(1, maxChars));
      }
      ctx.fillText(txt, bin.xStart + binWidth / 2, boardHeight - 25);
    });

    // 3. Draw Pegs
    ctx.fillStyle = isLight ? '#475569' : '#64748b'; // Sleek slate gray pegs
    pegsRef.current.forEach((peg) => {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, 2 * Math.PI);
      ctx.fill();

      // Outer light rim
      ctx.strokeStyle = isLight ? '#cbd5e1' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 4. Draw dropping funnel guides at the top
    ctx.strokeStyle = isLight ? 'rgba(168, 85, 247, 0.35)' : 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boardWidth / 2 - 40, 0);
    ctx.lineTo(boardWidth / 2 - 20, 45);
    ctx.lineTo(boardWidth / 2 - 20, 60);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(boardWidth / 2 + 40, 0);
    ctx.lineTo(boardWidth / 2 + 20, 45);
    ctx.lineTo(boardWidth / 2 + 20, 60);
    ctx.stroke();

    // 5. Draw active physics Ball
    const ball = ballRef.current;
    if (ball.active) {
      ctx.save();
      // Outer drop shadow glow
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
      const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.3, '#f43f5e');
      ballGrad.addColorStop(1, '#be123c');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.restore();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = boardWidth * dpr;
      canvas.height = boardHeight * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Generate Triangular peg grid
      const pegs: Peg[] = [];
      const rows = 8;
      const startY = 80;
      const spacingY = 40;
      const spacingX = 36;
      const pegRadius = 3.5;

      for (let r = 0; r < rows; r++) {
        const pegCount = r + 3;
        const rowWidth = (pegCount - 1) * spacingX;
        const startX = (boardWidth - rowWidth) / 2;

        for (let c = 0; c < pegCount; c++) {
          pegs.push({
            x: startX + c * spacingX,
            y: startY + r * spacingY,
            radius: pegRadius,
          });
        }
      }
      pegsRef.current = pegs;

      // Divide the bottom based on choice weights
      if (choices.length > 0) {
        const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
        const bins: BinBoundary[] = [];
        let currentX = 0;

        choices.forEach((choice) => {
          const width = (choice.weight / totalWeight) * boardWidth;
          bins.push({
            choice,
            xStart: currentX,
            xEnd: currentX + width,
            color: choice.color,
          });
          currentX += width;
        });

        binsRef.current = bins;
      } else {
        binsRef.current = [];
      }

      draw();
    }
  }, [choices, isLightMode]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Header bar */}
      <div className={`w-full flex justify-between items-center mb-4 transition-all duration-300 ${
        isFullscreen ? 'max-w-xl scale-110' : 'max-w-md'
      }`}>
        <div>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
            Pegboard Drops
          </span>
          <h3 className="text-lg font-bold text-white leading-none mt-0.5">Plinko Bouncer</h3>
        </div>
      </div>

      {/* Board Window Container */}
      <div className={`relative rounded-2xl overflow-hidden border border-white/5 mac-shadow max-w-full transition-all duration-300 ${
        isFullscreen ? 'scale-110 lg:scale-115 my-6' : ''
      }`}>
        <canvas
          ref={canvasRef}
          className="bg-transparent block"
          style={isFullscreen ? { width: `${boardWidth}px`, height: `${boardHeight}px` } : { width: '360px', height: '410px' }}
        />

        {/* Empty warning overlay */}
        {choices.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-6">
            <span className="text-sm font-semibold mb-1 text-white">No slots ready!</span>
            <span className="text-xs text-slate-500">Add 2 or more options in the sidebar.</span>
          </div>
        )}
      </div>

      {/* Control Triggers */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={dropBall}
          disabled={ballActive || choices.length < 2}
          className="flex items-center gap-2.5 px-8 py-3.5 bg-white text-black hover:bg-slate-100 font-bold rounded-2xl shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all text-sm tracking-widest uppercase mac-btn cursor-pointer"
        >
          {ballActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
              BOUNCING...
            </span>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Drop Ball
            </>
          )}
        </button>
        {choices.length < 2 && (
          <span className="text-xs text-slate-500 font-medium">
            Requires at least 2 choices to play Plinko!
          </span>
        )}
      </div>
    </div>
  );
};
