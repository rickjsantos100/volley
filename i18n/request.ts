import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const locales = ["pt", "en"] as const;
type Locale = (typeof locales)[number];

function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : "pt";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
