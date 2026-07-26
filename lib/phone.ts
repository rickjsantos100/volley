import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

function getFlag(country: CountryCode) {
  return String.fromCodePoint(
    ...country
      .split("")
      .map((character) => 0x1f1e6 + character.charCodeAt(0) - 65),
  );
}

export const countryCallingCodes = getCountries()
  .map((country) => ({
    code: `+${getCountryCallingCode(country)}`,
    country,
    flag: getFlag(country),
  }))
  .sort((first, second) => {
    if (first.country === "PT") {
      return -1;
    }

    if (second.country === "PT") {
      return 1;
    }

    return first.country.localeCompare(second.country);
  });

const countryCallingCodeSet = new Set(
  countryCallingCodes.map(({ code }) => code),
);

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function isPhoneCountryCode(value: string) {
  return countryCallingCodeSet.has(value);
}

export function isPhoneNumber(value: string) {
  return /^\d{4,14}$/.test(value);
}
