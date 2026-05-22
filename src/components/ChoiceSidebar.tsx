import React, { useState } from 'react';
import type { Choice } from '../types';
import { 
  Plus, Trash2, Sparkles, Scale, Info, RefreshCw, Upload, Download 
} from 'lucide-react';

interface ChoiceSidebarProps {
  choices: Choice[];
  setChoices: React.Dispatch<React.SetStateAction<Choice[]>>;
  useWeights: boolean;
  setUseWeights: (val: boolean) => void;
}

const HARMONIZED_COLORS = [
  '#ef4444', // Rose Red
  '#f97316', // Orange
  '#f59e0b', // Amber/Yellow
  '#10b981', // Emerald Green
  '#06b6d4', // Cyan
  '#3b82f6', // Bright Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet Purple
  '#d946ef', // Magenta Pink
  '#ec4899', // Rose Pink
];

const PRESETS: Record<string, { text: string; color: string; weight: number }[]> = {
  'food': [
    { text: 'Pizza 🍕', color: '#ef4444', weight: 1 },
    { text: 'Sushi 🍣', color: '#06b6d4', weight: 1 },
    { text: 'Burger 🍔', color: '#f59e0b', weight: 1 },
    { text: 'Tacos 🌮', color: '#f97316', weight: 1 },
    { text: 'Salad 🥗', color: '#10b981', weight: 1 },
    { text: 'Pasta 🍝', color: '#8b5cf6', weight: 1 },
  ],
  'yes_no': [
    { text: 'YES 👍', color: '#10b981', weight: 1 },
    { text: 'NO 👎', color: '#ef4444', weight: 1 },
  ],
  'coin': [
    { text: 'Heads 🪙', color: '#f59e0b', weight: 1 },
    { text: 'Tails 🥈', color: '#6366f1', weight: 1 },
  ],
  'dice': [
    { text: 'One (1) ⚀', color: '#ef4444', weight: 1 },
    { text: 'Two (2) ⚁', color: '#f97316', weight: 1 },
    { text: 'Three (3) ⚂', color: '#f59e0b', weight: 1 },
    { text: 'Four (4) ⚃', color: '#10b981', weight: 1 },
    { text: 'Five (5) ⚄', color: '#3b82f6', weight: 1 },
    { text: 'Six (6) ⚅', color: '#8b5cf6', weight: 1 },
  ],
  'who_pays': [
    { text: 'You Pay! 🫵', color: '#f59e0b', weight: 1 },
    { text: 'I Pay... 💸', color: '#3b82f6', weight: 1 },
    { text: 'Split the Bill 💳', color: '#8b5cf6', weight: 1 },
    { text: 'Run Away! 🏃‍♂️', color: '#ef4444', weight: 1 },
  ],
};

