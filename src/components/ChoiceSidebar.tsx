import React, { useState } from 'react';
import type { Choice } from '../types';
import { MAX_CHOICES } from '../types';
import { 
  Plus, Trash2, Sparkles, Scale, Info, RefreshCw, Upload, Download, ArrowUpDown, ChevronDown, AlertCircle
} from 'lucide-react';

interface ChoiceSidebarProps {
  choices: Choice[];
  setChoices: React.Dispatch<React.SetStateAction<Choice[]>>;
  useWeights: boolean;
  setUseWeights: (val: boolean) => void;
  onOpenPresets?: () => void;
  activeGenerator?: string;
}

const HARMONIZED_COLORS = [
  '#ef4444', // Coral Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Electric Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Pink
  '#ec4899', // Rose
];

const PRESETS: Record<string, { label: string; items: { text: string; color: string; weight: number }[] }> = {
  'food': {
    label: 'What to Eat?',
    items: [
      { text: 'Pizza', color: '#ef4444', weight: 1 },
      { text: 'Sushi', color: '#06b6d4', weight: 1 },
      { text: 'Burger', color: '#f59e0b', weight: 1 },
      { text: 'Tacos', color: '#f97316', weight: 1 },
      { text: 'Salad', color: '#10b981', weight: 1 },
      { text: 'Ramen', color: '#8b5cf6', weight: 1 },
      { text: 'Pasta', color: '#ec4899', weight: 1 },
    ],
  },
  'movie': {
    label: 'Movie Genre',
    items: [
      { text: 'Action', color: '#ef4444', weight: 1 },
      { text: 'Comedy', color: '#f59e0b', weight: 1 },
      { text: 'Sci-Fi', color: '#06b6d4', weight: 1 },
      { text: 'Horror', color: '#8b5cf6', weight: 1 },
      { text: 'Drama', color: '#3b82f6', weight: 1 },
      { text: 'Romance', color: '#ec4899', weight: 1 },
    ],
  },
  'yes_no': {
    label: 'Yes or No',
    items: [
      { text: 'YES', color: '#10b981', weight: 1 },
      { text: 'NO', color: '#ef4444', weight: 1 },
      { text: 'MAYBE', color: '#f59e0b', weight: 1 },
    ],
  },
  'coin': {
    label: 'Coin Flip',
    items: [
      { text: 'Heads', color: '#f59e0b', weight: 1 },
      { text: 'Tails', color: '#6366f1', weight: 1 },
    ],
  },
  'dice': {
    label: 'Roll a Die',
    items: [
      { text: 'One (1)', color: '#ef4444', weight: 1 },
      { text: 'Two (2)', color: '#f97316', weight: 1 },
      { text: 'Three (3)', color: '#f59e0b', weight: 1 },
      { text: 'Four (4)', color: '#10b981', weight: 1 },
      { text: 'Five (5)', color: '#3b82f6', weight: 1 },
      { text: 'Six (6)', color: '#8b5cf6', weight: 1 },
    ],
  },
  'who_pays': {
    label: 'Who Pays?',
    items: [
      { text: 'You Pay!', color: '#f59e0b', weight: 1 },
      { text: 'I Pay...', color: '#3b82f6', weight: 1 },
      { text: 'Split the Bill', color: '#8b5cf6', weight: 1 },
      { text: 'Play Again!', color: '#10b981', weight: 1 },
    ],
  },
  'truth_dare': {
    label: 'Truth or Dare',
    items: [
      { text: 'Truth', color: '#3b82f6', weight: 1 },
      { text: 'Dare', color: '#ef4444', weight: 1 },
      { text: 'Double Dare', color: '#f59e0b', weight: 1 },
    ],
  },
  'standup': {
    label: 'Team Standup',
    items: [
      { text: 'Alex', color: '#3b82f6', weight: 1 },
      { text: 'Sam', color: '#8b5cf6', weight: 1 },
      { text: 'Jordan', color: '#10b981', weight: 1 },
      { text: 'Taylor', color: '#f59e0b', weight: 1 },
      { text: 'Morgan', color: '#ec4899', weight: 1 },
    ],
  },
};

