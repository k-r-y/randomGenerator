import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Compass, Bus, Dices, Grid3X3, Box, ChevronDown, 
  ChevronUp, ShieldCheck, Share2, Users, Gift, Utensils, 
  ArrowRight, Play, Sun, Moon, Sliders, Lock
} from 'lucide-react';
import type { GeneratorType } from '../types';
import { soundManager } from '../utils/soundUtils';

// Interactive miniature roulette wheel preview matching the reference design
const MINI_WHEEL_SLICES = [
  { text: '$100', color: '#f97316' },
  { text: '$200', color: '#facc15' },
  { text: '$300', color: '#0284c7' },
  { text: '$400', color: '#e11d48' },
  { text: '$500', color: '#7c3aed' },
  { text: '$600', color: '#059669' },
  { text: '$700', color: '#64748b' },
  { text: '$800', color: '#ea580c' },
];

const MiniWheelPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const angleRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const draw = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const size = 160;
    const physical = Math.round(size * dpr);
    if (canvas.width !== physical || canvas.height !== physical) {
      canvas.width = physical;
      canvas.height = physical;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const R_outer = 68;
    const bezelThickness = 10;
    const R_slices = R_outer - bezelThickness;
    const hubRadius = 17;
    const starPeakR = hubRadius + (R_slices - hubRadius) * 0.38;

    // 1. Soft Outer Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2126';
    ctx.fill();
    ctx.restore();

    // 2. Iridescent Rainbow Outer Rim
    const iridescentGrad = ctx.createLinearGradient(
      centerX - R_outer, centerY - R_outer,
      centerX + R_outer, centerY + R_outer
    );
    iridescentGrad.addColorStop(0.0, '#fbbf24');
    iridescentGrad.addColorStop(0.28, '#ec4899');
    iridescentGrad.addColorStop(0.55, '#8b5cf6');
    iridescentGrad.addColorStop(0.78, '#06b6d4');
    iridescentGrad.addColorStop(1.0, '#fbbf24');

    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer, 0, Math.PI * 2);
    ctx.strokeStyle = iridescentGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Dark Charcoal Bezel Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_outer - 1, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2, true);
    ctx.fillStyle = '#1c2126';
    ctx.fill();

    // Subtle edge highlight
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices + 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Slices with Text
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2);
    ctx.clip();

    const segAngle = (Math.PI * 2) / MINI_WHEEL_SLICES.length;
    let currAngle = angle;

    MINI_WHEEL_SLICES.forEach((slice) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, R_slices, currAngle, currAngle + segAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      currAngle += segAngle;
    });

    // Inner Dish Vignette
    const innerVignette = ctx.createRadialGradient(
      centerX, centerY, R_slices - 16,
      centerX, centerY, R_slices
    );
    innerVignette.addColorStop(0, 'rgba(0,0,0,0)');
    innerVignette.addColorStop(0.7, 'rgba(0,0,0,0.15)');
    innerVignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = innerVignette;
    ctx.beginPath();
    ctx.arc(centerX, centerY, R_slices, 0, Math.PI * 2);
    ctx.fill();

    // Starburst Shadow Facets
    currAngle = angle;
    MINI_WHEEL_SLICES.forEach(() => {
      const midAngle = currAngle + segAngle / 2;
      const pTipX = centerX + Math.cos(midAngle) * starPeakR;
      const pTipY = centerY + Math.sin(midAngle) * starPeakR;
      const pLeftX = centerX + Math.cos(currAngle) * hubRadius;
      const pLeftY = centerY + Math.sin(currAngle) * hubRadius;
      const pRightX = centerX + Math.cos(currAngle + segAngle) * hubRadius;
      const pRightY = centerY + Math.sin(currAngle + segAngle) * hubRadius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(pLeftX, pLeftY);
      ctx.lineTo(pTipX, pTipY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(pTipX, pTipY);
      ctx.lineTo(pRightX, pRightY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      currAngle += segAngle;
    });

    // Radial Text Labels
    currAngle = angle;
    MINI_WHEEL_SLICES.forEach((slice) => {
      const midAngle = currAngle + segAngle / 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(midAngle);
      ctx.translate(hubRadius + (R_slices - hubRadius) * 0.58, 0);

      ctx.font = '900 8.5px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(slice.text, 0, 0);
      ctx.restore();

      currAngle += segAngle;
    });

    ctx.restore(); // end slice clip

    // 5. Center Hub
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2126';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
    ctx.strokeStyle = iridescentGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#2a3038';
    ctx.fill();

    // 6. Top Pointer Ribbon Arrow (12 o'clock)
    ctx.save();
    const pointerW = 12;
    const pointerTopY = centerY - R_outer - 1;
    const pointerShoulderY = centerY - R_slices + 2;
    const pointerTipY = centerY - R_slices + 8;

    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - pointerW / 2, pointerTopY);
    ctx.lineTo(centerX + pointerW / 2, pointerTopY);
    ctx.lineTo(centerX + pointerW / 2, pointerShoulderY);
    ctx.lineTo(centerX, pointerTipY);
    ctx.lineTo(centerX - pointerW / 2, pointerShoulderY);
    ctx.closePath();

    const pointerGrad = ctx.createLinearGradient(centerX, pointerTopY, centerX, pointerTipY);
    pointerGrad.addColorStop(0, '#fbbf24');
    pointerGrad.addColorStop(0.5, '#ec4899');
    pointerGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = pointerGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => {
    draw(angleRef.current);
  }, [draw]);

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundManager.playLeverPull();

    const start = Date.now();
    const duration = 2800;
    const peakVelocity = 0.30;
    let lastTime = Date.now();
    let lastTickIndex = -1;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - start;
      const dt = Math.min(3, (now - lastTime) / 16.666);
      lastTime = now;

      const progress = Math.min(1, elapsed / duration);
      const velocity = peakVelocity * Math.pow(1 - progress, 2.5);

      angleRef.current += velocity * dt;

      // Tick sound
      const segAngle = (Math.PI * 2) / MINI_WHEEL_SLICES.length;
      let rel = (-Math.PI / 2 - angleRef.current) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const idx = Math.floor(rel / segAngle) % MINI_WHEEL_SLICES.length;
      if (idx !== lastTickIndex) {
        soundManager.playTick(500 + idx * 30, 0.03);
        lastTickIndex = idx;
      }

      draw(angleRef.current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        soundManager.playWin();
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div 
      className="relative group cursor-pointer flex flex-col items-center" 
      onClick={spin}
      title="Click to spin the wheel"
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: '160px', height: '160px' }}
          className="block filter drop-shadow-md transition-transform duration-300 group-hover:scale-105 active:scale-95"
        />
      </div>
      <span className="mt-2 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
        {isSpinning ? 'Spinning...' : 'Click to Test Spin'}
      </span>
    </div>
  );
};

