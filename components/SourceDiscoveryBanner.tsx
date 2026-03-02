import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircleQuestion } from 'lucide-react';

type SourceOption = 'sms' | 'whatsapp' | 'models-club';

const BANNER_OPEN_KEY = 'punto_source_banner_open';
const BANNER_SOURCE_KEY = 'punto_source_banner_choice';

const sourceOptions: Array<{ id: SourceOption; label: string }> = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'models-club', label: 'Models-Club' },
];
const PANEL_WIDTH = 'min(250px, calc(100vw - 56px))';

const SourceDiscoveryBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(BANNER_OPEN_KEY) !== '0';
  });
  const [selectedSource, setSelectedSource] = useState<SourceOption | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(BANNER_SOURCE_KEY);
    return stored === 'sms' || stored === 'whatsapp' || stored === 'models-club' ? stored : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(BANNER_OPEN_KEY, isOpen ? '1' : '0');
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedSource) return;
    window.localStorage.setItem(BANNER_SOURCE_KEY, selectedSource);
  }, [selectedSource]);

  return (
    <div className="fixed right-0 bottom-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-[75] pointer-events-none">
      <div className="pointer-events-auto flex items-stretch">
        <div
          className="overflow-hidden"
          style={{
            width: isOpen ? PANEL_WIDTH : '0px',
            transition: 'width 240ms ease',
            willChange: 'width',
          }}
        >
          <aside
            className="h-full overflow-hidden rounded-l-xl border border-[#f7b8bc] border-r-0 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
            style={{ width: PANEL_WIDTH }}
          >
            <div className="h-1 bg-[#e3262e]" />
            <div className="p-2.5 md:p-3">
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-[#e3262e]">
                  <MessageCircleQuestion size={12} />
                </span>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#e3262e]">Punto Scort</p>
              </div>
              <p className="mt-1.5 text-[12px] font-bold leading-snug text-gray-900">
                Por onde voce ficou sabendo do Punto Scort?
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {sourceOptions.map((option) => {
                  const isSelected = selectedSource === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSource(option.id)}
                      className={`rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold leading-tight transition-colors ${
                        isSelected
                          ? 'border-[#e3262e] bg-red-50 text-[#991b1b]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#f3a6aa] hover:bg-red-50/70'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {selectedSource && (
                <p className="mt-1.5 text-[10px] font-semibold text-[#e3262e]">
                  Obrigado.
                </p>
              )}
            </div>
          </aside>
        </div>
        <button
          type="button"
          aria-label={isOpen ? 'Recolher barra lateral' : 'Abrir barra lateral'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-[42px] rounded-l-xl rounded-r-none bg-[#e3262e] text-white shadow-[0_10px_22px_rgba(227,38,46,0.3)] flex flex-col items-center justify-center gap-0.5"
        >
          {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          <span className="text-[8px] font-black uppercase tracking-[0.08em] leading-tight text-center">Origem</span>
        </button>
      </div>
    </div>
  );
};

export default SourceDiscoveryBanner;