export const ChoiceSidebar: React.FC<ChoiceSidebarProps> = ({
  choices,
  setChoices,
  useWeights,
  setUseWeights,
}) => {
  const [inputText, setInputText] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');

  const addChoice = (textToAdd: string = inputText) => {
    const trimmed = textToAdd.trim();
    if (!trimmed) return;

    setChoices((prev) => {
      const matchIndex = prev.findIndex(
        (c) => c.text.toLowerCase() === trimmed.toLowerCase()
      );
      if (matchIndex !== -1) {
        // Increase weight of existing choice
        return prev.map((c, idx) =>
          idx === matchIndex ? { ...c, weight: Math.min(10, c.weight + 1) } : c
        );
      } else {
        // Add new choice
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
    // Split by newlines, commas, or semicolons
    const lines = bulkText.split(/[\n,;]+/);
    
    setChoices((prev) => {
      let currentChoices = [...prev];
      lines.forEach((line) => {
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
            const colorIndex = currentChoices.length % HARMONIZED_COLORS.length;
            currentChoices.push({
              id: Math.random().toString(36).substring(2, 9),
              text: trimmed,
              color: HARMONIZED_COLORS[colorIndex],
              weight: 1,
            });
          }
        }
      });
      return currentChoices;
    });
    setBulkText('');
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
    if (presetKey === '') return;
    const presetData = PRESETS[presetKey];
    if (presetData) {
      const mapped = presetData.map((item) => ({
        id: Math.random().toString(36).substring(2, 9),
        ...item,
      }));
      setChoices(mapped);
    }
  };

  const clearAll = () => {
    setChoices([]);
  };

  const shuffleList = () => {
    setChoices((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(choices));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "decidely_choices.json");
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
          const validated = parsed.map((item: Record<string, unknown>) => ({
            id: typeof item.id === 'string' ? item.id : Math.random().toString(36).substring(2, 9),
            text: typeof item.text === 'string' ? item.text : 'Choice',
            color: typeof item.color === 'string' ? item.color : '#8b5cf6',
            weight: typeof item.weight === 'number' ? item.weight : 1,
          }));
          setChoices(validated);
        }
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-panel w-full lg:w-96 flex flex-col h-full shrink-0 border-r border-white/5">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]/20">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Decision Board
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Input your options below</p>
        </div>
        <button 
          onClick={clearAll}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 font-semibold transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Presets and Global Settings */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Load Quick Preset
          </label>
          <select 
            onChange={(e) => {
              loadPreset(e.target.value);
              e.target.value = ''; // Reset select
            }}
            className="w-full bg-[#1c1c1e]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">Select a template...</option>
            <option value="yes_no">Yes / No 👍👎</option>
            <option value="coin">Coin Flip 🪙</option>
            <option value="food">What to Eat? 🍕🍣🍔</option>
            <option value="dice">Roll a Die ⚀⚅</option>
            <option value="who_pays">Who Pays the Bill? 💸</option>
          </select>
        </div>

        {/* Weights Toggle */}
        <div className="flex items-center justify-between bg-[#1c1c1e]/40 p-2.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Custom Weights</span>
          </div>
          <button
            onClick={() => setUseWeights(!useWeights)}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              useWeights ? 'bg-[#30d158]' : 'bg-[#3a3a3c]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                useWeights ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* iOS-Style Segmented Control for input mode */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="segmented-control flex p-0.5">
          <button
            onClick={() => setActiveMode('single')}
            className={`flex-1 py-1.5 text-[10px] font-bold text-center segmented-button cursor-pointer ${
              activeMode === 'single' ? 'segmented-button-active text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Single Option
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`flex-1 py-1.5 text-[10px] font-bold text-center segmented-button cursor-pointer ${
              activeMode === 'bulk' ? 'segmented-button-active text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Bulk Paste
          </button>
        </div>

        {activeMode === 'single' ? (
          <div className="relative">
            <input
              type="text"
              placeholder="Add choice... (e.g. Pizza)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={35}
              className="w-full bg-[#1c1c1e]/60 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500/50 transition-all"
            />
            <button
              onClick={() => addChoice()}
              disabled={!inputText.trim()}
              className="absolute right-1 top-1 p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              placeholder="Paste choices here... (separated by commas or newlines)"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={3}
              className="w-full bg-[#1c1c1e]/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500/50 transition-all resize-none"
            />
            <button
              onClick={addBulkChoices}
              disabled={!bulkText.trim()}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-30 cursor-pointer mac-btn"
            >
              Batch Add Choices
            </button>
          </div>
        )}
      </div>

      {/* Choices Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {choices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Info className="w-6 h-6 text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-400">Board is empty</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Add choices above or load a quick preset to get started!
            </p>
          </div>
        ) : (
          choices.map((choice) => (
            <div 
              key={choice.id}
              className="group flex flex-col gap-2 p-3 bg-[#1c1c1e]/40 hover:bg-[#1c1c1e]/70 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 shadow-sm"
              style={{ 
                '--choice-color': choice.color, 
                '--choice-color-glow': `${choice.color}1a` 
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                {/* Visual Color Dot Picker */}
                <div className="relative group/color shrink-0">
                  <input
                    type="color"
                    value={choice.color}
                    onChange={(e) => updateChoiceColor(choice.id, e.target.value)}
                    className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer z-10"
                  />
                  <div 
                    className="w-5.5 h-5.5 rounded-full border border-white/10 shadow-inner transition-transform group-hover/color:scale-110"
                    style={{ backgroundColor: choice.color }}
                  />
                </div>

                {/* Edit Text */}
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) => updateChoiceText(choice.id, e.target.value)}
                  className="flex-1 bg-transparent text-xs text-slate-200 font-semibold border-b border-transparent hover:border-white/10 focus:border-purple-500/50 py-0.5 outline-none transition-colors"
                />

                {/* Delete Button */}
                <button
                  onClick={() => removeChoice(choice.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Weight Slider (Conditional) */}
              {useWeights && (
                <div className="flex items-center gap-3 pt-1.5 border-t border-white/5 mt-0.5">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider shrink-0 w-12">
                    Weight: {choice.weight}x
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={choice.weight}
                    onChange={(e) => updateChoiceWeight(choice.id, parseInt(e.target.value))}
                    className="flex-1 h-1 bg-[#2c2c2e] rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer Controls */}
      {choices.length > 0 && (
        <div className="p-4 border-t border-white/5 bg-[#1c1c1e]/15 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-semibold">
            <span>{choices.length} options loaded</span>
            {useWeights && (
              <span className="text-purple-400">
                Total weight: {choices.reduce((sum, item) => sum + item.weight, 0)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={shuffleList}
              className="flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl bg-[#2c2c2e]/60 hover:bg-[#2c2c2e]/90 border border-white/5 text-slate-300 font-semibold transition-all cursor-pointer mac-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Shuffle
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl bg-[#2c2c2e]/60 hover:bg-[#2c2c2e]/90 border border-white/5 text-slate-300 font-semibold transition-all cursor-pointer mac-btn"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
          <label className="flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 font-bold transition-all cursor-pointer text-center mac-btn">
            <Upload className="w-3.5 h-3.5" />
            Import Choices
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};
