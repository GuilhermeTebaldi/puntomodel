import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  Eye,
  MessageCircle,
  Star,
  LogOut,
  Edit3,
  Camera,
  Bell,
  LayoutDashboard,
  User,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Logo from './Logo';
import { fetchModelMetrics, fetchModelNotifications, markModelNotificationsRead, updateModelProfile } from '../services/models';
import { useI18n } from '../translations/i18n';

interface ModelDashboardModel {
  id: string;
  name: string;
  email: string;
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
  onlineUntil?: number | null;
  currency?: string;
}

interface ModelDashboardProps {
  onLogout: () => void;
  onViewProfile: () => void;
  onModelUpdated?: (model: ModelDashboardModel) => void;
  model: ModelDashboardModel;
}

const ModelDashboard: React.FC<ModelDashboardProps> = ({ onLogout, onViewProfile, onModelUpdated, model }) => {
  const { t, translateError, locale, translateService, translatePriceLabel, getPriceId, getPriceLabel, translateHair, translateEyes } = useI18n();
  const [isOnline, setIsOnline] = useState(Boolean(model.isOnline ?? true));
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'photos' | 'billing' | 'settings'>('dashboard');
  const [editingBio, setEditingBio] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [editingPrices, setEditingPrices] = useState(false);
  const [editingPhotos, setEditingPhotos] = useState(false);
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
  const [displayCurrency, setDisplayCurrency] = useState(model.currency || 'BRL');
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

  const [nameInput, setNameInput] = useState(model.name);
  const [bioInput, setBioInput] = useState(model.bio || '');
  const [servicesInput, setServicesInput] = useState<string[]>(model.services || []);
  const [serviceDraft, setServiceDraft] = useState('');
  const [heightInput, setHeightInput] = useState(model.attributes?.height || '');
  const [weightInput, setWeightInput] = useState(model.attributes?.weight || '');
  const [hairInput, setHairInput] = useState(model.attributes?.hair || '');
  const [feetInput, setFeetInput] = useState(model.attributes?.feet || '');
  const [eyesInput, setEyesInput] = useState(model.attributes?.eyes || '');
  const [priceOneHour, setPriceOneHour] = useState('');
  const [priceTwoHours, setPriceTwoHours] = useState('');
  const [priceOvernight, setPriceOvernight] = useState('');
  const [photosInput, setPhotosInput] = useState<string[]>(model.photos || []);

  useEffect(() => {
    setIsOnline(Boolean(model.isOnline ?? true));
    setNameInput(model.name);
    setBioInput(model.bio || '');
    setServicesInput(model.services || []);
    setHeightInput(model.attributes?.height || '');
    setWeightInput(model.attributes?.weight || '');
    setHairInput(model.attributes?.hair || '');
    setFeetInput(model.attributes?.feet || '');
    setEyesInput(model.attributes?.eyes || '');
    setPhotosInput(model.photos || []);

    const getPrice = (priceId: 'oneHour' | 'twoHours' | 'overnight') =>
      model.prices?.find((price) => getPriceId(price.label) === priceId)?.value ?? '';
    const oneHour = getPrice('oneHour');
    const twoHours = getPrice('twoHours');
    const overnight = getPrice('overnight');
    setPriceOneHour(oneHour ? String(oneHour) : '');
    setPriceTwoHours(twoHours ? String(twoHours) : '');
    setPriceOvernight(overnight ? String(overnight) : '');
    setDisplayCurrency(model.currency || 'BRL');
  }, [model]);

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

  const resetEdits = () => {
    setNameInput(model.name);
    setBioInput(model.bio || '');
    setServicesInput(model.services || []);
    setHeightInput(model.attributes?.height || '');
    setWeightInput(model.attributes?.weight || '');
    setHairInput(model.attributes?.hair || '');
    setFeetInput(model.attributes?.feet || '');
    setEyesInput(model.attributes?.eyes || '');
    setPhotosInput(model.photos || []);
    const getPrice = (priceId: 'oneHour' | 'twoHours' | 'overnight') =>
      model.prices?.find((price) => getPriceId(price.label) === priceId)?.value ?? '';
    const oneHour = getPrice('oneHour');
    const twoHours = getPrice('twoHours');
    const overnight = getPrice('overnight');
    setPriceOneHour(oneHour ? String(oneHour) : '');
    setPriceTwoHours(twoHours ? String(twoHours) : '');
    setPriceOvernight(overnight ? String(overnight) : '');
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

  const handleToggleOnline = async () => {
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

  const handleRemoveService = (service: string) => {
    setServicesInput((prev) => prev.filter((item) => item !== service));
  };

  const handlePhotoAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(t('errors.imageLoadFailed')));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((base64Images) => {
        setPhotosInput((prev) => [...prev, ...base64Images]);
      })
      .catch(() => {
        setSaveError(t('errors.imageLoadFailedGeneric'));
      });
    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotosInput((prev) => prev.filter((_, idx) => idx !== index));
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

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
    {
      label: t('dashboard.stats.estimatedEarnings'),
      value: new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(metrics.estimatedEarningsMonth),
      icon: <TrendingUp size={20} className="text-[#e3262e]" />,
      trend: t('dashboard.stats.month'),
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

        <div className="pt-6 border-t border-gray-100">
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
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4 md:hidden">
            <Logo />
          </div>

          <div className="hidden md:block">
            <h2 className="text-xl font-black text-gray-900">{t('dashboard.header.hello', { name: model.name })}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('dashboard.header.subtitle')}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Switcher */}
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                isOnline
                  ? 'bg-green-50 border-green-100 text-green-600'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="text-xs font-black uppercase tracking-tighter">{isOnline ? t('common.online') : t('common.offline')}</span>
              {isOnline && onlineUntilLabel() && (
                <span className="text-[10px] font-bold text-green-600">{onlineUntilLabel()}</span>
              )}
            </button>

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
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[110]">
                  <div className="bg-[#e3262e] p-4 text-white flex justify-between items-center">
                    <span className="font-bold">{t('dashboard.notifications.title')}</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('dashboard.notifications.recent')}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="p-4 text-sm text-gray-500">{t('dashboard.notifications.empty')}</div>
                    )}
                    {notifications.map((n) => (
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

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#e3262e] bg-gray-100">
              {model.photos?.[0] ? (
                <img src={model.photos[0]} alt={model.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {saveError && (
            <div className="bg-white border border-red-100 text-red-500 text-xs font-semibold px-4 py-3 rounded-xl">
              {saveError}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
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

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Summary */}
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
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
                  <div className="bg-[#111827] p-8 rounded-[40px] text-white shadow-xl overflow-hidden relative">
                     <div className="relative z-10">
                        <div className="bg-red-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                           <ShieldCheck size={24} />
                        </div>
                        <h4 className="text-xl font-black mb-2">{t('dashboard.premium.title')}</h4>
                        <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                          {t('dashboard.premium.description', { location: model.location?.city ? `${model.location.city} (${model.location.state || ''})` : t('dashboard.premium.fallbackLocation') })}
                        </p>
                        <button className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">{t('dashboard.premium.renew')}</button>
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl"></div>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
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
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
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
                              onClick={() =>
                                handleSave({ bio: bioInput }, () => {
                                  setEditingBio(false);
                                })
                              }
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
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 leading-relaxed pr-10">
                            {model.bio || t('dashboard.form.bioMissing')}
                          </p>
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
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center col-span-2 sm:col-span-4">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('dashboard.form.eyesLabel')}</p>
                              <p className="text-sm font-black text-gray-900">{model.attributes?.eyes ? translateEyes(model.attributes?.eyes) : '-'}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                      <Clock size={18} className="text-[#e3262e]" /> {t('dashboard.pricing.title')}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingPrices(!editingPrices);
                        if (editingPrices) resetEdits();
                      }}
                      className="bg-gray-50 text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editingPrices ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={priceOneHour}
                          onChange={(event) => setPriceOneHour(event.target.value)}
                          placeholder={t('dashboard.pricing.oneHour')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                        />
                        <input
                          type="text"
                          value={priceTwoHours}
                          onChange={(event) => setPriceTwoHours(event.target.value)}
                          placeholder={t('dashboard.pricing.twoHours')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                        />
                        <input
                          type="text"
                          value={priceOvernight}
                          onChange={(event) => setPriceOvernight(event.target.value)}
                          placeholder={t('dashboard.pricing.overnight')}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={saving}
                            onClick={() => {
                              const normalizePrice = (value: string) => Number(value.replace(/\./g, '').replace(',', '.'));
                              const prices = [
                                priceOneHour ? { label: getPriceLabel('oneHour'), value: normalizePrice(priceOneHour) } : null,
                                priceTwoHours ? { label: getPriceLabel('twoHours'), value: normalizePrice(priceTwoHours) } : null,
                                priceOvernight ? { label: getPriceLabel('overnight'), value: normalizePrice(priceOvernight) } : null,
                              ].filter(Boolean) as Array<{ label: string; value: number }>;
                              handleSave({ prices }, () => setEditingPrices(false));
                            }}
                            className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                          >
                            {saving ? t('common.saving') : t('common.save')}
                          </button>
                          <button
                            onClick={() => {
                              resetEdits();
                              setEditingPrices(false);
                            }}
                            className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : model.prices?.length ? (
                      model.prices.map((price, index) => (
                        <div
                          key={`${price.label}-${index}`}
                          className={`flex justify-between p-4 rounded-2xl border ${getPriceId(price.label) === 'overnight' ? 'bg-red-50/50 border-red-100 text-[#e3262e]' : 'bg-gray-50 border-gray-100'}`}
                        >
                          <span className="text-sm font-bold">{translatePriceLabel(price.label)}</span>
                        <span className="text-sm font-black">
                          {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(price.value)}
                        </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">{t('dashboard.pricing.notProvided')}</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <div className="bg-[#111827] p-8 rounded-[40px] text-white shadow-xl overflow-hidden relative">
                   <div className="relative z-10">
                      <div className="bg-red-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                         <ShieldCheck size={24} />
                      </div>
                      <h4 className="text-xl font-black mb-2">{t('dashboard.premium.title')}</h4>
                      <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                        {t('dashboard.premium.description', { location: model.location?.city ? `${model.location.city} (${model.location.state || ''})` : t('dashboard.premium.fallbackLocation') })}
                      </p>
                      <button className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">{t('dashboard.premium.renew')}</button>
                   </div>
                   <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl"></div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'photos' && (
            <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
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
                <div className="space-y-3">
                  <input type="file" multiple accept="image/*" onChange={handlePhotoAdd} />
                  <div className="grid grid-cols-3 gap-2">
                    {photosInput.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="relative"
                      >
                        <img src={photo} alt={`foto-${index}`} className="w-full h-24 object-cover rounded-xl" />
                        <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">x</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => handleSave({ photos: photosInput }, () => setEditingPhotos(false))}
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
            <div className="grid lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 mb-6">
                  <CreditCard size={18} className="text-[#e3262e]" /> {t('dashboard.billing.title')}
                </h3>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-3xl p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase">{t('dashboard.billing.currentPlan')}</p>
                      <h4 className="text-xl font-black text-gray-900">{t('dashboard.billing.premium')}</h4>
                      <p className="text-sm text-gray-500">{t('dashboard.billing.autoRenew')}</p>
                    </div>
                    <button className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest">{t('dashboard.billing.manage')}</button>
                  </div>
                  <div className="border border-gray-100 rounded-3xl p-6">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">{t('dashboard.billing.history')}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('dashboard.billing.historyEntry')}</span>
                      <span className="font-bold text-gray-900">{new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(99.9)}</span>
                    </div>
                  </div>
                </div>
              </section>
              <aside className="bg-[#111827] p-8 rounded-[40px] text-white shadow-xl">
                <h4 className="text-lg font-black mb-2">{t('dashboard.billing.upgradeTitle')}</h4>
                <p className="text-xs text-gray-400 mb-6">{t('dashboard.billing.upgradeDesc')}</p>
                <button className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">{t('dashboard.billing.viewPlans')}</button>
              </aside>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 mb-6">
                  <Settings size={18} className="text-[#e3262e]" /> {t('dashboard.settings.title')}
                </h3>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-3xl p-6">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">{t('dashboard.settings.statusLabel')}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{t('dashboard.settings.showOnline')}</p>
                      <button
                        onClick={handleToggleOnline}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                          isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isOnline ? t('common.online') : t('common.offline')}
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-3xl p-6">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">{t('dashboard.settings.account')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.settings.registeredEmail', { email: model.email || t('profile.notInformed') })}</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {showOnlinePicker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOnlinePicker(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl">
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
