import React from 'react';
import type { DrawResult } from '../types';
import { Clock, Trash2 } from 'lucide-react';

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
    <div className="apple-card rounded-[24px] w-full overflow-hidden flex flex-col max-h-[300px] transition-colors">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#86868b]" />
          <h3 className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Decision Log
          </h3>
          {history.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#86868b]">
              {history.length}
            </span>
          )}
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="apple-btn-secondary px-2.5 py-1 text-[11px] font-medium rounded-full text-[#86868b] hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 min-h-[100px]">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#86868b]">
            <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">No recorded outcomes</p>
            <p className="text-[11px] text-[#86868b] mt-0.5">Outcomes from active simulations appear here.</p>
          </div>
        ) : (
          [...history].reverse().map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: result.choice.color }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {result.choice.text}
                  </span>
                  <span className="text-[10px] text-[#86868b]">
                    via {result.generator}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-[#86868b] font-mono px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06]">
                {formatTime(result.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
