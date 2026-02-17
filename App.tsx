
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Heart, MapPin } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import QuickLinks from './components/QuickLinks';
import StickySearch from './components/StickySearch';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ModelOnboarding from './components/ModelOnboarding';
import MapView from './components/MapView';
import ModelProfile from './components/ModelProfile';
import BlogSection from './components/BlogSection';
import { AuthUser, clearCurrentUser, getCurrentUser, getPendingModelProfile, PendingModelProfile } from './services/auth';
import { fetchModelByEmail, fetchModelById, fetchModelsAll, ModelProfileData } from './services/models';
import { getSavedModelIds, isSavedModelsStorageKey, pruneSavedModels } from './services/savedModels';
import AdminPage from './components/AdminPage';
import ModelDashboard from './components/ModelDashboard';
import ModelListing from './components/ModelListing';
import ModelCard from './components/ModelCard';
import PasswordRecoveryPage from './components/PasswordRecoveryPage';
import { resolveLanguageFromCountry } from './translations';
import { useI18n } from './translations/i18n';

const LOCATION_PROMPT_KEY = 'punto_location_prompt';
const LOCATION_PERMISSION_KEY = 'punto_location_permission';
const LANGUAGE_PROMPT_KEY = 'punto_language_prompt';

const App: React.FC = () => {
  const { t, translateError, setLanguage, setLanguageAuto, languageSource, languageOptions, translateStatLabel } = useI18n();
  const [showSticky, setShowSticky] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isModelOnboardingOpen, setIsModelOnboardingOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfileModel, setSelectedProfileModel] = useState<ModelProfileData | null>(null);
  const [pendingModelProfile, setPendingModelProfile] = useState<PendingModelProfile | null>(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null);
  const [featuredModels, setFeaturedModels] = useState<ModelProfileData[]>([]);
  const [featuredError, setFeaturedError] = useState('');
  const [savedModelIds, setSavedModelIds] = useState<string[]>(() => getSavedModelIds());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [passwordRecoveryEmail, setPasswordRecoveryEmail] = useState('');
  const [myModelProfile, setMyModelProfile] = useState<ModelProfileData | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(LANGUAGE_PROMPT_KEY) !== '1';
  });
  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('punto_age_ok') !== '1';
  });
  type StaticPageKey = 'about' | 'blog' | 'help' | 'ethics' | 'terms' | 'privacy' | 'cookies' | 'report';
  const [staticPage, setStaticPage] = useState<null | { key: StaticPageKey }>(null);
  const lastBasePathRef = useRef('/');
  const locationPromptDeferredRef = useRef(false);

  useEffect(() => {
    if (languageSource === 'manual') {
      setShowLanguagePrompt(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_PROMPT_KEY, '1');
      }
    }
  }, [languageSource]);

  useEffect(() => {
    const handleScroll = () => {
      // Exibe a busca fixa após rolar 350px (quando a busca do Hero começa a sumir)
      if (window.scrollY > 350) {
        setShowSticky(true);
      } else {
        setShowSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    const handleRoute = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, [t, translateError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setSavedModelIds(getSavedModelIds());
    const handleStorage = (event: StorageEvent) => {
      if (isSavedModelsStorageKey(event.key)) {
        refresh();
      }
    };
    window.addEventListener('punto_saved_models', refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('punto_saved_models', refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    setSavedModelIds(getSavedModelIds());
  }, [currentUser]);

  useEffect(() => {
    if (!featuredModels.length) return;
    const ids = featuredModels.map((model) => model.id);
    pruneSavedModels(ids);
    if (currentUser) {
      pruneSavedModels(ids, null);
    }
  }, [currentUser, featuredModels]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (languageSource === 'manual') return;
    if (showLanguagePrompt) return;
    const browserLanguage = resolveLanguageFromNavigator();
    if (browserLanguage) {
      setLanguageAuto(browserLanguage);
      return;
    }
    if (!navigator.geolocation) return;
    if (window.localStorage.getItem(LOCATION_PROMPT_KEY) === '1') return;
    if (showLocationPrompt) return;
    if (showAgeGate && locationPromptDeferredRef.current) return;

    const revealPrompt = () => setShowLocationPrompt(true);

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          if (result.state === 'granted') {
            window.localStorage.setItem(LOCATION_PROMPT_KEY, '1');
            window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
            requestLanguageFromGeolocation();
            return;
          }
          if (result.state === 'denied') {
            window.localStorage.setItem(LOCATION_PROMPT_KEY, '1');
            window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
            return;
          }
          revealPrompt();
        })
        .catch(revealPrompt);
    } else {
      revealPrompt();
    }
  }, [showAgeGate, showLocationPrompt, languageSource]);

  const loadFeatured = () => {
    fetchModelsAll()
      .then((models) => {
        const sorted = [...models].sort((a, b) => {
          const aOnline = a.isOnline === false ? 0 : 1;
          const bOnline = b.isOnline === false ? 0 : 1;
          if (aOnline !== bOnline) return bOnline - aOnline;
          return 0;
        });
        setFeaturedModels(sorted);
        setFeaturedError('');
      })
      .catch((error) => {
        setFeaturedError(
          error instanceof Error ? translateError(error.message) : t('errors.loadFeatured')
        );
      });
  };

  const handleProfilePublished = (user?: AuthUser | null) => {
    const activeUser = user ?? currentUser;
    if (user) {
      setCurrentUser(user);
    }
    loadFeatured();
    loadMyProfile(activeUser);
    navigateTo('/dashboard');
  };

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchModelsAll()
        .then((models) => {
          if (!mounted) return;
          const sorted = [...models].sort((a, b) => {
            const aOnline = a.isOnline === false ? 0 : 1;
            const bOnline = b.isOnline === false ? 0 : 1;
            if (aOnline !== bOnline) return bOnline - aOnline;
            return 0;
          });
          setFeaturedModels(sorted);
          setFeaturedError('');
        })
        .catch((error) => {
          if (!mounted) return;
          setFeaturedError(
            error instanceof Error ? translateError(error.message) : t('errors.loadFeatured')
          );
        });
    };
    load();
    const intervalId = window.setInterval(load, 15000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const loadMyProfile = (user = currentUser) => {
    setMyModelProfile(null);
    if (!user || user.role !== 'model') {
      return;
    }
    fetchModelByEmail(user.email)
      .then((model) => setMyModelProfile(model))
      .catch(() => setMyModelProfile(null));
  };

  useEffect(() => {
    loadMyProfile(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!selectedProfileModel?.id) return;
    let mounted = true;
    const refresh = () => {
      fetchModelById(selectedProfileModel.id)
        .then((model) => {
          if (!mounted) return;
          setSelectedProfileModel(model);
        })
        .catch(() => {
          // ignore refresh errors
        });
    };
    const intervalId = window.setInterval(refresh, 15000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [selectedProfileModel?.id]);

  const openLogin = () => {
    setIsRegisterOpen(false);
    setIsModelOnboardingOpen(false);
    setIsLoginOpen(true);
    if (pathname === '/cadastro' || pathname === '/modelo/cadastro') {
      navigateTo(lastBasePathRef.current || '/', { replace: true });
    }
  };

  const openRegister = () => {
    setIsLoginOpen(false);
    setIsModelOnboardingOpen(false);
    setIsRegisterOpen(true);
    if (pathname !== '/cadastro' && pathname !== '/modelo/cadastro' && pathname !== '/dashboard' && pathname !== '/admin') {
      lastBasePathRef.current = pathname || '/';
    }
    if (pathname !== '/cadastro') {
      navigateTo('/cadastro');
    }
  };

  const openPasswordRecovery = (identifier?: string) => {
    setIsLoginOpen(false);
    setIsRegisterOpen(false);
    setIsModelOnboardingOpen(false);
    setPasswordRecoveryEmail((identifier || '').trim());
    if (pathname !== '/esqueci-senha') {
      navigateTo('/esqueci-senha');
    }
  };

  const handleLanguagePick = (code: typeof languageOptions[number]['code']) => {
    setLanguage(code);
    setShowLanguagePrompt(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_PROMPT_KEY, '1');
    }
  };

  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    navigateTo('/');
  };

  const navigateTo = (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    setPathname(path);
  };

  const resolveLanguageFromNavigator = () => {
    if (typeof navigator === 'undefined') return null;
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of languages) {
      const normalized = (lang || '').toLowerCase();
      if (normalized.startsWith('pt')) return 'br';
      if (normalized.startsWith('en')) return 'us';
      if (normalized.startsWith('es')) return 'es';
      if (normalized.startsWith('it')) return 'it';
      if (normalized.startsWith('de')) return 'de';
      if (normalized.startsWith('fr')) return 'fr';
    }
    return null;
  };

  const slugify = (value: string) => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const buildSearchPath = (query: string) => {
    const slug = slugify(query);
    return slug ? `/${slug}` : '/';
  };

  const buildProfilePath = (model: ModelProfileData) => {
    const name = model.name ? slugify(model.name) : 'modelo';
    return `/modelo/${name}-${model.id}`;
  };

  const handleLoginSuccess = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    loadMyProfile(user);
    if (user?.role === 'admin') {
      navigateTo('/admin');
    } else if (user?.role === 'model') {
      navigateTo('/dashboard');
    }
  };

  const startModelOnboarding = (profile: PendingModelProfile) => {
    setIsRegisterOpen(false);
    setPendingModelProfile(profile);
    setIsModelOnboardingOpen(true);
    if (pathname !== '/modelo/cadastro') {
      navigateTo('/modelo/cadastro');
    }
  };

  const handleSearch = async (query: string, options?: { updatePath?: boolean }) => {
    const trimmed = query.trim();
    setSearchQuery(trimmed);
    setSearchCoords(null);
    setIsSearching(true);
    // Impede o scroll da página principal enquanto o mapa está aberto
    document.body.style.overflow = 'hidden';

    if (options?.updatePath !== false) {
      const nextPath = buildSearchPath(trimmed);
      if (nextPath !== pathname) {
        navigateTo(nextPath);
      }
    }

    if (!trimmed) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(trimmed)}`
      );
      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : null;
      const lat = first?.lat ? Number(first.lat) : null;
      const lon = first?.lon ? Number(first.lon) : null;
      const city =
        first?.address?.city ||
        first?.address?.town ||
        first?.address?.village ||
        first?.address?.municipality ||
        first?.address?.state ||
        '';
      if (city) {
        setSearchQuery(city);
        if (options?.updatePath !== false) {
          const nextPath = buildSearchPath(city);
          if (nextPath !== pathname) {
            navigateTo(nextPath, { replace: true });
          }
        }
      }
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setSearchCoords([lat, lon]);
      }
    } catch {
      // fallback to typed query
    }
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      handleSearch('', { updatePath: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.state ||
            '';
          handleSearch(city);
        } catch {
          handleSearch('', { updatePath: false });
        }
      },
      () => handleSearch('', { updatePath: false })
    );
  };

  const autoDetectLanguage = async (lat: number, lon: number) => {
    if (languageSource === 'manual') return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&addressdetails=1`
      );
      const data = await response.json();
      const countryCode = data?.address?.country_code;
      const resolved = resolveLanguageFromCountry(countryCode);
      if (resolved) {
        setLanguageAuto(resolved);
      }
    } catch {
      // ignore
    }
  };

  const requestLanguageFromGeolocation = () => {
    if (!navigator.geolocation) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'unsupported');
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
        }
        void autoDetectLanguage(position.coords.latitude, position.coords.longitude);
      },
      () => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
        }
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
  };

  const handleLocationAllow = () => {
    setShowLocationPrompt(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCATION_PROMPT_KEY, '1');
    }
    requestLanguageFromGeolocation();
  };

  const handleLocationDeny = () => {
    setShowLocationPrompt(false);
    if (typeof window !== 'undefined') {
      if (showAgeGate) {
        locationPromptDeferredRef.current = true;
        window.localStorage.setItem(LOCATION_PROMPT_KEY, 'later');
      } else {
        window.localStorage.setItem(LOCATION_PROMPT_KEY, '1');
      }
      window.localStorage.setItem(LOCATION_PERMISSION_KEY, 'dismissed');
    }
  };

  const closeSearch = () => {
    setIsSearching(false);
    navigateTo('/');
    if (!selectedProfileModel) {
      document.body.style.overflow = 'auto';
    }
  };

  const openProfile = (model: ModelProfileData) => {
    setSelectedProfileModel(model);
    document.body.style.overflow = 'hidden';
    if (pathname !== '/dashboard' && pathname !== '/admin') {
      navigateTo(buildProfilePath(model));
    }
  };

  const closeProfile = () => {
    setSelectedProfileModel(null);
    if (pathname.startsWith('/modelo/')) {
      navigateTo(lastBasePathRef.current || '/');
    }
    if (!isSearching) {
      document.body.style.overflow = 'auto';
    }
  };

  const openListing = () => {
    setIsListingOpen(true);
    document.body.style.overflow = 'hidden';
    if (pathname !== '/dashboard' && pathname !== '/admin') {
      navigateTo('/todasmodelos');
    }
  };

  const closeListing = () => {
    setIsListingOpen(false);
    if (pathname === '/todasmodelos') {
      navigateTo('/');
    }
    if (!isSearching && !selectedProfileModel) {
      document.body.style.overflow = 'auto';
    }
  };

  const savedModels = featuredModels.filter((model) => savedModelIds.includes(model.id));
  const displayedModels = showSavedOnly ? savedModels : featuredModels;
  const visibleModels = showSavedOnly ? displayedModels : displayedModels.slice(0, 8);
  const savedOnlineModels = savedModels
    .filter((model) => model.isOnline !== false)
    .map((model) => ({ id: model.id, name: model.name }));

  useEffect(() => {
    if (pathname === '/admin' || pathname === '/dashboard' || pathname === '/blog' || pathname === '/esqueci-senha') return;
    if (pathname.startsWith('/modelo/')) return;
    if (pathname === '/cadastro') return;
    lastBasePathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/admin' || pathname === '/dashboard') return;

    const cleanPath = pathname.replace(/^\/+/, '');
    if (!cleanPath) {
      setIsListingOpen(false);
      setIsSearching(false);
      setSelectedProfileModel(null);
      document.body.style.overflow = 'auto';
      return;
    }

    if (cleanPath === 'blog') {
      setIsListingOpen(false);
      setIsSearching(false);
      setSelectedProfileModel(null);
      document.body.style.overflow = 'auto';
      return;
    }

    if (cleanPath === 'esqueci-senha') {
      setIsListingOpen(false);
      setIsSearching(false);
      setSelectedProfileModel(null);
      setIsLoginOpen(false);
      setIsRegisterOpen(false);
      setIsModelOnboardingOpen(false);
      document.body.style.overflow = 'auto';
      return;
    }

    if (cleanPath === 'cadastro') {
      setIsRegisterOpen(true);
      setIsModelOnboardingOpen(false);
      setIsListingOpen(false);
      setIsSearching(false);
      setSelectedProfileModel(null);
      document.body.style.overflow = 'auto';
      return;
    }

    if (cleanPath === 'modelo/cadastro') {
      const pending = pendingModelProfile || getPendingModelProfile();
      if (pending) {
        setPendingModelProfile(pending);
        setIsModelOnboardingOpen(true);
        setIsRegisterOpen(false);
      } else {
        setIsRegisterOpen(true);
        setIsModelOnboardingOpen(false);
      }
      setIsListingOpen(false);
      setIsSearching(false);
      setSelectedProfileModel(null);
      document.body.style.overflow = 'auto';
      return;
    }

    if (cleanPath === 'todasmodelos') {
      if (!isListingOpen) {
        setIsListingOpen(true);
        setIsSearching(false);
        setSelectedProfileModel(null);
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (cleanPath.startsWith('modelo/')) {
      const slug = cleanPath.slice('modelo/'.length);
      const id = slug.split('-').pop();
      if (id && selectedProfileModel?.id !== id) {
        fetchModelById(id)
          .then((model) => {
            setSelectedProfileModel(model);
            document.body.style.overflow = 'hidden';
          })
          .catch(() => undefined);
      }
      setIsListingOpen(false);
      setIsSearching(false);
      return;
    }

    const query = decodeURIComponent(cleanPath).replace(/-/g, ' ');
    if (query) {
      handleSearch(query, { updatePath: false });
      return;
    }
  }, [pathname, pendingModelProfile]);

  const locationPrompt =
    showLocationPrompt && languageSource !== 'manual' ? (
      <div className="fixed bottom-4 left-0 right-0 z-[1001] px-4">
        <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{t('locationPermission.title')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('locationPermission.body')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLocationDeny}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900"
            >
              {t('locationPermission.deny')}
            </button>
            <button
              onClick={handleLocationAllow}
              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest"
            >
              {t('locationPermission.allow')}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const footer = (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-bold text-xl mb-6">
              Punto<span className="text-gray-500">escort</span>
            </h3>
            <p className="max-w-sm mb-6 leading-relaxed">{t('footer.description')}</p>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 bg-gray-800 rounded-full hover:bg-[#e3262e] transition-colors cursor-pointer flex items-center justify-center"
                >
                  <div className="w-5 h-5 border border-white/20 rounded-sm"></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{t('footer.institutional')}</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'about',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.aboutUs')}
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/blog')} className="hover:text-white">
                  {t('footer.blog')}
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'help',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.help')}
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'ethics',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.ethics')}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{t('footer.legal')}</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'terms',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.terms')}
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'privacy',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.privacy')}
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'cookies',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.cookies')}
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setStaticPage({
                      key: 'report',
                    })
                  }
                  className="hover:text-white"
                >
                  {t('footer.report')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          {[
            { value: '+3', label: 'de usuários' },
            { value: '+3', label: 'acompanhantes' },
            { value: '+12', label: 'de imagens' },
            { value: '+0', label: 'avaliações' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center md:items-start">
              <span className="text-lg md:text-xl font-bold text-white">{stat.value}</span>
              <span className="text-xs md:text-sm text-gray-400 font-medium whitespace-nowrap">
                {translateStatLabel(stat.label)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 text-xs text-center md:text-left flex flex-col md:row justify-between gap-4">
          <p>{t('footer.rights')}</p>
          <p className="flex gap-4 justify-center md:justify-end">
            <span>{t('footer.cnpj')}</span>
            <span>{t('footer.country')}</span>
          </p>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {showLanguagePrompt && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(227,38,46,0.35),_transparent_55%)] bg-black/75 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-[30px] border border-white/10 bg-[#0f0f12]/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-3 gap-3">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => handleLanguagePick(option.code)}
                  className="group flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[#e3262e] hover:bg-white/10 hover:shadow-[0_12px_24px_rgba(227,38,46,0.25)]"
                >
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a22] shadow-inner">
                    <img
                      src={`https://flagcdn.com/w80/${option.code}.png`}
                      alt={option.label}
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-white/80 transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showAgeGate && (
        <div className="fixed inset-0 z-[999] bg-[#0f0f12] text-white flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(227,38,46,0.25),_transparent_45%)]" />
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '36px 36px' }}></div>
          <div className="relative max-w-xl w-full bg-[#15151b]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#e3262e] font-black">{t('ageGate.badge')}</p>
              <h1 className="text-2xl md:text-3xl font-black mt-3">{t('ageGate.title')}</h1>
              <p className="text-sm text-white/70 mt-4 leading-relaxed">
                {t('ageGate.body')}
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowAgeGate(false);
                  window.localStorage.setItem('punto_age_ok', '1');
                }}
                className="flex-1 bg-[#e3262e] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
              >
                {t('ageGate.confirm')}
              </button>
              <button
                onClick={() => {
                  window.location.href = 'https://www.google.com';
                }}
                className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-colors"
              >
                {t('ageGate.exit')}
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-6 text-center uppercase tracking-[0.25em]">
              {t('ageGate.values')}
            </p>
          </div>
        </div>
      )}
      {pathname === '/admin' ? (
        currentUser?.role === 'admin' ? (
          <AdminPage />
        ) : (
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-100">
              <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                <span className="font-black text-gray-900">{t('common.appName')}</span>
                <button onClick={() => navigateTo('/')} className="text-sm font-bold text-[#e3262e]">{t('common.backToSite')}</button>
              </div>
            </header>
            <main className="flex-1 flex items-center justify-center px-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md text-center shadow-sm">
                <h1 className="text-xl font-black text-gray-900 mb-2">{t('gate.restricted')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('gate.adminOnly')}</p>
                <button onClick={openLogin} className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest">
                  {t('gate.goLogin')}
                </button>
              </div>
            </main>
          </div>
        )
      ) : pathname === '/dashboard' ? (
        currentUser?.role === 'model' && myModelProfile ? (
          <ModelDashboard
            onLogout={handleLogout}
            onViewProfile={() => openProfile(myModelProfile)}
            model={myModelProfile}
            onModelUpdated={(updated) => setMyModelProfile(updated)}
            currentUserId={currentUser?.id}
            currentUserEmail={currentUser?.email}
          />
        ) : (
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-100">
              <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                <span className="font-black text-gray-900">{t('common.appName')}</span>
                <button onClick={() => navigateTo('/')} className="text-sm font-bold text-[#e3262e]">{t('common.backToSite')}</button>
              </div>
            </header>
            <main className="flex-1 flex items-center justify-center px-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md text-center shadow-sm">
                <h1 className="text-xl font-black text-gray-900 mb-2">{t('gate.restricted')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('gate.modelOnly')}</p>
                <button onClick={openLogin} className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest">
                  {t('gate.goLogin')}
                </button>
              </div>
            </main>
          </div>
        )
      ) : pathname === '/esqueci-senha' ? (
        <PasswordRecoveryPage
          initialEmail={passwordRecoveryEmail}
          currentUserId={currentUser?.id}
          currentUserEmail={currentUser?.email}
          onBackToSite={() => navigateTo('/')}
          onOpenLogin={openLogin}
        />
      ) : pathname === '/blog' ? (
        <>
          {locationPrompt}
          <Header
            onLoginClick={openLogin}
            onRegisterClick={openRegister}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenProfile={() => {
              if (myModelProfile) openProfile(myModelProfile);
            }}
            hasProfile={Boolean(myModelProfile)}
            onOpenDashboard={() => navigateTo('/dashboard')}
            savedOnlineModels={savedOnlineModels}
            currentModelId={myModelProfile?.id}
          />
          <main className="min-h-screen bg-white">
            <BlogSection />
          </main>
          {footer}
        </>
      ) : (
        <>
          {locationPrompt}
          <Header
            onLoginClick={openLogin}
            onRegisterClick={openRegister}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenProfile={() => {
              if (myModelProfile) openProfile(myModelProfile);
            }}
            hasProfile={Boolean(myModelProfile)}
            onOpenDashboard={() => navigateTo('/dashboard')}
            savedOnlineModels={savedOnlineModels}
            currentModelId={myModelProfile?.id}
          />
      
      {/* Barra de Busca Fixa (Sticky) - Aparece ao descer a página */}
      <div className={`fixed top-16 md:top-20 left-0 right-0 z-40 transition-all duration-500 ease-in-out transform ${
        showSticky && !isSearching ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <StickySearch onSearch={handleSearch} />
      </div>

      <main>
        <Hero onSearch={handleSearch} onRegisterClick={openRegister} />

        <div className="">
          
          <img
           



           
          />
        </div>
        
        {/* Featured Profiles Section */}
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-10">
              <div>
                <h2 className="text-2xl font-bold">{t('featured.title')}</h2>
                <p className="text-gray-500">{t('featured.subtitle')}</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3 sm:flex-row sm:items-center sm:justify-end sm:text-left sm:gap-3">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleNearMe}
                    className="text-gray-900 font-bold text-xs sm:text-sm uppercase tracking-wider hover:underline inline-flex items-center gap-2"
                  >
                    <MapPin size={14} className="text-gray-500" />
                    {t('featured.nearMe')}
                  </button>
                  <button
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                    className={`flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wider ${
                      showSavedOnly ? 'text-[#e3262e]' : 'text-gray-900'
                    }`}
                  >
                    <Heart size={16} className={showSavedOnly ? 'text-[#e3262e]' : 'text-gray-500'} />
                    {t('featured.saved')}
                    {savedModelIds.length > 0 && (
                      <span className="text-xs font-black text-gray-500">({savedModelIds.length})</span>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowSavedOnly(false);
                    openListing();
                  }}
                  className="self-center text-[#e3262e] font-bold text-xs sm:text-sm uppercase tracking-wider hover:underline inline-flex items-center gap-2"
                >
                  {t('featured.viewAll')}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {visibleModels.map((model) => (
                <ModelCard key={model.id} model={model} onClick={() => openProfile(model)} />
              ))}
            </div>
            {!showSavedOnly && featuredModels.length > 8 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={openListing}
                  className="px-6 py-3 rounded-full bg-[#e3262e] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
                >
                  {t('featured.viewAll')}
                </button>
              </div>
            )}
            {showSavedOnly && displayedModels.length === 0 && (
              <p className="text-sm text-gray-500 mt-6">{t('featured.savedEmpty')}</p>
            )}
            {!showSavedOnly && featuredModels.length === 0 && !featuredError && (
              <p className="text-sm text-gray-500 mt-6">{t('featured.noneAvailable')}</p>
            )}
            {featuredError && (
              <p className="text-xs text-red-500 mt-6">{featuredError}</p>
            )}
          </div>
        </section>

        <QuickLinks />
      </main>

      {footer}

        </>
      )}

      {/* Modals */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSwitchToRegister={openRegister}
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={openPasswordRecovery}
      />
      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => {
          setIsRegisterOpen(false);
          if (pathname === '/cadastro' || pathname === '/modelo/cadastro') {
            navigateTo(lastBasePathRef.current || '/', { replace: true });
          }
        }} 
        onSwitchToLogin={openLogin}
        onModelRegisterSuccess={startModelOnboarding}
        onRegisterSuccess={handleLoginSuccess}
      />

      {/* Full Page Flow for Models Onboarding */}
      <ModelOnboarding 
        isOpen={isModelOnboardingOpen}
        onClose={() => {
          setIsModelOnboardingOpen(false);
          setPendingModelProfile(null);
          if (pathname === '/modelo/cadastro') {
            navigateTo(lastBasePathRef.current || '/', { replace: true });
          }
        }}
        registration={pendingModelProfile}
        onProfilePublished={handleProfilePublished}
      />

      {isListingOpen && (
        <ModelListing
          models={featuredModels}
          onClose={closeListing}
          onViewProfile={openProfile}
        />
      )}

      {/* Full Page Map Search View */}
      {isSearching && (
        <MapView 
          onClose={closeSearch} 
          onViewProfile={openProfile}
          query={searchQuery}
          searchCoords={searchCoords}
        />
      )}

      {/* Full Page Model Profile Detail View */}
      {selectedProfileModel && (
        <ModelProfile 
          model={selectedProfileModel} 
          onClose={closeProfile} 
        />
      )}
      {staticPage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStaticPage(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[28px] p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e3262e]">{t('common.appName')}</p>
                <h2 className="text-2xl font-black text-gray-900 mt-2">{t(`staticPages.${staticPage.key}.title`)}</h2>
              </div>
              <button
                onClick={() => setStaticPage(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                {t('common.close')}
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-6">{t(`staticPages.${staticPage.key}.body`)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
