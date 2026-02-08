import React, { useEffect, useState } from 'react';
import { useI18n } from '../translations/i18n';

export type LocationValue = {
  display: string;
  lat: string;
  lon: string;
  countryCode?: string;
};

interface LocationPickerProps {
  value: LocationValue | null;
  onChange: (value: LocationValue) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const { t } = useI18n();
  const [locationQuery, setLocationQuery] = useState(value?.display || '');
  const [locationResults, setLocationResults] = useState<LocationValue[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (value?.display) {
      setLocationQuery(value.display);
    }
  }, [value?.display]);

  const searchLocation = async () => {
    const query = locationQuery.trim();
    if (query.length < 3) {
      setLocationResults([]);
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      const mapped = (data as Array<{ display_name?: string; lat?: string; lon?: string; address?: { country_code?: string } }>)
        .map((item) => ({
          display: item.display_name ?? '',
          lat: item.lat ?? '',
          lon: item.lon ?? '',
          countryCode: item.address?.country_code ?? '',
        }))
        .filter((item) => item.display && item.lat && item.lon);

      setLocationResults(mapped);
    } catch {
      setLocationError(t('errors.searchLocationFailed'));
      setLocationResults([]);
    } finally {
      setLocationLoading(false);
    }
  };

  const selectLocation = (location: LocationValue) => {
    onChange(location);
    setLocationResults([]);
    setLocationQuery(location.display);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('errors.geolocationUnsupported'));
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          const data = await response.json();
          const display = data?.display_name ?? t('onboarding.myLocation');
          const countryCode = data?.address?.country_code ?? '';
          selectLocation({ display, lat, lon, countryCode });
        } catch {
          selectLocation({ display: t('onboarding.myLocation'), lat, lon });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setLocationError(t('errors.geolocationFailed'));
      }
    );
  };

  const mapEmbedSrc = () => {
    if (!value) return '';
    const lat = Number(value.lat);
    const lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
    const delta = 0.01;
    const left = lon - delta;
    const right = lon + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
  };

  return (
    <>
      <div>
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('onboarding.step3.searchLabel')}</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder={t('onboarding.step3.searchPlaceholder')}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20"
          />
          <button
            type="button"
            onClick={searchLocation}
            className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-colors"
          >
            {t('onboarding.step3.searchButton')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={useMyLocation}
            className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
          >
            {t('onboarding.step3.useMyLocation')}
          </button>
          {locationLoading && (
            <span className="text-xs font-bold text-gray-400 uppercase">{t('common.loading')}</span>
          )}
        </div>
        {locationError && (
          <p className="text-xs text-red-500 mt-3">{locationError}</p>
        )}
      </div>
      <div>
        {locationResults.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 space-y-2">
            {locationResults.map((location) => (
              <button
                key={`${location.lat}-${location.lon}`}
                type="button"
                onClick={() => selectLocation(location)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-white transition-colors text-sm text-gray-700"
              >
                {location.display}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-3xl overflow-hidden border border-gray-100 bg-gray-50">
        {value && mapEmbedSrc() ? (
          <iframe
            title={t('map.title')}
            src={mapEmbedSrc()}
            className="w-full h-64"
            loading="lazy"
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm font-medium">
            {t('onboarding.step3.mapEmpty')}
          </div>
        )}
      </div>
    </>
  );
};

export default LocationPicker;
