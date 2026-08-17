import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircleQuestion } from 'lucide-react';

type SourceOption = 'sms' | 'whatsapp' | 'models-club';

const BANNER_SOURCE_KEY = 'punto_source_banner_choice';

const sourceOptions: Array<{ id: SourceOption; label: string }> = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'models-club', label: 'Models-Club' },
];

const PANEL_WIDTH = 'min(220px, calc(100vw - 62px))';

const SourceDiscoveryBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceOption | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(BANNER_SOURCE_KEY);
    return stored === 'sms' || stored === 'whatsapp' || stored === 'models-club' ? stored : null;
  });

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
            transition: 'width 220ms ease',
            willChange: 'width',
          }}
        >
          <aside
            className="h-full overflow-hidden rounded-l-xl border border-[#f5d4d6] border-r-0 bg-white shadow-[0_8px_22px_rgba(0,0,0,0.12)]"
            style={{ width: PANEL_WIDTH }}
          >
            <div className="h-0.5 bg-gradient-to-r from-[#e3262e] via-[#f35a61] to-[#f7a9ad]" />
            <div className="p-2 md:p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-[#e3262e]">
                  <MessageCircleQuestion size={11} />
                </span>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#e3262e]">Punto Scort</p>
              </div>
              <p className="mt-1 text-[11px] font-bold leading-snug text-gray-900">
                Por onde voce ficou sabendo do Punto Scort?
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {sourceOptions.map((option) => {
                  const isSelected = selectedSource === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSource(option.id)}
                      className={`rounded-md border px-1 py-1 text-center text-[9px] font-semibold leading-tight transition-colors ${
                        isSelected
                          ? 'border-[#e3262e] bg-[#fff0f1] text-[#991b1b]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#f3a6aa] hover:bg-[#fff6f6]'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {selectedSource && <p className="mt-1 text-[9px] font-semibold text-[#c81d25]">Obrigado.</p>}
            </div>
          </aside>
        </div>
        <button
          type="button"
          aria-label={isOpen ? 'Recolher barra lateral' : 'Abrir barra lateral'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-[38px] rounded-l-xl rounded-r-none bg-[#e3262e] text-white shadow-[0_10px_22px_rgba(227,38,46,0.28)] flex flex-col items-center justify-center gap-0.5"
        >
          {isOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          <span className="text-[7px] font-black uppercase tracking-[0.08em] leading-tight text-center">Origem</span>
        </button>
      </div>
    </div>
  );
};

export default SourceDiscoveryBanner;
