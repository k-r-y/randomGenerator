import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Play } from 'lucide-react';

interface JeepneyRaceProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
  spinDuration?: number;
}

interface JeepneyState {
  choice: Choice;
  x: number;
  y: number;
  speed: number;
  baseY: number;
  suspensionBounce: number;
  wheelAngle: number;
  finished: boolean;
  boostActive: boolean;
  boostTime: number;
  laneIndex: number;
  slotIndex: number;
  routeSign: string;
  slogan: string;
}

const PHILIPPINE_ROUTES = [
  'DIVISORIA',
  'QUIAPO',
  'BACLARAN',
  'CUBAO',
  'MONUMENTO',
  'TAFT AVE',
  'ALABANG',
  'FAIRVIEW',
  'PASAY',
  'MEGAMALL',
];

const JEEPNEY_SLOGANS = [
  'GOD BLESS OUR TRIP',
  'KATAS NG SAUDI',
  'BASTA DRIVER SWEET LOVER',
  'SARAO MOTORS',
  'BAYAN MUNA',
  'PILIPINAS',
  'WALANG IWANAN',
  'BIYAYA NG DIYOS',
];

const getCurrentTime = () => Date.now();

// Calculate exact track vertical geometry shared across physics and rendering
const getTrackLayout = (height: number, width: number, dpr: number) => {
  const isMobile = width < 540 * dpr;
  // Scenic height above the asphalt
  const scenicHeight = isMobile 
    ? Math.min(80 * dpr, height * 0.22)
    : Math.max(100 * dpr, Math.min(150 * dpr, height * 0.28));
  const curbHeight = isMobile ? 8 * dpr : 12 * dpr;
  const curbY = scenicHeight;
  const asphaltY = curbY + curbHeight;
  const bottomMargin = isMobile ? 10 * dpr : 16 * dpr;
  const asphaltHeight = height - asphaltY - bottomMargin;

  return {
    scenicHeight,
    curbY,
    curbHeight,
    asphaltY,
    asphaltHeight,
    isMobile,
  };
};

// Calculate responsive starting line and finish line
const getTrackHorizontalBounds = (width: number, dpr: number, totalChoices: number = 0) => {
  const isMobile = width < 540 * dpr;
  const maxSlots = Math.max(1, Math.ceil(totalChoices / 10));
  const slotStagger = isMobile ? 22 * dpr : 28 * dpr;

  // Stagger base starting point so rear slots remain cleanly visible on the road
  const minLeftPadding = isMobile ? 20 * dpr : 38 * dpr;
  const baseStartX = minLeftPadding + (maxSlots - 1) * slotStagger;

  const startX = isMobile 
    ? Math.max(baseStartX, width * 0.08) 
    : Math.max(baseStartX, Math.min(105 * dpr, width * 0.12));

  const finishLine = isMobile ? (width - 42 * dpr) : (width - Math.min(95 * dpr, width * 0.11));
  return { startX, finishLine, isMobile, slotStagger };
};

const initJeepneys = (choices: Choice[], canvasHeight: number, canvasWidth: number) => {
  if (choices.length === 0) return [];

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const { startX, slotStagger } = getTrackHorizontalBounds(canvasWidth, dpr, choices.length);
  const { asphaltY, asphaltHeight } = getTrackLayout(canvasHeight, canvasWidth, dpr);

  // Maximum number of rows is 10. The remaining are placed on the same track/row (index % 10)
  const totalRows = Math.min(10, Math.max(1, choices.length));
  const laneHeight = totalRows > 0 ? asphaltHeight / totalRows : asphaltHeight;

  return choices.map((choice, index) => {
    const laneIndex = index % 10;
    const slotIndex = Math.floor(index / 10);

    // Each row is centered precisely within its designated asphalt lane
    const laneCenterY = asphaltY + (laneIndex + 0.5) * laneHeight;

    // Subtle vertical drafting offset for multiple vehicles in the same lane
    const draftOffset = slotIndex > 0 ? ((slotIndex % 2 === 1 ? -2.5 : 2.5) * dpr) : 0;
    const initialY = laneCenterY + draftOffset;

    // Stagger starting X behind lead vehicle like a motorsport starting grid
    const initialX = startX - slotIndex * slotStagger;

    return {
      choice,
      x: initialX,
      y: initialY,
      baseY: initialY,
      speed: 0,
      suspensionBounce: Math.random() * Math.PI * 2,
      wheelAngle: 0,
      finished: false,
      boostActive: false,
      boostTime: 0,
      laneIndex,
      slotIndex,
      routeSign: PHILIPPINE_ROUTES[index % PHILIPPINE_ROUTES.length],
      slogan: JEEPNEY_SLOGANS[index % JEEPNEY_SLOGANS.length],
    };
  });
};

