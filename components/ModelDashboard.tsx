import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  Eye,
  MessageCircle,
  Star,
  LogOut,
  Edit3,
  Camera,
  Bell,
  MapPin,
  LayoutDashboard,
  User,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  Lock,
  Zap,
  Award,
  TrendingUp,
  Clock,
  Smartphone,
  Info,
} from 'lucide-react';
import Logo from './Logo';
import LocationPicker, { LocationValue } from './LocationPicker';
import NationalityPicker from './NationalityPicker';
import {
  createModelPayment,
  fetchModelById,
  fetchModelMetrics,
  fetchModelNotifications,
  markModelNotificationsRead,
  updateModelProfile,
  ModelBilling,
  ModelPayment,
} from '../services/models';
import { uploadImage } from '../services/cloudinary';
import { getTranslationTarget } from '../services/translate';
import { useI18n } from '../translations/i18n';
import { getIdentityLabel, identityOptions, serviceOptions } from '../translations';

interface ModelDashboardModel {
  id: string;
  name: string;
  email: string;
  photos?: string[];
  avatarUrl?: string | null;
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
  onlineUntil?: number | null;
  currency?: string;
  billing?: ModelBilling | null;
  payments?: ModelPayment[];
}

interface ModelDashboardProps {
  onLogout: () => void;
  onViewProfile: () => void;
  onModelUpdated?: (model: ModelDashboardModel) => void;
  model: ModelDashboardModel;
  currentUserId?: string;
  currentUserEmail?: string;
}

type PaymentMethod = 'pix' | 'card';

type PaymentPageProps = {
  onClose: () => void;
  onSuccess: () => void;
  onPay: (payload: { amount: number; currency: string; method: PaymentMethod; planId: string }) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  translateError: (message: string) => string;
  locale: string;
  currency: string;
};

const PLAN_ID = 'diamond';
const PLAN_AMOUNT = 150;
const PLAN_DURATION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_UI_ENABLED = false;
const ONLINE_STATUS_REQUIRES_PAYMENT = false;

const parseDateToMs = (value?: string | number | null) => {
  if (!value) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildMapPoint = (lat: number, lon: number) => {
  const x = ((lon + 180) / 360) * 100;
  const y = (1 - (lat + 90) / 180) * 100;
  return { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) };
};

