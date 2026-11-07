import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Choice, DrawResult, GeneratorType } from './types';
import { MAX_CHOICES } from './types';
import { ChoiceSidebar } from './components/ChoiceSidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { PresetModal } from './components/PresetModal';
import { RouletteWheel } from './generators/RouletteWheel';
import { JeepneyRace } from './generators/JeepneyRace';
import { SlotMachine } from './generators/SlotMachine';
import { Plinko } from './generators/Plinko';
import { ClawMachine } from './generators/ClawMachine';
import { soundManager } from './utils/soundUtils';
import type { PresetChoice } from './data/presets';
import confetti from 'canvas-confetti';
import { 
  Compass, Bus, Dices, Grid3X3, Box, Award, X, Volume2, 
  VolumeX, Trash2, Sun, Moon, Maximize2, Minimize2, Share2, Check, Copy, RefreshCw
} from 'lucide-react';
import './App.css';

const HARMONIZED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
];

function App() {
  const [choices, setChoices] = useState<Choice[]>(() => {
    // Check URL parameters for custom shared choices
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const choicesParam = params.get('choices');
        if (choicesParam) {
          const decoded = decodeURIComponent(choicesParam);
          const items = decoded.split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_CHOICES);
          if (items.length > 0) {
            return items.map((text, idx) => ({
              id: Math.random().toString(36).substring(2, 9),
              text,
              color: HARMONIZED_COLORS[idx % HARMONIZED_COLORS.length],
              weight: 1,
            }));
          }
        }
      } catch (e) {
        console.warn("Failed to parse choices from URL", e);
      }
    }
    return [
      { id: '1', text: 'Pizza', color: '#ef4444', weight: 1 },
      { id: '2', text: 'Sushi', color: '#06b6d4', weight: 1 },
      { id: '3', text: 'Burger', color: '#f59e0b', weight: 1 },
      { id: '4', text: 'Tacos', color: '#f97316', weight: 1 },
      { id: '5', text: 'Salad', color: '#10b981', weight: 1 },
    ];
  });

  const [useWeights, setUseWeights] = useState(false);
  const [activeTab, setActiveTab] = useState<GeneratorType>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const modeParam = params.get('mode') as GeneratorType;
        const hash = window.location.hash.replace('#', '').toLowerCase();
        const validModes: GeneratorType[] = ['roulette', 'duck', 'slot', 'plinko', 'claw'];
        if (modeParam && validModes.includes(modeParam)) return modeParam;
        if (hash && validModes.includes(hash as GeneratorType)) return hash as GeneratorType;
      } catch (e) {
        console.warn("Failed to parse mode from URL", e);
      }
    }
    return 'roulette';
  });

  const [history, setHistory] = useState<DrawResult[]>(() => {
    try {
      const savedHistory = localStorage.getItem('kuji_history') || localStorage.getItem('decidely_history');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.warn("Failed to load history", e);
      return [];
    }
  });

  const [winner, setWinner] = useState<Choice | null>(null);
  const [muted, setMuted] = useState(soundManager.isMuted());
  
  // Default to Light Mode as requested by user!
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kuji_theme') || localStorage.getItem('decidely_theme');
      if (saved) return saved === 'light';
    } catch (e) {
      console.warn("Could not read theme", e);
    }
    return true; // Light Mode default
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spinDuration, setSpinDuration] = useState(8);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [headerCopied, setHeaderCopied] = useState(false);
  const [winnerCopied, setWinnerCopied] = useState(false);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'simulation' | 'roster'>('simulation');

  // Manage theme classes
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light-theme');
      try {
        localStorage.setItem('kuji_theme', 'light');
      } catch {
        /* ignore storage error */
      }
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light-theme');
      try {
        localStorage.setItem('kuji_theme', 'dark');
      } catch {
        /* ignore storage error */
      }
    }
  }, [isLightMode]);

  // Lock body scroll in fullscreen mode
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

  // Browser History & Popstate integration
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode') as GeneratorType;
      if (urlMode && ['roulette', 'duck', 'slot', 'plinko', 'claw'].includes(urlMode)) {
        setActiveTab(urlMode);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleWinner = (drawWinner: Choice) => {
    soundManager.playWin();

    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
      colors: [drawWinner.color, '#6366f1', '#ec4899', '#10b981', '#f59e0b'],
    });

    setWinner(drawWinner);
    setWinnerCopied(false);

    const generatorLabels: Record<GeneratorType, string> = {
      roulette: 'Wheel',
      duck: 'Jeepney',
      slot: 'Reels',
      plinko: 'Pegboard',
      claw: 'Claw',
    };

    const newResult: DrawResult = {
      id: Math.random().toString(36).substring(2, 9),
      choice: drawWinner,
      generator: generatorLabels[activeTab] || activeTab.toUpperCase(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [...prev, newResult];
      try {
        localStorage.setItem('kuji_history', JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save history", e);
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('kuji_history');
      localStorage.removeItem('decidely_history');
    } catch (e) {
      console.warn("Could not clear history", e);
    }
  };

  const toggleMute = () => {
    const newMute = soundManager.toggleMute();
    setMuted(newMute);
  };

  const handleTabChange = (tab: GeneratorType) => {
    setActiveTab(tab);
    soundManager.playTick(500, 0.05);
    window.history.replaceState(null, '', `#${tab}`);
  };

  const handleSelectPreset = (presetItems: PresetChoice[]) => {
    const mapped: Choice[] = presetItems.slice(0, MAX_CHOICES).map((item) => ({
      id: Math.random().toString(36).substring(2, 9),
      text: item.text,
      color: item.color,
      weight: item.weight,
    }));
    setChoices(mapped);
  };

  const handleShareBoard = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const choiceNames = choices.map(c => encodeURIComponent(c.text)).join(',');
    const shareUrl = `${baseUrl}?mode=${activeTab}&choices=${choiceNames}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setHeaderCopied(true);
      setTimeout(() => setHeaderCopied(false), 2500);
    }).catch(() => {
      window.prompt("Copy this shareable link:", shareUrl);
    });
  };

  const handleCopyWinner = () => {
    if (!winner) return;
    const textToCopy = `The choice is: ${winner.text}! Picked fairly using Decidely.`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setWinnerCopied(true);
      setTimeout(() => setWinnerCopied(false), 2500);
    });
  };

  const gameBoardContent = (
    <div 
      className={`flex flex-col items-center justify-center transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9999] bg-[#fbfbfd] dark:bg-black overflow-y-auto w-screen h-screen' 
          : 'w-full bg-white dark:bg-[#161617] rounded-[32px] relative border border-black/[0.06] dark:border-white/[0.08] shadow-[0_16px_45px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
      }`}
    >
      {/* Fullscreen Overlay Controls (Exit & Sound) */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all btn-press cursor-pointer backdrop-blur-md"
            title={muted ? "Unmute sound" : "Mute sound"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
          </button>

          <button
            onClick={() => {
              setIsFullscreen(false);
              soundManager.playTick(600, 0.08);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 60);
            }}
            className="p-2.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all btn-press cursor-pointer backdrop-blur-md"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full flex-1 flex items-center justify-center overflow-visible">
        {activeTab === 'roulette' && (
          <RouletteWheel choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} spinDuration={spinDuration} />
        )}
        {activeTab === 'duck' && (
          <JeepneyRace choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} spinDuration={spinDuration} />
        )}
        {activeTab === 'slot' && (
          <SlotMachine choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} spinDuration={spinDuration} />
        )}
        {activeTab === 'plinko' && (
          <Plinko choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} isLightMode={isLightMode} spinDuration={spinDuration} />
        )}
        {activeTab === 'claw' && (
          <ClawMachine choices={choices} onWinner={handleWinner} isFullscreen={isFullscreen} spinDuration={spinDuration} />
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors bg-mesh-pattern">
      {/* 1. Ambient lighting glow */}
      <div className="absolute inset-0 bg-ambient-light pointer-events-none" />

      {/* 2. Top Navigation Bar (Apple Frosted Glass) */}
      <header className={`sticky top-0 z-30 apple-glass-nav border-b border-black/[0.06] dark:border-white/[0.08] px-4 sm:px-8 py-2.5 flex items-center justify-between shrink-0 ${
        isFullscreen ? 'hidden' : ''
      }`}>
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 select-none">
          <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Decidely
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#86868b]">
            Studio
          </span>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Preset Library Trigger Button */}
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Share Board Button */}
          <button
            onClick={handleShareBoard}
            className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 cursor-pointer"
            title="Share this decision board"
          >
            {headerCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#86868b]" />}
            <span className="hidden sm:inline">{headerCopied ? 'Link Copied' : 'Share'}</span>
          </button>

          {/* Theme Switcher (Light / Dark) */}
          <button
            onClick={() => {
              setIsLightMode(!isLightMode);
              soundManager.playTick(600, 0.08);
            }}
            className="apple-btn-secondary p-2 rounded-full cursor-pointer"
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {isLightMode ? (
              <Moon className="w-3.5 h-3.5 text-[#1d1d1f]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#f5f5f7]" />
            )}
          </button>

          {/* Sound Mute Switcher */}
          <button
            onClick={toggleMute}
            className="apple-btn-secondary p-2 rounded-full cursor-pointer"
            title={muted ? "Unmute audio" : "Mute audio"}
            aria-label="Toggle sound"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            )}
          </button>

          {/* Fullscreen View Switcher */}
          <button
            onClick={() => {
              setIsFullscreen(true);
              soundManager.playTick(600, 0.08);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 60);
            }}
            className="apple-btn-secondary p-2 rounded-full cursor-pointer"
            title="Enter Fullscreen"
            aria-label="Enter fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]" />
          </button>
        </div>
      </header>

      {/* 3. Main Dashboard Workspace */}
      <div className={`relative flex-1 flex flex-col lg:flex-row min-h-0 transition-all duration-300 ${
        isFullscreen ? 'z-0' : 'z-10'
      }`}>
        {/* Mobile View Switcher (Visible only below lg) */}
        <div className="lg:hidden w-full sticky top-[48px] z-20 apple-glass-nav px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.06] w-full max-w-xs mx-auto">
            <button
              onClick={() => setMobileWorkspaceTab('simulation')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center cursor-pointer ${
                mobileWorkspaceTab === 'simulation'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              Simulation
            </button>
            <button
              onClick={() => setMobileWorkspaceTab('roster')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileWorkspaceTab === 'roster'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <span>Roster</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono leading-none ${
                mobileWorkspaceTab === 'roster'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/[0.06] dark:bg-white/[0.1] text-[#86868b]'
              }`}>
                {choices.length}/{MAX_CHOICES}
              </span>
            </button>
          </div>
        </div>

        {/* Left Side: Choices Sidebar */}
        <div className={`w-full lg:w-96 shrink-0 lg:sticky lg:top-[49px] lg:h-[calc(100vh-49px)] ${
          mobileWorkspaceTab === 'roster' ? 'flex flex-col flex-1 min-h-[calc(100vh-105px)]' : 'hidden'
        } lg:flex lg:flex-col`}>
          <ChoiceSidebar
            choices={choices}
            setChoices={setChoices}
            useWeights={useWeights}
            setUseWeights={setUseWeights}
          />
        </div>

        {/* Right Side Panel: Interactive Generators & History */}
        <main className={`flex-1 flex flex-col p-3 sm:p-8 min-h-0 overflow-y-auto gap-5 sm:gap-8 ${mobileWorkspaceTab === 'simulation' ? 'flex' : 'hidden'} lg:flex`}>
          
          {/* Tab Selector & Duration Stepper (Apple Segmented Bar) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full shrink-0">
            {/* Apple Segmented Control for Simulation Modes */}
            <div className="flex items-center p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-md overflow-x-auto max-w-full w-full sm:w-auto justify-between sm:justify-start scrollbar-none">
              {[
                { id: 'roulette', label: 'Wheel', icon: Compass },
                { id: 'duck', label: 'Jeepney', icon: Bus },
                { id: 'slot', label: 'Reels', icon: Dices },
                { id: 'plinko', label: 'Pegboard', icon: Grid3X3 },
                { id: 'claw', label: 'Claw', icon: Box },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as GeneratorType)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-white dark:bg-zinc-800 text-violet-700 dark:text-violet-300 shadow-xs font-semibold'
                        : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Apple Pill Stepper for Duration */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.06] text-xs font-medium text-[#86868b] self-center sm:self-auto">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#86868b] uppercase tracking-wider select-none">
                Duration
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setSpinDuration(d => Math.max(3, d - 1));
                    soundManager.playTick(400, 0.05);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-[#1d1d1f] dark:text-white shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold select-none text-xs"
                  title="Decrease animation time"
                >
                  −
                </button>
                <span className="w-7 text-center text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] font-mono select-none">
                  {spinDuration}s
                </span>
                <button
                  onClick={() => {
                    setSpinDuration(d => Math.min(20, d + 1));
                    soundManager.playTick(500, 0.05);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-[#1d1d1f] dark:text-white shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold select-none text-xs"
                  title="Increase animation time"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Generator Arena & History Stack */}
          <div className="flex-1 flex flex-col items-center gap-8 w-full min-h-0">
            {/* Center: Generator Viewport */}
            <div className="w-full min-h-[520px] flex flex-col shrink-0">
              {isFullscreen ? (
                <>
                  <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-white/5 flex items-center justify-center text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider animate-pulse">Running in full screen...</span>
                  </div>
                  {createPortal(gameBoardContent, document.body)}
                </>
              ) : (
                gameBoardContent
              )}
            </div>

            {/* Decision History */}
            <div className="w-full shrink-0 mb-8">
              <HistoryPanel history={history} clearHistory={clearHistory} />
            </div>
          </div>

        </main>
      </div>

      {/* 4. Preset Library Modal */}
      <PresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        currentChoices={choices}
      />

      {/* 5. Winner Celebration Modal Overlay (Apple Dialog Sheet) */}
      {winner && createPortal(
        <div className="fixed inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-xl z-[10050] flex items-center justify-center p-6 animate-fade-in select-none">
          <div 
            className="relative w-full max-w-sm bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-[0_24px_70px_rgba(0,0,0,0.18)] animate-scale-up"
          >
            {/* Close button */}
            <button
              onClick={() => setWinner(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Minimal Disc Badge */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 border-2 border-white/80 shadow-md"
              style={{ 
                backgroundColor: winner.color,
                boxShadow: `0 8px 24px ${winner.color}40` 
              }}
            >
              <Award className="w-8 h-8 text-white" />
            </div>

            {/* Winner Announcement */}
            <span className="text-[11px] font-semibold tracking-wider text-[#86868b] uppercase">
              Selected Outcome
            </span>

            {/* Bold Winner Display */}
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight mt-1.5 mb-2 tracking-tight break-words w-full">
              {winner.text}
            </h2>

            <p className="text-xs text-[#86868b] max-w-[260px] mb-6 leading-relaxed">
              Drawn fairly via {activeTab === 'roulette' ? 'Roulette Wheel' : activeTab === 'duck' ? 'Jeepney Race' : activeTab === 'slot' ? 'Slot Machine' : activeTab === 'plinko' ? 'Plinko Board' : 'Claw Machine'}.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col w-full gap-2">
              <button
                onClick={() => setWinner(null)}
                className="apple-btn-primary w-full py-3 rounded-full text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Done & Pick Again
              </button>

              <div className="flex w-full gap-2 mt-1">
                <button
                  onClick={handleCopyWinner}
                  className="apple-btn-secondary flex-1 py-2.5 rounded-full text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {winnerCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#86868b]" />}
                  <span>{winnerCopied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => {
                    setChoices((prev) => prev.filter((c) => c.id !== winner.id));
                    setWinner(null);
                  }}
                  className="apple-btn-secondary flex-1 py-2.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 cursor-pointer flex items-center justify-center gap-1.5"
                  title="Remove this choice from the pool"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default App;
