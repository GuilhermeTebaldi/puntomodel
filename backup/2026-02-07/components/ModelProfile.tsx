
import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Phone, MapPin, CheckCircle2, ShieldCheck, Heart, Share2, Info, Clock, Star } from 'lucide-react';
import { createModelComment, fetchModelComments, fetchModelMetrics, rateModel, trackModelEvent } from '../services/models';
import { useI18n } from '../translations/i18n';

interface ModelProfileProps {
  model: {
    id: string;
    name: string;
    age?: number | null;
    phone?: string;
    photos?: string[];
    bio?: string;
    services?: string[];
    prices?: Array<{ label: string; value: number }>;
    attributes?: {
      height?: string;
      weight?: string;
      eyes?: string;
      hair?: string;
      feet?: string;
    };
    location?: { city?: string; state?: string; lat?: number; lon?: number } | null;
    isOnline?: boolean;
    currency?: string;
  };
  onClose: () => void;
}

const ModelProfile: React.FC<ModelProfileProps> = ({ model, onClose }) => {
  const { t, translateError, translateService, translatePriceLabel, translateHair, translateEyes, locale, getPriceId } = useI18n();
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
  const [comments, setComments] = useState<Array<{ id: string; name: string; message: string; createdAt: string }>>([]);
  const [commentName, setCommentName] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState(model.currency || 'BRL');

  useEffect(() => {
    trackModelEvent(model.id, 'view').catch(() => undefined);
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
    if (model.currency) {
      setDisplayCurrency(model.currency);
      return;
    }
    const lat = model.location?.lat;
    const lon = model.location?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') return;

    const resolveCurrency = (countryCode?: string) => {
      const code = (countryCode || '').toUpperCase();
      const map: Record<string, string> = {
        BR: 'BRL',
        PT: 'EUR',
        ES: 'EUR',
        FR: 'EUR',
        IT: 'EUR',
        DE: 'EUR',
        NL: 'EUR',
        BE: 'EUR',
        AT: 'EUR',
        IE: 'EUR',
        GR: 'EUR',
        FI: 'EUR',
        SE: 'EUR',
        NO: 'NOK',
        GB: 'GBP',
        UK: 'GBP',
        US: 'USD',
        CA: 'CAD',
        MX: 'MXN',
        AR: 'ARS',
        CL: 'CLP',
        CO: 'COP',
        CH: 'CHF',
        AU: 'AUD',
      };
      return map[code] || 'USD';
    };

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
      .then((res) => res.json())
      .then((data) => {
        const code = data?.address?.country_code;
        const curr = resolveCurrency(code);
        setDisplayCurrency(curr);
      })
      .catch(() => undefined);
  }, [model.currency, model.location?.lat, model.location?.lon]);

  useEffect(() => {
    let mounted = true;
    fetchModelComments(model.id)
      .then((data) => {
        if (!mounted) return;
        setComments(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [model.id]);

  const handleRate = async (value: number) => {
    setRatingSubmitting(true);
    setRatingError('');
    setRatingSuccess('');
    try {
      await rateModel(model.id, value);
      setRatingSuccess(t('profile.ratingThanks'));
      const updated = await fetchModelMetrics(model.id);
      setMetrics(updated);
    } catch (err) {
      setRatingError(err instanceof Error ? translateError(err.message) : t('errors.rate'));
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    setCommentSubmitting(true);
    setCommentError('');
    setCommentSuccess('');
    try {
      const newComment = await createModelComment(model.id, {
        name: commentName,
        message: commentMessage,
      });
      setComments((prev) => [newComment, ...prev]);
      setCommentName('');
      setCommentMessage('');
      setCommentSuccess(t('profile.commentSuccess'));
    } catch (err) {
      setCommentError(err instanceof Error ? translateError(err.message) : t('errors.commentFailed'));
    } finally {
      setCommentSubmitting(false);
    }
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
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <Share2 size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full pb-32 md:pb-36">
        <div className="grid grid-cols-4 grid-rows-2 gap-1 md:gap-2 h-[400px] md:h-[600px] bg-gray-100">
          <div className="col-span-2 row-span-2 relative overflow-hidden">
            {model.photos?.[0] ? (
              <img src={model.photos[0]} alt={model.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-2 row-span-1 relative overflow-hidden">
            {model.photos?.[1] ? (
              <img src={model.photos[1]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden">
            {model.photos?.[2] ? (
              <img src={model.photos[2]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('profile.noPhoto')}</div>
            )}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer">
            {model.photos?.[3] ? (
              <img src={model.photos[3]} className="w-full h-full object-cover opacity-50" />
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
                <h1 className="text-3xl md:text-5xl font-black text-gray-900">
                  {model.name}{model.age ? `, ${model.age}` : ''}
                </h1>
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
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {model.bio || t('dashboard.form.bioMissing')}
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
              </section>

              <section className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-[#e3262e]" />
                  {t('profile.pricing')}
                </h3>
                <div className="space-y-4">
                  {model.prices?.length ? (
                    model.prices.map((price, index) => (
                      <div key={`${price.label}-${index}`} className={`flex justify-between items-center ${index < model.prices.length - 1 ? 'pb-4 border-b border-gray-200' : ''}`}>
                        <span className="font-medium text-gray-700">{translatePriceLabel(price.label)}</span>
                        <span className={`font-black text-gray-900 ${getPriceId(price.label) === 'overnight' ? 'text-[#e3262e]' : ''}`}>
                          {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(price.value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">{t('profile.pricingMissing')}</p>
                  )}
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-[#e3262e]" />
                  {t('profile.rateProfile')}
                </h3>
                <div className="flex items-center gap-2">
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

              <section className="bg-white p-6 rounded-3xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-[#e3262e]" />
                  {t('profile.comments')}
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={t('profile.commentNamePlaceholder')}
                    value={commentName}
                    onChange={(event) => setCommentName(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                  />
                  <textarea
                    placeholder={t('profile.commentMessagePlaceholder')}
                    value={commentMessage}
                    onChange={(event) => setCommentMessage(event.target.value)}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCommentSubmit}
                    disabled={commentSubmitting}
                    className="px-5 py-3 rounded-2xl bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                  >
                    {commentSubmitting ? t('profile.commentSubmitting') : t('profile.commentSubmit')}
                  </button>
                  {commentError && <p className="text-xs text-red-500">{commentError}</p>}
                  {commentSuccess && <p className="text-xs text-green-600">{commentSuccess}</p>}
                </div>

                <div className="mt-6 space-y-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400">{t('profile.commentEmpty')}</p>
                  )}
                  {comments.map((comment) => (
                    <div key={comment.id} className="border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-gray-900">{comment.name}</p>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {new Date(comment.createdAt).toLocaleDateString(locale)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{comment.message}</p>
                    </div>
                  ))}
                </div>
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
              href={`tel:${model.phone.replace(/\\D/g,'')}`}
              className="flex-1 max-w-xs bg-gray-900 text-white py-4 md:py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 uppercase text-xs md:text-sm tracking-widest"
            >
              <Phone size={18} />
              {t('profile.callNow')}
            </a>
            <a
              href={`https://wa.me/${model.phone.replace(/\\D/g,'')}`}
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
    </div>
  );
};

export default ModelProfile;
