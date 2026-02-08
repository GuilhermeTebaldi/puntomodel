
import React from 'react';
import SearchBar from './SearchBar';

interface StickySearchProps {
  onSearch: (query: string) => void;
}

const StickySearch: React.FC<StickySearchProps> = ({ onSearch }) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-b border-gray-100 py-2.5 px-4 shadow-xl transition-all duration-300">
      <SearchBar compact={true} onSearch={onSearch} />
    </div>
  );
};

export default StickySearch;
