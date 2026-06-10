"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type Locale = "pt" | "en";

function isLocale(value: string | null): value is Locale {
  return value === "pt" || value === "en";
}

function setLocalePreference(locale: Locale) {
  window.localStorage.setItem("locale", locale);
  document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageToggle() {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("LanguageToggle");
  const nextLocale = activeLocale === "pt" ? "en" : "pt";
  const flag = activeLocale === "pt" ? "🇵🇹" : "🇬🇧";

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("locale");

    if (isLocale(storedLocale) && storedLocale !== activeLocale) {
      setLocalePreference(storedLocale);
      router.refresh();
      return;
    }

    setLocalePreference(activeLocale);
  }, [activeLocale, router]);

  function handleLocaleChange(locale: Locale) {
    setLocalePreference(locale);
    router.refresh();
  }

  return (
    <button
      type="button"
      aria-label={t(
        nextLocale === "pt" ? "switchToPortuguese" : "switchToEnglish",
      )}
      onClick={() => handleLocaleChange(nextLocale)}
      className="ripple ripple-dark flex size-10 items-center justify-center rounded-full border border-[rgba(0,0,0,0.16)] bg-white text-xl shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.18)] transition hover:border-[#00754A] active:scale-95"
    >
      <span aria-hidden="true" className="mt-[2px]">
        {flag}
      </span>
    </button>
  );
}
