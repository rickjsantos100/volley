import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

export default async function ProfilePage() {
  const [t, supabase] = await Promise.all([
    getTranslations("ProfilePage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8d8] px-4 py-16 text-[rgba(0,0,0,0.87)] sm:px-6">
      <section className="w-full max-w-md rounded-xl bg-white px-6 py-8 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:px-8">
        <p className="text-sm font-semibold tracking-[0.1em] text-[#0b46c7] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.01em] text-[#0737a8]">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#26375f]">{t("intro")}</p>

        <div className="mt-8">
          <ProfileForm
            firstName={profile?.first_name ?? ""}
            lastName={profile?.last_name ?? ""}
          />
        </div>

        <Link
          href="/dashboard"
          className="ripple ripple-dark mt-4 block rounded-full border border-[#0737a8] bg-white px-5 py-3 text-center text-sm font-semibold text-[#0737a8] transition active:scale-95"
        >
          {t("backToDashboard")}
        </Link>
      </section>
    </main>
  );
}
