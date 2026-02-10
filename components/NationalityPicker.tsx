import React, { useEffect, useMemo, useState } from 'react';
import { fetchCountries } from '../services/countries';
import { useI18n } from '../translations/i18n';

type NationalityOption = {
  name: string;
  cca2: string;
  dial: string;
  label: string;
};

type NationalityPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
  inputClassName?: string;
};

const normalizeText = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const NationalityPicker: React.FC<NationalityPickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  className,
  inputClassName,
}) => {
  const { locale, t } = useI18n();
  const [countries, setCountries] = useState<NationalityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCountries()
      .then((list) => {
        if (!active) return;
        setCountries(
          list.map((country) => ({
            ...country,
            label: country.name,
          }))
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayNames = useMemo(() => {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') return null;
    return new Intl.DisplayNames([locale], { type: 'region' });
  }, [locale]);

  const allOptions = useMemo(() => {
    const mapped = countries.map((country) => {
      const code = country.cca2?.toUpperCase();
      const label = displayNames?.of(code) ?? country.name ?? code;
      return { ...country, label: label || code };
    });
    return mapped.sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [countries, displayNames, locale]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    if (!normalizedQuery) return allOptions;
    return allOptions.filter((option) => {
      const label = normalizeText(option.label);
      const name = normalizeText(option.name);
      const code = option.cca2.toLowerCase();
      return label.includes(normalizedQuery) || name.includes(normalizedQuery) || code.includes(normalizedQuery);
    });
  }, [allOptions, query]);

  useEffect(() => {
    if (open) return;
    if (!value) {
      if (query) setQuery('');
      return;
    }
    const option = allOptions.find((item) => item.cca2.toUpperCase() === value.toUpperCase());
    if (option && option.label !== query) {
      setQuery(option.label);
    }
  }, [allOptions, open, query, value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    if (value) onChange('');
    setOpen(true);
  };

  const handleSelect = (option: NationalityOption) => {
    onChange(option.cca2);
    setQuery(option.label);
    setOpen(false);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);
      if (value || !query.trim()) return;
      const normalizedQuery = normalizeText(query.trim());
      const match = allOptions.find((option) => {
        return (
          normalizeText(option.label) === normalizedQuery ||
          normalizeText(option.name) === normalizedQuery ||
          option.cca2.toLowerCase() === normalizedQuery
        );
      });
      if (match) {
        onChange(match.cca2);
        setQuery(match.label);
      }
    }, 150);
  };

  return (
    <div className={className ?? 'relative'}>
      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">{label}</label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={
          inputClassName ??
          'w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20'
        }
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-3 text-xs text-gray-400">{t('common.loading')}</div>
          ) : filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.cca2}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="font-semibold text-gray-700">{option.label}</span>
                <span className="text-[10px] text-gray-400 font-bold">{option.cca2}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400">{t('common.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NationalityPicker;
