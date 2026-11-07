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

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ 
  choices, 
  onWinner, 
  isFullscreen, 
  isLightMode = true, 
  spinDuration = 8 
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelSize, setWheelSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w < 640) return Math.min(w - 24, 380);
      return Math.min(w - 440, h - 260, 580);
    }
    return 540;
  });
  const wheelSizeRef = useRef(wheelSize);
  useEffect(() => {
    wheelSizeRef.current = wheelSize;
  }, [wheelSize]);

  // Calculate which slice the top pointer (at 12 o'clock, -PI/2) points to
  const getPointerChoice = useCallback((angle: number): Choice => {
    if (choices.length === 0) return { id: '', text: '', color: '#000', weight: 1 };
    const totalWeight = Math.max(0.001, choices.reduce((sum, item) => sum + (item.weight || 1), 0));

    let relativeAngle = (-Math.PI / 2 - angle) % (2 * Math.PI);
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

    let accumAngle = 0;
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const segmentAngle = ((choice.weight || 1) / totalWeight) * 2 * Math.PI;

      if (relativeAngle >= accumAngle && relativeAngle < accumAngle + segmentAngle) {
        return choice;
      }
      accumAngle += segmentAngle;
    }
    return choices[0];
  }, [choices]);

  const [activePointerChoice, setActivePointerChoice] = useState<Choice | null>(() => choices[0] || null);

  // Animation state values stored in refs to prevent unnecessary re-renders in raf
  const stateRef = useRef({
    angle: 0,
    velocity: 0,
    isSpinning: false,
    lastTickIndex: -1,
  });

  useEffect(() => {
    setActivePointerChoice(getPointerChoice(stateRef.current.angle));
  }, [choices, getPointerChoice]);

  const isLightModeRef = useRef(isLightMode);
  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);

  const spinDurationRef = useRef(spinDuration);
  useEffect(() => {
    spinDurationRef.current = spinDuration;
  }, [spinDuration]);

  // Draw the wheel onto canvas matching the reference design
  const drawWheel = useCallback((angle: number, explicitSize?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    
    // Determine target dimension:
    const size = explicitSize || (canvas.width > 0 ? canvas.width / dpr : wheelSizeRef.current);
    if (!size || size <= 0) return;

    const physical = Math.round(size * dpr);
    if (canvas.width !== physical || canvas.height !== physical) {
      canvas.width = physical;
      canvas.height = physical;
    }

    // Always reset and enforce clean DPR scaling:
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = size;
    const height = size;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const isLight = !!isLightModeRef.current;
    const isDense = choices.length > 20;
    const isUltraDense = choices.length > 45;

    // Geometric bounds - dynamically calibrated for dense pools:
    const maxR = width / 2;
    const R_outer = Math.max(90, maxR - 10);
    // When wheel has many choices, give maximum radius to the slices:
    const bezelThickness = isDense ? Math.max(12, R_outer * 0.075) : Math.max(16, R_outer * 0.12);
    const R_slices = R_outer - bezelThickness;
    const hubRadius = isUltraDense 
      ? Math.max(22, R_slices * 0.14) 
      : (isDense ? Math.max(24, R_slices * 0.18) : Math.max(24, R_slices * 0.22));

    // ── 1. REALISTIC CAST DROP SHADOW ──
    ctx.save();
    ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.max(16, R_outer * 0.14);
    ctx.shadowOffsetY = Math.max(8, R_outer * 0.08);
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? '#1e2429' : '#0f1115';
    ctx.fill();
    ctx.restore();

    // ── 2. IRIDESCENT CHROMATIC OUTER ACCENT RIM ──
    // Subtle rainbow/sunset border trim wrapping around the dark bezel
    const iridescentGrad = ctx.createLinearGradient(
      centerX - R_outer, 
      centerY - R_outer, 
      centerX + R_outer, 
      centerY + R_outer
    );
    iridescentGrad.addColorStop(0.0, '#fbbf24'); // Yellow/Gold
    iridescentGrad.addColorStop(0.28, '#ec4899'); // Hot Pink
    iridescentGrad.addColorStop(0.55, '#8b5cf6'); // Violet
    iridescentGrad.addColorStop(0.78, '#06b6d4'); // Cyan
    iridescentGrad.addColorStop(1.0, '#fbbf24'); // Yellow/Gold

    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer, 0, Math.PI * 2);
    ctx.strokeStyle = iridescentGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // ── 3. MATTE DARK CHARCOAL BEZEL RING ──
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer - 1, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2, true); // Donut hole
    ctx.fillStyle = isLight ? '#1c2126' : '#14171b';
    ctx.fill();

    // Inner subtle highlight on bezel edge
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Handle Empty Choices State
    if (choices.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? '#f1f5f9' : '#1e242b';
      ctx.fill();

      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add choices in sidebar to populate', centerX, centerY);
      ctx.restore();
      return;
    }

    const totalWeight = Math.max(0.001, choices.reduce((sum, item) => sum + (item.weight || 1), 0));
    let currentAngle = angle;

    // ── 4. WHEEL SLICES & TEXT LABELS ──
    ctx.save();
    // Clip slices to exact wheel inner disc to prevent any jagged bleed
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2);
    ctx.clip();

    const currentPointerChoice = getPointerChoice(angle);

    choices.forEach((choice) => {
      const segmentAngle = ((choice.weight || 1) / totalWeight) * 2 * Math.PI;

      // Draw Slice Wedge
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, R_slices, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();

      ctx.fillStyle = choice.color;
      ctx.fill();

      // Active slice highlight under pointer
      if (isDense && choice.id === currentPointerChoice.id) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      } else {
        // Hairline slice separator seam
        ctx.strokeStyle = isUltraDense ? 'rgba(0, 0, 0, 0.12)' : (isDense ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.22)');
        ctx.lineWidth = isUltraDense ? 0.6 : 1.2;
        ctx.stroke();
      }

      currentAngle += segmentAngle;
    });

    // ── 5. INNER DEPTH SHADOW / VIGNETTE (Dish Inset Feel) ──
    // Creates that tactile inset look under the dark bezel
    const innerVignette = ctx.createRadialGradient(
      centerX, centerY, R_slices - Math.max(16, R_slices * 0.18),
      centerX, centerY, R_slices
    );
    innerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    innerVignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
    innerVignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = innerVignette;
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2);
    ctx.fill();

    // ── 6. GEOMETRIC FACETED STARBURST AROUND CENTER ──
    // Only draw faceted starburst when wheel has <= 20 choices.
    // For 21-100 choices, 100 faceted triangles crowd and create a chaotic highlight ring.
    if (!isDense) {
      currentAngle = angle;
      const starPeakR = hubRadius * 1.62;

      choices.forEach((choice) => {
        const segmentAngle = ((choice.weight || 1) / totalWeight) * 2 * Math.PI;
        const midAngle = currentAngle + segmentAngle / 2;

        const pTipX = centerX + Math.cos(midAngle) * starPeakR;
        const pTipY = centerY + Math.sin(midAngle) * starPeakR;

        const pLeftX = centerX + Math.cos(currentAngle) * hubRadius;
        const pLeftY = centerY + Math.sin(currentAngle) * hubRadius;

        const pRightX = centerX + Math.cos(currentAngle + segmentAngle) * hubRadius;
        const pRightY = centerY + Math.sin(currentAngle + segmentAngle) * hubRadius;

        // Left facet (darker shaded)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pLeftX, pLeftY);
        ctx.lineTo(pTipX, pTipY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.fill();

        // Right facet (subtle lighter highlight)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pTipX, pTipY);
        ctx.lineTo(pRightX, pRightY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fill();

        currentAngle += segmentAngle;
      });
    }

    // ── 7. RADIAL TEXT LABELS ──
    currentAngle = angle;
    choices.forEach((choice) => {
      const segmentAngle = ((choice.weight || 1) / totalWeight) * 2 * Math.PI;
      const midAngle = currentAngle + segmentAngle / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(midAngle);

      if (isDense) {
        // For dense wheels (21-100 items):
        // Write text from outer perimeter inward so it sits in the widest section of the wedge
        const textRadius = R_slices - (isUltraDense ? 8 : 12);
        ctx.translate(textRadius, 0);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        let fontSize = Math.max(10, Math.floor(R_slices * 0.065));
        if (choices.length > 70) {
          fontSize = Math.max(7.5, Math.floor(R_slices * 0.046));
        } else if (choices.length > 40) {
          fontSize = Math.max(8.5, Math.floor(R_slices * 0.054));
        }

        ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif`;

        // Zero-blur shadow so letters never smudge across thin wedges
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0.5;
        ctx.shadowOffsetY = 0.5;
        ctx.fillStyle = '#ffffff';

        let text = choice.text;
        const maxChars = choices.length > 60 ? 12 : 16;
        if (text.length > maxChars) text = text.substring(0, maxChars - 1) + '…';

        ctx.fillText(text, 0, 0);
      } else {
        // Standard <= 20 choices
        const textRadius = hubRadius + (R_slices - hubRadius) * 0.54;
        ctx.translate(textRadius, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let fontSize = Math.max(16, Math.floor(R_slices * 0.13));
        if (choices.length > 10) {
          fontSize = Math.max(10, Math.floor(R_slices * 0.08));
        } else if (choices.length > 6) {
          fontSize = Math.max(13, Math.floor(R_slices * 0.105));
        }

        ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 1.5;
        ctx.fillStyle = '#ffffff';

        let text = choice.text;
        const maxChars = choices.length > 8 ? 10 : 16;
        if (text.length > maxChars) text = text.substring(0, maxChars - 1) + '…';

        ctx.fillText(text, 0, 0);
      }

      ctx.restore();
      currentAngle += segmentAngle;
    });

    ctx.restore(); // End slice clip

    // ── 8. CENTER HUB CAP WITH IRIDESCENT RIM ──
    // Outer shadow under the hub
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Dark charcoal hub disc
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? '#1c2126' : '#14171b';
    ctx.fill();
    ctx.restore();

    // Center hub iridescent ring (matching outer rim)
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
    ctx.strokeStyle = iridescentGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner subtle center jewel
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius * 0.65, 0, Math.PI * 2);
    const innerHubGrad = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, hubRadius * 0.65
    );
    innerHubGrad.addColorStop(0, '#2b3038');
    innerHubGrad.addColorStop(1, '#15181c');
    ctx.fillStyle = innerHubGrad;
    ctx.fill();

    // ── 9. TOP POINTER / INDICATOR (12 O'CLOCK RIBBON ARROW) ──
    // Exactly matches reference: gradient ribbon tab extending from outer bezel into the wheel
    ctx.save();
    const pointerW = Math.max(16, R_outer * 0.10);
    const pointerTopY = centerY - R_outer - 1;
    const pointerShoulderY = centerY - R_slices + 2;
    const pointerTipY = centerY - R_slices + Math.max(14, R_outer * 0.095);

    // Cast soft shadow downward onto the wheel
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // Pointer path
    ctx.beginPath();
    ctx.moveTo(centerX - pointerW / 2, pointerTopY);
    ctx.lineTo(centerX + pointerW / 2, pointerTopY);
    ctx.lineTo(centerX + pointerW / 2, pointerShoulderY);
    ctx.lineTo(centerX, pointerTipY); // Triangle tip pointing into wheel
    ctx.lineTo(centerX - pointerW / 2, pointerShoulderY);
    ctx.closePath();

    // Vibrant Yellow-to-Pink-to-Violet gradient as in reference
    const pointerGrad = ctx.createLinearGradient(centerX, pointerTopY, centerX, pointerTipY);
    pointerGrad.addColorStop(0, '#fbbf24'); // Golden Yellow
    pointerGrad.addColorStop(0.5, '#ec4899'); // Hot Pink
    pointerGrad.addColorStop(1, '#8b5cf6'); // Violet

    ctx.fillStyle = pointerGrad;
    ctx.fill();

    // Subtle crisp edge highlight on pointer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }, [choices, getPointerChoice]);

  const spin = () => {
    if (isSpinning || choices.length < 2) return;

    setIsSpinning(true);
    stateRef.current.isSpinning = true;

    soundManager.playLeverPull();

    const startTime = Date.now();
    const durationMs = (spinDurationRef.current || 8) * 1000;
    const decelerationMs = 1800;
    const constantDurationMs = Math.max(1000, durationMs - decelerationMs);
    const peakVelocity = 0.24 + Math.random() * 0.05;

    let frameId: number;
    let lastTime = Date.now();

    const animate = () => {
      const state = stateRef.current;
      const now = Date.now();
      const elapsed = now - startTime;
      const dt = Math.min(3, (now - lastTime) / 16.666);
      lastTime = now;

      // Constant velocity until deceleration phase, then smooth cubic ease-out
      let velocity: number;
      if (elapsed < constantDurationMs) {
        velocity = peakVelocity;
      } else {
        const decelProgress = Math.min(1, (elapsed - constantDurationMs) / decelerationMs);
        // Cubic ease-out deceleration curve
        velocity = peakVelocity * Math.pow(1 - decelProgress, 3);
      }

      state.angle += velocity * dt;
      state.velocity = velocity;

      // Tick sound triggering on wedge crossings
      const pointerChoice = getPointerChoice(state.angle);
      const pointerIndex = choices.findIndex(c => c.id === pointerChoice.id);

      if (pointerIndex !== state.lastTickIndex) {
        soundManager.playTick(520 + pointerIndex * 25, 0.035);
        state.lastTickIndex = pointerIndex;
        setActivePointerChoice(pointerChoice);
      }

      drawWheel(state.angle);

      if (elapsed >= durationMs) {
        state.velocity = 0;
        state.isSpinning = false;
        setIsSpinning(false);
        setActivePointerChoice(pointerChoice);
        soundManager.playWin();
        onWinner(pointerChoice);
        cancelAnimationFrame(frameId);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
  };

  // Redraw wheel whenever choices change or resize mounts
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const availableWidth = container ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 560);
      const isMobile = availableWidth < 540;
      // Allow wheel to scale up to 580px on desktop (and 720px in fullscreen) so it is prominent and readable
      const maxAllowed = isFullscreen 
        ? Math.min(availableWidth - 32, 720) 
        : (isMobile ? Math.min(availableWidth - 16, 400) : Math.min(availableWidth - 32, 580));
      const computedSize = Math.max(280, Math.min(Math.floor(availableWidth - 24), maxAllowed));
      
      setWheelSize(computedSize);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(computedSize * dpr);
        canvas.height = Math.round(computedSize * dpr);
        drawWheel(stateRef.current.angle, computedSize);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [choices, drawWheel, isFullscreen]);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center justify-center select-none w-full ${isFullscreen ? 'p-8' : 'p-3 py-6'}`}
    >
      {/* Live Pointer Selection HUD Pill */}
      {activePointerChoice && (
        <div className="mb-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-2xs backdrop-blur-md">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10 dark:ring-white/20" 
            style={{ backgroundColor: activePointerChoice.color }} 
          />
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
            {isSpinning ? 'Current' : 'Pointer'}:
          </span>
          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white max-w-[240px] truncate">
            {activePointerChoice.text}
          </span>
        </div>
      )}

      {/* Wheel Canvas Container */}
      <div 
        className="relative flex items-center justify-center shrink-0 mx-auto select-none"
        style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}
      >
        {/* Ambient Halo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-amber-500/10 to-pink-500/10 rounded-full filter blur-2xl -z-10 pointer-events-none" />

        {/* Canvas Wheel */}
        <canvas
          ref={canvasRef}
          style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}
          className="cursor-pointer rounded-full block"
          onClick={spin}
        />
      </div>

      {/* Spin Button & Action Area */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          onClick={spin}
          disabled={isSpinning || choices.length < 2}
          className="apple-btn-primary flex items-center gap-2 px-8 py-3 rounded-full text-xs font-semibold tracking-wide disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isSpinning ? 'Spinning...' : 'Spin Wheel'}
        </button>

        {choices.length < 2 && (
          <span className="text-xs text-[#86868b] font-medium">
            Add at least 2 choices to spin
          </span>
        )}
      </div>
    </div>
  );
};
