import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  hitGlow: number; // For bounce ripple effect
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

interface BinSlot {
  index: number;
  choices: Choice[];
  primaryChoice: Choice;
  xStart: number;
  xEnd: number;
  color: string;
}

interface DeflectorBumper {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nx: number;
  ny: number;
}

const getCurrentTime = () => Date.now();

export const Plinko: React.FC<PlinkoProps> = ({ 
  choices, 
  onWinner, 
  isFullscreen, 
  isLightMode = true, 
  spinDuration = 8 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ballActive, setBallActive] = useState(false);
  const [winningBinIndex, setWinningBinIndex] = useState<number | null>(null);

  const isLightModeRef = useRef(isLightMode);
  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);

  const spinDurationRef = useRef(spinDuration);
  useEffect(() => {
    spinDurationRef.current = spinDuration;
  }, [spinDuration]);

  const ballRef = useRef<Ball>({ 
    x: 0, 
    y: 0, 
    vx: 0, 
    vy: 0, 
    radius: 7.5, 
    color: '#7c3aed', 
    active: false 
  });

  const pegsRef = useRef<Peg[]>([]);
  const binsRef = useRef<BinSlot[]>([]);
  const deflectorsRef = useRef<DeflectorBumper[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const raceEndTimeRef = useRef<number>(0);
  const bottomBarrierBounceRef = useRef<number>(0); // Spring animation on bottom bounce

  const boardWidth = 460;
  const boardHeight = 520;
  const binTopY = boardHeight - 85;

  // Build bins with a strict cap so bins never get squished into an unreadable barcode
  const buildBins = useCallback((choiceList: Choice[]): BinSlot[] => {
    if (choiceList.length === 0) return [];

    const MAX_BINS = 8;
    const numBins = Math.min(MAX_BINS, Math.max(2, choiceList.length));
    const binWidth = boardWidth / numBins;

    const bins: BinSlot[] = [];

    if (choiceList.length <= MAX_BINS) {
      // 1-to-1 mapping
      choiceList.forEach((choice, idx) => {
        bins.push({
          index: idx,
          choices: [choice],
          primaryChoice: choice,
          xStart: idx * binWidth,
          xEnd: (idx + 1) * binWidth,
          color: choice.color,
        });
      });
    } else {
      // Multiple choices partitioned cleanly across the bins
      for (let i = 0; i < numBins; i++) {
        const assigned = choiceList.filter((_, idx) => idx % numBins === i);
        const primary = assigned[0];
        bins.push({
          index: i,
          choices: assigned,
          primaryChoice: primary,
          xStart: i * binWidth,
          xEnd: (i + 1) * binWidth,
          color: primary ? primary.color : '#7c3aed',
        });
      }
    }

    return bins;
  }, [boardWidth]);

  // Generate peg layout & side deflector bumpers
  const buildBoardGeometry = useCallback(() => {
    const pegs: Peg[] = [];
    const rows = 8;
    const startY = 82;
    const spacingY = 38;
    const spacingX = 38;
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
          hitGlow: 0,
        });
      }
    }

    // Angled side deflectors to keep the ball lively and bouncing toward center
    const deflectors: DeflectorBumper[] = [
      // Left upper kicker
      { x1: 0, y1: 170, x2: 36, y2: 230, nx: 0.85, ny: -0.52 },
      // Left lower kicker
      { x1: 0, y1: 290, x2: 44, y2: 355, nx: 0.83, ny: -0.55 },
      // Right upper kicker
      { x1: boardWidth, y1: 170, x2: boardWidth - 36, y2: 230, nx: -0.85, ny: -0.52 },
      // Right lower kicker
      { x1: boardWidth, y1: 290, x2: boardWidth - 44, y2: 355, nx: -0.83, ny: -0.55 },
    ];

    pegsRef.current = pegs;
    deflectorsRef.current = deflectors;
  }, [boardWidth]);

  const handleDropBall = () => {
    if (ballActive || choices.length < 2) return;

    setWinningBinIndex(null);
    setBallActive(true);
    soundManager.playLeverPull();

    const dropX = boardWidth / 2 + (Math.random() - 0.5) * 24;
    const initialVx = (Math.random() - 0.5) * 3.5;

    ballRef.current = {
      x: dropX,
      y: 35,
      vx: initialVx === 0 ? 1.5 : initialVx,
      vy: 4.8,
      radius: 7.5,
      color: '#7c3aed', // Apple violet ball
      active: true,
    };

    let reported = false;
    const startTime = getCurrentTime();
    const totalMs = (spinDurationRef.current || 8) * 1000;
    raceEndTimeRef.current = startTime + totalMs;

    // Retractable barrier opens in the final 1.3 seconds of the countdown
    const openGateTime = Math.max(startTime + 800, raceEndTimeRef.current - 1300);

    const TARGET_SPEED = 6.2; // Constant lively speed

    const updatePhysics = () => {
      const ball = ballRef.current;
      if (!ball.active) return;

      const now = getCurrentTime();
      const isGateOpen = now >= openGateTime;

      // 1. Maintain near-constant momentum: gentle gravity bias downward
      const gravity = 0.14;
      ball.vy += gravity;

      // Normalize velocity to keep speed punchy and constant
      const currentSpeed = Math.hypot(ball.vx, ball.vy);
      if (currentSpeed > 0.1) {
        const speedRatio = TARGET_SPEED / currentSpeed;
        ball.vx = ball.vx * 0.82 + (ball.vx * speedRatio) * 0.18;
        ball.vy = ball.vy * 0.82 + (ball.vy * speedRatio) * 0.18;
      }

      // Ensure ball never gets trapped in horizontal deadlock
      if (Math.abs(ball.vy) < 0.8) {
        ball.vy += (ball.vy >= 0 ? 0.9 : -0.9);
      }

      // Update positions
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Decay visual hit ripples on pegs
      pegsRef.current.forEach((peg) => {
        if (peg.hitGlow > 0) {
          peg.hitGlow = Math.max(0, peg.hitGlow - 0.05);
        }
      });

      // Decay barrier spring animation
      if (bottomBarrierBounceRef.current > 0) {
        bottomBarrierBounceRef.current = Math.max(0, bottomBarrierBounceRef.current - 0.08);
      }

      // 2. Sidewall Collisions (Left & Right)
      const minX = 14 + ball.radius;
      const maxX = boardWidth - 14 - ball.radius;
      if (ball.x < minX) {
        ball.x = minX;
        ball.vx = Math.abs(ball.vx);
        soundManager.playPlinkoBounce();
      } else if (ball.x > maxX) {
        ball.x = maxX;
        ball.vx = -Math.abs(ball.vx);
        soundManager.playPlinkoBounce();
      }

      // 3. Top Ceiling Boundary
      if (ball.y < 25 + ball.radius) {
        ball.y = 25 + ball.radius;
        ball.vy = Math.abs(ball.vy);
      }

      // 4. Side Angled Deflector Bumpers
      deflectorsRef.current.forEach((d) => {
        // Line segment distance from point (ball.x, ball.y) to segment (x1, y1)-(x2, y2)
        const ldx = d.x2 - d.x1;
        const ldy = d.y2 - d.y1;
        const lenSq = ldx * ldx + ldy * ldy;
        const t = Math.max(0, Math.min(1, ((ball.x - d.x1) * ldx + (ball.y - d.y1) * ldy) / lenSq));
        const projX = d.x1 + t * ldx;
        const projY = d.y1 + t * ldy;
        const dist = Math.hypot(ball.x - projX, ball.y - projY);

        if (dist < ball.radius + 4) {
          // Push ball outside bumper
          ball.x = projX + d.nx * (ball.radius + 5);
          ball.y = projY + d.ny * (ball.radius + 5);

          // Reflect velocity along normal
          const dot = ball.vx * d.nx + ball.vy * d.ny;
          ball.vx = (ball.vx - 2 * dot * d.nx) + (Math.random() - 0.5) * 0.8;
          ball.vy = (ball.vy - 2 * dot * d.ny);
          soundManager.playPlinkoBounce();
        }
      });

      // 5. Peg Collisions
      pegsRef.current.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.radius + peg.radius;

        if (dist < minDist) {
          // Push ball out of peg to prevent clipping
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? 1 : dy / dist;
          ball.x = peg.x + nx * (minDist + 0.8);
          ball.y = peg.y + ny * (minDist + 0.8);

          // Reflect velocity + slight chaotic lateral scattering
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) + (Math.random() - 0.5) * 0.9;
          ball.vy = (ball.vy - 2 * dot * ny);

          peg.hitGlow = 1.0;
          soundManager.playPlinkoBounce();
        }
      });

      // 6. Retractable Bottom Kinetic Barrier (Keeps ball bouncing until time ends!)
      if (!isGateOpen) {
        if (ball.y + ball.radius >= binTopY - 4) {
          // Spring the ball back upward into the peg field
          ball.y = binTopY - 4 - ball.radius;
          ball.vy = -Math.abs(ball.vy) * 1.12 - 1.8;
          ball.vx += (Math.random() - 0.5) * 3.2;

          bottomBarrierBounceRef.current = 1.0;
          soundManager.playPlinkoBounce();
        }
      } else {
        // Gate is OPEN: Ball is descending into the prize bins!
        if (ball.y + ball.radius >= binTopY) {
          // Constrain ball inside its entry bin column
          binsRef.current.forEach((bin) => {
            if (ball.x >= bin.xStart && ball.x <= bin.xEnd) {
              const leftWall = bin.xStart + ball.radius;
              const rightWall = bin.xEnd - ball.radius;
              if (ball.x < leftWall) ball.x = leftWall;
              if (ball.x > rightWall) ball.x = rightWall;
            }
          });
        }

        // Landing Check at bottom of the bin cup
        if (ball.y + ball.radius >= boardHeight - 22) {
          ball.y = boardHeight - 22 - ball.radius;
          ball.vx = 0;
          ball.vy = 0;
          ball.active = false;
          setBallActive(false);

          // Determine which bin the ball landed inside
          let landedBin = binsRef.current[0];
          for (const bin of binsRef.current) {
            if (ball.x >= bin.xStart && ball.x <= bin.xEnd) {
              landedBin = bin;
              break;
            }
          }

          setWinningBinIndex(landedBin.index);

          // Pick the winner from the bin's candidate choices (proportional to weight if multiple)
          let pickedChoice = landedBin.primaryChoice;
          if (landedBin.choices.length > 1) {
            const totalWeight = landedBin.choices.reduce((sum, c) => sum + c.weight, 0);
            let r = Math.random() * totalWeight;
            for (const c of landedBin.choices) {
              if (r < c.weight) {
                pickedChoice = c;
                break;
              }
              r -= c.weight;
            }
          }

          if (!reported) {
            reported = true;
            soundManager.playWin();
            setTimeout(() => {
              onWinner(pickedChoice);
            }, 300);
          }
          draw();
          return;
        }
      }

      draw();
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLight = !!isLightModeRef.current;

    ctx.save();
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // 1. Board Background Glass Panel
    const bgGrad = ctx.createLinearGradient(0, 0, 0, boardHeight);
    if (isLight) {
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(0.5, '#f8fafc');
      bgGrad.addColorStop(1, '#f1f5f9');
    } else {
      bgGrad.addColorStop(0, '#161618');
      bgGrad.addColorStop(0.5, '#121214');
      bgGrad.addColorStop(1, '#0c0c0e');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    // Outer subtle border
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, boardWidth, boardHeight);

    // 2. Side Deflector Bumpers (Angled Kickers)
    deflectorsRef.current.forEach((d) => {
      ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();

      // Inner bounce trim
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Pegs with Specular Highlight and Hit Glow
    pegsRef.current.forEach((peg) => {
      ctx.save();
      
      // Ripple glow on ball strike
      if (peg.hitGlow > 0) {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius + peg.hitGlow * 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${peg.hitGlow * 0.4})`;
        ctx.fill();
      }

      // Metallic peg circle
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
      ctx.fill();

      // Specular highlight dot
      ctx.beginPath();
      ctx.arc(peg.x - 1, peg.y - 1, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    });

    // 4. Drop Funnel Guides at top
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Left guide
    ctx.beginPath();
    ctx.moveTo(boardWidth / 2 - 38, 8);
    ctx.lineTo(boardWidth / 2 - 18, 48);
    ctx.lineTo(boardWidth / 2 - 18, 62);
    ctx.stroke();

    // Right guide
    ctx.beginPath();
    ctx.moveTo(boardWidth / 2 + 38, 8);
    ctx.lineTo(boardWidth / 2 + 18, 48);
    ctx.lineTo(boardWidth / 2 + 18, 62);
    ctx.stroke();

    // 5. Bottom Bins & Dividers (Capped cleanly with zero text overlap!)
    const isWinnerAnnounced = winningBinIndex !== null;

    binsRef.current.forEach((bin) => {
      const isWinner = isWinnerAnnounced && winningBinIndex === bin.index;
      const binWidth = bin.xEnd - bin.xStart;

      // Slot background tint
      if (isWinner) {
        ctx.fillStyle = bin.color + '35'; // Bright highlight
      } else {
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)';
      }
      ctx.fillRect(bin.xStart, binTopY, binWidth, 85);

      // Bottom colored glow stripe
      ctx.fillStyle = bin.color;
      ctx.fillRect(bin.xStart + 3, boardHeight - 8, binWidth - 6, 5);

      // Vertical divider walls
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bin.xStart, binTopY);
      ctx.lineTo(bin.xStart, boardHeight);
      ctx.stroke();

      // Draw Choice Text (Horizontal if ample space, Vertical rotated if narrow)
      ctx.save();
      const txt = bin.primaryChoice.text;
      const count = bin.choices.length;

      if (binWidth >= 70) {
        // Horizontal text layout
        const maxLen = Math.floor(binWidth / 8);
        const displayTxt = txt.length > maxLen ? txt.substring(0, maxLen - 1) + '…' : txt;

        ctx.fillStyle = isLight ? '#1d1d1f' : '#f5f5f7';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTxt, bin.xStart + binWidth / 2, boardHeight - 34);

        // Subtitle or multiple count badge
        if (count > 1) {
          ctx.fillStyle = '#7c3aed';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`+${count - 1} more`, bin.xStart + binWidth / 2, boardHeight - 18);
        }
      } else {
        // Vertical text layout rotated -90 degrees: Never collides, perfectly readable!
        ctx.translate(bin.xStart + binWidth / 2, boardHeight - 20);
        ctx.rotate(-Math.PI / 2);

        const maxLen = 8;
        const displayTxt = txt.length > maxLen ? txt.substring(0, maxLen - 1) + '…' : txt;

        ctx.fillStyle = isLight ? '#1d1d1f' : '#f5f5f7';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTxt, 0, 0);

        if (count > 1) {
          ctx.fillStyle = '#7c3aed';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`+${count - 1}`, 54, 0);
        }
      }
      ctx.restore();
    });

    // Rightmost divider wall
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boardWidth, binTopY);
    ctx.lineTo(boardWidth, boardHeight);
    ctx.stroke();

    // 6. Retractable Kinetic Barrier (Visible & Active while ball bounces!)
    const now = getCurrentTime();
    const remainingTimeMs = Math.max(0, raceEndTimeRef.current - now);
    const isGateOpen = ballActive && remainingTimeMs <= 1300;

    if (ballActive && !isGateOpen) {
      ctx.save();
      const bounceOffset = Math.sin(bottomBarrierBounceRef.current * Math.PI) * 4;
      const barrierY = binTopY + bounceOffset;

      // Glowing violet energy barrier line
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(14, barrierY);
      ctx.lineTo(boardWidth - 14, barrierY);
      ctx.stroke();

      // Kinetic chevron notches along the barrier
      ctx.fillStyle = '#a78bfa';
      for (let bx = 30; bx < boardWidth - 30; bx += 28) {
        ctx.beginPath();
        ctx.arc(bx, barrierY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Barrier status pill
      const barrierText = `BOUNCING • ${(remainingTimeMs / 1000).toFixed(1)}s`;
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      const bTextW = ctx.measureText(barrierText).width;
      const pillW = bTextW + 18;
      const pillH = 18;
      const pillX = (boardWidth - pillW) / 2;
      const pillY = barrierY - 24;

      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 24, 0.95)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 9999);
      ctx.fill();

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#7c3aed';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(barrierText, boardWidth / 2, pillY + pillH / 2);

      ctx.restore();
    } else if (ballActive && isGateOpen) {
      // Gate Opening Animation: Gates retract outward
      ctx.save();
      ctx.fillStyle = 'rgba(124, 58, 237, 0.12)';
      ctx.fillRect(14, binTopY - 1, boardWidth - 28, 2);
      ctx.restore();
    }

    // 7. Active Ball (Rendered with high-contrast violet glow)
    const ball = ballRef.current;
    if (ball.active || isWinnerAnnounced) {
      ctx.save();
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

      // Radial gloss ball gradient
      const ballGrad = ctx.createRadialGradient(
        ball.x - 2, 
        ball.y - 2, 
        1, 
        ball.x, 
        ball.y, 
        ball.radius
      );
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.3, '#8b5cf6');
      ballGrad.addColorStop(1, '#6d28d9');

      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.restore();
    }

    // 8. Top-right Countdown Timer Badge
    if (ballActive) {
      ctx.save();
      const remainingSec = (remainingTimeMs / 1000).toFixed(1);
      const timerText = `TIME: ${remainingSec}s`;
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      const metrics = ctx.measureText(timerText);
      const padX = 12;
      const padY = 5;
      const rectW = metrics.width + padX * 2;
      const rectH = 12 + padY * 2;
      const rx = boardWidth - rectW - 14;
      const ry = 14;

      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(20, 20, 24, 0.9)';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rectW, rectH, 9999);
      ctx.fill();

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isLight ? '#1d1d1f' : '#ffffff';
      ctx.fillText(timerText, boardWidth - 14 - padX, ry + padY);
      ctx.restore();
    }

    ctx.restore();
  }, [boardWidth, boardHeight, binTopY, ballActive, winningBinIndex]);

  useEffect(() => {
    buildBoardGeometry();
    binsRef.current = buildBins(choices);

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = boardWidth * dpr;
      canvas.height = boardHeight * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      draw();
    }
  }, [choices, isLightMode, buildBoardGeometry, buildBins, draw]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full select-none">
      {/* Board Window Container */}
      <div 
        className={`relative rounded-3xl overflow-hidden bg-white dark:bg-black/60 border border-black/[0.06] dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] max-w-full transition-all duration-300 ${
          isFullscreen ? 'scale-110 lg:scale-115 my-6' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          className="bg-transparent block"
          style={isFullscreen 
            ? { width: `${boardWidth}px`, height: `${boardHeight}px` } 
            : { width: '360px', height: '410px' }
          }
        />

        {/* Empty warning overlay */}
        {choices.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/90 text-slate-600 dark:text-slate-400 p-6">
            <span className="text-sm font-semibold mb-1 text-slate-900 dark:text-white">No slots ready</span>
            <span className="text-xs text-slate-500">Add 2 or more options in the sidebar.</span>
          </div>
        )}
      </div>

      {/* Control Triggers */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={handleDropBall}
          disabled={ballActive || choices.length < 2}
          className="apple-btn-primary flex items-center gap-2 px-8 py-3 rounded-full text-xs font-semibold tracking-wide disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
        >
          {ballActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-ping shrink-0" />
              Cascading...
            </span>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Drop Sphere
            </>
          )}
        </button>
        {choices.length < 2 && (
          <span className="text-xs text-[#86868b] font-medium">
            Requires at least 2 choices to release
          </span>
        )}
      </div>
    </div>
  );
};
