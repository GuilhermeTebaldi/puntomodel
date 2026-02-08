
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 cursor-pointer group">
      <div className="relative w-8 h-8 md:w-10 md:h-10">
        {/* Simplified butterfly-like logo using SVG shapes */}
        <svg viewBox="0 0 100 100" className="w-full h-full text-[#e3262e] fill-current">
          <path d="M50 50 C20 20 10 60 50 80 C90 60 80 20 50 50" />
          <path d="M50 50 C20 80 10 40 50 20 C90 40 80 80 50 50" />
        </svg>
      </div>
      <span className="text-xl md:text-2xl font-bold text-[#e3262e] tracking-tight">
        Punto<span className="text-gray-400 font-medium">model</span>
      </span>
    </div>
  );
};

export default Logo;
