
import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../translations/i18n';

interface SearchBarProps {
  compact?: boolean;
  onSearch?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ compact = false, onSearch }) => {
  const { t } = useI18n();
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative group w-full ${compact ? 'max-w-2xl mx-auto' : ''}`}>
      <input 
        type="text" 
        placeholder={t('search.placeholder')} 
        value={query}
        onChange={(event) => setQuery(event.target.value)}
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
