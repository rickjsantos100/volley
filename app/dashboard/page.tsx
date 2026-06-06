import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/server";
import { logOut } from "./actions";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "user" | "admin";
};

export default async function DashboardPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("DashboardPage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const role = profile?.role ?? "user";
  const name =
    profile?.display_name ??
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ??
    null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f0eb] px-6 py-16 text-[rgba(0,0,0,0.87)]">
      <section className="w-full max-w-2xl rounded-xl bg-white px-8 py-10 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:px-10">
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

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
            <dt className="text-sm font-semibold text-[rgba(0,0,0,0.58)]">
              {t("nameLabel")}
            </dt>
            <dd className="mt-1 break-words text-base font-semibold text-[#33433d]">
              {name || t("missingName")}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
            <dt className="text-sm font-semibold text-[rgba(0,0,0,0.58)]">
              {t("emailLabel")}
            </dt>
            <dd className="mt-1 break-words text-base font-semibold text-[#33433d]">
              {user.email}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
            <dt className="text-sm font-semibold text-[rgba(0,0,0,0.58)]">
              {t("roleLabel")}
            </dt>
            <dd className="mt-1 text-base font-semibold text-[#33433d]">
              {t(`roles.${role}`)}
            </dd>
          </div>
        </dl>

        <form action={logOut} className="mt-8">
          <button className="rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95">
            {t("logoutButton")}
          </button>
        </form>
      </section>
    </main>
  );
}
