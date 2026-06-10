import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function GameNotFound() {
  const t = await getTranslations("GameDetailPage");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f0eb] px-4 py-16 text-[rgba(0,0,0,0.87)] sm:px-6">
      <section className="w-full max-w-md rounded-xl bg-white px-6 py-8 text-center shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:px-8">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#006241]">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#33433d]">
          {t("notFoundIntro")}
        </p>
        <Link
          href="/dashboard"
          className="ripple ripple-dark mt-6 inline-flex rounded-full border border-[#00754A] bg-white px-5 py-3 text-sm font-semibold text-[#00754A] transition active:scale-95"
        >
          {t("backToGames")}
        </Link>
      </section>
    </main>
  );
}
