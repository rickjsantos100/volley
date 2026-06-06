import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";

export default async function Home() {
  const t = await getTranslations("HomePage");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f0eb] px-6 py-16 text-[rgba(0,0,0,0.87)]">
      <section className="w-full max-w-2xl rounded-xl bg-white px-8 py-10 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:px-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-semibold tracking-[0.1em] text-[#00754A] uppercase">
            {t("appLabel")}
          </p>
          <LanguageToggle />
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[#006241] sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#33433d]">
          {t("intro")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-center text-sm font-semibold text-white transition active:scale-95"
          >
            {t("loginLink")}
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#00754A] bg-white px-5 py-3 text-center text-sm font-semibold text-[#00754A] transition active:scale-95"
          >
            {t("dashboardLink")}
          </Link>
        </div>
      </section>
    </main>
  );
}
