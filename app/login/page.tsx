import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorKey(error: string | undefined) {
  if (
    error === "invalid-email" ||
    error === "invalid-password" ||
    error === "login-failed" ||
    error === "missing-name" ||
    error === "email-confirmation-enabled" ||
    error === "signup-failed"
  ) {
    return error;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ error }, t, supabase] = await Promise.all([
    searchParams,
    getTranslations("AuthPage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const errorKey = getErrorKey(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f0eb] px-6 py-16 text-[rgba(0,0,0,0.87)]">
      <section className="w-full max-w-3xl rounded-xl bg-white px-8 py-10 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:px-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-semibold tracking-[0.1em] text-[#00754A] uppercase">
            {t("eyebrow")}
          </p>
          <LanguageToggle />
        </div>

        <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[#006241]">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#33433d]">
          {t("intro")}
        </p>

        {errorKey ? (
          <p className="mt-6 rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]">
            {t(`errors.${errorKey}`)}
          </p>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-[#006241]">
                {t("loginTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#33433d]">
                {t("loginIntro")}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("emailLabel")}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                placeholder={t("passwordPlaceholder")}
                className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
              />
            </div>

            <button
              formAction={signIn}
              className="rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95"
            >
              {t("loginButton")}
            </button>
          </form>

          <form className="space-y-5 rounded-xl bg-[#f9f9f9] p-5">
            <div>
              <h2 className="text-xl font-semibold text-[#006241]">
                {t("signupTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#33433d]">
                {t("signupIntro")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="first-name"
                  className="block text-sm font-semibold text-[#33433d]"
                >
                  {t("firstNameLabel")}
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder={t("firstNamePlaceholder")}
                  className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="last-name"
                  className="block text-sm font-semibold text-[#33433d]"
                >
                  {t("lastNameLabel")}
                </label>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  placeholder={t("lastNamePlaceholder")}
                  className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-email"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("emailLabel")}
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-password"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("passwordPlaceholder")}
                className="w-full rounded-xl border border-[rgba(0,0,0,0.16)] bg-white px-4 py-3 text-base outline-none transition focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]"
              />
              <p className="text-sm leading-6 text-[#33433d]">
                {t("passwordHint")}
              </p>
            </div>

            <button
              formAction={signUp}
              className="rounded-full border border-[#00754A] bg-white px-5 py-3 text-sm font-semibold text-[#00754A] transition active:scale-95"
            >
              {t("signupButton")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
