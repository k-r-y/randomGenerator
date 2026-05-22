import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Choice, DrawResult } from './types';
import { ChoiceSidebar } from './components/ChoiceSidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { RouletteWheel } from './generators/RouletteWheel';
import { DuckRace } from './generators/DuckRace';
import { SlotMachine } from './generators/SlotMachine';
import { Plinko } from './generators/Plinko';
import { ClawMachine } from './generators/ClawMachine';
import { soundManager } from './utils/soundUtils';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Compass, Waves, Dices, Grid3X3, Box, Award, X, Volume2, VolumeX, Trash2, Sun, Moon, Maximize2, Minimize2
} from 'lucide-react';
import './App.css';

type GeneratorType = 'roulette' | 'duck' | 'slot' | 'plinko' | 'claw';

function App() {
  const [choices, setChoices] = useState<Choice[]>([
    { id: '1', text: 'Pizza 🍕', color: '#ef4444', weight: 1 },
    { id: '2', text: 'Sushi 🍣', color: '#06b6d4', weight: 1 },
    { id: '3', text: 'Burger 🍔', color: '#f59e0b', weight: 1 },
    { id: '4', text: 'Tacos 🌮', color: '#f97316', weight: 1 },
    { id: '5', text: 'Salad 🥗', color: '#10b981', weight: 1 },
  ]);
  const [useWeights, setUseWeights] = useState(false);
  const [activeTab, setActiveTab] = useState<GeneratorType>('roulette');
  const [history, setHistory] = useState<DrawResult[]>(() => {
    try {
      const savedHistory = localStorage.getItem('decidely_history');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.warn("Failed to load history", e);
      return [];
    }
  });
  const [winner, setWinner] = useState<Choice | null>(null);
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [isLightMode, setIsLightMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Manage light-theme root class to prevent fixed-position stacking context bugs
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    return () => {
      document.documentElement.classList.remove('light-theme');
    };
  }, [isLightMode]);

  // Lock body scroll in fullscreen mode to prevent scrollbars or layout shifts
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleWinner = (drawWinner: Choice) => {
    // 1. Play Dynamic Win Fanfare
    soundManager.playWin();

    // 2. Explode satisfy-confetti!
    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.6 },
      colors: [drawWinner.color, '#ffffff', '#a855f7', '#06b6d4'],
    });

    // 3. Set Winner state to trigger modern modal overlay popup
    setWinner(drawWinner);

    // 4. Save to History logs
    const newResult: DrawResult = {
      id: Math.random().toString(36).substring(2, 9),
      choice: drawWinner,
      generator: activeTab.toUpperCase(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [...prev, newResult];
      localStorage.setItem('decidely_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('decidely_history');
  };

  const toggleMute = () => {
    const newMute = soundManager.toggleMute();
    setMuted(newMute);
  };

  const gameBoardContent = (
    <div 
      className={`flex flex-col items-center justify-center transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9999] bg-[#09090b] p-8 overflow-y-auto w-screen h-screen' 
          : 'flex-1 min-h-[380px] glass-panel rounded-3xl relative mac-shadow w-full'
      }`}
    >
      {/* Fullscreen Close/Maximize Button */}
      <button
        onClick={() => {
          setIsFullscreen(!isFullscreen);
          soundManager.playTick(600, 0.08);
          // Dispatch resize event to trigger canvas resizing
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }}
        className="absolute top-4 right-4 z-[10000] p-2.5 rounded-xl bg-[#2c2c2e]/60 border border-white/5 hover:bg-[#2c2c2e]/90 text-slate-400 hover:text-white transition-all mac-btn cursor-pointer shadow-md"
        title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <div className="w-full flex-1 flex items-center justify-center overflow-visible">
        {activeTab === 'roulette' && (
          <RouletteWheel choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} />
        )}
        {activeTab === 'duck' && (
          <DuckRace choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} />
        )}
        {activeTab === 'slot' && (
          <SlotMachine choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} />
        )}
        {activeTab === 'plinko' && (
          <Plinko choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} />
        )}
        {activeTab === 'claw' && (
          <ClawMachine choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} />
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* 1. Soft radial ambient highlight */}
      <div className="absolute inset-0 bg-ambient-glow" />

      {/* 2. Top Header Navigation Bar */}
      <header className={`relative glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 bg-[#1c1c1e]/40 transition-all duration-300 ${
        isFullscreen ? 'z-0' : 'z-10'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-400 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2 m-0 p-0 font-sans leading-none">
              RAMDOMY
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5 block">
              Premium Interactive Random Generator Game
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Light/Dark Theme Switcher */}
          <button
            onClick={() => {
              setIsLightMode(!isLightMode);
              soundManager.playTick(600, 0.08);
            }}
            className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl bg-[#2c2c2e]/60 border border-white/5 text-slate-300 hover:text-white hover:bg-[#2c2c2e]/90 transition-all shadow-md mac-btn cursor-pointer"
            title="Toggle Light & Dark Mode"
          >
            {isLightMode ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          {/* Mute indicator header trigger button */}
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl bg-[#2c2c2e]/60 border border-white/5 text-slate-300 hover:text-white hover:bg-[#2c2c2e]/90 transition-all shadow-md mac-btn cursor-pointer"
          >
            {muted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sound On</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 3. Core Working Dashboard Workspace panel */}
      <div className={`relative flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'z-0' : 'z-10'
      }`}>
        {/* Left Side: Choices entries Sidebar component */}
        <ChoiceSidebar
          choices={choices}
          setChoices={setChoices}
          useWeights={useWeights}
          setUseWeights={setUseWeights}
        />

        {/* Right Side Panel: Interactive generators + logs */}
        <main className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto gap-6 bg-[#000000]/10">
          
          {/* Tab Selection Row */}
          <div className="segmented-control p-1 flex items-center gap-0.5 overflow-x-auto w-full max-w-2xl shrink-0 border border-white/5">
            {[
              { id: 'roulette', label: 'Roulette', icon: Compass, color: 'text-purple-400' },
              { id: 'duck', label: 'Duck Race', icon: Waves, color: 'text-cyan-400' },
              { id: 'slot', label: 'Slots', icon: Dices, color: 'text-amber-400' },
              { id: 'plinko', label: 'Plinko', icon: Grid3X3, color: 'text-rose-400' },
              { id: 'claw', label: 'Claw Grab', icon: Box, color: 'text-pink-400' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as GeneratorType);
                    soundManager.playTick(500, 0.05);
                  }}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs tracking-wide transition-all shrink-0 cursor-pointer flex-1 segmented-button mac-btn ${
                    isSelected 
                      ? 'segmented-button-active text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Generator Core Game Board Display Area */}
          {isFullscreen ? (
            <>
              {/* Responsive Glassmorphic Dashboard Placeholder */}
              <div className="flex-1 min-h-[380px] glass-panel rounded-3xl relative mac-shadow w-full flex items-center justify-center text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider animate-pulse text-slate-400">Running in full screen...</span>
              </div>
              {createPortal(gameBoardContent, document.body)}
            </>
          ) : (
            gameBoardContent
          )}

          {/* History Panel */}
          <HistoryPanel history={history} clearHistory={clearHistory} />

        </main>
      </div>

      {/* 4. Glassmorphic Modal overlay popup when a winner is drawn */}
      {winner && createPortal(
        <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-md z-[10050] flex items-center justify-center p-6 animate-fade-in select-none">
          <div 
            className="relative w-full max-w-md bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_30px_70px_rgba(0,0,0,0.8)] animate-scale-up"
            style={{
              boxShadow: `0 0 40px ${winner.color}15, 0 30px 70px rgba(0,0,0,0.8)`,
              borderColor: `${winner.color}25`
            }}
          >
            {/* Close cross corner button */}
            <button
              onClick={() => setWinner(null)}
              className="absolute top-4 right-4 p-2 bg-[#2c2c2e]/60 rounded-full border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Trophy circle marker */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-[#1c1c1e]"
              style={{ 
                backgroundColor: winner.color,
                boxShadow: `0 0 25px ${winner.color}50` 
              }}
            >
              <Award className="w-10 h-10 text-white animate-bounce" />
            </div>

            {/* Win announcement labels */}
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">
              THE SELECTION IS DECLARED
            </span>

            {/* Glowing Options Winner display */}
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mt-3 mb-2 tracking-tight break-words w-full font-sans">
              {winner.text}
            </h2>

            <p className="text-xs text-slate-400 max-w-[240px] mt-2 mb-8">
              Drawn fairly via the interactive {activeTab.toUpperCase()} generator pool.
            </p>

            {/* Action buttons */}
            <div className="flex w-full gap-3">
              <button
                onClick={() => {
                  setChoices((prev) => prev.filter((c) => c.id !== winner.id));
                  setWinner(null);
                }}
                className="flex-1 py-3 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mac-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Choice
              </button>
              <button
                onClick={() => setWinner(null)}
                className="flex-1 py-3 text-xs font-bold bg-white/10 hover:bg-white/15 text-white rounded-2xl border border-white/5 transition-all cursor-pointer mac-btn"
              >
                Keep & Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default App;