export const JeepneyRace: React.FC<JeepneyRaceProps> = ({ 
  choices, 
  onWinner, 
  isFullscreen, 
  isLightMode = true, 
  spinDuration = 8 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [raceActive, setRaceActive] = useState(false);
  const raceEndTimeRef = useRef<number>(0);
  const timerDurationRef = useRef(spinDuration);

  const isLightModeRef = useRef(isLightMode);
  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);

  useEffect(() => {
    timerDurationRef.current = spinDuration;
  }, [spinDuration]);

  const jeepneysRef = useRef<JeepneyState[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const roadScrollOffsetRef = useRef(0);
  const banderitaSwayRef = useRef(0);

  const handleStartRace = () => {
    if (raceActive || choices.length < 2) return;

    setRaceActive(true);
    // Play authentic Philippine jeepney horn beep!
    soundManager.playJeepneyHorn();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    jeepneysRef.current = initJeepneys(choices, canvas.height, canvas.width);

    const { startX, finishLine } = getTrackHorizontalBounds(canvas.width, dpr, choices.length);
    let winnerReported = false;

    const startTime = getCurrentTime();
    const totalMs = timerDurationRef.current * 1000;
    raceEndTimeRef.current = startTime + totalMs;

    const actualDistance = finishLine - startX;

    const runFrame = () => {
      // Highway road markings scroll backward (leftward) as vehicles drive forward
      roadScrollOffsetRef.current += 4.5 * dpr;
      banderitaSwayRef.current += 0.04;

      const now = getCurrentTime();
      const elapsed = now - startTime;
      const elapsedFraction = Math.min(1.0, elapsed / totalMs);

      // Target leading position at this moment of the race
      const desiredLeadX = startX + elapsedFraction * actualDistance;
      
      const currentLeadX = jeepneysRef.current.length > 0 
        ? Math.max(...jeepneysRef.current.map(j => j.x))
        : startX;

      let paceScale = 1.0;
      if (currentLeadX < desiredLeadX) {
        paceScale = 1.0 + (desiredLeadX - currentLeadX) / (40 * dpr);
      } else {
        paceScale = Math.max(0.1, 1.0 - (currentLeadX - desiredLeadX) / (80 * dpr));
      }

      // Update Jeepney kinematics
      jeepneysRef.current.forEach((jeepney) => {
        if (jeepney.finished) return;

        let targetSpeed = (1.5 + Math.random() * 2.8) * dpr;

        // Weight proportionality
        const weightBonus = (jeepney.choice.weight - 1) * 0.25 * dpr;
        targetSpeed += weightBonus;

        // Random turbo boost & honk
        if (!jeepney.boostActive && Math.random() < 0.009) {
          jeepney.boostActive = true;
          jeepney.boostTime = 30 + Math.random() * 35;
          if (Math.random() < 0.3) soundManager.playJeepneyHorn();
        }

        if (jeepney.boostActive) {
          targetSpeed += 2.4 * dpr;
          jeepney.boostTime--;
          if (jeepney.boostTime <= 0) {
            jeepney.boostActive = false;
          }
        }

        // Smooth speed interpolation
        jeepney.speed = jeepney.speed * 0.72 + targetSpeed * 0.12;
        jeepney.x += jeepney.speed * paceScale;
        jeepney.wheelAngle += (jeepney.speed * 0.15);
        jeepney.suspensionBounce += 0.18;

        // Check if crossed finish line
        if (jeepney.x >= finishLine) {
          jeepney.x = finishLine;
          jeepney.finished = true;
          
          if (!winnerReported) {
            winnerReported = true;
            setRaceActive(false);
            soundManager.playWin();
            onWinner(jeepney.choice);
          }
        }
      });

      draw();

      const remaining = raceEndTimeRef.current - getCurrentTime();
      if (remaining <= 0 && !winnerReported) {
        const leader = jeepneysRef.current.reduce((a, b) => a.x > b.x ? a : b);
        winnerReported = true;
        setRaceActive(false);
        soundManager.playWin();
        onWinner(leader.choice);
        return;
      }

      if (!winnerReported) {
        animationFrameRef.current = requestAnimationFrame(runFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(runFrame);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isLight = !!isLightModeRef.current;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const { finishLine, isMobile } = getTrackHorizontalBounds(width, dpr);
    const { scenicHeight, curbY, curbHeight, asphaltY, asphaltHeight } = getTrackLayout(height, width, dpr);

    // ── 1. SKY & TROPICAL HORIZON BACKDROP ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, scenicHeight);
    if (isLight) {
      skyGrad.addColorStop(0, '#38bdf8');    // Tropical Manila blue
      skyGrad.addColorStop(0.55, '#bae6fd');  // Soft morning sky
      skyGrad.addColorStop(1, '#fef08a');    // Warm golden Philippine sunshine
    } else {
      skyGrad.addColorStop(0, '#090d16');    // Midnight tropical sky
      skyGrad.addColorStop(0.7, '#1e1b4b');  // Deep dusk
      skyGrad.addColorStop(1, '#312e81');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, scenicHeight);

    // Tropical Clouds
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.08)';
    const cloudOffsets = [width * 0.12, width * 0.44, width * 0.82];
    cloudOffsets.forEach((cx, i) => {
      const cy = 16 * dpr + (i % 2) * 6 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * dpr, 0, Math.PI * 2);
      ctx.arc(cx + 15 * dpr, cy - 4 * dpr, 17 * dpr, 0, Math.PI * 2);
      ctx.arc(cx + 32 * dpr, cy, 13 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── 2. ICONIC MOUNT MAYON VOLCANO (Albay, Bicol) ──
    // Famous world-renowned symmetrical perfect cone volcano
    const mayonCenterX = width * 0.46;
    const mayonBaseW = width * 0.38;
    const mayonPeakY = scenicHeight * 0.22;
    const mayonPeakHalfW = 10 * dpr;

    ctx.save();
    // Volcano body
    const mayonGrad = ctx.createLinearGradient(mayonCenterX, mayonPeakY, mayonCenterX, scenicHeight);
    if (isLight) {
      mayonGrad.addColorStop(0, '#60a5fa');
      mayonGrad.addColorStop(0.4, '#818cf8');
      mayonGrad.addColorStop(1, '#93c5fd');
    } else {
      mayonGrad.addColorStop(0, '#312e81');
      mayonGrad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = mayonGrad;

    ctx.beginPath();
    ctx.moveTo(mayonCenterX - mayonBaseW / 2, scenicHeight);
    ctx.quadraticCurveTo(
      mayonCenterX - mayonBaseW * 0.22, scenicHeight * 0.65,
      mayonCenterX - mayonPeakHalfW, mayonPeakY
    );
    ctx.lineTo(mayonCenterX + mayonPeakHalfW, mayonPeakY); // Crater rim
    ctx.quadraticCurveTo(
      mayonCenterX + mayonBaseW * 0.22, scenicHeight * 0.65,
      mayonCenterX + mayonBaseW / 2, scenicHeight
    );
    ctx.closePath();
    ctx.fill();

    // Volcanic Smoke Plume drifting gently from Mayon crater
    const smokeSway = Math.sin(banderitaSwayRef.current * 0.6) * (6 * dpr);
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(mayonCenterX + smokeSway, mayonPeakY - 8 * dpr, 7 * dpr, 0, Math.PI * 2);
    ctx.arc(mayonCenterX + smokeSway + 10 * dpr, mayonPeakY - 16 * dpr, 9 * dpr, 0, Math.PI * 2);
    ctx.arc(mayonCenterX + smokeSway + 22 * dpr, mayonPeakY - 24 * dpr, 11 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Distant Sierra Madre / Bohol rolling hills in foreground
    ctx.fillStyle = isLight ? 'rgba(52, 211, 153, 0.42)' : 'rgba(6, 78, 59, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, scenicHeight);
    ctx.lineTo(width * 0.18, scenicHeight * 0.72);
    ctx.lineTo(width * 0.35, scenicHeight);
    ctx.lineTo(width * 0.72, scenicHeight * 0.68);
    ctx.lineTo(width * 0.92, scenicHeight);
    ctx.lineTo(width, scenicHeight * 0.75);
    ctx.lineTo(width, scenicHeight);
    ctx.closePath();
    ctx.fill();

    // Coconut palm trees (Puno ng Niyog) with coconuts
    const drawPalmTree = (px: number, py: number, palmScale: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(palmScale * dpr, palmScale * dpr);

      // Curved trunk with rings
      ctx.strokeStyle = isLight ? '#78350f' : '#451a03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, -25, 4, -48);
      ctx.stroke();

      // Coconuts cluster
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(2, -47, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -46, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -44, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Lush fronds
      ctx.strokeStyle = isLight ? '#059669' : '#065f46';
      ctx.lineWidth = 2.4;
      const angles = [-0.9, -0.5, -0.2, 0.2, 0.5, 0.9];
      angles.forEach((ang) => {
        ctx.beginPath();
        ctx.moveTo(4, -48);
        const fx = 4 + Math.sin(ang) * 22;
        const fy = -48 - Math.cos(ang) * 16 + Math.abs(ang) * 6;
        ctx.quadraticCurveTo(4 + Math.sin(ang) * 12, -60, fx, fy);
        ctx.stroke();
      });
      ctx.restore();
    };

    [width * 0.05, width * 0.25, width * 0.66, width * 0.88].forEach((px, i) => {
      drawPalmTree(px, scenicHeight, 0.65 + (i % 2) * 0.15);
    });

    // ── 3. ROADSIDE SARI-SARI STORE & FILIPINO STREET FOOD ──
    // A. Sari-Sari Store ("Tindahan ni Aling Nena")
    const storeX = width * 0.12;
    const storeY = curbY - 38 * dpr;
    const storeW = 46 * dpr;
    const storeH = 38 * dpr;

    ctx.save();
    // Wooden Store wall
    ctx.fillStyle = '#b45309';
    ctx.fillRect(storeX, storeY + 12 * dpr, storeW, storeH - 12 * dpr);

    // Corrugated Galvanized Tin Roof (Yero)
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(storeX - 4 * dpr, storeY + 12 * dpr);
    ctx.lineTo(storeX + storeW / 2, storeY + 2 * dpr);
    ctx.lineTo(storeX + storeW + 4 * dpr, storeY + 12 * dpr);
    ctx.closePath();
    ctx.fill();

    // Striped Awning
    const numStripes = 6;
    const stripeW = storeW / numStripes;
    for (let s = 0; s < numStripes; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#ef4444' : '#ffffff';
      ctx.fillRect(storeX + s * stripeW, storeY + 12 * dpr, stripeW, 6 * dpr);
    }

    // Window counter with snacks/chichirya
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(storeX + 6 * dpr, storeY + 20 * dpr, storeW - 12 * dpr, 14 * dpr);

    // Hanging snack chips in colorful plastic strips
    const snackColors = ['#f59e0b', '#ef4444', '#10b981'];
    snackColors.forEach((sc, idx) => {
      ctx.fillStyle = sc;
      for (let p = 0; p < 3; p++) {
        ctx.fillRect(storeX + (10 + idx * 9) * dpr, storeY + (22 + p * 4) * dpr, 6 * dpr, 3 * dpr);
      }
    });

    // Sign: "SARI-SARI STORE"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${4.5 * dpr}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SARI-SARI', storeX + storeW / 2, storeY + 9 * dpr);
    ctx.restore();

    // B. Parked Philippine Tricycle (Sidecar)
    const trikeX = width * 0.54;
    const trikeY = curbY - 24 * dpr;

    ctx.save();
    // Motorcycle body (black)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(trikeX + 16 * dpr, trikeY + 8 * dpr, 14 * dpr, 8 * dpr);
    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(trikeX + 18 * dpr, trikeY + 18 * dpr, 5 * dpr, 0, Math.PI * 2);
    ctx.arc(trikeX + 28 * dpr, trikeY + 18 * dpr, 5 * dpr, 0, Math.PI * 2);
    ctx.arc(trikeX + 6 * dpr, trikeY + 18 * dpr, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Passenger Sidecar Cabin (Bright Cyan/Blue)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.roundRect(trikeX, trikeY + 6 * dpr, 14 * dpr, 12 * dpr, 3 * dpr);
    ctx.fill();
    // Sidecar windshield
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(trikeX + 2 * dpr, trikeY + 8 * dpr, 5 * dpr, 4 * dpr);
    // Sidecar roof
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(trikeX - 1 * dpr, trikeY + 4 * dpr, 16 * dpr, 2.5 * dpr);
    ctx.restore();

    // C. Street Food Cart (Fishball / Kwek-Kwek Pushcart with Beach Umbrella)
    const cartX = width * 0.74;
    const cartY = curbY - 32 * dpr;

    ctx.save();
    // Beach Parasol Umbrella (Yellow, Red, Blue)
    const umbrellaR = 14 * dpr;
    const umbrellaX = cartX + 12 * dpr;
    const umbrellaY = cartY + 6 * dpr;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(umbrellaX, umbrellaY, umbrellaR, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(umbrellaX, umbrellaY, umbrellaR * 0.65, Math.PI, 0);
    ctx.fill();

    // Umbrella pole
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(umbrellaX, umbrellaY);
    ctx.lineTo(umbrellaX, cartY + 22 * dpr);
    ctx.stroke();

    // Wooden cart body
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cartX, cartY + 18 * dpr, 24 * dpr, 10 * dpr);

    // Bicycle spoke wheels
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.arc(cartX + 6 * dpr, cartY + 28 * dpr, 4 * dpr, 0, Math.PI * 2);
    ctx.arc(cartX + 18 * dpr, cartY + 28 * dpr, 4 * dpr, 0, Math.PI * 2);
    ctx.stroke();

    // Sauce jars (Sweet & Spicy)
    ctx.fillStyle = '#dc2626'; // Spicy red sauce
    ctx.fillRect(cartX + 3 * dpr, cartY + 15 * dpr, 3 * dpr, 4 * dpr);
    ctx.fillStyle = '#b45309'; // Brown sweet sauce
    ctx.fillRect(cartX + 8 * dpr, cartY + 15 * dpr, 3 * dpr, 4 * dpr);

    // Mini Sign: "FISHBALL"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${3.5 * dpr}px Outfit, sans-serif`;
    ctx.fillText('FISHBALL', cartX + 12 * dpr, cartY + 24 * dpr);
    ctx.restore();

    // ── 4. FESTIVE FIESTA BANDERITAS (Double-tier Pennants) ──
    const wireY1 = 12 * dpr;
    const wireY2 = 24 * dpr;

    [wireY1, wireY2].forEach((wireY, wireIdx) => {
      ctx.strokeStyle = isLight ? 'rgba(71, 85, 105, 0.35)' : 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, wireY);
      
      const segments = 6;
      const segW = width / segments;
      for (let s = 0; s < segments; s++) {
        const sx = s * segW;
        const mx = sx + segW / 2;
        const ex = sx + segW;
        ctx.quadraticCurveTo(mx, wireY + 7 * dpr, ex, wireY);
      }
      ctx.stroke();

      // Vibrant fiesta triangle pennants (Philippine fiesta palette)
      const flagColors = ['#ef4444', '#3b82f6', '#facc15', '#10b981', '#ffffff', '#f97316', '#a855f7'];
      const flagSpacing = 26 * dpr;
      const totalFlags = Math.floor(width / flagSpacing);

      for (let f = 0; f < totalFlags; f++) {
        const fx = f * flagSpacing + 8 * dpr;
        const segProgress = (fx % segW) / segW;
        const sag = Math.sin(segProgress * Math.PI) * 7 * dpr;
        const fy = wireY + sag;

        const color = flagColors[(f + wireIdx * 3) % flagColors.length];
        const sway = Math.sin(banderitaSwayRef.current + f * 0.4) * (2.4 * dpr);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(fx - 6 * dpr, fy);
        ctx.lineTo(fx + 6 * dpr, fy);
        ctx.lineTo(fx + sway, fy + 12 * dpr);
        ctx.closePath();
        ctx.fill();
      }
    });

    // ── 5. AUTHENTIC PHILIPPINE ROADSIDE STREET SIGNS ──
    // A. Round blue "JEEPNEY STOP"
    const signX = width * 0.32;
    const signY = curbY - 32 * dpr;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(signX + 13 * dpr, signY + 16 * dpr, 2.5 * dpr, 16 * dpr);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(signX + 14 * dpr, signY + 9 * dpr, 10 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${5 * dpr}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JEEPNEY', signX + 14 * dpr, signY + 7 * dpr);
    ctx.fillText('STOP', signX + 14 * dpr, signY + 12 * dpr);

    // B. Red "PARA PO / PARA DITO"
    const sign2X = width * 0.86;
    const sign2Y = curbY - 28 * dpr;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(sign2X + 14 * dpr, sign2Y + 14 * dpr, 2 * dpr, 14 * dpr);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(sign2X, sign2Y, 28 * dpr, 14 * dpr, 3 * dpr);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${5.5 * dpr}px Outfit, sans-serif`;
    ctx.fillText('PARA PO!', sign2X + 14 * dpr, sign2Y + 7 * dpr);

    // C. Yellow "BAWAL TUMAWID" warning sign
    const sign3X = width * 0.42;
    const sign3Y = curbY - 26 * dpr;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(sign3X + 10 * dpr, sign3Y + 12 * dpr, 2 * dpr, 14 * dpr);
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(sign3X, sign3Y, 22 * dpr, 12 * dpr, 2 * dpr);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${4 * dpr}px Outfit, sans-serif`;
    ctx.fillText('BAWAL', sign3X + 11 * dpr, sign3Y + 4 * dpr);
    ctx.fillText('TUMAWID', sign3X + 11 * dpr, sign3Y + 8.5 * dpr);

    // ── 6. STREET CURB (Classic Philippine Red and White) ──
    const blockWidth = 24 * dpr;
    const curbPeriod = blockWidth * 2;
    const curbOffset = roadScrollOffsetRef.current % curbPeriod;
    const numCurbBlocks = Math.ceil(width / blockWidth) + 3;
    for (let b = -2; b < numCurbBlocks; b++) {
      const bx = b * blockWidth - curbOffset;
      const isRed = ((b % 2) + 2) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
      ctx.fillRect(bx, curbY, blockWidth + 0.5, curbHeight);
    }

    // ── 7. ASPHALT HIGHWAY SURFACE ──
    const roadGrad = ctx.createLinearGradient(0, asphaltY, 0, height);
    if (isLight) {
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(1, '#1e293b');
    } else {
      roadGrad.addColorStop(0, '#0f172a');
      roadGrad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, asphaltY, width, height - asphaltY);

    // ── 8. LANE DIVIDERS (White Dashed Highway Lines) ──
    const totalRows = Math.min(10, Math.max(1, choices.length));
    const laneHeight = totalRows > 0 ? asphaltHeight / totalRows : asphaltHeight;

    if (totalRows > 1) {
      for (let idx = 1; idx < totalRows; idx++) {
        const separatorY = asphaltY + idx * laneHeight;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.setLineDash([22 * dpr, 18 * dpr]);
        // Positive offset streams dashed lines backward (leftward) to mimic highway rushing backward
        ctx.lineDashOffset = roadScrollOffsetRef.current;
        
        ctx.beginPath();
        ctx.moveTo(0, separatorY);
        ctx.lineTo(width, separatorY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── 9. CHECKERED FINISH LINE & FIESTA BAMBOO ARCH (Arko ng Fiesta) ──
    const boxSize = 10 * dpr;
    for (let y = asphaltY; y < height; y += boxSize * 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(finishLine, y, boxSize, boxSize);
      ctx.fillRect(finishLine + boxSize, y + boxSize, boxSize, boxSize);

      ctx.fillStyle = '#000000';
      ctx.fillRect(finishLine + boxSize, y, boxSize, boxSize);
      ctx.fillRect(finishLine, y + boxSize, boxSize, boxSize);
    }

    // Traditional Golden Bamboo Town Arch (Singkaban / Arko)
    ctx.save();
    // Bamboo Lattice Pillars
    ctx.fillStyle = '#d97706';
    ctx.fillRect(finishLine - 5 * dpr, curbY - 44 * dpr, 7 * dpr, height - curbY + 44 * dpr);
    ctx.fillRect(finishLine + 17 * dpr, curbY - 44 * dpr, 7 * dpr, height - curbY + 44 * dpr);

    // Bamboo rings
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2 * dpr;
    for (let by = curbY - 44 * dpr; by < height; by += 14 * dpr) {
      ctx.strokeRect(finishLine - 6 * dpr, by, 9 * dpr, 2.5 * dpr);
      ctx.strokeRect(finishLine + 16 * dpr, by, 9 * dpr, 2.5 * dpr);
    }

    // Overhead Grand Town Fiesta Banner
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(finishLine - 36 * dpr, curbY - 50 * dpr, 92 * dpr, 20 * dpr, 4 * dpr);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // Festive ray burst / Capiz shell motif on arch
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(finishLine + 10 * dpr, curbY - 50 * dpr, 10 * dpr, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${8 * dpr}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH LINE', finishLine + 10 * dpr, curbY - 40 * dpr);
    ctx.restore();

    // ── 10. DRAW PHILIPPINE JEEPNEYS & FILIPINO COMMUTERS ──
    const mobileFactor = isMobile ? 0.74 : 1.0;
    const scale = Math.min(1.25 * mobileFactor, Math.max(0.52, (laneHeight / (76 * dpr)) * mobileFactor));

    // Sort jeepneys by X so trailing vehicles render behind leading ones in the same row
    const sortedJeepneys = [...jeepneysRef.current].sort((a, b) => a.x - b.x);

    sortedJeepneys.forEach((jeepney) => {
      const bounce = Math.sin(jeepney.suspensionBounce) * (1.5 * dpr);

      ctx.save();
      ctx.translate(jeepney.x, jeepney.y + bounce);
      ctx.scale(scale * dpr, scale * dpr);

      // Exhaust Boost Smoke & Turbo Glow
      if (jeepney.boostActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let i = 0; i < 4; i++) {
          const sx = -62 - Math.random() * 26;
          const sy = 12 + Math.random() * 10;
          const sRadius = 4 + Math.random() * 8;
          ctx.beginPath();
          ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-60, 4);
        ctx.lineTo(-85, 4);
        ctx.moveTo(-55, -8);
        ctx.lineTo(-75, -8);
        ctx.stroke();
      }

      // Headlight Beam Projection forward onto the asphalt
      const beamGrad = ctx.createLinearGradient(48, 8, 140, 8);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(48, 6);
      ctx.lineTo(140, -10);
      ctx.lineTo(140, 26);
      ctx.lineTo(48, 16);
      ctx.closePath();
      ctx.fill();

      // ── JEEPNEY LOWER BODY SKIRT ──
      ctx.fillStyle = jeepney.choice.color;
      ctx.beginPath();
      ctx.roundRect(-52, -12, 100, 24, [4, 8, 2, 2]);
      ctx.fill();

      // Front Hood (Bonnet) sloping forward in stainless steel
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(12, -12);
      ctx.lineTo(46, -6);
      ctx.lineTo(50, 8);
      ctx.lineTo(12, 8);
      ctx.closePath();
      ctx.fill();

      // Front chrome grille louvers
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      for (let g = 20; g <= 42; g += 5) {
        ctx.beginPath();
        ctx.moveTo(g, -8 + (g - 20) * 0.15);
        ctx.lineTo(g, 6);
        ctx.stroke();
      }

      // ── TRIPLE CHROME HORSES (Tatlong Kabayo sa Bonete) ──
      // Classic iconic Philippine Jeepney hood ornament!
      const horseOffsets = [46, 42, 38];
      horseOffsets.forEach((hx) => {
        ctx.fillStyle = '#f59e0b'; // Golden chrome stallion
        ctx.beginPath();
        ctx.arc(hx, -9, 2.2, 0, Math.PI * 2); // Head
        ctx.moveTo(hx, -9);
        ctx.lineTo(hx - 3, -6); // Body
        ctx.lineTo(hx - 5, -7);
        ctx.stroke();
      });

      // Stainless Steel Mid-body panel
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-50, -4, 62, 10);

      // Hand-painted Philippine chevron stripes (Flag colors: Red, Yellow, Blue)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-45, -2);
      ctx.lineTo(-35, 4);
      ctx.lineTo(-39, 4);
      ctx.lineTo(-49, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-33, -2);
      ctx.lineTo(-23, 4);
      ctx.lineTo(-27, 4);
      ctx.lineTo(-37, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(-21, -2);
      ctx.lineTo(-11, 4);
      ctx.lineTo(-15, 4);
      ctx.lineTo(-25, -2);
      ctx.closePath();
      ctx.fill();

      // ── OPEN-AIR PASSENGER CABIN & FILIPINO COMMUTERS ──
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-48, -26, 56, 15);

      // 1. Driver (front seat at x = 2)
      ctx.fillStyle = '#d97706'; // Morena/Kayumanggi skin tone
      ctx.beginPath();
      ctx.arc(4, -20, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // Blue driver cap
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(4, -22, 5, Math.PI, 0);
      ctx.lineTo(10, -22);
      ctx.stroke();
      ctx.fill();
      // Steering wheel
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(10, -16, 4, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Commuter with Native Straw Hat (Salakot)
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-14, -18, 4, 0, Math.PI * 2);
      ctx.fill();
      // Salakot conical straw hat
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-20, -21);
      ctx.lineTo(-14, -26);
      ctx.lineTo(-8, -21);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Commuter in Barong Tagalog / Camisa de Chino
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(-30, -19, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc'; // Barong cream/white
      ctx.fillRect(-34, -15, 8, 4);

      // 4. Commuter "Sabit" holding onto rear grab bar!
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-54, -16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-56, -12, 5, 8);
      // Grab rail
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-51, -26);
      ctx.lineTo(-51, 8);
      ctx.stroke();

      // Windshield glass
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.beginPath();
      ctx.moveTo(10, -26);
      ctx.lineTo(18, -12);
      ctx.lineTo(8, -12);
      ctx.lineTo(4, -26);
      ctx.closePath();
      ctx.fill();

      // Sampaguita Garland hanging from rearview mirror
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(9, -21, 1.2, 0, Math.PI * 2);
      ctx.arc(8.5, -19, 1.2, 0, Math.PI * 2);
      ctx.arc(8, -17, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981'; // Sampaguita green leaf
      ctx.fillRect(7.5, -16, 2, 2);

      // Front Route Signboard (e.g. "DIVISORIA", "QUIAPO", "CUBAO")
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, -29, 24, 4.5);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 3px sans-serif';
      ctx.fillText(jeepney.routeSign, 12, -26);

      // Stainless Steel Roof & Curved Visor
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-52, -26);
      ctx.lineTo(16, -26);
      ctx.quadraticCurveTo(24, -28, 20, -29);
      ctx.lineTo(-52, -29);
      ctx.closePath();
      ctx.fill();

      // Roof luggage rack with Dual Air Horns (Torotot / Wang-wang)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-48, -31);
      ctx.lineTo(12, -31);
      ctx.moveTo(-40, -29);
      ctx.lineTo(-40, -31);
      ctx.moveTo(-15, -29);
      ctx.lineTo(-15, -31);
      ctx.moveTo(5, -29);
      ctx.lineTo(5, -31);
      ctx.stroke();

      // Dual Trumpet Air Horns
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2, -33, 8, 2);
      ctx.fillRect(4, -34.5, 4, 4); // Trumpet flare

      // Front & Rear Heavy Bumpers
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(48, 6, 6, 7); // Front bumper
      ctx.fillRect(-54, 7, 5, 6); // Rear step board (Estribo)

      // Rear Mudflap with Slogan (e.g. "GOD BLESS OUR TRIP")
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-53, 13, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.fillText(jeepney.slogan.substring(0, 10), -49, 17);

      // Dual Round Headlights
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(48, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── TIRES & ROTATING SPOKE HUBS ──
      const drawWheel = (wx: number, wy: number) => {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(wx, wy, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(wx, wy, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const ang = jeepney.wheelAngle + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(ang) * 6, wy + Math.sin(ang) * 6);
          ctx.stroke();
        }

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fill();
      };

      drawWheel(-28, 12); // Rear wheel
      drawWheel(32, 12);  // Front wheel

      ctx.restore();

      // ── 11. APPLE-STYLE HIGH-CONTRAST FLOATING NAME BADGE ──
      const labelFontSize = Math.max(13 * dpr, Math.floor(16 * scale * dpr));
      ctx.font = `600 ${labelFontSize}px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let lbl = jeepney.choice.text;
      if (lbl.length > 15) lbl = lbl.substring(0, 13) + '…';

      const metrics = ctx.measureText(lbl);
      const padX = 14 * dpr;
      const padY = 6 * dpr;
      const badgeW = metrics.width + padX * 2;
      const badgeH = labelFontSize + padY * 2;
      const badgeCX = jeepney.x;
      const badgeTop = jeepney.y + 28 * scale * dpr;

      // Pure white frosted pill
      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(24, 24, 27, 0.95)';
      ctx.beginPath();
      ctx.roundRect(badgeCX - badgeW / 2, badgeTop, badgeW, badgeH, badgeH / 2);
      ctx.fill();

      // Colored rim matching choice
      ctx.strokeStyle = jeepney.choice.color;
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Choice text
      ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.fillText(lbl, badgeCX, badgeTop + badgeH / 2);
    });

    // ── 12. RACE COUNTDOWN TIMER BADGE ──
    if (raceActive) {
      const remaining = Math.max(0, raceEndTimeRef.current - getCurrentTime()) / 1000;
      ctx.save();
      
      const text = `RACE TIME: ${remaining.toFixed(1)}s`;
      const fontSize = 12 * dpr;
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      const textWidth = ctx.measureText(text).width;
      const padX = 14 * dpr;
      const padY = 6 * dpr;
      const rectW = textWidth + padX * 2;
      const rectH = fontSize + padY * 2;
      
      const rx = width - rectW - 20 * dpr;
      const ry = 16 * dpr;

      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rectW, rectH, 9999);
      ctx.fill();

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      ctx.fillStyle = isLight ? '#1d1d1f' : '#ffffff';
      ctx.fillText(text, width - 20 * dpr - padX, ry + padY);

      ctx.restore();
    }
  }, [raceActive, choices.length]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = (rect.width || 460) * dpr;
        const fallbackHeight = isFullscreen ? 500 : 340;
        canvas.height = (rect.height || fallbackHeight) * dpr;
        jeepneysRef.current = initJeepneys(choices, canvas.height, canvas.width);
        draw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [choices, isFullscreen, isLightMode, draw]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Track Box */}
      <div
        className={`w-full bg-[#f8fafc] dark:bg-black/60 rounded-[32px] overflow-hidden border border-black/[0.06] dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.04)] relative transition-all duration-300 ${
          isFullscreen ? 'max-w-7xl h-[calc(100vh-260px)]' : ''
        }`}
        style={isFullscreen ? undefined : {
          height: `${Math.min(760, Math.max(340, 110 + Math.min(10, Math.max(1, choices.length)) * 56))}px`
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-transparent"
        />

        {choices.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/90 text-[#86868b] p-6">
            <span className="text-sm font-semibold mb-1 text-[#1d1d1f] dark:text-white">No jeepneys on the road</span>
            <span className="text-xs">Add 2 or more options in the sidebar to begin.</span>
          </div>
        )}
      </div>

      {/* Action triggers */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={handleStartRace}
          disabled={raceActive || choices.length < 2}
          className="apple-btn-primary flex items-center gap-2 px-8 py-3 rounded-full text-xs font-semibold tracking-wide disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
        >
          {raceActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-ping shrink-0" />
              Racing...
            </span>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Jeepneys
            </>
          )}
        </button>
        {choices.length < 2 && (
          <span className="text-xs text-[#86868b] font-medium">
            Requires at least 2 jeepneys to launch a race
          </span>
        )}
      </div>
    </div>
  );
};
