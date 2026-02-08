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
  const { t, translateStatLabel, translateStatValue, list } = useI18n();
  const [stats, setStats] = useState(STATS);
  const [activeCard, setActiveCard] = useState(0);
  const overlayLines = t('hero.overlay').split('\n');
  const cardEntries = list('hero.cards');
  const cards = cardEntries
    .map((entry, index) => {
      const [title, desc, image] = entry.split('|');
      return {
        id: `${index}-${title || entry}`,
        title: (title || entry).trim(),
        desc: (desc || '').trim(),
        image: (image || '').trim(),
      };
    })
    .filter((card) => card.title);

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

  useEffect(() => {
    if (cards.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveCard((prev) => (prev + 1) % cards.length);
    }, 3500);
    return () => window.clearInterval(intervalId);
  }, [cards.length]);

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

          {cards.length > 0 && (
            <div className="mt-10 flex flex-col items-center lg:items-start">
              <div className="relative w-full max-w-md h-36 sm:h-40 lg:h-44">
                {Array.from({ length: Math.min(3, cards.length) }).map((_, stackIndex) => {
                  const index = (activeCard + stackIndex) % cards.length;
                  const card = cards[index];
                  const isActive = stackIndex === 0;
                  const translate = stackIndex * 10;
                  const scale = 1 - stackIndex * 0.05;
                  const opacity = isActive ? 1 : 0.35;
                  const zIndex = 30 - stackIndex;
                  const albumImages = [0, 1, 2]
                    .map((offset) => cards[(index + offset) % cards.length]?.image)
                    .filter(Boolean);
                  return (
                    <div
                      key={`${card.id}-${stackIndex}`}
                      className="absolute inset-0 transition-all duration-700 ease-out"
                      style={{
                        transform: `translateY(${translate}px) scale(${scale})`,
                        opacity,
                        zIndex,
                      }}
                    >
                      <div className="h-full flex items-center justify-center lg:justify-start">
                        <div className="relative w-55 h-40 sm:w-62 sm:h-45 lg:w-60 lg:h-50">
                          <div className="sm:hidden flex items-center justify-center gap-2 w-full h-full">
                            {albumImages.slice(0, 2).map((image, imageIndex) => (
                              <div
                                key={`${card.id}-album-mobile-${imageIndex}`}
                                className="w-1/2 h-full rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-100"
                              >
                                <img src={image as string} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {albumImages.length === 0 && (
                              <>
                                <div className="w-1/2 h-full rounded-2xl bg-red-50 text-[#e3262e] font-black flex items-center justify-center text-sm">
                                  0{index + 1}
                                </div>
                                <div className="w-1/2 h-full rounded-2xl bg-red-50 text-[#e3262e] font-black flex items-center justify-center text-sm">
                                  0{index + 2}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="hidden sm:block">
                            {albumImages.length > 0 ? (
                              albumImages.slice(0, 3).map((image, imageIndex) => (
                                <div
                                  key={`${card.id}-album-${imageIndex}`}
                                  className="absolute w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-100"
                                  style={{
                                    left: imageIndex * 16,
                                    top: imageIndex * 7,
                                    zIndex: 20 - imageIndex,
                                  }}
                                >
                                  <img src={image as string} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))
                            ) : (
                              <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl bg-red-50 text-[#e3262e] font-black flex items-center justify-center text-sm">
                                0{index + 1}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {cards.length > 1 && (
                <div className="mt-4 flex items-center gap-2">
                  {cards.map((card, index) => (
                    <button
                      key={`${card.id}-dot`}
                      onClick={() => setActiveCard(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeCard ? 'w-6 bg-[#e3262e]' : 'w-2 bg-gray-300'
                      }`}
                      aria-label={`Card ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
                src="https://i.pinimg.com/736x/74/1a/71/741a71a2b9b2e9d38eac7caf848baf7d.jpg" 
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
