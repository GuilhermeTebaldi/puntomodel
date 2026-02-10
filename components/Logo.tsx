
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 cursor-pointer group">
      <div
        className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/logo-puntoescort.png)', backgroundSize: '220%' }}
      />
      <span className="text-lg md:text-xl font-bold text-[#e3262e] tracking-tight">
        Punto<span className="text-gray-400 font-medium">escort</span>
      </span>
    </div>
  );
};

export default Logo;