const toLocationValue = (location?: { city?: string; state?: string; lat?: number; lon?: number } | null): LocationValue | null => {
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') return null;
  const city = location.city || '';
  const state = location.state || '';
  const display = city ? `${city}${state ? `, ${state}` : ''}` : `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
  return { display, lat: String(location.lat), lon: String(location.lon) };
};

const PaymentPage: React.FC<PaymentPageProps> = ({ onClose, onSuccess, onPay, t, translateError, locale, currency }) => {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formattedAmount = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(PLAN_AMOUNT);

  const handlePayment = () => {
    if (loading) return;
    setLoading(true);
    setError('');
    onPay({ amount: PLAN_AMOUNT, currency, method, planId: PLAN_ID })
      .then(() => onSuccess())
      .catch((err) => {
        const message = err instanceof Error ? translateError(err.message) : t('errors.paymentFailed');
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  const benefits = [
    {
      icon: <TrendingUp className="text-blue-500" />,
      title: t('dashboard.billing.payment.benefit1Title'),
      desc: t('dashboard.billing.payment.benefit1Desc'),
    },
    {
      icon: <Zap className="text-yellow-500" />,
      title: t('dashboard.billing.payment.benefit2Title'),
      desc: t('dashboard.billing.payment.benefit2Desc'),
    },
    {
      icon: <Smartphone className="text-green-500" />,
      title: t('dashboard.billing.payment.benefit3Title'),
      desc: t('dashboard.billing.payment.benefit3Desc'),
    },
  ];

  return (
    <div className="fixed inset-0 z-[600] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 overflow-y-auto">
      <header className="border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black transition-colors">
          <ChevronLeft size={20} />
          <span className="text-xs uppercase tracking-widest">{t('common.back')}</span>
        </button>
        <Logo />
        <div className="flex items-center gap-2 text-green-600">
          <Lock size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
            {t('dashboard.billing.payment.secure')}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-12 lg:py-20">
        <div className="grid lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-20">
          <div className="lg:col-span-2 order-1 lg:order-1 space-y-8 sm:space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Award size={14} /> {t('dashboard.billing.payment.planBadge')}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                {t('dashboard.billing.payment.headlineBefore')}{' '}
                <span className="text-[#e3262e]">{t('dashboard.billing.payment.headlineHighlight')}</span>
              </h1>
              <p className="mt-6 text-gray-500 text-lg leading-relaxed">
                {t('dashboard.billing.payment.subheadline')}
              </p>
            </div>

            <ul className="space-y-6">
              {benefits.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-2xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="p-6 sm:p-8 bg-gray-900 rounded-[28px] sm:rounded-[40px] text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                  {t('dashboard.billing.payment.totalLabel')}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black">{formattedAmount}</span>
                  <span className="text-gray-400 font-medium">
                    {t('dashboard.billing.payment.totalPeriod', { days: PLAN_DURATION_DAYS })}
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#e3262e]/20 rounded-full blur-3xl"></div>
            </div>
          </div>

          <div className="lg:col-span-3 order-2 lg:order-2">
            <div className="bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-[28px] sm:rounded-[48px] p-5 sm:p-8 md:p-12">
              <h2 className="text-2xl font-black text-gray-900 mb-8">{t('dashboard.billing.payment.choosePayment')}</h2>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-10">
                <button
                  onClick={() => setMethod('pix')}
                  className={`flex-1 py-5 sm:py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    method === 'pix' ? 'border-[#e3262e] bg-red-50/30' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${method === 'pix' ? 'bg-[#e3262e] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Zap size={24} />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${method === 'pix' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {t('dashboard.billing.payment.pixLabel')}
                  </span>
                </button>

                <button
                  onClick={() => setMethod('card')}
                  className={`flex-1 py-5 sm:py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    method === 'card' ? 'border-[#e3262e] bg-red-50/30' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${method === 'card' ? 'bg-[#e3262e] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <CreditCard size={24} />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${method === 'card' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {t('dashboard.billing.payment.cardLabel')}
                  </span>
                </button>
              </div>

              {method === 'pix' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-4">
                  <div className="bg-gray-50 p-6 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 inline-block mx-auto">
                    <div className="w-48 h-48 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                      <div className="grid grid-cols-4 gap-2 opacity-20">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="w-6 h-6 bg-black rounded-sm"></div>
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Logo />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t('dashboard.billing.payment.pixScan')}
                    </p>
                    <p className="text-sm font-black text-gray-900">{t('dashboard.billing.payment.pixApproval')}</p>
                  </div>
                  <div className="text-left space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {t('dashboard.billing.payment.pixNote')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 block tracking-widest">
                        {t('dashboard.billing.payment.cardNumberLabel')}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t('dashboard.billing.payment.cardNumberPlaceholder')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/10 transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                          <div className="w-8 h-5 bg-blue-600 rounded-sm"></div>
                          <div className="w-8 h-5 bg-orange-500 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 block tracking-widest">
                          {t('dashboard.billing.payment.cardExpiryLabel')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('dashboard.billing.payment.cardExpiryPlaceholder')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 block tracking-widest">
                          {t('dashboard.billing.payment.cardCvvLabel')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('dashboard.billing.payment.cardCvvPlaceholder')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 block tracking-widest">
                        {t('dashboard.billing.payment.cardNameLabel')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('dashboard.billing.payment.cardNamePlaceholder')}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={loading}
                className={`w-full bg-[#e3262e] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-red-200 mt-10 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    {t('dashboard.billing.payment.payButton', { amount: formattedAmount })}
                  </>
                )}
              </button>
              {error && (
                <p className="mt-4 text-xs font-semibold text-red-500 text-center">{error}</p>
              )}

              <div className="mt-8 flex items-center justify-center gap-6 opacity-40 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Pix.png/1200px-Logo_Pix.png" className="h-5" />
              </div>
            </div>

            <div className="mt-8 flex items-start gap-4 p-5 sm:p-6 bg-blue-50/50 rounded-[24px] sm:rounded-3xl border border-blue-100">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                {t('dashboard.billing.payment.footerNote', { days: PLAN_DURATION_DAYS })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

type PremiumCardProps = {
  title: string;
  description: string;
  meta?: string;
};

const PremiumCard: React.FC<PremiumCardProps> = ({ title, description, meta }) => (
  <div className="bg-[#111827] p-6 sm:p-8 rounded-[28px] sm:rounded-[40px] text-white shadow-xl overflow-hidden relative">
    <div className="relative z-10">
      <div className="bg-red-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
        <ShieldCheck size={24} />
      </div>
      <h4 className="text-xl font-black mb-2">{title}</h4>
      <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
      {meta && (
        <p className="text-[11px] text-gray-500 mt-3">{meta}</p>
      )}
    </div>
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl"></div>
  </div>
);

const ModelDashboard: React.FC<ModelDashboardProps> = ({ onLogout, onViewProfile, onModelUpdated, model, currentUserId, currentUserEmail }) => {
  const {
    t,
    translateError,
    locale,
    translateService,
    translateHair,
    translateEyes,
    language,
    setLanguage,
    languageOptions,
  } = useI18n();
  const [isOnline, setIsOnline] = useState(Boolean(model.isOnline ?? true));
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'photos' | 'billing' | 'settings'>('dashboard');
  const [editingBio, setEditingBio] = useState(false);
  const bioPollRef = useRef<number | null>(null);
  const [editingServices, setEditingServices] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showOnlinePicker, setShowOnlinePicker] = useState(false);
  const [onlineDuration, setOnlineDuration] = useState(60);
  const [metrics, setMetrics] = useState({
    viewsToday: 0,
    whatsappToday: 0,
    ratingAvg: 0,
    ratingCount: 0,
    estimatedEarningsMonth: 0,
  });
  const billingCurrency = 'EUR';
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const bioTranslationTargets = useMemo(
    () =>
      languageOptions.map((option) => ({
        code: option.code,
        label: option.label,
        target: getTranslationTarget(option.code),
      })),
    [languageOptions]
  );
  const bioTranslations = model.bioTranslations ?? {};
  const stopBioTranslationPoll = () => {
    if (bioPollRef.current) {
      window.clearInterval(bioPollRef.current);
      bioPollRef.current = null;
    }
  };

  const startBioTranslationPoll = () => {
    stopBioTranslationPoll();
    const deadline = Date.now() + 60000;
    bioPollRef.current = window.setInterval(async () => {
      if (Date.now() > deadline) {
        stopBioTranslationPoll();
        return;
      }
      try {
        const refreshed = await fetchModelById(model.id);
        onModelUpdated?.(refreshed);
        const complete = bioTranslationTargets.every((option) => Boolean(refreshed.bioTranslations?.[option.target]));
        if (complete) {
          stopBioTranslationPoll();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  };

  const billingExpiresAtMs = parseDateToMs(model.billing?.expiresAt);
  const billingActive = Boolean(billingExpiresAtMs && billingExpiresAtMs > Date.now());
  const onlineAccessAllowed = !ONLINE_STATUS_REQUIRES_PAYMENT || billingActive;
  const billingDaysLeft = billingExpiresAtMs
    ? Math.max(0, Math.ceil((billingExpiresAtMs - Date.now()) / DAY_MS))
    : 0;
  const billingEndsAtLabel = billingExpiresAtMs
    ? new Date(billingExpiresAtMs).toLocaleDateString(locale)
    : '';
  const isOnlineVisible = onlineAccessAllowed && isOnline;
  const premiumTitle = billingActive ? t('dashboard.premium.title') : t('dashboard.premium.freeTitle');
  const premiumDescription = billingActive
    ? t('dashboard.premium.description', {
      location: model.location?.city ? `${model.location.city} (${model.location.state || ''})` : t('dashboard.premium.fallbackLocation'),
    })
    : t('dashboard.premium.freeDescription');
  const premiumMeta = billingActive && billingEndsAtLabel
    ? `${t('dashboard.premium.activeUntil', { date: billingEndsAtLabel })} · ${t('dashboard.premium.daysLeft', { days: billingDaysLeft })}`
    : undefined;
  const locationLabel = model.location?.city
    ? `${model.location.city}${model.location.state ? `, ${model.location.state}` : ''}`
    : t('onboarding.step4.locationNotDefined');

  const [nameInput, setNameInput] = useState(model.name);
  const [bioInput, setBioInput] = useState(model.bio || '');
  const [servicesInput, setServicesInput] = useState<string[]>(model.services || []);
  const [serviceDraft, setServiceDraft] = useState('');
  const [editingAudience, setEditingAudience] = useState(false);
  const [editingProfileIdentity, setEditingProfileIdentity] = useState(false);
  const [heightInput, setHeightInput] = useState(model.attributes?.height || '');
  const [weightInput, setWeightInput] = useState(model.attributes?.weight || '');
  const [hairInput, setHairInput] = useState(model.attributes?.hair || '');
  const [feetInput, setFeetInput] = useState(model.attributes?.feet || '');
  const [eyesInput, setEyesInput] = useState(model.attributes?.eyes || '');
  const [nationalityInput, setNationalityInput] = useState(model.attributes?.nationality || '');
  const [audienceInput, setAudienceInput] = useState<string[]>(model.attributes?.audience || []);
  const [profileIdentityInput, setProfileIdentityInput] = useState(model.attributes?.profileIdentity || '');
  const [photosInput, setPhotosInput] = useState<string[]>(model.photos || []);
  const [locationDraft, setLocationDraft] = useState<LocationValue | null>(toLocationValue(model.location));
  const [avatarInput, setAvatarInput] = useState<string | null>(model.avatarUrl ?? null);
  const avatarPhoto = avatarInput || model.avatarUrl || model.photos?.[0];
  const audienceOptions = useMemo(
    () => [
      { id: 'men', label: t('common.audienceMen') },
      { id: 'women', label: t('common.audienceWomen') },
      { id: 'other', label: t('common.audienceOther') },
    ],
    [t]
  );
  const profileIdentityOptions = useMemo(
    () =>
      identityOptions.map((option) => ({
        id: option.id,
        label: option.labels[language] || option.labels.br,
      })),
    [language]
  );

  const nationalityLabel = useMemo(() => {
    const code = model.attributes?.nationality;
    if (!code) return '-';
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') return code.toUpperCase();
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(code.toUpperCase()) ?? code.toUpperCase();
  }, [locale, model.attributes?.nationality]);

  const audienceLabel = useMemo(() => {
    const list = model.attributes?.audience;
    if (!list || !list.length) return t('dashboard.form.servicesMissing');
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

  useEffect(() => {
    setIsOnline(Boolean(model.isOnline ?? true));
    setNameInput(model.name);
    setBioInput(model.bio || '');
    setServicesInput(model.services || []);
    setEditingAudience(false);
    setEditingProfileIdentity(false);
    setHeightInput(model.attributes?.height || '');
    setWeightInput(model.attributes?.weight || '');
    setHairInput(model.attributes?.hair || '');
    setFeetInput(model.attributes?.feet || '');
    setEyesInput(model.attributes?.eyes || '');
    setNationalityInput(model.attributes?.nationality || '');
    setAudienceInput(model.attributes?.audience || []);
    setProfileIdentityInput(model.attributes?.profileIdentity || '');
    setPhotosInput(model.photos || []);
    if (model.avatarUrl !== undefined) {
      setAvatarInput(model.avatarUrl ?? null);
    }
    setLocationDraft(toLocationValue(model.location));
  }, [model]);

  useEffect(() => {
    return () => {
      stopBioTranslationPoll();
    };
  }, []);

  const resetEdits = () => {
    setNameInput(model.name);
    setBioInput(model.bio || '');
    setServicesInput(model.services || []);
    setEditingAudience(false);
    setHeightInput(model.attributes?.height || '');
    setWeightInput(model.attributes?.weight || '');
    setHairInput(model.attributes?.hair || '');
    setFeetInput(model.attributes?.feet || '');
    setEyesInput(model.attributes?.eyes || '');
    setNationalityInput(model.attributes?.nationality || '');
    setAudienceInput(model.attributes?.audience || []);
    setProfileIdentityInput(model.attributes?.profileIdentity || '');
    setPhotosInput(model.photos || []);
    if (model.avatarUrl !== undefined) {
      setAvatarInput(model.avatarUrl ?? null);
    }
    setLocationDraft(toLocationValue(model.location));
  };

  const toggleAudience = (value: string) => {
    setAudienceInput((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSave = async (payload: Record<string, unknown>, onDone: () => void) => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateModelProfile(model.id, payload);
      onModelUpdated?.(updated);
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    const nextBio = bioInput;
    setSaving(true);
    setSaveError('');
    const sourceLanguage = getTranslationTarget(language);
    try {
      const updated = await updateModelProfile(model.id, {
        bio: nextBio,
        bioTranslations: { [sourceLanguage]: nextBio.trim() },
        bioLanguage: sourceLanguage,
      });
      onModelUpdated?.(updated);
      setEditingBio(false);
    } catch (err) {
      setSaveError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
      return;
    } finally {
      setSaving(false);
    }

    const trimmed = nextBio.trim();
    if (!trimmed) return;
    startBioTranslationPoll();
  };

  const handleSaveLocation = async () => {
    if (!locationDraft) {
      setSaveError(t('dashboard.location.required'));
      return;
    }
    const lat = Number(locationDraft.lat);
    const lon = Number(locationDraft.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setSaveError(t('dashboard.location.required'));
      return;
    }
    const parts = locationDraft.display.split(',').map((part) => part.trim()).filter(Boolean);
    const city = parts[0] || undefined;
    const state = parts[1] || undefined;
    const map = buildMapPoint(lat, lon);

    await handleSave(
      {
        location: { city, state, lat, lon },
        map,
      },
      () => setEditingLocation(false)
    );
  };

  const handleToggleOnline = async () => {
    if (ONLINE_STATUS_REQUIRES_PAYMENT && !billingActive) {
      setSaveError(t('dashboard.billing.paymentRequired'));
      if (PAYMENT_UI_ENABLED) {
        setShowPaymentPage(true);
      }
      return;
    }
    if (!isOnline) {
      setShowOnlinePicker(true);
      return;
    }
    const nextValue = false;
    setIsOnline(nextValue);
    try {
      const updated = await updateModelProfile(model.id, { isOnline: nextValue, onlineUntil: null });
      onModelUpdated?.(updated);
    } catch (err) {
      setIsOnline(true);
      setSaveError(err instanceof Error ? translateError(err.message) : t('errors.updateStatusFailed'));
    }
  };

  const handleConfirmOnline = async () => {
    if (ONLINE_STATUS_REQUIRES_PAYMENT && !billingActive) {
      setShowOnlinePicker(false);
      setSaveError(t('dashboard.billing.paymentRequired'));
      if (PAYMENT_UI_ENABLED) {
        setShowPaymentPage(true);
      }
      return;
    }
    const minutes = Number(onlineDuration);
    const until = Date.now() + minutes * 60 * 1000;
    setIsOnline(true);
    setShowOnlinePicker(false);
    try {
      const updated = await updateModelProfile(model.id, { isOnline: true, onlineUntil: until });
      onModelUpdated?.(updated);
    } catch (err) {
      setIsOnline(false);
      setSaveError(err instanceof Error ? translateError(err.message) : t('errors.updateStatusFailed'));
    }
  };

  const handlePaymentSubmit = async (payload: { amount: number; currency: string; method: PaymentMethod; planId: string }) => {
    const updated = await createModelPayment(model.id, {
      amount: payload.amount,
      currency: payload.currency,
      method: payload.method,
      planId: payload.planId,
      paidByUserId: currentUserId ?? null,
      paidByEmail: currentUserEmail ?? model.email,
    });
    onModelUpdated?.(updated);
    setSaveError('');
  };

  const handleBackToSite = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const onlineUntilLabel = () => {
    if (!model.onlineUntil) return '';
    const diff = model.onlineUntil - Date.now();
    if (diff <= 0) return '';
    const minutes = Math.ceil(diff / 60000);
    if (minutes < 60) return t('time.minutesRemaining', { count: minutes });
    const hours = Math.ceil(minutes / 60);
    return t('time.hoursRemaining', { count: hours });
  };

  const handleAddService = () => {
    const trimmed = serviceDraft.trim();
    if (!trimmed) return;
    if (servicesInput.includes(trimmed)) return;
    setServicesInput((prev) => [...prev, trimmed]);
    setServiceDraft('');
  };

  const normalizeService = (value: string) => value.trim().toLowerCase();

  const isServiceMatch = (value: string, option: (typeof serviceOptions)[number]) => {
    const normalized = normalizeService(value);
    if (normalized === normalizeService(option.id)) return true;
    return Object.values(option.labels).some((label) => normalizeService(label) === normalized);
  };

  const isServiceSelected = (option: (typeof serviceOptions)[number]) =>
    servicesInput.some((value) => isServiceMatch(value, option));

  const toggleServiceOption = (option: (typeof serviceOptions)[number]) => {
    setServicesInput((prev) => {
      const exists = prev.some((value) => isServiceMatch(value, option));
      if (exists) {
        return prev.filter((value) => !isServiceMatch(value, option));
      }
      return [...prev, option.id];
    });
  };

  const handleRemoveService = (service: string) => {
    setServicesInput((prev) => prev.filter((item) => item !== service));
  };

  const handlePhotoAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    setUploadingPhotos(true);
    setSaveError('');
    try {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
      setPhotosInput((prev) => [...prev, ...uploaded]);
    } catch {
      setSaveError(t('errors.imageLoadFailedGeneric'));
    } finally {
      setUploadingPhotos(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotosInput((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePhotos = () => {
    if (photosInput.length < 4) {
      setSaveError(t('errors.minPhotos'));
      return;
    }
    handleSave({ photos: photosInput }, () => setEditingPhotos(false));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhotos(true);
    setSaveError('');
    try {
      const uploaded = await uploadImage(file);
      await handleSave({ avatarUrl: uploaded }, () => {
        setAvatarInput(uploaded);
        setIsAvatarPickerOpen(false);
      });
    } catch {
      setSaveError(t('errors.imageLoadFailedGeneric'));
    } finally {
      setUploadingPhotos(false);
      event.target.value = '';
    }
  };

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
    let mounted = true;
    const load = () => {
      fetchModelNotifications(model.id)
        .then((data) => {
          if (!mounted) return;
          setNotifications(data);
        })
        .catch(() => undefined);
    };
    load();
    const intervalId = window.setInterval(load, 20000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [model.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsAvatarPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleNotifications = notifications.filter((notification) => notification.type !== 'comment');
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;

  const resolvePlanLabel = (planId?: string) => {
    if (planId === PLAN_ID) return t('dashboard.billing.planDiamond');
    return t('dashboard.billing.premium');
  };

  const paymentHistory = (model.payments || [])
    .filter((payment) => payment.status === 'paid')
    .sort((a, b) => {
      const aTime = parseDateToMs(a.createdAt) || 0;
      const bTime = parseDateToMs(b.createdAt) || 0;
      return bTime - aTime;
    });

  const historyItems = paymentHistory.map((payment) => {
    const date = parseDateToMs(payment.createdAt);
    const dateLabel = date
      ? new Date(date).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
      : t('dashboard.billing.unknownDate');
    const planLabel = resolvePlanLabel(payment.planId);
    return {
      id: payment.id,
      label: t('dashboard.billing.historyEntry', { date: dateLabel, plan: planLabel }),
      amount: payment.amount,
      currency: payment.currency || billingCurrency,
    };
  });

  const FlagButton = () => (
    <div className="relative" ref={languageRef} data-lang-menu>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setIsLangOpen((prev) => !prev);
        }}
        className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors"
        title={t('language.select')}
      >
        <img
          src={`https://flagcdn.com/w20/${language}.png`}
          alt={language.toUpperCase()}
          className="w-5 h-auto rounded-sm shadow-sm"
        />
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {isLangOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[120]">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={(event) => {
                event.stopPropagation();
                setLanguage(lang.code);
                setIsLangOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                language === lang.code ? 'text-[#e3262e] font-bold' : 'text-gray-700'
              }`}
            >
              <img
                src={`https://flagcdn.com/w20/${lang.code}.png`}
                alt={lang.label}
                className="w-5 h-auto rounded-sm shadow-sm"
              />
              <span className="font-semibold">{lang.label}</span>
              {language === lang.code && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const stats = [
    {
      label: t('dashboard.stats.viewsToday'),
      value: metrics.viewsToday.toLocaleString(locale),
      icon: <Eye size={20} className="text-blue-500" />,
      trend: t('dashboard.stats.today'),
    },
    {
      label: t('dashboard.stats.whatsappClicks'),
      value: metrics.whatsappToday.toLocaleString(locale),
      icon: <MessageCircle size={20} className="text-green-500" />,
      trend: t('dashboard.stats.today'),
    },
    {
      label: t('dashboard.stats.ratings'),
      value: (metrics.ratingAvg || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      icon: <Star size={20} className="text-yellow-500" />,
      trend: t('dashboard.stats.ratingCount', { count: metrics.ratingCount.toLocaleString(locale) }),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 p-6 sticky top-0 h-screen">
        <div className="mb-10 px-2">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeSection === 'dashboard' ? 'bg-red-50 text-[#e3262e]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={20} /> {t('dashboard.nav.dashboard')}
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeSection === 'profile' ? 'bg-red-50 text-[#e3262e]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <User size={20} /> {t('dashboard.nav.profile')}
          </button>
          <button
            onClick={() => setActiveSection('photos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeSection === 'photos' ? 'bg-red-50 text-[#e3262e]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Camera size={20} /> {t('dashboard.nav.photos')}
          </button>
          <button
            onClick={() => setActiveSection('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeSection === 'billing' ? 'bg-red-50 text-[#e3262e]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={20} /> {t('dashboard.nav.billing')}
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeSection === 'settings' ? 'bg-red-50 text-[#e3262e]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} /> {t('dashboard.nav.settings')}
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 space-y-2">
          <button
            onClick={handleBackToSite}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 transition-colors font-bold text-sm"
          >
            <ChevronLeft size={20} /> {t('common.backToSite')}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors font-bold text-sm"
          >
            <LogOut size={20} /> {t('dashboard.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-20">
          <div className="w-full flex items-center justify-center md:hidden">
            <Logo />
          </div>

          <div className="hidden md:block">
            <h2 className="text-xl font-black text-gray-900">{t('dashboard.header.hello', { name: model.name })}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('dashboard.header.subtitle')}</p>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2 sm:gap-4 flex-wrap justify-center md:justify-end">
            {/* Status Switcher */}
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${
                isOnlineVisible
                  ? 'bg-green-50 border-green-100 text-green-600'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${isOnlineVisible ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="text-xs font-black uppercase tracking-tighter">{isOnlineVisible ? t('common.online') : t('common.offline')}</span>
              {isOnlineVisible && onlineUntilLabel() && (
                <span className="text-[10px] font-bold text-green-600">{onlineUntilLabel()}</span>
              )}
            </button>

            <FlagButton />

            <div className="relative" ref={notificationRef}>
              <button
                onClick={async () => {
                  const next = !isNotificationsOpen;
                  setIsNotificationsOpen(next);
                  if (next && unreadCount > 0) {
                    try {
                      await markModelNotificationsRead(model.id);
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-all relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="fixed inset-x-0 top-24 mx-auto w-[min(90vw,20rem)] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[110] sm:absolute sm:top-full sm:mt-3 sm:left-auto sm:right-0 sm:mx-0 sm:w-80">
                  <div className="bg-[#e3262e] p-4 text-white flex justify-between items-center">
                    <span className="font-bold">{t('dashboard.notifications.title')}</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('dashboard.notifications.recent')}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {visibleNotifications.length === 0 && (
                      <div className="p-4 text-sm text-gray-500">{t('dashboard.notifications.empty')}</div>
                    )}
                    {visibleNotifications.map((n) => (
                      <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <p className="text-sm font-bold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(n.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsAvatarPickerOpen((prev) => !prev);
              }}
              title={t('dashboard.photos.avatarAction')}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#e3262e] bg-gray-100 group"
            >
              {avatarPhoto ? (
                <img src={avatarPhoto} alt={model.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" />
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#e3262e] text-white flex items-center justify-center shadow-md">
                <Camera size={12} />
              </span>
            </button>

            {isAvatarPickerOpen && (
              <div className="fixed inset-x-0 top-24 mx-auto w-[min(92vw,18rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[120] sm:absolute sm:top-full sm:mt-3 sm:inset-x-auto sm:right-0 sm:mx-0 sm:w-72">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                    {t('dashboard.photos.avatarTitle')}
                  </p>
                  <p className="text-[11px] text-gray-400">{t('dashboard.photos.profileHint')}</p>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingPhotos}
                      className="sr-only"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-[#e3262e] text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-200 transition-colors ${
                        uploadingPhotos ? 'opacity-70 pointer-events-none' : 'hover:bg-red-700 cursor-pointer'
                      }`}
                    >
                      <Camera size={12} />
                      {uploadingPhotos ? t('dashboard.photos.uploading') : t('dashboard.photos.uploadButton')}
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {photosInput.length > 0
                        ? t('dashboard.photos.selectedCount', { count: photosInput.length })
                        : t('dashboard.photos.noSelection')}
                    </span>
                  </div>
                  {photosInput.length === 0 ? (
                    <p className="text-xs text-gray-400">{t('dashboard.photos.noPhotos')}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {photosInput.map((photo, index) => {
                        const currentAvatar = avatarInput || model.avatarUrl;
                        const isProfile = currentAvatar ? currentAvatar === photo : index === 0;
                        return (
                          <button
                            key={`${photo}-${index}`}
                            type="button"
                            onClick={() => {
                              handleSave({ avatarUrl: photo }, () => {
                                setAvatarInput(photo);
                                setIsAvatarPickerOpen(false);
                              });
                            }}
                            className={`relative rounded-lg overflow-hidden focus:outline-none ${
                              isProfile ? 'ring-2 ring-[#e3262e]' : 'ring-1 ring-gray-200'
                            }`}
                          >
                            <img src={photo} alt={`avatar-${index}`} className="w-full h-14 object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 pb-24 sm:pb-6 space-y-6 sm:space-y-8">
          {saveError && (
            <div className="bg-white border border-red-100 text-red-500 text-xs font-semibold px-4 py-3 rounded-xl">
              {saveError}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((s, idx) => (
                  <div key={idx} className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-gray-50 rounded-xl">{s.icon}</div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        idx === 2 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {s.trend}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{s.label}</p>
                    <h3 className="text-2xl font-black text-gray-900">{s.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Profile Summary */}
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                        <Edit3 size={18} className="text-[#e3262e]" /> {t('dashboard.profileCard.title')}
                      </h3>
                      <button onClick={onViewProfile} className="text-xs font-bold text-[#e3262e] hover:underline">{t('dashboard.profileCard.viewPublic')}</button>
                    </div>
                    <p className="text-sm text-gray-500">{t('dashboard.profileCard.hint')}</p>
                  </section>
                </div>

                {/* Right Column - Status & Security */}
                <div className="space-y-6">
                  <PremiumCard
                    title={t('dashboard.premium.title')}
                    description={premiumDescription}
                    meta={premiumMeta}
                  />

                  <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{t('dashboard.tips.title')}</h4>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <Camera size={16} />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-normal">{t('dashboard.tips.tip1')}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0">
                          <Clock size={16} />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-normal">{t('dashboard.tips.tip2')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'profile' && (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                      <Edit3 size={18} className="text-[#e3262e]" /> {t('dashboard.nav.profile')}
                    </h3>
                    <button onClick={onViewProfile} className="text-xs font-bold text-[#e3262e] hover:underline">{t('dashboard.profileCard.viewPublic')}</button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.form.artistName')}</label>
                        <button
                          onClick={() => {
                            setEditingName(!editingName);
                            if (editingName) resetEdits();
                          }}
                          className="text-gray-300 hover:text-[#e3262e]"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      {editingName ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(event) => setNameInput(event.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleSave({ name: nameInput }, () => {
                                  setEditingName(false);
                                })
                              }
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingName(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-700">{model.name}</p>
                      )}
                    </div>

                    <div className="group relative">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('dashboard.form.aboutMe')}</label>
                      {editingBio ? (
                        <div className="space-y-3">
                          <textarea
                            value={bioInput}
                            onChange={(event) => setBioInput(event.target.value)}
                            rows={4}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={handleSaveBio}
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingBio(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {t('dashboard.form.bioTranslationsLabel')}
                            </span>
                            {bioTranslationTargets.map((option) => {
                              const ready = Boolean(bioTranslations[option.target]);
                              return (
                                <span
                                  key={option.code}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${
                                    ready ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-400'
                                  }`}
                                  title={option.label}
                                >
                                  <img
                                    src={`https://flagcdn.com/w20/${option.code}.png`}
                                    alt={option.code.toUpperCase()}
                                    className="w-4 h-3 rounded-[2px]"
                                  />
                                  {ready ? '✓' : '…'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 leading-relaxed pr-10">
                            {model.bio || t('dashboard.form.bioMissing')}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {t('dashboard.form.bioTranslationsLabel')}
                            </span>
                            {bioTranslationTargets.map((option) => {
                              const ready = Boolean(bioTranslations[option.target]);
                              return (
                                <span
                                  key={option.code}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${
                                    ready ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-400'
                                  }`}
                                  title={option.label}
                                >
                                  <img
                                    src={`https://flagcdn.com/w20/${option.code}.png`}
                                    alt={option.code.toUpperCase()}
                                    className="w-4 h-3 rounded-[2px]"
                                  />
                                  {ready ? '✓' : '…'}
                                </span>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setEditingBio(true)}
                            className="absolute right-0 top-0 p-2 text-gray-300 hover:text-[#e3262e] transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        </>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.form.servicesTitle')}</label>
                        <button
                          onClick={() => {
                            setEditingServices(!editingServices);
                            if (editingServices) resetEdits();
                          }}
                          className="text-gray-300 hover:text-[#e3262e]"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      {editingServices ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {serviceOptions.map((service) => {
                              const active = isServiceSelected(service);
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => toggleServiceOption(service)}
                                  className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                    active
                                      ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-sm'
                                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                  }`}
                                >
                                  {service.labels[language] || service.labels.br}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={serviceDraft}
                              onChange={(event) => setServiceDraft(event.target.value)}
                              placeholder={t('dashboard.form.addServicePlaceholder')}
                              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleAddService}
                              className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-bold uppercase tracking-widest"
                            >
                              {t('dashboard.form.addServiceButton')}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {servicesInput.length ? (
                              servicesInput.map((service) => (
                                <button
                                  key={service}
                                  type="button"
                                  onClick={() => handleRemoveService(service)}
                                  className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100 hover:border-[#e3262e]"
                                >
                                  {translateService(service)} x
                                </button>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">{t('dashboard.form.noServices')}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleSave({ services: servicesInput }, () => {
                                  setEditingServices(false);
                                })
                              }
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingServices(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(model.services?.length ? model.services : [t('dashboard.form.servicesMissing')]).map((item) => (
                            <span key={item} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100">{translateService(item)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.form.audienceLabel')}</label>
                        <button
                          onClick={() => {
                            setEditingAudience(!editingAudience);
                            if (editingAudience) resetEdits();
                          }}
                          className="text-gray-300 hover:text-[#e3262e]"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      {editingAudience ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {audienceOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleAudience(option.id)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  audienceInput.includes(option.id)
                                    ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleSave(
                                  {
                                    attributes: {
                                      ...(model.attributes ?? {}),
                                      audience: audienceInput.length ? audienceInput : undefined,
                                    },
                                  },
                                  () => setEditingAudience(false)
                                )
                              }
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingAudience(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100">
                            {audienceLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.form.identityLabel')}</label>
                        <button
                          onClick={() => {
                            setEditingProfileIdentity(!editingProfileIdentity);
                            if (editingProfileIdentity) resetEdits();
                          }}
                          className="text-gray-300 hover:text-[#e3262e]"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      {editingProfileIdentity ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {profileIdentityOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setProfileIdentityInput((prev) => (prev === option.id ? '' : option.id))}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  profileIdentityInput === option.id
                                    ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleSave(
                                  {
                                    attributes: {
                                      ...(model.attributes ?? {}),
                                      profileIdentity: profileIdentityInput || undefined,
                                    },
                                  },
                                  () => setEditingProfileIdentity(false)
                                )
                              }
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingProfileIdentity(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100">
                            {profileIdentityLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.form.physicalTitle')}</label>
                        <button
                          onClick={() => {
                            setEditingAttributes(!editingAttributes);
                            if (editingAttributes) resetEdits();
                          }}
                          className="text-gray-300 hover:text-[#e3262e]"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      {editingAttributes ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <input
                              type="text"
                              value={heightInput}
                              onChange={(event) => setHeightInput(event.target.value)}
                              placeholder={t('dashboard.form.heightPlaceholder')}
                              className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                            />
                            <input
                              type="text"
                              value={weightInput}
                              onChange={(event) => setWeightInput(event.target.value)}
                              placeholder={t('dashboard.form.weightPlaceholder')}
                              className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                            />
                            <input
                              type="text"
                              value={hairInput}
                              onChange={(event) => setHairInput(event.target.value)}
                              placeholder={t('dashboard.form.hairPlaceholder')}
                              className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                            />
                            <input
                              type="text"
                              value={feetInput}
                              onChange={(event) => setFeetInput(event.target.value)}
                              placeholder={t('dashboard.form.feetPlaceholder')}
                              className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                            />
                            <input
                              type="text"
                              value={eyesInput}
                              onChange={(event) => setEyesInput(event.target.value)}
                              placeholder={t('dashboard.form.eyesPlaceholder')}
                              className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none col-span-2"
                            />
                          </div>
                          <NationalityPicker
                            value={nationalityInput}
                            onChange={setNationalityInput}
                            label={t('dashboard.form.nationalityLabel')}
                            placeholder={t('dashboard.form.nationalityPlaceholder')}
                            inputClassName="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleSave(
                                  {
                                    attributes: {
                                      height: heightInput || undefined,
                                      weight: weightInput || undefined,
                                      hair: hairInput || undefined,
                                      feet: feetInput || undefined,
                                      eyes: eyesInput || undefined,
                                      nationality: nationalityInput || undefined,
                                      audience: audienceInput.length ? audienceInput : undefined,
                                      profileIdentity: profileIdentityInput || undefined,
                                    },
                                  },
                                  () => setEditingAttributes(false)
                                )
                              }
                              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                            >
                              {saving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                resetEdits();
                                setEditingAttributes(false);
                              }}
                              className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.heightLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.height ? `${model.attributes.height}m` : '-'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.weightLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.weight ? `${model.attributes.weight}kg` : '-'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.hairLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.hair ? translateHair(model.attributes?.hair) : '-'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.feetLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.feet || '-'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center col-span-2 sm:col-span-2">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.nationalityLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{nationalityLabel}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center col-span-2 sm:col-span-2">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.eyesLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.eyes ? translateEyes(model.attributes?.eyes) : '-'}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                      <MapPin size={18} className="text-[#e3262e]" /> {t('onboarding.step3.title')}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingLocation(!editingLocation);
                        if (editingLocation) {
                          setLocationDraft(toLocationValue(model.location));
                        }
                      }}
                      className="bg-gray-50 text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>

                  {editingLocation ? (
                    <div className="space-y-6">
                      <LocationPicker value={locationDraft} onChange={setLocationDraft} />
                      <div className="flex gap-2">
                        <button
                          disabled={saving || !locationDraft?.lat || !locationDraft?.lon}
                          onClick={handleSaveLocation}
                          className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                        >
                          {saving ? t('common.saving') : t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setLocationDraft(toLocationValue(model.location));
                            setEditingLocation(false);
                          }}
                          className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">{locationLabel}</div>
                  )}
                </section>

              </div>

              <div className="space-y-6">
                <PremiumCard
                  title={premiumTitle}
                  description={premiumDescription}
                  meta={premiumMeta}
                />
              </div>
            </div>
          )}

          {activeSection === 'photos' && (
            <section className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                  <Camera size={18} className="text-[#e3262e]" /> {t('dashboard.photos.title')}
                </h3>
                <button
                  onClick={() => {
                    setEditingPhotos(!editingPhotos);
                    if (editingPhotos) resetEdits();
                  }}
                  className="bg-gray-50 text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Edit3 size={16} />
                </button>
              </div>
              {editingPhotos ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{t('dashboard.photos.uploadTitle')}</p>
                      <p className="text-xs text-gray-400">{t('dashboard.photos.uploadHint')}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <input
                        id="photos-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoAdd}
                        disabled={uploadingPhotos}
                        className="sr-only"
                      />
                      <label
                        htmlFor="photos-upload"
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 transition-colors ${
                          uploadingPhotos ? 'opacity-70 pointer-events-none' : 'hover:bg-red-700 cursor-pointer'
                        }`}
                      >
                        <Camera size={14} />
                        {uploadingPhotos ? t('dashboard.photos.uploading') : t('dashboard.photos.uploadButton')}
                      </label>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        {photosInput.length > 0
                          ? t('dashboard.photos.selectedCount', { count: photosInput.length })
                          : t('dashboard.photos.noSelection')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photosInput.map((photo, index) => (
                      <div key={`${photo}-${index}`} className="relative">
                        <img src={photo} alt={`foto-${index}`} className="w-full h-20 sm:h-24 object-cover rounded-xl" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 text-[10px] bg-[#e3262e] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold shadow"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={saving || uploadingPhotos}
                      onClick={handleSavePhotos}
                      className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => {
                        resetEdits();
                        setEditingPhotos(false);
                      }}
                      className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {model.photos?.length ? (
                    model.photos.map((photo, index) => (
                      <img key={`${photo}-${index}`} src={photo} alt={`foto-${index}`} className="w-full h-28 object-cover rounded-xl" />
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">{t('dashboard.photos.noPhotos')}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {activeSection === 'billing' && (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              {!PAYMENT_UI_ENABLED ? (
                <section className="lg:col-span-3 bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 mb-6">
                    <CreditCard size={18} className="text-[#e3262e]" /> {t('dashboard.billing.title')}
                  </h3>
                  <div className="border border-emerald-100 bg-emerald-50 rounded-3xl p-5 sm:p-6 flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      {t('dashboard.billing.freeBadge')}
                    </span>
                    <h4 className="text-2xl sm:text-3xl font-black text-gray-900">
                      {t('dashboard.billing.freeTitle')}
                    </h4>
                    <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                      {t('dashboard.billing.freeMessage')}
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <section className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 mb-6">
                      <CreditCard size={18} className="text-[#e3262e]" /> {t('dashboard.billing.title')}
                    </h3>
                    <div className="border border-gray-100 rounded-[24px] sm:rounded-3xl p-5 sm:p-6">
                      <p className="text-xs font-black text-gray-400 uppercase mb-4">{t('dashboard.billing.history')}</p>
                      {historyItems.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('dashboard.billing.noHistory')}</p>
                      ) : (
                        <div className="space-y-3">
                          {historyItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{item.label}</span>
                              <span className="font-bold text-gray-900">
                                {new Intl.NumberFormat(locale, { style: 'currency', currency: item.currency }).format(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                  <aside className="bg-[#111827] p-6 sm:p-8 rounded-[28px] sm:rounded-[40px] text-white shadow-xl self-start">
                    <h4 className="text-lg font-black mb-2">{t('dashboard.billing.upgradeTitle')}</h4>
                    <p className="text-xs text-gray-400 mb-6">{t('dashboard.billing.upgradeDesc')}</p>
                    <button
                      onClick={() => setShowPaymentPage(true)}
                      className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      {t('dashboard.billing.viewPlans')}
                    </button>
                  </aside>
                </>
              )}
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              <section className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 mb-6">
                  <Settings size={18} className="text-[#e3262e]" /> {t('dashboard.settings.title')}
                </h3>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-[24px] sm:rounded-3xl p-5 sm:p-6">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">{t('dashboard.settings.statusLabel')}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{t('dashboard.settings.showOnline')}</p>
                      <button
                        onClick={handleToggleOnline}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                          isOnlineVisible ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isOnlineVisible ? t('common.online') : t('common.offline')}
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-[24px] sm:rounded-3xl p-5 sm:p-6">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">{t('dashboard.settings.account')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.settings.registeredEmail', { email: model.email || t('profile.notInformed') })}</p>
                  </div>

                  <div className="md:hidden space-y-2">
                    <button
                      onClick={handleBackToSite}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={16} /> {t('common.backToSite')}
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 text-red-600 font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} /> {t('dashboard.logout')}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {showPaymentPage && PAYMENT_UI_ENABLED && (
        <PaymentPage
          onClose={() => setShowPaymentPage(false)}
          onSuccess={() => setShowPaymentPage(false)}
          onPay={handlePaymentSubmit}
          t={t}
          translateError={translateError}
          locale={locale}
          currency={billingCurrency}
        />
      )}

      {showOnlinePicker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOnlinePicker(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900 mb-2">{t('dashboard.onlinePicker.title')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('dashboard.onlinePicker.subtitle')}</p>
            <div className="space-y-3">
              {[30, 60, 120, 240, 480, 1440].map((value) => (
                <button
                  key={value}
                  onClick={() => setOnlineDuration(value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold ${
                    onlineDuration === value ? 'border-[#e3262e] text-[#e3262e] bg-red-50' : 'border-gray-100 text-gray-600'
                  }`}
                >
                  {value >= 60
                    ? value / 60 === 1
                      ? t('time.hour', { count: value / 60 })
                      : t('time.hours', { count: value / 60 })
                    : value === 1
                      ? t('time.minute', { count: value })
                      : t('time.minutes', { count: value })}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowOnlinePicker(false)}
                className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmOnline}
                className="flex-1 px-4 py-3 rounded-2xl bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest"
              >
                {t('dashboard.onlinePicker.activate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between z-50">
         <button onClick={() => setActiveSection('dashboard')} className={`p-3 ${activeSection === 'dashboard' ? 'text-[#e3262e]' : 'text-gray-300'}`}><LayoutDashboard size={24} /></button>
         <button onClick={() => setActiveSection('profile')} className={`p-3 ${activeSection === 'profile' ? 'text-[#e3262e]' : 'text-gray-300'}`}><User size={24} /></button>
         <div className="p-1 border-2 border-[#e3262e] rounded-full -mt-10 bg-white shadow-xl shadow-red-100">
            <button onClick={() => setActiveSection('photos')} className="w-12 h-12 bg-[#e3262e] rounded-full flex items-center justify-center text-white"><Camera size={24} /></button>
         </div>
         <button onClick={() => setActiveSection('billing')} className={`p-3 ${activeSection === 'billing' ? 'text-[#e3262e]' : 'text-gray-300'}`}><CreditCard size={24} /></button>
         <button onClick={() => setActiveSection('settings')} className={`p-3 ${activeSection === 'settings' ? 'text-[#e3262e]' : 'text-gray-300'}`}><Settings size={24} /></button>
      </nav>
    </div>
  );
};

export default ModelDashboard;
