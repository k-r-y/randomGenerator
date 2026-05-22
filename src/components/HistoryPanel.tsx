import React from 'react';
import type { DrawResult } from '../types';
import { Clock, Trash2, Award, Sparkles } from 'lucide-react';

interface HistoryPanelProps {
  history: DrawResult[];
  clearHistory: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 w-full overflow-hidden flex flex-col max-h-[300px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/20">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Drawing History
        </h3>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[100px]">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-5 h-5 text-slate-600 mb-1" />
            <p className="text-xs text-slate-500">No entries recorded yet.</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Let's spin a wheel or start a race!</p>
          </div>
        ) : (
          [...history].reverse().map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-2.5 bg-slate-900/35 border border-slate-800/40 rounded-xl hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-inner animate-pulse shrink-0"
                  style={{ backgroundColor: result.choice.color }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    {result.choice.text}
                    <Award className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    via {result.generator}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-950/40 py-1 px-2.5 rounded-lg border border-slate-800/30">
                {formatTime(result.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
