
import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../translations/i18n';

interface SearchBarProps {
  compact?: boolean;
  onSearch?: (query: string) => void;
}

const SEARCH_STORAGE_KEY = 'punto_city_search';
const SEARCH_EVENT = 'punto_city_search_updated';

const SearchBar: React.FC<SearchBarProps> = ({ compact = false, onSearch }) => {
  const { t } = useI18n();
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SEARCH_STORAGE_KEY);
    if (saved !== null) {
      setQuery(saved);
    }
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setQuery(detail);
      }
    };
    window.addEventListener(SEARCH_EVENT, handleUpdate);
    return () => window.removeEventListener(SEARCH_EVENT, handleUpdate);
  }, []);

  const persistQuery = (value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SEARCH_STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed !== query) {
      setQuery(trimmed);
    }
    persistQuery(trimmed);
    if (onSearch) onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative group w-full ${compact ? 'max-w-2xl mx-auto' : ''}`}>
      <input 
        type="text" 
        placeholder={t('search.placeholder')} 
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          persistQuery(value);
        }}
        className={`w-full bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 transition-all text-gray-700 placeholder-gray-400 shadow-xl ${
          compact ? 'px-6 py-3 pr-14 text-sm' : 'px-8 py-5 pr-16 text-base'
        }`}
      />
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
