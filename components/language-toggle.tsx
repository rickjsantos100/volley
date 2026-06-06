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
    if (locale === activeLocale) {
      return;
    }

    setLocalePreference(locale);
    router.refresh();
  }

  return (
    <div
      aria-label={t("label")}
      className="inline-flex rounded-full border border-[#00754A] bg-white p-1 text-sm font-semibold"
    >
      <button
        type="button"
        aria-pressed={activeLocale === "pt"}
        onClick={() => handleLocaleChange("pt")}
        className="rounded-full px-4 py-2 text-[#00754A] transition data-[active=true]:bg-[#00754A] data-[active=true]:text-white"
        data-active={activeLocale === "pt"}
      >
        {t("portuguese")}
      </button>
      <button
        type="button"
        aria-pressed={activeLocale === "en"}
        onClick={() => handleLocaleChange("en")}
        className="rounded-full px-4 py-2 text-[#00754A] transition data-[active=true]:bg-[#00754A] data-[active=true]:text-white"
        data-active={activeLocale === "en"}
      >
        {t("english")}
      </button>
    </div>
  );
}
