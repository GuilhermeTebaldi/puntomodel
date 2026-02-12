
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Camera, MapPin, Smartphone, User, ArrowRight, ChevronLeft, Info, Heart, Loader2 } from 'lucide-react';
import Logo from './Logo';
import { AuthUser, clearPendingModelProfile, getPendingModelProfile, PendingModelProfile, registerUser, setCurrentUser } from '../services/auth';
import { uploadImage, uploadImageWithProgress } from '../services/cloudinary';
import { fetchCountries } from '../services/countries';
import { scanIdentityDocument } from '../services/identityOcr';
import { createModelProfile } from '../services/models';
import { getTranslationTarget } from '../services/translate';
import { hairOptions, eyeOptions, serviceOptions, identityOptions } from '../translations';
import { useI18n } from '../translations/i18n';
import LocationPicker, { LocationValue } from './LocationPicker';
import NationalityPicker from './NationalityPicker';

interface ModelOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  registration?: PendingModelProfile | null;
  onProfilePublished?: (user?: AuthUser | null) => void;
}

type DocumentValidationReason =
  | 'idle'
  | 'no-edges'
  | 'landscape'
  | 'tilt'
  | 'center'
  | 'size'
  | 'too-large'
  | 'focus'
  | 'ready';

type DocumentValidationState = {
  valid: boolean;
  reason: DocumentValidationReason;
  messageKey: string;
};

type DocumentDetection = {
  bbox: { x: number; y: number; width: number; height: number };
  angle: number;
  roi: { x: number; y: number; width: number; height: number };
};

const DOCUMENT_FRAME_RATIO = 1.586;
const DOCUMENT_ANALYSIS_WIDTH = 320;
const DOCUMENT_ANALYSIS_INTERVAL = 280;
const DOCUMENT_MIN_COVERAGE = 0.55;
const DOCUMENT_MAX_COVERAGE = 0.94;
const DOCUMENT_CENTER_TOLERANCE = 0.14;
const DOCUMENT_TILT_LIMIT = 9;
const DOCUMENT_FOCUS_MIN = 60;
const DOCUMENT_MAX_DIMENSION = 1600;
const DOCUMENT_AUTO_CAPTURE_DELAY = 750;
const DOCUMENT_REQUIRED_STABLE_FRAMES = 3;

const readExifOrientation = (buffer: ArrayBuffer) => {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xffd8) return 1;
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        const length = view.getUint16(offset, false);
        offset += 2;
        if (view.getUint32(offset, false) !== 0x45786966) return 1;
        offset += 6;
        const little = view.getUint16(offset, false) === 0x4949;
        const tiffOffset = offset;
        const firstIfdOffset = view.getUint32(offset + 4, little);
        if (!firstIfdOffset) return 1;
        let dirOffset = tiffOffset + firstIfdOffset;
        const entries = view.getUint16(dirOffset, little);
        dirOffset += 2;
        for (let i = 0; i < entries; i += 1) {
          const entryOffset = dirOffset + i * 12;
          const tag = view.getUint16(entryOffset, little);
          if (tag === 0x0112) {
            return view.getUint16(entryOffset + 8, little);
          }
        }
        return 1;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      const size = view.getUint16(offset, false);
      offset += size;
    }
  } catch {
    return 1;
  }
  return 1;
};

