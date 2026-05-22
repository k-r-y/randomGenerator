import React, { useState, useEffect, useRef } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';


interface SlotMachineProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  spinDuration?: number;
}

interface ReelState {
  offset: number;
  spinning: boolean;
  finalChoice: Choice | null;
  items: Choice[];
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ choices, onWinner, isFullscreen, spinDuration = 8 }) => {
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
    const durations = [totalMs * 0.45, totalMs * 0.7, totalMs * 1.0]; // Stop reel timings (sequenced)
    const speeds = [22, 28, 34]; // Spinning speeds per frame

    const lastTickFrame = [0, 0, 0];

    const spinLoop = () => {
      const elapsed = Date.now() - startTime;

      setReels((prevReels) =>
        prevReels.map((reel, idx) => {
          if (!reel.spinning) return reel;

          const duration = durations[idx];
          if (elapsed >= duration) {
            // Stop this specific reel
            // Snap offset perfectly to align the winner
            const finalStopIndex = reel.items.length - 3;
            const targetOffset = finalStopIndex * reelItemsHeight;

            // Audio clank sound when stopping
            if (reel.spinning) {
              soundManager.playTick(420 + idx * 80, 0.12);
            }

            return {
              ...reel,
              spinning: false,
              offset: targetOffset,
            };
          }

          // Continuous vertical scrolling scroll offset
          let newOffset = reel.offset + speeds[idx];
          const maxOffset = (reel.items.length - 3) * reelItemsHeight;

          // Cycle offset if exceeded
          if (newOffset > maxOffset) {
            newOffset = newOffset % maxOffset;
          }

          // Sound tick clicks based on index speed boundary crossing
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

      // Check if all reels completed spinning
      const allFinished = elapsed >= durations[2];
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
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Sound Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-4">
        <div>
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            Arcade Cabinet
          </span>
          <h3 className="text-lg font-bold text-white leading-none mt-0.5">Sleek Slot Machine</h3>
        </div>
      </div>

      {/* Main Arcade Cabinet Wrapper */}
      <div className={`flex items-center justify-center w-full gap-4 transition-all duration-300 ${
        isFullscreen ? 'max-w-2xl scale-110 lg:scale-115 my-8' : 'max-w-xl'
      }`}>
        
        {/* The Slots Machine cabinet */}
        <div className="relative flex-1 bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 mac-shadow max-w-sm overflow-hidden">
          {/* Subtle Sonoma style overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          
          {/* Header Lights Board */}
          <div className="bg-[#000000]/40 border border-white/5 rounded-2xl py-3 px-4 mb-4 flex justify-between items-center text-center shadow-inner">
            <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] ${isSpinning ? 'animate-ping' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
              Slot Selector Reel
            </span>
            <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] ${isSpinning ? 'animate-ping' : ''}`} />
          </div>

          {/* Reels Panel Window */}
          <div className="relative grid grid-cols-3 gap-2 bg-black/60 p-2.5 border border-white/5 rounded-2xl h-[300px] overflow-hidden shadow-inner">
            {/* Center winning highlight frame indicator overlay */}
            <div className="absolute inset-y-1/2 -translate-y-1/2 inset-x-0 h-[104px] border-y border-white/10 bg-white/[0.04] pointer-events-none z-10" />

            {reels.map((reel, reelIdx) => (
              <div 
                key={reelIdx} 
                className="relative bg-[#2c2c2e]/60 rounded-xl overflow-hidden h-full flex flex-col items-center"
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
                    <div className="h-[80px] w-full flex items-center justify-center text-slate-500 text-xs font-semibold">
                      -
                    </div>
                  ) : (
                    reel.items.map((choice, choiceIdx) => (
                      <div 
                        key={choiceIdx}
                        className="h-[100px] w-full shrink-0 flex flex-col items-center justify-center p-2 text-center select-none"
                      >
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shadow-md transition-transform hover:scale-105"
                          style={{ backgroundColor: choice.color }}
                        >
                          {choice.text.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xl font-extrabold text-white truncate w-full mt-1.5 px-0.5 text-center leading-tight">
                          {choice.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Machine base details */}
          <div className="mt-4 flex items-center justify-between px-2 text-[10px] font-bold text-slate-500 font-mono">
            <span>READY TO SPIN</span>
            <span>PLAY 1 CREDIT</span>
          </div>
        </div>

        {/* The Side Lever Handle mechanical assembly */}
        <div className="flex flex-col items-center shrink-0 h-[220px] w-12 relative select-none">
          {/* Vertical axis line */}
          <div className="absolute top-10 w-3 bg-[#2c2c2e] border-x border-white/5 rounded-full h-32 z-0" />
          
          {/* Mechanical base hinge */}
          <div className="absolute top-36 w-8 h-8 rounded-full bg-[#2c2c2e] border border-white/10 shadow-xl z-20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-slate-950 shadow-inner" />
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_6px_15px_rgba(239,68,68,0.4)] border border-red-400 group active:scale-95 transition-transform" />
            {/* The metal rod shaft */}
            <div className="w-2.5 h-[110px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-md border-x border-slate-500/30" />
          </div>
        </div>

      </div>

      {/* Helper Warning */}
      {choices.length < 2 && (
        <span className="text-xs text-slate-500 font-medium mt-4">
          Needs at least 2 choices in the sidebar to activate the lever!
        </span>
      )}
    </div>
  );
};
