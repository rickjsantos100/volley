"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <Button
      aria-label={t(
        nextLocale === "pt" ? "switchToPortuguese" : "switchToEnglish",
      )}
      className="size-11 border-[#dde2ea] bg-white p-0 text-xl hover:border-[#0737a8] hover:bg-[#eef3ff]"
      onClick={() => handleLocaleChange(nextLocale)}
      type="button"
      variant="outline"
    >
      <span aria-hidden="true" className="mt-[2px]">
        {flag}
      </span>
    </Button>
  );
}
