
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Camera, MapPin, Smartphone, User, ArrowRight, ChevronLeft, Info, Heart, Loader2 } from 'lucide-react';
import Logo from './Logo';
import { AuthUser, clearPendingModelProfile, getPendingModelProfile, PendingModelProfile, registerUser, setCurrentUser } from '../services/auth';
import { uploadImage, uploadImageWithProgress } from '../services/cloudinary';
import { fetchCountries } from '../services/countries';
import { scanIdentityDocument } from '../services/identityOcr';
import { createModelProfile } from '../services/models';
import { hairOptions, eyeOptions, serviceOptions } from '../translations';
import { useI18n } from '../translations/i18n';
import LocationPicker, { LocationValue } from './LocationPicker';
import NationalityPicker from './NationalityPicker';

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
  const [phoneRawValue, setPhoneRawValue] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState('');
  const [identityBirthDate, setIdentityBirthDate] = useState('');
  const [identityFaceUrl, setIdentityFaceUrl] = useState('');
  const [identityFacePreview, setIdentityFacePreview] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceCameraLoading, setFaceCameraLoading] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState('');
  const [scanningIdentity, setScanningIdentity] = useState(false);
  const [identityScanMessage, setIdentityScanMessage] = useState('');
  const [identityScanError, setIdentityScanError] = useState('');
  const [identityScanSuccess, setIdentityScanSuccess] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [nationality, setNationality] = useState('');
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
  const [photosUploadProgress, setPhotosUploadProgress] = useState(0);
  const [photosUploadingCount, setPhotosUploadingCount] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const identityBusy = uploadingIdentity || scanningIdentity;
  const identityBusyLabel = scanningIdentity
    ? t('onboarding.step1.identityScanning')
    : uploadingIdentity
    ? t('common.loading')
    : t('onboarding.step1.identityUploadButton');
  const availableServices = serviceOptions;
  const countriesWithDial = useMemo(() => countries.filter((country) => country.dial), [countries]);
  const manualCountryRef = useRef(false);
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  const getBrowserCountryCode = () => {
    if (typeof navigator === 'undefined') return '';
    const locale = navigator.language || '';
    const normalized = locale.replace('_', '-');
    const parts = normalized.split('-');
    if (parts[1]) return parts[1].toUpperCase();
    try {
      const intlLocale = new (Intl as any).Locale(normalized);
      return intlLocale?.region ? String(intlLocale.region).toUpperCase() : '';
    } catch {
      return parts[0] ? parts[0].toUpperCase() : '';
    }
  };

  const fetchCountryCodeFromIp = async () => {
    const endpoints = [
      { url: 'https://ipapi.co/json/', key: 'country_code' },
      { url: 'https://ipwho.is/', key: 'country_code' },
    ];
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 3500);
        const response = await fetch(endpoint.url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        window.clearTimeout(timeout);
        if (!response.ok) continue;
        const data = await response.json();
        const code = data?.[endpoint.key];
        if (code) return String(code).toUpperCase();
      } catch {
        // ignore and try next endpoint
      }
    }
    return '';
  };

  const getTimezoneCountryCode = () => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timeZone) return '';
      const map: Record<string, string> = {
        'Europe/Rome': 'IT',
        'Europe/Madrid': 'ES',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/London': 'GB',
        'Europe/Lisbon': 'PT',
        'Europe/Zurich': 'CH',
        'Europe/Vienna': 'AT',
        'Europe/Brussels': 'BE',
        'Europe/Amsterdam': 'NL',
        'Europe/Oslo': 'NO',
        'Europe/Stockholm': 'SE',
        'Europe/Helsinki': 'FI',
        'Europe/Warsaw': 'PL',
        'Europe/Prague': 'CZ',
        'Europe/Bucharest': 'RO',
        'Europe/Athens': 'GR',
        'Europe/Istanbul': 'TR',
        'America/Sao_Paulo': 'BR',
        'America/New_York': 'US',
        'America/Chicago': 'US',
        'America/Los_Angeles': 'US',
        'America/Mexico_City': 'MX',
      };
      return map[timeZone] || '';
    } catch {
      return '';
    }
  };

  const resolveAutoCountry = async (withDial: Array<{ name: string; cca2: string; dial: string }>) => {
    const localeCountry = getBrowserCountryCode();
    if (localeCountry && withDial.some((c) => c.cca2 === localeCountry)) {
      return localeCountry;
    }
    const tzCountry = getTimezoneCountryCode();
    if (tzCountry && withDial.some((c) => c.cca2 === tzCountry)) {
      return tzCountry;
    }
    const ipCountry = await fetchCountryCodeFromIp();
    if (ipCountry && withDial.some((c) => c.cca2 === ipCountry)) {
      return ipCountry;
    }
    return '';
  };

  const detectCountryByDial = (digitsValue: string) => {
    if (!digitsValue) return '';
    let best: { cca2: string; dial: string } | null = null;
    for (const country of countriesWithDial) {
      const dialDigits = country.dial.replace(/\D/g, '');
      if (!dialDigits) continue;
      if (digitsValue.startsWith(dialDigits)) {
        if (!best || dialDigits.length > best.dial.replace(/\D/g, '').length) {
          best = country;
        }
      }
    }
    return best?.cca2 ?? '';
  };

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
    setFaceCameraActive(false);
    setFaceCameraLoading(false);
  };

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
      setPhoneRawValue('');
      setIdentityNumber('');
      setIdentityDocumentUrl('');
      setIdentityBirthDate('');
      setIdentityFaceUrl('');
      setIdentityFacePreview('');
      setUploadingIdentity(false);
      setUploadingFace(false);
      setFaceCameraLoading(false);
      setFaceCameraError('');
      stopFaceCamera();
      setScanningIdentity(false);
      setIdentityScanMessage('');
      setIdentityScanError('');
      setIdentityScanSuccess(false);
      setStep1Error('');
      setNationality('');
      setSelectedLocation(null);
      setPhotos([]);
      setServices([]);
      setBio('');
      setPublishError('');
      setPublishing(false);
      setPhotosUploadProgress(0);
      setPhotosUploadingCount(0);
      manualCountryRef.current = false;
      return;
    }

    const pending = registration ?? getPendingModelProfile();
    if (pending) {
      setRegisteredName(pending.name);
      setRegisteredEmail(pending.email);
    }
  }, [isOpen, registration]);

  useEffect(() => {
    if (!isOpen || currentStep !== 1) {
      stopFaceCamera();
    }
    return () => {
      stopFaceCamera();
    };
  }, [isOpen, currentStep]);


  useEffect(() => {
    let isActive = true;

    const loadCountries = async () => {
      try {
        const mapped = await fetchCountries();
        if (!isActive) return;
        setCountries(mapped);
        const withDial = mapped.filter((country) => country.dial);
        const autoCountry = await resolveAutoCountry(withDial);
        const brazil = withDial.find((c) => c.cca2 === 'BR');
        if (!manualCountryRef.current) {
          if (autoCountry) {
            setSelectedCountry(autoCountry);
          } else if (brazil) {
            setSelectedCountry('BR');
          } else if (withDial[0]) {
            setSelectedCountry(withDial[0].cca2);
          }
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
      if (!limited) return '';
      if (limited.length <= 2) return limited;
      if (rest.length <= 4) return `(${area}) ${rest}`.trim();
      if (rest.length <= 8) return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }

    if (countryCode === 'US') {
      const limited = trimmed.slice(0, 10);
      const area = limited.slice(0, 3);
      const rest = limited.slice(3);
      if (!limited) return '';
      if (limited.length <= 3) return limited;
      if (rest.length <= 3) return `(${area}) ${rest}`.trim();
      return `(${area}) ${rest.slice(0, 3)}-${rest.slice(3)}`;
    }

    if (countryCode === 'IT') {
      const limited = trimmed.slice(0, 11);
      if (!limited) return '';
      if (limited.length <= 3) return limited;
      if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
      if (limited.length <= 10) return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
      return `${limited.slice(0, 3)} ${limited.slice(3, 7)} ${limited.slice(7)}`;
    }

    const limited = trimmed.slice(0, 12);
    if (!limited) return '';
    if (limited.length <= 3) return limited;
    const groups: string[] = [];
    let index = 0;
    while (index < limited.length) {
      const remaining = limited.length - index;
      let size = 3;
      if (remaining === 4) size = 2;
      if (remaining <= 2) size = remaining;
      groups.push(limited.slice(index, index + size));
      index += size;
    }
    return groups.join(' ');
  };

  const normalizePhoneE164 = (rawValue: string, digitsValue: string, countryDial: string) => {
    const raw = rawValue.trim();
    const rawDigits = raw.replace(/\D/g, '');
    const digits = digitsValue.replace(/\D/g, '');
    if (!rawDigits && !digits) return '';
    const dialDigits = countryDial.replace(/\D/g, '');
    if (raw.startsWith('+')) {
      return rawDigits ? `+${rawDigits}` : '';
    }
    if (raw.startsWith('00')) {
      const withoutPrefix = rawDigits.replace(/^00/, '');
      return withoutPrefix ? `+${withoutPrefix}` : '';
    }
    if (!dialDigits) return null;
    if (digits.startsWith(dialDigits)) return `+${digits}`;
    return `+${dialDigits}${digits}`;
  };

  const handlePhoneChange = (value: string, countryCode: string) => {
    setPhoneRawValue(value);
    const raw = value.trim();
    const digits = raw.replace(/\D/g, '');
    const dialDigits = countriesWithDial.find((country) => country.cca2 === countryCode)?.dial.replace(/\D/g, '') ?? '';
    let nationalDigits = digits;

    if (raw.startsWith('+') || raw.startsWith('00')) {
      const withoutPrefix = raw.startsWith('00') ? digits.replace(/^00/, '') : digits;
      const detectedCountry = detectCountryByDial(withoutPrefix);
      if (detectedCountry && detectedCountry !== countryCode) {
        const detectedDial = countriesWithDial.find((country) => country.cca2 === detectedCountry)?.dial.replace(/\D/g, '') ?? '';
        const detectedNational = detectedDial && withoutPrefix.startsWith(detectedDial) ? withoutPrefix.slice(detectedDial.length) : withoutPrefix;
        manualCountryRef.current = true;
        setSelectedCountry(detectedCountry);
        setPhoneValue(formatPhone(detectedNational, detectedCountry));
        return;
      }
      if (dialDigits && withoutPrefix.startsWith(dialDigits)) {
        nationalDigits = withoutPrefix.slice(dialDigits.length);
      } else {
        nationalDigits = withoutPrefix;
      }
    }

    setPhoneValue(formatPhone(nationalDigits, countryCode));
  };

  const startFaceCamera = async () => {
    setFaceCameraError('');
    stopFaceCamera();
    setFaceCameraActive(true);
    setFaceCameraLoading(true);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setFaceCameraError(t('errors.cameraUnavailable'));
      setFaceCameraActive(false);
      setFaceCameraLoading(false);
      return;
    }
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.setAttribute('playsinline', 'true');
        faceVideoRef.current.setAttribute('webkit-playsinline', 'true');
        faceVideoRef.current.muted = true;
        faceVideoRef.current.autoplay = true;
        faceVideoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!faceVideoRef.current) return resolve();
          faceVideoRef.current.onloadedmetadata = () => resolve();
        });
        try {
          await faceVideoRef.current.play();
        } catch {
          // ignore autoplay errors
        }
      }
      if (!faceVideoRef.current?.videoWidth) {
        throw new Error('camera_unavailable');
      }
      setFaceCameraLoading(false);
    } catch {
      setFaceCameraError(t('errors.cameraUnavailable'));
      setFaceCameraActive(false);
      setFaceCameraLoading(false);
    }
  };

  const captureFacePhoto = async () => {
    const video = faceVideoRef.current;
    if (!video || !video.videoWidth) {
      setFaceCameraError(t('errors.cameraUnavailable'));
      return;
    }
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setIdentityFacePreview(dataUrl);
    stopFaceCamera();
    setUploadingFace(true);
    setFaceCameraError('');
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const uploadedUrl = await uploadImage(file);
      setIdentityFaceUrl(uploadedUrl);
    } catch {
      setFaceCameraError(t('errors.identityFaceUploadFailed'));
    } finally {
      setUploadingFace(false);
    }
  };

  const handleFaceRetake = () => {
    setIdentityFaceUrl('');
    setIdentityFacePreview('');
    startFaceCamera();
  };

  const handleIdentityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingIdentity(true);
    setScanningIdentity(true);
    setIdentityScanMessage('');
    setIdentityScanError('');
    setIdentityScanSuccess(false);
    setStep1Error('');

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const base64 = loadEvent.target?.result as string;
      if (!base64) {
        setIdentityScanError(t('errors.identityScanFailed'));
        setScanningIdentity(false);
        return;
      }
      try {
        const result = await scanIdentityDocument(base64, (step) => setIdentityScanMessage(step));
        if (result.birthDate) {
          setIdentityBirthDate(formatBirthDateInput(formatIsoToBirthInput(result.birthDate)));
        }
        if (result.documentNumber) {
          setIdentityNumber(result.documentNumber);
        }
        if (result.birthDate || result.documentNumber) {
          setIdentityScanSuccess(true);
        } else {
          setIdentityScanError(t('errors.identityScanFailed'));
        }
      } catch {
        setIdentityScanError(t('errors.identityScanFailed'));
      } finally {
        setScanningIdentity(false);
      }
    };
    reader.onerror = () => {
      setIdentityScanError(t('errors.identityScanFailed'));
      setScanningIdentity(false);
    };
    reader.readAsDataURL(file);

    try {
      const uploadedUrl = await uploadImage(file);
      setIdentityDocumentUrl(uploadedUrl);
    } catch {
      setStep1Error(t('errors.identityUploadFailed'));
    } finally {
      setUploadingIdentity(false);
      event.target.value = '';
    }
  };

  const parseBirthDateParts = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      if (!year || !month || !day) return null;
      return { year, month, day };
    }
    const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const day = Number(brMatch[1]);
      const month = Number(brMatch[2]);
      const year = Number(brMatch[3]);
      if (!year || !month || !day) return null;
      return { year, month, day };
    }
    return null;
  };

  const normalizeBirthDateToIso = (value: string) => {
    const parts = parseBirthDateParts(value);
    if (!parts) return '';
    const { year, month, day } = parts;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return '';
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getAgeFromBirthDate = (value: string) => {
    const parts = parseBirthDateParts(value);
    if (!parts) return null;
    const { year, month, day } = parts;
    const birthDate = new Date(year, month - 1, day);
    if (Number.isNaN(birthDate.getTime())) return null;
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  };

  const formatBirthDateInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatIsoToBirthInput = (value: string) => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts;
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  };

  const getIdentityScanStatus = (message: string) => {
    if (!message) return '';
    const initMatch = message.match(/INICIALIZANDO_(\d+)_CORES/);
    if (initMatch) {
      return t('onboarding.step1.identityScanInit', { cores: initMatch[1] });
    }
    if (message.startsWith('PREPARANDO_AMOSTRAS')) {
      return t('onboarding.step1.identityScanPreparing');
    }
    if (message.startsWith('PROCESSANDO_THREADS_PARALELOS')) {
      return t('onboarding.step1.identityScanProcessing');
    }
    const sampleMatchDetailed = message.match(/AMOSTRA_(\d+)\/(\d+)_CONFIRMADA/);
    if (sampleMatchDetailed) {
      return t('onboarding.step1.identityScanSample', {
        current: sampleMatchDetailed[1],
        total: sampleMatchDetailed[2],
      });
    }
    const sampleMatch = message.match(/AMOSTRA_(\d+)_OK/);
    if (sampleMatch) {
      return t('onboarding.step1.identityScanSample', { current: sampleMatch[1], total: 12 });
    }
    if (message.startsWith('CONSENSO_ESTABELECIDO')) {
      return t('onboarding.step1.identityScanConsensus');
    }
    return t('onboarding.step1.identityScanProcessing');
  };

  const handleStep1Next = () => {
    setStep1Error('');
    if (!identityNumber.trim() || !identityDocumentUrl) {
      setStep1Error(t('errors.identityRequired'));
      return;
    }
    if (!identityFaceUrl) {
      setStep1Error(t('errors.identityFaceRequired'));
      return;
    }
    const age = getAgeFromBirthDate(identityBirthDate);
    if (!age) {
      setStep1Error(t('errors.identityAgeRequired'));
      return;
    }
    if (age < 18) {
      setStep1Error(t('errors.identityUnderage'));
      return;
    }
    nextStep();
  };

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const digits = phoneValue.replace(/\D/g, '');
    setPhoneValue(formatPhone(digits, newCountry));
    setPhoneRawValue(formatPhone(digits, newCountry));
  };

  const handleCountrySelect = (newCountry: string) => {
    manualCountryRef.current = true;
    handleCountryChange(newCountry);
  };

  const handleLocationChange = (location: LocationValue) => {
    setSelectedLocation(location);
  };

  const handlePhotoAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    setUploadingPhotos(true);
    setPublishError('');
    setPhotosUploadProgress(0);
    setPhotosUploadingCount(files.length);
    try {
      const uploaded: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const url = await uploadImageWithProgress(file, (progress) => {
          const overall = Math.round(((index + progress / 100) / files.length) * 100);
          setPhotosUploadProgress(overall);
        });
        uploaded.push(url);
        const completed = Math.round(((index + 1) / files.length) * 100);
        setPhotosUploadProgress(completed);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      setPhotosUploadProgress(100);
    } catch {
      setPublishError(t('errors.imageLoadFailedGeneric'));
    } finally {
      setUploadingPhotos(false);
      window.setTimeout(() => {
        setPhotosUploadProgress(0);
        setPhotosUploadingCount(0);
      }, 800);
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

      const selectedDial = countriesWithDial.find((country) => country.cca2 === selectedCountry)?.dial ?? '';
      const normalizedPhone = normalizePhoneE164(phoneRawValue || phoneValue, phoneValue, selectedDial);
      if (normalizedPhone === null) {
        setPublishError(t('errors.invalidPhone'));
        setPublishing(false);
        return;
      }
      if (!identityNumber.trim() || !identityDocumentUrl) {
        setPublishError(t('errors.identityRequired'));
        setPublishing(false);
        return;
      }
      if (!identityFaceUrl) {
        setPublishError(t('errors.identityFaceRequired'));
        setPublishing(false);
        return;
      }
      const ageFromBirthDate = getAgeFromBirthDate(identityBirthDate);
      if (!ageFromBirthDate) {
        setPublishError(t('errors.identityAgeRequired'));
        setPublishing(false);
        return;
      }
      if (ageFromBirthDate < 18) {
        setPublishError(t('errors.identityUnderage'));
        setPublishing(false);
        return;
      }

      await createModelProfile({
        userId: registrationResult.user.id,
        name: displayName,
        email: registeredEmail.trim(),
        age: ageFromBirthDate,
        phone: normalizedPhone,
        phoneCountryDial: selectedDial,
        identity: {
          number: identityNumber.trim(),
          documentUrl: identityDocumentUrl,
          faceUrl: identityFaceUrl,
          birthDate: normalizeBirthDateToIso(identityBirthDate),
        },
        bio,
        services,
        prices: [],
        attributes: {
          height: height || undefined,
          weight: weight || undefined,
          eyes: eyes || undefined,
          hair: hair || undefined,
          feet: feet || undefined,
          nationality: nationality || undefined,
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
                    onChange={(event) => handleCountrySelect(event.target.value)}
                    className="w-full sm:w-32 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-500 px-3 py-4 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
                  >
                    {loadingCountries ? (
                      <option>{t('common.loading')}</option>
                    ) : (
                      countriesWithDial.map((country) => (
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

                <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                  <div>
                    <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{t('onboarding.step1.identityTitle')}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{t('onboarding.step1.identitySubtitle')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step1.identityUploadLabel')}</label>
                      <input
                        type="file"
                        id="identity-upload"
                        accept="image/*"
                        onChange={handleIdentityUpload}
                        disabled={identityBusy}
                        className="hidden"
                      />
                      <label
                        htmlFor="identity-upload"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                          identityBusy ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-[#e3262e] hover:text-[#e3262e] hover:bg-red-50'
                        }`}
                      >
                        {identityBusyLabel}
                      </label>
                      <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step1.identityUploadHint')}</p>
                      {scanningIdentity && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                              <Loader2 className="w-5 h-5 text-[#e3262e] animate-spin" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                {t('onboarding.step1.identityScanTitle')}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-1">
                                {t('onboarding.step1.identityScanning')}
                              </p>
                              {identityScanMessage && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {getIdentityScanStatus(identityScanMessage)}
                                </p>
                              )}
                              <div className="mt-3 h-1.5 rounded-full bg-white/80 overflow-hidden">
                                <div className="h-full w-2/3 bg-[#e3262e] animate-pulse" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {!scanningIdentity && identityScanSuccess && (
                        <p className="text-[10px] text-emerald-600 mt-2">{t('onboarding.step1.identityScanSuccess')}</p>
                      )}
                      {!scanningIdentity && identityScanError && (
                        <p className="text-[10px] text-red-500 mt-2">{identityScanError}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step1.identityNumberLabel')}</label>
                      <input
                        type="text"
                        value={identityNumber}
                        onChange={(event) => setIdentityNumber(event.target.value)}
                        placeholder={t('onboarding.step1.identityNumberPlaceholder')}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 sm:px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('onboarding.step1.identityBirthLabel')}</label>
                      <input
                        type="text"
                        value={identityBirthDate}
                        onChange={(event) => setIdentityBirthDate(formatBirthDateInput(event.target.value))}
                        placeholder={t('onboarding.step1.identityBirthPlaceholder')}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 sm:px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step1.identityBirthHint')}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">
                        {t('onboarding.step1.faceTitle')}
                      </label>
                      <p className="text-[10px] text-gray-500 mb-3">{t('onboarding.step1.faceSubtitle')}</p>
                      {(identityFacePreview || identityFaceUrl) && !faceCameraActive ? (
                        <div className="relative">
                          <img
                            src={identityFacePreview || identityFaceUrl}
                            alt={t('onboarding.step1.faceTitle')}
                            className="w-full h-56 object-cover rounded-2xl border border-gray-100"
                          />
                          {uploadingFace && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                              {t('onboarding.step1.faceUploading')}
                            </div>
                          )}
                        </div>
                      ) : faceCameraActive || faceCameraLoading ? (
                        <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-gray-100 bg-black">
                          <video
                            ref={faceVideoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                          />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-40 h-40 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
                          </div>
                          {faceCameraLoading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-bold text-white uppercase tracking-widest">
                              {t('onboarding.step1.faceOpening')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-56 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400 uppercase tracking-widest font-bold">
                          {t('onboarding.step1.faceGuide')}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {faceCameraActive ? (
                          <>
                            <button
                              type="button"
                              onClick={captureFacePhoto}
                              disabled={uploadingFace}
                              className="px-4 py-2 rounded-xl bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {t('onboarding.step1.faceCapture')}
                            </button>
                            <button
                              type="button"
                              onClick={stopFaceCamera}
                              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                            >
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            {!identityFaceUrl && (
                              <button
                                type="button"
                                onClick={startFaceCamera}
                                disabled={uploadingFace}
                                className="px-4 py-2 rounded-xl bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {t('onboarding.step1.faceOpenCamera')}
                              </button>
                            )}
                            {identityFaceUrl && (
                              <button
                                type="button"
                                onClick={handleFaceRetake}
                                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                              >
                                {t('onboarding.step1.faceRetake')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step1.facePrivacy')}</p>
                      {faceCameraError && <p className="text-[10px] text-red-500 mt-2">{faceCameraError}</p>}
                    </div>
                  </div>
                  {identityDocumentUrl && (
                    <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                      <img
                        src={identityDocumentUrl}
                        alt={t('onboarding.step1.identityTitle')}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="text-xs text-gray-500">
                        <p className="font-bold text-gray-700">{t('onboarding.step1.identityUploaded')}</p>
                        <p>{t('onboarding.step1.identityPrivacy')}</p>
                      </div>
                    </div>
                  )}
                  {!identityDocumentUrl && (
                    <p className="text-[10px] text-gray-400">{t('onboarding.step1.identityPrivacy')}</p>
                  )}
                  {step1Error && <p className="text-xs text-red-500 font-semibold">{step1Error}</p>}
                </div>
                <button 
                  onClick={handleStep1Next}
                  disabled={identityBusy || uploadingFace}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 mt-6 sm:mt-8 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

                <NationalityPicker
                  value={nationality}
                  onChange={setNationality}
                  label={t('onboarding.step2.nationality')}
                  placeholder={t('onboarding.step2.nationalityPlaceholder')}
                />

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

                {(uploadingPhotos || photosUploadProgress > 0) && (
                  <div className="mt-4 text-left">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      <span>{t('onboarding.step6.uploadingPhotos')}</span>
                      <span>{photosUploadProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#e3262e] transition-all duration-300"
                        style={{ width: `${photosUploadProgress}%` }}
                      />
                    </div>
                    {photosUploadingCount > 1 && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        {t('onboarding.step6.uploadingPhotosCount', { count: photosUploadingCount })}
                      </p>
                    )}
                  </div>
                )}
                
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
