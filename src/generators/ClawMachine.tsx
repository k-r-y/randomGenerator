import React, { useRef, useEffect, useState } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ClawMachineProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  spinDuration?: number;
}

interface ToyCapsule {
  id: string;
  choice: Choice;
  x: number;
  y: number;
  color: string;
}

const createCapsules = (choices: Choice[], cabinetWidth: number): ToyCapsule[] => {
  if (choices.length === 0) return [];
  
  // We want a beautiful, stacked, natural-looking toy pile
  // The play area is between minX=92 and maxX=cabinetWidth-32
  const minX = 92;
  const maxX = cabinetWidth - 32;
  const usableWidth = maxX - minX;
  
  // Dynamic density so up to 100 capsules nestle naturally inside the glass pit
  const totalCount = choices.length;
  const isDense = totalCount > 40;
  const isMedium = totalCount > 20;
  const capsulesPerRow = isDense ? 12 : (isMedium ? 8 : 6);
  const totalRows = Math.ceil(totalCount / capsulesPerRow);
  const rowStep = isDense ? 11 : Math.max(12, Math.min(22, 110 / Math.max(1, totalRows)));
  
  return choices.map((choice, index) => {
    const row = Math.floor(index / capsulesPerRow);
    const col = index % capsulesPerRow;
    
    // Stagger columns slightly on odd rows to nestle them in the gaps
    const stagger = (row % 2 === 0) ? 0 : (usableWidth / capsulesPerRow) / 2;
    
    // Base x position plus random organic offset
    const x = minX + (col * (usableWidth / capsulesPerRow)) + stagger + (Math.random() - 0.5) * 4;
    
    // Base y stack level constrained to bottom pit area
    const minY = isDense ? 142 : 118;
    const y = Math.max(minY, 242 - (row * rowStep) + (Math.random() - 0.5) * 3);

    return {
      id: Math.random().toString(36).substring(2, 9),
      choice,
      x: Math.max(minX, Math.min(maxX, x)),
      y,
      color: choice.color,
    };
  });
};

