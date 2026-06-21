import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function GameNotFound() {
  const t = await getTranslations("GameDetailPage");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-24 text-[#101828] sm:px-6">
      <section className="w-full max-w-md rounded-xl border border-[#dde2ea] bg-white px-6 py-8 text-center shadow-[0_8px_24px_rgba(16,24,40,0.07)] sm:px-8">
        <h1 className="font-matchday text-4xl leading-[38px] font-bold text-[#061b6b]">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#667085]">
          {t("notFoundIntro")}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center rounded-[10px] border border-[#0737a8] bg-white px-5 py-3 text-sm font-bold text-[#0737a8] transition hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20"
        >
          {t("backToGames")}
        </Link>
      </section>
    </main>
  );
}
