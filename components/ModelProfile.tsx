
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MessageCircle, Phone, MapPin, CheckCircle2, ShieldCheck, Heart, Share2, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchModelMetrics, rateModel, trackModelEvent } from '../services/models';
import { getCurrentUser } from '../services/auth';
import { isModelSaved, toggleSavedModel } from '../services/savedModels';
import { useI18n } from '../translations/i18n';
import { getIdentityLabel } from '../translations';
import { getTranslationTarget } from '../services/translate';

const toWhatsappDigits = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
const toTelDigits = (phone?: string) => (phone ? phone.replace(/[^\d+]/g, '') : '');

interface ModelProfileProps {
  model: {
    id: string;
    name: string;
    age?: number | null;
    phone?: string;
    photos?: string[];
    bio?: string;
    bioTranslations?: Record<string, string>;
    bioLanguage?: string;
    services?: string[];
    prices?: Array<{ label: string; value: number }>;
    attributes?: {
      height?: string;
      weight?: string;
      eyes?: string;
      hair?: string;
      feet?: string;
      nationality?: string;
      audience?: string[];
      profileIdentity?: string;
    };
    location?: { city?: string; state?: string; lat?: number; lon?: number } | null;
    isOnline?: boolean;
    currency?: string;
  };
  onClose: () => void;
}

