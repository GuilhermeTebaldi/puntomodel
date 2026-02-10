// home 
import React, { useEffect, useState } from 'react';
import { STATS } from '../constants';
import SearchBar from './SearchBar';
import { fetchStats } from '../services/models';
import { useI18n } from '../translations/i18n';

interface HeroProps {
  onSearch: (query: string) => void;
  onRegisterClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch, onRegisterClick }) => {
  const { t, translateStatLabel, translateStatValue } = useI18n();
  const [stats, setStats] = useState(STATS);
  const overlayLines = t('hero.overlay').split('\n');

  useEffect(() => {
    let mounted = true;
    fetchStats()
      .then((data) => {
        if (!mounted) return;
        setStats(data);
      })
      .catch(() => {
        // keep fallback stats
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden pt-8 md:pt-16 pb-20 px-4">
      {/* Background Watermark Butterfly */}
      <div className="absolute top-10 left-[-10%] opacity-[0.03] select-none pointer-events-none transform -rotate-12">
        <svg width="600" height="600" viewBox="0 0 100 100" className="text-[#e3262e] fill-current">
          <path d="M50 50 C20 20 10 60 50 80 C90 60 80 20 50 50" />
          <path d="M50 50 C20 80 10 40 50 20 C90 40 80 80 50 50" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="z-10 text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-[#111827]">
            {t('hero.titleBefore')} <span className="text-[#e3262e]">{t('hero.titleHighlight')}</span> {t('hero.titleAfter')}
          </h1>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap gap-4 md:gap-8 justify-center lg:justify-start">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-[#111827]">{translateStatValue(stat.value)}</span>
                <span className="text-xs md:text-sm text-gray-500 font-medium whitespace-nowrap">{translateStatLabel(stat.label)}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-xl mx-auto lg:mx-0">
            <SearchBar onSearch={onSearch} />
          </div>
        </div>

        {/* Right Content - Model Image */}
        <div className="relative z-10 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-lg">
            {/* Red Circle Background Shape */}
            <div className="absolute bottom-0 left-0 right-0 h-[80%] bg-transparent border-[3px] border-red-500 rounded-full transform scale-110 opacity-20 -z-10"></div>
            <div className="absolute -bottom-10 right-0 w-72 h-72 bg-red-100 rounded-full blur-3xl opacity-30 -z-20"></div>
            
            <div className="relative">
              {/* FAKE_DATA: imagem ilustrativa fixa; substituir por asset/coleção real */}
              <img 
                src="https://i.pinimg.com/1200x/15/89/d9/1589d9d5678234a4fc62d25dbf940448.jpg" 
                alt={t('hero.imageAlt')} 
                className="w-full h-auto rounded-b-[100px] object-cover"
              />
              
              {/* T-shirt Text Overlay Simulation */}
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-full text-center">
                 <p className="text-white/90 font-bold text-xl md:text-3xl leading-tight mix-blend-overlay px-12 italic">
                   {overlayLines.map((line, index) => (
                     <React.Fragment key={`${line}-${index}`}>
                       {line}
                       {index < overlayLines.length - 1 && <br />}
                     </React.Fragment>
                   ))}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
