import React, { useState } from 'react';
import { PRESET_CATEGORIES, type PresetChoice } from '../data/presets';
import { 
  X, Search, Compass, Utensils, GraduationCap, Dices, ArrowRight, Bookmark, Trash2, FolderPlus, Check 
} from 'lucide-react';
import type { Choice } from '../types';
import { MAX_CHOICES } from '../types';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (items: PresetChoice[]) => void;
  currentChoices: Choice[];
}

export interface SavedList {
  id: string;
  name: string;
  createdAt: number;
  items: PresetChoice[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Compass,
  Utensils,
  GraduationCap,
  Dices,
};

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  currentChoices,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'saved'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newListName, setNewListName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Saved lists from localStorage
  const [savedLists, setSavedLists] = useState<SavedList[]>(() => {
    try {
      const data = localStorage.getItem('decidely_custom_lists');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleSaveCurrentList = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed || currentChoices.length === 0) return;

    const newList: SavedList = {
      id: Math.random().toString(36).substring(2, 9),
      name: trimmed,
      createdAt: Date.now(),
      items: currentChoices.slice(0, MAX_CHOICES).map((c) => ({
        text: c.text,
        color: c.color,
        weight: c.weight,
      })),
    };

    const updated = [newList, ...savedLists];
    setSavedLists(updated);
    localStorage.setItem('decidely_custom_lists', JSON.stringify(updated));
    setNewListName('');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleDeleteSavedList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedLists.filter((l) => l.id !== id);
    setSavedLists(updated);
    localStorage.setItem('decidely_custom_lists', JSON.stringify(updated));
  };

  // Filter categories
  const filteredCategories = PRESET_CATEGORIES.filter((category) => {
    if (selectedCategory !== 'all' && category.id !== selectedCategory) {
      return false;
    }
    return true;
  });

  const matchingPresets: { categoryId: string; key: string; title: string; description: string; items: PresetChoice[] }[] = [];

  filteredCategories.forEach((cat) => {
    Object.entries(cat.presets).forEach(([key, preset]) => {
      const matchesSearch = 
        !searchQuery ||
        preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.items.some((item) => item.text.toLowerCase().includes(searchQuery.toLowerCase()));

      if (matchesSearch) {
        matchingPresets.push({
          categoryId: cat.id,
          key,
          title: preset.title,
          description: preset.description,
          items: preset.items,
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-xl z-[10050] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.18)] flex flex-col max-h-[88vh] overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
              Preset Templates & Saved Lists
            </h2>
            <p className="text-xs text-[#86868b] mt-0.5">
              Select pre-built templates or manage your own customized choice collections.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch & Search */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.06] w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-white dark:bg-zinc-800 text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Templates ({matchingPresets.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white dark:bg-zinc-800 text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              My Saved Lists ({savedLists.length})
            </button>
          </div>

          {activeTab === 'templates' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-4 py-1.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-xs text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] outline-none focus:border-violet-600 transition-all"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'templates' ? (
            <div className="flex flex-col gap-5">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'apple-btn-primary'
                      : 'apple-btn-secondary'
                  }`}
                >
                  All
                </button>
                {PRESET_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] || Compass;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'apple-btn-primary'
                          : 'apple-btn-secondary'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Grid of matching presets */}
              {matchingPresets.length === 0 ? (
                <div className="py-12 text-center text-[#86868b]">
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">No templates found matching "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try searching for food, numbers, or games.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {matchingPresets.map((preset) => (
                    <div
                      key={preset.key}
                      onClick={() => {
                        onSelectPreset(preset.items.slice(0, MAX_CHOICES));
                        onClose();
                      }}
                      className="group p-4 apple-card rounded-2xl hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {preset.title}
                          </h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#86868b]">
                            {preset.items.length} items
                          </span>
                        </div>
                        <p className="text-xs text-[#86868b] mt-1 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      {/* Items preview pills */}
                      <div className="mt-3.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-wrap gap-1.5 items-center">
                        {preset.items.slice(0, 4).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7]"
                          >
                            {item.text}
                          </span>
                        ))}
                        {preset.items.length > 4 && (
                          <span className="text-[10px] text-[#86868b] font-medium px-1">
                            +{preset.items.length - 4}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform">
                          Select <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* My Saved Lists Tab */
            <div className="flex flex-col gap-6">
              {/* Save current board form */}
              <form onSubmit={handleSaveCurrentList} className="p-4 apple-card rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Save Current Pool to My Lists</span>
                  <span className="text-[10px] text-[#86868b]">({currentChoices.length} items on board)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Enter list title (e.g. Sprint Backlog, Team Standup)..."
                    className="flex-1 px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-xs text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] outline-none focus:border-violet-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newListName.trim() || currentChoices.length === 0}
                    className="apple-btn-primary px-5 py-2 text-xs font-semibold rounded-full disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
                {saveSuccessMsg && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> List saved successfully
                  </p>
                )}
              </form>

              {/* Saved list records */}
              {savedLists.length === 0 ? (
                <div className="py-12 text-center text-[#86868b]">
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">No custom lists saved yet</p>
                  <p className="text-xs text-[#86868b] mt-1">
                    Save your custom choices above to quickly reload them anytime.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {savedLists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => {
                        onSelectPreset(list.items.slice(0, MAX_CHOICES));
                        onClose();
                      }}
                      className="group p-4 apple-card rounded-2xl hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {list.name}
                          </h3>
                          <span className="text-[10px] text-[#86868b] block mt-0.5">
                            {new Date(list.createdAt).toLocaleDateString()} • {list.items.length} choices
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSavedList(list.id, e)}
                          title="Delete saved list"
                          className="p-1.5 text-[#86868b] hover:text-red-500 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Items preview pills */}
                      <div className="mt-3.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-wrap gap-1.5 items-center">
                        {list.items.slice(0, 4).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{ 
                              backgroundColor: `${item.color}15`, 
                              color: item.color,
                              borderColor: `${item.color}35`
                            }}
                          >
                            {item.text}
                          </span>
                        ))}
                        {list.items.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-bold px-1.5">
                            +{list.items.length - 4} more
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                          Load <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-zinc-900 flex items-center justify-between text-xs text-slate-500">
          <span>Decidely Preset Library</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-white font-bold rounded-xl transition-all cursor-pointer btn-press"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
