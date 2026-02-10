// home 
import React from 'react';
import SearchBar from './SearchBar';
import { useI18n } from '../translations/i18n';

interface HeroProps {
  onSearch: (query: string) => void;
  onRegisterClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch, onRegisterClick }) => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden pt-8 md:pt-16 pb-20 px-4">
      {/* Background Watermark Butterfly */}
      <div className="absolute top-10 left-[-10%] opacity-[0.03] select-none pointer-events-none transform -rotate-12">
        <svg width="600" height="600" viewBox="0 0 100 100" className="text-[#e3262e] fill-current">
          <path d="M50 50 C20 20 10 60 50 80 C90 60 80 20 50 50" />
          <path d="M50 50 C20 80 10 40 50 20 C90 40 80 80 50 50" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto grid gap-12 items-center">
        {/* Left Content */}
        <div className="z-20 text-center lg:text-left">
          <div className="relative inline-block">
            <img
              src="/hero-text-bg.png"
              alt=""
              aria-hidden="true"
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-[420px] sm:w-[520px] md:w-[640px] lg:left-auto lg:right-0 lg:top-1/2 lg:translate-x-[55%] lg:-translate-y-1/2 opacity-15 pointer-events-none select-none"
            />
            <h1 className="relative text-4xl md:text-6xl font-extrabold leading-tight text-[#111827]">
              {t('hero.titleBefore')}{' '}
              <span className="text-[#e3262e]">{t('hero.titleHighlight')}</span>{' '}
              {t('hero.titleAfter')}
            </h1>
          </div>

          <div className="mt-12 max-w-xl mx-auto lg:mx-0">
            <SearchBar onSearch={onSearch} />
          </div>
        </div>

        {/* Right content removed per request */}
      </div>
    </section>
  );
};

export default Hero;
