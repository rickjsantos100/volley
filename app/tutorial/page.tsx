import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

type StepProps = {
  children: React.ReactNode;
  number: string;
  title: string;
};

function Step({ children, number, title }: StepProps) {
  return (
    <li className="grid gap-4 sm:grid-cols-[44px_1fr] sm:gap-5">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-[10px] bg-[#061b6b] font-matchday text-2xl font-bold text-white"
      >
        {number}
      </span>
      <div className="min-w-0 pt-1">
        <h2 className="font-matchday text-3xl leading-8 font-bold text-[#061b6b]">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-6 text-[#475467] sm:text-base">
          {children}
        </div>
      </div>
    </li>
  );
}

export default async function TutorialPage() {
  const t = await getTranslations("TutorialPage");

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pb-16 pt-24 text-[#101828] sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
      <div className="mx-auto w-full max-w-[880px]">
        <section className="rounded-xl border border-[#061b6b] border-t-4 border-t-[#ffd21a] bg-[#061b6b] px-5 py-7 text-white shadow-[0_8px_24px_rgba(16,24,40,0.12)] sm:px-8 sm:py-9">
          <p className="text-sm font-bold tracking-[0.08em] text-[#ffd21a] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-[680px] font-matchday text-4xl leading-[0.95] font-bold sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-[660px] text-base leading-7 text-white/85 sm:text-lg">
            {t("intro")}
          </p>
        </section>

        <details
          className="group mt-8 overflow-hidden rounded-xl border border-[#dde2ea] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.07)]"
          aria-labelledby="setup-title"
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20 sm:px-7">
            <div>
              <p className="text-sm font-bold tracking-[0.08em] text-[#667085] uppercase">
                {t("setupEyebrow")}
              </p>
              <h2
                id="setup-title"
                className="mt-1 font-matchday text-4xl leading-none font-bold text-[#061b6b]"
              >
                {t("setupTitle")}
              </h2>
            </div>
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center text-[#0737a8]"
            >
              <svg
                className="size-5 transition-transform group-open:rotate-45"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
          </summary>

          <div className="border-t border-[#dde2ea] p-5 sm:p-7">
            <ol className="space-y-8 sm:space-y-10">
              <Step number="1" title={t("accountTitle")}>
                <p>{t("accountIntro")}</p>
                <Link
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#ffd21a] bg-[#ffd21a] px-5 py-3 text-sm font-bold text-[#061b6b] transition-[background-color,border-color,box-shadow,transform] hover:border-[#f2c600] hover:bg-[#f2c600] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
                  href="/"
                >
                  {t("accountAction")}
                </Link>
              </Step>

              <Step number="2" title={t("accessTitle")}>
                <p>{t("accessIntro")}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#dde2ea] bg-[#f5f7fa] p-4">
                    <h3 className="text-sm font-bold text-[#101828]">
                      {t("browserTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {t("browserDescription")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#0737a8] bg-[#eef3ff] p-4">
                    <h3 className="text-sm font-bold text-[#061b6b]">
                      {t("installTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#475467]">
                      {t("installDescription")}
                    </p>
                  </div>
                </div>
              </Step>

              <Step number="3" title={t("installStepsTitle")}>
                <p>{t("installStepsIntro")}</p>
                <div className="mt-5 space-y-7">
                  <section aria-labelledby="android-install-title">
                    <h3
                      className="text-base font-bold text-[#101828]"
                      id="android-install-title"
                    >
                      {t("androidTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {t("androidIntro")}
                    </p>
                    <div className="mt-3 space-y-3">
                      <details className="group rounded-xl border border-[#dde2ea] bg-white">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20">
                          <span>{t("chromeTitle")}</span>
                          <span
                            aria-hidden="true"
                            className="text-xl leading-none text-[#0737a8] transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <ol className="space-y-2 border-t border-[#dde2ea] px-4 py-4 text-sm leading-6 text-[#475467]">
                          <li>{t("chromeStep1")}</li>
                          <li>{t("chromeStep2")}</li>
                          <li>{t("chromeStep3")}</li>
                        </ol>
                      </details>

                      <details className="group rounded-xl border border-[#dde2ea] bg-white">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20">
                          <span>{t("samsungTitle")}</span>
                          <span
                            aria-hidden="true"
                            className="text-xl leading-none text-[#0737a8] transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <ol className="space-y-2 border-t border-[#dde2ea] px-4 py-4 text-sm leading-6 text-[#475467]">
                          <li>{t("samsungStep1")}</li>
                          <li>{t("samsungStep2")}</li>
                          <li>{t("samsungStep3")}</li>
                        </ol>
                      </details>
                    </div>
                  </section>

                  <section
                    aria-labelledby="ios-install-title"
                    className="border-t border-[#dde2ea] pt-6"
                  >
                    <h3
                      className="text-base font-bold text-[#101828]"
                      id="ios-install-title"
                    >
                      {t("iosTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {t("iosIntro")}
                    </p>
                    <div className="mt-3 space-y-3">
                      <details className="group rounded-xl border border-[#dde2ea] bg-white">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20">
                          <span>{t("safariTitle")}</span>
                          <span
                            aria-hidden="true"
                            className="text-xl leading-none text-[#0737a8] transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <ol className="space-y-2 border-t border-[#dde2ea] px-4 py-4 text-sm leading-6 text-[#475467]">
                          <li>{t("safariStep1")}</li>
                          <li>{t("safariStep2")}</li>
                          <li>{t("safariStep3")}</li>
                          <li>{t("safariStep4")}</li>
                        </ol>
                      </details>

                      <details className="group rounded-xl border border-[#dde2ea] bg-white">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20">
                          <span>{t("iosChromeTitle")}</span>
                          <span
                            aria-hidden="true"
                            className="text-xl leading-none text-[#0737a8] transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <ol className="space-y-2 border-t border-[#dde2ea] px-4 py-4 text-sm leading-6 text-[#475467]">
                          <li>{t("iosChromeStep1")}</li>
                          <li>{t("iosChromeStep2")}</li>
                          <li>{t("iosChromeStep3")}</li>
                          <li>{t("iosChromeStep4")}</li>
                        </ol>
                      </details>
                    </div>
                  </section>
                </div>
              </Step>

              <Step number="4" title={t("notificationsTitle")}>
                <p>{t("notificationsIntro")}</p>
                <p className="mt-3 rounded-xl border border-[#dde2ea] bg-[#f5f7fa] px-4 py-3 text-sm font-semibold text-[#475467]">
                  {t("notificationsNote")}
                </p>
              </Step>
            </ol>
          </div>
        </details>

        <section className="mt-10" aria-labelledby="usage-title">
          <div className="mb-5">
            <p className="text-sm font-bold tracking-[0.08em] text-[#667085] uppercase">
              {t("usageEyebrow")}
            </p>
            <h2
              id="usage-title"
              className="mt-1 font-matchday text-4xl leading-none font-bold text-[#061b6b]"
            >
              {t("usageTitle")}
            </h2>
            <p className="mt-3 max-w-[720px] text-sm leading-6 text-[#667085] sm:text-base">
              {t("usageIntro")}
            </p>
          </div>

          <Card className="p-5 sm:p-7">
            <ol className="space-y-8 sm:space-y-10">
              <Step number="1" title={t("findGameTitle")}>
                <p>{t("findGameIntro")}</p>
              </Step>

              <Step number="2" title={t("joinAndPayTitle")}>
                <p>{t("joinAndPayIntro")}</p>
                <p className="mt-3 rounded-xl border border-[#dde2ea] bg-[#f5f7fa] px-4 py-3 text-sm font-semibold text-[#475467]">
                  {t("joinAndPayNote")}
                </p>
              </Step>

              <Step number="3" title={t("waitlistTitle")}>
                <p>{t("waitlistIntro")}</p>
                <p className="mt-3 rounded-xl border border-[#dde2ea] bg-[#f5f7fa] px-4 py-3 text-sm font-semibold text-[#475467]">
                  {t("waitlistNote")}
                </p>
              </Step>

              <Step number="4" title={t("leaveGameTitle")}>
                <p>{t("leaveGameIntro")}</p>
              </Step>

              <Step number="5" title={t("gameDayTitle")}>
                <p>{t("gameDayIntro")}</p>
              </Step>
            </ol>
          </Card>
        </section>
      </div>
    </main>
  );
}
