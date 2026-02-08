import React from 'react';
import { Heart } from 'lucide-react';
import { ModelProfileData, isBillingActive } from '../services/models';
import { useI18n } from '../translations/i18n';

interface ModelCardProps {
  model: ModelProfileData;
  onClick: () => void;
  showSave?: boolean;
  isSaved?: boolean;
  onToggleSave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, onClick, showSave = false, isSaved = false, onToggleSave }) => {
  const { t, translateService } = useI18n();
  const isOnline = model.isOnline !== false;
  const isPremium = isBillingActive(model.billing);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer border border-gray-100"
    >
      <div className="relative aspect-[3/4] bg-gray-100">
        {model.photos?.[0] ? (
          <img
            src={model.photos[0]}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            alt={model.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            {t('featured.noPhoto')}
          </div>
        )}

        {showSave && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleSave?.(event);
            }}
            className="absolute top-3 right-3 p-2 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white hover:text-[#e3262e] transition-all z-20"
          >
            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isPremium && (
            <div className="bg-[#e3262e] text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-red-500/30">
              {t('common.premium')}
            </div>
          )}
          <div
            className={`text-white text-[10px] font-bold px-2 py-1 rounded uppercase ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {isOnline ? t('common.online') : t('common.offline')}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-lg">
            {model.name}
            {model.age ? `, ${model.age}` : ''}
          </h4>
        </div>
        <p className="text-gray-500 text-sm mb-3">
          {model.location?.city ? `${model.location.city}, ${model.location.state || ''}` : t('featured.locationMissing')}
        </p>
        <div className="flex gap-2 flex-wrap">
          {model.services?.slice(0, 2).map((service) => (
            <span key={service} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {translateService(service)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
