
import React, { useEffect, useState } from 'react';
import { X, Check, Camera, MapPin, Smartphone, User, ArrowRight, ChevronLeft, Info, Heart } from 'lucide-react';
import Logo from './Logo';
import { AuthUser, clearPendingModelProfile, getPendingModelProfile, PendingModelProfile, registerUser, setCurrentUser } from '../services/auth';
import { uploadImage } from '../services/cloudinary';
import { createModelProfile } from '../services/models';
import { hairOptions, eyeOptions, serviceOptions } from '../translations';
import { useI18n } from '../translations/i18n';
import LocationPicker, { LocationValue } from './LocationPicker';

interface ModelOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  registration?: PendingModelProfile | null;
  onProfilePublished?: (user?: AuthUser | null) => void;
}

const ModelOnboarding: React.FC<ModelOnboardingProps> = ({ isOpen, onClose, registration, onProfilePublished }) => {
  const { t, translateError, translateHair, translateEyes, language } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [countries, setCountries] = useState<Array<{ name: string; cca2: string; dial: string }>>([]);
  const [selectedCountry, setSelectedCountry] = useState('BR');
  const [phoneValue, setPhoneValue] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [stageName, setStageName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [feet, setFeet] = useState('');
  const [hair, setHair] = useState(hairOptions[0]?.labels.br || 'Morena');
  const [eyes, setEyes] = useState(eyeOptions[0]?.labels.br || 'Castanhos');
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationValue | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const availableServices = serviceOptions;

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setRegisteredName('');
      setRegisteredEmail('');
      setStageName('');
      setAge('');
      setHeight('');
      setWeight('');
      setFeet('');
      setHair(hairOptions[0]?.labels.br || '');
      setEyes(eyeOptions[0]?.labels.br || '');
      setPhoneValue('');
      setSelectedLocation(null);
      setPhotos([]);
      setServices([]);
      setBio('');
      setPublishError('');
      setPublishing(false);
      return;
    }

    const pending = registration ?? getPendingModelProfile();
    if (pending) {
      setRegisteredName(pending.name);
      setRegisteredEmail(pending.email);
    }
  }, [isOpen, registration]);


  useEffect(() => {
    let isActive = true;

    const loadCountries = async () => {
      try {
        // REAL_DATA: lista de países via API pública
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd');
        const data = await response.json();
        if (!isActive) return;

        const mapped = (data as Array<{ name?: { common?: string }; cca2?: string; idd?: { root?: string; suffixes?: string[] } }>)
          .map((country) => {
            const root = country.idd?.root ?? '';
            const suffix = country.idd?.suffixes?.[0] ?? '';
            const dial = root && suffix ? `${root}${suffix}` : root;
            return {
              name: country.name?.common ?? '',
              cca2: country.cca2 ?? '',
              dial,
            };
          })
          .filter((country) => country.name && country.dial)
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(mapped);

        const brazil = mapped.find((c) => c.cca2 === 'BR');
        if (brazil) {
          setSelectedCountry('BR');
        } else if (mapped[0]) {
          setSelectedCountry(mapped[0].cca2);
        }
      } catch {
        // silently keep default
      } finally {
        if (isActive) setLoadingCountries(false);
      }
    };

    loadCountries();

    return () => {
      isActive = false;
    };
  }, []);

  const formatPhone = (digits: string, countryCode: string) => {
    const trimmed = digits.replace(/\D/g, '');

    if (countryCode === 'BR') {
      const limited = trimmed.slice(0, 11);
      const area = limited.slice(0, 2);
      const rest = limited.slice(2);
      if (!area) return '';
      if (rest.length <= 4) return `(${area}) ${rest}`.trim();
      if (rest.length <= 8) return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }

    if (countryCode === 'US') {
      const limited = trimmed.slice(0, 10);
      const area = limited.slice(0, 3);
      const rest = limited.slice(3);
      if (!area) return '';
      if (rest.length <= 3) return `(${area}) ${rest}`.trim();
      return `(${area}) ${rest.slice(0, 3)}-${rest.slice(3)}`;
    }

    return trimmed.slice(0, 15);
  };

  const handlePhoneChange = (value: string, countryCode: string) => {
    const digits = value.replace(/\D/g, '');
    setPhoneValue(formatPhone(digits, countryCode));
  };

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const digits = phoneValue.replace(/\D/g, '');
    setPhoneValue(formatPhone(digits, newCountry));
  };

  const handleLocationChange = (location: LocationValue) => {
    setSelectedLocation(location);
  };

  const handlePhotoAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    setUploadingPhotos(true);
    setPublishError('');
    try {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch {
      setPublishError(t('errors.imageLoadFailedGeneric'));
    } finally {
      setUploadingPhotos(false);
      event.target.value = '';
    }
  };

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service]
    );
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError('');

    const displayName = stageName.trim() || registeredName.trim();
    if (!displayName || !registeredEmail.trim()) {
      setPublishError(t('errors.nameEmailRequired'));
      setPublishing(false);
      return;
    }
    if (photos.length < 4) {
      setPublishError(t('errors.minPhotos'));
      setPublishing(false);
      return;
    }

    const parsedAge = age ? Number(age) : null;
    const registrationPassword = registration?.password?.trim();
    if (!registrationPassword) {
      setPublishError(t('errors.registerFailed'));
      setPublishing(false);
      return;
    }

    const locationParts = selectedLocation?.display?.split(',').map((part) => part.trim()) ?? [];
    const city = locationParts[0] || undefined;
    const state = locationParts[1] || undefined;

    try {
      const registrationResult = await registerUser({
        name: displayName,
        email: registeredEmail.trim(),
        password: registrationPassword,
        role: 'model',
      });
      if (!registrationResult.ok) {
        setPublishError(registrationResult.error);
        setPublishing(false);
        return;
      }
      setCurrentUser(registrationResult.user);

      await createModelProfile({
        userId: registrationResult.user.id,
        name: displayName,
        email: registeredEmail.trim(),
        age: parsedAge,
        phone: phoneValue.replace(/\\D/g, ''),
        bio,
        services,
        prices: [],
        attributes: {
          height: height || undefined,
          weight: weight || undefined,
          eyes: eyes || undefined,
          hair: hair || undefined,
          feet: feet || undefined,
        },
        location: selectedLocation
          ? {
              city,
              state,
              lat: Number(selectedLocation.lat),
              lon: Number(selectedLocation.lon),
            }
          : null,
        photos,
        featured: true,
      });
      clearPendingModelProfile();
      onProfilePublished?.(registrationResult.user);
      setPublishing(false);
      onClose();
    } catch (err) {
      setPublishError(err instanceof Error ? translateError(err.message) : t('errors.publishFailed'));
      setPublishing(false);
    }
  };


  if (!isOpen) return null;

  const handleClose = () => {
    clearPendingModelProfile();
    onClose();
  };

  const nextStep = () => currentStep < totalSteps && setCurrentStep(currentStep + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const stepsInfo = [
    { title: t('onboarding.steps.verification'), icon: <Smartphone size={18} /> },
    { title: t('onboarding.steps.profile'), icon: <User size={18} /> },
    { title: t('onboarding.steps.location'), icon: <MapPin size={18} /> },
    { title: t('onboarding.steps.bioServices'), icon: <Info size={18} /> },
    { title: t('onboarding.steps.photos'), icon: <Camera size={18} /> },
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col animate-in fade-in slide-in-from-right duration-500">
      {/* Header do Onboarding */}
      <header className="border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
          <Logo />
        </div>
        
        {/* Progress Dots (Mobile) / Steps (Desktop) */}
        <div className="hidden md:grid grid-cols-5 gap-4 w-full max-w-5xl">
          {stepsInfo.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                currentStep >= i + 1 ? 'border-[#e3262e] bg-red-50 text-[#e3262e]' : 'border-gray-200 text-gray-300'
              }`}>
                {currentStep > i + 1 ? <Check size={16} /> : i + 1}
              </div>
              <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                currentStep >= i + 1 ? 'text-[#e3262e]' : 'text-gray-300'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="md:hidden text-[11px] font-bold text-gray-400 whitespace-nowrap">
          {t('onboarding.stepIndicator', { current: currentStep, total: totalSteps })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="max-w-xl mx-auto py-6 sm:py-12 px-4 sm:px-6">
          
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step1.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">{t('onboarding.step1.subtitle')}</p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-3xl shadow-sm border border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">{t('onboarding.step1.labelWhatsapp')}</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedCountry}
                    onChange={(event) => handleCountryChange(event.target.value)}
                    className="w-full sm:w-32 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-500 px-3 py-4 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
                  >
                    {loadingCountries ? (
                      <option>{t('common.loading')}</option>
                    ) : (
                      countries.map((country) => (
                        <option key={`${country.cca2}-${country.dial}`} value={country.cca2}>
                          {country.name} ({country.dial})
                        </option>
                      ))
                    )}
                  </select>
                  <input 
                    type="tel" 
                    placeholder={t('onboarding.step1.placeholderWhatsapp')}
                    value={phoneValue}
                    onChange={(event) => handlePhoneChange(event.target.value, selectedCountry)}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 sm:px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all text-base sm:text-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                  {t('onboarding.step1.helper')}
                </p>
                <button 
                  onClick={nextStep}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 mt-6 sm:mt-8 flex items-center justify-center gap-2"
                >
                  {t('onboarding.step1.sendCode')}
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

           {/* STEP 2: CARACTERÍSTICAS */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step2.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">{t('onboarding.step2.subtitle')}</p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.registeredName')}</label>
                    <input
                      type="text"
                      value={registeredName}
                      onChange={(event) => setRegisteredName(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.registeredEmail')}</label>
                    <input
                      type="email"
                      value={registeredEmail}
                      onChange={(event) => setRegisteredEmail(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.stageName')}</label>
                    <input
                      type="text"
                      placeholder={t('onboarding.step2.stageNamePlaceholder')}
                      value={stageName}
                      onChange={(event) => setStageName(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.age')}</label>
                    <input
                      type="number"
                      placeholder="22"
                      value={age}
                      onChange={(event) => setAge(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.height')}</label>
                    <input
                      type="text"
                      placeholder="1.68"
                      value={height}
                      onChange={(event) => setHeight(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.weight')}</label>
                    <input
                      type="number"
                      placeholder="58"
                      value={weight}
                      onChange={(event) => setWeight(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.feet')}</label>
                    <input
                      type="number"
                      placeholder="36"
                      value={feet}
                      onChange={(event) => setFeet(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.hair')}</label>
                    <select
                      value={translateHair(hair)}
                      onChange={(event) => setHair(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none appearance-none"
                    >
                      {hairOptions.map((option) => {
                        const label = option.labels[language] || option.labels.br;
                        return (
                          <option key={option.id} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step2.eyes')}</label>
                    <select
                      value={translateEyes(eyes)}
                      onChange={(event) => setEyes(event.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none appearance-none"
                    >
                      {eyeOptions.map((option) => {
                        const label = option.labels[language] || option.labels.br;
                        return (
                          <option key={option.id} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <button onClick={nextStep} className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all mt-4">{t('onboarding.step2.next')}</button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step3.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">
                {t('onboarding.step3.subtitle')}
              </p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <LocationPicker value={selectedLocation} onChange={handleLocationChange} />
                <button 
                  onClick={nextStep}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all mt-4"
                >
                  {t('onboarding.step3.continue')}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step5.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">{t('onboarding.step5.subtitle')}</p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest flex items-center gap-2">
                    <Info size={14} /> {t('onboarding.step5.bioLabel')}
                  </label>
                  <textarea 
                    rows={4}
                    placeholder={t('onboarding.step5.bioPlaceholder')}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-3xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 transition-all resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-4 block tracking-widest flex items-center gap-2">
                    <Heart size={14} /> {t('onboarding.step5.servicesLabel')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableServices.map((service) => (
                      <button 
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          services.includes(service.id) 
                          ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-lg shadow-red-100' 
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {service.labels[language] || service.labels.br}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={nextStep}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  {t('onboarding.step5.continue')}
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step6.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">{t('onboarding.step6.subtitle')}</p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-3xl shadow-sm border border-gray-100 text-center">
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6 sm:mb-8">
                    {photos.map((photo, index) => (
                      <div
                        key={`${photo}-${index}`}
                        className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50"
                      >
                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  id="model-photo-upload"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoAdd}
                  className="hidden"
                />
                <label
                  htmlFor="model-photo-upload"
                  className="inline-flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-widest hover:border-[#e3262e] hover:text-[#e3262e] hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Camera size={20} />
                  {t('onboarding.step6.addPhoto')}
                </label>
                
                <div className="p-4 bg-yellow-50 rounded-2xl mb-6 sm:mb-8 flex gap-3 text-left">
                  <div className="text-yellow-600 mt-1">⚠️</div>
                  <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                    {t('onboarding.step6.warning')}
                  </p>
                </div>

                <button 
                  onClick={handlePublish}
                  disabled={publishing || uploadingPhotos}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {publishing ? t('onboarding.step6.publishing') : t('onboarding.step6.publish')}
                </button>
                {publishError && (
                  <p className="text-xs text-red-500 font-semibold mt-3">{publishError}</p>
                )}
              </div>
            </div>
          )}

          {currentStep > 1 && (
            <button 
              onClick={prevStep}
              className="mt-6 sm:mt-8 mx-auto flex items-center gap-2 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-xs"
            >
              <ChevronLeft size={16} />
              {t('onboarding.backStep')}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ModelOnboarding;
