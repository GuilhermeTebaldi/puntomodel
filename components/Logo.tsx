
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 cursor-pointer group">
      <div
        className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/logo-puntoescort.png)', backgroundSize: '240%' }}
      />
      <span className="text-xl md:text-2xl font-bold text-[#e3262e] tracking-tight">
        Punto<span className="text-gray-400 font-medium">escort</span>
      </span>
    </div>
  );
};

export default Logo;