export const ChoiceSidebar: React.FC<ChoiceSidebarProps> = ({
  choices,
  setChoices,
  useWeights,
  setUseWeights,
  onOpenPresets,
}) => {
  const [inputText, setInputText] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);

  const isAtLimit = choices.length >= MAX_CHOICES;

  const addChoice = (textToAdd: string = inputText) => {
    const trimmed = textToAdd.trim();
    if (!trimmed) return;

    setChoices((prev) => {
      const matchIndex = prev.findIndex(
        (c) => c.text.toLowerCase() === trimmed.toLowerCase()
      );
      if (matchIndex !== -1) {
        return prev.map((c, idx) =>
          idx === matchIndex ? { ...c, weight: Math.min(10, c.weight + 1) } : c
        );
      } else {
        if (prev.length >= MAX_CHOICES) {
          return prev;
        }
        const colorIndex = prev.length % HARMONIZED_COLORS.length;
        const newChoice: Choice = {
          id: Math.random().toString(36).substring(2, 9),
          text: trimmed,
          color: HARMONIZED_COLORS[colorIndex],
          weight: 1,
        };
        return [...prev, newChoice];
      }
    });
    setInputText('');
  };

  const addBulkChoices = () => {
    const lines = bulkText.split(/[\n,;]+/);
    
    setChoices((prev) => {
      let currentChoices = [...prev];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          const matchIndex = currentChoices.findIndex(
            (c) => c.text.toLowerCase() === trimmed.toLowerCase()
          );
          if (matchIndex !== -1) {
            currentChoices = currentChoices.map((c, idx) =>
              idx === matchIndex ? { ...c, weight: Math.min(10, c.weight + 1) } : c
            );
          } else {
            if (currentChoices.length >= MAX_CHOICES) {
              break;
            }
            const colorIndex = currentChoices.length % HARMONIZED_COLORS.length;
            currentChoices.push({
              id: Math.random().toString(36).substring(2, 9),
              text: trimmed,
              color: HARMONIZED_COLORS[colorIndex],
              weight: 1,
            });
          }
        }
      }
      return currentChoices;
    });
    setBulkText('');
    setActiveMode('single');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addChoice();
    }
  };

  const removeChoice = (id: string) => {
    setChoices((prev) => prev.filter((item) => item.id !== id));
  };

  const updateChoiceColor = (id: string, color: string) => {
    setChoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color } : item))
    );
  };

  const updateChoiceText = (id: string, text: string) => {
    setChoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const updateChoiceWeight = (id: string, weight: number) => {
    setChoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, weight } : item))
    );
  };

  const loadPreset = (presetKey: string) => {
    const presetData = PRESETS[presetKey];
    if (presetData) {
      const mapped = presetData.items.slice(0, MAX_CHOICES).map((item) => ({
        id: Math.random().toString(36).substring(2, 9),
        ...item,
      }));
      setChoices(mapped);
      setIsPresetDropdownOpen(false);
    }
  };

  const clearAll = () => {
    if (choices.length === 0) return;
    setChoices([]);
  };

  const shuffleList = () => {
    setChoices((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const sortAlphabetically = () => {
    setChoices((prev) => [...prev].sort((a, b) => a.text.localeCompare(b.text)));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(choices, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "kuji_choices.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const validated = parsed.slice(0, MAX_CHOICES).map((item: Record<string, unknown>) => ({
            id: typeof item.id === 'string' ? item.id : Math.random().toString(36).substring(2, 9),
            text: typeof item.text === 'string' ? item.text : 'Choice',
            color: typeof item.color === 'string' ? item.color : '#6366f1',
            weight: typeof item.weight === 'number' ? item.weight : 1,
          }));
          setChoices(validated);
        }
      } catch {
        alert("Invalid JSON format");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full lg:w-96 flex flex-col h-full shrink-0 bg-white dark:bg-[#161617] border-r border-black/[0.06] dark:border-white/[0.06] select-none transition-colors">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.06] flex justify-between items-center bg-[#fbfbfd] dark:bg-[#161617]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-[#1d1d1f] dark:text-white flex items-center gap-1.5 font-display">
              Roster
            </h2>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
              isAtLimit 
                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 font-mono font-bold'
                : 'bg-black/[0.04] dark:bg-white/[0.08] text-[#86868b]'
            }`}>
              {choices.length}/{MAX_CHOICES}
            </span>
          </div>
          <p className="text-xs text-[#86868b] mt-0.5">Configure options & odds</p>
        </div>

        {choices.length > 0 && (
          <button 
            onClick={clearAll}
            className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold transition-colors cursor-pointer btn-press"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-2.5 bg-white dark:bg-[#161617]">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Quick Presets
          </label>
          <div className="flex items-center gap-2">
            {onOpenPresets && (
              <button
                onClick={onOpenPresets}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Vault →
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
              >
                Presets
                <ChevronDown className="w-3 h-3" />
              </button>

            {isPresetDropdownOpen && (
              <div className="absolute right-0 top-6 w-48 bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl py-1 z-50 animate-scale-up">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => loadPreset(key)}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                    <span className="font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Quick Chip Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['food', 'yes_no', 'coin', 'who_pays', 'dice', 'movie'].map((key) => {
            const p = PRESETS[key];
            if (!p) return null;
            return (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#1d1d1f] dark:text-[#f5f5f7] shrink-0 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Weights Toggle */}
        <div className="flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.04] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] mt-1">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Proportional Odds</span>
              <span className="text-[10px] text-[#86868b]">Weigh choices from 1x to 10x</span>
            </div>
          </div>
          <button
            onClick={() => setUseWeights(!useWeights)}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              useWeights ? 'bg-[#34c759]' : 'bg-black/20 dark:bg-white/20'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                useWeights ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Input Mode Selector & Text Input */}
      <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-3 bg-white dark:bg-[#161617]">
        {/* Apple Segmented Pill */}
        <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full">
          <button
            onClick={() => setActiveMode('single')}
            className={`flex-1 py-1.5 text-xs font-semibold text-center rounded-full transition-all cursor-pointer ${
              activeMode === 'single' 
                ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs' 
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            Quick Add
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`flex-1 py-1.5 text-xs font-semibold text-center rounded-full transition-all cursor-pointer ${
              activeMode === 'bulk' 
                ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs' 
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            Paste Roster
          </button>
        </div>

        {isAtLimit && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Maximum limit of {MAX_CHOICES} options reached.</span>
          </div>
        )}

        {activeMode === 'single' ? (
          <div className="relative">
            <input
              type="text"
              placeholder={isAtLimit ? `Limit reached (${MAX_CHOICES}/${MAX_CHOICES})` : "Add choice (e.g. Pizza)..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
              disabled={isAtLimit}
              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl pl-3.5 pr-11 py-2.5 text-xs text-[#1d1d1f] dark:text-white placeholder-[#86868b] outline-none focus:bg-white dark:focus:bg-[#2c2c2e] focus:border-violet-600 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => addChoice()}
              disabled={!inputText.trim() || isAtLimit}
              title={isAtLimit ? `Maximum limit of ${MAX_CHOICES} reached` : 'Add choice'}
              className="absolute right-1.5 top-1.5 p-1.5 rounded-xl apple-btn-primary disabled:opacity-30 transition-all cursor-pointer btn-press"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              placeholder={isAtLimit ? `Limit reached (${MAX_CHOICES}/${MAX_CHOICES})` : "Paste choices separated by lines or commas..."}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={3}
              disabled={isAtLimit}
              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-3 text-xs text-[#1d1d1f] dark:text-white placeholder-[#86868b] outline-none focus:bg-white dark:focus:bg-[#2c2c2e] focus:border-violet-600 transition-all resize-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={addBulkChoices}
              disabled={!bulkText.trim() || isAtLimit}
              className="w-full py-2.5 apple-btn-primary text-xs font-semibold rounded-xl transition-all disabled:opacity-30 cursor-pointer btn-press shadow-sm"
            >
              {isAtLimit
                ? `Limit Reached (${MAX_CHOICES}/${MAX_CHOICES})`
                : `Add Multiple Choices (${MAX_CHOICES - choices.length} slots left)`
              }
            </button>
          </div>
        )}
      </div>

      {/* Choices Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0 bg-[#fbfbfd] dark:bg-[#121213]">
        {choices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#86868b]">
            <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-3">
              <Info className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-xs font-bold text-[#1d1d1f] dark:text-white">Roster is Empty</p>
            <p className="text-[11px] text-[#86868b] mt-1 max-w-[200px] leading-relaxed">
              Add your options above or select one of the ready presets.
            </p>
          </div>
        ) : (
          choices.map((choice) => (
            <div 
              key={choice.id}
              className="group flex flex-col gap-2 p-3 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.05] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.14] shadow-xs transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Visual Color Dot Picker */}
                <div className="relative group/color shrink-0">
                  <input
                    type="color"
                    value={choice.color}
                    onChange={(e) => updateChoiceColor(choice.id, e.target.value)}
                    className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer z-10"
                    title="Change slice color"
                  />
                  <div 
                    className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 shadow-xs transition-transform group-hover/color:scale-110"
                    style={{ backgroundColor: choice.color }}
                  />
                </div>

                {/* Edit Text */}
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) => updateChoiceText(choice.id, e.target.value)}
                  className="flex-1 bg-transparent text-xs text-[#1d1d1f] dark:text-white font-semibold border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-violet-600 py-0.5 outline-none transition-colors"
                />

                {/* Delete Button */}
                <button
                  onClick={() => removeChoice(choice.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#86868b] hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Remove option"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Weight Slider (Conditional) */}
              {useWeights && (
                <div className="flex items-center gap-3 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] mt-0.5">
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider shrink-0 w-16">
                    Odds: {choice.weight}x
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={choice.weight}
                    onChange={(e) => updateChoiceWeight(choice.id, parseInt(e.target.value))}
                    className="flex-1 h-1 bg-black/10 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer Controls */}
      {choices.length > 0 && (
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-[#fbfbfd] dark:bg-[#161617] flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1 font-medium">
            <span>{choices.length} options loaded</span>
            {useWeights && (
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                Total weight: {choices.reduce((sum, item) => sum + item.weight, 0)}x
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shuffleList}
              className="apple-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#86868b]" />
              Shuffle
            </button>
            <button
              onClick={sortAlphabetically}
              className="apple-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#86868b]" />
              Sort A-Z
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="apple-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#86868b]" />
              Export
            </button>
            <label className="apple-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3 cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-[#86868b]" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