interface LandingPageProps {
  onLaunchGenerator: (mode?: GeneratorType) => void;
  onOpenPresets: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchGenerator,
  onOpenPresets,
  isLightMode,
  onToggleTheme,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [heroDemoMode, setHeroDemoMode] = useState<GeneratorType>('roulette');

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "How does Decidely ensure fair and unbiased outcomes?",
      a: "Decidely uses the browser's native Web Cryptography API (crypto.getRandomValues). Unlike standard Math.random() which can produce pseudo-random cycles, cryptographic entropy guarantees statistically uniform probability with zero bias across every draw."
    },
    {
      q: "How do custom odds and weights work?",
      a: "When Proportional Odds are enabled, you can assign integer weights from 1x to 10x for any option. The engine calculates the total weight sum and scales the probability slice of each option accordingly."
    },
    {
      q: "Does Decidely store my choices or track my activity?",
      a: "No. Decidely runs 100% on your device in your browser. There are no tracking scripts, no cookies, no accounts, and no backend database. Your lists stay in your browser session or optional local storage."
    },
    {
      q: "Can I use Decidely in the classroom or for presentations?",
      a: "Yes. Teachers and team leads frequently use Decidely for cold-calling students, assigning debate topics, and running standups. With Bulk Paste, you can add an entire roster in one click, and Fullscreen mode ensures clean visibility on projectors."
    },
    {
      q: "How does URL sharing work without a database?",
      a: "When you click Share, your choices, colors, weights, and active simulation mode are encoded into the URL parameters. When anyone opens that link, their browser reconstructs the exact board immediately with no server requests."
    },
    {
      q: "Is Decidely free to use?",
      a: "Yes, Decidely is 100% free with no subscriptions, locked features, or advertisements. All 5 simulation engines, preset templates, and duration settings are fully accessible."
    }
  ];

  const generatorModes: {
    id: GeneratorType;
    title: string;
    subtitle: string;
    specs: string;
    badge: string;
    icon: React.ElementType;
    accentColor: string;
  }[] = [
    {
      id: 'roulette',
      title: 'Roulette Wheel',
      subtitle: 'Classic spinning wheel with smooth angular momentum, natural deceleration, and responsive clicker sound.',
      specs: 'Angular Momentum • Friction Decay • 60 FPS Canvas',
      badge: 'Wheel Spinner',
      icon: Compass,
      accentColor: '#7c3aed',
    },
    {
      id: 'duck',
      title: 'Jeepney Race',
      subtitle: 'Philippine highway road race featuring colorful jeepneys, passenger commuters, fiesta banderitas, and photo-finish lanes.',
      specs: 'Highway Physics • Fiesta Banderitas • Hand-Painted Art',
      badge: 'Jeepney Race',
      icon: Bus,
      accentColor: '#8b5cf6',
    },
    {
      id: 'slot',
      title: 'Slot Machine',
      subtitle: 'Three-cylinder reel tumbler with independent cylinder easing, high-velocity blur, and jackpot fanfare.',
      specs: 'Triple-Stage Easing • High-Velocity Blur • Classic Reels',
      badge: 'Slot Reels',
      icon: Dices,
      accentColor: '#9333ea',
    },
    {
      id: 'plinko',
      title: 'Plinko Board',
      subtitle: 'Peg pyramid board where dropped tokens calculate elastic deflections into designated outcome slots.',
      specs: 'Elastic Deflection • Realistic Bounces • Precision Slots',
      badge: 'Plinko Board',
      icon: Grid3X3,
      accentColor: '#a855f7',
    },
    {
      id: 'claw',
      title: 'Claw Machine',
      subtitle: 'Arcade claw grabber with motorized crane navigation, descending grab hook, and capsule retrieval.',
      specs: 'Crane Navigation • Descending Hook • Capsule Chamber',
      badge: 'Claw Machine',
      icon: Box,
      accentColor: '#c084fc',
    },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#fbfbfd] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col font-sans transition-colors selection:bg-violet-600 selection:text-white">
      
      {/* 1. Frosted Navigation Bar */}
      <header className="sticky top-0 z-50 apple-glass-nav px-3 sm:px-8 py-3 flex items-center justify-between transition-colors w-full max-w-full">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base font-bold tracking-tight text-[#1d1d1f] dark:text-white font-display">
              Decidely
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
              Studio
            </span>
          </div>
        </div>

        {/* Centered Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80">
          <a href="#overview" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            Overview
          </a>
          <a href="#simulations" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            Generators
          </a>
          <a href="#features" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            Features
          </a>
          <a href="#use-cases" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            Use Cases
          </a>
          <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenPresets}
            className="hidden sm:flex items-center gap-1.5 text-[12px] py-1.5 px-3.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium transition-all cursor-pointer btn-press"
          >
            <Compass className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Presets</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#1d1d1f] dark:text-[#f5f5f7] transition-all cursor-pointer btn-press"
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          <button
            onClick={() => onLaunchGenerator()}
            className="apple-btn-primary text-[11px] sm:text-[12px] py-1.5 px-3 sm:px-4 cursor-pointer btn-press flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="overview" className="relative px-4 sm:px-6 pt-12 sm:pt-24 pb-14 sm:pb-16 max-w-5xl mx-auto flex flex-col items-center text-center w-full min-w-0">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[11px] sm:text-[12px] font-semibold tracking-wide mb-5 sm:mb-6 max-w-full truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
          Simple, Fair Random Decision Maker
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#1d1d1f] dark:text-white font-display leading-[1.12] sm:leading-[1.08] max-w-4xl px-2 sm:px-0 break-words">
          Decide anything with total clarity.
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-[#86868b] max-w-2xl font-normal leading-relaxed px-2 sm:px-0">
          Five interactive visual randomizers — spin the wheel, race jeepneys, roll slot reels, drop plinko pegs, or grab prizes with the claw machine. 100% free, private, and fair.
        </p>

        {/* Call to Actions */}
        <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center gap-3 sm:gap-3.5 w-full sm:w-auto px-4 sm:px-0">
          <button
            onClick={() => onLaunchGenerator()}
            className="apple-btn-primary w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Open Decision Studio</span>
          </button>

          <button
            onClick={onOpenPresets}
            className="apple-btn-secondary w-full sm:w-auto px-7 py-3.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Browse Ready Presets</span>
          </button>
        </div>

        {/* Micro-specs */}
        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-3.5 sm:gap-8 text-[11px] sm:text-[12px] text-[#86868b] font-medium px-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Cryptographic Entropy (PRNG)</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Lock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>100% Client-Side Privacy</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Proportional Weight Odds</span>
          </div>
        </div>

        {/* Interactive Studio Preview Window */}
        <div className="mt-10 sm:mt-14 w-full max-w-4xl bg-white dark:bg-[#161617] rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-black/[0.08] dark:border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.05)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Segmented Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-black/[0.06] dark:border-white/[0.06] w-full min-w-0">
            <div className="text-left w-full sm:w-auto">
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                Interactive Showcase
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white font-display mt-0.5">
                Preview the 5 Simulation Engines
              </h3>
            </div>

            {/* Segmented Pill Switcher with horizontal scroll */}
            <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
              <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full w-max">
                {generatorModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setHeroDemoMode(m.id)}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      heroDemoMode === m.id
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                  >
                    {m.badge}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Preview Canvas Box */}
          <div className="py-10 px-4 sm:px-8 flex flex-col items-center justify-center min-h-[290px] text-center">
            {heroDemoMode === 'roulette' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <MiniWheelPreview />
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">Roulette Wheel</h4>
                  <p className="text-xs text-[#86868b] max-w-md mt-1">
                    Smooth angular momentum physics with realistic deceleration friction and responsive clicker ticking.
                  </p>
                </div>
              </div>
            )}

            {heroDemoMode === 'duck' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-full max-w-sm h-32 bg-violet-500/[0.06] dark:bg-violet-950/20 rounded-2xl border border-violet-500/20 flex flex-col justify-between p-3.5 relative overflow-hidden">
                  {/* Miniature Fiesta Banderitas */}
                  <div className="flex justify-between items-center w-full px-1">
                    {['#ef4444', '#3b82f6', '#facc15', '#10b981', '#ffffff', '#ef4444', '#3b82f6', '#facc15'].map((c, i) => (
                      <div 
                        key={i} 
                        className="w-2.5 h-3 shadow-xs transform origin-top animate-pulse"
                        style={{ 
                          backgroundColor: c, 
                          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                          animationDelay: `${i * 120}ms`
                        }} 
                      />
                    ))}
                  </div>

                  {/* Stylized Miniature Jeepney */}
                  <div className="flex items-center justify-between w-full my-1">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 shadow-sm">
                      <Bus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-[11px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">Jeepney • Quiapo</span>
                    </div>
                    <div className="h-0.5 flex-1 border-t-2 border-dashed border-violet-400/40 mx-3" />
                    <div className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded">FINISH</div>
                  </div>

                  {/* Road Curb */}
                  <div className="h-1.5 w-full flex rounded-full overflow-hidden">
                    <div className="flex-1 bg-red-500" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-red-500" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-red-500" />
                    <div className="flex-1 bg-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">Jeepney Race</h4>
                  <p className="text-xs text-[#86868b] max-w-md mt-1">
                    Multi-lane highway race featuring Filipino commuters, fiesta banderitas, and responsive road kinematics.
                  </p>
                </div>
              </div>
            )}

            {heroDemoMode === 'slot' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="grid grid-cols-3 gap-3 p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20 w-64">
                  <div className="h-16 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shadow-sm">A</div>
                  <div className="h-16 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shadow-sm border-2 border-violet-500">WIN</div>
                  <div className="h-16 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shadow-sm">B</div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">Slot Machine Tumbler</h4>
                  <p className="text-xs text-[#86868b] max-w-md mt-1">
                    Three independent cylinders with velocity decay, golden reticle focal line, and victory chime.
                  </p>
                </div>
              </div>
            )}

            {heroDemoMode === 'plinko' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-56 h-32 bg-violet-500/10 rounded-2xl border border-violet-500/20 flex flex-col justify-between p-4">
                  <div className="flex justify-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  </div>
                  <div className="w-4 h-4 rounded-full bg-violet-600 mx-auto shadow-md animate-ping" />
                  <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                    <div className="border border-violet-300 dark:border-violet-700 rounded py-1">1</div>
                    <div className="border border-violet-300 dark:border-violet-700 rounded py-1">2</div>
                    <div className="border border-violet-300 dark:border-violet-700 rounded py-1">3</div>
                    <div className="border border-violet-300 dark:border-violet-700 rounded py-1">4</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">Plinko Board</h4>
                  <p className="text-xs text-[#86868b] max-w-md mt-1">
                    Peg pyramid drop where bouncing spheres calculate elastic deflections into outcome bins.
                  </p>
                </div>
              </div>
            )}

            {heroDemoMode === 'claw' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-56 h-32 bg-violet-500/10 rounded-2xl border border-violet-500/20 flex flex-col items-center justify-between p-3 relative">
                  <div className="w-12 h-3 bg-slate-400 rounded-sm" />
                  <div className="w-0.5 h-10 bg-slate-400" />
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-violet-500 shadow-sm" />
                    <div className="w-5 h-5 rounded-full bg-indigo-500 shadow-sm" />
                    <div className="w-5 h-5 rounded-full bg-amber-500 shadow-sm" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">Arcade Claw Machine</h4>
                  <p className="text-xs text-[#86868b] max-w-md mt-1">
                    Motorized crane navigation with three-prong clutch mechanism and capsule retrieval tension.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => onLaunchGenerator(heroDemoMode)}
              className="mt-6 apple-btn-primary px-6 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Launch This Simulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Features Bento Grid */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[11px] sm:text-[12px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
            Features
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
            Simple, transparent, and fair.
          </h2>
          <p className="text-sm sm:text-base text-[#86868b] max-w-xl mx-auto mt-2.5 sm:mt-3 px-2 sm:px-0">
            Built to eliminate bias, ensure absolute privacy, and make decision-making enjoyable.
          </p>
        </div>

        {/* Bento Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: 2-column wide */}
          <div className="md:col-span-2 apple-card p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
                Simulation Library
              </span>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white font-display mb-2.5 sm:mb-3">
                Five distinct visual models. No boring draws.
              </h3>
              <p className="text-xs sm:text-sm text-[#86868b] leading-relaxed max-w-lg">
                Whether you prefer the continuous spin of the wheel, the excitement of the Philippine jeepney highway race, or the arcade nostalgia of plinko and the claw machine, Decidely provides the exact visual cadence for your moment.
              </p>
            </div>
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-[#86868b]">60 FPS Canvas Kinematics</span>
              <button 
                onClick={() => onLaunchGenerator()}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Launch studio →
              </button>
            </div>
          </div>

          {/* Card 2: Cryptographic Entropy */}
          <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
                Provably Fair
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display mb-2">
                Cryptographic entropy.
              </h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Powered by the native Web Cryptography API. Eliminates algorithmic biases for completely uniform statistical probability.
              </p>
            </div>
            <div className="mt-5 sm:mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] font-mono text-[#86868b]">
              crypto.getRandomValues()
            </div>
          </div>

          {/* Card 3: Proportional Weights */}
          <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <Sliders className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
                Custom Odds
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display mb-2">
                Proportional weighting.
              </h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Assign integer weights from 1x to 10x. The engine dynamically calculates outcome proportions with mathematical precision.
              </p>
            </div>
            <div className="mt-5 sm:mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] font-medium text-[#86868b]">
              1x to 10x Multipliers
            </div>
          </div>

          {/* Card 4: 100% On-Device Privacy */}
          <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
                Privacy First
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display mb-2">
                On-device only.
              </h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Zero tracking cookies. No external telemetry. Your lists, student rosters, and contest items never leave your browser.
              </p>
            </div>
            <div className="mt-5 sm:mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] font-medium text-[#86868b]">
              Runs Locally in Browser
            </div>
          </div>

          {/* Card 5: Instant Collaboration */}
          <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
                Instant Sharing
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display mb-2">
                URL link encoding.
              </h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Share custom decision boards with students, teams, or friends using lightweight URL parameters with zero login needed.
              </p>
            </div>
            <div className="mt-5 sm:mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] font-medium text-[#86868b]">
              Zero-Server Links
            </div>
          </div>
        </div>
      </section>

      {/* 4. Deep Dive: The 5 Generators */}
      <section id="simulations" className="py-14 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full apple-section-bg rounded-2xl sm:rounded-[40px] my-6">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[11px] sm:text-[12px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
            Simulation Suite
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
            Five ways to decide.
          </h2>
          <p className="text-sm sm:text-base text-[#86868b] max-w-xl mx-auto mt-2.5 sm:mt-3 px-2 sm:px-0">
            Every simulation provides distinct physics, suspense build-up, and celebratory moments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {generatorModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <div 
                key={mode.id}
                className="apple-card p-6 sm:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <div 
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: mode.accentColor }}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#86868b] px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display">
                    {mode.title}
                  </h3>
                  <p className="text-xs text-[#86868b] mt-2 leading-relaxed">
                    {mode.subtitle}
                  </p>
                </div>

                <div className="mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono text-[#86868b] block mb-2.5 uppercase tracking-wider">
                    {mode.specs}
                  </span>
                  <button
                    onClick={() => onLaunchGenerator(mode.id)}
                    className="w-full apple-btn-secondary py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-violet-300 dark:hover:border-violet-700"
                  >
                    <span>Launch {mode.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Preset Library Showcase */}
          <div className="apple-card p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-white via-white to-violet-50/40 dark:from-[#161617] dark:via-[#161617] dark:to-violet-950/20">
            <div>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
                  <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full bg-violet-100/60 dark:bg-violet-950/50">
                  Ready to Load
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white font-display">
                Preset Vault & Custom Lists
              </h3>
              <p className="text-xs text-[#86868b] mt-2 leading-relaxed">
                Instant templates for everyday decisions: Food & Dining, Yes/No, Coin Toss, Roll a Die, Classroom Callers, and Agile Team Standups. Save unlimited custom lists locally.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-[10px] font-mono text-[#86868b] block mb-2.5 uppercase tracking-wider">
                20+ Curated Lists • Local Storage
              </span>
              <button
                onClick={onOpenPresets}
                className="w-full apple-btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Browse Preset Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Scenarios & Use Cases */}
      <section id="use-cases" className="py-14 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[11px] sm:text-[12px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
            Applications
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
            Built for moments that matter.
          </h2>
          <p className="text-sm sm:text-base text-[#86868b] max-w-xl mx-auto mt-2.5 sm:mt-3 px-2 sm:px-0">
            From lecture halls to live streaming broadcasts, Decidely makes fairness transparent and fun.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="apple-card p-6 sm:p-8">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white mb-2 font-display">Classroom Name Picker</h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              Educators cold-call students, assign debate partners, and run classroom quizzes. Fullscreen presentation mode transforms any smartboard into a high-visibility stage.
            </p>
          </div>

          <div className="apple-card p-6 sm:p-8">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white mb-2 font-display">Giveaways & Live Raffles</h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              Streamers on Twitch, YouTube, TikTok, and Discord broadcast live prize selection on camera. Audiences follow the real-time simulation with transparent integrity.
            </p>
          </div>

          <div className="apple-card p-6 sm:p-8">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white mb-2 font-display">Dinner & Food Chooser</h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              Eliminate dining fatigue instantly. Load pizza, sushi, burgers, tacos, and noodles. Let unbiased entropy select tonight's meal so nobody argues.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Technical Integrity */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-[11px] sm:text-[12px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
            Engine Integrity
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
            Built with mathematical fairness.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-2xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white font-mono">60 FPS</span>
            <span className="text-[11px] sm:text-xs text-[#86868b] block mt-1">Hardware Accelerated</span>
          </div>
          <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 font-mono">PRNG</span>
            <span className="text-[11px] sm:text-xs text-[#86868b] block mt-1">Web Crypto Entropy</span>
          </div>
          <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-2xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white font-mono">0 kB</span>
            <span className="text-[11px] sm:text-xs text-[#86868b] block mt-1">Telemetry Transmitted</span>
          </div>
          <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 font-mono">1x-10x</span>
            <span className="text-[11px] sm:text-xs text-[#86868b] block mt-1">Weight Odds Multipliers</span>
          </div>
        </div>
      </section>

      {/* 7. Clean FAQ Accordion */}
      <section id="faq" className="py-14 sm:py-20 px-4 sm:px-6 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-[11px] sm:text-[12px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-2">
            FAQ
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={index} className="py-4 sm:py-5">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left font-semibold text-xs sm:text-base text-[#1d1d1f] dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#86868b] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-[#86868b] leading-relaxed animate-fade-in pr-4 sm:pr-6">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Call to Action */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full text-center">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] dark:text-white tracking-tight font-display px-2 sm:px-0">
          Ready to make a choice?
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[#86868b] max-w-md mx-auto px-2 sm:px-0">
          Start spinning, racing, or dropping choices immediately. No setup required.
        </p>
        <div className="mt-7 sm:mt-8 flex justify-center px-4 sm:px-0">
          <button
            onClick={() => onLaunchGenerator()}
            className="apple-btn-primary w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Launch Decidely Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 9. Minimalist Footer */}
      <footer className="pt-12 pb-16 px-4 sm:px-12 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#f7f7f9] dark:bg-[#0c0c0d] text-[12px] text-[#86868b]">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          
          {/* Friendly note */}
          <p className="leading-relaxed border-b border-black/[0.06] dark:border-white/[0.06] pb-6 text-xs">
            Decidely is a clean, client-side random choice generator. Cryptographic fairness is powered by the Web Cryptography API. All lists and data stay strictly on your device.
          </p>

          {/* Directory columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2.5">Generators</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onLaunchGenerator('roulette')} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Roulette Wheel</button></li>
                <li><button onClick={() => onLaunchGenerator('duck')} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Jeepney Race</button></li>
                <li><button onClick={() => onLaunchGenerator('slot')} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Slot Machine</button></li>
                <li><button onClick={() => onLaunchGenerator('plinko')} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Plinko Board</button></li>
                <li><button onClick={() => onLaunchGenerator('claw')} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Claw Machine</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2.5">Presets</h4>
              <ul className="space-y-2">
                <li><button onClick={onOpenPresets} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Food & Dining</button></li>
                <li><button onClick={onOpenPresets} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Classroom Rosters</button></li>
                <li><button onClick={onOpenPresets} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Yes or No</button></li>
                <li><button onClick={onOpenPresets} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Coin Flip</button></li>
                <li><button onClick={onOpenPresets} className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Roll a Die</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2.5">Technology</h4>
              <ul className="space-y-2 text-[#86868b]">
                <li><span>Web Cryptography API</span></li>
                <li><span>HTML5 Canvas Kinematics</span></li>
                <li><span>Web Audio API Sound</span></li>
                <li><span>100% Client-Side Sandbox</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2.5">Decidely</h4>
              <ul className="space-y-2 text-[#86868b]">
                <li><span>100% Free Forever</span></li>
                <li><span>No Accounts Required</span></li>
                <li><span>Zero Cookies or Ads</span></li>
                <li><span>Completely Open Client</span></li>
              </ul>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              Copyright © {new Date().getFullYear()} Decidely. Simple, minimal, and 100% fair.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Privacy</span>
              <span className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Terms</span>
              <span className="hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">Presets</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
