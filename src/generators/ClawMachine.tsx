import React, { useRef, useEffect, useState } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Volume2, VolumeX, ArrowLeft, ArrowRight } from 'lucide-react';

interface ClawMachineProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
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
  return choices.map((choice, index) => {
    const minX = 110;
    const maxX = cabinetWidth - 50;
    const step = choices.length > 1 ? (maxX - minX) / (choices.length - 1) : 0;
    
    const x = minX + index * step + (Math.random() - 0.5) * 12;
    const y = 335 - (index % 2 === 0 ? 10 : 0) + (Math.random() - 0.5) * 6;

    return {
      id: Math.random().toString(36).substring(2, 9),
      choice,
      x,
      y,
      color: choice.color,
    };
  });
};

export const ClawMachine: React.FC<ClawMachineProps> = ({ choices, onWinner, isFullscreen }) => {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(soundManager.isMuted());
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

  const toggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
  };

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
          if (Math.abs(dx) > 2) {
            const step = Math.sign(dx) * 3;
            stateRef.current.clawX += step;
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
          if (dy > 3) {
            stateRef.current.clawY += 3.5;
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
            stateRef.current.clawY -= 3;
            setClawY(stateRef.current.clawY);
          } else {
            stateRef.current.clawY = 40;
            setClawY(40);
            phase = 5; // proceed to carry back
          }
          break;

        case 5: { // 5. Horizontal return to prize drop slot (chute)
          const dropDx = prizeChuteX - stateRef.current.clawX;
          if (Math.abs(dropDx) > 3) {
            const step = Math.sign(dropDx) * 3;
            stateRef.current.clawX += step;
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
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Upper header controls */}
      <div className={`w-full flex justify-between items-center mb-3 transition-all duration-300 ${
        isFullscreen ? 'max-w-md scale-110' : 'max-w-sm'
      }`}>
        <div>
          <span className="text-xs font-bold text-pink-400 uppercase tracking-widest animate-pulse">
            Retro Grabber
          </span>
          <h3 className="text-lg font-bold text-white leading-none mt-0.5">Claw Machine</h3>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Claw cabinet graphic structure */}
      <div className={`relative bg-slate-950 rounded-3xl border border-slate-800 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col items-center w-full overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'max-w-[380px] scale-110 lg:scale-115 my-6' : 'max-w-[340px]'
      }`}>
        {/* Neon light frame around cabinet windows */}
        <div className="absolute inset-0 border-[3px] border-pink-500/20 pointer-events-none rounded-3xl" />
        
        {/* Arcade Status Display Panel */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-center mb-3 shadow-inner">
          <span className="text-xs font-black tracking-widest text-pink-400 font-mono text-center animate-pulse">
            {statusText}
          </span>
        </div>

        {/* Glass Window panel where toys sit */}
        <div className="relative bg-slate-900/30 w-full h-[270px] border-2 border-slate-800 rounded-2xl overflow-hidden shadow-inner">
          
          {/* Back wall layout grid pattern */}
          <div className="absolute inset-0 bg-grid-drift opacity-10" />

          {/* Left Prize Drop Chute structure */}
          <div className="absolute bottom-0 left-0 w-20 h-28 bg-slate-950/90 border-r border-t border-slate-800 rounded-tr-xl flex flex-col justify-end p-2 z-0">
            <div className="h-full border border-dashed border-pink-500/10 rounded-lg flex items-center justify-center text-[9px] font-bold text-pink-500/40 uppercase tracking-widest text-center">
              Drop Box
            </div>
          </div>

          {/* Draw resting Capsules pile */}
          {capsules.map((capsule) => (
            <div
              key={capsule.id}
              className="absolute w-8 h-8 rounded-full border border-white/20 shadow-md flex items-center justify-center transform active:scale-110 transition-all select-none hover:brightness-110"
              style={{
                left: `${capsule.x - 16}px`,
                top: `${capsule.y - 16}px`,
                background: `linear-gradient(135deg, ${capsule.color} 50%, #1e293b 50%)`, // visual split capsules!
              }}
            >
              {/* Inner glowing circle */}
              <div className="w-2.5 h-2.5 bg-white/20 rounded-full" />
            </div>
          ))}

          {/* Draw Grabbed capsule matching claw movements */}
          {grabbedCapsule && (
            <div
              className="absolute w-8 h-8 rounded-full border border-white/20 shadow-md flex items-center justify-center transform select-none"
              style={{
                left: `${clawX - 16}px`,
                top: `${clawY + 12}px`, // hangs just below the claw grab base
                background: `linear-gradient(135deg, ${grabbedCapsule.color} 50%, #1e293b 50%)`,
              }}
            >
              <div className="w-2.5 h-2.5 bg-white/20 rounded-full" />
            </div>
          )}

          {/* SVG-based hanging Crane Hook and Cable */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {/* The horizontal slide rail at top */}
            <rect x="20" y="8" width={cabinetWidth - 80} height="6" fill="#1e293b" rx="3" />
            
            {/* Horizontal slider box */}
            <rect x={clawX - 15} y="4" width="30" height="14" fill="#64748b" rx="4" stroke="#475569" strokeWidth="1" />
            <circle cx={clawX} cy="11" r="3" fill="#ffffff" />

            {/* The cable line hanging down */}
            <line x1={clawX} y1="18" x2={clawX} y2={clawY} stroke="#94a3b8" strokeWidth="2.5" />

            {/* The solid claw assembly head */}
            <g transform={`translate(${clawX}, ${clawY})`}>
              {/* Claw core housing */}
              <rect x="-8" y="0" width="16" height="15" fill="#475569" rx="3" stroke="#334155" strokeWidth="1" />
              <circle cx="0" cy="8" r="3" fill="#ef4444" />

              {/* Left Claw Prong arm */}
              <g transform={`rotate(${clawClosed ? -22 : 0})`}>
                <path
                  d="M -6 12 Q -16 22 -6 32"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Claw Prong arm */}
              <g transform={`rotate(${clawClosed ? 22 : 0})`}>
                <path
                  d="M 6 12 Q 16 22 6 32"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>

          {/* Empty Warning Overlay */}
          {choices.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-6">
              <span className="text-sm font-semibold mb-1 text-white">Machine Unloaded!</span>
              <span className="text-xs text-slate-500">Add 2 or more options in the sidebar.</span>
            </div>
          )}
        </div>

        {/* Lower Arcade Console Controls layout */}
        <div className="w-full mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex justify-between items-center bg-gradient-to-b from-slate-900 to-slate-950">
          
          {/* Simulated Joystick buttons left and right */}
          <div className="flex items-center gap-2">
            <button
              disabled={active || choices.length < 2 || clawX <= 80}
              onClick={() => {
                stateRef.current.clawX = Math.max(80, clawX - 30);
                setClawX(stateRef.current.clawX);
                soundManager.playClawMove();
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 active:scale-95 disabled:opacity-20 transition-all shadow-md"
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
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 active:scale-95 disabled:opacity-20 transition-all shadow-md"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Big Neon glowing round trigger button */}
          <button
            onClick={triggerGrab}
            disabled={active || choices.length < 2}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white text-xs font-black tracking-widest rounded-full border border-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            GRAB
          </button>
        </div>
      </div>

      {choices.length < 2 && (
        <span className="text-xs text-slate-500 font-medium mt-4">
          Needs at least 2 capsules in the pile to grab!
        </span>
      )}
    </div>
  );
};
