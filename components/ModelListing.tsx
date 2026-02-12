import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Heart, Search, SlidersHorizontal } from 'lucide-react';
import { ModelProfileData, isBillingActive } from '../services/models';
import { getSavedModelIds, isSavedModelsStorageKey, toggleSavedModel } from '../services/savedModels';
import { useI18n } from '../translations/i18n';
import { getIdentityLabel } from '../translations';
import ModelCard from './ModelCard';

interface ModelListingProps {
  models: ModelProfileData[];
  onClose: () => void;
  onViewProfile: (model: ModelProfileData) => void;
}

const ModelListing: React.FC<ModelListingProps> = ({ models, onClose, onViewProfile }) => {
  const { t, translateService, translateHair, translateEyes, language } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    onlineOnly: false,
    premiumOnly: false,
    city: '',
    state: '',
    hair: '',
    eyes: '',
    identity: '',
    minAge: '',
    maxAge: '',
  });
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedModelIds());

  useEffect(() => {
    const refresh = () => setSavedIds(getSavedModelIds());
    const handleStorage = (event: StorageEvent) => {
      if (isSavedModelsStorageKey(event.key)) refresh();
    };
    window.addEventListener('punto_saved_models', refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('punto_saved_models', refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const states = new Set<string>();
    const services = new Set<string>();
    const hair = new Set<string>();
    const eyes = new Set<string>();
    const identities = new Set<string>();
    let minAge: number | null = null;
    let maxAge: number | null = null;
    let hasOffline = false;
    let hasPremium = false;

    models.forEach((model) => {
      if (model.location?.city) cities.add(model.location.city);
      if (model.location?.state) states.add(model.location.state);
      model.services?.forEach((service) => services.add(service));
      if (model.attributes?.hair) hair.add(model.attributes.hair);
      if (model.attributes?.eyes) eyes.add(model.attributes.eyes);
      if (model.attributes?.profileIdentity) identities.add(model.attributes.profileIdentity);
      if (typeof model.age === 'number') {
        minAge = minAge === null ? model.age : Math.min(minAge, model.age);
        maxAge = maxAge === null ? model.age : Math.max(maxAge, model.age);
      }
      if (model.isOnline === false) {
        hasOffline = true;
      }
      if (isBillingActive(model.billing)) {
        hasPremium = true;
      }
    });

    return {
      cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
      states: Array.from(states).sort((a, b) => a.localeCompare(b)),
      services: Array.from(services).sort((a, b) => a.localeCompare(b)),
      hair: Array.from(hair).sort((a, b) => a.localeCompare(b)),
      eyes: Array.from(eyes).sort((a, b) => a.localeCompare(b)),
      identities: Array.from(identities).sort((a, b) => getIdentityLabel(a, language).localeCompare(getIdentityLabel(b, language))),
      minAge,
      maxAge,
      hasOffline,
      hasPremium,
    };
  }, [language, models]);

  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const minAge = filters.minAge ? Number(filters.minAge) : null;
    const maxAge = filters.maxAge ? Number(filters.maxAge) : null;
    return models.filter((model) => {
      const name = (model.name || '').toLowerCase();
      const city = (model.location?.city || '').toLowerCase();
      const state = (model.location?.state || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || city.includes(query) || state.includes(query);
      if (!matchesSearch) return false;

      if (showSavedOnly && !savedIds.includes(model.id)) return false;
      if (filters.onlineOnly && model.isOnline === false) return false;
      if (filters.premiumOnly && !isBillingActive(model.billing)) return false;
      if (filters.city && (model.location?.city || '') !== filters.city) return false;
      if (filters.state && (model.location?.state || '') !== filters.state) return false;
      if (filters.hair && (model.attributes?.hair || '') !== filters.hair) return false;
      if (filters.eyes && (model.attributes?.eyes || '') !== filters.eyes) return false;
      if (filters.identity && (model.attributes?.profileIdentity || '') !== filters.identity) return false;

      if (selectedServices.length > 0) {
        const modelServices = model.services || [];
        if (!selectedServices.some((service) => modelServices.includes(service))) return false;
      }

      if (minAge !== null && (typeof model.age !== 'number' || model.age < minAge)) return false;
      if (maxAge !== null && (typeof model.age !== 'number' || model.age > maxAge)) return false;

      return true;
    });
  }, [filters, models, savedIds, searchQuery, selectedServices, showSavedOnly]);

  const handleToggleSave = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const result = toggleSavedModel(id);
    setSavedIds(result.entries.map((entry) => entry.id));
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((item) => item !== serviceId) : [...prev, serviceId]
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setShowSavedOnly(false);
    setSelectedServices([]);
      setFilters({
        onlineOnly: false,
        premiumOnly: false,
        city: '',
        state: '',
        hair: '',
        eyes: '',
        identity: '',
        minAge: '',
        maxAge: '',
      });
    };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-50 flex flex-col animate-in fade-in slide-in-from-right-10 duration-500 overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">{t('listing.title')}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('listing.count', { count: filteredModels.length })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSavedOnly((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
              showSavedOnly
                ? 'bg-[#e3262e] text-white shadow-lg shadow-red-200'
                : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}
          >
            <Heart size={14} fill={showSavedOnly ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{t('listing.saved')}</span>
            {savedIds.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${
                  showSavedOnly ? 'bg-white text-[#e3262e]' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {savedIds.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('listing.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/10 transition-all text-sm font-medium"
            />
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all ${
              showFilters ? 'bg-[#e3262e] text-white shadow-lg shadow-red-200' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={18} />
            {t('listing.filters')}
          </button>
        </div>
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filterOptions.hasOffline && (
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                <input
                  type="checkbox"
                  checked={filters.onlineOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, onlineOnly: event.target.checked }))}
                  className="accent-[#e3262e]"
                />
                {t('listing.filtersOnline')}
              </label>
            )}
            {filterOptions.hasPremium && (
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                <input
                  type="checkbox"
                  checked={filters.premiumOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, premiumOnly: event.target.checked }))}
                  className="accent-[#e3262e]"
                />
                {t('listing.filtersPremium')}
              </label>
            )}

            {filterOptions.cities.length > 0 && (
              <select
                value={filters.city}
                onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
              >
                <option value="">{t('listing.filtersCity')}</option>
                {filterOptions.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            {filterOptions.states.length > 0 && (
              <select
                value={filters.state}
                onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
              >
                <option value="">{t('listing.filtersState')}</option>
                {filterOptions.states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            )}

            {filterOptions.hair.length > 0 && (
              <select
                value={filters.hair}
                onChange={(event) => setFilters((prev) => ({ ...prev, hair: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
              >
                <option value="">{t('listing.filtersHair')}</option>
                {filterOptions.hair.map((option) => (
                  <option key={option} value={option}>
                    {translateHair(option)}
                  </option>
                ))}
              </select>
            )}

            {filterOptions.eyes.length > 0 && (
              <select
                value={filters.eyes}
                onChange={(event) => setFilters((prev) => ({ ...prev, eyes: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
              >
                <option value="">{t('listing.filtersEyes')}</option>
                {filterOptions.eyes.map((option) => (
                  <option key={option} value={option}>
                    {translateEyes(option)}
                  </option>
                ))}
              </select>
            )}

            {filterOptions.identities.length > 0 && (
              <select
                value={filters.identity}
                onChange={(event) => setFilters((prev) => ({ ...prev, identity: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
              >
                <option value="">{t('listing.filtersIdentity')}</option>
                {filterOptions.identities.map((option) => (
                  <option key={option} value={option}>
                    {getIdentityLabel(option, language)}
                  </option>
                ))}
              </select>
            )}

            {(filterOptions.minAge !== null || filterOptions.maxAge !== null) && (
              <div className="flex gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={t('listing.filtersAgeMin', { count: filterOptions.minAge ?? '' })}
                  value={filters.minAge}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minAge: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={t('listing.filtersAgeMax', { count: filterOptions.maxAge ?? '' })}
                  value={filters.maxAge}
                  onChange={(event) => setFilters((prev) => ({ ...prev, maxAge: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600"
                />
              </div>
            )}

            {filterOptions.services.length > 0 && (
              <div className="lg:col-span-4 flex flex-wrap gap-2">
                {filterOptions.services.map((service) => {
                  const active = selectedServices.includes(service);
                  return (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        active
                          ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-lg shadow-red-100'
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {translateService(service)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="lg:col-span-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {t('listing.filtersHint')}
              </span>
              <button
                onClick={resetFilters}
                className="text-xs font-black uppercase tracking-widest text-[#e3262e] hover:underline"
              >
                {t('listing.clearFilters')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {filteredModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onClick={() => onViewProfile(model)}
                  showSave
                  isSaved={savedIds.includes(model.id)}
                  onToggleSave={(event) => handleToggleSave(event, model.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-gray-100 rounded-[40px] flex items-center justify-center mb-6 text-gray-300">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{t('listing.emptyTitle')}</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                {showSavedOnly ? t('listing.emptySaved') : t('listing.emptyDefault')}
              </p>
              <button
                onClick={resetFilters}
                className="mt-8 text-[#e3262e] font-black text-xs uppercase tracking-widest hover:underline"
              >
                {t('listing.clearFilters')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelListing;
