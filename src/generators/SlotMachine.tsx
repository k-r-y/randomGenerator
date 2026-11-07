import React, { useState, useEffect, useRef } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';
import { Play } from 'lucide-react';

interface SlotMachineProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
  spinDuration?: number;
}

interface ReelState {
  offset: number;
  spinning: boolean;
  finalChoice: Choice | null;
  items: Choice[];
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ 
  choices, 
  onWinner, 
  isFullscreen, 
  spinDuration = 8 
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [handlePulled, setHandlePulled] = useState(false);

  // Define states for 3 Reels
  const [reels, setReels] = useState<ReelState[]>(() => [
    { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
    { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
    { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
  ]);
  const [prevChoices, setPrevChoices] = useState(choices);

  if (choices !== prevChoices) {
    setPrevChoices(choices);
    if (choices.length > 0) {
      setReels([
        { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
        { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
        { offset: 0, spinning: false, finalChoice: null, items: [...choices] },
      ]);
    }
  }

  const animationFrameRef = useRef<number | null>(null);
  const reelItemsHeight = 100; // height of each option card in pixels

  // Get random choice based on weights
  const getWeightedRandom = (): Choice => {
    const totalWeight = choices.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * totalWeight;
    for (const choice of choices) {
      r -= choice.weight;
      if (r <= 0) return choice;
    }
    return choices[choices.length - 1];
  };

  // Build a padded cyclical array of choices for smooth continuous scrolling
  const generateReelItems = (targetChoice: Choice): Choice[] => {
    const minItems = 30;
    let pool: Choice[] = [];
    while (pool.length < minItems) {
      pool = [...pool, ...choices];
    }
    // Set the middle row winner (second layer) to be our target choice
    pool[pool.length - 2] = targetChoice;
    return pool;
  };

  const pullHandle = () => {
    if (isSpinning || choices.length === 0) return;

    setIsSpinning(true);
    setHandlePulled(true);
    soundManager.playLeverPull();

    // Trigger handle bounce animation back up after 400ms
    setTimeout(() => {
      setHandlePulled(false);
    }, 450);

    const winner = getWeightedRandom();

    // Initialize 3 independent reels
    const updatedReels = reels.map(() => {
      const items = generateReelItems(winner);
      return {
        offset: 0,
        spinning: true,
        finalChoice: winner,
        items,
      };
    });

    setReels(updatedReels);

    const startTime = Date.now();
    const totalMs = (spinDuration || 8) * 1000;
    
    // Keep all reels spinning through the full duration, then stop consecutively
    const stepDelay = 280;
    const durations = [
      totalMs,
      totalMs + stepDelay,
      totalMs + stepDelay * 2,
    ];
    const winnerAnnounceTime = totalMs + stepDelay * 2 + 360;
    const speeds = [26, 32, 38];

    const lastTickFrame = [0, 0, 0];

    const spinLoop = () => {
      const elapsed = Date.now() - startTime;

      setReels((prevReels) =>
        prevReels.map((reel, idx) => {
          if (!reel.spinning) return reel;

          const duration = durations[idx];
          if (elapsed >= duration) {
            const finalStopIndex = reel.items.length - 3;
            const targetOffset = finalStopIndex * reelItemsHeight;

            soundManager.playTick(500 + idx * 160, 0.12);

            return {
              ...reel,
              spinning: false,
              offset: targetOffset,
            };
          }

          let newOffset = reel.offset + speeds[idx];
          const maxOffset = (reel.items.length - 3) * reelItemsHeight;

          if (newOffset > maxOffset) {
            newOffset = newOffset % maxOffset;
          }

          const currentItemIdx = Math.floor(newOffset / reelItemsHeight);
          if (currentItemIdx !== lastTickFrame[idx]) {
            soundManager.playTick(200 + idx * 80, 0.02);
            lastTickFrame[idx] = currentItemIdx;
          }

          return {
            ...reel,
            offset: newOffset,
          };
        })
      );

      const allFinished = elapsed >= winnerAnnounceTime;
      if (allFinished) {
        setIsSpinning(false);
        onWinner(winner);
      } else {
        animationFrameRef.current = requestAnimationFrame(spinLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(spinLoop);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full select-none">
      {/* Main Arcade Cabinet Wrapper */}
      <div className={`flex items-center justify-center w-full gap-5 transition-all duration-300 ${
        isFullscreen ? 'max-w-2xl scale-110 lg:scale-115 my-6' : 'max-w-xl'
      }`}>
        
        {/* The Slots Machine cabinet */}
        <div className="relative flex-1 bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-[0_15px_45px_-10px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] max-w-sm overflow-hidden">
          
          {/* Header Lights Board */}
          <div className="bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/5 rounded-2xl py-2.5 px-4 mb-4 flex justify-between items-center text-center shadow-inner">
            <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] ${isSpinning ? 'animate-ping' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
              Slot Selector Reel
            </span>
            <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] ${isSpinning ? 'animate-ping' : ''}`} />
          </div>

          {/* Reels Panel Window */}
          <div className="relative grid grid-cols-3 gap-2.5 bg-slate-100/70 dark:bg-black/60 p-2.5 border border-slate-200/80 dark:border-white/5 rounded-2xl h-[300px] overflow-hidden shadow-inner">
            {/* Center winning highlight frame indicator overlay */}
            <div className="absolute inset-y-1/2 -translate-y-1/2 inset-x-0 h-[104px] border-y-2 border-amber-400/60 bg-amber-400/[0.08] dark:border-amber-400/40 pointer-events-none z-10" />

            {reels.map((reel, reelIdx) => (
              <div 
                key={reelIdx} 
                className="relative bg-white dark:bg-zinc-800/60 border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden h-full flex flex-col items-center shadow-sm"
              >
                {/* Cycles choices cards inside */}
                <div 
                  className="absolute w-full flex flex-col items-center"
                  style={{ 
                    transform: `translateY(-${reel.offset}px)`,
                    transition: reel.spinning ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {reel.items.length === 0 ? (
                    <div className="h-[80px] w-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                      -
                    </div>
                  ) : (
                    reel.items.map((choice, choiceIdx) => (
                      <div 
                        key={choiceIdx}
                        className="h-[100px] w-full shrink-0 flex flex-col items-center justify-center p-2 text-center select-none"
                      >
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shadow-md transition-transform"
                          style={{ backgroundColor: choice.color }}
                        >
                          {choice.text.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate w-full mt-2 px-1 text-center leading-tight">
                          {choice.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Machine base status */}
          <div className="mt-4 flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
            <span>{isSpinning ? 'REELS SPINNING...' : 'READY TO PLAY'}</span>
            <span>100% UNBIASED</span>
          </div>
        </div>

        {/* The Side Lever Handle mechanical assembly */}
        <div className="flex flex-col items-center shrink-0 h-[220px] w-12 relative select-none">
          {/* Vertical axis line */}
          <div className="absolute top-10 w-2.5 bg-slate-300 dark:bg-zinc-700 rounded-full h-32 z-0" />
          
          {/* Mechanical base hinge */}
          <div className="absolute top-36 w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shadow-md z-20 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-400 dark:bg-zinc-950 shadow-inner" />
          </div>

          {/* The lever rod and handle knob that rotates */}
          <div 
            onClick={pullHandle}
            className="absolute top-4 cursor-pointer flex flex-col items-center z-10 w-full"
            style={{
              transformOrigin: '50% 135px',
              transform: handlePulled ? 'rotateX(55deg) translateY(30px)' : 'rotateX(0deg) translateY(0px)',
              transition: handlePulled ? 'all 0.15s ease-out' : 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.35)'
            }}
          >
            {/* Bright red glossy handle ball knob */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_6px_15px_rgba(239,68,68,0.35)] border border-red-400 active:scale-95 transition-transform" />
            {/* The metal rod shaft */}
            <div className="w-2 h-[110px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm" />
          </div>
        </div>

      </div>

      {/* Spin Button */}
      <div className="mt-7 flex flex-col items-center gap-2">
        <button
          onClick={pullHandle}
          disabled={isSpinning || choices.length < 2}
          className="apple-btn-primary flex items-center gap-2 px-8 py-3 rounded-full text-xs font-semibold tracking-wide disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isSpinning ? 'Simulating...' : 'Spin Reels'}
        </button>

        {choices.length < 2 && (
          <span className="text-xs text-[#86868b] font-medium">
            Requires at least 2 choices to spin
          </span>
        )}
      </div>
    </div>
  );
};