export const ClawMachine: React.FC<ClawMachineProps> = ({ choices, onWinner, isFullscreen, spinDuration = 8 }) => {
  const [active, setActive] = useState(false);
  const [statusText, setStatusText] = useState('INSERT COIN');
  const [capsules, setCapsules] = useState<ToyCapsule[]>(() => createCapsules(choices, 380));
  const [prevChoices, setPrevChoices] = useState(choices);

  if (choices !== prevChoices) {
    setPrevChoices(choices);
    setCapsules(createCapsules(choices, 380));
  }

  // Claw state coordinates
  const [clawX, setClawX] = useState(200); // 40px to 340px range
  const [clawY, setClawY] = useState(40);  // 40px to 260px range
  const [clawClosed, setClawClosed] = useState(false);
  const [grabbedCapsule, setGrabbedCapsule] = useState<ToyCapsule | null>(null);

  const animationRef = useRef<number | null>(null);
  const stateRef = useRef({ clawX: 200, clawY: 40 });

  const cabinetWidth = 380;
  const prizeChuteX = 50; // chute is at the far left

  // Generate capsule positions resting at the bottom
  const initCapsules = () => {
    setCapsules(createCapsules(choices, cabinetWidth));
  };

  // Run the automated sequence to grab the weighted winner capsule
  const triggerGrab = () => {
    if (active || choices.length < 2) return;

    setActive(true);
    setStatusText('CRANE ACTIVE');
    soundManager.playLeverPull();

    // Select target choice using weighted randomized algorithm
    const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * totalWeight;
    let winner = choices[choices.length - 1];
    for (const choice of choices) {
      r -= choice.weight;
      if (r <= 0) {
        winner = choice;
        break;
      }
    }

    // Find the corresponding physical capsule
    const targetCapsule = capsules.find((c) => c.choice.id === winner.id) || capsules[0];
    if (!targetCapsule) {
      setActive(false);
      return;
    }

    const targetX = targetCapsule.x;
    const grabY = targetCapsule.y - 25; // drop distance to grab point

    const dist1 = Math.abs(targetX - stateRef.current.clawX);
    const dist2 = Math.abs(grabY - stateRef.current.clawY);
    const dist3 = Math.abs(40 - grabY);
    const dist4 = Math.abs(prizeChuteX - targetX);
    const totalDistance = dist1 + dist2 + dist3 + dist4;

    const totalMs = (spinDuration || 8) * 1000;
    const movementTimeMs = Math.max(500, totalMs - 850); // reserve at least 500ms
    const estimatedFrames = movementTimeMs / 16.667;
    const step = Math.max(0.8, Math.min(12, totalDistance / estimatedFrames));

    let phase = 1; // 1: Horizontal Move, 2: Extend Cable, 3: Clamp, 4: Ascend, 5: Return to Chute, 6: Drop

    const loop = () => {
      // Sound feedback while crane moving
      if (phase === 1 || phase === 2 || phase === 4 || phase === 5) {
        if (Math.random() < 0.18) {
          soundManager.playClawMove();
        }
      }

      switch (phase) {
        case 1: { // 1. Horizontal movement to align target
          const dx = targetX - stateRef.current.clawX;
          if (Math.abs(dx) > step) {
            const dirStep = Math.sign(dx) * step;
            stateRef.current.clawX += dirStep;
            setClawX(stateRef.current.clawX);
          } else {
            stateRef.current.clawX = targetX;
            setClawX(targetX);
            phase = 2; // proceed to drop cable
          }
          break;
        }

        case 2: { // 2. Drop claw downward
          const dy = grabY - stateRef.current.clawY;
          if (dy > step) {
            stateRef.current.clawY += step;
            setClawY(stateRef.current.clawY);
          } else {
            stateRef.current.clawY = grabY;
            setClawY(grabY);
            phase = 3; // proceed to clamp
            
            // Trigger clamp clamp sound
            soundManager.playClawGrab();
            setClawClosed(true);

            // Hide the capsule from the pile as it is grabbed
            setGrabbedCapsule(targetCapsule);
            setCapsules((prev) => prev.filter((c) => c.id !== targetCapsule.id));
          }
          break;
        }

        case 3: // 3. Brief pause to close arms
          phase = 3.5; // transition state immediately to prevent duplicate setTimeouts!
          setTimeout(() => {
            phase = 4; // proceed to ascend
          }, 350);
          break;

        case 4: // 4. Lift claw upward
          if (stateRef.current.clawY > 40) {
            stateRef.current.clawY -= step;
            setClawY(stateRef.current.clawY);
          } else {
            stateRef.current.clawY = 40;
            setClawY(40);
            phase = 5; // proceed to carry back
          }
          break;

        case 5: { // 5. Horizontal return to prize drop slot (chute)
          const dropDx = prizeChuteX - stateRef.current.clawX;
          if (Math.abs(dropDx) > step) {
            const dirStep = Math.sign(dropDx) * step;
            stateRef.current.clawX += dirStep;
            setClawX(stateRef.current.clawX);
          } else {
            stateRef.current.clawX = prizeChuteX;
            setClawX(prizeChuteX);
            phase = 6; // proceed to open/drop
            
            // Play drop sound
            soundManager.playClawGrab();
            setClawClosed(false);
          }
          break;
        }

        case 6: // 6. Open claw and let capsule fall into chute
          // Hide capsule from claw grab hook and declare winner
          phase = 7; // Stop the animation loop immediately to prevent duplicate setTimeouts!
          setTimeout(() => {
            setGrabbedCapsule(null);
            setStatusText('WINNER SELECTED!');
            
            // Release active blocks
            setActive(false);
            onWinner(winner);

            // Reload capsules pile after short delay
            setTimeout(() => {
              initCapsules();
              setStatusText('INSERT COIN');
            }, 2500);

          }, 500);
          break;
      }

      if (phase <= 6) {
        animationRef.current = requestAnimationFrame(loop);
      }
    };

    animationRef.current = requestAnimationFrame(loop);
  };



  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full select-none">
      {/* Main Claw cabinet graphic structure */}
      <div className={`relative bg-white dark:bg-[#161617] rounded-3xl border border-black/[0.06] dark:border-white/10 p-4 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center w-full overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'max-w-[420px] scale-105 lg:scale-110 my-4' : 'max-w-[380px]'
      }`}>
        {/* Subtle accent border around cabinet windows */}
        <div className="absolute inset-0 border-[2px] border-violet-500/15 pointer-events-none rounded-3xl" />
        
        {/* Arcade Status Display Panel */}
        <div className="w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-4 py-2 flex items-center justify-center mb-3 shadow-inner">
          <span className="text-xs font-bold tracking-widest text-violet-600 dark:text-violet-400 font-mono text-center">
            {statusText}
          </span>
        </div>

        {/* Glass Window panel where toys sit */}
        <div className="relative bg-black/[0.02] dark:bg-black/40 w-full h-[270px] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-inner">
          
          {/* Back wall layout grid pattern */}
          <div className="absolute inset-0 bg-grid-drift opacity-10" />

          {/* Left Prize Drop Chute structure */}
          <div className="absolute bottom-0 left-0 w-20 h-28 bg-black/[0.03] dark:bg-white/[0.04] border-r border-t border-black/[0.08] dark:border-white/[0.08] rounded-tr-xl flex flex-col justify-end p-2 z-0">
            <div className="h-full border border-dashed border-violet-500/30 rounded-lg flex items-center justify-center text-[9px] font-bold text-violet-600/70 dark:text-violet-400/70 uppercase tracking-widest text-center">
              Drop Box
            </div>
          </div>

          {/* Draw resting Capsules pile */}
          {capsules.map((capsule) => {
            const isDense = choices.length > 40;
            const sizeStyle = isDense ? { width: '22px', height: '22px' } : { width: '30px', height: '30px' };
            const offset = isDense ? 11 : 15;
            return (
              <div
                key={capsule.id}
                className="absolute rounded-full border border-white/60 dark:border-white/20 shadow-xs flex items-center justify-center transform active:scale-110 transition-all select-none hover:brightness-105"
                style={{
                  ...sizeStyle,
                  left: `${capsule.x - offset}px`,
                  top: `${capsule.y - offset}px`,
                  background: `linear-gradient(135deg, ${capsule.color} 50%, #ffffff 50%)`,
                }}
              >
                <div className={`${isDense ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-white/40 rounded-full`} />
              </div>
            );
          })}

          {/* Draw Grabbed capsule matching claw movements */}
          {grabbedCapsule && (
            <div
              className="absolute rounded-full border border-white/60 dark:border-white/20 shadow-md flex items-center justify-center transform select-none"
              style={{
                width: choices.length > 40 ? '22px' : '30px',
                height: choices.length > 40 ? '22px' : '30px',
                left: `${clawX - (choices.length > 40 ? 11 : 15)}px`,
                top: `${clawY + 12}px`,
                background: `linear-gradient(135deg, ${grabbedCapsule.color} 50%, #ffffff 50%)`,
              }}
            >
              <div className={`${choices.length > 40 ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-white/40 rounded-full`} />
            </div>
          )}

          {/* SVG-based hanging Crane Hook and Cable */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {/* The horizontal slide rail at top */}
            <rect x="20" y="8" width={cabinetWidth - 80} height="6" fill="#cbd5e1" rx="3" />
            
            {/* Horizontal slider box */}
            <rect x={clawX - 15} y="4" width="30" height="14" fill="#94a3b8" rx="4" stroke="#64748b" strokeWidth="1" />
            <circle cx={clawX} cy="11" r="3" fill="#ffffff" />

            {/* The cable line hanging down */}
            <line x1={clawX} y1="18" x2={clawX} y2={clawY} stroke="#94a3b8" strokeWidth="2.5" />

            {/* The solid claw assembly head */}
            <g transform={`translate(${clawX}, ${clawY})`}>
              {/* Claw core housing */}
              <rect x="-8" y="0" width="16" height="15" fill="#64748b" rx="3" stroke="#475569" strokeWidth="1" />
              <circle cx="0" cy="8" r="3" fill="#ef4444" />

              {/* Left Claw Prong arm */}
              <g transform={`rotate(${clawClosed ? -22 : 0})`}>
                <path
                  d="M -6 12 Q -16 22 -6 32"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Claw Prong arm */}
              <g transform={`rotate(${clawClosed ? 22 : 0})`}>
                <path
                  d="M 6 12 Q 16 22 6 32"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>

          {/* Empty Warning Overlay */}
          {choices.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/90 text-slate-500 p-6">
              <span className="text-sm font-semibold mb-1 text-slate-900 dark:text-white">Machine Unloaded!</span>
              <span className="text-xs text-slate-500">Add 2 or more options in the sidebar.</span>
            </div>
          )}
        </div>

        {/* Lower Arcade Console Controls layout */}
        <div className="w-full mt-4 bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-3 flex justify-between items-center shadow-xs">
          
          {/* Simulated Joystick buttons left and right */}
          <div className="flex items-center gap-2">
            <button
              disabled={active || choices.length < 2 || clawX <= 80}
              onClick={() => {
                stateRef.current.clawX = Math.max(80, clawX - 30);
                setClawX(stateRef.current.clawX);
                soundManager.playClawMove();
              }}
              className="apple-btn-secondary p-2.5 rounded-full disabled:opacity-30 transition-all cursor-pointer hover:border-violet-300 dark:hover:border-violet-700"
              title="Move claw left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              disabled={active || choices.length < 2 || clawX >= cabinetWidth - 80}
              onClick={() => {
                stateRef.current.clawX = Math.min(cabinetWidth - 80, clawX + 30);
                setClawX(stateRef.current.clawX);
                soundManager.playClawMove();
              }}
              className="apple-btn-secondary p-2.5 rounded-full disabled:opacity-30 transition-all cursor-pointer hover:border-violet-300 dark:hover:border-violet-700"
              title="Move claw right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Trigger button */}
          <button
            onClick={triggerGrab}
            disabled={active || choices.length < 2}
            className="apple-btn-primary px-7 py-2.5 rounded-full text-xs font-semibold tracking-wide uppercase disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
          >
            {active ? 'Retrieving...' : 'Engage Claw'}
          </button>
        </div>
      </div>

      {choices.length < 2 && (
        <span className="text-xs text-[#86868b] font-medium mt-4">
          Needs at least 2 choices in the claw machine
        </span>
      )}
    </div>
  );
};
