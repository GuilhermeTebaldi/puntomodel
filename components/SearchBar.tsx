
import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../translations/i18n';

interface SearchBarProps {
  compact?: boolean;
  onSearch?: (query: string) => void;
}

const HISTORY_STORAGE_KEY = 'punto_city_search_history';
const HISTORY_EVENT = 'punto_city_search_history_updated';
const MAX_HISTORY = 6;

const SearchBar: React.FC<SearchBarProps> = ({ compact = false, onSearch }) => {
  const { t } = useI18n();
  const [query, setQuery] = React.useState('');
  const [history, setHistory] = React.useState<string[]>([]);
  const [isFocused, setIsFocused] = React.useState(false);
  const blurTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setHistory(detail);
      }
    };
    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setHistory(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      // ignore parse errors
    }
    window.addEventListener(HISTORY_EVENT, handleUpdate);
    return () => window.removeEventListener(HISTORY_EVENT, handleUpdate);
  }, []);

  const persistHistory = (next: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT, { detail: next }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const normalized = trimmed;
    const next = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(
      0,
      MAX_HISTORY
    );
    setHistory(next);
    persistHistory(next);
    if (normalized !== query) setQuery(normalized);
    if (onSearch) onSearch(normalized);
  };

  const filteredHistory = React.useMemo(() => {
    if (!history.length) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return history;
    return history.filter((item) => item.toLowerCase().includes(trimmed));
  }, [history, query]);

  const handleSelect = (value: string) => {
    setQuery(value);
    const next = [value, ...history.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(
      0,
      MAX_HISTORY
    );
    setHistory(next);
    persistHistory(next);
    if (onSearch) onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative group w-full ${compact ? 'max-w-2xl mx-auto' : ''}`}>
      <input 
        type="text" 
        placeholder={t('search.placeholder')} 
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
          setIsFocused(true);
        }}
        onBlur={() => {
          blurTimerRef.current = window.setTimeout(() => setIsFocused(false), 120);
        }}
        className={`w-full bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 transition-all text-gray-700 placeholder-gray-400 shadow-xl ${
          compact ? 'px-6 py-3 pr-14 text-sm' : 'px-8 py-5 pr-16 text-base'
        }`}
      />
      {isFocused && filteredHistory.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20">
          {filteredHistory.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelect(item);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      <button 
        type="submit"
        className={`absolute bg-[#e3262e] text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center shadow-md ${
          compact ? 'right-1.5 top-1.5 bottom-1.5 px-4' : 'right-2 top-2 bottom-2 p-3'
        }`}
      >
        <Search size={compact ? 18 : 24} />
        {compact && <span className="ml-2 hidden sm:inline text-xs font-bold uppercase tracking-wider">{t('search.button')}</span>}
      </button>
    </form>
  );
};

export default SearchBar;
