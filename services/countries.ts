export type CountryOption = {
  name: string;
  cca2: string;
  dial: string;
};

let cachedCountries: CountryOption[] | null = null;
let pendingCountries: Promise<CountryOption[]> | null = null;

export const fetchCountries = async () => {
  if (cachedCountries) return cachedCountries;
  if (pendingCountries) return pendingCountries;

  pendingCountries = fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd')
    .then((response) => (response.ok ? response.json() : []))
    .then((data) => {
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
        .filter((country) => country.name && country.cca2)
        .sort((a, b) => a.name.localeCompare(b.name));
      cachedCountries = mapped;
      return mapped;
    })
    .catch(() => {
      cachedCountries = [];
      return [];
    })
    .finally(() => {
      pendingCountries = null;
    });

  return pendingCountries;
};