const ModelProfile: React.FC<ModelProfileProps> = ({ model, onClose }) => {
  const { t, translateError, translateService, translateHair, translateEyes, locale, language } = useI18n();
  const [metrics, setMetrics] = useState({
    viewsToday: 0,
    whatsappToday: 0,
    ratingAvg: 0,
    ratingCount: 0,
    estimatedEarningsMonth: 0,
  });
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState('');
  const [isSaved, setIsSaved] = useState(() => isModelSaved(model.id));
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);
  const nationalityLabel = useMemo(() => {
    const code = model.attributes?.nationality;
    if (!code) return t('profile.notInformed');
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') return code.toUpperCase();
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(code.toUpperCase()) ?? code.toUpperCase();
  }, [locale, model.attributes?.nationality, t]);
  const audienceLabel = useMemo(() => {
    const list = model.attributes?.audience;
    if (!list || !list.length) return t('profile.notInformed');
    const map: Record<string, string> = {
      men: t('common.audienceMen'),
      women: t('common.audienceWomen'),
      other: t('common.audienceOther'),
    };
    return list.map((item) => map[item] || item).join(', ');
  }, [model.attributes?.audience, t]);
  const profileIdentityLabel = useMemo(() => {
    const value = model.attributes?.profileIdentity;
    if (!value) return t('profile.notInformed');
    return getIdentityLabel(value, language);
  }, [language, model.attributes?.profileIdentity, t]);
  const telDigits = toTelDigits(model.phone);
  const whatsappDigits = toWhatsappDigits(model.phone);

  const photos = model.photos || [];
  const activePhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;
  const rawBio = (model.bio || '').trim();
  const targetLanguage = useMemo(() => getTranslationTarget(language), [language]);
  const bioSourceLanguage = useMemo(() => {
    if (typeof model.bioLanguage !== 'string') return null;
    const trimmed = model.bioLanguage.trim().toLowerCase();
    return trimmed || null;
  }, [model.bioLanguage]);
  const shouldTranslate = useMemo(() => {
    if (!bioSourceLanguage) return true;
    return bioSourceLanguage !== targetLanguage;
  }, [bioSourceLanguage, targetLanguage]);
  const cachedBio = useMemo(() => {
    const translations = model.bioTranslations;
    if (!translations) return null;
    const cached = translations[targetLanguage];
    if (typeof cached !== 'string') return null;
    const trimmed = cached.trim();
    return trimmed ? trimmed : null;
  }, [model.bioTranslations, targetLanguage]);


  const goNextPhoto = () => {
    if (!photos.length) return;
    setHasSwiped(true);
    setActivePhotoIndex((prev) => {
      const current = prev ?? 0;
      return (current + 1) % photos.length;
    });
  };

  const goPrevPhoto = () => {
    if (!photos.length) return;
    setHasSwiped(true);
    setActivePhotoIndex((prev) => {
      const current = prev ?? 0;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      goNextPhoto();
    } else {
      goPrevPhoto();
    }
  };

  useEffect(() => {
    trackModelEvent(model.id, 'view').catch(() => undefined);
  }, [model.id]);

  useEffect(() => {
    setIsSaved(isModelSaved(model.id));
  }, [model.id]);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchModelMetrics(model.id)
        .then((data) => {
          if (!mounted) return;
          setMetrics(data);
        })
        .catch(() => {
          // ignore metrics errors
        });
    };
    load();
    const intervalId = window.setInterval(load, 20000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [model.id]);

  useEffect(() => {
    if (activePhotoIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePhotoIndex(null);
        return;
      }
      if (event.key === 'ArrowRight') {
        goNextPhoto();
      }
      if (event.key === 'ArrowLeft') {
        goPrevPhoto();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePhotoIndex, photos.length]);

  useEffect(() => {
    if (activePhotoIndex === null) {
      setHasSwiped(false);
    }
  }, [activePhotoIndex]);

  const displayBio = rawBio
    ? (shouldTranslate && cachedBio ? cachedBio : rawBio)
    : t('dashboard.form.bioMissing');
  const showTranslatedBadge = rawBio && shouldTranslate && Boolean(cachedBio);

  const handleRate = async (value: number) => {
    setRatingSubmitting(true);
    setRatingError('');
    setRatingSuccess('');
    try {
      const user = getCurrentUser();
      await rateModel(model.id, value, user ? { id: user.id, name: user.name, email: user.email } : undefined);
      setRatingSuccess(t('profile.ratingThanks'));
      const updated = await fetchModelMetrics(model.id);
      setMetrics(updated);
    } catch (err) {
      setRatingError(err instanceof Error ? translateError(err.message) : t('errors.rate'));
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleToggleSave = () => {
    const result = toggleSavedModel(model.id);
    setIsSaved(result.saved);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-y-auto">
      {/* Profile Header Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-tighter">{model.name}</h2>
          <div className="flex items-center justify-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${model.isOnline === false ? 'bg-red-500' : 'bg-green-500'}`}></span>
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              {model.isOnline === false ? t('common.offlineNow') : t('common.onlineNow')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSave}
            className={`p-2 rounded-full transition-colors ${isSaved ? 'text-[#e3262e]' : 'text-gray-500 hover:bg-gray-100'}`}
            title={isSaved ? t('profile.saved') : t('profile.save')}
          >
            <Heart size={20} fill={isSaved ? '#e3262e' : 'none'} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full pb-32 md:pb-36">
        <div className="grid grid-cols-4 grid-rows-2 gap-1 md:gap-2 h-[400px] md:h-[600px] bg-gray-100">
          <div className="col-span-2 row-span-2 relative overflow-hidden">
            {model.photos?.[0] ? (
              <img
                src={model.photos[0]}
                alt={model.name}
                onClick={() => {
                  setHasSwiped(false);
                  setActivePhotoIndex(0);
                }}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-2 row-span-1 relative overflow-hidden">
            {model.photos?.[1] ? (
              <img
                src={model.photos[1]}
                onClick={() => {
                  setHasSwiped(false);
                  setActivePhotoIndex(1);
                }}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden">
            {model.photos?.[2] ? (
              <img
                src={model.photos[2]}
                onClick={() => {
                  setHasSwiped(false);
                  setActivePhotoIndex(2);
                }}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer">
            {model.photos?.[3] ? (
              <img
                src={model.photos[3]}
                onClick={() => {
                  setHasSwiped(false);
                  setActivePhotoIndex(3);
                }}
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">{t('profile.noPhoto')}</div>
            )}
            {model.photos?.length > 4 && (
              <span className="absolute text-white font-bold text-lg">+{model.photos.length - 4}</span>
            )}
          </div>
        </div>

        {/* Profile Info Content */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Main Identity */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative inline-block">
                  <img
                    src="/logo-puntoescort.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-24 md:w-28 opacity-10 pointer-events-none select-none"
                  />
                  <h1 className="relative text-3xl md:text-5xl font-black text-gray-900">
                    {model.name}{model.age ? `, ${model.age}` : ''}
                  </h1>
                </div>
                <div className="bg-[#e3262e] text-white p-1 rounded-full shadow-lg shadow-red-200">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-gray-500 font-medium">
                <span className="flex items-center gap-1"><MapPin size={16} className="text-[#e3262e]" /> {model.location?.city ? `${model.location.city}, ${model.location.state || ''}` : t('featured.locationMissing')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                <ShieldCheck className="text-blue-500" size={18} />
                <span className="text-xs font-bold text-gray-700 uppercase">{t('profile.verified')}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                <Star className="text-yellow-500" size={18} fill="currentColor" />
                <span className="text-xs font-bold text-gray-700 uppercase">
                  {(metrics.ratingAvg || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({metrics.ratingCount.toLocaleString(locale)})
                </span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Left Column - Details */}
            <div className="md:col-span-2 space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info size={20} className="text-[#e3262e]" />
                  {t('profile.about')}
                  {showTranslatedBadge && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {t('profile.bioTranslated')}
                    </span>
                  )}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {displayBio}
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart size={20} className="text-[#e3262e]" />
                  {t('profile.services')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(model.services?.length ? model.services : [t('profile.servicesMissing')]).map(service => (
                    <span key={service} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium">
                      {translateService(service)}
                    </span>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {t('profile.audienceTitle')}
                  </p>
                  <p className="text-sm font-bold text-gray-900">{audienceLabel}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {t('profile.identityTitle')}
                  </p>
                  <p className="text-sm font-bold text-gray-900">{profileIdentityLabel}</p>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-[#e3262e]" />
                  {t('profile.ratingsTitle')}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const filled = value <= Math.round(metrics.ratingAvg || 0);
                      return (
                        <Star
                          key={`avg-${value}`}
                          size={18}
                          className={filled ? 'text-yellow-500' : 'text-gray-200'}
                          fill={filled ? 'currentColor' : 'none'}
                        />
                      );
                    })}
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(metrics.ratingAvg || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t('profile.ratingCountLabel', { count: metrics.ratingCount.toLocaleString(locale) })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t('profile.rateProfile')}</p>
                <div className="flex items-center gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleRate(value)}
                      disabled={ratingSubmitting}
                      className="p-2 rounded-full text-yellow-500 hover:text-yellow-600 disabled:opacity-60"
                      aria-label={t('profile.rateAria', { count: value, star: value === 1 ? t('profile.starSingular') : t('profile.starPlural') })}
                    >
                      <Star size={22} fill="currentColor" />
                    </button>
                  ))}
                </div>
                {ratingError && <p className="text-xs text-red-500 mt-3">{ratingError}</p>}
                {ratingSuccess && <p className="text-xs text-green-600 mt-3">{ratingSuccess}</p>}
              </section>
            </div>

            {/* Right Column - Attributes */}
            <div className="space-y-8">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase mb-6 tracking-widest">{t('profile.attributesTitle')}</h4>
                <ul className="space-y-4">
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.heightLabel')}</span>
                    <span className="font-bold text-gray-900">{model.attributes?.height ? `${model.attributes.height}m` : t('profile.notInformed')}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.weightLabel')}</span>
                    <span className="font-bold text-gray-900">{model.attributes?.weight ? `${model.attributes.weight}kg` : t('profile.notInformed')}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.eyesLabel')}</span>
                    <span className="font-bold text-gray-900">{model.attributes?.eyes ? translateEyes(model.attributes?.eyes) : t('profile.notInformed')}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.hairLabel')}</span>
                    <span className="font-bold text-gray-900">{model.attributes?.hair ? translateHair(model.attributes?.hair) : t('profile.notInformed')}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.nationalityLabel')}</span>
                    <span className="font-bold text-gray-900">{nationalityLabel}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('dashboard.form.feetLabel')}</span>
                    <span className="font-bold text-gray-900">{model.attributes?.feet || t('profile.notInformed')}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase mb-6 tracking-widest">{t('profile.today')}</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-500">{t('profile.views')}</span>
                    <span className="font-bold text-gray-900">{metrics.viewsToday.toLocaleString(locale)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-500">{t('profile.whatsappClicks')}</span>
                    <span className="font-bold text-gray-900">{metrics.whatsappToday.toLocaleString(locale)}</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-[#e3262e]/5 rounded-3xl border border-[#e3262e]/10">
                <p className="text-[10px] font-black text-[#e3262e] uppercase mb-2">{t('profile.importantNotice')}</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('profile.importantNoticeBody')}
                  
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Contact Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 md:p-6 flex items-center justify-center gap-3 z-[410]">
        {model.phone ? (
          <>
            <a 
              href={`tel:${telDigits}`}
              className="flex-1 max-w-xs bg-gray-900 text-white py-4 md:py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 uppercase text-xs md:text-sm tracking-widest"
            >
              <Phone size={18} />
              {t('profile.callNow')}
            </a>
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackModelEvent(model.id, 'whatsapp').catch(() => undefined)}
              className="flex-1 max-w-xs bg-[#25D366] text-white py-4 md:py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-green-100 uppercase text-xs md:text-sm tracking-widest"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </>
        ) : (
          <span className="text-xs text-gray-400 font-semibold">{t('profile.contactMissing')}</span>
        )}
      </div>

      {activePhoto && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
          <style>
            {`
              @keyframes swipe-hint {
                0% { transform: translateX(-16px); opacity: 0.35; }
                50% { transform: translateX(16px); opacity: 0.8; }
                100% { transform: translateX(-16px); opacity: 0.35; }
              }
            `}
          </style>
          <div className="absolute inset-0 bg-black/80" onClick={() => setActivePhotoIndex(null)} />
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={22} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={goPrevPhoto}
                className="absolute left-4 md:left-8 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label={t('common.back')}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goNextPhoto}
                className="absolute right-4 md:right-8 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label={t('common.nextStep')}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <img
            src={activePhoto}
            alt={model.name}
            className="relative max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
          {photos.length > 1 && !hasSwiped && (
            <div className="sm:hidden absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div
                className="flex items-center gap-4 text-white/90 text-4xl"
                style={{ animation: 'swipe-hint 2.4s ease-in-out infinite' }}
              >
                <span className="text-4xl">👈🏻</span>
                <span className="text-4xl">⇆ </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelProfile;