const ModelOnboarding: React.FC<ModelOnboardingProps> = ({ isOpen, onClose, registration, onProfilePublished }) => {
  const { t, translateError, translateHair, translateEyes, language, list } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [countries, setCountries] = useState<Array<{ name: string; cca2: string; dial: string }>>([]);
  const [selectedCountry, setSelectedCountry] = useState('BR');
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneRawValue, setPhoneRawValue] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState('');
  const [identityDocumentPreview, setIdentityDocumentPreview] = useState('');
  const [identityBirthDate, setIdentityBirthDate] = useState('');
  const [identityDocumentType, setIdentityDocumentType] = useState<'unknown' | 'id' | 'passport'>('unknown');
  const [identityFaceUrl, setIdentityFaceUrl] = useState('');
  const [identityFacePreview, setIdentityFacePreview] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [documentCameraOpen, setDocumentCameraOpen] = useState(false);
  const [documentCameraLoading, setDocumentCameraLoading] = useState(false);
  const [documentCameraError, setDocumentCameraError] = useState('');
  const [documentValidation, setDocumentValidation] = useState<DocumentValidationState>({
    valid: false,
    reason: 'idle',
    messageKey: 'onboarding.step1.documentHint',
  });
  const [documentCapturePreview, setDocumentCapturePreview] = useState<null | { dataUrl: string; file: File }>(null);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceCameraLoading, setFaceCameraLoading] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState('');
  const [scanningIdentity, setScanningIdentity] = useState(false);
  const [identityScanMessage, setIdentityScanMessage] = useState('');
  const [identityScanError, setIdentityScanError] = useState('');
  const [identityScanSuccess, setIdentityScanSuccess] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
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
  const [profileIdentity, setProfileIdentity] = useState('');
  const [audience, setAudience] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationValue | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosUploadProgress, setPhotosUploadProgress] = useState(0);
  const [photosUploadingCount, setPhotosUploadingCount] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [step5Error, setStep5Error] = useState('');
  const [showBioSuggestions, setShowBioSuggestions] = useState(false);
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
  const manualCountryRef = useRef(false);
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const documentVideoRef = useRef<HTMLVideoElement | null>(null);
  const documentStreamRef = useRef<MediaStream | null>(null);
  const documentFrameRef = useRef<HTMLDivElement | null>(null);
  const documentScanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const documentDetectionRef = useRef<DocumentDetection | null>(null);
  const documentScanTimerRef = useRef<number | null>(null);
  const documentStableStartRef = useRef<number | null>(null);
  const documentStableFrameCountRef = useRef(0);
  const documentAutoCaptureLockedRef = useRef(false);
  const documentCaptureInProgressRef = useRef(false);
  const documentFocusTimerRef = useRef<number | null>(null);
  const documentVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const hasSelectedLocation = Boolean(selectedLocation && selectedLocation.lat && selectedLocation.lon);

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

  const lockPortrait = async () => {
    if (typeof screen === 'undefined') return;
    try {
      await screen.orientation?.lock?.('portrait');
    } catch {
      // ignore orientation lock failures
    }
  };

  const unlockPortrait = () => {
    if (typeof screen === 'undefined') return;
    try {
      screen.orientation?.unlock?.();
    } catch {
      // ignore orientation unlock failures
    }
  };

  const resetDocumentAutoCapture = () => {
    documentStableStartRef.current = null;
    documentStableFrameCountRef.current = 0;
    documentAutoCaptureLockedRef.current = false;
  };

  const stopDocumentCameraStream = (options?: { unlock?: boolean }) => {
    if (documentStreamRef.current) {
      documentStreamRef.current.getTracks().forEach((track) => track.stop());
      documentStreamRef.current = null;
    }
    if (documentVideoTrackRef.current) {
      documentVideoTrackRef.current = null;
    }
    if (documentFocusTimerRef.current) {
      window.clearInterval(documentFocusTimerRef.current);
      documentFocusTimerRef.current = null;
    }
    if (documentVideoRef.current) {
      documentVideoRef.current.srcObject = null;
    }
    if (documentScanTimerRef.current) {
      window.clearInterval(documentScanTimerRef.current);
      documentScanTimerRef.current = null;
    }
    documentDetectionRef.current = null;
    documentCaptureInProgressRef.current = false;
    resetDocumentAutoCapture();
    setDocumentCameraLoading(false);
    if (options?.unlock !== false) {
      unlockPortrait();
    }
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
      setAudience([]);
      setPhoneValue('');
      setPhoneRawValue('');
      setIdentityNumber('');
      setIdentityDocumentUrl('');
      setIdentityDocumentPreview('');
      setIdentityBirthDate('');
      setIdentityFaceUrl('');
      setIdentityFacePreview('');
      setUploadingIdentity(false);
      setUploadingFace(false);
      setFaceCameraLoading(false);
      setFaceCameraError('');
      stopFaceCamera();
      setDocumentCameraOpen(false);
      setDocumentCameraError('');
      setDocumentValidation({
        valid: false,
        reason: 'idle',
        messageKey: 'onboarding.step1.documentHint',
      });
      setDocumentCapturePreview(null);
      stopDocumentCameraStream();
      setScanningIdentity(false);
      setIdentityScanMessage('');
      setIdentityScanError('');
      setIdentityScanSuccess(false);
      setStep1Error('');
      setStep2Error('');
      setNationality('');
      setSelectedLocation(null);
      setPhotos([]);
      setPhotoFiles([]);
      setServices([]);
      setBio('');
      setStep5Error('');
      setShowBioSuggestions(false);
      setPublishError('');
      setPublishing(false);
      setPhotosUploadProgress(0);
      setPhotosUploadingCount(0);
      setProfileIdentity('');
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
      setDocumentCameraOpen(false);
      stopDocumentCameraStream();
    }
    return () => {
      stopFaceCamera();
      stopDocumentCameraStream();
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

  const applyDocumentAutoFocus = async () => {
    const track = documentVideoTrackRef.current;
    if (!track || typeof track.applyConstraints !== 'function') return;
    try {
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : null;
      const constraints: MediaTrackConstraints = {};
      const advanced: MediaTrackConstraintSet[] = [];

      if (capabilities?.focusMode) {
        const modes = Array.isArray(capabilities.focusMode) ? capabilities.focusMode : [];
        if (modes.includes('continuous')) {
          (constraints as any).focusMode = 'continuous';
        } else if (modes.includes('single-shot')) {
          (constraints as any).focusMode = 'single-shot';
        }
      }

      if (capabilities?.focusDistance) {
        const focusCaps = capabilities.focusDistance as MediaSettingsRange | undefined;
        if (focusCaps && typeof focusCaps.min === 'number' && typeof focusCaps.max === 'number') {
          const target = focusCaps.min + (focusCaps.max - focusCaps.min) * 0.15;
          advanced.push({ focusDistance: target } as MediaTrackConstraintSet);
        }
      }

      if (advanced.length) {
        (constraints as any).advanced = advanced;
      }

      if (Object.keys(constraints).length) {
        await track.applyConstraints(constraints);
      }
    } catch {
      // ignore focus failures
    }
  };

  const startDocumentFocusLoop = () => {
    if (documentFocusTimerRef.current) {
      window.clearInterval(documentFocusTimerRef.current);
    }
    applyDocumentAutoFocus();
    documentFocusTimerRef.current = window.setInterval(() => {
      applyDocumentAutoFocus();
    }, 1400);
  };

  const startDocumentCamera = async () => {
    setDocumentCameraError('');
    stopDocumentCameraStream();
    setDocumentCameraLoading(true);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setDocumentCameraError(t('errors.cameraUnavailable'));
      setDocumentCameraLoading(false);
      return;
    }
    try {
      await lockPortrait();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      documentStreamRef.current = stream;
      documentVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (documentVideoRef.current) {
        documentVideoRef.current.setAttribute('playsinline', 'true');
        documentVideoRef.current.setAttribute('webkit-playsinline', 'true');
        documentVideoRef.current.muted = true;
        documentVideoRef.current.autoplay = true;
        documentVideoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!documentVideoRef.current) return resolve();
          documentVideoRef.current.onloadedmetadata = () => resolve();
        });
        try {
          await documentVideoRef.current.play();
        } catch {
          // ignore autoplay errors
        }
      }
      if (!documentVideoRef.current?.videoWidth) {
        throw new Error('camera_unavailable');
      }
      setDocumentCameraLoading(false);
      startDocumentFocusLoop();
    } catch {
      setDocumentCameraError(t('errors.cameraUnavailable'));
      setDocumentCameraLoading(false);
      unlockPortrait();
    }
  };

  const openDocumentCamera = () => {
    setDocumentCameraOpen(true);
    setDocumentCapturePreview(null);
    setDocumentValidation({
      valid: false,
      reason: 'idle',
      messageKey: 'onboarding.step1.documentHint',
    });
    resetDocumentAutoCapture();
    startDocumentCamera();
  };

  const closeDocumentCamera = () => {
    setDocumentCameraOpen(false);
    setDocumentCapturePreview(null);
    stopDocumentCameraStream();
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

  const updateDocumentValidation = (next: DocumentValidationState) => {
    setDocumentValidation((prev) => {
      if (prev.reason === next.reason && prev.valid === next.valid && prev.messageKey === next.messageKey) {
        return prev;
      }
      return next;
    });
  };

  const triggerDocumentAutoCapture = () => {
    if (documentCapturePreview || documentCaptureInProgressRef.current) return;
    documentAutoCaptureLockedRef.current = true;
    captureDocumentPhoto(true);
  };

  const getDocumentFrameMapping = () => {
    const video = documentVideoRef.current;
    const frame = documentFrameRef.current;
    if (!video || !frame) return null;
    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (!videoWidth || !videoHeight || !videoRect.width || !videoRect.height) return null;

    const scale = Math.max(videoRect.width / videoWidth, videoRect.height / videoHeight);
    const scaledWidth = videoWidth * scale;
    const scaledHeight = videoHeight * scale;
    const offsetX = (videoRect.width - scaledWidth) / 2;
    const offsetY = (videoRect.height - scaledHeight) / 2;

    const frameX = frameRect.left - videoRect.left;
    const frameY = frameRect.top - videoRect.top;

    const rawX = (frameX - offsetX) / scale;
    const rawY = (frameY - offsetY) / scale;
    const rawW = frameRect.width / scale;
    const rawH = frameRect.height / scale;

    const x = Math.max(0, rawX);
    const y = Math.max(0, rawY);
    const width = Math.min(videoWidth - x, rawW);
    const height = Math.min(videoHeight - y, rawH);

    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height, videoWidth, videoHeight };
  };

  // Lightweight document scan to validate orientation, alignment, and focus inside the frame.
  const analyzeDocumentFrame = () => {
    const video = documentVideoRef.current;
    if (!video || documentCameraLoading || documentCapturePreview || documentCaptureInProgressRef.current) return;
    const mapping = getDocumentFrameMapping();
    if (!mapping) {
      updateDocumentValidation({
        valid: false,
        reason: 'no-edges',
        messageKey: 'onboarding.step1.documentHint',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    const { x, y, width, height } = mapping;
    const analysisWidth = DOCUMENT_ANALYSIS_WIDTH;
    const analysisHeight = Math.max(120, Math.round(analysisWidth * (height / width)));

    const canvas = documentScanCanvasRef.current ?? document.createElement('canvas');
    documentScanCanvasRef.current = canvas;
    if (canvas.width !== analysisWidth || canvas.height !== analysisHeight) {
      canvas.width = analysisWidth;
      canvas.height = analysisHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, x, y, width, height, 0, 0, analysisWidth, analysisHeight);

    const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
    const { data } = imageData;
    const pixelCount = analysisWidth * analysisHeight;
    const gray = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
      const idx = i * 4;
      gray[i] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
    }

    const mag = new Float32Array(pixelCount);
    let magSum = 0;
    for (let row = 1; row < analysisHeight - 1; row += 1) {
      for (let col = 1; col < analysisWidth - 1; col += 1) {
        const idx = row * analysisWidth + col;
        const gx =
          -gray[idx - analysisWidth - 1] -
          2 * gray[idx - 1] -
          gray[idx + analysisWidth - 1] +
          gray[idx - analysisWidth + 1] +
          2 * gray[idx + 1] +
          gray[idx + analysisWidth + 1];
        const gy =
          gray[idx - analysisWidth - 1] +
          2 * gray[idx - analysisWidth] +
          gray[idx - analysisWidth + 1] -
          gray[idx + analysisWidth - 1] -
          2 * gray[idx + analysisWidth] -
          gray[idx + analysisWidth + 1];
        const value = Math.abs(gx) + Math.abs(gy);
        mag[idx] = value;
        magSum += value;
      }
    }

    const magAvg = magSum / Math.max(1, (analysisWidth - 2) * (analysisHeight - 2));
    const threshold = Math.max(30, magAvg * 2.0);
    let edgeCount = 0;
    let minX = analysisWidth;
    let minY = analysisHeight;
    let maxX = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumYY = 0;
    let sumXY = 0;
    let sampleCount = 0;
    const sampleStride = 3;

    for (let row = 1; row < analysisHeight - 1; row += 1) {
      for (let col = 1; col < analysisWidth - 1; col += 1) {
        const idx = row * analysisWidth + col;
        if (mag[idx] <= threshold) continue;
        edgeCount += 1;
        if (col < minX) minX = col;
        if (row < minY) minY = row;
        if (col > maxX) maxX = col;
        if (row > maxY) maxY = row;
        if (edgeCount % sampleStride === 0) {
          sumX += col;
          sumY += row;
          sumXX += col * col;
          sumYY += row * row;
          sumXY += col * row;
          sampleCount += 1;
        }
      }
    }

    const minEdges = Math.max(90, Math.round(pixelCount * 0.0015));
    if (edgeCount < minEdges || sampleCount < 20) {
      updateDocumentValidation({
        valid: false,
        reason: 'no-edges',
        messageKey: 'onboarding.step1.documentHint',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    const bboxWidth = Math.max(1, maxX - minX);
    const bboxHeight = Math.max(1, maxY - minY);
    const coverage = (bboxWidth * bboxHeight) / pixelCount;
    const centerX = minX + bboxWidth / 2;
    const centerY = minY + bboxHeight / 2;
    const offsetX = Math.abs(centerX - analysisWidth / 2) / (analysisWidth / 2);
    const offsetY = Math.abs(centerY - analysisHeight / 2) / (analysisHeight / 2);
    const centered = offsetX <= DOCUMENT_CENTER_TOLERANCE && offsetY <= DOCUMENT_CENTER_TOLERANCE;
    const ratio = bboxHeight / bboxWidth;
    const isPortrait = ratio >= 1.0;

    const meanX = sumX / sampleCount;
    const meanY = sumY / sampleCount;
    const covXX = sumXX / sampleCount - meanX * meanX;
    const covYY = sumYY / sampleCount - meanY * meanY;
    const covXY = sumXY / sampleCount - meanX * meanY;
    const angleRad = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    const angleDeg = (angleRad * 180) / Math.PI;
    const tilt = Math.abs(90 - Math.abs(angleDeg));

    let lapSum = 0;
    let lapSumSq = 0;
    let lapCount = 0;
    for (let row = 1; row < analysisHeight - 1; row += 1) {
      for (let col = 1; col < analysisWidth - 1; col += 1) {
        const idx = row * analysisWidth + col;
        const lap =
          gray[idx - 1] +
          gray[idx + 1] +
          gray[idx - analysisWidth] +
          gray[idx + analysisWidth] -
          4 * gray[idx];
        lapSum += lap;
        lapSumSq += lap * lap;
        lapCount += 1;
      }
    }
    const lapMean = lapSum / Math.max(1, lapCount);
    const focusScore = lapSumSq / Math.max(1, lapCount) - lapMean * lapMean;

    if (!isPortrait) {
      updateDocumentValidation({
        valid: false,
        reason: 'landscape',
        messageKey: 'onboarding.step1.documentRotate',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    if (coverage < DOCUMENT_MIN_COVERAGE) {
      updateDocumentValidation({
        valid: false,
        reason: 'size',
        messageKey: 'onboarding.step1.documentMoveCloser',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    if (coverage > DOCUMENT_MAX_COVERAGE) {
      updateDocumentValidation({
        valid: false,
        reason: 'too-large',
        messageKey: 'onboarding.step1.documentMoveAway',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    if (tilt > DOCUMENT_TILT_LIMIT) {
      updateDocumentValidation({
        valid: false,
        reason: 'tilt',
        messageKey: 'onboarding.step1.documentAlign',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    if (!centered) {
      updateDocumentValidation({
        valid: false,
        reason: 'center',
        messageKey: 'onboarding.step1.documentCenter',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    if (focusScore < DOCUMENT_FOCUS_MIN) {
      updateDocumentValidation({
        valid: false,
        reason: 'focus',
        messageKey: 'onboarding.step1.documentFocus',
      });
      documentDetectionRef.current = null;
      resetDocumentAutoCapture();
      return;
    }

    const scaleX = width / analysisWidth;
    const scaleY = height / analysisHeight;
    documentDetectionRef.current = {
      bbox: {
        x: x + minX * scaleX,
        y: y + minY * scaleY,
        width: bboxWidth * scaleX,
        height: bboxHeight * scaleY,
      },
      angle: angleDeg,
      roi: { x, y, width, height },
    };

    updateDocumentValidation({
      valid: true,
      reason: 'ready',
      messageKey: 'onboarding.step1.documentReady',
    });

    if (!documentStableStartRef.current) {
      documentStableStartRef.current = Date.now();
    }
    documentStableFrameCountRef.current += 1;
    const elapsed = Date.now() - (documentStableStartRef.current || 0);
    const hasStableFrames = documentStableFrameCountRef.current >= DOCUMENT_REQUIRED_STABLE_FRAMES;
    if (
      hasStableFrames &&
      elapsed >= DOCUMENT_AUTO_CAPTURE_DELAY &&
      !documentAutoCaptureLockedRef.current &&
      !identityBusy
    ) {
      triggerDocumentAutoCapture();
    }
  };

  useEffect(() => {
    if (!documentCameraOpen || documentCapturePreview) return undefined;
    if (documentScanTimerRef.current) {
      window.clearInterval(documentScanTimerRef.current);
      documentScanTimerRef.current = null;
    }
    documentScanTimerRef.current = window.setInterval(() => {
      analyzeDocumentFrame();
    }, DOCUMENT_ANALYSIS_INTERVAL);

    return () => {
      if (documentScanTimerRef.current) {
        window.clearInterval(documentScanTimerRef.current);
        documentScanTimerRef.current = null;
      }
    };
  }, [documentCameraOpen, documentCameraLoading, documentCapturePreview]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });

  const loadImageFromDataUrl = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image_failed'));
      img.src = src;
    });

  const drawImageWithOrientation = (img: HTMLImageElement, orientation: number) => {
    const width = img.width;
    const height = img.height;
    const canvas = document.createElement('canvas');
    const rotate = orientation >= 5 && orientation <= 8;
    canvas.width = rotate ? height : width;
    canvas.height = rotate ? width : height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    switch (orientation) {
      case 2:
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        ctx.translate(width, height);
        ctx.rotate(Math.PI);
        break;
      case 4:
        ctx.translate(0, height);
        ctx.scale(1, -1);
        break;
      case 5:
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -height);
        break;
      case 7:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(width, -height);
        ctx.scale(-1, 1);
        break;
      case 8:
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-width, 0);
        break;
      default:
        break;
    }

    ctx.drawImage(img, 0, 0);
    return canvas;
  };

  const resizeCanvasToMax = (source: HTMLCanvasElement, maxDim: number) => {
    const width = source.width;
    const height = source.height;
    const maxSide = Math.max(width, height);
    if (maxSide <= maxDim) return source;
    const scale = maxDim / maxSide;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const rotateCanvasToPortrait = (source: HTMLCanvasElement) => {
    if (source.height >= source.width) return source;
    const canvas = document.createElement('canvas');
    canvas.width = source.height;
    canvas.height = source.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    return canvas;
  };

  const normalizeIdentityImage = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const needsExif = file.type === 'image/jpeg' || file.type === 'image/jpg';
    const orientation = needsExif ? readExifOrientation(await file.arrayBuffer()) : 1;
    const img = await loadImageFromDataUrl(dataUrl);
    const needsResize = Math.max(img.width, img.height) > DOCUMENT_MAX_DIMENSION;
    const needsRotate = orientation !== 1;
    if (!needsResize && !needsRotate) {
      return { dataUrl, file };
    }
    const orientedCanvas = drawImageWithOrientation(img, orientation);
    const resizedCanvas = resizeCanvasToMax(orientedCanvas, DOCUMENT_MAX_DIMENSION);
    const finalCanvas = rotateCanvasToPortrait(resizedCanvas);
    const finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
    const blob = await new Promise<Blob>((resolve) =>
      finalCanvas.toBlob((created) => resolve(created || new Blob()), 'image/jpeg', 0.9)
    );
    const normalizedFile = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
    return { dataUrl: finalDataUrl, file: normalizedFile };
  };

  const processIdentityImage = async (file: File, presetDataUrl?: string) => {
    setUploadingIdentity(true);
    setScanningIdentity(true);
    setIdentityScanMessage('');
    setIdentityScanError('');
    setIdentityScanSuccess(false);
    setIdentityDocumentType('unknown');
    setStep1Error('');
    setIdentityDocumentUrl('');
    setIdentityDocumentPreview('');

    let workingFile = file;
    let workingDataUrl = presetDataUrl;

    if (!workingDataUrl) {
      try {
        const normalized = await normalizeIdentityImage(file);
        workingFile = normalized.file;
        workingDataUrl = normalized.dataUrl;
      } catch {
        try {
          workingDataUrl = await readFileAsDataUrl(file);
        } catch {
          workingDataUrl = '';
        }
      }
    }

    if (workingDataUrl) {
      setIdentityDocumentPreview(workingDataUrl);
    }

    const scanPromise = (async () => {
      if (!workingDataUrl) {
        setIdentityScanError(t('errors.identityScanFailed'));
        setScanningIdentity(false);
        return;
      }
      try {
        const result = await scanIdentityDocument(workingDataUrl, (step) => setIdentityScanMessage(step));
        setIdentityDocumentType(result.documentType ?? 'unknown');
        if (result.documentType === 'passport') {
          setIdentityScanError(t('errors.identityPassportNotAllowed'));
          setIdentityScanSuccess(false);
          return;
        }
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
    })();

    const uploadPromise = (async () => {
      try {
        const uploadedUrl = await uploadImage(workingFile);
        setIdentityDocumentUrl(uploadedUrl);
      } catch {
        setStep1Error(t('errors.identityUploadFailed'));
      } finally {
        setUploadingIdentity(false);
      }
    })();

    await Promise.all([scanPromise, uploadPromise]);
  };

  const captureDocumentPhoto = async (autoTriggered = false) => {
    if (documentCaptureInProgressRef.current || documentCapturePreview) return;
    documentCaptureInProgressRef.current = true;
    let captured = false;
    try {
      const video = documentVideoRef.current;
      if (!video || !video.videoWidth) {
        setDocumentCameraError(t('errors.cameraUnavailable'));
        return;
      }
      const detection = documentDetectionRef.current;
      const fallback = getDocumentFrameMapping();
      const crop = detection?.bbox ?? (fallback ? { x: fallback.x, y: fallback.y, width: fallback.width, height: fallback.height } : null);
      if (!crop) {
        updateDocumentValidation({
          valid: false,
          reason: 'no-edges',
          messageKey: 'onboarding.step1.documentHint',
        });
        return;
      }
      const padding = 0.04;
      const padX = crop.width * padding;
      const padY = crop.height * padding;
      const cropX = Math.max(0, crop.x - padX);
      const cropY = Math.max(0, crop.y - padY);
      const cropW = Math.min(video.videoWidth - cropX, crop.width + padX * 2);
      const cropH = Math.min(video.videoHeight - cropY, crop.height + padY * 2);
      const scale = Math.min(1, DOCUMENT_MAX_DIMENSION / Math.max(cropW, cropH));
      const outputW = Math.max(1, Math.round(cropW * scale));
      const outputH = Math.max(1, Math.round(cropH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outputW, outputH);

      const portraitCanvas = rotateCanvasToPortrait(canvas);
      const dataUrl = portraitCanvas.toDataURL('image/jpeg', 0.9);
      const blob = await new Promise<Blob>((resolve) =>
        portraitCanvas.toBlob((created) => resolve(created || new Blob()), 'image/jpeg', 0.9)
      );
      const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopDocumentCameraStream({ unlock: false });
      setDocumentCapturePreview({ dataUrl, file });
      setDocumentCameraError('');
      setDocumentValidation({
        valid: true,
        reason: 'ready',
        messageKey: 'onboarding.step1.documentReady',
      });
      captured = true;
    } finally {
      documentCaptureInProgressRef.current = false;
      if (!captured && autoTriggered) {
        resetDocumentAutoCapture();
      }
    }
  };

  const handleDocumentRetake = () => {
    setIdentityDocumentUrl('');
    setIdentityDocumentPreview('');
    setIdentityScanError('');
    setIdentityScanSuccess(false);
    setDocumentCapturePreview(null);
    openDocumentCamera();
  };

  const handleDocumentConfirm = async () => {
    if (!documentCapturePreview) return;
    const { file, dataUrl } = documentCapturePreview;
    setDocumentCapturePreview(null);
    closeDocumentCamera();
    await processIdentityImage(file, dataUrl);
  };

  const handleIdentityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await processIdentityImage(file);
    } finally {
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

  useEffect(() => {
    const derivedAge = getAgeFromBirthDate(identityBirthDate);
    if (derivedAge) {
      setAge(String(derivedAge));
      return;
    }
    setAge('');
  }, [identityBirthDate]);

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
    if (identityDocumentType === 'passport') {
      setStep1Error(t('errors.identityPassportNotAllowed'));
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

  const handleStep2Next = () => {
    setStep2Error('');
    const missing: string[] = [];

    if (!registeredName.trim()) missing.push(t('onboarding.step2.registeredName'));
    if (!stageName.trim()) missing.push(t('onboarding.step2.stageName'));
    if (!age.trim()) missing.push(t('onboarding.step2.age'));
    if (!hair.trim()) missing.push(t('onboarding.step2.hair'));
    if (!eyes.trim()) missing.push(t('onboarding.step2.eyes'));
    if (!nationality.trim()) missing.push(t('onboarding.step2.nationality'));
    if (!profileIdentity) missing.push(t('onboarding.step2.identityLabel'));
    if (!audience.length) missing.push(t('onboarding.step2.audienceLabel'));

    if (missing.length) {
      setStep2Error(t('onboarding.step2.requiredFields', { fields: missing.join(', ') }));
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

  const handleStep3Next = () => {
    if (!hasSelectedLocation) return;
    nextStep();
  };

  const handlePhotoAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    setPublishError('');
    setPhotosUploadProgress(0);
    setPhotosUploadingCount(0);
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotos((prev) => [...prev, ...previews]);
    setPhotoFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service]
    );
  };

  const handleStep5Next = () => {
    setStep5Error('');
    if (!bio.trim()) {
      setStep5Error(t('errors.bioRequired'));
      return;
    }
    if (!services.length) {
      setStep5Error(t('errors.servicesRequired'));
      return;
    }
    nextStep();
  };

  const toggleAudience = (id: string) => {
    setAudience((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
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
    if (photoFiles.length < 4) {
      setPublishError(t('errors.minPhotos'));
      setPublishing(false);
      return;
    }

    const parsedAge = age ? Number(age) : null;
    const pendingRegistration = registration ?? getPendingModelProfile();
    const registrationPassword = pendingRegistration?.password?.trim();
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

      setUploadingPhotos(true);
      setPhotosUploadProgress(0);
      setPhotosUploadingCount(photoFiles.length);
      let uploadedPhotos: string[] = [];
      try {
        const uploaded: string[] = [];
        for (let index = 0; index < photoFiles.length; index += 1) {
          const file = photoFiles[index];
          const url = await uploadImageWithProgress(file, (progress) => {
            const overall = Math.round(((index + progress / 100) / photoFiles.length) * 100);
            setPhotosUploadProgress(overall);
          });
          uploaded.push(url);
          const completed = Math.round(((index + 1) / photoFiles.length) * 100);
          setPhotosUploadProgress(completed);
        }
        uploadedPhotos = uploaded;
        setPhotosUploadProgress(100);
      } catch {
        setPublishError(t('errors.imageLoadFailedGeneric'));
        setPublishing(false);
        setUploadingPhotos(false);
        setPhotosUploadProgress(0);
        setPhotosUploadingCount(0);
        return;
      }

      const bioLanguage = getTranslationTarget(language);
      const bioTranslations = bio.trim() ? { [bioLanguage]: bio.trim() } : {};

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
        bioTranslations,
        bioLanguage,
        services,
        prices: [],
        attributes: {
          height: height || undefined,
          weight: weight || undefined,
          eyes: eyes || undefined,
          hair: hair || undefined,
          feet: feet || undefined,
          nationality: nationality || undefined,
          audience: audience.length ? audience : undefined,
          profileIdentity: profileIdentity || undefined,
        },
        location: selectedLocation
          ? {
              city,
              state,
              lat: Number(selectedLocation.lat),
              lon: Number(selectedLocation.lon),
            }
          : null,
        photos: uploadedPhotos,
        featured: true,
      });
      clearPendingModelProfile();
      onProfilePublished?.(registrationResult.user);
      setPublishing(false);
      setUploadingPhotos(false);
      setPhotosUploadProgress(0);
      setPhotosUploadingCount(0);
      onClose();
    } catch (err) {
      setPublishError(err instanceof Error ? translateError(err.message) : t('errors.publishFailed'));
      setPublishing(false);
      setUploadingPhotos(false);
      setPhotosUploadProgress(0);
      setPhotosUploadingCount(0);
    }
  };

  const nationalityLabel = useMemo(() => {
    if (!nationality) return '';
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') return nationality.toUpperCase();
    const displayNames = new Intl.DisplayNames([language], { type: 'region' });
    return displayNames.of(nationality.toUpperCase()) ?? nationality.toUpperCase();
  }, [language, nationality]);

  const buildBioSuggestions = useMemo(() => {
    const intros = list('onboarding.step5.bioSuggestions.intros');
    const bodies = list('onboarding.step5.bioSuggestions.bodies');
    const closings = list('onboarding.step5.bioSuggestions.closings');
    if (!intros.length || !bodies.length || !closings.length) return [];

    const displayName = stageName.trim() || registeredName.trim() || t('onboarding.step5.suggestionNameFallback');
    const derivedAge = getAgeFromBirthDate(identityBirthDate);
    const ageValue = age.trim() || (derivedAge ? String(derivedAge) : '');
    const ageText = ageValue ? t('onboarding.step5.bioVars.age', { age: ageValue }) : '';
    const nationalityText = nationalityLabel ? t('onboarding.step5.bioVars.nationality', { nationality: nationalityLabel }) : '';
    const cityValue = selectedLocation?.display?.split(',')[0]?.trim() || '';
    const cityText = cityValue ? t('onboarding.step5.bioVars.city', { city: cityValue }) : '';
    const hairText = hair ? t('onboarding.step5.bioVars.hair', { hair: translateHair(hair) }) : '';
    const eyesText = eyes ? t('onboarding.step5.bioVars.eyes', { eyes: translateEyes(eyes) }) : '';
    const servicesLabels = services
      .map((serviceId) => {
        const service = availableServices.find((item) => item.id === serviceId);
        return service?.labels[language] || service?.labels.br || '';
      })
      .filter(Boolean);
    const servicesText = servicesLabels.length
      ? t('onboarding.step5.bioVars.services', { services: servicesLabels.join(', ') })
      : '';

    const vars = {
      name: displayName,
      ageText,
      nationalityText,
      cityText,
      hairText,
      eyesText,
      servicesText,
    } as Record<string, string>;

    const fillTemplate = (template: string) => {
      let text = template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] || '');
      text = text
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+,/g, ', ')
        .replace(/,\s*\./g, '.')
        .replace(/\s+\./g, '.')
        .replace(/\s+\!/g, '!')
        .replace(/\s+\?/g, '?')
        .trim();
      return text;
    };

    const total = 30;
    const suggestions: string[] = [];
    for (let i = 0; i < total; i += 1) {
      const template = `${intros[i % intros.length]} ${bodies[i % bodies.length]} ${closings[i % closings.length]}`;
      const filled = fillTemplate(template);
      if (filled) suggestions.push(filled);
    }
    return suggestions;
  }, [
    list,
    stageName,
    registeredName,
    t,
    age,
    identityBirthDate,
    nationalityLabel,
    selectedLocation?.display,
    hair,
    eyes,
    services,
    availableServices,
    language,
    translateHair,
    translateEyes,
  ]);


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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={openDocumentCamera}
                          disabled={identityBusy || documentCameraOpen}
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 text-xs font-bold uppercase tracking-widest transition-all ${
                            identityBusy || documentCameraOpen
                              ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                              : 'border-[#e3262e] text-[#e3262e] bg-white hover:bg-red-50'
                          }`}
                        >
                          {t('onboarding.step1.identityCameraButton')}
                        </button>
                        <input
                          type="file"
                          id="identity-upload"
                          accept="image/*"
                          onChange={handleIdentityUpload}
                          disabled={identityBusy || documentCameraOpen}
                          className="hidden"
                        />
                        <label
                          htmlFor="identity-upload"
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                            identityBusy || documentCameraOpen
                              ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                              : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-[#e3262e] hover:text-[#e3262e] hover:bg-red-50'
                          }`}
                        >
                          {identityBusyLabel}
                        </label>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step1.identityUploadHint')}</p>
                      {documentCameraError && !documentCameraOpen && (
                        <p className="text-[10px] text-red-500 mt-2">{documentCameraError}</p>
                      )}
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
                        placeholder={t('onboarding.step1.identityBirthPlaceholder')}
                        onChange={(event) => setIdentityBirthDate(formatBirthDateInput(event.target.value))}
                        inputMode="numeric"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 sm:px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step1.identityBirthHint')}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t('onboarding.step1.identityBirthAuto')}</p>
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
                  {(identityDocumentPreview || identityDocumentUrl) && (
                    <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                      <img
                        src={identityDocumentPreview || identityDocumentUrl}
                        alt={t('onboarding.step1.identityTitle')}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="text-xs text-gray-500 flex-1">
                        <p className="font-bold text-gray-700">
                          {uploadingIdentity ? t('onboarding.step1.identityUploading') : t('onboarding.step1.identityUploaded')}
                        </p>
                        <p>{t('onboarding.step1.identityPrivacy')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDocumentRetake}
                        disabled={identityBusy || documentCameraOpen}
                        className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {t('onboarding.step1.documentRetake')}
                      </button>
                    </div>
                  )}
                  {!identityDocumentPreview && !identityDocumentUrl && (
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
                      readOnly
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step2.ageAutoHint')}</p>
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

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest">{t('onboarding.step2.identityLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {profileIdentityOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setProfileIdentity((prev) => (prev === option.id ? '' : option.id))}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                          profileIdentity === option.id
                            ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-lg shadow-red-100'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step2.identityHint')}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest">{t('onboarding.step2.audienceLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleAudience(option.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                          audience.includes(option.id)
                            ? 'bg-[#e3262e] text-white border-[#e3262e] shadow-lg shadow-red-100'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">{t('onboarding.step2.audienceHint')}</p>
                </div>

                {step2Error && <p className="text-xs text-red-500 font-semibold">{step2Error}</p>}
                <button onClick={handleStep2Next} className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all mt-4">{t('onboarding.step2.next')}</button>
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
                  onClick={handleStep3Next}
                  disabled={!hasSelectedLocation}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {t('onboarding.step3.continue')}
                </button>
                {!hasSelectedLocation && (
                  <p className="text-xs text-gray-400 font-semibold text-center">
                    {t('onboarding.step3.locationRequired')}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{t('onboarding.step5.title')}</h1>
              <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg">{t('onboarding.step5.subtitle')}</p>
              
              <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} /> {t('onboarding.step5.bioLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBioSuggestions((prev) => !prev)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#e3262e]"
                    >
                      {t('onboarding.step5.suggestionsButton')}
                    </button>
                  </div>
                  <textarea 
                    rows={4}
                    placeholder={t('onboarding.step5.bioPlaceholder')}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-3xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 transition-all resize-none"
                  ></textarea>
                  {showBioSuggestions && (
                    <div className="mt-4 bg-gray-50 border border-gray-100 rounded-3xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        {t('onboarding.step5.suggestionsTitle')}
                      </p>
                      {buildBioSuggestions.length ? (
                        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-1">
                          {buildBioSuggestions.map((text, index) => (
                            <button
                              key={`${text.slice(0, 18)}-${index}`}
                              type="button"
                              onClick={() => {
                                setBio(text);
                                setShowBioSuggestions(false);
                              }}
                              className="text-left text-xs text-gray-600 bg-white border border-gray-100 rounded-2xl px-4 py-3 hover:border-[#e3262e] hover:text-gray-800 transition-colors"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">{t('onboarding.step5.suggestionsEmpty')}</p>
                      )}
                    </div>
                  )}
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
                  onClick={handleStep5Next}
                  className="w-full bg-[#e3262e] text-white py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  {t('onboarding.step5.continue')}
                </button>
                {step5Error && (
                  <p className="text-xs text-red-500 font-semibold mt-3">{step5Error}</p>
                )}
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

      {documentCameraOpen && (
        <div className="fixed inset-0 z-[400] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-xs font-black uppercase tracking-widest">{t('onboarding.step1.identityUploadLabel')}</p>
            <button onClick={closeDocumentCamera} className="p-2 rounded-full hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {documentCapturePreview ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                <img
                  src={documentCapturePreview.dataUrl}
                  alt={t('onboarding.step1.identityUploadLabel')}
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-6 left-0 right-0 text-center px-6">
                  <p className="text-sm font-bold text-white">{t('onboarding.step1.documentReviewTitle')}</p>
                  <p className="text-xs text-white/70 mt-1">{t('onboarding.step1.documentReviewSubtitle')}</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={documentVideoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div
                    ref={documentFrameRef}
                    className={`relative w-[64%] max-w-[360px] rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
                      documentValidation.valid ? 'border-emerald-400' : 'border-red-400'
                    }`}
                    style={{ aspectRatio: `1 / ${DOCUMENT_FRAME_RATIO}` }}
                  />
                  <p className="mt-4 text-[11px] text-white/90 font-semibold text-center px-6">
                    {t(documentValidation.messageKey)}
                  </p>
                  <p className="mt-3 text-xs sm:text-sm text-white font-semibold text-center px-6 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/90 text-[11px] text-white">
                      ✓
                    </span>
                    {t('onboarding.step1.documentAutoCapture')}
                  </p>
                </div>
                {documentCameraLoading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-sm font-bold uppercase tracking-widest text-white">
                      {t('onboarding.step1.documentCameraLoading')}
                    </p>
                    <p className="text-xs text-white/70 mt-2">{t('onboarding.step1.documentCameraPermission')}</p>
                  </div>
                )}
                {documentCameraError && !documentCameraLoading && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-sm font-semibold text-white">{documentCameraError}</p>
                    <p className="text-xs text-white/70 mt-2">{t('onboarding.step1.documentCameraPermission')}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-4 bg-black/90 border-t border-white/10 flex flex-col sm:flex-row gap-3">
            {documentCapturePreview ? (
              <>
                <button
                  type="button"
                  onClick={handleDocumentConfirm}
                  disabled={identityBusy}
                  className="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('onboarding.step1.documentConfirm')}
                </button>
                <button
                  type="button"
                  onClick={handleDocumentRetake}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20"
                >
                  {t('onboarding.step1.documentRepeat')}
                </button>
              </>
            ) : documentCameraError ? (
              <button
                type="button"
                onClick={startDocumentCamera}
                className="flex-1 px-4 py-3 rounded-2xl bg-white text-black text-xs font-bold uppercase tracking-widest"
              >
                {t('onboarding.step1.documentCameraRetry')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeDocumentCamera}
              className="flex-1 px-4 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelOnboarding;
